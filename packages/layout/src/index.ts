import type { Entity } from '@fleet/schema';

export type Placed = { id: string; x: number; y: number; w: number; h: number };

export type FloorLayout = {
  cells: Placed[];
  tethers: Array<{ from: string; to: string }>;
  /** Slot index per id. Carried forward so a surviving thing never moves. */
  slots: Record<string, number>;
  width: number;
  height: number;
};

export const CELL_W = 300;
export const CELL_H = 132;
export const CELL_GAP = 24;
export const OVERVIEW_COLUMNS = 2;

export const ITEM_W = 208;
export const ITEM_H = 88;
export const PAIR_GAP = 16;
export const ROW_GAP = 16;
export const PAD = 20;

export const EMPTY_LAYOUT: FloorLayout = {
  cells: [],
  tethers: [],
  slots: {},
  width: 0,
  height: 0,
};

/**
 * Assign each id a slot, keeping any slot a previous layout already gave it. A slot freed by
 * something that has gone stays empty; a newcomer takes the lowest index nobody holds.
 */
function assignSlots(
  ids: string[],
  prev: Record<string, number> | undefined,
): Record<string, number> {
  const slots: Record<string, number> = {};
  const taken = new Set<number>();

  for (const id of ids) {
    const kept = prev?.[id];
    if (kept !== undefined) {
      slots[id] = kept;
      taken.add(kept);
    }
  }
  let next = 0;
  for (const id of ids) {
    if (slots[id] !== undefined) continue;
    while (taken.has(next)) next += 1;
    slots[id] = next;
    taken.add(next);
  }
  return slots;
}

function extent(cells: Placed[]): { width: number; height: number } {
  if (cells.length === 0) return { width: 0, height: 0 };
  const width = Math.max(...cells.map((c) => c.x + c.w)) + PAD;
  const height = Math.max(...cells.map((c) => c.y + c.h)) + PAD;
  return { width, height };
}

/** Top-level infrastructure and sources, in a grid, in declaration order. */
export function layoutOverview(entities: Entity[], prev?: FloorLayout): FloorLayout {
  const tops = entities.filter((e) => e.parentId === null);
  const slots = assignSlots(
    tops.map((e) => e.id),
    prev?.slots,
  );

  const cells: Placed[] = tops.map((e) => {
    const slot = slots[e.id] ?? 0;
    const column = slot % OVERVIEW_COLUMNS;
    const row = Math.floor(slot / OVERVIEW_COLUMNS);
    return {
      id: e.id,
      x: PAD + column * (CELL_W + CELL_GAP),
      y: PAD + row * (CELL_H + CELL_GAP),
      w: CELL_W,
      h: CELL_H,
    };
  });

  return { cells, tethers: [], slots, ...extent(cells) };
}

type Row = { ids: string[]; anchor: string };

/**
 * The contents of one piece of infrastructure, flattened to a single level. A pair sits on one
 * row with its partner beside it; everything else takes a row of its own. Rows stack in spawn
 * order and a row freed by a teardown stays empty.
 */
export function layoutContainer(
  containerId: string,
  entities: Entity[],
  prev?: FloorLayout,
): FloorLayout {
  const children = entities.filter((e) => e.parentId === containerId);
  const byId = new Map(children.map((e) => [e.id, e]));

  const rows: Row[] = [];
  const placed = new Set<string>();
  for (const child of children) {
    if (placed.has(child.id)) continue;
    const partner = child.pairWith ? byId.get(child.pairWith) : undefined;
    if (partner && !placed.has(partner.id)) {
      rows.push({ ids: [child.id, partner.id], anchor: child.id });
      placed.add(child.id);
      placed.add(partner.id);
    } else {
      rows.push({ ids: [child.id], anchor: child.id });
      placed.add(child.id);
    }
  }

  const slots = assignSlots(
    rows.map((r) => r.anchor),
    prev?.slots,
  );

  const cells: Placed[] = [];
  const tethers: Array<{ from: string; to: string }> = [];
  for (const row of rows) {
    const slot = slots[row.anchor] ?? 0;
    const y = PAD + slot * (ITEM_H + ROW_GAP);
    row.ids.forEach((id, column) => {
      cells.push({ id, x: PAD + column * (ITEM_W + PAIR_GAP), y, w: ITEM_W, h: ITEM_H });
    });
    const [from, to] = row.ids;
    if (from && to) tethers.push({ from, to });
  }

  return { cells, tethers, slots, ...extent(cells) };
}
