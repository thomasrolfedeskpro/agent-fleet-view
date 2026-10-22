# T1 — Simulator

**Owns** `packages/simulator/**` and nothing else.

## Build

Implement `createSimulator(scenario)` against the `Simulator` type already in
`packages/simulator/src/index.ts`. It is pure: no timers, no I/O, no `Date.now()` except where
`snapshot()` is handed a date.

- `advance(dtMs)` moves scenario time on and applies every beat whose `at` has now passed.
- `snapshot(seq, sentAt?)` returns the current state as a `Snapshot`.
- `jumpToBeat(n)` applies beats 0..n from a clean state and sets the clock to that beat's `at`.
- `reset()` returns to beat 0.
- `beat` is the index of the last beat applied; `finished` is true once the last one has been.

`applyOps` and `orderedEntities` in `@fleet/schema` are the reference semantics — use them
rather than reimplementing. Entity order must stay declaration order, because layout slots
depend on it.

## Done when

- For every beat 0–20 of `scenario-01`, advancing to that beat's time and taking a snapshot
  deep-equals `fixtures/scenario-01/beat-NN.json`, ignoring `seq` and `sentAt`.
- `jumpToBeat(n)` produces the same entities as advancing to it.
- Advancing past the end is a no-op and sets `finished`.
- Advancing in many small steps gives the same result as one large step.
- `pnpm check` is green.
