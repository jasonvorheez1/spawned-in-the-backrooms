// Motions — how a body carries itself: jumping, crouching, sneaking, crawling,
// climbing, spinning, going down and getting back up.
//
// Authored clips: named functions of time, values are OFFSETS from the rig's
// BIND pose (a T-POSE — arms straight out sideways), euler DEGREES in the
// bone's own local frame, position in rig-local (cm-scale) units. See
// lib/motion-social.js for the shape, and keep every motion periodic over
// fn.duration so a loop wraps without a snap.
//
// Which way each number pushes — measured off the shared rig's rest matrices,
// the sign chart every pose below is written against:
//   Hips / Spine02 / Spine01 / Spine / neck / Head — X+ pitches FORWARD (X-
//     arches back), Y+ yaws toward the body's left, Z+ tilts toward its right.
//     The spine numbers run TOWARD the hips: Spine02 is the waist, Spine the chest.
//   Arm — X 0 is the T-pose (straight out sideways), X 62 (DOWN) hangs at the
//     side, X -78 reaches straight overhead. Z is MIRRORED: LeftArm Z+ swings
//     forward, RightArm Z- swings forward.
//   ForeArm — X- curls the elbow; Z (mirrored like the arm) carries the curl
//     forward once the upper arm is hanging.
//   Legs share ONE frame, NOT mirrored on X: UpLeg X- lifts the knee forward,
//     UpLeg X+ trails the leg behind, Leg X+ bends the knee, Foot X+ points the
//     toe and X- lifts it. Z+ swings a leg toward the body's right, so splaying
//     the knees is -Z on the left and +Z on the right.
//   Hips position — parent frame, +Y is straight up, rest height ~100 units.
//     Net XZ drift across a clip must stay under ~15 or the engine drops the
//     track: locomotion belongs to physics, never to a clip.
// Two laws the one-shots live by: a "once" clip freezes on its LAST frame, and
// an all-zero frame is the T-pose — so every one-shot here lands on a standing
// body with the arms at DOWN, never on a zeroed-out scarecrow. And a body that
// bends deep has to sink its hips with it, or the feet leave the floor.

// Arms hanging at the sides, the silhouette Idle rests in.
const DOWN = 62;

const MANIFEST = [
  { key: "jump", label: "Jump", group: "locomotion", loop: "once", tags: ["move", "air", "action"] },
  { key: "crouch", label: "Crouch", group: "locomotion", loop: "loop", tags: ["move", "stealth", "low"] },
  { key: "crouchWalk", label: "Sneak", group: "locomotion", loop: "loop", tags: ["move", "stealth", "walk"] },
  { key: "crawl", label: "Crawl", group: "locomotion", loop: "loop", tags: ["move", "stealth", "prone"] },
  { key: "climb", label: "Climb", group: "locomotion", loop: "loop", tags: ["move", "ladder", "vertical"] },
  { key: "spin", label: "Spin", group: "locomotion", loop: "loop", tags: ["move", "turn", "emote"] },
  { key: "roll", label: "Dodge roll", group: "locomotion", loop: "once", tags: ["move", "dodge", "action"] },
  { key: "land", label: "Land", group: "locomotion", loop: "once", tags: ["move", "air", "impact"] },
  { key: "stumble", label: "Stumble", group: "locomotion", loop: "once", tags: ["move", "trip", "comic"] },
  { key: "swim", label: "Swim", group: "locomotion", loop: "loop", tags: ["move", "water", "swim"] },
];

// ── Shaping helpers ─────────────────────────────────────────────────────────
// One-shots are built out of beats rather than sines: a jump is a load, a push,
// a hang and an absorb, and each beat wants its own window of the clip.

// 0 before a, 1 after b, eased in between.
export function ramp(u, a, b) {
  if (u <= a) return 0;
  if (u >= b) return 1;
  const x = (u - a) / (b - a);
  return x * x * (3 - 2 * x);
}

// 0 at both ends of [a, b], 1 through the middle — a beat that comes and goes.
export function swell(u, a, b) {
  if (u <= a || u >= b) return 0;
  const s = Math.sin((Math.PI * (u - a)) / (b - a));
  return s * s;
}

// ── Clips ───────────────────────────────────────────────────────────────────

