// Motions — social. Authored clips: named functions of time, sampled once into
// real keyframes and played through the native mixer. Every value is an OFFSET
// from the rig's BIND pose, which on every generated character is a T-POSE:
// arms straight out sideways. So the first thing any standing motion does is
// bring the arms down — DOWN below — and pose from there.
//
// One 24-joint skeleton is shared by every conjured body, so a motion written
// here plays on the knight, the barista and the goblin alike.
//
// The axis grammar, MEASURED off this rig's bind matrices (forward kinematics
// in the workshop, not guessed):
//   Arm X      0 = straight out sideways, +62 = hanging at the side (DOWN),
//              +90 = straight down, negative = raised above horizontal.
//   Arm Z      swings the whole arm forward: LEFT +Z forward, RIGHT -Z forward.
//   ForeArm Z  IS THE ELBOW — same mirror (LEFT +, RIGHT -). This, not X, is
//              what brings a hand to the face, the chest or the midline.
//   ForeArm X  negative = a chicken-wing fold that lifts the hand up and OUT.
//   Spine/Head X  positive = fold forward / chin down, negative = arch back.
//   Spine/Hips Y  positive = twist toward the body's LEFT; +Z leans right.
//   Hips position  rig-local (cm-scale) units — hips rest at ~100, head ~158.
//
// Every hand position below was solved against those numbers: the salute hand
// lands at (11, 152) beside the brow, the clap closes from ±25 to ±5 on the
// midline, the crying hands sit at ±9 in front of the face.
//
// Loops are forced seamless — the last key snaps back to fn(0) — so every
// "loop" clip below is periodic over its own fn.duration.

// Arms hanging at the sides, the silhouette Idle rests in.
const DOWN = 62;

// The shelf reads this: one row per motion, in the order they should appear.
// loop "loop" = a state the body stays in; "once" = a one-shot that freezes on
// its last frame (a held pose).
const MANIFEST = [
  { key: "cheer", label: "Excited", group: "social", loop: "loop", tags: ["emote", "happy"] },
  { key: "chat", label: "Chat", group: "social", loop: "loop", tags: ["emote", "talk"] },
  { key: "wave", label: "Wave", group: "social", loop: "loop", tags: ["emote", "greet"] },
  { key: "clap", label: "Clap", group: "social", loop: "loop", tags: ["emote", "applause", "happy"] },
  { key: "point", label: "Point", group: "social", loop: "loop", tags: ["emote", "gesture", "direct"] },
  { key: "salute", label: "Salute", group: "social", loop: "loop", tags: ["emote", "formal", "military"] },
  { key: "shrug", label: "Shrug", group: "social", loop: "loop", tags: ["emote", "gesture", "unsure"] },
  { key: "bowGreet", label: "Bow", group: "social", loop: "once", tags: ["emote", "formal", "greet"] },
  { key: "think", label: "Think", group: "social", loop: "loop", tags: ["emote", "idle", "curious"] },
  { key: "dance", label: "Dance", group: "social", loop: "loop", tags: ["emote", "dance", "party"] },
  { key: "danceSpin", label: "Dance — spin", group: "social", loop: "loop", tags: ["emote", "dance", "party"] },
  { key: "laugh", label: "Laugh", group: "social", loop: "loop", tags: ["emote", "happy", "talk"] },
  { key: "cry", label: "Cry", group: "social", loop: "loop", tags: ["emote", "sad", "talk"] },
  { key: "taunt", label: "Taunt", group: "social", loop: "loop", tags: ["emote", "rude", "combat"] },
];

// 0 before a, 1 after b, smoothed between — the shape a one-shot's phases are
// cut from.
export function ph(p, a, b) {
  const x = (p - a) / (b - a);
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
}

// --- greeting ---------------------------------------------------------------

