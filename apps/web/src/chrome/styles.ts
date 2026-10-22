import type { CSSProperties } from 'react';
import { INK, LINE, QUIET, RADIUS, SURFACE } from '../theme/tokens.js';

export const section: CSSProperties = {
  padding: '12px 14px',
  borderBottom: `1px solid ${LINE}`,
};

export const sectionTitle: CSSProperties = {
  display: 'block',
  margin: '0 0 8px',
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: QUIET,
  fontWeight: 600,
};

export const resetButton: CSSProperties = {
  font: 'inherit',
  color: 'inherit',
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  cursor: 'pointer',
  textAlign: 'left',
};

export const pill: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '1px 7px',
  borderRadius: RADIUS.pill,
  border: `1px solid ${LINE}`,
  background: SURFACE,
  fontSize: 10,
  lineHeight: '16px',
  color: QUIET,
  whiteSpace: 'nowrap',
};

/** A number beside a label: always tabular, so a changing count does not shuffle the row. */
export const figure: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 600,
  color: INK,
};

export function dot(color: string, size = 8): CSSProperties {
  return {
    display: 'inline-block',
    width: size,
    height: size,
    borderRadius: size,
    background: color,
    flex: '0 0 auto',
  };
}
