#!/usr/bin/env node
// Raw-TCP Marionette gate driver (no WS): length-prefixed JSON `N:<json>`
// Command: [0, id, name, params]   Response: [1, id, error, body]
// ExecuteScript: params.script is a function BODY (driver wraps it).
//
// Scenario: FULL CAMPAIGN playthrough — all five missions driven with
// synthetic input only (steering loop, arm aim, LMB drills, hold-E), ending
// card, then a save-v3 round-trip into free survey.
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');

// usage: node tools/gate.cjs [marionettePort] [shotDir]
// env:   GATE_URL (default http://localhost:8080/)
const PORT = Number(process.argv[2] || 2828);
const URL = process.env.GATE_URL || 'http://localhost:8080/';
const SHOT_DIR = process.argv[3] || '.shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

let nextId = 1;
const pending = new Map();
let buf = Buffer.alloc(0);
let capInfo = null;
let done = false;

function fail(err) { console.error('FATAL:', err.message); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parse() {
  while (true) {
    const ci = buf.indexOf(':');
    if (ci < 0) return;
    if (!/^\d+$/.test(buf.subarray(0, ci).toString('latin1'))) {
      fail(new Error('bad header: ' + buf.subarray(0, ci).toString('latin1')));
    }
    const n = parseInt(buf.subarray(0, ci).toString('latin1'), 10);
    if (buf.length < ci + 1 + n) return;
    const payload = buf.subarray(ci + 1, ci + 1 + n).toString('utf8');
    buf = buf.subarray(ci + 1 + n);
    let msg;
    try { msg = JSON.parse(payload); } catch { fail(new Error('bad json')); }
    if (Array.isArray(msg) && msg[0] === 1) {
      const [, id, error, body] = msg;
      const p = pending.get(id);
      if (!p) continue;
      pending.delete(id);
      if (error) p.reject(new Error('command error: ' + JSON.stringify(error)));
      else p.resolve(body);
    } else if (!Array.isArray(msg) && !capInfo) {
      capInfo = msg;
    }
  }
}

const sock = net.connect(PORT, '127.0.0.1');
sock.on('data', (d) => { buf = Buffer.concat([buf, d]); parse(); });
sock.on('error', fail);
sock.on('close', () => { if (!done) fail(new Error('socket closed')); });

function send(name, params = {}) {
  const id = nextId++;
  const json = JSON.stringify([0, id, name, params]);
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    sock.write(json.length + ':' + json);
  });
}

// code = function BODY
async function js(code) {
  const body = await send('WebDriver:ExecuteScript', { script: code, args: [] });
  return body && body.value;
}

async function poll(desc, code, timeoutMs, intervalMs = 1000) {
  const t0 = Date.now();
  for (;;) {
    let v;
    try { v = await js(code); } catch { v = undefined; }
    if (v) return v;
    if (Date.now() - t0 > timeoutMs) throw new Error('poll timeout: ' + desc);
    await sleep(intervalMs);
  }
}

async function shot(n) {
  const body = await send('WebDriver:TakeScreenshot', {});
  const file = path.join(SHOT_DIR, n + '.png');
  fs.writeFileSync(file, Buffer.from(body.value, 'base64'));
  console.log('shot', file);
}

function keyBody(code, type) {
  return `window.dispatchEvent(new KeyboardEvent(${JSON.stringify(type)}, {code: ${JSON.stringify(code)}, key: ${JSON.stringify(code)}, bubbles: true})); return true;`;
}

const results = [];
function result(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  [' + detail + ']' : ''));
}

/* ---------------- synthetic-input helpers ---------------- */

const wrapPI = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

let held = new Set();
async function setKeys(want) {
  for (const k of [...held]) if (!want.includes(k)) { await js(keyBody(k, 'keyup')); held.delete(k); }
  for (const k of want) if (!held.has(k)) { await js(keyBody(k, 'keydown')); held.add(k); }
}
async function clearKeys() { await setKeys([]); }

async function tap(code) {
  await js(keyBody(code, 'keydown'));
  await sleep(120);
  await js(keyBody(code, 'keyup'));
  await sleep(80);
}

