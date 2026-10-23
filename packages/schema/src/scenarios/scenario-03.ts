import type { Entity } from '../entity.js';
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

const pad = (n: number) => String(n).padStart(2, '0');
const zoneId = (zone: number) => `vera-inst-${pad(zone)}`;
const appId = (zone: number) => `vera-app-${pad(zone)}`;
const veraId = (zone: number) => `vera-${pad(zone)}`;
const reportOf = (zone: number) => `VDP-${900 + zone}`;

const report = (zone: number) => [
  { label: `Report ${reportOf(zone)}`, href: `https://example.internal/vdp/${reportOf(zone)}` },
];

function zoneEntity(zone: number): Entity {
  return ent({
    id: zoneId(zone),
    kind: 'infrastructure',
    type: 'isolated-instance',
    glyph: 'shield',
    label: `Untrusted zone · ${pad(zone)}`,
    meta: `locked down for ${reportOf(zone)}`,
    status: 'initializing',
  });
}

function appEntity(zone: number): Entity {
  return ent({
    id: appId(zone),
    kind: 'runtime',
    type: 'app-instance',
    glyph: 'box',
    label: `app · ${reportOf(zone)}`,
    meta: 'cloning',
    status: 'initializing',
    parentId: zoneId(zone),
    pairWith: veraId(zone),
  });
}

function veraEntity(zone: number): Entity {
  return ent({
    id: veraId(zone),
    kind: 'agent',
    type: 'vera',
    glyph: 'agent',
    label: `Vera · ${reportOf(zone)}`,
    meta: 'claiming a zone',
    status: 'initializing',
    parentId: zoneId(zone),
    pairWith: appId(zone),
    links: report(zone),
  });
}

const request = (zones: number[]): Op[] =>
  zones.map((zone) => ({ op: 'add', entity: zoneEntity(zone) }));

const fill = (zones: number[]): Op[] =>
  zones.flatMap((zone): Op[] => [
    { op: 'patch', id: zoneId(zone), set: { status: 'working' } },
    { op: 'add', entity: appEntity(zone) },
    { op: 'add', entity: veraEntity(zone) },
  ]);

const reproduce = (zones: number[]): Op[] =>
  zones.flatMap((zone): Op[] => [
    { op: 'patch', id: appId(zone), set: { status: 'working', meta: 'seeded · one ref' } },
    {
      op: 'patch',
      id: veraId(zone),
      set: { status: 'working', meta: 'reproducing', badges: ['reproducing'] },
    },
  ]);

const findingsReturned = (zone: number): Op[] => [
  {
    op: 'patch',
    id: veraId(zone),
    set: { status: 'idle', meta: 'findings returned', badges: ['report ready'] },
  },
];

/** Nothing reproduced, so the zone stops and waits for a person to call it. */
const cannotReproduce = (zone: number): Op[] => [
  {
    op: 'patch',
    id: veraId(zone),
    set: { status: 'idle', hand: true, meta: 'could not reproduce', badges: ['needs a call'] },
  },
];

const cloneFailed = (zone: number): Op[] => [
  { op: 'patch', id: appId(zone), set: { status: 'error', meta: 'clone failed' } },
  {
    op: 'patch',
    id: zoneId(zone),
    set: { status: 'error' },
  },
  {
    op: 'patch',
    id: veraId(zone),
    set: { status: 'error', hand: true, meta: 'no app to work on', badges: ['clone failed'] },
  },
];

const destroy = (zone: number): Op[] => [
  { op: 'remove', id: veraId(zone) },
  { op: 'remove', id: appId(zone) },
  { op: 'remove', id: zoneId(zone) },
];

const fixPair = (slot: number): Op[] => {
  const story = `PDEV-${540 + slot}`;
  return [
    {
      op: 'add',
      entity: ent({
        id: `sandbox-${slot}`,
        kind: 'runtime',
        type: 'sandbox',
        glyph: 'box',
        label: 'sandbox · master',
        meta: 'cloning',
        status: 'initializing',
        parentId: 'ec2-1',
        pairWith: `jim-${slot}`,
      }),
    },
    {
      op: 'add',
      entity: ent({
        id: `jim-${slot}`,
        kind: 'agent',
        type: 'jim',
        glyph: 'agent',
        label: `Jim · ${story}`,
        meta: 'claiming a slot',
        status: 'initializing',
        parentId: 'ec2-1',
        pairWith: `sandbox-${slot}`,
        links: [{ label: `Linear ${story}`, href: `https://linear.app/deskpro/issue/${story}` }],
      }),
    },
  ];
};

