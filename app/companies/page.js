import { listCompanies } from '../../lib/store.js';
import { CompanyTable } from '../ui.js';

export const dynamic = 'force-dynamic';

export default async function Companies() {
  const all = await listCompanies();
  const order = { sent: 0, ready: 1, draft: 2, review: 3, dropped: 4 };
  const rows = [...all].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || (b.score || 0) - (a.score || 0));
  return (
    <>
      <h1>Companies</h1>
      <p className="lede">Every company researched, ranked by status and fit. Open one to see exactly why.</p>
      <CompanyTable rows={rows} />
    </>
  );
}
