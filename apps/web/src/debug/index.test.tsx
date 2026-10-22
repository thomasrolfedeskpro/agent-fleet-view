import type { ClientCommand, Hello, Snapshot } from '@fleet/schema';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { store } from '../store/index.js';
import { DebugPanel } from './index.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const hello: Hello = {
  type: 'hello',
  v: 1,
  tickMs: 1000,
  scenarios: [
    {
      id: 'scenario-01',
      title: 'A VDP report through Tess, Vera and Jim',
      beats: [
        { at: 0, note: 'Quiet floor' },
        { at: 5, note: 'A report arrives' },
        { at: 70, note: 'Findings returned' },
      ],
    },
    { id: 'scenario-02', title: 'A quiet night', beats: [{ at: 0, note: 'Nothing happens' }] },
  ],
};

const snapshotAt = (beat: number, scenarioId = 'scenario-01'): Snapshot => ({
  v: 1,
  seq: beat + 1,
  sentAt: '2026-01-01T00:00:00.000Z',
  scenarioId,
  beat,
  elapsedMs: beat * 1000,
  entities: [],
});

let container: HTMLDivElement;
let root: Root;
let sent: ClientCommand[];

function render(): void {
  act(() => {
    root.render(<DebugPanel />);
  });
}

function buttons(): HTMLButtonElement[] {
  return [...container.querySelectorAll('button')];
}

function button(label: string): HTMLButtonElement {
  const found = buttons().find((b) => b.textContent?.trim() === label);
  if (!found) throw new Error(`no button labelled "${label}"`);
  return found;
}

function beatButtons(): HTMLButtonElement[] {
  return [...container.querySelectorAll<HTMLButtonElement>('.dbg-beat')];
}

function click(el: HTMLElement): void {
  act(() => {
    el.click();
  });
}

function collapseToggle(): HTMLButtonElement {
  const found = container.querySelector<HTMLButtonElement>('.dbg-collapse');
  if (!found) throw new Error('no collapse toggle');
  return found;
}

/** Assigning `select.value` goes through React's value tracker, which then suppresses change. */
function pickScenario(id: string): void {
  const select = container.querySelector('select');
  if (!select) throw new Error('no scenario picker');
  const index = [...select.options].findIndex((o) => o.value === id);
  if (index < 0) throw new Error(`no option for ${id}`);
  act(() => {
    select.selectedIndex = index;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

beforeEach(() => {
  store.reset();
  sent = [];
  store.registerSender((command) => sent.push(command));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    store.onHello(hello);
  });
  render();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

describe('transport', () => {
  it('starts the scenario shown in the picker', () => {
    click(button('Start'));
    expect(sent).toEqual([{ cmd: 'start', scenarioId: 'scenario-01' }]);
  });

  it('starts the scenario the picker was changed to', () => {
    pickScenario('scenario-02');
    click(button('Start'));
    expect(sent).toEqual([{ cmd: 'start', scenarioId: 'scenario-02' }]);
  });

  it('sends resume while stopped and pause once running', () => {
    click(button('Resume'));
    click(button('Pause'));
    expect(sent).toEqual([{ cmd: 'resume' }, { cmd: 'pause' }]);
  });

  it('sends reset', () => {
    click(button('Reset'));
    expect(sent).toEqual([{ cmd: 'reset' }]);
  });

  it('disables Start until hello names a scenario', () => {
    act(() => {
      store.reset();
    });
    expect(button('Start').disabled).toBe(true);
  });
});

describe('speed', () => {
  it('sends setSpeed for every speed offered', () => {
    for (const speed of [0.5, 1, 2, 5, 10]) click(button(`${speed}x`));
    expect(sent).toEqual([
      { cmd: 'setSpeed', speed: 0.5 },
      { cmd: 'setSpeed', speed: 1 },
      { cmd: 'setSpeed', speed: 2 },
      { cmd: 'setSpeed', speed: 5 },
      { cmd: 'setSpeed', speed: 10 },
    ]);
  });

  it('marks the speed the store holds', () => {
    click(button('5x'));
    expect(button('5x').getAttribute('aria-pressed')).toBe('true');
    expect(button('1x').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('force stale', () => {
  it('sends setStalling on and off', () => {
    const toggle = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!toggle) throw new Error('no force-stale toggle');
    click(toggle);
    click(toggle);
    expect(sent).toEqual([
      { cmd: 'setStalling', stalling: true },
      { cmd: 'setStalling', stalling: false },
    ]);
  });
});

describe('beat list', () => {
  it('lists every beat of the picked scenario with its time and note', () => {
    expect(beatButtons().map((b) => b.textContent)).toEqual([
      '0:00Quiet floor',
      '0:05A report arrives',
      '1:10Findings returned',
    ]);
  });

  it('jumps to the beat clicked', () => {
    const third = beatButtons()[2];
    if (!third) throw new Error('no third beat');
    click(third);
    expect(sent).toEqual([{ cmd: 'jumpToBeat', beat: 2 }]);
  });

  it('tracks snapshot.beat', () => {
    const marked = () => beatButtons().findIndex((b) => b.getAttribute('aria-current') === 'true');
    expect(marked()).toBe(-1);

    act(() => {
      store.onSnapshot(snapshotAt(1));
    });
    expect(marked()).toBe(1);

    act(() => {
      store.onSnapshot(snapshotAt(2));
    });
    expect(marked()).toBe(2);
  });

  it('marks nothing while the snapshot belongs to another scenario', () => {
    act(() => {
      store.onSnapshot(snapshotAt(0, 'scenario-02'));
    });
    expect(beatButtons().some((b) => b.getAttribute('aria-current') === 'true')).toBe(false);
  });

  it('follows the picker to another scenario', () => {
    pickScenario('scenario-02');
    expect(beatButtons().map((b) => b.textContent)).toEqual(['0:00Nothing happens']);
  });
});

describe('readout', () => {
  it('shows connection, seq, beat and age', () => {
    act(() => {
      store.onConnection('open');
      store.onSnapshot(snapshotAt(3));
    });
    const readout = container.querySelector('.dbg-readout')?.textContent ?? '';
    expect(readout).toContain('open');
    expect(readout).toContain('seq4');
    expect(readout).toContain('beat3');
    expect(readout).toMatch(/age\d+\.\d+s/);
  });
});

describe('collapsing', () => {
  it('hides the controls and keeps the readout', () => {
    click(collapseToggle());
    expect(container.querySelector('.dbg-body')).toBeNull();
    expect(container.querySelector('.dbg-readout')).not.toBeNull();
  });

  it('keeps the picked scenario across a collapse', () => {
    pickScenario('scenario-02');
    click(collapseToggle());
    click(collapseToggle());

    expect(container.querySelector('select')?.value).toBe('scenario-02');
    click(button('Start'));
    expect(sent).toEqual([{ cmd: 'start', scenarioId: 'scenario-02' }]);
  });
});
