import { getLessons, listCompanies } from '../../lib/store.js';
import LessonForm from './LessonForm.js';

export const dynamic = 'force-dynamic';

export default async function Loop() {
  const [lessons, all] = await Promise.all([getLessons(), listCompanies()]);
  const edited = all.filter((c) => typeof c.editRate === 'number').sort((a, b) => String(b.approvedAt).localeCompare(String(a.approvedAt)));
  const avg = edited.length ? edited.reduce((a, c) => a + c.editRate, 0) / edited.length : null;
  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">Learning</div>
          <h1>Feedback loop</h1>
          <p className="lede">Lessons are added to the writer prompt for every new draft. They come from your edits on the Drafts page, or you can add them here.</p>
        </div>
      </div>

      <div className="grid g3">
        <div className="card kpi hero"><span className="l">Active lessons</span><span className="n">{lessons.length}</span><span className="s">used in every new draft</span></div>
        <div className="card kpi"><span className="l">Average edit rate</span><span className="n">{avg === null ? '—' : `${Math.round(avg * 100)}%`}</span><span className="s">target &lt; 20% · kill criterion 50%</span></div>
        <div className="card kpi"><span className="l">Emails reviewed by a human</span><span className="n">{edited.length}</span><span className="s">sent from the Drafts page</span></div>
      </div>

      <div className="sec"><h2>Lessons</h2></div>
      <LessonForm lessons={lessons} />

      <div className="sec"><h2>Edit history</h2></div>
      {!edited.length && <div className="card muted">No human-reviewed sends yet.</div>}
      {edited.length > 0 && (
        <div className="table-wrap"><table>
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
        </table></div>
      )}
    </>
  );
}
