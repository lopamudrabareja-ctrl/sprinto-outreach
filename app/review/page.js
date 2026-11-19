import Link from 'next/link';
import { listCompanies } from '../../lib/store.js';
import { Ring, Avatar } from '../ui.js';
import RerunButton from '../RerunButton.js';
import ContactForm from './ContactForm.js';
import Icon from '../icons.js';

export const dynamic = 'force-dynamic';

function advice(c) {
  const r = c.reason || '';
  if (r === 'no decision-maker found') return ['user', 'No one with the right title was found. Look them up in Apollo or LinkedIn, add them below, and it re-runs.'];
  if (r.startsWith('site unreachable')) return ['globe', 'The site could not be read (blocked, down or a typo). Check the domain, then re-run.'];
  if (r.startsWith('B2B unknown')) return ['alert', 'The site never said who it sells to. Open it yourself: if it is B2B software, re-run or drop it.'];
  if (/quota|Gemini/i.test(r)) return ['clock', 'Gemini ran out of free quota mid-run. Re-run tomorrow, or enable billing in AI Studio.'];
  return ['alert', 'The rules could not settle this one. Open the company to see the trace.'];
}

export default async function Review() {
  const rows = (await listCompanies()).filter((c) => c.status === 'review').sort((a, b) => (b.score || 0) - (a.score || 0));
  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">Human gate 1</div>
          <h1>Review queue</h1>
          <p className="lede">Anything the rules could not settle lands here instead of being guessed. Each item says what to do next.</p>
        </div>
      </div>
      {!rows.length && <div className="card empty"><b>Queue is empty</b>Nothing needs a human right now.</div>}
      <div className="grid">
        {rows.map((c) => {
          const [icon, tip] = advice(c);
          const q = encodeURIComponent(`${c.company} CTO OR founder OR "head of security"`);
          return (
            <div className="card" key={c.domain}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="row" style={{ gap: 12, flexWrap: 'nowrap', minWidth: 0 }}>
                  <Avatar name={c.company} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 8 }}><Link href={`/companies/${c.domain}`}><b style={{ fontSize: 15 }}>{c.company}</b></Link><span className="muted mono">{c.domain}</span></div>
                    <div className="small unk" style={{ marginTop: 2 }}>{(c.reason || '').length > 200 ? c.reason.slice(0, 200) + '…' : c.reason}</div>
                    <div className="small muted row" style={{ gap: 6, marginTop: 6, flexWrap: 'nowrap', alignItems: 'flex-start' }}><Icon name={icon} size={14} /> <span>{tip}</span></div>
                    {c.contact?.seen && <div className="small muted" style={{ marginTop: 4 }}>Titles Hunter found: {c.contact.seen}</div>}
                  </div>
                </div>
                <div className="row">
                  {c.score > 0 && <Ring value={c.score} size={46} stroke={5} />}
                  <RerunButton domain={c.domain} />
                </div>
              </div>
              {c.reason === 'no decision-maker found' && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                  <div className="row small" style={{ marginBottom: 10 }}>
                    <a className="btn ghost" href={`https://www.linkedin.com/search/results/people/?keywords=${q}`} target="_blank" rel="noreferrer"><Icon name="search" /> Find on LinkedIn</a>
                    <a className="btn ghost" href="https://app.apollo.io/#/people" target="_blank" rel="noreferrer"><Icon name="user" /> Open Apollo</a>
                  </div>
                  <ContactForm domain={c.domain} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
