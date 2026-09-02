#!/usr/bin/env node
/* ============================================================
   tools/bake-diff.cjs — Phase 2 bake-identity guard
   ------------------------------------------------------------
   Proves the parameterized bake (src/world/bake.js) is
   BYTE-IDENTICAL to the pre-Phase-2 bake for the Anaximenes
   basin, and that the new bake is deterministic.

     node tools/bake-diff.cjs        →  exit 0 = PASS

   (1) FROZEN COPY below: the exact bake math that lived in
       src/world/terrain.js before the Phase 2 parameterization.
       It is self-contained (no imports from src/) so it can
       never drift along with the live code.
       DO NOT EDIT — regression guard.
   (2) Runs the new bake with P_ANAXIMENES.
   (3) Compares macro / far / det element-wise, strict float
       equality — any drift is a non-zero exit.
   (4) Two fresh new bakes must be strictly equal.
   ============================================================ */
'use strict';

/* ==================== FROZEN PRE-PHASE-2 MATH — DO NOT EDIT ==================== */
/* --- rng math, verbatim from src/core/rng.js (pre-Phase 2) --- */
function hash2i(x, y, seed = 0) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash2i(ix, iy, seed);
  const b = hash2i(ix + 1, iy, seed);
  const c = hash2i(ix, iy + 1, seed);
  const d = hash2i(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
const R = [
  [0.8090, -0.5878, 0.5878, 0.8090],
  [0.3090, 0.9511, -0.9511, 0.3090],
  [-0.5878, 0.8090, -0.8090, -0.5878],
  [0.9511, 0.3090, -0.3090, 0.9511],
  [-0.8090, -0.5878, 0.5878, -0.8090]
];
function fbm(x, y, octaves = 4, lac = 2.07, gain = 0.5, seed = 0) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const m = R[o % R.length];
    const rx = x * m[0] + y * m[1], ry = x * m[2] + y * m[3];
    sum += vnoise(rx * freq + o * 17.3, ry * freq + o * 9.1, seed + o * 131) * amp;
    norm += amp;
    amp *= gain; freq *= lac;
  }
  return sum / norm;
}
function ridged(x, y, octaves = 4, lac = 2.11, gain = 0.5, seed = 0) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const m = R[o % R.length];
    const rx = x * m[0] + y * m[1], ry = x * m[2] + y * m[3];
    const n = vnoise(rx * freq + o * 5.7, ry * freq + o * 12.4, seed + o * 977);
    const r = 1 - Math.abs(n * 2 - 1);
    sum += r * r * amp;
    norm += amp;
    amp *= gain; freq *= lac;
  }
  return sum / norm;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

/* --- the old bake, verbatim from src/world/terrain.js (pre-Phase 2) --- */
const MACRO_EXT = 1200, MACRO_RES = 2048;
const FAR_EXT = 7200, FAR_RES = 512;
const DET_TILE = 16, DET_RES = 256;
const DET_AMP = 0.38;

const RIM_R = 470, RIM_W = 74;

const RILLE_CUT = 2.6;
const rilleProfile = (t) => 1 / (1 + Math.pow(t, 6));
const RILLE_EDGE = rilleProfile(RILLE_CUT);

function rilleH(x, z) {
  if (z < -470 || z > 470) return 0;
  const xc = -168 + 118 * Math.sin(z * 0.0061) + 46 * Math.sin(z * 0.0172 + 1.3)
                  + 17 * Math.sin(z * 0.041 - 0.4);
  const w = 27 + 9 * Math.sin(z * 0.0102 + 2.1);
  const d = Math.abs(x - xc);
  const t = d / w;
  if (t > RILLE_CUT) return 0;
  const bridge = Math.exp(-Math.pow((z - 95) / 46, 2)) * 0.97;
  const taper = sstep(470, 380, Math.abs(z));
  const prof = -(rilleProfile(t) - RILLE_EDGE) / (1 - RILLE_EDGE);
  return prof * 17.5 * (1 - bridge) * taper;
}

