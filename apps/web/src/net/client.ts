import type { ClientCommand } from '@fleet/schema';
import { ServerMessage } from '@fleet/schema';
import { store } from '../store/index.js';
import type { FleetClient } from './types.js';
import { WS_URL } from './types.js';

export const RECONNECT_MIN_MS = 500;
export const RECONNECT_MAX_MS = 10_000;

export type LiveClientOptions = {
  url?: string;
  /** Injected so a test can drive the socket without a server listening. */
  openSocket?: (url: string) => WebSocket;
  minDelayMs?: number;
  maxDelayMs?: number;
};

/**
 * Talks to the server over a WebSocket and pushes what it hears into the store. Anything the
 * contract does not describe is dropped rather than guessed at: a page that renders a malformed
 * snapshot is worse than one that keeps showing the last good state and ages it.
 */
export function createLiveClient(options: LiveClientOptions = {}): FleetClient {
  const url = options.url ?? WS_URL;
  const openSocket = options.openSocket ?? ((target: string) => new WebSocket(target));
  const minDelayMs = options.minDelayMs ?? RECONNECT_MIN_MS;
  const maxDelayMs = options.maxDelayMs ?? RECONNECT_MAX_MS;

  let socket: WebSocket | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let delayMs = minDelayMs;
  let wanted = false;

  function receive(data: unknown): void {
    if (typeof data !== 'string') return;
    let raw: unknown;
    try {
      raw = JSON.parse(data);
    } catch {
      return;
    }
    const message = ServerMessage.safeParse(raw);
    if (!message.success) return;
    if (message.data.type === 'hello') store.onHello(message.data);
    else store.onSnapshot(message.data.snapshot);
  }

  function scheduleRetry(): void {
    if (!wanted || retry) return;
    const wait = delayMs;
    delayMs = Math.min(delayMs * 2, maxDelayMs);
    retry = setTimeout(() => {
      retry = undefined;
      if (wanted) dial();
    }, wait);
  }

  function dial(): void {
    const ws = openSocket(url);
    socket = ws;
    store.onConnection('connecting');

    ws.onopen = () => {
      if (socket !== ws) return;
      delayMs = minDelayMs;
      store.onConnection('open');
    };
    ws.onmessage = (event) => {
      if (socket !== ws) return;
      receive(event.data);
    };
    ws.onclose = () => {
      if (socket !== ws) return;
      socket = undefined;
      store.onConnection('closed');
      scheduleRetry();
    };
  }

  function detach(ws: WebSocket): void {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    ws.onerror = null;
  }

  return {
    connect(): void {
      if (wanted) return;
      wanted = true;
      delayMs = minDelayMs;
      dial();
    },
    disconnect(): void {
      wanted = false;
      if (retry) clearTimeout(retry);
      retry = undefined;
      const ws = socket;
      socket = undefined;
      if (ws) {
        detach(ws);
        ws.close();
      }
      store.onConnection('closed');
    },
    send(command: ClientCommand): void {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify(command));
    },
  };
}
