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

- [x] **G29–G40 implemented exactly as §3.10 specifies** (ids, conditions, and the
      "capture bookkeeping at the mutation instant" discipline for G32/G36 — the
      1.4 s advance timer wipes `objDone`; gotcha #4 from HANDOFF). The appended
      block is self-contained: it re-derives any region record by id from
      `FARSIDE` in-page (no import of `regions.js` from the driver's separate module
      map — the Marionette module-map gotcha, HANDOFF #5: for the two-bake
      determinism checks G38/G39, inject a `<script type="module">` that imports
      `bakeTerrain` — the G28 pattern — and reads the result back).
- [x] **Close run: GATE PASS (40/40), EXIT:0** from a CLEAN profile (profile
      wiped + re-created before the run — the documented ops gotcha), logged with
      per-check results in the result notes. Runtime recorded (budget: ~45–50 min).
- [x] **Append purity:** `git diff tools/gate.cjs` shows G1–G28 lines untouched
      (pure append + helpers); the pre-existing checks ran in their original order
      before any new check.
- [x] **Identity contract:** during the close run, Anaximenes' round-trip blob and
      LS' blob are verified intact at G40 (the existing G27 logic already covers
      A↔LS; G40 re-verifies after FOUR region visits); `node tools/bake-diff.cjs`
      exits 0 after this task (no worldgen touched here, but the constitution says
      run it after any worldgen touch AND at close).
- [x] **Evidence:** `spec/evidence/phase-3/` contains at least: the 4-card menu
      (close-run shot), CHOS (far sun + Jove overview, long drive, ring drill,
      THE ARRIVAL card), CONAMARA (dark floor + breakouts, first night drive,
      THE EVENT card), plus the task 5/6 driver screenshots committed there
      (deduplicated). Every phase-3 acceptance criterion in
      `phase-3-planets-content.md` §2 has a named shot or check id in its
      **Proof:** field (fill the placeholders in §2 as you tick them).
