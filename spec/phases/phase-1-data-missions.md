# Phase Spec (Tier 2) — Phase 1: Data-Driven Missions

**Parent:** Product Spec → Phase 1
**Depends on phases:** Phase 0 (rebase, closed 2026-08-28)

## 1. Goal of this slice

The campaign becomes a **pure data problem**: adding, reordering, or retuning a mission is
an edit to `src/game/lore.js` only. Objective completion logic moves out of 11 hand-wired
call sites and 8 positional `missionIdx` comparisons in `gameplay.js`/`hud.js` into
(a) a small typed objective engine in `gameplay.js` and (b) declarative objective records
in `MISSIONS`. Saves carry stable identities (mission id, anomaly id) instead of positions.

User value: the story can now grow (more missions, missions in different orders, per-region
campaigns in Phase 2) without touching the one file everything touches — and old saves can
no longer silently point at the wrong anomaly.

## 2. What "done" looks like (phase acceptance criteria)

- [x] `MISSIONS` in `lore.js` carries every objective's `type` and params; no objective
      text, count, or threshold exists only in `gameplay.js`.
      **Proof:** `lore.js:157-199` — every objective is `{id, type: event|distance|count, …params, text}`
      (`ENDING_CARD` also moved to data, `lore.js:202`). `gameplay.js` only *emits* named events
      (`emit()` L173; call sites L272/363-364/397/406/494/498/538) and evaluates the records in
      `checkState()` (L188 reads `o.type/o.ref/o.op/o.v/o.minH/o.count`). `grep` for any objective
      string/threshold in `gameplay.js` → **none**.
- [x] `grep -n "missionIdx" src/` returns **zero** matches. `grep -n "MISSIONS\[0\]" src/`
      returns zero matches outside a comment explaining history.
      **Proof:** `grep -rn "missionIdx" src/` → **0 matches**. `grep -rn "MISSIONS[0]" src/` → exactly
      one, `gameplay.js:61` `this.missionId = MISSIONS[0].id;` in `reset()` — the design-mandated
      "first array entry is mission 01" assignment (§3.1), not a positional gate; the `if (freeRoam)`
      block at L77-80 nulls `missionId` and unlocks all codex, so it is functionally
      `freeRoam ? null : MISSIONS[0].id`.
- [x] Inserting a dummy 6th mission into `MISSIONS` (console-driven, not committed) changes
      nothing about missions 01–05 — verified by the gate passing unchanged.
      **Proof:** injected a throwaway `{id:'m06-insert',…}` into the page's live `MISSIONS` via a
      main-realm `<script type="module">` (not committed). `MISSIONS.length` 5→6; the game's own
      `mission` getter sees it; `advance()` from a completed m05 shows the **6th card**
      (`MISSION 06 · INSERTION TEST`, `freeRoam:false`) instead of the ending; reload restores 5.
      m01–05 are positional-gate-free, and the clean-profile gate passed 21/21 with them unchanged.
- [x] Save blob v3: `missionId` is a string (or `null`); anomaly states are `[id, code]`
      pairs; `KEY` in `src/core/save.js` is `farside.anaximenes.v3`.
      **Proof:** in-page probe of the post-campaign save → `{saveMissionId:null, anomsIsPairs:true,
      anomsCount:13, drumPair:["60,-40",1]}`. `save.js:4` `const KEY = 'farside.anaximenes.v3';`.
- [x] Full 5-mission playthrough passes the extended gate end-to-end: menu → m01
      (deploy/drive/scan) → m02 (3 excavations + return) → m03 (3 relays) → m04 (reach +
      hold-E) → m05 (massif + drumhead drill + transmit) → ending card → save → reload →
      RESUME SURVEY → `missionId: null` (free survey) with codex and drumhead state kept.
      **Proof:** clean-profile gate run → `GATE PASS (21/21)`, `EXIT:0`. Key lines: lining
      `[-2220,1490 taken=true]`, drumhead `[drumTaken=true]`, save `[anoms=13 drum=["60,-40",1]]`,
      resume `[12 codex]` (missionId null, free survey).
