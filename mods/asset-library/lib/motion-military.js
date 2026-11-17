// Motions — the war group: fighting from a crouch, from the dirt and from
// behind a wall; hauling a man out; cutting a trench; and lying still when it
// is over.
//
// Authored clips: named functions of time, values are OFFSETS from the rig's
// BIND pose (a T-POSE — arms straight out sideways), euler DEGREES in the
// bone's own local frame. See lib/motion-social.js for the shape.
//
// The one that matters most here is deadPose. A body standing in a scene with
// no clip on it falls back to Walk and marches on the spot; a fallen man needs
// a pose that HOLDS. deadPose ignores t entirely — every sample is the same
// offsets, so it bakes into constant keyframes and simply stays there.
//
// Axis grammar (measured off the shared 24-joint rig, same as motion-combat and
// motion-rest — worth reading before touching a number):
//   Arm X      0 = straight out sideways, +62 (DOWN) = the natural hang,
//              +90 = straight down, negative = raised above horizontal.
//   Arm Z      swings the arm through the horizontal plane: LEFT +Z forward,
//              RIGHT −Z forward. Keep |Z| under ~85.
//   ForeArm    the firearm poses fold the elbow on X (negative = hand toward
//              the shoulder), matching motion-combat's rifleAim; the
//              hands-forward work poses fold on Z (LEFT +, RIGHT −) the way
//              motion-rest's dig does.
//   Spine/Head +X folds forward / chin down, −X arches back / chin up,
//              +Y turns toward the body's LEFT.
//   UpLeg      −X swings the thigh forward; +Z always moves a foot toward the
//              body's RIGHT, so an outward splay is LEFT − / RIGHT +.
//   Leg        +X bends the knee. Hips position is rig-local (cm-scale) units.

// Arms hanging at the sides, the silhouette Idle rests in.
const DOWN = 62;
const TAU = Math.PI * 2;

// Flat on the back, solved against the rig's own bind frame (lib/motion-rest.js
// measured this triple; it is reused here rather than re-guessed).
const ON_BACK = [-89.6, -13.1, -4.1];
// The same solve rolled over: belly in the mud, face forward.
const ON_FRONT = [88, 10, 3];

const MANIFEST = [
  { key: "crouchFire", label: "Crouch fire", group: "military", loop: "loop", tags: ["combat", "rifle", "crouch", "fire", "soldier"] },
  { key: "proneFire", label: "Prone fire", group: "military", loop: "loop", tags: ["combat", "rifle", "prone", "fire", "soldier"] },
  { key: "takeCover", label: "Take cover", group: "military", loop: "loop", tags: ["combat", "cover", "wall", "wait", "soldier"] },
  { key: "dragWounded", label: "Drag wounded", group: "military", loop: "loop", tags: ["medic", "carry", "casualty", "haul"] },
  { key: "digTrench", label: "Dig — trench", group: "military", loop: "loop", tags: ["work", "entrench", "shovel", "soldier"] },
  { key: "deadPose", label: "Dead", group: "military", loop: "loop", tags: ["dead", "casualty", "down", "still", "pose"] },
];

// ── Fighting ────────────────────────────────────────────────────────────────

// Down on the haunches behind something low, rifle shouldered, firing. The
// shot lands at the top of every cycle and decays away across it — so the loop
// wraps INTO the recoil, which is exactly how a shot reads: a snap, then the
// body walking itself back onto the sights.
export function crouchFire(t) {
  const p = t / crouchFire.duration;
  const kick = Math.exp(-9 * t) * (1 - p); // 1 at the shot, 0 by the end of the cycle
  const br = Math.sin((t * TAU) / crouchFire.duration);
  return {
    // Squat solved off the leg fold below: thighs at −72 and knees at 86 shorten
    // hip-to-heel by about a third of a rig height, so the pelvis drops 32.
    Hips: { rotation: [0, -10, 0], position: [0, -32 + 1.8 * kick + 0.4 * br, 0] },
    Spine02: { rotation: [16 - 4 * kick, -4, 0] },
    Spine01: { rotation: [6 - 2 * kick, -6, 0] },
    Spine: { rotation: [7 - 5 * kick + 0.6 * br, -12, 0] },
    neck: { rotation: [2 + 3 * kick, 6, 0] },
    // Cheek welded to the stock — the head rides the recoil, it doesn't lead it.
    Head: { rotation: [5 - 4 * kick, 10, 4] },
    // motion-combat's rifleAim shoulders, dropped into the crouch.
    RightArm: { rotation: [18 - 6 * kick, 0, 4 + 4 * kick] },
    RightForeArm: { rotation: [-96 + 9 * kick, 0, 0] },
    LeftArm: { rotation: [40 - 4 * kick, 0, 62 - 5 * kick] },
    LeftForeArm: { rotation: [-62 + 6 * kick, 0, 0] },
    // Heels down, knees wide, weight forward over the balls of the feet.
    LeftUpLeg: { rotation: [-72, 0, -10] },
    LeftLeg: { rotation: [86, 0, 0] },
    LeftFoot: { rotation: [-12, 0, 0] },
    RightUpLeg: { rotation: [-66, 0, 12] },
    RightLeg: { rotation: [80, 0, 0] },
    RightFoot: { rotation: [-10, 0, 0] },
  };
}
crouchFire.duration = 1.6;

