/* ============================================================
   TERRAIN BAKE — pure math, no render-engine import
   ------------------------------------------------------------
   Everything here is deterministic float math: the basin shape,
   the crater field, and the baked height fields. It is
   kept free of any rendering dependency so it runs in plain
   node (tools/bake-diff.cjs) and takes a per-region parameter
   bundle P.

   P_ANAXIMENES is the original basin, verbatim. The identity
   guard (tools/bake-diff.cjs) proves bakeTerrain(P_ANAXIMENES)
   is byte-identical to the pre-Phase-2 bake — do not retune
   it here; region data owns the numbers.
   ============================================================ */
import { fbm, ridged, vnoise, hash2i, clamp, sstep, lerp } from '../core/rng.js';

/* ---------------- fixed bake geometry (metres) ----------------
   Shared by every region. The GPU crossfade (520/596 m) and the
   detail fade (95 m) are tied to these extents in the terrain
   GLSL, so they stay hardcoded there. */
export const MACRO_EXT = 1200, MACRO_RES = 2048;      // 0.586 m / texel
export const FAR_EXT = 7200, FAR_RES = 512;           // horizon scenery
export const DET_TILE = 16, DET_RES = 256;            // 0.0625 m / texel, tiling

export const DET_AMP = 0.38, DET_AMP2 = 0.105, DET_SCALE2 = 4.33;

/* ---------------- region parameter bundle ----------------
   Every number that may differ between basins lives here.
   The low-frequency base fbm, the detail tile, and the sstep
   ramp offsets (computed from rim.r below) are shared verbatim
   across regions and are NOT parameterized. */
export const P_ANAXIMENES = {
  bowl:    { depth: 36, floorR: 55, wallR: 430 },     // h -= depth * sstep(wallR, floorR, r)
  rim:     { r: 470, w: 74, amp: 112,
             breachBase: 0.30, breachAmp: 1.05, breachSeed: 77,
             ridgeScale: 0.0062, ridgeSeed: 31,
             terraceAmp: 9, terraceFreq: 0.10, terraceSeed: 3 },
  fall:    { amp: 62 },
  farRidge:{ amp: 190, bias: 0.30, seed: 5, scale: 0.00212 },
  massif:  { on: true, r: 110, amp: 64, ridgeAmp: 26, seed: 61, scale: 0.0195 },
  rille:   { on: true },
  craters: [                                         // cell, rMin, rMax, prob, depth, seed
    [104, 27, 55, 0.52, 0.155, 3],
    [ 36,  9, 22, 0.60, 0.180, 17],
    [ 12,  2.6, 7.4, 0.64, 0.195, 41]
  ],
  keepClean: [[0, 0, 82]]                            // [x, z, r] crater exclusion zones
};

/* ============================================================
   1.  THE SHAPE OF THE BASIN  (smooth, low-frequency)
   ============================================================ */
const RILLE_CUT = 2.6;
const rilleProfile = (t) => 1 / (1 + Math.pow(t, 6));
const RILLE_EDGE = rilleProfile(RILLE_CUT);

function rilleH(x, z) {
  // A sinuous graben running roughly N–S through the western floor.
  if (z < -470 || z > 470) return 0;
  const xc = -168 + 118 * Math.sin(z * 0.0061) + 46 * Math.sin(z * 0.0172 + 1.3)
                  + 17 * Math.sin(z * 0.041 - 0.4);
  const w = 27 + 9 * Math.sin(z * 0.0102 + 2.1);
  const d = Math.abs(x - xc);
  const t = d / w;
  if (t > RILLE_CUT) return 0;
  // collapsed section around z≈95 forms the only natural crossing
  const bridge = Math.exp(-Math.pow((z - 95) / 46, 2)) * 0.97;
  const taper = sstep(470, 380, Math.abs(z));
  // A single C-infinity profile — flat floor, steep shoulders, exactly zero at
  // the cut-off. The obvious two-branch version leaves a five-metre step at the
  // wall, and the Catmull-Rom upsample rings across that step into a row of
  // shark fins running the whole length of the graben.
  const prof = -(rilleProfile(t) - RILLE_EDGE) / (1 - RILLE_EDGE);
  return prof * 17.5 * (1 - bridge) * taper;
}

