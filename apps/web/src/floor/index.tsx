import type { Band, Entity } from '@fleet/schema';
import { useCallback, useRef, useState } from 'react';
import { childrenOf, filtered, inBand, isFiltering, store, useStore } from '../store/index.js';
import {
  DOTS,
  FAINT,
  FLOOR,
  INK,
  LINE,
  MUTED,
  QUIET,
  RADIUS,
  SHADOW,
  SURFACE,
  WIRE,
} from '../theme/tokens.js';
import { CARD_W, Card } from './card.js';

const BAND_LABEL: Record<Band, string> = {
  input: 'INPUT CHANNELS',
  'always-on': 'ALWAYS ON',
  ephemeral: 'SPUN UP ON DEMAND',
};

/**
 * The floor is as wide as its content, so a wrapping flex row would never wrap. Columns are
 * capped instead, and two cards plus a gap is what fits the pane at the default zoom.
 */
const MAX_COLUMNS = 2;
const GAP = 14;

const MIN_SCALE = 0.4;
const MAX_SCALE = 1.8;
const ZOOM_STEP = 1.2;

const label: React.CSSProperties = {
  color: MUTED,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
};

const controlButton: React.CSSProperties = {
  width: 30,
  height: 30,
  display: 'grid',
  placeItems: 'center',
  border: 'none',
  borderRadius: 7,
  background: 'transparent',
  color: '#49566A',
  fontSize: 16,
  cursor: 'pointer',
};

/** The run of wire from the input channels down into the control plane. */
function Routing(): React.ReactElement {
  const centre = CARD_W / 2;
  const span = CARD_W + GAP;
  return (
    <div style={{ position: 'relative', height: 44, marginLeft: centre }} aria-hidden="true">
      <div
        style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 18, background: WIRE }}
      />
      <div
        style={{ position: 'absolute', left: span, top: 0, width: 1, height: 18, background: WIRE }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 18,
          width: span + 1,
          height: 1,
          background: WIRE,
        }}
      />
      <div
        style={{ position: 'absolute', left: 0, top: 18, width: 1, height: 20, background: WIRE }}
      />
      <div
        style={{
          position: 'absolute',
          left: -4,
          top: 34,
          width: 9,
          height: 9,
          borderRadius: RADIUS.pill,
          background: '#C5CEDA',
        }}
      />
    </div>
  );
}

function BandRow({
  band,
  entities,
  selectedId,
  childrenFor,
}: {
  band: Band;
  entities: Entity[];
  selectedId: string | null;
  childrenFor: (id: string) => Entity[];
}): React.ReactElement | null {
  if (entities.length === 0) return null;
  const ephemeral = band === 'ephemeral';

  return (
    <section style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
        <span style={label}>{BAND_LABEL[band]}</span>
        {ephemeral ? (
          <span style={{ color: FAINT, fontSize: 11 }}>comes and goes with the work</span>
        ) : null}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(entities.length, MAX_COLUMNS)}, ${CARD_W}px)`,
          gap: GAP,
          // The zone is drawn, so it has to end where its cards end rather than fill the pane.
          width: 'max-content',
          padding: ephemeral ? 14 : 0,
          border: ephemeral ? `1px dashed #D3DAE3` : 'none',
          borderRadius: ephemeral ? RADIUS.zone : 0,
          background: ephemeral ? 'rgba(255,255,255,0.42)' : 'transparent',
        }}
      >
        {entities.map((entity) => (
          <Card
            key={entity.id}
            entity={entity}
            contents={childrenFor(entity.id)}
            selectedId={selectedId}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * One level. Everything on the floor is drawn at once, grouped into bands that fall out of what
 * each thing is, and finding something is filtering rather than navigating into it.
 */
export function Floor(): React.ReactElement {
  const inputs = useStore((s) => inBand(s, 'input'));
  const alwaysOn = useStore((s) => inBand(s, 'always-on'));
  const ephemeral = useStore((s) => inBand(s, 'ephemeral'));
  const selectedId = useStore((s) => s.selectedId);
  const filter = useStore((s) => s.filter);
  const snapshot = useStore((s) => s.snapshot);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  const narrowing = isFiltering(filter);
  const keep = new Set(
    narrowing && snapshot ? filtered({ ...store.getState(), snapshot }).map((e) => e.id) : [],
  );

  // A card survives a filter if it matches, or if anything inside it does.
  const childrenFor = useCallback(
    (id: string): Entity[] => {
      const all = childrenOf(store.getState(), id);
      return narrowing ? all.filter((c) => keep.has(c.id)) : all;
    },
    [narrowing, keep],
  );
  const survives = (entity: Entity): boolean =>
    !narrowing || keep.has(entity.id) || childrenFor(entity.id).length > 0;

  const onPointerDown = (event: React.PointerEvent): void => {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
  };
  const onPointerMove = (event: React.PointerEvent): void => {
    if (!drag.current) return;
    setOffset({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y });
  };
  const endDrag = (): void => {
    drag.current = null;
  };
  const zoom = (factor: number): void =>
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor)));
  const reset = (): void => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        background: FLOOR,
        backgroundImage: `radial-gradient(${DOTS} 1px, transparent 1px)`,
        backgroundSize: '22px 22px',
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'auto',
          cursor: drag.current ? 'grabbing' : 'default',
        }}
      >
        <div
          style={{
            padding: '26px 44px 80px',
            width: 'max-content',
            minWidth: '100%',
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          <BandRow
            band="input"
            entities={inputs.filter(survives)}
            selectedId={selectedId}
            childrenFor={childrenFor}
          />
          {inputs.length > 0 && alwaysOn.length > 0 && !narrowing ? <Routing /> : null}
          <BandRow
            band="always-on"
            entities={alwaysOn.filter(survives)}
            selectedId={selectedId}
            childrenFor={childrenFor}
          />
          <BandRow
            band="ephemeral"
            entities={ephemeral.filter(survives)}
            selectedId={selectedId}
            childrenFor={childrenFor}
          />
          {narrowing && [...inputs, ...alwaysOn, ...ephemeral].filter(survives).length === 0 ? (
            <p style={{ color: QUIET }}>Nothing on the floor matches that.</p>
          ) : null}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          display: 'flex',
          gap: 2,
          padding: 4,
          background: SURFACE,
          border: `1px solid ${LINE}`,
          borderRadius: 10,
          boxShadow: SHADOW.raised,
        }}
      >
        <button
          type="button"
          aria-label="Zoom out"
          style={controlButton}
          onClick={() => zoom(1 / ZOOM_STEP)}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          style={controlButton}
          onClick={() => zoom(ZOOM_STEP)}
        >
          +
        </button>
        <button
          type="button"
          style={{ ...controlButton, width: 'auto', padding: '0 11px', fontSize: 12, color: INK }}
          onClick={reset}
        >
          Fit
        </button>
      </div>
    </div>
  );
}
