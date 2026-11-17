// Motions — snakes, slugs, worms, anything that moves as one long body.
// Same form as the other modules: named functions of time, offsets from bind
// pose, periodic over fn.duration.
//
// THE BONE CENSUS (run before a line of this was authored, 2026-08-27, serpent
// lane). Six bodies spawned/probed with api.getBones() from inside a behavior
// (a server-side bone read always answers empty — the read must happen in a
// behavior):
//
//   portrait-sand-wurm.png.glb        → 0 bones   (catalog: unrigged, gait-serpent)
//   portrait-tentacle-horror.png.glb  → 0 bones   (catalog: unrigged, gait-serpent)
//   portrait-dungeon-ooze.png.glb     → 0 bones   (catalog: unrigged, gait-blob)
//   portrait-goony-slime-guy-…glb     → 0 bones   (catalog: unrigged, gait-blob)
//   portrait-giant-cave-spider.png.glb→ 0 bones
//   portrait-dragon-wyrmling.png.glb  → 0 bones
//   portrait-city-nurse.png.glb       → 24 bones  (the shared humanoid rig)
//
// So there is no snake skeleton in this library. Every genuinely long-bodied
// model serves as a single skinless mesh — critter.js's `serpent` gait (whole
// object transform) is what moves those, not a clip. The only rig that exists
// is the 24-joint humanoid one, and these clips are authored for THAT: the
// serpent chain runs head → tail as
//
//   Head · neck · Spine · Spine01 · Spine02 · Hips · UpLeg · Leg · Foot
//
// nine links, which is enough body for a real travelling wave. Every bone named
// below is in that censused list; nothing here is invented, and there is no
// tail joint on the rig, so the legs — pressed together and carrying the wave —
// ARE the tail. Which makes these the motions for a rigged serpentine body: a
// naga, a snake-person, a hag or a deep one asked to move like an eel.
//
// The axis grammar these poses are written in (same rig, same measurements the
// combat module lists):
//   Spine/Head X   positive = fold forward / chin down, negative = arch back up
//   Spine/Hips Y   positive = twist toward the body's LEFT
//   Spine/Hips Z   the lateral side-bend — the axis a serpentine wave lives on
//   UpLeg/Leg X    the sagittal swing and the knee fold; Z is the lateral swing
//   Arm X          0 = out sideways (T-pose), +90 = straight down
//   Arm Z          composes BEFORE X: LEFT +Z forward, RIGHT −Z forward
//   Hips position  rig-local (cm-scale) units — a body bob is 1-3, not metres

// Arms pinned along the body: a serpent shows no shoulders.
const DOWN = 84;

// The shelf reads this: one row per motion, in the order they should appear.
// loop "loop" = a state the body stays in; "once" = a one-shot that freezes on
// its last frame (a held pose).
const MANIFEST = [
  { key: "sIdle", label: "Idle", group: "serpent", loop: "loop", tags: ["serpent", "rest"] },
  { key: "sSlither", label: "Slither", group: "serpent", loop: "loop", tags: ["serpent", "move"] },
  { key: "sCoil", label: "Coil", group: "serpent", loop: "loop", tags: ["serpent", "rest", "coil"] },
  { key: "sRear", label: "Rear up", group: "serpent", loop: "loop", tags: ["serpent", "threat", "watch"] },
  { key: "sStrike", label: "Strike", group: "serpent", loop: "once", tags: ["serpent", "attack"] },
];

// How wide the lateral bend runs at each link, head → tail. The head barely
// moves, the middle of the body carries the wave, the tail whips widest. Hips
// is the ROOT — bending it swings the entire body, so it stays small on purpose.
const LINK = [0.2, 0.45, 0.7, 0.9, 1.0, 0.35, 1.05, 1.2, 0.7];

// The reared silhouette, shared by sRear and sStrike so the strike recoils to
// exactly the pose it came from.
const REAR_ARCH = -13; // per spine link, chest lifted back
const REAR_NECK = 14;
const REAR_HEAD = 22; // arch + neck + head ≈ level: the head watches you
const REAR_TAIL = 16;
const REAR_KNEE = 26;

