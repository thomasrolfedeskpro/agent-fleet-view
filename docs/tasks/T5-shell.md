# T5 — Shell and net

**Owns** `apps/web/src/chrome/**` and `apps/web/src/net/client.ts`. Nothing else — in
particular not `src/net/mockClient.ts`, `src/net/types.ts` or `src/App.tsx`.

## Build

**`src/net/client.ts`** — the real client, same `FleetClient` shape as the mock:

- Connects to `WS_URL`, parses every message with `ServerMessage`, pushes into the store.
- Reconnects with backoff, capped; reports `connecting` / `open` / `closed`.
- `send` serialises a `ClientCommand`.

**`src/chrome/**`** — replace the placeholder, keeping the `Chrome()` export:

- A fleet summary strip: working, idle, initializing, error and **hands raised**.
- A freshness readout: the age of the last snapshot and its band, using `freshnessOf` from
  `@fleet/schema` and colours from `src/theme/tokens.ts`. It must tick on its own, not only when
  a snapshot arrives, or a dead feed will look current forever.
- A list of the entities in view, sharing selection with the floor.
- A detail panel for the selected entity: label, kind, type, status, badges, hand, and its
  `links[]` as real anchors that open in a new tab. When there is nothing more to say than
  "this failed", that is what it says, plus the links.
- A breadcrumb back out of a drilled-in view.

## Done when

- Freshness moves current → delayed → stale at 20s and 60s against a faked clock.
- Selection is shared between list and floor.
- A dropped socket reconnects without a page reload.
- `pnpm check` is green.
