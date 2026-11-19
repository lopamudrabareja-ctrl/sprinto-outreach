'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LessonForm({ lessons }) {
  const [text, setText] = useState('');
  const router = useRouter();
  const call = (method, body) => fetch('/api/lessons', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(() => router.refresh());

  return (
    <div className="card">
      {!lessons.length && <div className="muted small" style={{ marginBottom: 10 }}>No lessons yet.</div>}
      {lessons.map((l) => (
        <div key={l.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--line)' }}>
          <span>{l.text}</span>
          <button className="ghost" onClick={() => call('DELETE', { id: l.id })}>Remove</button>
        </div>
      ))}
      <div className="row" style={{ marginTop: 12 }}>
        <input style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Never end with 'streamline'. One pain point is enough." />
        <button disabled={!text.trim()} onClick={() => { call('POST', { text }); setText(''); }}>Add lesson</button>
      </div>
    </div>
  );
}