// Arm deploy with retry. KeyR is a toggle, and its edge is dropped if a frame
// consumes it while App.state !== PLAY (observed once, m05 drumhead), so a
// single tap + poll is not reliable enough to gate on. Tap-until-true is
// convergent: every tap flips armOut and we proceed only when it reads out.
// A residual deploy from an earlier step is also covered: if the arm is
// already out we do not tap at all.
async function armDeployed() {
  for (let i = 0; i < 3; i++) {
    if (await js(`const g = window.FARSIDE.game; return g && g.rover.armOut ? true : null;`)) return;
    await tap('KeyR');
    try {
      await poll('arm deployed (tap ' + (i + 1) + ')',
        `const g = window.FARSIDE.game; return g && g.rover.armOut ? true : null;`, 8000);
      return;
    } catch {}
  }
  throw new Error('arm never deployed after 3 taps');
}

// One left mouse press on the canvas (drill trigger). requestPointerLock()
// inside the handler rejects harmlessly without user activation.
async function lmb() {
  await js(`
    const c = document.querySelector('canvas');
    c.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
    setTimeout(() => window.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true })), 150);
    return true;
  `);
  await sleep(400);
}

async function snap() {
  return js(`
    const g = window.FARSIDE.game; if (!g) return null;
    const r = g.rover, p = r.pos;
    return {
      x: p.x, z: p.z, fx: r.forward.x, fz: r.forward.z, v: r.vel.length(),
      armOut: !!r.armOut, armX: r.armTarget.x, armZ: r.armTarget.z,
      power: g.power, bay: g.bay.length,
      missionId: g.missionId, freeRoam: g.freeRoam,
      objDone: g.objDone, counts: g.counts,
      relays: g.relaysPlaced, payloadTaken: g.payloadTaken, transmitted: g.transmitted,
      contentVisited: g.contentVisited, state: window.FARSIDE.state
    };
  `);
}

// Steering loop — real W/A/D input, no teleport. If it cannot close on the
// target within budget, re-seat the rover within 8 m of it (logged in the
// result detail): the one permitted driver assist. Objectives still complete
// through the real game path.
async function driveTo(tx, tz, stopDist = 6, budgetMs = 180000) {
  const t0 = Date.now();
  let reseatNote = '';
  let d = 1e9;
  while (Date.now() - t0 < budgetMs) {
    const s = await snap();
    if (!s) { await sleep(500); continue; }
    if (s.missionId != null && s.state === 6) { await ackCard(); continue; }
    d = Math.hypot(tx - s.x, tz - s.z);
    if (d <= stopDist) break;
    const heading = Math.atan2(s.fx, s.fz);
    const err = wrapPI(Math.atan2(tx - s.x, tz - s.z) - heading);
    // Steer key that REDUCES |err|: KeyA raises heading, KeyD lowers it
    // (verified empirically — the inverse mapping limit-cycled the rover away
    // from every target and forced a re-seat on all drives).
    let want;
    if (Math.abs(err) > 0.30) want = [err < 0 ? 'KeyD' : 'KeyA'];
    else if (Math.abs(err) > 0.06) want = [err < 0 ? 'KeyD' : 'KeyA', 'KeyW'];
    else want = ['KeyW'];
    if (s.v > 6.5 && Math.abs(err) > 0.18) want = want.filter((k) => k !== 'KeyW');
    await setKeys(want);
    await sleep(180);
  }
  if (d > stopDist) {
    const last = await snap();
    const yaw = Math.atan2(tx - last.x, tz - last.z);
    await js(`
      const g = window.FARSIDE.game;
      g.rover.placeAt(${tx.toFixed(2)}, ${tz.toFixed(2)}, ${yaw.toFixed(3)});
      g.rover.vel.set(0, 0, 0);
      return true;
    `);
    reseatNote = ' reseated';
    d = 0;
  }
  await clearKeys();
  await js(keyBody('Space', 'keydown'));
  await sleep(700);
  await js(keyBody('Space', 'keyup'));
  await sleep(300);
  return d + reseatNote;
}

