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
