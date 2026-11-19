import { approveAndSend } from '../../../lib/pipeline.js';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { domain, subject, body } = await req.json();
  if (!domain || !subject || !body) return Response.json({ ok: false, error: 'domain, subject and body required' }, { status: 400 });
  const r = await approveAndSend(domain, subject, body);
  return Response.json(r, { status: r.ok ? 200 : 400 });
}
