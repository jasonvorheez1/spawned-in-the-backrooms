// Motions — being somewhere rather than going somewhere: sitting, kneeling,
// lying down, praying, begging, sleeping, and the busy-hands work loops
// (preparing, hammering, digging, sweeping, hauling).
//
// Authored clips: named functions of time, values are OFFSETS from the rig's
// BIND pose (a T-POSE — arms straight out sideways), euler DEGREES in the
// bone's own local frame. See lib/motion-social.js for the shape.
//
// Held poses breathe: even a body sitting perfectly still wants a slow chest
// rise, or it reads as a statue.
//
// The axis conventions below were measured off the shared 24-joint rig's own
// bind matrices, not guessed:
//   Arm      +X lowers the arm to the side (DOWN = the natural hang).
//            Z swings it forward — LEFT +, RIGHT − (mirrored).
//            Y twists the upper arm, which turns the elbow's fold plane.
//   ForeArm  Z bends the elbow forward (LEFT +, RIGHT −). X is a chicken-wing
//            fold that lifts the hand up and out — that is the hammer cock.
//   Spine*   +X bends forward / −X arches back, +Y turns left, +Z leans right.
//   neck/Head  +X bows the head, −X tips it back.
//   UpLeg    −X swings the thigh forward (hip flexion), +X back. The two leg
//            bones share one frame: +Z always moves a foot toward the body's
//            RIGHT, so an outward splay is LEFT − / RIGHT +.
//   Leg      +X bends the knee. Foot +X points the toes down/back.
//   Hips     +X pitches the whole body face-down; the lying poses use the
//            conjugated triples below. position is world-ish: Y only, so the
//            root-motion law never trips.

// Arms hanging at the sides, the silhouette Idle rests in.
const DOWN = 62;
const TAU = Math.PI * 2;

// Whole-body rotations solved against the rig's own bind frame: flat on the
// back, and rolled 70° onto the side from there.
const ON_BACK = [-89.6, -13.1, -4.1];
const ON_SIDE = [-114.2, 37.7, 45.8];

const MANIFEST = [
  { key: "sitChair", label: "Sit — chair", group: "rest", loop: "loop", tags: ["sit", "rest", "chair", "tavern"] },
  { key: "sitGround", label: "Sit — ground", group: "rest", loop: "loop", tags: ["sit", "rest", "ground", "camp"] },
  { key: "kneel", label: "Kneel", group: "rest", loop: "loop", tags: ["kneel", "rest", "submit"] },
  { key: "pray", label: "Pray", group: "rest", loop: "loop", tags: ["kneel", "ritual", "temple"] },
  { key: "beg", label: "Beg", group: "rest", loop: "loop", tags: ["kneel", "plead", "npc"] },
  { key: "lieDown", label: "Lie down", group: "rest", loop: "loop", tags: ["lie", "rest", "down"] },
  { key: "sleep", label: "Sleep", group: "rest", loop: "loop", tags: ["lie", "rest", "sleep", "night"] },
  { key: "prepare", label: "Prepare — busy hands", group: "rest", loop: "loop", tags: ["work", "hands", "cook", "craft"] },
  { key: "hammer", label: "Hammer", group: "rest", loop: "loop", tags: ["work", "craft", "smith", "tool"] },
  { key: "dig", label: "Dig", group: "rest", loop: "loop", tags: ["work", "tool", "farm"] },
  { key: "sweep", label: "Sweep", group: "rest", loop: "loop", tags: ["work", "tool", "chore"] },
  { key: "drink", label: "Drink", group: "rest", loop: "loop", tags: ["idle", "tavern", "consume"] },
  { key: "eat", label: "Eat", group: "rest", loop: "loop", tags: ["idle", "tavern", "consume"] },
  { key: "carryBox", label: "Carry", group: "rest", loop: "loop", tags: ["work", "carry", "haul"] },
  { key: "push", label: "Push", group: "rest", loop: "loop", tags: ["work", "effort", "haul"] },
  { key: "pull", label: "Pull", group: "rest", loop: "loop", tags: ["work", "effort", "haul"] },
  { key: "lean", label: "Lean", group: "rest", loop: "loop", tags: ["idle", "wall", "loiter"] },
];