/** Smooth basin form. Shared by the near AND far bakes so they blend seamlessly. */
export function baseHeight(x, z, P) {
  const r = Math.hypot(x, z);
  let h = (fbm(x * 0.00175, z * 0.00175, 4, 2.05, 0.5, 11) - 0.5) * 33;

  // broad bowl: the floor sinks toward the middle
  h -= P.bowl.depth * sstep(P.bowl.wallR, P.bowl.floorR, r);

  // rim wall — ridged crests, with azimuthal breaches that let ejecta out
  const ang = Math.atan2(z, x);
  const breach = fbm(Math.cos(ang) * 1.55 + 5, Math.sin(ang) * 1.55 + 9, 3, 2.0, 0.5, P.rim.breachSeed);
  const rimAmp = P.rim.amp * (P.rim.breachBase + P.rim.breachAmp * breach);
  const prof = Math.exp(-Math.pow((r - P.rim.r) / P.rim.w, 2));
  h += rimAmp * prof * (0.5 + 0.95 * ridged(x * P.rim.ridgeScale, z * P.rim.ridgeScale, 4, 2.1, 0.5, P.rim.ridgeSeed));

  // terraced apron on the inner face of the wall
  const terr = sstep(P.rim.r - 150, P.rim.r - 20, r) * (1 - sstep(P.rim.r, P.rim.r + 60, r));
  h += terr * P.rim.terraceAmp * Math.sin(r * P.rim.terraceFreq + fbm(x * 0.004, z * 0.004, 2, 2, .5, P.rim.terraceSeed) * 5.0);

  // outside the wall: fall away, then distant ridge country
  const outT = sstep(P.rim.r + P.rim.w * 0.55, P.rim.r + 430, r);
  h -= P.fall.amp * outT;
  h += sstep(P.rim.r + 130, P.rim.r + 900, r) *
       (ridged(x * P.farRidge.scale, z * P.farRidge.scale, 5, 2.1, 0.55, P.farRidge.seed) - P.farRidge.bias) * P.farRidge.amp;

  // Central massif — crustal rebound after the impact. Wide rather than tall:
  // a narrow peak of the same height would exceed 35° and simply could not be
  // driven, and the whole last mission happens on top of it.
  if (P.massif.on) {
    const cm = Math.exp(-Math.pow(r / P.massif.r, 2));
    h += cm * (P.massif.amp + P.massif.ridgeAmp * ridged(x * P.massif.scale, z * P.massif.scale, 4, 2.1, 0.5, P.massif.seed));
  }

  if (P.rille.on) h += rilleH(x, z);
  return h;
}
/* ============================================================
   2.  CRATERS  (splatted, not evaluated per-texel)
   ============================================================ */
/** classic bowl + raised rim + ejecta skirt, normalised to unit radius */
export function craterProfile(t, age) {
  // t = d / r ;  age 0 = fresh & deep, 1 = ancient & filled
  if (t >= 1.92) return 0;
  const depth = lerp(1.0, 0.22, age);
  if (t < 1.0) {
    const c = Math.cos(t * Math.PI) * 0.5 + 0.5;          // 1 at centre -> 0 at rim
    const flat = lerp(1.35, 2.2, age);                     // older craters flatten out
    return -Math.pow(c, flat) * depth;
  }
  const u = (t - 1.0) / 0.92;
  return Math.sin(u * Math.PI) * (1 - u) * 0.55 * depth * lerp(1.0, 0.35, age);
}

