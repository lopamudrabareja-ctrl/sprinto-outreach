'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../icons.js';

const SUGGESTED = [
  'Keep the body under 90 words.',
  'One pain point is enough; drop the second.',
  'Never end with a line about "streamlining".',
  'Open with the most specific fact, like a job posting or a named customer.',
  'Ask for a 15-minute call, not "a brief conversation".',
];

export default function LessonForm({ lessons }) {
  const [text, setText] = useState('');
  const router = useRouter();
  const call = (method, body) => fetch('/api/lessons', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(() => router.refresh());
  const have = new Set(lessons.map((l) => l.text));

  return (
    <div className="card">
      {!lessons.length && <div className="muted small" style={{ marginBottom: 10 }}>No lessons yet. Add one below, or pick a suggestion.</div>}
      {lessons.map((l, i) => (
        <div key={l.id} className="row between" style={{ padding: '8px 0', borderBottom: '1px dashed var(--line)', flexWrap: 'nowrap' }}>
          <span className="row" style={{ gap: 10, flexWrap: 'nowrap' }}><span className="mono faint">{String(i + 1).padStart(2, '0')}</span>{l.text}</span>
          <button className="ghost" onClick={() => call('DELETE', { id: l.id })}><Icon name="x" size={14} /> Remove</button>
        </div>
      ))}
      <div className="row" style={{ marginTop: 14, flexWrap: 'nowrap' }}>
        <input id="lesson-new" style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Never end with 'streamline'. One pain point is enough." />
        <button disabled={!text.trim()} onClick={() => { call('POST', { text }); setText(''); }}>Add lesson</button>
      </div>
      <div className="small muted" style={{ margin: '14px 0 6px' }}>Suggestions</div>
      <div className="chips">
        {SUGGESTED.filter((s) => !have.has(s)).map((s) => <button key={s} className="chip" onClick={() => call('POST', { text: s })}>+ {s}</button>)}
      </div>
    </div>
  );
}
