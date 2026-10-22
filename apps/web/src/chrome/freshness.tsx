import type { Freshness } from '@fleet/schema';
import { freshnessOf } from '@fleet/schema';
import { useEffect, useState } from 'react';
import { useStore } from '../store/index.js';
import { FRESHNESS_COLOR, INK, QUIET } from '../theme/tokens.js';
import { dot } from './styles.js';

export const FRESHNESS_TICK_MS = 1000;

export type FreshnessState = { ageMs: number | null; band: Freshness | null };

export function formatAge(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

/**
 * A feed that has died sends nothing, so nothing re-renders. The age has to advance on a clock
 * of its own or a stopped floor keeps reading as current.
 */
export function useFreshness(intervalMs: number = FRESHNESS_TICK_MS): FreshnessState {
  const receivedAt = useStore((s) => s.receivedAt);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  if (receivedAt === null) return { ageMs: null, band: null };
  const ageMs = Math.max(0, performance.now() - receivedAt);
  return { ageMs, band: freshnessOf(ageMs) };
}

const readout: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 12,
  color: QUIET,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

/**
 * The band colours the dot and never the words: amber and green are both under 4.5:1 on white,
 * and a dot only has to clear 3:1.
 */
export function FreshnessReadout(): React.ReactElement {
  const configured = useStore((s) => s.source);
  const connection = useStore((s) => s.connection);
  const { ageMs, band } = useFreshness();
  // A dropped socket must not keep claiming to be live; the age alone would not say so.
  const source = connection === 'open' ? configured : 'offline';

  if (band === null || ageMs === null) {
    return (
      <span data-testid="freshness" data-band="none" data-source={source} style={readout}>
        <span style={dot(QUIET, 7)} />
        <span>
          <strong style={{ color: INK }}>{source}</strong>
          {' · no snapshot yet'}
        </span>
      </span>
    );
  }

  return (
    <span
      data-testid="freshness"
      data-band={band}
      data-source={source}
      title={`last snapshot ${formatAge(ageMs)} ago`}
      style={readout}
    >
      <span style={dot(FRESHNESS_COLOR[band], 7)} />
      <span>
        <strong style={{ color: INK }}>{source}</strong>
        {` · updated ${formatAge(ageMs)} ago`}
      </span>
    </span>
  );
}