export function forEachCrater(ext, tiers, keepClean, cb) {
  const half = ext * 0.5;
  for (let ti = 0; ti < tiers.length; ti++) {
    const [cell, rMin, rMax, prob, depth, seed] = tiers[ti];
    const n = Math.ceil(ext / cell) + 2;
    const o = -half - cell;
    for (let gz = 0; gz < n; gz++) for (let gx = 0; gx < n; gx++) {
      if (hash2i(gx, gz, seed) > prob) continue;
      const cx = o + (gx + hash2i(gx, gz, seed + 1)) * cell;
      const cz = o + (gz + hash2i(gx, gz, seed + 2)) * cell;
      const rr = hash2i(gx, gz, seed + 3);
      const r = rMin + (rMax - rMin) * rr * rr;            // many small, few large
      const age = hash2i(gx, gz, seed + 4);
      // keep the clean zones free of craters (landing pads, landmarks)
      let skip = false;
      for (let ki = 0; ki < keepClean.length; ki++) {
        const k = keepClean[ki];
        if (Math.hypot(cx - k[0], cz - k[1]) < k[2]) { skip = true; break; }
      }
      if (skip) continue;
      cb(cx, cz, r, age, depth, ti);
    }
  }
}

/* ============================================================
   3.  BAKING
   ============================================================ */
/* periodic value noise, for the seamless detail tile */
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

/** Box-filtered mip chain. A clipmap ring with 19 m cells cannot represent a
    20 m crater bowl; without a filtered height field it interpolates straight
    across and leaves a row of tents on the horizon. */
