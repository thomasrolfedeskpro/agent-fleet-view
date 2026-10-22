import type { ClientCommand } from '@fleet/schema';

/**
 * Both clients look the same to the app: the mock replays fixtures over HTTP, the real one
 * holds a WebSocket. Whichever is active registers its sender with the store.
 */
export type FleetClient = {
  connect(): void;
  disconnect(): void;
  send(command: ClientCommand): void;
};

export const WS_URL = 'ws://localhost:8787/stream';
