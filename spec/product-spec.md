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
- [ ] The gate (`tools/gate.cjs`) passes **21/21, exit 0**: full 5-mission campaign from a
      clean profile, ending card, save round-tripped into free survey.
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
| 2 | Regions / levels | `bakeTerrain()` parameterised; 2+ selectable named regions on the menu, each with its own campaign + save slot | planned |
| 3 | Planets & content | planet = pure data (gravity, sky, terrain, campaign); 2+ new worlds playable; expanded mission content | planned |

## 8. Open questions / risks
- **Identity-based anomaly saves** — the `KEY` is the sharpest edge: anomaly ids are
  coordinate-derived, so any worldgen/filter change moves them and silently re-keys old
  saves. Mitigation: save `KEY` bump discipline (constitution).
- **Mission refactor touches the one file everything touches** (`gameplay.js`); keep task
  allowlists tight and re-run the gate after every task.
- **Terrain parameterisation** must not break the CPU/GPU heightfield contract or the
  95 m camera-fade window; Phase 2 deep-plan must read `docs/ARCHITECTURE.md` §Terrain.
- **Scope risk (planets)** — a "planet" is a data bundle, not a new engine; anything that
  starts looking like a new code path goes to `spec/IDEAS.md`.
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
