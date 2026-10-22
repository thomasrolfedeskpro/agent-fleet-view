import { z } from 'zod';
import { Entity } from './entity.js';

export const Op = z.discriminatedUnion('op', [
  z.object({ op: z.literal('add'), entity: Entity }),
  z.object({ op: z.literal('patch'), id: z.string(), set: Entity.partial() }),
  z.object({ op: z.literal('remove'), id: z.string() }),
]);
export type Op = z.infer<typeof Op>;

export const Beat = z.object({
  /** Scenario seconds from the start. */
  at: z.number().int().nonnegative(),
  note: z.string(),
  ops: z.array(Op),
});
export type Beat = z.infer<typeof Beat>;

export const Scenario = z.object({
  id: z.string(),
  title: z.string(),
  beats: z.array(Beat),
});
export type Scenario = z.infer<typeof Scenario>;

/**
 * Apply one beat's ops to a map of entities, in order. This is the reference semantics:
 * the simulator must agree with it, and the golden fixtures are generated from it.
 */
export function applyOps(state: Map<string, Entity>, ops: Op[]): Map<string, Entity> {
  const next = new Map(state);
  for (const op of ops) {
    if (op.op === 'add') next.set(op.entity.id, op.entity);
    else if (op.op === 'remove') next.delete(op.id);
    else {
      const current = next.get(op.id);
      if (!current) throw new Error(`patch for unknown entity: ${op.id}`);
      next.set(op.id, { ...current, ...op.set });
    }
  }
  return next;
}

/** Entities in a stable order: declaration order, which is also spawn order. */
export function orderedEntities(state: Map<string, Entity>): Entity[] {
  return [...state.values()];
}
