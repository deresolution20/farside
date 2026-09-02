# Task Spec (Tier 3) — Phase 2 / Task 4: World Swap + Menu Picker

**Parent:** Phase 2 → Task 4 (`spec/phases/phase-2-regions-levels.md` §3.4)
**Blocked by:** 3
**difficulty:** `hard`
**routes to:** local (Claude Code — local endpoints not yet wired)

## What to build

Extract the boot build block into `buildWorld(region, baked)` and add
`selectRegion(r)` (menu-only switching: bake behind a loading sheet, remove old
world objects, build new ones). Add the menu region picker (`#regionCards`,
generated in JS from `REGIONS`, persisted via `settings.region`) and a dedicated
`#regionload` overlay. `Props` gains a 4th `region` constructor param. Long
Shadow L01 becomes playable end-to-end.

## Files this task may touch

- `src/main.js`
- `index.html`
- `src/ui/styles.css`
- `src/world/props.js` (constructor param + `buildHome(home)` only)
- `src/game/regions.js` (Long Shadow L01 tweaks only, if needed)
- `spec/phases/phase-2-task-04-world-swap-picker.md` (result notes only)

## Acceptance criteria (contract — MUST be testable)

- [ ] `buildWorld(region, baked)` builds the full world in the existing order
      (terrain → albedo → `new Props(scene, terrain, quality, region)` →
      `props.buildHome()` → `buildStation` only when `region.props.station !==
      'none'` → pylons/pipes/bigPipe from `region.props` → dust → rover → rig →
      `hud.bakeMap(terrain)` → `new Game({…, region})` with `game.tc =
      App.settings.tc`). Boot calls it; the Anaximenes boot sequence is
      unchanged (gate proves it).
- [ ] `Props` constructor `(scene, terrain, quality, region)`; `buildBoulders()`
      uses `region.playableR` + `region.landmarks.home`; `buildHome()` places at
      `region.landmarks.home`. Anaximenes gets identical values → identical
      boulder field.
- [ ] `selectRegion(r)`: no-op when `r === App.region`; persists
      `settings.region`; hides menu; shows `#regionload` (own bar/text; **not**
      `#boot`); runs `bakeTerrain(progress, r.terrain)`; then removes/rebuilds
      exactly: `terrain` (`scene.remove(terrain.group)` first), `props.group`,
      dust points, rover, rig, `game` (new instance), `hud.bakeMap(terrain)`;
      sets `App.sunAz = r.sunAz0`; reassigns `App.{terrain,props,dust,rover,rig,
      game,region}`; `showMenu()` with re-derived card statuses. Globals
      (Engine/Sky/Audio/Input/settings/tex) untouched.
- [ ] `#regionCards`: two cards (`id="region-anaximenes"`,
      `id="region-longshadow"`), name + subtitle + status line from
      `Save.read(region)`: no save → `NO SURVEY — READY FOR DESCENT`; save with
      `missionId != null` → `SURVEY IN PROGRESS — <mission.tag>`; save with
      `missionId == null` → `SURVEY COMPLETE — FREE SURVEY`. `.sel` on the
      selected card; buttons act on the selection; `menuBrief` shows the
      selected region's `brief`; default selection `settings.region ||
      'anaximenes'`.
- [ ] CSS: new `.region-card`/`.region-card.sel`/`#regionCards` rules in the
      menu section of `src/ui/styles.css`; no `.panel` name at overlay scope;
      no `var(--s)` in `#regionload` (px only).
- [ ] In-page (manual, fresh profile): select THE LONG SHADOW → loading sheet →
      menu; `FARSIDE.region.id === 'longshadow'`; `terrain.heightAt(0,0)` differs
      from the Anaximenes value; select ANAXIMENES again → back; repeat once
      more (A→B→A) without console errors or doubled terrain (screenshot).
- [ ] Long Shadow L01 playable: select it → BEGIN DESCENT → mission card
      (MISSION 01) → deploy (T) → drive 120 m (W) → scan (G) → mission complete
      → `farside.longshadow.v1` written with `missionId: 'ls-echo'`; Anaximenes
      slot untouched.
- [ ] Gate green (21/21) — the default-selection Anaximenes flow is unaffected
      by the new menu DOM.
- [ ] `node --check` green on all touched files.

## Context the worker needs (and ONLY this)

- Why: menu-only switching is Phase 2's core UX; the rebuild list is the
  dangerous part (stale terrain/uniform references render two worlds at once).
