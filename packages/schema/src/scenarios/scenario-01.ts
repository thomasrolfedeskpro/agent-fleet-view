import type { Entity } from '../entity.js';
import type { Scenario } from '../scenario.js';

type Seed = Pick<Entity, 'id' | 'kind' | 'type' | 'label' | 'status'> & Partial<Entity>;

const ent = (e: Seed): Entity => ({
  parentId: null,
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
            id: 'cp',
            kind: 'infrastructure',
            type: 'control-plane',
            label: 'Control plane',
            status: 'working',
            persistent: true,
            links: [{ label: 'Admin', href: 'https://example.internal/control-plane' }],
          }),
        },
        {
          op: 'add',
          entity: ent({
            id: 'vdp',
            kind: 'source',
            type: 'vdp',
            label: 'VDP intake',
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
            label: 'Linear',
            status: 'idle',
            persistent: true,
            count: 0,
            links: [{ label: 'Triage view', href: 'https://linear.app/deskpro' }],
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
          set: { status: 'working', label: 'Tess · VDP-88', badges: ['triage'] },
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
          set: { status: 'idle', hand: true, badges: ['triage', 'waiting'] },
        },
      ],
    },
    {
      at: 32,
      note: 'Approved',
      ops: [
        { op: 'patch', id: 'tess', set: { status: 'working', hand: false, badges: ['triage'] } },
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
            label: 'Untrusted zone · VDP-88',
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
            label: 'App instance',
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
        { op: 'patch', id: 'vera', set: { status: 'working', badges: ['reproducing'] } },
      ],
    },
    {
      at: 70,
      note: 'Findings returned',
      ops: [{ op: 'patch', id: 'vera', set: { status: 'idle', badges: ['findings returned'] } }],
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
        { op: 'patch', id: 'tess', set: { badges: ['handover'] } },
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
            label: 'Cloud instance · ec2',
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
            label: 'Dev host',
            status: 'initializing',
            parentId: 'ec2-1',
          }),
        },
      ],
    },
    {
      at: 96,
      note: 'Dev host ready',
      ops: [{ op: 'patch', id: 'dev-host-1', set: { status: 'working' } }],
    },
    {
      at: 100,
      note: 'First pair',
      ops: [
        {
          op: 'add',
          entity: ent({
            id: 'sandbox-1',
            kind: 'runtime',
            type: 'sandbox',
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
        { op: 'patch', id: 'sandbox-1', set: { status: 'working' } },
        { op: 'patch', id: 'jim-1', set: { status: 'working', badges: ['fix'] } },
      ],
    },
    {
      at: 118,
      note: 'A second pair on the same host',
      ops: [
        {
          op: 'add',
          entity: ent({
            id: 'sandbox-2',
            kind: 'runtime',
            type: 'sandbox',
            label: 'sandbox · release-5.4',
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
            label: 'Jim · PDEV-521',
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
          set: { status: 'error', hand: true, badges: ['boot failed'] },
        },
        { op: 'patch', id: 'tess', set: { status: 'idle', badges: [] } },
      ],
    },
    {
      at: 150,
      note: 'Second pair torn down',
      ops: [
        { op: 'remove', id: 'jim-2' },
        { op: 'remove', id: 'sandbox-2' },
      ],
    },
    { at: 160, note: 'Hold', ops: [] },
  ],
};