// ── Rest ────────────────────────────────────────────────────────────────────

// Hips dropped onto a seat, thighs forward, shins down, hands on the thighs.
export function sitChair(t) {
  const a = (t * TAU) / sitChair.duration;
  const br = Math.sin(a); // breath
  const sway = Math.sin(a * 2 + 0.7);
  return {
    Hips: { position: [0, -40 + 0.6 * br, 0] },
    Spine02: { rotation: [5 - 1.8 * br, 0, 0] },
    Spine01: { rotation: [2 - 0.7 * br, 0, 0] },
    Spine: { rotation: [-1.4 * br, 1.4 * sway, 0] },
    neck: { rotation: [1.2 * br, 0, 0] },
    Head: { rotation: [4 + 1.3 * br, -2 * sway, 0] },
    LeftUpLeg: { rotation: [-84, 0, -4] },
    LeftLeg: { rotation: [86, 0, 0] },
    LeftFoot: { rotation: [-6, 0, 0] },
    RightUpLeg: { rotation: [-84, 0, 4] },
    RightLeg: { rotation: [86, 0, 0] },
    RightFoot: { rotation: [-6, 0, 0] },
    LeftArm: { rotation: [DOWN + 24 - 1.2 * br, 0, 52] },
    LeftForeArm: { rotation: [0, 0, 14 + 1.6 * br] },
    RightArm: { rotation: [DOWN + 24 - 1.2 * br, 0, -52] },
    RightForeArm: { rotation: [0, 0, -14 - 1.6 * br] },
  };
}
sitChair.duration = 4;

// Cross-legged on the floor: knees splayed wide, shins folded in, spine easy.
export function sitGround(t) {
  const a = (t * TAU) / sitGround.duration;
  const br = Math.sin(a);
  const drift = Math.sin(a + 2.1);
  return {
    Hips: { position: [0, -54 + 0.5 * br, 0] },
    Spine02: { rotation: [8 - 2 * br, 0, 1.5 * drift] },
    Spine01: { rotation: [4 - 0.8 * br, 0, 0] },
    Spine: { rotation: [2 - 1.2 * br, 2 * drift, 0] },
    neck: { rotation: [1.4 * br, 0, 0] },
    Head: { rotation: [3 + 1.5 * br, -2.5 * drift, 0] },
    LeftUpLeg: { rotation: [-70, -35, -55] },
    LeftLeg: { rotation: [100, 0, 0] },
    RightUpLeg: { rotation: [-70, 40, 35] },
    RightLeg: { rotation: [112, 0, 0] },
    LeftArm: { rotation: [DOWN + 18 - 1.5 * br, 0, 40] },
    LeftForeArm: { rotation: [0, 0, 10 + 2 * br] },
    RightArm: { rotation: [DOWN + 18 - 1.5 * br, 0, -40] },
    RightForeArm: { rotation: [0, 0, -10 - 2 * br] },
  };
}
sitGround.duration = 4.4;

// One shin flat on the ground, the other knee up, weight forward over it.
export function kneel(t) {
  const a = (t * TAU) / kneel.duration;
  const br = Math.sin(a);
  const settle = Math.sin(a + 1.6);
  return {
    Hips: { position: [0, -50 + 0.7 * settle, 0] },
    Spine02: { rotation: [10 - 1.6 * br, 0, 1.2 * settle] },
    Spine01: { rotation: [4 - 0.6 * br, 0, 0] },
    Spine: { rotation: [2 - 1 * br, 1.5 * settle, 0] },
    RightUpLeg: { rotation: [-12, 0, 0] },
    RightLeg: { rotation: [92, 0, 0] },
    RightFoot: { rotation: [40, 0, 0] },
    LeftUpLeg: { rotation: [-86, 0, -10] },
    LeftLeg: { rotation: [84, 0, 0] },
    LeftFoot: { rotation: [10, 0, 0] },
    LeftArm: { rotation: [DOWN + 22 - 1.4 * br, 0, 46] },
    LeftForeArm: { rotation: [0, 0, 12 + 2 * br] },
    RightArm: { rotation: [DOWN + 2, 0, 6 + 1.5 * settle] },
    RightForeArm: { rotation: [0, 0, -18 - 2 * br] },
    neck: { rotation: [6 + 1.2 * br, 0, 0] },
    Head: { rotation: [13 + 1.8 * br, -1.5 * settle, 0] },
  };
}
kneel.duration = 3.6;

