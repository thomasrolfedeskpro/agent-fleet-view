import type { Entity } from '@fleet/schema';
import { bandOf } from '@fleet/schema';
import { useCallback, useEffect, useRef } from 'react';
import { byId, childrenOf, store, useStore } from '../store/index.js';
import {
  HAIRLINE,
  INK,
  LINE,
  QUIET,
  RADIUS,
  SHADOW,
  STATUS_COLOR,
  SURFACE,
} from '../theme/tokens.js';
import { Detail } from './detail.js';
import { dot } from './styles.js';

const BAND_NAME = {
  input: 'an input channel',
  'always-on': 'always on',
  ephemeral: 'spun up on demand',
} as const;

function Jump({ entity, relation }: { entity: Entity; relation: string }): React.ReactElement {
  return (
    <li>
      <button
        type="button"
        className="chrome-link"
        onClick={() => store.select(entity.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '6px 9px',
          borderRadius: RADIUS.row,
          border: `1px solid ${LINE}`,
          background: SURFACE,
          color: INK,
          fontSize: 12,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span style={dot(STATUS_COLOR[entity.status], 6)} />
        <span style={{ flex: 1, minWidth: 0 }}>{entity.label}</span>
        <span style={{ color: QUIET }}>{relation}</span>
      </button>
    </li>
  );
}

/** Where a thing sits and what it is joined to — the context a sidebar had no room for. */
function Related({ entity }: { entity: Entity }): React.ReactElement | null {
  const parent = useStore((s) => (entity.parentId ? byId(s, entity.parentId) : undefined));
  const partner = useStore((s) => (entity.pairWith ? byId(s, entity.pairWith) : undefined));
  const contents = useStore((s) => childrenOf(s, entity.id));

  if (!parent && !partner && contents.length === 0) return null;

  return (
    <section style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${HAIRLINE}` }}>
      <h3
        style={{
          margin: '0 0 8px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          color: QUIET,
        }}
      >
        RELATED
      </h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 5 }}>
        {parent ? <Jump entity={parent} relation="runs in" /> : null}
        {partner ? <Jump entity={partner} relation="paired with" /> : null}
        {contents.map((child) => (
          <Jump key={child.id} entity={child} relation="inside" />
        ))}
      </ul>
    </section>
  );
}

/**
 * Selection opens this rather than filling a panel at the foot of a scrolling sidebar, where a
 * long list buried it. Not a native `<dialog>`: the backdrop and focus are handled here so the
 * behaviour is the same wherever it runs, tests included.
 *
 * Escape is bound to the panel and not to the document, so the search field keeps its own
 * two-stage Escape when focus is still down there.
 */
export function DetailDialog(): React.ReactElement | null {
  const entity = useStore((s) => byId(s, s.selectedId));
  const panel = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<Element | null>(null);
  const open = entity !== undefined;

  const close = useCallback(() => store.select(null), []);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement;
    panel.current?.focus();
    return () => {
      const back = returnFocus.current;
      if (back instanceof HTMLElement && back.isConnected) back.focus();
    };
  }, [open]);

  if (!entity) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      {/* A real button, so clicking away is reachable by keyboard and screen reader alike. */}
      <button
        type="button"
        data-testid="detail-backdrop"
        aria-label="Close details"
        onClick={close}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          padding: 0,
          background: 'rgba(17, 22, 28, 0.32)',
          cursor: 'default',
        }}
      />
      <div
        ref={panel}
        data-testid="detail"
        data-entity={entity.id}
        role="dialog"
        aria-modal="true"
        aria-label={`${entity.label} — details`}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close();
        }}
        style={{
          position: 'relative',
          width: 'min(480px, 100%)',
          maxHeight: '100%',
          overflow: 'auto',
          padding: 20,
          borderRadius: 16,
          background: SURFACE,
          boxShadow: SHADOW.raised,
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Detail entity={entity} />
          </div>
          <button
            type="button"
            aria-label="Close details"
            onClick={close}
            style={{
              width: 28,
              height: 28,
              flex: 'none',
              display: 'grid',
              placeItems: 'center',
              border: `1px solid ${LINE}`,
              borderRadius: 8,
              background: SURFACE,
              color: QUIET,
              cursor: 'pointer',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <Related entity={entity} />

        <p style={{ margin: '14px 0 0', fontSize: 11, color: QUIET }}>
          {BAND_NAME[bandOf(entity)]} · esc to close
        </p>
      </div>
    </div>
  );
}
