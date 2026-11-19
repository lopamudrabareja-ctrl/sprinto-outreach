import Link from 'next/link';

export const LABEL = { sent: 'Sent', ready: 'Ready to send', draft: 'Draft', review: 'Needs review', dropped: 'Dropped' };

export function Pill({ status }) {
  return <span className={`pill p-${status}`}>{LABEL[status] || status}</span>;
}

export function personName(c) {
  const p = c?.contact?.person;
  return p ? `${p.first_name} ${p.last_name || ''}`.trim() : null;
}

export function CompanyTable({ rows, empty = 'Nothing here yet.' }) {
  if (!rows.length) return <div className="card muted">{empty}</div>;
  return (
    <table>
      <thead>
        <tr><th>Company</th><th>Status</th><th>Fit</th><th>Contact</th><th>Why</th></tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.domain}>
            <td><Link href={`/companies/${c.domain}`}><b>{c.company}</b></Link><div className="muted mono">{c.domain}</div></td>
            <td><Pill status={c.status} /></td>
            <td className="mono">{c.score ? `${c.score}` : '·'}</td>
            <td className="small">{personName(c) ? <>{personName(c)}<div className="muted">{c.contact.person.position}</div></> : <span className="muted">·</span>}</td>
            <td className="small">{c.reason || (c.email?.subject ? `✉ ${c.email.subject}` : '')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
