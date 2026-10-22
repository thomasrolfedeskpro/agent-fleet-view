import type { Entity } from '@fleet/schema';
import type { State } from './types.js';

export const entities = (s: State): Entity[] => s.snapshot?.entities ?? [];

export const byId = (s: State, id: string | null): Entity | undefined =>
  id ? entities(s).find((e) => e.id === id) : undefined;

export const topLevel = (s: State): Entity[] => entities(s).filter((e) => e.parentId === null);

export const childrenOf = (s: State, parentId: string): Entity[] =>
  entities(s).filter((e) => e.parentId === parentId);

/** A container's contents mark: does anything inside it want a person? */
export const handInside = (s: State, parentId: string): boolean =>
  childrenOf(s, parentId).some((e) => e.hand);

export const counts = (s: State) => {
  const list = entities(s);
  return {
    working: list.filter((e) => e.status === 'working').length,
    idle: list.filter((e) => e.status === 'idle').length,
    initializing: list.filter((e) => e.status === 'initializing').length,
    error: list.filter((e) => e.status === 'error').length,
    hands: list.filter((e) => e.hand).length,
  };
};

/** Entities the floor draws right now, given the current view. */
export const visible = (s: State): Entity[] =>
  s.view.mode === 'overview' ? topLevel(s) : childrenOf(s, s.view.containerId);
