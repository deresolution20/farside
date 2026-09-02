# Task Spec (Tier 3) — Phase 2 / Task 3: Region-Aware Game

**Parent:** Phase 2 → Task 3 (`spec/phases/phase-2-regions-levels.md` §3.3)
**Blocked by:** 2
**difficulty:** `hard`
**routes to:** local (Claude Code — local endpoints not yet wired)

## What to build

Refactor `src/game/gameplay.js` so one `Game` class serves any region: every
static content reference becomes `this.region.…`; `stationVisited` →
`contentVisited` map; `drumTaken` → `payloadTaken`; `a.deep` flag replaces all
`special === 'drum'` checks; objectives gain an optional `unlock` field (codex
unlock on completion); `station-interact`/`sample` events carry payloads;
`save()` actually persists (fixing `advance()`'s currently-discarded blob).

## Files this task may touch

- `src/game/gameplay.js`
- `tools/gate.cjs` (save-blob assertion field renames only)
- `spec/phases/phase-2-task-03-region-game.md` (result notes only)

## Acceptance criteria (contract — MUST be testable)

- [ ] `reset(freeRoam = false, region)` binds `this.region = region`; codex seed
      set = `region.codex.filter(c => c.start)`; `missionId =
      region.missions[0].id`. Constructor passes `ctx.region` through (main.js
      already sends it — task 2).
- [ ] Zero static imports/references of `MISSIONS`, `CODEX`, `ENDING_CARD`,
      `CONTENT`, `LANDMARKS` (or the station/massif/home literals) in
      `gameplay.js` — all via `this.region` (grep).
- [ ] `contentVisited: {[key]: bool}` replaces `stationVisited`; the hold-E loop
      sets `this.contentVisited[c.key]` and emits `emit('station-interact',
      c.key)`; the prompt loop iterates `this.region.content` gated by
      `!this.contentVisited[c.key]`.
- [ ] `buildAnomalies(anoms)` is data-driven per §3.1: seed `anoms.seed`, pipe
      rings around `landmarks[anoms.pipes.anchor]` with `deep: true` (exact
      radii/angles/jitter of today), scatter `anoms.scatter`, specials at
      `landmarks[s.at] + (dx, dz)` carrying `type/depth/special/unlocks/deep`.
      Same draw order (pipes → scatter → specials) → Anaximenes field
      bit-identical.
- [ ] `a.special === 'drum'` appears nowhere; scan deep count, arm yaw, and the
      extract block use `a.deep`; the extract block sets
      `this.payloadTaken = true` when `a.special === this.region.transmit.sample`
      and emits `emit('extract', a.special)`.
- [ ] `emit('sample', a ? a.special : null)` (payload added; no Anaximenes
      objective filters `sample`, so no behavior change).
- [ ] `complete(objId)` unlocks `o.unlock` when the objective carries it (new
      hook; Anaximenes objectives never set it).
- [ ] Home-service transmit block: `if (this.payloadTaken) { this.transmitted =
      true; for (const id of this.region.transmit.unlocks) this.unlock(id);
      this.emit('transmit'); }` (bay-empty requirement unchanged).
- [ ] `save()` calls `Save.write(this.region, blob)` and **returns** the blob —
      `advance()`'s `this.save()` now really writes. In-page check: fresh
      Anaximenes run, deploy, drive, scan → mission complete → immediately
      `localStorage['farside.anaximenes.v3']` holds `missionId: 'listening'`
      (next mission) without waiting for the 20 s autosave.
- [ ] Blob fields `contentVisited`/`payloadTaken`; `load(d)` migrates legacy:
      `d.contentVisited || (d.stationVisited ? { station: true } : {})` and
      `d.payloadTaken ?? !!d.drumTaken`; `load()` validates `missionId` against
      `this.region.missions`.
- [ ] Grep contract: `grep -n "== 'drum'\|drumTaken\|stationVisited" src/` →
      zero hits except the two documented `load()` migration reads.
- [ ] Gate green (21/21) after updating the gate's save-blob field assertions to
      the renamed fields.
- [ ] `node --check` green.

## Context the worker needs (and ONLY this)

- Why: Phase 1's `Game` hardcodes Anaximenes content (station, drum, massif,
  mission/codex arrays). One class + region record is how N basins share the
  engine (phase spec §3.3).
- Constraints: Anaximenes gameplay must stay behavior-identical — the 21-check
  gate is the proof; event payloads only ADD arguments (existing consumers
  ignore extras); the drumhead drill mechanics (2.6 m settle search, yaw clamp)
  and `unlocks: 'drum'` gating are untouched in behavior.
