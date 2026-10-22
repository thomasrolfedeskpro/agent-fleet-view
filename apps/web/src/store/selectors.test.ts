import type { Snapshot } from '@fleet/schema';
import { describe, expect, it } from 'vitest';
import { counts, topLevel, visible } from './selectors.js';
import type { State } from './types.js';

const snapshot = (entities: Snapshot['entities']): Snapshot => ({
  v: 1,
  seq: 1,
  sentAt: '2026-01-01T00:00:00.000Z',
  scenarioId: 's',
  beat: 0,
  elapsedMs: 0,
  entities,
});

const entity = (id: string, parentId: string | null) => ({
  id,
  kind: 'runtime' as const,
  type: 'sandbox',
  parentId,
  label: id,
  badges: [],
  status: 'working' as const,
  hand: false,
  count: null,
  persistent: false,
  pairWith: null,
  links: [],
});

const state = (s: Snapshot | null): State => ({
  connection: 'open',
  snapshot: s,
  receivedAt: 0,
  hello: null,
  view: { mode: 'overview' },
  selectedId: null,
  speed: 1,
  running: false,
  stalling: false,
  source: 'live',
});

describe('selectors are referentially stable', () => {
  it('returns the same array for the same snapshot', () => {
    const s = state(snapshot([entity('a', null), entity('b', 'a')]));
    expect(topLevel(s)).toBe(topLevel(s));
    expect(visible(s)).toBe(visible(s));
    expect(counts(s)).toBe(counts(s));
  });

  it('returns a different array once the snapshot is replaced', () => {
    const first = state(snapshot([entity('a', null)]));
    const second = state(snapshot([entity('a', null)]));
    expect(topLevel(first)).not.toBe(topLevel(second));
  });

  it('is stable with no snapshot at all', () => {
    const s = state(null);
    expect(topLevel(s)).toBe(topLevel(s));
    expect(counts(s)).toBe(counts(s));
  });

  it('caches each container separately', () => {
    const s = state(snapshot([entity('a', null), entity('b', 'a'), entity('c', 'x')]));
    const inside = { ...s, view: { mode: 'inside', containerId: 'a' } as const };
    expect(visible(inside)).toBe(visible(inside));
    expect(visible(inside).map((e) => e.id)).toEqual(['b']);
  });
});
