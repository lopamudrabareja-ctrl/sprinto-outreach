import './globals.css';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { listCompanies, EPHEMERAL } from '../lib/store.js';
import Sidebar from './Sidebar.js';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono', display: 'swap' });

export const metadata = { title: 'Sprinto Outreach', description: 'An SDR agent for Sprinto: domains in, qualified and personalised cold emails out.' };
export const dynamic = 'force-dynamic';

// Sets the saved theme before paint, so there is no flash.
const themeScript = `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}`;

export default async function RootLayout({ children }) {
  const all = await listCompanies();
  const n = (s) => all.filter((c) => c.status === s).length;
  const nav = {
    companies: all.length,
    review: n('review'),
    drafts: n('draft') + n('ready'),
    list: all.map((c) => ({ domain: c.domain, company: c.company, status: c.status, score: c.score || 0 })),
  };
  return (
    <html lang="en" data-theme="dark" className={`${sans.variable} ${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <div className="shell">
          <Sidebar nav={nav} />
          <main className="main">
            {EPHEMERAL && (
              <div className="card small" style={{ marginBottom: 18, borderColor: 'rgba(251,191,36,.35)', color: 'var(--warn)' }}>
                Showing saved results. Runs started on this hosted site work but are temporary; runs from your laptop are kept and appear after the next deploy.
              </div>
            )}
            {children}
            <div className="footer">
              <span>MESA Term 2 · AI Case 2</span>
              <span>Case-study build, not affiliated with Sprinto</span>
              <span>Emails only ever go to your own inbox</span>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
