# HANDOFF — farside (browser rebase)

_Last session: 2026-08-31. This file supersedes memory from prior sessions._

## Where we are

**The app is now FARSIDE — The Knocking at Anaximenes.** On 2026-08-30 the project was
re-identified in one pass: REGOLITH / Anaxagoras / Beacon-9 / MU-7 CASSIOPEIA / Directorate
is gone from code, docs and specs. The new identity, in lockstep everywhere:

- Title **FARSIDE**, subtitle **The Knocking at Anaximenes**; basin **Anaximenes**
  (72.49° N, 44.98° W — the northwest rim; "farside" is the name, not a claim about the far
  side of the Moon).
- Station **VANTAGE-3** (deep-seismic observatory), rover **K-9 "KESTREL"**, bureau
  **Meridian Authority** / NW-LIMB SURVEY DIVISION.
- Story: the basin floor **knocks** — pulses from hollow glass pipes under the central
  massif. Silent for 214 sun-days; it began again the day the sled landed. Codex ids:
  `dossier, geology, first-return, voids, roster, log-early, log-late, memo, function,
  lasthour, drum, transmission`. Sample types: `soil, breccia, ilmenite, agglutinate,
  pyroclast, meteoritic, pipe, lining, drum` (the old `tube`/`film`/`node` specials are
  `pipe`/`lining`/`drum`).
- Machine identity: `window.FARSIDE`, save key `farside.anaximenes.v3`, package `farside`,
  screenshot prefix `farside-`, console tag `[FARSIDE]`.
- The project MIT licence was dropped (LICENSE deleted, README licence section trimmed to
  the three.js attribution); `vendor/three/` keeps its own MIT header.

**Phase 1 — data-driven missions — is CLOSED.** The campaign is a pure data problem: adding,
reordering, or retuning a mission is an edit to `src/game/lore.js` only. Objective completion
runs through a small typed engine in `gameplay.js`; positional `missionIdx` gates are gone.
Saves carry stable identities.

The verification gate plays the **full 5-mission campaign** end-to-end (21 checks, exit 0)
from a clean browser profile in ~28 minutes. Evidence is regenerated into `spec/evidence/`
after every gate run (the pre-re-identity PNGs were deleted with the old identity).

On 2026-08-31 the `docs/` screenshots were recaptured clean (hero / drill / hud had
compositor ghosting) and the README was brought current: stats (6,839 JS lines; ~390 KB
gzipped / 1.69 MB raw; 5 missions · 12 codex · 9 samples), alt-text, and `content.js` added
to the layout table. The doc-shot capture gotchas that made the clean shots possible are below.

Next: **Phase 2 — regions / levels** (deep-plan it in a fresh session:
`spec/phases/phase-2-*.md`). The target is parameterising `bakeTerrain()` (extent, crater
fields, props density, spawn, landmarks) so the menu can offer 2+ named regions, each with its
own mission set and save slot. `docs/ARCHITECTURE.md` §Terrain and §Content explain the
contracts to respect. Read the Product Spec §7 phase map and `spec/IDEAS.md` first.

## Exact commands (verified this session)

```sh
# 1. syntax check (all green)
for f in $(find src vendor server.js -name '*.js'); do node --check "$f" || exit 1; done
node --check tools/gate.cjs

# 2. serve (port 5173 is taken by an UNRELATED user node process — never kill it)
node server.js 8080 --shots &          # --shots: POST /__shot?n=name writes .shots/name.png

# 3. gate (needs headful Firefox on the X11 display — Mesa WebGL2)
#    For a CLEAN run (no leftover localStorage): kill the test Firefox, wipe + re-create
#    the profile dir, then relaunch. The profile dir MUST exist or Firefox starts but hangs
#    without opening marionette.
rm -rf /tmp/opencode/ffprof && mkdir -p /tmp/opencode/ffprof
DISPLAY=:1 firefox -no-remote -marionette -profile /tmp/opencode/ffprof -width 1280 -height 800 &
node tools/gate.cjs 2828 .shots         # exit 0 = GATE PASS (21/21)
```

Test browser runs on profile `/tmp/opencode/ffprof`, marionette port **2828**, display `:1`.
The user's own Firefox and the node process on **5173** are never killed.

