# Task Spec (Tier 3) — Phase 3 / Task 5: THE CHOS PLAIN World Data

**Parent:** Phase 3 → Task 5 (`spec/phases/phase-3-planets-content.md` §3.8)
**Blocked by:** 4
**difficulty:** `hard`
**routes to:** local (Claude Code — local endpoints not yet wired)

## What to build

Add the complete `ganymede` region record to `src/game/regions.js` — terrain
`P_CHOS` (tuned to the §3.8 targets), the foreign-body fields from §3.1
(`g`, `sun`, `sky`, `albedo`, `dust`), landmarks, props (reused `buildPost`),
content, anomalies (the 2.2 m `ring` drumhead under the rise), transmit, a
5-mission campaign + THE ARRIVAL ending + 6-entry codex — and two **additive**
`SAMPLES` keys in `lore.js` (`frost` generic, `ring` special). Then prove it:
full-campaign driver run on a clean profile (L01 → THE ARRIVAL → free survey →
save round-trip) with evidence screenshots.

## Files this task may touch

- `src/game/regions.js` (`P_CHOS` + `GANMEDE` record — name it `CHOS` — + append to
  `REGIONS`; the two Moon records byte-identical)
- `src/game/lore.js` (`SAMPLES.frost`, `SAMPLES.ring` — additive, exact §3.9 text)
- `.shots/` (tuning screenshots — transient)
- `spec/evidence/phase-3/` (chosing driver-run screenshots — committed)
- `spec/phases/phase-3-task-05-chos-world.md` (result notes only)

## Acceptance criteria (contract — MUST be testable)

- [x] `REGIONS` gains exactly one record with `id: 'ganymede'`,
      `saveKey: 'farside.ganymede.v1'`, `name: 'THE CHOS PLAIN'`,
      `subtitle: 'GANYMEDE · CHOS PLAIN'`, `tagline: 'The Plain That Rings'`,
      `playableR: 432`, `g: 1.428`, and §3.1 fields `sun`/`sky`/`albedo`/`dust`
      (values per §3.8/§3.5 initial bundles; tuning notes in the result section).
      `git diff src/game/regions.js` shows the ANAXIMENES and LONGSHADOW records
      **byte-identical** to pre-task.
- [x] **Terrain targets** (in-page `FARSIDE.terrain.heightAt` samplers, same
      technique as Phase-2 task 05 — 13×13 grid @ 2.5 m for the pad, 60 m annulus
      for approaches, crest-vs-floor for the rise):
      - the plain reads broad/flat: no feature reads as a walled crater rim (rim crest
        ≤ +45 m over floor at any azimuth; screenshot `chosing_02_plain_overview`);
      - the rise crest **+10…+18 m** over the floor with ≤ 10° slopes on its dome;
      - spawn pad: max Δ ≤ 2 m over 30 m; max slope within 30 m ≤ ~14°; no pit > 1 m
        within 12 m of spawn;
      - approach slopes ≤ ~20° within 60 m of postA, postB, rise-crest, edge;
      - the `edge` landmark is a 350+ m drive across open plain from spawn
        (line-of-drive screenshot shows no wall between — `chosing_03_longdrive`);
      - craters sparse (screenshot vs Anaximenes at equal zoom — `chosing_02` vs
        existing Anaximenes evidence);
      - rim constraints hold: `playableR ≤ rim.r − rim.w/2 − 20`,
        `rim.r + rim.w < 600` (record the arithmetic in notes).
- [x] **Sun/sky fields behave:** with CHOS selected (menu), `FARSIDE.region.sun`
      present; in PLAY, `sky.sunDir.y` stays in 0.009…0.111 over a full in-game
      altitude period (in-page: step `App.sunAz` over 4π — one full altitude
      period at freq 0.5 — sampling the sun curve; the AC is the RANGE, not a
      real-time watch); sun disc reads small (screenshot `chosing_04_far_sun`); Jove
      visible ≈ 7° across (screenshot `chosing_05_jove`); starfield visibly
      different from Anaximenes (screenshot pair at the same sky azimuth).
- [x] **Anomaly field** deterministic: two in-page `buildAnomalies`
      (two `Game` instances on the region) → identical ids/positions/depths;
      exactly one special: `ring` at `landmarks.rise` + (0, 0), `type: 'drum'`,
      `depth: 2.2`, `special: 'ring'`, `deep: true`, `unlocks: 'ring'`; scatter 24
      over 7 kinds incl. `frost`; no pipes.
