import { describe, expect, it } from 'vitest';
import {
  ARRIVE_MS,
  arrive,
  cardMotion,
  LEAVE_MS,
  leave,
  reflow,
  rowMotion,
  staggerFor,
  TINT_MS,
} from './motion.js';

/** The server ticks once a second at 1x. Anything still moving when the next one lands reads as lag. */
const TICK_MS = 1000;

describe('floor timings', () => {
  it('finish inside one tick, even back to back', () => {
    expect(ARRIVE_MS).toBeLessThan(TICK_MS);
    expect(LEAVE_MS).toBeLessThan(TICK_MS);
    expect(TINT_MS).toBeLessThan(TICK_MS);
    expect(LEAVE_MS + ARRIVE_MS).toBeLessThan(TICK_MS);
  });

  it('leave faster than they arrive, so a teardown never holds up what replaces it', () => {
    expect(LEAVE_MS).toBeLessThan(ARRIVE_MS);
  });

  it('sit inside the 300–500ms band the design fixed', () => {
    for (const transition of [arrive, leave, reflow]) {
      expect(transition.duration).toBeGreaterThan(0.2);
      expect(transition.duration).toBeLessThanOrEqual(0.5);
    }
  });

  it('land every variant on a resting state of full opacity and no offset', () => {
    expect(cardMotion.shown).toMatchObject({ opacity: 1, y: 0 });
    expect(cardMotion.hidden).toMatchObject({ opacity: 0 });
    expect(cardMotion.gone).toMatchObject({ opacity: 0 });

    const shown = rowMotion.shown as (index: number) => Record<string, unknown>;
    expect(shown(0)).toMatchObject({ opacity: 1, x: 0 });
    expect(rowMotion.hidden).toMatchObject({ opacity: 0 });
    expect(rowMotion.gone).toMatchObject({ opacity: 0 });
  });

  it('run the longest host fill inside one tick, stagger included', () => {
    const SLOTS = 6;
    const last = staggerFor(SLOTS - 1) * 1000 + ARRIVE_MS;
    expect(last).toBeLessThan(TICK_MS);
  });

  it('stop staggering past the widest card, so one late row never waits long', () => {
    expect(staggerFor(0)).toBe(0);
    expect(staggerFor(5)).toBeCloseTo(staggerFor(60));
    expect(staggerFor(60) * 1000).toBeLessThan(ARRIVE_MS);
  });
});
