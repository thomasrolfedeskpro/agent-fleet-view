import type { Entity, Scenario, Snapshot } from '@fleet/schema';
import { applyOps, orderedEntities } from '@fleet/schema';

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

/** No beat has been applied yet, which only happens when a scenario starts after zero. */
const NO_BEAT = -1;

export function createSimulator(scenario: Scenario): Simulator {
  const beatTimes = scenario.beats.map((b) => b.at * 1000);
  const lastIndex = scenario.beats.length - 1;
  const endMs = beatTimes[lastIndex] ?? 0;

  let state = new Map<string, Entity>();
  let elapsedMs = 0;
  let beat = NO_BEAT;

  function applyThrough(target: number): void {
    while (beat < target) {
      beat += 1;
      state = applyOps(state, scenario.beats[beat]!.ops);
    }
  }

  function applyDue(): void {
    while (beat < lastIndex && beatTimes[beat + 1]! <= elapsedMs) {
      beat += 1;
      state = applyOps(state, scenario.beats[beat]!.ops);
    }
  }

  function rewind(): void {
    state = new Map();
    elapsedMs = 0;
    beat = NO_BEAT;
    applyDue();
  }

  rewind();

  return {
    advance(dtMs: number): void {
      if (Number.isNaN(dtMs) || dtMs < 0) {
        throw new Error(`advance needs a non-negative dt, got ${dtMs}`);
      }
      elapsedMs = Math.min(elapsedMs + dtMs, endMs);
      applyDue();
    },

    snapshot(seq: number, sentAt: Date = new Date()): Snapshot {
      return {
        v: 1,
        seq,
        sentAt: sentAt.toISOString(),
        scenarioId: scenario.id,
        beat,
        elapsedMs,
        entities: orderedEntities(state),
      };
    },

    reset: rewind,

    jumpToBeat(target: number): void {
      if (!Number.isInteger(target) || target < 0 || target > lastIndex) {
        throw new Error(`no such beat: ${target}`);
      }
      rewind();
      applyThrough(target);
      elapsedMs = beatTimes[target]!;
    },

    get beat() {
      return beat;
    },
    get elapsedMs() {
      return elapsedMs;
    },
    get finished() {
      return beat === lastIndex;
    },
  };
}
