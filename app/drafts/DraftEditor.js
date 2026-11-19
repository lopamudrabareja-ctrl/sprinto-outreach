'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../icons.js';

const MIN = 60, MAX = 140;

export default function DraftEditor({ domain, subject: s0, body: b0, evidence = [], hook }) {
  const [subject, setSubject] = useState(s0);
  const [body, setBody] = useState(b0);
  const [lesson, setLesson] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openEv, setOpenEv] = useState(null);
  const router = useRouter();

  const words = body.split(/\s+/).filter(Boolean).length;
  const inRange = words >= MIN && words <= MAX;
  const edited = subject !== s0 || body !== b0;

  async function send() {
    setBusy(true); setMsg('Sending to your inbox…');
    if (lesson.trim()) await fetch('/api/lessons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: lesson.trim() }) });
    const res = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, subject, body }) });
    const j = await res.json().catch(() => ({}));
    setMsg(j.ok ? `Sent ✓ · you edited ${Math.round(j.editRate * 100)}%` : `Not sent: ${j.error || 'unknown error'}`);
    setBusy(false);
    router.refresh();
  }

  async function copy() {
    try { await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  return (
    <div className="bento" style={{ gap: 14 }}>
      <div className="c8" style={{ display: 'grid', gap: 10, minWidth: 0 }}>
        <div>
          <label htmlFor={`subj-${domain}`}>Subject <span className="mono">· {subject.length}/60</span></label>
          <input id={`subj-${domain}`} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <div className="row between" style={{ marginBottom: 5 }}>
            <label htmlFor={`body-${domain}`} style={{ margin: 0 }}>Body</label>
            <span className="mono small" style={{ color: inRange ? 'var(--good)' : 'var(--warn)' }}>{words} words · target {MIN}–{MAX}</span>
          </div>
          <textarea id={`body-${domain}`} value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 200 }} />
          <div className="progress" style={{ marginTop: 6, height: 5 }}>
            <i style={{ width: `${Math.min(100, (words / MAX) * 100)}%`, background: inRange ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)', boxShadow: 'none' }} />
          </div>
        </div>
        <div>
          <label htmlFor={`lesson-${domain}`}>Lesson for future drafts (optional)</label>
          <input id={`lesson-${domain}`} value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder="e.g. Keep it under 90 words and skip the closing line about streamlining." />
        </div>
        <div className="row">
          <button disabled={busy} onClick={send}><Icon name="mail" /> Send to my inbox</button>
          <button className="ghost" onClick={copy}><Icon name={copied ? 'check' : 'copy'} /> {copied ? 'Copied' : 'Copy'}</button>
          {edited && <button className="ghost" onClick={() => { setSubject(s0); setBody(b0); }}><Icon name="refresh" /> Reset</button>}
          <span className="small muted">{msg}</span>
        </div>
      </div>
      <div className="c4" style={{ minWidth: 0 }}>
        <div className="small muted" style={{ marginBottom: 8 }}>Evidence this email can use</div>
        <div className="chips">
          {evidence.map((e) => (
            <button key={e.id} className={`chip ${openEv === e.id ? 'on' : ''}`} onClick={() => setOpenEv(openEv === e.id ? null : e.id)} title={e.quote}>
              {e.id}{e.id === hook ? ' · hook' : ''}<span className="c">{e.label}</span>
            </button>
          ))}
        </div>
        {openEv && (() => { const e = evidence.find((x) => x.id === openEv); return e ? <div className="quote small" style={{ marginTop: 10 }}>{e.quote}</div> : null; })()}
        {!openEv && <p className="small faint" style={{ marginTop: 10 }}>Tap an id to see the exact quote from their site.</p>}
      </div>
    </div>
  );
}
