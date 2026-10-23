import type { Status } from '@fleet/schema';
import { Hand } from '../floor/glyph.js';
import { counts, useStore } from '../store/index.js';
import {
  ATTENTION_EDGE,
  ATTENTION_INK,
  ATTENTION_TINT,
  INK,
  LINE,
  QUIET,
  RADIUS,
  STATUS_COLOR,
  STATUS_INK,
  SUNKEN,
  SURFACE,
} from '../theme/tokens.js';
import { FreshnessReadout } from './freshness.js';
import { dot } from './styles.js';

const ORDER: Status[] = ['working', 'initializing', 'idle', 'error'];

const bar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '0 16px',
  height: 56,
  background: SURFACE,
  borderBottom: `1px solid ${LINE}`,
};

const divider: React.CSSProperties = {
  width: 1,
  height: 22,
  background: LINE,
  flex: 'none',
};

function BrandMark(): React.ReactElement {
  return (
    <span
      style={{
        width: 24,
        height: 24,
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        borderRadius: RADIUS.glyph,
        background: INK,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill={SURFACE} aria-hidden="true">
        <rect x="2" y="2" width="5" height="5" rx="1.4" />
        <rect x="9" y="2" width="5" height="5" rx="1.4" />
        <rect x="2" y="9" width="5" height="5" rx="1.4" />
        <rect x="9" y="9" width="5" height="5" rx="1.4" />
      </svg>
    </span>
  );
}

function Tally({
  id,
  label,
  value,
  color,
  ink,
}: {
  id: string;
  label: string;
  value: number;
  color: string;
  ink?: string;
}): React.ReactElement {
  return (
    <div
      data-testid={`kpi-${id}`}
      data-value={value}
      style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}
    >
      <span style={{ ...dot(color, 7), alignSelf: 'center' }} />
      <span
        key={value}
        className="fleet-tick"
        style={{
          fontSize: 18,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          color: ink && value > 0 ? ink : INK,
        }}
      >
        {value}
      </span>
      <span style={{ color: QUIET, fontSize: 12 }}>{label}</span>
    </div>
  );
}

/** The one tally worth shouting about, and only once it is above zero. */
function HandsPill({ value }: { value: number }): React.ReactElement {
  const raised = value > 0;

  return (
    <div
      data-testid="kpi-hands"
      data-value={value}
      data-raised={raised}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        height: 30,
        padding: '0 11px',
        borderRadius: RADIUS.pill,
        background: raised ? ATTENTION_TINT : SUNKEN,
        border: `1px solid ${raised ? ATTENTION_EDGE : LINE}`,
        color: raised ? ATTENTION_INK : QUIET,
      }}
    >
      <span aria-hidden="true" style={{ display: 'flex' }}>
        <Hand size={13} />
      </span>
      <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
      <span style={{ fontSize: 12 }}>need a person</span>
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
      <BrandMark />
      <strong style={{ fontSize: 14, letterSpacing: '-0.01em' }}>Fleet view</strong>
      <span style={divider} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {ORDER.map((status) => (
          <Tally
            key={status}
            id={status}
            label={status}
            value={byStatus[status]}
            color={STATUS_COLOR[status]}
            ink={status === 'error' ? STATUS_INK.error : undefined}
          />
        ))}
      </div>
      <HandsPill value={hands} />
      <div style={{ marginLeft: 'auto' }}>
        <FreshnessReadout />
      </div>
    </header>
  );
}
