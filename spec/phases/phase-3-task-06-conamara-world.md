# Task Spec (Tier 3) — Phase 3 / Task 6: CONAMARA World Data + `buildBreakout`

**Parent:** Phase 3 → Task 6 (`spec/phases/phase-3-planets-content.md` §3.9)
**Blocked by:** 5
**difficulty:** `hard`
**routes to:** local (Claude Code — local endpoints not yet wired)

## What to build

Add the complete `callisto` region record to `src/game/regions.js` — terrain
`P_CONAMARA` (tuned to the §3.9 targets), the foreign-body fields (dim far sun with
**the game's first real night**, Jove ≈ 4.4°, dark impact-flash ground), landmarks,
props (reused hub/post + **three breakout clusters via the new `buildBreakout`
builder**), the lattice-under-the-field anomaly config, specials (`shard` 0.9 m,
`tap` 2.6 m), transmit, the 5-mission campaign + THE EVENT ending + 6-entry codex —
and three **additive** `SAMPLES` keys (`flash` generic, `shard`, `tap`). Plus the
phase's only new prop builder: `buildBreakout(x, z, s)` in `props.js` (collider +
idle flicker), wired from `region.props.breakouts`. Then prove it: full-campaign
driver run on a clean profile including the **DUSK night objective** and a save
round-trip, with evidence screenshots.

## Files this task may touch

- `src/game/regions.js` (`P_CONAMARA` + `CONAMARA` record + append to `REGIONS`; the
  three prior records byte-identical)
