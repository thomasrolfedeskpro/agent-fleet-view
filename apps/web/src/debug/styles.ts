import type { CSSProperties } from 'react';
import {
  ATTENTION,
  ATTENTION_INK,
  FONT_STACK,
  HAIRLINE,
  INK,
  LINE,
  QUIET,
  RADIUS,
  SHADOW,
  STATUS_COLOR,
  STATUS_INK,
  STATUS_TINT,
  SUNKEN,
  SURFACE,
} from '../theme/tokens.js';

/**
 * The stylesheet needs pseudo-states that inline styles cannot express, so the palette crosses
 * into CSS as custom properties. `tokens.ts` stays the only place a colour is written down.
 */
export const panelVars = {
  '--dbg-font': FONT_STACK,
  '--dbg-ink': INK,
  '--dbg-quiet': QUIET,
  '--dbg-line': LINE,
  '--dbg-hairline': HAIRLINE,
  '--dbg-surface': SURFACE,
  '--dbg-sunken': SUNKEN,
  '--dbg-attention': ATTENTION,
  '--dbg-attention-ink': ATTENTION_INK,
  '--dbg-error': STATUS_COLOR.error,
  '--dbg-focus': STATUS_COLOR.initializing,
  '--dbg-go': STATUS_INK.working,
  '--dbg-go-rule': STATUS_COLOR.working,
  '--dbg-go-tint': STATUS_TINT.working,
  '--dbg-radius-row': `${RADIUS.row}px`,
  '--dbg-radius-pill': `${RADIUS.pill}px`,
  '--dbg-shadow-card': SHADOW.card,
  '--dbg-shadow-raised': SHADOW.raised,
} as CSSProperties;

export const WIDTH = { open: 304, collapsed: 216 } as const;
