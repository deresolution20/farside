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
_Result / notes:_
