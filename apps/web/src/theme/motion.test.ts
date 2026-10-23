import { describe, expect, it } from 'vitest';
import {
  ARRIVE_MS,
  arrive,
  cardMotion,
  LEAVE_MS,
  leave,
  reflow,
  rowMotion,
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
    for (const variants of [cardMotion, rowMotion]) {
      expect(variants.shown).toMatchObject({ opacity: 1, y: 0 });
      expect(variants.hidden).toMatchObject({ opacity: 0 });
      expect(variants.gone).toMatchObject({ opacity: 0 });
    }
  });
});
