// Motions — fighting and carrying weapons: one-handed swings, two-handed
// swings, overhead chops, blocks, bow draw and loose, rifle and pistol carry
// and aim, staggers, knockdowns.
//
// Authored clips: named functions of time, values are OFFSETS from the rig's
// BIND pose (a T-POSE — arms straight out sideways), euler DEGREES in the
// bone's own local frame. See lib/motion-social.js for the shape.
//
// Aim and carry poses are STATES: loop them, and keep the weapon hand steady
// enough that an attached prop doesn't swim. Swings are one-shots.
//
// The axis grammar this file poses in (read off motion-social.js and the rig's
// mirrored arm frames — worth knowing before editing a number):
//   Arm X      0 = straight out sideways, +62 = hanging at the side (DOWN),
//              +90 = straight down, negative = raised above horizontal.
//              Same sign on both arms = a symmetric pose.
//   Arm Z      swings the arm through the horizontal plane: LEFT arm +Z goes
//              FORWARD, RIGHT arm -Z goes forward. Keep |Z| under ~85 — Z is
//              composed before X, so a fully-forward arm has no drop left.
//   ForeArm X  negative = the elbow flexes (hand toward the shoulder).
//   Spine/Head X  positive = fold forward / chin down, negative = arch back.
//   Spine/Hips Y  positive = twist toward the body's LEFT.
//   Hips position  rig-local (cm-scale) units, not metres.

// Arms hanging at the sides, the silhouette Idle rests in.
const DOWN = 62;

// The shelf reads this: one row per motion, in the order they should appear.
// loop "loop" = a state the body stays in; "once" = a one-shot that freezes on
// its last frame (a held pose).
const MANIFEST = [
  { key: "slash1h", label: "One-handed slash", group: "combat", loop: "once", tags: ["melee", "attack", "sword"] },
  { key: "slash2h", label: "Two-handed swing", group: "combat", loop: "once", tags: ["melee", "attack", "heavy"] },
  { key: "overhead2h", label: "Overhead chop", group: "combat", loop: "once", tags: ["melee", "attack", "heavy", "axe"] },
  { key: "block", label: "Block", group: "combat", loop: "loop", tags: ["defend", "shield", "guard"] },
  { key: "bowDraw", label: "Bow draw", group: "combat", loop: "loop", tags: ["ranged", "bow", "aim"] },
  { key: "bowShot", label: "Arrow loose", group: "combat", loop: "once", tags: ["ranged", "bow", "attack"] },
  { key: "rifleCarry", label: "Rifle carry", group: "combat", loop: "loop", tags: ["ranged", "gun", "rifle", "carry"] },
  { key: "rifleAim", label: "Rifle aim", group: "combat", loop: "loop", tags: ["ranged", "gun", "rifle", "aim"] },
  { key: "pistolCarry", label: "Pistol carry", group: "combat", loop: "loop", tags: ["ranged", "gun", "pistol", "carry"] },
  { key: "pistolAim", label: "Pistol aim", group: "combat", loop: "loop", tags: ["ranged", "gun", "pistol", "aim"] },
  { key: "punch", label: "Punch", group: "combat", loop: "once", tags: ["melee", "attack", "unarmed"] },
  { key: "throwItem", label: "Throw", group: "combat", loop: "once", tags: ["ranged", "attack", "throw"] },
  { key: "stagger", label: "Hurt", group: "combat", loop: "once", tags: ["hit", "damage", "react"] },
  { key: "knockedDown", label: "Knocked down", group: "combat", loop: "loop", tags: ["hit", "downed", "ground"] },
  { key: "die", label: "Die", group: "combat", loop: "once", tags: ["death", "downed", "ground"] },
];

// 0 before a, 1 after b, smoothed between — the shape every phase of a swing is
// cut from. Every one-shot below is built out of two or three of these.
export function ph(p, a, b) {
  const x = (p - a) / (b - a);
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
}

