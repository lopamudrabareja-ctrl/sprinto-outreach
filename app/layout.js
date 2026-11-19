import './globals.css';
import Link from 'next/link';
import { listCompanies, EPHEMERAL } from '../lib/store.js';

export const metadata = { title: 'Sprinto Outreach', description: 'Domains in, qualified and personalised cold emails out.' };
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }) {
  const all = await listCompanies();
  const n = (s) => all.filter((c) => c.status === s).length;
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="side">
            <div className="brand">Sprinto Outreach</div>
            <div className="brand-sub">Gemini reads &amp; writes. Code decides.</div>
            <nav className="nav">
              <div className="navgroup">Pipeline</div>
              <Link href="/">Overview</Link>
              <Link href="/run">Run on domains</Link>
              <Link href="/companies">Companies <span className="muted mono">{all.length}</span></Link>
              <div className="navgroup">Human gates</div>
              <Link href="/review">Review queue {n('review') > 0 && <span className="badge">{n('review')}</span>}</Link>
              <Link href="/drafts">Drafts &amp; sends {n('draft') + n('ready') > 0 && <span className="badge">{n('draft') + n('ready')}</span>}</Link>
              <div className="navgroup">Learning</div>
              <Link href="/loop">Feedback loop</Link>
              <Link href="/icp">ICP &amp; evidence map</Link>
            </nav>
          </aside>
          <main className="main">
            {EPHEMERAL && <div className="card small" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', marginBottom: 16 }}>Showing saved results. Runs started here work but are temporary; runs from your laptop are kept and appear after the next deploy.</div>}
            {children}
            <div className="footer">MESA Term 2 · AI Case 2 · case-study build, not affiliated with Sprinto. Emails only ever go to your own inbox.</div>
          </main>
        </div>
      </body>
    </html>
  );
}
