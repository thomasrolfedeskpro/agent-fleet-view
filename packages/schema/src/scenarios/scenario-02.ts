import type { Entity, Status } from '../entity.js';
import type { Op, Scenario } from '../scenario.js';

type Seed = Pick<Entity, 'id' | 'kind' | 'type' | 'glyph' | 'label' | 'status'> & Partial<Entity>;

const ent = (e: Seed): Entity => ({
  parentId: null,
  meta: '',
  badges: [],
  hand: false,
  count: null,
  persistent: false,
  pairWith: null,
  links: [],
  ...e,
});

const linear = (id: string) => [
  { label: `Linear ${id}`, href: `https://linear.app/deskpro/issue/${id}` },
];

const INSTANCES = 10;
const SLOTS = 6;

const REGIONS = ['eu-west-1a', 'eu-west-1b', 'eu-west-1c', 'eu-west-2a', 'us-east-1b'];
/** Seven of them against sixty pairs, so a recycled slot never lands back on its own ref. */
const REFS = [
  'master',
  'release-5.4',
  'release-5.3',
  'master',
  'release-5.5',
  'master',
  'release-5.4',
];

/**
 * Which pairs end up in trouble, waiting, or restarted, picked by hand so the floor reads as a
 * busy afternoon rather than a pattern: no two faults on one instance, nothing in a row.
 */
const FAULTY = [7, 21, 38, 52];
const PAUSED = [3, 16, 25, 41, 55];
const RECYCLED = [12, 29, 44, 57];
const LATE_FAULT = 38;

const FAULTS = ['build failed', 'tests failed', 'sandbox lost', 'merge conflict'];

const WAVES = [
  [1, 2, 3, 4],
  [5, 6, 7],
  [8, 9, 10],
];

const slots = Array.from({ length: SLOTS }, (_, slot) => slot);

const pad = (n: number) => String(n).padStart(2, '0');
const instanceId = (instance: number) => `ec2-${pad(instance)}`;
const sandboxId = (instance: number, slot: number) => `sandbox-${pad(instance)}-${slot + 1}`;
const agentId = (instance: number, slot: number) => `jim-${pad(instance)}-${slot + 1}`;

/** Position in spawn order across the whole floor, so every pair gets its own ref and story. */
const pairIndex = (instance: number, slot: number) => (instance - 1) * SLOTS + slot;

const regionOf = (instance: number) => REGIONS[(instance - 1) % REGIONS.length]!;
const refOf = (index: number) => REFS[index % REFS.length]!;
const storyOf = (index: number) => (index % 5 === 4 ? `SR-${410 + index}` : `PDEV-${620 + index}`);

const instanceMeta = (instance: number, taken: number) =>
  `${regionOf(instance)} · ${taken} of ${SLOTS} slots`;

function instanceEntity(instance: number): Entity {
  return ent({
    id: instanceId(instance),
    kind: 'infrastructure',
    type: 'ec2',
    glyph: 'rack',
    label: `Cloud instance · ${instanceId(instance)}`,
    meta: instanceMeta(instance, 0),
    status: 'initializing',
    links: [{ label: 'AWS console', href: 'https://console.aws.amazon.com/ec2' }],
  });
}

function sandboxEntity(instance: number, slot: number): Entity {
  const index = pairIndex(instance, slot);
  return ent({
    id: sandboxId(instance, slot),
    kind: 'runtime',
    type: 'sandbox',
    glyph: 'box',
    label: `sandbox · ${refOf(index)}`,
    meta: 'cloning',
    status: 'initializing',
    parentId: instanceId(instance),
    pairWith: agentId(instance, slot),
  });
}

function agentEntity(instance: number, slot: number): Entity {
  const index = pairIndex(instance, slot);
  return ent({
    id: agentId(instance, slot),
    kind: 'agent',
    type: 'jim',
    glyph: 'agent',
    label: `Jim · ${storyOf(index)}`,
    meta: 'claiming a slot',
    status: 'initializing',
    parentId: instanceId(instance),
    pairWith: sandboxId(instance, slot),
    links: linear(storyOf(index)),
  });
}

