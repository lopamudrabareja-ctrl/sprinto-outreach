import RunClient from './RunClient.js';
import { listCompanies } from '../../lib/store.js';

export const dynamic = 'force-dynamic';

export default async function RunPage() {
  const done = (await listCompanies()).map((c) => c.domain);
  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">Pipeline</div>
          <h1>Run on domains</h1>
          <p className="lede">Paste domains, one per line or comma separated. Each company takes about 30–90 seconds, one at a time, so Gemini&apos;s free quota lasts.</p>
        </div>
      </div>
      <RunClient done={done} />
    </>
  );
}
