import { addLesson, deleteLesson, getLessons } from '../../../lib/store.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await getLessons());
}

export async function POST(req) {
  const { text } = await req.json();
  if (!text?.trim()) return Response.json({ error: 'text required' }, { status: 400 });
  await addLesson(text.trim().slice(0, 300));
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  const { id } = await req.json();
  await deleteLesson(id);
  return Response.json({ ok: true });
}
