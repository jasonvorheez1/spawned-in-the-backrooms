// Rig-free body language for creatures the conjuring pipeline sent back as one
// static lump. Humanoid conjures come home skinned with a full clip set; a wolf,
// a wyvern, a sand wurm come home as a single mesh node with no skeleton and no
// animations at all — so a mixer has nothing to play and the body stands there
// like furniture.
//
// This is the other half: a small library of GAITS, shared across every
// creature, that move the whole body instead of its bones. Bob, sway, bank,
// squash, the occasional hop. It reads much more alive than a frozen mesh, it
// costs nothing to reuse, and it stacks with a brain: the brain walks the body
// around, this makes the body look like it's doing the walking.
//
// The one law here: NEVER own what someone else writes. Every tick reads the
// body's current position and yaw, subtracts the wobble this script added last
// tick, and writes the base back with a fresh wobble on top. So a god-mode drag,
// a brain's turnToward, a walk() step all survive untouched.

const V = require("builtin/vec3");
const M = require("builtin/math");

// Each gait is one animal's idea of standing still.
//   bob    metres the body rises and falls        bobHz   times a second
//   roll   degrees it leans side to side          pitch   degrees it nods
//   yaw    degrees it looks around                squash  scale pulse, 0-1
//   moveBob / moveHz  what the same body does once it's actually moving
const GAITS = {
  // four legs, weight over them — a slow breathing sway that becomes a trot
  quadruped: { bob: 0.04, bobHz: 0.9, roll: 2.2, rollHz: 0.5, pitch: 1.4, pitchHz: 0.8, yaw: 2.5, yawHz: 0.21, squash: 0.018, moveBob: 0.085, moveHz: 2.5, lean: 5 },
  // small and twitchy: quick pulse, sharp looks, the odd hop
  bird: { bob: 0.022, bobHz: 1.9, roll: 1.6, rollHz: 1.3, pitch: 2.6, pitchHz: 1.6, yaw: 8, yawHz: 0.55, squash: 0.02, moveBob: 0.05, moveHz: 3.4, lean: 4, hop: 0.3, hopEvery: 4.5 },
  // no legs at all: the whole length travels in one long wave
  serpent: { bob: 0.05, bobHz: 0.6, roll: 5, rollHz: 0.45, pitch: 2, pitchHz: 0.3, yaw: 6, yawHz: 0.37, squash: 0.03, moveBob: 0.1, moveHz: 1.3, lean: 3 },
  // wings: it never quite settles, and it banks into every turn
  flyer: { bob: 0.11, bobHz: 0.62, roll: 5.5, rollHz: 0.34, pitch: 3.4, pitchHz: 0.44, yaw: 3, yawHz: 0.2, squash: 0.02, moveBob: 0.22, moveHz: 1.1, lean: 8, bank: 22 },
  // a bag of liquid — mostly squash, barely any tilt
  blob: { bob: 0.05, bobHz: 0.75, roll: 1.2, rollHz: 0.5, pitch: 0.8, pitchHz: 0.4, yaw: 2, yawHz: 0.3, squash: 0.09, moveBob: 0.11, moveHz: 1.9, lean: 2 },
  // many legs: almost no bob, constant micro-jitter
  insect: { bob: 0.015, bobHz: 2.3, roll: 1.4, rollHz: 1.8, pitch: 1, pitchHz: 2.1, yaw: 4, yawHz: 0.8, squash: 0.01, moveBob: 0.035, moveHz: 4.2, lean: 3, jitter: 1.2 },
  // in water: roll and yaw carry it, the bob is the surface
  swimmer: { bob: 0.06, bobHz: 0.65, roll: 4, rollHz: 0.85, pitch: 1.6, pitchHz: 0.6, yaw: 7, yawHz: 0.85, squash: 0.02, moveBob: 0.06, moveHz: 1.6, lean: 4 },
  // rooted things and heavy things: a long slow lean, nothing sudden
  plant: { bob: 0.02, bobHz: 0.3, roll: 1.6, rollHz: 0.24, pitch: 1, pitchHz: 0.19, yaw: 1, yawHz: 0.11, squash: 0.008, moveBob: 0.03, moveHz: 0.8, lean: 2 },
  hulk: { bob: 0.045, bobHz: 0.5, roll: 1.6, rollHz: 0.36, pitch: 1.2, pitchHz: 0.3, yaw: 1.5, yawHz: 0.15, squash: 0.012, moveBob: 0.1, moveHz: 1.5, lean: 4 },
};

// A creature with no gait written on it still gets the right one: its own name
// says what shape it is. Longest, most specific words first.
const BY_WORD = [
  ["wurm|worm|snake|serpent|naga|eel|slither", "serpent"],
  ["wyvern|dragon|drake|bat|harpy|raven|crow|owl|hawk|eagle|moth|wasp|bee|fair|sprite|wisp", "flyer"],
  ["duck|goose|swan|fish|shark|frog|toad|newt|otter|seal|turtle|crab|squid|octo|tentacle|deep.one", "swimmer"],
  ["hen|chick|rooster|bird|pigeon|parrot|penguin", "bird"],
  ["spider|scorpion|beetle|ant|centipede|roach|mantis|tick|louse", "insect"],
  ["ooze|slime|jelly|pudding|blob|sporeling|mold|fungus", "blob"],
  ["treant|ent|shrub|sapling|vine|mushroom|stone|golem|statue|gargoyle|totem", "plant"],
  ["troll|ogre|giant|behemoth|colossus|brute|minotaur", "hulk"],
  ["wolf|dog|cat|fox|bear|boar|deer|horse|cow|pig|sheep|goat|rabbit|hare|rat|mouse|lion|tiger|hound|beast|basilisk|lizard|croc|ram|bull|donkey|mule|llama|camel", "quadruped"],
];

