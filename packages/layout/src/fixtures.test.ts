import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Snapshot } from '@fleet/schema';
import { describe, expect, it } from 'vitest';
import type { FloorLayout, Placed } from './index.js';
import { layoutContainer, layoutOverview, PAIR_GAP } from './index.js';

const DIR = join(import.meta.dirname, '..', '..', '..', 'fixtures', 'scenario-01');

const beats: Snapshot[] = readdirSync(DIR)
  .filter((name) => /^beat-\d+\.json$/.test(name))
  .sort()
  .map((name) => Snapshot.parse(JSON.parse(readFileSync(join(DIR, name), 'utf8'))));

type Beat = { overview: FloorLayout; containers: Map<string, FloorLayout> };

/** Every beat laid out from the one before it, exactly as a client watching the floor would. */
function replay(): Beat[] {
  let overview: FloorLayout | undefined;
  const carried = new Map<string, FloorLayout>();

  return beats.map((snapshot) => {
    overview = layoutOverview(snapshot.entities, overview);

    const containers = new Map<string, FloorLayout>();
    const parents = new Set(
      snapshot.entities.map((e) => e.parentId).filter((id): id is string => id !== null),
    );
    for (const parent of parents) {
      const layout = layoutContainer(parent, snapshot.entities, carried.get(parent));
      carried.set(parent, layout);
      containers.set(parent, layout);
    }
    return { overview, containers };
  });
}

const played = replay();

function at(index: number): Beat {
  const beat = played[index];
  if (!beat) throw new Error(`no beat ${index}`);
  return beat;
}

function snapshotAt(index: number): Snapshot {
  const snapshot = beats[index];
  if (!snapshot) throw new Error(`no snapshot ${index}`);
  return snapshot;
}

function host(index: number): FloorLayout {
  const layout = at(index).containers.get('ec2-1');
  if (!layout) throw new Error(`no ec2-1 layout at beat ${index}`);
  return layout;
}

function cell(layout: FloorLayout, id: string): Placed | undefined {
  return layout.cells.find((c) => c.id === id);
}

function mustCell(layout: FloorLayout, id: string): Placed {
  const found = cell(layout, id);
  if (!found) throw new Error(`no cell for ${id}`);
  return found;
}

function overlap(a: Placed, b: Placed): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

const HOST_BEATS = [13, 14, 15, 16, 17, 18, 19, 20];

