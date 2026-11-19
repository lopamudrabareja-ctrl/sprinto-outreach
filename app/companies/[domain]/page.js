import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCompany } from '../../../lib/store.js';
import { Pill, Ring, Avatar, personName, timeAgo } from '../../ui.js';
import RerunButton from '../../RerunButton.js';
import CopyButton from '../../CopyButton.js';
import Icon from '../../icons.js';

export const dynamic = 'force-dynamic';

const FACT_LABELS = {
  product_summary: 'Product', is_b2b_saas: 'B2B SaaS', buyer: 'Buyer', funding_stage: 'Funding stage', employee_count: 'Headcount',
  certifications_held: 'Certifications held', certifications_in_progress: 'In progress', enterprise_signals: 'Enterprise signals',
  compliance_pressure: 'Compliance pressure', recent_news: 'Recent news',
};
const GATE_ORDER = ['Reachable', 'B2B SaaS', 'Not already on a compliance platform', 'Has frameworks left to get', 'Series A-C'];
const STEP_ICON = { scrape: 'globe', qualify: 'target', contact: 'user', 'pain points': 'spark', write: 'file', send: 'mail', human: 'check', error: 'alert', input: 'play' };

export default async function CompanyPage({ params }) {
  const { domain } = await params;
  const c = await getCompany(decodeURIComponent(domain));
  if (!c) notFound();
  const f = c.facts || {};
  const gates = GATE_ORDER.map((name) => (c.gates || []).find((g) => g.name === name) || { name, pass: undefined });
  const maxPart = Math.max(1, ...(c.scoreParts || []).map((p) => Math.abs(p.pts)));
  const person = c.contact?.ok ? c.contact.person : null;

  return (
    <>
      <div className="card glow" style={{ marginBottom: 16 }}>
        <div className="row between" style={{ alignItems: 'center' }}>
          <div className="row" style={{ gap: 14, flexWrap: 'nowrap', minWidth: 0 }}>
            <Avatar name={c.company} size={54} />
            <div style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 10 }}><h1>{c.company}</h1><Pill status={c.status} />{c.flagged && <span className="pill p-review">flagged</span>}</div>
              <div className="small muted" style={{ marginTop: 4 }}>
                <a href={`https://${c.domain}`} target="_blank" rel="noreferrer" className="mono">{c.domain} ↗</a>
                {' · '}{c.seconds}s · {c.pages?.length || 0} {c.pages?.length === 1 ? 'page' : 'pages'} read ·{c.geminiCalls} Gemini calls · {timeAgo(c.updatedAt || c.startedAt)}
              </div>
              {c.reason && <div className="small" style={{ marginTop: 6, color: c.status === 'dropped' ? 'var(--bad)' : c.status === 'review' ? 'var(--warn)' : 'var(--ink2)' }}>{c.reason.length > 220 ? c.reason.slice(0, 220) + '…' : c.reason}</div>}
            </div>
          </div>
          <div className="row" style={{ gap: 14 }}>
            {c.score > 0 && <Ring value={c.score} size={84} stroke={8} sub="FIT" />}
            <div style={{ display: 'grid', gap: 8 }}>
              <RerunButton domain={c.domain} />
              {c.email?.body && c.status !== 'sent' && <Link className="btn" href="/drafts"><Icon name="mail" /> Edit &amp; send</Link>}
            </div>
          </div>
        </div>
      </div>

      <div className="sec"><h2>The 5 gates</h2><span className="hint">first failure stops the assessment</span></div>
      <div className="gates">
        {gates.map((g, i) => {
          const cls = g.pass === true ? 'pass' : g.pass === false ? 'fail' : g.pass === null ? 'unknown' : 'skip';
          return (
            <div className={`gate-step ${cls}`} key={g.name}>
              <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                <span className="gi">{g.pass === true ? '✓' : g.pass === false ? '✕' : g.pass === null ? '?' : i + 1}</span>
                <b>{g.name.replace('Not already on a compliance platform', 'No compliance platform').replace('Has frameworks left to get', 'Frameworks left')}</b>
              </div>
              <span>{g.why || 'not reached'}</span>
            </div>
          );
        })}
      </div>

      <div className="bento" style={{ marginTop: 14 }}>
        {c.scoreParts?.length > 0 && (
          <div className="card c6">
            <div className="card-h"><h2>Fit score breakdown</h2><span className="sub">{c.score} / 100</span></div>
            <div className="parts">
              {c.scoreParts.map((p, i) => (
                <div className="part" key={i}>
                  <span className={`pts ${p.pts < 0 ? 'no' : 'ok'}`}>{p.pts > 0 ? '+' : ''}{p.pts}</span>
                  <span>{p.why}<div className="bar"><i style={{ width: `${(Math.abs(p.pts) / maxPart) * 100}%`, background: p.pts < 0 ? 'var(--bad)' : undefined }} /></div></span>
                </div>
              ))}
            </div>
          </div>
        )}
        {c.contact && (
          <div className={`card ${c.scoreParts?.length ? 'c6' : 'c12'}`}>
            <div className="card-h"><h2>Why this person</h2><span className="sub">{c.contact.source}</span></div>
            {person ? (
              <div className="row" style={{ gap: 14, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <Avatar name={person.first_name} size={46} />
                <div>
                  <b style={{ fontSize: 16 }}>{personName(c)}</b>
                  <div className="muted">{person.position}{person.email ? ` · ${person.email}` : ''}</div>
                  <div className="small" style={{ marginTop: 8 }}>{c.contact.why}.</div>
                  <div className="small muted" style={{ marginTop: 4 }}>Stage: <b>{c.contact.tier}</b> · title priority #{c.contact.rank} · considered {c.contact.consideredCount} people</div>
                </div>
              </div>
            ) : (
              <div className="small">{c.contact.reason}. {c.contact.seen ? `Titles found: ${c.contact.seen}.` : ''} <Link href="/review" style={{ color: 'var(--accent-ink)' }}>Add one by hand →</Link></div>
            )}
          </div>
        )}
      </div>

      {c.email?.body && (
        <div className="bento" style={{ marginTop: 14 }}>
          <div className="card c7">
            <div className="card-h"><h2>The email{c.status === 'sent' ? ' · sent to your inbox' : ''}</h2><CopyButton text={`Subject: ${c.email.subject}\n\n${c.email.body}`} /></div>
            <div className="mail-head">
              <div><span>To</span>{personName(c)} · {person?.position}</div>
              <div><span>Subject</span><b>{c.email.subject}</b></div>
            </div>
            <div className="email">{c.email.body}</div>
          </div>
          <div className="card c5">
            <div className="card-h"><h2>Why it was written this way</h2></div>
            <div className="small muted">Hook <span className="mono">({c.email.hook_evidence_id})</span></div>
            <div className="quote">{c.email.hook_sentence}</div>
            <div className="small muted" style={{ marginTop: 12 }}>Pain points</div>
            {(c.pains || []).map((p, i) => <div key={i} className="small" style={{ margin: '6px 0' }}><b>{i + 1}.</b> {p.pain} <span className="mono faint">[{p.evidence_ids.join(', ')}]</span></div>)}
            <div className="small muted" style={{ marginTop: 12 }}>Validator</div>
            <div className="small">{c.validation?.ok ? <span className="ok">✓ passed · {c.validation.words} words</span> : <span className="unk">{(c.validation?.errors || []).join('; ')}</span>}</div>
            {typeof c.editRate === 'number' && <div className="small" style={{ marginTop: 6 }}>Human edit rate <b>{Math.round(c.editRate * 100)}%</b></div>}
          </div>
        </div>
      )}

      {c.evidence?.length > 0 && (
        <>
          <div className="sec"><h2>Evidence the email may use</h2><span className="hint">every claim must cite one of these</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Id</th><th>Fact</th><th>Quote</th><th>Source</th></tr></thead>
              <tbody>{c.evidence.map((e) => (
                <tr key={e.id}><td className="mono">{e.id}</td><td className="small"><span className="muted">{e.label}</span><div>{e.value}</div></td><td className="small"><div className="quote">{e.quote}</div></td><td className="small mono faint">{shortUrl(e.source)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}

      <div className="sec"><h2>Facts extracted</h2><span className="hint">each quote verified on the page{f.discarded ? ` · ${f.discarded} discarded` : ''}</span></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Field</th><th>Value</th><th>Quote / source</th></tr></thead>
          <tbody>
            {Object.entries(FACT_LABELS).map(([k, label]) => {
              const v = f[k];
              const items = Array.isArray(v) ? v : v ? [v] : [];
              return (
                <tr key={k}>
                  <td className="small"><b>{label}</b></td>
                  <td className="small">{items.length ? items.map((x, i) => <div key={i}>{String(x.value)}</div>) : <span className="faint">not found</span>}</td>
                  <td className="small">{items.map((x, i) => <div key={i} className="quote">{x.quote} <span className="mono faint">· {x.by || shortUrl(x.source)}</span></div>)}</td>
                </tr>
              );
            })}
            <tr><td className="small"><b>Compliance platform</b></td><td className="small">{f.platform?.value || <span className="faint">none found</span>}</td><td className="small">{f.platform && <div className="quote">{f.platform.quote}</div>}</td></tr>
            <tr><td className="small"><b>Open roles</b></td><td className="small">{f.jobs ? `${f.jobs.titles.length} on ${f.jobs.board}` : <span className="faint">no public job board</span>}</td><td className="small muted">{f.jobs?.titles.slice(0, 8).join(' · ')}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="bento" style={{ marginTop: 14 }}>
        <div className="card c5">
          <div className="card-h"><h2>Pages read</h2><span className="sub">{c.pages?.length || 0} of max 5</span></div>
          {(c.pages || []).map((p, i) => (
            <div key={i} className="feed-i" style={{ gridTemplateColumns: '30px 1fr' }}>
              <span className="dot" style={{ background: 'var(--panel2)', border: '1px solid var(--line)', color: p.ok ? 'var(--good)' : 'var(--bad)' }}><Icon name="globe" size={14} /></span>
              <span style={{ minWidth: 0 }}><span className="mono" style={{ overflowWrap: 'anywhere' }}>{shortUrl(p.url)}</span>
                <span className="small muted" style={{ display: 'block' }}>{p.for ? `for "${p.for}" · ` : 'homepage · '}{p.ok ? `${p.words} words via ${p.method}` : p.reason}</span></span>
            </div>
          ))}
        </div>
        <div className="card c7">
          <div className="card-h"><h2>Decision trace</h2><span className="sub">every step, with its reason</span></div>
          <div className="feed">
            {(c.trace || []).map((t, i) => (
              <div key={i} className="feed-i" style={{ gridTemplateColumns: '30px 1fr' }}>
                <span className="dot" style={{ background: 'var(--panel2)', border: '1px solid var(--line)', color: t.step === 'error' ? 'var(--bad)' : 'var(--accent-ink)' }}><Icon name={STEP_ICON[t.step] || 'spark'} size={14} /></span>
                <span style={{ minWidth: 0 }}><span className="mono faint" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em' }}>{t.step}</span>
                  <div><b>{t.decision}</b></div><div className="small muted" style={{ overflowWrap: 'anywhere' }}>{String(t.why).slice(0, 400)}</div></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function shortUrl(u) {
  if (!u) return '';
  try { const x = new URL(u); return x.hostname.replace(/^www\./, '') + (x.pathname === '/' ? '' : x.pathname); } catch { return u; }
}