Gate scenario (all 21): menu → BEGIN DESCENT → m01 FIRST PASSAGE (T deploy, real W/A/D drive,
G scan) → m02 THE LISTENING FLOOR (3 drills incl. a pipe, offload) → m03 OPEN CHANNEL (3
relays on high ground) → m04 THE QUIET STATION (reach VANTAGE-3, hold-E, lining drill) →
m05 THE KNOCK (massif, drumhead settle-search extract, transmit at the sled) → ending card
(COUNTING) → save v3 → reload → RESUME SURVEY → free survey with 12 codex + drumhead kept.

## Architecture as-built

- Plain ES modules, **vendored three.js r160** (`vendor/three/`), zero npm deps, zero build
  step, zero runtime assets. `index.html` + `src/main.js` are the entry. Frame order and the
  other load-bearing invariants are in `docs/ARCHITECTURE.md` — read the section for whatever
  you touch.
- **Mission identity:** `Game.missionId: string | null` (`null` = free survey). Current ids:
  `firstpassage, listening, channel, quiet, knock`; `get mission()` looks the id up in
  `MISSIONS`. `reset(freeRoam)` sets `missionId = MISSIONS[0].id` then, if `freeRoam`, nulls
  it and unlocks all codex. `advance()` finds the next mission *by id* in the data array
  (never positionally) and shows its card, or `ENDING_CARD` + `freeRoam` when exhausted.
- **Objective engine (`gameplay.js`):** `emit(event, payload)` is the single funnel — every
  action site calls it (`array-deployed`, `scan-done`, `sample`, `extract`, `relay`,
  `offload`, `transmit`, `station-interact`); it matches the current mission's unmet
  objectives (`event`/`count` with `special` filter) and completes them. `checkState()` runs
  each frame and evaluates `distance` records against `LANDMARKS` (`ref`/`op`/`v`, optional
  `minH`). Non-objective side effects (codex unlocks, `drumTaken`, logs) stay at the action
  sites. `MISSIONS` in `lore.js` is the only place objective text/counts/thresholds live.
- **Content gates → data:** the drumhead anomaly is stamped `unlocks:'drum'`; `anomalyOpen(a)`
  is true iff the tag is unset **or** an *unmet* objective of the current mission declares it
  (the `!objDone[own]` form deadlocks). The station hold-E prompt is the `CONTENT` record +
  `tagOpen('station')`. Compass + minimap POIs come from `game.objectiveTargets()`.
- **Save v3:** localStorage key `farside.anaximenes.v3`. Blob carries `missionId`
  (string|null) and `anoms` as `[id, 0|1|2]` pairs (non-default states only); `a.id` is
  `round(x*10)+','+round(z*10)` (deterministic from the fixed worldgen). `load()` re-keys by
  id and ignores unknown ids. Bump the `KEY` in the same commit as any
  anomaly-generation/terrain change (constitution).
- Debug handle: `window.FARSIDE` = App (`state` 0 BOOT / 1 MENU / 2 PLAY / 3 PAUSE / 4 CODEX /
  5 HELP / 6 CARD; `game`, `input`, `tick(dt)`).

## Hard-won gotchas

1. **Marionette here is NOT WebSocket.** Raw-TCP length-prefixed JSON (`N:<json>`); a WS
   handshake gets no 101. After the capabilities message send `[0, id, "WebDriver:Name",
   params]`; responses `[1, id, error, {value}]`. `WebDriver:NewSession` needs no prompt when
   Firefox started with `-marionette`. A malformed packet kills the listener — restart Firefox
   if the port goes dead. Reference client: `tools/gate.cjs`.
2. **`WebDriver:ExecuteScript` takes a function BODY** (`return x;`), not an IIFE — an IIFE's
   return is silently discarded. To use `await`/`import`, `return (async () => { … })();`.
3. **Marionette's `ExecuteScript` runs in a SEPARATE JS module map.** A dynamic
   `import('/src/game/lore.js')` from a script there loads a *duplicate* module — mutating it
   never affects the game. To change the page's live ES modules (e.g. the insertion test),
   inject a `<script type="module">` into the DOM; that runs in the page's main realm and
   shares the game's module graph.
