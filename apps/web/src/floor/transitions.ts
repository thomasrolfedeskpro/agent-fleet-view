import { type Status, TRANSITION_MS } from '@fleet/schema';
import { STATUS_COLOR } from '../theme/tokens.js';
import { easeInOut, mixHex } from './colors.js';
import type { CellModel } from './scene.js';

export type Fade = { from: Status; to: Status; startedAt: number };
export type Fades = ReadonlyMap<string, Fade>;
export type Statuses = ReadonlyMap<string, Status>;

export type Advanced = { fades: Fades; statuses: Statuses };

export const NO_FADES: Advanced = { fades: new Map(), statuses: new Map() };

/**
 * Start a fade for every cell whose status changed, drop the ones that have finished, and
 * forget anything no longer on the floor.
 */
export function advance(previous: Advanced, cells: CellModel[], now: number): Advanced {
  const fades = new Map<string, Fade>();
  const statuses = new Map<string, Status>();

  for (const cell of cells) {
    const was = previous.statuses.get(cell.id);
    statuses.set(cell.id, cell.status);

    if (was !== undefined && was !== cell.status) {
      const running = previous.fades.get(cell.id);
      const from = running ? colorSource(running, now) : was;
      fades.set(cell.id, { from, to: cell.status, startedAt: now });
      continue;
    }
    const running = previous.fades.get(cell.id);
    if (running && now - running.startedAt < TRANSITION_MS) fades.set(cell.id, running);
  }

  return { fades, statuses };
}

/** A fade interrupted past its midpoint has already read as the new colour. */
function colorSource(fade: Fade, now: number): Status {
  return now - fade.startedAt < TRANSITION_MS / 2 ? fade.from : fade.to;
}

export function statusColorAt(fades: Fades, id: string, status: Status, now: number): string {
  const fade = fades.get(id);
  if (!fade) return STATUS_COLOR[status];
  const t = (now - fade.startedAt) / TRANSITION_MS;
  if (t >= 1) return STATUS_COLOR[fade.to];
  return mixHex(STATUS_COLOR[fade.from], STATUS_COLOR[fade.to], easeInOut(t));
}

export function isAnimating(fades: Fades, now: number): boolean {
  for (const fade of fades.values()) {
    if (now - fade.startedAt < TRANSITION_MS) return true;
  }
  return false;
}
