# farside — project status

Working note: what is done, what comes next. The source of truth stays in
`spec/` (constitution, product-spec, phase specs); this file is the dashboard.
Updated after each task.

## Stack & ground rules

- Plain ES modules + vendored three.js r160, zero runtime assets, no build step.
- Syntax gate: `node --check` on every file in `src/`, `vendor/three/`, `server.js`, `tools/`.
- Serve: `node server.js 8080 --shots` (port 5173 is taken on this box).
- Behavior gate: headful Firefox (Mesa WebGL2) on `DISPLAY=:1` + `node tools/gate.cjs 2828 .shots`
  (exit 0 = PASS). Marionette is **raw length-prefixed JSON over plain TCP** (`N:<json>`),
  not WebSocket — `tools/gate.cjs` is the reference client. A driver that needs the port
  should send `WebDriver:NewSession` after the capabilities object before `Navigate`.
- **Firefox profile gotcha (hard-won):** launching `-no-remote -marionette -profile <dir>`
  with `<dir>` **absent** pops a "Profile Missing" dialog and hangs (no port, no profile
  dir created) until a human clicks it. Always `mkdir` the profile dir before launching
  (or wipe with `rm -rf <dir> && mkdir <dir>`). In-page tests that need clean storage can
  instead `localStorage.clear()` + reload.
**Never match `pkill`/`kill` patterns against 'firefox -no-remote' literally on a command
  line that also launches firefox** — the wrapper shell's own cmdline matches and kills
  itself mid-chain; use the bracket trick (`[f]irefox -no-remote`) and never share a line
  with the launch.
- Game gotchas: mission card blocks the world (`App.state===6`) until `#cardGo` (fresh start
  shows it 700 ms in); autosave writes every 20 s of game time in ALL states; save key
  `farside.anaximenes.v3`.
- One phase at a time; phase 0 was the walking skeleton. Parking lot: `spec/IDEAS.md`.

## Completed

### Phase 0 — walking skeleton (closed)
- Repo layout, constitution, product spec, spec-kit workflow, gate harness.

### Phase 1 — the Anaximenes campaign (closed)
- Full playable game: generated moon basin (clipmap terrain, rim, rille, craters, massif),
  rover (drive/suspension/arm/drill/relays), gameplay (5-mission campaign + free survey,
  codex, anomalies, station, drum, transmit, ending card), HUD/map/codex UI, settings,
  audio, autosave/resume. Gate green, spec updated.

### Phase 2 — regions & levels (closed, gate 28/28, 2026-09-02)
Two regions: **Anaximenes** (existing world, must stay byte-identical) +
**The Long Shadow** (new basin, 5-mission campaign). Design in
`spec/phases/phase-2-regions-levels.md`; task specs `phase-2-task-01..07`.

- [x] **Task 1 — parameterized bake** (DONE)
  - `src/world/bake.js` (NEW, 325 lines): pure math, zero render-engine imports.
    Exports `P_ANAXIMENES`, `baseHeight(x,z,P)`, `craterProfile`, `forEachCrater`,
    `buildMips`, `bakeTerrain(report, P)`.
  - `src/world/terrain.js`: 1232 → 959 lines; imports bake math, re-exports the public
    constants; Terrain class / GLSL / clipmap / dent / sunmask untouched. All importers unchanged.
  - `tools/bake-diff.cjs` (NEW): frozen pre-Phase-2 copy of the old math + strict
    element-wise compare vs `bakeTerrain(P_ANAXIMENES)` + determinism re-bake.
  - Verified: BAKE-DIFF PASS (macro/far/det bit-identical, deterministic), `node --check`
    green, **GATE PASS 21/21** (full campaign + save round-trip, fresh profile).

## Completed tasks (Phase 2, in order)

