# Task Spec (Tier 3) — Phase 2 / Task 5: Long Shadow World Data

**Parent:** Phase 2 → Task 5 (`spec/phases/phase-2-regions-levels.md` §3.2, §3.6)
**Blocked by:** 4
**difficulty:** `hard`
**routes to:** local (Claude Code — local endpoints not yet wired)

## What to build

Tune `P_LONGSHADOW` to the terrain targets (high wall, shadowed pocked floor,
drivable landmarks) and finish the world data (anomaly field, `sunAz0`). Add
the two new prop builders `buildPost(x, z)` and `buildHub(x, z)` to `props.js`
(colliders + idle animation) and wire them from `region.props.posts` /
`region.props.hub` in `buildWorld`.

## Files this task may touch

- `src/game/regions.js` (Long Shadow bundle tuning only)
- `src/world/props.js` (`buildPost`, `buildHub` + builder registry)
- `.shots/` (tuning screenshots — transient)
- `spec/phases/phase-2-task-05-longshadow-world.md` (result notes only)

## Acceptance criteria (contract — MUST be testable)

- [x] `P_LONGSHADOW` (starting from the §3.2 initial bundle): at rest, the rim
      crest near the spawn azimuth is +90…+150 m above the floor (in-page:
      `FARSIDE.terrain.heightAt` crest sample minus floor sample).
- [x] Spawn pad flat: max height delta ≤ 2 m within 30 m of the spawn
      (heightAt sampling over a 13×13 grid, in-page).
- [x] Approach slope ≤ ~20° within 60 m of each landmark (postA, postB, hub,
      breach) — checked by the same sampler; screenshots show a drivable
      approach (gate steering budget would reach them).
- [x] `keepClean` covers spawn/posts/hub (no crater pits under landmarks —
      sampler confirms).
- [x] `props.js` exports/registers `buildPost(x, z)` (geophone mast + battered
      instrument shelter, VANTAGE-3 design language) and `buildHub(x, z)`
      (larger dead array hub: mast ring + buried console); both add collider
      entries (rover cannot clip through — `props.resolve` pattern) and
      participate in `props.update` (dim status LEDs idle animation).
      `buildWorld` calls them from `region.props.posts` / `region.props.hub`
      (Anaximenes: both null/absent → not called).
- [x] Long Shadow anomaly field deterministic: two `Game` instances (or two
      `buildAnomalies` runs) on the region produce identical ids/positions
      (in-page console check); exactly one `deep` core at hub (depth 9,
      `unlocks: 'hub'`, `special: 'core'`), one cable at postA (depth 2.4,
      `special: 'cable'`), no pipes.
- [x] `sunAz0` set so the opening minutes are low-sun/night (headlight start) —
      screenshot at deploy shows a dark rim line; exact value recorded in the
      result notes.
- [x] Manual play: select Long Shadow → deploy → rover drives to postA within
      the standard steering budget (screenshot at postA showing the post +
      hold-E prompt when close enough; prompt range 12 m).
- [x] Anaximenes untouched: gate green (21/21); `node --check` green.

## Context the worker needs (and ONLY this)

- Why: the second world must read differently (wall-high rim, shadowed, heavily
  cratered floor, one quiet site) while staying drivable — this is the tuning
  task.
- Constraints: landmark **keys** and the P-bundle shape are fixed; coordinates
  and P numbers may move to hit the targets, but every change stays inside
  `regions.js` (data) and `props.js` (builders); `playableR` stays 432
  (constraint `432 ≤ rim.r − rim.w/2 − 20` and `rim.r + rim.w < 600` must hold);
  no new prop mechanics beyond colliders + idle animation.
- May use: `buildPylon`/`buildStation` as design references; the `props.resolve`
  collider pattern; `heightAt` + `--shots` screenshots for tuning; the slope
  sampler may be a small inline in-page script (not a new committed tool).
- Commit: one logical change (`feat: Long Shadow world data + post/hub props`).

## Verification gate (run before merge)

- [x] Acceptance criteria all met
- [x] Gate green (21/21)
- [x] `node --check` green
- [x] Tuning screenshots recorded in result notes
- [x] Spec still matches code (no drift)

---
_Result / notes:_

**Result: PASS — all ACs verified in-page (`tools/ls05-verify.cjs`, 28/28, fresh
profile) + full GATE 21/21. One logical commit.**

