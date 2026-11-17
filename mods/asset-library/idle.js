// Placed rigged models breathe instead of standing in a T-pose. The clip name
// rides in on state.clip when the Assets shelf drops the body.
//
// The catch this fixes: a freshly placed body has no skeleton yet — the model
// is still being fetched — so an onSpawn-only updateChannel binds to nothing
// and the body stands frozen forever. So we keep asking until the rig is
// actually there, then stop asking.

const CHANNEL = "base";
const tries = {};
const GIVE_UP = 120; // ~60s of half-second checks; a model that never serves stops costing ticks

export const updateSchedule = { every: { seconds: 0.5 } };

export function arm(api) {
  const st = api.getState() || {};
  // A motion card is on this body — motion-play owns the mixer, hands off.
  if (st.motion) return true;
  const clip = st.clip;
  if (!clip) return true;

  const bones = (api.getBones && api.getBones()) || [];
  if (!bones.length) return false; // model hasn't served yet

  api.updateChannel(CHANNEL, { clip: clip, loop: "loop", weight: 1 });
  const ch = api.getChannel && api.getChannel(CHANNEL);
  // A bound clip reports a real duration; a name the rig doesn't carry doesn't.
  return !!(ch && ch.duration);
}

// Spawned inside a transaction, setUpdateSchedule exists but refuses; the
// declared `updateSchedule` above already covers us, so a refusal is harmless.
export function standDown(api) {
  if (!api.setUpdateSchedule) return;
  try {
    api.setUpdateSchedule(null);
  } catch (e) {
    /* transactional spawn — the declared schedule stands */
  }
}

export function onSpawn(api) {
  if (arm(api)) standDown(api);
}

export function update(api, dt) {
  const n = (tries[api.id] || 0) + 1;
  tries[api.id] = n;
  if (arm(api) || n >= GIVE_UP) {
    delete tries[api.id];
    standDown(api);
  }
}

export function onDestroy(api) {
  delete tries[api.id];
}
