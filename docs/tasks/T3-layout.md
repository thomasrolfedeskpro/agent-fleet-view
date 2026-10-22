# T3 — Layout

**Owns** `packages/layout/**` and nothing else.

## Build

T0 left a working first pass in `src/index.ts`. Harden it and prove it.

- `layoutOverview` places top-level entities (`parentId === null`) in a grid in declaration order.
- `layoutContainer` places the contents of one piece of infrastructure, flattened to one level:
  a pair on one row with its partner beside it, everything else on a row of its own, rows stacked
  in spawn order.
- Slot stability is the point: `prev.slots` is carried forward, a surviving entity keeps its slot,
  a freed slot stays empty, and a newcomer takes the lowest index nobody holds.
- Pairs come from `pairWith`, which is explicit in the data. Never infer a pair from ids or types.
- `tethers` lists each pair once.

## Done when

- Replaying `fixtures/scenario-01` beat by beat, feeding each result in as the next `prev`:
  - pair 1 (`sandbox-1`/`jim-1`) never moves when pair 2 is added at beat 17;
  - the slot pair 2 held stays empty after beat 19, and pair 1 does not move up;
  - `dev-host-1` keeps its row throughout.
- A pair's two cells always share a `y` and are adjacent in `x`.
- Layout is a pure function: same input, same output, no clock, no randomness.
- `pnpm check` is green.
