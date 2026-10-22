import { Snapshot } from '@fleet/schema';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { store } from '../store/index.js';
import { Chrome } from './index.js';

const FAKE_CLOCK = [
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'Date',
  'performance',
] as const;

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot = Snapshot.parse({
  v: 1,
  seq: 1,
  sentAt: '2026-01-01T00:00:00.000Z',
  scenarioId: 'scenario-01',
  beat: 1,
  elapsedMs: 0,
  entities: [
    {
      id: 'cp',
      kind: 'infrastructure',
      type: 'control-plane',
      parentId: null,
      label: 'Control plane',
      status: 'working',
      persistent: true,
      links: [{ label: 'Admin', href: 'https://example.internal/control-plane' }],
    },
    {
      id: 'vdp',
      kind: 'source',
      type: 'vdp',
      parentId: null,
      label: 'VDP intake',
      status: 'idle',
      count: 3,
    },
    {
      id: 'tess',
      kind: 'agent',
      type: 'tess',
      parentId: 'cp',
      label: 'Tess · VDP-88',
      status: 'working',
      badges: ['handover'],
    },
    {
      id: 'jim',
      kind: 'agent',
      type: 'jim',
      parentId: 'cp',
      label: 'Jim · VDP-88',
      status: 'error',
      hand: true,
      links: [{ label: 'Runbook', href: 'https://example.internal/runbook' }],
    },
  ],
});

type Mounted = { root: HTMLElement; unmount: () => void };

function mount(): Mounted {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<Chrome />));
  return {
    root: host,
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

function find(root: HTMLElement, testId: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!el) throw new Error(`no [data-testid="${testId}"]`);
  return el;
}

function click(el: HTMLElement): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

let mounted: Mounted | undefined;

beforeEach(() => {
  store.reset();
});

afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
  vi.useRealTimers();
});

describe('summary strip', () => {
  test('tallies each status and the raised hands', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    const value = (id: string) => find(mounted!.root, `tally-${id}`).dataset.value;
    expect(value('working')).toBe('2');
    expect(value('idle')).toBe('1');
    expect(value('initializing')).toBe('0');
    expect(value('error')).toBe('1');
    expect(value('hands')).toBe('1');
  });
});

describe('freshness', () => {
  test('says so when no snapshot has arrived', () => {
    mounted = mount();
    expect(find(mounted.root, 'freshness').dataset.band).toBe('none');
  });

  test('moves current to delayed to stale on its own clock', () => {
    vi.useFakeTimers({ toFake: [...FAKE_CLOCK] });
    store.onSnapshot(snapshot);
    mounted = mount();

    const band = () => find(mounted!.root, 'freshness').dataset.band;
    expect(band()).toBe('current');

    act(() => vi.advanceTimersByTime(19_000));
    expect(band()).toBe('current');

    act(() => vi.advanceTimersByTime(2_000));
    expect(band()).toBe('delayed');

    act(() => vi.advanceTimersByTime(38_000));
    expect(band()).toBe('delayed');

    act(() => vi.advanceTimersByTime(2_000));
    expect(band()).toBe('stale');
  });

  test('returns to current when a snapshot arrives', () => {
    vi.useFakeTimers({ toFake: [...FAKE_CLOCK] });
    store.onSnapshot(snapshot);
    mounted = mount();

    act(() => vi.advanceTimersByTime(70_000));
    expect(find(mounted.root, 'freshness').dataset.band).toBe('stale');

    act(() => store.onSnapshot({ ...snapshot, seq: 2 }));
    expect(find(mounted.root, 'freshness').dataset.band).toBe('current');
  });

  test('leaves no timer behind on unmount', () => {
    vi.useFakeTimers({ toFake: [...FAKE_CLOCK] });
    store.onSnapshot(snapshot);
    const local = mount();
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    local.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('list', () => {
  test('lists what the current view shows and selects on click', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    expect(mounted.root.querySelectorAll('[data-testid^="row-"]')).toHaveLength(2);

    click(find(mounted.root, 'row-vdp'));
    expect(store.getState().selectedId).toBe('vdp');
    expect(find(mounted.root, 'row-vdp').getAttribute('aria-pressed')).toBe('true');
  });

  test('follows a selection made outside the list', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    act(() => store.select('cp'));
    expect(find(mounted.root, 'row-cp').getAttribute('aria-pressed')).toBe('true');
    expect(find(mounted.root, 'row-vdp').getAttribute('aria-pressed')).toBe('false');
  });

  test('drills into a container and back out through the breadcrumb', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    click(find(mounted.root, 'enter-cp'));
    expect(store.getState().view).toEqual({ mode: 'inside', containerId: 'cp' });
    expect(find(mounted.root, 'breadcrumb').textContent).toContain('Control plane');
    expect(mounted.root.querySelectorAll('[data-testid^="row-"]')).toHaveLength(2);

    click(find(mounted.root, 'row-jim'));
    expect(store.getState().selectedId).toBe('jim');

    click(find(mounted.root, 'breadcrumb-up'));
    expect(store.getState().view).toEqual({ mode: 'overview' });
    expect(store.getState().selectedId).toBeNull();
  });

  test('marks a raised hand on the row', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    act(() => store.setView({ mode: 'inside', containerId: 'cp' }));
    expect(mounted.root.querySelector('[data-testid="hand-jim"]')).not.toBeNull();
    expect(mounted.root.querySelector('[data-testid="hand-tess"]')).toBeNull();
  });
});

describe('detail panel', () => {
  test('shows nothing selected until something is', () => {
    store.onSnapshot(snapshot);
    mounted = mount();
    expect(find(mounted.root, 'detail').dataset.entity).toBe('');
  });

  test('shows identifiers, badges and the hand', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    act(() => store.select('tess'));
    const detail = find(mounted.root, 'detail');
    expect(detail.textContent).toContain('Tess · VDP-88');
    expect(detail.textContent).toContain('agent');
    expect(detail.textContent).toContain('tess');
    expect(detail.textContent).toContain('working');
    expect(detail.textContent).toContain('handover');
    expect(find(detail, 'detail-hand').textContent).toBe('not raised');
    expect(detail.querySelector('[data-testid="detail-links"]')).toBeNull();
  });

  test('a failed thing gets its status and its links, nothing invented', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    act(() => store.select('jim'));
    const detail = find(mounted.root, 'detail');
    expect(detail.textContent).toContain('error');
    expect(find(detail, 'detail-hand').textContent).toContain('raised');

    const links = find(detail, 'detail-links').querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe('https://example.internal/runbook');
    expect(links[0]?.getAttribute('target')).toBe('_blank');
    expect(links[0]?.getAttribute('rel')).toContain('noreferrer');
  });

  test('shows a count only when the entity carries one', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    act(() => store.select('vdp'));
    expect(find(mounted.root, 'detail').textContent).toContain('count');

    act(() => store.select('cp'));
    expect(find(mounted.root, 'detail').textContent).not.toContain('count');
  });
});
