# AGENTS.md — farside

Spec-driven browser game (Three.js, no build step, zero npm deps) — a lunar/planetary
rover survey game. Process lives in `CLAUDE.md`; this file is the operational quick
reference: the commands, the traps, and the hard rules an agent will otherwise miss.

## Read first, every session

1. `HANDOFF.md` (repo root) — latest handoff: state, exact commands, architecture
   as-built, gotchas. It supersedes all prior-session memory.
2. `spec/constitution.md` → `spec/product-spec.md` (phase map + changelog at bottom)
   → the currently open phase spec in `spec/phases/`.
3. `docs/ARCHITECTURE.md` for terrain/content/world wiring.
- Scope creep and new ideas go to `spec/IDEAS.md`, never into the current phase.

## Verify in this order

```sh
# 1. syntax (all green required)
for f in $(find src vendor server.js tools -name '*.js' -o -name '*.cjs'); do node --check "$f" || exit 1; done
# 2. worldgen identity — ALWAYS after touching src/world/bake.js / regions.js terrain data
node tools/bake-diff.cjs              # exit 0 required; its reference copy is FROZEN — never edit it
# 3. serve (8080 — port 5173 is taken by an unrelated user process; never kill it, never serve there)
node server.js 8080 --shots &         # --shots: POST /__shot?n=name writes .shots/name.png
# 4. gate — headful Firefox only (Mesa WebGL2 on :1), clean profile each run
rm -rf /tmp/opencode/ffprof && mkdir -p /tmp/opencode/ffprof   # dir MUST exist or Firefox hangs with no marionette
DISPLAY=:1 firefox -no-remote -marionette -profile /tmp/opencode/ffprof -width 1280 -height 800 &
node tools/gate.cjs 2828 .shots       # exit 0 = GATE PASS; takes ~30 min — skip it for doc-only changes
```

## Marionette on this Firefox build is NOT WebSocket

Raw length-prefixed JSON over plain TCP: `N:<json>` (N = bytes). A WS handshake gets
no 101. Commands `[0, id, "WebDriver:Name", params]`; responses
`[1, id, error, {value}]`. `ExecuteScript`'s `script` param is a function **body**
(async: `return (async () => { … })();`) and runs in a **separate module map** —
`import()` loads duplicate modules; to mutate page modules inject a
`<script type="module">`. Reference client: `tools/gate.cjs`.

## Behavior automation must know

- Debug handle: `window.FARSIDE = App` — `state` 0 BOOT / 1 MENU / 2 PLAY / 3 PAUSE /
  4 CODEX / 5 HELP / 6 CARD, plus `.tick(dt)` to step one frame by hand.
- A fresh start shows the mission card ~700 ms in and **blocks the world**
  (`state` 6 — click `#cardGo`); on mission *advance* the card shows while state
  stays PLAY (world runs behind it); on resume there is no card.
- Autosave every 20 s of game time in ALL states; `advance()` saves immediately.
  Saves are per-region: `farside.<region>.v<n>` (default slot
  `farside.anaximenes.v3` is never bumped); settings + selected region ride in the
  global `farside.set`.
- `advance()` arms a 1.4 s timer that **resets `objDone`/`counts`** — capture
  objective bookkeeping at the mutation instant (right after the tap), never after
  the transition.
- Synthetic input: window-level `keydown`/`keyup` with `code`; KeyD lowers heading,
  KeyA raises it. `driveTo` re-seats ≤8 m when it can't close (the one allowed
  assist). Drills: re-seat on a ~2 m ring with the nose ON target; verify the
  anomaly's `taken`, not `bay.length` (a blind core still grows the bay).
- Long browser runs: `nohup setsid node … > /tmp/opencode/log 2>&1 & disown`, then
  poll the log — piped commands hit the tool timeout. Kill only the test Firefox:
  `pkill -f "[o]pencode/ffprof"` (bracket prevents self-matching your own command
  line, which is a real self-kill trap here).

## Hard rules (constitution + hard-won)

- **Frozen reference:** `bake-diff.cjs` holds a frozen copy of the pre-Phase-2 bake
  math. A mismatch is fixed by changing the *new* code to agree — or, if
  `P_ANAXIMENES` itself must move, bumping the Anaximenes save key in the same
  commit. Never edit the frozen copy.
- **Save-key discipline is per-region:** bump a region's key only when *that
  region's* anomaly generation/terrain changes; save-blob renames are load-migrated
  without a bump.
- **World swap rebuild list** (`main.js` → `selectRegion`): teardown in exact
  reverse — Terrain group, Props group, Dust, Rover, CameraRig, Game,
  `hud.bakeMap`. Dust must be **rebuilt**, not re-pointed (it wraps terrain
  uniforms at construction). Never replace a uniform wrapper object — mutate
  `.value` only; clipmap rings and Dust share the wrappers by reference.
- **Identity sweep stays zero:** `REGOLITH`, `Anaxagoras`, `Beacon-9`, `MU-7`,
  `CASSIOPEIA`, `winchxyz` must not reappear (vendor/ excepted; lowercase
  "regolith" is a common noun and fine). New-region identity sweeps are defined in
  the phase specs.
- **Phase 3 guard:** worlds are data (region bundles + prop builders). Anything
  that starts needing a new engine code path goes to `spec/IDEAS.md`, not the phase.
- **Never tune physics/OPS constants to chase run-to-run pacing.** Pacing is fixed
  with driver budgeting (power gates, waits) or data (e.g. the sun curve values).
- **Commits:** one logical commit per task — src + task-spec result notes +
  phase-table status + `spec/evidence/phase-N/` screenshots from the *passing* run.
  `.shots/` and `*.log` are gitignored: evidence shots must be copied out of
  `.shots/` into `spec/evidence/` before committing.

## Structure worth knowing

- `src/game/regions.js` is the **only module that knows the worlds**: a pure-data
  `REGIONS` array of bundles. `P_ANAXIMENES` lives in `src/world/bake.js` (the
  frozen-parity bundle); all other bundles live in `regions.js`.
- `src/world/bake.js` is pure math, no render imports; `terrain.heightAt`/`slopeAt`
  are its CPU mirrors.
- `src/game/gameplay.js` is the one file everything touches — keep refactor slices
  small and gate-checked.
- Throwaway campaign drivers live in `/tmp/opencode/` (they are deliberately not
  committed; clone the latest one for new worlds).
