export type Rgb = { r: number; g: number; b: number };

const clamp255 = (n: number): number => Math.max(0, Math.min(255, Math.round(n)));

export function parseHex(hex: string): Rgb {
  const body = hex.startsWith('#') ? hex.slice(1) : hex;
  const full =
    body.length === 3
      ? body
          .split('')
          .map((c) => c + c)
          .join('')
      : body;
  const n = Number.parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(n)) throw new Error(`not a hex colour: ${hex}`);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (n: number): string => clamp255(n).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function mixHex(from: string, to: string, t: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const k = Math.max(0, Math.min(1, t));
  return toHex({
    r: a.r + (b.r - a.r) * k,
    g: a.g + (b.g - a.g) * k,
    b: a.b + (b.b - a.b) * k,
  });
}

export function easeInOut(t: number): number {
  const k = Math.max(0, Math.min(1, t));
  return k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
}