// Both arms punch overhead — hands end at ~178, twenty above the head, so the
// shape is unmistakable from across a field.
export function cheer(t) {
  const c = Math.sin((t * 2 * Math.PI) / cheer.duration);
  const up = 0.5 + 0.5 * c; // 0..1, both arms punch up together
  return {
    Hips: { position: [0, 2.5 * Math.max(0, c), 0] },
    Spine: { rotation: [-6 * up, 0, 0] },
    Head: { rotation: [-10 * up, 0, 0] },
    RightArm: { rotation: [DOWN - 158 * up, 0, -10 * up] },
    LeftArm: { rotation: [DOWN - 158 * up, 0, 10 * up] },
    RightForeArm: { rotation: [0, 0, -18 * up] },
    LeftForeArm: { rotation: [0, 0, 18 * up] },
    RightUpLeg: { rotation: [4 * up, 0, 0] },
    LeftUpLeg: { rotation: [4 * up, 0, 0] },
  };
}
cheer.duration = 1.4;

// Talking with the hands: the right hand rides up and down in front of the
// chest (127 → 140) while the body turns into and out of the sentence.
export function chat(t) {
  const a = (t * 2 * Math.PI) / chat.duration;
  const gesture = Math.sin(a);
  const beat = Math.sin(a * 2);
  return {
    Spine: { rotation: [0, 4 * gesture, 0] },
    Head: { rotation: [3 * beat, 6 * gesture, 2 * gesture] },
    RightArm: { rotation: [24 - 10 * gesture, 0, -46] },
    RightForeArm: { rotation: [0, 0, -72 - 26 * beat] },
    RightHand: { rotation: [0, 0, -10 * beat] },
    LeftArm: { rotation: [50, 0, 20] },
    LeftForeArm: { rotation: [0, 0, 44] },
  };
}
chat.duration = 3.2;

// The upper arm goes up, not out: the hand rides between 145 and 164 — above
// the head at the top of the swing — and the elbow opens 34° each way, so the
// wave is legible at ten metres, not a raised stick.
export function wave(t) {
  const a = (t * 2 * Math.PI) / wave.duration;
  const swing = Math.sin(a * 3);
  return {
    Spine: { rotation: [0, -4, 0] },
    Head: { rotation: [0, -6, 0] },
    RightArm: { rotation: [-70, 0, -20 - 4 * swing] },
    RightForeArm: { rotation: [0, 0, -56 + 34 * swing] },
    RightHand: { rotation: [0, 0, -18 * swing] },
    LeftArm: { rotation: [DOWN - 6, 0, 6] },
    LeftForeArm: { rotation: [0, 0, 14] },
  };
}
wave.duration = 2;

// --- applause and gestures --------------------------------------------------

// Hands swing from ±25 apart to ±5 on the midline in front of the chest, and
// the ribcage gives with the contact. Smoothed so they snap together and drift
// apart rather than ticking like a metronome.
export function clap(t) {
  const a = (t * 2 * Math.PI) / clap.duration;
  const meet = 0.5 - 0.5 * Math.cos(a); // 0 = hands apart, 1 = hands together
  const m = meet * meet * (3 - 2 * meet);
  return {
    Hips: { position: [0, 1.1 * m, 0] },
    Spine02: { rotation: [1.5 * m, 0, 0] },
    Spine01: { rotation: [2.5 * m, 0, 0] },
    Spine: { rotation: [4 * m, 0, 0] }, // the small chest bounce on the clap
    neck: { rotation: [-2 * m, 0, 0] },
    Head: { rotation: [-3 + 5 * m, 0, 0] },
    RightArm: { rotation: [-38 - 6 * m, 0, -48 - 26 * m] },
    RightForeArm: { rotation: [0, 0, -58 - 42 * m] },
    RightHand: { rotation: [0, 0, -8 * m] },
    LeftArm: { rotation: [-30 - 6 * m, 0, 48 + 26 * m] },
    LeftForeArm: { rotation: [0, 0, 58 + 42 * m] },
    LeftHand: { rotation: [0, 0, 8 * m] },
    RightUpLeg: { rotation: [1.5 * m, 0, 0] },
    LeftUpLeg: { rotation: [1.5 * m, 0, 0] },
  };
}
clap.duration = 1;

