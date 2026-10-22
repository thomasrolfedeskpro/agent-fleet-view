import { act, Profiler, type ProfilerOnRenderCallback } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '../store/index.js';
import { beat } from './fixture.js';
import { Floor } from './index.js';

/**
 * jsdom has no canvas. Returning no context lets the stage give up quietly, and it has to be in
 * place before Pixi is imported, because Pixi probes a canvas as its modules evaluate.
 */
vi.hoisted(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('Floor', () => {
  let host: HTMLDivElement;
  let root: Root;
  let commits = 0;

  const onRender: ProfilerOnRenderCallback = () => {
    commits += 1;
  };

  const mount = (): void => {
    act(() => {
      root.render(
        <Profiler id="floor" onRender={onRender}>
          <Floor />
        </Profiler>,
      );
    });
  };

  beforeEach(() => {
    store.reset();
    commits = 0;
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it('mounts a single element for the canvas to live in', () => {
    mount();
    expect(host.children).toHaveLength(1);
  });

  it('does not re-render for a snapshot', () => {
    mount();
    expect(commits).toBe(1);

    act(() => {
      store.onSnapshot(beat(16));
      store.onSnapshot(beat(17));
      store.onSnapshot(beat(18));
    });

    expect(commits).toBe(1);
  });

  it('does not re-render when the view or the selection changes', () => {
    mount();
    act(() => {
      store.onSnapshot(beat(16));
      store.select('vdp');
      store.setView({ mode: 'inside', containerId: 'ec2-1' });
    });
    expect(commits).toBe(1);
  });

  it('survives being mounted and torn down twice, as strict mode does it', () => {
    mount();
    act(() => root.unmount());
    root = createRoot(host);
    expect(() => mount()).not.toThrow();
  });
});
