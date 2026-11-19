'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './icons.js';

const PAGES = [
  { href: '/', label: 'Overview', icon: 'home', group: 'Pipeline' },
  { href: '/run', label: 'Run on domains', icon: 'play', group: 'Pipeline', key: 'R' },
  { href: '/companies', label: 'Companies', icon: 'building', group: 'Pipeline', count: 'companies' },
  { href: '/review', label: 'Review queue', icon: 'alert', group: 'Human gates', badge: 'review' },
  { href: '/drafts', label: 'Drafts & sends', icon: 'inbox', group: 'Human gates', badge: 'drafts' },
  { href: '/loop', label: 'Feedback loop', icon: 'loop', group: 'Learning' },
  { href: '/icp', label: 'ICP & rules', icon: 'target', group: 'Learning' },
  { href: '/components-map.html', label: 'Components map', icon: 'map', group: 'Learning', external: true },
];

export default function Sidebar({ nav }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || 'dark');
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function toggleTheme() {
    const t = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch {}
    setTheme(t);
  }

  const isOn = (href) => (href === '/' ? path === '/' : path.startsWith(href));
  let lastGroup = '';

  return (
    <aside className="side">
      <Link href="/" className="brand">
        <span className="logo"><Icon name="bolt" size={18} stroke={2.2} /></span>
        <span><b>Sprinto Outreach</b><small>SDR agent · Case 2</small></span>
      </Link>
      <button className="search-btn" onClick={() => setOpen(true)}>
        <Icon name="search" size={15} /> Jump to…<kbd>⌘K</kbd>
      </button>
      <nav className="nav">
        {PAGES.map((p) => {
          const head = p.group !== lastGroup ? <div className="navgroup" key={p.group}>{p.group}</div> : null;
          lastGroup = p.group;
          const extra = p.badge && nav[p.badge] > 0 ? <span className="badge">{nav[p.badge]}</span>
            : p.count ? <span className="count">{nav[p.count]}</span> : null;
          const inner = <><Icon name={p.icon} />{p.label}{extra}</>;
          return [head, p.external
            ? <a key={p.href} href={p.href} target="_blank" rel="noreferrer">{inner}</a>
            : <Link key={p.href} href={p.href} className={isOn(p.href) ? 'on' : ''}>{inner}</Link>];
        })}
      </nav>
      <div className="side-foot">
        <span className="small muted"><span className="status-dot" />Pipeline online</span>
        <button className="theme-btn" onClick={toggleTheme}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} /> {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
      {open && createPortal(<Palette nav={nav} onClose={() => setOpen(false)} />, document.body)}
    </aside>
  );
}

function Palette({ nav, onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    const pages = PAGES.filter((p) => !s || p.label.toLowerCase().includes(s)).map((p) => ({ ...p, kind: 'Pages' }));
    const cos = nav.list
      .filter((c) => !s || c.company.toLowerCase().includes(s) || c.domain.includes(s))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((c) => ({ href: `/companies/${c.domain}`, label: c.company, sub: c.domain, status: c.status, score: c.score, icon: 'building', kind: 'Companies' }));
    const actions = 'run'.includes(s) || 'export csv'.includes(s) || !s
      ? [{ href: '/run', label: 'Run new domains', icon: 'play', kind: 'Actions' }, { href: '/api/export', label: 'Export companies as CSV', icon: 'download', kind: 'Actions', external: true }]
      : [];
    return [...actions, ...cos, ...pages];
  }, [q, nav.list]);

  function go(it) {
    onClose();
    if (it.external) window.location.href = it.href; else router.push(it.href);
  }

  let group = '';
  return (
    <div className="pal-back" onMouseDown={onClose}>
      <div className="pal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Jump to">
        <input
          ref={inputRef} id="palette-q" value={q} placeholder="Search companies, pages, actions…"
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((i) => Math.min(i + 1, items.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((i) => Math.max(i - 1, 0)); }
            if (e.key === 'Enter' && items[sel]) go(items[sel]);
          }}
        />
        <ul>
          {items.map((it, i) => {
            const head = it.kind !== group ? <div className="pal-group" key={'g' + it.kind}>{it.kind}</div> : null;
            group = it.kind;
            return [head, (
              <li key={it.kind + it.href} className={i === sel ? 'sel' : ''} onMouseEnter={() => setSel(i)}>
                <a href={it.href} onClick={(e) => { e.preventDefault(); go(it); }}>
                  <Icon name={it.icon} />
                  <span>{it.label}{it.sub && <span className="muted mono"> · {it.sub}</span>}</span>
                  {it.status && <span className={`pill p-${it.status} k`}>{it.score ? `fit ${it.score}` : it.status}</span>}
                </a>
              </li>
            )];
          })}
          {!items.length && <li className="empty small">Nothing matches “{q}”.</li>}
        </ul>
      </div>
    </div>
  );
}