// A held point: the arm is one straight line out of the shoulder (hand at
// x 52, forward of the body and above the shoulder) and the head is looking
// down it. Everything else is the drift of standing still while doing it.
export function point(t) {
  const a = (t * 2 * Math.PI) / point.duration;
  const drift = Math.sin(a);
  const breath = Math.sin(a * 2);
  return {
    Hips: { rotation: [0, -6, 2], position: [0, 0.5 * breath, 0] },
    Spine02: { rotation: [0, -4, 0] },
    Spine01: { rotation: [-1 + 0.6 * breath, -7, 0] },
    Spine: { rotation: [-3 + 1.6 * breath, -12, 0] },
    neck: { rotation: [-2, -6, 0] },
    Head: { rotation: [-6 + 1.5 * drift, -14 - 2.5 * drift, 2] },
    RightArm: { rotation: [-14 + 1.5 * drift, 0, -46 - 2 * drift] },
    RightForeArm: { rotation: [0, 0, -10] }, // all but straight: one line
    RightHand: { rotation: [0, 0, -6] },
    // Off hand parked on the hip (solved: hand at -18, 105).
    LeftArm: { rotation: [86, 0, -20] },
    LeftForeArm: { rotation: [0, 0, 44] },
    RightUpLeg: { rotation: [0, 0, -2] },
    LeftUpLeg: { rotation: [0, 0, 2] },
  };
}
point.duration = 3.6;

// Crisp: spine stacked, chin up, right hand solved onto the brow (11, 152) with
// the elbow out. The only motion in it is the chest, so it doesn't go statue.
export function salute(t) {
  const breath = Math.sin((t * 2 * Math.PI) / salute.duration);
  return {
    Hips: { position: [0, 0.3 * breath, 0] },
    Spine02: { rotation: [-1, 0, 0] },
    Spine01: { rotation: [-2 + 0.5 * breath, 0, 0] },
    Spine: { rotation: [-4 + 1.4 * breath, 0, 0] },
    neck: { rotation: [-3, 0, 0] },
    Head: { rotation: [-6, 0, 0] }, // chin up
    RightArm: { rotation: [26 + 0.6 * breath, 0, -88] },
    RightForeArm: { rotation: [0, 0, -128] },
    RightHand: { rotation: [0, 0, -14] },
    // Off arm pinned to the seam of the trouser.
    LeftArm: { rotation: [DOWN + 4 + 0.3 * breath, 0, 4] },
    LeftForeArm: { rotation: [0, 0, 8] },
  };
}
salute.duration = 3;

// Shoulders and forearms come up together, hands out to ±34 palm-up at chest
// height, the head tilts with them — then the whole thing settles back down.
export function shrug(t) {
  const s = Math.sin(Math.PI * (t / shrug.duration)); // 0 at both ends
  const r = s * s * (3 - 2 * s); // rise, hold, settle
  return {
    Hips: { position: [0, -0.8 * r, 0] },
    Spine02: { rotation: [1 * r, 0, 0] },
    Spine01: { rotation: [2 * r, 0, 0] },
    Spine: { rotation: [4 * r, 0, 0] },
    neck: { rotation: [2 * r, 0, 3 * r] },
    Head: { rotation: [3 * r, 6 * r, 9 * r] },
    RightShoulder: { rotation: [-12 * r, 0, 0] },
    LeftShoulder: { rotation: [-11 * r, 0, 0] },
    RightArm: { rotation: [64 - 16 * r, 0, -6 - 18 * r] },
    RightForeArm: { rotation: [0, -14 * r, -14 - 48 * r] },
    RightHand: { rotation: [0, 0, -10 * r] },
    LeftArm: { rotation: [64 - 14 * r, 0, 6 + 10 * r] },
    LeftForeArm: { rotation: [0, 14 * r, 14 + 52 * r] },
    LeftHand: { rotation: [0, 0, 10 * r] },
  };
}
shrug.duration = 2.2;

