// Step 3: qualify against the ICP with an agent loop.
// The model fills named fields. CODE checks which fields are still empty and whether the
// company passes each gate. The model only helps choose which page to read next.
// Hard cap: CONFIG.loop.maxExtraFetches pages beyond the homepage, then hand to a human.

import { CONFIG } from './config.js';
import { fetchPage, fetchJobs } from './scrape.js';
import { extractInto, emptyFacts } from './extract.js';
import { askJSON } from './llm.js';

const QUESTIONS = {
  b2b: 'Is this a B2B SaaS company (software sold to businesses)?',
  certs: 'Which security/compliance certifications do they already hold, and do they use a compliance platform?',
  stage: 'What stage are they at (funding round, headcount, open roles, enterprise plan)?',
};

const has = (list, v) => list.some((x) => x.value === v);

// An enterprise signal only counts for STAGE if it is something a buyer pays for or a named customer,
// not marketing adjectives ("enterprise-grade", "high availability").
const REAL_ENTERPRISE = /enterprise (plan|tier|pricing|edition|package)|contact sales|\bsso\b|\bsaml\b|\bscim\b|\bsla\b|dedicated (support|account|success)|audit log|customer:|customers?:|trusted by|used by|fortune/i;
export const realEnterprise = (facts) =>
  facts.enterprise_signals.filter((x) => REAL_ENTERPRISE.test(`${x.value} ${x.quote}`));

// What does code still need? A field is filled or it isn't - no model confidence involved.
export function missing(facts, state) {
  const m = [];
  if (facts.is_b2b_saas === null) m.push('b2b');
  // A certification string anywhere settles it; otherwise we must look at /security or /trust once.
  if (!facts.certifications_held.length && !facts.platform && !state.visitedFor.certs) m.push('certs');
  const stageKnown =
    facts.funding_stage ||
    facts.employee_count ||
    (facts.jobs && facts.jobs.titles.length >= CONFIG.stage.minOpenRoles) ||
    realEnterprise(facts).length;
  if (!stageKnown) m.push('stage');
  return m;
}

