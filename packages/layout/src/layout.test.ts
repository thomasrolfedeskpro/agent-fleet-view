import { Entity } from '@fleet/schema';
import { describe, expect, it } from 'vitest';
import type { FloorLayout, Placed } from './index.js';
import {
  CELL_GAP,
  CELL_H,
  CELL_W,
  EMPTY_LAYOUT,
  ITEM_H,
  ITEM_W,
  layoutContainer,
  layoutOverview,
  PAD,
  PAIR_GAP,
  ROW_GAP,
} from './index.js';

function entity(part: Partial<Entity> & { id: string }): Entity {
  return Entity.parse({
    kind: 'runtime',
    type: 'sandbox',
    parentId: null,
    label: part.id,
    status: 'idle',
    ...part,
  });
}

function top(id: string): Entity {
  return entity({ id, kind: 'infrastructure', parentId: null });
}

function child(id: string, parentId: string, pairWith: string | null = null): Entity {
  return entity({ id, parentId, pairWith });
}

function cell(layout: FloorLayout, id: string): Placed {
  const found = layout.cells.find((c) => c.id === id);
  if (!found) throw new Error(`no cell for ${id}`);
  return found;
}

const gridX = (column: number): number => PAD + column * (CELL_W + CELL_GAP);
const gridY = (row: number): number => PAD + row * (CELL_H + CELL_GAP);
const rowY = (slot: number): number => PAD + slot * (ITEM_H + ROW_GAP);

function deepFreeze(entities: Entity[]): Entity[] {
  for (const e of entities) Object.freeze(e);
  return Object.freeze(entities) as Entity[];
}

describe('layoutOverview', () => {
  it('places top-level entities across two columns in declaration order', () => {
    const layout = layoutOverview([top('a'), top('b'), top('c')]);

    expect(cell(layout, 'a')).toEqual({ id: 'a', x: gridX(0), y: gridY(0), w: CELL_W, h: CELL_H });
    expect(cell(layout, 'b')).toEqual({ id: 'b', x: gridX(1), y: gridY(0), w: CELL_W, h: CELL_H });
    expect(cell(layout, 'c')).toEqual({ id: 'c', x: gridX(0), y: gridY(1), w: CELL_W, h: CELL_H });
  });

  it('ignores anything that sits inside a container', () => {
    const layout = layoutOverview([top('a'), child('inside', 'a')]);

    expect(layout.cells.map((c) => c.id)).toEqual(['a']);
  });

  it('gives an empty floor no size', () => {
    expect(layoutOverview([])).toEqual(EMPTY_LAYOUT);
  });

  it('sizes the floor around its cells', () => {
    const layout = layoutOverview([top('a'), top('b'), top('c')]);

    expect(layout.width).toBe(gridX(1) + CELL_W + PAD);
    expect(layout.height).toBe(gridY(1) + CELL_H + PAD);
  });

  it('keeps the slot of a survivor when an earlier sibling goes', () => {
    const before = layoutOverview([top('a'), top('b'), top('c')]);
    const after = layoutOverview([top('b'), top('c')], before);

    expect(cell(after, 'b')).toEqual(cell(before, 'b'));
    expect(cell(after, 'c')).toEqual(cell(before, 'c'));
  });

  it('leaves a freed slot empty until a newcomer takes it', () => {
    const before = layoutOverview([top('a'), top('b'), top('c')]);
    const freed = layoutOverview([top('a'), top('c')], before);
    expect(freed.cells.some((c) => c.x === gridX(1) && c.y === gridY(0))).toBe(false);

    const refilled = layoutOverview([top('a'), top('c'), top('d')], freed);
    expect(cell(refilled, 'd')).toEqual({ ...cell(before, 'b'), id: 'd' });
    expect(cell(refilled, 'c')).toEqual(cell(before, 'c'));
  });

  it('refuses a prev slot that another id already claimed', () => {
    const prev = { ...EMPTY_LAYOUT, slots: { a: 1, b: 1 } };
    const layout = layoutOverview([top('a'), top('b')], prev);

    expect(layout.slots).toEqual({ a: 1, b: 0 });
  });

  it('refuses a prev slot that is not a slot index', () => {
    const prev = { ...EMPTY_LAYOUT, slots: { a: -3, b: 1.5, c: Number.NaN } };
    const layout = layoutOverview([top('a'), top('b'), top('c')], prev);

    expect(layout.slots).toEqual({ a: 0, b: 1, c: 2 });
  });

  it('draws a repeated id once', () => {
    const layout = layoutOverview([top('a'), top('a')]);

    expect(layout.cells).toHaveLength(1);
  });
});

