import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Snapshot } from '@fleet/schema';
import { TICK_MS } from '@fleet/schema';
import { describe, expect, it } from 'vitest';
import { createFixtureSource } from './fixtureSource.js';

const FIXTURES_DIR = join(import.meta.dirname, '..', '..', '..', 'fixtures');

function golden(beat: number): Snapshot {
  const name = `beat-${String(beat).padStart(2, '0')}.json`;
  return JSON.parse(readFileSync(join(FIXTURES_DIR, 'scenario-01', name), 'utf8'));
}

function withoutMessageFields(snapshot: Snapshot): Omit<Snapshot, 'seq' | 'sentAt'> {
  const { seq: _seq, sentAt: _sentAt, ...rest } = snapshot;
  return rest;
}

function beatsOver(source: ReturnType<typeof createFixtureSource>, ticks: number): number[] {
  return Array.from({ length: ticks }, () => source.next(TICK_MS).beat);
}

describe('fixture snapshot source', () => {
  it('lists the scenarios on disk with their beat metadata', () => {
    const scenarios = createFixtureSource().listScenarios();

    expect(scenarios.map((s) => s.id)).toEqual(['scenario-01']);
    expect(scenarios[0]?.title).toBe('A VDP report through Tess, Vera and Jim');
    expect(scenarios[0]?.beats).toHaveLength(21);
    expect(scenarios[0]?.beats[0]).toEqual({ at: 0, note: 'Quiet floor' });
  });

  it('produces the golden snapshot for the beat the scenario clock is on', () => {
    const source = createFixtureSource();

    expect(withoutMessageFields(source.next(TICK_MS))).toEqual(withoutMessageFields(golden(0)));
  });

  it('advances scenario time by dtMs and changes beat on the beat boundary', () => {
    const source = createFixtureSource();

    expect(beatsOver(source, 7)).toEqual([0, 0, 0, 0, 0, 1, 1]);
  });

  it('numbers its own snapshots in order', () => {
    const source = createFixtureSource();

    const seqs = Array.from({ length: 4 }, () => source.next(TICK_MS).seq);

    expect(seqs).toEqual([0, 1, 2, 3]);
  });

  it('stamps sentAt with the wall clock rather than the fixture date', () => {
    const before = Date.now();

    const sentAt = Date.parse(createFixtureSource().next(TICK_MS).sentAt);

    expect(sentAt).toBeGreaterThanOrEqual(before);
  });

  it('makes a jumped-to beat the next one produced', () => {
    const source = createFixtureSource();
    source.next(TICK_MS);

    source.jumpToBeat(12);

    expect(withoutMessageFields(source.next(TICK_MS))).toEqual(withoutMessageFields(golden(12)));
  });

  it('clamps a jump outside the scenario', () => {
    const source = createFixtureSource();

    source.jumpToBeat(-5);
    expect(source.next(TICK_MS).beat).toBe(0);

    source.jumpToBeat(999);
    expect(source.next(TICK_MS).beat).toBe(20);
  });

  it('rewinds to the first beat on reset', () => {
    const source = createFixtureSource();
    source.jumpToBeat(18);
    source.next(TICK_MS);

    source.reset();

    expect(source.next(TICK_MS).beat).toBe(0);
  });

  it('holds on the last beat once the scenario runs out', () => {
    const source = createFixtureSource();
    source.jumpToBeat(20);

    const held = Array.from({ length: 5 }, () => source.next(TICK_MS));

    expect(held.map((s) => s.beat)).toEqual([20, 20, 20, 20, 20]);
    expect(held.map((s) => s.elapsedMs)).toEqual([160_000, 160_000, 160_000, 160_000, 160_000]);
  });

  it('restarts the clock when a scenario starts', () => {
    const source = createFixtureSource();
    source.jumpToBeat(10);
    source.next(TICK_MS);

    source.start('scenario-01');

    expect(source.next(TICK_MS).elapsedMs).toBe(0);
  });

  it('rejects an unknown scenario', () => {
    expect(() => createFixtureSource().start('nope')).toThrow(/unknown scenario/);
  });
});