// Kneeling on both shins, palms together at the chest, head bowed, slow rock.
export function pray(t) {
  const a = (t * TAU) / pray.duration;
  const rock = Math.sin(a);
  const br = Math.sin(a * 2 + 0.4);
  return {
    Hips: { position: [0, -50 + 0.8 * rock, 0] },
    Spine02: { rotation: [6 + 3 * rock - 1 * br, 0, 0] },
    Spine01: { rotation: [3 + 1.5 * rock, 0, 0] },
    Spine: { rotation: [3 + 1.5 * rock - 0.8 * br, 0, 0] },
    LeftUpLeg: { rotation: [-4, 0, -4] },
    LeftLeg: { rotation: [76, 0, 0] },
    LeftFoot: { rotation: [40, 0, 0] },
    RightUpLeg: { rotation: [-12, 0, 0] },
    RightLeg: { rotation: [92, 0, 0] },
    RightFoot: { rotation: [40, 0, 0] },
    LeftArm: { rotation: [DOWN - 6 - 1.5 * rock, 50, 66] },
    LeftForeArm: { rotation: [0, 0, 104 + 2 * rock] },
    RightArm: { rotation: [DOWN - 6 - 1.5 * rock, -50, -66] },
    RightForeArm: { rotation: [0, 0, -104 - 2 * rock] },
    neck: { rotation: [10 + 2 * rock, 0, 0] },
    Head: { rotation: [16 + 3 * rock, 0, 0] },
  };
}
pray.duration = 4.6;

// Hunched low, both arms out with the palms turned up, face lifted, pleading.
export function beg(t) {
  const a = (t * TAU) / beg.duration;
  const plead = 0.5 - 0.5 * Math.cos(a); // 0 at the wrists-in rest, 1 at full reach
  const br = Math.sin(a * 2);
  return {
    Hips: { position: [0, -24 + 1.5 * plead, 0] },
    Spine02: { rotation: [12 - 3 * plead, 0, 0] },
    Spine01: { rotation: [5 - 1 * plead, 0, 0] },
    Spine: { rotation: [2 - 1 * plead + 0.6 * br, 0, 0] },
    LeftUpLeg: { rotation: [-28, 0, -2] },
    LeftLeg: { rotation: [44, 0, 0] },
    RightUpLeg: { rotation: [-28, 0, 2] },
    RightLeg: { rotation: [44, 0, 0] },
    LeftArm: { rotation: [DOWN - 22 - 4 * plead, 40, 88 + 6 * plead] },
    LeftForeArm: { rotation: [0, 0, 52 - 10 * plead] },
    RightArm: { rotation: [DOWN - 26 - 4 * plead, -40, -90 - 6 * plead] },
    RightForeArm: { rotation: [0, 0, -50 + 10 * plead] },
    neck: { rotation: [-8 - 2 * plead, 0, 0] },
    Head: { rotation: [-18 - 4 * plead, 2 * br, 0] },
  };
}
beg.duration = 2.8;

