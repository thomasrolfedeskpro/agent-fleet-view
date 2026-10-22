import type { Entity } from '@fleet/schema';
import { Glyph, Hand } from '../floor/glyph.js';
import { byId, useStore } from '../store/index.js';
import {
  ATTENTION_EDGE,
  ATTENTION_INK,
  ATTENTION_TINT,
  INK,
  LINE,
  QUIET,
  RADIUS,
  STATUS_COLOR,
  STATUS_INK,
  STATUS_TINT,
  SURFACE,
} from '../theme/tokens.js';
import { dot, pill, section, sectionTitle } from './styles.js';

const rowStyle: React.CSSProperties = { display: 'flex', gap: 8, padding: '3px 0' };
const keyStyle: React.CSSProperties = { color: QUIET, width: 52, flex: '0 0 auto' };

function Field({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={rowStyle}>
      <dt style={keyStyle}>{name}</dt>
      <dd style={{ margin: 0, minWidth: 0, wordBreak: 'break-word' }}>{children}</dd>
    </div>
  );
}

/** The one line that is worth saying out loud before any of the fields. */
function Banner({ entity }: { entity: Entity }): React.ReactElement | null {
  const failed = entity.status === 'error';
  if (!failed && !entity.hand) return null;

  const skin = failed
    ? { background: STATUS_TINT.error, border: STATUS_TINT.error, color: STATUS_INK.error }
    : { background: ATTENTION_TINT, border: ATTENTION_EDGE, color: ATTENTION_INK };

  const says = failed
    ? entity.hand
      ? 'This failed, and someone is needed.'
      : 'This failed.'
    : 'Someone is needed here.';

  return (
    <p
      data-testid="detail-banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        margin: '10px 0 0',
        padding: '7px 9px',
        borderRadius: RADIUS.row,
        background: skin.background,
        border: `1px solid ${skin.border}`,
        color: skin.color,
        fontSize: 12,
      }}
    >
      {entity.hand ? (
        <span aria-hidden="true" style={{ display: 'flex', flex: 'none' }}>
          <Hand size={13} />
        </span>
      ) : null}
      {says}
    </p>
  );
}

/**
 * Identifiers only. Whatever an entity is doing, this panel names it and points at the tool
 * that owns it — it never carries log lines, prompts, tool output or report text.
 */
function Detail({ entity }: { entity: Entity }): React.ReactElement {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Glyph glyph={entity.glyph} status={entity.status} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{entity.label}</span>
          {entity.meta ? (
            <span style={{ display: 'block', fontSize: 12, color: QUIET }}>{entity.meta}</span>
          ) : null}
        </span>
      </div>

      <p style={{ margin: '8px 0 0', fontSize: 11, color: QUIET, wordBreak: 'break-all' }}>
        {entity.id}
      </p>

      <Banner entity={entity} />

      <dl style={{ margin: '10px 0 0', fontSize: 12 }}>
        <Field name="kind">{entity.kind}</Field>
        <Field name="type">{entity.type}</Field>
        <Field name="status">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={dot(STATUS_COLOR[entity.status], 7)} />
            <span style={{ color: STATUS_INK[entity.status] }}>{entity.status}</span>
          </span>
        </Field>
        <Field name="hand">
          <span data-testid="detail-hand" style={{ color: entity.hand ? ATTENTION_INK : QUIET }}>
            {entity.hand ? 'raised — needs a person' : 'not raised'}
          </span>
        </Field>
        {entity.count === null ? null : <Field name="count">{entity.count}</Field>}
        {entity.badges.length === 0 ? null : (
          <Field name="badges">
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {entity.badges.map((badge) => (
                <span key={badge} style={pill}>
                  {badge}
                </span>
              ))}
            </span>
          </Field>
        )}
      </dl>

      {entity.links.length === 0 ? null : (
        <ul
          data-testid="detail-links"
          style={{
            listStyle: 'none',
            margin: '10px 0 0',
            padding: '10px 0 0',
            borderTop: `1px solid ${LINE}`,
            display: 'grid',
            gap: 5,
          }}
        >
          {entity.links.map((link) => (
            <li key={`${link.label}:${link.href}`}>
              <a
                className="chrome-link"
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 9px',
                  borderRadius: RADIUS.row,
                  border: `1px solid ${LINE}`,
                  background: SURFACE,
                  color: INK,
                  fontSize: 12,
                  textDecoration: 'none',
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>{link.label}</span>
                <span aria-hidden="true" style={{ color: QUIET }}>
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function DetailPanel(): React.ReactElement {
  const entity = useStore((s) => byId(s, s.selectedId));

  return (
    <section
      data-testid="detail"
      data-entity={entity?.id ?? ''}
      style={{ ...section, borderBottom: 'none', background: SURFACE }}
    >
      <h2 style={sectionTitle}>Selected</h2>
      {entity ? (
        <Detail entity={entity} />
      ) : (
        <p style={{ margin: 0, color: QUIET }}>
          Nothing selected. Pick a row above, or something on the floor.
        </p>
      )}
    </section>
  );
}
