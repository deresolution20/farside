# Phase Spec (Tier 2) — Phase 3: Planets & Content

**Parent:** Product Spec → Phase 3 (planets & content — §4 scope, §7 row 3)
**Depends on phases:** Phase 2 (regions/levels — closed 2026-09-02, gate 28/28)

> **Decision record (2026-09-03, approved in brainstorm):** the two new worlds are both
> **foreign airless bodies** — a high-latitude smooth-plain basin on **Ganymede** (THE
> CHOS PLAIN: low far sun that never sets; headlight driving is the whole mood) and a
> dark, ancient breakout crater field on **Callisto** (CONAMARA: first real day/night;
> the pipe lattice leads the world). The two Moon basins stay canonical "home" regions.
> Story direction: **the count answers you** — every recovered record, Moon or Jovian,
> timestamps the count restarting at the *surveyor's touchdown*, to the tenth of a
> second. Gate: full Phase-2 recipe for both worlds (28 → 40 checks).

## 1. Goal of this slice

A **planet is a pure-data extension of the region record** — gravity, sun cycle
(rate/altitude curve), sky (foreign planet, sun size/intensity, starfield), ground
albedo, dust colour — with NO new engine code paths — and the abstraction is proven by
**two fully playable foreign worlds**: THE CHOS PLAIN (Ganymede) and CONAMARA
(Callisto), each a 5-mission campaign + ending card + free survey + its own save slot,
built almost entirely from existing builders, data records and parameter plumbing. The
Moon worlds (Anaximenes, Long Shadow) remain provably untouched: byte-identical bakes,
identical sun curve, starfield, Earth, and albedo pixels.

User value: the "visually stunned" JTBD gets two genuinely different skies (a 7°-wide
Jove over a pale plain that never sees the sun rise high; a star-like far sun setting
for the first time in the game over impact-flash pockmarked dark ground), the rover
actually feels different under 0.88× and 0.76× gravity, and the count — the game's
central object — extends past the Moon: *it started at your landing, on every world.*

## 2. What "done" looks like (phase acceptance criteria)

- [x] The menu shows **four** named regions (ANAXIMENES, THE LONG SHADOW, THE CHOS
      PLAIN, CONAMARA); each card shows a per-region status derived from that region's
      save; layout stays clean at 1280×800. **Proof:** G29 (+ close-run shots
      `spec/evidence/phase-3/01_menu.png` — clean profile, all four NO SURVEY — and
      `22_menu_four_cards.png` at the post-campaign status mix).
- [x] **THE CHOS PLAIN** (`ganymede`, `farside.ganymede.v1`): full 5-mission campaign
      (THE DARK PLAIN → THE FIRST ENTRY → THE RING → THE LONG DRIVE → THE ARRIVAL) →
      ending card **THE ARRIVAL** → free survey. `g = 1.428`; sun altitude stays in
      0.6°–6.5° (never sets), cycles on the ~70-min crawl; 5×-smaller far sun at 0.55 light
      scale; Jove ≈ 7° across in the sky; pale low-contrast ground; the 2.2 m `ring`
      drumhead under the rise is the shallowest drill in the game. **Proof:** G31–G34 (L01,
      save round-trip) + full-campaign driver run (61/61) with screenshots in
      `spec/evidence/phase-3/` (`chosing_04_far_sun`, `05_jove`, `03_longdrive`,
      `08_ring_drill`, `10_ending`).
- [x] **CONAMARA** (`callisto`, `farside.callisto.v1`): full 5-mission campaign (THE
      DARK FLOOR → THE FIELD → THE DEAD TAP → DUSK → THE EVENT) → ending card **THE
      EVENT** → free survey. `g = 1.236`; first real day/night (sun altitude dips
      below 0°, charging stops, headlights carry a night objective); star-like far sun
      at 0.42 light scale; Jove ≈ 4.4°; dark reddish ground with bright impact-flash
      speckle; the pipe **lattice** under the breakout field + `buildBreakout` prop;
      `shard` glass dielectric-matched to Anaximenes (codex beat). **Proof:** G35–G37 +
      G34 (g/sun sanity) + full-campaign driver run (71/71) with screenshots
      (`conamara_02_dark_floor`, `04_field`, `08_night_drive`, `09_ending`).
- [x] **The Moon worlds are untouched**: `node tools/bake-diff.cjs` exits 0 after every
      worldgen touch; `farside.anaximenes.v3` / `farside.longshadow.v1` blobs intact
      across the whole 40-check gate; the Anaximenes & Long Shadow sun curve, starfield
      seed, Earth disc and lunar albedo are **exactly** today's values (Moon default
      object + `makeMoonAlbedo` wrapper); their region records carry none of the new
      fields (defaults are read, not rewritten). **Proof:** G1–G27 unchanged in this
      run, G40 (back-to-Anaximenes round-trip intact after four region visits);
      `regions.js` vs pre-phase commit `ba614f3`: the ANAXIMENES and LONGSHADOW
      record blocks byte-identical (task-7 check); bake-diff exit 0.
- [x] **Data-only lore**: `SAMPLES` gains exactly five additive keys
      (`frost`, `ring`, `flash`, `shard`, `tap`) — Moon keys untouched; no new objective
      DSL kinds (event/distance/count + `unlocks`/`unlock` only); no new prop mechanics
      beyond one new builder (`buildBreakout`); the identity sweep stays closed
      (no `REGOLITH`/`Anaxagoras`/`Beacon-9`/`MU-7`/`CASSIOPEIA`/`winchxyz` reappear
      outside vendor/). **Proof:** grep contract run in task 7 — `grep -rE` sweep over
      `src/` 0 hits; `git diff -- src/game/lore.js` = +5 additive keys only;
      `git diff -- src/` contains no new `fetch`/URL/asset usage.
- [x] **Gate:** `GATE PASS (40/40), EXIT:0` from a clean profile — existing G1–G28 run
      first, unchanged, then G29–G40 (§3.10). **Proof:** close run log (29 min,
      per-check results in the task-07 result notes).
- [x] `node --check` green on every JS file; no new runtime assets (Jove imagery is
      procedural in `textures.js`); cold start fully offline. **Proof:** per-task
      verification + the close run's cold boot (no network requests in the page
      session).
- [x] Product Spec §7 row 3 → done + 2026-09-06 changelog; `HANDOFF.md` rewritten;
      `docs/ARCHITECTURE.md` synced (§3.11); evidence in `spec/evidence/phase-3/`.

