# HANDOFF — farside (browser rebase)

_Last session: 2026-09-06. This file supersedes memory from prior sessions._

## Where we are

**Phase 3 (planets & content) is CLOSED — gate 40/40, all 7 tasks done.** The world is
**FARSIDE — The Knocking at Anaximenes** with **four** selectable regions, each a
pure-data bundle in `src/game/regions.js` (`REGIONS`):

- **ANAXIMENES** — the original campaign (5 missions → ending COUNTING → free survey).
  Save `farside.anaximenes.v3` (never bumped). Worldgen provably byte-identical to
  pre-Phase-2 (`tools/bake-diff.cjs` frozen reference).
- **THE LONG SHADOW** — high-rim basin through a breach (THE LONG SHADOW → ECHO → THE
  QUIET ONE → SILENCE → THE COUNT). Save `farside.longshadow.v1`.
- **THE CHOS PLAIN** (`ganymede`, Phase 3 task 5) — Ganymede highland plain: low far sun
  that never sets (0.6°–6.5°), Jove ≈ 7° with three Galilean dots, pale ground
  (`uBaseCol` tint), `g = 1.428`; the 2.2 m resonant-lining **ring** under the rise
  (shallowest drill in the game). 5-mission campaign → ending **THE ARRIVAL** → free
  survey. Save `farside.ganymede.v1`.
- **CONAMARA** (`callisto`, Phase 3 task 6) — Callisto breakout field: the pipe **lattice**
  under a dark impact-flash-pocked floor, `g = 1.236`, the game's **first real night**
  (sun dips to −3.4°; charging stops; the L04 night objective is a plain distance — the
  darkness is pacing, not a check). `shard` glass dielectric-matched to Anaximenes pipe
  glass. 5-mission campaign → ending **THE EVENT** → free survey. Save `farside.callisto.v1`.

**The planet abstraction held (Phase 3 guard):** a world = region bundle (optional
`g`/`sun`/`sky`/`albedo`/`dust` fields, Moon-identical defaults read, never written onto
the Moon records) + prop builders. Only new engine-adjacent code in the whole phase:
`buildBreakout(x, z, s)` (task 6, pre-approved) and three recorded line-level deviations
— lens-ghost streak × `rover.sunVis` (main.js), a `dt ≥ 1e-3` integration floor in
`Rover.step` (a degenerate rAF tie made `compVel` 0/0 → NaN chassis), and a per-body flash
threshold `t` param in `textures.js` (defaults keep Moon output byte-identical). One
latent gameplay fix crossed the guard line and is **parked** (`spec/IDEAS.md`):
re-transmit of an already-stowed payload (a `gameplay.js` work item).

The verification gate plays the **full Anaximenes 5-mission campaign** end-to-end
(G1–G21), the **Long Shadow section** (G22–G28: menu cards, swap, L01, save round-trip,
back-to-Anax integrity, two-bake determinism), and the **Jovian section** (G29–G40:
four-card menu, Chos swap + L01 + `farside.ganymede.v1` round-trip, Conamara swap + L01 +
`farside.callisto.v1` round-trip, in-page two-bake determinism for both Jovian bundles —
G38/G39, the standing cover `bake-diff.cjs` cannot reach — and G40 back-to-Anaximenes
with both Moon blobs intact after four region visits). **40 checks, exit 0, clean
profile; close run measured 29 min** (budget ~45–50 min).

## Exact commands (verified this session)