- [x] **Task 2 — region data + per-region saves** (DONE)
  - `src/game/regions.js` (NEW, 173 lines): `REGIONS = [ANAXIMENES, LONGSHADOW]`
    + `P_LONGSHADOW`. Anaximenes wraps the existing constants verbatim
    (`P_ANAXIMENES`, `HOME`/`STATION`/`MASSIF` + labels, `CONTENT`, `MISSIONS`,
    `CODEX`, `ENDING_CARD`) and carries the pylon/pipe/bigPipe positions moved
    out of `main.js`. Long Shadow stub: `P_LONGSHADOW` (§3.2 initial bundle),
    5 landmarks, post/hub props, `0x2EED5` anomaly field (no pipes, 30 scatter,
    core + cable), L01 `ls-arrival`, codex `ls-brief`/`ls-memo` (`start: true`),
    THE COUNT ending. Both §3.2 constraints hold (590 < 600; 432 ≤ 435).
  - `src/core/save.js` (44 lines): `Save.read(r)/write(r,data)/clear(r)` keyed on
    `r.saveKey`; no-region/1-arg calls fall back to legacy `farside.anaximenes.v3`
    (compat); settings moved to global `farside.set` with one-time copy from
    `farside.anaximenes.v3.set`; `settings.region` rides there.
  - `src/main.js`: boots from `REGIONS[0]` (`App.region`, `sunAz = sunAz0`),
    bakes `region.terrain`, pylon/pipe/bigPipe + spawn from the region, `region`
    in the `Game` ctx, region passed at every `Save.*` site; `menuBrief` renders
    `App.region.brief`.
  - Verified: `node --check` green; bake-diff PASS (regression); node-level data
    + save/migration checks (stubbed `three` loader); **GATE PASS 21/21**
    (Anaximenes save still in `farside.anaximenes.v3`, full campaign round-trips).
- [x] **Task 3 — region-aware Game** (`src/game/gameplay.js`) (DONE)
  - Zero static refs to `MISSIONS/CODEX/ENDING_CARD/CONTENT/LANDMARKS/HOME/PLAYABLE_R`
    (kept `SAMPLES` import + pass-through `export { STATION, MASSIF } from './content.js'`
    for `main.js:18`). `reset(freeRoam, region)` binds region (ctor passes `ctx.region`);
    codex seed `region.codex.filter(c => c.start)`; `missionId = region.missions[0].id`.
  - `buildAnomalies(anoms)` data-driven: single `makeRNG(seed)` stream, draw order
    pipes → scatter → specials; pipes `deep: true` around `landmarks[pipes.anchor]`;
    specials carry `type/depth/special/unlocks/deep` from region data.
  - `stationVisited` → `contentVisited` map (prompt loop iterates `region.content`,
    gates `!contentVisited[c.key]`); hold-E emits `emit('station-interact', key)`;
    `drumTaken` → `payloadTaken`; all deep checks via `a.deep`
    (`a.special === 'drum'` appears nowhere); extract sets `payloadTaken` iff
    `a.special === region.transmit.sample`; `emit('sample', a.special)`;
    `complete()` gained the `o.unlock` hook; transmit block iterates
    `region.transmit.unlocks`.
  - `save()` → `Save.write(this.region, blob)` and returns the blob — `advance()`'s
    save is now a real immediate write (latent discarded-blob bug fixed);
    `load()` migrates legacy `stationVisited`/`drumTaken` (the only two grep hits)
    and validates `missionId` against `region.missions`.
  - `tools/gate.cjs`: assertion field renames only (snap, extractDrum poll, hold-E
    poll, m05 extract + resume assertions).
  - Verified: `node --check` green; grep contract met (exactly the 2 documented
    `load()` migration reads); bake-diff PASS (regression); node-level old-vs-new
    import test (three-stub loader): Anaximenes field **bit-identical 98/98**
    (ids/positions/types/depths/specials/unlocks, draw order; drumhead stays `60,-40`),
    Long Shadow field deterministic (32, no pipes); save-slot keys + blob renames +
    all 5 load-migration paths exercised; **in-page check**: autosave clock frozen +
    key removed → m01 complete → `farside.anaximenes.v3` holds `missionId
    'listening'` in 1.7 s (advance's write is real); **GATE PASS 21/21** (fresh
    `/tmp/ffprof`): full campaign + save round-trip, `['60,-40',1]` present, resume =
    free survey + payloadTaken + 12 codex. No save-key bump.
