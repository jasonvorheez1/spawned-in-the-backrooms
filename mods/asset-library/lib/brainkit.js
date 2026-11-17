// Asset Library — the brain bridge. Pure, realm-neutral, and entirely optional:
// it is the small amount this shelf knows about its sibling mod, AI Brains, so
// that a body saved while it was thinking is still thinking when it is set down
// somewhere else.
//
// The rule it keeps: what a brain WORKS OUT is thrown away, what the creator
// DECIDED travels. A patrol route, a home post, who the body is about, the knob
// values on the plate — those were authored, so they ride in the set. Which leg
// of the route it was on, which way it dodged last tick, how long it has left to
// rest — those are the brain's private working-out and are always dropped, so a
// dropped copy starts as clean as a brain dropped by hand.
//
// Places move. A route pinned around the old courtyard would be nonsense in the
// new one, so every world point is stored RELATIVE to the set's anchor and put
// back relative to wherever the set lands. The marker key below says a row was
// packed that way; a row without it is left exactly as it was found (old sets
// saved before this bridge existed carry absolute points and are never moved).
//
// Nothing here requires anything from AI Brains — if that mod isn't installed,
// none of these keys mean anything to anybody and the body just stands there.

// The vocabulary a body wears while it is thinking. Authored, so it travels.
// (brainGoal is in AI Brains' BRAIN_KEYS but is the running brain's own scratch,
// so it lives in SCRATCH below.)
const KEEP = ["brain", "brainParams", "brainTarget", "brainRoute", "brainLoop", "brainHome"];

// The working-out. Always dropped on capture.
const SCRATCH = [
  "brainGoal",
  "brainGait",
  "brainRest",
  "brainRestUntil",
  "brainAxis",
  "brainLeg",
  "brainDir",
  "brainSide",
  "brainMark",
  "brainPanic",
  "brainHomeYaw",
  "brainReturning",
  "brainHunt",
  "brainSeen",
  "brainLost",
  "brainLook",
  "brainDoor",
];

// Set on a packed row: "the world points in here are offsets from the anchor."
const REL = "brainRel";

// A brain's script reads .../ai/<slug>.js — that shape is how a saved behavior
// row is recognised as a brain without asking the other mod anything.
const BRAIN_FILE = /(^|\/)ai\/[a-z0-9-]+\.js$/i;

export function isBrainScript(path) {
  return BRAIN_FILE.test(String(path || ""));
}

export function num(v, dflt) {
  const n = Number(v);
  return isFinite(n) ? n : dflt;
}

export function r3(v) {
  const n = Number(v);
  return isFinite(n) ? Math.round(n * 1000) / 1000 : 0;
}

export function isPoint(p) {
  return !!p && typeof p === "object" && isFinite(Number(p.x)) && isFinite(Number(p.z));
}

export function shift(p, dx, dy, dz) {
  const out = { x: r3(num(p.x, 0) + dx), z: r3(num(p.z, 0) + dz) };
  if (isFinite(Number(p.y))) out.y = r3(num(p.y, 0) + dy);
  return out;
}

export function shiftList(list, dx, dy, dz) {
  const out = [];
  for (const p of list || []) if (isPoint(p)) out.push(shift(p, dx, dy, dz));
  return out;
}

// ---- capture ---------------------------------------------------------------
// state as it should be written into a set row. `anchor` is the set's own
// origin, `memberOf(id)` answers which member index another body is (or -1),
// so "this guard is about that captain" survives the trip as a relationship
// rather than as an entity id that will not exist over there.
export function packState(state, anchor, memberOf) {
  const src = state && typeof state === "object" ? state : null;
  if (!src) return null;
  const out = {};
  for (const k of Object.keys(src)) {
    if (SCRATCH.indexOf(k) >= 0) continue;
    if (src[k] === undefined) continue;
    out[k] = src[k];
  }
  if (!out.brain) return Object.keys(out).length ? out : null;

  const a = anchor || { x: 0, y: 0, z: 0 };
  if (isPoint(out.brainHome)) out.brainHome = shift(out.brainHome, -num(a.x, 0), -num(a.y, 0), -num(a.z, 0));
  if (Array.isArray(out.brainRoute)) out.brainRoute = shiftList(out.brainRoute, -num(a.x, 0), -num(a.y, 0), -num(a.z, 0));
  const t = out.brainTarget;
  if (t && typeof t === "object" && t.kind === "body" && t.id) {
    const idx = typeof memberOf === "function" ? memberOf(String(t.id)) : -1;
    out.brainTarget = idx >= 0 ? { kind: "body", id: String(t.id), member: idx } : { kind: "body", id: String(t.id) };
  }
  out[REL] = 1;
  return out;
}

// ---- placement -------------------------------------------------------------
// state as it should be spawned. `point` is where the set landed, `idAt(index)`
// gives the id the piece at that index was spawned under.
export function unpackState(state, point, idAt, hasBody) {
  const src = state && typeof state === "object" ? state : null;
  if (!src) return null;
  const out = {};
  for (const k of Object.keys(src)) {
    if (k === REL) continue;
    if (SCRATCH.indexOf(k) >= 0) continue;
    out[k] = src[k];
  }
  if (!out.brain || !src[REL]) return Object.keys(out).length ? out : null;

  const p = point || { x: 0, y: 0, z: 0 };
  if (isPoint(out.brainHome)) out.brainHome = shift(out.brainHome, num(p.x, 0), num(p.y, 0), num(p.z, 0));
  if (Array.isArray(out.brainRoute)) out.brainRoute = shiftList(out.brainRoute, num(p.x, 0), num(p.y, 0), num(p.z, 0));

  const t = out.brainTarget;
  if (t && typeof t === "object" && t.kind === "body") {
    let id = "";
    if (typeof t.member === "number" && typeof idAt === "function") id = String(idAt(t.member) || "");
    // Nobody new to be about, but the original is still standing? Keep it.
    if (!id && t.id && typeof hasBody === "function" && hasBody(String(t.id))) id = String(t.id);
    // Otherwise the body is about the player again — the vocabulary's default —
    // rather than about a name that isn't there.
    out.brainTarget = id ? { kind: "body", id: id } : { kind: "player" };
  }
  return out;
}

// Strip the brain vocabulary entirely: what a member's state becomes when the
// AI Brains mod isn't installed here, so a body lands as plain scenery instead
// of carrying keys nothing will ever read.
export function stripBrain(state) {
  const src = state && typeof state === "object" ? state : null;
  if (!src) return null;
  const out = {};
  for (const k of Object.keys(src)) {
    if (k === REL || KEEP.indexOf(k) >= 0 || SCRATCH.indexOf(k) >= 0) continue;
    out[k] = src[k];
  }
  return Object.keys(out).length ? out : null;
}

// What brain a saved member is wearing, for the card face. "" = none.
export function brainOf(member) {
  const st = member && member.state;
  const slug = st && st.brain;
  return slug ? String(slug) : "";
}

// Every brain in a set, in order, no repeats — the line a set card shows.
export function brainsIn(members) {
  const out = [];
  for (const m of members || []) {
    const b = brainOf(m);
    if (b && out.indexOf(b) < 0) out.push(b);
  }
  return out;
}

export function prettyBrain(slug) {
  return String(slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

module.exports = {
  KEEP,
  SCRATCH,
  REL,
  isBrainScript,
  packState,
  unpackState,
  stripBrain,
  brainOf,
  brainsIn,
  prettyBrain,
};
