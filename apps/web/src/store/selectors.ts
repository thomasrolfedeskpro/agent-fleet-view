import type { Entity, Snapshot } from '@fleet/schema';
import type { State } from './types.js';

export type Counts = {
  working: number;
  idle: number;
  initializing: number;
  error: number;
  hands: number;
};

const NO_ENTITIES: Entity[] = [];

/**
 * Derived arrays are cached against the snapshot that produced them. Without this, every call
 * returns a fresh array, and a selector handed to useSyncExternalStore then reports a change on
 * every render — React's "getSnapshot should be cached" infinite loop. A snapshot is replaced
 * wholesale on each tick, so its identity is a sound cache key.
 */
const derived = new WeakMap<Snapshot, Map<string, unknown>>();

function cached<T>(snapshot: Snapshot | null, key: string, make: () => T, empty: T): T {
  if (!snapshot) return empty;
  let perSnapshot = derived.get(snapshot);
  if (!perSnapshot) {
    perSnapshot = new Map();
    derived.set(snapshot, perSnapshot);
  }
  if (!perSnapshot.has(key)) perSnapshot.set(key, make());
  return perSnapshot.get(key) as T;
}

export const entities = (s: State): Entity[] => s.snapshot?.entities ?? NO_ENTITIES;

export const byId = (s: State, id: string | null): Entity | undefined =>
  id ? entities(s).find((e) => e.id === id) : undefined;

export const topLevel = (s: State): Entity[] =>
  cached(s.snapshot, 'top', () => entities(s).filter((e) => e.parentId === null), NO_ENTITIES);

export const childrenOf = (s: State, parentId: string): Entity[] =>
  cached(
    s.snapshot,
    `children:${parentId}`,
    () => entities(s).filter((e) => e.parentId === parentId),
    NO_ENTITIES,
  );

/** A container's contents mark: does anything inside it want a person? */
export const handInside = (s: State, parentId: string): boolean =>
  childrenOf(s, parentId).some((e) => e.hand);

const NO_COUNTS: Counts = { working: 0, idle: 0, initializing: 0, error: 0, hands: 0 };

export const counts = (s: State): Counts =>
  cached(
    s.snapshot,
    'counts',
    () => {
      const list = entities(s);
      return {
        working: list.filter((e) => e.status === 'working').length,
        idle: list.filter((e) => e.status === 'idle').length,
        initializing: list.filter((e) => e.status === 'initializing').length,
        error: list.filter((e) => e.status === 'error').length,
        hands: list.filter((e) => e.hand).length,
      };
    },
    NO_COUNTS,
  );

/** Entities the floor draws right now, given the current view. */
export const visible = (s: State): Entity[] =>
  s.view.mode === 'overview' ? topLevel(s) : childrenOf(s, s.view.containerId);
