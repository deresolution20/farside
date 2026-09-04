# Task Spec (Tier 3) — Phase 3 / Task 2: Sky Becomes World-Owned (Per-Body cfg)

**Parent:** Phase 3 → Task 2 (`spec/phases/phase-3-planets-content.md` §3.4)
**Blocked by:** 1
**difficulty:** `hard`
**routes to:** local (Claude Code — local endpoints not yet wired)

## What to build

Make the sky a per-world object driven by a `cfg` bundle: `Sky(renderer, scene,
textures, quality, cfg)` where `cfg = region.sky ?? SKY_MOON`. The Moon path (Earth
planet, 0.00930 rad sun disc, starSeed 0xA17A6, IBL colours) must be **exactly today's
Sky** — the `cfg` defaults reproduce every current constant. A `'jove'` planet path
adds the procedural Jove disc (`makeJoveTextures`) + Galilean companion dots, a
parameterised sun angular size + light scale, per-seed starfield, and cfg-driven IBL
sources. Sky moves into `buildWorld`'s rebuild list (boot + `selectRegion` teardown),
and the `Game` receives the world's sky via its ctx.

## Files this task may touch

- `src/world/sky.js` (cfg param, `_buildStars` seed, `_buildSun` angular,
  `_buildPlanet` → earth/jove, `_buildEnv` cfg colours, `dispose()` extension,
  export `SKY_MOON`)
- `src/world/textures.js` (`makeJoveTextures(W, H)`)
- `src/main.js` (boot site main.js:156-162 rewire: Sky into `buildWorld`;
  `buildWorld` Sky construction + return + Game ctx `sky`; `selectRegion` teardown
  lines 293-299; comments at 156-157 and 181-190)
- `spec/phases/phase-3-task-02-sky-regional.md` (result notes only)

## Acceptance criteria (contract — MUST be testable)

- [ ] `sky.js` exports `SKY_MOON = { planet: 'earth', sunAngular: 0.00930,
      sunScale: 1.0, starSeed: 0xA17A6 }` and the `Sky` constructor signature is
      `(renderer, scene, textures, quality, cfg = SKY_MOON)`; booting with no cfg
      (both current regions) exercises that default end-to-end.
- [ ] **Moon parity (in-page, pre-Jovian-worlds):** booting Anaximenes gives
      `FARSIDE.sky.earth` present, `starMat.uniforms.uInt` initial 1.0, sun quad
      geometry bounding half-extents matching today's `D = 8000*0.0093/0.13*0.5`
      (compare `FARSIDE.sky.sun.geometry.boundingSphere.radius` across a git-stash
      before/after run of the same clean profile — identical to 1e-6); starfield
      positions identical (`stars.geometry.attributes.position.array` first 1000
      floats bitwise-equal across before/after — same seed 0xA17A6 ⇒ same array);
      env IBL: `envMat.uniforms.uGround.value` (0.19, 0.168, 0.140),
      `uSunCol.value` (2.6, 2.46, 2.24), Earth tint term unchanged in the env
      shader source (diff of `envMat` vertex/fragment string: identical under
      `SKY_MOON`).
- [ ] `_buildStars` uses `makeRNG(cfg.starSeed)` (seed was the literal 0xA17A6);
      everything else in its loop is untouched (same magnitude/spectral math).
- [ ] `_buildSun` sizes the quad from `cfg.sunAngular` (the formula
      `D = 8000 * sunAngular / 0.130 * 0.5` with `sunAngular = cfg.sunAngular`);
      the fragment shader is untouched (disc/limb/corona constants stay).
- [ ] `_buildPlanet(textures, cfg)`: `'earth'` path is byte-identical logic to
      today's `_buildEarth` (same sphere size from `EARTH_ANGULAR`, same shader
      strings, halo, `update()` libration wobble constants 0.0021/0.055/0.030/0.0009
      and direction (0, 0.28, −1) → `this.earthDir` initial, mesh on `this.earth`);
      `'jove'` path builds (mesh assigned to `this.jove`, the gate's Jove-sky
      sanity reads it): sphere `R = 8000 * cfg.jove.angular * 0.5`, texture
      `textures.jove`, the same day/terminator shading approach (uSun driven per
      frame from `sky.sunDir`), slow spin, initial direction from
      `(cfg.jove.az, cfg.jove.alt)`;
      companions: one `THREE.Points` (per-companion size from its angular at the
      Earth-like 7400 m billboard placement) with a radial-falloff sprite texture
      (factory copied from `dust.js`'s `grainSprite()` pattern — a local ~15-line
      helper in sky.js; **no import from dust.js**).
