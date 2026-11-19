import { listCompanies } from '../../lib/store.js';
import CompaniesClient from './CompaniesClient.js';
import Icon from '../icons.js';

export const dynamic = 'force-dynamic';

export default async function Companies() {
  const all = await listCompanies();
  const rows = all.map((c) => ({
    domain: c.domain, company: c.company, status: c.status, score: c.score || 0, reason: c.reason || '',
    person: c.contact?.ok ? `${c.contact.person.first_name} ${c.contact.person.last_name || ''}`.trim() : '',
    position: c.contact?.ok ? c.contact.person.position : '',
    subject: c.email?.subject || '', seconds: c.seconds || 0, updatedAt: c.updatedAt || c.startedAt,
    gates: (c.gates || []).map((g) => g.pass),
  }));
  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">Pipeline</div>
          <h1>Companies</h1>
          <p className="lede">Every company researched. Search, filter by status, and open one to see exactly why it was qualified, parked or dropped.</p>
        </div>
        <a className="btn ghost" href="/api/export"><Icon name="download" /> Export CSV</a>
      </div>
      <CompaniesClient rows={rows} />
    </>
  );
}
