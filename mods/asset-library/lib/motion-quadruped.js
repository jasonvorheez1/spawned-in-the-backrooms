// Motions — four-legged creatures. Same form as the humanoid modules: named
// functions of time, sampled once into keyframes, values are OFFSETS from the
// model's bind pose.
//
// THE BONE CENSUS (run before a line of this was authored, 2026-08-27):
// every four-legged body in this library — Grey Wolf, Shepherd Dog, Draft
// Horse, Barn Cat, Forest Deer, Brown Bear, Wild Boar, Dairy Cow, Woolly
// Sheep, Mud Pig, Mountain Goat, Meadow Rabbit, Basilisk, Dragon Wyrmling,
// Giant Cave Spider — serves as a SINGLE SKINLESS MESH. No skin, no joints,
// no bones to write a track against. They are critter.js's job (whole-object
// transform), not this file's.
//
// What this library does have a skeleton for is the 24-joint rig every
// conjured character shares, and a good half of the bestiary wears it: the
// Gnoll Raider, Cave Troll, Minotaur Guard, Ogre Bruiser, Plague Rat Brute,
// Pit Fiend Brute, Kobold Trapper, Deep One Raider, Bog Hag. So these clips
// are authored for THAT rig, dropped onto all fours — the arms become the
// forelegs, the legs the hindquarters, the spine chain the back. Every bone
// named below appears in that rig's joint list; nothing is invented. There is
// no tail joint on it, so nothing here animates a tail.
//
// The stance numbers were solved against the real Gnoll skeleton by forward
// kinematics (hips ~106 rig units at rest): the constants below put the front
// paws and hind toes on the ground with the back sloping down to the rear —
// the hyena line, which is what a two-legged rig on four legs honestly is.

// Kept for symmetry with the humanoid modules; four-legged rigs rest in their
// natural stance, so there is no T-pose to undo.
const DOWN = 0;

// The all-fours stance, in each bone's own local frame, euler degrees.
const HIP = 46; // hips dropped this far (rig-local units) so the paws reach
const BACK = 38; // per spine segment — three of them take the back over
const NECK = -40; // neck back up out of the ground
const HEADUP = -30; // muzzle level, looking where it's going
const FEM = -25; // femur forward
const KNEE = 90; // hock folded — the zigzag hind leg
const ANKLE = -20; // heel raised, standing on the pad
const FORE = 88; // arm swung down into a foreleg column
const ELBOW = -15; // a little bend, never a locked stick

// The shelf reads this: one row per motion, in the order they should appear.
// loop "loop" = a state the body stays in; "once" = a one-shot that freezes on
// its last frame (a held pose).
const MANIFEST = [
  { key: "qIdle", label: "Idle", group: "quadruped", loop: "loop", tags: ["beast", "rest"] },
  { key: "qWalk", label: "Walk", group: "quadruped", loop: "loop", tags: ["beast", "move"] },
  { key: "qTrot", label: "Trot", group: "quadruped", loop: "loop", tags: ["beast", "move"] },
  { key: "qGraze", label: "Graze", group: "quadruped", loop: "loop", tags: ["beast", "feed"] },
  { key: "qSit", label: "Sit", group: "quadruped", loop: "loop", tags: ["beast", "rest"] },
  { key: "qLie", label: "Lie down", group: "quadruped", loop: "loop", tags: ["beast", "rest"] },
  { key: "qAlert", label: "Alert", group: "quadruped", loop: "loop", tags: ["beast", "watch"] },
  { key: "qPounce", label: "Pounce", group: "quadruped", loop: "once", tags: ["beast", "attack"] },
];

