import { addManualContact } from '../../../lib/contact.js';

export async function POST(req) {
  const { domain, first_name, last_name, position, email } = await req.json();
  if (!domain || !first_name || !position) return Response.json({ error: 'domain, first_name and position required' }, { status: 400 });
  await addManualContact(domain, { first_name: first_name.trim(), last_name: (last_name || '').trim(), position: position.trim(), email: (email || '').trim() || null });
  return Response.json({ ok: true });
}
