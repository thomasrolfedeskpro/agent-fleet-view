# T4 — Floor

**Owns** `apps/web/src/floor/**` and nothing else.

## Build

Replace the placeholder with the PixiJS surface. Export the same `Floor()` component so
`App.tsx` needs no change.

- One `PIXI.Application` created in an effect, mounted into a div, destroyed on unmount.
  Use PixiJS **imperatively**; `@pixi/react` is deliberately not a dependency.
- Draw from `layoutOverview` / `layoutContainer` in `@fleet/layout` plus the entities from the
  store. Never compute positions in this package.
- Per cell: rounded rect, border in the status colour from `src/theme/tokens.ts`, a state pill,
  the label, badges, a raised hand when `hand` is true, and for a container its own status dot
  plus a hand mark when anything inside has one.
- A queue entity (`count !== null`) shows its count, including zero.
- Draw tethers between paired cells. Structural only — no animation along them.
- Pan with drag, zoom with wheel, click a cell to `store.select(id)`, click a container to
  `store.setView({ mode: 'inside', containerId })`.
- Subscribe to the store directly inside the Pixi layer. **The canvas component must not
  re-render React on every snapshot.**
- Animate status changes over `TRANSITION_MS`. Nothing else animates.

## Done when

- The beat 16 fixture renders with a cell per visible entity and a tether for the pair.
- A click dispatches selection; a click on a container changes the view.
- No React re-render of the canvas component per snapshot (assert with a render counter).
- `pnpm check` is green.