- [x] `node --check` green on all JS; gate green with screenshot evidence in `spec/evidence/`.
      **Proof:** `node --check` over `src/` + `vendor/three/` + `server.js` → 30 files, 0 failures.
      Gate 21/21 (above). 16 screenshots copied to `spec/evidence/phase-1/` (menu, per-mission cards,
      station, massif, drumhead drill, ending, save menu, resumed).
- [x] Product Spec phase map + changelog updated; HANDOFF.md rewritten.
      **Proof:** `product-spec.md` §7 row 1 → `done` + 2026-08-29 changelog entry; `HANDOFF.md`
      rewritten for Phase 2 kickoff.

## 3. Technical design (the "how")

### 3.1 Mission identity — positions become ids

- `Game.missionIdx: number` → `Game.missionId: string | null`. `null` means free survey
  (the post-campaign state the old code expressed as `missionIdx === MISSIONS.length`).
- `get mission()` → `MISSIONS.find(m => m.id === this.missionId) || null`.
- `reset(freeRoam)` → `this.missionId = freeRoam ? null : MISSIONS[0].id` (data-driven:
  the first entry of the array is "mission 01" by definition — no stored position).
- `advance()` → `const i = MISSIONS.findIndex(m => m.id === this.missionId);`
  `this.missionId = (MISSIONS[i + 1] || null)?.id ?? null;` — next mission is *looked up*
  in the data array, never stored positionally. When `null`: show `ENDING_CARD`, set
  `freeRoam = true`, `save()`.
- `ENDING_CARD` (the inline object at gameplay.js:172-176) moves to `lore.js` as data.
- `main.js` opening card (line 234) uses `App.game.mission` (set by `reset()`) instead of
  the `MISSIONS[0]` literal.

### 3.2 Objective records (the DSL)

Each objective in `MISSIONS[n].objectives` gains a `type` and params. Two families:

**State objectives** — a predicate re-evaluated every frame in `Game.checkState()`:

```js
{ id: 'drive',  type: 'distance', ref: 'home',    op: '>', v: 120, text: 'Drive 120 m from the sled' }
{ id: 'reach',  type: 'distance', ref: 'station', op: '<', v: 26,  text: 'Reach VANTAGE-3' }
{ id: 'massif', type: 'distance', ref: 'massif',  op: '<', v: 46,  minH: 12, text: 'Reach the central massif' }
```

`ref` ∈ `{home, station, massif}` resolved through a landmark table in `content.js`.
`minH` (optional) additionally requires rover height above `terrain.heightAt` threshold.

**Event objectives** — completed when the game emits a named event (optionally with a
matching `special`), optionally counted:

