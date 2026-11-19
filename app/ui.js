import Link from 'next/link';

export const LABEL = { sent: 'Sent', ready: 'Ready', draft: 'Draft', review: 'Needs review', dropped: 'Dropped', running: 'Running', queued: 'Queued', error: 'Error' };

export function Pill({ status, children }) {
  return <span className={`pill p-${status}`}>{children || LABEL[status] || status}</span>;
}

export function personName(c) {
  const p = c?.contact?.person;
  return p ? `${p.first_name} ${p.last_name || ''}`.trim() : null;
}

// Deterministic gradient avatar from the company name.
const HUES = [[262, 320], [190, 262], [330, 20], [150, 200], [280, 210], [20, 330], [210, 290]];
export function Avatar({ name = '?', size = 32 }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b] = HUES[h % HUES.length];
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(135deg, hsl(${a} 80% 62%), hsl(${b} 80% 55%))` }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// Circular gauge. value 0..max.
export function Ring({ value = 0, max = 100, size = 44, stroke = 5, label, sub }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const id = `rg${size}${stroke}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${value} of ${max}`} style={{ flex: 'none' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--panel2)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y={sub ? '46%' : '50%'} textAnchor="middle" dominantBaseline="central" fill="var(--ink)"
        style={{ font: `600 ${Math.round(size * 0.28)}px var(--display)` }}>{label ?? value}</text>
      {sub && <text x="50%" y="66%" textAnchor="middle" dominantBaseline="central" fill="var(--muted)" style={{ font: `500 ${Math.round(size * 0.1)}px var(--mono)` }}>{sub}</text>}
    </svg>
  );
}

// Area sparkline with gradient fill. values: numbers.
export function Sparkline({ values = [], width = 160, height = 56, color = '#8b5cf6', id = 'sp' }) {
  const vs = values.length > 1 ? values : [0, ...(values.length ? values : [0])];
  const max = Math.max(...vs, 1), min = Math.min(...vs, 0);
  const pts = vs.map((v, i) => [(i / (vs.length - 1)) * width, height - 6 - ((v - min) / (max - min || 1)) * (height - 14)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const last = pts.at(-1);
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  );
}

export function CompanyCell({ c }) {
  return (
    <Link href={`/companies/${c.domain}`} className="co">
      <Avatar name={c.company} />
      <span><b>{c.company}</b><span className="muted mono">{c.domain}</span></span>
    </Link>
  );
}

export function timeAgo(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