// Flat in the dirt on both elbows, rifle out front, chin up on the sights.
// Slow chest breathing under it, and a round away once a cycle.
export function proneFire(t) {
  const p = t / proneFire.duration;
  const a = (t * TAU) / proneFire.duration;
  const br = Math.sin(a);
  const kick = Math.exp(-11 * t) * (1 - p);
  return {
    Hips: { rotation: ON_FRONT, position: [0, -86, 0] },
    // The chest is propped on the elbows, so the spine arches BACK off the ground.
    Spine02: { rotation: [-15 - 1.5 * br + 3 * kick, 0, 0] },
    Spine01: { rotation: [-8 - 0.8 * br, 2, 0] },
    Spine: { rotation: [-10 - 0.6 * br, -8, 0] },
    neck: { rotation: [-12, 4, 0] },
    Head: { rotation: [-16 + 4 * kick, 8, 3] },
    // Elbows carrying the weight, rifle shouldered the same as standing.
    RightArm: { rotation: [26 - 5 * kick, 0, -4 + 3 * kick] },
    RightForeArm: { rotation: [-104 + 8 * kick, 0, 0] },
    LeftArm: { rotation: [48 - 3 * kick, 0, 54 - 4 * kick] },
    LeftForeArm: { rotation: [-78 + 5 * kick, 0, 0] },
    // Legs straight back, heels out, toes turned over — nobody lies square.
    LeftUpLeg: { rotation: [-2, 0, -12] },
    LeftLeg: { rotation: [10, 0, 0] },
    LeftFoot: { rotation: [22, 0, 0] },
    RightUpLeg: { rotation: [-2, 0, 12] },
    RightLeg: { rotation: [16, 0, 0] },
    RightFoot: { rotation: [20, 0, 0] },
  };
}
proneFire.duration = 2.6;

// Back flat against a wall, weapon held vertical across the chest, checking the
// corner and pulling back in. Tight, held, waiting — nothing here travels.
export function takeCover(t) {
  const a = (t * TAU) / takeCover.duration;
  const peek = 0.5 - 0.5 * Math.cos(a); // 0 = pressed in, 1 = looking round it
  const br = Math.sin(a * 2); // short, high breathing
  return {
    Hips: { rotation: [0, 6, 0], position: [0, -3 + 0.4 * br, 0] },
    // Shoulders and hips pinned back; the arch is what says "wall".
    Spine02: { rotation: [-6 - 0.8 * br, 0, 0] },
    Spine01: { rotation: [-4 - 0.6 * br, 2, 0] },
    Spine: { rotation: [-4 - 1 * br, 6 + 10 * peek, 0] },
    neck: { rotation: [0, 6 * peek, 0] },
    Head: { rotation: [-2 - 4 * peek, 12 + 26 * peek, 0] },
    // Muzzle up, elbows in tight — the rifle is vertical against the shoulder.
    RightArm: { rotation: [44 + 0.6 * br, 0, -34] },
    RightForeArm: { rotation: [-118, 0, 0] },
    LeftArm: { rotation: [50 + 0.5 * br, 0, 34] },
    LeftForeArm: { rotation: [-108, 0, 0] },
    // Weight on the back leg, front boot braced against the wall's base.
    LeftUpLeg: { rotation: [-12, 0, -6] },
    LeftLeg: { rotation: [14, 0, 0] },
    LeftFoot: { rotation: [-4, 0, 0] },
    RightUpLeg: { rotation: [6, 0, 6] },
    RightLeg: { rotation: [10, 0, 0] },
  };
}
takeCover.duration = 3.2;

