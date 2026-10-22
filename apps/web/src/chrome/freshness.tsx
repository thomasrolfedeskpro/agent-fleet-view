import type { Freshness } from '@fleet/schema';
import { freshnessOf } from '@fleet/schema';
import { useEffect, useState } from 'react';
import { useStore } from '../store/index.js';
import { FRESHNESS_COLOR, QUIET } from '../theme/tokens.js';
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

export function FreshnessReadout(): React.ReactElement {
  const { ageMs, band } = useFreshness();

  if (band === null || ageMs === null) {
    return (
      <span data-testid="freshness" data-band="none" style={{ color: QUIET, fontSize: 11 }}>
        no snapshot yet
      </span>
    );
  }

  return (
    <span
      data-testid="freshness"
      data-band={band}
      title={`last snapshot ${formatAge(ageMs)} ago`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        color: FRESHNESS_COLOR[band],
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span style={dot(FRESHNESS_COLOR[band], 7)} />
      {formatAge(ageMs)} ago
    </span>
  );
}