- [ ] `_buildEnv` uniforms: `uGround` — Moon: exactly (0.19, 0.168, 0.140);
      Jovian: from the region's `sky.ground` bundle field (phase spec §3.1) — CHOS
      `[0.17, 0.165, 0.155]`, CONAMARA `[0.10, 0.08, 0.06]`; falls back to the Moon
      constant when absent; `uSunCol` scaled by `cfg.sunScale` (Moon ×1.0 =
      unchanged); the home-planet IBL term's tint/direction comes from cfg
      (Moon: Earth blue at `uEarth`; Jovian: warm (0.55, 0.44, 0.32) at the jove
      direction). All as **uniform values / shader-source-identical** — no new
      passes.
- [ ] `makeJoveTextures(W = 1024, H = 512)` in `textures.js`: procedural banded gas
      giant (fbm-wobbled latitude bands + 2–3 vortices), sRGB canvas →
      `toTexture` with the equirectangular wrap rule (`wrapS = RepeatWrapping`,
      `wrapT = ClampToEdgeWrapping`), returns `{ jove: <texture> }`; built once at
      boot into `tex` (main.js, next to the Earth fill ~main.js:149-152:
      `if (!tex.jove) Object.assign(tex, makeJoveTextures());`).
      `grep -n "assets/"` shows no new disk references (zero-runtime-assets).
- [ ] **buildWorld owns Sky:** `buildWorld` constructs `new Sky(e.renderer,
      e.scene, tex, e.quality, region.sky ?? SKY_MOON)`, adds `sky` to its return,
      and the Game ctx passes that `sky` (replacing `sky: App.sky` at main.js:219).
      Boot (main.js ~158) no longer constructs the Sky — the comment at 156-157 is
      updated: Engine/Audio/Input/HUD/tex stay boot-singletons, Sky moves into
      `buildWorld`. `selectRegion` teardown gains (reverse order, after the
      existing four removes, before the `buildWorld` call): dispose +
      `e.scene.remove(App.sky.group)`. `Sky.dispose()` extended to also dispose
      planet/sun/star/galaxy geometries+materials and companion points (idempotent).
- [ ] Swap smoke (in-page): from the menu, selecting THE LONG SHADOW swaps the
      world and `FARSIDE.sky` identity changes (new instance), the old sky's group
      is not in `engine.scene.children`, and the Earth renders (Long Shadow is a
      Moon world — `planet: 'earth'` default); selecting back keeps Anaximenes
      identical. No console errors; no `_envDirty` rebuild storm (the 6 s throttle
      in `stepWorld` untouched; a fresh Sky starts `_envDirty: true` once).
- [ ] GATE PASS (28/28), EXIT:0, clean profile (the gate exercises both Moon worlds
      + the swap; any Sky regression in the Moon path fails it).
- [ ] `node --check` green on `sky.js`, `textures.js`, `main.js`.
- [ ] `node tools/bake-diff.cjs` exits 0.

## Context the worker needs (and ONLY this)

- Why: foreign bodies need a different home planet (Jove), a different sun disc
  size/intensity, and a different starfield — while the Moon worlds keep exactly
  today's sky. One global Sky reconfigured in place was rejected (stateful planet
  swap in a shared object); per-body subclasses were rejected (new code path,
  Phase 3 guard). Rebuild-with-the-world matches the existing teardown pattern.
- Constraints (constitution + HARD-WON): the uniform-wrapper rule (mutate
  `.value`, never replace a wrapper) applies to any new Sky uniforms; the
  `markEnvDirty` 6 s throttle in `main.js` stays the ONLY writer of
  `sky.markEnvDirty()` except the constructor's initial `_envDirty = true`;
  `_envDirty` costs a full `pmrem.fromScene()` (ARCHITECTURE §Rendering) — do not
  flag it more; `makeJoveTextures` must keep the Earth-call-site wrap rule
  (ARCHITECTURE §Rendering: equirectangular ⇒ ClampToEdge on T); renderOrder
  discipline for sky objects (-1000…-996) must be preserved so the new planet/
  companion meshes sit behind everything.
- May use: `makeRNG/sstep/lerp/clamp/fbm/vnoise` from `src/core/rng.js`; the
  existing `_buildEarth` as the verbatim reference for the jove builder;
  `dust.js`'s `grainSprite()` as the sprite factory pattern (copy, don't import);
  `EARTH_ANGULAR`-style naming for the new constants.
- Commit: one logical change (`feat: world-owned sky with per-body cfg +
  procedural Jove`).

## Verification gate (run before merge)

- [ ] Acceptance criteria all met
- [ ] Moon-parity checks recorded in result notes (with the measured values)
- [ ] GATE PASS (28/28) clean profile
- [ ] `node tools/bake-diff.cjs` exits 0
- [ ] Spec still matches code (no drift)

---
_Result / notes:_
