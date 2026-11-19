'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Pill, Ring, Avatar, timeAgo } from '../ui.js';
import Icon from '../icons.js';

const FILTERS = [['all', 'All'], ['ready', 'Ready'], ['sent', 'Sent'], ['draft', 'Drafts'], ['review', 'Needs review'], ['dropped', 'Dropped']];
const GATE_NAMES = ['Reachable', 'B2B SaaS', 'No platform', 'Frameworks left', 'Series A–C'];

export default function CompaniesClient({ rows }) {
  const [q, setQ] = useState('');
  const [f, setF] = useState('all');
  const [sort, setSort] = useState('fit');

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([k]) => [k, k === 'all' ? rows.length : rows.filter((r) => r.status === k).length])), [rows]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter((r) => f === 'all' || r.status === f)
      .filter((r) => !s || [r.company, r.domain, r.person, r.position, r.reason, r.subject].join(' ').toLowerCase().includes(s))
      .sort((a, b) => sort === 'fit' ? b.score - a.score : sort === 'recent' ? String(b.updatedAt).localeCompare(String(a.updatedAt)) : a.company.localeCompare(b.company));
  }, [rows, q, f, sort]);

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input id="co-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, person, reason…" />
        </div>
        <select id="co-sort" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 'auto' }}>
          <option value="fit">Sort: best fit</option>
          <option value="recent">Sort: most recent</option>
          <option value="name">Sort: A–Z</option>
        </select>
      </div>
      <div className="chips" style={{ marginBottom: 14 }}>
        {FILTERS.map(([k, label]) => (
          <button key={k} className={`chip ${f === k ? 'on' : ''}`} onClick={() => setF(k)}>{label}<span className="c">{counts[k]}</span></button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Company</th><th>Status</th><th>Fit</th><th>Gates</th><th>Contact</th><th>Why</th><th>Updated</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.domain}>
                <td><Link href={`/companies/${r.domain}`} className="co"><Avatar name={r.company} /><span><b>{r.company}</b><span className="muted mono">{r.domain}</span></span></Link></td>
                <td><Pill status={r.status} /></td>
                <td>{r.score ? <Ring value={r.score} size={38} stroke={4} /> : <span className="faint">—</span>}</td>
                <td>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {GATE_NAMES.map((g, i) => {
                      const p = r.gates[i];
                      const bg = p === true ? 'var(--good)' : p === false ? 'var(--bad)' : p === null ? 'var(--warn)' : 'var(--panel2)';
                      return <span key={g} title={`${g}: ${p === true ? 'pass' : p === false ? 'fail' : p === null ? 'unclear' : 'not reached'}`} style={{ width: 9, height: 18, borderRadius: 3, background: bg, opacity: p === undefined ? 1 : 0.9 }} />;
                    })}
                  </div>
                </td>
                <td className="small">{r.person ? <>{r.person}<div className="muted">{r.position}</div></> : <span className="faint">—</span>}</td>
                <td className="small" style={{ maxWidth: 320 }}>{r.subject ? <span><Icon name="mail" size={13} /> {r.subject}</span> : <span className="muted">{r.reason.length > 110 ? r.reason.slice(0, 110) + '…' : r.reason}</span>}</td>
                <td className="mono faint">{timeAgo(r.updatedAt)}</td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={7}><div className="empty"><b>No matches</b>Try another search or filter.</div></td></tr>}
          </tbody>
        </table>
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>Gate bars, left to right: reachable · B2B SaaS · not on a compliance platform · frameworks left · Series A–C. <span className="ok">Green</span> pass, <span className="no">red</span> fail, <span className="unk">amber</span> unclear.</p>
    </>
  );
}
