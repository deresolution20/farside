# HANDOFF — farside (browser rebase)

_Last session: 2026-09-05. This file supersedes memory from prior sessions._

## Where we are

**Phase 3 (planets & content) is IN PROGRESS — tasks 1–5 of 7 closed.** Deep plan:
`spec/phases/phase-3-planets-content.md` (task table with statuses); the phase-2 text
below is the still-true baseline it builds on.

- The planet abstraction exists and is proven by one foreign world:
  - **Tasks 1–4** (committed): per-region `sun` cycle + `g` (Moon defaults bit-exact),
    world-owned `Sky(renderer, scene, textures, quality, cfg)` with `makeJoveTextures`
    + Galilean companion dots, per-region `albedo` (`makeBodyAlbedo(N, A)` + `A_MOON`
    pixel-identical wrapper) + `uBaseCol` base tint + dust palette, four-card menu.
  - **Task 5** (`3354e67`): **THE CHOS PLAIN** (`ganymede`) — first foreign world, full
    5-mission campaign + THE ARRIVAL ending + `frost`/`ring` samples. Driver 61/61,
    gate 28/28, evidence in `spec/evidence/phase-3/chosing_*`. The gate's two menu
    polls now expect the specific Moon card ids (3+ regions render — do not revert to
    a card-count poll).
- **Next: task 6 — CONAMARA** (`callisto`) + the one new prop builder
  **`buildBreakout`** (phase spec §3.9, task spec
  `spec/phases/phase-3-task-06-conamara-world.md`); then task 7: gate G29–G40
  (28→40), evidence, Product Spec + ARCHITECTURE + this file rewritten at close.
- Throwaway drivers live in `/tmp/opencode/` (NOT committed): `chos5-campaign.cjs`
  (phase-3 campaign-driver pattern — clone it for CONAMARA; capture stderr this time:
  `2>&1`), `chos5-mirror.mjs` (node full-bake terrain sampler mirror for tuning),
  probe scripts. Gate logs: `/tmp/opencode/gate-task5.log`.

_Phase-2 baseline (still true):_ Phase 2 — regions / levels — closed 2026-09-02
(gate 28/28). The game is **FARSIDE — The Knocking at Anaximenes** with the two Moon
basins **ANAXIMENES** (campaign, `farside.anaximenes.v3`) and **THE LONG SHADOW**
(`farside.longshadow.v1`) selectable on the menu; world is data
(`bakeTerrain(report, P)` + `REGIONS` in `src/game/regions.js`); `tools/bake-diff.cjs`
guards Anaximenes byte-identity after every worldgen touch.

- **ANAXIMENES** — the original campaign (5 missions → ending **COUNTING** + free
  survey), worldgen provably byte-identical to pre-Phase-2 (`tools/bake-diff.cjs`),
  save slot `farside.anaximenes.v3` (never bumped).
- **THE LONG SHADOW** — a high-rim, shadowed basin entered through a wall breach:
  5-mission campaign (THE LONG SHADOW → ECHO → THE QUIET ONE → SILENCE → THE COUNT),
  6 codex entries, cable/core samples, ending card **THE COUNT** (two basins, one
  count — it began the day the sled landed). Save slot `farside.longshadow.v1`.
  Verified end-to-end twice: a 36/36 driver run (task 6) and the gate's L01 + save
  round-trip checks.

The world is **data**: `bakeTerrain(report, P)` takes a per-region parameter bundle
and `REGIONS` in `src/game/regions.js` is a pure-data array of region records. Adding
a third world is "bundle + mission data + (if needed) one or two prop builders" —
no engine changes. Region switching is menu-only (two cards with save-derived status
lines, its own `#regionload` sheet); the save is the exit; the selection persists in
the global `farside.set` settings slot.

