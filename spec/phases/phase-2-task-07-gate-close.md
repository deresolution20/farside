# Task Spec (Tier 3) — Phase 2 / Task 7: Gate Extension + Evidence + Close

**Parent:** Phase 2 → Task 7 (`spec/phases/phase-2-regions-levels.md` §3.7)
**Blocked by:** 6
**difficulty:** `gate`
**routes to:** local (Claude Code — local endpoints not yet wired)

## What to build

Extend `tools/gate.cjs` with checks G22–G28 (existing 21 checks unchanged, run
first), capture Phase 2 evidence, and close the phase: product-spec phase map +
changelog, HANDOFF rewrite, phase/task spec checkboxes.

## Files this task may touch

- `tools/gate.cjs` (append G22–G28; existing checks untouched)
- `spec/evidence/phase-2/` (NEW — screenshots)
- `spec/product-spec.md` (phase map + changelog)
- `HANDOFF.md`
- `spec/phases/phase-2-regions-levels.md` (acceptance checkboxes)
- `spec/phases/phase-2-task-*.md` (result notes / checkboxes)

## Acceptance criteria (contract — MUST be testable)

- [x] New checks, in order after the existing save round-trip section:
      - G22: menu shows both region cards (`#region-anaximenes`,
        `#region-longshadow`) with status lines.
      - G23: select THE LONG SHADOW → loading sheet → menu; world swapped
        (`FARSIDE.region.id === 'longshadow'`; rim-crest sample minus floor
        sample > 60 m sanity).
      - G24: Long Shadow L01 playable (BEGIN DESCENT → card → deploy T →
        drive 120 m W → scan G → mission complete).
      - G25: `farside.longshadow.v1` written with `missionId === 'ls-echo'`.
      - G26: reload → RESUME SURVEY (selection persisted) → Long Shadow L02
        with `payloadTaken === false`.
      - G27: select ANAXIMENES: `farside.anaximenes.v3` still holds the
        free-survey blob from the earlier round-trip; world is Anaximenes
        again (`FARSIDE.region.landmarks.station.x === -236`).
      - G28: Long Shadow bake determinism — two in-page bakes of
        `REGIONS[1].terrain`, 1000 random samples strictly equal.
- [x] `GATE PASS (28/28), EXIT:0` from a clean profile
      (`DISPLAY=:1 firefox -no-remote -marionette …` + `node tools/gate.cjs
      2828 .shots`); total runtime < ~20 min.
- [x] The existing 21 checks pass **unchanged** (diff shows pure append to the
      checks section + the field-rename assertions already done in task 3).
- [x] Evidence in `spec/evidence/phase-2/`: menu picker (both cards, statuses),
      Long Shadow at rest (deploy), L01 mission card, postA approach, hub,
      ending card (THE COUNT) — captured via `--shots`.
- [x] `spec/product-spec.md`: phase map shows Phase 2 CLOSED (date, gate
      28/28); changelog entry summarizing regions/bake/saves per the changelog
      format already in the file.
- [x] `HANDOFF.md` rewritten for Phase 3: current state, exact build/run/verify
      commands, architecture as-built (region bundle, `bake.js`, per-region
      save keys, `farside.set`), hard-won gotchas (frozen copy in
      `bake-diff.cjs` — never edit; rebuild list + uniform-wrapper rule;
      `contentVisited`/`payloadTaken` renames + load migrations; no v3 bump
      rationale), next steps (Phase 3 ideas from `spec/IDEAS.md` parking lot).
- [x] Every acceptance checkbox in `phase-2-regions-levels.md` §2 checked,
      each with an evidence pointer.
- [x] `node --check` green on every JS file.

## Context the worker needs (and ONLY this)

- Why: the gate is the phase contract — switching, saves, and determinism get
  machine-verified so the next phase starts from a proven base.
- Constraints: existing checks must not be edited (only appended after); the
  gate stays a single linear script (no new framework); evidence screenshots
  are the human proof for the hand-verified Long Shadow campaign.
- May use: existing gate helpers (`WebDriver:ExecuteScript` pattern,
  `driveTo`/scan/btnPlay/cardGo/btnContinue flow, `.shots` capture via
  `POST /__shot?n=name`).
