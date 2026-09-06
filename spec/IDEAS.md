# IDEAS — parking lot

Scope creep and new ideas land **here**, never in the current phase. An item moves
into a phase spec when it is scheduled; out-of-scope items stay until a phase claims
them.

## Scheduled into `spec/phases/phase-3-planets-content.md` (2026-09-03)

The entire **Phase 3 seeds** section moved into the phase spec: planet = extended
data bundle (gravity / sun-altitude-cycle / sky palette / albedo as pure region data),
2+ worlds beyond Anaximenes & Long Shadow (**Ganymede — THE CHOS PLAIN** and
**Callisto — CONAMARA**; brainstorm decision: two foreign airless bodies, not a
Moon+foreign mix), per-world sample-kind expansion (5 new additive `SAMPLES` keys),
the two unrefined Phase-2 world concepts (low-sun headlight plain → CHOS;
pipe-breakout crater field → CONAMARA), and the parked **per-region
sun-altitude-cycle** item (claimed — `region.sun`). The per-region `playableR` item
remains parked (Phase 3 keeps all four at 432).

## Parked (explicitly out of scope when noted; revisit per phase)

- Region unlocking / progression gating (Phase 2 parked — all regions always
  selectable; `settings.region` is a convenience, not a gate). Still parked through
  Phase 3 (four cards, no gates).
- In-game region switching (Phase 2: menu-only; "the save is the exit"). Still parked
  through Phase 3.
- Per-region `playableR` (Phase 2/3: all four regions 432; every P bundle satisfies
  the rim constraints at 432 — documented per bundle in the Phase 3 spec).
- Per-region rover/prop mechanics: Phase 3 confirmed the band discipline —
  foreign g's stay 0.76–1.11× lunar so no suspension re-tuning; a world whose feel
  *requires* a constant change comes back here (Phase 3 guard) and its g moves
  toward 1.62 instead.
- **Atmosphere/haze worlds** (Phase 3 guard: both foreign bodies are airless by
  choice; the dim-sun mood comes from `sunScale` + sun altitude, not scatter. A
  world *with* atmosphere is a new lighting-model work item — not a data bundle).
- **A third foreign body / fifth region** (the bundle proves out at two foreign
  worlds + two Moon basins; more data later). A **mid-latitude Moon basin** (real
  day/night from latitude — the variant considered in brainstorm) is the leading
  candidate for a future home region.
- Jove companion-moon *proper motion* (Phase 3: static libration wobble, same as
  Earth's; moving companions are a sky.js flourish, not data).
- Per-region starfield galactic-band *geometry* (Phase 3: seed-only variation —
  band orientation stays shared; per-band tilt is a `_buildGalaxy` param if ever
  wanted).
- The **meta-narrative** of *who wrote the Jovian directives and why* (Phase 3
  lore deliberately shows only the directive family — Annex E/F, older than the
  manifest; answering it is a future story beat, not content padding).
- Per-region audio, save compression, extra save migrations.
- A general `dispose()` API for world teardown (Phase 3 extended `Sky.dispose()`
  as the one targeted case; revisit if a swap ever leaks GPU memory).
- **Transmit of an already-stowed payload** (found task 6, CONAMARA L05): the
  final-mission `transmit` event fires only on a *fresh* bay drain at the sled, and
  a drained bay stays drained — if the transmit sample was extracted early in the
  campaign and the player recharges at the sled in between (the Conamara power
  strategy), the last home arrival carries an empty bay and the campaign
  soft-locks ("bring the shard home" with a bay that can only be refilled by
  drilling on the way). Same latent shape for Long Shadow if the player recharges
  after the L04 hub-core extract. Phase 3 ships no engine change (the drivers
  drill a fresh sample before the final drive, as a player would); a fix — e.g.
  the sled re-transmits the stowed payload when the final mission is active — is
  a gameplay.js work item, not a data tweak.
- **Phase 3 guard** (Product Spec §8, active through the phase): if "planet" starts
  requiring a new code path, split the phase — data bundle in, code path out to
  here. Outcome logged in the Product Spec changelog at close.
