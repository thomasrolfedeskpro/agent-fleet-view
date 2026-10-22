import type { Entity } from '@fleet/schema';
import { byId, useStore } from '../store/index.js';
import { ATTENTION, LINE, QUIET, STATUS_COLOR } from '../theme/tokens.js';
import { dot, pill, section, sectionTitle } from './styles.js';

const rowStyle: React.CSSProperties = { display: 'flex', gap: 8, padding: '2px 0' };
const keyStyle: React.CSSProperties = { color: QUIET, width: 56, flex: '0 0 auto' };

function Field({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={rowStyle}>
      <dt style={keyStyle}>{name}</dt>
      <dd style={{ margin: 0, minWidth: 0, wordBreak: 'break-word' }}>{children}</dd>
    </div>
  );
}

/**
 * Identifiers only. Whatever an entity is doing, this panel names it and points at the tool
 * that owns it — it never carries log lines, prompts, tool output or report text.
 */
function Detail({ entity }: { entity: Entity }): React.ReactElement {
  return (
    <>
      <h3 style={{ margin: '0 0 2px', fontSize: 14 }}>{entity.label}</h3>
      <p style={{ margin: '0 0 10px', fontSize: 11, color: QUIET }}>{entity.id}</p>

      <dl style={{ margin: 0, fontSize: 12 }}>
        <Field name="kind">{entity.kind}</Field>
        <Field name="type">{entity.type}</Field>
        <Field name="status">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={dot(STATUS_COLOR[entity.status], 7)} />
            {entity.status}
          </span>
        </Field>
        <Field name="hand">
          <span data-testid="detail-hand" style={{ color: entity.hand ? ATTENTION : QUIET }}>
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
            padding: '8px 0 0',
            borderTop: `1px solid ${LINE}`,
            display: 'grid',
            gap: 4,
          }}
        >
          {entity.links.map((link) => (
            <li key={`${link.label}:${link.href}`}>
              <a href={link.href} target="_blank" rel="noreferrer">
                {link.label}
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
    <section data-testid="detail" data-entity={entity?.id ?? ''} style={section}>
      <h2 style={sectionTitle}>Selected</h2>
      {entity ? (
        <Detail entity={entity} />
      ) : (
        <p style={{ margin: 0, color: QUIET }}>Nothing selected.</p>
      )}
    </section>
  );
}
