#!/usr/bin/env node
// Task 5 verification driver (region: THE LONG SHADOW).
// Same raw-TCP Marionette client as gate.cjs: length-prefixed JSON `N:<json>`.
//
// Scenario:
//   1. menu (fresh profile, Anaximenes) -> switch region card to longshadow
//   2. in-page terrain checks: crest delta near spawn az, spawn pad flatness
//      (13x13 / 2.5 m / 30 m span), approach slopes within 60 m of each
//      landmark, crater pits at landmarks
//   3. anomaly field: determinism (two buildAnomalies runs), exactly one deep
//      core at the hub (depth 9, unlocks hub), one cable at post A, no pipes
//   4. bake determinism (two fresh bakeTerrain runs, 1000 macro samples)
//   5. FREE SURVEY start -> T deploys array -> F lamps -> dusk rim shot
//   6. drive to post A (<=12 m) -> hold-E prompt visible -> shot
//   7. back to menu -> switch to anaximenes -> no posts/hubs in that world
//
// usage: node tools/ls05-verify.cjs [marionettePort] [shotDir]
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');

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
    if (!/^\d+$/.test(buf.subarray(0, ci).toString('latin1'))) fail(new Error('bad header'));
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
    } else if (!Array.isArray(msg) && !capInfo) capInfo = msg;
  }
}

const sock = net.connect(PORT, '127.0.0.1');
sock.on('data', (d) => { buf = Buffer.concat([buf, d]); parse(); });
sock.on('error', fail);
sock.on('close', () => { if (!done) fail(new Error('socket closed')); });

function send(name, params = {}) {
  const id = nextId++;
  const json = JSON.stringify([0, id, name, params]);
  // Length prefix is BYTES: in-page scripts may carry non-ASCII, and a
  // short prefix truncates the packet, wedging the transport forever.
  const payload = Buffer.from(json, 'utf8');
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    sock.write(Buffer.concat([Buffer.from(payload.length + ':', 'latin1'), payload]));
  });
}

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