// Crouch load, push off, tuck at the apex, absorb on landing. Every beat ends
// at zero, so the frozen last frame is a body standing on its feet again.
export function jump(t) {
  const u = t / jump.duration;
  const load = swell(u, 0, 0.28); // sink into the legs
  const push = swell(u, 0.2, 0.42); // knees and ankles snap open
  const air = swell(u, 0.22, 0.8); // the arc itself
  const tuck = swell(u, 0.28, 0.68); // knees up under the body
  const armUp = swell(u, 0.1, 0.82); // arms thrown up and brought down
  const absorb = swell(u, 0.76, 1); // the landing eaten by the knees
  return {
    Hips: { position: [0, -20 * load + 9 * air - 19 * absorb, 0], rotation: [10 * load + 5 * tuck + 14 * absorb, 0, 0] },
    Spine02: { rotation: [7 * load + 9 * absorb, 0, 0] },
    Spine01: { rotation: [6 * load + 3 * tuck + 8 * absorb, 0, 0] },
    Spine: { rotation: [6 * load + 5 * tuck + 8 * absorb - 5 * push, 0, 0] },
    neck: { rotation: [-4 * air, 0, 0] },
    Head: { rotation: [-9 * air + 7 * absorb, 0, 0] },
    LeftArm: { rotation: [DOWN + 9 * load - 104 * armUp, 0, -20 * load + 16 * armUp + 26 * absorb] },
    RightArm: { rotation: [DOWN + 9 * load - 104 * armUp, 0, 20 * load - 16 * armUp - 26 * absorb] },
    LeftForeArm: { rotation: [-10 - 26 * load - 30 * absorb, 0, 12 * load] },
    RightForeArm: { rotation: [-10 - 26 * load - 30 * absorb, 0, -12 * load] },
    LeftUpLeg: { rotation: [-24 * load - 58 * tuck - 28 * absorb, 0, -5 * load - 7 * tuck] },
    RightUpLeg: { rotation: [-24 * load - 58 * tuck - 28 * absorb, 0, 5 * load + 7 * tuck] },
    LeftLeg: { rotation: [58 * load + 92 * tuck + 64 * absorb - 16 * push, 0, 0] },
    RightLeg: { rotation: [58 * load + 92 * tuck + 64 * absorb - 16 * push, 0, 0] },
    LeftFoot: { rotation: [-18 * load + 26 * tuck + 18 * push - 16 * absorb, 0, 0] },
    RightFoot: { rotation: [-18 * load + 26 * tuck + 18 * push - 16 * absorb, 0, 0] },
  };
}
jump.duration = 1.1;

// Held low: hips down, knees out, spine forward, forearms over the thighs, and
// one slow breath per cycle so it reads as a body waiting, not a statue.
export function crouch(t) {
  const b = Math.sin((t * 2 * Math.PI) / crouch.duration);
  return {
    Hips: { position: [0, -14 + 0.9 * b, 0], rotation: [11, 0, 0] },
    Spine02: { rotation: [6 - 0.6 * b, 0, 0] },
    Spine01: { rotation: [6 - 1 * b, 0, 0] },
    Spine: { rotation: [6 - 2.4 * b, 0, 0] },
    neck: { rotation: [-7, 0, 0] },
    Head: { rotation: [-11 - 1.2 * b, 0, 0] },
    LeftArm: { rotation: [DOWN - 12, 0, 24] },
    RightArm: { rotation: [DOWN - 12, 0, -24] },
    LeftForeArm: { rotation: [-34, 0, 30] },
    RightForeArm: { rotation: [-34, 0, -30] },
    LeftUpLeg: { rotation: [-44, 0, -9] },
    RightUpLeg: { rotation: [-44, 0, 9] },
    LeftLeg: { rotation: [64 + 0.8 * b, 0, 0] },
    RightLeg: { rotation: [64 + 0.8 * b, 0, 0] },
    LeftFoot: { rotation: [-21, 0, 0] },
    RightFoot: { rotation: [-21, 0, 0] },
  };
}
crouch.duration = 3.6;

