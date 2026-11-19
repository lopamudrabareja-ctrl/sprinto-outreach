import Link from 'next/link';
import { listCompanies } from '../../lib/store.js';
import { Pill, personName } from '../ui.js';
import DraftEditor from './DraftEditor.js';

export const dynamic = 'force-dynamic';

export default async function Drafts() {
  const all = await listCompanies();
  const open = all.filter((c) => (c.status === 'draft' || c.status === 'ready') && c.email?.body);
  const sent = all.filter((c) => c.status === 'sent');
  return (
    <>
      <h1>Drafts &amp; sends</h1>
      <p className="lede">Human gate 2. Drafts that failed the validator or carry a flag, plus dry-run emails ready to go. Edit, then send. Your edits are measured (edit rate) and can become lessons for the writer.</p>
      {!open.length && <div className="card muted">No drafts waiting.</div>}
      <div className="grid">
        {open.map((c) => (
          <div className="card" key={c.domain}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <Link href={`/companies/${c.domain}`}><b>{c.company}</b></Link> <Pill status={c.status} /> <span className="mono">fit {c.score}</span>
                <div className="small muted">To {personName(c)}, {c.contact.person.position} · {c.reason}</div>
              </div>
            </div>
            <DraftEditor domain={c.domain} subject={c.email.subject} body={c.email.body} />
          </div>
        ))}
      </div>

      <h2>Sent</h2>
      {!sent.length && <div className="card muted">Nothing sent yet.</div>}
      {sent.length > 0 && (
        <table>
          <thead><tr><th>Company</th><th>To (intended)</th><th>Subject</th><th>Edit rate</th></tr></thead>
          <tbody>
            {sent.map((c) => (
              <tr key={c.domain}>
                <td><Link href={`/companies/${c.domain}`}><b>{c.company}</b></Link></td>
                <td className="small">{personName(c)}<div className="muted">{c.contact.person.position}</div></td>
                <td className="small">{c.email.subject}</td>
                <td className="mono">{typeof c.editRate === 'number' ? `${Math.round(c.editRate * 100)}%` : 'auto-sent'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
