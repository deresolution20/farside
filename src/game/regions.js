/* ============================================================
   REGIONS — one pure-data record per basin
   ------------------------------------------------------------
   The Anaximenes bundle wraps the existing constants (props,
   content, lore) verbatim and carries the pylon/pipe positions
   that used to be hardcoded in main.js. The Long Shadow record is
   complete: tuned world data (task 5) and the 5-mission campaign,
   THE COUNT ending and 6-entry codex (tasks 2/6).
   ============================================================ */
import { P_ANAXIMENES } from '../world/bake.js';
import { HOME } from '../world/props.js';
import { STATION, MASSIF, CONTENT } from './content.js';
import { MISSIONS, CODEX, ENDING_CARD } from './lore.js';

const SCATTER_KINDS = ['soil', 'breccia', 'ilmenite', 'agglutinate', 'pyroclast', 'meteoritic'];

/* ------------------------------------------------------------
   THE LONG SHADOW — terrain parameter bundle
   TUNED (task 5) against the §3.2 targets; measured evidence is in the
   phase-2 task-05 result notes.
   - bowl 20/70/330 puts the spawn annulus (r≈316) in the gentle
     bowl-to-terrace falloff, where the shared base fbm is the only
     signal — the flattest drivable ground in the basin.
   - rim amp 77.2 + seed 5123: crest sits ≈117 m above the floor near
     the spawn azimuth (target 90–150) while the breach sector
     (az≈0.31) stays low (≈70 m), so the breach reads as a gap.
   - spawn (233.7, 196.6): max height delta over the AC's 13x13 / 2.5 m
     grid (30 m span) measured in-page on the drivable surface is under
     2 m (see task-05 result notes); max slope within 30 m ~14 deg; no
     pit deeper than 1 m within 12 m. (A 60 m window is not flat anywhere
     in the basin — the shared base fbm's octave-1 wavelength is ~570 m.)
   - landmark aprons (keepClean 130–150 m) cover spawn, both posts, the
     hub and the breach; crater tails fade out before they cross an
     apron edge, leaving ≤20° approaches (measured 13–21°).
   ------------------------------------------------------------ */
export const P_LONGSHADOW = {
  bowl:    { depth: 20, floorR: 70, wallR: 330 },
  rim:     { r: 500, w: 90, amp: 77.2,
             breachBase: 0.30, breachAmp: 1.2, breachSeed: 5123,
             ridgeScale: 0.0058, ridgeSeed: 33,
             terraceAmp: 4, terraceFreq: 0.10, terraceSeed: 31 },
  fall:    { amp: 62 },
  farRidge:{ amp: 170, bias: 0.30, seed: 7, scale: 0.00212 },
  massif:  { on: false },
  rille:   { on: false },
  craters: [
    [104, 26, 50, 0.42, 0.15, 5],
    [ 36,  9, 24, 0.70, 0.20, 19],
    [ 12, 2.4,  8, 0.72, 0.21, 43]
  ],
  keepClean: [[241.7, 203.6, 130], [116, -250, 145], [-149, 188, 145], [-255, -126, 150], [276, 88, 140]]
};

/* ------------------------------------------------------------
   ANAXIMENES — the original basin, values copied verbatim
   ------------------------------------------------------------ */