// The crouch, carried: a slow deliberate stride, the weight rolling from one
// leg to the other, the arms tucked in against the ribs. The knee swing runs a
// fifth of a cycle behind the hip so the feet settle instead of scissoring.
export function crouchWalk(t) {
  const a = (t * 2 * Math.PI) / crouchWalk.duration; // one full stride (both feet)
  const step = Math.sin(a);
  const roll = Math.sin(a - 0.5);
  const bob = Math.cos(2 * a);
  return {
    Hips: { position: [2.6 * roll, -20 + 1.4 * bob, 0], rotation: [12, -9 * step, 0] },
    Spine02: { rotation: [6, 4 * step, 2 * roll] },
    Spine01: { rotation: [5, 6 * step, 4 * roll] },
    Spine: { rotation: [5, 9 * step, 6 * roll] },
    neck: { rotation: [-6, -4 * step, 0] },
    Head: { rotation: [-12, -6 * step, -2 * roll] },
    LeftArm: { rotation: [DOWN - 14, 0, 20 - 9 * step] },
    RightArm: { rotation: [DOWN - 14, 0, -20 - 9 * step] },
    LeftForeArm: { rotation: [-52, 0, 26] },
    RightForeArm: { rotation: [-52, 0, -26] },
    LeftUpLeg: { rotation: [-42 - 22 * step, 0, -8] },
    RightUpLeg: { rotation: [-42 + 22 * step, 0, 8] },
    LeftLeg: { rotation: [58 + 22 * (0.5 + 0.5 * Math.sin(a + 2.2)), 0, 0] },
    RightLeg: { rotation: [58 + 22 * (0.5 + 0.5 * Math.sin(a + 2.2 + Math.PI)), 0, 0] },
    LeftFoot: { rotation: [-16 + 16 * Math.sin(a + 1), 0, 0] },
    RightFoot: { rotation: [-16 + 16 * Math.sin(a + 1 + Math.PI), 0, 0] },
  };
}
crouchWalk.duration = 1.6;

// Belly low, chest just off the ground, opposite arm and leg reaching. The
// pelvis pitch is what lays the body down — the legs ride it and trail behind,
// so their own angles only have to fold the knee that's drawing up.
export function crawl(t) {
  const a = (t * 2 * Math.PI) / crawl.duration;
  const swing = Math.sin(a);
  const leftReach = 0.5 - 0.5 * swing; // left arm forward with the right knee
  const rightReach = 0.5 + 0.5 * swing;
  return {
    Hips: { position: [0, -72, 0], rotation: [68, 0, 3 * swing] },
    Spine02: { rotation: [4, 4 * swing, 0] },
    Spine01: { rotation: [-2, 6 * swing, 2 * swing] },
    Spine: { rotation: [-12, 9 * swing, 3 * swing] },
    neck: { rotation: [-22, -4 * swing, 0] },
    Head: { rotation: [-26, -7 * swing, 0] },
    LeftArm: { rotation: [12 - 16 * leftReach, 0, 18 + 26 * leftReach] },
    RightArm: { rotation: [12 - 16 * rightReach, 0, -18 - 26 * rightReach] },
    LeftForeArm: { rotation: [-46 + 34 * leftReach, 0, 16] },
    RightForeArm: { rotation: [-46 + 34 * rightReach, 0, -16] },
    LeftUpLeg: { rotation: [-18 + 8 * swing, 0, -16 - 14 * rightReach] },
    RightUpLeg: { rotation: [-18 - 8 * swing, 0, 16 + 14 * leftReach] },
    LeftLeg: { rotation: [16 + 24 * rightReach, 0, 0] },
    RightLeg: { rotation: [16 + 24 * leftReach, 0, 0] },
    LeftFoot: { rotation: [14, 0, 0] },
    RightFoot: { rotation: [14, 0, 0] },
  };
}
crawl.duration = 2.4;

