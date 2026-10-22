import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ClientCommand, Snapshot } from '@fleet/schema';
import { ServerMessage } from '@fleet/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { type FleetServer, startServer } from './server.js';

const TEST_TICK_MS = 40;

function goldenBeatZero(): Snapshot {
  const path = join(
    import.meta.dirname,
    '..',
    '..',
    '..',
    'fixtures',
    'scenario-01',
    'beat-00.json',
  );
  return JSON.parse(readFileSync(path, 'utf8'));
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntil(predicate: () => boolean, label: string, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await sleep(5);
  }
}

type TestClient = {
  messages: ServerMessage[];
  snapshots(): Snapshot[];
  send(command: ClientCommand): void;
  sendRaw(text: string): void;
  isOpen(): boolean;
  close(): Promise<void>;
};

function connect(url: string): Promise<TestClient> {
  const socket = new WebSocket(url);
  const messages: ServerMessage[] = [];
  socket.on('message', (raw) => {
    messages.push(ServerMessage.parse(JSON.parse(raw.toString())));
  });

  return new Promise<TestClient>((resolve, reject) => {
    socket.once('error', reject);
    socket.once('open', () => {
      socket.on('error', () => {});
      resolve({
        messages,
        snapshots: () => messages.flatMap((m) => (m.type === 'snapshot' ? [m.snapshot] : [])),
        send: (command) => socket.send(JSON.stringify(command)),
        sendRaw: (text) => socket.send(text),
        isOpen: () => socket.readyState === WebSocket.OPEN,
        close: () =>
          new Promise<void>((done) => {
            if (socket.readyState === WebSocket.CLOSED) return done();
            socket.once('close', () => done());
            socket.close();
          }),
      });
    });
  });
}