// --- melee -----------------------------------------------------------------

// Wind up over the right shoulder, cut down across the body, settle to guard.
// The clip opens AND closes on the guard pose, so it reads as one motion out of
// a stance and back into it.
export function slash1h(t) {
  const p = t / slash1h.duration;
  const back = ph(p, 0, 0.28) * (1 - ph(p, 0.28, 0.46)); // over the shoulder
  const thru = ph(p, 0.3, 0.5) * (1 - 0.85 * ph(p, 0.55, 1)); // the cut, then guard
  return {
    Hips: { rotation: [0, -10 * back + 16 * thru, 0], position: [0, -1.6 * thru, 0] },
    Spine02: { rotation: [2 * thru, -6 * back + 8 * thru, 0] },
    Spine01: { rotation: [3 * thru, -9 * back + 12 * thru, 0] },
    Spine: { rotation: [-5 * back + 10 * thru, -16 * back + 22 * thru, 0] },
    neck: { rotation: [0, 6 * back - 8 * thru, 0] },
    Head: { rotation: [-3 * back + 8 * thru, 5 * back - 9 * thru, 0] },
    // Sword arm: up behind the shoulder, then low across the far hip.
    RightArm: { rotation: [46 - 100 * back + 30 * thru, 0, -28 + 62 * back - 44 * thru] },
    RightForeArm: { rotation: [-72 - 42 * back + 60 * thru, 0, 0] },
    RightHand: { rotation: [0, 0, -8 * back + 8 * thru] },
    // Off hand counterbalances: forward on the wind-up, pulled back on the cut.
    LeftArm: { rotation: [58 + 6 * back + 10 * thru, 0, 8 + 14 * back - 34 * thru] },
    LeftForeArm: { rotation: [-38 - 26 * back + 8 * thru, 0, 0] },
    RightUpLeg: { rotation: [-6 * back + 10 * thru, 0, 0] },
    LeftUpLeg: { rotation: [4 * back - 6 * thru, 0, 0] },
    RightLeg: { rotation: [-6 * thru, 0, 0] },
    LeftLeg: { rotation: [-5 * thru, 0, 0] },
  };
}
slash1h.duration = 0.8;

// Both hands on the haft, so the ARC comes from the hips and chest — the arms
// hold their grip and the torso carries the weapon around. Heavy on the way out
// and slow to settle.
export function slash2h(t) {
  const p = t / slash2h.duration;
  const back = ph(p, 0, 0.32) * (1 - ph(p, 0.32, 0.5));
  const thru = ph(p, 0.34, 0.56);
  const settle = ph(p, 0.56, 1);
  const arc = thru * (1 - 0.55 * settle); // overshoot, then heavy recovery
  return {
    Hips: { rotation: [0, -26 * back + 40 * arc, 0], position: [0, -2.4 * thru * (1 - 0.5 * settle), 0] },
    Spine02: { rotation: [0, -8 * back + 12 * arc, 0] },
    Spine01: { rotation: [2 * arc, -12 * back + 18 * arc, 0] },
    Spine: { rotation: [-4 * back + 12 * arc, -20 * back + 30 * arc, 0] },
    neck: { rotation: [0, 5 * back - 7 * arc, 0] },
    Head: { rotation: [4 * arc, 8 * back - 12 * arc, 0] },
    // The grip: both hands out in front, elbows bent, holding station on the chest.
    RightArm: { rotation: [52 - 14 * back + 12 * arc, 0, -34 - 10 * back + 6 * arc] },
    RightForeArm: { rotation: [-58 - 18 * back + 10 * arc, 0, 0] },
    LeftArm: { rotation: [52 - 10 * back + 14 * arc, 0, 34 + 16 * back - 8 * arc] },
    LeftForeArm: { rotation: [-62 - 14 * back + 12 * arc, 0, 0] },
    RightUpLeg: { rotation: [-8 * back + 12 * arc, 0, 0] },
    LeftUpLeg: { rotation: [6 * back - 8 * arc, 0, 0] },
    RightLeg: { rotation: [-10 * thru * (1 - 0.4 * settle), 0, 0] },
    LeftLeg: { rotation: [-10 * thru * (1 - 0.4 * settle), 0, 0] },
  };
}
slash2h.duration = 1.1;