const ANAXIMENES = {
  id: 'anaximenes',
  name: 'ANAXIMENES',
  subtitle: '72° N · NW LIMB',
  tagline: 'The Knocking at Anaximenes',
  brief: `Two hundred and fourteen days ago the seismic station <b>VANTAGE-3</b> sent four seconds of
    empty carrier and stopped. You are the operator of <b>K-9 KESTREL</b>, put down by descent
    sled on the floor of <b>Anaximenes</b> at seventy-two degrees north.<br><br>
    Survey the basin. Restore the relay chain. Find out what is under the floor —
    and why the dossier does not say what the station was <em>for</em>.`,
  saveKey: 'farside.anaximenes.v3',
  sunAz0: 4.35,
  spawn: { x: 88, z: 207, heading: 2.3 },
  terrain: P_ANAXIMENES,
  playableR: 432,
  landmarks: {
    home:    { ...HOME,    label: 'SLED' },
    station: { ...STATION, label: 'VANTAGE-3' },
    massif:  { ...MASSIF,  label: 'MASSIF' }
  },
  content: CONTENT,
  props: {
    station: 'vantage3',
    pylons: [[-60, 180], [-150, 40], [60, -140], [190, 60], [-250, -110]],
    pipes:  [[-118, -64, 1.3], [86, -152, 1.0], [-206, 96, 1.15], [24, 118, 0.9], [-40, -218, 1.25]],
    bigPipe: { x: MASSIF.x + 6, z: MASSIF.z - 4, s: 2.1 }
  },
  anoms: {
    seed: 0x5EED17,
    pipes: { anchor: 'massif', rings: 5 },
    scatter: { count: 46, kinds: SCATTER_KINDS, rMin: 40 },
    specials: [
      { at: 'massif',  dx: 6,  dz: -4, type: 'drum',   depth: 11.0, special: 'drum',   unlocks: 'drum', deep: true },
      { at: 'station', dx: 14, dz: 9,  type: 'lining', depth: 4.1,  special: 'lining' }
    ]
  },
  transmit: { sample: 'drum', unlocks: ['drum', 'lasthour', 'transmission'] },
  missions: MISSIONS,
  codex: CODEX,
  ending: ENDING_CARD
};

/* ------------------------------------------------------------
   THE LONG SHADOW — world data tuned (task 5); campaign L01–L05,
   THE COUNT ending, and the 6 codex entries (tasks 2 and 6)
   ------------------------------------------------------------ */
const LS_CODEX = [
  {
    id: 'ls-brief', tag: 'DOSSIER', title: 'OPERATION HOLLOW II', meta: 'MERIDIAN AUTHORITY · CLEARANCE COBALT',
    start: true,
    body: [
      `The basin is not on any chart you were given. It sits south-west of Anaximenes, deeper and younger, its rim wall still standing past the angle of repose. In the Authority's own files it does not exist: no survey, no station, no manifest.`,
      `What exists is a preliminary directive, three years older than VANTAGE-3: plant a listening array on the floor, log everything, and do not dig. The posts went dark on the day-612 burst — the same four-second carrier that took the station with it.`,
      `You are the operator of K-9 "KESTREL". Your instructions are to survey the posts, recover what the array heard, and determine why a listening site went silent at the exact moment a basin a hundred kilometres away started counting.`
    ]
  },
  {
    id: 'ls-memo', tag: 'AUTHORITY', title: 'SURVEY DIRECTIVE 11-A', meta: 'PRELIMINARY · RECOVERED FROM POST CACHE',
    start: true,
    body: [
      `Plant the array at the designated sites. The geophones are to be set where the floor allows, and the posts are to log continuously.`,
      `Listen.`,
      `Do not dig. If the returns suggest structure, increase the sampling cadence and await instruction. Under no circumstances is excavation to be attempted at this site. The site is a recorder, not a resource.`,
      `This directive was never rescinded. That is the first thing you will want to ask. Nobody on the Authority side will answer it.`
    ]
  },
  {
    id: 'ls-posta', tag: 'STATION LOG', title: 'POST A · SUN-DAY 612', meta: 'LOCAL STORE · RECOVERED FROM POST A',
    body: [
      `03:14. The geophones heard a count. Not knocking, not a pulse — a count. Even period, no drift, incrementing one by one. The array logged it until the buffer ran out, and the buffer was not long enough.`,
      `I called VANTAGE-3 on the annex procedure. A hundred kilometres away, and not required to be listening, per the same annex.`,
      `The reply was four seconds of carrier, no payload. When the carrier stopped, the count was still running. That is the whole log. That is what I am logging.`
    ]
  },
  {
    id: 'ls-postb', tag: 'STATION LOG', title: 'POST B · SUN-DAY 612', meta: 'LOCAL STORE · RECOVERED FROM POST B · INCOMPLETE',
    body: [
      `Post A is not answering. The line tests clean.`,
      `The count is running here too. Same period as Post A's log, to the nearest tenth. I did not do the arithmetic on what that would mean, and I am not going to.`,
      `Requesting recall of the survey directive. The site is a recorder, not a — `
    ]
  },
  {
    id: 'ls-hub', tag: 'FIELD NOTE', title: 'THE MASTER RECORD', meta: 'ARRAY HUB · CONSOLE STORE · 9 m SUBSURFACE',
    body: [
      `The hub's console was buried under its own dead feed and fed from the tap like everything else. The tap has been dead since day 612. The record was running.`,
      `It is a count. Timestamped, unbroken since the day-612 burst — every entry carries its own clock, and there are no gaps. Not through the dark years, not now, not while I watched the last one write itself.`,
      `It is not counting anything we sent it to count.`
    ]
  },
  {
    id: 'ls-count', tag: 'ENDING', title: 'THE COUNT', meta: 'FINAL ENTRY · UPLINK LOG',
    body: [
      `Two sites. One count. Same period to the nearest tenth, a hundred kilometres apart, in two basins, through two independent arrays that were never on the same manifest.`,
      `It was never a signal. A signal is sent. This is kept. A count is a promise: somebody set the counter, and somebody is waiting for it to finish.`,
      `It started the day you landed. In both basins.`
    ]
  }
];

