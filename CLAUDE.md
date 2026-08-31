# farside

This app follows the workspace Kickoff System (spec-driven development).
Full method: `../spec-kit/README.md` · fundamentals: `../spec-kit/docs/fundamentals.md`

## Read first, every session

0. `HANDOFF.md` (repo root, if present) — latest session handoff: current state, exact
   build/run/verify commands, architecture as-built, hard-won gotchas, next steps.
   Read it before anything else; it supersedes memory from prior sessions.
1. `spec/constitution.md` — non-negotiable rules for this app
2. `spec/product-spec.md` — the ONE PRD; phase map + changelog at the bottom
3. The currently open phase spec in `spec/phases/` (if any)

## How work happens

- Claude Code is the **orchestrator**: it writes/refines specs, decomposes work, and
  runs the verification gate. The spec is the source of truth; code is generated
  against it.
- One phase at a time. **Phase 0 is always the walking skeleton.**
- Deep-plan a phase only when starting it: copy `spec/templates/phase-spec.md` to
  `spec/phases/phase-<N>-<name>.md` and fill it (research first if there are unknowns).
- Decompose the phase into task specs (`spec/templates/task-spec.md`), in dependency
  order. Each task: one scoped context, an explicit file allowlist, testable
  acceptance criteria, and a `difficulty` tag (`easy` | `hard` | `gate` | `local-only`).
- Routing by difficulty is defined in `../spec-kit/docs/local-llm-routing.md`. Until
  the local endpoints are wired up, Claude Code does the work itself — but keep
  tagging tasks so routing can be switched on later.
- **Verification gate before merge:** acceptance criteria met, tests green, spec still
  matches code. "Looks good" is not a contract.
- On phase close: demo the slice, update `spec/product-spec.md` (phase map +
  changelog), then start the next phase in a **fresh session**.

## Running & verifying this app (browser stack)

- Syntax: `node --check` on every file in `src/`, `vendor/three/`, and `server.js`.
- Serve: `node server.js 8080 --shots` (use 8080 — port 5173 is taken by an unrelated
  user process on this box; `--shots` enables `POST /__shot?n=name` screenshot capture).
- Gate: needs a **headful** Firefox on the X11 display (Mesa WebGL2), then the driver:
  ```
  DISPLAY=:1 firefox -no-remote -marionette -profile /tmp/ffprof -width 1280 -height 800 &
  node tools/gate.cjs 2828 .shots        # exit 0 = gate PASS
  ```
  `tools/gate.cjs` plays: menu → BEGIN DESCENT → mission card → deploy (T) → drive 125 m
  (W) → scan (G) → mission complete → autosave → reload → RESUME SURVEY → progress kept.
- **Marionette gotcha (hard-won):** this Firefox build's Marionette is **raw
  length-prefixed JSON over plain TCP** (`N:<json>`), *not* WebSocket — a WS client gets
  "non-101". Wire names are `WebDriver:NewSession` / `WebDriver:Navigate` /
  `WebDriver:ExecuteScript` / `WebDriver:TakeScreenshot`; `ExecuteScript`'s `script`
  param is a function **body** (the driver wraps it), responses are
  `[1, id, error, {value}]`. `tools/gate.cjs` is the reference client.
- **Game gotchas for automation:** the mission card blocks the world (`App.state===6`)
  until `#cardGo` is clicked — a fresh start shows it 700 ms in; mission *advances* show
  a card while state stays PLAY. Autosave writes every 20 s of game time in ALL states
   (main.js), and `advance()` saves immediately. Save key: `farside.anaximenes.v3`.

## Parking lot

Scope creep and new ideas go to `spec/IDEAS.md`, never into the current phase.
