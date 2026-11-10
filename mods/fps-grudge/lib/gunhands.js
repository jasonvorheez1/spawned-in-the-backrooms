// The installed hands mod holds every gun: the mod owns the arms model, its rig and its forearm IK
// (solveWrist); this module only says WHERE each wrist goes, from the gun's own frame. One rule for
// every gun: the right wrist on the pistol grip, the left on the handguard (or cupping a pistol grip).
import RIG from "./data/arm-rig.json"; // the mod rig's arm chain only (see its source key)
import FRAME from "./data/arms-framing.yml";
import { fk, solveWrist, toXYZ, mul, inv, rotate } from "./hand-contact-math.js";
import { rotationFromEuler } from "builtin/vec3";
import GH from "./data/gunhands.yml";

const BIND = fk(RIG.nodes);
const BONES = ["R_Elbow", "R_Wrist", "L_Elbow", "L_Wrist"];
const n3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function basisQ(xa, ya) { // orthonormal wrist frame from a thumb-ish axis and a finger axis → quaternion
  const y = n3(ya); let z = n3(cross(xa, y)); const x = cross(y, z);
  const m00 = x[0], m01 = y[0], m02 = z[0], m10 = x[1], m11 = y[1], m12 = z[1], m20 = x[2], m21 = y[2], m22 = z[2];
  const t = m00 + m11 + m22; let q;
  if (t > 0) { const s = 0.5 / Math.sqrt(t + 1); q = { w: 0.25 / s, x: (m21 - m12) * s, y: (m02 - m20) * s, z: (m10 - m01) * s }; }
  else if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); q = { w: (m21 - m12) / s, x: 0.25 * s, y: (m01 + m10) / s, z: (m02 + m20) / s }; }
  else if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); q = { w: (m02 - m20) / s, x: (m01 + m10) / s, y: 0.25 * s, z: (m12 + m21) / s }; }
  else { const s = 2 * Math.sqrt(1 + m22 - m00 - m11); q = { w: (m10 - m01) / s, x: (m02 + m20) / s, y: (m12 + m21) / s, z: 0.25 * s }; }
  return { q, x, y, z };
}
const camV = (p) => ({ x: p.x, y: p.y, z: -p.depth });
const ARMS_Q = rotationFromEuler(FRAME.rotation ?? {});
function toRoot(arms, c) { // a camera-frame point (x, y, -depth) into the arms' root frame
  const a = arms.feetPosition ?? { x: FRAME.x, y: FRAME.y, depth: FRAME.depth };
  return rotate(inv(ARMS_Q), { x: c.x - a.x, y: c.y - a.y, z: c.z + (a.depth ?? FRAME.depth) });
}
function write(arms, side, pRoot, qRoot) {
  const o = solveWrist(RIG.nodes, BIND, side, pRoot, qRoot); if (!o) return;
  for (const [name, v] of Object.entries(o)) { const e = toXYZ(v.rotation); const p = v.position ?? { x: 0, y: 0, z: 0 }; arms.bones[name] = { pitch: e.pitch, yaw: e.yaw, roll: e.roll, offset: [p.x, p.y, p.z] }; }
}
function setClip(arms, clip) { if (arms.state.ghClip !== clip) { arms.state.ghClip = clip; arms.anim.hands = { clip, weight: 1, loop: "loop" }; } }

// gun: { x, y, depth, yaw, pitch, roll } — the camera-attached pose of the scripted gun; params: its kit params
export function holdGun(arms, gun, params) {
  setClip(arms, GH.clip);
  const rows = GH.classes[params.cls] ?? GH.classes.default;
  const gq = rotationFromEuler({ yaw: gun.yaw ?? 0, pitch: gun.pitch ?? 0, roll: gun.roll ?? 0 });
  const origin = camV(gun);
  const len = params.len ?? 0.45, guard = -0.1 - Math.min(len * 0.62, 0.34) * 0.5;
  for (const side of ["R", "L"]) {
    const r = rows[side]; if (!r) continue;
    const at = r.at.map((v) => (v === "guard" ? guard : v));
    const b = basisQ(r.x, r.y);
    const wristG = [at[0] - b.y[0] * r.palm[0] + b.z[0] * r.palm[1], at[1] - b.y[1] * r.palm[0] + b.z[1] * r.palm[1], at[2] - b.y[2] * r.palm[0] + b.z[2] * r.palm[1]];
    const wc = rotate(gq, { x: wristG[0], y: wristG[1], z: wristG[2] });
    const pRoot = toRoot(arms, { x: origin.x + wc.x, y: origin.y + wc.y, z: origin.z + wc.z });
    const qRoot = mul(inv(ARMS_Q), mul(gq, b.q));
    write(arms, side, pRoot, qRoot);
  }
}
// fists: a boxer's guard; jab = { side, t } with t 0..1 through the punch
export function holdFists(arms, jab, bob = { x: 0, y: 0 }) {
  setClip(arms, "Fist");
  for (const side of ["R", "L"]) {
    const r = GH.fists[side], b = basisQ(r.x, r.y);
    const k = jab && jab.side === side ? Math.sin(Math.min(1, jab.t) * Math.PI) : 0;
    const c = { x: r.at[0] + bob.x - (side === "R" ? 0.06 : -0.06) * k, y: r.at[1] + bob.y + 0.05 * k, z: -(r.at[2] + GH.fists.jab * k) };
    write(arms, side, toRoot(arms, c), mul(inv(ARMS_Q), b.q));
  }
}
export function release(arms) {
  if (!arms.state.ghClip) return;
  for (const n of BONES) arms.bones[n] = { pitch: 0, yaw: 0, roll: 0, offset: [0, 0, 0] };
  arms.state.ghClip = null; arms.anim.hands = { clip: "Idle", weight: 1, loop: "loop" };
}