// Both hands overhead, then the whole spine drops into the chop and stays low.
export function overhead2h(t) {
  const p = t / overhead2h.duration;
  const up = ph(p, 0, 0.38) * (1 - ph(p, 0.4, 0.56));
  const chop = ph(p, 0.4, 0.58);
  const settle = ph(p, 0.58, 1);
  const low = chop * (1 - 0.35 * settle); // ends low, not back at rest
  return {
    Hips: { rotation: [0, 0, 0], position: [0, 2 * up - 5 * low, 0] },
    Spine02: { rotation: [-3 * up + 10 * low, 0, 0] },
    Spine01: { rotation: [-6 * up + 18 * low, 0, 0] },
    Spine: { rotation: [-14 * up + 40 * low, 0, 0] },
    neck: { rotation: [-6 * up + 10 * low, 0, 0] },
    Head: { rotation: [-8 * up + 14 * low, 0, 0] },
    RightArm: { rotation: [DOWN - 130 * up + 26 * low, 0, -12 - 16 * up - 30 * low] },
    LeftArm: { rotation: [DOWN - 130 * up + 26 * low, 0, 12 + 16 * up + 30 * low] },
    RightForeArm: { rotation: [-20 - 30 * up + 14 * low, 0, 0] },
    LeftForeArm: { rotation: [-20 - 30 * up + 14 * low, 0, 0] },
    RightUpLeg: { rotation: [-4 * up + 20 * low, 0, 0] },
    LeftUpLeg: { rotation: [-4 * up + 20 * low, 0, 0] },
    RightLeg: { rotation: [-6 * up - 26 * low, 0, 0] },
    LeftLeg: { rotation: [-6 * up - 26 * low, 0, 0] },
  };
}
overhead2h.duration = 1.2;

// --- defence ---------------------------------------------------------------

// Braced: left forearm (or shield) across the chest, left shoulder leading,
// weight on the back foot, knees soft. Breathes so it isn't a statue.
export function block(t) {
  const b = Math.sin((t * 2 * Math.PI) / block.duration); // breath
  const s = Math.sin((t * 4 * Math.PI) / block.duration); // small brace settle
  return {
    Hips: { rotation: [0, -8, 0], position: [0, -2 + 0.4 * s, 0] },
    Spine02: { rotation: [2, -5, 0] },
    Spine01: { rotation: [3 + 0.8 * b, -7, 0] },
    Spine: { rotation: [6 + 2.5 * b, -14, 0] },
    neck: { rotation: [2, 6, 0] },
    Head: { rotation: [4 + 0.8 * b, 8, 0] },
    // Shield arm across the chest.
    LeftArm: { rotation: [74 + 1.2 * b, 0, 58 + 0.8 * s] },
    LeftForeArm: { rotation: [-95 - 1.2 * b, 0, 0] },
    LeftHand: { rotation: [0, 0, 6] },
    // Weapon hand held back and low behind the guard.
    RightArm: { rotation: [68 + 1 * b, 0, -18] },
    RightForeArm: { rotation: [-50 - 2 * b, 0, 0] },
    RightUpLeg: { rotation: [-10, 0, 0] },
    LeftUpLeg: { rotation: [6, 0, 0] },
    RightLeg: { rotation: [-16 - 0.6 * s, 0, 0] },
    LeftLeg: { rotation: [-12 - 0.6 * s, 0, 0] },
  };
}
block.duration = 2.4;

// --- bow -------------------------------------------------------------------

