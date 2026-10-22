# D1 — Chrome: top bar, filter, list, detail

**Owns** `apps/web/src/chrome/**`. Nothing else.

The visual target is the design canvas. Match the Main and Density artboards:
light surfaces, Inter, glyphs in tinted squares, 1px `--line` borders, soft shadows.
`apps/web/src/theme/tokens.ts` holds every colour and radius — never a raw hex in a component.

## Build

- **Top bar** (`TopBar`): keep the counts, restyle to the artboard — brand mark on the left,
  tallies with status dots, the **needs a person** tally as an amber pill that only colours
  when it is above zero, freshness on the right reading `live · updated 1s ago`.
- **Filter**, new and the centrepiece: a search field over id, label, type and status, plus
  toggle pills for *All*, *Needs a person* and *Errors* carrying their counts. It writes
  `store.setFilter({ text, needsPerson })`. With one level and no drilling, this is how a
  person finds anything, so it deserves real care.
- **List**: every entity the filter leaves, with a status dot, the label, a hand mark and a
  queue count where there is one. A child row sits indented under its parent. Clicking selects.
- **Detail panel**: the selected entity — glyph, label, meta, kind, type, status, badges, hand —
  then its `links[]` as real anchors opening in a new tab. When all there is to say is "this
  failed", say that and show the links.

## Rules

- **Identifiers, never content.** Only declared `Entity` fields reach the screen.
- Do not add dependencies. Do not edit outside `chrome/`.
- Reuse `filtered`, `matches`, `counts` from the store; do not reimplement filtering.
- Real `<button>`, `<a href>`, `<input>` + `<label>`; `aria-label` on icon-only controls.
- `pnpm check` green before you hand back.
