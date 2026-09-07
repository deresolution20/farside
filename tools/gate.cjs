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
  // Length prefix is BYTES (scripts may carry non-ASCII; a short prefix
  // truncates the packet and wedges the transport).
  const payload = Buffer.from(json, 'utf8');
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    sock.write(Buffer.concat([Buffer.from(payload.length + ':', 'latin1'), payload]));
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
    // G tap -> scan-done emits synchronously -> the 1.4 s advance() timer,
    // which resets objDone/counts for the next mission (Phase 2 task 6:
    // objective ids may repeat across missions). Capture the bookkeeping
    // before that reset, then let the scan animation run out.
    await waitPower(10, 60000);
    await tap('KeyG');
    const s = await snap();
    await sleep(2900);
    const found = await js(`const g = window.FARSIDE.game;
      return g.anoms.filter((a) => a.found && !a.taken).length;`);
    result('m01: G scans, mission complete', s.objDone.scan === true, found + ' returns found');
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
  // Offload -> home1 objective -> the 1.4 s advance() timer resets
  // objDone (Phase 2 task 6), so bay-empty + the mission transition below
  // are the evidence of the offload objective.
  await poll('bay drained at sled (offload)',
    `const g = window.FARSIDE.game; return g && g.bay.length === 0 ? true : null;`, 60000);
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

  /* ============ PHASE 2: region switching + LONG SHADOW ============ */
  // Back to the menu via pause -> ABORT (it persists the Anaximenes
  // free-survey blob — the same state the round-trip just loaded).
  await tap('Escape');
  await poll('pause overlay visible (region checks)',
    `return !document.getElementById('pause').classList.contains('hidden') ? true : null;`, 10000);
  await js(`document.getElementById('btnAbort').click(); return true;`);
  await poll('menu visible with region cards',
    `const w = document.getElementById('regionCards'); return w && w.querySelector('#region-anaximenes') && w.querySelector('#region-longshadow') ? true : null;`, 15000);
  await shot('17_menu_regions');

  // G22 — both region cards present, each with a status line from its save
  {
    const cards = JSON.parse(await js(`
      const out = [];
      for (const id of ['region-anaximenes', 'region-longshadow']) {
        const c = document.getElementById(id);
        if (!c) { out.push(null); continue; }
        const st = c.querySelector('.rc-status');
        out.push({ id, name: c.querySelector('.rc-name').textContent.trim(),
                   status: st ? st.textContent.trim() : '' });
      }
      return JSON.stringify(out);
    `));
    const [a, b] = cards;
    result('G22: menu shows both region cards with status lines',
      a && b && a.status !== '' && b.status !== '',
      (a ? a.name + ' [' + a.status + ']' : 'ANAX missing') + ' | ' + (b ? b.name + ' [' + b.status + ']' : 'LS missing'));
  }

  // G23 — select THE LONG SHADOW: loading sheet, then back at the menu with
  // the world swapped (rim-crest vs floor sanity on the live terrain)
  {
    await js(`document.getElementById('region-longshadow').click(); return true;`);
    await poll('region loading sheet visible (Long Shadow)',
      `return !document.getElementById('regionload').classList.contains('hidden') ? true : null;`, 15000);
    await poll('Long Shadow bake + swap done (menu, region swapped)',
      `const F = window.FARSIDE;
       return F && F.state === 1 && F.region && F.region.id === 'longshadow'
          && document.getElementById('regionload').classList.contains('hidden') ? true : null;`, 120000);
    const h = JSON.parse(await js(`
      const t = window.FARSIDE.game.terrain;
      let crest = -1e9;
      for (let i = 0; i < 96; i++) {                     // rim band r = 500
        const ang = (i / 96) * Math.PI * 2;
        const hh = t.heightAt(Math.cos(ang) * 500, Math.sin(ang) * 500);
        if (hh != null && hh > crest) crest = hh;
      }
      const floor = t.heightAt(0, 0);                    // bowl floor
      return JSON.stringify({ crest, floor, delta: crest - floor });
    `));
    result('G23: selected THE LONG SHADOW -> world swapped (rim crest - floor > 60 m)',
      h.crest - h.floor > 60,
      'crest=' + h.crest.toFixed(1) + ' m floor=' + h.floor.toFixed(1) + ' m delta=' + (h.crest - h.floor).toFixed(1) + ' m');
  }

  // G24 — Long Shadow L01 playable, exactly like Anax m01: card, T deploy,
  // a ~140 m drive along the heading, one G sweep, mission complete
  {
    await js(`document.getElementById('btnPlay').click(); return true;`);
    await waitCard('Long Shadow mission 01 card shown');
    await shot('18_ls_card_l01');
    await js(`document.getElementById('cardGo').click(); return true;`);
    await poll('LS game state PLAY',
      `return window.FARSIDE && window.FARSIDE.state === 2 ? true : null;`, 15000);

    await tap('KeyT');
    await sleep(2500);
    const sd = await snap();
    await shot('19_ls_at_rest');
    let driveNote = '';
    if (sd && sd.objDone.deploy) {
      const s0 = await snap();
      const note = await driveTo(s0.x + s0.fx * 140, s0.z + s0.fz * 140, 6, 240000);
      driveNote = String(note).includes('reseated') ? ' [reseated]' : '';
    }
    await shot('20_ls_drive');
    {
      // G tap -> scan-done emits synchronously -> capture the bookkeeping
      // before the 1.4 s advance() timer resets it (Phase 2 task 6:
      // objective ids may repeat across missions).
      await waitPower(10, 120000);
      await tap('KeyG');
      const s = await snap();
      const s1 = await snap();
      const dHome = Math.hypot(s1.x - 241.7, s1.z - 203.6);
      result('G24: Long Shadow L01 playable (deploy, >120 m, G scan, mission complete)',
        s.objDone.deploy === true && s.objDone.drive === true && s.objDone.scan === true && dHome > 120,
        Math.round(dHome) + ' m' + driveNote + ' deploy=' + s.objDone.deploy + ' drive=' + s.objDone.drive + ' scan=' + s.objDone.scan);
    }
  }

  // G25 — the Long Shadow save slot is written, now on L02 (ls-echo)
  {
    await poll('LS advanced to L02 (ls-echo)',
      `const g = window.FARSIDE.game; return g && g.missionId === 'ls-echo' ? true : null;`, 30000);
    await js(`window.FARSIDE.game.save(); return true;`);
    const blob = await poll('farside.longshadow.v1 present on ls-echo',
      `try {
         const d = JSON.parse(localStorage.getItem('farside.longshadow.v1'));
         return d && d.missionId === 'ls-echo' ? JSON.stringify(d) : null;
       } catch (e) { return null; }`, 10000);
    const d = JSON.parse(blob);
    result('G25: farside.longshadow.v1 written with missionId ls-echo',
      d.missionId === 'ls-echo', 'missionId=' + d.missionId);
  }

  // G26 — reload: selection persisted, RESUME lands back in Long Shadow L02
  await send('WebDriver:Navigate', { url: URL });
  {
    try {
      await poll('btnContinue visible (Long Shadow save detected)',
        `const b = document.getElementById('btnContinue'); return b && !b.disabled && b.offsetParent !== null ? true : null;`, 120000);
      await js(`document.getElementById('btnContinue').click(); return true;`);
      await poll('resumed into Long Shadow L02',
        `const F = window.FARSIDE, g = F.game;
         return F.region && F.region.id === 'longshadow' && g && g.missionId === 'ls-echo' ? true : null;`, 30000);
      const s = await snap();
      result('G26: reload -> RESUME SURVEY -> Long Shadow L02, payloadTaken false',
        s.missionId === 'ls-echo' && s.payloadTaken === false,
        'missionId=' + s.missionId + ' payloadTaken=' + s.payloadTaken);
      await shot('21_ls_l02_resumed');
    } catch (e) {
      result('G26: reload -> RESUME SURVEY -> Long Shadow L02, payloadTaken false', false, e.message);
    }
  }

  // G27 — switch back to ANAXIMENES: its round-trip save must be intact and
  // the live world must be the Anaximenes basin again
  {
    await tap('Escape');
    await poll('pause overlay visible (switch back)',
      `return !document.getElementById('pause').classList.contains('hidden') ? true : null;`, 10000);
    await js(`document.getElementById('btnAbort').click(); return true;`);
    await poll('menu visible with region cards (again)',
      `const w = document.getElementById('regionCards'); return w && w.querySelector('#region-anaximenes') && w.querySelector('#region-longshadow') ? true : null;`, 15000);
    await js(`document.getElementById('region-anaximenes').click(); return true;`);
    await poll('Anaximenes bake + swap done (menu, region swapped back)',
      `const F = window.FARSIDE;
       return F && F.state === 1 && F.region && F.region.id === 'anaximenes'
          && document.getElementById('regionload').classList.contains('hidden') ? true : null;`, 120000);
    const [blob, sx] = await Promise.all([(
      poll('farside.anaximenes.v3 intact (free-survey round-trip blob)',
        `try {
           const d = JSON.parse(localStorage.getItem('farside.anaximenes.v3'));
           return d && d.missionId === null ? JSON.stringify(d) : null;
         } catch (e) { return null; }`, 10000)
    ), (
      js(`const F = window.FARSIDE; return F && F.region && F.region.landmarks ? F.region.landmarks.station.x : null;`)
    )]);
    const d = JSON.parse(blob);
    const drum = d.anoms.find((p) => p[0] === '60,-40');
    result('G27: switched back to ANAXIMENES: save intact, world swapped (station.x = -236)',
      d.missionId === null && drum && drum[1] === 1 && sx === -236,
      'station.x=' + sx + ' missionId=' + d.missionId + ' drum=' + JSON.stringify(drum));
  }

  // G28 — Long Shadow bake determinism: two fresh in-page bakes of
  // REGIONS[1].terrain, 1000 random samples strictly equal. The bake runs in
  // an injected <script type="module">, NOT in the Marionette script realm:
  // that realm has its own module map AND no import map, so importing
  // regions.js from there chokes on the bare 'three' specifier in its import
  // chain (props.js). The injected module script runs in the page's main
  // realm — import map + the game's live module graph — and stashes the
  // result on window for the driver to poll. (Pure-math check: reads no
  // page state, mirrors tools/bake-diff.cjs.)
  {
    let raw = null;
    let det = '';
    try {
      await js(`
        window.__bakeResult = null;
        const s = document.createElement('script');
        s.type = 'module';
        s.textContent = [
          "const { bakeTerrain } = await import('/src/world/bake.js');",
          "const { REGIONS } = await import('/src/game/regions.js');",
          "const P = REGIONS[1].terrain;",
          "const drain = (g) => { for (;;) { const r = g.next(); if (r.done) return r.value; } };",
          "const a = drain(bakeTerrain(() => {}, P));",
          "const b = drain(bakeTerrain(() => {}, P));",
          "const fields = [[a.macro, b.macro], [a.far, b.far], [a.det, b.det]];",
          "let n = 0, bad = 0;",
          "while (n < 1000) {",
          "  const f = fields[(Math.random() * fields.length) | 0];",
          "  const i = (Math.random() * f[0].length) | 0;",
          "  if (!Object.is(f[0][i], f[1][i])) bad++;",
          "  n++;",
          "}",
          "window.__bakeResult = { n, bad };",
        ].join('\\n');
        document.head.appendChild(s);
        return true;
      `);
      const s = await poll('in-page LS double-bake finished',
        `return window.__bakeResult ? JSON.stringify(window.__bakeResult) : null;`, 180000);
      raw = JSON.parse(s);
      det = raw.n + ' samples, mismatches=' + raw.bad;
    } catch (e) {
      det = e.message;
    }
    result('G28: Long Shadow bake determinism (two in-page bakes, 1000 random samples)',
      raw && raw.n === 1000 && raw.bad === 0, det);
  }

  // ============ PHASE 3: the Jovian worlds (G29–G40) ============
  // Appended after the full Phase-2 flow, same transport, same helpers.
  // State on entry: ANAXIMENES menu; the Anax free-survey blob and the LS
  // 'ls-echo' blob already exist (G1–G28 made them).

  // G29 — the menu now carries four region cards, each with a status line
  // derived from THAT region's save: the gate's clean profile has seen the
  // Anax campaign (free survey) and the LS section (L02 saved) by now, so
  // the two Moon cards must read COMPLETE/IN PROGRESS and the two Jovian
  // cards must still read NO SURVEY (they get written below, G32/G36).
  {
    await shot('22_menu_four_cards');
    const cards = JSON.parse(await js(`
      const out = [];
      for (const id of ['region-anaximenes', 'region-longshadow', 'region-ganymede', 'region-callisto']) {
        const c = document.getElementById(id);
        if (!c) { out.push(null); continue; }
        const st = c.querySelector('.rc-status');
        out.push({ id, name: c.querySelector('.rc-name').textContent.trim(), status: st ? st.textContent.trim() : '' });
      }
      return JSON.stringify(out);
    `));
    const byId = Object.fromEntries(cards.filter(Boolean).map((c) => [c.id, c]));
    result('G29: menu shows four region cards, each with its save-derived status',
      cards.length === 4 && cards.every((c) => c && c.status !== '') &&
      /NO SURVEY/.test(byId['region-ganymede'].status) && /NO SURVEY/.test(byId['region-callisto'].status) &&
      /COMPLETE/.test(byId['region-anaximenes'].status) && /IN PROGRESS/.test(byId['region-longshadow'].status),
      cards.map((c) => (c ? c.status : c.id + ' MISSING')).join(' | '));
  }

  // G30 — select THE CHOS PLAIN: loading sheet, world swapped (fresh Sky
  // instance in the scene), and plain-world geometry: the rise crest (a
  // grid max over the r<=120 dome — the massif is wide rather than tall,
  // so the crest wanders off-centre) minus the post A plain floor sits in
  // the spec's +8…+25 m band, and the sun never clears a low crawl.
  {
    await js(`window.__gmSkyPre = window.FARSIDE.sky; return true;`);
    await js(`document.getElementById('region-ganymede').click(); return true;`);
    await poll('region loading sheet visible (Chos)',
      `return !document.getElementById('regionload').classList.contains('hidden') ? true : null;`, 15000);
    await poll('Chos bake + swap done (menu, region swapped)',
      `const F = window.FARSIDE;
       return F && F.state === 1 && F.region && F.region.id === 'ganymede'
          && document.getElementById('regionload').classList.contains('hidden') ? true : null;`, 120000);
    const h = JSON.parse(await js(`
      const F = window.FARSIDE, t = F.game.terrain;
      let crest = null;
      for (let r = 0; r <= 120; r += 2) {
        const n = Math.max(16, Math.round(r));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
          const v = t.heightAt(x, z);
          if (v != null && (!crest || v > crest.v)) crest = { x, z, v };
        }
      }
      return JSON.stringify({ crest, postA: t.heightAt(-180, 150),
        sunY: F.sky.sunDir.y,
        skyNew: F.sky !== window.__gmSkyPre,
        inScene: F.engine.scene.children.includes(F.sky.group) });
    `));
    await shot('23_menu_chos_orbit');
    result('G30: selected THE CHOS PLAIN -> swapped (rise-floor +8..+25 m, low never-setting sun, fresh Sky)',
      h.crest && h.crest.v - h.postA >= 8 && h.crest.v - h.postA <= 25 &&
        h.sunY > 0 && h.sunY < 0.12 && h.skyNew === true && h.inScene === true,
      'crest=' + (h.crest ? h.crest.v.toFixed(1) : '?') + ' m postA=' + h.postA.toFixed(1) +
        ' m delta=' + (h.crest.v - h.postA).toFixed(1) + ' m sunDir.y=' + h.sunY.toFixed(4) +
        ' skyNew=' + h.skyNew + ' inScene=' + h.inScene);
  }

  // G31 — Chos L01 playable, the L01 shape (card -> T -> long drive -> G),
  // with the dHome margin polled BEFORE the scan tap so the mutation
  // instant captures all three objectives.
  {
    await js(`document.getElementById('btnPlay').click(); return true;`);
    await waitCard('Chos mission 01 card shown');
    await shot('24_gm_l01_card');
    await js(`document.getElementById('cardGo').click(); return true;`);
    await poll('Chos game state PLAY',
      `return window.FARSIDE && window.FARSIDE.state === 2 ? true : null;`, 15000);
    let driveNote = '';
    await tap('KeyT');
    await sleep(2500);
    {
      const s0 = await snap();
      const note = await driveTo(s0.x + s0.fx * 170, s0.z + s0.fz * 170, 20, 240000);
      if (String(note).includes('reseated')) driveNote = ' [reseated]';
      await poll('Chos dHome > 122 m before the scan tap',
        `const g = window.FARSIDE.game, p = g.rover.pos;
         return Math.hypot(p.x - 60, p.z - 260) > 122 ? true : null;`, 30000);
    }
    await shot('25_gm_l01_drive');
    await waitPower(10, 120000);
    await tap('KeyG');
    const s = await snap();
    await sleep(2900);
    const found = await js(`const g = window.FARSIDE.game;
      return g.anoms.filter((a) => a.found && !a.taken).length;`);
    const dHome = Math.hypot(s.x - 60, s.z - 260);
    result('G31: Chos L01 playable (deploy, >120 m, G scan, mission complete)',
      s.objDone.deploy === true && s.objDone.drive === true && s.objDone.scan === true && dHome > 120,
      Math.round(dHome) + ' m' + driveNote + ' deploy=' + s.objDone.deploy +
        ' drive=' + s.objDone.drive + ' scan=' + s.objDone.scan + ' ' + found + ' returns');
    await poll('Chos advanced to gm-first (the 1.4 s timer)',
      `const g = window.FARSIDE.game; return g && g.missionId === 'gm-first' ? true : null;`, 30000);
  }

  // G32 — the Jovian save slot is written now on L02 (gm-first). The
  // 1.4 s advance timer wipes objDone, so the bookkeeping instant was
  // already captured in G31; here the transition itself + the slot are
  // the evidence.
  {
    await js(`window.FARSIDE.game.save(); return true;`);
    const blob = await poll('farside.ganymede.v1 present on gm-first',
      `try {
         const d = JSON.parse(localStorage.getItem('farside.ganymede.v1'));
         return d && d.missionId === 'gm-first' ? JSON.stringify(d) : null;
       } catch (e) { return null; }`, 10000);
    const d = JSON.parse(blob);
    result('G32: farside.ganymede.v1 written with missionId gm-first',
      d.missionId === 'gm-first', 'missionId=' + d.missionId);
  }

  // G33 — reload: the region selection persisted (farside.set), RESUME
  // lands back in Chos L02, payload untouched
  {
    await send('WebDriver:Navigate', { url: URL });
    try {
      await poll('btnContinue visible (Chos save detected)',
        `const b = document.getElementById('btnContinue'); return b && !b.disabled && b.offsetParent !== null ? true : null;`, 120000);
      await js(`document.getElementById('btnContinue').click(); return true;`);
      await poll('resumed into Chos L02 (gm-first)',
        `const F = window.FARSIDE, g = F.game;
         return F.region && F.region.id === 'ganymede' && g && g.missionId === 'gm-first' ? true : null;`, 30000);
      const s = await snap();
      result('G33: reload -> RESUME SURVEY -> Chos L02 (gm-first), payloadTaken false',
        s.missionId === 'gm-first' && s.payloadTaken === false,
        'missionId=' + s.missionId + ' payloadTaken=' + s.payloadTaken);
      await shot('26_gm_l02_resumed');
    } catch (e) {
      result('G33: reload -> RESUME SURVEY -> Chos L02 (gm-first), payloadTaken false', false, e.message);
    }
  }

  // G34 — select CONAMARA mid-campaign (Chos L02 stays saved): the swap is
  // a different world (g 1.236, a Jove sky with no Earth disc) and the
  // Ganymede blob must be untouched by the switch.
  {
    await tap('Escape');
    await poll('pause overlay visible (to Conamara)',
      `return !document.getElementById('pause').classList.contains('hidden') ? true : null;`, 10000);
    await js(`document.getElementById('btnAbort').click(); return true;`);
    await poll('menu visible with region cards (Conamara)',
      `const w = document.getElementById('regionCards'); return w && w.querySelector('#region-callisto') ? true : null;`, 15000);
    await js(`document.getElementById('region-callisto').click(); return true;`);
    await poll('Conamara bake + swap done (menu, region swapped)',
      `const F = window.FARSIDE;
       return F && F.state === 1 && F.region && F.region.id === 'callisto'
          && document.getElementById('regionload').classList.contains('hidden') ? true : null;`, 120000);
    const c = JSON.parse(await js(`
      const F = window.FARSIDE;
      let gan = null;
      try { gan = JSON.parse(localStorage.getItem('farside.ganymede.v1') || 'null'); } catch (e) {}
      return JSON.stringify({ region: F.region.id, g: F.game.rover.g,
        jove: !!F.sky.jove, earthGlow: F.sky.earthGlow === undefined,
        ganBlob: gan ? gan.missionId : null });
    `));
    await shot('27_menu_callisto_orbit');
    result('G34: selected CONAMARA -> swapped (g=1.236, Jove sky, ganymede blob intact on gm-first)',
      c.region === 'callisto' && c.g === 1.236 && c.jove === true && c.earthGlow === true && c.ganBlob === 'gm-first',
      'g=' + c.g + ' jove=' + c.jove + ' earthGlowAbsent=' + c.earthGlow + ' ganBlob=' + c.ganBlob);
  }

  // G35 — Callisto L01 playable (same shape as G31, Conamara home ref)
  {
    await js(`document.getElementById('btnPlay').click(); return true;`);
    await waitCard('Conamara mission 01 card shown');
    await shot('28_call_l01_card');
    await js(`document.getElementById('cardGo').click(); return true;`);
    await poll('Conamara game state PLAY',
      `return window.FARSIDE && window.FARSIDE.state === 2 ? true : null;`, 15000);
    let driveNote = '';
    await tap('KeyT');
    await sleep(2500);
    {
      const s0 = await snap();
      const note = await driveTo(s0.x + s0.fx * 170, s0.z + s0.fz * 170, 20, 240000);
      if (String(note).includes('reseated')) driveNote = ' [reseated]';
      await poll('Callisto dHome > 122 m before the scan tap',
        `const g = window.FARSIDE.game, p = g.rover.pos;
         return Math.hypot(p.x - 196, p.z - 180) > 122 ? true : null;`, 30000);
    }
    await shot('29_call_l01_drive');
    await waitPower(10, 120000);
    await tap('KeyG');
    const s = await snap();
    await sleep(2900);
    const found = await js(`const g = window.FARSIDE.game;
      return g.anoms.filter((a) => a.found && !a.taken).length;`);
    const dHome = Math.hypot(s.x - 196, s.z - 180);
    result('G35: Conamara L01 playable (deploy, >120 m, G scan, mission complete)',
      s.objDone.deploy === true && s.objDone.drive === true && s.objDone.scan === true && dHome > 120,
      Math.round(dHome) + ' m' + driveNote + ' deploy=' + s.objDone.deploy +
        ' drive=' + s.objDone.drive + ' scan=' + s.objDone.scan + ' ' + found + ' returns');
    await poll('Callisto advanced to call-field (the 1.4 s timer)',
      `const g = window.FARSIDE.game; return g && g.missionId === 'call-field' ? true : null;`, 30000);
  }

  // G36 — the Callisto save slot on L02 (call-field)
  {
    await js(`window.FARSIDE.game.save(); return true;`);
    const blob = await poll('farside.callisto.v1 present on call-field',
      `try {
         const d = JSON.parse(localStorage.getItem('farside.callisto.v1'));
         return d && d.missionId === 'call-field' ? JSON.stringify(d) : null;
       } catch (e) { return null; }`, 10000);
    const d = JSON.parse(blob);
    result('G36: farside.callisto.v1 written with missionId call-field',
      d.missionId === 'call-field', 'missionId=' + d.missionId);
  }

  // G37 — reload: RESUME lands back in Conamara L02, payload untouched
  {
    await send('WebDriver:Navigate', { url: URL });
    try {
      await poll('btnContinue visible (Callisto save detected)',
        `const b = document.getElementById('btnContinue'); return b && !b.disabled && b.offsetParent !== null ? true : null;`, 120000);
      await js(`document.getElementById('btnContinue').click(); return true;`);
      await poll('resumed into Conamara L02 (call-field)',
        `const F = window.FARSIDE, g = F.game;
         return F.region && F.region.id === 'callisto' && g && g.missionId === 'call-field' ? true : null;`, 30000);
      const s = await snap();
      result('G37: reload -> RESUME SURVEY -> Conamara L02 (call-field), payloadTaken false',
        s.missionId === 'call-field' && s.payloadTaken === false,
        'missionId=' + s.missionId + ' payloadTaken=' + s.payloadTaken);
      await shot('30_call_l02_resumed');
    } catch (e) {
      result('G37: reload -> RESUME SURVEY -> Conamara L02 (call-field), payloadTaken false', false, e.message);
    }
  }

  // G38/G39 — Jovian bake determinism, the G28 pattern: two fresh in-page
  // bakes of the live region bundle, 1000 random samples strictly equal,
  // in an injected <script type="module"> (the Marionette realm has its
  // own module map; the injected script runs in the page's main realm).
  // These are the standing determinism cover for the two bundles that
  // bake-diff.cjs (frozen on Anaximenes) does not reach.
  for (const [gid, rid, name] of [['G38', 'ganymede', 'Chos'], ['G39', 'callisto', 'Conamara']]) {
    let raw = null;
    let det = '';
    try {
      await js(`
        window.__bakeResult = null;
        const s = document.createElement('script');
        s.type = 'module';
        s.textContent = [
          "const { bakeTerrain } = await import('/src/world/bake.js');",
          "const { REGIONS } = await import('/src/game/regions.js');",
          "const P = REGIONS.find((r) => r.id === '${rid}').terrain;",
          "const drain = (g) => { for (;;) { const r = g.next(); if (r.done) return r.value; } };",
          "const a = drain(bakeTerrain(() => {}, P));",
          "const b = drain(bakeTerrain(() => {}, P));",
          "const fields = [[a.macro, b.macro], [a.far, b.far], [a.det, b.det]];",
          "let n = 0, bad = 0;",
          "while (n < 1000) {",
          "  const f = fields[(Math.random() * fields.length) | 0];",
          "  const i = (Math.random() * f[0].length) | 0;",
          "  if (!Object.is(f[0][i], f[1][i])) bad++;",
          "  n++;",
          "}",
          "window.__bakeResult = { n, bad };",
        ].join('\\n');
        document.head.appendChild(s);
        return true;
      `);
      const s = await poll('in-page ' + name + ' double-bake finished',
        `return window.__bakeResult ? JSON.stringify(window.__bakeResult) : null;`, 180000);
      raw = JSON.parse(s);
      det = raw.n + ' samples, mismatches=' + raw.bad;
    } catch (e) {
      det = e.message;
    }
    result(gid + ': ' + name + ' bake determinism (two in-page bakes, 1000 random samples)',
      raw && raw.n === 1000 && raw.bad === 0, det);
  }

  // G40 — back to ANAXIMENES after FOUR region visits: the world is the
  // Anaximenes basin again, and both Moon blobs survived the whole Jovian
  // section untouched (Anax free-survey round-trip, LS at ls-echo).
  {
    await tap('Escape');
    await poll('pause overlay visible (back to Anax)',
      `return !document.getElementById('pause').classList.contains('hidden') ? true : null;`, 10000);
    await js(`document.getElementById('btnAbort').click(); return true;`);
    await poll('menu visible with region cards (back to Anax)',
      `const w = document.getElementById('regionCards'); return w && w.querySelector('#region-anaximenes') ? true : null;`, 15000);
    await js(`document.getElementById('region-anaximenes').click(); return true;`);
    await poll('Anaximenes bake + swap done (menu, region swapped back)',
      `const F = window.FARSIDE;
       return F && F.state === 1 && F.region && F.region.id === 'anaximenes'
          && document.getElementById('regionload').classList.contains('hidden') ? true : null;`, 120000);
    const [blob, lsBlob, sx] = await Promise.all([(
      poll('farside.anaximenes.v3 intact after four region visits',
        `try {
           const d = JSON.parse(localStorage.getItem('farside.anaximenes.v3'));
           return d && d.missionId === null ? JSON.stringify(d) : null;
         } catch (e) { return null; }`, 10000)
    ), (
      poll('farside.longshadow.v1 intact after four region visits',
        `try {
           const d = JSON.parse(localStorage.getItem('farside.longshadow.v1'));
           return d && d.missionId === 'ls-echo' ? JSON.stringify(d) : null;
         } catch (e) { return null; }`, 10000)
    ), (
      js(`const F = window.FARSIDE; return F && F.region && F.region.landmarks ? F.region.landmarks.station.x : null;`)
    )]);
    const d = JSON.parse(blob);
    const ls = JSON.parse(lsBlob);
    const drum = d.anoms.find((p) => p[0] === '60,-40');
    await shot('31_menu_anaximenes_back');
    result('G40: back to ANAXIMENES after four visits: station.x=-236, anax free-survey blob + ls-echo blob intact',
      sx === -236 && d.missionId === null && drum && drum[1] === 1 && ls.missionId === 'ls-echo',
      'station.x=' + sx + ' anax missionId=' + d.missionId + ' drum=' + JSON.stringify(drum) + ' ls=' + ls.missionId);
  }

  try { await send('WebDriver:DeleteSession', {}); } catch {}
  done = true;
  const failed = results.filter((r) => !r.ok);
  console.log('---');
  console.log(failed.length === 0 ? 'GATE PASS (' + results.length + '/' + results.length + ')' : 'GATE FAIL (' + failed.length + ' failed)');
  process.exit(failed.length === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE ERROR:', e.message); done = true; process.exit(2); });
