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

- [ ] `P_LONGSHADOW` (starting from the §3.2 initial bundle): at rest, the rim
      crest near the spawn azimuth is +90…+150 m above the floor (in-page:
      `FARSIDE.terrain.heightAt` crest sample minus floor sample).
- [ ] Spawn pad flat: max height delta ≤ 2 m within 30 m of the spawn
      (heightAt sampling over a 13×13 grid, in-page).
- [ ] Approach slope ≤ ~20° within 60 m of each landmark (postA, postB, hub,
      breach) — checked by the same sampler; screenshots show a drivable
      approach (gate steering budget would reach them).
- [ ] `keepClean` covers spawn/posts/hub (no crater pits under landmarks —
      sampler confirms).
- [ ] `props.js` exports/registers `buildPost(x, z)` (geophone mast + battered
      instrument shelter, VANTAGE-3 design language) and `buildHub(x, z)`
      (larger dead array hub: mast ring + buried console); both add collider
      entries (rover cannot clip through — `props.resolve` pattern) and
      participate in `props.update` (dim status LEDs idle animation).
      `buildWorld` calls them from `region.props.posts` / `region.props.hub`
      (Anaximenes: both null/absent → not called).
- [ ] Long Shadow anomaly field deterministic: two `Game` instances (or two
      `buildAnomalies` runs) on the region produce identical ids/positions
      (in-page console check); exactly one `deep` core at hub (depth 9,
      `unlocks: 'hub'`, `special: 'core'`), one cable at postA (depth 2.4,
      `special: 'cable'`), no pipes.
- [ ] `sunAz0` set so the opening minutes are low-sun/night (headlight start) —
      screenshot at deploy shows a dark rim line; exact value recorded in the
      result notes.
- [ ] Manual play: select Long Shadow → deploy → rover drives to postA within
      the standard steering budget (screenshot at postA showing the post +
      hold-E prompt when close enough; prompt range 12 m).
- [ ] Anaximenes untouched: gate green (21/21); `node --check` green.

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

- [ ] Acceptance criteria all met
- [ ] Gate green (21/21)
- [ ] `node --check` green
- [ ] Tuning screenshots recorded in result notes
- [ ] Spec still matches code (no drift)

---
_Result / notes:_
