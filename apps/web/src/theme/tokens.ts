import type { Status } from '@fleet/schema';

/** The status palette. Grey idle is deliberate: a quiet floor should read as calm. */
export const STATUS_COLOR: Record<Status, string> = {
  initializing: '#2f6fed',
  working: '#1f9d55',
  idle: '#9aa3ad',
  error: '#d64545',
};

/** Amber is reserved for attention, which is why idle gave it up. */
export const ATTENTION = '#e08a1e';

export const INK = '#1a1d21';
export const QUIET = '#6b7480';
export const LINE = '#d7dce2';
export const SURFACE = '#ffffff';
export const FLOOR = '#f6f7f9';

export const FRESHNESS_COLOR = {
  current: STATUS_COLOR.working,
  delayed: ATTENTION,
  stale: STATUS_COLOR.error,
} as const;

export const RADIUS = 8;
export const FONT_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