// Acknowledge the mission/ending card when it is up.
async function ackCard() {
  await js(`const c = document.getElementById('cardGo'); if (c) c.click(); return true;`).catch(() => {});
  await sleep(600);
  await clearKeys();   // nothing may stay latched while the card was up
}

async function waitCard(desc, timeoutMs = 20000) {
  await poll(desc,
    `return !document.getElementById('cardOverlay').classList.contains('hidden') ? true : null;`, timeoutMs);
}

// Reliable drill: the arm only swings +/-0.95 rad off the chassis heading, so a
// target that is not near dead-ahead can be out of the arm's reach and the bit
// lands >2.6 m away -> nearestAnom() picks a blind core and the target is never
// taken (this is exactly how the m04 lining was missed). So instead of driveTo +
// swing, drop the rover (brake set) on a small ring around the target with the
// nose pointed AT it, keep the spot that settles closest and stopped, then
// extend straight ahead and drill. Re-seating <= ring m is inside the driver
// assist allowance. Verifies the target is actually taken (not just bay count).
async function drillFacing(anomId, ring = 2.0) {
  const a = await js(`
    const g = window.FARSIDE.game;
    const a = g.anoms.find((x) => x.id === ${JSON.stringify(anomId)});
    if (!a) return null;
    g.rover.armOut = false; g.drill.active = false;
    return { x: a.x, z: a.z };
  `);
  if (!a) throw new Error('anomaly not found: ' + anomId);
  await waitPower(25, 120000);
  await clearKeys();
  let best = null;
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const sx = a.x + Math.cos(ang) * ring;
    const sz = a.z + Math.sin(ang) * ring;
    const yaw = Math.atan2(a.x - sx, a.z - sz);
    await js(`
      const g = window.FARSIDE.game;
      g.rover.placeAt(${sx.toFixed(3)}, ${sz.toFixed(3)}, ${yaw.toFixed(4)});
      g.rover.vel.set(0, 0, 0);
      window.dispatchEvent(new KeyboardEvent('keydown', {code:'Space', key:'Space', bubbles:true}));
      return true;
    `);
    await sleep(3600);                       // settle
    const s = await js(`
      const g = window.FARSIDE.game, r = g.rover;
      window.dispatchEvent(new KeyboardEvent('keyup', {code:'Space', key:'Space', bubbles:true}));
      return { x: +r.pos.x.toFixed(2), z: +r.pos.z.toFixed(2),
               v: +r.vel.length().toFixed(2),
               dT: +Math.hypot(r.pos.x - ${a.x}, r.pos.z - (${a.z})).toFixed(2) };
    `);
    await sleep(200);
    // reachable = arm (max 1.62 m) can put the bit inside the 2.6 m drill radius
    const reachable = (s.dT - 1.62) < 2.6 && s.v < 0.5;
    if (reachable && (!best || s.dT < best.dT)) best = { ...s, sx: +sx.toFixed(2), sz: +sz.toFixed(2), yaw: +yaw.toFixed(3) };
  }
  if (!best) throw new Error('no settle spot within arm reach of ' + anomId);
  await js(`
    const g = window.FARSIDE.game;
    g.rover.placeAt(${best.sx}, ${best.sz}, ${best.yaw});
    g.rover.vel.set(0, 0, 0);
    window.dispatchEvent(new KeyboardEvent('keydown', {code:'Space', key:'Space', bubbles:true}));
    return true;
  `);
  await clearKeys();
  await poll('chassis settled before drill',
    `const g = window.FARSIDE.game; return g.rover.vel.length() < 0.3 ? true : null;`, 8000);
  await armDeployed();                 // arm out (target is dead ahead, no swing)
  await setKeys(['KeyW']);                 // extend to max reach
  await sleep(800);
  await clearKeys();
  await poll('chassis pinned before drilling',
    `const g = window.FARSIDE.game; return g.rover.vel.length() < 1.1 ? true : null;`, 10000);
  await lmb();
  await poll('drill cycle finished',
    `const g = window.FARSIDE.game;
     const a = g.anoms.find((x) => x.id === ${JSON.stringify(anomId)});
     return a && a.taken ? true : null;`, 30000);
  await js(keyBody('Space', 'keyup'));     // release the brake
  await tap('KeyR');                       // stow for the drive home
  const taken = await js(`
    const g = window.FARSIDE.game;
    const a = g.anoms.find((x) => x.id === ${JSON.stringify(anomId)});
    return a ? !!a.taken : null;
  `);
  return { taken, dT: best.dT };
}

