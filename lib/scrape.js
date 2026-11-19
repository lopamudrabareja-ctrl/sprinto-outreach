// Step 1: single-fetch scraper. Request -> parse -> clean -> store (cache).
// Plain request first; if the page is a JS shell, re-read it through Jina Reader.
// robots.txt is respected. Failures return a reason instead of throwing.

import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CONFIG } from './config.js';

const CACHE_DIR = process.env.VERCEL ? '/tmp/sprinto/pages' : path.join(process.cwd(), '.cache', 'pages');
const robotsCache = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function normalizeDomain(input) {
  let d = String(input).trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
  return d;
}

async function httpGet(url, { accept = 'text/html' } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CONFIG.scrape.timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': CONFIG.scrape.userAgent, Accept: accept },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, url: res.url, body };
  } catch (e) {
    return { ok: false, status: 0, url, body: '', error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(t);
  }
}

// --- robots.txt -----------------------------------------------------------
async function robotsRules(origin) {
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  const res = await httpGet(`${origin}/robots.txt`, { accept: 'text/plain' });
  const rules = [];
  if (res.ok && !/<html/i.test(res.body)) {
    let groupAgents = [];
    let inAgentRun = false;
    for (const raw of res.body.split('\n')) {
      const line = raw.split('#')[0].trim();
      const i = line.indexOf(':');
      if (i < 0) continue;
      const k = line.slice(0, i).trim().toLowerCase();
      const v = line.slice(i + 1).trim();
      if (k === 'user-agent') {
        if (!inAgentRun) groupAgents = [];
        groupAgents.push(v);
        inAgentRun = true;
        continue;
      }
      inAgentRun = false;
      if (!groupAgents.includes('*') || !v) continue;
      if (k === 'allow' || k === 'disallow') rules.push({ allow: k === 'allow', pattern: v });
    }
  }
  robotsCache.set(origin, rules);
  return rules;
}

const robotsRegex = (p) =>
  new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));

// Google-style: longest matching rule wins; Allow wins a tie.
export async function allowedByRobots(url) {
  const u = new URL(url);
  const target = u.pathname + u.search;
  const rules = await robotsRules(u.origin);
  let best = null;
  for (const r of rules) {
    if (!robotsRegex(r.pattern).test(target)) continue;
    if (!best || r.pattern.length > best.pattern.length || (r.pattern.length === best.pattern.length && r.allow)) best = r;
  }
  return !best || best.allow;
}

// --- cleaning ---------------------------------------------------------------
const NOISE = [
  'script', 'style', 'noscript', 'svg', 'iframe', 'form', 'template',
  'nav', 'header', '[role=navigation]', '[aria-hidden=true]',
  '[class*=cookie]', '[id*=cookie]', '[class*=consent]', '[id*=consent]', '[class*=banner]',
];

export function cleanHtml(html, pageUrl) {
  const $ = cheerio.load(html);
  const origin = new URL(pageUrl).origin;

  // Raw text incl. footer + image alts: used only for code-side regex scans (certs, platforms).
  const altText = $('img[alt]').map((_, el) => $(el).attr('alt')).get().join(' ');
  const hrefs = $('a[href], script[src], iframe[src]').map((_, el) => $(el).attr('href') || $(el).attr('src')).get();
  const footerText = $('footer').text().replace(/\s+/g, ' ').trim();

  // Internal links with anchor text, for the agent loop to choose from.
  const links = [];
  const seen = new Set();
  $('a[href]').each((_, el) => {
    try {
      const u = new URL($(el).attr('href'), pageUrl);
      const host = u.hostname.replace(/^www\./, '');
      const base = new URL(origin).hostname.replace(/^www\./, '');
      if (host !== base && !host.endsWith('.' + base)) return;
      u.hash = ''; u.search = '';
      const href = u.toString().replace(/\/$/, '');
      if (seen.has(href) || /\.(pdf|png|jpe?g|svg|zip)$/i.test(href)) return;
      seen.add(href);
      links.push({ url: href, text: $(el).text().replace(/\s+/g, ' ').trim().slice(0, 60) });
    } catch { /* bad href */ }
  });

  const title = $('title').text().trim();
  const metaDesc = $('meta[name=description]').attr('content') || $('meta[property="og:description"]').attr('content') || '';

  NOISE.forEach((sel) => $(sel).remove());
  $('footer').remove();

  // Text blocks: headings always kept, other blocks only if >= minBlockWords. Deduplicated.
  const blocks = [];
  const dedupe = new Set();
  $('h1, h2, h3, h4, p, li, td, blockquote, dd, figcaption').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text) return;
    const words = text.split(' ').length;
    const isHeading = /^h[1-4]$/.test(tag);
    if (!isHeading && words < CONFIG.scrape.minBlockWords) return;
    const key = text.toLowerCase();
    if (dedupe.has(key)) return;
    dedupe.add(key);
    blocks.push(text);
  });

  let text = [title, metaDesc, ...blocks].filter(Boolean).join('\n');
  if (text.length > CONFIG.scrape.maxChars) text = text.slice(0, CONFIG.scrape.maxChars);

  return {
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    links,
    scanText: [text, footerText, altText, hrefs.join(' ')].join('\n'),
  };
}