// Held at full draw: bow arm level and forward, string hand back by the jaw,
// chest opened away from the target, and the fine tremor of holding it there.
export function bowDraw(t) {
  const b = Math.sin((t * 2 * Math.PI) / bowDraw.duration); // slow breath
  const tr = Math.sin((t * 10 * Math.PI) / bowDraw.duration); // 5 cycles: tremor
  return {
    Hips: { rotation: [0, -6, 0], position: [0, -0.6 + 0.3 * b, 0] },
    Spine02: { rotation: [1, -6, 0] },
    Spine01: { rotation: [2 + 0.6 * b, -10, 0] },
    Spine: { rotation: [2 + 2 * b, -18, 0] },
    neck: { rotation: [0, 8, 0] },
    Head: { rotation: [2, 14 + 0.4 * tr, 0] },
    // Bow arm: straight out in front, shoulder height, holding dead level.
    LeftArm: { rotation: [4 + 0.7 * tr + 0.6 * b, 0, 82] },
    LeftForeArm: { rotation: [-6 - 0.5 * tr, 0, 0] },
    // String hand: elbow up and back, hand tucked beside the jaw.
    RightArm: { rotation: [-12 + 0.8 * tr, 0, 34] },
    RightForeArm: { rotation: [-104 - 1.2 * tr, 0, 0] },
    RightHand: { rotation: [0, 0, -8] },
    RightUpLeg: { rotation: [-6, 0, 0] },
    LeftUpLeg: { rotation: [5, 0, 0] },
    RightLeg: { rotation: [-8, 0, 0] },
    LeftLeg: { rotation: [-6, 0, 0] },
  };
}
bowDraw.duration = 2.4;

// The loose: string hand snaps back past the ear, chest opens with it, bow arm
// holds its line — the follow-through archers are taught to keep.
export function bowShot(t) {
  const p = t / bowShot.duration;
  const rel = ph(p, 0.08, 0.22);
  const s = rel * (1 - 0.4 * ph(p, 0.35, 1)); // snap, then relax a little
  return {
    Hips: { rotation: [0, -6 - 4 * s, 0], position: [0, -0.6 - 0.8 * s, 0] },
    Spine02: { rotation: [1, -6 - 3 * s, 0] },
    Spine01: { rotation: [2, -10 - 6 * s, 0] },
    Spine: { rotation: [2 - 3 * s, -18 - 12 * s, 0] },
    neck: { rotation: [0, 8 + 2 * s, 0] },
    Head: { rotation: [2, 14 + 4 * s, 0] },
    LeftArm: { rotation: [4 + 3 * s, 0, 82 - 4 * s] },
    LeftForeArm: { rotation: [-6 - 2 * s, 0, 0] },
    RightArm: { rotation: [-12 - 10 * s, 0, 34 + 26 * s] },
    RightForeArm: { rotation: [-104 + 34 * s, 0, 0] },
    RightHand: { rotation: [0, 0, -8 - 10 * s] },
    RightUpLeg: { rotation: [-6, 0, 0] },
    LeftUpLeg: { rotation: [5, 0, 0] },
    RightLeg: { rotation: [-8, 0, 0] },
    LeftLeg: { rotation: [-6, 0, 0] },
  };
}
bowShot.duration = 0.6;

// --- firearms --------------------------------------------------------------

