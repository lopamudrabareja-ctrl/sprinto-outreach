import Link from 'next/link';
import { listCompanies } from '../lib/store.js';
import { Pill, Ring, Sparkline, Avatar, personName, timeAgo } from './ui.js';
import Icon from './icons.js';

export const dynamic = 'force-dynamic';

const BASELINE_SEC = 17.5 * 60; // brief: 15-20 min per company by hand

export default async function Overview() {
  const all = await listCompanies();
  const chrono = [...all].sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));
  const n = (s) => all.filter((c) => c.status === s).length;
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  const researched = all.length;
  const qualified = all.filter((c) => c.score > 0);
  const contact = all.filter((c) => c.contact?.ok);
  const validated = all.filter((c) => c.validation?.ok);
  const sent = n('sent');
  const ready = n('ready') + n('draft');
  const secs = avg(all.filter((c) => c.seconds).map((c) => c.seconds));
  const pages = avg(all.filter((c) => c.pages?.length).map((c) => c.pages.length));
  const edits = all.filter((c) => typeof c.editRate === 'number').map((c) => c.editRate);
  const calls = all.reduce((a, c) => a + (c.geminiCalls || 0), 0);
  const avgFit = Math.round(avg(qualified.map((c) => c.score)));
  const speedup = secs ? Math.round(BASELINE_SEC / secs) : 0;

  // series for sparklines (cumulative over time)
  let acc = 0, accQ = 0;
  const cumAll = chrono.map(() => ++acc);
  const cumQ = chrono.map((c) => (accQ += c.score > 0 ? 1 : 0));
  const secSeries = chrono.filter((c) => c.seconds).map((c) => c.seconds);
  const fitSeries = chrono.filter((c) => c.score > 0).map((c) => c.score);

  // where companies stop: first gate that didn't pass, else contact / validator
  const stops = {};
  for (const c of all) {
    if (c.status === 'sent' || c.status === 'ready') continue;
    const g = (c.gates || []).find((x) => x.pass !== true);
    const key = g ? `${g.name}${g.pass === null ? ' (unclear)' : ''}` : c.contact && !c.contact.ok ? 'No decision-maker' : c.validation && !c.validation.ok ? 'Validator' : (c.reason || '').startsWith('error') ? 'Gemini quota / error' : c.flagged ? 'Stage unknown (flagged)' : 'Other';
    stops[key] = (stops[key] || 0) + 1;
  }
  const stopRows = Object.entries(stops).sort((a, b) => b[1] - a[1]);
  const stopMax = Math.max(1, ...stopRows.map((r) => r[1]));

  const funnel = [['Researched', researched], ['Passed gates', qualified.length], ['Contact found', contact.length], ['Email validated', validated.length], ['Sent', sent]];
  const fmax = Math.max(1, researched);

  const leaders = [...qualified].sort((a, b) => b.score - a.score).slice(0, 6);

  const feed = all
    .flatMap((c) => (c.trace || []).filter((t) => ['qualify', 'contact', 'write', 'send', 'human'].includes(t.step)).slice(-1).map((t) => ({ c, t })))
    .sort((a, b) => String(b.c.updatedAt).localeCompare(String(a.c.updatedAt)))
    .slice(0, 7);

  const dist = [0, 0, 0, 0, 0]; // fit buckets 0-20..80-100
  qualified.forEach((c) => dist[Math.min(4, Math.floor(c.score / 20))]++);
  const distMax = Math.max(1, ...dist);

  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">Command centre</div>
          <h1>Outbound, on autopilot.</h1>
          <p className="lede">Domains in, qualified prospects and evidence-backed emails out. Gemini reads and writes; code decides every gate.</p>
        </div>
        <div className="row">
          <a className="btn ghost" href="/api/export"><Icon name="download" /> Export CSV</a>
          <Link className="btn" href="/run"><Icon name="play" /> Run on domains</Link>
        </div>
      </div>

      <div className="bento">
        <div className="card kpi hero c4">
          <span className="l"><span className="ico"><Icon name="building" size={14} /></span>Companies researched</span>
          <span className="n">{researched}</span>
          <span className="s">{qualified.length} qualified · {researched ? Math.round((qualified.length / researched) * 100) : 0}% hit rate</span>
          <Sparkline values={cumAll} id="sp1" color="#c084fc" />
        </div>
        <div className="card kpi c4">
          <span className="l"><span className="ico"><Icon name="mail" size={14} /></span>Emails ready to send</span>
          <span className="n">{ready + sent}</span>
          <span className="s">{sent} sent · {n('review')} waiting for review</span>
          <Sparkline values={cumQ} id="sp2" color="#ec4899" />
        </div>
        <div className="card kpi c4">
          <span className="l"><span className="ico"><Icon name="clock" size={14} /></span>Time per company</span>
          <span className="n">{Math.round(secs)}<span style={{ fontSize: 16, color: 'var(--muted)' }}>s</span> {speedup > 0 && <span className="delta">{speedup}× faster</span>}</span>
          <span className="s">by hand: 15–20 min · target &lt; 2 min</span>
          <Sparkline values={secSeries} id="sp3" color="#22d3ee" />
        </div>

        <div className="card c8">
          <div className="card-h"><h2>Pipeline funnel</h2><span className="sub">every company, from domain to inbox</span></div>
          <div className="funnel">
            {funnel.map(([label, v], i) => (
              <div className="fstep" key={label}>
                <span className="small">{label}</span>
                <div><div className="fb" style={{ width: `${Math.max(2, (v / fmax) * 100)}%`, opacity: 1 - i * 0.12 }} /></div>
                <span className="fv num">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card c4">
          <div className="card-h"><h2>Average fit</h2><span className="sub">qualified only</span></div>
          <div className="row" style={{ gap: 18, flexWrap: 'nowrap' }}>
            <Ring value={avgFit} size={112} stroke={10} sub="/ 100" />
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', alignItems: 'end', gap: 6, height: 96 }}>
              {dist.map((d, i) => (
                <div key={i} title={`${i * 20}–${i * 20 + 20}: ${d}`} style={{ display: 'grid', gap: 4, justifyItems: 'center' }}>
                  <div style={{ width: '100%', height: `${8 + (d / distMax) * 64}px`, borderRadius: 6, background: d ? 'var(--grad)' : 'var(--panel2)', opacity: d ? 0.5 + i * 0.12 : 1 }} />
                  <span className="mono faint" style={{ fontSize: 10 }}>{i * 20}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="small muted" style={{ margin: '10px 0 0' }}>Each point has a named reason on the company page.</p>
        </div>

        <div className="card c7">
          <div className="card-h"><h2>Top prospects</h2><Link className="sub" href="/companies">All companies →</Link></div>
          {!leaders.length && <div className="empty"><b>No qualified companies yet</b>Run a few domains to fill this.</div>}
          <div style={{ display: 'grid', gap: 4 }}>
            {leaders.map((c, i) => (
              <Link key={c.domain} href={`/companies/${c.domain}`} className="feed-i" style={{ gridTemplateColumns: '22px 34px 1fr auto auto', alignItems: 'center' }}>
                <span className="mono faint">{i + 1}</span>
                <Avatar name={c.company} />
                <span style={{ minWidth: 0 }}>
                  <b>{c.company}</b>
                  <span className="small muted" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {personName(c) ? `${personName(c)} · ${c.contact.person.position}` : c.reason}
                  </span>
                </span>
                <Pill status={c.status} />
                <Ring value={c.score} size={40} stroke={4} />
              </Link>
            ))}
          </div>
        </div>
        <div className="card c5">
          <div className="card-h"><h2>Where companies stop</h2><span className="sub">nothing is guessed</span></div>
          {!stopRows.length && <div className="empty small">No drops yet.</div>}
          {stopRows.map(([k, v]) => (
            <div className="hbar" key={k}>
              <span>{k}</span><span className="mono">{v}</span>
              <div className="track"><i style={{ width: `${(v / stopMax) * 100}%`, background: /unclear|decision|quota|flag|Validator/.test(k) ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#f43f5e,#fb7185)' }} /></div>
            </div>
          ))}
          <p className="small muted" style={{ margin: '8px 0 0' }}><span className="unk">Amber</span> goes to a human; <span className="no">red</span> is a rule saying no.</p>
        </div>

        <div className="card c7">
          <div className="card-h"><h2>Latest decisions</h2><span className="sub">from the decision trace</span></div>
          <div className="feed">
            {feed.map(({ c, t }) => {
              const col = c.status === 'dropped' ? 'var(--bad)' : c.status === 'review' ? 'var(--warn)' : 'var(--good)';
              return (
                <Link className="feed-i" key={c.domain} href={`/companies/${c.domain}`}>
                  <span className="dot" style={{ background: 'var(--panel2)', color: col, border: '1px solid var(--line)' }}>
                    <Icon name={c.status === 'dropped' ? 'x' : c.status === 'review' ? 'alert' : 'check'} size={15} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <b>{c.company}</b> <span className="muted">· {t.step}</span>
                    <span className="small muted" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.decision}</span>
                  </span>
                  <span className="mono faint">{timeAgo(c.updatedAt)}</span>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="card c5">
          <div className="card-h"><h2>Against the brief</h2><span className="sub">targets from the 5 pre-build decisions</span></div>
          <Meter label="Time per company" value={`${Math.round(secs)}s`} pct={Math.min(1, secs / 120)} good={secs < 120} note="target < 120s" />
          <Meter label="Pages read per company" value={pages.toFixed(1)} pct={pages / 5} good={pages <= 5} note="cap: homepage + 4" />
          <Meter label="Human edit rate" value={edits.length ? `${Math.round(avg(edits) * 100)}%` : '—'} pct={edits.length ? avg(edits) / 0.5 : 0} good={!edits.length || avg(edits) < 0.2} note="target < 20% · kill at 50%" />
          <Meter label="Gemini calls" value={calls} pct={Math.min(1, calls / 140)} good note="free tier ≈ 20/day per model" />
          {fitSeries.length > 1 && <p className="small muted" style={{ margin: '6px 0 0' }}>{qualified.length} qualified so far · best fit {Math.max(...fitSeries)}</p>}
        </div>
      </div>
    </>
  );
}

function Meter({ label, value, pct, good, note }) {
  return (
    <div className="hbar">
      <span>{label} <span className="faint mono" style={{ fontSize: 11 }}>· {note}</span></span>
      <span className="mono" style={{ color: good ? 'var(--good)' : 'var(--warn)' }}>{value}</span>
      <div className="track"><i style={{ width: `${Math.max(3, Math.min(1, pct) * 100)}%`, background: good ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)' }} /></div>
    </div>
  );
}
