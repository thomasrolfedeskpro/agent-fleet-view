import type { ScenarioMeta, Snapshot } from '@fleet/schema';

/**
 * Where the server gets snapshots. T2 ships the fixture-backed implementation; T7 swaps in one
 * driven by the simulator. Nothing else in the server knows which it is holding.
 */
export type SnapshotSource = {
  listScenarios(): ScenarioMeta[];
  start(scenarioId: string): void;
  reset(): void;
  jumpToBeat(beat: number): void;
  /** Produce the next snapshot, advancing by `dtMs` of scenario time. */
  next(dtMs: number): Snapshot;
};

export const PORT = 8787;
export const PATH = '/stream';