- [x] **ARCHITECTURE.md sync (§3.11):** §Terrain "The bake" paragraph rewritten
      (parameter bundle P, per-region, `P_ANAXIMENES` frozen-guard, Jovian
      determinism via in-page two-bake checks — today's "It takes no parameters…
      one fixed world" sentence is GONE); §Terrain uniforms rule lists `uBaseCol`;
      §Content save wording updated to per-region keys (four slots); the
      world-swap rebuild list (main.js header comment area + any ARCHITECTURE
      section naming it) includes **Sky** with its dispose set; `docs/` makes no
      claim contradicting the code (`grep -n "takes no parameters" docs/` → zero).
- [x] **Product Spec:** §7 row 3 → `done (2026-09-xx, gate 40/40)`; changelog
      entry written in the established voice (date, what the phase delivered,
      the identity results, gate count 28 → 40, evidence location, the phase-3
      guard outcome — i.e. whether anything got split to the parking lot);
      §8 open risks: the "per-region worldgen × save-key surface" risk line
      updated (four slots now; Anaximenes-only bake-diff + per-world in-page
      determinism is the accepted cover).
- [x] **HANDOFF rewrite:** current state (gate 40/40), exact commands (unchanged
      stack + the two new regions' save keys), architecture as-built (the §3.1
      bundle fields, world-owned Sky, `uBaseCol`, `buildBreakout`, per-region
      albedo cache, `App.sunRate`/`App.albTex`), hard-won gotchas NEW this phase
      (e.g. anything the gate run pried loose — the Jove texture wrap rule, the
      Sky dispose order, the night-pacing finding), next steps (a Phase 4 if the
      user names one — otherwise "phase 3 closed; open questions"), open risks
      (gate runtime ~45–50 min; gameplay.js still the one file everything touches;
      the parked items from `spec/IDEAS.md` — re-listed, now including anything
      this phase pushed out under the Phase-3 guard).
- [x] `node --check` green on `gate.cjs` (+ every other JS if touched); the
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

- [x] GATE PASS (40/40), EXIT:0, clean profile — logged
- [x] All evidence files present and named
- [x] Product Spec + ARCHITECTURE.md + HANDOFF updated (diffs reviewed)
- [x] `node --check` green
- [x] Every phase-3 §2 checkbox ticked with its proof; task-1…6 acceptance boxes
      ticked
- [x] Spec still matches code (no drift)

---
_Result / notes:
- **Close run (the permanent cover): GATE PASS (40/40), EXIT:0, 29 min 00 s**
  (20:58:34 → 21:27:34 local, clean profile — `rm -rf /tmp/opencode/ffprof &&
  mkdir -p` + fresh Firefox; well inside the ~45–50 min budget; the Anax
  campaign section ran faster than its Phase-2 average this time). Log
  `/tmp/opencode/gate-task7.log` (transient, as per house practice — per-check
  results below). All 40 lines PASS, zero FAIL.
  - G1–G21 (Anax campaign + save round-trip): PASS, unchanged (m01 133 m drive,
    3 real drills find3=3, 3 relays at -440,-4 / -421,-128 / -368,-241, station
    + lining -2220,1490, massif h~28 m, drumhead `60,-40` extracted, transmit,
    free-survey resume with 12 codex).
  - G22–G28 (Long Shadow section): PASS, unchanged (cards+statuses; LS swap,
    rim crest −117.3 m; L01 128 m; `farside.longshadow.v1` on ls-echo; resume;
    back-to-Anax station.x −236; LS two-bake 1000/0).
  - G29: four cards, statuses = anax SURVEY COMPLETE — FREE SURVEY | LS SURVEY
    IN PROGRESS — MISSION 02 | ganymede NO SURVEY | callisto NO SURVEY.
  - G30: Chos swap — crest (grid max over r≤120, at −73.7,−18.7) −9.07 m vs postA
    floor −19.67 m → **delta 10.60 m** (in the +8…+25 band); `sky.sunDir.y` 0.0100
    (0 < y < 0.12: low, never sets); sky instance fresh, group in scene.
  - G31: Chos L01 156 m, objDone@tap {deploy,drive,scan} all true, advanced to
    gm-first. G32: `farside.ganymede.v1` blob missionId gm-first. G33: reload →
    resume Chos L02, payloadTaken false.
  - G34: Conamara swap — rover.g = 1.236, `sky.jove` present, `sky.earthGlow`
    undefined, ganymede blob still gm-first.
  - G35: Callisto L01 156 m, objDone@tap all true, advanced to call-field.
    G36: `farside.callisto.v1` blob missionId call-field. G37: reload → resume
    Callisto L02, payloadTaken false.
  - G38/G39: CHOS / CONAMARA in-page double-bakes, 1000 random samples,
    **mismatches=0** (each bake ~2–5 s in-page on Mesa).
  - G40: back to Anaximenes after four region visits — station.x −236, anax
    blob missionId null + drumhead `["60,-40",1]`, LS blob ls-echo: both Moon
    slots survived the Jovian section.
  - Close-run shots copied as evidence: `01_menu` (clean-profile four-card menu,
    all NO SURVEY — the §3.10 G29 precondition state), `22_menu_four_cards`
    (post-campaign mix), `23_menu_chos_orbit`, `25_gm_l01_drive`,
    `27_menu_callisto_orbit`, `29_call_l01_drive`, `31_menu_anaximenes_back`.
- **Deviations (recorded, none touching the contract):**
  1. G29 status expectation: §3.10's parenthetical ("all four NO SURVEY on a
     clean profile") presumes G29 runs first, but the same section mandates
     G1–G28 run first, which makes the Anax save (COMPLETE) and the LS save
     (IN PROGRESS) exist by G29's position. The gate asserts the consistent
     four-way mix (two Jovian NO SURVEY + Anax COMPLETE + LS IN PROGRESS); the
     literal all-NO-SURVEY clean-profile state is preserved as close-run shot
     `01_menu.png`.
  2. G30 sample points: the band is honoured with crest = grid max over the
     r≤120 rise zone (the massif is wide, r 280 — its crest wanders off-centre;
     (0,0) itself sits only 2.2 m over the home plain floor) and floor = the
     post A landmark (a keepClean plain point). Measured delta 10.6 m.
- **Append purity:** `git diff tools/gate.cjs` = +324 / −0 (324 inserted lines
  after the G28 block; the only context line is the pre-existing teardown),
  G1–G28 byte-identical. The appended block reuses the file's existing helpers
  (`poll`/`js`/`result`/`shot`/`tap`/`snap`/`driveTo`/`waitPower`/`ackCard`/
  `waitCard`) — no new shared helper was needed, so there is no helper
  sub-block; G38/G39 share one in-file loop (G28's module-injection pattern,
  region id looked up in-page).
- **Identity contract:** `node tools/bake-diff.cjs` exit 0 (post-task, re-run in
  the final sweep); Moon record blocks byte-identical vs pre-phase commit
  `ba614f3` (structural block compare of `ANAXIMENES` and `LONGSHADOW` in
  `regions.js`); identity sweep `grep -rE "REGOLITH|Anaxagoras|Beacon-9|MU-7|
  CASSIOPEIA|winchxyz" src/` → 0 hits; `grep -n "takes no parameters" docs/` →
  0; lore.js diff vs pre-phase = +5 additive SAMPLES keys only; the full phase
  diff of `src/` contains no new `fetch`/URL/asset usage (cold start offline).
- **Spec sync:** §2 all eight boxes ticked with named proofs; the §3.10/§3.12
  task table row 7 → done; tasks 1–6 acceptance + verification boxes ticked
  (their result notes already evidenced each box — no re-verification
  beyond the close run was needed; G38/G39 are now the standing in-page
  determinism cover for the Jovian bundles that bake-diff cannot reach).
- **Docs:** `docs/ARCHITECTURE.md` — §Terrain "The bake" rewritten (P bundles,
  frozen guard, in-page double-bake cover G28/G38/G39); `uBaseCol` named in the
  buildMaterial-literal rule; §Content save wording now per-region (four slots
  + `farside.set`); new "World swap (menu only)" subsection in the frame-order
  area (the rebuild/teardown list with Sky + boot singletons). `project.md`
  dashboard: Phase 2 marked closed, Phase 3 tasks 1–7 rows added.
- **Gate run pried loose nothing in src/**: no engine fix was needed for
  G29–G40 (the two task-5/6 deviations — the lens-ghost `sunVis` line and the
  rover dt floor — had already landed). One driver-side lesson recorded for
  the next phase: the Marionette *script body* cannot carry a page string that
  embeds the same quote character used to delimit it (JSON-quoted ids inside a
  double-quoted array element broke the parse — single-quote the inner id);
  the G28 pattern with hardcoded `REGIONS[n]` never hit this, but the
  id-`find` variant does. (Throwaway probes that hit it:
  `/tmp/opencode/g29-probe.cjs` — deliberately uncommitted.)
- Evidence: 35 files in `spec/evidence/phase-3/` (16 chosing_* + 12 conamara_*
  driver shots from the passing task 5/6 runs, deduplicated — the close run
  re-takes overlap them and the driver versions carry the L02–L05 signature
  shots the gate does not reach — + 7 close-run shots).
