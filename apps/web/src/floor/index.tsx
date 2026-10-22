import { useEffect, useRef, useState } from 'react';
import { ATTENTION, INK, LINE, QUIET, STATUS_COLOR, SURFACE } from '../theme/tokens.js';
import { createStage, type Hovered, type Stage } from './stage.js';

const host: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background: 'var(--floor)',
};

const canvasHost: React.CSSProperties = { position: 'absolute', inset: 0 };

const controlBar: React.CSSProperties = {
  position: 'absolute',
  right: 16,
  bottom: 16,
  display: 'flex',
  gap: 4,
  padding: 4,
  background: SURFACE,
  border: `1px solid ${LINE}`,
  borderRadius: 10,
  boxShadow: '0 1px 3px rgba(16, 24, 40, 0.08)',
};

const controlButton: React.CSSProperties = {
  width: 28,
  height: 28,
  display: 'grid',
  placeItems: 'center',
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  color: INK,
  font: 'inherit',
  fontSize: 14,
  cursor: 'pointer',
};

/** Kept clear of the pointer so the card never covers the thing it describes. */
const CARD_OFFSET = 14;

function HoverCard({ hovered }: { hovered: Hovered }): React.ReactElement {
  const { cell, x, y } = hovered;
  return (
    <div
      data-testid="hover-card"
      style={{
        position: 'absolute',
        left: x + CARD_OFFSET,
        top: y + CARD_OFFSET,
        maxWidth: 260,
        padding: '8px 10px',
        background: SURFACE,
        border: `1px solid ${LINE}`,
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(16, 24, 40, 0.12)',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: STATUS_COLOR[cell.status],
          }}
        />
        <span>{cell.label}</span>
        {cell.hand ? <span style={{ color: ATTENTION }}>✋</span> : null}
      </div>
      <div style={{ color: QUIET, marginTop: 2 }}>
        {cell.status}
        {cell.count === null ? '' : ` · ${cell.count} queued`}
        {cell.badges.length > 0 ? ` · ${cell.badges.join(', ')}` : ''}
      </div>
      {cell.container ? (
        <div style={{ color: QUIET, marginTop: 4 }}>
          {cell.handInside ? 'Something inside needs a person · ' : ''}click to open
        </div>
      ) : null}
    </div>
  );
}

/**
 * Mounts the canvas once. Everything that changes with a snapshot is handled by the Pixi layer,
 * which subscribes to the store itself — the only React state here is the hover card, which
 * moves with the pointer rather than with the data.
 */
export function Floor(): React.ReactElement {
  const mount = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [hovered, setHovered] = useState<Hovered | null>(null);

  useEffect(() => {
    const element = mount.current;
    if (!element) return;
    const created = createStage(element);
    stage.current = created;
    created.onHover(setHovered);
    return () => {
      stage.current = null;
      created.destroy();
    };
  }, []);

  return (
    <div style={host}>
      <div ref={mount} style={canvasHost} />
      {hovered ? <HoverCard hovered={hovered} /> : null}
      <div style={controlBar}>
        <button
          type="button"
          style={controlButton}
          aria-label="Zoom out"
          onClick={() => stage.current?.zoomOut()}
        >
          −
        </button>
        <button
          type="button"
          style={controlButton}
          aria-label="Zoom in"
          onClick={() => stage.current?.zoomIn()}
        >
          +
        </button>
        <button
          type="button"
          style={{ ...controlButton, width: 'auto', padding: '0 10px', fontSize: 12 }}
          aria-label="Fit to view"
          onClick={() => stage.current?.fitView()}
        >
          Fit
        </button>
      </div>
    </div>
  );
}