export function buildMips(base, res) {
  const mips = [{ data: base, width: res, height: res }];
  let src = base, w = res;
  while (w > 4) {
    const nw = w >> 1;
    const dst = new Float32Array(nw * nw);
    for (let y = 0; y < nw; y++) {
      const r0 = (y * 2) * w, r1 = r0 + w, o = y * nw;
      for (let x = 0; x < nw; x++) {
        const i = x * 2;
        dst[o + x] = (src[r0 + i] + src[r0 + i + 1] + src[r1 + i] + src[r1 + i + 1]) * 0.25;
      }
    }
    mips.push({ data: dst, width: nw, height: nw });
    src = dst; w = nw;
  }
  return mips;
}
/** Bake everything. Returns a generator: step it until done, reading .progress. */
export function* bakeTerrain(report, P = P_ANAXIMENES) {
  /* --- 3a. macro base (coarse, then smoothly upsampled) --- */
  const CO = 640;                                    // coarse resolution of the smooth form
  const coarse = new Float32Array(CO * CO);
  for (let z = 0; z < CO; z++) {
    for (let x = 0; x < CO; x++) {
      const wx = (x / (CO - 1) - 0.5) * MACRO_EXT;
      const wz = (z / (CO - 1) - 0.5) * MACRO_EXT;
      coarse[z * CO + x] = baseHeight(wx, wz, P);
    }
    if ((z & 15) === 0) { report(0.02 + 0.20 * (z / CO), 'shaping the basin'); yield; }
  }

  /* Catmull–Rom upsample, done SEPARABLY: rows first into a strip, then
     columns. The naive 2D form costs 21 M spline evaluations at this size and
     blocks the main thread for seconds; separating it costs 5.5 M. */
  const cr = (p0, p1, p2, p3, t) => {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  };
  // precompute the x sample indices + parameter once; every row reuses them
  const xi = new Int32Array(MACRO_RES), xt = new Float32Array(MACRO_RES);
  for (let x = 0; x < MACRO_RES; x++) {
    const fx = (x / (MACRO_RES - 1)) * (CO - 1);
    xi[x] = Math.floor(fx); xt[x] = fx - xi[x];
  }
  const cx = (v) => (v < 0 ? 0 : v > CO - 1 ? CO - 1 : v);
  const strip = new Float32Array(CO * MACRO_RES);       // CO rows × full width
  for (let z = 0; z < CO; z++) {
    const row = z * CO, out = z * MACRO_RES;
    for (let x = 0; x < MACRO_RES; x++) {
      const i = xi[x];
      strip[out + x] = cr(coarse[row + cx(i - 1)], coarse[row + cx(i)],
                          coarse[row + cx(i + 1)], coarse[row + cx(i + 2)], xt[x]);
    }
    if ((z & 63) === 0) { report(0.22 + 0.05 * (z / CO), 'resolving relief'); yield; }
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
    if ((z & 63) === 0) { report(0.27 + 0.09 * (z / MACRO_RES), 'resolving relief'); yield; }
  }

  /* --- 3b. splat craters into the macro field --- */
  const px = MACRO_EXT / MACRO_RES;                  // metres per texel
  const half = MACRO_RES * 0.5;
  let done = 0, total = 0;
  forEachCrater(MACRO_EXT + 240, P.craters, P.keepClean, () => total++);
  const jobs = [];
  forEachCrater(MACRO_EXT + 240, P.craters, P.keepClean, (cx, cz, r, age, depth) => jobs.push([cx, cz, r, age, depth]));
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
        // radial noise on the lip so no crater is a perfect circle
        const wob = 1 + 0.13 * (vnoise(Math.atan2(wz - cz, wx - cx) * 2.4 + cx, cz * 0.1, 909) - 0.5) * 2;
        macro[gz * MACRO_RES + gx] += craterProfile(d * wob, age) * amp;
      }
    }
    done++;
    if ((ji & 127) === 0) { report(0.36 + 0.26 * (done / total), `impact record · ${done}/${total}`); yield; }
  }

  /* --- 3c. far horizon field --- */
  const far = new Float32Array(FAR_RES * FAR_RES);
  for (let z = 0; z < FAR_RES; z++) {
    for (let x = 0; x < FAR_RES; x++) {
      const wx = (x / (FAR_RES - 1) - 0.5) * FAR_EXT;
      const wz = (z / (FAR_RES - 1) - 0.5) * FAR_EXT;
      far[z * FAR_RES + x] = baseHeight(wx, wz, P);
    }
    if ((z & 31) === 0) { report(0.62 + 0.08 * (z / FAR_RES), 'plotting the horizon'); yield; }
  }

  /* --- 3d. seamless detail tile: grain, clods, sub-metre pitting --- */
  const det = new Float32Array(DET_RES * DET_RES);
  const Pn = 16;                                     // noise lattice period inside the tile
  for (let z = 0; z < DET_RES; z++) {
    for (let x = 0; x < DET_RES; x++) {
      const u = x / DET_RES * Pn, v = z / DET_RES * Pn;
      let d = pvn(u, v, Pn, 5) * 0.5 + pvn(u * 2, v * 2, Pn * 2, 6) * 0.29
            + pvn(u * 4, v * 4, Pn * 4, 7) * 0.14 + pvn(u * 8, v * 8, Pn * 8, 8) * 0.07;
      det[z * DET_RES + x] = d - 0.5;
    }
    if ((z & 63) === 0) { report(0.70 + 0.04 * (z / DET_RES), 'grain'); yield; }
  }
  // micro-craters, wrapped
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
    // normalise to ±0.5 so DET_AMP is meaningful
    let mn = 1e9, mx = -1e9;
    for (let i = 0; i < det.length; i++) { if (det[i] < mn) mn = det[i]; if (det[i] > mx) mx = det[i]; }
    const s = 1 / Math.max(mx - mn, 1e-6);
    for (let i = 0; i < det.length; i++) det[i] = (det[i] - mn) * s - 0.5;
  }
  report(0.75, 'regolith settled'); yield;
  const macroMips = buildMips(macro, MACRO_RES);
  const farMips = buildMips(far, FAR_RES);
  report(0.76, 'filtering for distance'); yield;

  return { macro, far, det, macroMips, farMips };
}