4. **The mission card blocks the world.** Fresh start: card appears ~700 ms in, `App.state` → 6
   (CARD), the world freezes. Click `#cardGo` to return to PLAY. On *mission advance* the card
   shows but state stays PLAY (world runs behind it). On *resume* there is no card.
5. **Synthetic input works**: window-level `keydown`/`keyup` with `code` set; edge actions
   (T/G/R/B) read `input.hit`, throttle/steer read `input.down`; `input.endFrame()` clears edges
   every frame.
6. **Steering:** real W/A/D — KeyD lowers heading, KeyA raises it (the gate's `driveTo` was
   fixed for this). If the loop can't close on a target within budget it re-seats the rover
   within 8 m (driver assist, logged in the result detail).
7. **Settle-search drills** (`extractDrum`, `drillFacing`): the drill only fires within 2.6 m
   (`nearestAnom`) and the arm yaw is clamped ±0.95 rad off the chassis heading. Re-seat on a
   small ring with the nose pointed at the target so the arm swings ~0 and the bit lands in
   radius — then extend + LMB and poll the anomaly's `taken` flag. A blind core (bit out of
   radius) still grows the bay, so verify `taken`, not `bay.length` (this is what silently
   passed the lining step before).
8. **Profile dir must exist** before launching the test Firefox, or it starts but hangs without
   opening marionette (Mesa WebGL2 first-run init). `mkdir -p` it.
9. Port 5173 is held by an unrelated user node process; the user's own Firefox may also be
   running — never kill either.
10. **Identity sweep:** the old names (`REGOLITH`, `Anaxagoras`, `Beacon-9`, `MU-7`,
    `CASSIOPEIA`, `winchxyz`) must stay out of the repo — `vendor/` excepted. Lowercase
    "regolith" survives as the geological common noun (physics, audio, dust); the product
    name is FARSIDE.
11. **Doc-shot ghosting is session-intermittent, not flow-deterministic.** A "double-image"
    in a panel crop can come back clean when the *same* T→drive→stop prefix is re-run in a
    fresh session — do not chase it by editing the flow. Two real causes: (a) the mission
    panel's drive-objective counter text changes **every frame while driving**, so a shot
    taken mid-drive ghosts that objective line; (b) compositor/surface residue from a prior
    frame. Countermeasures that produced the clean set: warm up with a resize
    (1024×640→1280×800) to clear residue; shoot on a **stable** panel (at rest, no per-frame
    text churn, no mid-session panel swap); take several shots in the window and pick; and
    **verify crops at 4× zoom** — a ghosted panel reads clean at 1×. For the hero add a
    **hull check + retry** (a boulder strike drops integrity to ~96% and prints a red IMPACT
    line — re-run until hull 100). For the HUD shot use the **MAST camera** (clean
    composition, no rover, stable panel at ~38 s).
12. **Kill only the test Firefox, never the user's.** `pkill -f "[p]rofile /tmp/opencode/ffprof"`
    — the leading bracket stops the pattern from matching pkill's own command line. The user's
    Firefox and the node process on 5173 must survive.

## Next steps (Phase 2 kickoff, fresh session)

1. Read `spec/constitution.md`, `spec/product-spec.md` (§7 phase map + §8 risks), this file,
   and `docs/ARCHITECTURE.md` §Terrain + §Content.
2. Deep-plan: `spec/templates/phase-spec.md` → `spec/phases/phase-2-regions-levels.md`.
   Design the `bakeTerrain()` parameter bundle (extent, crater fields, props density, spawn,
   landmarks), per-region mission sets, and per-region save slots (extend the `KEY`/identity
   scheme from Phase 1).
3. Tag tasks (`easy | hard | gate`); keep file allowlists tight. Phase 2 touches
   `terrain.js` (the CPU/GPU heightfield contract) and `content.js` — re-run the gate after
   every task.
4. Gate after every task; evidence to `spec/evidence/phase-2/`.

## Open risks

- **Terrain parameterisation** must not break the CPU/GPU heightfield contract or the 95 m
  camera-fade window — read `docs/ARCHITECTURE.md` §Terrain before touching `bakeTerrain()`.
- The gate is **headful-only** (Mesa WebGL2 on :1); no CI story. Accepted for now.
- `gameplay.js` remains the one file everything touches; keep refactor slices small and gated.