// A formal bow: the fold is at the waist and carries the whole spine (the head
// drops from 158 to 150 and 22 forward), the right hand crosses to the far side
// of the chest, the left opens back behind. Holds at the bottom, then rises.
export function bowGreet(t) {
  const p = t / bowGreet.duration;
  const d = ph(p, 0, 0.3) * (1 - ph(p, 0.62, 1));
  return {
    Hips: { rotation: [0, 4 * d, 0], position: [0, -1.4 * d, 0] },
    Spine02: { rotation: [12 * d, 0, 0] },
    Spine01: { rotation: [16 * d, 2 * d, 0] },
    Spine: { rotation: [22 * d, 4 * d, 0] },
    neck: { rotation: [4 * d, 0, 0] },
    Head: { rotation: [6 * d, 0, 0] },
    RightArm: { rotation: [DOWN - 90 * d, 0, -8 - 88 * d] },
    RightForeArm: { rotation: [0, 0, -14 - 76 * d] },
    RightHand: { rotation: [0, 0, -10 * d] },
    LeftArm: { rotation: [DOWN + 4 + 6 * d, 0, 8 - 26 * d] },
    LeftForeArm: { rotation: [0, 0, 12 - 6 * d] },
    // Knees soften or the fold reads as a fall.
    RightUpLeg: { rotation: [-10 * d, 0, 0] },
    LeftUpLeg: { rotation: [-10 * d, 0, 0] },
    RightLeg: { rotation: [-6 * d, 0, 0] },
    LeftLeg: { rotation: [-6 * d, 0, 0] },
  };
}
bowGreet.duration = 1.6;

// Weight cocked onto one hip, knuckles solved onto the chin (3, 149), the other
// arm folded up across the ribs under that elbow. The head tilts slowly.
export function think(t) {
  const a = (t * 2 * Math.PI) / think.duration;
  const sway = Math.sin(a);
  const breath = Math.sin(a * 2);
  return {
    Hips: { rotation: [0, 6, 5], position: [0, -0.6 + 0.4 * breath, 0] },
    Spine02: { rotation: [2, 3, -3] },
    Spine01: { rotation: [3 + 0.5 * breath, 5, -4] },
    Spine: { rotation: [5 + 1.6 * breath, 8, -5] },
    neck: { rotation: [2, 4, 3] },
    Head: { rotation: [4 + 1.2 * sway, 6 + 3 * sway, 6 + 3 * sway] },
    RightArm: { rotation: [18 + 1 * sway, 0, -90] },
    RightForeArm: { rotation: [0, 0, -138] },
    RightHand: { rotation: [0, 0, -12] },
    LeftArm: { rotation: [50, 0, 64] },
    LeftForeArm: { rotation: [0, 0, 104] },
    LeftHand: { rotation: [0, 0, 8] },
    RightUpLeg: { rotation: [-2, 0, -4] },
    LeftUpLeg: { rotation: [2, 0, 3] },
    RightLeg: { rotation: [-6, 0, 0] },
  };
}
think.duration = 3;

// --- dancing ----------------------------------------------------------------

// One weight shift per cycle, two beats of bounce inside it. Hips turn one way
// while the chest turns the other, the arms swing in opposite phase (each hand
// travelling 104 → 140 and back), and the shoulders run late so nothing lands
// all at once.
export function dance(t) {
  const a = (t * 2 * Math.PI) / dance.duration;
  const sway = Math.sin(a);
  const beat = Math.sin(a * 2);
  const lead = Math.sin(a + 0.9); // the leading shoulder, off phase
  return {
    Hips: { rotation: [0, 14 * sway, 8 * sway], position: [0, -1 + 1.8 * beat, 0] },
    Spine02: { rotation: [0, -5 * sway, -3 * sway] },
    Spine01: { rotation: [1.5 * beat, -10 * sway, -4 * sway] },
    Spine: { rotation: [3 * beat, -18 * sway, -6 * sway] }, // chest counter-turns
    neck: { rotation: [-2, 6 * sway, 0] },
    Head: { rotation: [-4 + 5 * beat, 10 * sway, 4 * lead] },
    RightShoulder: { rotation: [-6 * lead, 0, 0] },
    LeftShoulder: { rotation: [6 * lead, 0, 0] },
    RightArm: { rotation: [DOWN - 42 - 26 * sway, 0, -30 - 16 * sway] },
    RightForeArm: { rotation: [0, 0, -40 - 18 * sway] },
    LeftArm: { rotation: [DOWN - 42 + 26 * sway, 0, 30 - 16 * sway] },
    LeftForeArm: { rotation: [0, 0, 40 - 18 * sway] },
    RightUpLeg: { rotation: [-4 * beat, 0, -5 * sway] },
    LeftUpLeg: { rotation: [4 * beat, 0, -5 * sway] },
    RightLeg: { rotation: [-10 - 8 * beat, 0, 0] },
    LeftLeg: { rotation: [-10 + 8 * beat, 0, 0] },
  };
}
dance.duration = 1.8;