- [x] **Task 4 — world swap + menu picker** (`main.js`, `index.html`, `styles.css`) (DONE)
  - `bakeAsync(report, P)` (boot's rAF/timer pump, now shared) + `buildWorld(region, baked,
    tex)` in the spec's exact build order (terrain → albedo → `new Props(scene, terrain,
    quality, region)` → `buildHome(region.landmarks.home)` → `buildStation` only when
    `region.props.station !== 'none'` → pylons/pipes/bigPipe → dust → rover → rig →
    `hud.bakeMap(terrain)` → `new Game({…, region})` + `game.tc`). Engine/Sky/Audio/HUD/
    Input build once at boot (shared, never rebuilt); textures shared.
  - `App.region` resolves at module load from `settings.region` (fallback `REGIONS[0]`);
    `App.sunAz` from it — reload boots into the persisted region.
  - `#regionCards` JS-generated from `REGIONS` (ids `region-<id>`, status strings per spec
    from `Save.read(r)`); `showMenu()` re-derives `.sel` + statuses. `selectRegion(r)`:
    menu-only + `swapping` guard; own `#regionload` bar/text (not `#boot`); teardown exactly
    `game.reset()` (markers/deployables) → `scene.remove` of terrain.group/props.group/
    dust.points/rover.root → rebuild + reassign + `sunAz = r.sunAz0` + `applySettings()`.
  - `Props(scene, terrain, quality, region)`: `playableR`/`homeRef` derive from region
    (constant fallbacks → Anaximenes boulder field identical); `buildHome(home)` param.
    `stepWorld` pad light → `App.region.landmarks.home`.
  - regions.js (L01 tweaks): `ls-echo` MISSION 02 stub so L01 advance saves
    `missionId: 'ls-echo'`; LS spawn heading 0.96 → **2.6093** (old heading drove into the
    sled/boulders, stalled at 21 m; new one verified node-side: 150 m clear line, max slope
    21°, in-fence).
  - CSS: `.region-card`/`.sel`/`#regionCards` in the menu section; `#regionload` px/unitless
    only (no `var(--s)`, no `.panel`); index.html `?v=5`.
  - Verified: `node --check` green; bake-diff PASS (regression); node bake smoke (both
    bundles complete, finite, distinct); **in-page swap test 24/24** (fresh storage):
    picker render; 5 swaps A→B→A×2+B — old terrain detached each time (no doubled world),
    settings persisted, re-baked Anax deterministic, LS vs ANAX heightAt(0,0) −45.48 vs
    27.21; LS L01 end-to-end (MISSION 01 card → T → 122.7 m driven with steering, no
    teleport → G → complete) → `farside.longshadow.v1` has `missionId: 'ls-echo'`, Anax
    slot canary byte-identical; LS codex seeded; MISSION 02 stub card (0 objectives);
    reload boots into longshadow with re-derived statuses; no console errors (pointer-lock
    `NotAllowedError` from synthetic input filtered — gate sessions emit it too).
    **GATE PASS 21/21** (fresh profile) — default Anaximenes flow unaffected by new menu DOM.
  - Known follow-up (RESOLVED in Task 5): HUD minimap header / mission name /
    SLED range were still pinned to Anaximenes.
