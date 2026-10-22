import type { Entity } from '@fleet/schema';

export type Placed = { id: string; x: number; y: number; w: number; h: number };

export type Tether = { from: string; to: string };

export type FloorLayout = {
  cells: Placed[];
  tethers: Tether[];
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

export const EMPTY_LAYOUT: FloorLayout = Object.freeze({
  cells: [],
  tethers: [],
  slots: {},
  width: 0,
  height: 0,
});

function isSlot(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value >= 0;
}

/** First declaration of an id wins, so a repeated id can never produce two cells. */
function uniqueById(entities: Entity[]): Entity[] {
  const seen = new Set<string>();
  const out: Entity[] = [];
  for (const entity of entities) {
    if (seen.has(entity.id)) continue;
    seen.add(entity.id);
    out.push(entity);
  }
  return out;
}

/**
 * Assign each group of ids one slot, keeping any slot a previous layout already gave a member
 * of that group. A slot freed by something that has gone stays empty; a newcomer takes the
 * lowest index nobody holds. A prev slot that is already claimed, or is not a slot index, is
 * ignored rather than allowed to put two things in one place.
 */
function assignSlots(
  groups: string[][],
  prev: Record<string, number> | undefined,
): Record<string, number> {
  const slots: Record<string, number> = {};
  const taken = new Set<number>();
  const newcomers: string[][] = [];

  const claim = (group: string[], slot: number): void => {
    for (const id of group) slots[id] = slot;
    taken.add(slot);
  };

  for (const group of groups) {
    const kept = group
      .map((id) => prev?.[id])
      .filter(isSlot)
      .filter((slot) => !taken.has(slot));
    if (kept.length === 0) {
      newcomers.push(group);
      continue;
    }
    claim(group, Math.min(...kept));
  }

  let next = 0;
  for (const group of newcomers) {
    while (taken.has(next)) next += 1;
    claim(group, next);
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
  const tops = uniqueById(entities.filter((e) => e.parentId === null));
  const slots = assignSlots(
    tops.map((e) => [e.id]),
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

/**
 * The partner declared by `pairWith`, when the data backs it up: a different entity, inside the
 * same container, that does not declare a third entity as its own partner.
 */
function partnerOf(entity: Entity, siblings: Map<string, Entity>): Entity | undefined {
  if (entity.pairWith === null || entity.pairWith === entity.id) return undefined;
  const partner = siblings.get(entity.pairWith);
  if (!partner) return undefined;
  if (partner.pairWith !== null && partner.pairWith !== entity.id) return undefined;
  return partner;
}

type Row = { lead: string; partner: string | null };

const idsOf = (row: Row): string[] => (row.partner === null ? [row.lead] : [row.lead, row.partner]);

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
  const children = uniqueById(entities.filter((e) => e.parentId === containerId));
  const byId = new Map(children.map((e) => [e.id, e]));

  const rows: Row[] = [];
  const placed = new Set<string>();
  for (const child of children) {
    if (placed.has(child.id)) continue;
    const partner = partnerOf(child, byId);
    const row: Row = {
      lead: child.id,
      partner: partner && !placed.has(partner.id) ? partner.id : null,
    };
    for (const id of idsOf(row)) placed.add(id);
    rows.push(row);
  }

  const slots = assignSlots(rows.map(idsOf), prev?.slots);

  const cells: Placed[] = [];
  const tethers: Tether[] = [];
  for (const row of rows) {
    const y = PAD + (slots[row.lead] ?? 0) * (ITEM_H + ROW_GAP);
    idsOf(row).forEach((id, column) => {
      cells.push({ id, x: PAD + column * (ITEM_W + PAIR_GAP), y, w: ITEM_W, h: ITEM_H });
    });
    if (row.partner !== null) tethers.push({ from: row.lead, to: row.partner });
  }

  return { cells, tethers, slots, ...extent(cells) };
}