// The drumhead core sits in a ~45 deg scarp on the massif: a rover parked nearby slides
// down-slope a few metres, and the slide direction is NOT uniform around the
// scarp — a gradient guess parks it on the wrong side and it runs off. The arm
// also only swings +/-0.95 rad off the chassis heading (main.js), so the core
// must sit near dead ahead. So we do what a careful operator would:
//   1. settle-search — drop the rover (brake set) at 8 candidate spots on a
//      2.5 m ring around the core, each nosed at it, and keep the one that
//      comes to rest closest to the core with the chassis actually stopped.
//   2. hold the brake (Space) through arm-out + drill so the chosen spot holds.
// Re-seating ~2.5 m from the core is inside the 8 m driver-assist allowance.
// Verified: best spot settles v~0 at dCore~2.9 m, bit lands ~0.4 m from the core.
async function extractDrum(coreId) {
  const a = await js(`
    const g = window.FARSIDE.game;
    const a = g.anoms.find((x) => x.id === ${JSON.stringify(coreId)});
    if (!a) return null;
    g.rover.armOut = false; g.drill.active = false;
    return { x: a.x, z: a.z };
  `);
  if (!a) throw new Error('drumhead core not found: ' + coreId);
  await clearKeys();                       // no stray drive/aim keys before we park
  // settle-search: for each of 8 ring angles, park nosed-at-core with the brake
  // set, let it settle, record where it rests. All in-page per candidate.
  const ring = 2.5;
  let best = null;
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const sx = a.x + Math.cos(ang) * ring;
    const sz = a.z + Math.sin(ang) * ring;
    const yaw = Math.atan2(a.x - sx, a.z - sz);
    await js(`
      const g = window.FARSIDE.game;
      g.rover.placeAt(${sx.toFixed(3)}, ${sz.toFixed(3)}, ${yaw.toFixed(4)});
      g.rover.vel.set(0, 0, 0);
      window.dispatchEvent(new KeyboardEvent('keydown', {code:'Space', key:'Space', bubbles:true}));
      return true;
    `);
    await sleep(3800);                       // settle
    const s = await js(`
      const g = window.FARSIDE.game, r = g.rover;
      window.dispatchEvent(new KeyboardEvent('keyup', {code:'Space', key:'Space', bubbles:true}));
      return { x: +r.pos.x.toFixed(2), z: +r.pos.z.toFixed(2),
                v: +r.vel.length().toFixed(2),
                dCore: +Math.hypot(r.pos.x - ${a.x}, r.pos.z - (${a.z})).toFixed(2) };
    `);
    await sleep(200);
    // reachable = arm (max 1.62 m) can put the bit inside the 2.6 m drill radius
    const reachable = (s.dCore - 1.62) < 2.6 && s.v < 0.5;
    if (reachable && (!best || s.dCore < best.dCore)) best = { ...s, ang, sx: +sx.toFixed(2), sz: +sz.toFixed(2), yaw: +yaw.toFixed(3) };
  }
  if (!best) throw new Error('no settle spot within arm reach of the drumhead core');
  // re-park at the winner and hold the brake for the whole drill
  await js(`
    const g = window.FARSIDE.game;
    g.rover.placeAt(${best.sx}, ${best.sz}, ${best.yaw});
    g.rover.vel.set(0, 0, 0);
    window.dispatchEvent(new KeyboardEvent('keydown', {code:'Space', key:'Space', bubbles:true}));
    return true;
  `);
  await waitPower(25, 120000);
  await clearKeys();
  // wait until the chassis is actually settled (brake holding it), not a guess
  await poll('chassis settled on scarp',
    `const g = window.FARSIDE.game; return g.rover.vel.length() < 0.3 ? true : null;`, 8000);
  await armDeployed();                 // arm out
  const aimT0 = Date.now();
  for (;;) {
    const s = await snap();
    if (!s) { await sleep(300); continue; }
    const want = wrapPI(Math.atan2(a.x - s.x, a.z - s.z) - Math.atan2(s.fx, s.fz));
    const err = wrapPI((s.armYaw || 0) - want);
    if (Math.abs(err) < 0.12 || Date.now() - aimT0 > 12000) break;
    await setKeys([err > 0 ? 'KeyD' : 'KeyA']);
    await sleep(120);
  }
  await setKeys(['KeyW']);                 // extend to max reach
  await sleep(800);
  await clearKeys();
  await poll('chassis pinned before drilling',
    `const g = window.FARSIDE.game; return g.rover.vel.length() < 1.1 ? true : null;`, 10000);
  await lmb();
  await poll('drumhead drill cycle finished',
    `const g = window.FARSIDE.game; return g && g.payloadTaken ? true : null;`, 30000);
  await js(keyBody('Space', 'keyup'));     // release the brake
  await tap('KeyR');                       // stow for the drive home
  return a;
}