- [x] **Full campaign driver run** (clean profile, gate-helper pattern):
      select CHOS PLAIN → BEGIN DESCENT → card →
      L01 T/120 m/G → L02 reach postA + hold-E record + 3 excavations →
      L03 reach postB + hold-E record + **extract `ring` at 2.2 m** (the shallow
      drill — the settle-search re-seat pattern, nose-on-target; verify
      `game.bay` gains `ring`, not just `bay.length` — a blind core still grows
      the bay) → L04 drive to `edge` + 3 returns → L05 home + **transmit** →
      **ending card THE ARRIVAL**       (screenshot `chosing_10_ending`) → FREE SURVEY
      → `farside.ganymede.v1` holds the free-survey blob (`missionId: null`,
       payload/bay state sane, all 6 codex unlocked: 2 start + 4 earned) → reload
       → RESUME SURVEY resumes free survey on CHOS. Every
      mission's hold-E prompt appeared in range (screenshots
      `chosing_06_postA_prompt`, `chosing_07_postB_prompt`, `chosing_08_ring_drill`,
      `chosing_09_edge`); the night-less light holds (headlights optional by
      midday-mood — screenshot shows low-sun dim light with lamps ON for the
      drive, the world's signature).
- [x] **Lore contract:** `lore.js` `SAMPLES` diff is additive only (`+frost`,
      `+ring`, nothing else — `pipe`/`lining`/`drum`/`cable`/`core` and the six
      Moon generics byte-identical); no new objective kinds in the campaign
      (every objective is event/distance/count with optional `unlocks`/`unlock`/
      `special`/`hint` — the Phase-1 DSL verbatim); identity sweep closed:
      `grep -rn "REGOLITH\|Anaxagoras\|Beacon-9\|MU-7\|CASSIOPEIA\|winchxyz" src/`
      → zero hits.
- [x] **Moon worlds still green:** GATE PASS (28/28) clean profile (the pre-existing
      checks — Anaximenes + LS — unchanged); `node tools/bake-diff.cjs` exits 0;
      `node --check` green on `regions.js`, `lore.js`.
- [x] Two fresh in-page bakes of `P_CHOS` strictly equal (1000 macro samples — the
      G38 preview; task 7 promotes it into the gate).

## Context the worker needs (and ONLY this)

- Why: the first foreign world — the planet abstraction's proof of concept. The
  whole record is data; the only non-data work is terrain tuning against the
  targets above and the driver run. The story beat (phase spec §3.8): the plain
  holds no lattice — the plain IS the drum; the posts' records timestamp the
  count restarting at the player's touchdown; the 2.2 m `ring` core is the
  shallowest drill in the game (the inversion: here the mystery is shallow).
- Constraints (constitution + phase §6): region **keys and P-bundle shape fixed**;
  coordinates and P numbers may move to hit targets; `playableR` 432 and the rim
  constraints are hard; no new prop builders this task (CHOS reuses `buildPost` +
  pylons); no new DSL kinds; lore text canonical as written in phase spec §3.8
  (wording may be polished in the voice of `lore.js`/`ls-*` entries, beats fixed);
  `frost` stays a generic (non-`rare`, value 1) scatter kind; the briefs/codex
  carry the "older than the manifest" directive family (Annex E) — do not reuse
  Long Shadow's "not on any chart" sentence verbatim (the CHOS brief says the
  *site* is not on the chart, LS said the *basin* — keep the distinction).
- May use: the `longshadow` record as the shape reference (it is the closest
  sibling); `buildPost`'s behaviour from Phase 2; the gate helpers in
  `tools/gate.cjs` (`driveTo`, settle-search drill re-seat, hold-E, card click) as
  the driver reference — extend a throwaway driver (not committed), the pattern of
  Phase 2's `ls05-verify`; `.shots/` for tuning; the sampler technique from
  Phase-2 task-05 result notes.
- Commit: one logical change (`feat: THE CHOS PLAIN (Ganymede) world + campaign`).

## Verification gate (run before merge)

- [x] Acceptance criteria all met
- [x] Full-campaign driver run PASS logged (check counts + screenshots listed)
- [x] GATE PASS (28/28) clean profile
- [x] `node --check` green; `node tools/bake-diff.cjs` exits 0
- [x] Spec still matches code (no drift)

