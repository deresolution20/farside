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

**Result: PASS — Moon path provably pixel-identical; Jovian branch wired and build-verified in-page.** One commit (`feat: per-region ground albedo, base tint and dust palette (moon defaults)`).

**Runtime-verified** (clean-profile Firefox on `:1`, in-page via an injected main-realm module — the G28 pattern):
- **Moon-pixel identity (frozen check):** verbatim pre-task `makeMoonAlbedo` body (function `frozen`, `DO NOT EDIT`, rng math inlined so it can't drift) vs `makeBodyAlbedo(256, A_MOON)` → **0 of 262144 (256×256×4) RGBA bytes differ** (frozenDiffBytes=0). `makeMoonAlbedo(256)` vs `makeBodyAlbedo(256, A_MOON)` (the wrapper) → **0** bytes differ.
- **Albedo `wrapT` preserved:** `makeBodyAlbedo(256, A_MOON).wrapT === THREE.RepeatWrapping` (value 1000) and `=== tex.moonAlbedo.wrapT`; boot `tex.moonAlbedo` is RepeatWrapping (1000).
- **Moon identity in-page (Anaximenes):** live albedo uniform name is **`uAlbedoTex`**; `terrain.uniforms.uAlbedoTex.value === tex.moonAlbedo` (**object identity**, not equality). `uBaseCol.value = (0.148, 0.129, 0.104)` exact. Dust `uAlbedo.value = (0.152, 0.133, 0.108)` exact, `uGlow.value = (0.36, 0.52, 0.60)` exact.
- **No quality-switch regression (HIGH→MEDIUM→HIGH):** `uBaseCol` wrapper object is NOT replaced (`wrapperPreserved=true` at the intermediate AND final tier); `uBaseCol.value` unchanged before / at-other-tier / after; albedo object identity preserved; the clipmap DID rebuild (levels 9→8 at the intermediate tier) — so the ring-snapshot trap does **not** reset `uBaseCol`.
- **Jovian branch build (synthetic §3.5 palettes, direct in-page call):** `makeBodyAlbedo(512, CHOS)` → usable 512 RepeatWrapping texture; `makeBodyAlbedo(512, CONAMARA)` (exercises the `flash` branch) → usable 512 RepeatWrapping texture. Mean brightness (0–255): **CHOS 190.59**, **Moon (`tex.moonAlbedo`) 140.48**, **CONAMARA 100.44** — the non-Moon branch builds measurably different ground (|CHOS−Moon| = 50.1).
- **GATE PASS (28/28), exit 0, clean profile** (post-task). Pre-task baseline was also GATE PASS (28/28).
- **Gate-shot diff:** the gate playthrough is **not frame-deterministic** (unseeded `Math.random` in dust spawn / settle-search, wall-clock-advancing sun azimuth, per-run rover pose), so a raw pixel diff of two independent runs measures playthrough variance, not the colour change. Confirmed with a **same-code control run**: the identical-code noise floor (post vs control) is of the same or LARGER magnitude than old-vs-new (pre vs post) in most frames — e.g. `02_game` mean 9.3 (old/new) vs 32.7 (same-code); `17_menu_regions` 0.06 (old/new) vs 12.9 (same-code); `13_m05_drum` 24.5 (old/new) vs 24.3 (same-code). Stable card frames (04/05/09/11/18) hover ≤ 1.3 mean in all pairs — **no uniform tint shift in any frame**. No colour drift attributable to this change; Moon path is pixel-stable.
- `node --check` green on every `src/` + `vendor/` + `server.js` file. `node tools/bake-diff.cjs` **exit 0** (byte-identical Anaximenes worldgen).
- **dust grep:** `grep -n "0.152, 0.133, 0.108|0.36, 0.52, 0.60" src/world/dust.js` → **lines 57–58 only** (the JS default consts — not re-scattered into the GLSL); `grep -c "uGlow" src/world/dust.js` = **3** (JS uniform decl + frag decl + use).
- `mott`/`varN`/`speck`/`g0` shader terms + constants untouched (palette = albedo texture + `uBaseCol` + dust colours only).

**Code-verified (no Jovian region record exists yet — they land in tasks 5/6; per R-JOVIAN-FORWARD-LOOKING):**
- `buildWorld`'s Jovian memoisation (`App.albTex[region.id] ||= makeBodyAlbedo(512, region.albedo)`), the tone-scaled `uBaseCol` write, and the `Dust({ g, albedo, glow })` pass-through are wired per §3.5 but CANNOT be exercised in-page against a real region until tasks 5/6 add Jovian bundles. Reviewed against the diff; to be exercised for real by the G29–G40 gate + tasks 5/6. The non-Moon *code path* (non-moon `A`, including the `flash` branch, `wrapT`, `mean`) IS runtime-verified above via the synthetic CHOS/CONAMARA builds.
- **Runtime-verified:** `tex.moonAlbedo` stays the literal Moon object (identity); `A_MOON` exported exactly; `uAlbedoTex.value === tex.moonAlbedo`; `uBaseCol` default; dust colour defaults; frozen byte-diff 0; `wrapT` RepeatWrapping; quality round-trip stability.