The verification gate plays the **full Anaximenes 5-mission campaign** end-to-end
(deploy/drive/scan → 3 excavations → 3 relays → station + lining → massif + drumhead
extract + transmit → ending → save → reload → free-survey resume), **then** the
Phase 2 section: both menu cards + statuses → select Long Shadow (swap, rim-crest
sanity) → LS L01 playable (T, ~140 m drive, G) → `farside.longshadow.v1` written on
`ls-echo` → reload → RESUME into LS L02 → switch back to Anaximenes (its round-trip
save intact, `station.x === -236`) → LS bake determinism (two in-page bakes, 1000
strict samples). **28 checks, exit 0, clean profile, ~30 min runtime** (the 21
campaign checks are ~26.5 min of that — budget sessions accordingly).

## Exact commands (verified this session)

```sh
# 1. syntax check (all green)
for f in $(find src vendor server.js -name '*.js'); do node --check "$f" || exit 1; done
node --check tools/gate.cjs

# 2. worldgen identity guard — ALWAYS after touching bake.js/regions.js terrain data:
#    frozen pre-Phase-2 copy vs new bake(T_P_ANAXIMENES), strict float equality + determinism
node tools/bake-diff.cjs

# 3. serve (port 5173 is taken by an UNRELATED user node process — never kill it)
node server.js 8080 --shots &          # --shots: POST /__shot?n=name writes .shots/name.png

# 4. gate (needs headful Firefox on the X11 display — Mesa WebGL2)
#    For a CLEAN run (no leftover localStorage): kill the test Firefox, wipe + re-create
#    the profile dir, then relaunch. The profile dir MUST exist or Firefox starts but hangs
#    without opening marionette.
rm -rf /tmp/opencode/ffprof && mkdir -p /tmp/opencode/ffprof
DISPLAY=:1 firefox -no-remote -marionette -profile /tmp/opencode/ffprof -width 1280 -height 800 &
node tools/gate.cjs 2828 .shots         # exit 0 = GATE PASS (28/28)
```

Test browser: profile `/tmp/opencode/ffprof`, marionette port **2828**, display `:1`.
The user's own Firefox and the node process on **5173** are never killed. Background
launches that must outlive the shell: `nohup setsid … </dev/null & disown`.

## Architecture as-built (the parts Phase 2 added/changed)

- **Region bundle (`src/game/regions.js`)** — the ONLY module that knows both basins:
  `export const REGIONS = [ANAXIMENES, LONGSHADOW]`, each a pure-data record:
  `{ id, name, subtitle, tagline, brief, saveKey, sunAz0, spawn, terrain: P, playableR,
  landmarks, content, props, anoms, transmit, missions, codex, ending }`.
  `P_ANAXIMENES` lives in `src/world/bake.js` (original basin verbatim);
  `P_LONGSHADOW` lives in `regions.js`. Anaximenes's mission/codex/ending constants
  stay in `lore.js`; its bundle wraps them. `props.posts`/`props.hub` (Long Shadow
  listening array) are absent-or-null in Anaximenes.
- **Bake (`src/world/bake.js`)** — pure math, no render import: `baseHeight(x, z, P)`,
  `bakeTerrain(report, P)` (generator → `{macro, far, det}`, same shapes as before),
  `buildMips(base, res)`. The fixed 520/596 m crossfade and 95 m detail fade stay
  hardcoded in the terrain GLSL (extent-tied). `terrain.js` imports it;
  `terrain.heightAt`/`slopeAt` are CPU mirrors of the shader.
- **Identity guard (`tools/bake-diff.cjs`)** — a **frozen copy of the pre-Phase-2 bake
  math (DO NOT EDIT — it is the reference)** vs `bakeTerrain(P_ANAXIMENES)`: strict
  float equality on macro/far/det + two-bake determinism. Any worldgen change that
  fails it either reverts or requires an Anaximenes save-key bump (constitution).
