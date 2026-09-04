# Task Spec (Tier 3) — Phase 3 / Task 1: Sun-Cycle Params + Gravity Wiring

**Parent:** Phase 3 → Task 1 (`spec/phases/phase-3-planets-content.md` §3.2, §3.3)
**Blocked by:** none
**difficulty:** `easy`
**routes to:** local (Claude Code — local endpoints not yet wired)

## What to build

Parameterize the three Moon-constituted physics constants so a region can override
them, with Moon-identical defaults read from an optional `region` field: the sun
altitude curve + azimuth rate (`sunAltitude(az, S)` + `App.sunRate` in `main.js`) and
surface gravity (`Rover`'s `this.g`, `Dust`'s `this.g`). No new region data exists yet
— the two current regions have none of the new fields, so **behaviour must be
bit-identical** (same sun curve, same rate, same dust arcs, same wheel forces).
`g` lands 0.76–1.11× lunar in Phase 3 by construction, so no rover/dust constant is
re-tuned.

## Files this task may touch

- `src/main.js` (`sunAltitude`, `App.sunRate`, `buildWorld` pass-through,
  `idleWorld`/`stepWorld` call sites)
- `src/game/rover.js` (constructor `opts.g`, line-753 gravity use)
- `src/world/dust.js` (constructor `opts.g`, lines 140/151)
- `spec/phases/phase-3-task-01-sun-gravity.md` (result notes only)

## Acceptance criteria (contract — MUST be testable)

- [ ] `main.js` defines module constant `SUN_MOON = { base: 0.42, amp: 0.12, freq: 0.5,
      phase: -0.4 }` and `function sunAltitude(az, S = SUN_MOON) {
      return S.base + Math.sin(az * S.freq + S.phase) * S.amp; }`. `node` sanity:
      `sunAltitude(az)` with defaults evaluates identically to the old
      `0.42 + Math.sin(az * 0.5 - 0.4) * 0.12` for az ∈ {0, 1.6, 4.35, 6.18} to
      1e-12 (a 10-line node throwaway comparing the two expressions inline —
      main.js is a browser module and cannot be required in node — not committed).
- [ ] `App.sunRate` is set at boot to `App.region.sun ? App.region.sun.rate : 0.0060`,
      and set likewise
      inside `selectRegion` immediately after `App.sunAz = r.sunAz0` (main.js ~299).
      `idleWorld` (main.js ~655) and `stepWorld` (main.js ~698) advance with
      `App.sunRate` and evaluate `sunAltitude(App.sunAz, App.region.sun || SUN_MOON)`.
      With the current regions (no `sun` field) the rate is `0.0060` and the curve is
      the old one — verifiable via `git diff` review (no literal `0.0060` remains at a
      sun-advance site) and by the gate.
- [ ] `Rover(terrain, scene, opts = {})` sets `this.g = opts.g ?? MOON_G`; the
      `MOON_G` import is kept (still the default); the only gravity site
      (rover.js:753 `force.y -= this.mass * MOON_G`) uses `this.g`.
      `buildWorld` calls `new Rover(terrain, e.scene, { g: region.g })`.
      `window.FARSIDE.rover.g === 1.62` on both current regions (in-page).
- [ ] `Dust(scene, terrain, sunDirRef, max, opts = {})` sets `this.g =
      opts.g ?? MOON_G`; dust.js:140 (`2 * vy / this.g + 0.55`) and dust.js:151
      (`V[i3+1] -= this.g * dt`) use `this.g`. `buildWorld` passes
      `{ g: region.g }` to `Dust` (in the same task, same `buildWorld` edit).
- [ ] `region.g` absent → `undefined` passed as `g` → constructor default applies
      (no `NaN` anywhere: in-page `FARSIDE.rover.g === 1.62` and one real drive
      confirms dust behaves as before — the gate's campaign dust visuals are
      unchanged by definition of the run; no console errors).
- [ ] **No region record was edited** — `git diff src/game/regions.js` empty.
- [ ] `node --check` green on all three files.
- [ ] GATE PASS (28/28), EXIT:0, from a clean profile — the full Anaximenes + LS
      sections are the behavioural identity check (sun curve appears in the campaign's
      shadow/charging behaviour; any drift shows as a failed timing check).
