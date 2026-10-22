# T2 — Server

**Owns** `apps/server/**` and nothing else.

## Build

A `ws` server on port `8787` at `/stream` (both already in `src/types.ts`).

- On connect, send `hello` with `tickMs` and the scenario list.
- While running, send `{ type: 'snapshot', snapshot }` every `TICK_MS / speed` milliseconds of
  wall time, advancing scenario time by `TICK_MS` each tick. `seq` increments per message.
- Handle every `ClientCommand`: `start`, `pause`, `resume`, `reset`, `setSpeed`, `jumpToBeat`,
  `setStalling`.
- `setStalling: true` stops emission **without closing the socket** — it exists so the freshness
  bands can be exercised on demand.
- Validate incoming messages with `ClientCommand.parse` and ignore anything that fails.
- Snapshots come from the `SnapshotSource` interface in `src/types.ts`. Ship **only** the
  fixture-backed implementation, reading `fixtures/scenario-01/*.json` from disk. T7 swaps in a
  simulator-backed one; nothing outside that one file may know which is in use.
- `src/main.ts` starts it and logs the URL.

## Done when

- A test client connects, receives `hello`, then snapshots at the expected cadence.
- `pause` halts emission, `resume` restarts it, `setSpeed` changes the interval, `jumpToBeat`
  makes that beat the next one sent, `setStalling` stops emission with the socket still open.
- Several clients can connect at once and all receive the same stream.
- `pnpm check` is green.
