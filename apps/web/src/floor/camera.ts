export type Camera = { x: number; y: number; scale: number };
export type Point = { x: number; y: number };

export const MIN_SCALE = 0.35;
export const MAX_SCALE = 2.5;
export const IDENTITY: Camera = { x: 0, y: 0, scale: 1 };

/** Below this a pointer gesture is a click rather than a pan. */
/** One press of the zoom buttons. */
export const ZOOM_STEP = 1.25;

export const DRAG_SLOP = 4;

const clampScale = (scale: number): number => Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

export function screenToWorld(camera: Camera, sx: number, sy: number): Point {
  return { x: (sx - camera.x) / camera.scale, y: (sy - camera.y) / camera.scale };
}

export function panBy(camera: Camera, dx: number, dy: number): Camera {
  return { ...camera, x: camera.x + dx, y: camera.y + dy };
}

/** Zoom about a screen point, so whatever sits under the pointer stays under it. */
export function zoomAt(camera: Camera, sx: number, sy: number, factor: number): Camera {
  const scale = clampScale(camera.scale * factor);
  const applied = scale / camera.scale;
  return { scale, x: sx - (sx - camera.x) * applied, y: sy - (sy - camera.y) * applied };
}

export function wheelFactor(deltaY: number): number {
  return Math.exp(-deltaY * 0.0015);
}

export function isDrag(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > DRAG_SLOP;
}

/** Breathing room between the content and the viewport edge. */
export const FIT_PADDING = 48;

/** A single small cell should not fill the screen, so scaling up stops here. */
export const FIT_MAX_SCALE = 1.6;

/** Centre the content and size it to the viewport, within limits. */
export function fit(
  content: { width: number; height: number },
  viewport: { width: number; height: number },
): Camera {
  if (content.width <= 0 || content.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return IDENTITY;
  }
  const usableWidth = Math.max(1, viewport.width - FIT_PADDING * 2);
  const usableHeight = Math.max(1, viewport.height - FIT_PADDING * 2);
  const scale = clampScale(
    Math.min(FIT_MAX_SCALE, usableWidth / content.width, usableHeight / content.height),
  );
  return {
    scale,
    x: (viewport.width - content.width * scale) / 2,
    y: (viewport.height - content.height * scale) / 2,
  };
}
