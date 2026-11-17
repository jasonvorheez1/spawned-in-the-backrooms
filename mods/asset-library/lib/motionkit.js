// Asset Library — putting an authored motion ON a body, and taking it back off.
//
// The world half of the Motions shelf. god.js calls it from the drop, from the
// selection buttons and from the script-side "assetLibrary" verbs, so every
// road into a motion runs the same code: find the body under the thing that was
// aimed at, write state.motion on it, and make sure motion-play.js is riding it.
//
// It knows nothing about the panel and nothing about the clips themselves —
// lib/motions.js is the registry, motion-play.js is the player. This file is
// only the hand that puts one on the other.

const M = require("lib/motions.js");

// motion-play.js, wherever this install keeps it (scripts/ in the workshop,
// mods/ once the mod is installed).
export function playPath(api) {
  const all = (api.listScripts && api.listScripts()) || [];
  return all.find((p) => /asset-library\/motion-play\.js$/.test(p)) || "scripts/asset-library/motion-play.js";
}

// A click can land on a child mesh of an assembly; the motion belongs on the
// entity that owns the skeleton, so walk up until something wears a model.
export function wears(view) {
  const p = (view) || {};
  return !!(p.model || p.mixer);
}

export function bodyRoot(api, id) {
  let at = String(id || "");
  for (let hop = 0; at && hop < 6; hop++) {
    const view = api.getObject(at);
    if (view && wears(view)) return at;
    let up = null;
    try {
      up = api.getParent ? api.getParent(at) : null;
    } catch (e) {
      up = null;
    }
    const next = typeof up === "string" ? up : up && up.id;
    if (!next || next === at) break;
    at = next;
  }
  return null;
}

export function nameOf(api, id) {
  const view = api.getObject(id);
  const st = (view && view.state) || {};
  return String(st.critterName || st.assetName || id || "that body");
}

export function persist(api, work) {
  if (typeof api.withPersistence === "function") {
    api.withPersistence(work);
    return;
  }
  work();
}

// ---- keeping the player ON the body --------------------------------------
// Two writes, one gesture. api.addBehavior compiles motion-play.js onto the live
// entity — nothing else does that — but the ref it leaves is runtime bookkeeping
// the next authored def re-apply is entitled to clear (engine, :
// authored binding wins). Measured 2026-08-27 on the ai-brains half: a script
// attached that way read back out of the body's own spec as `behavior: []`. So
// the attach is followed by the durable half — the body's behavior list, written
// as a spec field inside the same lane, MERGED so idle.js, a brain and its plate
// all stay exactly where they were.
export function behaviorsOf(api, id) {
  let spec = null;
  try {
    spec = api.getObjectSpec ? api.getObjectSpec(id) : null;
  } catch (e) {
    spec = null;
  }
  const raw = spec ? spec.behavior : null;
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

export function mergeBehaviors(base, add, drop) {
  const gone = {};
  for (const s of drop || []) {
    const v = String(s || "").trim();
    if (v) gone[v] = true;
  }
  const out = [];
  for (const value of (base || []).concat(add || [])) {
    const s = String(value || "").trim();
    if (!s || gone[s] || out.indexOf(s) >= 0) continue;
    out.push(s);
  }
  return out;
}

export function keepList(api, id, list) {
  try {
    api.setObjectProperty(id, "behavior", list);
  } catch (e) {
    /* no spec row of its own: the live attach still stands */
  }
  return list;
}

// Put a motion on a body. `id` may be any entity the creator aimed at.
// Answers { ok, id, key, label, was, name } or { ok:false, why }:
//   "unknown" — no such motion key in the registry
//   "nothing" — the drop hit the ground, the sky, or an entity that is gone
//   "nobody"  — it hit a thing with no body to animate (a crate, a plane, a light)
export function applyMotion(api, id, key, opts) {
  const row = M.rowFor(key);
  if (!row) return { ok: false, why: "unknown", key: String(key || "") };
  if (!id) return { ok: false, why: "nothing", key: row.key };
  const target = bodyRoot(api, id);
  if (!target) return { ok: false, why: "nobody", key: row.key, hit: String(id) };
  const was = (api.getObjectState(target) || {}).motion || null;
  const loop = (opts && opts.loop) || row.loop || "loop";
  const play = playPath(api);
  // Authored, not runtime: a body wearing a motion should still be wearing it
  // after a rebuild, the same way a placed asset stays placed. Read the list it
  // already wears BEFORE the lane opens — a read taken after a write in the same
  // call can still describe the world from before it.
  const list = mergeBehaviors(behaviorsOf(api, target), [play], null);
  persist(api, () => {
    api.patchObjectState(target, { motion: row.key, motionLoop: loop });
    api.addBehavior(target, play);
    keepList(api, target, list);
  });
  return { ok: true, id: target, key: row.key, label: row.label, loop, was, name: nameOf(api, target), script: play };
}

// Take the motion back off. state.motion clears; motion-play.js sees the change
// on its next pass and hands the body back to its own idle clip — so the player
// stays attached and idle rather than being torn off mid-pose (removing it
// while the channel is up would leave the pose frozen with nobody to clear it).
// No behavior comes OFF here on purpose (motion-play.js stays and hands the body
// back to its idle clip), so there is no durable behavior write to mirror — only
// the state clears. If this ever starts calling removeBehavior it owes the
// mirror write too: keepList(api, target, mergeBehaviors(behaviorsOf(api,
// target), null, [play])).
export function clearMotion(api, id) {
  if (!id) return { ok: false, why: "nothing" };
  const target = bodyRoot(api, id) || String(id);
  const st = api.getObjectState(target) || {};
  if (!st.motion) return { ok: false, why: "bare", id: target, name: nameOf(api, target) };
  const was = st.motion;
  persist(api, () => {
    api.patchObjectState(target, { motion: null, motionLoop: null });
  });
  return { ok: true, id: target, was, name: nameOf(api, target) };
}

// What a body is wearing right now — used by the panel's feedback line.
export function motionOn(api, id) {
  const st = (id && api.getObjectState(bodyRoot(api, id) || id)) || {};
  return st.motion || null;
}

module.exports = {
  playPath,
  bodyRoot,
  applyMotion,
  clearMotion,
  motionOn,
};