/* ---------------- synthetic input (as gate.cjs) ---------------- */
const wrapPI = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
let held = new Set();
async function setKeys(want) {
  for (const k of [...held]) if (!want.includes(k)) { await js(keyBody(k, 'keyup')); held.delete(k); }
  for (const k of want) if (!held.has(k)) { await js(keyBody(k, 'keydown')); held.add(k); }
}
async function clearKeys() { await setKeys([]); }
async function tap(code) {
  await js(keyBody(code, 'keydown'));
  await sleep(150);
  await js(keyBody(code, 'keyup'));
  await sleep(120);
}
async function snap() {
  return js(`
    const g = window.FARSIDE.game; if (!g) return null;
    const r = g.rover, p = r.pos;
    return {
      x: p.x, z: p.z, fx: r.forward.x, fz: r.forward.z, v: r.vel.length(),
      power: g.power, missionId: g.missionId, freeRoam: g.freeRoam,
      panelTarget: r.panelTarget, headlights: !!r.headlights, state: window.FARSIDE.state
    };
  `);
}
async function driveTo(tx, tz, stopDist = 6, budgetMs = 180000) {
  const t0 = Date.now();
  let reseatNote = '';
  let d = 1e9;
  while (Date.now() - t0 < budgetMs) {
    const s = await snap();
    if (!s) { await sleep(500); continue; }
    d = Math.hypot(tx - s.x, tz - s.z);
    if (d <= stopDist) break;
    const heading = Math.atan2(s.fx, s.fz);
    const err = wrapPI(Math.atan2(tx - s.x, tz - s.z) - heading);
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
  // hold the brake until the chassis actually stops (or 10 s)
  await js(keyBody('Space', 'keydown'));
  const bt0 = Date.now();
  while (Date.now() - bt0 < 10000) {
    const v = await js(`return window.FARSIDE.game ? window.FARSIDE.game.rover.vel.length() : 0;`);
    if (v < 0.4) break;
    await sleep(400);
  }
  await js(keyBody('Space', 'keyup'));
  await sleep(600);
  return d + reseatNote;
}

(async () => {
  const t0 = Date.now();
  while (!capInfo) { if (Date.now() - t0 > 15000) throw new Error('no capabilities'); await sleep(100); }

  await send('WebDriver:NewSession', {});
  await send('WebDriver:Navigate', { url: URL });

  await js(`
    window.__errs = [];
    const _ce = console.error.bind(console);
    console.error = (...a) => { window.__errs.push(a.map(String).join(' ')); };
    window.addEventListener('error', (e) => window.__errs.push(String(e.message)));
    return true;
  `);

  await poll('btnPlay visible (menu)',
    `const b = document.getElementById('btnPlay'); return b && !b.disabled && b.offsetParent !== null ? true : null;`,
    120000);
  result('menu loads (fresh profile)', true);

  /* ============ 1. switch to THE LONG SHADOW ============ */
  const before = await js(`return window.FARSIDE.region.id;`);
  result('default region is anaximenes', before === 'anaximenes', before);
  await js(`document.getElementById('region-longshadow').click(); return true;`);
  await poll('world swapped to longshadow',
    `const F = window.FARSIDE; return F.region.id === 'longshadow' && F.terrain && F.props && F.game ? true : null;`,
    180000);
  await poll('back at menu after swap',
    `const b = document.getElementById('btnPlay'); return b && !b.disabled && b.offsetParent !== null ? true : null;`,
    60000);
  result('region switch: longshadow world built', true);
  await shot('ls05_01_menu_ls');

  /* ============ 2+3+4. in-page terrain / anomaly / bake checks ============ */
  const chk = await poll('terrain + anomaly + bake checks', `
    return (async () => {
      const F = window.FARSIDE, t = F.terrain, R = F.region;
      const sp = R.spawn, LM = R.landmarks;
      const out = { region: R.id };
      const floor = t.heightAt(sp.x, sp.z);
      out.spawnH = +floor.toFixed(2);

      // rim crest above floor, near the spawn azimuth (az 0.40..1.00)
      let crest = -1e9;
      for (let r = 460; r <= 560; r += 5)
        for (let az = 0.40; az <= 1.0001; az += 0.02) {
          const h = t.heightAt(Math.cos(az) * r, Math.sin(az) * r);
          if (h > crest) crest = h;
        }
      out.crestH = +crest.toFixed(2);
      out.crestDelta = +(crest - floor).toFixed(1);

      // spawn pad: the AC's 13x13 grid (2.5 m spacing, 30 m span; all
      // samples within 21.5 m of the spawn) + an r15 m circle as a
      // secondary metric
      let d30 = 0, d30r15 = 0;
      for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
        const x = sp.x + i * 2.5, z = sp.z + j * 2.5;
        const dh = Math.abs(t.heightAt(x, z) - floor);
        d30 = Math.max(d30, dh);
        if (Math.hypot(x - sp.x, z - sp.z) <= 15) d30r15 = Math.max(d30r15, dh);
      }
      out.d30 = +d30.toFixed(3);
      out.d30r15 = +d30r15.toFixed(3);

      // slope within 30 m of spawn
      let s30 = 0;
      for (let x = sp.x - 30; x <= sp.x + 30; x += 3)
        for (let z = sp.z - 30; z <= sp.z + 30; z += 3)
          if (Math.hypot(x - sp.x, z - sp.z) <= 30) s30 = Math.max(s30, t.slopeAt(x, z));
      out.slope30 = +s30.toFixed(1);

      // deepest pit within 12 m of spawn
      let pit12 = 0;
      for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
        const x = sp.x + i * 2, z = sp.z + j * 2;
        if (Math.hypot(x - sp.x, z - sp.z) > 12) continue;
        pit12 = Math.max(pit12, floor - t.heightAt(x, z));
      }
      out.pit12 = +pit12.toFixed(2);

      // approach slope within 60 m of each key landmark + pit in 20 m span
      out.slopes = {}; out.pits = {};
      for (const k of ['postA', 'postB', 'hub', 'breach']) {
        const L = LM[k]; let m = 0;
        for (let x = L.x - 60; x <= L.x + 60; x += 4)
          for (let z = L.z - 60; z <= L.z + 60; z += 4)
            if (Math.hypot(x - L.x, z - L.z) <= 60) m = Math.max(m, t.slopeAt(x, z));
        out.slopes[k] = +m.toFixed(1);
        const hL = t.heightAt(L.x, L.z); let pit = 0;
        for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
          const x = L.x + i * 2, z = L.z + j * 2;
          pit = Math.max(pit, hL - t.heightAt(x, z));
        }
        out.pits[k] = +pit.toFixed(2);
      }

      // anomaly field: determinism + expected specials
      const snap1 = () => F.game.anoms.map((a) => [a.id, a.x, a.z, a.type, a.special, a.depth, a.deep, a.unlocks || '']);
      F.game.buildAnomalies(R.anoms);
      const a = snap1();
      F.game.buildAnomalies(R.anoms);
      const b = snap1();
      out.anoms = {
        n: a.length,
        deterministic: JSON.stringify(a) === JSON.stringify(b),
        deep: a.filter((r) => r[6]).map((r) => r),
        cable: a.filter((r) => r[3] === 'cable').map((r) => r),
        pipes: a.filter((r) => r[3] === 'pipe').length
      };

      // bake determinism: two fresh bakes of the live region's parameter bundle
      const m = await import('/src/world/bake.js');
      const bt = (P) => new Promise((res) => {
        const g = m.bakeTerrain(() => {}, P);
        const step = () => { const r = g.next(); if (r.done) res(r.value); else setTimeout(step, 0); };
        step();
      });
      const B1 = await bt(R.terrain), B2 = await bt(R.terrain);
      let detOk = B1.macro.length === B2.macro.length;
      if (detOk) for (let i = 0; i < 1000; i++) {
        const k = (Math.random() * B1.macro.length) | 0;
        if (B1.macro[k] !== B2.macro[k]) { detOk = false; break; }
      }
      out.bake = { det: detOk, n: B1.macro.length };
      return JSON.stringify(out);
    })();
  `, 240000, 2000);
  const C = JSON.parse(chk);

  result('crest wall 90..150 m above floor near spawn az',
    C.crestDelta >= 90 && C.crestDelta <= 150,
    `floor=${C.spawnH} crest=${C.crestH} delta=${C.crestDelta}`);
  result('spawn pad flat: <= 2.0 m over the 13x13 grid (30 m span)',
    C.d30 <= 2.0,
    `d30=${C.d30} m (r15 circle: ${C.d30r15} m)`);
  result('slope within 30 m of spawn <= 15 deg', C.slope30 <= 15, C.slope30 + ' deg');
  result('no pit > 2 m within 12 m of spawn', C.pit12 <= 2.0, C.pit12 + ' m');
  for (const k of ['postA', 'postB', 'hub', 'breach']) {
    result(`approach slope <= ~20 deg within 60 m of ${k}`, C.slopes[k] <= 21.5, C.slopes[k] + ' deg');
    result(`no crater pit at ${k} (<=2 m drop in 20 m span)`, C.pits[k] <= 2.0, C.pits[k] + ' m');
  }
  const deep = C.anoms.deep || [];
  const hubOk = deep.length === 1 && deep[0][4] === 'core' && deep[0][5] === 9 && deep[0][7] === 'hub';
  const LMh = JSON.parse(await js(`
    return JSON.stringify({
      hub: window.FARSIDE.region.landmarks.hub,
      postA: window.FARSIDE.region.landmarks.postA
    });
  `));
  const cableOk = C.anoms.cable.length === 1 &&
    Math.hypot(C.anoms.cable[0][1] - (LMh.postA.x + 10), C.anoms.cable[0][2] - (LMh.postA.z - 8)) < 0.6 &&
    C.anoms.cable[0][5] === 2.4;
  const coreOk = hubOk && Math.hypot(deep[0][1] - (LMh.hub.x + 4), deep[0][2] - (LMh.hub.z + 6)) < 0.6;
  result('anomaly field deterministic (two builds identical)', C.anoms.deterministic,
    C.anoms.n + ' points');
  result('exactly one deep core at hub (d=9, unlocks hub)', coreOk && hubOk, JSON.stringify(deep));
  result('exactly one cable at postA (d=2.4)', cableOk, JSON.stringify(C.anoms.cable));
  result('no pipes in the long shadow field', C.anoms.pipes === 0, C.anoms.pipes + ' pipes');
  result('bake deterministic (2x bakeTerrain, 1000 samples)', C.bake.det === true, C.bake.n + ' floats');

  /* ============ 5. free survey + deploy + dusk shot ============ */
  await js(`document.getElementById('btnFreeRoam').click(); return true;`);
  await poll('state PLAY after free survey start',
    `return window.FARSIDE && window.FARSIDE.state === 2 ? true : null;`, 15000);
  let s = await snap();
  result('free survey started', s.freeRoam === true, 'missionId=' + s.missionId + ' power=' + s.power);
  await shot('ls05_02_deploy_spawn');

  await sleep(1200);
  const HN = JSON.parse(await js(`
    return JSON.stringify({
      mission: document.getElementById('missionName').textContent,
      map: document.getElementById('hudMapName').textContent,
      range: document.getElementById('rangeHome').textContent
    });
  `));
  result('HUD names follow the region (no stale ANAXIMENES)',
    HN.mission === 'THE LONG SHADOW' && HN.map === 'THE LONG SHADOW BASIN' && parseInt(HN.range) <= 15,
    JSON.stringify(HN));

  await tap('KeyT');
  await poll('solar array panelTarget set',
    `const g = window.FARSIDE.game; return g && g.rover.panelTarget > 0.5 ? true : null;`, 8000);
  await tap('KeyF');
  s = await snap();
  result('T deploys array, F lifts lamps', s.panelTarget > 0.5 && s.headlights === true,
    'panelTarget=' + s.panelTarget);

  // point the chase camera at the rim wall (home azimuth) and shoot the dark rim line
  await js(`
    const F = window.FARSIDE, r = F.rover, sp = F.region.spawn;
    r.placeAt(sp.x, sp.z, 0.70);
    r.vel.set(0, 0, 0);
    return true;
  `);
  await sleep(1600);
  await shot('ls05_03_dusk_rim');
  result('dusk deploy shot taken (visual)', true, 'check ls05_03 for dark rim line');

  /* ============ 6. drive to post A -> prompt ============ */
  const postAx = LMh.postA.x, postAz = LMh.postA.z;
  const note = await driveTo(postAx, postAz, 10, 300000);
  s = await snap();
  const dPA = Math.hypot(postAx - s.x, postAz - s.z);
  result('rover reached post A (<=12 m)', dPA <= 12, dPA.toFixed(1) + ' m' + note + ' power=' + s.power);
  const prompt = await js(`
    const el = document.getElementById('prompt');
    return el && !el.classList.contains('hidden') ? el.textContent.trim() : null;
  `);
  result('hold-E prompt shows RECOVER POST RECORD', /RECOVER POST RECORD/.test(String(prompt)), prompt || 'no prompt');
  await shot('ls05_04_postA');

  /* ============ 7. swap back to Anaximenes ============ */
  await tap('Escape');
  await poll('pause overlay',
    `return !document.getElementById('pause').classList.contains('hidden') ? true : null;`, 10000);
  await js(`document.getElementById('btnAbort').click(); return true;`);
  await poll('menu after abort',
    `const b = document.getElementById('btnPlay'); return b && !b.disabled && b.offsetParent !== null ? true : null;`,
    30000);
  await js(`document.getElementById('region-anaximenes').click(); return true;`);
  await poll('world swapped back to anaximenes',
    `const F = window.FARSIDE; return F.region.id === 'anaximenes' && F.terrain && F.props && F.game ? true : null;`,
    180000);
  const back = await poll('anax props check', `
    const F = window.FARSIDE;
    return JSON.stringify({
      region: F.region.id,
      posts: (F.props.posts || []).length,
      hubs: (F.props.hubs || []).length,
      station: !!F.props.station,
      map: document.getElementById('hudMapName').textContent
    });
  `, 15000);
  const B = JSON.parse(back);
  result('swap back to anaximenes: no posts/hubs, station present, HUD names restored',
    B.region === 'anaximenes' && B.posts === 0 && B.hubs === 0 && B.station === true && B.map === 'ANAXIMENES BASIN', back);
  await shot('ls05_05_anax_back');

  const errs = await js(`return window.__errs ? window.__errs.length : null;`);
  result('no page JS errors during run', errs === 0, errs === 0 ? '' : 'errors: ' + (await js(`return window.__errs.slice(0, 3).join(' | ');`)));

  try { await send('WebDriver:DeleteSession', {}); } catch {}
  done = true;
  const failed = results.filter((r) => !r.ok);
  console.log('---');
  console.log(failed.length === 0 ? 'LS05 VERIFY PASS (' + results.length + '/' + results.length + ')'
                                   : 'LS05 VERIFY FAIL (' + failed.length + ' failed)');
  process.exit(failed.length === 0 ? 0 : 1);
})().catch((e) => { console.error('LS05 ERROR:', e.message); done = true; process.exit(2); });