function cleanMarkdown(md) {
  // Jina returns markdown. Strip images/link syntax, drop short lines, dedupe.
  const lines = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .split('\n')
    .map((l) => l.replace(/^[#>*\-\s|]+/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const l of lines) {
    const isHeadingish = l.length < 80 && /^[A-Z]/.test(l);
    if (l.split(' ').length < CONFIG.scrape.minBlockWords && !isHeadingish) continue;
    const k = l.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(l);
  }
  return out.join('\n').slice(0, CONFIG.scrape.maxChars);
}

// --- public: fetch one page --------------------------------------------------
export async function fetchPage(url) {
  const key = crypto.createHash('md5').update(url).digest('hex');
  const cacheFile = path.join(CACHE_DIR, key + '.json');
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (Date.now() - cached.fetchedAt < 7 * 864e5) return { ...cached, fromCache: true };
  }

  if (!(await allowedByRobots(url))) {
    return { url, ok: false, reason: 'blocked by robots.txt' };
  }

  await sleep(CONFIG.scrape.delayMs);
  const res = await httpGet(url);
  let result;

  if (res.ok && /<html|<body|<div/i.test(res.body)) {
    const cleaned = cleanHtml(res.body, res.url || url);
    result = { url: res.url || url, ok: true, method: 'request', ...cleaned };
  } else if (res.status === 404) {
    return { url, ok: false, reason: 'not found (404)' };
  } else {
    result = { url, ok: false, reason: res.error || `HTTP ${res.status}` };
  }

  // JS shell or blocked: re-read through Jina Reader (headless browser as a service).
  if (!result.ok || result.wordCount < CONFIG.scrape.minWords) {
    const jina = await httpGet(`https://r.jina.ai/${url}`, { accept: 'text/plain' });
    if (jina.ok && jina.body.length > 200) {
      const text = cleanMarkdown(jina.body);
      const words = text.split(/\s+/).filter(Boolean).length;
      if (words > (result.wordCount || 0)) {
        result = {
          url, ok: true, method: 'jina',
          text, wordCount: words,
          links: result.links || [],
          scanText: [text, result.scanText || '', jina.body].join('\n'),
        };
      }
    }
  }

  if (!result.ok) return result;
  if (result.wordCount < 30) return { url, ok: false, reason: 'page empty after cleaning' };

  result.fetchedAt = Date.now();
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(result));
  return result;
}

// --- job boards: public APIs, no scraping needed ---------------------------
// Greenhouse / Lever / Ashby expose public JSON. Slug is guessed from the domain.
export async function fetchJobs(domain) {
  const slug = domain.split('.')[0];
  const tries = [
    { board: 'greenhouse', url: `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, pick: (j) => j.jobs?.map((x) => x.title) },
    { board: 'lever', url: `https://api.lever.co/v0/postings/${slug}?mode=json`, pick: (j) => Array.isArray(j) ? j.map((x) => x.text) : null },
    { board: 'ashby', url: `https://api.ashbyhq.com/posting-api/job-board/${slug}`, pick: (j) => j.jobs?.map((x) => x.title) },
  ];
  for (const t of tries) {
    const res = await httpGet(t.url, { accept: 'application/json' });
    if (!res.ok) continue;
    try {
      const titles = t.pick(JSON.parse(res.body));
      if (titles && titles.length) return { board: t.board, url: t.url, titles };
    } catch { /* not json */ }
  }
  return null;
}