- May use: the region bundle shape from `regions.js` (task 2); `Save.write(r,
  data)` from task 2; the existing `emit` funnel (L174-183) and
  `tagOpen`/`anomalyOpen` semantics unchanged.
- Commit: one logical change (`refactor: region-aware Game, save persistence fix`).

## Verification gate (run before merge)

- [ ] Acceptance criteria all met
- [ ] Gate green (21/21)
- [ ] `node --check` green
- [ ] Spec still matches code (no drift)

---
_Result / notes (2026-09-01):_

Implemented to plan, no drift:

- `src/game/gameplay.js` — zero static refs to `MISSIONS/CODEX/ENDING_CARD/CONTENT/
  LANDMARKS/HOME/PLAYABLE_R` (kept: `SAMPLES` import + pass-through
  `export { STATION, MASSIF } from './content.js'` for `main.js:18`).
  `reset(freeRoam, region)` binds region (ctor passes `ctx.region`); codex seed
  `region.codex.filter(c => c.start)`; `missionId = region.missions[0].id`.
- `buildAnomalies(anoms)` fully data-driven: single `makeRNG(anoms.seed)` stream,
  draw order pipes → scatter → specials; pipes `deep: true` at generation around
  `landmarks[anoms.pipes.anchor]`; specials carry `type/depth/special/unlocks/deep`
  from region data. Slope caps (26°/28°), `playableR - 26` ring cut, decimetre id — global.
- `contentVisited` map replaces `stationVisited` (prompt loop gates on
  `!contentVisited[c.key]`, iterates `region.content`); hold-E sets it and emits
  `station-interact` with the content key as payload; Anaximenes log-early/log-late
  beat stays `key === 'station'`-keyed (Long Shadow posts get no narrative extra).
- `a.special === 'drum'` gone: scan deep count, drill dust, extract block use `a.deep`;
  extract sets `payloadTaken` iff `a.special === region.transmit.sample` and emits
  `extract` with the special; `emit('sample', a.special)`; transmit block iterates
  `region.transmit.unlocks` (Anaximenes: same three codex as before).
- `complete()` gained the `o.unlock` hook (Anaximenes objectives never set it).
- `save()` → `Save.write(this.region, blob)` and returns the blob — `advance()`'s
  save is a real immediate write (latent discarded-blob bug fixed). Blob fields
  `contentVisited`/`payloadTaken`; `load()` migrates legacy `stationVisited`/
  `drumTaken` (the only two grep hits, both in `load()`) and validates `missionId`
  against `region.missions`.
- `tools/gate.cjs` — assertion field renames only: `snap()` (L162-163), extractDrum
  poll (L386), hold-E poll (L593), m05 extract assertion (L658), resume assertion
  (L707-709).

Verified:

- `node --check` green (all `src/`, `vendor/three/`, `server.js`, `tools/`).
- Grep contract: `grep -rn "== 'drum'|drumTaken|stationVisited" src/` → exactly the
  two documented `load()` migration reads.
- `node tools/bake-diff.cjs` PASS (regression — untouched).
- Node-level old-vs-new test (three-stub loader, real `rng/lore/rover/content/save`
  modules, real region data; `slopeAt: () => 0` isolates RNG draw order):
  Anaximenes field **bit-identical, 98/98** (id, x, z, type, depth, special,
  unlocks, draw order — drumhead stays id `60,-40` + `deep` + `unlocks: 'drum'`);
  Long Shadow field deterministic across instances (32 anomalies, no pipes,
  `core` deep/unlocks-hub, `cable` not deep); reset seeds (mission + start-codex)
  correct for both regions; `o.unlock` hook + station-interact payload funnel
  exercised; save-slot keys (`farside.anaximenes.v3` / `farside.longshadow.v1`),
  renamed blob fields, and all 5 load-migration paths exercised.
- In-page check (fresh profile, throwaway marionette driver): froze the autosave
  clock (`App._saveT = App.elapsed`), removed `farside.anaximenes.v3`, completed
  m01 (T / drive >125 m / G) → the key reappeared with `missionId: 'listening'`
  1.7 s after the last permitted autosave window — `advance()`'s `save()` really
  writes, without waiting for the 20 s autosave.
- **GATE PASS 21/21** (fresh `/tmp/ffprof`): full campaign + save round-trip;
  drumhead `['60,-40', 1]` present in v3; resume = free survey + `payloadTaken`
  + 12 codex.
- No save-key bump (worldgen + anomaly ids unchanged for Anaximenes).

