import { listCompanies } from '../../../lib/store.js';

export const dynamic = 'force-dynamic';

const esc = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const all = await listCompanies();
  const head = ['company', 'domain', 'status', 'fit', 'reason', 'contact', 'title', 'contact_source', 'subject', 'email_body', 'gates', 'seconds', 'pages_read', 'updated'];
  const rows = all.map((c) => [
    c.company, c.domain, c.status, c.score || '', c.reason || '',
    c.contact?.ok ? `${c.contact.person.first_name} ${c.contact.person.last_name || ''}`.trim() : '',
    c.contact?.ok ? c.contact.person.position : '', c.contact?.source || '',
    c.email?.subject || '', c.email?.body || '',
    (c.gates || []).map((g) => `${g.name}:${g.pass === true ? 'pass' : g.pass === false ? 'fail' : 'unclear'}`).join(' | '),
    c.seconds || '', c.pages?.length || 0, c.updatedAt || c.startedAt,
  ].map(esc).join(','));
  return new Response([head.join(','), ...rows].join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="sprinto-outreach-companies.csv"' },
  });
}