const LS_MISSIONS = [
  {
    id: 'ls-arrival', tag: 'MISSION 01', name: 'THE LONG SHADOW',
    brief: `The sled is down near the breach in the wall. The array is dark, the posts are scattered across the terraces, and your first sweep came back clean. No returns, no structure, nothing under the floor. On a listening site, that is the first wrong thing.`,
    objectives: [
      { id: 'deploy', type: 'event', on: 'array-deployed', text: 'Deploy the solar array', hint: 'press T' },
      { id: 'drive', type: 'distance', ref: 'home', op: '>', v: 120, text: 'Drive 120 m from the sled' },
      { id: 'scan', type: 'event', on: 'scan-done', text: 'Run one ground-penetrating radar sweep', hint: 'press G' }
    ]
  },
  {
    id: 'ls-echo', tag: 'MISSION 02', name: 'ECHO',
    brief: `Post A sits on the middle terrace, mast tilted, door open on three years of static. Its geophone line was cut between the posts, and its local store never made the carrier — what the post heard at 03:14, what it called out, and what answered are in that store. Reach the post, recover the record, and take the cable out.`,
    objectives: [
      { id: 'reach', type: 'distance', ref: 'postA', op: '<', v: 26, text: 'Reach post A' },
      { id: 'recover', type: 'event', on: 'station-interact', special: 'postA', unlocks: 'postA', unlock: 'ls-posta', text: 'Recover the post record', hint: 'hold E at the post' },
      { id: 'cable', type: 'event', on: 'sample', special: 'cable', text: 'Extract the geophone cable' }
    ]
  },
  {
    id: 'ls-quiet', tag: 'MISSION 03', name: 'THE QUIET ONE',
    brief: `Post B is on the shadowed floor, further across the basin, and its store ends in the middle of a sentence. Recover the record, then put the drill back on the floor: three subsurface returns, minimum, before you move on. The directive said listen. It said nothing about what to do with what you hear.`,
    objectives: [
      { id: 'reach', type: 'distance', ref: 'postB', op: '<', v: 26, text: 'Reach post B' },
      { id: 'recover', type: 'event', on: 'station-interact', special: 'postB', unlocks: 'postB', unlock: 'ls-postb', text: 'Recover the post record', hint: 'hold E at the post' },
      { id: 'find3', type: 'count', on: 'sample', count: 3, text: 'Excavate 3 subsurface returns' }
    ]
  },
  {
    id: 'ls-silence', tag: 'MISSION 04', name: 'SILENCE',
    brief: `The array hub is where the whole network drained into: a mast ring at the rim base, a console buried under its own dead feed. The master record is in the store, and something heavy is under the floor beside it. Recover the master record, and extract the core. Whichever of the two you finish last, the hub closes with it.`,
    objectives: [
      { id: 'reach', type: 'distance', ref: 'hub', op: '<', v: 30, text: 'Reach the array hub' },
      { id: 'record', type: 'event', on: 'station-interact', special: 'hub', unlocks: 'hub', unlock: 'ls-hub', text: 'Recover the master record', hint: 'hold E at the hub' },
      { id: 'deep', type: 'event', on: 'extract', special: 'core', unlocks: 'hub', text: 'Extract the memory core' }
    ]
  },
  {
    id: 'ls-count', tag: 'MISSION 05', name: 'THE COUNT',
    brief: `The wall has one open seam: the breach, the low sector where it stops dead. Reach it. Then put the record where it belongs — offloaded at the sled, transmitted before the uplink closes. Two sites, one count. Let the Authority count it back.`,
    objectives: [
      { id: 'breach', type: 'distance', ref: 'breach', op: '<', v: 26, text: 'Reach the breach' },
      { id: 'transmit', type: 'event', on: 'transmit', text: 'Return to the sled and transmit' }
    ]
  }
];

