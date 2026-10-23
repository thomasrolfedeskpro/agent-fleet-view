// Reading the fixtures needs node types, which this package does not ask for in its tsconfig.
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Entity, Status } from '../entity.js';
import { applyOps, orderedEntities, Scenario } from '../scenario.js';
import { Snapshot } from '../wire.js';
import { SCENARIOS, scenarioById } from './index.js';
import { scenario03 } from './scenario-03.js';

const FIXTURES = join(import.meta.dirname, '..', '..', '..', '..', 'fixtures', scenario03.id);

/** The same base instant `scripts/gen-fixtures.ts` stamps, so a replay can be compared byte for byte. */
const BASE = Date.parse('2026-01-01T00:00:00.000Z');

function stateAt(note: string): Map<string, Entity> {
  let state = new Map<string, Entity>();
  for (const beat of scenario03.beats) {
    state = applyOps(state, beat.ops);
    if (beat.note === note) return state;
  }
  throw new Error(`no beat called ${note}`);
}

function endState(): Map<string, Entity> {
  let state = new Map<string, Entity>();
  for (const beat of scenario03.beats) state = applyOps(state, beat.ops);
  return state;
}

function countBy<K extends string>(entities: Entity[], key: (e: Entity) => K): Record<K, number> {
  const counts = {} as Record<K, number>;
  for (const entity of entities) counts[key(entity)] = (counts[key(entity)] ?? 0) + 1;
  return counts;
}

const zones = (state: Map<string, Entity>) =>
  orderedEntities(state).filter((e) => e.type === 'isolated-instance');

const read = (name: string) => readFileSync(join(FIXTURES, name), 'utf8');

