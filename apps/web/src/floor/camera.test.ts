import { describe, expect, it } from 'vitest';
import {
  DRAG_SLOP,
  fit,
  IDENTITY,
  isDrag,
  MAX_SCALE,
  MIN_SCALE,
  panBy,
  screenToWorld,
  wheelFactor,
  zoomAt,
} from './camera.js';

describe('screenToWorld', () => {
  it('undoes the camera transform', () => {
    const camera = { x: 40, y: -25, scale: 2 };
    expect(screenToWorld(camera, 140, 75)).toEqual({ x: 50, y: 50 });
  });
});

describe('panBy', () => {
  it('moves the camera and leaves the scale alone', () => {
    expect(panBy({ x: 10, y: 10, scale: 1.5 }, -4, 8)).toEqual({ x: 6, y: 18, scale: 1.5 });
  });
});

describe('zoomAt', () => {
  it('keeps the world point under the pointer', () => {
    const camera = { x: 30, y: 10, scale: 1 };
    const before = screenToWorld(camera, 200, 120);
    const after = screenToWorld(zoomAt(camera, 200, 120, 1.7), 200, 120);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it('clamps at both ends', () => {
    expect(zoomAt(IDENTITY, 0, 0, 100).scale).toBe(MAX_SCALE);
    expect(zoomAt(IDENTITY, 0, 0, 0.001).scale).toBe(MIN_SCALE);
  });
});

describe('wheelFactor', () => {
  it('zooms in when the wheel goes up and out when it goes down', () => {
    expect(wheelFactor(-100)).toBeGreaterThan(1);
    expect(wheelFactor(100)).toBeLessThan(1);
    expect(wheelFactor(0)).toBe(1);
  });
});

describe('isDrag', () => {
  it('treats a small movement as a click', () => {
    expect(isDrag(0, 0)).toBe(false);
    expect(isDrag(DRAG_SLOP, 0)).toBe(false);
    expect(isDrag(DRAG_SLOP + 1, 0)).toBe(true);
  });
});

describe('fit', () => {
  it('centres content that already fits, without magnifying it', () => {
    const camera = fit({ width: 200, height: 100 }, { width: 400, height: 300 });
    expect(camera.scale).toBe(1);
    expect(camera.x).toBe(100);
    expect(camera.y).toBe(100);
  });

  it('shrinks content that does not fit', () => {
    const camera = fit({ width: 800, height: 100 }, { width: 400, height: 300 });
    expect(camera.scale).toBe(0.5);
    expect(camera.x).toBe(0);
    expect(camera.y).toBe(125);
  });

  it('stays put when there is nothing to show', () => {
    expect(fit({ width: 0, height: 0 }, { width: 400, height: 300 })).toEqual(IDENTITY);
  });
});