const fixPairWorking = (slot: number): Op[] => [
  { op: 'patch', id: `sandbox-${slot}`, set: { status: 'working', meta: 'seeded · one ref' } },
  {
    op: 'patch',
    id: `jim-${slot}`,
    set: { status: 'working', meta: 'fix · test · review', badges: ['fix'] },
  },
];

/**
 * Seven security reports triaged in parallel. Where scenario-01 opens one untrusted zone and
 * closes it again, this is the fan-out case: six zones stand side by side at the peak, each
 * locked down for its own report, and they are torn down and replaced out of step with one
 * another. The ordinary fix host at the end is there for contrast — a sandbox and a zone are
 * both ephemeral, and the floor has to say which is which at a glance.
 */
export const scenario03: Scenario = {
  id: 'scenario-03',
  title: 'Seven reports at once',
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
            links: [{ label: 'Linear team', href: 'https://linear.app/deskpro/team/PDEV' }],
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
      note: 'Six reports land together',
      ops: [
        { op: 'patch', id: 'vdp', set: { count: 6, status: 'working' } },
        {
          op: 'add',
          entity: ent({
            id: 'tess',
            kind: 'agent',
            type: 'tess',
            glyph: 'agent',
            label: 'Tess · intake',
            meta: 'sorting six reports',
            status: 'working',
            parentId: 'cp',
          }),
        },
      ],
    },
    {
      at: 12,
      note: 'Tess opens the batch',
      ops: [
        { op: 'patch', id: 'tess', set: { meta: 'six zones to raise', badges: ['batch of 6'] } },
      ],
    },
    { at: 18, note: 'Four zones requested', ops: request([1, 2, 3, 4]) },
    { at: 26, note: 'Four zones come up', ops: fill([1, 2, 3, 4]) },
    { at: 32, note: 'Two more zones requested', ops: request([5, 6]) },
    { at: 38, note: 'The first four reproduce', ops: reproduce([1, 2, 3, 4]) },
    { at: 44, note: 'All six zones are up', ops: fill([5, 6]) },
    { at: 52, note: 'A clone fails in zone 03', ops: cloneFailed(3) },
    { at: 58, note: 'The last two reproduce', ops: reproduce([5, 6]) },
    { at: 64, note: 'Zone 01 returns findings', ops: findingsReturned(1) },
    { at: 70, note: 'Zone 02 cannot reproduce', ops: cannotReproduce(2) },
    {
      at: 76,
      note: 'Zone 01 torn down',
      ops: [...destroy(1), { op: 'patch', id: 'vdp', set: { count: 5 } }],
    },
    {
      at: 82,
      note: 'A seventh report arrives',
      ops: [{ op: 'patch', id: 'vdp', set: { count: 6 } }, ...request([7])],
    },
    { at: 88, note: 'Zone 07 comes up', ops: fill([7]) },
    { at: 94, note: 'Zone 04 returns findings', ops: findingsReturned(4) },
    {
      at: 100,
      note: 'Zone 04 torn down, zone 07 reproduces',
      ops: [...destroy(4), ...reproduce([7]), { op: 'patch', id: 'vdp', set: { count: 5 } }],
    },
    {
      at: 108,
      note: 'Fixes handed to Jim',
      ops: [
        { op: 'patch', id: 'tess', set: { meta: 'handover', badges: ['handover'] } },
        { op: 'patch', id: 'linear', set: { count: 2, status: 'working' } },
        {
          op: 'add',
          entity: ent({
            id: 'ec2-1',
            kind: 'infrastructure',
            type: 'ec2',
            glyph: 'rack',
            label: 'Cloud instance · ec2-01',
            meta: 'eu-west-1a · 0 of 4 slots',
            status: 'initializing',
            links: [{ label: 'AWS console', href: 'https://console.aws.amazon.com/ec2' }],
          }),
        },
      ],
    },
    {
      at: 114,
      note: 'The fix host fills',
      ops: [
        {
          op: 'patch',
          id: 'ec2-1',
          set: { status: 'working', meta: 'eu-west-1a · 2 of 4 slots' },
        },
        {
          op: 'add',
          entity: ent({
            id: 'dev-host-1',
            kind: 'runtime',
            type: 'dev-host',
            glyph: 'box',
            label: 'Dev host',
            meta: 'long-lived',
            status: 'working',
            parentId: 'ec2-1',
          }),
        },
        ...fixPair(1),
        ...fixPair(2),
      ],
    },
    {
      at: 120,
      note: 'Jim starts on the first fixes',
      ops: [...fixPairWorking(1), ...fixPairWorking(2)],
    },
    { at: 128, note: 'Hold', ops: [] },
  ],
};
