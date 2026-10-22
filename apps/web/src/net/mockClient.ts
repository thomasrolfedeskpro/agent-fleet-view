import type { ClientCommand, ScenarioMeta, Snapshot } from '@fleet/schema';
import { Snapshot as SnapshotSchema, TICK_MS } from '@fleet/schema';
import { store } from '../store/index.js';
import type { FleetClient } from './types.js';

type Manifest = ScenarioMeta & { count: number };

/**
 * Replays the golden fixtures one beat per tick. It is a stand-in so the floor, chrome and
 * debug panel can be built before the server exists — it steps beats rather than scenario
 * seconds, so it is not a model of the real timing. T7 switches the default to the live client.
 */
export function createMockClient(scenarioId = 'scenario-01'): FleetClient {
  let beats: Snapshot[] = [];
  let index = 0;
  let seq = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  const emit = (): void => {
    const snapshot = beats[index];
    if (!snapshot) return;
    seq += 1;
    store.onSnapshot({ ...snapshot, seq, sentAt: new Date().toISOString() });
  };

  const stop = (): void => {
    if (timer) clearInterval(timer);
    timer = undefined;
  };

  const run = (): void => {
    stop();
    const { speed } = store.getState();
    timer = setInterval(() => {
      if (store.getState().stalling) return;
      if (index < beats.length - 1) index += 1;
      emit();
    }, TICK_MS / speed);
  };

  return {
    async connect() {
      store.onConnection('connecting');
      try {
        const manifest: Manifest = await fetch(`/fixtures/${scenarioId}/manifest.json`).then((r) =>
          r.json(),
        );
        const loaded = await Promise.all(
          Array.from({ length: manifest.count }, (_, i) =>
            fetch(`/fixtures/${scenarioId}/beat-${String(i).padStart(2, '0')}.json`).then((r) =>
              r.json(),
            ),
          ),
        );
        beats = loaded.map((raw) => SnapshotSchema.parse(raw));
        store.onHello({
          type: 'hello',
          v: 1,
          tickMs: TICK_MS,
          scenarios: [{ id: manifest.id, title: manifest.title, beats: manifest.beats }],
        });
        store.onConnection('open');
        emit();
      } catch {
        store.onConnection('closed');
      }
    },
    disconnect() {
      stop();
      store.onConnection('closed');
    },
    send(command: ClientCommand) {
      switch (command.cmd) {
        case 'start':
          index = 0;
          emit();
          run();
          break;
        case 'resume':
          run();
          break;
        case 'pause':
          stop();
          break;
        case 'reset':
          index = 0;
          emit();
          break;
        case 'jumpToBeat':
          index = Math.max(0, Math.min(command.beat, beats.length - 1));
          emit();
          break;
        case 'setSpeed':
          if (timer) run();
          break;
        case 'setStalling':
          break;
      }
    },
  };
}
