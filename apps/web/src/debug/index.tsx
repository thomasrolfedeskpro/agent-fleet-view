import { type BeatMeta, freshnessOf, type ScenarioMeta, SPEEDS } from '@fleet/schema';
import { useEffect, useRef, useState } from 'react';
import { store, useStore } from '../store/index.js';
import { FRESHNESS_COLOR } from '../theme/tokens.js';
import './panel.css';

const NO_SCENARIOS: ScenarioMeta[] = [];
const NO_BEATS: BeatMeta[] = [];

export function DebugPanel(): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  const scenarios = useStore((s) => s.hello?.scenarios) ?? NO_SCENARIOS;
  const scenarioId = picked ?? scenarios[0]?.id ?? '';

  return (
    <div className="dbg">
      <div className="dbg-head">
        <h2 className="dbg-title">Debug</h2>
        <button
          type="button"
          className="dbg-collapse"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand debug panel' : 'Collapse debug panel'}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? '+' : '–'}
        </button>
      </div>
      <Readout />
      {!collapsed && (
        <div className="dbg-body">
          <Controls scenarios={scenarios} scenarioId={scenarioId} onPick={setPicked} />
          <Beats scenarios={scenarios} scenarioId={scenarioId} />
        </div>
      )}
    </div>
  );
}

function Readout(): React.ReactElement {
  const connection = useStore((s) => s.connection);
  const seq = useStore((s) => s.snapshot?.seq);
  const beat = useStore((s) => s.snapshot?.beat);
  const receivedAt = useStore((s) => s.receivedAt);

  const now = useNow(250);
  const ageMs = receivedAt === null ? null : Math.max(0, now - receivedAt);
  const band = ageMs === null ? 'stale' : freshnessOf(ageMs);

  return (
    <div className="dbg-readout">
      <span className="dbg-dot" style={{ background: FRESHNESS_COLOR[band] }} />
      <dl>
        <dt>conn</dt>
        <dd>{connection}</dd>
        <dt>seq</dt>
        <dd>{seq ?? '–'}</dd>
        <dt>beat</dt>
        <dd>{beat ?? '–'}</dd>
        <dt>age</dt>
        <dd>{ageMs === null ? '–' : `${(ageMs / 1000).toFixed(1)}s`}</dd>
      </dl>
    </div>
  );
}

type ControlsProps = {
  scenarios: ScenarioMeta[];
  scenarioId: string;
  onPick: (id: string) => void;
};

function Controls({ scenarios, scenarioId, onPick }: ControlsProps): React.ReactElement {
  const running = useStore((s) => s.running);
  const speed = useStore((s) => s.speed);
  const stalling = useStore((s) => s.stalling);

  return (
    <div className="dbg-section">
      <label className="dbg-label" htmlFor="dbg-scenario">
        Scenario
      </label>
      <select
        id="dbg-scenario"
        className="dbg-select"
        value={scenarioId}
        disabled={scenarios.length === 0}
        onChange={(e) => onPick(e.target.value)}
      >
        {scenarios.length === 0 ? (
          <option value="">waiting for hello…</option>
        ) : (
          scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))
        )}
      </select>

      <div className="dbg-transport">
        <button
          type="button"
          className="dbg-btn dbg-btn-primary"
          disabled={scenarioId === ''}
          onClick={() => store.send({ cmd: 'start', scenarioId })}
        >
          Start
        </button>
        <button
          type="button"
          className="dbg-btn"
          onClick={() => store.send({ cmd: running ? 'pause' : 'resume' })}
        >
          {running ? 'Pause' : 'Resume'}
        </button>
        <button type="button" className="dbg-btn" onClick={() => store.send({ cmd: 'reset' })}>
          Reset
        </button>
      </div>

      <span className="dbg-label">Speed</span>
      <fieldset className="dbg-speeds" aria-label="Speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className="dbg-speed"
            aria-pressed={s === speed}
            onClick={() => store.send({ cmd: 'setSpeed', speed: s })}
          >
            {s}x
          </button>
        ))}
      </fieldset>

      <label className="dbg-toggle">
        <input
          type="checkbox"
          checked={stalling}
          onChange={(e) => store.send({ cmd: 'setStalling', stalling: e.target.checked })}
        />
        Force stale
        <span className="dbg-toggle-note">holds the last snapshot</span>
      </label>
    </div>
  );
}

function Beats({ scenarios, scenarioId }: Omit<ControlsProps, 'onPick'>): React.ReactElement {
  const beats = scenarios.find((s) => s.id === scenarioId)?.beats ?? NO_BEATS;
  const snapshotScenario = useStore((s) => s.snapshot?.scenarioId);
  const beat = useStore((s) => s.snapshot?.beat);
  const current = snapshotScenario === scenarioId ? beat : undefined;

  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (current === undefined) return;
    list.current?.children[current]?.scrollIntoView?.({ block: 'nearest' });
  }, [current]);

  return (
    <div className="dbg-beats">
      <div className="dbg-beats-head">
        <span className="dbg-label">Beats</span>
        <span style={{ color: 'var(--quiet)' }}>{beats.length}</span>
      </div>
      {beats.length === 0 ? (
        <p className="dbg-empty">No beats yet.</p>
      ) : (
        <ul className="dbg-beat-list" ref={list}>
          {beats.map((b, i) => (
            <li key={`${b.at}:${b.note}`}>
              <button
                type="button"
                className="dbg-beat"
                aria-current={i === current}
                onClick={() => store.send({ cmd: 'jumpToBeat', beat: i })}
              >
                <span className="dbg-beat-at">{clock(b.at)}</span>
                <span className="dbg-beat-note">{b.note}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
