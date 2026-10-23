import type { Transition, Variants } from 'motion/react';

/**
 * One number for the whole floor. A tick is a second at 1x, so nothing here may outlast one —
 * a transition still running when the next snapshot lands reads as lag, not polish.
 */
export const ARRIVE_MS = 320;
export const LEAVE_MS = 220;

/** Colour is the one thing that changes without anything arriving or leaving. */
export const TINT_MS = 350;

const EASE_OUT = [0.22, 0.61, 0.36, 1] as const;
const EASE_IN = [0.55, 0.06, 0.68, 0.19] as const;

export const arrive: Transition = { duration: ARRIVE_MS / 1000, ease: EASE_OUT };
export const leave: Transition = { duration: LEAVE_MS / 1000, ease: EASE_IN };

/**
 * A card is a piece of infrastructure appearing or being destroyed, so it is allowed a little
 * more travel than a row inside one.
 */
export const cardMotion: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.985 },
  shown: { opacity: 1, y: 0, scale: 1, transition: arrive },
  gone: { opacity: 0, scale: 0.97, transition: leave },
};

/**
 * A host filling is a run of slots being claimed, not one event. Rows arrive in spawn order a
 * beat apart from each other so the eye reads a sequence; six of them is the widest card there is.
 */
export const STAGGER_MS = 45;
const MAX_STAGGERED = 5;

export const staggerFor = (index: number): number =>
  (Math.min(index, MAX_STAGGERED) * STAGGER_MS) / 1000;

/**
 * A row claims a slot that was already there, so it slides in from its own left rather than
 * travelling across the card. `custom` is the row's position, which sets its place in the run.
 */
export const rowMotion: Variants = {
  hidden: { opacity: 0, x: -6 },
  shown: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: { ...arrive, delay: staggerFor(index) },
  }),
  gone: { opacity: 0, x: -4, transition: leave },
};

/** Cards slide to a freed cell. Rows never move, so they are not given this. */
export const reflow: Transition = { duration: 0.3, ease: EASE_OUT };
