# Task Spec (Tier 3) — Phase 1 / Task 3: Content Gates → Data

**Parent:** Phase 1 → Task 3
**Blocked by:** 2
**difficulty:** `hard`
**routes to:** frontier (hard) — or Claude Code while local endpoints are unwired

## What to build

Remove the remaining positional `missionIdx` content gates (gameplay.js L200/L266/L416/L443
and hud.js L241-242/L317-318), replacing them with the data-driven mechanisms from phase
spec §3.4: the `unlocks` tag (active objective opens world content), the `CONTENT` table
for the station prompt, and `game.objectiveTargets()` for the compass/minimap.

## Files this task may touch

- `src/game/gameplay.js`
- `src/ui/hud.js`
- `src/game/content.js`

## Acceptance criteria (contract — MUST be testable)

- [ ] `grep -n "missionIdx" src/game/gameplay.js src/ui/hud.js` returns matches only in
      the transitional getter and the save/load v1-compat lines (both removed in task 4) —
      hud.js has **zero**.
- [ ] New engine helpers in `gameplay.js`: `tagOpen(tag)` — true iff the current mission
      has an *unmet* objective with `unlocks === tag` (free survey → false); and
      `anomalyOpen(a)` — true iff `a.unlocks` is unset or `tagOpen(a.unlocks)`.
- [ ] `buildAnomalies()` stamps **only** the drumhead anomaly with `unlocks: 'drum'`.
      `_finishScan()` skips anomalies where `!anomalyOpen(a)`; `startDrill()` refuses an
      open-locked drumhead target with the same 'DRILL STRING TOO SHORT — 11 m TARGET' log.
      In the shipped campaign this is semantically identical to `missionIdx < 4` (the
      `unlocks: 'drum'` objective is m05's `deep`; it is unmet from m05 start until the
      drumhead is extracted — and never unmet before m05, so the drumhead is unreachable earlier;
      in free survey it is already taken, so the lock is unobservable).
- [ ] The hold-E station prompt comes from the `CONTENT` record
      (`{ at: 'station', radius: 12, unlocks: 'station', key: 'station', prompt: 'HOLD
      <kbd>E</kbd> — INTERROGATE LOCAL STORE' }`), shown iff distance < 12,
      `!stationVisited`, and (`tagOpen('station')` **or** `freeRoam`) — where
      `tagOpen('station')` holds while m04's `recover` objective is unmet and the
      `freeRoam` clause preserves today's free-survey behaviour (`missionIdx >= 3` was
      also true there). The m04 `recover` objective carries `unlocks: 'station'`.
      Key/progress/`interact` machinery and the post-completion behaviour (prompt gone,
      `stationVisited` set) unchanged.
- [ ] `transmit` fires via `emit('transmit')` from the home-services block whenever the
      bay drains and `drumTaken` is true — no `missionIdx === 4` comparison. The codex
      unlocks `drum`, `lasthour`, `transmission`) and `transmitted = true` stay in place.
- [ ] `game.objectiveTargets()` returns one target per unmet `distance` objective of the
      current mission (ref → landmark coords via `LANDMARKS`, labels
      `{home:'SLED', station:'BEACON-9', massif:'MASSIF'}`, color `#ffb454`) plus the
      station target while `tagOpen('station')`; the SLED power/bay rule from today's
      hud.js:244 is preserved exactly.
- [ ] Compass (drawCompass) and minimap POIs consume `objectiveTargets()`; the minimap
      BEACON-9/MASSIF POIs appear when the target is active **or already done** (today's
      `>= 3`/`>= 4` semantics: once you've seen it, it stays on the map).
- [ ] Tests pass: `node --check` on all three files.
- [ ] Gate green, unchanged scenario: `node tools/gate.cjs 2828 .shots` (9/9).

## Context the worker needs (and ONLY this)

- Why: these are the gates that silently break if a mission is inserted mid-campaign.
  After this task, nothing in gameplay/hud keys off campaign position.
- Constraints (from constitution): match file style; `docs/ARCHITECTURE.md` §Content;
  hud.js is DOM/canvas-driven — no CSS changes, no new elements.
- May use: `LANDMARKS`, `CONTENT` from `content.js`; `game.distTo(x, z)`; existing
  `this.objDone`; `this.terrain.heightAt` for the massif `minH` check (already in
  checkState from task 2).
- Semantic map (today → data): L200/L266 `missionIdx < 4` → `!anomalyOpen(drum)`;
  L416 `missionIdx === 4 && drumTaken` → `drumTaken` (reachability implied by the
  `unlocks: 'drum'` gate — the drumhead cannot be in hand before m05);
  L443 `missionIdx >= 3` → `tagOpen('station')` (equivalent for the shipped campaign:
  `recover` is m04's second objective, unmet from m04 start);
  hud 241 `missionIdx === 3` → current mission's unmet `reach` objective;
  hud 242 `missionIdx === 4` → unmet `massif`;
  hud 317 `missionIdx >= 3 || stationVisited` → station target active-or-done OR
  `stationVisited`; hud 318 `missionIdx >= 4` → massif active-or-done.
- Free survey (`missionId === null`): `tagOpen()` → false, `objectiveTargets()` returns
  `[]` for mission targets; SLED rule and anomaly blips still draw (as today).
- **Do not** reintroduce a `missionIdx` read anywhere in the new paths — the transitional
  getter (task 2) is only for the gate until task 5.

## Verification gate (run before merge)

- [ ] Acceptance criteria all met
- [ ] Tests green (`node --check`)
- [ ] Gate green (unchanged scenario)
- [ ] Reviewed by `gate` model (frontier) if difficulty was `hard`
- [ ] Spec still matches code (no drift)

---
_Result / notes:_
- Positional `missionIdx` content gates replaced by data:
  - the drumhead anomaly is stamped `unlocks: 'drum'`; `anomalyOpen(a)` is true iff the
    tag is unset **or** an *unmet* objective of the current mission declares it
    (the `!objDone[own]` form was rejected — it deadlocks, since the drumhead is only
    drillable while its objective is still open).
  - the station hold-E prompt is driven by the `CONTENT` record +
    `tagOpen('station')` (m04 `recover` declares `unlocks:'station'`).
  - compass + minimap POIs now come from `game.objectiveTargets()` (the current
    mission's unmet distance/interact objectives); the SLED target rule is
    unchanged (already state-based).
- Commit `5bd5477`. `node --check` green; gate green.
