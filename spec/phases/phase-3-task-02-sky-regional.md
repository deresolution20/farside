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

**Done 2026-09-04.** `Sky(renderer, scene, textures, quality, cfg = SKY_MOON)` with
`SKY_MOON = { planet: 'earth', sunAngular: 0.00930, sunScale: 1.0, starSeed: 0xA17A6 }`.
Sky constructed FIRST in `buildWorld` (`region.sky ?? SKY_MOON`), returned from it,
passed to the Game ctx as local `sky`; boot no longer builds the Sky; `selectRegion`
teardown gains `App.sky.dispose()` + `e.scene.remove(App.sky.group)` after the four
existing removes (reverse build order). `Sky.dispose()` now idempotent (`_disposed`
guard) covering pmrem, envRT, env-sphere, galaxy, stars, sun, earth+glow, jove,
companion Points + its local sprite texture (shared boot textures never disposed).
`'jove'` path: sphere `R = 8000*j.angular*0.5` with soft-terminator uSun shading +
spin, `this.joveDir` from `(j.az, j.alt)`, one companion `THREE.Points` (per-dot
`aSize = 7400*angular` at the 7400 m billboard, libration wobble reused,
`companionSprite()` local copy of dust's radial-falloff pattern — no dust.js import).
`makeJoveTextures(W=1024, H=512)` = fbm-wobbled latitude bands + 3 vortices, sRGB,
`toTexture` (Repeat/Clamp), returns `{ jove }`; boot fills `if (!tex.jove)
Object.assign(tex, makeJoveTextures());`.

**Moon parity (R-PARITY: two clean-profile boots, HEAD `5d31768` vs task build —
no stash; probe `t2-probe.cjs parity`, files `/tmp/opencode/t2-parity-{before,after}.json`):**

| value | before (HEAD) | after (task) | result |
|---|---|---|---|
| `FARSIDE.sky.earth` present | true | true | equal |
| `starMat.uniforms.uInt` | 0.3400000000000001 | 0.3400000000000001 | bitwise equal |
| `sun.geometry.boundingSphere.radius` | 404.6826401963688 | 404.6826401963688 | bitwise equal |
| `stars` position array first 1000 floats | (seed 0xA17A6) | same | bitwise equal |
| `envMat.uGround` | [0.19, 0.168, 0.14] | [0.19, 0.168, 0.14] | equal |
| `envMat.uSunCol` | [2.6, 2.46, 2.24] | [2.6, 2.46, 2.24] | equal |
| env vertex shader string | — | identical | bitwise equal |
| env fragment shader string | earth tint inline | `uHomeTint` uniform | 3 lines (R-ENV) |

R-ENV: new uniform `uHomeTint` default `new THREE.Vector3(0.30,0.44,0.72).multiplyScalar(2.2)`;
measured in-page: `[0.66000000000000003, 0.96800000000000008, 1.5840000000000001]` —
exactly the folded constants in double precision, shader keeps the same
`uHomeTint * smoothstep(0.99930, 0.99968, e)` shape (no forked source). Jove default
tint (0.55, 0.44, 0.32) at the jove direction.

**Jove smoke (R-JOVE-SMOKE, throwaway injected module, clean profile; `/tmp/opencode/t2-jove.json`):**
`new Sky(page renderer, scratch Scene, page tex, page quality, { planet:'jove', jove:{az 4.9,
alt 0.22, angular 0.13, companions [[1.2,0.10,0.004,[1,1,1]],[3.3,−0.05,0.003,[0.9,0.85,0.75]]]},
sunAngular 0.0018, sunScale 0.55, starSeed 0x71F0C, ground [0.17,0.165,0.155] })` →
`this.jove` exists, `boundingSphere.radius` 520.0000203064474 vs 8000·0.13·0.5 = 520 (rel
3.9e-8; Float32 vertex round-trip — absolute 1e-6 unattainable for a real SphereGeometry,
relative 1e-6 met); companion `THREE.Points` with 2 points at dir(az,alt)·7400 (max abs diff
2.4e-4 on ~7400-scale values, rel 3.2e-8, Float32 attribute); `aSize` [29.6, 22.2] = 7400·angular;
tints preserved; starfield first-1000: 1000/1000 floats differ from the Moon seed's; sun quad
half-extent 55.38461685180664 vs 8000·0.0018/0.130·0.5 = 55.38461538461539 (rel 2.6e-8,
Float32 bbox); `uGround` [0.17,0.165,0.155], `uSunCol` [1.43,1.353,1.232] (2.6/2.46/2.24 ×0.55),
`uHomeTint` [0.55,0.44,0.32]; `dispose()` twice without error; test Sky removed from scratch
scene. All pass.

**Swap smoke (AC9, in-page, clean profile; 12/12 pass):** boot AX → `#region-longshadow`
→ `#regionload` sheet → menu: `FARSIDE.sky` new instance, old sky group NOT in
`engine.scene.children`, `FARSIDE.sky.earth` present (LS is a Moon world), `_envDirty`
false immediately and still false +4 s (single mandated pmrem rebuild, no storm) →
screenshot `.shots/task2-ls-menu.png` → select `#region-anaximenes` back: AC2 value set
identical again (stars bitwise, sunRadius/uGround/uSunCol/uInt to 1e-6), zero console
errors through both swaps.

**Gate + guards:** `node --check` green on all of `src/`+`vendor/`+`server.js`;
`node tools/bake-diff.cjs` → `BAKE-DIFF PASS (6.1 s)`, exit 0; full gate from clean
profile → **GATE PASS (28/28)**, exit 0 (~30 min; both Moon worlds + swap exercised).

**Deviations:** none from the brief/rulings. Only float-tolerance note: geometry-derived
values (sphere radius, quad half-extent, companion positions) read back through Float32
buffers, so they are asserted at relative 1e-6 (max absolute 2e-5); the cross-boot Moon
parity of the same values is bitwise-identical.
