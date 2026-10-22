import { useCallback, useEffect, useRef } from 'react';
import { Hand } from '../floor/glyph.js';
import { counts, entities, isFiltering, store, useStore } from '../store/index.js';
import {
  ATTENTION_EDGE,
  ATTENTION_INK,
  ATTENTION_TINT,
  INK,
  LINE,
  QUIET,
  RADIUS,
  STATUS_INK,
  STATUS_TINT,
  SURFACE,
} from '../theme/tokens.js';
import { useListRows } from './list.js';
import { resetButton, section, sectionTitle } from './styles.js';

/** The pill that stands for "only the things in trouble" writes the status as the search term. */
const ERRORS_TERM = 'error';

type Tone = 'neutral' | 'attention' | 'error';

const TONE: Record<Tone, { background: string; border: string; color: string }> = {
  neutral: { background: INK, border: INK, color: SURFACE },
  attention: { background: ATTENTION_TINT, border: ATTENTION_EDGE, color: ATTENTION_INK },
  error: { background: STATUS_TINT.error, border: STATUS_TINT.error, color: STATUS_INK.error },
};

function SearchIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke={QUIET}
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ flex: 'none' }}
    >
      <circle cx="7" cy="7" r="4.4" />
      <path d="M10.4 10.4 14 14" />
    </svg>
  );
}

function Pill({
  id,
  label,
  count,
  active,
  tone,
  icon,
  onClick,
}: {
  id: string;
  label: string;
  count: number;
  active: boolean;
  tone: Tone;
  icon?: React.ReactNode;
  onClick: () => void;
}): React.ReactElement {
  const skin = active ? TONE[tone] : { background: SURFACE, border: LINE, color: QUIET };

  return (
    <button
      type="button"
      className="chrome-pill"
      data-testid={`pill-${id}`}
      data-count={count}
      aria-pressed={active}
      onClick={onClick}
      style={{
        ...resetButton,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 26,
        padding: '0 9px',
        borderRadius: RADIUS.pill,
        background: skin.background,
        border: `1px solid ${skin.border}`,
        color: skin.color,
        fontSize: 12,
      }}
    >
      {icon}
      <span>{label}</span>
      <span
        style={{
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 600,
          color: active ? skin.color : INK,
        }}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * One level and no drilling in, so this is the only way to find one thing among many: a search
 * over identifiers and state, and three standing questions as pills.
 */
export function FilterPanel(): React.ReactElement {
  const filter = useStore((s) => s.filter);
  const selectedId = useStore((s) => s.selectedId);
  const total = useStore((s) => entities(s).length);
  const hands = useStore((s) => counts(s).hands);
  const errors = useStore((s) => counts(s).error);
  const rows = useListRows();
  const input = useRef<HTMLInputElement>(null);

  const narrowing = isFiltering(filter);
  const onErrors = filter.text.trim().toLowerCase() === ERRORS_TERM;

  const setText = useCallback(
    (text: string) => store.setFilter({ ...store.getState().filter, text }),
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      event.preventDefault();
      input.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  /** The list is long and the field is where the hands already are, so it drives the selection. */
  const step = (delta: number): void => {
    if (rows.length === 0) return;
    const at = rows.findIndex((row) => row.entity.id === selectedId);
    const next = at < 0 ? (delta > 0 ? 0 : rows.length - 1) : at + delta;
    const row = rows[Math.min(rows.length - 1, Math.max(0, next))];
    if (row) store.select(row.entity.id);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      step(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const already = rows.some((row) => row.entity.id === selectedId);
      const first = rows[0];
      if (!already && first) store.select(first.entity.id);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (filter.text) setText('');
      else store.select(null);
    }
  };

  return (
    <section data-testid="filter" style={{ ...section, background: SURFACE }}>
      <label htmlFor="fleet-search" style={sectionTitle}>
        Find on the floor
      </label>

      <div
        className="chrome-field"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          height: 34,
          padding: '0 9px',
          borderRadius: RADIUS.row,
          border: `1px solid ${LINE}`,
          background: SURFACE,
        }}
      >
        <SearchIcon />
        <input
          id="fleet-search"
          ref={input}
          data-testid="filter-input"
          type="text"
          value={filter.text}
          placeholder="id, label, type or status"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          style={{
            flex: '1 1 auto',
            minWidth: 0,
            border: 'none',
            background: 'transparent',
            color: INK,
            fontSize: 13,
          }}
        />
        {filter.text ? (
          <button
            type="button"
            className="chrome-icon-button"
            data-testid="filter-clear"
            aria-label="Clear the search"
            onClick={() => {
              setText('');
              input.current?.focus();
            }}
            style={{ ...resetButton, color: QUIET, fontSize: 15, lineHeight: 1, flex: 'none' }}
          >
            ×
          </button>
        ) : (
          <span
            aria-hidden="true"
            style={{
              flex: 'none',
              padding: '0 5px',
              borderRadius: 5,
              border: `1px solid ${LINE}`,
              color: QUIET,
              font: 'inherit',
              fontSize: 10,
              lineHeight: '15px',
            }}
          >
            /
          </span>
        )}
      </div>

      <fieldset
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          margin: 0,
          marginTop: 9,
          padding: 0,
          border: 'none',
        }}
      >
        <legend className="chrome-sr">Narrow the floor</legend>
        <Pill
          id="all"
          label="All"
          count={total}
          tone="neutral"
          active={!narrowing}
          onClick={() => store.setFilter({ text: '', needsPerson: false })}
        />
        <Pill
          id="hands"
          label="Needs a person"
          count={hands}
          tone="attention"
          active={filter.needsPerson}
          icon={
            <span aria-hidden="true" style={{ display: 'flex' }}>
              <Hand size={12} />
            </span>
          }
          onClick={() =>
            store.setFilter({ ...store.getState().filter, needsPerson: !filter.needsPerson })
          }
        />
        <Pill
          id="errors"
          label="Errors"
          count={errors}
          tone="error"
          active={onErrors}
          onClick={() => setText(onErrors ? '' : ERRORS_TERM)}
        />
      </fieldset>

      <p
        data-testid="filter-count"
        style={{ margin: '8px 0 0', fontSize: 11, color: QUIET, minHeight: 15 }}
      >
        {narrowing
          ? `${rows.length} of ${total} · ↑↓ to step, ↵ to open, esc to clear`
          : 'Search, or press / from anywhere.'}
      </p>
    </section>
  );
}
