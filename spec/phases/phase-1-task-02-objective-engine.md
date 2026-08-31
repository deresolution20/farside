# Task Spec (Tier 3) — Phase 1 / Task 2: Objective Engine

**Parent:** Phase 1 → Task 2
**Blocked by:** 1
**difficulty:** `hard`
**routes to:** frontier (hard) — or Claude Code while local endpoints are unwired

## What to build

Replace `missionIdx` with `missionId` and the 11 hand-wired `complete()`/`bump()` call
sites with the data-driven engine from phase spec §3.1-3.3: `emit(event, payload)`,
`checkState()`, and the `missionId`-based `reset()`/`advance()`/`mission` getter.
Behaviour must be **identical** to today's for all 5 existing missions.

## Files this task may touch

- `src/game/gameplay.js`

## Acceptance criteria (contract — MUST be testable)

- [ ] `grep -n "missionIdx" src/game/gameplay.js` returns matches **only** inside the
      transitional derived getter `get missionIdx()` (documented as such; removed in
      task 5 when the gate switches to `missionId`).
- [ ] `Game.missionId` is `string | null`; `get mission()` resolves by id; `reset(freeRoam)`
      sets `MISSIONS[0].id` or `null`; `advance()` advances by lookup and shows
      `ENDING_CARD` (imported from lore.js) + sets `freeRoam = true` when the campaign is
      exhausted.
- [ ] `emit(event, payload)` completes matching objectives of the **current** mission
      only (counted objectives accumulate; `special` filters `extract`); `checkState()`
      evaluates the current mission's unmet `distance` objectives each frame (op `>`/`<`,
      optional `minH`).
- [ ] Every action site now calls `emit` (or, for `sample`/`relay`, `bump`-equivalent via
      `emit('sample')`/`emit('relay')`); the surrounding non-objective side effects are
      untouched: `reach` still unlocks `roster` + logs the perimeter warning; hold-E still
      unlocks `log6`/`log11` + `stationVisited = true`; drumhead extraction still sets
      `drumTaken`; bay offload still logs + drains the bay; 3rd relay still unlocks `memo`.
- [ ] `complete()`/`bump()` contracts unchanged: idempotent, `missionDirty`, all-objectives
      → `setTimeout(() => this.advance(), 1400)`.
- [ ] Save blob still writes `missionIdx` in this task (task 4 changes it) — the existing
      gate must pass **unchanged** against the v1 key.
- [ ] Tests pass: `node --check src/game/gameplay.js`
- [ ] Gate green, unchanged scenario: `node tools/gate.cjs 2828 .shots` (9/9)

## Context the worker needs (and ONLY this)

- Why: this is the load-bearing refactor — the one file everything touches. Keep the
  diff surgical; no reformatting, no drive-by fixes.
- Constraints (from constitution): match file style; no build step; `docs/ARCHITECTURE.md`
  §Content explains the motivation; frame order and `saveFrame()` placement untouched
  (this task does not touch `main.js`); the 1400 ms advance delay is a felt beat — keep it.
- May use: `MISSIONS`/`ENDING_CARD` from `lore.js` (task 1), `LANDMARKS`/`CONTENT` from
  `content.js` (task 1) — note: `CONTENT` consumption is task 3; this task may import
  `LANDMARKS` for `checkState()`'s `ref` resolution.
- Objective id map (today → event): `deploy`→`array-deployed`, `scan`→`scan-done`,
  `home1`→`offload`, `find3`→`sample` (count), `relays`→`relay` (count), `recover`→
  `station-interact`, `deep`→`extract` (`special:'drum'`), `transmit`→`transmit`.
- The drumhead-drill/scan `missionIdx < 4` gates (L200, L266) and the `missionIdx === 4`
  transmit gate (L416) and the `missionIdx >= 3` prompt gate (L443) are **task 3** — in
  this task they keep working: `checkState`/`emit` must not change their semantics.
  Bridge: keep reading `missionIdx` *as a derived value* if needed —
  `const idx = MISSIONS.findIndex(m => m.id === this.missionId)` — but prefer leaving
  those four lines byte-identical until task 3.
- Gate scenario (must stay green): menu → T → W to 125 m → G → `objDone.scan` →
  `missionIdx>=1` in save → reload → resume. The gate reads `game.missionIdx` — for this
  task keep a **derived getter** `get missionIdx()` (index of `missionId` in `MISSIONS`,
  `MISSIONS.length` when null) so the gate and any console tooling keep working until
  task 5 rewrites it. Document the getter as transitional.

## Verification gate (run before merge)

- [ ] Acceptance criteria all met
- [ ] Tests green (`node --check`)
- [ ] Gate green (unchanged scenario)
- [ ] Reviewed by `gate` model (frontier) if difficulty was `hard`
- [ ] Spec still matches code (no drift)

---
_Result / notes:_
- `Game.missionIdx` → `Game.missionId: string | null` (`null` = free survey);
  `get mission()` looks the id up in `MISSIONS`.
- `emit(event, payload)` funnels every action-site event through the current
  mission's unmet objectives (event/count matching with `special` filter);
  `checkState()` evaluates `distance` records against `LANDMARKS` each frame
  (including `minH`). Action sites changed from `complete('<id>')` to
  `emit('<event>')`; non-objective side effects (codex unlocks, `drumTaken`,
  logs) stay in place.
- The `missionIdx` transitional getter was removed in task 5. Commit `bed85c8`.
  `node --check` green; gate green.