## 3. Technical design

### 3.1 Region bundle — new optional fields

One module still knows every world: `src/game/regions.js`. The region record gains
**optional** fields. **The two Moon records are NOT edited** — every new field is read
with a Moon-identical default, so absence = today's behaviour. Only the Jovian records
carry them:

```js
{
  …all existing fields (id, name, subtitle, tagline, brief, saveKey, sunAz0, spawn,
       terrain: P, playableR, landmarks, content, props, anoms, transmit,
       missions, codex, ending)…

  g: 1.428,                    // m/s², surface gravity (default MOON_G = 1.62)

  sun: { rate: 0.0015,             // rad/s azimuth rate  (default 0.0060)
         base: 0.06, amp: 0.05,    // altitude = base + sin(az*freq + phase) * amp
         freq: 0.5, phase: -0.4 }, // defaults {0.42, 0.12, 0.5, -0.4} reproduce
                                   // today's 0.42 + sin(az*0.5 − 0.4)*0.12 bit-exactly

  sky: {
    planet: 'jove',            // 'earth' (default) | 'jove'
    jove: { az: 4.9, alt: 0.22, angular: 0.13,   // sky direction + apparent size
            companions: [[az, alt, angular, [r,g,b]], … ] },  // Galilean dots
    sunAngular: 0.0018,        // rad (Moon default 0.00930 = real 0.53° disc)
    sunScale: 0.55,            // artistic light scale (default 1.0)
    starSeed: 0x71F0C,         // starfield RNG seed (Moon default 0xA17A6)
    ground: [0.17, 0.165, 0.155] // IBL ground-bounce base (Moon default
                                 // 0.19, 0.168, 0.140 = today's envMat uGround)
  },

  albedo: { seedMare: 41, seedFine: 83,
            high: 198, low: 176,
            fineLo: 0.90, fineHi: 0.20,     // makeBodyAlbedo params (§3.5); the
            tone: [1.0, 1.0, 1.03],         // Moon records omit albedo entirely
            flash: null | { seed: 97, amp: 85 } },   // impact-flash speckle (Callisto)
  dust: { albedo: [0.17, 0.165, 0.155],     // Dust uAlbedo (default 0.152,0.133,0.108)
          glow:  [0.36, 0.52, 0.60] }       // anomalous-tint grain (default unchanged)
}
```

`playableR` stays **432 for all four regions** (Phase-2 parked item not claimed):
constraint `playableR ≤ rim.r − rim.w/2 − 20` and `rim.r + rim.w < 600` must hold for
every P (CHOS: 440/580 ✓; CONAMARA: 435/590 ✓).

### 3.2 Sun cycle — `src/main.js`

`sunAltitude(az)` (main.js:885) becomes `sunAltitude(az, S)` with
`S = { base: 0.42, amp: 0.12, freq: 0.5, phase: -0.4 }` (module constant `SUN_MOON`),
and the body `return S.base + Math.sin(az * S.freq + S.phase) * S.amp;` — with the
defaults this is the same expression tree as today. The azimuth rate moves off the
two literal `0.0060` call sites into `App.sunRate`, set at boot
(`App.region.sun?.rate ?? 0.0060`) and in `selectRegion` (next to
`App.sunAz = r.sunAz0`). Call sites `idleWorld` (main.js:655) and `stepWorld`
(main.js:698) use `App.sunRate` + `App.region.sun ?? SUN_MOON`. `sky.setSun(az, alt)`
and `syncSun()` are unchanged (they consume `sky.sunDir`).

The Moon records keep `sunAz0` only; both new records carry `sun` + a tuned `sunAz0`:

| region     | rate      | base  | amp   | altitude range        | sunAz0 |
|------------|-----------|-------|-------|-----------------------|--------|
| CHOS       | 0.0015    | 0.06  | 0.05  | 0.01…0.11 rad (0.6°–6.3°, never sets) | 10.22 (dimmest point of the altitude crawl — arg(az)=az·0.5−0.4 = −π/2; brightest only ~70 min in) |
| CONAMARA   | 0.0025    | 0.10  | 0.16  | −0.06…0.26 rad (−3.4°…14.9°, real night) | 6.18 (first sunset ≈ 15 game-min in) |

