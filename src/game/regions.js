/* ============================================================
   REGIONS — one pure-data record per basin
   ------------------------------------------------------------
   The Anaximenes bundle wraps the existing constants (props,
   content, lore) verbatim and carries the pylon/pipe positions
   that used to be hardcoded in main.js. The Long Shadow record
   is a stub: its world data is initial (task 5 retunes the
   terrain and props) and its campaign grows in task 6.
   ============================================================ */
import { P_ANAXIMENES } from '../world/bake.js';
import { HOME } from '../world/props.js';
import { STATION, MASSIF, CONTENT } from './content.js';
import { MISSIONS, CODEX, ENDING_CARD } from './lore.js';

const SCATTER_KINDS = ['soil', 'breccia', 'ilmenite', 'agglutinate', 'pyroclast', 'meteoritic'];

/* ------------------------------------------------------------
   THE LONG SHADOW — terrain parameter bundle
   Initial values (phase spec §3.2): task 5 tunes them against the
   terrain targets. Coordinates and roles are fixed, numbers are not.
   ------------------------------------------------------------ */
export const P_LONGSHADOW = {
  bowl:    { depth: 40, floorR: 70, wallR: 440 },
  rim:     { r: 500, w: 90, amp: 150,
             breachBase: 0.30, breachAmp: 1.2, breachSeed: 79,
             ridgeScale: 0.0058, ridgeSeed: 33,
             terraceAmp: 12, terraceFreq: 0.10, terraceSeed: 31 },
  fall:    { amp: 62 },
  farRidge:{ amp: 170, bias: 0.30, seed: 7, scale: 0.00212 },
  massif:  { on: false },
  rille:   { on: false },
  craters: [
    [104, 30, 60, 0.42, 0.16, 5],
    [ 36,  9, 24, 0.70, 0.20, 19],
    [ 12, 2.4,  8, 0.72, 0.21, 43]
  ],
  keepClean: [[300, 210, 30], [150, -320, 28], [-220, 280, 28], [-340, -180, 36]]
};

/* ------------------------------------------------------------
   ANAXIMENES — the original basin, values copied verbatim
   ------------------------------------------------------------ */
const ANAXIMENES = {
  id: 'anaximenes',
  name: 'ANAXIMENES',
  subtitle: '72° N · NW LIMB',
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
   THE LONG SHADOW — stub (tasks 5 and 6 finish it)
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
  }
];

const LONGSHADOW = {
  id: 'longshadow',
  name: 'THE LONG SHADOW',
  subtitle: 'OPERATION HOLLOW II',
  brief: `The basin is not on any chart. The Authority's first listening posts stand in it, dark
    since the day-612 burst, and your first sweep came back clean.<br><br>
    Survey the posts. Recover what the array heard. And find out why a listening site
    went silent at the exact moment a hundred kilometres away started <em>counting</em>.`,
  saveKey: 'farside.longshadow.v1',
  sunAz0: 4.35 + Math.PI,
  spawn: { x: 292, z: 203, heading: 0.96 },
  terrain: P_LONGSHADOW,
  playableR: 432,
  landmarks: {
    home:   { x: 300,  z: 210,  label: 'SLED' },
    breach: { x: 380,  z: 120,  label: 'BREACH' },
    postA:  { x: 150,  z: -320, label: 'POST A' },
    postB:  { x: -220, z: 280,  label: 'POST B' },
    hub:    { x: -340, z: -180, label: 'HUB' }
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
    posts: [[150, -320], [-220, 280]],
    hub: [-340, -180]
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

export const REGIONS = [ANAXIMENES, LONGSHADOW];
