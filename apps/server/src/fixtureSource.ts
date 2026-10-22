import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ScenarioMeta, Snapshot } from '@fleet/schema';
import type { SnapshotSource } from './types.js';

const FIXTURES_DIR = join(import.meta.dirname, '..', '..', '..', 'fixtures');

type FixtureScenario = { meta: ScenarioMeta; snapshots: Snapshot[] };

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadScenario(dir: string): FixtureScenario {
  const meta = ScenarioMeta.parse(readJson(join(dir, 'manifest.json')));
  if (meta.beats.length === 0) throw new Error(`fixture scenario has no beats: ${dir}`);
  const snapshots = meta.beats.map((_, index) =>
    Snapshot.parse(readJson(join(dir, `beat-${String(index).padStart(2, '0')}.json`))),
  );
  return { meta, snapshots };
}

function beatAt(scenario: FixtureScenario, elapsedMs: number): number {
  const index = scenario.meta.beats.findLastIndex((beat) => beat.at * 1000 <= elapsedMs);
  return Math.max(index, 0);
}

/**
 * The only part of the server that knows snapshots come from disk. T7 replaces this with a
 * simulator-backed `SnapshotSource`; everything else keeps working untouched.
 */
export function createFixtureSource(dir: string = FIXTURES_DIR): SnapshotSource {
  const scenarios = new Map<string, FixtureScenario>();
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (!entry.isDirectory()) continue;
    const scenario = loadScenario(join(dir, entry.name));
    scenarios.set(scenario.meta.id, scenario);
  }

  const first = [...scenarios.values()][0];
  if (!first) throw new Error(`no fixture scenarios under ${dir}`);

  let current = first;
  let elapsedMs = 0;
  let seq = 0;

  const lastBeatMs = (): number => current.meta.beats.at(-1)!.at * 1000;

  return {
    listScenarios: (): ScenarioMeta[] => [...scenarios.values()].map((scenario) => scenario.meta),

    start(scenarioId: string): void {
      const scenario = scenarios.get(scenarioId);
      if (!scenario) throw new Error(`unknown scenario: ${scenarioId}`);
      current = scenario;
      elapsedMs = 0;
    },

    reset(): void {
      elapsedMs = 0;
    },

    jumpToBeat(beat: number): void {
      const beats = current.meta.beats;
      const index = Math.min(Math.max(beat, 0), beats.length - 1);
      elapsedMs = beats[index]!.at * 1000;
    },

    next(dtMs: number): Snapshot {
      const snapshot: Snapshot = {
        ...current.snapshots[beatAt(current, elapsedMs)]!,
        seq,
        sentAt: new Date().toISOString(),
        elapsedMs,
      };
      seq += 1;
      // The last beat holds, so scenario time stops with it instead of running away.
      elapsedMs = Math.min(elapsedMs + dtMs, lastBeatMs());
      return snapshot;
    },
  };
}
