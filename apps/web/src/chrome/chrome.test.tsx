import { Snapshot } from '@fleet/schema';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { store } from '../store/index.js';
import { Chrome, TopBar } from './index.js';

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
      glyph: 'rack',
      meta: 'eu-west-1a · 2 of 6 slots',
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
      glyph: 'tray',
      meta: '',
      type: 'vdp',
      parentId: null,
      label: 'VDP intake',
      status: 'idle',
      count: 3,
    },
    {
      id: 'tess',
      kind: 'agent',
      glyph: 'agent',
      meta: '',
      type: 'tess',
      parentId: 'cp',
      label: 'Tess · VDP-88',
      status: 'working',
      badges: ['handover'],
    },
    {
      id: 'jim',
      kind: 'agent',
      glyph: 'agent',
      meta: '',
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

function mountComponent(node: React.ReactElement): Mounted {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(node));
  return {
    root: host,
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

/** The tallies and the freshness readout live in the top bar, not the sidebar. */
const mountTopBar = (): Mounted => mountComponent(<TopBar />);
const mount = (): Mounted => mountComponent(<Chrome />);

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

/** Assigning `input.value` goes through React's value tracker, which then suppresses change. */
function type(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function press(el: HTMLElement, key: string): void {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

function searchField(root: HTMLElement): HTMLInputElement {
  return find(root, 'filter-input') as HTMLInputElement;
}

function rowIds(root: HTMLElement): string[] {
  return [...root.querySelectorAll<HTMLElement>('[data-testid^="row-"]')].map(
    (row) => row.dataset.testid?.slice('row-'.length) ?? '',
  );
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

describe('summary tallies', () => {
  test('tallies each status and the raised hands', () => {
    store.onSnapshot(snapshot);
    store.onConnection('open');
    mounted = mountTopBar();

    const value = (id: string) => find(mounted!.root, `kpi-${id}`).dataset.value;
    expect(value('working')).toBe('2');
    expect(value('idle')).toBe('1');
    expect(value('initializing')).toBe('0');
    expect(value('error')).toBe('1');
    expect(value('hands')).toBe('1');
  });
});

describe('freshness', () => {
  test('says so when no snapshot has arrived', () => {
    mounted = mountTopBar();
    expect(find(mounted.root, 'freshness').dataset.band).toBe('none');
  });

  test('moves current to delayed to stale on its own clock', () => {
    vi.useFakeTimers({ toFake: [...FAKE_CLOCK] });
    store.onSnapshot(snapshot);
    mounted = mountTopBar();

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
    mounted = mountTopBar();

    act(() => vi.advanceTimersByTime(70_000));
    expect(find(mounted.root, 'freshness').dataset.band).toBe('stale');

    act(() => store.onSnapshot({ ...snapshot, seq: 2 }));
    expect(find(mounted.root, 'freshness').dataset.band).toBe('current');
  });

  test('leaves no timer behind on unmount', () => {
    vi.useFakeTimers({ toFake: [...FAKE_CLOCK] });
    store.onSnapshot(snapshot);
    const local = mountTopBar();
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    local.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('list', () => {
  test('lists the whole floor and selects on click', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    // One level: the list is everything, not just the things at the top of a tree.
    expect(mounted.root.querySelectorAll('[data-testid^="row-"]')).toHaveLength(
      snapshot.entities.length,
    );

    click(find(mounted.root, 'row-vdp'));
    expect(store.getState().selectedId).toBe('vdp');
    expect(find(mounted.root, 'row-vdp').getAttribute('aria-pressed')).toBe('true');
  });

  test('marks a raised hand on the row', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

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

describe('filter', () => {
  test('searching narrows the list and writes the filter to the store', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    type(searchField(mounted.root), 'jim');

    expect(store.getState().filter).toEqual({ text: 'jim', needsPerson: false });
    expect(rowIds(mounted.root)).toEqual(['jim']);
  });

  test('searches type and status as well as the label', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    type(searchField(mounted.root), 'vdp');
    expect(rowIds(mounted.root)).toEqual(['vdp', 'tess', 'jim']);

    type(searchField(mounted.root), 'idle');
    expect(rowIds(mounted.root)).toEqual(['vdp']);
  });

  test('the pills carry their own counts', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    const count = (id: string) => find(mounted!.root, `pill-${id}`).dataset.count;
    expect(count('all')).toBe('4');
    expect(count('hands')).toBe('1');
    expect(count('errors')).toBe('1');
  });

  test('needs a person keeps only the raised hands', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    click(find(mounted.root, 'pill-hands'));

    expect(store.getState().filter.needsPerson).toBe(true);
    expect(rowIds(mounted.root)).toEqual(['jim']);
    expect(find(mounted.root, 'pill-hands').getAttribute('aria-pressed')).toBe('true');
  });

  test('needs a person narrows a search rather than replacing it', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    type(searchField(mounted.root), 'vdp');
    click(find(mounted.root, 'pill-hands'));

    expect(store.getState().filter).toEqual({ text: 'vdp', needsPerson: true });
    expect(rowIds(mounted.root)).toEqual(['jim']);
  });

  test('errors searches the status, and says so in the field', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    click(find(mounted.root, 'pill-errors'));

    expect(rowIds(mounted.root)).toEqual(['jim']);
    expect(searchField(mounted.root).value).toBe('error');
    expect(find(mounted.root, 'pill-errors').getAttribute('aria-pressed')).toBe('true');
  });

  test('all clears both halves of the filter', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    type(searchField(mounted.root), 'jim');
    click(find(mounted.root, 'pill-hands'));
    click(find(mounted.root, 'pill-all'));

    expect(store.getState().filter).toEqual({ text: '', needsPerson: false });
    expect(find(mounted.root, 'pill-all').getAttribute('aria-pressed')).toBe('true');
    expect(rowIds(mounted.root)).toHaveLength(snapshot.entities.length);
  });

  test('the clear control empties the search', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    type(searchField(mounted.root), 'jim');
    click(find(mounted.root, 'filter-clear'));

    expect(store.getState().filter.text).toBe('');
    expect(mounted.root.querySelector('[data-testid="filter-clear"]')).toBeNull();
  });

  test('the search field is labelled', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    const field = searchField(mounted.root);
    const label = mounted.root.querySelector(`label[for="${field.id}"]`);
    expect(label?.textContent).toBe('Find on the floor');
  });
});

describe('filter keyboard', () => {
  test('slash focuses the search from anywhere on the page', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    press(document.body, '/');

    expect(document.activeElement).toBe(searchField(mounted.root));
  });

  test('slash typed into another field is left alone', () => {
    store.onSnapshot(snapshot);
    mounted = mount();
    const elsewhere = document.createElement('input');
    document.body.append(elsewhere);
    elsewhere.focus();

    press(elsewhere, '/');

    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  test('the arrows step the selection through the rows on screen', () => {
    store.onSnapshot(snapshot);
    mounted = mount();
    const field = searchField(mounted.root);

    press(field, 'ArrowDown');
    expect(store.getState().selectedId).toBe('cp');

    press(field, 'ArrowDown');
    expect(store.getState().selectedId).toBe('tess');

    press(field, 'ArrowUp');
    expect(store.getState().selectedId).toBe('cp');
  });

  test('the arrows stop at the ends rather than wrapping', () => {
    store.onSnapshot(snapshot);
    mounted = mount();
    const field = searchField(mounted.root);

    press(field, 'ArrowUp');
    expect(store.getState().selectedId).toBe('vdp');

    press(field, 'ArrowDown');
    expect(store.getState().selectedId).toBe('vdp');
  });

  test('enter selects the first match', () => {
    store.onSnapshot(snapshot);
    mounted = mount();
    const field = searchField(mounted.root);

    type(field, 'jim');
    press(field, 'Enter');

    expect(store.getState().selectedId).toBe('jim');
  });

  test('escape clears the search first and the selection second', () => {
    store.onSnapshot(snapshot);
    mounted = mount();
    const field = searchField(mounted.root);

    type(field, 'jim');
    press(field, 'Enter');
    press(field, 'Escape');
    expect(store.getState().filter.text).toBe('');
    expect(store.getState().selectedId).toBe('jim');

    press(field, 'Escape');
    expect(store.getState().selectedId).toBeNull();
  });

  test('leaves no listener behind on unmount', () => {
    store.onSnapshot(snapshot);
    const local = mount();
    local.unmount();

    press(document.body, '/');
    expect(document.activeElement).toBe(document.body);
  });
});

describe('list rows', () => {
  test('puts a child under its parent and indents it', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    expect(rowIds(mounted.root)).toEqual(['cp', 'tess', 'jim', 'vdp']);
    const depth = (id: string) => find(mounted!.root, `row-${id}`).dataset.depth;
    expect(depth('cp')).toBe('0');
    expect(depth('tess')).toBe('1');
    expect(depth('vdp')).toBe('0');
  });

  test('a match still reads as a child when its parent is filtered away', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    type(searchField(mounted.root), 'jim');

    expect(find(mounted.root, 'row-jim').dataset.depth).toBe('1');
  });

  test('counts the matches against the whole floor', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    type(searchField(mounted.root), 'jim');
    expect(find(mounted.root, 'list').textContent).toContain('1 of 4');
  });

  test('says so when nothing matches', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    type(searchField(mounted.root), 'nothing-by-that-name');

    expect(rowIds(mounted.root)).toHaveLength(0);
    expect(find(mounted.root, 'list').textContent).toContain('Nothing matches that');
  });
});

