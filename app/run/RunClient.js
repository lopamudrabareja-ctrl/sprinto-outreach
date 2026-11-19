'use client';
import { useState } from 'react';
import Link from 'next/link';

const LABEL = { sent: 'Sent', ready: 'Ready to send', draft: 'Draft', review: 'Needs review', dropped: 'Dropped', running: 'Running…', queued: 'Queued', error: 'Error' };

export default function RunClient() {
  const [text, setText] = useState('');
  const [send, setSend] = useState(false);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  async function run() {
    const domains = text.split(/\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    if (!domains.length) return;
    setBusy(true);
    let state = domains.map((d) => ({ input: d, status: 'queued' }));
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
  }

  return (
    <>
      <div className="card">
        <label>Domains</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={'rillet.com\nresend.com\nacme.io'} disabled={busy} />
        <div className="row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
          <label className="row" style={{ margin: 0, color: 'var(--ink)' }}>
            <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} disabled={busy} style={{ width: 'auto' }} />
            Send clean emails to my inbox (off = dry run: everything except the send)
          </label>
          <button onClick={run} disabled={busy || !text.trim()}>{busy ? 'Running…' : '▶ Run pipeline'}</button>
        </div>
      </div>

      {rows.length > 0 && (
        <table style={{ marginTop: 16 }}>
          <thead><tr><th>Domain</th><th>Status</th><th>Fit</th><th>Result</th><th>Time</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.input}>
                <td>{r.domain ? <Link href={`/companies/${r.domain}`}><b>{r.company}</b></Link> : r.input}</td>
                <td><span className={`pill p-${r.status === 'error' ? 'dropped' : r.status === 'running' || r.status === 'queued' ? 'draft' : r.status}`}>{LABEL[r.status] || r.status}</span></td>
                <td className="mono">{r.score || '·'}</td>
                <td className="small">{r.reason || (r.email?.subject ? `✉ ${r.email.subject}` : '')}</td>
                <td className="mono">{r.seconds ? `${r.seconds}s` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