describe('fleet server', () => {
  let server: FleetServer;
  const clients: TestClient[] = [];

  const open = async (): Promise<TestClient> => {
    const client = await connect(server.url);
    clients.push(client);
    return client;
  };

  const started = async (): Promise<TestClient> => {
    const client = await open();
    await waitUntil(() => client.messages.length > 0, 'hello');
    client.send({ cmd: 'start', scenarioId: 'scenario-01' });
    await waitUntil(() => client.snapshots().length >= 2, 'the stream to run');
    return client;
  };

  beforeEach(async () => {
    server = await startServer({ port: 0, tickMs: TEST_TICK_MS });
  });

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.close()));
    await server.close();
  });

  it('sends hello with the tick interval and the scenario list on connect', async () => {
    const client = await open();

    await waitUntil(() => client.messages.length > 0, 'hello');

    expect(client.messages[0]).toMatchObject({
      type: 'hello',
      v: 1,
      tickMs: TEST_TICK_MS,
      scenarios: [{ id: 'scenario-01', title: 'A VDP report through Tess, Vera and Jim' }],
    });
  });

  it('refuses a connection on any other path', async () => {
    await expect(connect(`ws://localhost:${server.port}/nope`)).rejects.toThrow();
  });

  it('emits no snapshots until a scenario is started', async () => {
    const client = await open();
    await waitUntil(() => client.messages.length > 0, 'hello');

    await sleep(TEST_TICK_MS * 5);

    expect(client.snapshots()).toHaveLength(0);
  });

  it('streams the scenario from its first beat, numbering each message', async () => {
    const client = await started();
    await waitUntil(() => client.snapshots().length >= 3, 'three snapshots');

    const snapshots = client.snapshots();

    expect(snapshots[0]).toMatchObject({ v: 1, scenarioId: 'scenario-01', beat: 0, elapsedMs: 0 });
    expect(snapshots[0]?.entities).toEqual(goldenBeatZero().entities);
    for (const [index, snapshot] of snapshots.entries()) expect(snapshot.seq).toBe(index + 1);
  });

  it('emits faster when the speed goes up', async () => {
    const client = await started();

    const beforeBaseline = client.snapshots().length;
    await sleep(TEST_TICK_MS * 8);
    const atOneX = client.snapshots().length - beforeBaseline;

    client.send({ cmd: 'setSpeed', speed: 5 });
    await sleep(TEST_TICK_MS);
    const beforeFast = client.snapshots().length;
    await sleep(TEST_TICK_MS * 8);
    const atFiveX = client.snapshots().length - beforeFast;

    expect(atOneX).toBeGreaterThanOrEqual(3);
    expect(atFiveX).toBeGreaterThan(atOneX * 2);
  });

  it('halts on pause and restarts on resume', async () => {
    const client = await started();

    client.send({ cmd: 'pause' });
    await sleep(TEST_TICK_MS * 2);
    const whilePaused = client.snapshots().length;
    await sleep(TEST_TICK_MS * 6);

    expect(client.snapshots()).toHaveLength(whilePaused);

    client.send({ cmd: 'resume' });
    await waitUntil(() => client.snapshots().length > whilePaused, 'the stream to restart');
  });

  it('stops emitting while stalling, with the socket still open', async () => {
    const client = await started();

    client.send({ cmd: 'setStalling', stalling: true });
    await sleep(TEST_TICK_MS * 2);
    const whileStalling = client.snapshots().length;
    await sleep(TEST_TICK_MS * 6);

    expect(client.snapshots()).toHaveLength(whileStalling);
    expect(client.isOpen()).toBe(true);

    client.send({ cmd: 'setStalling', stalling: false });
    await waitUntil(() => client.snapshots().length > whileStalling, 'the stream to resume');
  });

  it('makes a jumped-to beat the next one sent', async () => {
    const client = await started();
    client.send({ cmd: 'pause' });
    await sleep(TEST_TICK_MS * 2);
    const mark = client.snapshots().length;

    client.send({ cmd: 'jumpToBeat', beat: 12 });
    client.send({ cmd: 'resume' });
    await waitUntil(() => client.snapshots().length > mark + 1, 'snapshots after the jump');

    expect(client.snapshots()[mark]).toMatchObject({ beat: 12, elapsedMs: 84_000 });
    expect(client.snapshots()[mark + 1]?.beat).toBeGreaterThanOrEqual(12);
  });

  it('rewinds to the start on reset without stopping the stream', async () => {
    const client = await started();
    client.send({ cmd: 'jumpToBeat', beat: 12 });
    await waitUntil(() => client.snapshots().some((s) => s.beat === 12), 'the jump to land');
    const mark = client.snapshots().length;

    client.send({ cmd: 'reset' });
    await waitUntil(
      () =>
        client
          .snapshots()
          .slice(mark)
          .some((s) => s.beat === 0),
      'the rewind',
    );

    const after = client.snapshots().length;
    await waitUntil(() => client.snapshots().length > after, 'the stream to keep running');
  });

  it('broadcasts one stream to every connected client', async () => {
    const a = await open();
    const b = await open();
    await waitUntil(() => a.messages.length > 0 && b.messages.length > 0, 'both hellos');

    a.send({ cmd: 'start', scenarioId: 'scenario-01' });
    await waitUntil(() => a.snapshots().length >= 3 && b.snapshots().length >= 3, 'both streams');

    expect(b.snapshots().slice(0, 3)).toEqual(a.snapshots().slice(0, 3));
  });

  it('ignores anything that is not a valid command', async () => {
    const client = await started();
    const mark = client.snapshots().length;

    client.sendRaw('not json at all');
    client.sendRaw('{"cmd":"bogus"}');
    client.sendRaw('{"cmd":"setSpeed"}');
    client.send({ cmd: 'setSpeed', speed: 0 });
    client.send({ cmd: 'start', scenarioId: 'no-such-scenario' });

    await waitUntil(() => client.snapshots().length > mark + 2, 'the stream to survive');
    expect(client.isOpen()).toBe(true);
  });
});
