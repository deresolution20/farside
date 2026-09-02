# Phase Spec (Tier 2) — Phase 2: Regions / Levels

**Parent:** Product Spec → Phase 2 (regions/levels)
**Depends on phases:** Phase 1 (data-driven missions — closed 2026-08-30, gate 21/21)

## 1. Goal of this slice

The basin becomes **one of two selectable named regions**: the menu offers ANAXIMENES
(existing campaign, provably byte-identical world) and THE LONG SHADOW (a new high-rim,
shadowed basin with its own 5-mission campaign). `bakeTerrain()` takes a parameter
bundle; a region is a pure data record (terrain params, spawn, landmarks, props,
anomalies, missions, codex, ending, save key); switching regions from the menu
re-bakes and swaps the world. Each region has its own save slot.

User value: the Phase 1 campaign structure now *repeats* — a whole new world
(terrain, landmarks, story arc) is added as data plus two small prop builders, and
the Anaximenes world, saves, and gate are provably untouched.

## 2. What "done" looks like (phase acceptance criteria)

- [ ] The menu shows two named regions (ANAXIMENES, THE LONG SHADOW); each card shows
      a per-region status derived from that region's save (no save / in-progress
      mission / complete — free survey); the action buttons act on the selected
      region. **Proof:** gate checks + menu screenshots in `spec/evidence/phase-2/`.
- [ ] **Anaximenes worldgen is byte-identical**: `node tools/bake-diff.cjs` exits 0
      (new bake with the Anaximenes bundle vs a frozen pre-Phase-2 copy of the bake
      math, strict float equality on macro/far/det, plus a two-bake determinism
      check). The Anaximenes save key is still `farside.anaximenes.v3` — **not
      bumped** (worldgen unchanged; the save-blob field renames in §3.3 stay
      backward-compatible via load-time migration instead).
- [ ] THE LONG SHADOW is a full playable campaign: 5 missions + ending card + free
      survey, save slot `farside.longshadow.v1`, anomaly ids coordinate-derived and
      deterministic (two bakes/instances produce the same field).
- [ ] Region switching (menu only) works repeatedly (A→B→A): old world removed from
      the scene, new world built, both saves intact, each region's world
      byte-identical to its first bake.
- [ ] **Gate:** all pre-existing campaign checks pass unchanged **and** the new
      region checks (§3.7) pass; `GATE PASS (n/n), EXIT:0` from a clean profile.
- [ ] `node --check` green on every JS file (including new ones); no new runtime
      assets; cold start offline still works.
- [ ] Evidence in `spec/evidence/phase-2/` (menu picker, Long Shadow at rest, L01
      card, post, hub, ending); Product Spec phase map + changelog updated;
      `HANDOFF.md` rewritten for Phase 3.

## 3. Technical design

### 3.1 Region record — new `src/game/regions.js`

One pure-data module, `export const REGIONS = [ … ]`. Two records. Anaximenes is
assembled from the existing constants (`HOME` from `props.js`, `STATION`/`MASSIF`/
`CONTENT` from `content.js`, `MISSIONS`/`CODEX`/`ENDING_CARD` from `lore.js`) —
those files' exports and values are **unchanged**; the region bundle only wraps
them (adding `label`s) and carries the pylon/pipe positions currently hardcoded in
`main.js:149-154`.

```js
{
  id, name, subtitle,                // 'anaximenes' / 'longshadow'
  brief,                             // menu blurb (Anaximenes: existing text verbatim)
  saveKey,                           // 'farside.anaximenes.v3' / 'farside.longshadow.v1'
  sunAz0,                            // initial sun azimuth (4.35 for Anaximenes)
  spawn: { x, z, heading },          // rover drop (Anaximenes: 88, 207, 2.3 = HOME-8,-7, today's literal)
  terrain: P,                        // §3.2
  playableR,                         // 432 for BOTH regions this phase
  landmarks: { key: { x, z, label } },
  content: [ { at, radius, unlocks, key, prompt } ],
  props: {
    station: 'vantage3' | 'none',    // buildStation runs only when not 'none'
    pylons: [[x, z], …], pipes: [[x, z, scale], …], bigPipe: { x, z, s } | null,
    posts: [[x, z], …] | null, hub: [x, z] | null        // Long Shadow listening posts / array hub
  },
  anoms: {
    seed,                            // single RNG stream for the whole field
    pipes: { anchor: 'massif', rings: 5 } | null,   // hex ring lattice around a landmark
    scatter: { count, kinds, rMin },                // kinds: the 6 generic sample types
    specials: [ { at, dx, dz, type, depth, special?, unlocks?, deep? } ]
  },
  transmit: { sample, unlocks: [codexIds] },        // home-service transmit gate + beat codex
  missions: [ … ], codex: [ … ], ending: { … }      // Phase-1 DSL shapes, verbatim
}
```