describe('top bar', () => {
  test('the hands pill only raises itself above zero', () => {
    mounted = mountTopBar();
    expect(find(mounted.root, 'kpi-hands').dataset.raised).toBe('false');

    act(() => store.onSnapshot(snapshot));
    expect(find(mounted.root, 'kpi-hands').dataset.raised).toBe('true');
  });

  test('the freshness readout names the source and the age', () => {
    vi.useFakeTimers({ toFake: [...FAKE_CLOCK] });
    store.setSource('live');
    store.onConnection('open');
    store.onSnapshot(snapshot);
    mounted = mountTopBar();

    expect(find(mounted.root, 'freshness').textContent).toBe('live · updated 0s ago');

    act(() => vi.advanceTimersByTime(3_000));
    expect(find(mounted.root, 'freshness').textContent).toBe('live · updated 3s ago');
  });

  test('the freshness readout stops claiming to be live once the socket drops', () => {
    vi.useFakeTimers({ toFake: [...FAKE_CLOCK] });
    store.setSource('live');
    store.onConnection('open');
    store.onSnapshot(snapshot);
    mounted = mountTopBar();

    act(() => store.onConnection('closed'));
    expect(find(mounted.root, 'freshness').textContent).toBe('offline · updated 0s ago');
  });
});

describe('detail panel', () => {
  test('says a thing failed, and gives the way out to the tool that owns it', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    act(() => store.select('jim'));
    const detail = find(mounted.root, 'detail');
    expect(find(detail, 'detail-banner').textContent).toContain('This failed');
    expect(find(detail, 'detail-links').querySelectorAll('a')).toHaveLength(1);
  });

  test('keeps the banner for a raised hand that has not failed', () => {
    const waiting = {
      ...snapshot,
      entities: snapshot.entities.map((e) => (e.id === 'tess' ? { ...e, hand: true } : e)),
    };
    store.onSnapshot(waiting);
    mounted = mount();

    act(() => store.select('tess'));
    expect(find(mounted.root, 'detail-banner').textContent).toContain('Someone is needed');
  });

  test('leaves the banner off a thing that is simply working', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    act(() => store.select('cp'));
    expect(mounted.root.querySelector('[data-testid="detail-banner"]')).toBeNull();
  });

  test('shows the meta line the producer declared', () => {
    store.onSnapshot(snapshot);
    mounted = mount();

    act(() => store.select('cp'));
    expect(find(mounted.root, 'detail').textContent).toContain('eu-west-1a · 2 of 6 slots');
  });
});
