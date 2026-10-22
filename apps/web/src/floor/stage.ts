import type { FloorLayout } from '@fleet/layout';
import { Application, Container, Graphics } from 'pixi.js';
import { store } from '../store/index.js';
import { FLOOR } from '../theme/tokens.js';
import {
  type Camera,
  fit,
  IDENTITY,
  isDrag,
  panBy,
  screenToWorld,
  wheelFactor,
  ZOOM_STEP,
  zoomAt,
} from './camera.js';
import { type CellView, createCellView, paintFrame, paintTethers, updateCellView } from './draw.js';
import {
  buildScene,
  type CellModel,
  cellAt,
  dispatchClick,
  EMPTY_SCENE,
  type Scene,
  viewKey,
} from './scene.js';
import { advance, isAnimating, NO_FADES, statusColorAt } from './transitions.js';

export type Hovered = { cell: CellModel; x: number; y: number };

export type Stage = {
  destroy(): void;
  zoomIn(): void;
  zoomOut(): void;
  fitView(): void;
  /** Called with the cell under the pointer, or null when it leaves one. */
  onHover(listener: (hovered: Hovered | null) => void): void;
};

type Attached = { detach(): void; controls: Omit<Stage, 'destroy'> };

/**
 * Owns the canvas and subscribes to the store itself, so a snapshot never costs a React
 * render. Init is async and can fail where there is no WebGL context; the floor then stays
 * empty rather than taking the page down with it.
 */
export function createStage(host: HTMLElement): Stage {
  const app = new Application();
  let disposed = false;
  let detach = (): void => {};
  let controls: Attached['controls'] | undefined;
  let pendingHover: ((hovered: Hovered | null) => void) | undefined;

  const ready = app
    .init({
      background: FLOOR,
      antialias: true,
      resizeTo: host,
      autoDensity: true,
      resolution: globalThis.devicePixelRatio ?? 1,
    })
    .then(() => {
      if (disposed) return;
      host.appendChild(app.canvas);
      const attached = attach(app);
      detach = attached.detach;
      controls = attached.controls;
      if (pendingHover) controls.onHover(pendingHover);
    })
    .catch(() => {});

  return {
    zoomIn: () => controls?.zoomIn(),
    zoomOut: () => controls?.zoomOut(),
    fitView: () => controls?.fitView(),
    onHover(listener) {
      pendingHover = listener;
      controls?.onHover(listener);
    },
    destroy() {
      disposed = true;
      void ready.then(() => {
        detach();
        try {
          app.destroy(true, { children: true });
        } catch {}
      });
    },
  };
}

function attach(app: Application): Attached {
  const canvas = app.canvas;
  const world = new Container();
  const tetherLayer = new Graphics();
  const cellLayer = new Container();
  world.addChild(tetherLayer, cellLayer);
  app.stage.addChild(world);

  const views = new Map<string, CellView>();
  const layouts = new Map<string, FloorLayout>();
  let scene: Scene = EMPTY_SCENE;
  let fades = NO_FADES;
  let camera: Camera = IDENTITY;
  let fittedKey = '';
  let hoverListener: ((hovered: Hovered | null) => void) | undefined;
  let hoveredId: string | null = null;

  const report = (hovered: Hovered | null): void => {
    const id = hovered?.cell.id ?? null;
    // Re-reporting the same cell on every mouse move would re-render the card constantly.
    if (id === hoveredId && !hovered) return;
    hoveredId = id;
    hoverListener?.(hovered);
  };

  const applyCamera = (): void => {
    world.x = camera.x;
    world.y = camera.y;
    world.scale.set(camera.scale);
  };

  const paintAll = (now: number): void => {
    for (const cell of scene.cells) {
      const view = views.get(cell.id);
      if (view) paintFrame(view, cell, statusColorAt(fades.fades, cell.id, cell.status, now));
    }
  };

  const rebuild = (): void => {
    const state = store.getState();
    const key = viewKey(state.view);
    scene = buildScene(state, layouts.get(key));
    layouts.set(key, scene.layout);

    const now = performance.now();
    fades = advance(fades, scene.cells, now);

    const seen = new Set<string>();
    for (const cell of scene.cells) {
      seen.add(cell.id);
      let view = views.get(cell.id);
      if (!view) {
        view = createCellView();
        views.set(cell.id, view);
        cellLayer.addChild(view.root);
      }
      updateCellView(view, cell, statusColorAt(fades.fades, cell.id, cell.status, now));
    }
    for (const [id, view] of views) {
      if (seen.has(id)) continue;
      view.root.destroy({ children: true });
      views.delete(id);
    }

    paintTethers(tetherLayer, scene.tethers);

    if (fittedKey !== key && scene.cells.length > 0) {
      fittedKey = key;
      camera = fit(scene, app.screen);
    }
    applyCamera();
  };

  const tick = (): void => {
    const now = performance.now();
    if (!isAnimating(fades.fades, now)) return;
    paintAll(now);
  };
  app.ticker.add(tick);

  let last = store.getState();
  const unsubscribe = store.subscribe(() => {
    const next = store.getState();
    const changed =
      next.snapshot !== last.snapshot ||
      next.view !== last.view ||
      next.selectedId !== last.selectedId;
    last = next;
    if (changed) rebuild();
  });
  rebuild();

  const pointAt = (event: PointerEvent): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return screenToWorld(camera, event.clientX - rect.left, event.clientY - rect.top);
  };

  type Gesture = {
    id: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    drag: boolean;
  };
  let gesture: Gesture | null = null;

  const onPointerDown = (event: PointerEvent): void => {
    gesture = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      drag: false,
    };
    canvas.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!gesture || gesture.id !== event.pointerId) {
      const point = pointAt(event);
      const cell = cellAt(scene, point.x, point.y);
      canvas.style.cursor = cell ? 'pointer' : 'grab';
      const rect = canvas.getBoundingClientRect();
      report(cell ? { cell, x: event.clientX - rect.left, y: event.clientY - rect.top } : null);
      return;
    }
    report(null);
    if (!gesture.drag && !isDrag(event.clientX - gesture.startX, event.clientY - gesture.startY)) {
      return;
    }
    gesture.drag = true;
    canvas.style.cursor = 'grabbing';
    camera = panBy(camera, event.clientX - gesture.x, event.clientY - gesture.y);
    gesture.x = event.clientX;
    gesture.y = event.clientY;
    applyCamera();
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dragged = gesture.drag;
    gesture = null;
    canvas.releasePointerCapture?.(event.pointerId);
    canvas.style.cursor = 'grab';
    if (dragged) return;
    const point = pointAt(event);
    dispatchClick(scene, point.x, point.y);
  };

  const onLeave = (): void => report(null);

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    camera = zoomAt(
      camera,
      event.clientX - rect.left,
      event.clientY - rect.top,
      wheelFactor(event.deltaY),
    );
    applyCamera();
  };

  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  const zoomCentre = (factor: number): void => {
    camera = zoomAt(camera, app.screen.width / 2, app.screen.height / 2, factor);
    applyCamera();
  };

  const controls: Attached['controls'] = {
    zoomIn: () => zoomCentre(ZOOM_STEP),
    zoomOut: () => zoomCentre(1 / ZOOM_STEP),
    fitView: () => {
      if (scene.cells.length === 0) return;
      camera = fit(scene, app.screen);
      applyCamera();
    },
    onHover(listener) {
      hoverListener = listener;
    },
  };

  const detach = (): void => {
    unsubscribe();
    app.ticker.remove(tick);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('wheel', onWheel);
  };

  return { detach, controls };
}