- [ ] `node tools/bake-diff.cjs` still exits 0 (not touched, but run per the
      worldgen-touch rule of this phase).

## Context the worker needs (and ONLY this)

- Why: Phase 3 worlds are foreign bodies — different gravity, different sun
  behaviour. The data plumbing has to exist before any Jovian record can carry
  `g`/`sun`. This is pure default-preserving parameterization: after this task,
  nothing observable changes for the Moon worlds.
- Constraints (constitution): no new runtime assets; deterministic worldgen (no
  seed involved here); don't touch `bake.js`/`bake-diff.cjs` (frozen reference);
  the 6 s `markEnvDirty` throttle and `syncSun()` are untouched (they consume
  `sky.sunDir`/`sky.sunAlt`); the HUD's SOL PHASE readout (hud.js:493) reads
  `sky.sunDir.y` — no change.
- May use: `MOON_G` export from `src/world/terrain.js` (kept as the default
  constant); `App.region` for the region read; `selectRegion`'s existing
  `App.sunAz = r.sunAz0` line as the sibling site.
- Style: match surrounding file (single quotes, no fancy semicolons). Keep the
  comment block above `sunAltitude` (the 72° N narrative) and update it by ONE
  sentence noting the curve+rate are now per-region data with Moon defaults, in
  the doc's existing voice.
- Commit: one logical change (`feat: per-region sun cycle and gravity params
  (moon defaults)`).

## Verification gate (run before merge)

- [ ] Acceptance criteria all met
- [ ] `node --check` green
- [ ] `node tools/bake-diff.cjs` exits 0
- [ ] GATE PASS (28/28) from a clean profile
- [ ] Spec still matches code (no drift)

---
_Result / notes:
- `src/main.js`: added module constant `SUN_MOON = { base: 0.42, amp: 0.12, freq: 0.5, phase: -0.4 }`; `sunAltitude(az, S = SUN_MOON)` now evaluates `S.base + Math.sin(az * S.freq + S.phase) * S.amp` (comment block kept, one sentence added noting curve+rate are per-region data with Moon defaults). `App.sunRate` set at boot (after saved-region select) and in `selectRegion` immediately after `App.sunAz = r.sunAz0`, both as `r.sun ? r.sun.rate : 0.0060`. `idleWorld` and `stepWorld` advance with `App.sunRate` and evaluate `sunAltitude(App.sunAz, App.region.sun || SUN_MOON)`. `buildWorld` passes `{ g: region.g }` unconditionally to both `Dust` and `Rover` (controller ruling: no Moon special-casing — Moon regions yield `{ g: undefined }` and the `?? MOON_G` default applies).
- `src/game/rover.js`: constructor is `(terrain, scene, opts = {})`; `this.g = opts.g ?? MOON_G` (import kept as the default); the gravity site (force.y) uses `this.g`.
- `src/world/dust.js`: constructor is `(scene, terrain, sunDirRef, max = 2200, opts = {})`; `this.g = opts.g ?? MOON_G` (import kept); grain lifetime (`2 * vy / this.g + 0.55`) and vacuum integration (`V[i3+1] -= this.g * dt`) use `this.g`.
- `git diff src/game/regions.js` empty — no region record edited.
- Verification: `node --check` green on all of `src/`, `vendor/`, `server.js`. Node identity throwaway: `0.42 + Math.sin(az*0.5 - 0.4)*0.12` vs `sunAltitude(az)` with `SUN_MOON` defaults identical for az ∈ {0, 1.6, 4.35, 6.18} (strict string-match equality, ≪1e-12; e.g. az=0 → both 0.3732697989229619). `node tools/bake-diff.cjs` → BAKE-DIFF PASS, exit 0 (macro/far/det identical, determinism strict). GATE from a clean profile (`/tmp/opencode/ffprof`): `GATE PASS (28/28)`, EXIT 0 — full Anaximenes campaign + Long Shadow sections green. In-page (marionette ExecuteScript on the test Firefox, region=anaximenes): `FARSIDE.rover.g === 1.62`, `FARSIDE.dust.g === 1.62` (dust is on App, so it was readable directly), `FARSIDE.sunRate === 0.006`.
- Deviations: none.
