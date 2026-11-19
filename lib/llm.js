// Thin Gemini wrapper: JSON-only output, per-call timeout, model fallback, token accounting per stage.
// If a model is overloaded (429/503) or times out, the next model in CONFIG.models is tried.
import { CONFIG } from './config.js';

export const usage = { calls: 0, byStage: {}, byModel: {}, failures: [] };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const coolOff = new Map(); // model -> timestamp until which we skip it

async function callOnce(model, prompt, temperature, key) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CONFIG.llmTimeoutMs);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature, responseMimeType: 'application/json' },
      }),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, json, message: json.error?.message };
  } catch (e) {
    return { status: 0, ok: false, message: e.name === 'AbortError' ? `timed out after ${CONFIG.llmTimeoutMs / 1000}s` : e.message };
  } finally {
    clearTimeout(t);
  }
}

export async function askJSON(stage, prompt, { temperature = 0.2 } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing in .env.local');
  const errors = [];

  for (let round = 0; round < 2; round++) {
    for (const model of CONFIG.models) {
      if ((coolOff.get(model) || 0) > Date.now()) continue;
      const r = await callOnce(model, prompt, temperature, key);

      if (r.ok) {
        const u = r.json.usageMetadata || {};
        usage.calls++;
        usage.byModel[model] = (usage.byModel[model] || 0) + 1;
        const s = (usage.byStage[stage] ||= { calls: 0, inTokens: 0, outTokens: 0 });
        s.calls++;
        s.inTokens += u.promptTokenCount || 0;
        s.outTokens += u.candidatesTokenCount || 0;
        const text = r.json.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
        try {
          return JSON.parse(text.replace(/^```json\s*|```$/g, '').trim());
        } catch {
          errors.push(`${model}: non-JSON reply`);
          continue;
        }
      }

      const daily = r.status === 429 && /per day|requests_per_day|PerDay/i.test(r.message || '');
      const short = daily ? 'daily free quota used up' : r.status === 429 ? 'rate limited' : r.status >= 500 ? 'overloaded' : (r.message || '').slice(0, 80);
      errors.push(`${model}: ${short}`);
      usage.failures.push({ stage, model, status: r.status, message: short });
      // Daily quota gone: skip this model for the rest of the run.
      if (daily) coolOff.set(model, Infinity);
      // Overloaded, rate-limited, or slow: rest this model for a minute and try the next one.
      else if (r.status === 429 || r.status >= 500 || r.status === 0) coolOff.set(model, Date.now() + 60_000);
      // Model gone for this key: never retry it this run.
      else if (r.status === 404) coolOff.set(model, Infinity);
      else throw new Error(`Gemini ${r.status}: ${(r.message || '').slice(0, 160)}`); // bad key, bad request: stop now
    }
    if (round === 0) { coolOff.forEach((v, k) => v !== Infinity && coolOff.delete(k)); await sleep(5000); }
  }
  const allDaily = CONFIG.models.every((m) => coolOff.get(m) === Infinity);
  throw new Error(allDaily
    ? `Gemini daily free quota used up on every model (resets in ~24h; enable billing at aistudio.google.com for more)`
    : `Gemini unavailable for ${stage}: ${[...new Set(errors)].slice(-3).join(' | ')}`);
}
