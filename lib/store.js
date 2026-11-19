// Storage: Postgres (Neon) when DATABASE_URL is set (Vercel), local JSON files otherwise.
// Holds company records, lessons, manual contacts and a small key-value cache (Hunter results).

import fs from 'node:fs';
import path from 'node:path';

const DB = process.env.DATABASE_URL;
// On Vercel without a database, only /tmp is writable (and it is wiped between cold starts).
export const EPHEMERAL = !!process.env.VERCEL && !DB;
const KV_DIR = process.env.VERCEL ? '/tmp/sprinto/kv' : path.join(process.cwd(), '.cache', 'kv');
const RESULTS = process.env.VERCEL ? '/tmp/sprinto/results' : path.join(process.cwd(), 'data', 'results');
// Results snapshotted into the repo, bundled read-only with the hosted site.
const SEED = path.join(process.cwd(), 'data', 'seed');

let sqlPromise;
async function sql() {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const { neon } = await import('@neondatabase/serverless');
      const q = neon(DB);
      await q`CREATE TABLE IF NOT EXISTS companies (domain text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz DEFAULT now())`;
      await q`CREATE TABLE IF NOT EXISTS lessons (id serial PRIMARY KEY, text text NOT NULL, created_at timestamptz DEFAULT now())`;
      await q`CREATE TABLE IF NOT EXISTS kv (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz DEFAULT now())`;
      return q;
    })();
  }
  return sqlPromise;
}

const readJSON = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; } };
const writeJSON = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2)); };

// --- companies ---------------------------------------------------------------
export async function saveCompany(rec) {
  rec.updatedAt = new Date().toISOString();
  if (DB) {
    const q = await sql();
    await q`INSERT INTO companies (domain, data) VALUES (${rec.domain}, ${JSON.stringify(rec)}::jsonb)
            ON CONFLICT (domain) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
  } else writeJSON(path.join(RESULTS, `${rec.domain}.json`), rec);
  return rec;
}

export async function getCompany(domain) {
  if (DB) {
    const q = await sql();
    const rows = await q`SELECT data FROM companies WHERE domain = ${domain}`;
    return rows[0]?.data || null;
  }
  return readJSON(path.join(RESULTS, `${domain}.json`), null) || (process.env.VERCEL ? readJSON(path.join(SEED, `${domain}.json`), null) : null);
}

const readDir = (dir) =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => readJSON(path.join(dir, f), null)).filter(Boolean) : [];

export async function listCompanies() {
  let all;
  if (DB) {
    const q = await sql();
    all = (await q`SELECT data FROM companies`).map((r) => r.data);
  } else {
    all = readDir(RESULTS);
    // Hosted without a database: show the results saved with the deploy (npm run snapshot), newer runs win.
    if (process.env.VERCEL) {
      const have = new Set(all.map((c) => c.domain));
      all.push(...readDir(SEED).filter((c) => !have.has(c.domain)));
    }
  }
  return all.sort((a, b) => String(b.updatedAt || b.startedAt).localeCompare(String(a.updatedAt || a.startedAt)));
}

export async function updateCompany(domain, patch) {
  const rec = await getCompany(domain);
  if (!rec) return null;
  return saveCompany({ ...rec, ...patch });
}

export async function deleteCompany(domain) {
  if (DB) { const q = await sql(); await q`DELETE FROM companies WHERE domain = ${domain}`; }
  else fs.rmSync(path.join(RESULTS, `${domain}.json`), { force: true });
}

// --- lessons (feedback loop) -------------------------------------------------
const SEED_LESSONS = path.join(process.cwd(), 'data', 'lessons.json');
const LESSONS_FILE = process.env.VERCEL ? '/tmp/sprinto/lessons.json' : SEED_LESSONS;
export async function getLessons() {
  if (DB) {
    const q = await sql();
    return (await q`SELECT id, text, created_at FROM lessons ORDER BY id`).map((r) => ({ id: r.id, text: r.text, createdAt: r.created_at }));
  }
  const raw = fs.existsSync(LESSONS_FILE) ? readJSON(LESSONS_FILE, []) : readJSON(SEED_LESSONS, []);
  return raw.map((l, i) => (typeof l === 'string' ? { id: i + 1, text: l } : l));
}
export async function addLesson(text) {
  if (DB) { const q = await sql(); await q`INSERT INTO lessons (text) VALUES (${text})`; return; }
  const all = await getLessons();
  all.push({ id: (all.at(-1)?.id || 0) + 1, text, createdAt: new Date().toISOString() });
  writeJSON(LESSONS_FILE, all);
}
export async function deleteLesson(id) {
  if (DB) { const q = await sql(); await q`DELETE FROM lessons WHERE id = ${id}`; return; }
  writeJSON(LESSONS_FILE, (await getLessons()).filter((l) => l.id !== Number(id)));
}

// --- key-value cache (Hunter results, manual contacts added from the UI) ------
export async function kvGet(key) {
  if (DB) { const q = await sql(); return (await q`SELECT value FROM kv WHERE key = ${key}`)[0]?.value ?? null; }
  return readJSON(path.join(KV_DIR, encodeURIComponent(key) + '.json'), null);
}
export async function kvSet(key, value) {
  if (DB) {
    const q = await sql();
    await q`INSERT INTO kv (key, value) VALUES (${key}, ${JSON.stringify(value)}::jsonb)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
    return;
  }
  writeJSON(path.join(KV_DIR, encodeURIComponent(key) + '.json'), value);
}