- [x] **Task 5 — The Long Shadow world** (`regions.js`, `props.js`) (DONE)
  - **Tuned `P_LONGSHADOW`** (node-side tuning rig, then verified in-page):
    `bowl {20,70,330}`, `rim.amp 77.2` + `breachSeed 5123`, `terraceAmp 4`,
    craters `[[104,26,50],[36,9,24],[12,2.4,8]]`, `keepClean` 130–150 m aprons at
    all five landmarks. Measured: crest Δ **117.3 m** (target 90–150); spawn
    pad (13×13 / 2.5 m / 30 m span) **1.45 m** (target ≤2 m); approach slopes
    postA 10.5° / postB 9.8° / hub 17.4° / breach 15.0° (target ≤~20°); no crater
    pits under any landmark (worst 1.66 m). `sunAz0 0.20` → spawn in the rim
    shadow for sun az 0.14–1.00 (~2.5–4 min dark start, SOL 22.2° at deploy).
  - **Landmarks re-seated** (coords may move per spec): the stub coords sat on
    the 45–70° wall face. Final: home (241.7, 203.6), breach (276, 88, same stub
    ray az≈0.31), postA (116, −250), postB (−149, 188), hub (−255, −126);
    spawn (233.7, 196.6, heading 3.842). Anomaly field unchanged in shape:
    32 points, deterministic (two builds identical); core (−251,−120) d=9
    `hub`; cable (126,−258) d=2.4; 0 pipes.
  - **`buildPost(x,z)`** (leaning geophone tripod + battered shelter, scorch +
    debris, dim amber LED breathing at 0.18–0.42 opacity, collider r 1.7) and
    **`buildHub(x,z)`** (five-mast ring, one snapped, strung cable, buried
    console with dark screen, dim cyan LED, collider r 3.6) in `props.js`;
    coordinate-seeded RNG (`buildPipeNode` pattern), idle anim in `props.update`.
    Wired in `main.js` `buildWorld` (+2 lines, guarded — absent in Anaximenes).
  - **Region-aware HUD fixes** (allowed-list drift, documented in the task
    notes): HUD mission name/map header/SLED range+marker followed
    `game.region` instead of the imported `HOME` constant (read 139 m on LS);
    boot/menu taglines from a new per-region `tagline` field. Anaximenes
    visually unchanged.
  - **`tools/gate.cjs` transport fix** (4 lines): length prefix now bytes
    (`json.length` is UTF-16 — one non-ASCII character in an in-page script
    truncated the packet and wedged Marionette silently forever).
  - Verified: `node --check` green; bake-diff PASS; **ls05 verify driver 28/28**
    (fresh profile: terrain samplers, anomaly determinism + specials, 2×
    `bakeTerrain` identity, free-survey deploy + dusk rim shot `ls05_03`, 460 m
    real-steer drive to postA stopped at 4.5 m with the hold-E prompt visible
    `ls05_04`, swap back to Anaximenes clean); **GATE PASS 21/21** (fresh
    profile). The `ls05-verify.cjs` driver is intentionally uncommitted (spec:
    sampler inline, no new committed tool) — fold into the G22–G28 gate in Task 7.
- [x] **Task 6 — The Long Shadow campaign** (`regions.js`, `lore.js`) (DONE)
  - Missions L02–L05 (`ls-echo`, `ls-quiet`, `ls-silence`, `ls-count`), codex
    `ls-posta/ls-postb/ls-hub/ls-count`, ending card THE COUNT; additive SAMPLES
    `cable` + `core` (shared taxonomy, Anaximenes entries untouched).
- [x] **Task 7 — gate extension + phase close** (`tools/gate.cjs`) (DONE)
  - Existing 21 checks unchanged + G22 menu cards, G23 Long Shadow bake/samples,
    G24 L01 playthrough, G25 `farside.longshadow.v1` written, G26 reload → resume L02,
    G27 switch back to Anaximenes (v3 intact, station at -236), G28 bake determinism.
  - **GATE PASS 28/28** (fresh profile) closed the phase; product-spec changelog +
    HANDOFF updated.

### Phase 3 — planets & content (closed, gate 40/40, 2026-09-06)
Two foreign airless bodies added on top of the Phase-2 region record — a planet is a
**pure-data extension** (gravity, sun cycle, sky, albedo, dust colour), no new engine
code paths. The two Moon basins stay byte-identical (bake-diff + gate). Design in
`spec/phases/phase-3-planets-content.md`; task specs `phase-3-task-01..07`. Evidence in
`spec/evidence/phase-3/`.

- [x] **Task 1 — sun cycle + gravity wiring** (DONE) — per-region `sun`
  (`rate/base/amp/freq/phase` → `sunAltitude(az, S)` + `App.sunRate`) and `g`
  (`Rover`/`Dust` opts, default `MOON_G` = 1.62). Moon defaults bit-exact.