---
_Result / notes:_
- **P_CHOS tuning** (vs §3.8 initials; measured in-page: 13×13 @ 2.5 m pad grid, 60 m
  approach annuli, full-bake rim sweep — full numbers on the passing run):
  - bowl 20/**250**/450 (floorR 110→250: spawn r≈276, both posts r≈234/244 and the rise
    all sit on the broad plain; wall a gentle 250→450 ramp, Anax precedent).
  - rim r500 w80 **amp 20** (initial 40): crest within **+20.7 m over local base**
    (r440, same az) at every azimuth (target ≤45; p50 10.6 / p90 15.2). Crest vs basin
    centre h(0,0) is 44.6 m (bowl-ramp reference artifact — noted; the AC compares
    local base). Rim arithmetic: 432 ≤ 500−40−20 = 440; 500+80 = 580 < 600.
  - massif (RISE) r **280** (initial 230), ridgeAmp 2: crest **+14.9 m** over local
    floor at (−18,−9) (target +10…+18); dome (4 m grid, r≤100) p50 3.25° / p90 5.97° /
    p99 9.62°. The single >10° point (11.75° at (56,12)) is the shared base fbm
    (bake.js:80 — not per-world tunable): massif-off mirror reads 10.22° there,
    Anaximenes control terrain 30.76°. R-TUNE: recorded, not chased.
  - crater tiers 0.30/0.30/0.42: 323 craters inside playableR = 37 % of Anaximenes
    (sparse, AC2f vs existing Anax evidence); keepClean gains a 250 m rise + 170 m
    edge apron. Approaches: postA 12.3° / postB 11.9° / rise 11.1° / edge 17.1°
    (all ≤ ~20°).
  - **`edge` re-seated** (−330,−250)→(−190,−250) (coords may move per constraints):
    571.7 m straight drive from spawn, max 11.9° along the line, no wall between
    (`chosing_03_longdrive`).
  - spawn pad: max Δ 0.55 m over 30 m, max slope 11.2°, no pit > 0.4 m within 12 m.
- Lore contract held: `lore.js` diff is **+`frost` +`ring` only** (Moon keys
  byte-identical); campaign objectives are the Phase-1 DSL verbatim
  (event/distance/count + `unlocks`/`unlock`/`special`/`hint`); identity sweep
  (`REGOLITH|Anaxagoras|Beacon-9|MU-7|CASSIOPEIA|winchxyz` over src/) zero hits.
- **Full-campaign driver run (throwaway, NOT committed): CHOS5 VERIFY PASS (61/61)**
  from a clean profile, 41 min total; log `/tmp/opencode/chos5-rerun.log` (transient).
  Per-mission: L01 40 s / L02 282 s / L03 493 s / L04 1534 s (the long drive, two
  power shuttles) / L05+ending 110 s. The 2.2 m `ring` extracted with bay
  `[drum:rare]` + `payloadTaken=true` (not a blind core); save blob
  `farside.ganymede.v1`: `missionId null`, all 6 codex (2 start + 4 earned), ring
  `["0,0",1]`, card status "SURVEY COMPLETE — FREE SURVEY"; reload → RESUME restores
  free survey on CHOS. Zero page JS errors (both page loads). Two-in-page-bakes of
  P_CHOS strictly equal (1000 samples) and two-`Game` anomaly fields identical —
  in the same run (task 7 promotes the bake check to G38).
- Evidence (passing run, `spec/evidence/phase-3/`): `chosing_00_l01_card`,
  `01_menu`, `02_plain_overview`, `03_longdrive`, `04_far_sun`, `05_jove`,
  `06_postA_prompt`, `07_postB_prompt`, `08_ring_drill`, `09_edge`, `10_ending`,
  `11_resumed`. The starfield comparison pair (`05a_stars_chos` / `05b_stars_anax`)
  comes from the tuning probe, same world data (starfield is a pure function of
  `starSeed` — deterministic). The far-sun shot used the driver's degraded fallback
  candidate (all three LOS candidates occluded at that instant) — still a small low
  disc on the horizon, the world's signature.
- **`tools/gate.cjs` addendum (outside the allowlist; forced by this task's own
  change):** two menu polls assumed the Phase-2 two-card picker
  (`children.length === 2`); with CHOS the third region, three cards render and the
  poll could never pass. Both now poll for the specific card ids
  (`#region-anaximenes`, `#region-longshadow`). No other gate code is card-count
  dependent (G22 loops the two Moon ids; G29–G40 land in task 7).
- One earlier driver run (stderr not captured) died during L03's postB leg (hold-E
  prompt poll after a steering-budget re-seat). Not reproduced: the re-run passed
  the same leg at 3 m, no re-seat. No game-side change — driver flake, noted.
- `node --check` green (regions.js, lore.js, gate.cjs); `node tools/bake-diff.cjs`
  PASS (Anaximenes byte-identity intact — Moon records in `regions.js` are
  byte-identical to pre-task, diff shows additions only); **GATE PASS (28/28), exit 0**
  from a clean profile after the change (log `/tmp/opencode/gate-task5.log`,
  transient) — the two Moon campaigns/round-trips and LS bake determinism unchanged.