function oldBaseHeight(x, z) {
  const r = Math.hypot(x, z);
  let h = (fbm(x * 0.00175, z * 0.00175, 4, 2.05, 0.5, 11) - 0.5) * 33;

  h -= 36 * sstep(RIM_R - 40, 55, r);

  const ang = Math.atan2(z, x);
  const breach = fbm(Math.cos(ang) * 1.55 + 5, Math.sin(ang) * 1.55 + 9, 3, 2.0, 0.5, 77);
  const rimAmp = 112 * (0.30 + 1.05 * breach);
  const prof = Math.exp(-Math.pow((r - RIM_R) / RIM_W, 2));
  h += rimAmp * prof * (0.5 + 0.95 * ridged(x * 0.0062, z * 0.0062, 4, 2.1, 0.5, 31));

  const terr = sstep(RIM_R - 150, RIM_R - 20, r) * (1 - sstep(RIM_R, RIM_R + 60, r));
  h += terr * 9 * Math.sin(r * 0.10 + fbm(x * 0.004, z * 0.004, 2, 2, .5, 3) * 5.0);

  const outT = sstep(RIM_R + RIM_W * 0.55, RIM_R + 430, r);
  h -= 62 * outT;
  h += sstep(RIM_R + 130, RIM_R + 900, r) *
       (ridged(x * 0.00212, z * 0.00212, 5, 2.1, 0.55, 5) - 0.30) * 190;

  const cm = Math.exp(-Math.pow(r / 110, 2));
  h += cm * (64 + 26 * ridged(x * 0.0195, z * 0.0195, 4, 2.1, 0.5, 61));

  h += rilleH(x, z);
  return h;
}

const TIERS = [
  [104, 27, 55, 0.52, 0.155, 3],
  [ 36,  9, 22, 0.60, 0.180, 17],
  [ 12,  2.6, 7.4, 0.64, 0.195, 41]
];

function craterProfile(t, age) {
  if (t >= 1.92) return 0;
  const depth = lerp(1.0, 0.22, age);
  if (t < 1.0) {
    const c = Math.cos(t * Math.PI) * 0.5 + 0.5;
    const flat = lerp(1.35, 2.2, age);
    return -Math.pow(c, flat) * depth;
  }
  const u = (t - 1.0) / 0.92;
  return Math.sin(u * Math.PI) * (1 - u) * 0.55 * depth * lerp(1.0, 0.35, age);
}

function forEachCrater(ext, cb) {
  const half = ext * 0.5;
  for (let ti = 0; ti < TIERS.length; ti++) {
    const [cell, rMin, rMax, prob, depth, seed] = TIERS[ti];
    const n = Math.ceil(ext / cell) + 2;
    const o = -half - cell;
    for (let gz = 0; gz < n; gz++) for (let gx = 0; gx < n; gx++) {
      if (hash2i(gx, gz, seed) > prob) continue;
      const cx = o + (gx + hash2i(gx, gz, seed + 1)) * cell;
      const cz = o + (gz + hash2i(gx, gz, seed + 2)) * cell;
      const rr = hash2i(gx, gz, seed + 3);
      const r = rMin + (rMax - rMin) * rr * rr;
      const age = hash2i(gx, gz, seed + 4);
      const dc = Math.hypot(cx, cz);
      if (dc < 82) continue;
      cb(cx, cz, r, age, depth, ti);
    }
  }
}

