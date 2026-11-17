// HOME-ESC — the escalator derivation, ONE owner (09a §5, 09z: numbers are derived, never re-typed).
// gen-home/store.js draws the stepped picture from it (require("lib/home-esc.js") — mod-scoped);
// lib/furniture/hall.js sizes the invisible ramp / plate / rail box colliders from it
// (require("asset-library/lib/home-esc.js")). Frame: escalator feet at the treads' z-centre on the
// floor it starts from; dir "north" (d = +1) rises toward −Z, "south" (d = −1) toward +Z.

const D2R = Math.PI / 180;

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
}
export function int(v, d, a, b) {
  return clamp(Math.round(num(v, d)), a, b);
}

export function escSpec(p) {
  p = p || {};
  const rise = clamp(num(p.rise, 5.47), 0.5, 12);
  const steps = int(p.steps, 25, 4, 60);
  const tread = clamp(num(p.tread, 0.44), 0.3, 0.6);
  const riser = rise / steps;
  const run = steps * tread;
  const slope = riser / tread;
  const theta = Math.atan(slope);
  const plate = 1.2, plateT = 0.03, stepW = 1.0, bal = 0.2, skirt = 0.35, balH = 1.0;
  const halfW = stepW / 2 + bal + skirt;
  const len = run + 2 * plate;
  const zLow = run / 2, zHigh = -run / 2; // the treads' z span; low end at +Z
  const yLow = plateT, yHigh = plateT + rise; // plate tops, local
  // Nosing line through the treads' front-top edges: (zLow − i·tread, yLow + (i+1)·riser).
  // The ramp collider's top plane is that line lowered 0.06 along its normal (feet sink ≤ 0.07
  // at a nosing, float ≤ riser − 0.067 at a tread's back — 09a §5's stated cost).
  const drop = 0.06 / Math.cos(theta);
  const zFoot = zLow + (riser - drop) / slope; // top plane meets the low plate top
  const zHead = zLow - (rise - riser + drop) / slope; // top plane meets the high plate top
  const rampLen = (zFoot - zHead) / Math.cos(theta);
  const dir = p.dir === "south" ? -1 : 1; // +1: rises toward −Z (north in the store frame)
  const t = 0.2;
  const n = [0, Math.cos(theta), Math.sin(theta)]; // top-plane normal, leans toward the low end
  const mid = [0, (yLow + yHigh) / 2, (zFoot + zHead) / 2];
  const center = [0, mid[1] - (t / 2) * n[1], (mid[2] - (t / 2) * n[2]) * dir];
  const zPL0 = zLow + plate, zPH1 = zHigh - plate; // plate outer ends
  return {
    rise, steps, tread, riser, run, slope, thetaDeg: theta / D2R, plate, plateT, stepW, bal, skirt, balH, halfW, len,
    zLow, zHigh, yLow, yHigh, zFoot, zHead, rampLen, dir,
    // 09a §5 `esc-ramp` box row, derived: 1.00 × 0.20 × rampLen, pitched thetaDeg (SIGN TO MEASURE
    // by the drop probes — a negated pitch mirrors the box through its centre), centre local to the
    // row's feet. `top` = the two ends of the walkable plane (low → high) for the probe to check.
    // Under rotationFromEuler (quat about +X by pitch) a +pitch tilts local +Y toward +Z, so the
    // normal leans toward the low end when pitch = dir · thetaDeg.
    ramp: { w: stepW, t, len: rampLen, pitchDeg: (theta / D2R) * dir, center, top: [[0, yLow, zFoot * dir], [0, yHigh, zHead * dir]] },
    // 09a §5 `esc-rails`: two boxes 0.10 × 1.20 × rampLen on the balustrades' outer halves, centre =
    // ramp centre + 0.70 along the plane normal, x = ±(stepW/2 + bal − 0.05).
    rails: { w: 0.1, h: 1.2, len: rampLen, xs: [-(stepW / 2 + bal - 0.05), stepW / 2 + bal - 0.05], center: [0, center[1] + 0.7 * n[1], center[2] + 0.7 * n[2] * dir] },
    // plate colliders (plateT thick, tops = the plate tops) — the ramp top plane ends where they start
    plates: {
      low: { x: [-stepW / 2, stepW / 2], y: [0, yLow], z: [Math.min(zFoot, zPL0) * dir, Math.max(zFoot, zPL0) * dir] },
      high: { x: [-stepW / 2, stepW / 2], y: [yHigh - plateT, yHigh], z: [Math.min(zHead, zPH1) * dir, Math.max(zHead, zPH1) * dir] },
    },
  };
}

module.exports = { escSpec, clamp, num, int };
