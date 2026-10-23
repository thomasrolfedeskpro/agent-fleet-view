import type { Glyph as GlyphName, Status } from '@fleet/schema';
import { RADIUS, STATUS_INK, STATUS_TINT } from '../theme/tokens.js';

const PATHS: Record<GlyphName, React.ReactElement> = {
  hub: (
    <>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.8v2.4M8 11.8v2.4M14.2 8h-2.4M4.2 8H1.8M12.4 3.6l-1.7 1.7M5.3 10.7l-1.7 1.7M12.4 12.4l-1.7-1.7M5.3 5.3 3.6 3.6" />
    </>
  ),
  rack: (
    <>
      <rect x="2" y="3" width="12" height="4" rx="1" />
      <rect x="2" y="9" width="12" height="4" rx="1" />
      <path d="M4.6 5h.01M4.6 11h.01" />
    </>
  ),
  box: (
    <>
      <path d="M8 1.8 14 5v6L8 14.2 2 11V5z" />
      <path d="M2 5l6 3 6-3M8 8v6.2" />
    </>
  ),
  agent: (
    <>
      <circle cx="8" cy="5.4" r="2.6" />
      <path d="M2.8 13.6c.7-2.6 2.7-4 5.2-4s4.5 1.4 5.2 4" />
    </>
  ),
  tray: (
    <>
      <path d="M2 9.5 3.8 3.4A1 1 0 0 1 4.8 2.7h6.4a1 1 0 0 1 1 .7L14 9.5v2.8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
      <path d="M2 9.5h3.2l.9 1.7h3.8l.9-1.7H14" />
    </>
  ),
  shield: <path d="M8 1.9 13.6 4v4.3c0 3.1-2.3 5.1-5.6 5.9-3.3-.8-5.6-2.8-5.6-5.9V4z" />,
  gateway: (
    <>
      <path d="M8 2.2 13.2 5v6L8 13.8 2.8 11V5z" />
      <path d="M5.6 6.4h4.8M5.6 9.2h3.2" />
    </>
  ),
};

/** A glyph in its tinted square. The size is the square; the mark inside is half of it. */
export function Glyph({
  glyph,
  status,
  size = 30,
}: {
  glyph: GlyphName;
  status: Status;
  size?: number;
}): React.ReactElement {
  const mark = Math.round(size / 2);
  return (
    <span
      className="fleet-tint"
      style={{
        width: size,
        height: size,
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        borderRadius: RADIUS.glyph,
        background: STATUS_TINT[status],
      }}
    >
      <svg
        className="fleet-tint"
        width={mark}
        height={mark}
        viewBox="0 0 16 16"
        fill="none"
        stroke={STATUS_INK[status]}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {PATHS[glyph]}
      </svg>
    </span>
  );
}

/** The one mark that means a person is wanted, whatever the reason. */
export function Hand({ size = 14 }: { size?: number }): React.ReactElement {
  return (
    <svg
      className="fleet-hand"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      style={{ flex: 'none' }}
      role="img"
      aria-label="needs a person"
    >
      <path d="M4.4 7V3.3a1 1 0 0 1 2 0V7V2.2a1 1 0 0 1 2 0V7V2.7a1 1 0 0 1 2 0V7.6V4.6a1 1 0 0 1 2 0v4.9c0 2.6-1.7 4.4-4 4.4-2.1 0-3.4-1-4.2-2.6L2.5 9.1a1 1 0 0 1 1.6-1.2z" />
    </svg>
  );
}
