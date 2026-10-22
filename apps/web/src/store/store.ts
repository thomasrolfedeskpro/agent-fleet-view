import type { ClientCommand, Hello, Snapshot } from '@fleet/schema';
import { TICK_MS } from '@fleet/schema';
import { useSyncExternalStore } from 'react';
import type { Connection, Sender, Source, State, View } from './types.js';

const initial: State = {
  connection: 'connecting',
  snapshot: null,
  receivedAt: null,
  hello: null,
  view: { mode: 'overview' },
  selectedId: null,
  speed: 1,
  running: false,
  stalling: false,
  source: 'fixtures',
};

let state: State = initial;
const listeners = new Set<() => void>();
let sender: Sender = () => {};

function set(patch: Partial<State>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export const store = {
  getState: (): State => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** The active client registers how commands leave the page. */
  registerSender(next: Sender): void {
    sender = next;
  },
  send(command: ClientCommand): void {
    if (command.cmd === 'setSpeed') set({ speed: command.speed });
    if (command.cmd === 'pause') set({ running: false });
    if (command.cmd === 'resume' || command.cmd === 'start') set({ running: true });
    if (command.cmd === 'setStalling') set({ stalling: command.stalling });
    sender(command);
  },
  onConnection(connection: Connection): void {
    set({ connection });
  },
  onHello(hello: Hello): void {
    set({ hello });
  },
  onSnapshot(snapshot: Snapshot): void {
    set({ snapshot, receivedAt: performance.now() });
  },
  select(selectedId: string | null): void {
    set({ selectedId });
  },
  setView(view: View): void {
    set({ view, selectedId: null });
  },
  setSource(source: Source): void {
    set({ source });
  },
  reset(): void {
    state = { ...initial, source: state.source };
    for (const listener of listeners) listener();
  },
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(state),
    () => selector(initial),
  );
}

export const tickMs = (): number => store.getState().hello?.tickMs ?? TICK_MS;
