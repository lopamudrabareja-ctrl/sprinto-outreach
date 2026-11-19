// Step 2: Gemini extracts named facts, each with a verbatim quote.
// Code verifies every quote against the page text; a quote that isn't on the page is discarded.
// Certifications and competitor platforms are also detected by plain regex, no model needed.

import { askJSON } from './llm.js';
import { CONFIG } from './config.js';

export const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, '')
    .replace(/[^a-z0-9%$.,+\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function quoteOnPage(quote, pageText) {
  const q = norm(quote);
  if (q.split(' ').length < 2) return false;
  return norm(pageText).includes(q);
}

const PROMPT = (company, url, text) => `You are extracting facts about ${company} from one page of its website (${url}).
Only report what the page states. Every fact needs "quote": an exact, verbatim substring copied from the page (5-25 words).
If the page doesn't state a fact, use null (or an empty list). Never infer from general knowledge.

Return JSON with exactly these keys:
{
  "product_summary": {"value": "one plain sentence: what they sell and to whom", "quote": "..."} | null,
  "is_b2b_saas": {"value": true|false, "quote": "..."} | null,   // true only if a software product is sold to businesses/teams
  "buyer": {"value": "who buys it, e.g. 'finance teams at mid-market companies'", "quote": "..."} | null,
  "funding_stage": {"value": "Seed|Series A|Series B|Series C|Series D|Series E|Public|Acquired", "quote": "..."} | null,
  "employee_count": {"value": number, "quote": "..."} | null,
  "certifications_held": [{"value": "SOC 2|ISO 27001|GDPR|HIPAA|PCI DSS|other", "quote": "..."}],
  "certifications_in_progress": [{"value": "...", "quote": "..."}],
  "enterprise_signals": [{"value": "short label, e.g. 'Enterprise plan with SSO', 'customer: Deloitte'", "quote": "..."}],
  "compliance_pressure": [{"value": "short label, e.g. 'sells to banks', 'hiring a security engineer', 'security questionnaire mentioned'", "quote": "..."}],
  "recent_news": [{"value": "launch, funding, expansion or hire announced on the page", "quote": "..."}]
}

PAGE TEXT:
"""
${text}
"""`;

const SINGLE = ['product_summary', 'is_b2b_saas', 'buyer', 'funding_stage', 'employee_count'];
const LISTS = ['certifications_held', 'certifications_in_progress', 'enterprise_signals', 'compliance_pressure', 'recent_news'];

export function emptyFacts() {
  const f = {};
  SINGLE.forEach((k) => (f[k] = null));
  LISTS.forEach((k) => (f[k] = []));
  f.discarded = 0;
  f.platform = null;
  f.jobs = null;
  return f;
}

// Extract from one page and merge verified facts into `facts` (mutates + returns it).
export async function extractInto(facts, company, page) {
  const raw = await askJSON('extract', PROMPT(company, page.url, page.text));
  const haystack = page.text + '\n' + (page.scanText || '');
  const verified = (item) => item && item.value !== undefined && item.value !== null && quoteOnPage(item.quote, haystack);

  for (const k of SINGLE) {
    const item = raw?.[k];
    if (!item) continue;
    if (!verified(item)) { facts.discarded++; continue; }
    if (facts[k] === null) facts[k] = { ...item, source: page.url };
  }
  for (const k of LISTS) {
    for (const item of raw?.[k] || []) {
      if (!verified(item)) { facts.discarded++; continue; }
      if (!facts[k].some((x) => norm(x.value) === norm(item.value))) facts[k].push({ ...item, source: page.url });
    }
  }

  scanInto(facts, page);
  return facts;
}

// Code-only scans: certification badges (often only in footer / img alt) and competitor platforms.
const CERT_PATTERNS = {
  'SOC 2': /soc\s?-?2|soc\s?ii\b/i,
  'ISO 27001': /iso\s?\/?\s?(iec\s?)?27001/i,
  'GDPR': /\bgdpr\b/i,
  'HIPAA': /\bhipaa\b/i,
};

export function scanInto(facts, page) {
  const t = page.scanText || page.text || '';
  for (const [name, re] of Object.entries(CERT_PATTERNS)) {
    const m = t.match(new RegExp(`.{0,60}${re.source}.{0,60}`, 'i'));
    if (!m) continue;
    const ctx = m[0].replace(/\s+/g, ' ').trim();
    // "in progress / working towards" is not "held"
    const inProgress = /progress|pursuing|working towards|underway|pending|upcoming/i.test(ctx);
    const list = inProgress ? facts.certifications_in_progress : facts.certifications_held;
    if (!list.some((x) => x.value === name)) list.push({ value: name, quote: ctx, source: page.url, by: 'regex' });
  }
  if (!facts.platform) {
    for (const [vendor, res] of Object.entries(CONFIG.competitorPlatforms)) {
      const re = res[0]; // first pattern = strong signal (a link to their trust portal)
      const m = t.match(re);
      if (m) { facts.platform = { value: vendor, quote: m[0], source: page.url }; break; }
    }
  }
}
