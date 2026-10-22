import type { Snapshot } from '@fleet/schema';
import { Snapshot as SnapshotSchema } from '@fleet/schema';
import type { State, View } from '../store/index.js';

const files: Record<string, unknown> = import.meta.glob(
  '../../../../fixtures/scenario-01/beat-*.json',
  { eager: true, import: 'default' },
);

/** Test-only: the golden snapshots are the oracle, so tests read the real files. */
export function beat(n: number): Snapshot {
  const name = `beat-${String(n).padStart(2, '0')}.json`;
  const found = Object.entries(files).find(([path]) => path.endsWith(name));
  if (!found) throw new Error(`no fixture ${name}`);
  return SnapshotSchema.parse(found[1]);
}

export function stateOf(snapshot: Snapshot, view: View, selectedId: string | null = null): State {
  return {
    connection: 'open',
    snapshot,
    receivedAt: 0,
    hello: null,
    view,
    selectedId,
    speed: 1,
    running: true,
    stalling: false,
    source: 'fixtures',
  };
}