export function gaitFor(name) {
  const s = String(name || "").toLowerCase();
  for (const row of BY_WORD) if (new RegExp(row[0]).test(s)) return row[1];
  return "quadruped";
}

export function baseScale(value) {
  if (typeof value === "number") return { x: value, y: value, z: value };
  if (value && typeof value === "object") {
    return { x: Number(value.x) || 1, y: Number(value.y) || 1, z: Number(value.z) || 1 };
  }
  return { x: 1, y: 1, z: 1 };
}

export function yawOf(rot) {
  if (!rot) return 0;
  if (typeof rot === "number") return rot;
  if (typeof rot.yaw === "number") return rot.yaw;
  try {
    const e = V.eulerFromRotation(rot);
    return Number(e && (e.yaw !== undefined ? e.yaw : e.y)) || 0;
  } catch (err) {
    return 0;
  }
}

export function onSpawn(api) {
  const st = api.getState() || {};
  const model = api.getProperty("model");
  const url = typeof model === "string" ? model : (model && model.id) || "";
  const key = st.gait && GAITS[st.gait] ? st.gait : gaitFor(st.critterName || url || api.id);
  api.patchState({
    gait: key,
    // Every creature starts somewhere else in its own cycle, or a row of wolves
    // breathes in lockstep like a chorus line.
    phase: api.random() * 100,
    lift: 0,
    wob: 0,
    hopT: 2 + api.random() * 4,
    hopUp: 0,
    lastX: null,
    lastZ: null,
    spd: 0,
    scale0: baseScale(api.getProperty("scale")),
  });
}

export function update(api, dt) {
  const st = api.getState() || {};
  const g = GAITS[st.gait] || GAITS.quadruped;
  const step = Math.min(dt || 0.016, 0.1);
  const t = (Number(st.phase) || 0) + step;

  const pos = api.getProperty("feetPosition") || { x: 0, y: 0, z: 0 };
  const x = Number(pos.x) || 0;
  const y = Number(pos.y) || 0;
  const z = Number(pos.z) || 0;

  // How fast is something else carrying this body around? That decides whether
  // it breathes or trots.
  let spd = Number(st.spd) || 0;
  if (st.lastX !== null && st.lastX !== undefined) {
    const dx = x - st.lastX;
    const dz = z - st.lastZ;
    const inst = Math.sqrt(dx * dx + dz * dz) / step;
    spd = M.lerp(spd, Math.min(inst, 8), 0.25);
  }
  const go = M.clamp(spd / 2.2, 0, 1);

  // The wobble itself.
  const hz = M.lerp(g.bobHz, g.moveHz || g.bobHz * 2, go);
  const amp = M.lerp(g.bob, g.moveBob || g.bob * 2, go);
  const w = t * Math.PI * 2;
  let lift = Math.abs(Math.sin(w * hz)) * amp - amp * 0.4;

  // A hop for the small twitchy ones, on its own clock.
  let hopT = Number(st.hopT) || 0;
  let hopUp = Number(st.hopUp) || 0;
  if (g.hop) {
    hopT -= step;
    if (hopT <= 0) {
      hopUp = 1;
      hopT = (g.hopEvery || 5) * (0.6 + api.random() * 0.9);
    }
    if (hopUp > 0) {
      hopUp = Math.max(0, hopUp - step * 3.2);
      lift += Math.sin(hopUp * Math.PI) * g.hop;
    }
  }

  const jit = g.jitter ? Math.sin(w * 7.3) * g.jitter * (0.3 + go) : 0;
  const roll = Math.sin(w * g.rollHz) * g.roll + (g.bank ? Math.sin(w * 0.17) * g.bank * go : 0) + jit * 0.5;
  const pitch = Math.sin(w * g.pitchHz + 1.1) * g.pitch - (g.lean || 0) * go;
  const wob = Math.sin(w * g.yawHz + 2.3) * g.yaw * (1 - go * 0.7) + jit;
  const sq = g.squash ? Math.sin(w * (hz * 0.5) + 0.7) * g.squash : 0;

  // Put back what was there, then add today's wobble. Anything that moved this
  // body since the last tick keeps its move.
  const baseY = y - (Number(st.lift) || 0);
  const yaw = yawOf(api.getProperty("rotation")) - (Number(st.wob) || 0);

  api.setProperty("feetPosition", { x: x, y: baseY + lift, z: z });
  api.setProperty("rotation", { yaw: yaw + wob, pitch: pitch, roll: roll });
  if (sq) {
    const s0 = st.scale0 || { x: 1, y: 1, z: 1 };
    api.setProperty("scale", { x: s0.x * (1 - sq * 0.5), y: s0.y * (1 + sq), z: s0.z * (1 - sq * 0.5) });
  }

  api.patchState({ phase: t, lift: lift, wob: wob, spd: spd, hopT: hopT, hopUp: hopUp, lastX: x, lastZ: z });
}
