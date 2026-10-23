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

const REPORTS = 7;

const pad = (n: number) => String(n).padStart(2, '0');
const zoneId = (zone: number) => `vera-inst-${pad(zone)}`;
const appId = (zone: number) => `vera-app-${pad(zone)}`;
const veraId = (zone: number) => `vera-${pad(zone)}`;
const reportOf = (zone: number) => `VDP-${900 + zone}`;

const report = (zone: number) => [
  { label: `Report ${reportOf(zone)}`, href: `https://example.internal/vdp/${reportOf(zone)}` },
];

/** Tess is one agent with one queue. She carries a report until its zone is raised, then takes the next. */
const take = (zone: number): Op[] => [
  {
    op: 'patch',
    id: 'tess',
    set: {
      status: 'working',
      meta: `triaging ${reportOf(zone)}`,
      badges: [`${zone} of ${REPORTS}`],
    },
  },
  { op: 'patch', id: 'vdp', set: { count: REPORTS - zone } },
];

/** Stage one: the zone is provisioned and stands empty while it locks itself down. */
const request = (zone: number): Op[] => [{ op: 'add', entity: zoneEntity(zone) }];

/** Stage two: the zone is ready and its pair claims it. */
const fill = (zone: number): Op[] => [
  { op: 'patch', id: zoneId(zone), set: { status: 'working' } },
  { op: 'add', entity: appEntity(zone) },
  { op: 'add', entity: veraEntity(zone) },
];

/** Stage three: the clone is seeded and Vera is on the report. This is the long one. */
const reproduce = (zone: number): Op[] => [
  { op: 'patch', id: appId(zone), set: { status: 'working', meta: 'seeded · one ref' } },
  {
    op: 'patch',
    id: veraId(zone),
    set: { status: 'working', meta: 'reproducing', badges: ['reproducing'] },
  },
];

const findingsReturned = (zone: number): Op[] => [
  {
    op: 'patch',
    id: veraId(zone),
    set: { status: 'idle', meta: 'findings returned', badges: ['report ready'] },
  },
];

/** Nothing reproduced, so the zone stops and holds its slot until a person calls it. */
const cannotReproduce = (zone: number): Op[] => [
  {
    op: 'patch',
    id: veraId(zone),
    set: { status: 'idle', hand: true, meta: 'could not reproduce', badges: ['needs a call'] },
  },
];

const cloneFailed = (zone: number): Op[] => [
  { op: 'patch', id: zoneId(zone), set: { status: 'error' } },
  { op: 'patch', id: appId(zone), set: { status: 'error', meta: 'clone failed' } },
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
 * A queue of seven security reports through one Tess. She triages one at a time, so the zones
 * are raised one per beat — but reproducing a finding takes far longer than triaging it, so they
 * pile up behind her and six stand side by side at the peak. Two of them never clear: one cannot
 * reproduce and one loses its clone, and both hold their zone open until someone answers the hand.
 *
 * Every beat from 0:30 on shows the three stages of a zone at once — one empty and locking down,
 * one claiming its pair, one reproducing.
 */
export const scenario03: Scenario = {
  id: 'scenario-03',
  title: 'Seven reports, one at a time',
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
      note: 'Seven reports land in the queue',
      ops: [
        { op: 'patch', id: 'vdp', set: { count: REPORTS, status: 'working' } },
        {
          op: 'add',
          entity: ent({
            id: 'tess',
            kind: 'agent',
            type: 'tess',
            glyph: 'agent',
            label: 'Tess · intake',
            meta: 'one report at a time',
            status: 'working',
            parentId: 'cp',
          }),
        },
      ],
    },
    { at: 12, note: 'Tess takes VDP-901', ops: take(1) },
    { at: 18, note: 'Zone 01 requested · Tess takes VDP-902', ops: [...request(1), ...take(2)] },
    {
      at: 24,
      note: 'Zone 01 comes up · zone 02 requested · Tess takes VDP-903',
      ops: [...fill(1), ...request(2), ...take(3)],
    },
    {
      at: 30,
      note: 'Zone 01 reproduces · zone 02 up · zone 03 requested · Tess takes VDP-904',
      ops: [...reproduce(1), ...fill(2), ...request(3), ...take(4)],
    },
    {
      at: 36,
      note: 'Zone 02 reproduces · zone 03 up · zone 04 requested · Tess takes VDP-905',
      ops: [...reproduce(2), ...fill(3), ...request(4), ...take(5)],
    },
    {
      at: 42,
      note: 'Zone 01 returns findings · zone 04 up · zone 05 requested · Tess takes VDP-906',
      ops: [...findingsReturned(1), ...reproduce(3), ...fill(4), ...request(5), ...take(6)],
    },
    {
      at: 48,
      note: 'Zone 01 torn down · zone 05 up · zone 06 requested · Tess takes VDP-907',
      ops: [...destroy(1), ...reproduce(4), ...fill(5), ...request(6), ...take(7)],
    },
    {
      at: 54,
      note: 'Zone 02 cannot reproduce · zone 06 up · zone 07 requested',
      ops: [...cannotReproduce(2), ...reproduce(5), ...fill(6), ...request(7)],
    },
    {
      at: 60,
      note: "Tess has emptied the queue · zone 03's clone fails · zone 07 up",
      ops: [
        { op: 'patch', id: 'tess', set: { status: 'idle', meta: 'queue empty', badges: [] } },
        { op: 'patch', id: 'vdp', set: { status: 'idle' } },
        ...cloneFailed(3),
        ...reproduce(6),
        ...fill(7),
      ],
    },
    { at: 66, note: 'Zone 07 reproduces', ops: reproduce(7) },
    { at: 72, note: 'Zone 04 returns findings', ops: findingsReturned(4) },
    { at: 78, note: 'Zone 04 torn down', ops: destroy(4) },
    { at: 84, note: 'Zone 05 returns findings', ops: findingsReturned(5) },
    {
      at: 90,
      note: 'Zone 05 torn down · zones 02 and 03 still want a person',
      ops: destroy(5),
    },
    {
      at: 96,
      note: 'Fixes handed to Jim',
      ops: [
        {
          op: 'patch',
          id: 'tess',
          set: { status: 'working', meta: 'handover', badges: ['handover'] },
        },
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
      at: 102,
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
      at: 108,
      note: 'Jim starts on the first fixes',
      ops: [...fixPairWorking(1), ...fixPairWorking(2)],
    },
    { at: 114, note: 'Hold', ops: [] },
  ],
};
