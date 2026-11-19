'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RerunButton({ domain, label = '↻ Re-run', dryRun = true }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button className="ghost" disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, dryRun }) });
      } finally { setBusy(false); router.refresh(); }
    }}>{busy ? 'Running… (30–90s)' : label}</button>
  );
}