// Patrol carry: both hands forward and low, elbows tucked in, muzzle down.
// Easy breathing, and the hands ride the chest so a held rifle doesn't swim.
export function rifleCarry(t) {
  const b = Math.sin((t * 2 * Math.PI) / rifleCarry.duration);
  const w = Math.cos((t * 2 * Math.PI) / rifleCarry.duration); // weight shift
  return {
    Hips: { rotation: [0, -5, 0], position: [0.6 * w, -0.5 + 0.4 * b, 0] },
    Spine02: { rotation: [1, -3, 0] },
    Spine01: { rotation: [2 + 0.8 * b, -5, 0] },
    Spine: { rotation: [4 + 2.2 * b, -6, 0] },
    neck: { rotation: [0, 3, 0] },
    Head: { rotation: [3 + 0.8 * b, 4, 0] },
    // Firing hand back at the waist, support hand further forward and lower.
    RightArm: { rotation: [66 + 1.2 * b, 0, -26] },
    RightForeArm: { rotation: [-68 - 1.4 * b, 0, 0] },
    LeftArm: { rotation: [62 + 1 * b, 0, 44] },
    LeftForeArm: { rotation: [-52 - 1.2 * b, 0, 0] },
    RightUpLeg: { rotation: [-3, 0, 0] },
    LeftUpLeg: { rotation: [3, 0, 0] },
    RightLeg: { rotation: [-5, 0, 0] },
    LeftLeg: { rotation: [-5, 0, 0] },
  };
}
rifleCarry.duration = 3;

// Shouldered: firing elbow up and flared out, support hand forward under the
// handguard, cheek down to the sights. Only the sway of a held aim.
export function rifleAim(t) {
  const s1 = Math.sin((t * 2 * Math.PI) / rifleAim.duration);
  const s2 = Math.sin((t * 4 * Math.PI) / rifleAim.duration);
  return {
    Hips: { rotation: [0, -8, 0], position: [0, -1.2, 0] },
    Spine02: { rotation: [2, -4, 0] },
    Spine01: { rotation: [3, -6 + 0.4 * s1, 0] },
    Spine: { rotation: [6 + 0.6 * s1, -12 + 0.8 * s1, 0] },
    neck: { rotation: [2, 6, 0] },
    // Cheek welded to the stock: chin down, head turned back onto the sights.
    Head: { rotation: [6 + 0.4 * s2, 10 + 0.4 * s1, 4] },
    RightArm: { rotation: [18 + 0.7 * s1, 0, 4] },
    RightForeArm: { rotation: [-96 - 0.6 * s1, 0, 0] },
    LeftArm: { rotation: [40 + 0.7 * s1, 0, 62] },
    LeftForeArm: { rotation: [-62 - 0.5 * s2, 0, 0] },
    RightUpLeg: { rotation: [-6, 0, 0] },
    LeftUpLeg: { rotation: [5, 0, 0] },
    RightLeg: { rotation: [-9, 0, 0] },
    LeftLeg: { rotation: [-7, 0, 0] },
  };
}
rifleAim.duration = 2.4;

// Ready but down: gun hand resting at the thigh, off hand loose, eyes scanning.
export function pistolCarry(t) {
  const b = Math.sin((t * 2 * Math.PI) / pistolCarry.duration);
  const scan = Math.sin((t * 2 * Math.PI) / pistolCarry.duration + Math.PI / 3);
  const w = Math.cos((t * 2 * Math.PI) / pistolCarry.duration);
  return {
    Hips: { rotation: [0, -3, 0], position: [0.5 * w, -0.4 + 0.3 * b, 0] },
    Spine02: { rotation: [1, -2, 0] },
    Spine01: { rotation: [1 + 0.6 * b, -3, 0] },
    Spine: { rotation: [2 + 2 * b, -4 + 2 * scan, 0] },
    neck: { rotation: [0, 3 * scan, 0] },
    Head: { rotation: [2 + 0.6 * b, 5 * scan, 0] },
    // Weapon hand at the thigh, muzzle down.
    RightArm: { rotation: [70 + 0.8 * b, 0, -12] },
    RightForeArm: { rotation: [-22 - 1.2 * b, 0, 0] },
    // Off hand just hangs.
    LeftArm: { rotation: [60 + 0.6 * b, 0, 6] },
    LeftForeArm: { rotation: [-14 - 0.8 * b, 0, 0] },
    RightUpLeg: { rotation: [-2, 0, 0] },
    LeftUpLeg: { rotation: [2, 0, 0] },
    RightLeg: { rotation: [-4, 0, 0] },
    LeftLeg: { rotation: [-4, 0, 0] },
  };
}
pistolCarry.duration = 3.4;

