import { getLessons, listCompanies } from '../../lib/store.js';
import LessonForm from './LessonForm.js';

export const dynamic = 'force-dynamic';

export default async function Loop() {
  const [lessons, all] = await Promise.all([getLessons(), listCompanies()]);
  const edited = all.filter((c) => typeof c.editRate === 'number').sort((a, b) => String(b.approvedAt).localeCompare(String(a.approvedAt)));
  const avg = edited.length ? edited.reduce((a, c) => a + c.editRate, 0) / edited.length : null;
  return (
    <>
      <h1>Feedback loop</h1>
      <p className="lede">Lessons are injected into the writer prompt for every new draft. They come from your edits on the Drafts page, or you can add them here.</p>

      <div className="grid g3">
        <div className="card stat"><div className="n">{lessons.length}</div><div className="l">Active lessons</div></div>
        <div className="card stat"><div className="n">{avg === null ? '·' : `${Math.round(avg * 100)}%`}</div><div className="l">Avg edit rate</div><div className="s">target &lt; 20% · kill criterion 50%</div></div>
        <div className="card stat"><div className="n">{edited.length}</div><div className="l">Emails reviewed by a human</div></div>
      </div>

      <h2>Lessons</h2>
      <LessonForm lessons={lessons} />

      <h2>Edit history</h2>
      {!edited.length && <div className="card muted">No human-reviewed sends yet.</div>}
      {edited.length > 0 && (
        <table>
          <thead><tr><th>Company</th><th>Edit rate</th><th>Original subject → sent subject</th></tr></thead>
          <tbody>
            {edited.map((c) => (
              <tr key={c.domain}>
                <td><b>{c.company}</b></td>
                <td className="mono">{Math.round(c.editRate * 100)}%</td>
                <td className="small">{c.originalEmail?.subject} → <b>{c.email.subject}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