Tuned bundle (final values in `regions.js`): `bowl {20, 70, 330}` (spec initial
40/70/440 put the spawn annulus on the bowl's steep shoulder),
`rim.amp 77.2` + `breachSeed 5123` (spec 150/79 gave crest Δ≈208 m and a breach
crest 45 m too high; amp auto-scaled to hit the 90–150 m target),
`terraceAmp 4` (spec 12's 24 m terrace band swamped any flat pad), craters
`[[104,26,50,…],[36,9,24,…],[12,2.4,8,…]]`, `keepClean` radii 130–150 m at
home/postA/postB/hub/breach (spec 28–36 m left crater bowls under the sites).
`playableR 432` and rim constraints hold (432 ≤ rim.r−w/2−20 = 435; rim.r+rim.w
= 590 < 600).

Measured (in-page `heightAt`, LS world at rest):
- crest (r 460–560, az 0.40–1.00) 115.26 m vs floor −2.02 m → **Δ 117.3 m** ✓ 90–150
- spawn pad (13×13 grid, 2.5 m, 30 m span): max Δ **1.45 m** (r15 m circle: 1.02 m) ✓ ≤2 m
- slope within 30 m of spawn: 13.7°; pit within 12 m: 0.81 m
- 60 m approach slopes: **postA 10.5 / postB 9.8 / hub 17.4 / breach 15.0** ✓ ≤~20
- landmark pits (20 m span): 1.66 / 0.96 / 1.43 / 1.13 m ✓ no crater bowls (keepClean)
- anomaly field: 32 points, two builds byte-identical; core @ (−251,−120) d=9
  `unlocks:'hub'`; cable @ (126,−258) d=2.4; 0 pipes ✓
- extra: two fresh `bakeTerrain` runs identical (1000 macro samples) — G28 preview
- boulder field: spawn→inward 150 m line clear (min rock clearance 12.5 m, max
  line slope 17.7°), verified node-side against the exact `buildBoulders` RNG

`sunAz0 = 0.20` (altitude 22.0°): the spawn sits in the rim wall's shadow for
sun az 0.14–1.00 (macro-ray test, `sunVis`), so the first ~2.5–4 min are dark —
`ls05_03_dusk_rim` shows the dark rim crest, SOL PHASE 22.2°, lamps on.

**Play check:** free survey → T (array) → F (lamps) → real W/A/D steer 460 m to
postA in budget (no re-seat; final stop 4.5 m, prompt `HOLD E — RECOVER POST
RECORD` showing, `ls05_04_postA`). Anaximenes GATE **21/21** fresh profile;
`node --check` green; `bake-diff` PASS (Anax macro/far/det byte-identical).

Deviations (all small, all in service of the ACs):
- **Landmark coordinates moved** (spec allows: roles fixed, coords may move) — the
  stub coordinates (r 352–397) sat on the ~45–70° wall face and broke the ≤20°
  approach windows. Final: home (241.7, 203.6), breach (276, 88, same stub ray
  az≈0.31 through the low wall sector), postA (116, −250), postB (−149, 188),
  hub (−255, −126). Spawn re-seated to (233.7, 196.6, heading 3.842).
- **`main.js` +2 wiring lines** in `buildWorld` (the AC mandates wiring from
  `buildWorld`; the file allowlist omitted it).
- **Region-aware HUD/name fixes** in `hud.js` + `index.html` (outside allowlist,
  found by the screenshots): the HUD mission name ("ANAXIMENES" in free survey),
  the minimap header ("ANAXIMENES BASIN"), the SLED range readout + minimap SLED
  marker (all pinned to the imported `HOME` constant → read 139 m on the LS
  world) now follow `game.region`; boot/menu taglines come from a new
  `tagline` field per region. Anaximenes rendering is visually unchanged
  (its values equal the old constants).
- **`tools/gate.cjs` transport fix** (4 lines): the length prefix used
  `json.length` (UTF-16) — a non-ASCII character in an in-page script truncates
  the packet and wedges Marionette forever; now byte length. `ls05-verify.cjs`
  (the 28-check driver) is intentionally NOT committed — spec says the sampler
  should be inline, not a new committed tool; task 7 should fold these checks
  into the G22–G28 gate.
- Lore: `ls-brief` says the basin is "deeper and younger"; the tuned bowl is
  20 m (Anaximenes 36 m) because floor flatness won — exact wording to settle in
  task 6 ("young still-standing rim" carries the identity instead).
