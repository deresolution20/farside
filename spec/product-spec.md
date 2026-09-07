# Product Spec (Tier 1) — FARSIDE ("The Knocking at Anaximenes")

> The ONE master spec. "What & why" from the user's POV — **not** how to build it.
> Written once, up front; updated at each phase close. This is the real PRD. There is only one.

## 1. Problem & why now
A fully playable, release-quality 3D lunar rover survey game that runs **in a browser tab**.
The player drives a six-wheel rover in 1/6 g through regolith that ruts, kicks dust and
charges by day, uncovering a quiet mystery — a nine-square-kilometre network of hollow
glass pipes under the basin floor, and a floor that knocks — told through discoveries, not
dialogue.

**2026-08-28 decision: rebased the project.** The original bespoke C++20/OpenGL 4.6 engine
was replaced by a browser codebase that already ships with exactly the art direction and
story tone this project wants. From now on the game is: plain ES modules + vendored
three.js r160 + a zero-dependency Node static server. No build step, no npm install, no
runtime assets.

Why this stack: the graphics, rover feel, HUD and story were already built and tuned to
this exact spec; the remaining work is *content and structure* (more missions, levels,
planets), and that work is where a data-driven browser codebase wins — it can be driven
headlessly (the gate), iterated instantly, and played anywhere a browser tab runs.

## 2. Target user & top jobs-to-be-done
- Primary user: the repo owner, playing in a browser tab on the target machine
  (RX 7900 XTX, Mesa WebGL2); later anyone with a WebGL2 browser.
- They need to: (1) drive a rover that *feels* like the Moon — 1/6 g, floaty momentum,
  dust that hangs in the air, ruts that persist; (2) complete a clear mission loop:
  survey, sample, restore comms, find out what's under the floor; (3) be visually stunned:
  black starfield, low Earth, hard shadows, headlight night driving; (4) finish a coherent
  story arc with a meaningful ending.

## 3. Success criteria (product-level, testable)
- [ ] A first-time player can play the full game (title → ending) with no docs beyond
      the README (controls + how to run).
- [ ] The gate (`tools/gate.cjs`) passes **28/28, exit 0**: full Anaximenes campaign from a
      clean profile (ending card, save round-tripped into free survey), plus the menu region
      picker, A→B→A region swap, Long Shadow L01 playable with its own save round-trip, and
      Long Shadow bake determinism.
- [ ] `node --check` green on all JS; the page loads fully offline.
- [ ] A full playthrough (5 missions + ending) takes 30–50 minutes.
- [ ] Every mission has its signature moment; the ending (transmit the record) answers
      the dossier's open question (what VANTAGE-3 was *for*).
- [ ] No crashes, no console errors, no save corruption across two full playthroughs.

## 4. Scope
**In scope — the base (vendored, verified working):**
- WebGL2 renderer on three.js r160: clipmap heightfield terrain, sun mask shadows,
  bloom/post chain, procedural sky (starfield, low Earth, sun), dust particles.
- Rover: 6-wheel raycast chassis, 1/6 g, sinkage/ruts/berms, drill arm (2-link IK),
  solar array, relays, headlights, chase/photo cameras, signal-delay mode.
- Game: 5-mission campaign + free survey, GPR radar, anomaly drilling, codex/lore,
  power/thermal/integrity, day cycle, autosave + save/load (localStorage), pause/codex/
  help panels, touch controls for phone/tablet.
- Server: `node server.js [port] [--shots]` with screenshot capture endpoint.