```sh
# 1. syntax check (all green)
for f in $(find src vendor server.js tools -name '*.js' -o -name '*.cjs'); do node --check "$f" || exit 1; done

# 2. worldgen identity guard — ALWAYS after touching bake.js/regions.js terrain data:
#    frozen pre-Phase-2 copy vs bakeTerrain(P_ANAXIMENES), strict float equality + determinism
node tools/bake-diff.cjs

# 3. serve (port 5173 is taken by an UNRELATED user node process — never kill it)
node server.js 8080 --shots &          # --shots: POST /__shot?n=name writes .shots/name.png

# 4. gate (headful Firefox on the X11 display — Mesa WebGL2)
#    For a CLEAN run (no leftover localStorage): kill the test Firefox, wipe + re-create
#    the profile dir, then relaunch. The profile dir MUST exist or Firefox starts but hangs
#    without opening marionette.
rm -rf /tmp/opencode/ffprof && mkdir -p /tmp/opencode/ffprof
DISPLAY=:1 firefox -no-remote -marionette -profile /tmp/opencode/ffprof -width 1280 -height 800 &
node tools/gate.cjs 2828 .shots         # exit 0 = GATE PASS (40/40); ~29–50 min
```

Test browser: profile `/tmp/opencode/ffprof`, marionette port **2828**, display `:1`.
The user's own Firefox and the node process on **5173** are never killed. Background
launches that must outlive the shell: `nohup setsid … </dev/null & disown`.

Save keys (per-region slots; settings + selected region ride in global `farside.set`):
`farside.anaximenes.v3` (legacy default slot, never bumped) / `farside.longshadow.v1` /
`farside.ganymede.v1` / `farside.callisto.v1`. Bump a region's key only when *that
region's* anomaly generation/terrain changes; save-blob field renames are load-migrated
without a bump.

## Architecture as-built (the parts Phase 3 added/changed)