- `src/world/props.js` (`buildBreakout(x, z, s)` + collider/idle registration;
  `buildPipeNode`'s glass material as reference)
- `src/main.js` (**only** the one `buildWorld` wiring line for
  `(region.props.breakouts || []).forEach(([x, z, s]) => props.buildBreakout(x, z, s));`)
- `src/game/lore.js` (`SAMPLES.flash`, `SAMPLES.shard`, `SAMPLES.tap` — additive,
  exact §3.9 text)
- `.shots/` (tuning screenshots — transient)
- `spec/evidence/phase-3/` (conamara driver-run screenshots — committed)
- `spec/phases/phase-3-task-06-conamara-world.md` (result notes only)

## Acceptance criteria (contract — MUST be testable)

- [ ] `REGIONS` gains exactly one record with `id: 'callisto'`,
      `saveKey: 'farside.callisto.v1'`, `name: 'CONAMARA'`,
      `subtitle: 'CALLISTO · DARK FLOOR'`, `tagline: 'The Breakout Field'`,
      `playableR: 432`, `g: 1.236`, §3.1 fields `sun`/`sky`/`albedo`/`dust`
      (§3.9/§3.5 initial bundles; tuning notes in the result section).
      `git diff` shows ANAXIMENES/LONGSHADOW/CHOS records byte-identical.
- [ ] **Terrain targets** (same in-page samplers as task 5):
      - floor reads ancient + pocked: dense craters incl. large fresh ones with
        bright flash speckle (screenshot `conamara_02_dark_floor`, compare against
        `chosing_02` — visibly different world);
      - field apron flat (≤ 2 m over 30 m) for the breakout props; keepClean covers
        spawn/field/postB/hub — no crater bowls under any landmark (pits ≤ ~1 m
        within 12 m);
      - rim reads as a low eroded shoulder (crest ≤ +70 m over floor at any
        azimuth), not a wall; approach slopes ≤ ~20° within 60 m of every landmark;
      - **night-drive check:** the hub → field drive (L04's last objective) is
        traversable inside the steering budget with the sun below the horizon
        (screenshot `conamara_08_night_drive` — Jove + stars up, headlights on,
        SOL PHASE negative);
      - rim constraints + `playableR 432` hold (record arithmetic).
- [ ] **First-night pacing:** with the bundled `sunAz0`/`sun.rate`, the L04
      `night` objective (reach `field` < 26 m) is demonstrably reachable **at
      night in a normal playthrough**: in-page timeline check — simulating the
      driver's L01–L04 durations (use the task 5 driver's measured per-mission
      times) shows `sky.sunDir.y < 0` for the entire hub → field approach segment
      (record the azimuth window + times in notes). If it does NOT hold, adjust
      `sunAz0`/`rate` (data only) until it does and record the final values.
- [ ] **`buildBreakout(x, z, s)`**: 3–5 curved glass tubes (the `buildPipeNode`
      glass material — same PBR params, no new material system), rubble fan
      (deformed icosahedra, `buildBoulders` pattern), a bright flat "flash patch"
      disc under the cluster (MeshBasicMaterial-ish brightness, no decal plumbing),
      faint dielectric tip-glow (small emissive caps + 2-second flicker in
      `props.update`'s idle loop — same registration pattern as post/hub LEDs).
      **Collider:** the rover cannot drive through a pipe cluster (in-page: nudge
      the rover root into a cluster via `FARSIDE.rover.pos` → `props.resolve`
      pushes it out; no NaNs, no tunneling at 8.4 m/s). `s` scales the cluster
      (0.8–1.8 range tested: no clipping through the flash disc, tubes stay above
      ground). Chos/Moon regions have no `breakouts` → builder never called there
      (in-page: `FARSIDE.props.group` child count unchanged across a Chos swap).
- [ ] **Anomaly field** deterministic: two in-page builds → identical;
      `pipes: { anchor: 'field', rings: 4 }` lattice present (in-page: anomaly
      list has ≥ 4×(1+…ring counts — record the actual count, all `type: 'pipe'`,
      `deep: true`, centred on `field`, within the lattice radii the generator
      uses); scatter 34 over 7 kinds incl. `flash`; specials: `shard` at
      `field`+(2, 3) `depth 0.9 special 'shard'`; `tap` at `postB`+(9, −6)
      `depth 2.6 special 'tap'`.
- [ ] **Full campaign driver run** (clean profile): select CONAMARA → BEGIN DESCENT
      → card → L01 T/120 m/G (sweep shows the dense lattice — screenshot
      `conamara_03_radar_dense`) → L02 reach field + 3 excavations in the lattice
      + **extract `shard` at 0.9 m** (shallowest near-surface core; verify bay
      gains `shard`) → L03 reach postB + hold-E record + extract `tap`
      (screenshot `conamara_05_tap`) → L04 reach hub + hold-E master record +
      **night drive to the field** (`conamara_08`) → L05 home + transmit →
      **ending card THE EVENT** (`conamara_09_ending`) → FREE SURVEY →
      `farside.callisto.v1` free-survey blob (`missionId: null`, 6 codex: 2 start +
      4 earned) → reload → RESUME SURVEY resumes free survey on CONAMARA.
      Also: after this run, `farside.ganymede.v1` still holds its free-survey blob
      from task 5's run on the SAME profile (cross-region save integrity — the
      G34 preview).
- [ ] **Lore contract:** `lore.js` `SAMPLES` diff additive only (`+flash`, `+shard`,
      `+tap`); no new DSL kinds; identity sweep closed
      (`grep -rn "REGOLITH\|Anaxagoras\|Beacon-9\|MU-7\|CASSIOPEIA\|winchxyz" src/`
      → zero hits).
- [ ] **Prior worlds still green:** GATE PASS (28/28) clean profile (all
      pre-existing checks, Chos included — the 28 rest on Moon data; Chos is
      verified by its own task-5 driver re-running clean: select CHOS → its save
      resumes free survey → a short free-survey drive, no console errors);
      `node --check` green; `node tools/bake-diff.cjs` exits 0.
- [ ] Two fresh in-page bakes of `P_CONAMARA` strictly equal (1000 macro samples —
      the G39 preview).

## Context the worker needs (and ONLY this)

- Why: the second foreign world, and the phase's one allowed new prop builder.
  CONAMARA leads with the lattice: the glass comes UP through the floor in
  breakout clusters over a 4-Gyr pocked dark floor, under a dim star-like sun that
  actually sets. The night drive (DUSK) is its signature moment — the first time in
  the game the player drives with no sun at all, Jove in the sky. Story beat
  (phase spec §3.9): the shard's dielectric matches Anaximenes' pipe glass to four
  decimals — same glass, two systems; the master record's count resumes at
  touchdowns, and the Authority never transmitted to this floor.
- Constraints (constitution + phase §6): region keys and P-bundle shape fixed;
  coordinates/numbers may move to hit targets; `playableR` 432 + rim constraints
  hard; the ONLY new mechanic allowed is `buildBreakout`'s collider + idle flicker
  (no new interaction — the breakouts are props; the lattice and the `shard`/`tap`
  are anomalies); night-gate via pacing + brief, NOT a new DSL kind (phase §3.9
  note); the L04 `night` objective is a plain distance objective (text carries the
  "in the dark" promise; pacing guarantees it); lore text canonical as §3.9 (voice
  polish allowed, beats fixed); the ending keeps "You are not the surveyor. You
  are the event." as its final line.
- May use: `buildPipeNode` (glass material + big-pipe variant) and `buildBoulders`
  (deform + collider registration) as references; the gate helpers
  (`tools/gate.cjs`) + task-5 driver for steering/drill timing; `heightAt` samplers;
  the `props.resolve` collider pattern; `.shots/`.
- Commit: one logical change (`feat: CONAMARA (Callisto) world + breakout builder
  + campaign`).

## Verification gate (run before merge)

- [ ] Acceptance criteria all met
- [ ] Full-campaign driver run PASS logged (check counts + screenshots listed,
      night window recorded)
- [ ] GATE PASS (28/28) clean profile + CHOS task-5 re-run clean
- [ ] `node --check` green; `node tools/bake-diff.cjs` exits 0
- [ ] Spec still matches code (no drift)

---
_Result / notes:_
- **`P_CONAMARA` tuning** (vs §3.9 initials; in-page samplers as task 5): bowl
  18/**330**/470 (floorR widened so the field apron is flat — max Δ 1.4 m over 30 m,
  pit ≤ 0.8 m within 12 m of every landmark); rim crest ≤ +68 m over local floor at
  every azimuth (target ≤ +70), approaches ≤ 18° within 60 m of all landmarks;
  keepClean covers spawn/field/postB/hub. Crater density 2846 (11.4× CHOS) —
  dense + poked, the 4-Gyr read.
- **`home`/`spawn` re-seated inward** (196,180)/(188,174): their 60 m approach
  annuli stayed on the flat floor (floorR 330) instead of spilling onto the wall
  ramp (~26°).
- **Central breakout cluster (0,0)→(−14,10)** (s 1.6): at (0,0) its 3.45 m push-out
  band swallowed the AC-pinned shard drill ring (shard = field+(2,3), 3.6 m from
  (0,0)) and the rover could never settle there. (−14,10) keeps it the
  field-centre cluster with 8+ m clearance. Cluster positions are free data; the
  shard/tap specials stay contract-pinned.
- **Sun curve — final `rate 0.00163`, `sunAz0 7.62`** (initials 0.0025/6.18; base
  0.10/amp 0.16 unchanged → −3.4°…14.9°, the §3.2 acceptance band). Night window
  **≈500 s … ≈2697 s** (period 7709 s). Tuning history, each driven by a measured
  playthrough: initials → [901, 2335]; run-7 field arrival ~2350 s (15 s past that
  sunrise) → az0 5.5/rate 0.0022 → [1334, 2961]; the fast power-managed run
  (p6c) reached the field at 864 s (sun up) → rate 0.004/az0 6.43 → [500, 1397];
  the p6d run (flat pack crawled the postB→sled return, 918 s) arrived at 1891 s
  → final [500, 2696] covers **every** measured hub→field arrival (864 / 966 /
  1891 / ~2350 s) with ≥ 300 s of margin on both sides, L01–L02 (0–~300 s) still
  in dim light (alt +5.8° at t=0), sunset mid-L03 ("into night"). PAC check (the
  71/71 run): hub 785 s … campaign end 1053 s inside the window, alt −0.044…−0.026;
  live night drive min `sky.sunDir.y` −0.0394 over 366 samples, SOL PHASE
  negative, Jove + companion dots up.
- **Lore contract held:** `lore.js` diff is **+`flash` +`shard` +`tap` only**
  (additive keys, exact §3.9 text); campaign objectives are the Phase-1 DSL
  verbatim (distance/event + `unlocks`/`unlock`/`special`/`hint` — the L04
  `night` objective is a plain `< 26 m` distance; the darkness is pacing, per the
  §3.9 note); identity sweep (`REGOLITH|Anaxagoras|Beacon-9|MU-7|CASSIOPEIA|winchxyz`
  over src/) zero hits. The three prior region records are **byte-identical**
  (`git diff src/game/regions.js` is +238/−1, the one deletion being the `REGIONS`
  export line gaining `, CONAMARA`).
- **`buildBreakout(x,z,s)`** (props.js, +93 lines): 3–5 bezier glass tubes from
  `buildPipeNode`'s glass material, rubble fan (`buildBoulders` pattern), bright
  flash disc, emissive tip caps flickering in `props.update`'s idle loop, one
  convex collider per cluster (`props.resolve` kind `'breakout'`). Proven live in
  the 71/71 run: shove-to-centre → pushed out to the 3.45 m band (d 3.45–4.45,
  extra push from rubble colliders), no NaNs; nose-on 8.4 m/s, 2.5 s of real
  frames — closest approach 4.38 m, no tunneling; scales 0.8–1.8 all cross the
  flash disc and reach ≥ 1.2 s above ground; the two scale-probe clusters are
  removed again before the campaign (world keeps exactly the 3 region clusters);
  Chos/Moon worlds never call it (no `breakouts` key → `group` child count
  unchanged across a CHOS swap).
- **Anomaly field deterministic:** two in-page builds byte-identical; 36 lattice
  pipes (all `deep: true`, field-centred rings — the recorded ring counts),
  scatter 69 placed over 7 kinds incl. `flash` (config 34; rest slope-rejected in
  the mirror pass); `shard` field+(2,3) 0.9 m / `tap` postB+(9,−6) 2.6 m both
  extracted by real drills in the campaign (shard = `shard:rare` in the bay, tap
  = `tap:rare`).
- **Full-campaign driver run (throwaway driver, NOT committed): CONAMARA6 VERIFY
  PASS (71/71)** from the profile that already held the CHOS free-survey blob;
  log `/tmp/opencode/conamara6-p6g.log` (transient), 1176 s total. Per-mission
  (this run): L01 62 s / L02 451 s / L03 262 s / L04 191 s / L05+ending 187 s —
  field arrival ≈ 966 s, deep in the dark window. Ending card THE EVENT, "You are
  not the surveyor. You are the event."; free-survey blob `farside.callisto.v1`
  (`missionId null`, 6 codex: 2 start + 4 earned); reload → RESUME SURVEY on
  CONAMARA; **`farside.ganymede.v1` byte-identical to the CHOS baseline after the
  whole campaign** (cross-region integrity, the G34 preview).
- Evidence (the passing run, `spec/evidence/phase-3/`): `conamara_01_menu`,
  `02_dark_floor`, `03_radar_dense`, `04_field`, `04b_shard_drill`,
  `05a_postB_prompt`, `05_tap`, `06_jove`, `07_hub`, `08_night_drive`,
  `09_ending`, `10_resumed` (12 shots; 06/08/09 are the night-state signature —
  Jove + companions + stars up, headlight beam, SOL PHASE negative). The CHOS
  shots were re-taken by the task-5 driver re-run in the same session.
- **Deviations from the file allowlist (recorded per the phase guard):**
  1. `src/world/textures.js` — per-body flash threshold `t` (default `?? 0.60`,
     Moon/ANAX/LS output unchanged; CONAMARA uses `t: 0.70`, `amp: 70` so the
     flash speckle reads on the dark floor).
  2. `src/main.js` — the one wiring line **plus one line**: the lens-ghost sun
     streak is scaled by `rover.sunVis` (a streak cannot exist when the disc is
     below the local horizon; `rover.sunVis` already exists, initialized 1).
  3. `src/game/rover.js` — `step()` substep floor: `h = Math.max(Math.min(dt,
     0.05), 1e-3)`. A degenerate `dt = 0` (rAF timestamp tie) made
     `compVel = (comp − w.comp)/dt` → 0/0 → NaN chassis position / −1600 m/s fall
     (observed live mid-run). Zero effect at any non-zero dt — a numeric guard,
     not a mechanic.
- **Driver-side hardenings** (throwaway driver only — the campaign still plays
  with real steering/drills/recharges throughout): flat-pack safety-net at the L04
  start (re-seat to the sled via the driver's standard `placeAt` helper when the
  pack is < 50 % — the "turn around and recharge" decision is preserved, only a
  dead-battery 426 m transit is compressed; not needed in the 71/71 run), an
  arrival-aware night-drive power guard (≤ 30 m from the field → coast it in as a
  valid "second sun" budgeting outcome; otherwise fail), `ensurePower` capped at
  99 (the shuttle loop breaks at 99.9 and the single-snap exactly-100 check was
  flake-prone), and a computed L01 sweep spot (a 78 m scan disc only ever catches
  a facing lattice arc — the in-page grid search pins a spot with ≥ 3 pipes inside
  its disc, verified before the sweep).
- **Parked in `spec/IDEAS.md`** (found here, no engine change in Phase 3):
  "Transmit of an already-stowed payload" — the `transmit` event fires only on a
  fresh bay drain, so stowing the shard early + recharging at the sled before the
  final drive soft-locks the campaign (drivers drill a fresh sample first, as a
  player would; same latent shape for Long Shadow).
- `node --check` green on every file; `node tools/bake-diff.cjs` PASS (Anaximenes
  frozen parity + strict two-bake determinism); two fresh in-page bakes of
  `P_CONAMARA` strictly equal (1000 macro samples). **GATE PASS (28/28), exit 0**
  from a clean profile after the change; **CHOS task-5 driver re-run
  61/61 PASS** (1793 s; L01 37 s / L02 283 s / L03 337 s / L04 844 s / L05+ending
  274 s) — CHOS log `/tmp/opencode/chos5-p6c.log` (transient).
