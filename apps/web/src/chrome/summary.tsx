import type { Status } from '@fleet/schema';
import { counts, useStore } from '../store/index.js';
import { ATTENTION, QUIET, STATUS_COLOR } from '../theme/tokens.js';
import { dot, section, sectionTitle } from './styles.js';

const ORDER: Status[] = ['working', 'idle', 'initializing', 'error'];

function Tally({
  id,
  label,
  value,
  color,
}: {
  id: string;
  label: string;
  value: number;
  color: string;
}): React.ReactElement {
  return (
    <div
      data-testid={`tally-${id}`}
      data-value={value}
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <span style={dot(color)} />
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{value}</span>
      <span style={{ color: QUIET }}>{label}</span>
    </div>
  );
}

export function SummaryStrip(): React.ReactElement {
  const working = useStore((s) => counts(s).working);
  const idle = useStore((s) => counts(s).idle);
  const initializing = useStore((s) => counts(s).initializing);
  const error = useStore((s) => counts(s).error);
  const hands = useStore((s) => counts(s).hands);
  const byStatus: Record<Status, number> = { working, idle, initializing, error };

  return (
    <section data-testid="summary" style={section}>
      <h2 style={sectionTitle}>Fleet</h2>
      <div style={{ display: 'grid', gap: 6 }}>
        {ORDER.map((status) => (
          <Tally
            key={status}
            id={status}
            label={status}
            value={byStatus[status]}
            color={STATUS_COLOR[status]}
          />
        ))}
        <Tally id="hands" label="hands raised" value={hands} color={ATTENTION} />
      </div>
    </section>
  );
}