| event | emitted from (today's call site) | objective |
|---|---|---|
| `array-deployed` | `togglePanel()` | m01 `deploy` |
| `scan-done` | `doScan()` | m01 `scan` |
| `offload` | home-services bay drain | m02 `home1` |
| `sample` | `_finishDrill()` (per anomaly) | m02 `find3` (count 3) |
| `relay` | `deployRelay()` | m03 `relays` (count 3) |
| `station-interact` | hold-E at the station | m04 `recover` |
| `extract` (payload `special: 'drum'`) | `_finishDrill()` drumhead | m05 `deep` |
| `transmit` | home-services, drumhead in hand | m05 `transmit` |

```js
{ id: 'deploy',  type: 'event', on: 'array-deployed', text: 'Deploy the solar array', hint: 'press T' }
{ id: 'find3',   type: 'count', on: 'sample', count: 3, text: 'Excavate 3 subsurface anomalies' }
{ id: 'recover', type: 'event', on: 'station-interact', unlocks: 'station', text: 'Recover the crew logs', hint: 'hold E at the airlock' }
{ id: 'deep',    type: 'event', on: 'extract', special: 'drum', unlocks: 'drum', text: 'Extract the drumhead core' }
{ id: 'transmit',type: 'event', on: 'transmit', text: 'Return to the sled and transmit' }
```

`unlocks` (optional) marks world content that is only open while this objective is
*unmet* — see §3.4 for the one predicate both the drumhead gate and the station prompt use.

### 3.3 The engine (in `gameplay.js`, ~60 lines)

- `emit(event, payload)` — for each objective of the current mission not yet done:
  if `o.on === event` (and `!o.special || o.special === payload?.special`):
  - `o.type === 'count'` → `counts[o.id] += 1`; done when `>= o.count` → `complete(o.id)`
  - else → `complete(o.id)`
- `checkState()` — for each unmet state objective: build the predicate from the record
  (`distance`: `op === '>' ? distTo(ref) > v : distTo(ref) < v`, `&& height > minH` if set)
  → `complete(o.id)` when true.
- `complete(id)` / `bump()` unchanged in contract (idempotent, auto-advance check, 1400 ms
  delayed `advance()`). The 1400 ms `setTimeout` in `complete()` is kept as-is — it is the
  beat that lets the last objective land before the card flips; the gate already waits on
  it.
- Action sites in `gameplay.js` change from `this.complete('deploy')` etc. to
  `this.emit('array-deployed')`. **Side effects that are not objective completion stay
  where they are** (e.g. `reach` still unlocks the `roster` codex + logs the perimeter
  warning; `station-interact` still unlocks `log6`/`log11`; drumhead extraction still sets
  `drumTaken` and unlocks via the sample table). The emit is additive, not a replacement
  of the surrounding logic.
- `update()` keeps calling `checkState()` in the same slot as today's "objectives that
  watch the world" block (gameplay.js:425-438).

### 3.4 Content gates → data (the `missionIdx` comparisons)

| today | replacement |
|---|---|
| `a.special === 'drum' && this.missionIdx < 4` in `_finishScan()` (L200) and `startDrill()` (L266) | **Active-objective unlock**: the m05 `deep` objective declares `unlocks: 'drum'`; the drumhead anomaly carries `unlocks: 'drum'`; `Game.anomalyOpen(a)` is true iff `a.unlocks` is unset **or** the current mission has an *unmet* objective declaring the same `unlocks` tag. (Not `!objDone[<own id>]` — that deadlocks: the drumhead is only drillable *because* its objective is still open.) `buildAnomalies()` stamps `unlocks: 'drum'` on the drumhead anomaly — the **only** gated anomaly; the lining stays always-open as today. |
| station hold-E prompt gated by `missionIdx >= 3` (L443) | the m04 `recover` objective declares `unlocks: 'station'`; `CONTENT` record `{ at: 'station', radius: 12, unlocks: 'station', key: 'station', prompt: 'HOLD <kbd>E</kbd> — INTERROGATE LOCAL STORE' }` — shown iff distance < radius, `!stationVisited`, and the `station` tag is currently unlocked by an unmet objective |
| compass targets `missionIdx === 3` / `=== 4` (hud.js:241-242) | `game.objectiveTargets()` returns `[{x, z, label, color}]` derived from the **current mission's unmet** distance/interact objectives (ref → landmark coords). The SLED target rule (hud.js:244) is unchanged — it is already state-based |
| minimap POIs `missionIdx >= 3` / `>= 4` (hud.js:317-318) | same `objectiveTargets()` source (POIs appear when their objective is active or already done) |

`src/game/content.js` (new, ~30 lines): the `LANDMARKS` table `{home, station, massif}`
re-exported from `gameplay.js`'s existing exports (HOME from props.js, STATION/MASSIF from
gameplay.js — no duplication, just one lookup place), plus `CONTENT` (the station prompt
record) and the `unlocksOn` convention documented.

### 3.5 Save format v3

