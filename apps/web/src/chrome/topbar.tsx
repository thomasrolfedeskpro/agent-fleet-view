import type { Status } from '@fleet/schema';
import { counts, useStore } from '../store/index.js';
import { ATTENTION, INK, LINE, QUIET, STATUS_COLOR, SURFACE } from '../theme/tokens.js';
import { FreshnessReadout } from './freshness.js';

const ORDER: Status[] = ['working', 'initializing', 'idle', 'error'];

const bar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 28,
  padding: '0 16px',
  height: 56,
  background: SURFACE,
  borderBottom: `1px solid ${LINE}`,
};

function Tally({
  id,
  label,
  value,
  color,
  loud,
}: {
  id: string;
  label: string;
  value: number;
  color: string;
  loud?: boolean;
}): React.ReactElement {
  return (
    <div
      data-testid={`kpi-${id}`}
      data-value={value}
      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      <span
        style={{
          fontSize: 20,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          // A raised hand is the one number worth shouting about, and only when there is one.
          color: loud && value > 0 ? color : INK,
        }}
      >
        {value}
      </span>
      <span style={{ color: QUIET }}>{label}</span>
    </div>
  );
}

export function TopBar(): React.ReactElement {
  const working = useStore((s) => counts(s).working);
  const initializing = useStore((s) => counts(s).initializing);
  const idle = useStore((s) => counts(s).idle);
  const error = useStore((s) => counts(s).error);
  const hands = useStore((s) => counts(s).hands);
  const byStatus: Record<Status, number> = { working, initializing, idle, error };

  return (
    <header data-testid="topbar" style={bar}>
      <strong style={{ fontSize: 14, letterSpacing: '-0.01em' }}>Fleet view</strong>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {ORDER.map((status) => (
          <Tally
            key={status}
            id={status}
            label={status}
            value={byStatus[status]}
            color={STATUS_COLOR[status]}
            loud={status === 'error'}
          />
        ))}
        <Tally id="hands" label="need a person" value={hands} color={ATTENTION} loud />
      </div>
      <div style={{ marginLeft: 'auto' }}>
        <FreshnessReadout />
      </div>
    </header>
  );
}
