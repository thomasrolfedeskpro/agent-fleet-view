import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Snapshot } from '@fleet/schema';
import { scenario01 } from '@fleet/schema';
import { describe, expect, it } from 'vitest';
import { createSimulator } from './index.js';

const FIXTURES = join(import.meta.dirname, '..', '..', '..', 'fixtures', scenario01.id);

function goldenSnapshot(beat: number): Snapshot {
  const name = `beat-${String(beat).padStart(2, '0')}.json`;
  return JSON.parse(readFileSync(join(FIXTURES, name), 'utf8')) as Snapshot;
}

function comparable(snapshot: Snapshot): Omit<Snapshot, 'seq' | 'sentAt'> {
  const { seq: _seq, sentAt: _sentAt, ...rest } = snapshot;
  return rest;
}

const beatIndexes = scenario01.beats.map((_, index) => index);

describe('createSimulator', () => {
  it('starts on beat 0 with the scenario already seeded', () => {
    const sim = createSimulator(scenario01);
    expect(sim.beat).toBe(0);
    expect(sim.elapsedMs).toBe(0);
    expect(sim.finished).toBe(false);
    expect(comparable(sim.snapshot(0))).toEqual(comparable(goldenSnapshot(0)));
  });

  it.each(beatIndexes)('advancing to beat %i reproduces its golden fixture', (index) => {
    const sim = createSimulator(scenario01);
    sim.advance(scenario01.beats[index]!.at * 1000);
    expect(sim.beat).toBe(index);
    expect(comparable(sim.snapshot(index))).toEqual(comparable(goldenSnapshot(index)));
  });

  it.each(beatIndexes)('jumpToBeat(%i) matches advancing to it', (index) => {
    const advanced = createSimulator(scenario01);
    advanced.advance(scenario01.beats[index]!.at * 1000);

    const jumped = createSimulator(scenario01);
    jumped.jumpToBeat(index);

    expect(jumped.beat).toBe(advanced.beat);
    expect(jumped.elapsedMs).toBe(advanced.elapsedMs);
    expect(comparable(jumped.snapshot(0))).toEqual(comparable(advanced.snapshot(0)));
  });

  it('jumps backwards as cleanly as forwards', () => {
    const sim = createSimulator(scenario01);
    sim.jumpToBeat(20);
    sim.jumpToBeat(8);

    const fresh = createSimulator(scenario01);
    fresh.jumpToBeat(8);

    expect(comparable(sim.snapshot(0))).toEqual(comparable(fresh.snapshot(0)));
  });

  it('refuses a beat index outside the scenario', () => {
    const sim = createSimulator(scenario01);
    expect(() => sim.jumpToBeat(-1)).toThrow();
    expect(() => sim.jumpToBeat(scenario01.beats.length)).toThrow();
    expect(() => sim.jumpToBeat(1.5)).toThrow();
  });

  it('holds a beat until its time has passed', () => {
    const sim = createSimulator(scenario01);
    sim.advance(4999);
    expect(sim.beat).toBe(0);
    sim.advance(1);
    expect(sim.beat).toBe(1);
  });

  it('gives the same state for many small steps as for one large one', () => {
    const stepped = createSimulator(scenario01);
    for (let i = 0; i < 1600; i++) stepped.advance(100);

    const leapt = createSimulator(scenario01);
    leapt.advance(160_000);

    expect(stepped.beat).toBe(leapt.beat);
    expect(stepped.elapsedMs).toBe(leapt.elapsedMs);
    expect(comparable(stepped.snapshot(0))).toEqual(comparable(leapt.snapshot(0)));
  });

  it('ignores uneven step sizes', () => {
    const stepped = createSimulator(scenario01);
    for (const dt of [1, 7, 333, 10_000, 40_000, 109_659]) stepped.advance(dt);

    const leapt = createSimulator(scenario01);
    leapt.advance(160_000);

    expect(comparable(stepped.snapshot(0))).toEqual(comparable(leapt.snapshot(0)));
  });

  it('treats advancing past the end as a no-op and reports finished', () => {
    const sim = createSimulator(scenario01);
    sim.advance(160_000);
    expect(sim.finished).toBe(true);

    const atEnd = comparable(sim.snapshot(0));
    sim.advance(999_999);

    expect(sim.finished).toBe(true);
    expect(sim.beat).toBe(20);
    expect(sim.elapsedMs).toBe(160_000);
    expect(comparable(sim.snapshot(0))).toEqual(atEnd);
  });

  it('refuses to run time backwards', () => {
    const sim = createSimulator(scenario01);
    expect(() => sim.advance(-1)).toThrow();
    expect(() => sim.advance(Number.NaN)).toThrow();
  });

  it('returns to beat 0 on reset', () => {
    const sim = createSimulator(scenario01);
    sim.advance(160_000);
    sim.reset();

    expect(sim.beat).toBe(0);
    expect(sim.elapsedMs).toBe(0);
    expect(sim.finished).toBe(false);
    expect(comparable(sim.snapshot(0))).toEqual(comparable(goldenSnapshot(0)));
  });

  it('keeps entities in declaration order so layout slots stay put', () => {
    const sim = createSimulator(scenario01);
    sim.jumpToBeat(18);
    expect(sim.snapshot(0).entities.map((e) => e.id)).toEqual([
      'cp',
      'vdp',
      'linear',
      'tess',
      'ec2-1',
      'dev-host-1',
      'sandbox-1',
      'jim-1',
      'sandbox-2',
      'jim-2',
    ]);
  });

  it('carries the caller seq and date onto the wire', () => {
    const sim = createSimulator(scenario01);
    const snapshot = sim.snapshot(42, new Date('2026-01-01T00:00:00.000Z'));
    expect(snapshot.seq).toBe(42);
    expect(snapshot.sentAt).toBe('2026-01-01T00:00:00.000Z');
    expect(snapshot.v).toBe(1);
    expect(snapshot.scenarioId).toBe(scenario01.id);
  });

  it('hands out a fresh entity array each snapshot', () => {
    const sim = createSimulator(scenario01);
    const first = sim.snapshot(0).entities;
    first.length = 0;
    expect(sim.snapshot(1).entities).toHaveLength(3);
  });

  it('runs a scenario whose first beat is after zero', () => {
    const sim = createSimulator({
      id: 'late',
      title: 'Starts late',
      beats: [{ at: 5, note: 'first', ops: [] }],
    });
    expect(sim.beat).toBe(-1);
    expect(sim.finished).toBe(false);
    sim.advance(5000);
    expect(sim.beat).toBe(0);
    expect(sim.finished).toBe(true);
  });
});