// Flat on the back, limbs loose and a little splayed, chest rising slowly.
export function lieDown(t) {
  const a = (t * TAU) / lieDown.duration;
  const br = Math.sin(a);
  const drift = Math.sin(a + 1.9);
  return {
    Hips: { rotation: ON_BACK, position: [0, -84, 0] },
    Spine02: { rotation: [2 - 2.5 * br, 0, 0] },
    Spine01: { rotation: [-1 * br, 0, 0] },
    Spine: { rotation: [-1.5 * br, 1 * drift, 0] },
    LeftUpLeg: { rotation: [-4, 0, -9 - 1 * drift] },
    LeftLeg: { rotation: [8, 0, 0] },
    RightUpLeg: { rotation: [-4, 0, 9 + 1 * drift] },
    RightLeg: { rotation: [8, 0, 0] },
    LeftArm: { rotation: [DOWN - 10, 0, -8 - 1.5 * br] },
    LeftForeArm: { rotation: [0, 0, 16 + 1.5 * drift] },
    RightArm: { rotation: [DOWN - 10, 0, 8 + 1.5 * br] },
    RightForeArm: { rotation: [0, 0, -16 - 1.5 * drift] },
    neck: { rotation: [1.5 * br, 0, 0] },
    Head: { rotation: [6 + 1.5 * br, 2 * drift, 0] },
  };
}
lieDown.duration = 4.6;

// Curled on the side, knees drawn up, arms tucked, deep slow breathing.
export function sleep(t) {
  const a = (t * TAU) / sleep.duration;
  const br = Math.sin(a);
  const late = Math.sin(a + 0.9);
  return {
    Hips: { rotation: ON_SIDE, position: [0, -80, 0] },
    Spine02: { rotation: [12 - 3.5 * br, 0, 0] },
    Spine01: { rotation: [6 - 1.5 * br, 0, 0] },
    Spine: { rotation: [4 - 2 * br, 0, 0] },
    LeftUpLeg: { rotation: [-70 - 1.5 * late, 0, -2] },
    LeftLeg: { rotation: [86, 0, 0] },
    RightUpLeg: { rotation: [-60 - 1.5 * late, 0, 6] },
    RightLeg: { rotation: [76, 0, 0] },
    LeftArm: { rotation: [DOWN + 26, 20, 24 + 1.5 * br] },
    LeftForeArm: { rotation: [0, 0, 96 + 2 * late] },
    RightArm: { rotation: [DOWN + 20, -20, -16 - 1.5 * br] },
    RightForeArm: { rotation: [0, 0, -88 - 2 * late] },
    neck: { rotation: [8 + 1.5 * br, 0, 0] },
    Head: { rotation: [12 + 2 * br, 0, 0] },
  };
}
sleep.duration = 4;

// ── Work ────────────────────────────────────────────────────────────────────

// At a bench: both hands busy in front of the waist, one chopping, one
// stirring, with a small chest and head bob under the work.
export function prepare(t) {
  const a = (t * TAU) / prepare.duration;
  const chop = Math.sin(a * 2); // right hand, twice a cycle
  const stir = Math.sin(a);
  const stirB = Math.cos(a);
  return {
    Spine02: { rotation: [8 + 1.6 * chop, 0, 1.2 * stir] },
    Spine01: { rotation: [3 + 0.8 * chop, 0, 0] },
    Spine: { rotation: [2, 3 * stir, 0] },
    LeftArm: { rotation: [DOWN + 26 + 2 * stirB, 25, 32 + 5 * stir] },
    LeftForeArm: { rotation: [0, 0, 58 + 9 * stirB] },
    RightArm: { rotation: [DOWN + 26 + 3 * chop, -25, -32 - 3 * chop] },
    RightForeArm: { rotation: [0, 0, -58 - 14 * chop] },
    neck: { rotation: [2 + 1 * chop, 0, 0] },
    Head: { rotation: [10 + 2 * chop, -2 * stir, 0] },
  };
}
prepare.duration = 2.4;

// One arm cocks high and strikes down; the other hand steadies the work; the
// torso follows every strike. Warped phase: slow raise, fast fall.
export function hammer(t) {
  const a = (t * TAU) / hammer.duration;
  const aw = a + 0.55 * Math.sin(a); // sharpens the strike, stretches the raise
  const s = 0.5 - 0.5 * Math.cos(aw); // 0 = cocked, 1 = landed
  const steady = 0.5 - 0.5 * Math.cos(a * 2);
  return {
    Hips: { position: [0, -1.4 * s, 0] },
    Spine02: { rotation: [-6 + 22 * s, 0, 0] },
    Spine01: { rotation: [-2 + 8 * s, 0, 0] },
    Spine: { rotation: [3 * s, -10 + 18 * s, 0] },
    RightArm: { rotation: [DOWN - 92 + 96 * s, 0, -25 - 45 * s] },
    RightForeArm: { rotation: [-95 + 95 * s, 0, -6 * s] },
    LeftArm: { rotation: [DOWN + 26 + 2 * steady, 10, 44 - 3 * s] },
    LeftForeArm: { rotation: [0, 0, 34 + 4 * s] },
    neck: { rotation: [2 * s, 0, 0] },
    Head: { rotation: [4 + 9 * s, 0, 0] },
  };
}
hammer.duration = 1.2;

