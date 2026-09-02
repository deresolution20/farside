# Task Spec (Tier 3) — Phase 2 / Task 2: Region Data + Per-Region Saves

**Parent:** Phase 2 → Task 2 (`spec/phases/phase-2-regions-levels.md` §3.1, §3.5)
**Blocked by:** 1
**difficulty:** `easy`
**routes to:** local (Claude Code — local endpoints not yet wired)

## What to build

New `src/game/regions.js` exporting `REGIONS` — the Anaximenes bundle (existing
constants wrapped verbatim + the pylon/pipe positions currently hardcoded in
`main.js`) and a Long Shadow **stub** (terrain P, spawn, landmarks, props, anoms,
content, one mission L01 `ls-arrival`, codex `ls-brief`/`ls-memo`, placeholder
ending). `save.js` becomes per-region (`Save.read(r)/write(r, data)/clear(r)`),
settings move to global key `farside.set` with a one-time copy migration, and
`main.js` boots everything from `REGIONS[0]`.

## Files this task may touch

- `src/game/regions.js` (NEW)
- `src/core/save.js`
- `src/main.js` (boot wiring + save call sites only)
- `spec/phases/phase-2-task-02-region-data-saves.md` (result notes only)

## Acceptance criteria (contract — MUST be testable)

- [x] `regions.js` exports `REGIONS` (array, both records, shape §3.1).
      Anaximenes bundle: `terrain: P_ANAXIMENES` (imported from `bake.js`),
      `spawn: { x: 88, z: 207, heading: 2.3 }` (today's `HOME.x-8, HOME.z-7`
      literal), `landmarks` = `HOME`/`STATION`/`MASSIF` + labels
      SLED/VANTAGE-3/MASSIF, `content: CONTENT`, `props` = station `'vantage3'` +
      pylon/pipe/bigPipe arrays **exactly** matching today's `main.js` literals,
      `anoms` per §3.1 (seed `0x5EED17`, pipes `{anchor:'massif', rings:5}`,
      scatter 46/rMin 40, specials drum `{at:'massif', dx:6, dz:-4, type:'drum',
      depth:11.0, special:'drum', unlocks:'drum', deep:true}` + lining
      `{at:'station', dx:14, dz:9, type:'lining', depth:4.1, special:'lining'}`),
      `transmit: { sample:'drum', unlocks:['drum','lasthour','transmission'] }`,
      `missions: MISSIONS`, `codex: CODEX`, `ending: ENDING_CARD`.
- [x] Long Shadow stub: id `'longshadow'`, `saveKey 'farside.longshadow.v1'`,
      `terrain: P_LONGSHADOW` (initial bundle §3.2), `playableR: 432`, landmarks
      home `{300,210}` / breach `{380,120}` / postA `{150,-320}` / postB `{-220,
      280}` / hub `{-340,-180}` with labels, `props` `station:'none'` + empty
      pipes/bigPipe, `anoms` per §3.1 (`seed 0x2EED5, pipes null, scatter count
      30`, specials core + cable), `transmit: { sample:'core',
      unlocks:['ls-count'] }`, missions = `[ls-arrival]` only (objective records
      §3.6), codex = `[ls-brief, ls-memo]` (`start: true`), ending = THE COUNT
      card shape.
- [x] `save.js`: `Save.read(r)`, `Save.write(r, data)`, `Save.clear(r)` key on
      `r.saveKey`; `settings()` reads `farside.set`, copying from legacy
      `farside.anaximenes.v3.set` once if absent; `saveSettings()` writes
      `farside.set`; `settings.region` field supported. The module keeps a
      compatibility export so `game.save()` (task 3 changes it) keeps writing
      `farside.anaximenes.v3` this task.
- [x] `main.js`: `App.region = REGIONS[0]`; `App.sunAz = App.region.sunAz0`;
      bake call `bakeTerrain(progress, App.region.terrain)`; pylon/pipe/bigPipe
      positions and the rover spawn read from `App.region.props` /
      `App.region.spawn`; game ctx gains `region: App.region`; all `Save.read()`/
      `Save.clear()` call sites pass the region.
