// Orchestrates the 7 steps for one domain and records every decision with its reason.
// Anything the rules cannot settle is parked (review / drafts), never guessed.

import { normalizeDomain } from './scrape.js';
import { qualify } from './qualify.js';
import { findContact } from './contact.js';
import { write, validate } from './write.js';
import { send } from './send.js';
import { usage } from './llm.js';
import { saveCompany, getCompany } from './store.js';

const companyName = (domain) => {
  const root = domain.split('.')[0];
  return root.charAt(0).toUpperCase() + root.slice(1);
};

const whyLine = (rec) =>
  `fit ${rec.score}/100; ${(rec.gates || []).map((g) => `${g.name}: ${g.why}`).join(' | ')}`;

export async function runOne(input, { dryRun = false, hint = '' } = {}) {
  const t0 = Date.now();
  const callsBefore = usage.calls;
  const domain = normalizeDomain(input);
  const company = companyName(domain);
  const trace = [];
  if (hint) trace.push({ step: 'input', decision: `hint: ${hint}`, why: 'given with the domain; not used as evidence' });

  const rec = { domain, company, startedAt: new Date().toISOString(), trace, dryRun };
  const finish = async (status, extra = {}) => {
    Object.assign(rec, { status, ...extra, seconds: Math.round((Date.now() - t0) / 1000), geminiCalls: usage.calls - callsBefore });
    await saveCompany(rec);
    return rec;
  };

  try {
    // Steps 1-3
    const q = await qualify(domain, company, trace);
    Object.assign(rec, { facts: q.facts, gates: q.gates, pages: q.pages, score: q.score, scoreParts: q.scoreParts || [], flagged: !!q.flagged });
    if (q.status !== 'qualified') return finish(q.status === 'review' ? 'review' : 'dropped', { reason: q.reason });

    // Step 4
    const c = await findContact(domain, q.facts, trace);
    rec.contact = c;
    if (!c.ok) return finish('review', { reason: c.reason });

    // Steps 5-6
    const w = await write(company, c.person, q.facts, q, trace);
    Object.assign(rec, { evidence: w.evidence, pains: w.pains, email: w.email, originalEmail: { ...w.email }, validation: w.check });
    if (!w.check.ok) return finish('draft', { reason: 'validator failed: ' + w.check.errors.join('; ') });
    if (q.flagged) return finish('draft', { reason: 'flagged: stage unknown, needs a human check before sending' });

    // Step 7
    if (dryRun) return finish('ready', { reason: 'dry run: passed every gate, not sent' });
    const s = await sendEmail(rec, w.email.subject, w.email.body);
    rec.send = s;
    trace.push({ step: 'send', decision: s.sent ? `sent to ${s.to}` : 'not sent', why: s.sent ? 'all gates and validator passed' : s.reason });
    return finish(s.sent ? 'sent' : 'draft', { reason: s.sent ? undefined : s.reason });
  } catch (e) {
    trace.push({ step: 'error', decision: 'pipeline error', why: e.message });
    return finish('review', { reason: `error: ${e.message}` });
  }
}

function sendEmail(rec, subject, body) {
  const p = rec.contact.person;
  return send({
    subject, body, company: rec.company,
    intendedFor: { name: `${p.first_name} ${p.last_name || ''}`.trim(), email: p.email, position: p.position },
    why: whyLine(rec),
  });
}

// Share of the original email a human changed (word-level), the "edit rate" metric.
export function editRate(original, edited) {
  const a = String(original || '').split(/\s+/).filter(Boolean);
  const b = String(edited || '').split(/\s+/).filter(Boolean);
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return Math.min(1, dp[a.length][b.length] / Math.max(a.length, 1));
}

// Human gate 2: a reviewer edits a draft and sends it (still only to MY_EMAIL).
export async function approveAndSend(domain, subject, body) {
  const rec = await getCompany(domain);
  if (!rec?.contact?.ok) return { ok: false, error: 'no contact on record' };
  // The human is the judge here; validator results are kept as notes, not blockers.
  const check = validate({ ...rec.email, subject, body }, rec.contact.person, rec.evidence || [], rec.pains || []);
  const rate = editRate(`${rec.originalEmail?.subject} ${rec.originalEmail?.body}`, `${subject} ${body}`);
  const s = await sendEmail(rec, subject, body);
  rec.trace.push({ step: 'human', decision: s.sent ? `approved and sent to ${s.to}` : 'approve failed', why: `edited ${Math.round(rate * 100)}% of the draft${check.ok ? '' : `; validator notes: ${check.errors.join('; ')}`}` });
  Object.assign(rec, { email: { ...rec.email, subject, body }, editRate: rate, send: s, status: s.sent ? 'sent' : rec.status, reason: s.sent ? undefined : s.reason, approvedAt: new Date().toISOString() });
  await saveCompany(rec);
  return { ok: s.sent, error: s.reason, editRate: rate };
}

export function printReport(r) {
  const icon = { sent: '✅', ready: '🟢', draft: '📝', review: '🟡', dropped: '⛔' }[r.status] || '•';
  const lines = [`\n${icon} ${r.company} (${r.domain}) - ${r.status.toUpperCase()}${r.score ? ` · fit ${r.score}/100` : ''}${r.reason ? ` · ${r.reason}` : ''}`];
  for (const g of r.gates || []) lines.push(`   ${g.pass === true ? '✓' : g.pass === false ? '✗' : '?'} ${g.name}: ${g.why}`);
  if (r.contact?.ok) lines.push(`   → PoC: ${r.contact.person.first_name} ${r.contact.person.last_name || ''}, ${r.contact.person.position} (${r.contact.why})`);
  (r.pains || []).forEach((p, i) => lines.push(`   pain ${i + 1}: ${p.pain} [${p.evidence_ids.join(', ')}]`));
  if (r.email?.subject) lines.push(`   ✉ ${r.email.subject}\n${r.email.body.split('\n').map((l) => '     ' + l).join('\n')}`);
  lines.push(`   ${r.seconds}s · ${r.pages?.length || 0} pages · ${r.geminiCalls} Gemini calls`);
  console.log(lines.join('\n'));
}
