import Link from 'next/link';
import { listCompanies } from '../../lib/store.js';
import { Pill, Ring, Avatar, personName } from '../ui.js';
import DraftEditor from './DraftEditor.js';

export const dynamic = 'force-dynamic';

export default async function Drafts() {
  const all = await listCompanies();
  const open = all.filter((c) => (c.status === 'draft' || c.status === 'ready') && c.email?.body).sort((a, b) => b.score - a.score);
  const sent = all.filter((c) => c.status === 'sent');
  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">Human gate 2</div>
          <h1>Drafts &amp; sends</h1>
          <p className="lede">Dry-run emails ready to go, plus drafts that failed the validator or carry a flag. Edit, then send to your inbox. Your edits are measured, and can become lessons for the writer.</p>
        </div>
      </div>
      {!open.length && <div className="card empty"><b>No drafts waiting</b>Run some domains, or check the review queue.</div>}
      <div className="grid">
        {open.map((c) => (
          <div className="card" key={c.domain}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <div className="row" style={{ gap: 12, flexWrap: 'nowrap', minWidth: 0 }}>
                <Avatar name={c.company} size={40} />
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}><Link href={`/companies/${c.domain}`}><b style={{ fontSize: 15 }}>{c.company}</b></Link><Pill status={c.status} /></div>
                  <div className="small muted">To {personName(c)} · {c.contact.person.position}</div>
                  {c.status === 'draft' && <div className="small unk">{c.reason}</div>}
                </div>
              </div>
              <Ring value={c.score} size={46} stroke={5} />
            </div>
            <DraftEditor
              domain={c.domain}
              subject={c.email.subject}
              body={c.email.body}
              evidence={(c.evidence || []).map((e) => ({ id: e.id, label: e.label, quote: e.quote }))}
              hook={c.email.hook_evidence_id}
            />
          </div>
        ))}
      </div>

      <div className="sec"><h2>Sent</h2><span className="hint">only ever to your own inbox</span></div>
      {!sent.length ? <div className="card empty small">Nothing sent yet.</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Company</th><th>Intended for</th><th>Subject</th><th>Edit rate</th></tr></thead>
            <tbody>
              {sent.map((c) => (
                <tr key={c.domain}>
                  <td><Link href={`/companies/${c.domain}`} className="co"><Avatar name={c.company} /><b>{c.company}</b></Link></td>
                  <td className="small">{personName(c)}<div className="muted">{c.contact.person.position}</div></td>
                  <td className="small">{c.email.subject}</td>
                  <td className="mono">{typeof c.editRate === 'number' ? `${Math.round(c.editRate * 100)}%` : 'auto-sent'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
