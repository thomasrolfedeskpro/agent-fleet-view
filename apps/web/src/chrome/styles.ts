import type { CSSProperties } from 'react';
import { LINE, QUIET, RADIUS } from '../theme/tokens.js';

export const section: CSSProperties = {
  padding: '12px 16px',
  borderBottom: `1px solid ${LINE}`,
};

export const sectionTitle: CSSProperties = {
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
  display: 'inline-block',
  padding: '1px 6px',
  borderRadius: RADIUS,
  border: `1px solid ${LINE}`,
  fontSize: 10,
  lineHeight: '15px',
  color: QUIET,
  whiteSpace: 'nowrap',
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