Anaximenes values (all copied verbatim from today's code, no retuning):
`terrain: P_ANAXIMENES` (§3.2), `playableR: 432`,
`landmarks: { home: {...HOME, label:'SLED'}, station: {...STATION, label:'VANTAGE-3'}, massif: {...MASSIF, label:'MASSIF'} }`,
`content: CONTENT`,
`props: { station:'vantage3', pylons: [[-60,180],[-150,40],[60,-140],[190,60],[-250,-110]],
          pipes: [[-118,-64,1.3],[86,-152,1.0],[-206,96,1.15],[24,118,0.9],[-40,-218,1.25]],
          bigPipe: { x: MASSIF.x+6, z: MASSIF.z-4, s: 2.1 } }`,
`anoms: { seed: 0x5EED17, pipes: { anchor:'massif', rings: 5 },
          scatter: { count: 46, kinds: [soil, breccia, ilmenite, agglutinate, pyroclast, meteoritic], rMin: 40 },
          specials: [ { at:'massif', dx:6, dz:-4, type:'drum', depth:11.0, special:'drum', unlocks:'drum', deep:true },
                      { at:'station', dx:14, dz:9, type:'lining', depth:4.1, special:'lining' } ] }`,
`transmit: { sample:'drum', unlocks: ['drum','lasthour','transmission'] }`,
`missions: MISSIONS, codex: CODEX, ending: ENDING_CARD`.

> **RNG stream note:** `buildAnomalies` today draws pipes (per ring) then scatter
> from one `makeRNG(0x5EED17)` stream. The parameterized version keeps the exact
> same draw order per region, so Anaximenes' field is bit-identical; Long Shadow
> skips the pipe draws (its own world, its own stream).

### 3.2 Terrain parameterization — new `src/world/bake.js`

The **pure** bake math moves out of `terrain.js` into `src/world/bake.js` (no
three.js import) so it runs in plain node: `baseHeight(x, z, P)`, `rilleH`,
`craterProfile`, `forEachCrater(ext, keepClean, cb)`, `buildMips`, and the
`bakeTerrain(report, P)` generator (returns `{ macro, far, det, macroMips, farMips }`
as today). `terrain.js` imports from there; the `Terrain` class, GLSL, clipmap,
dent field, sunmask, and the exported constants stay in `terrain.js`.

Parameter bundle `P` (every number below is the current hardcode for Anaximenes):

```js
P = {
  bowl:    { depth: 36, floorR: 55, wallR: 430 },        // h -= depth * sstep(wallR, floorR, r)
  rim:     { r: 470, w: 74, amp: 112,
             breachBase: 0.30, breachAmp: 1.05, breachSeed: 77,
             ridgeScale: 0.0062, ridgeSeed: 31,
             terraceAmp: 9, terraceFreq: 0.10, terraceSeed: 3 },
  fall:    { amp: 62 },                                   // -amp * sstep(rim.r + rim.w*0.55, rim.r + 430, r)
  farRidge:{ amp: 190, bias: 0.30, seed: 5 },             // sstep(rim.r+130, rim.r+900, r) * (ridged(…) - bias) * amp
  massif:  { on: true, r: 110, amp: 64, ridgeAmp: 26, seed: 61 },
  rille:   { on: true },                                  // rilleH shape shared verbatim (single graben)
  craters: [[104, 27, 55, 0.52, 0.155, 3],                // TIERS verbatim: cell, rMin, rMax, prob, depth, seed
            [ 36,  9, 22, 0.60, 0.180, 17],
            [ 12,  2.6, 7.4, 0.64, 0.195, 41]],
  keepClean: [[0, 0, 82]]                                 // crater exclusion zones [x, z, r]
}
```

**Fixed across all regions (do not parameterize):** `MACRO_EXT/RES`,
`FAR_EXT/RES`, `DET_TILE/RES`, `DENT_EXT`, `SUNMASK_*`; the low-frequency base
`(fbm(x*0.00175, z*0.00175, 4, 2.05, 0.5, 11) - 0.5) * 33`; the detail tile (grain
+ micro-craters, seeds 5–8/313, `DET_AMP` — generic regolith, shared); all sstep
ramp *offsets* (computed from `rim.r`). The 520/596 m macro↔far crossfade and the
95 m detail fade are tied to the fixed extents (ARCHITECTURE §Terrain) and remain
so.

**Constraints:** `playableR ≤ rim.r − rim.w/2 − 20` (fence sits on the lower inner
wall face); `rim.r + rim.w < MACRO_EXT/2` (wall inside the macro field —
Anaximenes 544 < 600; Long Shadow 590 < 600, tight but valid; the Gaussian tail
beyond ±600 m continues in the far field because both fields sample the same
`baseHeight`).

**Long Shadow initial `P`** (initial values — task 5 tunes against the targets
below; coordinates/roles are fixed, numbers are not):

```js
bowl {40, 70, 440},
rim  {500, 90, 150, 0.30, 1.2, 79, 0.0058, 33, 12, 0.10, 31},
fall {62}, farRidge {170, 0.30, 7}, massif {on:false}, rille {on:false},
craters [[104, 30, 60, 0.42, 0.16, 5], [36, 9, 24, 0.70, 0.20, 19], [12, 2.4, 8, 0.72, 0.21, 43]],
keepClean [[300,210,30],[150,-320,28],[-220,280,28],[-340,-180,36]]   // spawn, postA, postB, hub
```

Tuning targets: rim crest reads as a wall (≈ +90…+150 m over the floor); floor
heavily cratered; approach slope ≤ ~20° at every landmark (screenshot check + the
gate's steering budget must reach them); spawn pad area flat.

**Bake-identity guard — `tools/bake-diff.cjs`** (node, no browser, added in task 1):
(a) embeds a **frozen pre-Phase-2 copy** of the old bake math (~80 lines:
`baseHeight`/`rilleH`/`TIERS`/`forEachCrater`/`craterProfile` + a direct field
bake), marked `DO NOT EDIT — regression guard`; (b) runs the frozen math and the
new `bakeTerrain(P_ANAXIMENES)` and compares `macro`/`far`/`det` element-wise with
strict float equality; (c) runs the new bake twice and compares (determinism).
Exits non-zero on any drift, printing first-diff index + expected/actual. The
frozen copy is the only place the old math survives; it is test infrastructure,
not live code.

### 3.3 Region-aware `Game` — `src/game/gameplay.js`

Every static content reference becomes `this.region.…`:

- `reset(freeRoam = false, region)` — `this.region = region`; codex seed set from
  `region.codex.filter(c => c.start)`; `missionId = region.missions[0].id`;
  `buildAnomalies(region.anoms)`; freeRoam unlocks all of `region.codex`. The
  constructor passes `ctx.region` into `reset` (main.js puts it in the ctx).
- `get mission` / `advance()`: `region.missions`, ending = `region.ending`.
- `buildAnomalies(anoms)`: seed `anoms.seed`; pipe rings around
  `landmarks[anoms.pipes.anchor]` (rings/radii/angle offsets/jitter exactly as
  today, `deep: true` on each); scatter `anoms.scatter` (same draw order: pipes
  first, then scatter, then specials); specials placed at
  `landmarks[s.at] + (dx, dz)` with `type/depth/special/unlocks/deep`. Slope caps
  (26° pipes / 28° scatter) and the decimetre-grid id stay global.
- `atHome` / `strand()`: `region.landmarks.home`; fence check (L576):
  `region.playableR`.
- `objectiveTargets()`: refs through `region.landmarks`; the `station-interact`
  fallback becomes: find the `region.content` record with `c.unlocks ===
  o.unlocks`, target `region.landmarks[c.at]`; `label` from
  `landmarks[ref].label` (replaces the hardcoded ref→label map).
- `checkState()`: `LANDMARKS[o.ref]` → `region.landmarks[o.ref]`. The narrative
  beats stay ref-keyed (`'station'` → unlock 'roster' + log; `'massif'` → log) —
  Long Shadow refs never match, so they no-op there.
- `complete(objId)`: **new** — after marking done, if the objective carries an
  `unlock` field, `this.unlock(o.unlock)`. Anaximenes objectives never set it.
  (This is how Long Shadow codex entries unlock off its event/count objectives.)
- **Content generalization** (Anaximenes has one station; Long Shadow has three
  posts):
  - hold-E loop (L534): `this.contentVisited[key] = true; this.emit('station-interact', key);`
    — the event now carries a payload. Anaximenes' m04 objective sets no `special`,
    so it still matches (the funnel only compares `o.special` when it is set).
  - prompt loop (L510): iterates `region.content`; gate becomes
    `if (this.contentVisited[c.key]) continue;` (replaces the `c.key ===
    'station' && this.stationVisited` special case).
  - `stationVisited: boolean` → `contentVisited: {[key]: boolean}`.
- **Deep-extract generalization** (the drumhead is the first of what is now a
  data-flagged anomaly class):
  - `emit('sample')` (L364) → `emit('sample', a ? a.special : null)` — payload
    added; no Anaximenes objective filters `sample` by special, so nothing changes.
  - `a.special === 'drum'` (L365) → `if (a.deep) { if (a.special ===
    this.region.transmit.sample) this.payloadTaken = true; this.emit('extract',
    a.special); }`.
  - scan "deep" count (L284): `a.type === 'pipe' || a.special` → `a.deep` (pipes
    get `deep: true` at generation; the drum's `deep` comes from region data).
  - arm yaw bias (L440): `a.special` → `a.deep`.
  - `drumTaken` → `payloadTaken`; home-service transmit block (L496):
    `if (this.payloadTaken) { this.transmitted = true; for (const id of
    this.region.transmit.unlocks) this.unlock(id); this.emit('transmit'); }`.
  - The drumhead's settle-search drill mechanics (nearestAnom 2.6 m radius, yaw
    clamp — gate gotcha #7) and the `unlocks: 'drum'` gating are unchanged in
    behaviour, just data-driven via `deep`/`unlocks`.
- **Persistence**:
  - `save()` now actually persists — `Save.write(this.region, blob)` — and
    returns the blob. This makes `advance()`'s `this.save()` (L259) a real
    immediate write, matching the documented contract ("advance() saves
    immediately"; today the blob is built and discarded — a latent bug the 20 s
    autosave masks).
  - blob fields: `stationVisited` → `contentVisited`, `drumTaken` →
    `payloadTaken`. `load(d)` migrates old blobs: `d.contentVisited ||
    (d.stationVisited ? { station: true } : {})` and `d.payloadTaken ?? !!d.drumTaken`.
    `load()` validates `missionId` against `this.region.missions`.
  - No save-key bump: worldgen and anomaly ids are unchanged for Anaximenes; old
    v3 blobs load fine via the migrations. (Constitution bump rule — "bump when
    anomaly generation or terrain changed" — not triggered.)
- **Contract check (task 3):** `grep -n "== 'drum'\|drumTaken\|stationVisited" src/`
  → zero hits **except** the two documented `load()` migration reads of the old
  blob field names.

### 3.4 Boot flow & world swap — `src/main.js`, `index.html`, `src/ui/styles.css`

**Boot: unchanged in observable behavior.** `bakeTerrain(progress,
REGIONS[0].terrain)`; `App.region = REGIONS[0]`; `App.sunAz = REGIONS[0].sunAz0`
(= 4.35); the L140-170 build block is extracted verbatim into
`buildWorld(region, baked)` (terrain → albedo → `new Props(scene, terrain,
quality, region)` → `props.buildHome()` → `buildStation` only when
`region.props.station !== 'none'` → pylons/pipes/bigPipe from `region.props` →
dust → rover → rig → `hud.bakeMap(terrain)` → `new Game({…, region})`).

**`Props` constructor** gains a 4th param `region` used by `buildBoulders()` in
place of the `PLAYABLE_R`/`HOME` imports (`region.playableR`,
`region.landmarks.home`). Anaximenes passes identical values → identical boulder
field. `buildHome()` places at `region.landmarks.home`. (Task 5 adds the
`buildPost`/`buildHub` builders.)

**Menu UI** (`#menu`, `menu-left`): a region-card row above the action buttons,
generated in JS from `REGIONS` into `#regionCards` (keeps `index.html` slim).
Card: `id="region-<id>"`, name, subtitle, status line from `Save.read(region)`:
- no save → `NO SURVEY — READY FOR DESCENT`
- save with `missionId != null` → `SURVEY IN PROGRESS — <mission.tag>`
- save with `missionId == null` → `SURVEY COMPLETE — FREE SURVEY`

Click selects the region (`.sel` class); selection persists as `settings.region`
(global settings key, §3.5). Buttons act on the selected region: `BEGIN DESCENT`
→ `Save.clear(sel); startGame(false, false)`; `RESUME SURVEY` visible iff
`Save.read(sel)`; `FREE SURVEY` → `startGame(true, false)`. `menuBrief` shows the
selected region's `brief`. Default selection: `settings.region || 'anaximenes'`.

**CSS contract:** new `.region-card` / `.region-card.sel` / `#regionCards`
classes in `src/ui/styles.css` (menu section). **Do not** name anything `.panel`
at overlay scope (documented gotcha, styles.css:108). The loading sheet is an
`.overlay` outside the `.hud` subtree, so it uses plain px, never `var(--s)`
(ARCHITECTURE §UI).

**`selectRegion(r)`** (menu-only — no in-game switching this phase):
1. no-op if `r === App.region`; persist selection; hide menu; show loading sheet
   (new `#regionload` overlay with its own bar/text — do not repurpose `#boot`,
   which owns boot state; same rAF+timer pump as boot).
2. `bakeTerrain(progress, r.terrain)` → `baked`.
3. **Rebuild list** (remove old, then build new — the exact set of objects
   holding live `Terrain`/uniform references):
   - `Terrain` — `scene.remove(terrain.group)` (the clipmap reuses `this.group`,
     so the old rings must be explicitly removed, or a half-swapped world renders
     both basins);
   - `Props` — `scene.remove(props.group)`;
   - `Dust` — remove its points object (**must** be rebuilt, not re-pointed: it
     wraps `terrain.uniforms.uSunDir` at construction — the uniform-wrapper rule);
   - `Rover`, `CameraRig` — remove/rebuild (they hold terrain + camera bindings);
   - `Game` — new instance with the new ctx + `region` (fresh instance is the
     cleanest teardown; reapply `game.tc = App.settings.tc`);
   - `hud.bakeMap(terrain)` — minimap re-bake (hud.js itself unchanged — the
     fence circle uses `PLAYABLE_R`, 432 in both regions this phase).
   Global and untouched: `Engine`, `Sky`, `Audio`, `Input`, settings, `tex`.
4. `App.sunAz = r.sunAz0`; reassign `App.{terrain, props, dust, rover, rig,
   game, region}`; `showMenu()` (card statuses re-derived).

Old GPU buffers are GC'd with the removed objects; no new `dispose()` API this
phase (documented).

**`startGame(freeRoam, loadSaved)`**: signature unchanged; uses `App.region`
(spawn, save key). `Save.read()` call sites → `Save.read(App.region)` /
`Save.read(sel)`; `Save.clear()` → `Save.clear(sel)`.

### 3.5 Saves — `src/core/save.js`

- Per-region slots: `Save.read(r)`, `Save.write(r, data)`, `Save.clear(r)` where
  `r` is a region record; the slot is `r.saveKey`. The module-local `KEY` stays
  as the legacy key for the one-time settings migration read.
- **Settings move to a global key** `farside.set`: `settings()` reads
  `farside.set`; if absent and the legacy `farside.anaximenes.v3.set` exists,
  copy it to `farside.set` (one-time migration, then the legacy slot is ignored);
  `saveSettings()` writes `farside.set`. New field `settings.region` (selected
  region id) rides here.
- Gate note: `tools/gate.cjs` reads `farside.anaximenes.v3` directly — updated in
  task 7 to the per-region keys.

### 3.6 THE LONG SHADOW — world & campaign data

Story beat: the basin holds the Authority's **first** listening posts, planted
before VANTAGE-3, which went silent with the day-612 burst. The player's arrival
sweep is clean — on a listening site, silence is the first wrong thing.

**Landmarks** (world-local; basin centred on the origin; all inside `playableR`
432 — initial values, task 5 may move them to hit the slope targets, roles fixed):

| key      | x     | z     | role                                        |
|----------|-------|-------|---------------------------------------------|
| `home`   | 300   | 210   | the descent sled, floor near the rim breach |
| `breach` | 380   | 120   | the one crossing of the wall (L05 marker)   |
| `postA`  | 150   | -320  | first listening post, mid-terrace           |
| `postB`  | -220  | 280   | second post, shadowed floor                 |
| `hub`    | -340  | -180  | dead array hub at the rim base              |

`landmarks` labels: `home` 'SLED', `postA` 'POST A', `postB` 'POST B', `hub`
'HUB', `breach` 'BREACH'. `sunAz0`: tuned in task 5 so the first ~20 game minutes
are low-sun/night (headlight-heavy start); initial guess `4.35 + π`.

**Props:** `station: 'none'`; a handful of pylons (reuse `buildPylon`, positions
data); `pipes: []`, `bigPipe: null`; `posts: [[postA.x, postA.z], [postB.x,
postB.z]]` and `hub: [hub.x, hub.z]` drive two **new** builders in `props.js`
(task 5): `buildPost(x, z)` (geophone mast + battered instrument shelter,
simplified VANTAGE-3 design language) and `buildHub(x, z)` (larger dead array
hub: mast ring + buried console). Both add collider entries (the `props.resolve`
pattern) and idle animation via `props.update` (dim status LEDs). The
Anaximenes builders are unchanged.

**Content** (hold-E records; each gates on its own tag until recovered):
```js
[
  { at:'postA', radius: 12, unlocks: 'postA', key: 'postA', prompt: 'HOLD <kbd>E</kbd> — RECOVER POST RECORD' },
  { at:'postB', radius: 12, unlocks: 'postB', key: 'postB', prompt: 'HOLD <kbd>E</kbd> — RECOVER POST RECORD' },
  { at:'hub',   radius: 14, unlocks: 'hub',   key: 'hub',   prompt: 'HOLD <kbd>E</kbd> — RECOVER MASTER RECORD' }
]
```

**Anomalies:** `seed: 0x2EED5`; `pipes: null`; `scatter: { count: 30, kinds:
<same 6 generic types>, rMin: 40 }` (sparser than Anaximenes' 46 — the floor is
pocked but the site is quiet); `specials`:
```js
[
  { at:'hub',   dx: 4,  dz: 6,  type: 'core',  depth: 9.0, special: 'core',  unlocks: 'hub', deep: true },
  { at:'postA', dx: 10, dz: -8, type: 'cable', depth: 2.4, special: 'cable' }
]
```

**New SAMPLES** (additive to `lore.js` — shared taxonomy; Anaximenes entries
untouched):
```js
cable: { name: 'GEOPHONE CABLE', rare: true, value: 4,
  desc: 'Tinned lead in a glass jacket, strung between the posts. The ends are clean-cut — not broken.',
  unlock: 'ls-posta' },
core:  { name: 'MEMORY CORE', rare: true, value: 8,
  desc: 'Solid state. Every cycle accounted for. The last entry is a count.',
  unlock: 'ls-hub' }
```

**Codex (6, ids `ls-*`, in regions.js):**
- `ls-brief` (start) — `OPERATION HOLLOW II`: why you are at this basin; the
  dossier does not list this site at all.
- `ls-memo` (start) — `AUTHORITY`: preliminary survey directive — plant the
  array, listen, and do not dig.
- `ls-posta` — `STATION LOG`: post A's log — the count heard at 03:14, an attempt
  to warn VANTAGE-3, the reply was a four-second carrier.
- `ls-postb` — `STATION LOG`: post B's log — the last entry, cut off
  mid-transmission.
- `ls-hub` — `FIELD NOTE`: the master record — a timestamped count, unbroken
  since day 612, still running.
- `ls-count` — `ENDING`: two sites, one count; it was never a signal; it started
  the day you landed — in both basins.

**Campaign** (ids/tag in regions.js; objective DSL exactly as Phase 1):

| id | tag | name | objectives |
|---|---|---|---|
| `ls-arrival` | MISSION 01 | THE LONG SHADOW | `{deploy, event, array-deployed} · {drive, distance, home, >, 120} · {scan, event, scan-done}` — brief: the sweep comes back clean. On a listening site, that is the first wrong thing. |
| `ls-echo` | MISSION 02 | ECHO | `{reach, distance, postA, <, 26} · {recover, event, station-interact, special:'postA', unlocks:'postA', unlock:'ls-posta'} · {cable, event, sample, special:'cable'}` |
| `ls-quiet` | MISSION 03 | THE QUIET ONE | `{reach, distance, postB, <, 26} · {recover, event, station-interact, special:'postB', unlocks:'postB', unlock:'ls-postb'} · {find3, count, sample, count: 3}` |
| `ls-silence` | MISSION 04 | SILENCE | `{reach, distance, hub, <, 30} · {record, event, station-interact, special:'hub', unlocks:'hub', unlock:'ls-hub'} · {deep, event, extract, special:'core', unlocks:'hub'}` |
| `ls-count` | MISSION 05 | THE COUNT | `{breach, distance, breach, <, 26} · {transmit, event, transmit}` |

→ `ending` card `THE COUNT` (brief: the record's count continues to this moment;
two sites, one count; you are still here) + free survey.

Notes:
- L04's two objectives both declare `unlocks: 'hub'` — the drumhead pattern:
  `tagOpen('hub')` stays true (prompt visible + anomaly open) until **both** are
  met; after the last one, the content closes and the anomaly is taken.
- `transmit: { sample:'core', unlocks:['ls-count'] }` — L05 transmits with the
  core offloaded at the sled (the player extracts it in L04; the bay carries it).
- No relays, no pipes, no new objective DSL kinds — event/distance/count +
  `unlocks`/`unlock` only.
- `sunAz0` dusk start means the L01 drive is headlight-heavy; power management
  (panel face vs shadow) already handles it — no code change.

### 3.7 Gate plan — `tools/gate.cjs` (task 7)

The existing full-campaign + save round-trip flow runs **first, unchanged**
(default selection is Anaximenes). New checks appended (ids G22+; total target
28 checks, ≈ +10 min runtime):

- G22 menu shows both region cards (`#region-anaximenes`, `#region-longshadow`).
- G23 select THE LONG SHADOW → loading sheet → back to menu; world swapped
  (`FARSIDE.region.id === 'longshadow'`, `terrain.heightAt` at the rim crest
  > floor sample + 60 m sanity).
- G24 Long Shadow L01 playable: BEGIN DESCENT → card → deploy (T) → drive 120 m
  → scan (G) → mission complete (same driver helpers, new coordinates).
- G25 `farside.longshadow.v1` written with `missionId === 'ls-echo'`.
- G26 reload → RESUME SURVEY (selection persisted) → resumed into Long Shadow
  L02, `payloadTaken === false`.
- G27 switch back to ANAXIMENES: `farside.anaximenes.v3` still holds the
  free-survey blob from the earlier round-trip; world is Anaximenes again
  (`landmarks.station.x === -236`).
- G28 Long Shadow bake determinism: two in-page bakes of `region.terrain` →
  1000 random samples strictly equal.

Full Long Shadow campaign L02–L05 verified by hand (screenshots to
`spec/evidence/phase-2/`); the gate covers the risky parts (swap, saves,
determinism, L01 steering).

## 4. Contract / interface with the rest of the system

- **Inputs:** Phase 1's DSL shapes (missions/codex/ending/objectives) reused
  verbatim; existing world modules' constructors (gained one param each where
  noted); `fbm/ridged/vnoise/hash2i/sstep/lerp/makeRNG` from `core/rng.js`.
- **Outputs:** two playable regions; per-region localStorage slots
  (`farside.anaximenes.v3` unchanged, `farside.longshadow.v1` new); global
  `farside.set`; menu region picker DOM (`#regionCards`, `#region-<id>`);
  `FARSIDE.region` on the debug handle.
- **Public interfaces:**
  - `regions.js`: `REGIONS: Region[]` (shape §3.1) — the only module that knows
    both basins.
  - `bake.js`: `baseHeight(x, z, P)`, `bakeTerrain(report, P)` (generator, same
    return shape as today), `buildMips(base, res)`.
  - `save.js`: `Save.read(r) / write(r, data) / clear(r) / settings() /
    saveSettings(s)`.
  - `gameplay.js`: `Game.reset(freeRoam, region)`; `game.save()` persists and
    returns the blob; events unchanged except `station-interact` and `sample`
    now carry a payload (`c.key` / `a.special`).
  - `props.js`: `Props(scene, terrain, quality, region)`; `buildPost(x, z)`,
    `buildHub(x, z)`.
  - `main.js`: `App.region`, `App.selectedRegion`, `selectRegion(r)`.
- **Invariants (constitution):** no new runtime assets, no build step,
  CPU-baked/GPU-sampled height contract with the fixed 520/596 m crossfade and
  95 m detail fade, one world in memory at a time.

## 5. Task breakdown (Tier 3 — the atomized work)

Dependency order; full verification gate (syntax check + bake-diff + browser
gate) after **each** task.

| # | Task | difficulty | Blocked by | Status |
|---|------|-----------|------------|--------|
| 1 | Parameterize the bake: `src/world/bake.js` (pure math + `bakeTerrain(report, P)`), `terrain.js` imports it, `tools/bake-diff.cjs` identity guard; `P_ANAXIMENES` reproduces the current field byte-identical | hard | – | todo |
| 2 | Region data + per-region saves: `src/game/regions.js` (Anaximenes bundle verbatim + Long Shadow stub: terrain P, spawn, landmarks, props, anoms, content, 1-mission L01), `src/core/save.js` (per-region keys, global `farside.set` + migration), `src/main.js` boot from `REGIONS[0]`, pylon/pipe positions moved to region data | easy | 1 | todo |
| 3 | Region-aware `Game`: region binding, `contentVisited`, `payloadTaken` + `deep` flag, `o.unlock` hook, event payloads, `save()` persistence fix, load migrations; grep contract §3.3 | hard | 2 | todo |
| 4 | World swap + menu picker: `buildWorld()` extraction, `selectRegion()`, `#regionCards` UI + CSS, `#regionload` sheet, `Props(region)`, Long Shadow L01 playable end-to-end | hard | 3 | todo |
| 5 | Long Shadow world data: final terrain P tuning (slope/crest targets), anomaly config, `buildPost`/`buildHub` + colliders + idle animation in `props.js` | hard | 4 | todo |
| 6 | Long Shadow campaign: L02–L05 + ending card + 6 codex entries in `regions.js`; `cable`/`core` SAMPLES in `lore.js` (additive) | easy | 5 | todo |
| 7 | Gate extension (G22–G28), evidence to `spec/evidence/phase-2/`, Product Spec phase map + changelog, HANDOFF rewrite | gate | 6 | todo |

## 6. Out of scope for this phase

- In-game region switching (menu only).
- Region unlocking/progression gating — both regions are always selectable.
- A third region, or per-region rover/prop mechanics beyond `buildPost`/`buildHub`.
- New objective DSL kinds beyond `unlocks`/`unlock` on existing event/distance/count.
- `playableR` differences (both 432); sun *altitude* cycle changes (only `sunAz0` differs).
- Per-region audio, save compression, save migration beyond the two field renames.
- New `dispose()` API for world teardown (GC + scene removal is sufficient).

---
_On phase close: check every acceptance criterion, demo the slice (switch
A→B→A + Long Shadow L01 in the gate, full campaign by hand), then update the
Product Spec changelog and phase map._
