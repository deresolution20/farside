# Constitution — regolith

> Immutable project principles the agents must obey in **every** session and **every**
> task. Keep it short — it is prepended to agent context often, so bloat here causes
> context rot.

## Stack & tooling
- Language: plain browser JavaScript (ES modules), no TypeScript, no build step
- Rendering: WebGL2 via **vendored three.js r160** (`vendor/three/`) — the only runtime dependency
- Server: `node server.js [port] [--shots]` — zero-dependency static server (Node ≥ 18)
- Tests: none in-repo; verification is `node --check` over all JS + the headless gate
  (`tools/gate.cjs`, see "Verification gate" below)
- Target machine: Linux x86-64, X11 :1 (headful Firefox for the gate), Mesa WebGL2
- No npm install, no bundler, no package.json scripts to maintain beyond the server

## Verification gate (the Definition of Done)
A change is "done" only when ALL of:
- [ ] `node --check` passes on every `src/*.js`, `vendor/three/*.js`, `server.js`
- [ ] The gate passes: `node server.js 8080 --shots`, then `node tools/gate.cjs 2828 .shots`
      with Firefox running `firefox -no-remote -marionette -profile <prof>` (see HANDOFF.md)
- [ ] Screenshot evidence lands in `spec/evidence/` and matches the claim
- [ ] Product Spec updated if behavior changed

## Non-negotiable rules
- [ ] No task may touch files outside the ones listed in its Task Spec.
- [ ] **Zero runtime assets.** Everything (terrain, props, textures, audio, UI) is
      generated in code at startup. `vendor/three/` is the only vendored code, committed.
- [ ] **The CPU/GPU heightfield contract** (`docs/ARCHITECTURE.md` §The contract):
      `terrain.heightAt` and the shader's `terrainH` must compute the same number.
      Change both in the same commit. Read that doc before touching terrain/rover/render.
- [ ] **Save compatibility:** anomaly state saves positionally — any change to anomaly
      generation, terrain filters, or their order must bump the `KEY` in `src/core/save.js`
      in the same commit (old saves silently point at wrong objects).
- [ ] **Determinism:** worldgen must stay reproducible (no `Math.random` in worldgen
      paths without an injected seed).
- [ ] The game must run fully offline from a cold start: open the page, no network.
- [ ] Keep `saveFrame()` immediately after `engine.render(dt)` and never insert a
      `resize()` between them (docs/ARCHITECTURE.md §Rendering).
- [ ] One logical change per commit. Commit style: `<type>: <imperative summary>`,
      type ∈ {feat, fix, perf, refactor, test, spec, build, docs}.

## Conventions
- JS style: `camelCase` variables/functions, `PascalCase` classes, `UPPER_SNAKE` module
  constants, single quotes, no semicolon-less heroics — match the surrounding file.
- Folder layout: `src/core` (clock, input, save, audio), `src/world` (terrain, props, sky,
  dust), `src/game` (gameplay, rover, lore), `src/ui` (hud, panels), `src/engine` (composer,
  quality), `src/main.js` (frame order). `docs/ARCHITECTURE.md` is the source of truth for
  invariants.
- Lore is canonical in `src/game/lore.js` — do not drift from it (see Product Spec §6).

## Routing policy (local-first)
- Default to the local worker matching the task's `difficulty` tag.
- Frontier/cloud is reserved for `gate` (review/verify) and `hard` tasks only.
- Never send secrets/PII to cloud models; those tasks are `local-only`.
