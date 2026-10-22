import type { Hello, ServerMessage } from '@fleet/schema';
import { ClientCommand, TICK_MS } from '@fleet/schema';
import { WebSocket, WebSocketServer } from 'ws';
import { createFixtureSource } from './fixtureSource.js';
import { PATH, PORT, type SnapshotSource } from './types.js';

export type FleetServer = {
  port: number;
  url: string;
  close(): Promise<void>;
};

export type ServerOptions = {
  /** 0 asks the OS for a free port, which is how the tests avoid colliding. */
  port?: number;
  source?: SnapshotSource;
  tickMs?: number;
};

function parseCommand(raw: string): ClientCommand | undefined {
  try {
    const result = ClientCommand.safeParse(JSON.parse(raw));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

export function startServer(options: ServerOptions = {}): Promise<FleetServer> {
  const source = options.source ?? createFixtureSource();
  const tickMs = options.tickMs ?? TICK_MS;
  const wss = new WebSocketServer({ port: options.port ?? PORT, path: PATH });

  let running = false;
  let stalling = false;
  let speed = 1;
  let seq = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  const broadcast = (message: ServerMessage): void => {
    const data = JSON.stringify(message);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    }
  };

  const tick = (): void => {
    if (stalling) return;
    seq += 1;
    broadcast({ type: 'snapshot', snapshot: { ...source.next(tickMs), seq } });
  };

  const stopTicking = (): void => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  };

  const startTicking = (): void => {
    stopTicking();
    timer = setInterval(tick, tickMs / speed);
  };

  const handle = (command: ClientCommand): void => {
    switch (command.cmd) {
      case 'start': {
        if (!source.listScenarios().some((meta) => meta.id === command.scenarioId)) return;
        source.start(command.scenarioId);
        running = true;
        startTicking();
        return;
      }
      case 'pause':
        running = false;
        stopTicking();
        return;
      case 'resume':
        running = true;
        startTicking();
        return;
      case 'reset':
        // A rewind only: the store tracks running itself and no command tells it otherwise.
        source.reset();
        return;
      case 'setSpeed': {
        if (!Number.isFinite(command.speed) || command.speed <= 0) return;
        speed = command.speed;
        if (running) startTicking();
        return;
      }
      case 'jumpToBeat':
        source.jumpToBeat(command.beat);
        return;
      case 'setStalling':
        stalling = command.stalling;
        return;
    }
  };

  wss.on('connection', (socket) => {
    // An unhandled socket error event would take the whole process down.
    socket.on('error', () => {});
    const hello: Hello = {
      type: 'hello',
      v: 1,
      tickMs,
      scenarios: source.listScenarios(),
    };
    socket.send(JSON.stringify(hello));
    socket.on('message', (raw) => {
      const command = parseCommand(raw.toString());
      if (command) handle(command);
    });
  });

  const close = (): Promise<void> =>
    new Promise((resolve, reject) => {
      stopTicking();
      for (const client of wss.clients) client.terminate();
      wss.close((error) => (error ? reject(error) : resolve()));
    });

  return new Promise((resolve, reject) => {
    wss.once('error', reject);
    wss.once('listening', () => {
      const address = wss.address();
      const port = address && typeof address !== 'string' ? address.port : (options.port ?? PORT);
      resolve({ port, url: `ws://localhost:${port}${PATH}`, close });
    });
  });
}
