import type { Scenario, ScenarioMeta, Snapshot } from '@fleet/schema';
import { SCENARIOS, scenarioById } from '@fleet/schema';
import { createSimulator, type Simulator } from '@fleet/simulator';
import type { SnapshotSource } from './types.js';

const metaOf = (scenario: Scenario): ScenarioMeta => ({
  id: scenario.id,
  title: scenario.title,
  beats: scenario.beats.map((beat) => ({ at: beat.at, note: beat.note })),
});

/**
 * The real source: a simulator driven by the server's clock. `next` reports the state at the
 * current scenario time and only then advances, which is what makes a jump land on the very
 * next message rather than one tick later.
 */
export function createSimulatorSource(): SnapshotSource {
  let scenario: Scenario = SCENARIOS[0]!;
  let simulator: Simulator = createSimulator(scenario);

  return {
    listScenarios: () => SCENARIOS.map(metaOf),
    start(scenarioId: string) {
      const found = scenarioById(scenarioId);
      if (!found) throw new Error(`unknown scenario: ${scenarioId}`);
      scenario = found;
      simulator = createSimulator(scenario);
    },
    reset() {
      simulator.reset();
    },
    jumpToBeat(beat: number) {
      simulator.jumpToBeat(Math.max(0, Math.min(beat, scenario.beats.length - 1)));
    },
    next(dtMs: number): Snapshot {
      const snapshot = simulator.snapshot(0);
      simulator.advance(dtMs);
      return snapshot;
    },
  };
}
