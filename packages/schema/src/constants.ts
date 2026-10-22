/** How often the server emits a snapshot at 1x speed. */
export const TICK_MS = 1000;

/** Playback speeds the debug panel may request. */
export const SPEEDS = [0.5, 1, 2, 5, 10] as const;
export type Speed = (typeof SPEEDS)[number];

/** Freshness bands, measured from the last snapshot the client received. */
export const FRESH_MS = 20_000;
export const DELAYED_MS = 60_000;

/** How long a component takes to animate from one state to the next. */
export const TRANSITION_MS = 400;

export type Freshness = 'current' | 'delayed' | 'stale';

export function freshnessOf(ageMs: number): Freshness {
  if (ageMs < FRESH_MS) return 'current';
  if (ageMs < DELAYED_MS) return 'delayed';
  return 'stale';
}
