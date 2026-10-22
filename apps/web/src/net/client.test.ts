import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { store } from '../store/index.js';
import { createLiveClient } from './client.js';

class FakeSocket {
  static created: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  constructor(readonly url: string) {
    FakeSocket.created.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.drop();
  }

  accept(): void {
    this.readyState = 1;
    this.onopen?.(null);
  }

  deliver(data: unknown): void {
    this.onmessage?.({ data });
  }

  drop(): void {
    this.readyState = 3;
    this.onclose?.(null);
  }
}

const openSocket = (url: string): WebSocket => new FakeSocket(url) as unknown as WebSocket;

const sockets = (): FakeSocket[] => FakeSocket.created;
const latest = (): FakeSocket => {
  const socket = FakeSocket.created.at(-1);
  if (!socket) throw new Error('no socket was opened');
  return socket;
};

const hello = {
  type: 'hello',
  v: 1,
  tickMs: 1000,
  scenarios: [{ id: 'scenario-01', title: 'VDP report', beats: [{ at: 0, note: 'start' }] }],
};

const snapshot = {
  v: 1,
  seq: 7,
  sentAt: '2026-01-01T00:00:07.000Z',
  scenarioId: 'scenario-01',
  beat: 7,
  elapsedMs: 7000,
  entities: [
    {
      id: 'cp',
      kind: 'infrastructure',
      type: 'control-plane',
      parentId: null,
      label: 'Control plane',
      status: 'working',
    },
  ],
};

let client: ReturnType<typeof createLiveClient> | undefined;

function start(options: Parameters<typeof createLiveClient>[0] = {}): void {
  client = createLiveClient({ url: 'ws://test/stream', openSocket, ...options });
  client.connect();
}

beforeEach(() => {
  FakeSocket.created = [];
  store.reset();
  vi.useFakeTimers();
});

afterEach(() => {
  client?.disconnect();
  client = undefined;
  vi.useRealTimers();
});

describe('connection', () => {
  test('dials the given url and reports connecting then open', () => {
    start();
    expect(latest().url).toBe('ws://test/stream');
    expect(store.getState().connection).toBe('connecting');

    latest().accept();
    expect(store.getState().connection).toBe('open');
  });

  test('connect is idempotent', () => {
    start();
    client?.connect();
    expect(sockets()).toHaveLength(1);
  });

  test('disconnect closes the socket and stops retrying', () => {
    start();
    latest().accept();

    client?.disconnect();
    expect(store.getState().connection).toBe('closed');

    vi.advanceTimersByTime(60_000);
    expect(sockets()).toHaveLength(1);
  });
});

describe('messages', () => {
  test('a hello and a snapshot reach the store', () => {
    start();
    latest().accept();

    latest().deliver(JSON.stringify(hello));
    expect(store.getState().hello?.tickMs).toBe(1000);

    latest().deliver(JSON.stringify({ type: 'snapshot', snapshot }));
    expect(store.getState().snapshot?.seq).toBe(7);
    expect(store.getState().receivedAt).not.toBeNull();
  });

  test('anything the contract does not describe is dropped', () => {
    start();
    latest().accept();
    latest().deliver(JSON.stringify({ type: 'snapshot', snapshot }));

    latest().deliver('not json at all');
    latest().deliver(JSON.stringify({ type: 'snapshot', snapshot: { v: 1, seq: 'eight' } }));
    latest().deliver(JSON.stringify({ type: 'something-else' }));
    latest().deliver(new ArrayBuffer(4));

    expect(store.getState().snapshot?.seq).toBe(7);
  });

  test('a socket replaced by a reconnect stops being listened to', () => {
    start({ minDelayMs: 100 });
    const stale = latest();
    stale.accept();
    stale.drop();

    vi.advanceTimersByTime(100);
    latest().accept();

    stale.deliver(JSON.stringify({ type: 'snapshot', snapshot }));
    expect(store.getState().snapshot).toBeNull();
  });
});

describe('reconnect', () => {
  test('backs off, doubles, caps, and resets once a socket opens', () => {
    start({ minDelayMs: 100, maxDelayMs: 400 });
    latest().accept();

    latest().drop();
    expect(store.getState().connection).toBe('closed');

    vi.advanceTimersByTime(99);
    expect(sockets()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets()).toHaveLength(2);
    expect(store.getState().connection).toBe('connecting');

    latest().drop();
    vi.advanceTimersByTime(199);
    expect(sockets()).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(sockets()).toHaveLength(3);

    latest().drop();
    vi.advanceTimersByTime(399);
    expect(sockets()).toHaveLength(3);
    vi.advanceTimersByTime(1);
    expect(sockets()).toHaveLength(4);

    latest().drop();
    vi.advanceTimersByTime(400);
    expect(sockets()).toHaveLength(5);

    latest().accept();
    latest().drop();
    vi.advanceTimersByTime(100);
    expect(sockets()).toHaveLength(6);
  });
});

describe('send', () => {
  test('serialises a command over an open socket', () => {
    start();
    latest().accept();

    client?.send({ cmd: 'start', scenarioId: 'scenario-01' });
    expect(latest().sent).toEqual(['{"cmd":"start","scenarioId":"scenario-01"}']);
  });

  test('drops a command when the socket is not open', () => {
    start();
    client?.send({ cmd: 'pause' });
    expect(latest().sent).toEqual([]);

    latest().accept();
    latest().drop();
    client?.send({ cmd: 'pause' });
    expect(sockets().flatMap((s) => s.sent)).toEqual([]);
  });
});
