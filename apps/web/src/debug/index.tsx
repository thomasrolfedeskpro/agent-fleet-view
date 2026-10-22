import { store, useStore } from '../store/index.js';

/** Placeholder. Task T6 replaces this with the real panel; these controls only prove the wiring. */
export function DebugPanel(): React.ReactElement {
  const hello = useStore((s) => s.hello);
  const snapshot = useStore((s) => s.snapshot);
  const running = useStore((s) => s.running);
  const scenarioId = hello?.scenarios[0]?.id ?? 'scenario-01';

  return (
    <div style={{ padding: 16 }}>
      <p style={{ color: 'var(--quiet)', margin: '0 0 12px' }}>Debug — task T6</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => store.send({ cmd: 'start', scenarioId })}>
          Start
        </button>
        <button type="button" onClick={() => store.send({ cmd: running ? 'pause' : 'resume' })}>
          {running ? 'Pause' : 'Resume'}
        </button>
        <button type="button" onClick={() => store.send({ cmd: 'reset' })}>
          Reset
        </button>
      </div>
      <div style={{ color: 'var(--quiet)' }}>
        beat {snapshot?.beat ?? '–'} · seq {snapshot?.seq ?? '–'}
        <br />
        {hello?.scenarios[0]?.beats[snapshot?.beat ?? 0]?.note ?? ''}
      </div>
    </div>
  );
}
