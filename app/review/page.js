import Link from 'next/link';
import { listCompanies } from '../../lib/store.js';
import RerunButton from '../RerunButton.js';
import ContactForm from './ContactForm.js';

export const dynamic = 'force-dynamic';

export default async function Review() {
  const rows = (await listCompanies()).filter((c) => c.status === 'review');
  return (
    <>
      <h1>Review queue</h1>
      <p className="lede">Human gate 1. Anything the rules could not settle lands here instead of being guessed: site unreachable, B2B unclear, no decision-maker, or Gemini out of quota.</p>
      {!rows.length && <div className="card muted">Queue is empty.</div>}
      <div className="grid">
        {rows.map((c) => (
          <div className="card" key={c.domain}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <Link href={`/companies/${c.domain}`}><b>{c.company}</b></Link> <span className="muted mono">{c.domain}</span>
                {c.score ? <span className="mono"> · fit {c.score}</span> : null}
                <div className="small" style={{ marginTop: 2 }}>{(c.reason || '').length > 220 ? c.reason.slice(0, 220) + '…' : c.reason}</div>
                {c.contact?.seen && <div className="small muted">Titles Hunter found: {c.contact.seen}</div>}
              </div>
              <RerunButton domain={c.domain} />
            </div>
            {c.reason === 'no decision-maker found' && (
              <div style={{ marginTop: 12 }}>
                <div className="small muted" style={{ marginBottom: 6 }}>Look the right person up in Apollo (CTO / founder for early stage; security or compliance lead for Series B–C), add them, then re-run.</div>
                <ContactForm domain={c.domain} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