// Both hands on the shaft: push the blade down, lever back, lift, toss aside.
export function dig(t) {
  const a = (t * TAU) / dig.duration;
  const aw = a + 0.35 * Math.sin(a);
  const s = 0.5 - 0.5 * Math.cos(aw); // 0 = blade down, 1 = tossed aside
  const lift = Math.max(0, Math.sin(a)); // the load rides up between the two
  return {
    Hips: { position: [0, -2 + 2 * s, 0] },
    Spine02: { rotation: [22 - 16 * s, 12 * s, 0] },
    Spine01: { rotation: [8 - 6 * s, 6 * s, 0] },
    Spine: { rotation: [4 - 4 * s, 32 * s, 0] },
    LeftArm: { rotation: [DOWN + 34 - 14 * s - 6 * lift, 15, 52 - 18 * s] },
    LeftForeArm: { rotation: [0, 0, 10 + 34 * s + 8 * lift] },
    RightArm: { rotation: [DOWN + 30 - 14 * s - 6 * lift, -15, -40 + 10 * s] },
    RightForeArm: { rotation: [0, 0, -14 - 36 * s - 8 * lift] },
    LeftUpLeg: { rotation: [-16 + 6 * s, 0, -6] },
    LeftLeg: { rotation: [20 - 6 * s, 0, 0] },
    RightUpLeg: { rotation: [10 - 4 * s, 0, 6] },
    RightLeg: { rotation: [10 - 2 * s, 0, 0] },
    neck: { rotation: [4 - 4 * s, 6 * s, 0] },
    Head: { rotation: [14 - 12 * s, 18 * s, 0] },
  };
}
dig.duration = 2.2;

// Hands apart on a broom, long side-to-side arcs, hips turning with them.
export function sweep(t) {
  const a = (t * TAU) / sweep.duration;
  const sw = Math.sin(a); // +1 across the left, −1 across the right
  const dip = Math.cos(a * 2);
  return {
    Hips: { rotation: [0, 5 * sw, 0], position: [0, -0.8 - 0.6 * dip, 0] },
    Spine02: { rotation: [10 + 1.5 * dip, 8 * sw, 0] },
    Spine01: { rotation: [4, 4 * sw, 0] },
    Spine: { rotation: [2, 20 * sw, 0] },
    LeftArm: { rotation: [DOWN + 24 - 2 * sw, 10, 39 + 5 * sw] },
    LeftForeArm: { rotation: [0, 0, 44 + 4 * sw] },
    RightArm: { rotation: [DOWN + 32 + 2 * sw, -10, -46 - 4 * sw] },
    RightForeArm: { rotation: [0, 0, -6 - 4 * sw] },
    neck: { rotation: [3, 4 * sw, 0] },
    Head: { rotation: [8 + 1.5 * dip, 10 * sw, 0] },
  };
}
sweep.duration = 2;

// Raise the cup, head tips back for the swallow, lower it and rest.
export function drink(t) {
  const a = (t * TAU) / drink.duration;
  const s = Math.pow(0.5 - 0.5 * Math.cos(a), 0.7); // broad hold at the mouth
  const br = Math.sin(a * 2);
  return {
    Spine02: { rotation: [-4 * s + 0.8 * br, 0, 0] },
    Spine01: { rotation: [-2 * s, 0, 0] },
    Spine: { rotation: [0, -3 * s, 0] },
    RightArm: { rotation: [DOWN - 12 * s, -50 * s, 6 - 74 * s] },
    RightForeArm: { rotation: [0, 0, -14 - 112 * s] },
    LeftArm: { rotation: [DOWN, 0, -6] },
    LeftForeArm: { rotation: [0, 0, 14 + 2 * br] },
    neck: { rotation: [-8 * s, 0, 0] },
    Head: { rotation: [-16 * s, 4 * s, 0] },
  };
}
drink.duration = 3;

