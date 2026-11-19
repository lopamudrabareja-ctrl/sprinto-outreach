'use client';
import { useState } from 'react';
import Icon from './icons.js';

export default function CopyButton({ text, label = 'Copy email' }) {
  const [done, setDone] = useState(false);
  return (
    <button className="ghost" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1600); } catch { setDone(false); }
    }}>
      <Icon name={done ? 'check' : 'copy'} /> {done ? 'Copied' : label}
    </button>
  );
}
