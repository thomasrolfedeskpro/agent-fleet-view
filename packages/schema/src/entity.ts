import { z } from 'zod';

/**
 * The closed set the renderer understands. Producers choose one; they never add to it.
 * `infrastructure` is anything provisioned directly in a cloud account, `runtime` is a
 * thing running inside one, `agent` is a persona at work, `source` is somewhere work
 * arrives from.
 */
export const KINDS = ['infrastructure', 'runtime', 'agent', 'source'] as const;
export type Kind = (typeof KINDS)[number];

export const STATUSES = ['initializing', 'working', 'idle', 'error'] as const;
export type Status = (typeof STATUSES)[number];

export const Link = z.object({
  label: z.string(),
  href: z.string(),
});
export type Link = z.infer<typeof Link>;

export const Entity = z.object({
  id: z.string(),
  kind: z.enum(KINDS),
  /** Producer-chosen sub-type: drives glyph and wording, never layout or logic. */
  type: z.string(),
  parentId: z.string().nullable(),
  label: z.string(),
  badges: z.array(z.string()).default([]),
  status: z.enum(STATUSES),
  /** True when this thing wants a person, whatever the reason. */
  hand: z.boolean().default(false),
  /** A queue's depth. Null when the idea does not apply. */
  count: z.number().int().nonnegative().nullable().default(null),
  /** Stays on the floor with nothing happening in it. */
  persistent: z.boolean().default(false),
  /** The other half of a pair, stated by the producer rather than inferred. */
  pairWith: z.string().nullable().default(null),
  links: z.array(Link).default([]),
});
export type Entity = z.infer<typeof Entity>;