const LONGSHADOW = {
  id: 'longshadow',
  name: 'THE LONG SHADOW',
  subtitle: 'OPERATION HOLLOW II',
  tagline: 'Operation Hollow II',
  brief: `The basin is not on any chart. The Authority's first listening posts stand in it, dark
    since the day-612 burst, and your first sweep came back clean.<br><br>
    Survey the posts. Recover what the array heard. And find out why a listening site
    went silent at the exact moment a hundred kilometres away started <em>counting</em>.`,
  saveKey: 'farside.longshadow.v1',
  // Sun starts az 0.20 (altitude ≈22°, low): the spawn sits in the
  // rim wall's shadow from az 0.14 to 1.00, so the first ~2.5 min of
  // game time are dark — headlights on, rim line unreadable (task 5).
  sunAz0: 0.20,
  spawn: { x: 233.7, z: 196.6, heading: 3.842 },
  terrain: P_LONGSHADOW,
  playableR: 432,
  // Landmark roles are fixed from the stub; coordinates were re-seated in
  // task 5 onto the flat annulus / aprons (originals sat on the ~45–70°
  // wall face and broke the ≤20° approach windows). The breach keeps the
  // stub's ray (az ≈ 0.31) through the low wall sector.
  landmarks: {
    home:   { x: 241.7, z: 203.6, label: 'SLED' },
    breach: { x: 276,  z: 88,    label: 'BREACH' },
    postA:  { x: 116,  z: -250,  label: 'POST A' },
    postB:  { x: -149, z: 188,   label: 'POST B' },
    hub:    { x: -255, z: -126,  label: 'HUB' }
  },
  content: [
    { at: 'postA', radius: 12, unlocks: 'postA', key: 'postA', prompt: 'HOLD <kbd>E</kbd> — RECOVER POST RECORD' },
    { at: 'postB', radius: 12, unlocks: 'postB', key: 'postB', prompt: 'HOLD <kbd>E</kbd> — RECOVER POST RECORD' },
    { at: 'hub',   radius: 14, unlocks: 'hub',   key: 'hub',   prompt: 'HOLD <kbd>E</kbd> — RECOVER MASTER RECORD' }
  ],
  props: {
    station: 'none',
    pylons: [[250, 120], [60, -140], [-140, 120], [-260, -100]],
    pipes: [],
    bigPipe: null,
    posts: [[116, -250], [-149, 188]],
    hub: [-255, -126]
  },
  anoms: {
    seed: 0x2EED5,
    pipes: null,
    scatter: { count: 30, kinds: SCATTER_KINDS, rMin: 40 },
    specials: [
      { at: 'hub',   dx: 4,  dz: 6,  type: 'core',  depth: 9.0, special: 'core',  unlocks: 'hub', deep: true },
      { at: 'postA', dx: 10, dz: -8, type: 'cable', depth: 2.4, special: 'cable' }
    ]
  },
  transmit: { sample: 'core', unlocks: ['ls-count'] },
  missions: LS_MISSIONS,
  codex: LS_CODEX,
  ending: {
    tag: 'OPERATION HOLLOW II', name: 'THE COUNT',
    brief: `The uplink closed forty seconds ago. The record's count continues to this moment — two sites, one count, running since the day you landed, started the same second, in both basins.\n\nIt was never a signal.\n\nYou are still here. The basin is still here. The count is still running.`,
    objectives: [{ id: '_', text: 'Free survey unlocked — the basin is yours' }]
  }
};