// A ladder: hand over hand overhead, the opposite knee coming up under each
// reach, chest held close to the rungs. The pulling arm drops beside the body
// and folds — that drop is what makes the reach above it read as a reach.
export function climb(t) {
  const a = (t * 2 * Math.PI) / climb.duration;
  const s = Math.sin(a);
  const leftHigh = 0.5 + 0.5 * s; // left hand reaching
  const rightHigh = 0.5 - 0.5 * s;
  return {
    Hips: { position: [0, -2 + 2.6 * Math.sin(2 * a), 0], rotation: [-4, -6 * s, 4 * s] },
    Spine02: { rotation: [-3, 4 * s, 0] },
    Spine01: { rotation: [-4, 6 * s, -3 * s] },
    Spine: { rotation: [-6, 8 * s, -5 * s] },
    neck: { rotation: [-10, 0, 0] },
    Head: { rotation: [-16, 5 * s, 0] },
    LeftArm: { rotation: [40 - 114 * leftHigh, 0, 16] },
    RightArm: { rotation: [40 - 114 * rightHigh, 0, -16] },
    LeftForeArm: { rotation: [-70 + 62 * leftHigh, 0, 10] },
    RightForeArm: { rotation: [-70 + 62 * rightHigh, 0, -10] },
    LeftUpLeg: { rotation: [-12 - 44 * rightHigh, 0, -10 - 6 * rightHigh] },
    RightUpLeg: { rotation: [-12 - 44 * leftHigh, 0, 10 + 6 * leftHigh] },
    LeftLeg: { rotation: [28 + 56 * rightHigh, 0, 0] },
    RightLeg: { rotation: [28 + 56 * leftHigh, 0, 0] },
    LeftFoot: { rotation: [8 + 10 * rightHigh, 0, 0] },
    RightFoot: { rotation: [8 + 10 * leftHigh, 0, 0] },
  };
}
climb.duration = 2;

// A turn on the spot. The clip cannot yaw the body — that belongs to the
// entity — so the turn is sold from the inside: the head leads, the chest
// follows a beat later, the arms carry the sweep around and the feet step
// through it. Arm Z is mirrored, so the SAME sign on both arms puts one arm
// forward while the other goes back: the rotational read.
export function spin(t) {
  const a = (t * 2 * Math.PI) / spin.duration;
  const sweep = Math.sin(a);
  const chest = Math.sin(a - 0.5);
  const head = Math.sin(a - 0.9);
  return {
    Hips: { position: [0, 1.6 * Math.abs(sweep), 0], rotation: [2, 22 * sweep, 5 * chest] },
    Spine02: { rotation: [1, 12 * Math.sin(a - 0.25), 3 * chest] },
    Spine01: { rotation: [0, 16 * Math.sin(a - 0.38), 5 * chest] },
    Spine: { rotation: [-2, 22 * chest, 7 * chest] },
    neck: { rotation: [0, 14 * head, 0] },
    Head: { rotation: [-4, 26 * head, 4 * head] },
    LeftArm: { rotation: [10 - 14 * Math.abs(sweep), 0, 34 * sweep] },
    RightArm: { rotation: [10 - 14 * Math.abs(sweep), 0, 34 * sweep] },
    LeftForeArm: { rotation: [-16 - 10 * sweep, 0, 8] },
    RightForeArm: { rotation: [-16 + 10 * sweep, 0, -8] },
    LeftUpLeg: { rotation: [-10 + 14 * sweep, 0, -6] },
    RightUpLeg: { rotation: [-10 - 14 * sweep, 0, 6] },
    LeftLeg: { rotation: [14 + 12 * Math.max(0, -sweep), 0, 0] },
    RightLeg: { rotation: [14 + 12 * Math.max(0, sweep), 0, 0] },
    LeftFoot: { rotation: [6 * sweep, 0, 0] },
    RightFoot: { rotation: [-6 * sweep, 0, 0] },
  };
}
spin.duration = 1.4;