function settledStatus(index: number): Status {
  if (index === LATE_FAULT) return 'working';
  if (FAULTY.includes(index)) return 'error';
  if (PAUSED.includes(index)) return 'idle';
  return 'working';
}

function faultOf(index: number): string {
  return FAULTS[FAULTY.indexOf(index)]!;
}

function settledAgent(index: number): Partial<Entity> {
  const status = settledStatus(index);
  if (status === 'error') {
    return { status, hand: true, meta: faultOf(index), badges: [faultOf(index)] };
  }
  if (status === 'idle') return { status, meta: 'review posted', badges: ['review'] };
  return { status, meta: 'fix · test · review', badges: ['fix'] };
}

const requestWave = (wave: number[]): Op[] =>
  wave.map((instance) => ({ op: 'add', entity: instanceEntity(instance) }));

const fillWave = (wave: number[]): Op[] =>
  wave.flatMap((instance) => [
    {
      op: 'patch',
      id: instanceId(instance),
      set: { status: 'working', meta: instanceMeta(instance, SLOTS) },
    },
    ...slots.flatMap((slot): Op[] => [
      { op: 'add', entity: sandboxEntity(instance, slot) },
      { op: 'add', entity: agentEntity(instance, slot) },
    ]),
  ]);

const settleWave = (wave: number[]): Op[] =>
  wave.flatMap((instance) =>
    slots.flatMap((slot): Op[] => [
      {
        op: 'patch',
        id: sandboxId(instance, slot),
        set: { status: 'working', meta: 'seeded · one ref' },
      },
      { op: 'patch', id: agentId(instance, slot), set: settledAgent(pairIndex(instance, slot)) },
    ]),
  );

const locate = (index: number) => ({
  instance: Math.floor(index / SLOTS) + 1,
  slot: index % SLOTS,
});

/** A finished pair hands its slot to the next story; the slot itself never moves. */
const recycle = (index: number): Op[] => {
  const { instance, slot } = locate(index);
  const next = index + INSTANCES * SLOTS;
  return [
    {
      op: 'patch',
      id: sandboxId(instance, slot),
      set: { status: 'initializing', label: `sandbox · ${refOf(next)}`, meta: 'cloning' },
    },
    {
      op: 'patch',
      id: agentId(instance, slot),
      set: {
        status: 'initializing',
        label: `Jim · ${storyOf(next)}`,
        meta: 'claiming a slot',
        badges: [],
        links: linear(storyOf(next)),
      },
    },
  ];
};

const lateFault = (index: number): Op[] => {
  const { instance, slot } = locate(index);
  return [
    {
      op: 'patch',
      id: agentId(instance, slot),
      set: { status: 'error', hand: true, meta: faultOf(index), badges: [faultOf(index)] },
    },
  ];
};

/**
 * Ten instances at capacity, a hundred and thirty-seven things on the floor. Where scenario-01
 * is one story told slowly, this is the density case: it exists to show that the summary strip
 * and the raised hand still find four faults among sixty pairs.
 */
