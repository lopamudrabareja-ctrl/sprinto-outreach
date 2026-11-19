// Minimal outline icon set (24px grid, stroke = currentColor).
const P = {
  home: 'M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  play: 'M7 4.5v15l13-7.5z',
  building: 'M4 20V6l8-3v17M12 9h6a2 2 0 0 1 2 2v9M8 8h.01M8 12h.01M8 16h.01M16 13h.01M16 17h.01M3 20h18',
  inbox: 'M4 13h4l2 3h4l2-3h4M4 13l2.5-7h11L20 13v6H4z',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  loop: 'M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5',
  target: 'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 11a1 1 0 1 0 1 1M21 3l-9 9',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  sun: 'M12 4V2M12 22v-2M4.9 4.9 3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  bolt: 'M13 3 4 14h7l-1 7 9-11h-7z',
  check: 'M5 12l5 5L20 7',
  x: 'M6 6l12 12M18 6 6 18',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0',
  file: 'M14 3H6v18h12V7zM14 3v4h4',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  refresh: 'M20 11A8 8 0 0 0 6.3 6.3L4 9M4 4v5h5M4 13a8 8 0 0 0 13.7 4.7L20 15M20 20v-5h-5',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
};

export default function Icon({ name, size = 16, stroke = 1.8, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      <path d={P[name] || P.spark} />
    </svg>
  );
}
