import { EMPTY_LAYOUT, type FloorLayout, layoutContainer, layoutOverview } from '@fleet/layout';
import type { Status } from '@fleet/schema';
import type { State, View } from '../store/index.js';
import { childrenOf, entities, handInside, store } from '../store/index.js';

export type CellModel = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  badges: string[];
  status: Status;
  /** This thing wants a person. */
  hand: boolean;
  count: number | null;
  /** Something is inside it, so it can be opened. */
  container: boolean;
  /** The contents mark: binary, never a count. */
  handInside: boolean;
  selected: boolean;
};

export type TetherModel = {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type Scene = {
  cells: CellModel[];
  tethers: TetherModel[];
  width: number;
  height: number;
  layout: FloorLayout;
};

export const EMPTY_SCENE: Scene = {
  cells: [],
  tethers: [],
  width: 0,
  height: 0,
  layout: EMPTY_LAYOUT,
};

/** Slots only carry forward within one view, so layouts are remembered per key. */
export function viewKey(view: View): string {
  return view.mode === 'overview' ? 'overview' : `inside:${view.containerId}`;
}

export function buildScene(state: State, prev?: FloorLayout): Scene {
  const list = entities(state);
  const layout =
    state.view.mode === 'overview'
      ? layoutOverview(list, prev)
      : layoutContainer(state.view.containerId, list, prev);

  const byId = new Map(list.map((e) => [e.id, e]));
  const placed = new Map(layout.cells.map((c) => [c.id, c]));

  const cells: CellModel[] = [];
  for (const spot of layout.cells) {
    const entity = byId.get(spot.id);
    if (!entity) continue;
    cells.push({
      id: entity.id,
      x: spot.x,
      y: spot.y,
      w: spot.w,
      h: spot.h,
      label: entity.label,
      badges: entity.badges,
      status: entity.status,
      hand: entity.hand,
      count: entity.count,
      container: childrenOf(state, entity.id).length > 0,
      handInside: handInside(state, entity.id),
      selected: state.selectedId === entity.id,
    });
  }

  const tethers: TetherModel[] = [];
  for (const tether of layout.tethers) {
    const from = placed.get(tether.from);
    const to = placed.get(tether.to);
    if (!from || !to) continue;
    tethers.push({
      from: tether.from,
      to: tether.to,
      x1: from.x + from.w,
      y1: from.y + from.h / 2,
      x2: to.x,
      y2: to.y + to.h / 2,
    });
  }

  return { cells, tethers, width: layout.width, height: layout.height, layout };
}

export function cellAt(scene: Scene, x: number, y: number): CellModel | undefined {
  return scene.cells.findLast((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
}

export type ClickAction =
  | { kind: 'select'; id: string | null }
  | { kind: 'enter'; containerId: string };

/** Opening a container wins over selecting it: the view change is the more useful answer. */
export function clickAction(cell: CellModel | undefined): ClickAction {
  if (!cell) return { kind: 'select', id: null };
  if (cell.container) return { kind: 'enter', containerId: cell.id };
  return { kind: 'select', id: cell.id };
}

export function dispatchClick(scene: Scene, x: number, y: number): ClickAction {
  const action = clickAction(cellAt(scene, x, y));
  if (action.kind === 'enter') store.setView({ mode: 'inside', containerId: action.containerId });
  else store.select(action.id);
  return action;
}