/* ------------------------------------------------------------
    THE CHOS PLAIN — terrain parameter bundle (phase 3, task 5)
    Tuned against the §3.8 targets; measured evidence (full-bake node
    mirror of the in-page sampler, e=0.9 slope) is in the task-05
    result notes.
    - bowl 20/250/450: the shallow wide plain bowl — the flat floor
      extends to r=250 so spawn (r 276), both posts (r 234/244) and
      the rise all sit on the broad plain; the wall rises gently
      250→450 (Anax precedent bake.js:74, 16 m across the interior).
    - rim r 500 / w 80 / amp 20: crest sits ≤37 m over the floor at
      every azimuth (target ≤45; p50 25 / p90 31) — a low broken
      shoulder, never a wall. Constraints: 432 ≤ 500 − 40 − 20 = 440;
      500 + 80 = 580 < 600.
    - massif (the RISE) r 280 / amp 14 / ridgeAmp 2 / seed 73: crest
      +14.9 m over the local floor at (−16,−8) (target +10…+18). Dome
      surface (4 m grid, r ≤ 100): p50 3.2° / p90 6.0° / p99 9.6°;
      the single 11.8° point at (56,12) is the shared base fbm
      (bake.js:80, not per-world tunable): the massif-off base mirror
      reads 10.2° there and the Anaximenes control terrain 30.8°.
    - spawn (52, 268): max Δ 0.48 m over 30 m; max slope within
      30 m 9.8°; no pit deeper than 0.33 m within 12 m.
    - crater tiers 0.30/0.30/0.42: 323 craters inside playableR vs
      Anaximenes' 863 (37 %) — sparse. The wide keepClean aprons
      (incl. the 250 m rise zone and the 170 m edge zone) leave
      ≤20° approaches: postA 9.3° / postB 13.2° / rise 11.8° /
      edge 13.8°.
    - edge re-seated (−330,−250) → (−190,−250): 572 m straight drive
      from spawn, max 6.6° along the line, no wall between.
    ------------------------------------------------------------ */
export const P_CHOS = {
  bowl:    { depth: 20, floorR: 250, wallR: 450 },
  rim:     { r: 500, w: 80, amp: 20,
             breachBase: 0.55, breachAmp: 0.65, breachSeed: 71,
             ridgeScale: 0.0060, ridgeSeed: 37,
             terraceAmp: 3, terraceFreq: 0.09, terraceSeed: 5 },
  fall:    { amp: 55 },
  farRidge:{ amp: 150, bias: 0.30, seed: 9, scale: 0.00212 },
  massif:  { on: true, r: 280, amp: 14, ridgeAmp: 2, seed: 73, scale: 0.008 },
  rille:   { on: false },
  craters: [
    [104, 24, 48, 0.30, 0.145, 9],
    [ 36,  8, 20, 0.30, 0.175, 23],
    [ 12,  2.2,  7, 0.42, 0.19, 47]
  ],
  keepClean: [[60, 260, 130], [-180, 150, 145], [200, -140, 145], [0, 0, 250], [-190, -250, 170]]
};

