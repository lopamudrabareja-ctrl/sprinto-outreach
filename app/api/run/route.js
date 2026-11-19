import { runOne } from '../../../lib/pipeline.js';

export const maxDuration = 300; // one company per request; Gemini can be slow
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { domain, dryRun = true } = await req.json();
  if (!domain || typeof domain !== 'string') return Response.json({ error: 'domain required' }, { status: 400 });
  const rec = await runOne(domain, { dryRun: !!dryRun });
  // Keep the response small; the full record is in the store.
  const { domain: d, company, status, reason, score, email, seconds } = rec;
  return Response.json({ domain: d, company, status, reason, score, email: email ? { subject: email.subject } : null, seconds });
}