// Duck, tuck, over, rise. The body goes small and low, the pelvis pitches all
// the way over until the head passes the knees, then it comes back up onto its
// feet. Every beat closes, so the freeze is a body standing, ready to move.
export function roll(t) {
  const u = t / roll.duration;
  const duck = ramp(u, 0, 0.16) * (1 - ramp(u, 0.62, 0.98));
  const over = swell(u, 0.08, 0.62); // the ball of the roll
  const tuck = swell(u, 0.12, 0.7);
  const up = swell(u, 0.6, 1); // feet come under, body climbs out
  return {
    Hips: { position: [0, -18 * duck - 46 * over - 14 * up, -9 * over], rotation: [26 * duck + 62 * over + 10 * up, 0, 0] },
    Spine02: { rotation: [14 * duck + 16 * tuck + 4 * up, 0, 0] },
    Spine01: { rotation: [12 * duck + 16 * tuck + 4 * up, 0, 0] },
    Spine: { rotation: [12 * duck + 18 * tuck + 4 * up, 0, 0] },
    neck: { rotation: [10 * duck + 14 * tuck - 6 * up, 0, 0] },
    Head: { rotation: [12 * duck + 20 * tuck - 10 * up, 0, 0] },
    LeftArm: { rotation: [DOWN - 18 * duck - 14 * tuck - 10 * up, 0, 26 * duck + 34 * tuck + 20 * up] },
    RightArm: { rotation: [DOWN - 18 * duck - 14 * tuck - 10 * up, 0, -26 * duck - 34 * tuck - 20 * up] },
    LeftForeArm: { rotation: [-30 * duck - 62 * tuck - 18 * up, 0, 20 * duck + 24 * tuck + 14 * up] },
    RightForeArm: { rotation: [-30 * duck - 62 * tuck - 18 * up, 0, -20 * duck - 24 * tuck - 14 * up] },
    LeftUpLeg: { rotation: [-32 * duck - 64 * tuck - 30 * up, 0, -8 * tuck] },
    RightUpLeg: { rotation: [-32 * duck - 54 * tuck - 30 * up, 0, 8 * tuck] },
    LeftLeg: { rotation: [64 * duck + 54 * tuck + 62 * up, 0, 0] },
    RightLeg: { rotation: [64 * duck + 46 * tuck + 62 * up, 0, 0] },
    LeftFoot: { rotation: [-14 * duck + 34 * tuck - 18 * up, 0, 0] },
    RightFoot: { rotation: [-14 * duck + 30 * tuck - 18 * up, 0, 0] },
  };
}
roll.duration = 0.9;

// A hard drop eaten by one knee: impact, the right shin folds down and back
// along the ground, the left hand goes out over the front foot, then the body
// stands back up. Freezes standing.
export function land(t) {
  const u = t / land.duration;
  const hit = swell(u, 0, 0.3); // the impact itself
  const kneel = ramp(u, 0.03, 0.2) * (1 - ramp(u, 0.42, 0.94)); // knee down, then up
  return {
    Hips: { position: [0, -16 * hit - 32 * kneel, 0], rotation: [16 * hit + 16 * kneel, 8 * kneel, 0] },
    Spine02: { rotation: [12 * hit + 6 * kneel, 0, 0] },
    Spine01: { rotation: [11 * hit + 5 * kneel, -5 * kneel, 0] },
    Spine: { rotation: [12 * hit + 6 * kneel, -7 * kneel, 4 * kneel] },
    neck: { rotation: [8 * hit - 6 * kneel, 0, 0] },
    Head: { rotation: [14 * hit - 10 * kneel, 6 * kneel, 0] },
    LeftArm: { rotation: [DOWN - 6 * hit + 13 * kneel, 0, 30 * hit + 44 * kneel] },
    RightArm: { rotation: [DOWN - 20 * hit - 6 * kneel, 0, -34 * hit - 24 * kneel] },
    LeftForeArm: { rotation: [-22 * hit - 26 * kneel, 0, 22 * hit + 30 * kneel] },
    RightForeArm: { rotation: [-26 * hit - 30 * kneel, 0, -24 * hit - 10 * kneel] },
    LeftUpLeg: { rotation: [-36 * hit - 34 * kneel, 0, -10 * hit - 8 * kneel] },
    RightUpLeg: { rotation: [-40 * hit + 52 * kneel, 0, 12 * hit + 10 * kneel] },
    LeftLeg: { rotation: [58 * hit + 22 * kneel, 0, 0] },
    RightLeg: { rotation: [62 * hit - 22 * kneel, 0, 0] },
    LeftFoot: { rotation: [-22 * hit - 6 * kneel, 0, 0] },
    RightFoot: { rotation: [-16 * hit + 46 * kneel, 0, 0] },
  };
}
land.duration = 0.7;