// Hauling a man out of the open: hands low on his webbing, the torso levered
// back against the weight, boots shuffling backwards under it. In place — the
// travel belongs to whatever is moving the body.
export function dragWounded(t) {
  const a = (t * TAU) / dragWounded.duration;
  const pull = 0.5 - 0.5 * Math.cos(a); // 0 = reach out, 1 = hauled in
  const step = Math.sin(a); // the shuffle under the haul
  return {
    Hips: { rotation: [0, 4 * step, 0], position: [0, -12 - 5 * pull, 0] },
    // Leaning back into the load, not bending over it.
    Spine02: { rotation: [-18 - 9 * pull, 0, 0] },
    Spine01: { rotation: [-6 - 3 * pull, 3 * step, 0] },
    Spine: { rotation: [-6 - 4 * pull, -4 * step, 0] },
    neck: { rotation: [8 + 4 * pull, 0, 0] },
    Head: { rotation: [12 + 6 * pull, -8 * step, 0] },
    // Both hands low and forward on the webbing, dragged back to the hips.
    RightArm: { rotation: [80 - 8 * pull, 0, -28 + 16 * pull] },
    RightForeArm: { rotation: [-22 - 42 * pull, 0, 0] },
    LeftArm: { rotation: [80 - 8 * pull, 0, 28 - 16 * pull] },
    LeftForeArm: { rotation: [-22 - 42 * pull, 0, 0] },
    // One thigh drives the ground away while the other resets under him.
    LeftUpLeg: { rotation: [-26 + 16 * pull + 10 * step, 0, -6] },
    LeftLeg: { rotation: [34 - 10 * pull, 0, 0] },
    RightUpLeg: { rotation: [-26 + 16 * pull - 10 * step, 0, 6] },
    RightLeg: { rotation: [34 - 10 * pull, 0, 0] },
  };
}
dragWounded.duration = 2.6;

// An entrenching tool, not a farm spade: short fast bites at the ground, and
// the spoil thrown out to the right. Faster and lower than motion-rest's dig,
// and it stays hunched — a man cutting a hole he intends to lie in.
export function digTrench(t) {
  const a = (t * TAU) / digTrench.duration;
  const aw = a + 0.5 * Math.sin(a); // slow load, fast throw
  const s = 0.5 - 0.5 * Math.cos(aw); // 0 = blade in the ground, 1 = spoil flung
  return {
    Hips: { rotation: [0, 10 * s, 0], position: [0, -22 + 7 * s, 0] },
    Spine02: { rotation: [34 - 15 * s, 8 * s, 0] },
    Spine01: { rotation: [12 - 5 * s, 6 * s, 0] },
    Spine: { rotation: [8 - 4 * s, 22 * s, 0] },
    neck: { rotation: [6 - 4 * s, 4 * s, 0] },
    Head: { rotation: [18 - 11 * s, 12 * s, 0] },
    // Hands-forward work grip: elbows fold on Z, the way motion-rest's dig does.
    LeftArm: { rotation: [DOWN + 32 - 14 * s, 15, 50 - 20 * s] },
    LeftForeArm: { rotation: [0, 0, 14 + 40 * s] },
    RightArm: { rotation: [DOWN + 28 - 14 * s, -15, -38 + 14 * s] },
    RightForeArm: { rotation: [0, 0, -18 - 42 * s] },
    // Braced: front knee bent over the cut, back leg long.
    LeftUpLeg: { rotation: [-30 + 8 * s, 0, -8] },
    LeftLeg: { rotation: [36 - 8 * s, 0, 0] },
    RightUpLeg: { rotation: [-8, 0, 8] },
    RightLeg: { rotation: [16, 0, 0] },
  };
}
digTrench.duration = 1.5;

// ── Down ────────────────────────────────────────────────────────────────────

// Killed. No t: every sample is the same offsets, so this bakes to constant
// keyframes and the body simply lies there — no breath, no sway, no Walk cycle
// ticking over on a corpse. Everything is off-square on purpose; a symmetric
// body reads as a mannequin laid out, not a man who fell.
export function deadPose() {
  return {
    Hips: { rotation: ON_BACK, position: [0, -84, 0] },
    Spine02: { rotation: [3, 0, 5] },
    Spine01: { rotation: [1, 0, 3] },
    Spine: { rotation: [2, 7, 5] },
    neck: { rotation: [4, 12, 0] },
    // The face has rolled away toward one shoulder.
    Head: { rotation: [7, 27, 6] },
    // One arm folded across the belly, the other thrown out where it landed.
    RightArm: { rotation: [DOWN + 24, 0, -34] },
    RightForeArm: { rotation: [0, 0, -54] },
    LeftArm: { rotation: [DOWN - 28, 0, -12] },
    LeftForeArm: { rotation: [0, 0, 10] },
    // Legs loose, one knee fallen open, both feet turned out.
    LeftUpLeg: { rotation: [-6, 0, -17] },
    LeftLeg: { rotation: [12, 0, 0] },
    LeftFoot: { rotation: [12, 0, 0] },
    RightUpLeg: { rotation: [-2, 0, 7] },
    RightLeg: { rotation: [26, 0, 0] },
    RightFoot: { rotation: [16, 0, 0] },
  };
}
deadPose.duration = 1;
deadPose.fps = 4; // nothing moves: four identical keys is the whole clip

module.exports = {
  DOWN: DOWN,
  ON_BACK: ON_BACK,
  ON_FRONT: ON_FRONT,
  MANIFEST: MANIFEST,
  crouchFire: crouchFire,
  proneFire: proneFire,
  takeCover: takeCover,
  dragWounded: dragWounded,
  digTrench: digTrench,
  deadPose: deadPose,
};