- [x] Migration check (in-page): seed `localStorage['farside.anaximenes.v3.set']`
      → `settings()` returns it and `farside.set` is written on next
      `saveSettings()`.
- [x] In-browser behavior unchanged: GATE PASS (21/21) — Anaximenes save still
      lands in `farside.anaximenes.v3`.
- [x] `node --check` green on all touched files.

## Context the worker needs (and ONLY this)

- Why: a region is a pure data record (phase spec §3.1) — this task creates the
  records and the storage seam; no world building changes until task 4.
- Constraints: Anaximenes stays byte-identical (gate proves it); **no** save-key
  bump for Anaximenes (worldgen unchanged — constitution bump rule not triggered);
  Long Shadow stub values are initial — task 5 retunes, so keep them in one
  obvious block.
- May use: exports from `lore.js` (`MISSIONS`/`CODEX`/`ENDING_CARD`),
  `content.js` (`STATION`/`MASSIF`/`CONTENT`), `props.js` (`HOME`), `bake.js`
  (`P_ANAXIMENES`, and define `P_LONGSHADOW` in `regions.js` this task).
- Commit: one logical change (`feat: region records + per-region save slots`).

## Verification gate (run before merge)

- [x] Acceptance criteria all met
- [x] Gate green (21/21)
- [x] `node --check` green
- [x] Spec still matches code (no drift)

---
_Result / notes:_

Done. `src/game/regions.js` (NEW, 173 lines) exports `REGIONS = [ANAXIMENES,
LONGSHADOW]` plus `P_LONGSHADOW`. Anaximenes wraps the existing constants
(`P_ANAXIMENES`, `HOME`, `STATION`, `MASSIF`, `CONTENT`, `MISSIONS`, `CODEX`,
`ENDING_CARD`) verbatim and carries the pylon/pipe/bigPipe positions moved out
of `main.js` (now read from `App.region.props`). The Long Shadow stub holds the
§3.2 initial `P_LONGSHADOW` bundle, the five landmarks, post/hub props, the
`0x2EED5` anomaly field (no pipes, 30 scatter, core + cable specials), L01
`ls-arrival` (objectives verbatim from the §3.6 table), codex `ls-brief`/
`ls-memo` (`start: true`), and the THE COUNT ending card. Both §3.2 constraints
asserted: `rim.r + rim.w = 590 < 600`; `playableR 432 ≤ rim.r − rim.w/2 − 20 = 435`.

`src/core/save.js`: slots keyed on `r.saveKey`; no-region / single-argument
calls fall back to the legacy `farside.anaximenes.v3` (the compatibility
export), so Anaximenes saves keep landing in the v3 key until task 3 moves the
write into `Game.save()`. Settings now live under the global `farside.set`;
`settings()` performs the one-time copy from `farside.anaximenes.v3.set` and
ignores the legacy slot afterwards. `settings.region` rides in the same blob.

`src/main.js`: boots from `REGIONS[0]` (`App.region`, `App.sunAz =
REGIONS[0].sunAz0`), bakes `App.region.terrain`, builds pylons/pipes/bigPipe
and the rover spawn from the region record, hands `region` to the `Game` ctx,
and passes the region at every `Save.read/clear/write` site. `menuBrief` now
renders `App.region.brief` (verbatim Anaximenes text), so the hardcoded string
is gone. `MASSIF` dropped from main.js use (its only reference was the bigPipe
literal) and joins the `void` line.

Verification: `node --check` green on all three touched files; `bake-diff`
re-run PASS (macro/far/det strict, deterministic); node-level data check
asserts every Anaximenes value verbatim + the full Long Shadow stub (shape
§3.1) and the save/migration contract (per-region slots, v3 fallback,
`farside.set` migration + legacy-ignored-after-copy); **GATE PASS (21/21)** on
a fresh profile — the gate's own "save v3" check confirms the Anaximenes save
still lands in `farside.anaximenes.v3` and the full campaign round-trips.