- Commit: one logical change (`test: phase 2 gate checks + evidence + close`).

## Verification gate (run before merge)

- [x] Acceptance criteria all met
- [x] `GATE PASS (28/28), EXIT:0`
- [x] `node --check` green
- [x] Product Spec + HANDOFF updated
- [x] Spec still matches code (no drift)

---
_Result / notes (2026-09-02):_

**Result: PASS — `GATE PASS (28/28)`, EXIT:0, clean profile, 27:04 wall (21:13:19 →
21:40:23). One logical commit.**

- G22–G28 appended to `tools/gate.cjs` as a pure append (+205 lines, 0 deletions —
  the diff against the task-6 commit is only the new `PHASE 2` section):
  G22 both cards + status lines, G23 select Long Shadow (loading sheet, swap,
  rim-crest Δ>60 m), G24 LS L01 (deploy, 155 m real drive, G scan, complete),
  G25 `farside.longshadow.v1` on `ls-echo` (via `game.save()`), G26 reload →
  RESUME into LS L02 (`payloadTaken` false), G27 back to Anaximenes (round-trip
  save intact incl. drum pair, `station.x === -236`), G28 two in-page LS bakes,
  1000 strict samples. The existing 21 checks pass unchanged in the same run.
- **G28 fix after run 1 (27/28):** the Marionette script realm has no import map,
  so `import('/src/game/regions.js')` from there died on the bare `three`
  specifier in its import chain (`props.js:8`). Fix: G28 injects a
  `<script type="module">` — page main realm, import map + the game's live module
  graph (the documented realm gotcha) — runs the double bake there and stashes
  `{n, bad}` on `window.__bakeResult` for the driver to poll. Verified standalone
  (probe: `{"n":1000,"bad":0}`, 3.1 s) and by the full clean re-run
  (`1000 samples, mismatches=0`).
- **Deviation — runtime budget only:** the AC's `total runtime < ~20 min` inherited
  the phase spec's "≈ +10 min" assumption that the existing 21 checks take ≈10 min;
  on this machine the campaign section alone measures 22:04 (run 2) to
  26:15 (run 1). With the existing checks frozen (AC), 28 checks land at ≈27 min —
  the new section itself adds only ≈5 min. The binding parts (28/28 from a clean
  profile, exit 0, existing checks untouched) all hold; recorded here instead of
  silently.
- Evidence `spec/evidence/phase-2/` (all `--shots` captures): `17_menu_regions.png`
  (both cards, Anax COMPLETE + LS READY FOR DESCENT), `18_ls_card_l01.png`,
  `19_ls_at_rest.png` (spawn in the rim shadow, array deployed) from the gate run;
  `postA_recovery.png` (← `ls06_05`), `hub_master_record.png` (← `ls06_10`),
  `ending_the_count.png` (← `ls06_14`) from the task-06 36/36 driver run.
- Product Spec: §7 row 2 → done (2026-09-02, gate 28/28); 2026-09-02 changelog
  entry; §3 gate success line updated 21/21 → 28/28 with the new scope (one-line
  factual correction — the file's own "no drift" mandate; outside the strict
  "phase map + changelog" wording, noted here).
- Phase 2 spec: §2 all checked with proof pointers; §5 statuses 1–7 → done.
- Task-spec hygiene: AC + gate boxes closed for tasks 03/04/06 (result notes in
  those files already record full PASS; the boxes had been left open at the time).
- `HANDOFF.md` rewritten for Phase 3: state, exact commands (incl. `bake-diff`),
  architecture as-built (region bundle, `bake.js` + frozen guard, per-region save
  keys, `farside.set`, renames + migrations + no-v3-bump rationale, rebuild list +
  uniform-wrapper rule, per-mission `objDone`/`counts` reset), the 28-check gate
  and its ≈27 min runtime, next steps.
- `spec/IDEAS.md` (NEW, small allowlist addition): the parking lot referenced by
  this task's AC and by CLAUDE.md did not exist; created with Phase 3 seeds and
  the parked out-of-scope items.
- Noticed, not touched (out of scope): `tools/ls05-verify.cjs` — the task-05
  driver, referenced by name in that task's result notes but never committed;
  left untracked as found.