**In scope — the expansion (this project's actual work):**
- **Phase 1 — data-driven missions:** objective logic moved out of hardcoded calls in
  `gameplay.js` into mission data (ids, predicates, counts, params); `missionIdx`
  positional gates removed; saves stay compatible (or `KEY` bumped deliberately).
- **Phase 2 — regions / levels:** `bakeTerrain()` parameterised (extent, crater fields,
  props density, spawn, landmarks); multiple named regions/levels selectable from the menu,
  each with its own mission set; per-region save slots.
- **Phase 3 — planets & content:** planet abstraction (gravity, sun altitude, albedo,
   sky palette, terrain params, mission campaign) as pure data; at least 2 additional
   worlds beyond Anaximenes; expanded mission content per world.

**Explicitly OUT of scope (for now):**
- No multiplayer, no mods, no localization, no console port, no engine swap,
  no external asset imports, no online features, no npm dependencies.
- No permadeath: power-out / flip = recover, never "game over".
- No AI creatures — the alien presence stays environmental (the pipes, the station).

## 5. Non-functional constraints
- Offline: zero runtime network requests; `vendor/three/` committed.
- Zero npm dependencies; `package.json` exists only as metadata (no `npm install` ever).
- Performance: 60 fps at 1080p on the target machine at HIGH quality (the built-in
  resolution governor is the escape hatch on slower GPUs).
- Determinism: worldgen reproducible from its (implicit) parameters; a given region
  configuration always yields the same world.
- Save integrity: identity-based anomaly saves — bump the save `KEY`
  (`farside.anaximenes.v3`) with any change to anomaly generation/terrain filters
  (constitution).

## 6. High-level architecture (one paragraph + a sketch)
A single `main.js` frame loop drives ES-module objects with no build step: `Engine`
(WebGL2 composer: scene → shadow → bloom → final grade), `Terrain` (baked CPU height
fields + clipmap rings sharing uniforms; CPU `heightAt` and shader `terrainH` are the
same function of the same data — the load-bearing contract in `docs/ARCHITECTURE.md`),
`Props` (procedural machines/rocks, static colliders), `Rover` (hand-integrated 6-wheel
body, 6 substeps, never touches an engine physics system), `Game` (mission state machine,
power, radar, drill, save), `Hud` (DOM instruments driven by one `--s` variable), `Audio`
(WebAudio, all synthesis in code). `window.FARSIDE` exposes the debug handle used by the
gate. `docs/ARCHITECTURE.md` lists every invariant that has already been broken once —
read the relevant section before touching any module.

```
 index.html → src/main.js (frame order: input.poll → pumpCommands → rover.step →
                   props.resolve → rover.sync → world updates → game.update →
                   rig.update → audio/hud → engine.render → saveFrame → input.endFrame)
   ├─ engine/  (composer, quality tiers, resolution governor)
   ├─ world/   (terrain bake + clipmap, props, sky, dust)
   ├─ game/    (gameplay.js: missions/power/radar/drill · rover.js: chassis ·
   │            lore.js: CODEX/SAMPLES/MISSIONS — the only content source)
   ├─ ui/      (hud.js, panels)
   ├─ core/    (input, save, audio, clock)
   └─ vendor/three/  (three.js r160 + examples/jsm — the ONLY dependency)
 server.js      (zero-dep static server; --shots → POST /__shot capture endpoint)
```

### Lore (canonical — do not drift; full text in `src/game/lore.js`)
On day 612, **VANTAGE-3** — the deep-seismic observatory on the floor of
**Anaximenes** (72.5° N, near the north-west limb) — sent a single unscheduled four-second
burst and stopped. Two hundred and fourteen sun-days have passed since. The player
operates **K-9 "KESTREL"**, a survey rover put down by descent sled a few hundred metres
from the station. The dossier never says what VANTAGE-3 was *for*. The survey finds: a
hexagonal close-packed network of hollow **glass pipes** (fulgurite of local chemistry)
under the floor — nine km², formed 39 ± 4 years ago, branching from under the central
massif; a four-billion-year-old mineral **lining** on the pipe interiors that rings without
damping; a warm, charging **drumhead** eleven metres under the massif; and a crew of four
listed as MISSING, not lost. The knocking the geophones heard is a count: it was silent
for 214 days, and it began again the day the sled landed. Tone: *Interstellar* meets
*The Abyss* — eerie, lonely, beautiful; the alien presence is environmental, never a
creature.

### Campaign (canonical — as built in `src/game/lore.js`)
01 **FIRST PASSAGE** (`firstpassage`) — deploy array (T), drive 120 m from the sled, run a
   GPR sweep (G).
02 **THE LISTENING FLOOR** (`listening`) — excavate 3 subsurface returns (one of them a
   hollow pipe), return the samples to the sled.
03 **OPEN CHANNEL** (`channel`) — deploy 3 relays on high ground (B, >10 m elevation,
   95 m apart).
04 **THE QUIET STATION** (`quiet`) — reach VANTAGE-3, recover the crew logs (hold E); the
   dig site holds the lining sample.
05 **THE KNOCK** (`knock`) — reach the central massif, extract the drumhead core, return
   and transmit.
→ ending card **COUNTING** + **free survey** (the basin is yours).

### Controls (canonical)
WASD/↑↓←→ drive & steer · mouse look (pointer lock) · T solar array · G GPR scan ·
R sampling arm (LMB drill, WASD aim) · B relay · hold E interact · F headlights ·
C cycle camera · P photo mode (Q/Z zoom) · K frame capture · H HUD · X right chassis
when flipped · Tab codex · Esc pause. Phone: twin thumbsticks + action buttons.

## 7. Phase map (the plan, kept SHALLOW)
> Phase 0 is ALWAYS the walking skeleton. Later phases are one-liners; each is
> deep-planned (phase spec + task specs) only when reached.

| # | Phase | One-line goal (the vertical slice) | Status |
|---|-------|------------------------------------|--------|
| 0 | Rebase onto the browser codebase | browser codebase vendored, game plays end-to-end in a tab, gate green with screenshot evidence | done |
| 1 | Data-driven missions | objective ids/logic live in mission data (not `gameplay.js`), `missionIdx` positional gates gone, new mission addable as pure data, saves survive (or `KEY` bumped) | done |
| 2 | Regions / levels | `bakeTerrain()` parameterised; 2+ selectable named regions on the menu, each with its own campaign + save slot | done (2026-09-02, gate 28/28) |
| 3 | Planets & content | planet = pure data (gravity, sky, terrain, campaign); 2+ new worlds playable; expanded mission content | done (2026-09-06, gate 40/40) |

## 8. Open questions / risks
- **Identity-based anomaly saves — now a per-region save-key surface** — anomaly ids
  are coordinate-derived, so any worldgen/filter change for a region moves its ids and
  silently re-keys *that region's* saves. Four slots now exist
  (`farside.anaximenes.v3` / `.longshadow.v1` / `.ganymede.v1` / `.callisto.v1`).
  Mitigation: per-region bump discipline (constitution) — `bake-diff.cjs` covers
  Anaximenes only (frozen reference); the other three bundles ride on per-world
  in-page double-bake gate checks (G28/G38/G39, 1000 strict samples). If the number
  of regions keeps growing, a node-side identity tool per bundle would earn its keep.
- **Mission refactor touches the one file everything touches** (`gameplay.js`); keep task
  allowlists tight and re-run the gate after every task.
- **Terrain parameterisation** must not break the CPU/GPU heightfield contract or the
  95 m camera-fade window; Phase 2 deep-plan must read `docs/ARCHITECTURE.md` §Terrain.
- **Scope risk (planets) — resolved at the Phase-3 close.** A "planet" stayed a data
  bundle: four worlds shipped with `REGIONS` records + one pre-approved prop builder
  (`buildBreakout`) and three recorded line-level deviations (§3.12-style notes in the
  task specs). One latent gameplay fix (re-transmit of an already-stowed payload)
  crossed the guard line and was parked in `spec/IDEAS.md` rather than shipped.
- **Headful-only gate** — the gate needs a real X11 display (:1) and headful Firefox
  (Mesa WebGL2); no CI story yet. That's accepted for now.

---
_Changelog (update on every phase close — fights spec-code drift):_
- 2026-08-26: created — original design (bespoke C++20/GL 4.6 engine, full 30–50 min game,
  procedural audio). (Superseded by the rebase below.)
- 2026-08-26: C++ Phase 0–1 (walking skeleton → terrain + frame graph + shadows + rover
  sim) closed on the old stack.
- 2026-08-28: **REBASE** — user approved replacing the C++ engine with the browser
  codebase (plain ES modules + vendored three.js r160 + zero-dependency server); its art
  direction and story are now canonical. Phase 0 (rebase) closed same day:
  `node --check` green, `node server.js 8080 --shots` serving, gate (Firefox 152 +
  raw-TCP Marionette, `tools/gate.cjs`) **9/9 PASS** — menu → mission 01 (deploy/drive
  130 m/scan) → save → reload → resume.
- 2026-08-29: **Phase 1 (data-driven missions) closed.** The campaign is now a pure data
  problem: every objective in `src/game/lore.js` carries a `type` (`event`|`distance`|`count`)
  and its params; a small objective engine in `gameplay.js` (`emit()` event funnel +
  `checkState()` data-driven predicates) completes them, and `ENDING_CARD` moved to data.
  `missionId: string|null` replaces positional `missionIdx` (zero matches in `src/`); content
  gates (drumhead lock, station prompt, compass/minimap POIs) are data via `tagOpen`/`anomalyOpen`/
  `objectiveTargets`. Saves are identity-based (`missionId`, anomaly `[id,code]` pairs).
  The gate grew from 9 to **21 checks** — a full 5-mission playthrough (deploy/drive/scan →
  3 excavations → 3 relays → station + lining → massif + drumhead extract + transmit →
  ending → save → reload → free-survey resume) driven by real W/A/D input and settle-search
  drills — passing **21/21, exit 0** from a clean profile in ~28 min. Insertion test: a
  throwaway 6th mission added as pure data shows its card after m05 with 01–05 unchanged.
- 2026-08-30: **RE-IDENTITY.** The project is now **FARSIDE — The Knocking at Anaximenes**:
  the Anaxagoras / Beacon-9 / MU-7 CASSIOPEIA / Directorate names are scrubbed from code,
  docs and specs; the story is rewritten as "the knocking" (214-day silence, resumes the
  day the sled lands, ends on "counting something down"); station VANTAGE-3, rover K-9
  KESTREL, bureau Meridian Authority; save key `farside.anaximenes.v3`; `window.FARSIDE`
  handle; the project MIT licence dropped (three.js keeps its own); git history squashed to
  a single commit. Gate re-run **21/21, exit 0**; evidence regenerated in
  `spec/evidence/phase-1/`.
- 2026-09-02: **Phase 2 (regions / levels) closed.** The world is data: `bakeTerrain(report, P)` /
  `baseHeight(x, z, P)` in `src/world/bake.js` take a per-region parameter bundle, and new
  `src/game/regions.js` ships `REGIONS = [ANAXIMENES, LONGSHADOW]` — each region is a pure-data
  record (terrain P, spawn, landmarks, props, anomalies, missions, codex, ending, save key).
  `tools/bake-diff.cjs` keeps Anaximenes byte-identical against a frozen pre-Phase-2 copy of the
  bake math (strict float equality + determinism) — run after every worldgen touch. Saves are
  per-region slots (`farside.anaximenes.v3` — NOT bumped, Anaximenes worldgen is unchanged;
  `farside.longshadow.v1` new); settings moved to the global key `farside.set` (the selected
  region rides there, one-time migration). `Game` is region-bound (`reset(freeRoam, region)`);
  `stationVisited`/`drumTaken` → `contentVisited`/`payloadTaken` + per-objective `deep` flag,
  `o.unlock` hook, event payloads — all load-migrated, no legacy blob broke, no key bump. The
  menu gained a two-card region picker (`#regionCards`, per-card save-derived status, its own
  `#regionload` sheet); switching is menu-only, the save is the exit. `Props` gained
  `buildPost`/`buildHub` for the Long Shadow listening array. **THE LONG SHADOW** — a high-rim,
  shadowed basin entered through a wall breach — carries its own 5-mission campaign (THE LONG
  SHADOW → ECHO → THE QUIET ONE → SILENCE → THE COUNT), 6 codex entries, cable/core samples, and
  the ending card THE COUNT (two basins, one count). Engine fix found by the data: `advance()`
  now resets `objDone`/`counts` per mission (Long Shadow deliberately reuses the `reach`/
  `recover` objective ids across L02/L03; Anaximenes ids never collide). The gate grew 21 →
  **28 checks** (existing campaign + save round-trip unchanged first, then: both menu cards with
  statuses, A→Long Shadow→A swap, Long Shadow L01 playable, `farside.longshadow.v1` round-trip
  into L02, Anaximenes save intact across the swap, Long Shadow bake determinism — two in-page
   bakes, 1000 strictly-equal samples) — **GATE PASS (28/28), exit 0** from a clean profile;
   evidence in `spec/evidence/phase-2/`.
- 2026-09-06: **Phase 3 (planets & content) closed.** The planet abstraction held: a world
  is a **pure-data region bundle** — optional `g`, `sun` (rate + altitude curve →
  `sunAltitude(az, S)` / `App.sunRate`), `sky` (Earth or Jove: `planet`, Jove
  direction/size/companion dots, sun disk `sunAngular`/`sunScale`, `starSeed`, IBL ground
  bounce), `albedo` (seeded `makeBodyAlbedo` + `tone` ground tint via the `uBaseCol`
  uniform) and `dust` palette fields, read with Moon-identical defaults — and the
  abstraction is proven by **two fully playable foreign worlds**: **THE CHOS PLAIN**
  (`ganymede`, `farside.ganymede.v1`, `g` 1.428 — a pale plain under a 7° Jove and a low
  far sun that never sets, the 2.2 m resonant-lining ring under the rise, 5-mission
  campaign → **THE ARRIVAL**) and **CONAMARA** (`callisto`, `farside.callisto.v1`,
  `g` 1.236 — the breakout pipe lattice under a dark impact-flash-pocked floor under the
  game's **first real night**; sunset mid-campaign, a headlight night objective, a shard
  dielectric-matched to Anaximenes' pipe glass, 5-mission campaign → **THE EVENT**).
  One new prop builder (`buildBreakout`), five additive `SAMPLES` keys
  (`frost`/`ring`/`flash`/`shard`/`tap`), a four-card menu, a world-owned `Sky` (built
  first in `buildWorld`, torn down last, `Sky.dispose()` covering geometries + the pmrem
  env target) and a per-region albedo memo on `App.albTex`. **Identity results:** the two
  Moon basins are untouched — `bake-diff.cjs` frozen-reference green, the ANAXIMENES /
  LONGSHADOW record blocks byte-identical to pre-phase, Moon default objects
  (`SKY_MOON`, `A_MOON` wrapper, `MOON_G`, sun curve 0.42+sin(·0.5−0.4)·0.12,
  `0.0060` rate) exact, the identity sweep closed (0 hits), lore diff additive-only, no
  runtime assets added (Jove is procedural in `textures.js`). **Gate 28 → 40:**
  G1–G28 run first, unchanged (append-only file diff), then G29 four-card menu with
  per-region statuses; G30 Chos swap (rise-to-plain 10.6 m band, low never-setting sun,
  fresh Sky instance in scene); G31–G33 Chos L01 → `farside.ganymede.v1` round-trip;
  G34 Conamara swap (`rover.g` 1.236, Jove sky with no Earth disc, Ganymede blob intact);
  G35–G37 Conamara L01 → `farside.callisto.v1` round-trip; G38/G39 in-page two-bake
  determinism for the Jovian bundles (1000 strict samples — the standing cover bake-diff
  does not reach); G40 back to Anaximenes after four region visits with both Moon blobs
  intact — **GATE PASS (40/40), exit 0** from a clean profile in 29 min. Evidence in
  `spec/evidence/phase-3/` (35 shots: task 5/6 passing-run driver shots + close-run
  menu/orbit/drive shots). **Phase-3 guard outcome:** nothing had to be split — the guard
  held; the only code beyond data was the pre-approved builder plus three recorded
  line-level deviations (lens-ghost streak × `rover.sunVis`, a `dt ≥ 1e-3` integration
  floor in `Rover.step` against a degenerate rAF tie, a per-body flash-threshold param in
  `textures.js`), and one latent gameplay fix (re-transmit of an already-stowed payload —
  a `gameplay.js` work item) was parked in `spec/IDEAS.md` rather than shipped. The
  §3.2/§3.9 sun-curve value columns are tuning *starts*: both Jovian curves were re-tuned
  against measured playthrough pacing in tasks 5/6 (final values + provenance in the
  task-05/06 result notes), as the phase spec anticipated.