- **Saves (`src/core/save.js`)** — per-region slots: `Save.read(r) / write(r, data) /
  clear(r)` keyed by `r.saveKey` → `farside.anaximenes.v3` / `farside.longshadow.v1`.
  Settings are global: `settings()`/`saveSettings()` on key **`farside.set`** (one-time
  migration read from the legacy v3 slot); `settings.region` (the selected region id)
  rides there, so a reload returns to the same basin. Save blobs are identity-based
  (`missionId: string|null`, `anoms` as `[id,0|1|2]` pairs; `id = round(x*10)+','+
  round(z*10)`).
- **Region-aware `Game` (`src/game/gameplay.js`)** — `Game.reset(freeRoam, region)`
  binds `this.region`; codex/unlocks reference region data. Task-3 renames:
  `stationVisited` → `contentVisited` (keyed map, per-region content records),
  `drumTaken` → `payloadTaken` (+ per-anomaly `deep` flag for the drumhead-core
  pattern — an anomaly that only opens when an *unmet* objective of the current
  mission declares its `unlocks` tag). `o.unlock` completes objectives and unlocks
  codex; `emit('sample' | 'station-interact', …)` now carries payloads (`a.special` /
  `c.key`). `save()` writes the region slot AND returns the blob. `advance()` (task 6)
  resets `objDone`/`counts` per mission — objective ids may repeat across a region's
  missions (Long Shadow reuses `reach`/`recover` in L02/L03; Anaximenes ids never
  collide, which is why this was invisible until Phase 2).
- **World swap (`src/main.js`)** — `buildWorld(region, baked)` extracted;
  `selectRegion(r)` (menu-only): persist selection → `#regionload` sheet (its own
  bar; never `#boot`) → bake → **teardown in exact reverse:** `game.reset(false)`,
  remove `terrain.group` (clipmap reuses the group — old rings must go explicitly),
  `props.group`, dust points, rover root → rebuild everything → reassign
  `App.{terrain, props, dust, rover, rig, game, region}` → `App.sunAz = r.sunAz0` →
  menu. Untouched globals: `Engine`, `Sky`, `Audio`, `Input`, settings, `tex` (one
  world in memory at a time). Boot picks `settings.region || REGIONS[0]`.
- **Menu picker** — `#regionCards` with `#region-anaximenes` / `#region-longshadow`
  buttons; status line per card derived from that region's save (NO SURVEY / IN
  PROGRESS — <tag> / COMPLETE — FREE SURVEY). `Props` gained `buildPost`/`buildHub`
  (colliders + idle animation).
- Debug handle: `window.FARSIDE = App` (`state` 0 BOOT / 1 MENU / 2 PLAY / 3 PAUSE /
  4 CODEX / 5 HELP / 6 CARD; `game`, `region`, `input`, `tick(dt)`).

## Hard-won gotchas