/* ------------------------------------------------------------
    THE CHOS PLAIN — world data (phase 3, task 5): the first foreign
    world — the planet abstraction's proof of concept. Everything in
    this record is data; the plain holds no lattice (the plain is the
    drum), the posts' records timestamp the count restarting at the
    player's touchdown, and the 2.2 m ring core is the shallowest
    drill in the game.
    ------------------------------------------------------------ */
const CHOS_CODEX = [
  {
    id: 'gm-brief', tag: 'DOSSIER', title: 'SITE CHOS', meta: 'MERIDIAN AUTHORITY · CLEARANCE COBALT',
    start: true,
    body: [
      `The site is not on any chart you were given. It sits on a plain so broad the rim of the landing basin is a memory by day's end — broad, pale, ringing faintly under the noise floor. In the Authority's files it does not exist as a survey: no station, no array, no manifest.`,
      `What exists is a survey order, eleven years older than the manifest it was filed under — Operation Hollow, Annex E. It is one line long: *the plain of Chos. Listen. Log. Do not dig.*`,
      `You are the operator of K-9 "KESTREL". The posts are dark. The first sweep came back with no returns at all — one floor, one faint tone under the noise, the whole plain answering as a single membrane.`
    ]
  },
  {
    id: 'gm-memo', tag: 'AUTHORITY', title: 'SURVEY DIRECTIVE 4-E', meta: 'PRELIMINARY · RECOVERED FROM POST CACHE',
    start: true,
    body: [
      `Plant the geophones where the plain allows. The posts are to log continuously.`,
      `Listen. Do not dig. If the returns suggest structure, increase the sampling cadence and await instruction. Under no circumstances is excavation to be attempted at this site.`,
      `The last instruction received at this site was day 612, 04:00: four seconds of carrier, no payload. The directive was never rescinded. That is the first thing you will want to ask.`
    ]
  },
  {
    id: 'gm-posta', tag: 'STATION LOG', title: 'CHOS POST A · SOL 612', meta: 'LOCAL STORE · RECOVERED FROM POST A',
    body: [
      `The geophones have been logging a count. Even period, to the tenth of a second, no drift. Not knocking — a count. A count is a promise: somebody set the counter.`,
      `At T+0.0 of a descent clearing the rim, the count resumed.`,
      `I did not send a descent. Nobody on the manifest did. I am logging who did.`
    ]
  },
  {
    id: 'gm-postb', tag: 'STATION LOG', title: 'CHOS POST B · SOL 612 · INCOMPLETE', meta: 'LOCAL STORE · RECOVERED FROM POST B · INCOMPLETE',
    body: [
      `The count ran here too. Same period to the tenth as Post A's log, across a plain with nothing in it — no hub, no array, no pipes.`,
      `The plain rings under the wheels. I logged it anyway.`,
      `The plain does not need the pipes. The plain is the head. —`
    ]
  },
  {
    id: 'gm-ring', tag: 'FIELD NOTE', title: 'THE HEAD', meta: 'EXTRACTED FIELD · 2.2 m SUBSURFACE · THE RISE',
    body: [
      `The extracted field: four billion years of lining, laid down as floor. Four hundred metres across at the last clean edge, ringing without damping under every wheel that crosses it.`,
      `It is not lining pipes. It is the drum. The pipes at Anaximenes are the packaging. The drum is everywhere.`
    ]
  },
  {
    id: 'gm-arrival', tag: 'ENDING', title: 'THE ARRIVAL', meta: 'FINAL ENTRY · UPLINK LOG',
    body: [
      `The uplink closed forty seconds ago. The record's clock starts at your touchdown — T+0.0, to the tenth of a second. Not day 612. Not the first site. Yours.`,
      `Two hundred and thirteen sun-days the count sat still; then the shadow of a descent cleared the rim, and this plain started counting again.`,
      `It is counting something. The record does not say what. The record does not need to — the count does not stop for a question.`
    ]
  }
];

