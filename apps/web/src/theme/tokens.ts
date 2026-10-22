import type { Status } from '@fleet/schema';

/** The status palette. Grey idle is deliberate: a quiet floor should read as calm. */
export const STATUS_COLOR: Record<Status, string> = {
  initializing: '#2563EB',
  working: '#16A34A',
  idle: '#94A3B8',
  error: '#DC2626',
};

/** The tint behind a glyph, and the ink drawn on it. */
export const STATUS_TINT: Record<Status, string> = {
  initializing: '#EAF1FE',
  working: '#E9F7EE',
  idle: '#F1F4F7',
  error: '#FDECEC',
};

export const STATUS_INK: Record<Status, string> = {
  initializing: '#1D4ED8',
  working: '#15803D',
  idle: '#5A6678',
  error: '#B42318',
};

/** Amber is reserved for attention, which is why idle gave it up. */
export const ATTENTION = '#D97706';
export const ATTENTION_INK = '#B45309';
export const ATTENTION_TINT = '#FEF6E7';
export const ATTENTION_EDGE = '#E0C9A6';

export const INK = '#11161C';
export const QUIET = '#6B7584';
export const MUTED = '#8B95A3';
export const FAINT = '#AEB7C3';
export const LINE = '#E3E7EC';
export const HAIRLINE = '#EFF2F5';
export const SURFACE = '#FFFFFF';
export const SUNKEN = '#F8FAFB';
export const FLOOR = '#F6F7F9';
export const DOTS = '#DDE3EA';
export const WIRE = '#D7DEE6';

export const FRESHNESS_COLOR = {
  current: STATUS_COLOR.working,
  delayed: ATTENTION,
  stale: STATUS_COLOR.error,
} as const;

export const RADIUS = { card: 13, zone: 18, row: 9, glyph: 8, pill: 99 } as const;

export const SHADOW = {
  card: '0 1px 2px rgba(16,24,40,0.05), 0 2px 6px rgba(16,24,40,0.04)',
  raised: '0 2px 8px rgba(16,24,40,0.10)',
} as const;

export const FONT_STACK =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