- [x] **Task 2 — world-owned Sky** (DONE) — `Sky(renderer, scene, textures,
  quality, cfg)`; the Earth path runs verbatim under `SKY_MOON`; `makeJoveTextures` +
  Galilean companion dots; Jove sky for the foreign worlds; `Sky.dispose()` joins the
  `selectRegion` teardown (built first in `buildWorld`, torn down last).
- [x] **Task 3 — ground albedo + dust palette** (DONE) — `makeBodyAlbedo(N, A)` +
  `makeMoonAlbedo` wrapper (pixel-identical Moon), per-region `App.albTex` memo,
  `uBaseCol` ground tint (declared in `buildMaterial()`'s literal, value-mutated only),
  `Dust` colour opts.
- [x] **Task 4 — four-card menu** (DONE) — `#regionCards` 2×2 desktop / 1-col narrow;
  all four statuses derive from their own saves.
- [x] **Task 5 — THE CHOS PLAIN** (`ganymede`, `farside.ganymede.v1`) (DONE) —
  `P_CHOS` (+ `g` 1.428, low never-setting sun, Jove ≈7°, pale ground); the 2.2 m `ring`
  drumhead under the rise (shallowest drill); `frost`+`ring` SAMPLES; 5-mission campaign
  → **THE ARRIVAL**. Full-campaign driver 61/61, gate 28/28.
- [x] **Task 6 — CONAMARA + `buildBreakout`** (`callisto`, `farside.callisto.v1`)
  (DONE) — `P_CONAMARA` (+ `g` 1.236, first real day/night: sun dips below 0°, the night
  objective); dark impact-flash pockmarked ground; the pipe **lattice** under the breakout
  field + the one new prop builder `buildBreakout(x,z,s)` (wired from
  `region.props.breakouts`); `flash`+`shard`+`tap` SAMPLES (`shard` dielectric-matched to
  Anaximenes); 5-mission campaign → **THE EVENT**. Full-campaign driver 71/71, gate 28/28.
- [x] **Task 7 — gate G29–G40, evidence, close** (DONE) — append-only gate
  extension (+324 lines, G1–G28 untouched; four cards; Chos + Conamara
  swap/L01/save/resume/g/sky sanity; two in-page double-bake determinism checks;
  back-to-Anax round-trip), evidence set (35 shots), ARCHITECTURE.md sync, Product
  Spec row 3 + changelog, HANDOFF rewrite.
  - **GATE PASS 40/40** (clean profile, 29 min) closed the phase; bake-diff +
    identity sweep green.

## Out of scope for Phase 2

In-game region switching, unlock/progression gating between regions, a third region,
new objective DSL kinds, new rover/prop mechanics, per-region audio, `playableR`
differences (both 432), sun-altitude cycle changes (only `sunAz0` differs).

## Gotchas (hard-won)

- Large file writes can fail JSON parsing → write chunk 1, append with
  `cat >> file <<'QUOTED_EOF'` (quoted delimiter), chunks < ~7–8 KB.
- Marionette Firefox: pre-create the profile dir
  (`rm -rf /tmp/ffprof && mkdir -p /tmp/ffprof`); without it the launch hangs (process
  alive, no port, no dir). Port 2828 opens in ~2 s.
- Gate must run **detached with file output** (`setsid nohup node tools/gate.cjs 2828 .shots > /tmp/gate.log 2>&1 < /dev/null &`
  + PID wait loop) — piped node stdout buffers and hides progress. Full gate ≈ 15 min.
  `setsid` + `< /dev/null` matter: the shell tool kills the whole process group on
  timeout, which took down a plain `nohup`-backgrounded Firefox mid-run.
- **Fresh `/tmp/ffprof` per gate run** (stale autosave flips the menu to RESUME SURVEY and
  breaks gate assumptions). Never touch the user's own Firefox process.
- `bake-diff.cjs`'s embedded frozen copy is the only place the old bake math survives —
  test infrastructure, DO NOT EDIT, do not "clean up" drift against it.
- Constitution: save-key bump only when the worldgen/save shape changes for an existing
  region — Anaximenes stays `v3` all through Phase 2.