const CHOS_MISSIONS = [
  {
    id: 'gm-dark', tag: 'MISSION 01', name: 'THE DARK PLAIN',
    brief: `The sun never climbs here; it crawls along the horizon all day, and the shadows turn instead of shortening. Your first sweep came back wrong in a way that takes a minute to name: no returns. One floor, one faint tone under the noise — the whole plain answering as a single membrane.`,
    objectives: [
      { id: 'deploy', type: 'event', on: 'array-deployed', text: 'Deploy the solar array', hint: 'press T' },
      { id: 'drive', type: 'distance', ref: 'home', op: '>', v: 120, text: 'Drive 120 m from the sled' },
      { id: 'scan', type: 'event', on: 'scan-done', text: 'Run one ground-penetrating radar sweep', hint: 'press G' }
    ]
  },
  {
    id: 'gm-first', tag: 'MISSION 02', name: 'THE FIRST ENTRY',
    brief: `Post A is the site's first eye, planted before the site was on any chart. Recover the record; three subsurface returns. The plain will answer every time. That is the part to keep in your head.`,
    objectives: [
      { id: 'reach', type: 'distance', ref: 'postA', op: '<', v: 26, text: 'Reach post A' },
      { id: 'recover', type: 'event', on: 'station-interact', special: 'postA', unlocks: 'postA', unlock: 'gm-posta', text: 'Recover the post record', hint: 'hold E at the post' },
      { id: 'find3', type: 'count', on: 'sample', count: 3, text: 'Excavate 3 subsurface returns' }
    ]
  },
  {
    id: 'gm-ring', tag: 'MISSION 03', name: 'THE RING',
    brief: `Post B keeps the older record; the rise keeps something under it. The tone is centered on the rise — shallow, enormous, whole. Recover the record, then cut the shallowest core of your career. The floor here is not ground. It is the head.`,
    objectives: [
      { id: 'reach', type: 'distance', ref: 'postB', op: '<', v: 26, text: 'Reach post B' },
      { id: 'recover', type: 'event', on: 'station-interact', special: 'postB', unlocks: 'postB', unlock: 'gm-postb', text: 'Recover the post record', hint: 'hold E at the post' },
      { id: 'ring', type: 'event', on: 'extract', special: 'ring', unlocks: 'ring', unlock: 'gm-ring', text: 'Extract the ring from the rise (2.2 m)', hint: 'drill the marked field' }
    ]
  },
  {
    id: 'gm-drive', tag: 'MISSION 04', name: 'THE LONG DRIVE',
    brief: `Headlight against a midday that never gets bright, the far edge of the plain is a long drive out, and Jove sits the size of the whole sky off the horizon. Nothing here will be in a hurry. Three returns on the way out — the plain keeps answers.`,
    objectives: [
      { id: 'edge', type: 'distance', ref: 'edge', op: '<', v: 26, text: 'Reach the edge of the plain' },
      { id: 'find3', type: 'count', on: 'sample', count: 3, text: 'Excavate 3 subsurface returns' }
    ]
  },
  {
    id: 'gm-arrival', tag: 'MISSION 05', name: 'THE ARRIVAL',
    brief: `Post B's record ends with a timestamp. Bring the sample home, offload it at the sled, and let the uplink close over it. The timestamp is going to be yours.`,
    objectives: [
      { id: 'home', type: 'distance', ref: 'home', op: '<', v: 26, text: 'Return to the sled' },
      { id: 'transmit', type: 'event', on: 'transmit', text: 'Transmit the sample' }
    ]
  }
];

