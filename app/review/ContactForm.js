'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ContactForm({ domain }) {
  const [f, setF] = useState({ first_name: '', last_name: '', position: '', email: '' });
  const [busy, setBusy] = useState('');
  const router = useRouter();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save() {
    setBusy('Saving contact…');
    await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, ...f }) });
    setBusy('Re-running pipeline (30–90s)…');
    await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, dryRun: true }) });
    setBusy('');
    router.refresh();
  }

  return (
    <div className="grid g4" style={{ alignItems: 'end' }}>
      <div><label>First name</label><input value={f.first_name} onChange={set('first_name')} /></div>
      <div><label>Last name</label><input value={f.last_name} onChange={set('last_name')} /></div>
      <div><label>Title</label><input value={f.position} onChange={set('position')} placeholder="Co-founder & CTO" /></div>
      <div><label>Email (optional)</label><input value={f.email} onChange={set('email')} /></div>
      <div style={{ gridColumn: '1 / -1' }}>
        <button disabled={!!busy || !f.first_name || !f.position} onClick={save}>{busy || 'Add contact & re-run'}</button>
      </div>
    </div>
  );
}
