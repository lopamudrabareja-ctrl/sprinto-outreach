import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCompany } from '../../../lib/store.js';
import { Pill, personName } from '../../ui.js';
import RerunButton from '../../RerunButton.js';

export const dynamic = 'force-dynamic';

const FACT_LABELS = {
  product_summary: 'Product', is_b2b_saas: 'B2B SaaS', buyer: 'Buyer', funding_stage: 'Funding stage', employee_count: 'Headcount',
  certifications_held: 'Certifications held', certifications_in_progress: 'In progress', enterprise_signals: 'Enterprise signals',
  compliance_pressure: 'Compliance pressure', recent_news: 'Recent news',
};

export default async function CompanyPage({ params }) {
  const { domain } = await params;
  const c = await getCompany(decodeURIComponent(domain));
  if (!c) notFound();
  const f = c.facts || {};

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>{c.company} <Pill status={c.status} /></h1>
          <p className="lede" style={{ marginBottom: 8 }}>
            <a href={`https://${c.domain}`} target="_blank" rel="noreferrer" className="mono">{c.domain}</a>
            {c.score ? <> · fit <b>{c.score}/100</b></> : null}
            {c.reason ? <> · {c.reason}</> : null}
          </p>
        </div>
        <RerunButton domain={c.domain} />
      </div>
      <p className="muted small">{c.seconds}s · {c.pages?.length || 0} pages read · {c.geminiCalls} Gemini calls · {new Date(c.updatedAt || c.startedAt).toLocaleString()}</p>

      <h2>Why it {c.status === 'dropped' ? 'was dropped' : c.score ? 'qualified' : 'stopped'}: the gates</h2>
      <div className="card">
        {(c.gates || []).map((g) => (
          <div className="gate" key={g.name}>
            <span className={g.pass === true ? 'ok' : g.pass === false ? 'no' : 'unk'}>{g.pass === true ? '✓' : g.pass === false ? '✗' : '?'}</span>
            <b>{g.name}</b>
            <span className="small">{g.why}</span>
          </div>
        ))}
        {!c.gates?.length && <span className="muted">No gates ran.</span>}
      </div>

      {c.scoreParts?.length > 0 && (
        <>
          <h2>Fit score breakdown</h2>
          <div className="card">
            {c.scoreParts.map((p, i) => (
              <div className="gate" key={i} style={{ gridTemplateColumns: '48px 1fr' }}>
                <span className={`mono ${p.pts < 0 ? 'no' : 'ok'}`}>{p.pts > 0 ? '+' : ''}{p.pts}</span>
                <span className="small">{p.why}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {c.contact && (
        <>
          <h2>Why this person</h2>
          <div className="card">
            {c.contact.ok ? (
              <>
                <b>{personName(c)}</b>, {c.contact.person.position}
                {c.contact.person.email && <span className="muted mono"> · {c.contact.person.email}</span>}
                <div className="small muted" style={{ marginTop: 4 }}>{c.contact.why}. Source: {c.contact.person.source || c.contact.source}. Considered {c.contact.consideredCount} people.</div>
              </>
            ) : (
              <span className="small">{c.contact.reason}. {c.contact.seen ? `Titles found: ${c.contact.seen}` : `Source: ${c.contact.source}`}. <Link href="/review">Add one by hand →</Link></span>
            )}
          </div>
        </>
      )}

      {c.email?.body && (
        <>
          <h2>The email{c.status === 'sent' ? ' (sent to your inbox)' : ''}</h2>
          <div className="grid g2">
            <div className="card">
              <div className="small muted">Subject</div>
              <b>{c.email.subject}</b>
              <div className="email" style={{ marginTop: 10 }}>{c.email.body}</div>
              {c.status !== 'sent' && <div style={{ marginTop: 10 }}><Link className="btn" href="/drafts">Edit &amp; send →</Link></div>}
            </div>
            <div className="card">
              <div className="small muted">Hook</div>
              <div className="small">“{c.email.hook_sentence}” <span className="mono muted">({c.email.hook_evidence_id})</span></div>
              <div className="small muted" style={{ marginTop: 12 }}>Pain points</div>
              {(c.pains || []).map((p, i) => <div key={i} className="small" style={{ margin: '4px 0' }}>{i + 1}. {p.pain} <span className="mono muted">[{p.evidence_ids.join(', ')}]</span></div>)}
              <div className="small muted" style={{ marginTop: 12 }}>Validator</div>
              <div className="small">{c.validation?.ok ? `✓ passed (${c.validation.words} words)` : (c.validation?.errors || []).join('; ')}</div>
              {typeof c.editRate === 'number' && <div className="small">Human edit rate: <b>{Math.round(c.editRate * 100)}%</b></div>}
            </div>
          </div>
        </>
      )}

      {c.evidence?.length > 0 && (
        <>
          <h2>Evidence the email may use</h2>
          <table>
            <thead><tr><th>Id</th><th>Fact</th><th>Quote</th><th>Source</th></tr></thead>
            <tbody>
              {c.evidence.map((e) => (
                <tr key={e.id}><td className="mono">{e.id}</td><td className="small"><span className="muted">{e.label}:</span> {e.value}</td><td className="small"><div className="quote">{e.quote}</div></td><td className="small mono">{shortUrl(e.source)}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Facts extracted (each quote verified on the page)</h2>
      <table>
        <thead><tr><th>Field</th><th>Value</th><th>Quote / source</th></tr></thead>
        <tbody>
          {Object.entries(FACT_LABELS).map(([k, label]) => {
            const v = f[k];
            const items = Array.isArray(v) ? v : v ? [v] : [];
            return (
              <tr key={k}>
                <td className="small"><b>{label}</b></td>
                <td className="small">{items.length ? items.map((x, i) => <div key={i}>{String(x.value)}</div>) : <span className="muted">not found</span>}</td>
                <td className="small">{items.map((x, i) => <div key={i} className="quote">{x.quote} <span className="mono">· {x.by || shortUrl(x.source)}</span></div>)}</td>
              </tr>
            );
          })}
          <tr><td className="small"><b>Compliance platform</b></td><td className="small">{f.platform?.value || <span className="muted">none found</span>}</td><td className="small">{f.platform && <div className="quote">{f.platform.quote}</div>}</td></tr>
          <tr><td className="small"><b>Open roles</b></td><td className="small">{f.jobs ? `${f.jobs.titles.length} on ${f.jobs.board}` : <span className="muted">no public job board</span>}</td><td className="small muted">{f.jobs?.titles.slice(0, 8).join(' · ')}</td></tr>
        </tbody>
      </table>
      {f.discarded > 0 && <p className="small muted">{f.discarded} extracted fact(s) were discarded because their quote was not on the page.</p>}

      <h2>Pages read</h2>
      <table>
        <thead><tr><th>URL</th><th>For</th><th>Result</th></tr></thead>
        <tbody>
          {(c.pages || []).map((p, i) => (
            <tr key={i}><td className="small mono">{p.url}</td><td className="small">{p.for || 'homepage'}</td><td className="small">{p.ok ? `${p.words} words via ${p.method}` : <span className="no">{p.reason}</span>}</td></tr>
          ))}
        </tbody>
      </table>

      <h2>Decision trace</h2>
      <div className="card">
        <ol className="trace small" style={{ margin: 0, paddingLeft: 18 }}>
          {(c.trace || []).map((t, i) => <li key={i}><span className="k">{t.step}</span><b>{t.decision}</b> <span className="muted">· {t.why}</span></li>)}
        </ol>
      </div>
    </>
  );
}

function shortUrl(u) {
  if (!u) return '';
  try { const x = new URL(u); return x.hostname.replace(/^www\./, '') + (x.pathname === '/' ? '' : x.pathname); } catch { return u; }
}