// Bigger and looser: both hands up over the head (~176), the chest carrying a
// 38° turn with the hips arriving late behind it, knees on the off-beat.
export function danceSpin(t) {
  const a = (t * 2 * Math.PI) / danceSpin.duration;
  const turn = Math.sin(a); // the chest through the turn
  const sway = Math.sin(a - 0.8); // hips trail the chest
  const beat = Math.sin(a * 2);
  return {
    Hips: { rotation: [0, 26 * sway, 12 * sway], position: [0, -0.8 + 2.2 * beat, 0] },
    Spine02: { rotation: [0, 12 * turn, -4 * turn] },
    Spine01: { rotation: [-2 + 1.5 * beat, 24 * turn, -6 * turn] },
    Spine: { rotation: [-8 + 3 * beat, 38 * turn, -8 * turn] },
    neck: { rotation: [-3, 8 * turn, 0] },
    Head: { rotation: [-10 + 4 * beat, 22 * turn, 6 * sway] },
    // Straight overhead — |Z| stays small or the lift folds forward instead.
    RightArm: { rotation: [-88 + 8 * turn, 0, -10 - 8 * turn] },
    RightForeArm: { rotation: [0, 0, -26 - 14 * turn] },
    RightHand: { rotation: [0, 0, -10 * turn] },
    LeftArm: { rotation: [-84 - 8 * turn, 0, 10 - 8 * turn] },
    LeftForeArm: { rotation: [0, 0, 26 - 14 * turn] },
    LeftHand: { rotation: [0, 0, 10 * turn] },
    RightUpLeg: { rotation: [-6 * beat, 0, -8 * sway] },
    LeftUpLeg: { rotation: [6 * beat, 0, -8 * sway] },
    RightLeg: { rotation: [-12 - 6 * beat, 0, 0] },
    LeftLeg: { rotation: [-12 + 6 * beat, 0, 0] },
  };
}
danceSpin.duration = 2.4;

// --- feeling ----------------------------------------------------------------

// Head thrown back, two heaves of the chest per cycle, the right hand clapped
// to the belly (solved to 11, 118) and the left flung out loose.
export function laugh(t) {
  const a = (t * 2 * Math.PI) / laugh.duration;
  const heave = Math.sin(a * 2);
  const rock = Math.sin(a);
  return {
    Hips: { rotation: [0, -3 * rock, 0], position: [0, -0.6 + 1.4 * heave, 0] },
    Spine02: { rotation: [-3 - 2 * heave, 0, 0] },
    Spine01: { rotation: [-6 - 3 * heave, -2 * rock, 0] },
    Spine: { rotation: [-12 - 5 * heave, -4 * rock, 2 * rock] }, // chest open
    neck: { rotation: [-8 - 2 * heave, 0, 0] },
    Head: { rotation: [-22 - 6 * heave, 3 * rock, 0] }, // head back
    RightArm: { rotation: [98 + 2 * heave, 0, 14] },
    RightForeArm: { rotation: [0, 0, -82 - 8 * heave] },
    RightHand: { rotation: [0, 0, -10] },
    LeftArm: { rotation: [DOWN - 28 - 8 * heave, 0, 22 + 6 * rock] },
    LeftForeArm: { rotation: [0, 0, 34 + 10 * heave] },
    RightUpLeg: { rotation: [3 + 1.5 * heave, 0, 0] },
    LeftUpLeg: { rotation: [3 + 1.5 * heave, 0, 0] },
    RightLeg: { rotation: [-8 - 4 * heave, 0, 0] },
    LeftLeg: { rotation: [-8 - 4 * heave, 0, 0] },
  };
}
laugh.duration = 1.4;

