import { z } from 'zod';
import { Entity } from './entity.js';

export const Snapshot = z.object({
  v: z.literal(1),
  seq: z.number().int().nonnegative(),
  /** Server clock, ISO 8601. Clients measure age from their own receipt, not from this. */
  sentAt: z.string(),
  scenarioId: z.string(),
  beat: z.number().int(),
  elapsedMs: z.number().int(),
  entities: z.array(Entity),
});
export type Snapshot = z.infer<typeof Snapshot>;

export const BeatMeta = z.object({ at: z.number(), note: z.string() });
export type BeatMeta = z.infer<typeof BeatMeta>;

export const ScenarioMeta = z.object({
  id: z.string(),
  title: z.string(),
  beats: z.array(BeatMeta),
});
export type ScenarioMeta = z.infer<typeof ScenarioMeta>;

export const Hello = z.object({
  type: z.literal('hello'),
  v: z.literal(1),
  tickMs: z.number().int(),
  scenarios: z.array(ScenarioMeta),
});
export type Hello = z.infer<typeof Hello>;

export const ServerMessage = z.discriminatedUnion('type', [
  Hello,
  z.object({ type: z.literal('snapshot'), snapshot: Snapshot }),
]);
export type ServerMessage = z.infer<typeof ServerMessage>;

export const ClientCommand = z.discriminatedUnion('cmd', [
  z.object({ cmd: z.literal('start'), scenarioId: z.string() }),
  z.object({ cmd: z.literal('pause') }),
  z.object({ cmd: z.literal('resume') }),
  z.object({ cmd: z.literal('reset') }),
  z.object({ cmd: z.literal('setSpeed'), speed: z.number() }),
  z.object({ cmd: z.literal('jumpToBeat'), beat: z.number().int() }),
  /** Stop emitting without closing the socket, so the freshness bands can be seen on demand. */
  z.object({ cmd: z.literal('setStalling'), stalling: z.boolean() }),
]);
export type ClientCommand = z.infer<typeof ClientCommand>;
