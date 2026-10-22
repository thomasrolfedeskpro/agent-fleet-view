# D2 — Debug panel

**Owns** `apps/web/src/debug/**`. Nothing else.

The visual target is the design canvas: the right-hand column on the Main artboard.
Every colour and radius comes from `apps/web/src/theme/tokens.ts`.

## Build

Restyle the existing panel to match, keeping every control it already dispatches:

- A header row with a collapse toggle, and a readout line — connection, `seq`, `beat`, age —
  that stays visible when collapsed, with a freshness dot coloured by `freshnessOf`.
- Scenario picker as a bordered select.
- Start as a filled green button, Pause/Resume and Reset as bordered buttons.
- Speed as a segmented control on a sunken track, the active one raised on white.
- Force stale as a checkbox with a quiet explanatory note to its right.
- The beat list: `m:ss` in tabular figures, the note beside it, the current beat on a tinted
  row with a green inset rule, click to jump, and the current row scrolled into view.

## Rules

- Dispatch through `store.send(...)` only. Never talk to a client.
- Do not add dependencies. Do not edit outside `debug/`.
- Keep the existing tests passing; add any the restyle needs.
- `pnpm check` green before you hand back.
