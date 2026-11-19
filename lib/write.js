// Steps 5-6: two evidence-linked pain points, then the email.
// Gemini writes; code validates. Every pain point and the hook must point at a verified quote,
// and every number in the email must appear in that evidence (no invented stats).

import { askJSON } from './llm.js';
import { CONFIG } from './config.js';
import { norm } from './extract.js';
import { getLessons } from './store.js';

const ABOUT_SPRINTO = `Sprinto automates compliance certifications (SOC 2, ISO 27001, GDPR, HIPAA) for SaaS companies:
it connects to cloud, HR and code tools, collects audit evidence automatically, monitors controls continuously,
and helps answer enterprise security questionnaires. Do not claim anything else about Sprinto, and use no Sprinto numbers.`;

export function buildEvidence(facts, q) {
  const ev = [];
  const add = (label, item) => item && ev.push({ id: `E${ev.length + 1}`, label, value: String(item.value), quote: item.quote, source: item.source });
  add('Product', facts.product_summary);
  add('Buyer', facts.buyer);
  add('Funding stage', facts.funding_stage);
  add('Headcount', facts.employee_count);
  facts.certifications_held.forEach((x) => add('Certification held', x));
  facts.certifications_in_progress.forEach((x) => add('Certification in progress', x));
  facts.enterprise_signals.slice(0, 4).forEach((x) => add('Enterprise signal', x));
  facts.compliance_pressure.slice(0, 4).forEach((x) => add('Compliance pressure', x));
  facts.recent_news.slice(0, 3).forEach((x) => add('Recent news', x));
  if (facts.jobs) ev.push({ id: `E${ev.length + 1}`, label: 'Open roles', value: `${facts.jobs.titles.length} open roles`, quote: facts.jobs.titles.slice(0, 6).join('; '), source: facts.jobs.url });
  if (q.left?.length) ev.push({ id: `E${ev.length + 1}`, label: 'Frameworks not yet shown on site', value: q.left.join(', '), quote: '(absence: not found on any page read)', source: 'code' });
  return ev;
}

const evText = (ev) => ev.map((e) => `${e.id} [${e.label}] ${e.value} | quote: "${e.quote}"`).join('\n');


export async function painPoints(company, person, ev) {
  const out = await askJSON('write', `You are a B2B researcher for Sprinto.
${ABOUT_SPRINTO}

Prospect: ${company}. Contact: ${person.first_name} ${person.last_name || ''}, ${person.position}.
Evidence (only use these):
${evText(ev)}

Name the TWO most likely compliance-related pain points for THIS person in THIS role, each grounded in specific evidence.
Return JSON: {"pain_points": [{"pain": "one sentence, from their point of view", "evidence_ids": ["E1"], "why_this_person": "..."}]}`);
  return out?.pain_points?.slice(0, 2) || [];
}

