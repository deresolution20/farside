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

- [ ] New checks, in order after the existing save round-trip section:
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
- [ ] `GATE PASS (28/28), EXIT:0` from a clean profile
      (`DISPLAY=:1 firefox -no-remote -marionette …` + `node tools/gate.cjs
      2828 .shots`); total runtime < ~20 min.
- [ ] The existing 21 checks pass **unchanged** (diff shows pure append to the
      checks section + the field-rename assertions already done in task 3).
- [ ] Evidence in `spec/evidence/phase-2/`: menu picker (both cards, statuses),
      Long Shadow at rest (deploy), L01 mission card, postA approach, hub,
      ending card (THE COUNT) — captured via `--shots`.
- [ ] `spec/product-spec.md`: phase map shows Phase 2 CLOSED (date, gate
      28/28); changelog entry summarizing regions/bake/saves per the changelog
      format already in the file.
- [ ] `HANDOFF.md` rewritten for Phase 3: current state, exact build/run/verify
      commands, architecture as-built (region bundle, `bake.js`, per-region
      save keys, `farside.set`), hard-won gotchas (frozen copy in
      `bake-diff.cjs` — never edit; rebuild list + uniform-wrapper rule;
      `contentVisited`/`payloadTaken` renames + load migrations; no v3 bump
      rationale), next steps (Phase 3 ideas from `spec/IDEAS.md` parking lot).
- [ ] Every acceptance checkbox in `phase-2-regions-levels.md` §2 checked,
      each with an evidence pointer.
- [ ] `node --check` green on every JS file.

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

- [ ] Acceptance criteria all met
- [ ] `GATE PASS (28/28), EXIT:0`
- [ ] `node --check` green
- [ ] Product Spec + HANDOFF updated
- [ ] Spec still matches code (no drift)

---
_Result / notes:_