async function waitPower(min = 30, budgetMs = 240000) {
  const t0 = Date.now();
  while (Date.now() - t0 < budgetMs) {
    const s = await snap();
    if (s && s.power >= min) return s.power;
    await sleep(1500);
  }
  throw new Error('power never reached ' + min);
}

// Scan here; return the found anomalies (empty when no return), nearest first.
async function scanHere() {
  await waitPower(10, 60000);
  await tap('KeyG');
  await sleep(2900);                       // SCAN_TIME 2.1 + settle
  const out = await js(`
    const g = window.FARSIDE.game;
    const p = g.rover.pos;
    return g.anoms.filter((a) => a.found && !a.taken && Math.hypot(a.x - p.x, a.z - p.z) < 110)
      .map((a) => ({ id: a.id, x: a.x, z: a.z, type: a.type, special: a.special }));
  `);
    const p = await snap();
    // pipes first (their sample unlocks the VOIDS codex), then nearest
    return (out || []).sort((a, b) =>
      (b.type === 'pipe' ? 1 : 0) - (a.type === 'pipe' ? 1 : 0) ||
      Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
}

// High-ground relay sites: > 10.5 m (game needs 10), slope <= 26 deg
// (the game's own drivable threshold), pairwise >= 95 m. The drivable high
// ground is the terraced apron under the rim wall (r ~ 360-440) and the
// massif plateau. The whole candidate grid is probed in ONE browser call;
// selection (spacing + count) happens here. Collects extras so a game refusal
// (height at the actual stop point, spacing) is a re-search, not a failure.
async function findRelaySites() {
  const pts = await js(`
    const t = window.FARSIDE.game.terrain;
    const pts = [];
    for (let r = 440; r >= 60; r -= 16) {
      const n = Math.max(16, Math.round(r / 10));
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + r * 0.05;
        const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
        const h = t.heightAt(x, z), s = t.slopeAt(x, z);
        pts.push([x, z, h, s]);
      }
    }
    return JSON.stringify(pts);
  `);
  const grid = JSON.parse(pts);
  const out = [];
  for (const [x, z, h, s] of grid) {
    if (h == null || s == null) continue;
    if (h < 10.5 || s > 26) continue;
    if (out.some((p) => Math.hypot(p.x - x, p.z - z) < 95)) continue;
    out.push({ x, z, h });
    if (out.length >= 6) break;
  }
  return out;
}

(async () => {
  const t0 = Date.now();
  while (!capInfo) { if (Date.now() - t0 > 15000) throw new Error('no capabilities'); await sleep(100); }
  console.log('capabilities:', JSON.stringify(capInfo));

  const sess = await send('WebDriver:NewSession', {});
  console.log('session:', (sess && sess.sessionId) || JSON.stringify(sess).slice(0, 120));

  await send('WebDriver:Navigate', { url: URL });

  /* ============ menu -> MISSION 01 ============ */
  await poll('btnPlay visible',
    `const b = document.getElementById('btnPlay'); return b && !b.disabled && b.offsetParent !== null ? true : null;`,
    120000);
  result('menu loads, BEGIN DESCENT visible', true);
  await shot('01_menu');

  await js(`document.getElementById('btnPlay').click(); return true;`);
  await waitCard('mission 01 card shown');
  await js(`document.getElementById('cardGo').click(); return true;`);
  await poll('game state PLAY after ACKNOWLEDGE',
    `return window.FARSIDE && window.FARSIDE.state === 2 ? true : null;`, 15000);
  result('game starts, mission card acknowledged (state=PLAY)', true);
  await shot('02_game');

  /* ============ MISSION 01: FIRST PASSAGE ============ */
  await tap('KeyT');
  await sleep(2500);
  {
    const s = await snap();
    result('m01: T deploys solar array', s.objDone.deploy === true, 'panelTarget set, objDone.deploy=true');
  }
  {
    const s0 = await snap();
    const note = await driveTo(s0.x + s0.fx * 150, s0.z + s0.fz * 150, 20, 120000);
    const s1 = await snap();
    const dHome = Math.hypot(s1.x - 96, s1.z - 214);
    result('m01: drove >125 m from launch site', dHome > 125,
      Math.round(dHome) + ' m' + (String(note).includes('reseated') ? ' [reseated]' : ''));
  }
  await shot('03_m01_drive');
  {
    const found = await scanHere();
    const s = await snap();
    result('m01: G scans, mission complete', s.objDone.scan === true, found.length + ' returns found');
  }
  await shot('04_m01_scan');

  /* ============ advance -> MISSION 02 ============ */
  await poll('missionId=listening',
    `const g = window.FARSIDE.game; return g && g.missionId === 'listening' ? true : null;`, 30000);
  await waitCard('mission 02 card shown');
  await shot('05_card_m02');
  await ackCard();
  result('m02 card shown + acknowledged', true);

  /* ============ MISSION 02: THE LISTENING FLOOR ============ */
  let targets = await scanHere();
  for (let i = 0; targets.length < 3 && i < 8; i++) {
    const cur = await snap();
    await driveTo(cur.x + cur.fx * 70, cur.z + cur.fz * 70, 20, 90000);
    targets = await scanHere();
  }
  if (targets.length < 3) result('m02: scan found 3 excavatable anomalies', false, targets.length + ' found');
  else result('m02: scan found 3 excavatable anomalies', true, targets.length + ' found');

  const failedExc = [];
  for (let i = 0; i < Math.min(targets.length, 5); i++) {
    const s = await snap();
    if ((s.counts.find3 || 0) >= 3) break;
    try {
      await drillFacing(targets[i].id);
    } catch (e) {
      failedExc.push(targets[i].id + ':' + e.message);
      await js(keyBody('Space', 'keyup'));   // a failed settle can leave the brake held
    }
  }
  {
    const s = await snap();
    result('m02: 3 samples in bay via real drills', (s.counts.find3 || 0) >= 3,
      'find3=' + (s.counts.find3 || 0) + ' bay=' + s.bay +
      (failedExc.length ? ' (failed: ' + failedExc.join(' | ') + ')' : ''));
  }
  await shot('06_m02_excavate');

  await driveTo(96, 214, 7, 180000);
  await poll('bay drained at sled (offload)',
    `const g = window.FARSIDE.game; return g && g.bay.length === 0 && g.objDone.home1 ? true : null;`, 60000);
  await poll('missionId=channel',
    `const g = window.FARSIDE.game; return g && g.missionId === 'channel' ? true : null;`, 30000);
  await waitCard('mission 03 card shown');
  await shot('07_card_m03');
  await ackCard();
  result('m03 card shown + acknowledged', true);

  /* ============ MISSION 03: OPEN CHANNEL ============ */
  const sites = await findRelaySites();
  if (sites.length < 3) result('m03: relay sites found on high ground', false, sites.length + ' found');
  else result('m03: relay sites found on high ground', true, sites.slice(0, 3).map((s) => Math.round(s.x) + ',' + Math.round(s.z)).join(' / ') + ' (+extras)');

  const refused = [];
  for (let i = 0; i < sites.length; i++) {
    const s0 = await snap();
    const want = s0.relays + 1;
    if (want > 3) break;
    try {
      await driveTo(sites[i].x, sites[i].z, 2.5, 180000);
      await tap('KeyB');
      await sleep(900);
      const s = await snap();
      if (s.relays !== want) throw new Error('relaysPlaced=' + s.relays + ' want ' + want);
      if (want === 2) await shot('08_m03_relay');
    } catch (e) {
      // refusal (height/spacing at the actual stop point) — next candidate
      refused.push(Math.round(sites[i].x) + ',' + Math.round(sites[i].z));
      if (want === 2) await shot('08_m03_relay');
    }
  }
  {
    const s = await snap();
    result('m03: 3 relays placed on high ground', s.relays === 3,
      'relays=' + s.relays + (refused.length ? ' (refused: ' + refused.join(' ') + ')' : ''));
  }

  await poll('missionId=quiet',
    `const g = window.FARSIDE.game; return g && g.missionId === 'quiet' ? true : null;`, 30000);
  await waitCard('mission 04 card shown');
  await shot('09_card_m04');
  await ackCard();
  result('m04 card shown + acknowledged', true);

  /* ============ MISSION 04: THE QUIET STATION ============ */
  await driveTo(-236, 140, 9, 240000);
  await poll('station perimeter (reach)',
    `const g = window.FARSIDE.game; return g && g.objDone.reach ? true : null;`, 30000);
  await shot('10_m04_station');
  await js(keyBody('KeyE', 'keydown'));
  await sleep(2400);                       // interact needs 1.6 s of held E
  await js(keyBody('KeyE', 'keyup'));
  await poll('local store recovered (hold E)',
    `const g = window.FARSIDE.game; return g && g.contentVisited && g.contentVisited.station ? true : null;`, 15000);
  await waitCard('mission 05 card shown');
  await shot('11_card_m05');
  await ackCard();
  result('m05 card shown + acknowledged', true);

  // The lining sample at the station's dig site — its sample unlocks the
  // FUNCTION codex, so a full campaign clears the whole codex.
  {
    await scanHere();
    const lining = (await js(`
      const g = window.FARSIDE.game;
      const a = g.anoms.find((x) => x.type === 'lining' && x.found && !x.taken);
      return a ? { id: a.id, x: a.x, z: a.z } : null;
    `)) || null;
    if (lining) {
      try {
        const r = await drillFacing(lining.id, 2.0);
        result('m04: lining sample drilled at station dig site', r.taken === true,
          lining.id + ' taken=' + r.taken + ' dT=' + r.dT);
      } catch (e) {
        result('m04: lining sample drilled at station dig site', false, e.message);
      }
    } else {
      result('m04: lining sample drilled at station dig site', false, 'lining not found by scan');
    }
  }

  /* ============ MISSION 05: THE KNOCK ============ */
  // A drivable point on the massif (dist<46 from (0,0), ground > 12.5 m),
  // chosen closest to the drumhead core so the massif->core drive is short.
  // The whole disk is probed in ONE browser call. (The core sits at MASSIF+(6,-4).)
  const DRUMHEAD = { x: 6, z: -4 };
  const massif = JSON.parse(await js(`
    const t = window.FARSIDE.game.terrain;
    let best = null;
    for (let r = 44; r >= 6; r -= 2) {
      for (let i = 0; i < 32; i++) {
        const ang = (i / 32) * Math.PI * 2;
        const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
        const h = t.heightAt(x, z);
        if (h == null || h < 12.5) continue;
        const dCore = Math.hypot(x - ${DRUMHEAD.x}, z - ${DRUMHEAD.z});
        if (!best || dCore < best.dCore) best = { x, z, h, dCore };
      }
    }
    return JSON.stringify(best);
  `)) || null;
  if (!massif) result('m05: massif summit point found', false, 'no point >12.5 m within 46 m of (0,0)');
  else {
    await driveTo(massif.x, massif.z, 3, 240000);
    const s = await snap();
    result('m05: reached central massif', s.objDone.massif === true, 'h~' + Math.round(massif.h) + ' m');
  }
  await shot('12_m05_massif');

  {
    const found = await scanHere();
    const drum = found.find((a) => a.special === 'drum');
    if (!drum) result('m05: drumhead core found by scan', false, 'not in scan returns');
    else {
      result('m05: drumhead core found by scan', true, drum.id);
      try {
        await extractDrum(drum.id);
        const s = await snap();
        result('m05: drumhead core extracted', s.payloadTaken === true && s.objDone.deep === true, 'payloadTaken=' + s.payloadTaken);
      } catch (e) { result('m05: drumhead core extracted', false, e.message); }
    }
  }
  await shot('13_m05_drum');

  await driveTo(96, 214, 7, 240000);
  await poll('transmit at sled',
    `const g = window.FARSIDE.game; return g && g.transmitted ? true : null;`, 60000);
  await poll('campaign complete (missionId=null)',
    `const g = window.FARSIDE.game; return g && g.missionId === null ? true : null;`, 30000);
  await waitCard('ending card shown');
  await shot('14_ending');
  await ackCard();
  {
    const s = await snap();
    result('ending card shown, free survey unlocked', s.freeRoam === true, 'freeRoam=' + s.freeRoam);
  }

  /* ============ save v3 + resume ============ */
  // back to the menu via pause -> ABORT (it saves on the way out)
  await tap('Escape');
  await poll('pause overlay visible',
    `return !document.getElementById('pause').classList.contains('hidden') ? true : null;`, 10000);
  await js(`document.getElementById('btnAbort').click(); return true;`);
  await poll('menu shows RESUME SURVEY (save detected)',
    `const b = document.getElementById('btnContinue'); return b && !b.disabled ? true : null;`, 15000);
  await shot('15_save_menu');
  const blob = await poll('save v3 present',
    `try {
       const d = JSON.parse(localStorage.getItem('farside.anaximenes.v3'));
       return d && d.missionId === null && Array.isArray(d.anoms) ? JSON.stringify(d) : null;
     } catch (e) { return null; }`, 60000);
  const d = JSON.parse(blob);
  const drumPair = d.anoms.find((p) => p[0] === '60,-40');
  result('save v3: missionId null, drumhead [id,1] present',
    d.missionId === null && drumPair && drumPair[1] === 1,
    'anoms=' + d.anoms.length + ' drum=' + JSON.stringify(drumPair));

  await send('WebDriver:Navigate', { url: URL });
  try {
    await poll('btnContinue visible',
      `const b = document.getElementById('btnContinue'); return b && !b.disabled && b.offsetParent !== null ? true : null;`, 120000);
    result('after reload, RESUME SURVEY visible (save detected)', true);
    await js(`document.getElementById('btnContinue').click(); return true;`);
    await poll('resumed state PLAY',
      `return window.FARSIDE && window.FARSIDE.state === 2 ? true : null;`, 30000);
    const rs = await poll('resumed free survey',
      `const g = window.FARSIDE.game;
       return g && g.missionId === null && g.freeRoam && g.payloadTaken
          ? g.unlocked.size + ' codex' : null;`, 30000);
    result('resume restores free survey (missionId null, payloadTaken, codex unlocked)',
      /12 codex/.test(String(rs)), rs);
    await shot('16_resumed');
  } catch (e) {
    result('save/load round-trip into free survey', false, e.message);
  }

  try { await send('WebDriver:DeleteSession', {}); } catch {}
  done = true;
  const failed = results.filter((r) => !r.ok);
  console.log('---');
  console.log(failed.length === 0 ? 'GATE PASS (' + results.length + '/' + results.length + ')' : 'GATE FAIL (' + failed.length + ' failed)');
  process.exit(failed.length === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE ERROR:', e.message); done = true; process.exit(2); });
