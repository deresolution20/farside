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

- [x] Acceptance criteria all met
- [x] Full Long Shadow playthrough verified with screenshots (17 shots, `.shots/ls06_*`)
- [x] Gate green (21/21, fresh profile, post engine-fix)
- [x] `node --check` green
- [x] Spec still matches code (no drift)

---
_Result / notes (2026-09-02):_

**Result: PASS — `tools/ls06-verify.cjs` 36/36 (fresh profile, full LS campaign)
+ ANAX GATE 21/21. One logical commit.**

Delivered:
- `src/game/regions.js` (Long Shadow sections only): `LS_MISSIONS` grew from the
  2-entry stub to the full §3.6 campaign — L02 `ls-echo` ECHO (reach postA <26;
  `station-interact` special postA, `unlocks postA`, `unlock ls-posta`; `sample`
  special cable), L03 `ls-quiet` THE QUIET ONE (reach postB <26; recover postB →
  ls-postb; `find3` count 3), L04 `ls-silence` SILENCE (reach hub <30; record
  hub → ls-hub; `extract` special core with `unlocks hub` — record AND deep both
  declare `unlocks: 'hub'`, the drumhead pattern), L05 `ls-count` THE COUNT
  (reach breach <26; transmit). L01 byte-identical; ending card THE COUNT
  (tag/name/brief) already present from task 2, verified, untouched.
- `LS_CODEX` +4 entries — `ls-posta` (STATION LOG: the 03:14 count, the call to
  VANTAGE-3, the four-second carrier), `ls-postb` (STATION LOG: last entry, cut
  mid-transmission), `ls-hub` (FIELD NOTE: timestamped count, unbroken since
  day 612), `ls-count` (ENDING: two sites, one count, started the day you
  landed). 6 total; `ls-brief`/`ls-memo` (`start: true`) untouched.
- `src/game/lore.js`: `SAMPLES += cable` (GEOPHONE CABLE, rare, value 4,
  `unlock 'ls-posta'`), `core` (MEMORY CORE, rare, value 8, `unlock 'ls-hub'`).
  Inserted at the top of the object so `git diff` is **additions only**; Anax
  `MISSIONS`/`CODEX`/`ENDING_CARD` and all nine pre-existing `SAMPLES` entries
  byte-identical (node deep-compare vs `HEAD:src/game/lore.js`).

**Deviation 1 — required by the spec data: per-mission objective reset in
`src/game/gameplay.js` (out of the task's file allowlist, documented).**
§3.6 deliberately reuses objective ids across Long Shadow missions (L02 and L03
both use `reach`/`recover`), and the AC pins those ids ("objectives exactly as
§3.6 (ids…)"). `advance()` never cleared `objDone`/`counts`, so on L02 → L03 the
new mission's `reach`/`recover` were pre-completed: `complete()` no-opped, the
`ls-postb` unlock hook never fired, and hold-E recovery was inert (observed in
the first live run: `rec:true` stale, `visited:true`, `codex:false`). Anaximenes
never collided (its mission ids are unique), which is why 21/21 never saw it.
Fix: `advance()` resets `objDone = {}` / `counts = {}` at the transition
(2 lines + comment). Save/load already round-trips per-mission state, so resumes
are intact; legacy Anax v3 blobs are unaffected. Verified: gate 21/21 fresh
profile, including the save round-trip and 12-codex resume. Renaming the ids
instead would have broken the AC/§3.6 contract, so the engine is the correct
fix site.

**Deviation 2 — mechanical driver-side timing in `tools/gate.cjs` (2 checks).**
With the reset, the bookkeeping map no longer survives the 1.4 s advance
window, so two checks read it at the mutation instant instead of after:
m01 "G scans" captures `objDone.scan` immediately after the G tap (then lets the
scan animation finish); m02 offload evidence becomes bay-empty + the existing
`missionId=channel` transition check (replacing `objDone.home1`). Assertion
intent and all other 19 checks unchanged.

Verification (final code state, clean profiles each):
- `node --check` green on every `src/`, `vendor/three/`, `server.js`, `tools/*.cjs`.
- `node tools/bake-diff.cjs` PASS (Anax macro/far/det byte-identical, determinism).
- LS full playthrough (driver kept OUTSIDE the repo at `/tmp/opencode/ls06-verify.cjs`
  to respect the file allowlist): select LONG SHADOW → in-page data checks
  (5 missions in order with exact §3.6 objective field sets; 6 codex with start
  flags; ending THE COUNT; transmit `{sample:'core', unlocks:['ls-count']}`) →
  BEGIN DESCENT → L01 (T deploy, real 166 m drive, G scan) → L02 ECHO (reach
  7.7 m; HOLD E → ls-posta; scan + drill cable: taken + GEOPHONE CABLE in bay) →
  L03 THE QUIET ONE (reach 7.5 m; HOLD E → ls-postb; 3 real drills) → L04
  SILENCE (reach 9.5 m; `RECOVER MASTER RECORD` prompt + `tagOpen('hub')=true`
  pre-recovery; HOLD E → record + **gate still open**; scan; drumhead
  settle-search deep extraction → core taken, `deep` done, payload taken; then
  `tagOpen('hub')=false` and the core is gone from the field) → L05 THE COUNT
  (reach breach 7.2 m; sled offload with core in bay → transmit, ls-count) →
  ending card **THE COUNT** → free survey with exactly the 6 `ls-*` codex
  entries (in-page set check) → `farside.longshadow.v1` ends
  `{missionId:null, payloadTaken:true, core+cable [id,1] pairs}` → reload →
  menu `SURVEY COMPLETE — FREE SURVEY` (selection persisted) → RESUME → free
  survey, 6 codex + payload kept. Zero page JS errors in both sessions. 36/36.
- `tools/gate.cjs` **GATE PASS (21/21)** fresh profile — Anax campaign, save
  round-trip, 12-codex resume all unchanged.
- Driver note: the L03 sample hunt routes straight to the nearest unscanned
  return (sparse 30-sample field + 30°+ outer wall made blind 70 m wandering
  fail); the game path — 78 m scan, drill, objective — still does all the
  finding, same as the gate's relay/massif site selection.
- Evidence: `.shots/ls06_01…17` (menu, cards, drive, both records, cable,
  samples, hub, core, breach, THE COUNT ending, free survey, complete-status
  menu, resume). Curation into `spec/evidence/phase-2/` happens in task 7.