export const scenario02: Scenario = {
  id: 'scenario-02',
  title: 'A busy afternoon',
  beats: [
    {
      at: 0,
      note: 'Quiet floor',
      ops: [
        {
          op: 'add',
          entity: ent({
            id: 'vdp',
            kind: 'source',
            type: 'vdp',
            glyph: 'tray',
            label: 'VDP intake',
            meta: 'security reports',
            status: 'idle',
            persistent: true,
            count: 0,
            links: [{ label: 'VDP queue', href: 'https://example.internal/vdp' }],
          }),
        },
        {
          op: 'add',
          entity: ent({
            id: 'linear',
            kind: 'source',
            type: 'linear',
            glyph: 'tray',
            label: 'Linear',
            meta: 'assigned stories',
            status: 'idle',
            persistent: true,
            count: 0,
            links: [{ label: 'Triage view', href: 'https://linear.app/deskpro' }],
          }),
        },
        {
          op: 'add',
          entity: ent({
            id: 'cp',
            kind: 'infrastructure',
            type: 'control-plane',
            glyph: 'hub',
            label: 'Control plane',
            meta: 'queues · schedules · records',
            status: 'working',
            persistent: true,
            links: [{ label: 'Admin', href: 'https://example.internal/control-plane' }],
          }),
        },
        {
          op: 'add',
          entity: ent({
            id: 'gateway',
            kind: 'infrastructure',
            type: 'model-gateway',
            glyph: 'gateway',
            label: 'Model gateway',
            meta: 'bedrock · the only way out',
            status: 'working',
            persistent: true,
          }),
        },
      ],
    },
    {
      at: 6,
      note: 'The afternoon queue builds',
      ops: [
        { op: 'patch', id: 'linear', set: { count: 14, status: 'working' } },
        { op: 'patch', id: 'vdp', set: { count: 3, status: 'working' } },
      ],
    },
    { at: 12, note: 'Four instances requested', ops: requestWave(WAVES[0]!) },
    { at: 20, note: 'Four instances fill', ops: fillWave(WAVES[0]!) },
    { at: 28, note: 'Three more instances requested', ops: requestWave(WAVES[1]!) },
    { at: 34, note: 'Work starts on the first four', ops: settleWave(WAVES[0]!) },
    { at: 40, note: 'The middle three fill', ops: fillWave(WAVES[1]!) },
    { at: 48, note: 'The last three requested', ops: requestWave(WAVES[2]!) },
    { at: 54, note: 'Work starts on the middle three', ops: settleWave(WAVES[1]!) },
    { at: 60, note: 'The last three fill', ops: fillWave(WAVES[2]!) },
    { at: 68, note: 'Work starts on the last three', ops: settleWave(WAVES[2]!) },
    {
      at: 74,
      note: 'A finding needs an untrusted zone',
      ops: [
        {
          op: 'add',
          entity: ent({
            id: 'vera-inst',
            kind: 'infrastructure',
            type: 'isolated-instance',
            glyph: 'shield',
            label: 'Untrusted zone',
            meta: 'one locked-down instance per finding',
            status: 'initializing',
          }),
        },
      ],
    },
    {
      at: 80,
      note: 'Vera pair comes up',
      ops: [
        { op: 'patch', id: 'vera-inst', set: { status: 'working' } },
        {
          op: 'add',
          entity: ent({
            id: 'vera-app',
            kind: 'runtime',
            type: 'app-instance',
            glyph: 'box',
            label: 'app · VDP-91',
            meta: 'cloning',
            status: 'initializing',
            parentId: 'vera-inst',
            pairWith: 'vera',
          }),
        },
        {
          op: 'add',
          entity: ent({
            id: 'vera',
            kind: 'agent',
            type: 'vera',
            glyph: 'agent',
            label: 'Vera · VDP-91',
            meta: 'claiming a slot',
            status: 'initializing',
            parentId: 'vera-inst',
            pairWith: 'vera-app',
          }),
        },
      ],
    },
    {
      at: 86,
      note: 'Vera reproduces VDP-91',
      ops: [
        { op: 'patch', id: 'vera-app', set: { status: 'working', meta: 'seeded · one ref' } },
        {
          op: 'patch',
          id: 'vera',
          set: { status: 'working', meta: 'reproducing', badges: ['reproducing'] },
        },
      ],
    },
    { at: 94, note: 'A long build fails on ec2-07', ops: lateFault(LATE_FAULT) },
    {
      at: 102,
      note: 'Four slots recycle',
      ops: RECYCLED.flatMap((index) => recycle(index)),
    },
    {
      at: 110,
      note: 'The review queue moves',
      ops: [
        { op: 'patch', id: 'linear', set: { count: 9 } },
        { op: 'patch', id: 'vdp', set: { count: 2 } },
      ],
    },
    { at: 118, note: 'Hold', ops: [] },
  ],
};