// Rank: exact evidence-map path (e.g. /security) > keyword in the URL path > keyword only in anchor text.
// Marketing pages (/product, /blog, /solutions...) describe what they SELL, not what they HOLD, so for
// the certs question they rank last.
function candidateLinks(question, state) {
  const { keywords, paths } = CONFIG.evidenceMap[question];
  const marketing = /\/(product|products|solutions?|blog|resources|use-cases|features|customers\/)/i;
  return state.links
    .filter((l) => !state.visited.has(l.url))
    .map((l) => {
      let p = '';
      try { const u = new URL(l.url); p = (u.hostname.split('.')[0] === 'trust' ? '/trust' : '') + u.pathname.toLowerCase(); } catch { return null; }
      let score = 0;
      if (paths.some((x) => p === x || p.endsWith(x))) score = 3;
      else if (keywords.some((k) => p.includes(k))) score = 2;
      else if (keywords.some((k) => l.text.toLowerCase().includes(k))) score = 1;
      if (score && question === 'certs' && marketing.test(p)) score = 0.5;
      return score ? { ...l, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

async function chooseNextPage(question, state, company) {
  let cands = candidateLinks(question, state);
  // Only weak (marketing-page) matches: try the conventional trust page first, e.g. /security.
  if (cands.length && cands[0].score < 1) {
    const guess = CONFIG.evidenceMap[question].paths.map((p) => state.origin + p).find((u) => !state.visited.has(u) && !state.triedGuesses.has(u));
    if (guess) { state.triedGuesses.add(guess); return { url: guess, why: 'only marketing pages linked; trying the conventional trust page', by: 'code' }; }
  }
  if (cands.length === 1) return { url: cands[0].url, why: `only link matching "${question}"`, by: 'code' };
  // A single exact evidence-map page (e.g. /security) needs no model call.
  if (cands.length > 1 && cands[0].score === 3 && cands[1].score < 3) return { url: cands[0].url, why: 'exact evidence-map page', by: 'code' };
  if (cands.length > 1) {
    const pick = await askJSON('loop', `We are researching ${company} and still need: ${QUESTIONS[question]}
Pick the ONE page most likely to answer it. Reply as JSON {"url": "...", "why": "..."}; url must be copied exactly from this list:
${cands.map((c) => `- ${c.url}  (${c.text || 'no text'})`).join('\n')}`);
    if (cands.some((c) => c.url === pick?.url)) return { url: pick.url, why: pick.why, by: 'gemini' };
  }
  // No link found on the site: guess the conventional path from the evidence map.
  const guess = CONFIG.evidenceMap[question].paths
    .map((p) => state.origin + p)
    .find((u) => !state.visited.has(u) && !state.triedGuesses.has(u));
  if (guess) { state.triedGuesses.add(guess); return { url: guess, why: 'conventional path from evidence map', by: 'code' }; }
  return null;
}

function stageOf(facts) {
  const s = facts.funding_stage?.value || '';
  if (CONFIG.stage.tooLate.some((x) => s.startsWith(x))) return 'too-late';
  const emp = facts.employee_count?.value;
  if (typeof emp === 'number' && emp > CONFIG.stage.maxEmployees) return 'too-late';
  if (/series [abc]/i.test(s)) return 'in-range';
  if (typeof emp === 'number' && emp >= CONFIG.stage.minEmployees) return 'in-range';
  if (facts.jobs && facts.jobs.titles.length >= CONFIG.stage.minOpenRoles) return 'in-range';
  if (realEnterprise(facts).length) return 'in-range';
  if (/seed|pre-seed/i.test(s)) return 'early';
  return 'unknown';
}

// --- the 5 gates ---------------------------------------------------------------
export function applyGates(facts, homepageOk, homepageReason) {
  const gates = [];
  const gate = (name, pass, why) => { gates.push({ name, pass, why }); return pass; };

  if (!homepageOk) {
    gate('Reachable', null, `site unreachable: ${homepageReason}`);
    return { status: 'review', reason: `site unreachable: ${homepageReason}`, gates };
  }
  gate('Reachable', true, 'homepage fetched and cleaned');

  if (facts.is_b2b_saas === null) {
    gate('B2B SaaS', null, 'not stated on any page read');
    return { status: 'review', reason: 'B2B unknown after budget', gates };
  }
  if (!gate('B2B SaaS', facts.is_b2b_saas.value === true, `"${facts.is_b2b_saas.quote}"`)) {
    return { status: 'dropped', reason: 'Not B2B SaaS', gates };
  }

  if (!gate('Not already on a compliance platform', !facts.platform,
    facts.platform ? `uses ${facts.platform.value} ("${facts.platform.quote}")` : 'no Vanta/Drata/Secureframe/etc. found')) {
    return { status: 'dropped', reason: `Already on ${facts.platform.value}`, gates };
  }

  const held = CONFIG.frameworks.filter((f) => has(facts.certifications_held, f));
  const left = CONFIG.frameworks.filter((f) => !held.includes(f));
  if (!gate('Has frameworks left to get', left.length > 0,
    left.length ? `still to get: ${left.join(', ')}${held.length ? ` (holds ${held.join(', ')})` : ''}` : `already holds ${held.join(', ')}`)) {
    return { status: 'dropped', reason: 'No frameworks left to get', gates };
  }

  const stage = stageOf(facts);
  if (stage === 'too-late') {
    gate('Series A-C', false, `${facts.funding_stage?.value || ''} ${facts.employee_count ? facts.employee_count.value + ' employees' : ''}`.trim());
    return { status: 'dropped', reason: 'Past Series C / too large', gates };
  }
  if (stage === 'early') {
    gate('Series A-C', false, `"${facts.funding_stage.quote}"`);
    return { status: 'dropped', reason: 'Too early (pre-Series A)', gates };
  }
  gate('Series A-C', stage === 'in-range' ? true : null, stage === 'in-range' ? stageEvidence(facts) : 'stage unknown: qualified at lower rank, flagged');

  return { status: 'qualified', flagged: stage === 'unknown', held, left, stage, gates };
}

function stageEvidence(f) {
  if (f.funding_stage) return `"${f.funding_stage.quote}"`;
  if (f.employee_count) return `${f.employee_count.value} employees`;
  if (f.jobs?.titles.length >= CONFIG.stage.minOpenRoles) return `${f.jobs.titles.length} open roles on ${f.jobs.board}`;
  return `enterprise signal: ${realEnterprise(f)[0].value}`;
}

// Fit score: only ranks companies that already passed every gate. Each point has a named reason.
export function fitScore(facts, result) {
  const parts = [];
  if (result.status !== 'qualified') return { score: 0, parts };
  const add = (pts, why) => parts.push({ pts, why });
  add(30, 'passed all hard gates');
  if (facts.funding_stage || facts.employee_count) add(20, 'stage confirmed (funding round or headcount stated)');
  else if (result.stage === 'in-range') add(10, 'stage inferred (open roles or enterprise plan)');
  const hiringSec = facts.compliance_pressure.filter((x) => x.by === 'jobs-api');
  if (hiringSec.length) add(15, `hiring for security/compliance: ${hiringSec[0].quote}`);
  const otherPressure = facts.compliance_pressure.filter((x) => x.by !== 'jobs-api');
  if (otherPressure.length) add(Math.min(otherPressure.length, 2) * 5, `compliance pressure: ${otherPressure.slice(0, 2).map((x) => x.value).join('; ')}`);
  if (realEnterprise(facts).length) add(10, `sells to enterprise: ${realEnterprise(facts)[0].value}`);
  if (facts.certifications_in_progress.length) add(10, `certification in progress: ${facts.certifications_in_progress[0].value}`);
  if (result.held.length) add(5, `already holds ${result.held.join(', ')} (knows the audit pain)`);
  if (result.left.length >= 2) add(5, `${result.left.length} frameworks still to get`);
  if (result.flagged) add(-15, 'stage unknown (flagged)');
  const score = Math.max(0, Math.min(100, parts.reduce((a, p) => a + p.pts, 0)));
  return { score, parts };
}

// --- the loop --------------------------------------------------------------------
export async function qualify(domain, company, trace) {
  const origin = `https://${domain}`;
  const facts = emptyFacts();
  const state = { origin, visited: new Set(), visitedFor: {}, triedGuesses: new Set(), links: [], pages: [], fetches: 0 };

  const home = await fetchPage(origin);
  state.visited.add(origin);
  state.pages.push({ url: origin, ok: home.ok, method: home.method, words: home.wordCount, reason: home.reason });
  if (!home.ok) {
    trace.push({ step: 'scrape', decision: 'homepage failed', why: home.reason });
    const r = applyGates(facts, false, home.reason);
    return { facts, ...r, pages: state.pages, score: 0 };
  }
  trace.push({ step: 'scrape', decision: `homepage read via ${home.method}`, why: `${home.wordCount} words after cleaning` });
  state.links = home.links || [];
  await extractInto(facts, company, home);

  // Job boards: public APIs, a cheap and strong stage + compliance-hiring signal.
  facts.jobs = await fetchJobs(domain);
  if (facts.jobs) {
    trace.push({ step: 'scrape', decision: `${facts.jobs.titles.length} open roles on ${facts.jobs.board}`, why: 'public job-board API' });
    const sec = facts.jobs.titles.filter((t) => /security|compliance|grc|risk|audit|privacy/i.test(t));
    sec.forEach((t) => facts.compliance_pressure.push({ value: `hiring: ${t}`, quote: t, source: facts.jobs.url, by: 'jobs-api' }));
  }

  const used = { b2b: 0, certs: 0, stage: 0 };
  let need = missing(facts, state);
  while (need.length && state.fetches < CONFIG.loop.maxExtraFetches) {
    const q = need.find((x) => used[x] < CONFIG.loop.budget[x]);
    if (!q) break;
    const next = await chooseNextPage(q, state, company);
    used[q]++;
    if (q === 'certs') state.visitedFor.certs = true;
    if (!next) { trace.push({ step: 'qualify', decision: `no page to try for "${q}"`, why: 'no matching link or path' }); need = missing(facts, state); continue; }

    state.fetches++;
    state.visited.add(next.url);
    const page = await fetchPage(next.url);
    state.pages.push({ url: next.url, ok: page.ok, method: page.method, words: page.wordCount, reason: page.reason, for: q });
    trace.push({ step: 'qualify', decision: `fetch ${next.url} for "${q}"`, why: `${next.why} (picked by ${next.by})${page.ok ? '' : ` - failed: ${page.reason}`}` });
    if (page.ok) {
      state.links.push(...(page.links || []).filter((l) => !state.links.some((x) => x.url === l.url)));
      await extractInto(facts, company, page);
    }
    need = missing(facts, state);
  }
  if (need.length) trace.push({ step: 'qualify', decision: `stopped with unanswered: ${need.join(', ')}`, why: `budget or cap (${state.fetches}/${CONFIG.loop.maxExtraFetches}) reached` });

  const result = applyGates(facts, true);
  const { score, parts } = fitScore(facts, result);
  trace.push({ step: 'qualify', decision: result.status + (result.flagged ? ' (flagged)' : ''), why: result.reason || `fit ${score}/100: ${parts.map((p) => `${p.pts > 0 ? '+' : ''}${p.pts} ${p.why}`).join('; ')}` });
  return { facts, ...result, pages: state.pages, score, scoreParts: parts };
}