// Two-handed, punched out at eye line, shoulders squared to the target, with
// the small sway of holding a sight picture.
export function pistolAim(t) {
  const s1 = Math.sin((t * 2 * Math.PI) / pistolAim.duration);
  const s2 = Math.sin((t * 4 * Math.PI) / pistolAim.duration);
  return {
    Hips: { rotation: [0, 0, 0], position: [0, -1, 0] },
    Spine02: { rotation: [2, 0, 0] },
    Spine01: { rotation: [2, 0.5 * s1, 0] },
    Spine: { rotation: [5 + 0.6 * s1, 0.8 * s1, 0] },
    neck: { rotation: [1, 0, 0] },
    Head: { rotation: [2 + 0.4 * s2, 0, 0] },
    // Both arms punched forward, the support hand wrapping a little tighter.
    RightArm: { rotation: [6 + 0.9 * s1, 0, -70] },
    RightForeArm: { rotation: [-14 - 0.5 * s2, 0, 0] },
    LeftArm: { rotation: [8 + 0.9 * s1, 0, 72] },
    LeftForeArm: { rotation: [-20 - 0.5 * s2, 0, 0] },
    RightUpLeg: { rotation: [-5, 0, 0] },
    LeftUpLeg: { rotation: [4, 0, 0] },
    RightLeg: { rotation: [-8, 0, 0] },
    LeftLeg: { rotation: [-6, 0, 0] },
  };
}
pistolAim.duration = 2.4;

// --- unarmed and thrown ----------------------------------------------------

// Straight cross: the hips turn first, the arm goes with them, and the guard
// closes again. Opens and closes on the same boxing guard.
export function punch(t) {
  const p = t / punch.duration;
  const ext = ph(p, 0.06, 0.24) * (1 - ph(p, 0.3, 0.62));
  return {
    Hips: { rotation: [0, 22 * ext, 0], position: [0, -1.2 * ext, 0] },
    Spine02: { rotation: [0, 8 * ext, 0] },
    Spine01: { rotation: [1 * ext, 14 * ext, 0] },
    Spine: { rotation: [3 * ext, 26 * ext, 0] },
    neck: { rotation: [0, -4 * ext, 0] },
    Head: { rotation: [3 + 2 * ext, -6 * ext, 0] },
    // Rear hand fires; the lead hand stays tight to the cheek.
    RightArm: { rotation: [52 - 40 * ext, 0, -26 - 44 * ext] },
    RightForeArm: { rotation: [-96 + 84 * ext, 0, 0] },
    LeftArm: { rotation: [50 + 4 * ext, 0, 30 - 12 * ext] },
    LeftForeArm: { rotation: [-102 - 6 * ext, 0, 0] },
    RightUpLeg: { rotation: [-8 * ext, 0, 0] },
    LeftUpLeg: { rotation: [5 * ext, 0, 0] },
    RightLeg: { rotation: [-6 * ext, 0, 0] },
    LeftLeg: { rotation: [-6 * ext, 0, 0] },
  };
}
punch.duration = 0.5;

