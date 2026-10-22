import { ITEM_H, ROW_GAP } from '@fleet/layout';
import { beforeEach, describe, expect, it } from 'vitest';
import { store } from '../store/index.js';
import { beat, stateOf } from './fixture.js';
import { buildScene, cellAt, clickAction, dispatchClick, viewKey } from './scene.js';

const overview = { mode: 'overview' } as const;
const insideEc2 = { mode: 'inside', containerId: 'ec2-1' } as const;

describe('buildScene, overview', () => {
  const scene = buildScene(stateOf(beat(16), overview));

  it('draws one cell per top-level entity', () => {
    expect(scene.cells.map((c) => c.id)).toEqual(['cp', 'vdp', 'linear', 'ec2-1']);
  });

  it('has no tethers, because pairs live inside', () => {
    expect(scene.tethers).toEqual([]);
  });

  it('marks the entities that have something inside them', () => {
    const containers = scene.cells.filter((c) => c.container).map((c) => c.id);
    expect(containers).toEqual(['cp', 'ec2-1']);
  });

  it('keeps a zero count, and leaves a count-free entity null', () => {
    expect(scene.cells.find((c) => c.id === 'vdp')?.count).toBe(0);
    expect(scene.cells.find((c) => c.id === 'cp')?.count).toBeNull();
  });

  it('carries label, status and badges straight through', () => {
    const cp = scene.cells.find((c) => c.id === 'cp');
    expect(cp?.label).toBe('Control plane');
    expect(cp?.status).toBe('working');
    expect(cp?.badges).toEqual([]);
  });

  it('raises the contents mark on the container holding the raised hand', () => {
    const raised = buildScene(stateOf(beat(18), overview));
    const marks = Object.fromEntries(raised.cells.map((c) => [c.id, c.handInside]));
    expect(marks['ec2-1']).toBe(true);
    expect(marks.cp).toBe(false);
    expect(raised.cells.every((c) => c.hand === false)).toBe(true);
  });

  it('flags the selected cell and nothing else', () => {
    const selected = buildScene(stateOf(beat(16), overview, 'vdp'));
    expect(selected.cells.filter((c) => c.selected).map((c) => c.id)).toEqual(['vdp']);
  });
});

describe('buildScene, inside a container', () => {
  const scene = buildScene(stateOf(beat(16), insideEc2));

  it('draws one cell per child', () => {
    expect(scene.cells.map((c) => c.id).sort()).toEqual(['dev-host-1', 'jim-1', 'sandbox-1']);
  });

  it('tethers the pair', () => {
    expect(scene.tethers.map((t) => [t.from, t.to])).toEqual([['sandbox-1', 'jim-1']]);
  });

  it('runs the tether from the right edge of one cell to the left edge of the other', () => {
    const tether = scene.tethers[0]!;
    const from = scene.cells.find((c) => c.id === 'sandbox-1')!;
    const to = scene.cells.find((c) => c.id === 'jim-1')!;
    expect(tether.x1).toBe(from.x + from.w);
    expect(tether.y1).toBe(from.y + from.h / 2);
    expect(tether.x2).toBe(to.x);
    expect(tether.y2).toBe(to.y + to.h / 2);
  });

  it('puts the pair on one row and the lone child on its own', () => {
    const rows = new Set(scene.cells.map((c) => c.y));
    expect(rows.size).toBe(2);
  });

  it('treats a flattened child as something you cannot open', () => {
    expect(scene.cells.every((c) => c.container === false)).toBe(true);
  });
});

describe('buildScene, slot stability', () => {
  it('leaves a survivor where it was when an earlier row goes', () => {
    const snapshot = beat(16);
    const before = buildScene(stateOf(snapshot, insideEc2));
    const without = {
      ...snapshot,
      entities: snapshot.entities.filter((e) => e.id !== 'dev-host-1'),
    };
    const after = buildScene(stateOf(without, insideEc2), before.layout);

    const y = (scene: typeof before, id: string): number => scene.cells.find((c) => c.id === id)!.y;
    expect(y(after, 'sandbox-1')).toBe(y(before, 'sandbox-1'));
    expect(after.cells.some((c) => c.id === 'dev-host-1')).toBe(false);
  });

  it('gives a newcomer the first free row', () => {
    const before = buildScene(stateOf(beat(16), insideEc2));
    const after = buildScene(stateOf(beat(18), insideEc2), before.layout);
    const rows = after.cells.map((c) => c.y);
    expect(Math.max(...rows)).toBe(Math.min(...rows) + 2 * (ITEM_H + ROW_GAP));
  });
});

describe('viewKey', () => {
  it('separates the overview from each container', () => {
    expect(viewKey(overview)).not.toBe(viewKey(insideEc2));
    expect(viewKey(insideEc2)).toBe(viewKey({ mode: 'inside', containerId: 'ec2-1' }));
  });
});

describe('cellAt', () => {
  const scene = buildScene(stateOf(beat(16), overview));
  const cp = scene.cells[0]!;

  it('finds the cell under a point', () => {
    expect(cellAt(scene, cp.x + 1, cp.y + 1)?.id).toBe('cp');
    expect(cellAt(scene, cp.x + cp.w / 2, cp.y + cp.h / 2)?.id).toBe('cp');
  });

  it('finds nothing in the gap between cells', () => {
    expect(cellAt(scene, cp.x - 5, cp.y - 5)).toBeUndefined();
    expect(cellAt(scene, cp.x + cp.w + 5, cp.y + cp.h / 2)).toBeUndefined();
  });
});

describe('clicking', () => {
  const scene = buildScene(stateOf(beat(16), overview));
  const at = (id: string): { x: number; y: number } => {
    const cell = scene.cells.find((c) => c.id === id)!;
    return { x: cell.x + 4, y: cell.y + 4 };
  };

  beforeEach(() => {
    store.reset();
  });

  it('opens a container rather than selecting it', () => {
    expect(clickAction(scene.cells.find((c) => c.id === 'ec2-1'))).toEqual({
      kind: 'enter',
      containerId: 'ec2-1',
    });
  });

  it('selects anything that cannot be opened', () => {
    expect(clickAction(scene.cells.find((c) => c.id === 'vdp'))).toEqual({
      kind: 'select',
      id: 'vdp',
    });
  });

  it('clears the selection on empty floor', () => {
    expect(clickAction(undefined)).toEqual({ kind: 'select', id: null });
  });

  it('dispatches a selection to the store', () => {
    const point = at('vdp');
    dispatchClick(scene, point.x, point.y);
    expect(store.getState().selectedId).toBe('vdp');
    expect(store.getState().view).toEqual(overview);
  });

  it('dispatches a view change to the store', () => {
    const point = at('ec2-1');
    dispatchClick(scene, point.x, point.y);
    expect(store.getState().view).toEqual(insideEc2);
  });

  it('clears the selection when the click misses everything', () => {
    store.select('vdp');
    dispatchClick(scene, -100, -100);
    expect(store.getState().selectedId).toBeNull();
  });
});