// Folded over, both hands solved onto the face (±9, 148), and the sobs arrive
// as a burst of four short shakes that fades across the cycle instead of
// ticking evenly.
export function cry(t) {
  const a = (t * 2 * Math.PI) / cry.duration;
  const sob = (0.55 + 0.45 * Math.cos(a)) * Math.sin(a * 4);
  const breath = Math.sin(a);
  return {
    Hips: { position: [0, -1.6 + 0.8 * sob, 0] },
    Spine02: { rotation: [6 + 1.5 * sob, 0, 0] },
    Spine01: { rotation: [9 + 2 * sob, -2, -2] },
    Spine: { rotation: [16 + 3 * sob + 1.2 * breath, -3, -3] },
    neck: { rotation: [6, 0, 2] },
    Head: { rotation: [20 + 2 * sob, -4, 4] }, // head down
    RightShoulder: { rotation: [-8 - 4 * sob, 0, 0] },
    LeftShoulder: { rotation: [-7 - 4 * sob, 0, 0] },
    RightArm: { rotation: [22 + 2 * sob, 0, -102] },
    RightForeArm: { rotation: [0, 0, -138] },
    RightHand: { rotation: [0, 0, -8] },
    LeftArm: { rotation: [18 - 2 * sob, 0, 108] },
    LeftForeArm: { rotation: [0, 0, 128] },
    LeftHand: { rotation: [0, 0, 8] },
    RightUpLeg: { rotation: [4, 0, 0] },
    LeftUpLeg: { rotation: [4, 0, 0] },
    RightLeg: { rotation: [-10, 0, 0] },
    LeftLeg: { rotation: [-8, 0, 0] },
  };
}
cry.duration = 2.6;

// Insolent: weight cocked onto one leg, chest pushed out, chin up and turned
// away, one hand parked on the hip while the other beckons twice a cycle —
// the forearm curling 36° in and out at chest height.
export function taunt(t) {
  const a = (t * 2 * Math.PI) / taunt.duration;
  const curl = 0.5 - 0.5 * Math.cos(a * 2); // two beckons per cycle
  const rock = Math.sin(a);
  return {
    Hips: { rotation: [0, -8, 7], position: [0, -0.8 + 0.5 * rock, 0] },
    Spine02: { rotation: [-3, -4, -3] },
    Spine01: { rotation: [-5 - 1 * curl, -6, -4] },
    Spine: { rotation: [-9 - 2 * curl, -10, -5] }, // chest forward
    neck: { rotation: [-4, 4, 2] },
    Head: { rotation: [-8 + 3 * curl, 8, -5] }, // chin up, cocked
    RightArm: { rotation: [44 - 6 * curl, 0, -76 - 6 * curl] },
    RightForeArm: { rotation: [0, 0, -56 - 36 * curl] },
    RightHand: { rotation: [0, 0, -12 - 14 * curl] },
    LeftArm: { rotation: [86, 0, -20] }, // hand on the hip
    LeftForeArm: { rotation: [0, 0, 44] },
    RightUpLeg: { rotation: [-2, 0, -6] },
    LeftUpLeg: { rotation: [4, 0, 4] },
    LeftLeg: { rotation: [-12, 0, 0] },
  };
}
taunt.duration = 1.8;

module.exports = {
  DOWN: DOWN,
  MANIFEST: MANIFEST,
  cheer: cheer,
  chat: chat,
  wave: wave,
  clap: clap,
  point: point,
  salute: salute,
  shrug: shrug,
  bowGreet: bowGreet,
  think: think,
  dance: dance,
  danceSpin: danceSpin,
  laugh: laugh,
  cry: cry,
  taunt: taunt,
};