// Cock back over the shoulder, uncoil hips-first, follow through across the
// body — and stay in the follow-through rather than snapping back to neutral.
export function throwItem(t) {
  const p = t / throwItem.duration;
  const back = ph(p, 0, 0.34) * (1 - ph(p, 0.34, 0.52));
  const thru = ph(p, 0.36, 0.6);
  const fol = thru * (1 - 0.3 * ph(p, 0.6, 1));
  return {
    Hips: { rotation: [0, -14 * back + 24 * fol, 0], position: [0, 1.2 * back - 2.6 * thru, 0] },
    Spine02: { rotation: [2 * fol, -8 * back + 10 * fol, 0] },
    Spine01: { rotation: [-3 * back + 8 * fol, -14 * back + 18 * fol, 0] },
    Spine: { rotation: [-8 * back + 16 * fol, -26 * back + 34 * fol, 0] },
    neck: { rotation: [0, 6 * back - 6 * fol, 0] },
    Head: { rotation: [-4 * back + 10 * fol, 10 * back - 12 * fol, 0] },
    // Throwing arm: cocked behind the ear, then down across the far hip.
    RightArm: { rotation: [60 - 96 * back + 22 * fol, 0, -14 + 52 * back - 62 * fol] },
    RightForeArm: { rotation: [-46 - 66 * back + 40 * fol, 0, 0] },
    RightHand: { rotation: [0, 0, -10 * back + 12 * fol] },
    // Lead arm points out at the target, then pulls in as the body uncoils.
    LeftArm: { rotation: [56 - 20 * back + 16 * fol, 0, 10 + 30 * back - 40 * fol] },
    LeftForeArm: { rotation: [-30 - 10 * back + 6 * fol, 0, 0] },
    RightUpLeg: { rotation: [8 * back - 10 * fol, 0, 0] },
    LeftUpLeg: { rotation: [-6 * back + 14 * fol, 0, 0] },
    RightLeg: { rotation: [-6 * fol, 0, 0] },
    LeftLeg: { rotation: [-8 * fol, 0, 0] },
  };
}
throwItem.duration = 0.9;

// Taking a hit: the head snaps first, the chest folds around it, one leg gives
// a step of recoil, and the body gathers itself back up.
export function stagger(t) {
  const p = t / stagger.duration;
  const snap = ph(p, 0, 0.07) * (1 - ph(p, 0.09, 0.3)); // the head, sharpest
  const hit = ph(p, 0, 0.1) * (1 - ph(p, 0.12, 0.85)); // the body, recovering
  const wob = Math.sin(p * Math.PI * 3) * Math.max(0, 1 - p * 1.3) * 0.35;
  return {
    Hips: { rotation: [0, -8 * hit, 0], position: [0, -3 * hit, 2.5 * hit] },
    Spine02: { rotation: [6 * hit, -3 * hit, 0] },
    Spine01: { rotation: [12 * hit + 3 * wob, -6 * hit, 0] },
    Spine: { rotation: [26 * hit + 8 * wob, -10 * hit, 0] },
    neck: { rotation: [-8 * snap + 6 * hit, 4 * hit, 0] },
    Head: { rotation: [-24 * snap + 14 * hit, 12 * hit, 6 * hit] },
    RightArm: { rotation: [DOWN - 16 * hit, 0, -8 + 18 * hit] },
    RightForeArm: { rotation: [-30 - 24 * hit, 0, 0] },
    LeftArm: { rotation: [DOWN - 12 * hit, 0, 8 + 14 * hit] },
    LeftForeArm: { rotation: [-26 - 20 * hit, 0, 0] },
    // The recoil step: the right leg goes back under the body.
    RightUpLeg: { rotation: [-24 * hit, 0, 0] },
    LeftUpLeg: { rotation: [10 * hit, 0, 0] },
    RightLeg: { rotation: [-18 * hit, 0, 0] },
    LeftLeg: { rotation: [-8 * hit, 0, 0] },
  };
}
stagger.duration = 0.8;

// --- downed ----------------------------------------------------------------

