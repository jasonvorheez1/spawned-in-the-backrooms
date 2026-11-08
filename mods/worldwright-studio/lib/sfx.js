// json is read here and nowhere else, and nothing else in the app makes a noise. An unknown event, a muted dial and a failed clip are all a silent no-op — a sound never takes an interaction down, and muted returns before the CDN is asked.

const DATA = require("lib/data/sfx.yml");
const CONFIG = require("lib/config.js");

const EVENT_MAP = (DATA && DATA.events) || {};
const EVENTS = Object.keys(EVENT_MAP);
const CATEGORIES = (DATA && DATA.categories) || [];
const BUSES = (DATA && DATA.buses) || {};

// A repeat inside this many ms is one gesture arriving twice; per-event override: minGapMs in the JSON.
const DEFAULT_MIN_GAP_MS = 30;
// Even with every dial at maximum, nothing in this app is allowed to be loud.
const CEILING = 0.9;

// Cached per seat: play() runs inside click handlers and must not do SQL. Until a source answers we stay SILENT rather than guess loud at someone who muted on purpose.
let VOL = null; // { master, cats } once known
let VOL_FOR = "";
let ASKING = false;
const LAST = {}; // event name -> seconds of its last play

export function num(value, fallback) {
  const n = Number(value);
  return isFinite(n) ? n : fallback;
}

export function clamp01(value) {
  return Math.max(0, Math.min(1, num(value, 0)));
}

export function userIdOf(objectApi) {
  try {
    return String(objectApi.userId || "");
  } catch (e) {
    return "";
  }
}

export function shape(prefs) {
  if (!prefs || typeof prefs !== "object") return null;
  if (!Object.prototype.hasOwnProperty.call(prefs, "audioMaster")) return null;
  const cats = CONFIG.audioCategoriesOf(prefs.audioCategories);
  return { master: clamp01(num(prefs.audioMaster, 1)), cats: cats };
}

export function fromState(objectApi) {
  try {
    const ui = (objectApi.getState() || {}).ui || {};
    const cfg = ui.config && ui.config.user;
    return shape(cfg);
  } catch (e) {
    return null;
  }
}

// One read, fire and forget. A failure caches the defaults rather than leaving the app mute forever.
export function ask(objectApi) {
  if (ASKING) return;
  const id = userIdOf(objectApi);
  ASKING = true;
  try {
    const p = CONFIG.getUser(objectApi, id);
    if (!p || typeof p.then !== "function") {
      ASKING = false;
      return;
    }
    p.then(
      (prefs) => {
        ASKING = false;
        VOL = shape(prefs) || { master: 1, cats: {} };
        VOL_FOR = id;
      },
      () => {
        ASKING = false;
        VOL = { master: 1, cats: {} };
        VOL_FOR = id;
      }
    );
  } catch (e) {
    ASKING = false;
  }
}

// { master, cats, known } — known:false means "nobody has told us yet, stay quiet this once".
export function volumes(objectApi) {
  const live = fromState(objectApi);
  if (live) {
    VOL = live;
    VOL_FOR = userIdOf(objectApi);
    return { master: live.master, cats: live.cats, known: true };
  }
  const id = userIdOf(objectApi);
  if (VOL && VOL_FOR === id) return { master: VOL.master, cats: VOL.cats, known: true };
  ask(objectApi);
  return { master: 1, cats: {}, known: false };
}

export function invalidate() {
  VOL = null;
  VOL_FOR = "";
}

export function categoryVolume(cats, category) {
  if (!cats || typeof cats !== "object") return 1;
  const raw = cats[category];
  if (raw === undefined || raw === null || raw === "") return 1;
  return clamp01(num(raw, 1));
}

export function nowSeconds(objectApi) {
  try {
    const s = objectApi.seconds();
    return isFinite(s) ? s : 0;
  } catch (e) {
    return 0;
  }
}

export function jitter(objectApi, vary) {
  const v = Math.max(0, num(vary, 0));
  if (v <= 0) return 1;
  let r = 0.5;
  try {
    r = objectApi.random();
  } catch (e) {
    r = 0.5;
  }
  if (!isFinite(r)) r = 0.5;
  return 1 + (r * 2 - 1) * v;
}

// The local player, named explicitly: half the call sites are async continuations where the ambient pin is gone, and an unaddressed sound replicates to whoever is standing nearby.
export function listener(objectApi) {
  try {
    const id = String(objectApi.id || "");
    if (id) return { kind: "player", id: id };
  } catch (e) {}
  const uid = userIdOf(objectApi);
  return uid ? { kind: "player", id: uid } : undefined;
}

export function play(objectApi, eventName, opts) {
  if (!objectApi || typeof eventName !== "string") return "";
  const entry = EVENT_MAP[eventName];
  if (!entry || !entry.ref) return "";

  const o = opts || {};
  const vol = volumes(objectApi);
  if (!vol.known) return "";
  if (vol.master <= 0) return "";
  const category = String(entry.category || "ui");
  const catVol = categoryVolume(vol.cats, category);
  if (catVol <= 0) return "";

  const level = clamp01(num(entry.gain, 0.25) * vol.master * catVol * num(o.gain, 1));
  if (level <= 0.001) return "";

  const gapMs = num(o.minGapMs, num(entry.minGapMs, DEFAULT_MIN_GAP_MS));
  const t = nowSeconds(objectApi);
  if (!o.force && gapMs > 0 && t > 0) {
    const was = num(LAST[eventName], -1);
    if (was >= 0 && (t - was) * 1000 < gapMs) return "";
    LAST[eventName] = t;
  } else if (t > 0) {
    LAST[eventName] = t;
  }

  const pitch = o.pitch !== undefined ? num(o.pitch, 1) : jitter(objectApi, entry.pitchVary);
  const send = {
    volume: Math.min(CEILING, level),
    pitch: pitch,
    bus: String(o.bus || BUSES[category] || "SFX"),
    audience: listener(objectApi),
  };
  if (!send.audience) delete send.audience;
  try {
    return String(objectApi.playSound(String(entry.ref), send) || "");
  } catch (e) {
    try {
      objectApi.log("[sfx] " + eventName + " did not play: " + ((e && e.message) || e));
    } catch (e2) {}
    return "";
  }
}

export function get(eventName) {
  const entry = EVENT_MAP[String(eventName || "")];
  return entry ? Object.assign({ event: String(eventName) }, entry) : null;
}

export function eventsIn(category) {
  const want = String(category || "");
  return EVENTS.filter((name) => String((EVENT_MAP[name] || {}).category || "") === want);
}

module.exports = {
  EVENTS,
  CATEGORIES,
  EVENT_MAP,
  play,
  get,
  eventsIn,
  volumes,
  invalidate,
};