- **Region bundle fields (`src/game/regions.js`, §3.1)** — one module still knows every
  world. Existing fields (`id, name, subtitle, tagline, brief, saveKey, sunAz0, spawn,
  terrain: P, playableR, landmarks, content, props, anoms, transmit, missions, codex,
  ending`) plus **optional** Phase-3 fields, present only on the two Jovian records —
  the two Moon records carry none of them and are byte-identical to pre-phase:
  - `g` (m/s²; default `MOON_G` 1.62) → `Rover(terrain, scene, {g})` and
    `Dust(scene, terrain, sunDirRef, max, {g, albedo, glow})`.
  - `sun: { rate, base, amp, freq, phase }` → altitude =
    `sunAltitude(az, S) = S.base + sin(az*S.freq + S.phase) * S.amp`; `App.sunRate =
    r.sun ? r.sun.rate : 0.0060` (boot + `selectRegion`); Moon default
    `SUN_MOON {0.42, 0.12, 0.5, -0.4}` reproduces the old curve bit-exactly.
  - `sky: { planet: 'earth'|'jove', jove: {az, alt, angular, companions[[az,alt,angular,tint]]},
    sunAngular, sunScale, starSeed, ground[3] }` → `Sky(renderer, scene, tex, quality, cfg)`.
  - `albedo: { seedMare, seedFine, high, low, fineLo, fineHi, tone[3], flash: null|{seed,amp,t} }`
    → `makeBodyAlbedo(512, region.albedo)`, memoized on **`App.albTex[region.id]`**
    (swap-out and back never regenerates); Moon regions read the shared
    `tex.moonAlbedo` (object identity, `makeMoonAlbedo` wrapper is pixel-identical).
  - `dust: { albedo[3], glow[3] }` → Dust grain colours.
  - `props.breakouts: [[x, z, s], …]` → `Props.buildBreakout(x, z, s)` (Conamara only):
    3–5 bezier glass tubes, rubble fan, flash disc, flickering tip caps (`props.update`
    idle), one convex collider per cluster — the push-out band is real: the rover cannot
    park inside ~3.45 m of a cluster (that is what moved the central cluster (0,0)→
    (−14,10) in task 6, out of the shard's drill ring).
- **World-owned Sky (`src/world/sky.js`)** — `Sky` is constructed **first** inside
  `buildWorld` and returned with the world; the Moon path runs verbatim under
  `SKY_MOON`; the `'jove'` path draws the planet sphere at a **fixed 7400 m billboard in
  front of the camera** (seam-safe banded texture, soft terminator, spin — no
  libration) and **one companion `THREE.Points` cloud that shares the planet's
  billboard frame** — `update()` writes `camera + bearing·7400` for the planet *and*
  every moon each frame (a companion on its own frame parallaxes off Jove).
  `Sun.setSun(az, alt)` feeds `sky.sunDir`, which the whole world already reads
  (terrain `uSunDir` wrappers, IBL `uSun`, sun mask, charging, SOL PHASE).
- **`selectRegion` teardown list (menu-only swap, `main.js`)** — exactly what
  `buildWorld` owns, in reverse: `game.reset(false)` → `terrain.group` → `props.group` →
  `dust.points` → `rover.root` → **`sky.dispose()` + `sky.group` removal last** (built
  first, goes last). `Sky.dispose()` is idempotent (`_disposed`) and covers the planet/
  sun/star/galaxy geometries **and the pmrem + envRT** the IBL lives in. **Boot
  singletons are never rebuilt:** `Engine`, `Audio`, `Input`, `HUD` (its minimap goes
  through `hud.bakeMap(terrain, region.name)`), the `tex` module, settings, `App.albTex`.
  Dust must be rebuilt, not re-pointed (it wraps `terrain.uniforms.uSunDir` at
  construction); the uniform-wrapper rule still holds (`uBaseCol` is value-mutated in
  `buildWorld`, never replaced — it is declared in `buildMaterial()`'s literal, which
  the ring snapshot requires; see ARCHITECTURE §Terrain).
- **Determinism cover per bundle:** `bake-diff.cjs` (frozen, Anaximenes-only) +
  in-page two-bake gate checks — G28 (Long Shadow), G38 (Chos), G39 (Conamara):
  two fresh `bakeTerrain` runs of `REGIONS.find(…).terrain` inside a *main-realm module
  script*, 1000 strict random samples equal. A new regional bundle needs its own such
  check (or a node-side identity tool) — that is the accepted cover model, see §8 of
  the Product Spec.
- **Night pacing (CONAMARA, tuned task 6, data only):** `sunAz0 7.62`, `sun.rate
  0.00163` (base/amp 0.10/0.16) → night window ≈ 499…2697 s of game time (period 7709
  s), covering every measured hub→field arrival (864/966/1891/~2350 s) with ≥ 300 s
  margins; L01–L02 run in fading light, sunset lands mid-L03. CHOS: `sunAz0 10.22`,
  rate 0.0015, base/amp 0.06/0.05 → the disc never clears ~6.5° (the dim-midday mood).
- Debug handle: `window.FARSIDE = App` (`state` 0 BOOT / 1 MENU / 2 PLAY / 3 PAUSE /
  4 CODEX / 5 HELP / 6 CARD; plus now `sky`, `sunRate`, `albTex`; `game`, `region`,
  `input`, `tick(dt)`).

## Hard-won gotchas

Inherited (still true):

1. **`bake-diff.cjs` contains a FROZEN copy of the pre-Phase-2 bake math — never edit
   it.** Fix a mismatch by changing the *new* code, or bump the Anaximenes save key in
   the same commit. It covers Anaximenes only; the other bundles ride on G28/G38/G39.
2. **The rebuild list + uniform-wrapper rule** (see Architecture above). Never replace a
   uniform wrapper object — mutate `.value` only (rings + Dust share wrappers by
   reference).
3. **Objective bookkeeping is per-mission.** `advance()` resets `objDone`/`counts` on a
   1.4 s timer; capture bookkeeping at the mutation instant (immediately after the G
   tap / before the transition). Corollary from task 7: `scan-done` emits
   **synchronously on the G keydown**, and the rover coasts after a drive — poll
   `dHome > 122` *before* the scan tap if you want all three L01 objectives in the
   mutation-instant snap.
4. **Save-key discipline is per-region** (four slots now; legacy `farside.anaximenes.v3`
   is also the no-region default slot); renames load-migrate, worldgen changes bump.
5. **Identity sweep stays closed:** `REGOLITH`, `Anaxagoras`, `Beacon-9`, `MU-7`,
   `CASSIOPEIA`, `winchxyz` must not reappear (vendor/ excepted; lowercase "regolith"
   is the common noun and fine). New-region sweeps are defined in the phase specs.
6. **Ops:** profile dir must exist before launching the test Firefox; kill only the
   test one with `pkill -f "[o]pencode/ffprof"` (the bracket stops self-match — and
   **never put the literal path on the same command line as the `pkill`**: the wrapper
   shell's own cmdline matches the regex and kills itself mid-chain). Long runs need
   `nohup setsid … </dev/null & disown` + log polling.

New this phase:

7. **The Marionette `ExecuteScript` body cannot carry a page string delimited by the
   same quote it embeds.** A `"… r.id === ${JSON.stringify(id)} …"` line (JSON quotes
   inside a double-quoted array element) silently corrupts the page script — the error
   reports far from the actual parse break. Single-quote inner ids
   (`r.id === 'ganymede'`) or hardcode the `REGIONS[n]` index (the G28 pattern).
8. **Jove + companions share one 7400 m billboard frame.** If you move the planet
   distance, move the companion size basis (`7400 * angular`) too, or the dots scale
   wrong against the disc. `Sky.dispose()` must run before the group leaves the scene
   and frees pmrem/envRT — one world in memory at a time, Sky included.
9. **Never tune physics/OPS constants to chase run-to-run pacing.** Task 5/6 fixed
   pacing with data (sun curves) and driver budgeting (power gates, waits) — a dead-pack
   crawl can add 900 s to a campaign and *look* like a game bug. The CONAMARA night
   window is tuned to the measured arrival spread, not to one run.
10. **Driver-side drill/scan gotchas are gate-helper facts**: `driveTo` re-seats ≤ 8 m
    (the one allowed assist); drills need the settle-search re-seat on a ~2 m ring with
    the nose ON target; verify the anomaly's `taken`, not `bay.length`.

## Next steps

**Phase 3 is closed; there is no open phase.** The user has not named a Phase 4. Open
questions / candidates if one is started (all parked, none scheduled — see
`spec/IDEAS.md`):

1. **Re-transmit of an already-stowed payload** (parked this phase, guard line) —
   `transmit` fires only on a *fresh* bay drain at the sled, so stowing the shard early
   + recharging before the final drive soft-locks CONAMARA (same latent shape for Long
   Shadow). A `gameplay.js` work item; a fix would also need its own gate check
   (the drivers drill a fresh sample first, as a player would).
2. Other `spec/IDEAS.md` entries: per-region audio, save compression, extra save
   migrations, a general `dispose()` API for world teardown (Phase 3 extended `Sky`
   as the one targeted case).
3. If a new region is ever planned: bundle + missions + prop builder + a G38/G39-style
   in-page two-bake check + a §2-style §-numbered phase spec; the guard (data in, code
   path out) is constitution, not a phase-3 artifact.
4. Gate runtime: 29 min measured at close (budget 45–50). If a 41st+ check needs
   another full campaign, budget accordingly — or grow the Jovian section only.

## Open risks

- **Headful-only gate** (Mesa WebGL2 on `:1`); no CI story. Accepted for now.
- **`gameplay.js` remains the one file everything touches**; keep refactor slices small
  and gated. (The parked transmit fix is the next likely touch.)
- **Per-region worldgen × save-key surface is now four slots**; Anaximenes-only
  `bake-diff.cjs` + per-world in-page double-bake checks (G28/G38/G39) is the accepted
  cover (Product Spec §8). A fifth region makes a node-side identity tool per bundle
  worth writing.
- **The gate's Jovian section is L01-depth** (swap, one drive, save round-trip,
  determinism); L02–L05 of both foreign worlds are covered by the task 5/6 passing
  driver runs (uncommitted, `/tmp/opencode/` pattern) and their evidence shots, not by
  the standing gate. Phase 2 made the same call for Long Shadow and it has held.
