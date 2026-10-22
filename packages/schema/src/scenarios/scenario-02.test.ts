// Reading the fixtures needs node types, which this package does not ask for in its tsconfig.
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Entity, Status } from '../entity.js';
import { applyOps, orderedEntities, Scenario } from '../scenario.js';
import { Snapshot } from '../wire.js';
import { SCENARIOS, scenarioById } from './index.js';
import { scenario02 } from './scenario-02.js';

const FIXTURES = join(import.meta.dirname, '..', '..', '..', '..', 'fixtures', scenario02.id);

/** The same base instant `scripts/gen-fixtures.ts` stamps, so a replay can be compared byte for byte. */
const BASE = Date.parse('2026-01-01T00:00:00.000Z');

function endState(): Map<string, Entity> {
  let state = new Map<string, Entity>();
  for (const beat of scenario02.beats) state = applyOps(state, beat.ops);
  return state;
}

function countBy<K extends string>(entities: Entity[], key: (e: Entity) => K): Record<K, number> {
  const counts = {} as Record<K, number>;
  for (const entity of entities) counts[key(entity)] = (counts[key(entity)] ?? 0) + 1;
  return counts;
}

const read = (name: string) => readFileSync(join(FIXTURES, name), 'utf8');

describe('scenario-02', () => {
  it('parses against the scenario schema', () => {
    expect(Scenario.safeParse(scenario02).success).toBe(true);
  });

  it('is offered by the server and the debug panel', () => {
    expect(SCENARIOS.map((s) => s.id)).toContain('scenario-02');
    expect(scenarioById('scenario-02')?.title).toBe('A busy afternoon');
  });

  it('has beats in ascending time, each one distinct', () => {
    const times = scenario02.beats.map((b) => b.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(new Set(times).size).toBe(times.length);
  });

  it('opens on a quiet floor of four persistent things', () => {
    const first = applyOps(new Map(), scenario02.beats[0]!.ops);
    expect([...first.keys()]).toEqual(['vdp', 'linear', 'cp', 'gateway']);
    expect([...first.values()].every((e) => e.persistent)).toBe(true);
  });

  it('replays into snapshots that satisfy the wire schema', () => {
    let state = new Map<string, Entity>();
    scenario02.beats.forEach((beat, index) => {
      state = applyOps(state, beat.ops);
      const parsed = Snapshot.safeParse({
        v: 1,
        seq: index,
        sentAt: new Date(BASE).toISOString(),
        scenarioId: scenario02.id,
        beat: index,
        elapsedMs: beat.at * 1000,
        entities: orderedEntities(state),
      });
      expect(parsed.success, `beat ${index}`).toBe(true);
    });
  });

  it('ends with ten full instances, sixty pairs and one untrusted zone', () => {
    const entities = orderedEntities(endState());

    expect(entities).toHaveLength(137);
    expect(countBy(entities, (e) => e.type)).toEqual({
      vdp: 1,
      linear: 1,
      'control-plane': 1,
      'model-gateway': 1,
      ec2: 10,
      sandbox: 60,
      jim: 60,
      'isolated-instance': 1,
      'app-instance': 1,
      vera: 1,
    });
  });

  it('ends with four faults, four pairs starting and five agents waiting', () => {
    const entities = orderedEntities(endState());

    expect(countBy(entities, (e) => e.status as Status)).toEqual({
      error: 4,
      initializing: 8,
      idle: 5,
      working: 120,
    });
    const hands = entities.filter((e) => e.hand);
    expect(hands.map((e) => e.id)).toEqual(['jim-02-2', 'jim-04-4', 'jim-07-3', 'jim-09-5']);
    expect(hands.every((e) => e.status === 'error')).toBe(true);
  });

  it('gives every cloud instance a region and its slot count', () => {
    const instances = orderedEntities(endState()).filter((e) => e.type === 'ec2');

    expect(instances).toHaveLength(10);
    for (const instance of instances) {
      expect(instance.meta, instance.id).toMatch(/^[a-z]{2}-[a-z]+-\d[a-z] · 6 of 6 slots$/);
    }
  });

  it('labels agents with a story and sandboxes with a ref', () => {
    const entities = orderedEntities(endState());

    for (const agent of entities.filter((e) => e.type === 'jim')) {
      expect(agent.label, agent.id).toMatch(/^Jim · (PDEV|SR)-\d+$/);
      expect(agent.links[0]?.href, agent.id).toContain('linear.app');
    }
    for (const sandbox of entities.filter((e) => e.type === 'sandbox')) {
      expect(sandbox.label, sandbox.id).toMatch(/^sandbox · (master|release-5\.\d)$/);
    }
  });

  it('never puts the same story on two agents at once', () => {
    let state = new Map<string, Entity>();
    for (const beat of scenario02.beats) {
      state = applyOps(state, beat.ops);
      const stories = orderedEntities(state)
        .filter((e) => e.kind === 'agent')
        .map((e) => e.label);
      expect(new Set(stories).size, `beat ${beat.at}`).toBe(stories.length);
    }
  });

  it('gives every entity a glyph and a meta line at every beat', () => {
    let state = new Map<string, Entity>();
    for (const beat of scenario02.beats) {
      state = applyOps(state, beat.ops);
      for (const entity of state.values()) {
        expect(entity.glyph, `${entity.id} at ${beat.at}`).toBeTruthy();
        expect(entity.meta, `${entity.id} at ${beat.at}`).not.toBe('');
      }
    }
  });

  it('pairs both halves at each other, and only ever two to a pair', () => {
    let state = new Map<string, Entity>();
    for (const beat of scenario02.beats) {
      state = applyOps(state, beat.ops);
      for (const entity of state.values()) {
        if (!entity.pairWith) continue;
        const other = state.get(entity.pairWith);
        expect(other, `${entity.id} at ${beat.at}`).toBeDefined();
        expect(other?.pairWith, `${entity.id} at ${beat.at}`).toBe(entity.id);
        expect(other?.parentId, `${entity.id} at ${beat.at}`).toBe(entity.parentId);
      }
    }
  });

  it('keeps a recycled pair in the slot it already had', () => {
    const before = new Map<string, Entity>();
    let state = new Map<string, Entity>();
    for (const beat of scenario02.beats) {
      if (beat.note === 'Four slots recycle') for (const [id, e] of state) before.set(id, e);
      state = applyOps(state, beat.ops);
    }

    const recycled = orderedEntities(state).filter((e) => e.status === 'initializing');
    expect(recycled.map((e) => e.id)).toEqual([
      'sandbox-03-1',
      'jim-03-1',
      'sandbox-05-6',
      'jim-05-6',
      'sandbox-08-3',
      'jim-08-3',
      'sandbox-10-4',
      'jim-10-4',
    ]);
    for (const entity of recycled) {
      expect(entity.parentId, entity.id).toBe(before.get(entity.id)?.parentId);
      expect(entity.label, entity.id).not.toBe(before.get(entity.id)?.label);
    }
  });
});

describe('scenario-02 fixtures', () => {
  it('match a fresh generation byte for byte', () => {
    let state = new Map<string, Entity>();
    scenario02.beats.forEach((beat, index) => {
      state = applyOps(state, beat.ops);
      const elapsedMs = beat.at * 1000;
      const snapshot: Snapshot = {
        v: 1,
        seq: index,
        sentAt: new Date(BASE + elapsedMs).toISOString(),
        scenarioId: scenario02.id,
        beat: index,
        elapsedMs,
        entities: orderedEntities(state),
      };
      const name = `beat-${String(index).padStart(2, '0')}.json`;
      expect(read(name), name).toBe(`${JSON.stringify(snapshot, null, 2)}\n`);
    });
  });

  it('carry a manifest that matches the beats', () => {
    const manifest = {
      id: scenario02.id,
      title: scenario02.title,
      beats: scenario02.beats.map((b) => ({ at: b.at, note: b.note })),
      count: scenario02.beats.length,
    };
    expect(read('manifest.json')).toBe(`${JSON.stringify(manifest, null, 2)}\n`);
  });
});
