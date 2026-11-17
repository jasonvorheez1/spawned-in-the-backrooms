// Plays an authored motion on a placed body.
//
// The shelf drops a motion card onto something standing in the world; god.js
// writes state.motion (the registry key) and attaches this. Everything else is
// looked up here: the clip is a real function out of lib/motions.js, handed
// straight to the mixer, which bakes it once into keyframes.
//
// Because every generated character shares one skeleton, the same motion plays
// on the knight, the barista and the goblin without a single re-export.

const M = require("lib/motions.js");

// The base channel steps aside while a motion is on (see apply), so nothing
// competes for these bones — weight 1 is full authority. Anything above 1
// over-drives the mixer's blend: the quaternions come out un-normalized and
// the skin shears (a head stretched into a horn is what that looks like).
const WEIGHT = 1;
const CHANNEL = "al-motion";

export function apply(api) {
  const st = api.getState() || {};
  const key = st.motion;
  const row = M.rowFor(key);
  if (!row) {
    api.updateChannel(CHANNEL, null);
    api.patchState({ motionPlaying: null });
    // Hand the body back to whatever idle it came with.
    if (st.clip) api.updateChannel("base", { clip: st.clip, loop: "loop", weight: 1, blendIn: 0.2 });
    return;
  }
  const loop = st.motionLoop || row.loop || "loop";
  // A held pose is a one-shot with no expiry: it freezes on its last frame.
  api.updateChannel(CHANNEL, {
    clip: row.fn,
    loop: loop,
    weight: WEIGHT,
    speed: Number(st.motionSpeed) || 1,
    blendIn: 0.25,
  });
  // The stock Idle would fight the motion on every shared bone, so it steps
  // aside while a motion is on.
  api.updateChannel("base", null);
  api.patchState({ motionPlaying: key });
}

export function onSpawn(api) {
  apply(api);
}

// The card can be swapped while the body stands there; catch the change without
// paying for it every frame.
export const updateSchedule = { every: { seconds: 0.4 } };

export function update(api, dt) {
  const st = api.getState() || {};
  if ((st.motion || null) !== (st.motionPlaying || null)) apply(api);
}
