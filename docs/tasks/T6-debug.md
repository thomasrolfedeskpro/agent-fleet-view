# T6 — Debug panel

**Owns** `apps/web/src/debug/**` and nothing else.

## Build

Replace the placeholder, keeping the `DebugPanel()` export. This is the control surface the
whole POC is judged on, so it should be pleasant rather than raw.

- Scenario picker, from `hello.scenarios`.
- Start, pause, resume, reset.
- Speed selector over `SPEEDS` from `@fleet/schema`.
- The beat list from `hello.scenarios[].beats`, each showing `at` and `note`, with the current
  beat marked and click-to-jump calling `jumpToBeat`.
- A force-stale toggle wired to `setStalling`, so the freshness bands can be seen on demand.
- A readout: connection, `seq`, beat index, and the age of the last snapshot in seconds.
- Collapsible, so the floor can have the screen.

Dispatch everything through `store.send(...)`. Never talk to a client directly.

## Done when

- Every control dispatches the matching `ClientCommand`.
- The beat list tracks `snapshot.beat`.
- Collapsing and expanding does not drop state.
- `pnpm check` is green.