const CHOS = {
  id: 'ganymede',
  name: 'THE CHOS PLAIN',
  subtitle: 'GANYMEDE · CHOS PLAIN',
  tagline: 'The Plain That Rings',
  brief: `The survey order that planted this site is older than the manifest it was filed under, and the plain itself is the whole story: broad, pale, ringing faintly under the noise floor.<br><br>
    No returns on the first sweep — one floor, one faint tone under the noise, the whole plain answering as a single membrane. <em>Listen. Log. Do not dig.</em>`,
  saveKey: 'farside.ganymede.v1',
  // Sun starts at the dimmest point of the altitude crawl: base 0.06 +
  // sin(az·0.5 − 0.4)·0.05 keeps the disc between ~0.6° and ~6.3° above the
  // horizon all day (phase-3 task 5, §3.2) — a midday that never gets
  // bright, the world's signature.
  sunAz0: 10.22,
  spawn: { x: 52, z: 268, heading: 2.0 },
  terrain: P_CHOS,
  playableR: 432,
  landmarks: {
    home:  { x: 60,   z: 260,  label: 'SLED' },
    rise:  { x: 0,    z: 0,    label: 'RISE' },
    postA: { x: -180, z: 150,  label: 'POST A' },
    postB: { x: 200,  z: -140, label: 'POST B' },
    edge:  { x: -190, z: -250, label: 'EDGE' }
  },
  content: [
    { at: 'postA', radius: 12, unlocks: 'postA', key: 'postA', prompt: 'HOLD <kbd>E</kbd> — RECOVER POST RECORD' },
    { at: 'postB', radius: 12, unlocks: 'postB', key: 'postB', prompt: 'HOLD <kbd>E</kbd> — RECOVER POST RECORD' }
  ],
  props: {
    station: 'none',
    pylons: [[150, 180], [-120, 60]],
    pipes: [],
    bigPipe: null,
    posts: [[-180, 150], [200, -140]]
  },
  anoms: {
    seed: 0x7C1D2,
    pipes: null,
    scatter: { count: 24, kinds: [...SCATTER_KINDS, 'frost'], rMin: 40 },
    specials: [
      { at: 'rise', dx: 0, dz: 0, type: 'drum', depth: 2.2, special: 'ring', unlocks: 'ring', deep: true }
    ]
  },
  transmit: { sample: 'ring', unlocks: ['gm-arrival'] },
  g: 1.428,
  sun: { rate: 0.0015, base: 0.06, amp: 0.05, freq: 0.5, phase: -0.4 },
  sky: {
    planet: 'jove',
    jove: { az: 4.9, alt: 0.22, angular: 0.13,
            companions: [
              [4.78, 0.27, 0.0030, [0.92, 0.90, 0.86]],  // Europa — pale, west of the giant
              [5.06, 0.19, 0.0034, [0.85, 0.78, 0.52]],  // Io — sulphur, east-southeast
              [4.97, 0.30, 0.0040, [0.72, 0.66, 0.60]]   // the namesake — grey-brown, higher
            ] },
    sunAngular: 0.0018,
    sunScale: 0.55,
    starSeed: 0x71F0C,
    ground: [0.17, 0.165, 0.155]
  },
  albedo: { seedMare: 41, seedFine: 83, high: 198, low: 176, fineLo: 0.90, fineHi: 0.20, tone: [1.0, 1.0, 1.03], flash: null },
  dust: { albedo: [0.17, 0.165, 0.155], glow: [0.36, 0.52, 0.60] },
  missions: CHOS_MISSIONS,
  codex: CHOS_CODEX,
  ending: {
    tag: 'SITE CHOS', name: 'THE ARRIVAL',
    brief: `The uplink closed forty seconds ago. The record's clock starts at your touchdown — T+0.0, to the tenth of a second. Not day 612. Not the first site. Yours.\n\nTwo hundred and thirteen sun-days the count sat still; then the shadow of a descent cleared the rim, and this plain started counting again.\n\nIt is counting something. The record does not say what. The record does not need to — the count does not stop for a question.`,
    objectives: [{ id: '_', text: 'Free survey unlocked — the plain is yours' }]
  }
};

export const REGIONS = [ANAXIMENES, LONGSHADOW, CHOS];
