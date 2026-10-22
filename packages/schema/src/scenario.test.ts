import { describe, expect, it } from 'vitest';
import { Entity } from './entity.js';
import { applyOps } from './scenario.js';
import { scenario01 } from './scenarios/scenario-01.js';
import { Snapshot } from './wire.js';

const base = Entity.parse({
  id: 'a',
  kind: 'runtime',
  glyph: 'box',
  meta: '',
  type: 'sandbox',
  parentId: null,
  label: 'a',
  status: 'idle',
});

describe('applyOps', () => {
  it('adds, patches and removes in order', () => {
    let state = applyOps(new Map(), [{ op: 'add', entity: base }]);
    expect(state.get('a')?.status).toBe('idle');

    state = applyOps(state, [{ op: 'patch', id: 'a', set: { status: 'working' } }]);
    expect(state.get('a')?.status).toBe('working');

    state = applyOps(state, [{ op: 'remove', id: 'a' }]);
    expect(state.has('a')).toBe(false);
  });

  it('refuses a patch for an entity that is not there', () => {
    expect(() => applyOps(new Map(), [{ op: 'patch', id: 'ghost', set: {} }])).toThrow();
  });

  it('leaves the previous state untouched', () => {
    const before = applyOps(new Map(), [{ op: 'add', entity: base }]);
    applyOps(before, [{ op: 'remove', id: 'a' }]);
    expect(before.has('a')).toBe(true);
  });
});

describe('scenario-01', () => {
  it('has 21 beats in ascending time', () => {
    expect(scenario01.beats).toHaveLength(21);
    const times = scenario01.beats.map((b) => b.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('replays into snapshots that satisfy the wire schema', () => {
    let state = new Map();
    scenario01.beats.forEach((beat, index) => {
      state = applyOps(state, beat.ops);
      const parsed = Snapshot.safeParse({
        v: 1,
        seq: index,
        sentAt: new Date().toISOString(),
        scenarioId: scenario01.id,
        beat: index,
        elapsedMs: beat.at * 1000,
        entities: [...state.values()],
      });
      expect(parsed.success, `beat ${index}`).toBe(true);
    });
  });

  it('ends with the second pair gone and the first still present', () => {
    let state = new Map();
    for (const beat of scenario01.beats) state = applyOps(state, beat.ops);
    expect(state.has('jim-2')).toBe(false);
    expect(state.has('sandbox-2')).toBe(false);
    expect(state.get('jim-1')?.status).toBe('error');
    expect(state.get('jim-1')?.hand).toBe(true);
  });
});