describe('scenario-03', () => {
  it('parses against the scenario schema', () => {
    expect(Scenario.safeParse(scenario03).success).toBe(true);
  });

  it('is offered by the server and the debug panel', () => {
    expect(SCENARIOS.map((s) => s.id)).toContain('scenario-03');
    expect(scenarioById('scenario-03')?.title).toBe('Seven reports, one at a time');
  });

  it('has beats in ascending time, each one distinct', () => {
    const times = scenario03.beats.map((b) => b.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(new Set(times).size).toBe(times.length);
  });

  it('opens on a quiet floor of four persistent things', () => {
    const first = applyOps(new Map(), scenario03.beats[0]!.ops);
    expect([...first.keys()]).toEqual(['vdp', 'linear', 'cp', 'gateway']);
    expect([...first.values()].every((e) => e.persistent)).toBe(true);
  });

  it('replays into snapshots that satisfy the wire schema', () => {
    let state = new Map<string, Entity>();
    scenario03.beats.forEach((beat, index) => {
      state = applyOps(state, beat.ops);
      const parsed = Snapshot.safeParse({
        v: 1,
        seq: index,
        sentAt: new Date(BASE).toISOString(),
        scenarioId: scenario03.id,
        beat: index,
        elapsedMs: beat.at * 1000,
        entities: orderedEntities(state),
      });
      expect(parsed.success, `beat ${index}`).toBe(true);
    });
  });

  it('raises at most one zone per beat, because Tess holds one report at a time', () => {
    for (const beat of scenario03.beats) {
      const raised = beat.ops.filter(
        (op) => op.op === 'add' && op.entity.type === 'isolated-instance',
      );
      expect(raised.length, beat.note).toBeLessThanOrEqual(1);
    }
  });

  it('puts Tess on exactly one report at a time, in order', () => {
    const carried: string[] = [];
    let state = new Map<string, Entity>();
    for (const beat of scenario03.beats) {
      state = applyOps(state, beat.ops);
      const tess = state.get('tess');
      const onReport = tess?.meta.match(/^triaging (VDP-9\d\d)$/)?.[1];
      if (onReport && carried.at(-1) !== onReport) carried.push(onReport);
    }
    expect(carried).toEqual([
      'VDP-901',
      'VDP-902',
      'VDP-903',
      'VDP-904',
      'VDP-905',
      'VDP-906',
      'VDP-907',
    ]);
  });

  it('piles six zones up behind her, because reproducing outlasts triaging', () => {
    let peak = 0;
    let peakAt = '';
    let state = new Map<string, Entity>();
    for (const beat of scenario03.beats) {
      state = applyOps(state, beat.ops);
      if (zones(state).length > peak) {
        peak = zones(state).length;
        peakAt = beat.note;
      }
    }
    expect(peak).toBe(6);
    expect(peakAt).toBe('Zone 02 cannot reproduce · zone 06 up · zone 07 requested');
  });

  it('shows all three stages of a zone at once, once the queue is flowing', () => {
    const state = stateAt('Zone 02 cannot reproduce · zone 06 up · zone 07 requested');
    const live = zones(state);

    const empty = live.filter((z) => ![...state.values()].some((e) => e.parentId === z.id));
    expect(empty.map((e) => e.id)).toEqual(['vera-inst-07']);

    const claiming = live.filter((z) =>
      [...state.values()].some((e) => e.parentId === z.id && e.status === 'initializing'),
    );
    expect(claiming.map((e) => e.id)).toEqual(['vera-inst-06']);

    const reproducing = live.filter((z) =>
      [...state.values()].some((e) => e.parentId === z.id && e.badges.includes('reproducing')),
    );
    expect(reproducing.map((e) => e.id)).toEqual(['vera-inst-03', 'vera-inst-04', 'vera-inst-05']);
  });

  it('drains the intake queue by one each time Tess takes a report', () => {
    const counts: (number | null)[] = [];
    let state = new Map<string, Entity>();
    for (const beat of scenario03.beats) {
      state = applyOps(state, beat.ops);
      counts.push(state.get('vdp')?.count ?? null);
    }
    expect(counts.slice(0, 11)).toEqual([0, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0]);
  });

  it('gives each zone its own report, and never the same report twice', () => {
    let state = new Map<string, Entity>();
    for (const beat of scenario03.beats) {
      state = applyOps(state, beat.ops);
      const reports = orderedEntities(state)
        .filter((e) => e.type === 'vera')
        .map((e) => e.label);
      expect(new Set(reports).size, beat.note).toBe(reports.length);
      for (const label of reports) expect(label, beat.note).toMatch(/^Vera · VDP-9\d\d$/);
    }
  });

  it('tears zones down whole, leaving no orphan behind', () => {
    let state = new Map<string, Entity>();
    for (const beat of scenario03.beats) {
      state = applyOps(state, beat.ops);
      for (const entity of state.values()) {
        if (!entity.parentId) continue;
        expect(state.has(entity.parentId), `${entity.id} at ${beat.note}`).toBe(true);
      }
    }
  });

  it('pairs both halves at each other, and only ever two to a pair', () => {
    let state = new Map<string, Entity>();
    for (const beat of scenario03.beats) {
      state = applyOps(state, beat.ops);
      for (const entity of state.values()) {
        if (!entity.pairWith) continue;
        const other = state.get(entity.pairWith);
        expect(other, `${entity.id} at ${beat.note}`).toBeDefined();
        expect(other?.pairWith, `${entity.id} at ${beat.note}`).toBe(entity.id);
        expect(other?.parentId, `${entity.id} at ${beat.note}`).toBe(entity.parentId);
      }
    }
  });

  it('gives every entity a glyph and a meta line at every beat', () => {
    let state = new Map<string, Entity>();
    for (const beat of scenario03.beats) {
      state = applyOps(state, beat.ops);
      for (const entity of state.values()) {
        expect(entity.glyph, `${entity.id} at ${beat.note}`).toBeTruthy();
        expect(entity.meta, `${entity.id} at ${beat.note}`).not.toBe('');
      }
    }
  });

  it('ends with the two stuck zones still holding their slots, beside a fix host', () => {
    const entities = orderedEntities(endState());

    expect(countBy(entities, (e) => e.type)).toEqual({
      vdp: 1,
      linear: 1,
      'control-plane': 1,
      'model-gateway': 1,
      tess: 1,
      'isolated-instance': 4,
      'app-instance': 4,
      vera: 4,
      ec2: 1,
      'dev-host': 1,
      sandbox: 2,
      jim: 2,
    });
    expect(zones(endState()).map((e) => e.id)).toEqual([
      'vera-inst-02',
      'vera-inst-03',
      'vera-inst-06',
      'vera-inst-07',
    ]);
  });

  it('ends with two hands raised, one on a fault and one on a judgement call', () => {
    const entities = orderedEntities(endState());

    expect(countBy(entities, (e) => e.status as Status)).toEqual({
      error: 3,
      idle: 2,
      working: 18,
    });

    const hands = entities.filter((e) => e.hand);
    expect(hands.map((e) => e.id)).toEqual(['vera-02', 'vera-03']);
    expect(hands.map((e) => e.status)).toEqual(['idle', 'error']);
  });
});

describe('scenario-03 fixtures', () => {
  it('match a fresh generation byte for byte', () => {
    let state = new Map<string, Entity>();
    scenario03.beats.forEach((beat, index) => {
      state = applyOps(state, beat.ops);
      const elapsedMs = beat.at * 1000;
      const snapshot: Snapshot = {
        v: 1,
        seq: index,
        sentAt: new Date(BASE + elapsedMs).toISOString(),
        scenarioId: scenario03.id,
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
      id: scenario03.id,
      title: scenario03.title,
      beats: scenario03.beats.map((b) => ({ at: b.at, note: b.note })),
      count: scenario03.beats.length,
    };
    expect(read('manifest.json')).toBe(`${JSON.stringify(manifest, null, 2)}\n`);
  });
});