Night on CONAMARA = no charging + headlights (existing power/sunmask systems already
handle sub-horizon sun; LS's dark start proved it). Exact `sunAz0` values may be
re-tuned in tasks 5/6 to hit the campaign pacing notes; the range columns are
acceptance, the start values are initial.

### 3.3 Gravity — `src/game/rover.js`, `src/world/dust.js`

- `Rover(terrain, scene, opts = {})`: `this.g = opts.g ?? MOON_G`; rover.js:753
  `force.y -= this.mass * MOON_G` → `* this.g`. `MOON_G` stays exported from
  `terrain.js` as the default constant.
- `Dust(scene, terrain, sunDirRef, max, opts = {})`: `this.g = opts.g ?? MOON_G`;
  dust.js:140 `maxLife = 2*vy/this.g + 0.55` and dust.js:151 `V[i3+1] -= this.g*dt`.
  (The higher g also shortens CHOS/CONAMARA grain hang-time — free realism.)
- `buildWorld` passes `region.g` to both.
- **Feel band:** both foreign g's sit at 0.88× / 0.76× lunar — inside the static
  suspension sag tolerance (±~20%), so NO rover constant re-tuning happens (per-region
  rover mechanics stays parked per Phase 2). If the gate's steering budget ever
  can't close on a Jovian L01, the fix is the driver's existing ≤8 m re-seat assist,
  not a physics constant — if a constant change becomes *necessary*, it goes to
  `spec/IDEAS.md` (Phase 3 guard) and the world's g moves toward 1.62 instead.

### 3.4 Sky — world-owned, per-body: `src/world/sky.js`, `src/world/textures.js`,
### `src/main.js`

**Approach (decided):** Sky joins the world-swap rebuild list — same teardown pattern
as Terrain/Props/Dust/Rover. Rejected: reconfigure-one-global-Sky (stateful planet-mesh
swap inside a shared object — breaks Phase 2's "Sky untouched" invariant) and
per-body Sky subclasses (new code path — Phase 3 guard).

- `new Sky(renderer, scene, textures, quality, cfg)` — `cfg = region.sky ?? SKY_MOON`
  (`SKY_MOON` = today's constants: planet 'earth', sunAngular 0.00930, sunScale 1.0,
  starSeed 0xA17A6). The constructor's fixed values become cfg-driven:
  - `_buildStars()` takes `cfg.starSeed` (star positions/colours differ per body;
    galactic band stays as-is — same solar neighbourhood);
  - `_buildSun()`: disc quad size from `cfg.sunAngular` (formula unchanged, constant
    parameterised);
  - `_buildPlanet(textures, cfg)`: `cfg.planet === 'earth'` → today's Earth verbatim
    (tidal-lock libration wobble, halo, everything); `'jove'` →
    `this._buildJove(textures, cfg.jove)`: sphere sized from `jove.angular`
    (same `R = 8000 * angular * 0.5` pattern as Earth), texture `textures.jove`,
    slow spin, the same soft-terminator shading (uSun from `sky.sunDir` per frame),
    plus **companions**: one `THREE.Points` set, each `[az, alt, angular, tint]`
    placed like the Earth (billboard at 7400 m, libration wobble reused), sprite =
    the `grainSprite()` radial-falloff canvas pattern from `dust.js` (copy it — do not
    import across the world/ boundary for a 15-line sprite factory; keep sky.js
    self-contained);
  - `_buildEnv()`: the three hardcoded IBL sources become cfg-driven — ground bounce
    `uGround` from the region's albedo `tone`-adjusted base (Moon: today's
    (0.19, 0.168, 0.140) verbatim), `uSunCol` scaled by `cfg.sunScale`, and the
    "Earth" term (`vec3(0.30,0.44,0.72)` at `uEarth`) becomes the cfg's home planet:
    for Jove a warm-band tint (initial `vec3(0.55, 0.44, 0.32)`) at `jove`'s
    direction. The penumbra/star-wash code is unchanged.
- **`makeJoveTextures(W=1024, H=512)`** in `textures.js` — procedural banded gas
  giant: latitude-banded albedo (fbm-wobbled bands, 2–3 major vortices), sRGB canvas →
  `toTexture` with `wrapS = RepeatWrapping, wrapT = ClampToEdge` (the
  `makeMoonAlbedo`/Earth call-site rule — equirectangular, must not wrap poles).
  Built once at boot into the shared `tex` object (next to the Earth fill,
  main.js:149-152 pattern): `if (!tex.jove) tex.jove = makeJoveTextures();`.
- **`buildWorld`** (main.js:191) constructs the Sky: `const sky = new Sky(e.renderer,
  e.scene, tex, e.quality, region.sky ?? SKY_MOON);` adds `sky` to its return, and
  passes it to the Game ctx (`sky` replaces `App.sky` in the Game options at
  main.js:219 — the Game instance is world-owned already, so its sky must be too).
  `App.sky` is reassigned via the existing `Object.assign(App, buildWorld(...), …)`
  at boot (main.js:164) and in `selectRegion` (main.js:299). The boot site
  (main.js:158) and the "Sky … shared by every world" comments (main.js:156-157,
  188) are updated: **Engine/Audio/Input/HUD/tex stay boot-singletons; Sky moves into
  `buildWorld`'s ownership.**
- **`selectRegion` teardown** (main.js:293-297) gains, in reverse build order:
  `App.sky.dispose()` (pmrem + envRT) + dispose of the planet/sun/star/galaxy
  geometries & materials (extend `Sky.dispose()` to cover them) +
  `e.scene.remove(App.sky.group)` — placed before the `buildWorld` call at 299.
- **Consequences:** `applyWorldQuality()` (App.sky.setQuality) and `hud.update`
  (sky param) keep working — they read `App.sky` fresh each frame. After a swap the
  new Sky starts `_envDirty = true`, so the first post-swap frame rebuilds the IBL;
  the 6 s `markEnvDirty` throttle in `stepWorld` is untouched. HUD `SOL PHASE`
  (hud.js:493) reads `sky.sunDir.y` — works per-body unchanged.
- **Gate-visible handle:** `window.FARSIDE.sky` (same object identity as the App's).

### 3.5 Ground albedo + dust colour — `src/world/textures.js`, `src/world/terrain.js`,
### `src/world/dust.js`, `src/main.js`

- **`makeBodyAlbedo(N, A)`** — the current `makeMoonAlbedo` body parameterised:
  per pixel `x = i/N*6`, `y = j/N*6` (the 6 is part of the shared algorithm — do not
  parameterise; one albedo frequency across worlds, palettes differ):
  ```js
  const mare  = sstep(0.42, 0.58, fbm(x, y, 4, 2.07, 0.55, A.seedMare));
  const fine  = fbm(x*5.3 + 2, y*5.3 - 1, 3, 2.1, 0.5, A.seedFine);
  let v = lerp(A.high, A.low, mare) * (A.fineLo + A.fineHi * fine);
  if (A.flash) v += Math.max(0, fbm(x*17, y*17, 2, 2.3, 0.5, A.flash.seed) - 0.60) * A.flash.amp;
  rgb = (v, v, v) × A.tone
  ```
  Default `A_MOON = { seedMare: 5, seedFine: 61, high: 190, low: 96, fineLo: 0.86,
  fineHi: 0.28, tone: [1, 0.98, 0.94], flash: null }` reproduces today's expression
  **with identical float evaluation order** (the `flash` branch adds nothing, the
  tone branch multiplies by 1/0.98/0.94 — today's exact constants). `export function
  makeMoonAlbedo(N)` becomes `makeBodyAlbedo(N, A_MOON)` — same export, same pixels.
  (Verification: task 3's AC compares the wrapper's output against a frozen copy of
  the pre-task function body, pixel-wise.)
- **Per-region caching in `buildWorld`:**
  `const alb = region.albedo
      ? (App.albTex = App.albTex || {})[region.id] || (App.albTex[region.id] = makeBodyAlbedo(512, region.albedo))
      : tex.moonAlbedo;`
  then `terrain.uniforms.uAlbedoTex.value = alb;` (main.js:195) — value mutation only;
  the uniform wrapper is never replaced (uniform-wrapper rule, ARCHITECTURE §Terrain).
  Moon regions keep literally today's texture object.
- **Terrain GLSL base colour:** the hardcoded `vec3 base = vec3(0.148, 0.129, 0.104);`
  (terrain.js:394) becomes `uBaseCol * 1.0`, uniform `uBaseCol` **declared in
  `buildMaterial()`'s literal** (rings snapshot the wrapper map once —
  ARCHITECTURE §Terrain "the rule that bites"); default value = the same
  (0.148, 0.129, 0.104). `buildWorld` sets
  `terrain.uniforms.uBaseCol.value.set(...)` from `region.albedo ?
  [0.148,0.129,0.104].map((v,i) => v * region.albedo.tone[i]) : default` — i.e. the
  Jovian worlds tint the shader base by their albedo tone; Moon regions write the
  unmodified default. (Albedo texture + base tint compose as today.)
- **Dust:** `uAlbedo` (dust.js:69) and the anomalous tint constant
  (`vec3(0.36,0.52,0.60)`, dust.js:104) become constructor opts (§3.3) with defaults
  = today's values; `uAlbedo` is a uniform on Dust's own material (value mutation is
  legal — Dust is rebuilt per world anyway).

**Initial Jovian palettes** (tuning tasks may refine; roles fixed):
- CHOS: `albedo { seedMare 41, seedFine 83, high 198, low 176, fineLo 0.90,
  fineHi 0.20, tone [1.0, 1.0, 1.03], flash null }` — pale, cool, low contrast.
- CONAMARA: `albedo { seedMare 127, seedFine 139, high 128, low 74, fineLo 0.80,
  fineHi 0.44, tone [1.06, 0.92, 0.82], flash { seed 97, amp 85 } }` — dark
  reddish-brown with bright impact-flash speckle.
  `dust {albedo [0.10, 0.078, 0.06], glow [0.62, 0.5, 0.3]}` (warm anomalous grains).

### 3.6 Menu — four cards

`renderRegionCards()` (main.js:249-264) loops `REGIONS` — **no JS logic change**; a
4th card appears automatically with its save-derived status line. Work here is CSS:
`#regionCards`/`.region-card` layout in `src/ui/styles.css` reflows from a 2-up row to
a clean 2×2 grid at 1280×800 (and 1×4 on narrow widths) without touching card
semantics. The two new cards: `#region-ganymede` ("THE CHOS PLAIN" / "GANYMEDE ·
CHOS PLAIN"), `#region-callisto` ("CONAMARA" / "CALLISTO · DARK FLOOR"). `showMenu`'s
`tagline`/`brief` per selected region already work off region fields (§3.8 carries
`tagline`/`brief`).

### 3.7 Saves & settings

Nothing structural: `saveKey` `'farside.ganymede.v1'` / `'farside.callisto.v1'`
(new slots, no migration); `settings.region` carries the id; `Save.read/write/clear(r)`
and `regionCardStatus()` are already region-generic. `tools/bake-diff.cjs` stays
Anaximenes-only (frozen reference); **each Jovian world's determinism rides its own
in-page two-bake check** (G28 pattern → G38/G39). Anomaly ids remain coordinate-derived
per region (same `buildAnomalies` seed stream per region — the CHOS/CONAMARA seeds
below are new to their bundles; the Moon bundles' seeds are untouched).

### 3.8 THE CHOS PLAIN — world data (`src/game/regions.js`, additive)

id `ganymede` · name `THE CHOS PLAIN` · subtitle `GANYMEDE · CHOS PLAIN` · tagline
*The Plain That Rings* · saveKey `farside.ganymede.v1` · g 1.428 · playableR 432.
`brief` (menu): the survey order that planted this site is older than the manifest it
was filed under, and the plain itself is the whole story: broad, pale, ringing faintly
under the noise floor.

**Terrain P (initial — task 5 tunes the numbers; roles fixed):**
```js
P_CHOS = {
  bowl:    { depth: 20, floorR: 110, wallR: 420 },      // shallow wide plain bowl
  rim:     { r: 500, w: 80, amp: 40,
             breachBase: 0.55, breachAmp: 0.65, breachSeed: 71,
             ridgeScale: 0.0060, ridgeSeed: 37,
             terraceAmp: 3, terraceFreq: 0.09, terraceSeed: 5 },  // low broken rim
  fall:    { amp: 55 },
  farRidge:{ amp: 150, bias: 0.30, seed: 9, scale: 0.00212 },
  massif:  { on: true, r: 230, amp: 14, ridgeAmp: 4, seed: 73, scale: 0.008 },
                                                            // the RISE — low broad dome
  rille:   { on: false },
  craters: [                                               // sparse (~50% of Anax density)
    [104, 24, 48, 0.30, 0.145, 9],
    [ 36,  8, 20, 0.40, 0.175, 23],
    [ 12,  2.2,  7, 0.42, 0.19, 47]
  ],
  keepClean: [[60, 260, 130], [-180, 150, 145], [200, -140, 145], [0, 0, 150]]
}
```
Tuning targets (task 5): plain reads broad and flat (no wall that reads as a
crater rim); the rise crest +10…+18 m over the floor with ≤10° slopes; spawn pad
flat ≤2 m over 30 m; ≤20° approaches within 60 m of every landmark; the far edge
(`edge`) a genuine 350+ m drive across open plain; determinism two-bake strict.

**Landmarks (keys fixed, coords may move):** `home` (60, 260) 'SLED' · `rise` (0, 0)
'RISE' · `postA` (−180, 150) 'POST A' · `postB` (200, −140) 'POST B' ·
`edge` (−330, −250) 'EDGE' (all < playableR). Spawn initial { 52, 268, heading 2.0 }.
`sunAz0` 10.22 (dimmest point of the altitude crawl; §3.2).

**Props:** `station: 'none'`; `pylons: [[150, 180], [-120, 60]]`; `pipes: []`,
`bigPipe: null`; `posts: [postA, postB]` — **reusing LS's `buildPost`** (Authority
hardware is standard across the system — a continuity beat, zero new builders);
no `hub`.

**Content** (hold-E, Phase-2 shape): postA (`radius 12`, `key/unlocks 'postA'`) and
postB (`radius 12`, `key/unlocks 'postB'`), prompt 'HOLD E — RECOVER POST RECORD'.

**Anomalies:** `seed 0x7C1D2`; `pipes: null` (the plain holds no lattice — the plain
*is* the drum); `scatter { count: 24, kinds: [soil, breccia, ilmenite, agglutinate,
pyroclast, meteoritic, frost], rMin: 40 }` (sparser than the Moon worlds);
`specials: [ { at: 'rise', dx: 0, dz: 0, type: 'drum', depth: 2.2, special: 'ring',
unlocks: 'ring', deep: true } ]` — shallowest drill in the game; the drumhead is the
whole rise.

**Transmit:** `{ sample: 'ring', unlocks: ['gm-arrival'] }`.

**Campaign** (objective DSL exactly as Phase 1 — no new kinds):

| id | tag | name | objectives | brief (beats) |
|---|---|---|---|---|
| `gm-dark` | MISSION 01 | THE DARK PLAIN | `{deploy, event, array-deployed} · {drive, distance, home, >, 120} · {scan, event, scan-done}` | The sun never climbs; shadows turn instead of shortening. The sweep comes back wrong in a way that takes a minute to name: **no returns** — one floor, one faint tone under the noise, the whole plain answering as a single membrane. |
| `gm-first` | MISSION 02 | THE FIRST ENTRY | `{reach, distance, postA, <, 26} · {recover, event, station-interact, special:'postA', unlocks:'postA', unlock:'gm-posta'} · {find3, count, sample, count:3}` | Post A is the site's first eye, planted before the site was on any chart. Recover the record; three subsurface returns. *The plain will answer every time. That is the part to keep in your head.* |
| `gm-ring` | MISSION 03 | THE RING | `{reach, distance, postB, <, 26} · {recover, event, station-interact, special:'postB', unlocks:'postB', unlock:'gm-postb'} · {ring, event, extract, special:'ring', unlocks:'ring', unlock:'gm-ring'}` | Post B keeps the older record; the rise keeps something under it. The tone is centered on the rise — shallow, enormous, whole. Cut the shallowest core of your career. *The floor here is not ground. It is the head.* |
| `gm-drive` | MISSION 04 | THE LONG DRIVE | `{edge, distance, edge, <, 26} · {find3, count, sample, count:3}` | The signature moment: headlight against a midday that never gets bright to the far edge of the plain, Jove the size of the whole sky off the horizon. *Nothing here will be in a hurry. Three returns on the way out — the plain keeps answers.* |
| `gm-arrival` | MISSION 05 | THE ARRIVAL | `{home, distance, home, <, 26} · {transmit, event, transmit}` | Post B's record ends with a timestamp. Bring the sample home. *The timestamp is going to be yours.* |

→ ending card **THE ARRIVAL** (tag `SITE CHOS`):
*The uplink closed forty seconds ago. The record's clock starts at your touchdown —
T+0.0, to the tenth of a second. Not day 612. Not the first site. Yours. Two hundred
and thirteen sun-days the count sat still; then the shadow of a descent cleared the
rim, and this plain started counting again. It is counting something. The record does
not say what. The record does not need to — the count does not stop for a question.*
+ free survey.

**Codex (6, ids `gm-*`, two `start`):**
- `gm-brief` DOSSIER 'SITE CHOS' (start) — the site is not on any chart you were given;
  the survey order under it — *Operation Hollow, Annex E* — is eleven years older than
  the manifest, and it says: *the plain of Chos. Listen. Log. Do not dig.*
- `gm-memo` AUTHORITY 'SURVEY DIRECTIVE 4-E' (start) — recovered from the post cache:
  set the geophones where the plain allows; listen; do not dig; if the returns suggest
  structure, increase sampling cadence and await instruction. The last instruction
  received was day 612, 04:00: four seconds of carrier, no payload.
- `gm-posta` STATION LOG 'CHOS POST A · SOL 612' — at T+0.0 of a descent clearing the
  rim, the count resumed. *I did not send a descent. Nobody on the manifest did. I am
  logging who did.*
- `gm-postb` STATION LOG 'CHOS POST B · SOL 612 · INCOMPLETE' — the count ran here too,
  same period to the tenth; the plain rings under the wheels; *the plain does not need
  the pipes. The plain is the head. —*
- `gm-ring` FIELD NOTE 'THE HEAD' — the extracted field: 4 Gyr lining as floor, four
  hundred metres across, ringing without damping. *It is not lining pipes. It is the
  drum. The pipes at Anaximenes are the packaging. The drum is everywhere.*
- `gm-arrival` ENDING 'THE ARRIVAL' — the ending card text above.

### 3.9 CONAMARA — world data (`src/game/regions.js`, additive) + one new prop builder

id `callisto` · name `CONAMARA` · subtitle `CALLISTO · DARK FLOOR` · tagline *The
Breakout Field* · saveKey `farside.callisto.v1` · g 1.236 · playableR 432.
`brief` (menu): the most heavily cratered ground in the system — four billion years of
impacts, no wind, no erasure — and the newest things on it are glass pipes coming up
out of the floor in clusters. The sweep shows what is under the clusters: the same
lattice as Anaximenes, under the whole dark floor.

**Terrain P (initial — task 6 tunes; roles fixed):**
```js
P_CONAMARA = {
  bowl:    { depth: 18, floorR: 160, wallR: 460 },      // broad flat dark floor
  rim:     { r: 500, w: 90, amp: 58,
             breachBase: 0.30, breachAmp: 1.0, breachSeed: 101,
             ridgeScale: 0.0058, ridgeSeed: 41,
             terraceAmp: 4, terraceFreq: 0.10, terraceSeed: 31 },  // low eroded rim
  fall:    { amp: 62 },
  farRidge:{ amp: 170, bias: 0.30, seed: 13, scale: 0.00212 },
  massif:  { on: false },
  rille:   { on: false },
  craters: [                                             // dense + deep (1.4–1.5× Anax)
    [104, 28, 56, 0.62, 0.17, 11],
    [ 36, 10, 26, 0.78, 0.21, 29],
    [ 12, 2.8, 8, 0.80, 0.22, 53]
  ],
  keepClean: [[240, 220, 130], [0, 0, 150], [-230, 150, 145], [210, -190, 145]]
}
```
Tuning targets (task 6): floor reads **ancient and pocked** (craters everywhere, incl.
under the lattice aprons outside the clean zones); field apron flat enough for
breakout props (no crater bowls under them — keepClean); rim reads as low eroded
shoulder, not a wall; ≤20° approaches; night drive from hub across the floor to the
field must stay within the gate steering budget (screenshots); determinism two-bake
strict.

**Landmarks (keys fixed):** `home` (240, 220) 'SLED' · `field` (0, 0) 'FIELD' ·
`postB` (−230, 150) 'POST B' · `hub` (210, −190) 'HUB'. Spawn initial { 232, 228,
heading 2.6 }. `sunAz0` 6.18 → first sunset ≈ 15 game-min (§3.2): L01–L02 in fading
light, L03 into night, DUSK's night objective after it.

**Props:** `station: 'none'`; `pylons: [[120, 120], [-100, -80], [60, 260]]`;
`pipes: []`; `bigPipe: null`; `posts: [postB]` (reused `buildPost`);
`hub: [210, -190]` (reused `buildHub`); **new: `breakouts: [[x, z, scale], …]`**
driving the new builder (3 clusters: one central in the field apron at scale ~1.6,
two satellite at ~1.0/1.2 — initial positions inside `keepClean[0]`'s field zone;
data + builder only, no new mechanics beyond collider + idle).

**`buildBreakout(x, z, s)`** in `src/world/props.js` (task 6): glass pipes bursting
from a crater floor — 3–5 curved glass tubes (CylinderGeometry arcs, the Anaximenes
`buildPipeNode` glass material, emissive-less — the world is dark, the pipes read by
contrast + headlight sheen), a rubble fan (deformed icosahedra, the `buildBoulders`
deform pattern), bright rim-spatter decal-free (brighten nearby via a flat
CircleGeometry "flash patch" material), faint dielectric tip-glow (small emissive cap,
slow 2-s flicker in `props.update`). Collider entries (the `props.resolve` pattern) so
the rover cannot drive through a pipe cluster. Anaximenes/LS bundles have no
`breakouts` → builder never called there.

**Content:** postB (`radius 12`, `key/unlocks 'postB'`) and hub
(`radius 14`, `key/unlocks 'hub'`), prompt 'HOLD E — RECOVER POST RECORD' /
'…MASTER RECORD' (LS prompts verbatim — same hardware).

**Anomalies:** `seed 0x6B4C1`; `pipes: { anchor: 'field', rings: 4 }` — **the hex
lattice under the breakout field leads the world** (GPR shows it dense from L01's
sweep); `scatter { count: 34, kinds: [soil, breccia, ilmenite, agglutinate, pyroclast,
meteoritic, flash], rMin: 40 }`;
`specials: [
  { at: 'field', dx: 2, dz: 3,  type: 'shard', depth: 0.9, special: 'shard' },
  { at: 'postB', dx: 9, dz: -6, type: 'tap',   depth: 2.6, special: 'tap' } ]`
(shallowest near-surface core in the game: 0.9 m).

**Transmit:** `{ sample: 'shard', unlocks: ['call-event'] }`.

**Campaign** (objective DSL exactly as Phase 1):

| id | tag | name | objectives | brief (beats) |
|---|---|---|---|---|
| `call-dark` | MISSION 01 | THE DARK FLOOR | `{deploy, event, array-deployed} · {drive, distance, home, >, 120} · {scan, event, scan-done}` | The sun is a star here, and it rises. The sweep comes back **full**: every square metre of the floor is structure — coherent, hexagonal, *older than the craters around it*. The newest things on this floor are breaking through it. |
| `call-field` | MISSION 02 | THE FIELD | `{reach, distance, field, <, 26} · {find3, count, sample, count:3} · {shard, event, extract, special:'shard', unlock:'call-field'}` | At the centre of the floor the glass comes up in clusters — pipes that did not stop at the floor. The sweep shows the lattice continuous beneath the whole dark floor. Drive in, dig the through-cores, and take one whole shard out. |
| `call-tap` | MISSION 03 | THE DEAD TAP | `{reach, distance, postB, <, 26} · {recover, event, station-interact, special:'postB', unlocks:'postB', unlock:'call-postb'} · {tap, event, extract, special:'tap'}` | The post's geophone line was cut between it and the hub. Recover the record; take the tap itself. The sun is going down and the rim has not cleared the light yet. |
| `call-dusk` | MISSION 04 | DUSK | `{reach, distance, hub, <, 30} · {record, event, station-interact, special:'hub', unlocks:'hub', unlock:'call-hub'} · {night, distance, field, <, 26} · …` — see note | The master record is in the hub, buried under its own dead feed. Recover it. Then the last objective: **drive to the field in the dark** — first night in the game; the charge meter is a second sun you have to budget. |
| `call-event` | MISSION 05 | THE EVENT | `{home, distance, home, <, 26} · {transmit, event, transmit}` | The record's timestamp is going to be the hardest number you have ever seen. Bring the shard home and transmit. |

Note — `call-dusk` objectives (three, exact shapes):
`{reach, distance, hub, <, 30} · {record, event, station-interact, special:'hub',
unlocks:'hub', unlock:'call-hub'} · {night, distance, field, <, 26, minH: null} with
text 'Reach the field in the dark'`. The night-gate works off the existing sun state:
no new DSL — the distance objective completes when the rover is within 26 m of `field`;
the *night* condition is delivered by pacing (it is night by the time L04 is open —
§3.2 timeline) and the brief promises it. (If task 6 finds the pacing does not
guarantee darkness, the gate-free fix is moving `sunAz0`/`rate` so L04's window is in
the dark band — data only.)

→ ending card **THE EVENT** (tag `CONAMARA`):
*The uplink closed forty seconds ago. Every record you have brought back from this
system starts at a touchdown — and this one starts at yours: T+0.0, to the tenth of a
second. It was never a signal, and it is not counting down. A count is a promise:
somebody set the counter, and somebody is waiting for it to finish. You are not the
surveyor. You are the event.*
+ free survey.

**Codex (6, ids `call-*`, two `start`):**
- `call-brief` DOSSIER 'SITE CONAMARA' (start) — the site predates the manifest by a
  decade; the file is two paragraphs; the second is: *the floor of Conamara is the
  oldest ground the Authority owns. It was catalogued before it was surveyed. It is
  not there to be understood.*
- `call-memo` AUTHORITY 'SURVEY DIRECTIVE 4-F' (start) — the oldest directive in the
  family: set the array; listen; do not dig; *the floor is a recorder, not a resource
  — a rule never rescinded.*
- `call-field` FIELD NOTE 'THE BREAKOUTS' — a shard out of the field: **the dielectric
  constant matches the Anaximenes pipe glass to four decimals. Same glass. Two
  systems.** The lattice runs deeper than the crater it sits in — older than the
  crater.
- `call-postb` STATION LOG 'CONAMARA POST B · SOL 612 · INCOMPLETE' — the count resumed
  at T+0.0 of a descent clearing the rim — *there is no descent log for this site.
  There is no descent log for any of them. I am logging the absence.*
- `call-hub` FIELD NOTE 'THE MASTER RECORD' — timestamped count, unbroken since the
  burst, every entry carrying its own clock; the resume stamps line up with
  touchdowns, not with transmissions. *We never transmitted to this floor.*
- `call-event` ENDING 'THE EVENT' — the ending card text above.

**New SAMPLES** — additive in `src/game/lore.js` `SAMPLES` (exact shape, task 6):
```js
frost: { name: 'PALE FROST', rare: false, value: 1,
  desc: 'Ice frost in a pale highland soil. The plain is older than its cold.' },
ring:  { name: 'RESONANT LINING FIELD', rare: true, value: 8,
  desc: 'A 400-metre field of lining as floor. No pipes. It rings under every wheel that crosses it.', unlock: 'gm-ring' },
flash: { name: 'IMPACT FLASH', rare: false, value: 2,
  desc: 'Bright fresh-impact mineral on a four-billion-year-old floor. The newest thing here is also the youngest.' },
shard: { name: 'GLASS SHARD', rare: true, value: 8,
  desc: 'Fulgurite torn from a breakout. Dielectric matches Anaximenes pipe glass to four decimals. Same glass. Two systems.', unlock: 'call-field' },
tap:   { name: 'LISTENING TAP', rare: true, value: 5,
  desc: 'A geophone with a clean-cut lead. The last thing it heard was a count starting at a touchdown.', unlock: 'call-postb' }
```
(`frost`/`flash` are generic scatter kinds added to the CHOS/CONAMARA `kinds` arrays;
`ring`/`shard`/`tap` are specials. No Moon key is modified — `pipe`, `lining`, `drum`,
`cable`, `core` and the six Moon generics stay byte-identical.)

### 3.10 Gate plan — `tools/gate.cjs` (task 7)

Existing G1–G28 run **first, unchanged** (default region remains Anaximenes; the two
Moon campaigns/swap/round-trips all rest on it). Appended (target 40 checks; +~15–20 min
runtime):

- **G29** menu shows four region cards (`#region-anaximenes`, `#region-longshadow`,
  `#region-ganymede`, `#region-callisto`), each with a status line (all four
  `NO SURVEY — READY FOR DESCENT` on a clean profile).
- **G30** select THE CHOS PLAIN → `#regionload` sheet → menu: `FARSIDE.region.id ===
  'ganymede'`; height sanity (rise-crest sample − plain-floor sample in +8…+25 m);
  low-sun sanity (`sky.sunDir.y < 0.12` at spawn); `sky.group` in scene, `sky` is a
  fresh instance (`window.FARSIDE.sky` identity ≠ pre-swap — the boot's).
- **G31** Chos L01 playable: BEGIN DESCENT → card (`#cardGo`) → deploy (T) → drive
  120 m (W, steering budget) → scan (G) → `missionId === 'gm-first'`.
- **G32** `farside.ganymede.v1` written with `missionId === 'gm-first'` (the 1.4 s
  advance timer wipes `objDone` — capture bookkeeping at the mutation instant,
  gate gotcha #4).
- **G33** reload → RESUME SURVEY (selection persisted via `farside.set`) → resumed
  into Chos L02 (`gm-first`), `payloadTaken === false`.
- **G34** select CONAMARA → world swapped: `region.id === 'callisto'`;
  `rover.g === 1.236` (Jove-sky sanity via `FARSIDE.sky.earthGlow === undefined &&
  FARSIDE.sky.jove` presence — task 7 may simplify); `farside.ganymede.v1` blob
  intact (missionId still `gm-first`).
- **G35** Callisto L01 playable: T → 120 m → G → `missionId === 'call-field'`.
- **G36** `farside.callisto.v1` written with `missionId === 'call-field'`.
- **G37** reload → RESUME SURVEY → Callisto L02, `payloadTaken === false`.
- **G38** CHOS bake determinism: two in-page `bakeTerrain` runs of
  `FARSIDE.region.terrain` (injected module script, G28 pattern) → 1000 strict samples
  equal.
- **G39** CONAMARA bake determinism, same pattern.
- **G40** select ANAXIMENES: world back (`landmarks.station.x === −236`);
  `farside.anaximenes.v3` still holds the free-survey blob from the opening
  round-trip; `farside.longshadow.v1` intact from the earlier LS section.

Full L02–L05 of both worlds verified **by hand** (gate-helper driver runs on a clean
profile — the Phase-2 `ls05` pattern), with signature-moment screenshots to
`spec/evidence/phase-3/`: Chos (dim-midday headlight drive across the plain, the rise
drumhead at deploy, THE ARRIVAL card) and Conamara (breakout field under fading light,
the first true night with Jove up, THE EVENT card).

### 3.11 Docs sync (`docs/ARCHITECTURE.md`, task 7)

- §Terrain "The bake": the paragraph "`bakeTerrain()` is a generator… **It takes no
  parameters** — one fixed world, from module constants. There is no seed…" is stale
  since Phase 2 and must read: parameter bundle `P`, per-region, `P_ANAXIMENES`
  frozen-reference guarded by `tools/bake-diff.cjs`, Jovian worlds' determinism via
  in-page two-bake gate checks (G38/G39).
- §Terrain "Uniforms — the rule that bites": add `uBaseCol` to the
  must-declare-in-`buildMaterial()`-literal rule.
- §Content: save keys are per-region (`r.saveKey`; Anaximenes `v3`, Long Shadow
  `v1`, and the two new `v1` slots); the "only thing that can force a reset is the
  KEY string in save.js" wording is updated to per-region keys.
- The WORLD-swap rebuild list (main.js comments + ARCHITECTURE frame-order area):
  **Sky joins it** (dispose pmrem/envRT/group; `Engine`, `Audio`, `Input`, `HUD`,
  `tex`, settings stay boot-singletons).
- `project.md` (the as-built companion, if still maintained for this repo) gets the
  same Sky/buildWorld/region-field notes.

## 4. Contract / interface with the rest of the system

- **Inputs:** Phase 2's region record shape extended (§3.1 — additions only; Moon
  records unchanged); Phase 1's objective DSL verbatim; existing world-module
  constructors gained one optional-params site each (Sky cfg, Dust opts, Rover opts);
  `fbm/ridged/vnoise/hash2i/sstep/lerp/clamp/makeRNG` from `core/rng.js`.
- **Outputs:** two playable foreign worlds (4 regions total); new save slots
  `farside.ganymede.v1` / `farside.callisto.v1`; five new `SAMPLES` keys; menu DOM
  `#region-ganymede` / `#region-callisto`; `window.FARSIDE.sky` world-owned.
- **Public interfaces:**
  - `regions.js`: `REGIONS: Region[]` (extended shape §3.1; `P_CHOS`, `P_CONAMARA`
    exported for the in-page determinism checks).
  - `sky.js`: `Sky(renderer, scene, textures, quality, cfg)`; `Sky.dispose()` covers
    planet/sun/star/galaxy geometries + pmrem + envRT; exports `SKY_MOON`.
  - `textures.js`: `makeBodyAlbedo(N, A)`, `makeMoonAlbedo(N)` (wrapper, same pixels),
    `makeJoveTextures(W, H)`; `A_MOON` exported.
  - `terrain.js`: new `uBaseCol` uniform (default = today's base vec); `MOON_G`
    unchanged.
  - `rover.js`: `Rover(terrain, scene, opts { g })`; `dust.js`:
    `Dust(scene, terrain, sunDirRef, max, opts { g, albedo, glow })`.
  - `props.js`: `buildBreakout(x, z, s)` (wired from `region.props.breakouts`).
  - `main.js`: `App.sunRate`, `App.albTex`; `buildWorld` constructs + returns `sky`;
    `sunAltitude(az, S)`.
- **Invariants (constitution):** no runtime assets (Jove is procedural); CPU/GPU
  heightfield contract untouched (no bake math changes — P bundles only); fixed
  520/596 m crossfade + 95 m detail fade untouched; worldgen deterministic
  (new per-region seeds); one world in memory at a time (Sky included); uniform
  wrapper rule (mutate `.value` only); Anaximenes byte-identity (bake-diff).

## 5. Task breakdown (Tier 3 — the atomized work)

Dependency order; full verification gate (syntax + bake-diff + browser gate) after
**each** task's changes land; the gate grows only in task 7. Each becomes a
`spec/phases/phase-3-task-NN-*.md`.

| # | Task | difficulty | Blocked by | Status |
|---|------|-----------|------------|--------|
| 1 | Sun-cycle params + gravity wiring: `sunAltitude(az, S)` + `App.sunRate` (main.js), `Rover` `g` opts (rover.js), `Dust` `g` opts (dust.js), `buildWorld` pass-through; Moon defaults bit-exact; gate 28/28 unchanged | easy | – | done (09-04, `5d31768`) |
| 2 | Sky regional: `Sky(…, cfg)` (earth path verbatim under `SKY_MOON`), `makeJoveTextures`, companion dots, sun-angle/scale/star-seed params, ENV IBL per cfg, Sky into `buildWorld` + `selectRegion` teardown, Game-ctx sky, boot-site rewire | hard | 1 | done (09-04, `2b62a3a` + fix `7129a67`) |
| 3 | Ground albedo + dust palette: `makeBodyAlbedo(N, A)` + `A_MOON` wrapper (moon output pixel-identical, frozen-check), per-region `App.albTex` cache in `buildWorld`, `uBaseCol` uniform (declared in `buildMaterial` literal), `Dust` colour opts | hard | 2 | done (09-04, `5f1611a`) |
| 4 | Menu four-card layout: `#regionCards` CSS reflow (2×2 desktop / 1-col narrow), statuses render for all four from their saves | easy | 3 | done (09-04, `6415028`) |
| 5 | THE CHOS PLAIN world data: `P_CHOS` tuned to targets, landmarks/props/content/anoms/sky/sun/g/albedo/dust fields, `frost`+`ring` SAMPLES (lore.js additive), codex ×6, campaign L01–L05 + THE ARRIVAL, saveKey; full-campaign driver run + evidence | hard | 4 | done (09-05, driver 61/61 + gate 28/28) |
| 6 | CONAMARA world data + `buildBreakout` prop builder (props.js + wiring): `P_CONAMARA` tuned, landmarks/props/anoms (lattice + breakouts)/fields, `flash`+`shard`+`tap` SAMPLES, codex ×6, campaign L01–L05 + THE EVENT, saveKey; full-campaign driver run + evidence | hard | 5 | done (09-06, driver 71/71 + gate 28/28) |
| 7 | Gate G29–G40 (append-only), evidence to `spec/evidence/phase-3/`, Product Spec §7 row 3 + changelog, ARCHITECTURE.md sync (§3.11), HANDOFF rewrite for the next session | gate | 6 | done (09-06, gate 40/40, 29 min) |

## 6. Out of scope for this phase

- In-game region switching (menu only — "the save is the exit" still holds).
- Region unlocking / progression gating (all four always selectable; Phase-2 parked).
- Per-region rover/prop mechanics tuning: the g-band (0.76–1.11×) keeps existing
  suspension constants; a world whose feel *requires* a constant change goes to
  `spec/IDEAS.md` (Phase 3 guard) and its g moves toward 1.62.
- Any atmosphere/haze/fog or new lighting model — both foreign bodies are airless by
  choice; the dim-sun mood comes from `sunScale` + sun altitude, not scatter.
- New objective-DSL kinds — everything is existing event/distance/count +
  `unlocks`/`unlock` data; any new code path goes to `spec/IDEAS.md`.
- `playableR ≠ 432` (Phase-2 parked item stays parked; all P bundles satisfy the rim
  constraints at 432).
- Per-region audio (the synthesized ambience stays body-agnostic).
- A third foreign body / fifth region (the bundle proves out at two; more data later).
- Earth visibility from the Jovian worlds (Jove + Galilean dots only), and any change
  to the Starfield's galactic band geometry (seed-only variation).
- Save compression, `dispose()`-API generalization (Sky's extended dispose is the
  one targeted exception, done inline).

---
_On phase close: check every acceptance criterion, demo the slice (gate 40/40 from a
clean profile + both full campaigns by hand), then update the Product Spec changelog
and phase map, rewrite HANDOFF.md for the next session._
