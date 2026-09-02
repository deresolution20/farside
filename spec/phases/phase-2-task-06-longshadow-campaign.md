# Task Spec (Tier 3) — Phase 2 / Task 6: Long Shadow Campaign

**Parent:** Phase 2 → Task 6 (`spec/phases/phase-2-regions-levels.md` §3.6)
**Blocked by:** 5
**difficulty:** `easy`
**routes to:** local (Claude Code — local endpoints not yet wired)

## What to build

Complete the Long Shadow campaign in `regions.js`: missions L02–L05 + the
`THE COUNT` ending card + the 6 codex entries (L01 + `ls-brief`/`ls-memo`
already exist from tasks 2/4). Add the two new `SAMPLES` (`cable`, `core`) to
`lore.js` (additive only).

## Files this task may touch

- `src/game/regions.js` (Long Shadow missions/codex/ending only)
- `src/game/lore.js` (SAMPLES additions only)
- `spec/phases/phase-2-task-06-longshadow-campaign.md` (result notes only)

## Acceptance criteria (contract — MUST be testable)

- [ ] Long Shadow `missions` has exactly 5, in order: `ls-arrival` (L01 from
      task 2), `ls-echo`, `ls-quiet`, `ls-silence`, `ls-count`, with the
      objective records exactly as §3.6 (ids, tags, names, briefs, objective
      lists incl. `special`/`unlocks`/`unlock` fields).
- [ ] Long Shadow `codex` has exactly 6 entries: `ls-brief` (`start: true`),
      `ls-memo` (`start: true`), `ls-posta`, `ls-postb`, `ls-hub`, `ls-count`;
      each `desc`/`unlock` text per §3.6 (short prose, in-universe).
- [ ] Long Shadow `ending` = THE COUNT card (tag/name/brief per §3.6).
- [ ] `lore.js` `SAMPLES` gains `cable` (GEOPHONE CABLE, rare, value 4,
      `unlock: 'ls-posta'`) and `core` (MEMORY CORE, rare, value 8,
      `unlock: 'ls-hub'`); every pre-existing `SAMPLES` entry is
      byte-identical (`git diff` shows additions only).
- [ ] Anaximenes `MISSIONS`/`CODEX`/`ENDING_CARD` in `lore.js` byte-identical.
- [ ] Full manual playthrough (fresh profile, Long Shadow): L01 → L02 (postA:
      reach, hold-E record, cable sample) → L03 (postB: reach, record, 3
      samples) → L04 (hub: reach, master record, core deep-extract) → L05
      (breach, transmit at sled with core in bay) → ending card `THE COUNT` →
      free survey. All 6 codex entries unlocked by the end (in-page check on
      the game's codex set). `farside.longshadow.v1` ends with
      `missionId: null`.
- [ ] L04 gating behaves per the drumhead pattern: the hub content prompt stays
      visible until the record AND the extract are both done; after the last
      one, the content closes and the core is gone from the field.
- [ ] Anaximenes campaign unchanged: gate green (21/21).
- [ ] `node --check` green.

## Context the worker needs (and ONLY this)

- Why: narrative completion — the world from task 5 gets its story arc.
- Constraints: objective DSL is Phase 1's kinds only (`deploy/drive/reach/
  scan/sample/count/extract/station-interact/transmit` + `distance` + `unlocks`/
  `unlock` fields); no new DSL kinds; Anaximenes lore is untouched (the whole
  point of additive `lore.js`); L05's transmit needs the core extracted in L04
  (bay carry + sled offload → transmit fires, `payloadTaken` from task 3).
- May use: `regions.js` bundle shape; `lore.js` entry shapes; `unlocks` (gates
  the content/anomaly until both objectives done) and `unlock` (fires on
  objective completion, task 3) semantics.
- Commit: one logical change (`feat: Long Shadow campaign L02–L05 + ending`).

## Verification gate (run before merge)

- [ ] Acceptance criteria all met
- [ ] Full Long Shadow playthrough verified with screenshots
- [ ] Gate green (21/21)
- [ ] `node --check` green
- [ ] Spec still matches code (no drift)

---
_Result / notes:_