describe('scenario-01 replayed beat by beat', () => {
  it('lays out all 21 beats', () => {
    expect(played).toHaveLength(21);
  });

  it('never moves the first pair when the second one joins and leaves', () => {
    const spawned = host(15);
    for (const index of [16, 17, 18, 19, 20]) {
      expect(cell(host(index), 'sandbox-1'), `beat ${index}`).toEqual(
        mustCell(spawned, 'sandbox-1'),
      );
      expect(cell(host(index), 'jim-1'), `beat ${index}`).toEqual(mustCell(spawned, 'jim-1'));
    }
  });

  it('leaves the row the second pair held empty after the teardown', () => {
    const held = mustCell(host(17), 'sandbox-2');

    for (const index of [19, 20]) {
      expect(cell(host(index), 'sandbox-2')).toBeUndefined();
      expect(cell(host(index), 'jim-2')).toBeUndefined();
      expect(
        host(index).cells.some((c) => c.y === held.y),
        `beat ${index}`,
      ).toBe(false);
    }
  });

  it('keeps dev-host-1 on its row throughout', () => {
    const first = mustCell(host(13), 'dev-host-1');
    for (const index of HOST_BEATS) {
      expect(cell(host(index), 'dev-host-1'), `beat ${index}`).toEqual(first);
    }
  });

  it('moves nothing that survives from one beat to the next', () => {
    for (const [index, beat] of played.entries()) {
      if (index === 0) continue;
      const before = at(index - 1);

      for (const placed of beat.overview.cells) {
        const was = cell(before.overview, placed.id);
        if (was) expect(placed, `beat ${index} overview ${placed.id}`).toEqual(was);
      }
      for (const [containerId, layout] of beat.containers) {
        const earlier = before.containers.get(containerId);
        if (!earlier) continue;
        for (const placed of layout.cells) {
          const was = cell(earlier, placed.id);
          if (was) expect(placed, `beat ${index} ${containerId} ${placed.id}`).toEqual(was);
        }
      }
    }
  });

  it('holds the row of a surviving pair when the pair above it goes', () => {
    const before = host(17);
    const kept = snapshotAt(17).entities.filter(
      (e) => e.parentId === 'ec2-1' && e.id !== 'sandbox-1' && e.id !== 'jim-1',
    );
    const after = layoutContainer('ec2-1', kept, before);

    expect(mustCell(after, 'sandbox-2')).toEqual(mustCell(before, 'sandbox-2'));
    expect(mustCell(after, 'jim-2')).toEqual(mustCell(before, 'jim-2'));
    expect(mustCell(after, 'dev-host-1')).toEqual(mustCell(before, 'dev-host-1'));
    expect(after.cells.some((c) => c.y === mustCell(before, 'sandbox-1').y)).toBe(false);
  });

  it('keeps the top-level floor still while things come and go beneath it', () => {
    for (const id of ['cp', 'vdp', 'linear']) {
      const first = mustCell(at(0).overview, id);
      for (const [index, beat] of played.entries()) {
        expect(cell(beat.overview, id), `beat ${index} ${id}`).toEqual(first);
      }
    }
  });

  it('gives a newcomer the slot the destroyed instance freed', () => {
    const vera = mustCell(at(6).overview, 'vera-inst');

    expect(cell(at(10).overview, 'vera-inst')).toBeUndefined();
    expect(mustCell(at(12).overview, 'ec2-1')).toEqual({ ...vera, id: 'ec2-1' });
  });

  it('puts both cells of every pair on one row, adjacent in x', () => {
    for (const [index, beat] of played.entries()) {
      for (const [containerId, layout] of beat.containers) {
        for (const tether of layout.tethers) {
          const from = mustCell(layout, tether.from);
          const to = mustCell(layout, tether.to);
          const where = `beat ${index} ${containerId} ${tether.from}/${tether.to}`;

          expect(from.y, where).toBe(to.y);
          expect(to.x - from.x, where).toBe(from.w + PAIR_GAP);
        }
      }
    }
  });

  it('lists every declared pair exactly once', () => {
    for (const [index, beat] of played.entries()) {
      for (const [containerId, layout] of beat.containers) {
        const declared = snapshotAt(index).entities.filter(
          (e) => e.parentId === containerId && e.pairWith !== null,
        );

        expect(layout.tethers, `beat ${index} ${containerId}`).toHaveLength(declared.length / 2);
      }
    }
  });

  it('draws each visible entity once and never on top of another', () => {
    for (const [index, beat] of played.entries()) {
      const snapshot = snapshotAt(index);
      const idsOf = (parentId: string | null): string[] =>
        snapshot.entities
          .filter((e) => e.parentId === parentId)
          .map((e) => e.id)
          .sort();

      expect(beat.overview.cells.map((c) => c.id).sort(), `beat ${index} overview`).toEqual(
        idsOf(null),
      );
      expectNoOverlap(beat.overview, `beat ${index} overview`);

      for (const [containerId, layout] of beat.containers) {
        expect(layout.cells.map((c) => c.id).sort(), `beat ${index} ${containerId}`).toEqual(
          idsOf(containerId),
        );
        expectNoOverlap(layout, `beat ${index} ${containerId}`);
      }
    }
  });

  it('replays to the same layouts every time', () => {
    const flatten = (run: Beat[]) =>
      run.map((beat) => ({ overview: beat.overview, containers: [...beat.containers] }));

    expect(flatten(replay())).toEqual(flatten(played));
  });
});

function expectNoOverlap(layout: FloorLayout, where: string): void {
  for (const [index, a] of layout.cells.entries()) {
    for (const b of layout.cells.slice(index + 1)) {
      expect(overlap(a, b), `${where} ${a.id}/${b.id}`).toBe(false);
    }
  }
}
