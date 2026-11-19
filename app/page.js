import Link from 'next/link';
import { listCompanies } from '../lib/store.js';
import { CompanyTable } from './ui.js';

export const dynamic = 'force-dynamic';

const STEPS = [
  ['1 Scrape', 'Website + job boards, robots.txt respected'],
  ['2 Extract', 'Named facts, each with a verified quote'],
  ['3 Qualify', '5 gates + agent loop, max 4 extra pages'],
  ['4 Find PoC', 'Hunter / Apollo, title rules by stage'],
  ['5 Pain points', 'Two, each tied to evidence'],
  ['6 Draft', 'Validated: name, hook, no invented numbers'],
  ['7 Send', 'Gmail, to your own inbox only'],
];

export default async function Overview() {
  const all = await listCompanies();
  const n = (s) => all.filter((c) => c.status === s).length;
  const qualified = all.filter((c) => c.score > 0).length;
  const researched = all.filter((c) => c.gates?.length).length;
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const secs = avg(all.filter((c) => c.seconds).map((c) => c.seconds));
  const pages = avg(all.filter((c) => c.pages?.length).map((c) => c.pages.length));
  const edits = all.filter((c) => typeof c.editRate === 'number').map((c) => c.editRate);
  const calls = all.reduce((a, c) => a + (c.geminiCalls || 0), 0);

  const dropReasons = {};
  all.filter((c) => c.status === 'dropped').forEach((c) => (dropReasons[c.reason] = (dropReasons[c.reason] || 0) + 1));
  const reviewReasons = {};
  all.filter((c) => c.status === 'review').forEach((c) => {
    const r = (c.reason || '').replace(/^error: /, '').split(':')[0].slice(0, 60);
    reviewReasons[r] = (reviewReasons[r] || 0) + 1;
  });

  return (
    <>
      <h1>Pipeline overview</h1>
      <p className="lede">A domain list goes in; qualified, personalised cold emails land in your inbox. Every gate is a rule you can point at.</p>

      <div className="grid g6">
        <Stat n={all.length} l="Researched" />
        <Stat n={qualified} l="Qualified" s={researched ? `${Math.round((qualified / researched) * 100)}% hit rate` : ''} />
        <Stat n={n('sent')} l="Sent" />
        <Stat n={n('draft') + n('ready')} l="Drafts" s={`${n('ready')} ready`} />
        <Stat n={n('review')} l="Review" />
        <Stat n={n('dropped')} l="Dropped" />
      </div>

      <h2>The 7 steps</h2>
      <div className="steps">{STEPS.map(([t, d]) => <div className="step" key={t}><b>{t}</b>{d}</div>)}</div>

      <h2>Against the brief</h2>
      <div className="grid g4">
        <Stat n={`${Math.round(secs)}s`} l="Per company" s="baseline 15–20 min · target < 2 min" />
        <Stat n={pages.toFixed(1)} l="Pages per company" s="cap: homepage + 4" />
        <Stat n={edits.length ? `${Math.round(avg(edits) * 100)}%` : '·'} l="Avg edit rate" s={`target < 20% · kill at 50% · n=${edits.length}`} />
        <Stat n={calls} l="Gemini calls" s="free tier ≈ 20/day per model" />
      </div>

      <div className="grid g2" style={{ marginTop: 12 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Why companies were dropped</h2>
          {Object.keys(dropReasons).length ? Object.entries(dropReasons).sort((a, b) => b[1] - a[1]).map(([r, k]) => <Bar key={r} label={r} k={k} max={n('dropped')} />) : <span className="muted">None yet.</span>}
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Why companies need review</h2>
          {Object.keys(reviewReasons).length ? Object.entries(reviewReasons).sort((a, b) => b[1] - a[1]).map(([r, k]) => <Bar key={r} label={r} k={k} max={n('review')} />) : <span className="muted">None. Nothing is guessed.</span>}
        </div>
      </div>

      <h2>Companies <Link href="/run" className="btn ghost" style={{ marginLeft: 8, fontFamily: 'var(--sans)', textTransform: 'none', letterSpacing: 0 }}>▶ Run on domains</Link></h2>
      <CompanyTable rows={all.slice(0, 15)} empty="No companies yet. Start a run." />
    </>
  );
}

function Stat({ n, l, s }) {
  return <div className="card stat"><div className="n">{n}</div><div className="l">{l}</div>{s && <div className="s">{s}</div>}</div>;
}

function Bar({ label, k, max }) {
  return (
    <div style={{ margin: '8px 0' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><span className="small">{label}</span><span className="mono">{k}</span></div>
      <div className="bar"><i style={{ width: `${(k / Math.max(max, 1)) * 100}%` }} /></div>
    </div>
  );
}
