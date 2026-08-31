# Task Spec (Tier 3) — Phase 1 / Task 1: Data Model

**Parent:** Phase 1 → Task 1
**Blocked by:** none
**difficulty:** `easy`
**routes to:** local (Claude Code — local endpoints not yet wired)

## What to build

Extend `MISSIONS` in `lore.js` so every objective carries its `type` and params (the DSL
from the phase spec §3.2), move the ending-card object out of `gameplay.js` into `lore.js`
as `ENDING_CARD`, and create `src/game/content.js` with the `LANDMARKS` and `CONTENT`
tables. **No gameplay logic changes in this task** — the engine that consumes the new data
arrives in task 2.

## Files this task may touch

- `src/game/lore.js`
- `src/game/content.js` (new)
- `src/game/gameplay.js` — **scoped: only** delete the `STATION`/`MASSIF` const lines
      (gameplay.js:13-14) and add one re-export line
      `export { STATION, MASSIF } from './content.js';` so `hud.js`/`main.js` keep
      working. No other change to `gameplay.js` in this task.

## Acceptance criteria (contract — MUST be testable)

- [ ] Every objective in all 5 missions has a `type` (`'distance'` | `'event'` | `'count'`)
      plus its params, matching phase spec §3.2 exactly (ids, refs, ops, values, counts
      unchanged from today's hardcoded behaviour: drive `> 120` from home; reach `< 26`
      station; massif `< 46` massif with `minH: 12`; find3 count 3; relays count 3).
- [ ] `lore.js` exports `ENDING_CARD` with the exact tag/name/brief/objectives currently
      inline in `gameplay.js:172-176`.
- [ ] `content.js` is the new home of the `STATION = {x: -236, z: 140}` and
      `MASSIF = {x: 0, z: 0}` constants (moved from `gameplay.js`, values unchanged),
      exports `LANDMARKS = { home: HOME, station: STATION, massif: MASSIF }`
      (`HOME` imported from `world/props.js` — no cycle: `props.js` never imports
      `content.js`), and exports `CONTENT` with the station prompt record
      (`{ at: 'station', radius: 12, unlocksOn: 'reach', key: 'station',
      prompt: 'HOLD <kbd>E</kbd> — INTERROGATE LOCAL STORE' }`).
- [ ] Existing objective `id`/`text`/`hint`/`count` fields are byte-identical to today
      (the HUD renders them; nothing may visibly change).
- [ ] Tests pass: `node --check src/game/lore.js src/game/content.js`
- [ ] Gate unchanged and green (behavior must not move yet): `node tools/gate.cjs 2828 .shots`

## Context the worker needs (and ONLY this)

- Why: this is the "data" half of the data-driven refactor; task 2 consumes it.
- Constraints (from constitution): no build step; single quotes, camelCase, match the
  file's style; lore text is canonical — do not reword any existing string; no runtime
  assets.
- May use: existing exports `STATION`/`MASSIF` from `gameplay.js`, `HOME` from
  `world/props.js`. Note: `content.js` importing from `gameplay.js` while `gameplay.js`
  imports `CONTENT` back is a module cycle — ESM handles it, but **keep `content.js` free
  of `gameplay.js` imports**: define `LANDMARKS` to read `HOME`/`STATION`/`MASSIF` from
  `props.js`/`lore.js`-neutral sources, or pass landmarks in. Cleanest: `content.js`
  imports only `HOME` from `world/props.js` and exports `STATION`/`MASSIF` constants
  (moved from `gameplay.js`, which re-exports them for compat) so `gameplay.js` has no
  cycle. Decide during implementation; either way `content.js` must not import
  `gameplay.js`.

## Verification gate (run before merge)

- [ ] Acceptance criteria all met
- [ ] Tests green (`node --check`)
- [ ] Gate green (unchanged scenario)
- [ ] Spec still matches code (no drift)

---
_Result / notes:_
- `MISSIONS` in `lore.js` retyped: every objective carries `type`
  (`event` | `distance` | `count`) and its params (`on`, `ref`, `op`, `v`, `count`,
  `minH`, `special`, `unlocks`, `text`, `hint`). `ENDING_CARD` moved from
  `gameplay.js` to `lore.js` as data.
- New `src/game/content.js`: `LANDMARKS` (`home`/`station`/`massif`) re-exported from
  the existing sources (no duplication), the `CONTENT` station-prompt record, and the
  `unlocksOn` convention documented. `content.js` does not import `gameplay.js`.
- Commit `a7a1071`. `node --check` green; gate scenario unchanged and still green.
