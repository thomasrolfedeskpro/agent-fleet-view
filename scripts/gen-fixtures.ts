import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Entity, Snapshot } from '../packages/schema/src/index.js';
import { applyOps, orderedEntities, SCENARIOS } from '../packages/schema/src/index.js';

const BASE = Date.parse('2026-01-01T00:00:00.000Z');
const out = join(import.meta.dirname, '..', 'fixtures');

for (const scenario of SCENARIOS) {
  const dir = join(out, scenario.id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  let state = new Map<string, Entity>();
  scenario.beats.forEach((beat, index) => {
    state = applyOps(state, beat.ops);
    const elapsedMs = beat.at * 1000;
    const snapshot: Snapshot = {
      v: 1,
      seq: index,
      sentAt: new Date(BASE + elapsedMs).toISOString(),
      scenarioId: scenario.id,
      beat: index,
      elapsedMs,
      entities: orderedEntities(state),
    };
    const name = `beat-${String(index).padStart(2, '0')}.json`;
    writeFileSync(join(dir, name), `${JSON.stringify(snapshot, null, 2)}\n`);
  });

  const manifest = {
    id: scenario.id,
    title: scenario.title,
    beats: scenario.beats.map((b) => ({ at: b.at, note: b.note })),
    count: scenario.beats.length,
  };
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`${scenario.id}: ${scenario.beats.length} fixtures`);
}