// One stance, every clip. Options are DEVIATIONS from the four-legged rest
// pose, measured on the rig itself:
//   hip    how far the hips sit below their bind height (bigger = lower)
//   bob    vertical hips wobble on top of that
//   back   extra spine pitch (+ nose-down, - chest-up)
//   breath ribcage rise, split across the chest segments
//   sway   side-to-side lean down the back    twist  spine rotation
//   neck/head/headYaw/headTilt   the head on the end of it
//   flL/flR  foreleg lift        frL/frR  foreleg reach (- is forward)
//   hlL/hlR  hind knee lift      hrL/hrR  hind reach (- is forward)
// Arm Y and Z mirror across the body; every X axis reads the same on both
// sides. That is the rig's own convention, not a guess — it is what a +20 on
// each axis actually did to the paw when measured.
export function stance(o) {
  const hip = o.hip === undefined ? HIP : o.hip;
  const back = o.back || 0;
  const breath = o.breath || 0;
  const sway = o.sway || 0;
  const twist = o.twist || 0;
  const splay = o.splay || 0;
  const scap = o.scap || 0;
  const flL = o.flL || 0;
  const flR = o.flR || 0;
  const frL = o.frL || 0;
  const frR = o.frR || 0;
  const hlL = o.hlL || 0;
  const hlR = o.hlR || 0;
  const hrL = o.hrL || 0;
  const hrR = o.hrR || 0;
  return {
    Hips: { position: [0, -hip + (o.bob || 0), 0], rotation: [o.hipPitch || 0, 0, o.hipRoll || 0] },
    Spine02: { rotation: [BACK + back + breath * 0.4, twist, sway] },
    Spine01: { rotation: [BACK + back + breath, twist * 0.7, sway * 0.8] },
    Spine: { rotation: [BACK + back + breath * 0.6, twist * 0.4, sway * 0.6] },
    neck: { rotation: [NECK + (o.neck || 0), (o.headYaw || 0) * 0.4, sway * 0.4] },
    Head: { rotation: [HEADUP + (o.head || 0), o.headYaw || 0, o.headTilt || 0] },
    LeftShoulder: { rotation: [0, 0, scap] },
    RightShoulder: { rotation: [0, 0, -scap] },
    LeftArm: { rotation: [o.armX || 0, flL, FORE + splay] },
    RightArm: { rotation: [o.armX || 0, -flR, -(FORE + splay)] },
    LeftForeArm: { rotation: [ELBOW + frL, 0, 0] },
    RightForeArm: { rotation: [ELBOW + frR, 0, 0] },
    LeftUpLeg: { rotation: [FEM + hrL, 0, 0] },
    RightUpLeg: { rotation: [FEM + hrR, 0, 0] },
    LeftLeg: { rotation: [KNEE + hlL, 0, 0] },
    RightLeg: { rotation: [KNEE + hlR, 0, 0] },
    LeftFoot: { rotation: [ANKLE - hlL * 0.35, 0, 0] },
    RightFoot: { rotation: [ANKLE - hlR * 0.35, 0, 0] },
  };
}

// One limb's cycle: planted and travelling backward through the first half,
// lifted and swinging forward through the second. Phase in cycles, so a
// diagonal pair is just +0.5.
export function step(p) {
  const a = p * 2 * Math.PI;
  return { reach: Math.cos(a), lift: Math.max(0, -Math.sin(a)) };
}

// Smoothed 0->1 ramp between two moments of a one-shot.
export function seg(u, a, b) {
  if (u <= a) return 0;
  if (u >= b) return 1;
  const x = (u - a) / (b - a);
  return x * x * (3 - 2 * x);
}

export function qIdle(t) {
  const a = (t * 2 * Math.PI) / qIdle.duration;
  const br = Math.sin(a * 2); // two slow breaths a cycle
  const dip = Math.pow(Math.max(0, Math.sin(a)), 8); // one brief head dip
  return stance({
    bob: 1.2 * br,
    breath: 2.4 * br,
    sway: 1.4 * Math.sin(a),
    scap: 1.4 * br,
    neck: 5 * dip,
    head: 7 * dip + 1.5 * br,
    headYaw: 3.5 * Math.sin(a),
    headTilt: 2 * Math.sin(a),
  });
}
qIdle.duration = 3;

export function qWalk(t) {
  const c = t / qWalk.duration;
  const a = c * 2 * Math.PI;
  const lf = step(c);
  const rh = step(c + 0.25);
  const rf = step(c + 0.5);
  const lh = step(c + 0.75); // four beats, diagonals half a cycle apart
  return stance({
    bob: 1.8 * Math.sin(a * 2),
    breath: 1.2 * Math.sin(a),
    sway: 3 * Math.sin(a),
    twist: 4 * Math.sin(a),
    scap: 3.5 * Math.sin(a),
    neck: 3 * Math.sin(a * 2),
    head: 5 * Math.sin(a * 2) + 1.5,
    headYaw: 2 * Math.sin(a),
    flL: 15 * lf.lift,
    frL: -12 * lf.reach,
    flR: 15 * rf.lift,
    frR: -12 * rf.reach,
    hlL: 20 * lh.lift,
    hrL: -13 * lh.reach,
    hlR: 20 * rh.lift,
    hrR: -13 * rh.reach,
  });
}
qWalk.duration = 1.4;

export function qTrot(t) {
  const c = t / qTrot.duration;
  const a = c * 2 * Math.PI;
  const dA = step(c); // left fore + right hind
  const dB = step(c + 0.5); // right fore + left hind
  return stance({
    hip: HIP - 2,
    bob: 2.6 * Math.sin(a * 2),
    sway: 1.6 * Math.sin(a),
    twist: 2 * Math.sin(a),
    scap: 4 * Math.sin(a),
    neck: 1.5 * Math.sin(a * 2),
    head: 2 * Math.sin(a * 2) - 2, // head carried steadier than the walk
    flL: 24 * dA.lift,
    frL: -16 * dA.reach,
    flR: 24 * dB.lift,
    frR: -16 * dB.reach,
    hlL: 32 * dB.lift,
    hrL: -17 * dB.reach,
    hlR: 32 * dA.lift,
    hrR: -17 * dA.reach,
  });
}
qTrot.duration = 0.8;

