import { counts, useStore } from '../store/index.js';

/** Placeholder. Task T5 replaces this with the summary strip, list panel and detail panel. */
export function Chrome(): React.ReactElement {
  const c = useStore(counts);
  const connection = useStore((s) => s.connection);

  return (
    <div style={{ padding: 16 }}>
      <p style={{ color: 'var(--quiet)', margin: '0 0 12px' }}>Chrome — task T5</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.9 }}>
        <li>connection: {connection}</li>
        <li>working: {c.working}</li>
        <li>idle: {c.idle}</li>
        <li>initializing: {c.initializing}</li>
        <li>error: {c.error}</li>
        <li>hands raised: {c.hands}</li>
      </ul>
    </div>
  );
}
