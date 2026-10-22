import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TICK_MS } from '@fleet/schema';
import { describe, expect, it } from 'vitest';
import { createSimulatorSource } from './simulatorSource.js';

const fixture = (beat: number) =>
  JSON.parse(
    readFileSync(
      join(
        import.meta.dirname,
        '../../../fixtures/scenario-01/beat-' + String(beat).padStart(2, '0') + '.json',
      ),
      'utf8',
    ),
  );

const withoutStamps = (snapshot: { seq: number; sentAt: string }) => {
  const { seq: _seq, sentAt: _sentAt, ...rest } = snapshot;
  return rest;
};

describe('the simulator source', () => {
  it('offers scenario-01', () => {
    const source = createSimulatorSource();
    expect(source.listScenarios().map((s) => s.id)).toContain('scenario-01');
  });

  it('reports the current state before advancing, so a jump lands on the next message', () => {
    const source = createSimulatorSource();
    source.start('scenario-01');
    source.jumpToBeat(16);
    expect(withoutStamps(source.next(TICK_MS))).toEqual(withoutStamps(fixture(16)));
  });

  it('walks the scenario in step with the golden fixtures', () => {
    const source = createSimulatorSource();
    source.start('scenario-01');
    const seen = new Map<number, unknown>();
    for (let elapsed = 0; elapsed <= 160_000; elapsed += TICK_MS) {
      const snapshot = source.next(TICK_MS);
      // The clock keeps moving within a beat, so only the first tick of each beat sits on the
      // fixture's exact elapsedMs.
      if (!seen.has(snapshot.beat)) seen.set(snapshot.beat, withoutStamps(snapshot));
    }
    for (let beat = 0; beat <= 20; beat += 1) {
      expect(seen.get(beat), `beat ${beat}`).toEqual(withoutStamps(fixture(beat)));
    }
  });

  it('rewinds on reset', () => {
    const source = createSimulatorSource();
    source.start('scenario-01');
    source.jumpToBeat(12);
    source.reset();
    expect(source.next(0).beat).toBe(0);
  });
});
