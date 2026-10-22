import type { ClientCommand, Hello, Snapshot } from '@fleet/schema';

export type View = { mode: 'overview' } | { mode: 'inside'; containerId: string };
export type Connection = 'connecting' | 'open' | 'closed';
export type Source = 'fixtures' | 'live';

export type State = {
  connection: Connection;
  /** The last snapshot received. The whole floor is drawn from this and nothing else. */
  snapshot: Snapshot | null;
  /** performance.now() when it arrived. Freshness is measured from here, never from a clock diff. */
  receivedAt: number | null;
  hello: Hello | null;
  view: View;
  selectedId: string | null;
  speed: number;
  running: boolean;
  stalling: boolean;
  source: Source;
};

export type Sender = (command: ClientCommand) => void;
