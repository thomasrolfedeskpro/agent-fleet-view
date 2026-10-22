import type { ClientCommand, Hello, Snapshot } from '@fleet/schema';

export type Connection = 'connecting' | 'open' | 'closed';
export type Source = 'fixtures' | 'live';

/** The floor is one level, so finding something is filtering rather than navigating. */
export type Filter = { text: string; needsPerson: boolean };

export type State = {
  connection: Connection;
  /** The last snapshot received. The whole floor is drawn from this and nothing else. */
  snapshot: Snapshot | null;
  /** performance.now() when it arrived. Freshness is measured from here, never from a clock diff. */
  receivedAt: number | null;
  hello: Hello | null;
  /** Narrows both the floor and the list. Empty means everything. */
  filter: Filter;
  selectedId: string | null;
  speed: number;
  running: boolean;
  stalling: boolean;
  source: Source;
};

export type Sender = (command: ClientCommand) => void;
