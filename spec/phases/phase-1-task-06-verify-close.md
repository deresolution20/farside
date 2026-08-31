# Task Spec (Tier 3) — Phase 1 / Task 6: Verify Slice End-to-End (GATE)

**Parent:** Phase 1 → Task 6
**Blocked by:** 5
**difficulty:** `gate`
**routes to:** frontier (review/verify)

## What to build

No code. Run the full verification gate, collect evidence, prove the phase acceptance
criteria, and close the phase (product spec phase map + changelog, HANDOFF rewrite).

## Files this task may touch

- `spec/evidence/` (copy final screenshots from `.shots/`)
- `spec/product-spec.md` (phase map row 1 → done, changelog entry)
- `spec/phases/phase-1-*.md` (task status columns → done, `_Result / notes:` filled)
- `HANDOFF.md` (rewrite for the next session)
- `docs/ARCHITECTURE.md` **only if** as-built reality drifted from its §Content
  description (e.g. the "nine objective ids" paragraph is now stale) — keep the edit
  minimal and factual.

## Acceptance criteria (contract — MUST be testable)

- [ ] `node --check` green on every file in `src/`, `vendor/three/`, `server.js`.
- [ ] `node tools/gate.cjs 2828 .shots` exit 0, full playthrough, from a **clean
      browser profile** (fresh `/tmp/ffprof`, no leftover localStorage).
- [ ] Evidence screenshots copied to `spec/evidence/` and each matches the claim it
      evidences (menu, per-mission cards, station, massif, drumhead drill, ending, resumed).
- [ ] Every phase acceptance criterion in `phase-1-data-missions.md` §2 checked off with
      the command/observation that proves it (grep results, in-page probes, gate output).
- [ ] Insertion test: with a throwaway 6th mission appended to `MISSIONS` (console
      eval, not committed), missions 01–05 still complete identically and the 6th card
      shows after m05 — then reload to restore state. Proves "new mission addable as
      pure data".
- [ ] `git status` clean of unintended files; commits follow `<type>: <imperative>`
      with one logical change each (expected: ~5 commits — one per task 1–5, this task
      adds a `spec:` commit).
- [ ] Product Spec: phase map row 1 status `done`; changelog entry dated 2026-08-28
      (or actual close date) describing the DSL, the v3 save, and the extended gate.
- [ ] HANDOFF.md rewritten: where-we-are (Phase 1 closed), exact commands (same as
      before — server 8080 --shots, headful Firefox, `node tools/gate.cjs 2828 .shots`),
      architecture as-built (missionId, emit/checkState, tagOpen/anomalyOpen,
      objectiveTargets, save v3 shape), updated gotchas (what the gate's driving loop
      needed; anything new learned), next steps (Phase 2 kickoff: deep-plan
      `spec/phases/phase-2-*.md`).

## Context the worker needs (and ONLY this)

- Why: "looks good" is not a contract; the phase closes on evidence.
- Commands (verified): syntax loop over `src vendor server.js`; `node server.js 8080
  --shots &`; `DISPLAY=:1 firefox -no-remote -marionette -profile /tmp/ffprof -width
  1280 -height 800 &`; `node tools/gate.cjs 2828 .shots`.
- Port 5173 and the user's own Firefox pid are **never** killed. Test browser uses
  profile `/tmp/ffprof`, marionette 2828.
- The gate is headful-only (Mesa WebGL2 on :1) — no CI.

## Verification gate (run before merge)

- [ ] Acceptance criteria all met
- [ ] Evidence in `spec/evidence/`
- [ ] Product Spec + HANDOFF updated
- [ ] Spec still matches code (no drift)

---
_Result / notes:_
- `node --check` green on all of `src/` + `vendor/three/` + `server.js`
  (30 files, 0 failures).
- Gate from a **clean** browser profile (fresh test profile, no leftover
  localStorage): `GATE PASS (21/21)`, `EXIT:0`. The lining step is now verified
  `taken=true` (run 5's `11 codex` false-PASS is gone); resume reads 12 codex with
  `missionId:null` and the drumhead kept.
- Evidence: 16 screenshots in `spec/evidence/phase-1/` (the phase-0 set is
  preserved at the top level of `spec/evidence/`).
- Insertion test: a throwaway 6th mission injected into the page's live `MISSIONS`
  (main-realm `<script type="module">`, not committed) → the game's own `mission`
  getter sees it and `advance()` from a completed m05 shows the 6th card
  (`MISSION 06`, `freeRoam:false`); reload restores 5. m01–05 unchanged.
  **Gotcha:** marionette's `ExecuteScript` runs in a *separate* JS module map, so a
  dynamic `import()` there loads a duplicate `lore.js`; only a DOM-injected module
  script shares the game's module graph.
- `docs/ARCHITECTURE.md` §Content updated (the "nine objective ids" and
  "positional anomaly saves" paragraphs were stale); `product-spec.md` phase map
  row 1 → done + changelog; `HANDOFF.md` rewritten for Phase 2 kickoff.
