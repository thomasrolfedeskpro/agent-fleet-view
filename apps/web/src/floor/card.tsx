import type { Entity } from '@fleet/schema';
import { AnimatePresence, m } from 'motion/react';
import { store } from '../store/index.js';
import { cardMotion, reflow, rowMotion } from '../theme/motion.js';
import {
  ATTENTION,
  ATTENTION_EDGE,
  ATTENTION_INK,
  ATTENTION_TINT,
  HAIRLINE,
  INK,
  LINE,
  QUIET,
  RADIUS,
  SHADOW,
  STATUS_COLOR,
  SUNKEN,
  SURFACE,
  WIRE,
} from '../theme/tokens.js';
import { Glyph, Hand } from './glyph.js';

export type Pair = { lead: Entity; partner?: Entity };

export const CARD_W = 452;

const dot = (color: string, size = 7): React.CSSProperties => ({
  width: size,
  height: size,
  borderRadius: RADIUS.pill,
  background: color,
  flex: 'none',
});

/** A status dot changes colour in place; it never arrives or leaves, so CSS eases it. */
const Dot = ({ color, size = 7 }: { color: string; size?: number }): React.ReactElement => (
  <span className="fleet-tint" style={dot(color, size)} />
);

/**
 * Pairs come from `pairWith`, stated by the producer. Anything unpaired takes a row of its own,
 * and declaration order — which is spawn order — decides the order of the rows.
 */
export function pairsOf(children: Entity[]): Pair[] {
  const byId = new Map(children.map((c) => [c.id, c]));
  const placed = new Set<string>();
  const rows: Pair[] = [];
  for (const child of children) {
    if (placed.has(child.id)) continue;
    placed.add(child.id);
    const partner = child.pairWith ? byId.get(child.pairWith) : undefined;
    if (partner && !placed.has(partner.id)) {
      placed.add(partner.id);
      rows.push({ lead: child, partner });
    } else {
      rows.push({ lead: child });
    }
  }
  return rows;
}

function Half({ entity, selected }: { entity: Entity; selected: boolean }): React.ReactElement {
  return (
    <>
      <Dot color={STATUS_COLOR[entity.status]} size={6} />
      <span
        className="fleet-tint"
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: entity.status === 'error' ? STATUS_COLOR.error : '#49566A',
          fontWeight: selected || entity.status === 'error' ? 600 : 400,
        }}
      >
        {entity.label}
      </span>
    </>
  );
}

function Row({ pair, selectedId }: { pair: Pair; selectedId: string | null }): React.ReactElement {
  const { lead, partner } = pair;
  const selected = selectedId === lead.id || (partner ? selectedId === partner.id : false);
  const wantsPerson = lead.hand || (partner?.hand ?? false);

  return (
    <m.button
      type="button"
      variants={rowMotion}
      initial="hidden"
      animate="shown"
      exit="gone"
      onClick={() => store.select(selected ? null : (partner ?? lead).id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        width: '100%',
        padding: '8px 10px',
        textAlign: 'left',
        background: selected ? SURFACE : SUNKEN,
        border: `1px solid ${selected ? INK : HAIRLINE}`,
        boxShadow: selected ? '0 0 0 2px rgba(17,22,28,0.08)' : 'none',
        borderRadius: RADIUS.row,
        cursor: 'pointer',
        color: INK,
      }}
    >
      <Half entity={lead} selected={selected} />
      {partner ? (
        <>
          <span style={{ width: 14, height: 1, background: WIRE, flex: 'none' }} />
          <Half entity={partner} selected={selected} />
        </>
      ) : (
        <span style={{ color: QUIET, fontSize: 12 }}>{lead.meta}</span>
      )}
      {wantsPerson ? (
        <span style={{ color: ATTENTION, display: 'flex' }}>
          <Hand size={12} />
        </span>
      ) : null}
      <Dot color={STATUS_COLOR[(partner ?? lead).status]} size={6} />
    </m.button>
  );
}

/**
 * One piece of infrastructure and everything running inside it. There is no drilling in: the
 * contents are the card, and a hand on the header is the same hand as the row that raised it.
 */
export function Card({
  entity,
  contents,
  selectedId,
}: {
  entity: Entity;
  contents: Entity[];
  selectedId: string | null;
}): React.ReactElement {
  const rows = pairsOf(contents);
  const untrusted = entity.glyph === 'shield';
  const handInside = contents.some((c) => c.hand);
  const selected = selectedId === entity.id;

  return (
    <m.section
      // Position only. Plain `layout` animates height too, which scales the card's own text
      // for the length of the transition every time a row is added.
      layout="position"
      variants={cardMotion}
      initial="hidden"
      animate="shown"
      exit="gone"
      transition={reflow}
      style={{
        width: CARD_W,
        padding: 14,
        borderRadius: RADIUS.card,
        background: untrusted ? 'rgba(254,246,231,0.5)' : SURFACE,
        border: untrusted ? `1px dashed ${ATTENTION_EDGE}` : `1px solid ${LINE}`,
        boxShadow: untrusted ? 'none' : SHADOW.card,
        outline: selected ? `2px solid ${INK}` : 'none',
        outlineOffset: -1,
      }}
    >
      <button
        type="button"
        onClick={() => store.select(selected ? null : entity.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          marginBottom: rows.length > 0 ? 12 : 0,
          padding: 0,
          border: 'none',
          background: 'transparent',
          textAlign: 'left',
          cursor: 'pointer',
          color: INK,
        }}
      >
        <Glyph glyph={entity.glyph} status={entity.status} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontWeight: 600, letterSpacing: '-0.005em' }}>
            {entity.label}
          </span>
          <span style={{ display: 'block', color: untrusted ? '#8A6A38' : QUIET, fontSize: 12 }}>
            {entity.meta}
          </span>
        </span>
        {entity.count === null ? null : (
          <span
            key={entity.count}
            className="fleet-tick"
            style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
          >
            {entity.count}
          </span>
        )}
        {untrusted ? (
          <span
            style={{
              padding: '3px 9px',
              borderRadius: RADIUS.pill,
              background: '#FBE7C6',
              color: '#8A4B10',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.03em',
            }}
          >
            UNTRUSTED
          </span>
        ) : null}
        {entity.hand || handInside ? (
          <span style={{ color: ATTENTION, display: 'flex' }}>
            <Hand />
          </span>
        ) : (
          <Dot color={STATUS_COLOR[entity.status]} size={8} />
        )}
      </button>

      {rows.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <AnimatePresence initial={false}>
            {rows.map((pair) => (
              <Row key={pair.lead.id} pair={pair} selectedId={selectedId} />
            ))}
          </AnimatePresence>
        </div>
      ) : null}

      {rows.length === 0 && !entity.persistent ? (
        <div
          style={{
            height: 72,
            marginTop: 2,
            border: `1px dashed ${untrusted ? ATTENTION_EDGE : '#DDE3EA'}`,
            borderRadius: RADIUS.row,
            display: 'grid',
            placeItems: 'center',
            color: untrusted ? ATTENTION_INK : QUIET,
            background: untrusted ? ATTENTION_TINT : 'transparent',
          }}
        >
          Nothing running
        </div>
      ) : null}
    </m.section>
  );
}
