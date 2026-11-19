import { CONFIG } from '../../lib/config.js';

const GATES = [
  ['Reachable', 'Homepage fetched and cleaned (robots.txt respected; JS-only pages re-read via Jina Reader)', 'Review queue', '—'],
  ['B2B SaaS', 'A verified quote saying software is sold to businesses', 'No → drop · unknown after 1 extra page → review', 'No ends the assessment'],
  ['Not already on a compliance platform', `Trust portal / link / "powered by" for ${Object.keys(CONFIG.competitorPlatforms).join(', ')}`, 'Drop', 'Yes ends the assessment'],
  ['Has frameworks left to get', `Holds all of ${CONFIG.frameworks.join(', ')}? (regex on footer, badges, /security, /trust)`, 'Drop if all held; if no cert page found, treat as not certified', 'All held ends it'],
  ['Series A–C', `Funding round stated, ${CONFIG.stage.minEmployees}–${CONFIG.stage.maxEmployees} people, ${CONFIG.stage.minOpenRoles}+ open roles (job-board APIs), or a real enterprise plan / SSO / named customers`, 'Series D+ or > 1000 people → drop · seed → drop · unknown after 2 pages → qualify, flagged, human check', '—'],
];

const MAP = [
  ['Is it B2B SaaS?', 'Product description naming a business buyer', 'homepage hero · /product · /about', 'b2b'],
  ['Already certified / on a platform?', 'A named certification string or vendor trust portal', 'footer · /security · /trust', 'certs'],
  ['Right stage?', 'Funding stage, headcount, open roles, enterprise tier', '/careers + job-board APIs · /pricing · /customers', 'stage'],
];

export default function Icp() {
  return (
    <>
      <h1>ICP &amp; evidence map</h1>
      <p className="lede">Sprinto&apos;s ICP: SaaS companies, Series A–C, preparing for an audit or under pressure from enterprise customers to get certified. The model fills named fields; code checks whether each is filled and applies these rules. All thresholds live in <span className="mono">lib/config.js</span>.</p>

      <h2>The 5 gates (in order; the first failure stops the assessment)</h2>
      <table>
        <thead><tr><th>Gate</th><th>Evidence that settles it</th><th>If it fails / is unknown</th><th>Short-circuit</th></tr></thead>
        <tbody>{GATES.map((g) => <tr key={g[0]}>{g.map((x, i) => <td key={i} className={i ? 'small' : ''}>{i ? x : <b>{x}</b>}</td>)}</tr>)}</tbody>
      </table>

      <h2>Evidence map: where the agent loop looks</h2>
      <table>
        <thead><tr><th>Question</th><th>Fact that answers it</th><th>Where it lives</th><th>Fetch budget</th></tr></thead>
        <tbody>{MAP.map((m) => <tr key={m[0]}><td><b>{m[0]}</b></td><td className="small">{m[1]}</td><td className="small mono">{m[2]}</td><td className="mono">{CONFIG.loop.budget[m[3]]}</td></tr>)}</tbody>
      </table>
      <p className="small muted">Worst case: {CONFIG.loop.maxExtraFetches} pages beyond the homepage, then hand to a human. Gemini only picks which of the site&apos;s own links to read next; a field is either filled with a verified quote or it isn&apos;t.</p>

      <h2>Who gets the email</h2>
      <div className="grid g2">
        <div className="card"><b>Early stage</b> <span className="muted small">(Series A, small, or unknown)</span><ol className="small">{['CTO', 'Co-founder / founder', 'CEO', 'Head / VP of Engineering'].map((t) => <li key={t}>{t}</li>)}</ol></div>
        <div className="card"><b>Growth stage</b> <span className="muted small">(Series B–C, 100+ people, or 20+ open roles)</span><ol className="small">{['CISO / Head of Security', 'Head of Compliance / GRC', 'CTO', 'VP Engineering', 'Founder'].map((t) => <li key={t}>{t}</li>)}</ol></div>
      </div>
      <p className="small muted">Nobody matching the list → review queue. Never “the nearest person with manager in their title”.</p>

      <h2>Email validator (code, not the model)</h2>
      <div className="card small">
        Addresses the person by first name · {CONFIG.email.minWords}–{CONFIG.email.maxWords} words · subject under {CONFIG.email.maxSubjectChars} characters · hook cites a stated fact (not an absence) and appears verbatim · both pain points cite evidence ids · no banned phrases · <b>every number in the email must appear in the evidence</b>. One rewrite allowed, then it goes to Drafts.
      </div>
    </>
  );
}