// On the back: pelvis dropped near the floor, the whole body pitched back so
// spine and legs lie low, one arm across the chest, and a weak shallow breath.
export function knockedDown(t) {
  const b = Math.sin((t * 2 * Math.PI) / knockedDown.duration); // weak breath
  const b2 = Math.sin((t * 4 * Math.PI) / knockedDown.duration);
  return {
    // Measured on a loaded rig: the hips rest ~101 rig-local units up, so -76
    // puts the pelvis a couple of hand-widths off the floor. Tune this if the
    // library ever takes on a much shorter body — it is the one number here
    // that scales with rig height.
    Hips: { rotation: [-72, 0, 0], position: [0, -76, 0] },
    Spine02: { rotation: [4 + 0.6 * b, 0, 0] },
    Spine01: { rotation: [6 + 1.2 * b, 0, 0] },
    Spine: { rotation: [8 + 2.2 * b, 0, 0] },
    neck: { rotation: [12, 0, 0] },
    Head: { rotation: [10 + 0.8 * b2, -6, 0] },
    // One arm folded across the chest, riding the breath; the other flung out.
    RightArm: { rotation: [88 + 1 * b, 0, -44] },
    RightForeArm: { rotation: [-78, 0, 0] },
    LeftArm: { rotation: [30 + 0.6 * b, 0, -18] },
    LeftForeArm: { rotation: [-18, 0, 0] },
    // Legs low and splayed, one knee half-folded so it isn't a mannequin.
    RightUpLeg: { rotation: [-4, 0, 12] },
    LeftUpLeg: { rotation: [-8, 0, -12] },
    RightLeg: { rotation: [-6, 0, 0] },
    LeftLeg: { rotation: [-16, 0, 0] },
  };
}
knockedDown.duration = 4.2;

// The knees give, the spine collapses forward over them, and the body settles
// onto the ground. Plays once and freezes on that last frame.
export function die(t) {
  const p = t / die.duration;
  const hit = ph(p, 0, 0.08) * (1 - ph(p, 0.1, 0.35)); // the blow that did it
  const buckle = ph(p, 0.05, 0.42); // knees go
  const fall = ph(p, 0.3, 0.72); // spine follows them down
  const settle = ph(p, 0.6, 1); // the last sink into the ground
  return {
    Hips: {
      rotation: [10 * buckle + 26 * fall, 6 * fall, 0],
      // ~-64 by the last frame: knees on the ground, pelvis down on the heels
      // (hips rest ~101 rig-local units up on a measured adult rig).
      position: [0, -10 * buckle - 40 * fall - 14 * settle, 0],
    },
    Spine02: { rotation: [4 * buckle + 12 * fall, 0, 0] },
    Spine01: { rotation: [6 * buckle + 22 * fall, -3 * fall, 0] },
    Spine: { rotation: [8 * hit + 12 * buckle + 44 * fall + 8 * settle, -5 * fall, 0] },
    neck: { rotation: [-6 * hit + 6 * buckle + 16 * fall, 0, 0] },
    Head: { rotation: [-10 * hit + 8 * buckle + 24 * fall, 4 * fall, 0] },
    RightArm: { rotation: [DOWN - 6 * buckle + 16 * fall, 0, -6 - 22 * fall] },
    RightForeArm: { rotation: [-18 - 30 * fall, 0, 0] },
    LeftArm: { rotation: [DOWN - 4 * buckle + 14 * fall, 0, 6 + 20 * fall] },
    LeftForeArm: { rotation: [-16 - 26 * fall, 0, 0] },
    RightUpLeg: { rotation: [26 * buckle + 34 * fall, 0, 6 * fall] },
    LeftUpLeg: { rotation: [26 * buckle + 34 * fall, 0, -4 * fall] },
    RightLeg: { rotation: [-40 * buckle - 62 * fall, 0, 0] },
    LeftLeg: { rotation: [-40 * buckle - 62 * fall, 0, 0] },
  };
}
die.duration = 1.6;

module.exports = {
  DOWN: DOWN,
  MANIFEST: MANIFEST,
  slash1h: slash1h,
  slash2h: slash2h,
  overhead2h: overhead2h,
  block: block,
  bowDraw: bowDraw,
  bowShot: bowShot,
  rifleCarry: rifleCarry,
  rifleAim: rifleAim,
  pistolCarry: pistolCarry,
  pistolAim: pistolAim,
  punch: punch,
  throwItem: throwItem,
  stagger: stagger,
  knockedDown: knockedDown,
  die: die,
};
