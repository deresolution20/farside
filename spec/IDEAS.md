# IDEAS — parking lot

Scope creep and new ideas land **here**, never in the current phase. An item moves
into a phase spec when it is scheduled; out-of-scope items stay until a phase claims
them.

## Phase 3 seeds (planets & content — deep-plan when the phase starts)

- **Planet = an extended data bundle**, not a new engine: gravity (1/6 g is a
  constant in `rover.js` today), sun-altitude cycle (regions differ only in `sunAz0`
  so far — only the azimuth start; altitude/period are fixed), sky palette + albedo
  parameters, plus the existing terrain-P/campaign bundle. 2+ worlds beyond
  Anaximenes & Long Shadow (Product Spec §4 scope).
- **Per-world content expansion:** the objective DSL and codex/mission shapes are
  already pure data — new worlds should add new *sample kinds* (the `lore.js`
  `SAMPLES` key scheme is reusable) and at most one or two prop builders each.
- **World concepts floated during Phase 2** (unrefined): a low-sun inner-plain basin
  where headlight driving is the whole mood; a large-pipe-breakout crater field (the
  Anaximenes pipe lattice is a per-region `anoms.pipes` option — a world that leads
  with it).

## Parked (explicitly out of scope when noted; revisit per phase)

- Region unlocking / progression gating (Phase 2 parked — both regions always
  selectable; `settings.region` is a convenience, not a gate).
- In-game region switching (Phase 2: menu-only; "the save is the exit").
- Per-region `playableR` and sun-altitude-cycle differences (Phase 2: both 432, only
  `sunAz0` varies).
- Per-region rover/prop mechanics beyond `buildPost`/`buildHub`.
- Per-region audio, save compression, extra save migrations (Phase 2: only the two
  field renames).
- A `dispose()` API for world teardown (GC + scene removal deemed sufficient in
  Phase 2; revisit if a swap ever leaks GPU memory).
- **Phase 3 guard** (Product Spec §8): if "planet" starts requiring a new code path,
  split the phase — data bundle in, code path out to here.
