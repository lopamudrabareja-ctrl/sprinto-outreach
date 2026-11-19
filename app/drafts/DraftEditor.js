'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DraftEditor({ domain, subject: s0, body: b0 }) {
  const [subject, setSubject] = useState(s0);
  const [body, setBody] = useState(b0);
  const [lesson, setLesson] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const words = body.split(/\s+/).filter(Boolean).length;

  async function send() {
    setBusy(true); setMsg('Sending to your inbox…');
    if (lesson.trim()) await fetch('/api/lessons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: lesson.trim() }) });
    const res = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, subject, body }) });
    const j = await res.json();
    setMsg(j.ok ? `Sent ✓ (you edited ${Math.round(j.editRate * 100)}%)` : `Not sent: ${j.error}`);
    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      <label>Subject</label>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} />
      <label style={{ marginTop: 8 }}>Body <span className="mono">· {words} words</span></label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 170 }} />
      <label style={{ marginTop: 8 }}>Lesson for future drafts (optional): what should the writer always / never do?</label>
      <input value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder="e.g. Keep it under 90 words and drop the closing sentence about streamlining." />
      <div className="row" style={{ marginTop: 10 }}>
        <button disabled={busy} onClick={send}>Send to my inbox</button>
        <span className="small muted">{msg}</span>
      </div>
    </div>
  );
}
