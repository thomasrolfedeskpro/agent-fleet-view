import type { Scenario, Snapshot } from '@fleet/schema';

/**
 * The scenario engine. Pure: it holds no timers and performs no I/O, so the caller decides
 * how much time has passed. T1 implements this; the golden fixtures are its oracle.
 */
export type Simulator = {
  /** Move the clock on. Applies every beat whose time has now passed. */
  advance(dtMs: number): void;
  /** The current state, as the wire sees it. `seq` is supplied by the caller. */
  snapshot(seq: number, sentAt?: Date): Snapshot;
  /** Back to the start. */
  reset(): void;
  /** Move straight to a beat index, applying every beat up to and including it. */
  jumpToBeat(beat: number): void;
  /** The beat index the clock is currently in. */
  readonly beat: number;
  readonly elapsedMs: number;
  readonly finished: boolean;
};

export function createSimulator(_scenario: Scenario): Simulator {
  throw new Error('createSimulator is not implemented yet — owned by task T1');
}
