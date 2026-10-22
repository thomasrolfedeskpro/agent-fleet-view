# D3 — A busy afternoon

**Owns** `packages/schema/src/scenarios/**` and `fixtures/**`. Nothing else.

## Build

A second scenario, `scenario-02`, id `scenario-02`, titled **A busy afternoon**: ten cloud
instances, six sandbox/agent pairs in each, plus the four persistent things scenario-01 has
(VDP intake, Linear, control plane, model gateway) and one untrusted zone with a live finding.

- Build it with a generator in the scenario file, not 600 lines by hand — but the output must
  be deterministic: no clock, no randomness, same beats every run.
- Open on a quiet floor, bring the instances up over several beats, then settle into the busy
  state. Somewhere in it: four agents in `error` with a hand raised, a few `initializing`, a
  few `idle`, the rest `working`.
- Every entity needs `glyph` and `meta`; pairs need `pairWith` both ways; instance `meta`
  carries region and slots, like `eu-west-1a · 6 of 6 slots`.
- Register it in `SCENARIOS` so the server offers it and the debug panel's picker lists it.
- `pnpm fixtures` regenerates `fixtures/`; commit what it writes.

## Rules

- Do not change `scenario-01` or anything outside your paths.
- Do not add dependencies.
- Add tests: the scenario parses, beats ascend, the end state has the entity counts you intend,
  and the fixtures match a fresh generation.
- `pnpm check` green before you hand back.
