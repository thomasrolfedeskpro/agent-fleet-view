import type { Entity } from '@fleet/schema';
import { useMemo } from 'react';
import { filtered, store, useStore } from '../store/index.js';
import { ATTENTION, QUIET, STATUS_COLOR } from '../theme/tokens.js';
import { dot, pill, resetButton, section, sectionTitle } from './styles.js';

type Row = { entity: Entity };

function RowItem({ row, selected }: { row: Row; selected: boolean }): React.ReactElement {
  const { entity } = row;

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 6px',
        borderRadius: 6,
        background: selected ? 'rgba(47, 111, 237, 0.08)' : 'transparent',
        boxShadow: selected ? `inset 2px 0 0 ${STATUS_COLOR[entity.status]}` : 'none',
      }}
    >
      <button
        type="button"
        data-testid={`row-${entity.id}`}
        aria-pressed={selected}
        onClick={() => store.select(entity.id)}
        style={{
          ...resetButton,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flex: '1 1 auto',
          minWidth: 0,
        }}
      >
        <span style={dot(STATUS_COLOR[entity.status])} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entity.label}
        </span>
        {entity.hand ? (
          <span
            data-testid={`hand-${entity.id}`}
            style={{ ...pill, color: ATTENTION, borderColor: ATTENTION }}
          >
            hand
          </span>
        ) : null}
        {entity.count === null ? null : <span style={pill}>{entity.count}</span>}
      </button>
    </li>
  );
}

export function EntityList(): React.ReactElement {
  const snapshot = useStore((s) => s.snapshot);
  const filter = useStore((s) => s.filter);
  const selectedId = useStore((s) => s.selectedId);

  /** `filtered` builds a new array per call, so it is derived from the two inputs that move it. */
  const rows = useMemo<Row[]>(
    () => filtered({ ...store.getState(), snapshot, filter }).map((entity) => ({ entity })),
    [snapshot, filter],
  );

  return (
    <section data-testid="list" style={{ ...section, flex: '1 1 auto', minHeight: 0 }}>
      <h2 style={sectionTitle}>On the floor · {rows.length}</h2>
      {rows.length === 0 ? (
        <p style={{ margin: 0, color: QUIET }}>Nothing here.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 2 }}>
          {rows.map((row) => (
            <RowItem key={row.entity.id} row={row} selected={row.entity.id === selectedId} />
          ))}
        </ul>
      )}
    </section>
  );
}