describe('layoutContainer', () => {
  it('puts a pair on one row, adjacent in x', () => {
    const layout = layoutContainer('host', [
      child('sandbox', 'host', 'agent'),
      child('agent', 'host', 'sandbox'),
    ]);

    expect(cell(layout, 'sandbox')).toEqual({
      id: 'sandbox',
      x: PAD,
      y: rowY(0),
      w: ITEM_W,
      h: ITEM_H,
    });
    expect(cell(layout, 'agent')).toEqual({
      id: 'agent',
      x: PAD + ITEM_W + PAIR_GAP,
      y: rowY(0),
      w: ITEM_W,
      h: ITEM_H,
    });
  });

  it('gives an unpaired entity a row of its own, stacked in spawn order', () => {
    const layout = layoutContainer('host', [
      child('dev-host', 'host'),
      child('sandbox', 'host', 'agent'),
      child('agent', 'host', 'sandbox'),
      child('other', 'host'),
    ]);

    expect(cell(layout, 'dev-host').y).toBe(rowY(0));
    expect(cell(layout, 'sandbox').y).toBe(rowY(1));
    expect(cell(layout, 'agent').y).toBe(rowY(1));
    expect(cell(layout, 'other').y).toBe(rowY(2));
  });

  it('lists each pair once', () => {
    const layout = layoutContainer('host', [
      child('dev-host', 'host'),
      child('sandbox', 'host', 'agent'),
      child('agent', 'host', 'sandbox'),
    ]);

    expect(layout.tethers).toEqual([{ from: 'sandbox', to: 'agent' }]);
  });

  it('records the row for both members of a pair', () => {
    const layout = layoutContainer('host', [
      child('dev-host', 'host'),
      child('sandbox', 'host', 'agent'),
      child('agent', 'host', 'sandbox'),
    ]);

    expect(layout.slots).toEqual({ 'dev-host': 0, sandbox: 1, agent: 1 });
  });

  it('keeps a pair on its row when its members change declaration order', () => {
    const before = layoutContainer('host', [
      child('dev-host', 'host'),
      child('sandbox', 'host', 'agent'),
      child('agent', 'host', 'sandbox'),
    ]);
    const after = layoutContainer(
      'host',
      [
        child('dev-host', 'host'),
        child('agent', 'host', 'sandbox'),
        child('sandbox', 'host', 'agent'),
      ],
      before,
    );

    expect(cell(after, 'sandbox').y).toBe(cell(before, 'sandbox').y);
    expect(cell(after, 'agent').y).toBe(cell(before, 'agent').y);
  });

  it('leaves the row of a torn-down pair empty and moves nothing up', () => {
    const before = layoutContainer('host', [
      child('sandbox-1', 'host', 'agent-1'),
      child('agent-1', 'host', 'sandbox-1'),
      child('sandbox-2', 'host', 'agent-2'),
      child('agent-2', 'host', 'sandbox-2'),
      child('late', 'host'),
    ]);
    const after = layoutContainer(
      'host',
      [
        child('sandbox-1', 'host', 'agent-1'),
        child('agent-1', 'host', 'sandbox-1'),
        child('late', 'host'),
      ],
      before,
    );

    expect(after.cells.some((c) => c.y === rowY(1))).toBe(false);
    expect(cell(after, 'sandbox-1')).toEqual(cell(before, 'sandbox-1'));
    expect(cell(after, 'agent-1')).toEqual(cell(before, 'agent-1'));
    expect(cell(after, 'late')).toEqual(cell(before, 'late'));
  });

  it('ignores the contents of other containers', () => {
    const layout = layoutContainer('host', [
      child('mine', 'host'),
      child('theirs', 'elsewhere'),
      top('above'),
    ]);

    expect(layout.cells.map((c) => c.id)).toEqual(['mine']);
  });

  it('does not pair with an entity in another container', () => {
    const layout = layoutContainer('host', [
      child('sandbox', 'host', 'agent'),
      child('agent', 'elsewhere', 'sandbox'),
    ]);

    expect(layout.tethers).toEqual([]);
    expect(cell(layout, 'sandbox').y).toBe(rowY(0));
  });

  it('does not pair an entity with itself', () => {
    const layout = layoutContainer('host', [child('lonely', 'host', 'lonely')]);

    expect(layout.tethers).toEqual([]);
    expect(layout.cells).toHaveLength(1);
  });

  it('does not pair when the named partner names a third entity', () => {
    const layout = layoutContainer('host', [
      child('a', 'host', 'b'),
      child('b', 'host', 'c'),
      child('c', 'host', 'b'),
    ]);

    expect(layout.tethers).toEqual([{ from: 'b', to: 'c' }]);
    expect(cell(layout, 'a').y).toBe(rowY(0));
    expect(cell(layout, 'b').y).toBe(rowY(1));
    expect(cell(layout, 'c').y).toBe(rowY(1));
  });

  it('pairs when only one side names the other', () => {
    const layout = layoutContainer('host', [
      child('sandbox', 'host', 'agent'),
      child('agent', 'host'),
    ]);

    expect(layout.tethers).toEqual([{ from: 'sandbox', to: 'agent' }]);
    expect(cell(layout, 'agent').y).toBe(cell(layout, 'sandbox').y);
  });

  it('gives an empty container no size', () => {
    expect(layoutContainer('host', [])).toEqual(EMPTY_LAYOUT);
  });
});

describe('purity', () => {
  const entities = deepFreeze([
    top('host'),
    child('dev-host', 'host'),
    child('sandbox', 'host', 'agent'),
    child('agent', 'host', 'sandbox'),
  ]);

  it('leaves the entities it is given untouched', () => {
    const before = JSON.stringify(entities);
    layoutOverview(entities);
    layoutContainer('host', entities);

    expect(JSON.stringify(entities)).toBe(before);
  });

  it('leaves the previous layout untouched', () => {
    const prev = layoutContainer('host', entities);
    const before = JSON.stringify(prev);
    layoutContainer('host', [child('dev-host', 'host')], prev);

    expect(JSON.stringify(prev)).toBe(before);
  });

  it('gives the same answer for the same input', () => {
    const prev = layoutContainer('host', entities);

    expect(layoutContainer('host', entities, prev)).toEqual(
      layoutContainer('host', entities, prev),
    );
    expect(layoutOverview(entities)).toEqual(layoutOverview(entities));
  });

  it('cannot have its empty layout rewritten', () => {
    expect(Object.isFrozen(EMPTY_LAYOUT)).toBe(true);
  });
});
