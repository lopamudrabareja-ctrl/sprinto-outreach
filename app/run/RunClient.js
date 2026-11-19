'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pill, Ring, Avatar } from '../ui.js';
import Icon from '../icons.js';

const SAMPLES = ['vanta.com', 'rillet.com', 'resend.com', 'clerk.com', 'neon.tech', 'posthog.com', 'mintlify.com', 'tremor.so', 'trigger.dev', 'inngest.com'];
const STEPS = ['Scraping site', 'Extracting facts', 'Qualifying', 'Finding contact', 'Writing email', 'Validating'];

const clean = (d) => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#\s]/)[0];

export default function RunClient({ done }) {
  const [text, setText] = useState('');
  const [send, setSend] = useState(false);
  const [skip, setSkip] = useState(true);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const router = useRouter();
  const doneSet = useMemo(() => new Set(done), [done]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  const parsed = useMemo(() => [...new Set(text.split(/[\n,]+/).map(clean).filter((d) => d && d.includes('.') && !d.startsWith('#')))], [text]);
  const toRun = skip ? parsed.filter((d) => !doneSet.has(d)) : parsed;
  const skipped = parsed.length - toRun.length;

  function addSample(d) {
    setText((t) => (t.split(/[\n,]+/).map(clean).includes(d) ? t : (t.trim() ? t.trim() + '\n' : '') + d));
  }

  async function run() {
    if (!toRun.length) return;
    setBusy(true);
    let state = toRun.map((d) => ({ input: d, status: 'queued' }));
    setRows(state);
    for (let i = 0; i < state.length; i++) {
      state = state.map((r, j) => (j === i ? { ...r, status: 'running', t0: Date.now() } : r));
      setRows(state);
      try {
        const res = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: state[i].input, dryRun: !send }) });
        const rec = await res.json();
        if (!res.ok) throw new Error(rec.error || res.statusText);
        state = state.map((r, j) => (j === i ? { ...r, ...rec } : r));
      } catch (e) {
        state = state.map((r, j) => (j === i ? { ...r, status: 'error', reason: e.message } : r));
      }
      setRows(state);
    }
    setBusy(false);
    router.refresh();
  }

  const finished = rows.filter((r) => !['queued', 'running'].includes(r.status)).length;
  const current = rows.find((r) => r.status === 'running');
  const elapsed = current ? Math.round((Date.now() - current.t0) / 1000) : 0;
  const stepIdx = Math.min(STEPS.length - 1, Math.floor(elapsed / 12));
  void tick;

  return (
    <div className="bento">
      <div className="card c7">
        <div className="card-h"><h2>Domains</h2><span className="sub">{parsed.length} parsed{skipped ? ` · ${skipped} already researched` : ''}</span></div>
        <textarea id="run-domains" value={text} onChange={(e) => setText(e.target.value)} placeholder={'rillet.com\nresend.com, acme.io'} disabled={busy} style={{ minHeight: 170, fontFamily: 'var(--mono)', fontSize: 13 }} />
        <div className="small muted" style={{ margin: '12px 0 6px' }}>Try a sample</div>
        <div className="chips">
          {SAMPLES.map((d) => (
            <button key={d} className="chip" onClick={() => addSample(d)} disabled={busy}>
              + {d}{doneSet.has(d) && <span className="c">done</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="card c5" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
        <div className="card-h" style={{ margin: 0 }}><h2>Run settings</h2></div>
        <Toggle id="opt-skip" checked={skip} onChange={setSkip} disabled={busy} title="Skip companies already researched" sub="Saves Gemini and Hunter quota" />
        <Toggle id="opt-send" checked={send} onChange={setSend} disabled={busy} title="Send clean emails to my inbox" sub="Off = dry run: everything except the send" />
        <div className="small muted">Gemini free tier ≈ 20 calls/day per model. One company uses 2–5.</div>
        <button onClick={run} disabled={busy || !toRun.length} style={{ justifyContent: 'center', padding: '12px 16px' }}>
          <Icon name="play" /> {busy ? 'Running…' : `Run pipeline on ${toRun.length || 0} ${toRun.length === 1 ? 'company' : 'companies'}`}
        </button>
      </div>

      {rows.length > 0 && (
        <div className="card c12 glow">
          <div className="card-h">
            <h2>{busy ? 'Running' : 'Run complete'}</h2>
            <span className="sub mono">{finished} / {rows.length}</span>
          </div>
          <div className="progress"><i style={{ width: `${(finished / rows.length) * 100}%` }} /></div>
          {current && (
            <div className="row small" style={{ marginTop: 10 }}>
              <span className="pill p-running live">{current.input}</span>
              <span className="muted">{STEPS[stepIdx]}… {elapsed}s</span>
            </div>
          )}
          <div style={{ display: 'grid', gap: 4, marginTop: 12 }}>
            {rows.map((r) => (
              <div key={r.input} className="feed-i" style={{ gridTemplateColumns: '34px 1fr auto auto', alignItems: 'center' }}>
                <Avatar name={r.company || r.input} />
                <span style={{ minWidth: 0 }}>
                  {r.domain ? <Link href={`/companies/${r.domain}`}><b>{r.company}</b></Link> : <b>{r.input}</b>}
                  <span className="small muted" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.email?.subject ? `✉ ${r.email.subject}` : r.reason || (r.status === 'queued' ? 'waiting…' : r.status === 'running' ? 'working…' : '')}
                  </span>
                </span>
                <Pill status={r.status === 'error' ? 'dropped' : r.status}>{r.status === 'error' ? 'Error' : undefined}</Pill>
                {r.score ? <Ring value={r.score} size={38} stroke={4} /> : <span className="mono faint">{r.seconds ? `${r.seconds}s` : ''}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ id, checked, onChange, disabled, title, sub }) {
  return (
    <label htmlFor={id} className="row" style={{ gap: 12, flexWrap: 'nowrap', cursor: 'pointer', margin: 0, color: 'var(--ink)' }}>
      <span style={{ position: 'relative', width: 40, height: 22, borderRadius: 999, background: checked ? 'var(--grad)' : 'var(--panel2)', border: '1px solid var(--line)', flex: 'none', transition: 'background .2s' }}>
        <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ position: 'absolute', inset: 0, opacity: 0, margin: 0, cursor: 'pointer', width: '100%' }} />
        <span style={{ position: 'absolute', top: 2, left: checked ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', pointerEvents: 'none' }} />
      </span>
      <span><span style={{ fontSize: 13.5, fontWeight: 500 }}>{title}</span><span className="small muted" style={{ display: 'block' }}>{sub}</span></span>
    </label>
  );
}
