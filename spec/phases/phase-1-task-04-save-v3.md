# Task Spec (Tier 3) — Phase 1 / Task 4: Save Format v3

**Parent:** Phase 1 → Task 4
**Blocked by:** 2 (independent of 3; run after 3 in practice so the gate stays meaningful)
**difficulty:** `easy`
**routes to:** local (Claude Code — local endpoints not yet wired)

## What to build

Make the save blob identity-based: `missionId` (string) instead of `missionIdx`, anomaly
states as `[id, code]` pairs keyed by coordinate-derived ids, and bump the save `KEY` to
v3 in the same commit (user-approved one-time orphan of old saves). Point `main.js`'s
opening card at the game's first mission via data instead of the `MISSIONS[0]` literal.

## Files this task may touch

- `src/game/gameplay.js` (save/load + anomaly ids only)
- `src/core/save.js` (KEY bump only)
- `src/main.js` (opening-card line only)
- `tools/gate.cjs` (the one hardcoded key string, line 175 → `farside.anaximenes.v3`)

## Acceptance criteria (contract — MUST be testable)

- [ ] `save.js` `KEY === 'farside.anaximenes.v3'`; `gate.cjs` reads that same string.
- [ ] Every anomaly from `buildAnomalies()` has `id = Math.round(x * 10) + ',' +
      Math.round(z * 10)` (string). All ~72 anomalies have unique ids (console check:
      `new Set(anoms.map(a => a.id)).size === anoms.length`).
- [ ] `save()` writes `missionId: this.missionId` (string or `null`) and
      `anoms: this.anoms.filter(a => a.taken || a.found).map(a => [a.id, a.taken ? 1 : 2])`
      — no positional array, no bare codes.
- [ ] `load()` restores by id lookup (`this.anoms.find(a => a.id === id)`); unknown ids
      are skipped without throwing; `v === 1` → `taken`, `v === 2` → `found` + marker.
- [ ] `main.js` opening card (today line 234) uses `App.game.mission` (post-`reset()`)
      instead of `MISSIONS[0]`; the `MISSIONS` import in main.js is removed if unused.
- [ ] Save/load round-trip in-page: fresh start → deploy + scan → reload → resume:
      `missionId === 'listening'`, `objDone.deploy/scan` kept, scanned anomalies re-marked
      at the **same coordinates** (not index-shifted).
- [ ] Old v1 saves are inert: `localStorage.setItem('farside.anaximenes.v1', {...})`
      does not surface a RESUME button (menu checks v3 only).
- [ ] Tests pass: `node --check` on all touched files.
- [ ] Gate green: `node tools/gate.cjs 2828 .shots` (9/9) — the scenario's save check now
      asserts `d.missionId === 'listening'` (update that one assertion in the key-string
      edit; the resume check reads `game.missionId`).

## Context the worker needs (and ONLY this)

- Why: positional anomaly arrays are the sharpest edge in the codebase
  (`docs/ARCHITECTURE.md` §Content) — one slot shift moved the "extracted" flag off the
  drumhead core onto the lining sample. Ids make saves robust to future worldgen changes
  (ids move with the objects) and remove the last positional save field.
- Constraints (from constitution): KEY bump in the **same commit** as the format change;
  no dual-format migration (decided); determinism — ids derive from deterministic
  coordinates, no `Math.random`.
- May use: existing `save()`/`load()` shape (keep all other fields byte-identical:
  `objDone`, `counts`, `unlocked`, `relays`, `relaysPlaced`, `power`, `hull`, `met`,
  `pos`, `stationVisited`, `drumTaken`, `odo`).
- The transitional `get missionIdx()` (task 2) stays — the gate still uses it until
  task 5; do not remove it here.
- Commit: one logical change (`refactor: identity-based saves, KEY → v3`).

## Verification gate (run before merge)

- [ ] Acceptance criteria all met
- [ ] Tests green (`node --check`)
- [ ] Gate green
- [ ] Spec still matches code (no drift)

---
_Result / notes:_
- Anomaly identity added: `a.id = round(x*10)+','+round(z*10)` (deterministic —
  `buildAnomalies()` seed and terrain untouched). Save blob v3: `missionId`
  (string|null) and `anoms` as `[id, 0|1|2]` pairs (non-default states only);
  `load()` re-keys by id and ignores unknown ids.
- `KEY` bumped to `farside.anaximenes.v3` in the same commit (old saves orphaned
  by design — constitution). `tools/gate.cjs` reads the new key.
- `main.js` opening card now uses `App.game.mission` (set by `reset()`) instead of a
  `MISSIONS[0]` literal. Commit `846043e`. `node --check` green; gate green.