export function seg(u, a, b) {
  const v = (u - a) / (b - a);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function ease(u) {
  return u * u * (3 - 2 * u);
}

// One body, every clip. Options are DEVIATIONS from the rig's bind pose:
//   phase   where the travelling wave is right now, radians
//   amp     degrees of lateral bend at the widest link
//   lag     radians the wave falls behind per link — this is what makes it
//           TRAVEL tailward instead of bending as one rigid stick
//   twist   how much of the lateral bend feeds into spine twist (the body
//           rolling into its own curve, which is what a real snake does)
//   headHold  how much of the neck's swing the head cancels — 1 = dead still
//   curl    constant same-direction bend per link: a coil, not a wave
//   arch    constant pitch per spine link (+ nose-down, − chest up)
//   neckX / headX / headY   the head on the end of the chain
//   rise    hips raised/lowered, rig-local units      breath  ribcage rise
//   tailIn  legs drawn under the body     knee  shin fold
//   hug / elbow / fin   the arms tucked along the ribs, and how much of the
//           wave they trail with
export function serpentPose(o) {
  const amp = o.amp || 0;
  const lag = o.lag === undefined ? 0.7 : o.lag;
  const ph = o.phase || 0;
  const curl = o.curl || 0;
  const arch = o.arch || 0;
  const twist = o.twist === undefined ? 0.3 : o.twist;
  const hold = o.headHold === undefined ? 0.6 : o.headHold;
  const rise = o.rise || 0;
  const breath = o.breath || 0;
  const neckX = o.neckX || 0;
  const headX = o.headX || 0;
  const headY = o.headY || 0;
  const hipsX = o.hipsX || 0;
  const tailIn = o.tailIn || 0;
  const knee = o.knee || 0;
  const arm = o.arm === undefined ? DOWN : o.arm;
  const hug = o.hug === undefined ? 10 : o.hug;
  const elbow = o.elbow === undefined ? 14 : o.elbow;
  const fin = o.fin || 0;

  const w = [];
  for (let i = 0; i < LINK.length; i++) w.push(amp * LINK[i] * Math.sin(ph - i * lag));

  // Tail links: the wave plus the coil, mirrored so both legs swing the same
  // way in the world and read as one tail instead of two legs.
  const thigh = w[6] + curl;
  const shin = w[7] + curl * 0.8;
  const foot = w[8];
  const flutter = hug + fin * w[2];

  return {
    Head: { rotation: [headX, headY, w[0] - hold * w[1]] },
    neck: { rotation: [neckX, twist * w[1] * 0.6, w[1] + curl * 0.5] },
    Spine: { rotation: [arch + breath, twist * w[2], w[2] + curl] },
    Spine01: { rotation: [arch, twist * w[3], w[3] + curl] },
    Spine02: { rotation: [arch, twist * w[4], w[4] + curl] },
    Hips: { rotation: [hipsX, 0, w[5] + curl * 0.6], position: [0, rise, 0] },
    LeftUpLeg: { rotation: [tailIn, 0, thigh] },
    RightUpLeg: { rotation: [tailIn, 0, -thigh] },
    LeftLeg: { rotation: [knee, 0, shin] },
    RightLeg: { rotation: [knee, 0, -shin] },
    LeftFoot: { rotation: [0, 0, foot] },
    RightFoot: { rotation: [0, 0, -foot] },
    LeftArm: { rotation: [arm, 0, flutter] },
    RightArm: { rotation: [arm, 0, -flutter] },
    LeftForeArm: { rotation: [-elbow, 0, 0] },
    RightForeArm: { rotation: [-elbow, 0, 0] },
  };
}

// Resting. A long slow ripple runs the length of the body and dies out at the
// head, which holds still and watches. The chest breathes on the same beat.
export function sIdle(t) {
  const a = (t * 2 * Math.PI) / sIdle.duration;
  return serpentPose({
    phase: a,
    amp: 4.5,
    lag: 0.55,
    twist: 0.25,
    headHold: 0.85,
    breath: 1.5 * Math.sin(a),
    rise: 1.2 * Math.sin(a * 2),
    headX: 1.2 * Math.sin(a - 1.2),
    headY: 3 * Math.sin(a),
    tailIn: 2,
    knee: 4,
    hug: 9,
    elbow: 12,
    fin: 0.25,
  });
}
sIdle.duration = 4;

// The full serpentine: one sine walking head-to-tail down the chain, each link
// a fifth of a cycle behind the one in front, the sweep widening all the way
// into the tail. The head stays aimed where it's going while the body writhes
// under it, and the whole length rolls into its own curve.
export function sSlither(t) {
  const a = (t * 2 * Math.PI) / sSlither.duration;
  return serpentPose({
    phase: a,
    amp: 18,
    lag: 0.95,
    twist: 0.4,
    headHold: 0.75,
    arch: 2.5,
    rise: 1.5 * Math.sin(a * 2),
    headX: 2 * Math.sin(a * 2),
    headY: 5 * Math.sin(a - 0.6),
    knee: 3,
    hug: 6,
    elbow: 10,
    fin: 0.3,
  });
}
sSlither.duration = 1.6;

// Drawn in on itself: every link bent the SAME way so the chain curls instead
// of waving, the tail gathered under, the head laid over the top of the coil
// watching sideways. It breathes, slowly, or it reads as rope.
export function sCoil(t) {
  const a = (t * 2 * Math.PI) / sCoil.duration;
  return serpentPose({
    phase: a,
    amp: 2.5,
    lag: 0.35,
    twist: 0.15,
    headHold: 0.5,
    curl: 15,
    arch: 4,
    breath: 1.8 * Math.sin(a),
    rise: -13 + 1.4 * Math.sin(a),
    headX: 15 + 2 * Math.sin(a),
    headY: 24 + 2 * Math.sin(a - 0.9),
    tailIn: 14,
    knee: 24,
    hug: 15,
    elbow: 22,
    arm: DOWN + 3,
  });
}
sCoil.duration = 3.5;

// The front third up off the ground and held there, tail gathered beneath it,
// head level and tracking you. Nothing hurries: a long sway travels down the
// standing body and the ribs lift on the same beat.
export function sRear(t) {
  const a = (t * 2 * Math.PI) / sRear.duration;
  return serpentPose({
    phase: a,
    amp: 6,
    lag: 0.4,
    twist: 0.3,
    headHold: 0.6,
    arch: REAR_ARCH,
    neckX: REAR_NECK,
    headX: REAR_HEAD + 2 * Math.sin(a),
    headY: 8 * Math.sin(a - 0.7),
    breath: 1.2 * Math.sin(a),
    rise: -6 + 1.2 * Math.sin(a * 2),
    tailIn: REAR_TAIL,
    knee: REAR_KNEE,
    hug: 14,
    elbow: 16,
    fin: 0.2,
  });
}
sRear.duration = 3;

// From the reared pose: gather back a hair, then the whole front of the body
// snaps forward and straightens out along the lunge — and recoils to exactly
// the pose it left, which is where a one-shot freezes.
export function sStrike(t) {
  const u = seg(t / sStrike.duration, 0, 1);
  const wind = ease(seg(u, 0, 0.22)) - ease(seg(u, 0.22, 0.44)); // 0 → 1 → 0
  const out = ease(seg(u, 0.22, 0.44)) - ease(seg(u, 0.44, 1)); // the lunge
  return serpentPose({
    phase: u * 2 * Math.PI,
    amp: 2.5 * Math.sin(Math.PI * u),
    lag: 0.4,
    twist: 0.3,
    headHold: 0.6,
    arch: REAR_ARCH - 9 * wind + 36 * out,
    neckX: REAR_NECK + 5 * wind - 20 * out,
    headX: REAR_HEAD + 6 * wind - 34 * out,
    hipsX: 8 * out,
    rise: -6 - 3 * wind + 5 * out,
    tailIn: REAR_TAIL + 5 * wind - 7 * out,
    knee: REAR_KNEE + 7 * wind - 11 * out,
    hug: 14 + 3 * wind - 8 * out,
    elbow: 16 - 6 * out,
  });
}
sStrike.duration = 0.6;

module.exports = {
  DOWN: DOWN,
  MANIFEST: MANIFEST,
  sIdle: sIdle,
  sSlither: sSlither,
  sCoil: sCoil,
  sRear: sRear,
  sStrike: sStrike,
};
