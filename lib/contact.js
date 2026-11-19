// Step 4: find the PoC.
// Option B first: data/contacts.json (looked up by hand in Apollo). Option A: Hunter Domain Search.
// Hunter results are cached forever: the free tier is 25 searches a month.
// The person is chosen by a title priority list that depends on stage, never "anyone senior".

import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from './config.js';
import { kvGet, kvSet } from './store.js';

// Manual contacts: data/contacts.json (committed) plus any added from the Review page.
export async function manualContacts(domain) {
  const file = path.join(process.cwd(), 'data', 'contacts.json');
  const fromFile = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8'))[domain] || [] : [];
  const fromUi = (await kvGet(`contacts:${domain}`)) || [];
  return [...fromUi, ...fromFile].map((c) => ({ ...c, source: c.source || 'apollo (manual)' }));
}

export async function addManualContact(domain, person) {
  const list = (await kvGet(`contacts:${domain}`)) || [];
  list.unshift({ ...person, source: person.source || 'added in dashboard (apollo, manual)' });
  await kvSet(`contacts:${domain}`, list);
}

async function hunter(domain) {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return { people: [], note: 'no HUNTER_API_KEY' };
  const cached = await kvGet(`hunter:${domain}`);
  if (cached) return { people: cached, note: 'hunter (cached)' };

  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&type=personal&limit=10`;
  const res = await fetch(url, { headers: { 'X-API-KEY': key } });
  const json = await res.json();
  if (!res.ok) return { people: [], note: `hunter error: ${json.errors?.[0]?.details || res.status}` };

  const people = (json.data?.emails || []).map((e) => ({
    first_name: e.first_name, last_name: e.last_name, position: e.position || '',
    email: e.value, confidence: e.confidence, linkedin: e.linkedin, source: 'hunter',
  }));
  await kvSet(`hunter:${domain}`, people);
  return { people, note: 'hunter' };
}

export function tierFor(facts) {
  const s = facts.funding_stage?.value || '';
  const emp = facts.employee_count?.value || 0;
  const roles = facts.jobs?.titles.length || 0;
  if (/series [bc]/i.test(s) || emp >= 100 || roles >= 20) return 'growth';
  return 'early';
}

export async function findContact(domain, facts, trace) {
  let people = await manualContacts(domain);
  let source = 'data/contacts.json';
  if (!people.length) {
    const h = await hunter(domain);
    people = h.people;
    source = h.note;
  }
  people = people.filter((p) => p.first_name && p.position);
  if (!people.length) {
    trace.push({ step: 'contact', decision: 'no named people found', why: source });
    return { ok: false, reason: 'no decision-maker found', source };
  }

  const tier = tierFor(facts);
  const order = CONFIG.contactPriority[tier];
  for (let rank = 0; rank < order.length; rank++) {
    const match = people
      .filter((p) => order[rank].test(p.position))
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
    if (match) {
      const why = `${tier} stage -> title priority #${rank + 1} matched "${match.position}"` +
        (match.confidence ? `, email confidence ${match.confidence}%` : '');
      trace.push({ step: 'contact', decision: `${match.first_name} ${match.last_name || ''} (${match.position})`.trim(), why: `${why} via ${source}` });
      return { ok: true, person: match, tier, rank: rank + 1, why, source, consideredCount: people.length };
    }
  }
  const seen = people.slice(0, 5).map((p) => p.position).join('; ');
  trace.push({ step: 'contact', decision: 'no one matched the title list', why: `found: ${seen}` });
  return { ok: false, reason: 'no decision-maker found', source, seen };
}