- Constraints: **uniform-wrapper rule** — Dust wraps
  `terrain.uniforms.uSunDir` at construction and must be rebuilt, not
  re-pointed; clipmap rings reuse `this.group`, so the old `terrain.group` must
  be explicitly removed; `#regionload` is a sibling of `#boot` (never reuse
  boot's state); in-game switching is out of scope.
- May use: `Engine` rAF/timer pump (boot's pattern), `Save.read(r)`, `App`
  global, `REGIONS`, `bakeTerrain(report, P)`.
- Commit: one logical change (`feat: region picker + world swap`).

## Verification gate (run before merge)

- [ ] Acceptance criteria all met
- [ ] Gate green (21/21)
- [ ] A→B→A swap verified in-page with screenshots
- [ ] `node --check` green
- [ ] Spec still matches code (no drift)

---
_Result / notes (2026-09-01):_

**main.js**
- Boot split into `bakeAsync(report, P)` (the rAF/timer pump moved out of the
  boot IIFE, now shared by boot and swaps) and `buildWorld(region, baked, tex)`
  in exactly the spec order: terrain → `uAlbedoTex` → `new Props(scene, terrain,
  quality, region)` → `props.buildHome(region.landmarks.home)` →
  `buildStation(region.landmarks.station.x/z)` only when
  `region.props.station !== 'none'` → pylons/pipes/bigPipe from `region.props`
  → dust → rover → `new CameraRig` → `hud.bakeMap(terrain)` →
  `new Game({…, region})` with `game.tc = App.settings.tc`.
  Engine/Sky/Audio/HUD/Input build once in boot (before buildWorld); the texture
  set is shared (never re-loaded on swap).
- `App.region` resolves at module load from `settings.region` (falls back to
  `REGIONS[0]` when absent/stale) and `App.sunAz` initialises from it — a reload
  boots directly into the persisted region.
- `renderRegionCards()` builds `#regionCards` from `REGIONS` (ids
  `region-<id>`, name + subtitle, status from `Save.read(r)` with the spec's
  exact three strings); `showMenu()` re-renders it (re-derived statuses + `.sel`).
- `selectRegion(r)`: menu-only guard + `swapping` re-entrancy flag; persists
  `settings.region`; hides the menu; its own `#regionload` bar/text (`rbar`/
  `rtext` — never `#boot`'s); `bakeAsync(report, r.terrain)`; teardown is
  exactly: `App.game.reset()` (drops scan markers + deployed kit from the scene)
  → `scene.remove(terrain.group | props.group | dust.points | rover.root)` →
  `buildWorld` + `App.{terrain,props,dust,rover,rig,game,region}` reassign →
  `App.sunAz = r.sunAz0` → `applySettings()` → 260 ms settle → `showMenu()`.
  Engine/Sky/Audio/Input/settings/tex untouched; dust rebuilt, not re-pointed
  (it wraps `terrain.uniforms.uSunDir` at construction).
- `stepWorld`'s pad light now reads `App.region.landmarks.home` (was the ANAX
  `HOME` constant); `STATION`/`MASSIF`/`HOME`/`PLAYABLE_R` imports dropped from
  main.js.

**index.html** — `#regionCards` in the menu (between brief and actions);
`#regionload` overlay as a sibling of `#boot` with own name/bar/text;
stylesheet `?v=5`.

**styles.css** — `.region-card`/`.region-card.sel`/`#regionCards` in the menu
section (plus phone column-stack rule); `#regionload` rules use px/unitless only
(no `var(--s)` — it's out of the `.hud` scope — and no `.panel`, which also
scales with `--s`).

**props.js** — constructor `(scene, terrain, quality, region)` derives
`playableR` + `homeRef` (falls back to the constants, so Anaximenes yields the
identical boulder field); `buildHome(home)` takes the landmark (falls back to
`homeRef`); `levelPad()` follows `homeRef`.

**regions.js (L01 tweaks only)**
- `ls-echo` stub MISSION 02 (empty objectives): L01 completion must advance to
  it (save `missionId: 'ls-echo'`) instead of ending the survey — per the
  acceptance contract. Task 6 grows its content.
- LS spawn heading 0.96 → **2.6093**: the old heading drove straight into the
  sled/boulder field (a test run stalled at 21 m). 2.6093 was found by a node
  search over the real baked LS field with the real boulder placer: a 150 m
  straight line, 0 colliders within 4 m + collider radius, max slope 21°, stays
  inside the playable radius. (Verified end-to-end in the in-page run: 122.7 m
  driven with steering only, no teleport.)

**Verification**
- `node --check` green on every touched file.
- `tools/bake-diff.cjs` PASS (Anax bake untouched — regression).
- Node bake smoke: both terrain bundles bake to completion, finite, distinct
  (`heightAt(0,0)` ANAX 27.1 vs LS −46.6 at base; massif lifts the anax core
  72.8 m over ls).
- **In-page swap test 24/24** (raw-TCP Marionette, fresh storage): picker
  renders (2 cards, ids, `.sel`, NO SURVEY statuses); five swaps (A→B→A ×2 +
  final B): old terrain group detached each time (no doubled world), scene
  children stable, `settings.region` persisted, `.sel`/brief re-derived,
  re-baked Anax `heightAt(0,0)` bit-deterministic; LS vs ANAX
  `heightAt(0,0)` −45.48 vs 27.21; LS L01: MISSION 01 card (3 objectives) →
  T deploy → 122.7 m drive → G scan → complete → `farside.longshadow.v1` holds
  `missionId: 'ls-echo'` while the Anax slot stays byte-identical to its
  canary; LS codex seeded (`ls-brief`, `ls-memo`); MISSION 02 stub card (0
  objectives) shown on advance; reload boots into longshadow with re-derived
  card statuses (IN PROGRESS — MISSION 02 / canary). No console errors
  (filtered: the pointer-lock `NotAllowedError` that synthetic input provokes —
  the gate's sessions emit it too).
- **GATE PASS 21/21** (fresh profile) — default-selection Anaximenes campaign
  unaffected by the new menu DOM.

Known follow-up (not this task): HUD minimap header still reads "ANAXIMENES
BASIN" in Long Shadow — `hud.js` is outside this allowlist; Task 5's world pass
covers it.

