import type { Entity } from '../entity.js';
import type { Scenario } from '../scenario.js';

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

/**
 * A VDP report through Tess, Vera and Jim. The beats are the acceptance criteria for the
 * whole POC: between them they exercise persistent infrastructure, a queue at zero, the
 * raised hand for both a wait and a fault, an environment created and destroyed inside one
 * step, pairs stacking in spawn order, and a freed slot that stays empty.
 */
export const scenario01: Scenario = {
  id: 'scenario-01',
  title: 'A VDP report through Tess, Vera and Jim',
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
      at: 5,
      note: 'A report arrives',
      ops: [{ op: 'patch', id: 'vdp', set: { count: 1, status: 'working' } }],
    },
    {
      at: 10,
      note: 'Tess starts up',
      ops: [
        {
          op: 'add',
          entity: ent({
            id: 'tess',
            kind: 'agent',
            type: 'tess',
            glyph: 'agent',
            label: 'Tess',
            status: 'initializing',
            parentId: 'cp',
          }),
        },
      ],
    },
    {
      at: 14,
      note: 'Tess triages VDP-88',
      ops: [
        {
          op: 'patch',
          id: 'tess',
          set: { status: 'working', label: 'Tess · VDP-88', meta: 'triage', badges: ['triage'] },
        },
      ],
    },
    {
      at: 25,
      note: 'Tess needs approval',
      ops: [
        {
          op: 'patch',
          id: 'tess',
          set: {
            status: 'idle',
            hand: true,
            meta: 'waiting for approval',
            badges: ['triage', 'waiting'],
          },
        },
      ],
    },
    {
      at: 32,
      note: 'Approved',
      ops: [
        {
          op: 'patch',
          id: 'tess',
          set: { status: 'working', hand: false, meta: 'triage', badges: ['triage'] },
        },
      ],
    },
    {
      at: 38,
      note: 'Isolated instance requested',
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
      at: 44,
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
            label: 'app · VDP-88',
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
            label: 'Vera · VDP-88',
            status: 'initializing',
            parentId: 'vera-inst',
            pairWith: 'vera-app',
          }),
        },
      ],
    },
    {
      at: 50,
      note: 'Vera reproduces',
      ops: [
        { op: 'patch', id: 'vera-app', set: { status: 'working' } },
        { op: 'patch', id: 'vera', set: { status: 'working', meta: 'reproducing' } },
      ],
    },
    {
      at: 70,
      note: 'Findings returned',
      ops: [{ op: 'patch', id: 'vera', set: { status: 'idle', meta: 'findings returned' } }],
    },
    {
      at: 74,
      note: 'Isolated instance destroyed',
      ops: [
        { op: 'remove', id: 'vera' },
        { op: 'remove', id: 'vera-app' },
        { op: 'remove', id: 'vera-inst' },
      ],
    },
    {
      at: 78,
      note: 'Back to Tess',
      ops: [
        { op: 'patch', id: 'vdp', set: { count: 0, status: 'idle' } },
        { op: 'patch', id: 'tess', set: { meta: 'handover', badges: ['handover'] } },
      ],
    },
    {
      at: 84,
      note: 'Cloud instance requested',
      ops: [
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
      at: 90,
      note: 'Dev host building',
      ops: [
        { op: 'patch', id: 'ec2-1', set: { status: 'working' } },
        {
          op: 'add',
          entity: ent({
            id: 'dev-host-1',
            kind: 'runtime',
            type: 'dev-host',
            glyph: 'rack',
            label: 'Dev host',
            meta: 'built from spec',
            status: 'initializing',
            parentId: 'ec2-1',
          }),
        },
      ],
    },
    {
      at: 96,
      note: 'Dev host ready',
      ops: [{ op: 'patch', id: 'dev-host-1', set: { status: 'working', meta: 'long-lived' } }],
    },
    {
      at: 100,
      note: 'First pair',
      ops: [
        { op: 'patch', id: 'ec2-1', set: { meta: 'eu-west-1a · 1 of 4 slots' } },
        {
          op: 'add',
          entity: ent({
            id: 'sandbox-1',
            kind: 'runtime',
            type: 'sandbox',
            glyph: 'box',
            label: 'sandbox · master',
            status: 'initializing',
            parentId: 'ec2-1',
            pairWith: 'jim-1',
          }),
        },
        {
          op: 'add',
          entity: ent({
            id: 'jim-1',
            kind: 'agent',
            type: 'jim',
            glyph: 'agent',
            label: 'Jim · PDEV-537',
            status: 'initializing',
            parentId: 'ec2-1',
            pairWith: 'sandbox-1',
            links: linear('PDEV-537'),
          }),
        },
      ],
    },
    {
      at: 108,
      note: 'Jim works on PDEV-537',
      ops: [
        { op: 'patch', id: 'sandbox-1', set: { status: 'working', meta: 'seeded · one ref' } },
        {
          op: 'patch',
          id: 'jim-1',
          set: { status: 'working', meta: 'fix · test · review', badges: ['fix'] },
        },
      ],
    },
    {
      at: 118,
      note: 'A second pair on the same host',
      ops: [
        { op: 'patch', id: 'ec2-1', set: { meta: 'eu-west-1a · 2 of 4 slots' } },
        {
          op: 'add',
          entity: ent({
            id: 'sandbox-2',
            kind: 'runtime',
            type: 'sandbox',
            glyph: 'box',
            label: 'sandbox · release-5.4',
            meta: 'seeded · one ref',
            status: 'working',
            parentId: 'ec2-1',
            pairWith: 'jim-2',
          }),
        },
        {
          op: 'add',
          entity: ent({
            id: 'jim-2',
            kind: 'agent',
            type: 'jim',
            glyph: 'agent',
            label: 'Jim · PDEV-521',
            meta: 'fix · test · review',
            status: 'working',
            badges: ['fix'],
            parentId: 'ec2-1',
            pairWith: 'sandbox-2',
            links: linear('PDEV-521'),
          }),
        },
      ],
    },
    {
      at: 130,
      note: 'Jim 1 fails',
      ops: [
        {
          op: 'patch',
          id: 'jim-1',
          set: { status: 'error', hand: true, meta: 'boot failed', badges: ['boot failed'] },
        },
        { op: 'patch', id: 'tess', set: { status: 'idle', meta: '', badges: [] } },
      ],
    },
    {
      at: 150,
      note: 'Second pair torn down',
      ops: [
        { op: 'remove', id: 'jim-2' },
        { op: 'remove', id: 'sandbox-2' },
        { op: 'patch', id: 'ec2-1', set: { meta: 'eu-west-1a · 1 of 4 slots' } },
      ],
    },
    { at: 160, note: 'Hold', ops: [] },
  ],
};
