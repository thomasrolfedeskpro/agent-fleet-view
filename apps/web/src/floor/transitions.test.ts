import { type Status, TRANSITION_MS } from '@fleet/schema';
import { describe, expect, it } from 'vitest';
import { STATUS_COLOR } from '../theme/tokens.js';
import { easeInOut, mixHex, parseHex, toHex } from './colors.js';
import type { CellModel } from './scene.js';
import { advance, isAnimating, NO_FADES, statusColorAt } from './transitions.js';

const cell = (id: string, status: Status): CellModel => ({
  id,
  x: 0,
  y: 0,
  w: 100,
  h: 50,
  label: id,
  badges: [],
  status,
  hand: false,
  count: null,
  container: false,
  handInside: false,
  selected: false,
});

describe('colors', () => {
  it('round-trips a hex colour', () => {
    expect(toHex(parseHex('#2f6fed'))).toBe('#2f6fed');
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('rejects something that is not a colour', () => {
    expect(() => parseHex('#zzzzzz')).toThrow();
  });

  it('mixes from one end to the other', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('clamps a mix outside the range', () => {
    expect(mixHex('#000000', '#ffffff', -3)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 9)).toBe('#ffffff');
  });

  it('eases from 0 to 1 through the midpoint', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(1)).toBe(1);
  });
});

describe('advance', () => {
  it('does not animate a cell it is seeing for the first time', () => {
    const next = advance(NO_FADES, [cell('a', 'working')], 0);
    expect(next.fades.size).toBe(0);
    expect(statusColorAt(next.fades, 'a', 'working', 0)).toBe(STATUS_COLOR.working);
  });

  it('starts a fade when the status changes', () => {
    const first = advance(NO_FADES, [cell('a', 'idle')], 0);
    const second = advance(first, [cell('a', 'error')], 1000);
    expect(second.fades.get('a')).toEqual({ from: 'idle', to: 'error', startedAt: 1000 });
  });

  it('holds the old colour at the start and the new one at the end', () => {
    const first = advance(NO_FADES, [cell('a', 'idle')], 0);
    const second = advance(first, [cell('a', 'error')], 1000);
    expect(statusColorAt(second.fades, 'a', 'error', 1000)).toBe(STATUS_COLOR.idle);
    expect(statusColorAt(second.fades, 'a', 'error', 1000 + TRANSITION_MS)).toBe(
      STATUS_COLOR.error,
    );
  });

  it('is part way between the two colours half way through', () => {
    const first = advance(NO_FADES, [cell('a', 'idle')], 0);
    const second = advance(first, [cell('a', 'error')], 0);
    const mid = statusColorAt(second.fades, 'a', 'error', TRANSITION_MS / 2);
    expect(mid).not.toBe(STATUS_COLOR.idle);
    expect(mid).not.toBe(STATUS_COLOR.error);
  });

  it('drops a fade once it has finished', () => {
    const first = advance(NO_FADES, [cell('a', 'idle')], 0);
    const second = advance(first, [cell('a', 'error')], 0);
    const third = advance(second, [cell('a', 'error')], TRANSITION_MS + 1);
    expect(third.fades.size).toBe(0);
    expect(isAnimating(second.fades, 0)).toBe(true);
    expect(isAnimating(second.fades, TRANSITION_MS)).toBe(false);
  });

  it('restarts from where an interrupted fade had got to', () => {
    const first = advance(NO_FADES, [cell('a', 'idle')], 0);
    const second = advance(first, [cell('a', 'error')], 0);
    const third = advance(second, [cell('a', 'working')], TRANSITION_MS * 0.75);
    expect(third.fades.get('a')?.from).toBe('error');
  });

  it('forgets a cell that has left the floor', () => {
    const first = advance(NO_FADES, [cell('a', 'idle')], 0);
    const second = advance(first, [cell('a', 'error')], 0);
    const third = advance(second, [], 1);
    expect(third.fades.size).toBe(0);
    expect(third.statuses.size).toBe(0);
  });
});