// Hand to the mouth, a small chewing bob, the other arm hanging easy.
export function eat(t) {
  const a = (t * TAU) / eat.duration;
  const bite = 0.5 - 0.5 * Math.cos(a); // 0 = hand lowered, 1 = at the mouth
  const chew = Math.sin(a * 4);
  const br = Math.sin(a);
  return {
    Spine02: { rotation: [2 - 1.2 * br, 0, 0] },
    Spine01: { rotation: [1, 0, 0] },
    Spine: { rotation: [0, -2 * bite, 0] },
    RightArm: { rotation: [DOWN + 6 - 12 * bite, -45 * bite, 6 - 68 * bite] },
    RightForeArm: { rotation: [0, 0, -22 - 96 * bite] },
    LeftArm: { rotation: [DOWN + 4, 0, 4] },
    LeftForeArm: { rotation: [0, 0, 22 + 2 * br] },
    neck: { rotation: [-2 * bite + 1.2 * chew, 0, 0] },
    Head: { rotation: [6 - 4 * bite + 2.5 * chew, -4 * bite, 0] },
  };
}
eat.duration = 2.6;

// Both forearms up under a load, spine tipped back to counterweight it, the
// breath heavy and the knees soft.
export function carryBox(t) {
  const a = (t * TAU) / carryBox.duration;
  const br = Math.sin(a); // heavy breath
  const sag = Math.sin(a + 2.4);
  return {
    Hips: { position: [0, -2 + 1 * sag, 0] },
    Spine02: { rotation: [-11 - 3.5 * br, 0, 1.5 * sag] },
    Spine01: { rotation: [-5 - 1.2 * br, 0, 0] },
    Spine: { rotation: [-4 - 1.5 * br, 2 * sag, 0] },
    LeftArm: { rotation: [DOWN + 34 + 1.5 * sag, 10, 28] },
    LeftForeArm: { rotation: [0, 0, 64 - 2.5 * sag] },
    RightArm: { rotation: [DOWN + 34 + 1.5 * sag, -10, -28] },
    RightForeArm: { rotation: [0, 0, -64 + 2.5 * sag] },
    LeftUpLeg: { rotation: [-4, 0, -4] },
    LeftLeg: { rotation: [9 + 1.5 * sag, 0, 0] },
    RightUpLeg: { rotation: [-4, 0, 4] },
    RightLeg: { rotation: [9 + 1.5 * sag, 0, 0] },
    neck: { rotation: [8 + 1.5 * br, 0, 0] },
    Head: { rotation: [6 + 2 * br, -2 * sag, 0] },
  };
}
carryBox.duration = 3.4;

// Arms braced forward at chest height, weight over the front leg, shoving in
// surges that never quite stop.
export function push(t) {
  const a = (t * TAU) / push.duration;
  const aw = a + 0.4 * Math.sin(a);
  const surge = 0.5 - 0.5 * Math.cos(aw); // 1 = at the end of the shove
  return {
    Hips: { position: [0, -1.6 * surge, 0] },
    Spine02: { rotation: [15 + 5 * surge, 0, 0] },
    Spine01: { rotation: [6 + 2 * surge, 0, 0] },
    Spine: { rotation: [3 + 1.5 * surge, 0, 0] },
    LeftArm: { rotation: [DOWN - 16 - 2 * surge, 0, 74 + 5 * surge] },
    LeftForeArm: { rotation: [0, 0, 14 - 9 * surge] },
    RightArm: { rotation: [DOWN - 16 - 2 * surge, 0, -74 - 5 * surge] },
    RightForeArm: { rotation: [0, 0, -14 + 9 * surge] },
    LeftUpLeg: { rotation: [-22 - 3 * surge, 0, -4] },
    LeftLeg: { rotation: [26 - 5 * surge, 0, 0] },
    RightUpLeg: { rotation: [16 + 4 * surge, 0, 4] },
    RightLeg: { rotation: [10 - 4 * surge, 0, 0] },
    RightFoot: { rotation: [-18 - 4 * surge, 0, 0] },
    neck: { rotation: [-2 - 1.5 * surge, 0, 0] },
    Head: { rotation: [-6 - 2 * surge, 0, 0] },
  };
}
push.duration = 1.8;