1. **`bake-diff.cjs` contains a FROZEN copy of the old bake math — never edit it.**
   It is the byte-identity reference; the only correct fix for a mismatch is changing
   the *new* code to agree, or (if Anaximenes's own P must move) bumping the
   Anaximenes save key in the same commit (constitution) and accepting it.
2. **The rebuild list + uniform-wrapper rule.** On any world swap (or re-bake) remove
   AND rebuild exactly: `Terrain` group, `Props` group, `Dust`, `Rover`, `CameraRig`,
   `Game`, `hud.bakeMap(terrain)`. **Dust must be rebuilt, not re-pointed**: it wraps
   `terrain.uniforms.uSunDir` at construction, and **you never replace a uniform
   wrapper object — only mutate `.value`** (`ARCHITECTURE.md` §Terrain: every clipmap
   ring and Dust share the same wrapper objects by reference).
3. **Save-blob renames are load-migrated, keys NOT bumped.** `stationVisited`/
   `drumTaken` → `contentVisited`/`payloadTaken` with one-time load migration, because
   Anaximenes worldgen + anomaly ids are unchanged (bake-diff proves it). Bump a
   region's key only when *that region's* anomaly generation/terrain changes.
4. **Objective bookkeeping is per-mission.** `advance()` resets `objDone`/`counts`;
   stale maps pre-complete objectives whose ids repeat across missions (found live:
   L02/L03 `reach`/`recover` collision). Driver-side corollary: the 1.4 s advance
   timer wipes the map, so gate checks capture bookkeeping at the mutation instant
   (immediately after the G tap / before the transition), not after.
5. **Marionette here is NOT WebSocket.** Raw-TCP length-prefixed JSON (`N:<json>`,
   length = BYTES); a WS handshake gets no 101. Send `[0, id, "WebDriver:Name",
   params]`; responses `[1, id, error, {value}]`. `ExecuteScript` takes a function
   BODY (for `import`/`await`: `return (async () => { … })();`) and runs in a
   **separate module map** — `import()` from there loads duplicate modules (fine for
   pure-math checks like G28; to *mutate* page modules inject a
   `<script type="module">`). Reference client: `tools/gate.cjs`.
6. **Synthetic input & steering** (gate helpers are the reference): window-level
   `keydown/keyup` with `code`; KeyD lowers heading, KeyA raises it; `driveTo`
   re-seats ≤8 m if it can't close (the one allowed assist); drills need a
   settle-search re-seat on a ~2 m ring with the nose ON the target (arm yaw ±0.95
   rad; drill radius 2.6 m) — verify the anomaly's `taken`, not `bay.length` (a blind
   core still grows the bay).
7. **The mission card blocks the world** on a fresh start (~700 ms in, `state` → 6;
   click `#cardGo`); on *advance* the card shows while state stays PLAY (world runs
   behind it); on *resume* there is no card.
8. **Ops:** profile dir must exist before launching the test Firefox (or it hangs
   without marionette); kill only the test one —
   `pkill -f "[o]pencode/ffprof"` (bracket stops self-match); background launches =
   `nohup setsid … </dev/null & disown`; the user's Firefox and the 5173 node process
   always survive.
9. **Identity sweep stays closed:** `REGOLITH`, `Anaxagoras`, `Beacon-9`, `MU-7`,
   `CASSIOPEIA`, `winchxyz` must not reappear (vendor/ excepted); lowercase "regolith"
   is the common noun and is fine.
10. **Gate runtime is ~30 min for 28 checks now** (campaign section dominates).
   Don't re-run it reflexively after doc-only changes.

## Next steps (Phase 3 — planets & content, fresh session)

1. Read `spec/constitution.md`, `spec/product-spec.md` (§7 phase map + §8 risks),
   this file, and `docs/ARCHITECTURE.md` (§Terrain, §Content, §World).
2. Deep-plan: `spec/templates/phase-spec.md` → `spec/phases/phase-3-<name>.md`.
   **A planet is a data bundle, not a new engine** (Product Spec §4): extend the
   region record toward gravity/sun-altitude-cycle/sky-palette/albedo parameters,
   deliver **2+ additional worlds** beyond Anaximenes & Long Shadow with their own
   campaigns, and expand per-world content (new sample kinds, new prop builders).
   Anything that starts looking like a new code path goes to `spec/IDEAS.md`.
3. Seeded ideas + parked items: `spec/IDEAS.md` (parking-lot format: scheduled items
   move into the phase spec; out-of-scope items stay until a phase claims them).
4. Keep file allowlists tight; `node --check` + `bake-diff` after every worldgen
   touch; the full gate (28 checks) after every task.

## Open risks

- The gate is **headful-only** (Mesa WebGL2 on `:1`); no CI story. Accepted for now.
- `gameplay.js` remains the one file everything touches; keep refactor slices small
  and gated.
- Per-region worldgen changes multiply the save-key surface: remember the
  identity-based key discipline is now per-region (bake-diff covers Anaximenes only —
  a new region's determinism rides on its own gate checks, as G28 does for Long
  Shadow).
