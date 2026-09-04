# Task Spec (Tier 3) — Phase 3 / Task 7: Gate G29–G40, Evidence, Close

**Parent:** Phase 3 → Task 7 (`spec/phases/phase-3-planets-content.md` §3.10, §3.11)
**Blocked by:** 6
**difficulty:** `gate`
**routes to:** frontier (gate = review/verify per routing policy)

## What to build

Extend `tools/gate.cjs` **append-only** with G29–G40 (phase spec §3.10), collect the
evidence set for `spec/evidence/phase-3/`, sync `docs/ARCHITECTURE.md` (the stale
Phase-2 drift + the new Sky/uBaseCol facts, §3.11), update the Product Spec (§7 row 3
→ done + changelog entry) and rewrite `HANDOFF.md` for the next session. The existing
G1–G28 flow must run first, unchanged, in the same file — the diff of `gate.cjs` is a
pure append (plus helper functions if the new checks need shared helpers, which stay
below the append boundary like G22–G28 did).

## Files this task may touch

- `tools/gate.cjs` (append G29–G40 + helpers)
- `spec/evidence/phase-3/` (screenshots from the close run + the task 5/6 driver
  screenshots folded in)
- `docs/ARCHITECTURE.md` (§3.11 sync)
- `spec/product-spec.md` (§7 row 3 + changelog)
- `HANDOFF.md` (rewrite for the next session)
- `spec/phases/phase-3-task-07-gate-close.md` (result notes only)
- `spec/phases/phase-3-*.md` acceptance checkboxes (tick as verified)

## Acceptance criteria (contract — MUST be testable)

- [ ] **G29–G40 implemented exactly as §3.10 specifies** (ids, conditions, and the
      "capture bookkeeping at the mutation instant" discipline for G32/G36 — the
      1.4 s advance timer wipes `objDone`; gotcha #4 from HANDOFF). The appended
      block is self-contained: it re-derives any region record by id from
      `FARSIDE` in-page (no import of `regions.js` from the driver's separate module
      map — the Marionette module-map gotcha, HANDOFF #5: for the two-bake
      determinism checks G38/G39, inject a `<script type="module">` that imports
      `bakeTerrain` — the G28 pattern — and reads the result back).
- [ ] **Close run: GATE PASS (40/40), EXIT:0** from a CLEAN profile (profile
      wiped + re-created before the run — the documented ops gotcha), logged with
      per-check results in the result notes. Runtime recorded (budget: ~45–50 min).
- [ ] **Append purity:** `git diff tools/gate.cjs` shows G1–G28 lines untouched
      (pure append + helpers); the pre-existing checks ran in their original order
      before any new check.
- [ ] **Identity contract:** during the close run, Anaximenes' round-trip blob and
      LS' blob are verified intact at G40 (the existing G27 logic already covers
      A↔LS; G40 re-verifies after FOUR region visits); `node tools/bake-diff.cjs`
      exits 0 after this task (no worldgen touched here, but the constitution says
      run it after any worldgen touch AND at close).
- [ ] **Evidence:** `spec/evidence/phase-3/` contains at least: the 4-card menu
      (close-run shot), CHOS (far sun + Jove overview, long drive, ring drill,
      THE ARRIVAL card), CONAMARA (dark floor + breakouts, first night drive,
      THE EVENT card), plus the task 5/6 driver screenshots committed there
      (deduplicated). Every phase-3 acceptance criterion in
      `phase-3-planets-content.md` §2 has a named shot or check id in its
      **Proof:** field (fill the placeholders in §2 as you tick them).
- [ ] **ARCHITECTURE.md sync (§3.11):** §Terrain "The bake" paragraph rewritten
      (parameter bundle P, per-region, `P_ANAXIMENES` frozen-guard, Jovian
      determinism via in-page two-bake checks — today's "It takes no parameters…
      one fixed world" sentence is GONE); §Terrain uniforms rule lists `uBaseCol`;
      §Content save wording updated to per-region keys (four slots); the
      world-swap rebuild list (main.js header comment area + any ARCHITECTURE
      section naming it) includes **Sky** with its dispose set; `docs/` makes no
      claim contradicting the code (`grep -n "takes no parameters" docs/` → zero).
- [ ] **Product Spec:** §7 row 3 → `done (2026-09-xx, gate 40/40)`; changelog
      entry written in the established voice (date, what the phase delivered,
      the identity results, gate count 28 → 40, evidence location, the phase-3
      guard outcome — i.e. whether anything got split to the parking lot);
      §8 open risks: the "per-region worldgen × save-key surface" risk line
      updated (four slots now; Anaximenes-only bake-diff + per-world in-page
      determinism is the accepted cover).
- [ ] **HANDOFF rewrite:** current state (gate 40/40), exact commands (unchanged
      stack + the two new regions' save keys), architecture as-built (the §3.1
      bundle fields, world-owned Sky, `uBaseCol`, `buildBreakout`, per-region
      albedo cache, `App.sunRate`/`App.albTex`), hard-won gotchas NEW this phase
      (e.g. anything the gate run pried loose — the Jove texture wrap rule, the
      Sky dispose order, the night-pacing finding), next steps (a Phase 4 if the
      user names one — otherwise "phase 3 closed; open questions"), open risks
      (gate runtime ~45–50 min; gameplay.js still the one file everything touches;
      the parked items from `spec/IDEAS.md` — re-listed, now including anything
      this phase pushed out under the Phase-3 guard).
- [ ] `node --check` green on `gate.cjs` (+ every other JS if touched); the
      identity sweep over `src/` still zero hits.

## Context the worker needs (and ONLY this)

- Why: the phase closes on evidence, not vibes. The gate is the Definition of Done
  (constitution): 40/40 exit 0 from a clean profile, screenshots matching claims,
  spec updated. This task also carries the documentation debt:
  ARCHITECTURE.md is stale from Phase 2 (the bake paragraph) and must absorb
  Phase 3's new invariants in the same commit discipline the phase demands.
- Constraints (constitution): the gate file is TEST INFRASTRUCTURE — its
  transport (raw-TCP length-prefixed JSON, BYTE length, `N:<json>`, wire names
  `WebDriver:*`, function-body scripts, separate module map) never changes;
  helpers mirror existing gate code style; one logical change per commit is the
  house rule — this task's commits: `test: gate G29–G40 (Jovian worlds)`,
  `docs: ARCHITECTURE.md sync + product spec changelog`, `docs: HANDOFF rewrite
  for post-Phase-3` (three commits, in that order).
- May use: `tools/gate.cjs` G22–G28 as the append template (the Long Shadow
  section is the structural sibling of G29–G40); the task 5/6 result notes for
  the measured timings (for the runtime budget) and their drivers (NOT committed
  — the task-7 gate is the permanent cover); HANDOFF.md's current gotcha list
  (inherited, not restated from scratch — keep the good ones, add new ones).
- Budget note: the full gate is ~45–50 min; do NOT re-run it reflexively for
  doc-only fixes — a targeted in-page check (server + one Firefox) covers those.

## Verification gate (run before merge)

- [ ] GATE PASS (40/40), EXIT:0, clean profile — logged
- [ ] All evidence files present and named
- [ ] Product Spec + ARCHITECTURE.md + HANDOFF updated (diffs reviewed)
- [ ] `node --check` green
- [ ] Every phase-3 §2 checkbox ticked with its proof; task-1…6 acceptance boxes
      ticked
- [ ] Spec still matches code (no drift)

---
_Result / notes:_