function pvn(x, y, per, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const w = (a) => ((a % per) + per) % per;
  const a = hash2i(w(ix), w(iy), seed), b = hash2i(w(ix + 1), w(iy), seed);
  const c = hash2i(w(ix), w(iy + 1), seed), d = hash2i(w(ix + 1), w(iy + 1), seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
/* ==================== end frozen section ==================== */
/* Synchronous copy of the old bakeTerrain passes (yields/report dropped). */
function oldBake() {
  const CO = 640;
  const coarse = new Float32Array(CO * CO);
  for (let z = 0; z < CO; z++) {
    for (let x = 0; x < CO; x++) {
      const wx = (x / (CO - 1) - 0.5) * MACRO_EXT;
      const wz = (z / (CO - 1) - 0.5) * MACRO_EXT;
      coarse[z * CO + x] = oldBaseHeight(wx, wz);
    }
  }
  const cr = (p0, p1, p2, p3, t) => {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  };
  const xi = new Int32Array(MACRO_RES), xt = new Float32Array(MACRO_RES);
  for (let x = 0; x < MACRO_RES; x++) {
    const fx = (x / (MACRO_RES - 1)) * (CO - 1);
    xi[x] = Math.floor(fx); xt[x] = fx - xi[x];
  }
  const cx = (v) => (v < 0 ? 0 : v > CO - 1 ? CO - 1 : v);
  const strip = new Float32Array(CO * MACRO_RES);
  for (let z = 0; z < CO; z++) {
    const row = z * CO, out = z * MACRO_RES;
    for (let x = 0; x < MACRO_RES; x++) {
      const i = xi[x];
      strip[out + x] = cr(coarse[row + cx(i - 1)], coarse[row + cx(i)],
                          coarse[row + cx(i + 1)], coarse[row + cx(i + 2)], xt[x]);
    }
  }
  const macro = new Float32Array(MACRO_RES * MACRO_RES);
  for (let z = 0; z < MACRO_RES; z++) {
    const fz = (z / (MACRO_RES - 1)) * (CO - 1), iz = Math.floor(fz), tz = fz - iz;
    const r0 = cx(iz - 1) * MACRO_RES, r1 = cx(iz) * MACRO_RES;
    const r2 = cx(iz + 1) * MACRO_RES, r3 = cx(iz + 2) * MACRO_RES;
    const out = z * MACRO_RES;
    for (let x = 0; x < MACRO_RES; x++) {
      macro[out + x] = cr(strip[r0 + x], strip[r1 + x], strip[r2 + x], strip[r3 + x], tz);
    }
  }
  const px = MACRO_EXT / MACRO_RES;
  const half = MACRO_RES * 0.5;
  const jobs = [];
  forEachCrater(MACRO_EXT + 240, (cx, cz, r, age, depth) => jobs.push([cx, cz, r, age, depth]));
  for (let ji = 0; ji < jobs.length; ji++) {
    const [cx, cz, r, age, depth] = jobs[ji];
    const R = r * 1.92, amp = r * depth;
    const gx0 = Math.max(0, Math.floor((cx - R) / px + half));
    const gx1 = Math.min(MACRO_RES - 1, Math.ceil((cx + R) / px + half));
    const gz0 = Math.max(0, Math.floor((cz - R) / px + half));
    const gz1 = Math.min(MACRO_RES - 1, Math.ceil((cz + R) / px + half));
    for (let gz = gz0; gz <= gz1; gz++) {
      const wz = (gz - half + 0.5) * px;
      for (let gx = gx0; gx <= gx1; gx++) {
        const wx = (gx - half + 0.5) * px;
        const d = Math.hypot(wx - cx, wz - cz) / r;
        if (d >= 1.92) continue;
        const wob = 1 + 0.13 * (vnoise(Math.atan2(wz - cz, wx - cx) * 2.4 + cx, cz * 0.1, 909) - 0.5) * 2;
        macro[gz * MACRO_RES + gx] += craterProfile(d * wob, age) * amp;
      }
    }
  }
  const far = new Float32Array(FAR_RES * FAR_RES);
  for (let z = 0; z < FAR_RES; z++) {
    for (let x = 0; x < FAR_RES; x++) {
      const wx = (x / (FAR_RES - 1) - 0.5) * FAR_EXT;
      const wz = (z / (FAR_RES - 1) - 0.5) * FAR_EXT;
      far[z * FAR_RES + x] = oldBaseHeight(wx, wz);
    }
  }
  const det = new Float32Array(DET_RES * DET_RES);
  const P = 16;
  for (let z = 0; z < DET_RES; z++) {
    for (let x = 0; x < DET_RES; x++) {
      const u = x / DET_RES * P, v = z / DET_RES * P;
      let d = pvn(u, v, P, 5) * 0.5 + pvn(u * 2, v * 2, P * 2, 6) * 0.29
            + pvn(u * 4, v * 4, P * 4, 7) * 0.14 + pvn(u * 8, v * 8, P * 8, 8) * 0.07;
      det[z * DET_RES + x] = d - 0.5;
    }
  }
  {
    const mpx = DET_TILE / DET_RES;
    for (let k = 0; k < 130; k++) {
      const cx = hash2i(k, 1, 313) * DET_TILE, cz = hash2i(k, 2, 313) * DET_TILE;
      const r = 0.16 + Math.pow(hash2i(k, 3, 313), 2.4) * 1.15;
      const age = hash2i(k, 4, 313);
      const R = r * 1.92;
      const g0x = Math.floor((cx - R) / mpx), g1x = Math.ceil((cx + R) / mpx);
      const g0z = Math.floor((cz - R) / mpx), g1z = Math.ceil((cz + R) / mpx);
      for (let gz = g0z; gz <= g1z; gz++) for (let gx = g0x; gx <= g1x; gx++) {
        const wx = gx * mpx, wz = gz * mpx;
        const d = Math.hypot(wx - cx, wz - cz) / r;
        if (d >= 1.92) continue;
        const ix = ((gx % DET_RES) + DET_RES) % DET_RES;
        const iz = ((gz % DET_RES) + DET_RES) % DET_RES;
        det[iz * DET_RES + ix] += craterProfile(d, age) * r * 0.30 / DET_AMP;
      }
    }
    let mn = 1e9, mx = -1e9;
    for (let i = 0; i < det.length; i++) { if (det[i] < mn) mn = det[i]; if (det[i] > mx) mx = det[i]; }
    const s = 1 / Math.max(mx - mn, 1e-6);
    for (let i = 0; i < det.length; i++) det[i] = (det[i] - mn) * s - 0.5;
  }
  return { macro, far, det };
}
/* ==================== end frozen section ==================== */

function drain(gen) {
  for (;;) { const r = gen.next(); if (r.done) return r.value; }
}

function compare(label, a, b) {
  if (a.length !== b.length) {
    console.error(`DIFF ${label}: length ${a.length} != ${b.length}`);
    return 1;
  }
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) {
      console.error(`DIFF ${label}[${i}]: expected ${a[i]}, got ${b[i]}`);
      return 1;
    }
  }
  console.log(`  ${label.padEnd(6)} identical (${a.length} elements, strict float equality)`);
  return 0;
}

function main() {
  const t0 = Date.now();
  console.log('bake-diff: frozen pre-Phase-2 math vs bakeTerrain(P_ANAXIMENES)');
  const old = oldBake();
  const { bakeTerrain, P_ANAXIMENES } = require('../src/world/bake.js');
  const fresh1 = drain(bakeTerrain(() => {}, P_ANAXIMENES));
  const fresh2 = drain(bakeTerrain(() => {}, P_ANAXIMENES));

  let bad = 0;
  bad |= compare('macro', old.macro, fresh1.macro);
  bad |= compare('far',   old.far,   fresh1.far);
  bad |= compare('det',   old.det,   fresh1.det);
  bad |= compare('macro', fresh1.macro, fresh2.macro);   // determinism
  bad |= compare('far',   fresh1.far,   fresh2.far);
  bad |= compare('det',   fresh1.det,   fresh2.det);
  console.log(`  determinism: bake #1 vs bake #2 strictly equal`);
  console.log(bad ? `BAKE-DIFF FAIL (${((Date.now() - t0) / 1000).toFixed(1)} s)`
                  : `BAKE-DIFF PASS (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(bad ? 1 : 0);
}

main();
