# Task Spec (Tier 3) — Phase 3 / Task 3: Ground Albedo + Dust Palette

**Parent:** Phase 3 → Task 3 (`spec/phases/phase-3-planets-content.md` §3.5)
**Blocked by:** 2
**difficulty:** `hard`
**routes to:** local (Claude Code — local endpoints not yet wired)

## What to build

Parameterise the ground colour chain per region, Moon-identical by default:
`makeMoonAlbedo` refactors into `makeBodyAlbedo(N, A)` with the Moon palette/seed as
the default export (identical pixels — proven by a frozen body + pixel check);
`buildWorld` assigns a per-region albedo texture (Moon regions keep literally today's
`tex.moonAlbedo` object; Jovian regions memoize per id); the terrain GLSL's hardcoded
base vec becomes uniform `uBaseCol` (declared in `buildMaterial()`'s literal);
`Dust` gains `albedo` + `glow` colour opts (defaults = today's values).

## Files this task may touch

- `src/world/textures.js` (`makeBodyAlbedo`, `A_MOON`, `makeMoonAlbedo` wrapper)
- `src/world/terrain.js` (`uBaseCol` uniform: declared in `buildMaterial()`'s literal,
  consumed at the `vec3 base = …` site ~terrain.js:394, value settable per world)
- `src/world/dust.js` (`uAlbedo` + anomalous-tint ctor opts, defaults = today's
  values)
- `src/main.js` (`buildWorld`: per-region albedo assignment + `uBaseCol.value` set +
  Dust colour opts; `App.albTex` memo)
- `spec/phases/phase-3-task-03-albedo-dust.md` (result notes only)

## Acceptance criteria (contract — MUST be testable)

- [ ] `textures.js` exports `A_MOON = { seedMare: 5, seedFine: 61, high: 190, low: 96,
      fineLo: 0.86, fineHi: 0.28, tone: [1, 0.98, 0.94], flash: null }` and
      `makeBodyAlbedo(N, A)` with the §3.5 expression (same evaluation order as
      today's loop — the `flash` branch contributes nothing when `A.flash` is null,
      the `tone` multiplies are today's exact 1/0.98/0.94).
- [ ] **Moon-pixel identity (frozen check, in-page):** a throwaway in-page script
      (not committed) keeps a verbatim copy of the pre-task `makeMoonAlbedo` body
      (function `frozen`, `DO NOT EDIT` comment) and compares
      `frozen(256)` vs `makeBodyAlbedo(256, A_MOON)` canvas ImageData pixel-wise —
      100% of RGBA bytes equal. (256 keeps the check fast; the full 512 path then
      renders the Moon identically by construction.)
- [ ] `makeMoonAlbedo(N)` remains exported and equals `makeBodyAlbedo(N, A_MOON)`
      (wrapper) — `main.js:152` keeps calling it at boot; the Moon regions' runtime
      texture object is unchanged: `buildWorld` with a region lacking `albedo`
      assigns `tex.moonAlbedo` (the SAME object identity as today:
      `FARSIDE.terrain.uniforms.uAlbedoTex.value === FARSIDE.tex.moonAlbedo` on
      Anaximenes and Long Shadow).
- [ ] Jovian path: `buildWorld` with a region carrying `albedo` memoizes
      `App.albTex[region.id] ||= makeBodyAlbedo(512, region.albedo)` and assigns that
      texture; swapping out and back does NOT regenerate (identity stable across
      `selectRegion` round-trips — in-page check).
- [ ] `terrain.js`: `uBaseCol: { value: new THREE.Vector3(0.148, 0.129, 0.104) }`
      **declared in `buildMaterial()`'s uniform literal** (the ring-snapshot rule —
      the AC includes reading `buildMaterial` to confirm the literal line, not just
      `this.uniforms` elsewhere); the fragment's `vec3 base = vec3(0.148, 0.129,
      0.104);` becomes `vec3 base = uBaseCol;`; `buildWorld` sets
      `terrain.uniforms.uBaseCol.value` from `region.albedo ? tone-scaled default
      (0.148,0.129,0.104)×tone : unmodified default` per §3.5 — Moon regions write
      the exact default (value equality in-page).
- [ ] **No quality-switch regression:** an in-page `setQuality` round-trip (HIGH →
      MEDIUM → HIGH) leaves `uBaseCol.value` as written (quality rebuilds copy
      wrapper `.value` — verify no reset to a stale default after rebuild; this is
      the documented intermittent-uniform trap, ARCHITECTURE §Terrain).
- [ ] `Dust(scene, terrain, sunDirRef, max, opts = {})`: `uAlbedo` uniform value from
      `opts.albedo ?? [0.152, 0.133, 0.108]` (today's vec); the fragment's anomalous
      tint constant `vec3(0.36, 0.52, 0.60)` (dust.js:104) becomes uniform `uGlow`,
      value from `opts.glow ?? [0.36, 0.52, 0.60]`. `buildWorld` passes
      `region.dust` through (`{ g, albedo, glow }` — `g` already wired in task 1).
      Moon regions: values bitwise-equal to today (in-page uniform read).
- [ ] `grep -n "0.152, 0.133, 0.108\|0.36, 0.52, 0.60" src/world/dust.js` → the
      constants survive ONLY as the documented defaults (not double-scattered in the
      GLSL/JS mix); `grep -c "uGlow" src/world/dust.js` ≥ 2 (declaration + use).
- [ ] `node --check` green on `textures.js`, `terrain.js`, `dust.js`, `main.js`.
- [ ] GATE PASS (28/28), EXIT:0, clean profile — the Anaximenes campaign includes the
      drill/dust/trail close-ups; any albedo drift or dust-colour drift is visible in
      the gate shots (diff `.shots` menu/campaign frames against a pre-task run of a
      clean profile — they must match to within screenshot encoder noise).
- [ ] `node tools/bake-diff.cjs` exits 0.
- [ ] The `makeMoonAlbedo` `wrapT = RepeatWrapping` rule is preserved on
      `makeBodyAlbedo`'s output (ARCHITECTURE §Rendering — the terrain tiles the
      albedo in BOTH axes; ClampToEdge would smear a row across the basin).

## Context the worker needs (and ONLY this)

- Why: foreign bodies have different ground colour (pale cool plain vs dark
  reddish-brown impact-flash floor) and different dust. The texture + shader-base +
  dust chain is the palette seam; the Moon must stay pixel-identical, which is why
  the default path reuses today's exact expression tree and today's texture object.
- Constraints (constitution + HARD-WON): the uniform-wrapper rule (never replace a
  wrapper — mutate `.value`; `buildClipmap` snapshots the wrapper map once, rings
  and Dust share it); the `uBaseCol`-in-`buildMaterial()`-literal rule (a uniform
  added only to `this.uniforms` after `buildMaterial` never reaches any ring — the
  shader silently reads 0, then "fixes itself" on the next quality rebuild); the
  albedo `wrapT = RepeatWrapping` rule (the Earth/`toTexture` ClampToEdge default
  must not leak in); `tex.moonAlbedo` must remain the literal object the Moon
  regions use (identity, not equality).
- May use: `fbm/sstep/lerp` from `src/core/rng.js` (the albedo loop's existing
  imports); `THREE.CanvasTexture`/`toTexture` helpers in `textures.js`; today's
  `makeMoonAlbedo` body as the frozen reference (copy it into the in-page pixel
  check verbatim, marked `DO NOT EDIT` — the same pattern as `bake-diff.cjs`).
- Do NOT change the shader's `mott`/`varN`/`speck`/`g0` terms or their constants —
  the palette is the ALBEDO TEXTURE + `uBaseCol` + dust colours only.
- Commit: one logical change (`feat: per-region ground albedo, base tint and dust
  palette (moon defaults)`).

## Verification gate (run before merge)

- [ ] Acceptance criteria all met
- [ ] Moon-pixel identity check result recorded (frozen vs new: 0 diffs)
- [ ] GATE PASS (28/28) clean profile; gate-shot diff vs pre-task run noted
- [ ] `node tools/bake-diff.cjs` exits 0
- [ ] Spec still matches code (no drift)

---
_Result / notes:_