export function qGraze(t) {
  const a = (t * 2 * Math.PI) / qGraze.duration;
  const crop = Math.sin(a * 3); // small side-to-side cropping
  const br = Math.sin(a);
  return stance({
    hip: HIP + 4,
    back: 7,
    bob: 0.8 * br,
    breath: 1.6 * br,
    neck: 52 + 3 * crop,
    head: 26 + 4 * Math.sin(a * 6),
    headYaw: 7 * crop,
    headTilt: 4 * crop,
    sway: 1.2 * crop,
    frL: 4,
    frR: 4,
  });
}
qGraze.duration = 4;

export function qSit(t) {
  const a = (t * 2 * Math.PI) / qSit.duration;
  const br = Math.sin(a * 2);
  const look = Math.sin(a); // the head turns slowly, then back
  return stance({
    hip: 74, // hindquarters down
    back: -30, // chest up off the ground
    bob: 0.7 * br,
    breath: 2.6 * br,
    hrL: -34,
    hrR: -34, // femurs folded forward under the body
    hlL: 34,
    hlR: 34, // hocks fully folded
    frL: 14,
    frR: 14, // front legs straight and planted
    splay: -5,
    neck: -6 + 2 * br,
    head: -4,
    headYaw: 13 * look,
    headTilt: 5 * look,
    twist: 3 * look,
  });
}
qSit.duration = 3.5;

export function qLie(t) {
  const a = (t * 2 * Math.PI) / qLie.duration;
  const br = Math.sin(a); // one deep slow breath a cycle
  return stance({
    hip: 90, // belly on the ground
    back: -30,
    bob: 1.1 * br,
    breath: 3.4 * br,
    hrL: -40,
    hrR: -40,
    hlL: 40,
    hlR: 40, // all four folded under
    frL: 26,
    frR: 26, // forelegs tucked forward
    splay: -12,
    neck: 20 + 2 * br,
    head: 12,
    headYaw: 4 * Math.sin(a),
    headTilt: 3 * Math.sin(a),
    sway: 1.2 * Math.sin(a),
  });
}
qLie.duration = 4.5;

export function qAlert(t) {
  const a = (t * 2 * Math.PI) / qAlert.duration;
  const br = Math.sin(a * 2);
  // No tail joint on this rig, so the twitch lives where it can be seen: a
  // flick through the hindquarters and shoulder, not an invented bone.
  const twitch = Math.pow(Math.max(0, Math.sin(a)), 12);
  return stance({
    hip: HIP - 6, // legs straighter, body tall
    back: -6,
    bob: 0.4 * br,
    breath: 1.1 * br,
    neck: -22, // neck up
    head: -14, // muzzle level, fixed forward
    hipRoll: 2.5 * twitch,
    scap: 2 * twitch,
    hlL: -7,
    hlR: -7,
    hrL: 3,
    hrR: 3,
  });
}
qAlert.duration = 3;

export function qPounce(t) {
  const u = t / qPounce.duration;
  const coil = seg(u, 0, 0.26) - seg(u, 0.3, 0.5); // gather, then release
  const spring = seg(u, 0.3, 0.55) - seg(u, 0.7, 0.94); // through the spine
  const land = seg(u, 0.72, 1);
  return stance({
    hip: HIP + 15 * coil - 20 * spring + 5 * land,
    back: 13 * coil - 27 * spring + 9 * land,
    neck: 7 * coil - 15 * spring + 4 * land,
    head: 5 * coil - 12 * spring + 7 * land,
    scap: 0,
    flL: 8 * coil + 25 * spring,
    flR: 8 * coil + 25 * spring,
    frL: 9 * coil - 32 * spring + 5 * land,
    frR: 9 * coil - 32 * spring + 5 * land,
    hlL: 25 * coil - 32 * spring + 12 * land,
    hlR: 25 * coil - 32 * spring + 12 * land,
    hrL: -10 * coil + 27 * spring - 3 * land,
    hrR: -10 * coil + 27 * spring - 3 * land,
  });
}
qPounce.duration = 0.9;

module.exports = {
  DOWN: DOWN,
  MANIFEST: MANIFEST,
  qIdle: qIdle,
  qWalk: qWalk,
  qTrot: qTrot,
  qGraze: qGraze,
  qSit: qSit,
  qLie: qLie,
  qAlert: qAlert,
  qPounce: qPounce,
};