```js
{
  missionId: this.missionId,            // string | null  (was: missionIdx number)
  objDone, counts, unlocked,            // unchanged
  anoms: [[id, 0|1|2], ...],            // pairs, only non-default states (was: bare positional array)
  relays, relaysPlaced, power, hull, met, pos, stationVisited, drumTaken, odo  // unchanged
}
```

- **Anomaly id**: `Math.round(x * 10) + ',' + Math.round(z * 10)` — coordinate-derived,
  stable across sessions because `buildAnomalies()` is deterministic (fixed seed
  `0x5EED17`, fixed terrain). If worldgen ever changes, ids change with it — the correct
  signal, and the KEY-bump discipline (constitution) still applies.
- `load()` maps ids back through `this.anoms.find(a => a.id === id)`; unknown ids are
  ignored (a save from a different worldgen is degraded, not corrupted).
- `KEY` → `farside.anaximenes.v3` in the **same commit** as the format change (constitution
  rule; user-approved: old saves orphaned, no dual-format migration code).
- `tools/gate.cjs` reads the key string directly (line 175) — the one-line update ships in
  the same task (task 4), since the gate is the save format's test harness.

### 3.6 What does NOT change

- `buildAnomalies()` generation (positions, seed, filters) — untouched, so the positional
  ↔ id mapping stays valid for the rest of the session.
- The 1400 ms advance delay, the card flow (`cardOpen` vs `App.state` — read
  ARCHITECTURE.md §UI), frame order in `main.js`, `rover.js`, `props.js`, `terrain.js`.
- `SAMPLES`/`CODEX` data shapes.
- Free-survey behaviour (all codex unlocked, no objectives) — reached via `missionId: null`.

## 4. Contract / interface with the rest of the system

- **Inputs:** `MISSIONS` (lore.js) with typed objectives; `content.js` tables; save blob v3.
- **Outputs (public surface other modules may use):**
  - `game.missionId: string | null` — replaces `game.missionIdx` (hud.js, main.js, gate).
  - `game.mission` — unchanged shape.
  - `game.objectiveTargets()` — `[{x, z, label, color}]` for compass/minimap (hud.js only).
  - `game.objDone`, `game.counts`, `game.anoms` (now with `a.id`) — unchanged shapes.
- **Public interface:** no new module exports beyond `content.js` (`LANDMARKS`, `CONTENT`,
  `ENDING_CARD` stays in lore.js). Nothing in `rover.js`, `props.js`, `terrain.js`,
  `engine.js`, `main.js` frame order changes except the opening-card line.

## 5. Task breakdown (Tier 3 — the atomized work)

> In dependency order. Each is a `task-spec.md` beside this file. Gate after every task.

| # | Task | difficulty | Blocked by | Status |
|---|------|-----------|------------|--------|
| 1 | Data model: typed `MISSIONS`, `ENDING_CARD`, `content.js` | easy | – | done |
| 2 | Objective engine: `missionId`, `emit()`, `checkState()`, rewire call sites | hard | 1 | done |
| 3 | Content gates → data: drumhead lock, station prompt, hud targets | hard | 2 | done |
| 4 | Save v3: anomaly ids, `KEY` bump, main.js opening card | easy | 2 | done |
| 5 | Extend gate to full 5-mission playthrough | hard | 3, 4 | done |
| 6 | Verify slice end-to-end; evidence; close spec + HANDOFF | gate | 5 | done |

## 6. Out of scope for this phase

- New mission *content* beyond the existing five (that is what this phase makes cheap).
- Regions/levels, planet abstraction (Phase 2/3).
- Dual-format save migration (decided: KEY bump orphans old saves).
- Any change to anomaly *generation*, terrain, rover physics, frame order.
- CI / headless-less gate (accepted risk, unchanged).

---
_On phase close: check every acceptance criterion, demo the slice, then update the
Product Spec changelog and phase map._