export async function draftEmail(company, person, ev, pains, feedback = []) {
  const ls = (await getLessons()).map((l) => l.text);
  return askJSON('write', `Write a cold email from ${process.env.SENDER_NAME || 'Alex'} at Sprinto.
${ABOUT_SPRINTO}

To: ${person.first_name} (${person.position}) at ${company}.
Evidence (the ONLY facts you may state about them):
${evText(ev)}

Pain points to address:
${pains.map((p, i) => `${i + 1}. ${p.pain} (evidence ${p.evidence_ids.join(', ')})`).join('\n')}

Rules:
- Open with "Hi ${person.first_name}," then a hook that is a specific fact from the evidence, not flattery.
- ${CONFIG.email.minWords}-${CONFIG.email.maxWords} words in the body. Plain text. No bullet points. No links.
- Connect the hook to one pain point, say in one sentence how Sprinto removes it, end with a low-friction question.
- No numbers unless the number appears in the evidence. No invented customers, metrics or claims.
- Subject under ${CONFIG.email.maxSubjectChars} characters, lowercase is fine, no clickbait.
- Never use: ${CONFIG.email.bannedPhrases.join('; ')}.
- Sign off with just the sender's first name and "Sprinto".
${ls.length ? `\nLessons from the Growth Lead's past edits (follow them):\n${ls.map((l) => `- ${l}`).join('\n')}` : ''}
${feedback.length ? `\nYour previous draft failed these checks, fix them:\n${feedback.map((f) => `- ${f}`).join('\n')}` : ''}

Return JSON: {"subject": "...", "body": "...", "hook_evidence_id": "E?", "hook_sentence": "the exact hook sentence from the body"}`, { temperature: 0.6 });
}

// --- validator: code decides -----------------------------------------------------
export function validate(email, person, ev, pains) {
  const errors = [];
  const ids = new Set(ev.map((e) => e.id));
  const body = email?.body || '';
  const subject = email?.subject || '';
  const words = body.split(/\s+/).filter(Boolean).length;

  if (!body.includes(person.first_name)) errors.push(`must address ${person.first_name} by name`);
  if (words < CONFIG.email.minWords || words > CONFIG.email.maxWords) errors.push(`body is ${words} words; must be ${CONFIG.email.minWords}-${CONFIG.email.maxWords}`);
  if (!subject || subject.length > CONFIG.email.maxSubjectChars) errors.push(`subject must be 1-${CONFIG.email.maxSubjectChars} characters`);
  if (!ids.has(email?.hook_evidence_id)) errors.push('hook must cite a valid evidence id');
  else if (ev.find((e) => e.id === email.hook_evidence_id).source === 'code') errors.push('hook cannot rest on an absence; use a stated fact');
  if (!email?.hook_sentence || !norm(body).includes(norm(email.hook_sentence))) errors.push('hook_sentence must appear verbatim in the body');
  if (pains.length < 2) errors.push('need two pain points');
  pains.forEach((p, i) => { if (!p.evidence_ids?.length || !p.evidence_ids.every((id) => ids.has(id))) errors.push(`pain point ${i + 1} cites unknown evidence`); });

  const lower = (subject + ' ' + body).toLowerCase();
  CONFIG.email.bannedPhrases.forEach((p) => { if (lower.includes(p)) errors.push(`banned phrase: "${p}"`); });

  // Invented numbers: every number must appear somewhere in the evidence.
  const evidenceBlob = norm(ev.map((e) => `${e.value} ${e.quote}`).join(' '));
  const allowed = new Set(['2', '27001']); // "SOC 2", "ISO 27001"
  const nums = (subject + ' ' + body).match(/\d[\d,.]*%?/g) || [];
  nums.map((n) => n.replace(/[.,]$/, '')).forEach((n) => {
    if (!allowed.has(n) && !evidenceBlob.includes(norm(n))) errors.push(`number "${n}" is not in the evidence`);
  });

  return { ok: errors.length === 0, errors, words };
}

export async function write(company, person, facts, q, trace) {
  const ev = buildEvidence(facts, q);
  let pains = await painPoints(company, person, ev);
  if (pains.length < 2) pains = await painPoints(company, person, ev); // one retry; validator still checks
  trace.push({ step: 'pain points', decision: pains.map((p) => p.pain).join(' | '), why: pains.map((p) => p.evidence_ids.join('+')).join(' / ') });

  let email = await draftEmail(company, person, ev, pains);
  let check = validate(email, person, ev, pains);
  if (!check.ok) {
    trace.push({ step: 'write', decision: 'draft 1 failed validator, rewriting once', why: check.errors.join('; ') });
    email = await draftEmail(company, person, ev, pains, check.errors);
    check = validate(email, person, ev, pains);
  }
  trace.push({ step: 'write', decision: check.ok ? 'draft passed validator' : 'draft failed validator twice -> Drafts', why: check.ok ? `${check.words} words, hook on ${email.hook_evidence_id}` : check.errors.join('; ') });
  return { evidence: ev, pains, email, check };
}
