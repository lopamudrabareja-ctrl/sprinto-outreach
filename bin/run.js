#!/usr/bin/env node
// Terminal mode.
//   npm run pipeline -- domains.txt
//   npm run pipeline -- rillet.com attio.com
//   npm run pipeline -- rillet.com --dry-run      (everything except the Gmail send)
//   npm run pipeline -- rillet.com --trace        (print every decision)

import fs from 'node:fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const { runOne, printReport } = await import('../lib/pipeline.js');
const { usage } = await import('../lib/llm.js');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const showTrace = args.includes('--trace');
const inputs = [];
for (const a of args.filter((x) => !x.startsWith('--'))) {
  if (fs.existsSync(a) && fs.statSync(a).isFile()) {
    fs.readFileSync(a, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).forEach((l) => inputs.push(l));
  } else inputs.push(a);
}
if (!inputs.length) {
  console.log('Usage: npm run pipeline -- <domains.txt | domain ...> [--dry-run] [--trace]');
  process.exit(1);
}

const results = [];
for (const line of inputs) {
  const [domain, ...hint] = line.split(/[\s,]+/);
  console.log(`\n▶ ${domain}`);
  const r = await runOne(domain, { dryRun, hint: hint.join(' ') });
  printReport(r);
  if (showTrace) r.trace.forEach((t) => console.log(`     · [${t.step}] ${t.decision} - ${t.why}`));
  results.push(r);
}

const count = (s) => results.filter((r) => r.status === s).length;
const qualified = results.filter((r) => ['sent', 'ready', 'draft'].includes(r.status) || (r.status === 'review' && r.score > 0)).length;
console.log(`\n── Summary ─────────────────────────────`);
console.log(`Researched ${results.length} · Qualified ${qualified} · Sent ${count('sent')} · Ready ${count('ready')} · Drafts ${count('draft')} · Review ${count('review')} · Dropped ${count('dropped')}`);
console.log(`Avg ${Math.round(results.reduce((a, r) => a + r.seconds, 0) / results.length)}s per company · ${usage.calls} Gemini calls`);
for (const [stage, s] of Object.entries(usage.byStage)) console.log(`  ${stage}: ${s.calls} calls, ${s.inTokens} in / ${s.outTokens} out tokens`);
console.log(`  models used: ${Object.entries(usage.byModel).map(([m, n]) => `${m} ×${n}`).join(', ') || 'none'}`);
if (usage.failures.length) console.log(`  ${usage.failures.length} Gemini call(s) failed over to another model (overload/timeout)`);
console.log(`Full records: data/results/<domain>.json`);
