#!/usr/bin/env node
// Copies local results (data/results) into data/seed so the hosted site shows them.
// Email addresses are hidden on the way: the repo and the site are public, the inbox data isn't.
import fs from 'node:fs';
import path from 'node:path';

const from = path.resolve('data/results');
const to = path.resolve('data/seed');
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

fs.mkdirSync(to, { recursive: true });
const files = fs.existsSync(from) ? fs.readdirSync(from).filter((f) => f.endsWith('.json')) : [];
let hidden = 0;
for (const f of files) {
  const text = fs.readFileSync(path.join(from, f), 'utf8').replace(EMAIL, () => { hidden++; return '[email hidden]'; });
  fs.writeFileSync(path.join(to, f), text);
}
console.log(`Snapshot: ${files.length} companies copied to data/seed (${hidden} email addresses hidden)`);