// The mirror of the shove: reach out, drag the load back to the chest, lean
// away from it, reset.
export function pull(t) {
  const a = (t * TAU) / pull.duration;
  const aw = a + 0.4 * Math.sin(a);
  const haul = 0.5 - 0.5 * Math.cos(aw); // 0 = reaching out, 1 = drawn in
  return {
    Hips: { position: [0, -1.2 * haul, 0] },
    Spine02: { rotation: [10 - 23 * haul, 0, 0] },
    Spine01: { rotation: [4 - 9 * haul, 0, 0] },
    Spine: { rotation: [2 - 5 * haul, 0, 0] },
    LeftArm: { rotation: [DOWN - 6 + 20 * haul, 0, 84 - 92 * haul] },
    LeftForeArm: { rotation: [0, 0, 24 + 82 * haul] },
    RightArm: { rotation: [DOWN - 6 + 20 * haul, 0, -84 + 92 * haul] },
    RightForeArm: { rotation: [0, 0, -24 - 82 * haul] },
    LeftUpLeg: { rotation: [-14 - 6 * haul, 0, -4] },
    LeftLeg: { rotation: [18 + 6 * haul, 0, 0] },
    RightUpLeg: { rotation: [10 + 4 * haul, 0, 4] },
    RightLeg: { rotation: [6 + 2 * haul, 0, 0] },
    RightFoot: { rotation: [-10 - 4 * haul, 0, 0] },
    neck: { rotation: [2 * haul, 0, 0] },
    Head: { rotation: [-2 + 6 * haul, 0, 0] },
  };
}
pull.duration = 1.8;

// Shoulders back against a wall, one shoulder turned in, ankles crossed, arms
// folded, going nowhere.
export function lean(t) {
  const a = (t * TAU) / lean.duration;
  const br = Math.sin(a);
  const shift = Math.sin(a + 1.3);
  return {
    Hips: { rotation: [-9, 1.5 * shift, 0], position: [0, -0.6 + 0.5 * br, 0] },
    Spine02: { rotation: [-2 - 1.5 * br, 0, -5] },
    Spine01: { rotation: [-1, 0, 0] },
    Spine: { rotation: [-1 * br, 14, 0] },
    LeftArm: { rotation: [DOWN + 36, 50, 6 + 1.2 * br] },
    LeftForeArm: { rotation: [0, 0, 72 - 1.5 * br] },
    RightArm: { rotation: [DOWN + 36, -50, -10 - 1.2 * br] },
    RightForeArm: { rotation: [0, 0, -72 + 1.5 * br] },
    LeftUpLeg: { rotation: [4, 0, -2] },
    LeftLeg: { rotation: [4, 0, 0] },
    RightUpLeg: { rotation: [-14, 0, -30] },
    RightLeg: { rotation: [20, 0, 0] },
    RightFoot: { rotation: [30, 0, 0] },
    neck: { rotation: [1.2 * br, -2, 0] },
    Head: { rotation: [7 + 1.5 * br, -8 - 2 * shift, 0] },
  };
}
lean.duration = 4.2;

module.exports = {
  DOWN: DOWN,
  MANIFEST: MANIFEST,
  sitChair: sitChair,
  sitGround: sitGround,
  kneel: kneel,
  pray: pray,
  beg: beg,
  lieDown: lieDown,
  sleep: sleep,
  prepare: prepare,
  hammer: hammer,
  dig: dig,
  sweep: sweep,
  drink: drink,
  eat: eat,
  carryBox: carryBox,
  push: push,
  pull: pull,
  lean: lean,
};
