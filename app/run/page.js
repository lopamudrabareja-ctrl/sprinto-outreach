import RunClient from './RunClient.js';

export default function RunPage() {
  return (
    <>
      <h1>Run on domains</h1>
      <p className="lede">One domain per line. Companies run one at a time; each takes about 30–90 seconds depending on how busy Gemini is.</p>
      <RunClient />
    </>
  );
}