// A trip: the front foot catches, the torso pitches out over it, the arms
// windmill for balance and a long step comes through to catch the fall. It
// freezes caught — upright, one leg still out where it saved him.
export function stumble(t) {
  const u = t / stumble.duration;
  const trip = ramp(u, 0.02, 0.14) * (1 - ramp(u, 0.55, 0.95)); // the pitch forward
  const mill = swell(u, 0.06, 0.72); // how much windmill is left
  const catchStep = ramp(u, 0.3, 0.62); // the leg that saves it
  const settle = ramp(u, 0.68, 1);
  const w = u * 2 * Math.PI * 1.6; // the windmill itself
  return {
    Hips: { position: [0, -6 * trip - 14 * catchStep * (1 - settle), 0], rotation: [24 * trip + 6 * mill, 5 * mill * Math.sin(w), 0] },
    Spine02: { rotation: [14 * trip, -4 * mill * Math.sin(w), 3 * mill * Math.cos(w)] },
    Spine01: { rotation: [13 * trip, -5 * mill * Math.sin(w), 4 * mill * Math.cos(w)] },
    Spine: { rotation: [12 * trip - 6 * settle, -7 * mill * Math.sin(w), 6 * mill * Math.cos(w)] },
    neck: { rotation: [6 * trip, 0, -3 * mill * Math.cos(w)] },
    Head: { rotation: [10 * trip - 8 * settle, 8 * mill * Math.sin(w), -5 * mill * Math.cos(w)] },
    LeftArm: { rotation: [DOWN - 44 * mill - 46 * mill * Math.cos(w), 0, 30 * mill + 34 * mill * Math.sin(w)] },
    RightArm: { rotation: [DOWN - 44 * mill + 46 * mill * Math.cos(w), 0, -30 * mill + 34 * mill * Math.sin(w)] },
    LeftForeArm: { rotation: [-18 - 22 * mill, 0, 16 * mill] },
    RightForeArm: { rotation: [-18 - 22 * mill, 0, -16 * mill] },
    LeftUpLeg: { rotation: [-14 * trip - 62 * catchStep + 46 * settle, 0, -6 * catchStep] },
    RightUpLeg: { rotation: [18 * trip - 16 * catchStep, 0, 6 * catchStep] },
    LeftLeg: { rotation: [18 * trip + 46 * catchStep - 34 * settle, 0, 0] },
    RightLeg: { rotation: [6 * trip + 20 * catchStep, 0, 0] },
    LeftFoot: { rotation: [-16 * trip - 22 * catchStep + 16 * settle, 0, 0] },
    RightFoot: { rotation: [-18 * trip + 14 * catchStep, 0, 0] },
  };
}
stumble.duration = 1.2;

// Front crawl: the body lies out flat on the water, one arm reaching over while
// the other pulls through underneath, the head rolling with the stroke to
// breathe, the legs fluttering off the hips at twice the stroke rate.
export function swim(t) {
  const a = (t * 2 * Math.PI) / swim.duration;
  const stroke = Math.cos(a); // +1 = left arm out front, -1 = left arm pulled through
  const roll = Math.sin(a);
  const flutter = Math.sin(a * 2);
  return {
    Hips: { position: [0, -44, 0], rotation: [76, 0, 6 * roll] },
    Spine02: { rotation: [-3, 3 * roll, 4 * roll] },
    Spine01: { rotation: [-4, 5 * roll, 6 * roll] },
    Spine: { rotation: [-6, 8 * roll, 9 * roll] },
    neck: { rotation: [-14, 8 * roll, 0] },
    Head: { rotation: [-18, 24 * roll, 5 * roll] },
    LeftArm: { rotation: [-4 - 62 * stroke, 0, 22 + 20 * roll] },
    RightArm: { rotation: [-4 + 62 * stroke, 0, -22 + 20 * roll] },
    LeftForeArm: { rotation: [-16 - 26 * Math.max(0, -stroke), 0, 14] },
    RightForeArm: { rotation: [-16 - 26 * Math.max(0, stroke), 0, -14] },
    LeftUpLeg: { rotation: [14 * flutter, 0, -5] },
    RightUpLeg: { rotation: [-14 * flutter, 0, 5] },
    LeftLeg: { rotation: [14 + 12 * Math.max(0, -flutter), 0, 0] },
    RightLeg: { rotation: [14 + 12 * Math.max(0, flutter), 0, 0] },
    LeftFoot: { rotation: [26 + 8 * flutter, 0, 0] },
    RightFoot: { rotation: [26 - 8 * flutter, 0, 0] },
  };
}
swim.duration = 2;

module.exports = {
  DOWN: DOWN,
  MANIFEST: MANIFEST,
  jump: jump,
  crouch: crouch,
  crouchWalk: crouchWalk,
  crawl: crawl,
  climb: climb,
  spin: spin,
  roll: roll,
  land: land,
  stumble: stumble,
  swim: swim,
};
