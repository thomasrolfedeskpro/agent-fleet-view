# Fleet View POC — build plan

A local proof of concept for an agent fleet view: a read-only page that draws any environment
which declares itself, fed by a simulator. **Done** is a UI with a debug panel that starts
`scenario-01` — a VDP report through Tess, Vera and Jim — and renders it live on the floor.

## What this is

- A **discovery surface, not a lookup surface**. It answers "what is going on right now",
  not "where is PDEV-524". Clicking something takes you out to the tool that manages it.
- **A state, not a story.** One current state at a time. Animation makes a change noticeable;
  nothing travels along a line.
- **Identifiers, never content.** Ids, labels, states and counts. No log lines, prompts,
  tool output or report text, anywhere, ever.

## The visual grammar

| Rule | Detail |
| --- | --- |
| Four statuses | `initializing` blue, `working` green, `idle` grey, `error` red |
| The raised hand | Means a person is needed, whatever the reason. A fault raises one; a wait raises one. It propagates up to every container above it |
| A container shows two marks | Its own status on the left, and whether a hand is raised inside it on the right. Binary — no counts at container level |
| Counts | Live in the fleet summary strip, not on containers. "Seven hands raised" is the number that starts an investigation |
| Two levels | Infrastructure (provisioned in a cloud account) and contents (everything running inside one, flattened). A VM is contents |
| Pairs | A sandbox and its agent are two components, tethered, stacked vertically in spawn order. The tether is structural only |
| Freed slots | Stay empty. Nothing below a torn-down pair ever moves |
| Freshness | Last poll time, top right: green under 20s, amber to 60s, red beyond |

## Stack

Node >= 22 (`.nvmrc` says 24), pnpm 10 workspaces, TypeScript 6 strict, Zod 4, Biome 2.5,
Vitest 4, Vite 8, React 19, PixiJS 8 used **imperatively** (no `@pixi/react`), `ws` on the
server, a hand-rolled store on `useSyncExternalStore`. Server `8787`, web `5173`.

## Layout

```text
packages/schema      the contract: entities, wire, scenario, constants, scenario-01
packages/layout      pure positioning: slots, pairs, tethers
packages/simulator   pure scenario engine (T1)
apps/server          ws server, tick loop, commands (T2)
apps/web/src/theme   tokens            (frozen)
apps/web/src/store   the store         (frozen)
apps/web/src/net     types frozen; client.ts is T5
apps/web/src/floor   PixiJS renderer   (T4)
apps/web/src/chrome  summary, list, detail (T5)
apps/web/src/debug   debug panel       (T6)
fixtures/scenario-01 21 golden snapshots + manifest.json
```

## Tasks

| Task | Owns | Goal |
| --- | --- | --- |
| T0 | everything else | Done: contract, fixtures, shell |
| T1 | `packages/simulator` | Pure engine that reproduces the fixtures |
| T2 | `apps/server` | ws server, tick loop, full command set |
| T3 | `packages/layout` | Harden layout: slot stability, pairs, tests |
| T4 | `apps/web/src/floor` | The PixiJS floor |
| T5 | `apps/web/src/chrome`, `src/net/client.ts` | Summary strip, list, detail, real ws client |
| T6 | `apps/web/src/debug` | The debug panel |
| T7 | integration | Merge, wire the simulator in, flip to live |

## Worktrees

Each parallel task runs in a sibling directory, never inside the repo — tools that scan a tree
otherwise find six copies of everything:

```bash
git worktree add ../agent-fleet-view.worktrees/t1-simulator -b task/t1-simulator phase-0
cd ../agent-fleet-view.worktrees/t1-simulator && pnpm install --frozen-lockfile
```

## Standing rules

1. **Do not make product decisions.** They are in this document. If something is genuinely
   undecided, stop and say so rather than choosing.
2. **Do not add dependencies.** T0 installed everything. `pnpm install --frozen-lockfile` only.
3. **Do not edit outside your owned paths**, including to "just fix" an import.
4. **The renderer stays ignorant of the domain.** It knows containers, items, status, links and
   counts. The strings `sandbox`, `jim`, `tess`, `dev-host` must never appear in logic — only as
   data flowing through.
5. **No content on the floor, ever.**
6. **`pnpm check` is green before you hand back.** A red branch is not finished work.
7. **Comments: why, not what.** No restating the next line, no notes to a future model, no
   section banners.
8. **Fixtures are the oracle.** If behaviour and a golden fixture disagree, the fixture wins.
