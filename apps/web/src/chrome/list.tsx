import type { Entity } from '@fleet/schema';
import { useMemo } from 'react';
import { Hand } from '../floor/glyph.js';
import { entities, filtered, isFiltering, store, useStore } from '../store/index.js';
import {
  ATTENTION,
  INK,
  LINE,
  QUIET,
  RADIUS,
  STATUS_COLOR,
  SUNKEN,
  WIRE,
} from '../theme/tokens.js';
import { section, sectionTitle } from './styles.js';

export type Row = { entity: Entity; depth: number };

/**
 * Rows in declaration order, with each surviving child pulled up under its own parent. A child
 * whose parent the filter removed still reads as a child — it is indented where it stands.
 */
export function listRows(kept: Entity[]): Row[] {
  const present = new Set(kept.map((e) => e.id));
  const emitted = new Set<string>();
  const rows: Row[] = [];

  for (const entity of kept) {
    if (emitted.has(entity.id)) continue;
    if (entity.parentId !== null && present.has(entity.parentId)) continue;
    emitted.add(entity.id);
    rows.push({ entity, depth: entity.parentId === null ? 0 : 1 });
    for (const child of kept) {
      if (child.parentId !== entity.id || emitted.has(child.id)) continue;
      emitted.add(child.id);
      rows.push({ entity: child, depth: 1 });
    }
  }

  return rows;
}

export function useListRows(): Row[] {
  const snapshot = useStore((s) => s.snapshot);
  const filter = useStore((s) => s.filter);

  /** `filtered` builds a new array per call, so it is derived from the two inputs that move it. */
  return useMemo(
    () => listRows(filtered({ ...store.getState(), snapshot, filter })),
    [snapshot, filter],
  );
}

/** The run of the label a search hit on, so a long list shows why each row survived. */
function Label({ text, query }: { text: string; query: string }): React.ReactElement {
  const at = query ? text.toLowerCase().indexOf(query) : -1;
  if (at < 0) return <>{text}</>;

  return (
    <>
      {text.slice(0, at)}
      <strong style={{ fontWeight: 700 }}>{text.slice(at, at + query.length)}</strong>
      {text.slice(at + query.length)}
    </>
  );
}

function RowItem({
  row,
  query,
  selected,
}: {
  row: Row;
  query: string;
  selected: boolean;
}): React.ReactElement {
  const { entity, depth } = row;
  const color = STATUS_COLOR[entity.status];

  return (
    <li>
      <button
        type="button"
        className="chrome-row"
        data-testid={`row-${entity.id}`}
        data-depth={depth}
        aria-pressed={selected}
        onClick={() => store.select(selected ? null : entity.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          width: '100%',
          padding: '5px 8px',
          paddingLeft: 8 + depth * 12,
          font: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
          color: INK,
          borderRadius: RADIUS.row,
          border: '1px solid transparent',
          background: selected ? SUNKEN : 'transparent',
          borderColor: selected ? LINE : 'transparent',
          boxShadow: selected ? `inset 2px 0 0 ${color}` : 'none',
        }}
      >
        {depth > 0 ? (
          <span
            aria-hidden="true"
            style={{ width: 7, height: 1, background: WIRE, flex: 'none' }}
          />
        ) : null}
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: RADIUS.pill,
            background: color,
            flex: 'none',
          }}
        />
        <span
          style={{
            flex: '1 1 auto',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: selected || depth === 0 ? 600 : 400,
          }}
        >
          <Label text={entity.label} query={query} />
        </span>
        {entity.hand ? (
          <span
            data-testid={`hand-${entity.id}`}
            style={{ color: ATTENTION, display: 'flex', flex: 'none' }}
          >
            <Hand size={12} />
          </span>
        ) : null}
        {entity.count === null ? null : (
          <span
            style={{
              flex: 'none',
              minWidth: 18,
              padding: '0 5px',
              borderRadius: RADIUS.pill,
              background: SUNKEN,
              border: `1px solid ${LINE}`,
              color: INK,
              fontSize: 11,
              lineHeight: '16px',
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {entity.count}
            <span className="chrome-sr"> in the queue</span>
          </span>
        )}
      </button>
    </li>
  );
}

export function EntityList(): React.ReactElement {
  const rows = useListRows();
  const filter = useStore((s) => s.filter);
  const selectedId = useStore((s) => s.selectedId);
  const total = useStore((s) => entities(s).length);
  const narrowing = isFiltering(filter);
  const query = filter.text.trim().toLowerCase();

  return (
    <section data-testid="list" style={{ ...section, flex: '1 1 auto', minHeight: 0 }}>
      <h2 style={sectionTitle}>
        On the floor · {narrowing ? `${rows.length} of ${total}` : total}
      </h2>
      {rows.length === 0 ? (
        <p style={{ margin: 0, color: QUIET }}>
          {total === 0 ? 'Waiting for the first snapshot.' : 'Nothing matches that.'}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 1 }}>
          {rows.map((row) => (
            <RowItem
              key={row.entity.id}
              row={row}
              query={query}
              selected={row.entity.id === selectedId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
