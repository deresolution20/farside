# Task Spec (Tier 3) — Phase 2 / Task 1: Parameterize the Bake

**Parent:** Phase 2 → Task 1 (`spec/phases/phase-2-regions-levels.md` §3.2)
**Blocked by:** none
**difficulty:** `hard`
**routes to:** local (Claude Code — local endpoints not yet wired)

## What to build

Extract the pure bake math out of `src/world/terrain.js` into new `src/world/bake.js`
(no three.js import) and parameterize it: `baseHeight(x, z, P)` and
`bakeTerrain(report, P)` take a region parameter bundle. `P_ANAXIMENES` reproduces
today's field **byte-identically**, proven by a new node-only tool
`tools/bake-diff.cjs` that compares the new bake against a frozen pre-Phase-2 copy
of the old math and checks two-bake determinism.

## Files this task may touch

- `src/world/bake.js` (NEW)
- `src/world/terrain.js` (bake math → import from `bake.js`; Terrain class, GLSL,
  clipmap, dent field, sunmask, and exported constants STAY here)
- `tools/bake-diff.cjs` (NEW)
- `spec/phases/phase-2-task-01-bake-param.md` (result notes only)

## Acceptance criteria (contract — MUST be testable)

- [x] `bake.js` exports `baseHeight(x, z, P)`, `buildMips(base, res)`, and
      `bakeTerrain(report, P)` (generator; return shape unchanged: `{ macro, far,
      det, macroMips, farMips }`). No `three` import in `bake.js`
      (`grep -n "three" src/world/bake.js` → zero hits).
- [x] `P_ANAXIMENES` is exported from `bake.js` with exactly the current constants
      (phase spec §3.2): bowl `{36,55,430}`, rim `{470,74,112,0.30,1.05,77,0.0062,
      31,9,0.10,3}`, fall `{62}`, farRidge `{190,0.30,5}`, massif `{on:true,110,64,
      26,61}`, rille `{on:true}`, `TIERS` verbatim, `keepClean [[0,0,82]]`.
- [x] `terrain.js` imports the math from `bake.js`; `bakeTerrain` is called with
      `P_ANAXIMENES` at boot (main.js call site keeps working unchanged this task —
      signature stays `bakeTerrain(report)` with the default `P = P_ANAXIMENES` if
      no second arg is given).
- [x] `node tools/bake-diff.cjs` exits 0 and prints:
      (a) frozen-old vs new `macro`/`far`/`det` compared element-wise with **strict
      float equality** — 0 diffs over all three fields;
      (b) two fresh bakes of `P_ANAXIMENES` strictly equal (determinism).
      Any drift → non-zero exit with first-diff index + expected/actual.
- [x] The frozen copy in `bake-diff.cjs` is marked `DO NOT EDIT — regression guard`
      and is self-contained (no imports from `src/`).
- [x] `terrain.js` still exports everything its consumers import
      (`MACRO_EXT`, `FAR_EXT`, `DET_TILE`, `DENT_EXT`, … — verify via grep of
      importers).
- [x] In-browser behavior unchanged: GATE PASS (21/21) via
      `node tools/gate.cjs 2828 .shots`.
- [x] `node --check` green on `bake.js`, `terrain.js`, `bake-diff.cjs`.

## Context the worker needs (and ONLY this)

- Why: Phase 2 needs two different terrain worlds from one bake; the parameter
  bundle is the seam. The identity guard is the constitution's
  "Anaximenes byte-identical" requirement — without it, a refactored float chain
  drifting by 1 ULP would silently change crater ids/slopes.
- Constraints (from constitution): no new runtime assets, no build step; the
  fixed-extent contract (520/596 m crossfade, 95 m detail fade, `MACRO_EXT/RES`,
  `FAR_EXT/RES`, `DET_TILE/RES`, `DENT_EXT`, `SUNMASK_*`) stays hardcoded in
  `terrain.js`/GLSL and is **not** parameterized; base fbm (`(fbm(x*0.00175,
  z*0.00175, 4, 2.05, 0.5, 11) - 0.5) * 33`), the detail tile (seeds 5–8/313), and
  all sstep ramp offsets (computed from `rim.r`) are shared verbatim.
- May use: `fbm/ridged/vnoise/hash2i/sstep/lerp/makeRNG` from `src/core/rng.js`;
  today's `terrain.js` bake block as the reference implementation (copy, don't
  retype, into the frozen section of `bake-diff.cjs` — it must be the exact pre-
  edit math, including comment-stripped constants).
- Commit: one logical change (`refactor: parameterized terrain bake + identity
  guard`).

## Verification gate (run before merge)

- [x] Acceptance criteria all met
- [x] `node tools/bake-diff.cjs` exits 0
- [x] `node --check` green
- [x] Gate green (21/21)
- [x] Spec still matches code (no drift)

---
_Result / notes:_

**DONE — verified.**

- `src/world/bake.js` (NEW, 325 lines): pure math, no render-engine import
  (`grep "three" → 0`). Exports `baseHeight(x,z,P)`, `craterProfile`, `forEachCrater(ext,
  tiers, keepClean, cb)`, `buildMips`, `bakeTerrain(report, P = P_ANAXIMENES)` (generator,
  return shape `{ macro, far, det, macroMips, farMips }` unchanged), `P_ANAXIMENES`, and the
  geometry constants `MACRO_*`/`FAR_*`/`DET_*`/`DET_AMP*`.
- `src/world/terrain.js`: bake math removed and re-imported from `bake.js`; re-exports
  `MACRO_*`/`FAR_*`/`DET_TILE`/`DET_RES`/`baseHeight`/`bakeTerrain`/`buildMips`/`P_ANAXIMENES`
  so every importer (`main.js`, `hud.js`, `dust.js`, `rover.js`, `props.js`, `gameplay.js`)
  works unchanged. Terrain class, GLSL, clipmap, dent field, sunmask, and `MOON_G`/`DENT_EXT`/
  `SUNMASK_*`/`RIM_R`/`RIM_W`/`PLAYABLE_R` stay here. 1232 → 959 lines.
- `tools/bake-diff.cjs` (NEW): self-contained frozen pre-Phase-2 copy of the old bake
  (marked DO NOT EDIT) + `require('../src/world/bake.js')` for the new bake.

Evidence:
- `node tools/bake-diff.cjs` → **BAKE-DIFF PASS**: frozen-old vs new `macro` (4,194,304),
  `far` (262,144), `det` (65,536) all identical under strict float equality; two fresh
  bakes strictly equal (determinism). exit 0.
- `node --check` green on `bake.js`, `terrain.js`, `bake-diff.cjs` (and all of `src/`,
  `vendor/three/`, `server.js`).
- Browser gate (fresh `/tmp/ffprof`, headful Marionette on `:1`): **GATE PASS (21/21)** —
  full Anaximenes scenario unchanged (deploy → drive 133 m → scan → m02 excavate → m03
  relays → m04 station → m05 massif/drum → ending → save v3 → reload → RESUME restores
  free survey + 12 codex). Shots `01_menu…16_resumed`.
