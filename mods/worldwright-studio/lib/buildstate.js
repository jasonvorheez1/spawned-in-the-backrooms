// buildstate.js — WHERE THE BUILD STANDS. Worldwright Studio's OWN data, owned by the app. Worldwright Studio owns the build data; the phase-lock mod's behaviour applies to the Codex. ONE `book_settings` row on the Codex book, read once per seat and kept in module memory (his db-cost law).

const STORE = require("lib/store.js");
const GRAPH = require("lib/graph.js");
const PIN = require("lib/pinned.js");

const KEY = "build";

// 0-10, the app's build-order ladder. `code` is the honest gate: a writing phase takes no code.
const PHASES = [
  { n: 0, name: "Concept Lock", code: false },
  { n: 1, name: "Core Loop", code: false },
  { n: 2, name: "Systems & Rules", code: false },
  { n: 3, name: "Technical Plan", code: false },
  { n: 4, name: "Vertical Slice", code: true },
  { n: 5, name: "Feature Build-Out", code: true },
  { n: 6, name: "Content Population", code: true },
  { n: 7, name: "Art & Audio", code: true },
  { n: 8, name: "Polish & Juice", code: true },
  { n: 9, name: "Bug Pass & Balance", code: true },
  { n: 10, name: "Ship Prep", code: true },
];

const STATUSES = ["not-started", "in-progress", "awaiting-approval", "approved"];

let CACHE = null;
let CACHE_BOOK = "";
let READ = false;

export function text(v) {
  return v === undefined || v === null ? "" : String(v);
}

export function clampPhase(v) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(PHASES.length - 1, n));
}

// -1 means nothing approved yet — a real value, not a missing one.
export function clampApproved(v) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return -1;
  return Math.max(-1, Math.min(PHASES.length - 1, n));
}

export function phaseName(n) {
  const p = PHASES[clampPhase(n)];
  return p ? p.name : "";
}

export function allowsCode(n) {
  const p = PHASES[clampPhase(n)];
  return !!(p && p.code);
}

export function status(v) {
  const s = text(v).trim().toLowerCase();
  return STATUSES.indexOf(s) >= 0 ? s : "not-started";
}

// Every entry answers { name, status, note }; a bare string is a name.
export function list(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (let i = 0; i < v.length; i++) {
    const r = v[i];
    if (typeof r === "string") {
      const nm = text(r).trim();
      if (nm) out.push({ name: nm, status: "not-started", note: "" });
      continue;
    }
    if (!r || typeof r !== "object") continue;
    const nm = text(r.name).trim();
    if (!nm) continue;
    out.push({ name: nm, status: text(r.status).trim() || "not-started", note: text(r.note) });
  }
  return out;
}

// A real answer, not a missing one: a fresh app has not started.
export function blank() {
  return {
    phase: 0,
    phaseName: phaseName(0),
    code: allowsCode(0),
    status: "not-started",
    approvedThrough: -1,
    systems: [],
    backlog: [],
    bugs: [],
    parked: [],
    note: "",
    updatedAt: 0,
  };
}

// A corrupt row reads as the blank build with whatever survived — nothing here throws downstream.
export function normalize(raw) {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const phase = clampPhase(r.phase);
  const approved = clampApproved(r.approvedThrough);
  return {
    phase: phase,
    // The name is always derived from our ladder, never trusted off the row.
    phaseName: phaseName(phase),
    code: allowsCode(phase),
    status: status(r.status),
    approvedThrough: approved,
    systems: list(r.systems),
    backlog: list(r.backlog),
    bugs: list(r.bugs),
    parked: list(r.parked),
    note: text(r.note),
    updatedAt: Math.max(0, Math.floor(Number(r.updatedAt) || 0)),
  };
}

// The locked pinned book (the Codex), asked of the registry — no book id is ever spelled here.
export function bookId() {
  try {
    const all = PIN.all() || [];
    for (let i = 0; i < all.length; i++) if (all[i] && all[i].locked) return text(all[i].id);
  } catch (e) {
    /* registry unreadable — answer "" and every call below goes quiet */
  }
  return "";
}

// null = never read this session. Render paths use this; nothing on a render path may run SQL.
export function peek() {
  const id = bookId();
  if (!id || id !== CACHE_BOOK) return null;
  return CACHE ? normalize(CACHE) : null;
}

// ONE SELECT per seat per session; a missing row or unparseable text answers the blank build.
export async function read(objectApi) {
  const id = bookId();
  if (!id) return blank();
  if (READ && id === CACHE_BOOK) return normalize(CACHE || {});
  let parsed = null;
  try {
    const res = await STORE.book(id).settingGet(objectApi, KEY);
    const rows = (res && res.rows) || [];
    if (rows.length && rows[0] && rows[0].value) parsed = JSON.parse(String(rows[0].value));
  } catch (e) {
    parsed = null;
  }
  CACHE = parsed && typeof parsed === "object" ? parsed : {};
  CACHE_BOOK = id;
  READ = true;
  return normalize(CACHE);
}

// A PATCH merged over what is stored; SQL first, memory second, so the mirror cannot drift.
export async function set(objectApi, patch) {
  const id = bookId();
  if (!id) return blank();
  const current = await read(objectApi);
  const next = normalize(Object.assign({}, current, patch || {}, { updatedAt: Date_now(objectApi) }));
  try {
    await STORE.book(id).settingSet(objectApi, KEY, JSON.stringify(next));
  } catch (e) {
    return current;
  }
  CACHE = next;
  CACHE_BOOK = id;
  READ = true;
  // This write bypasses the repository, and the graph mirrors book_settings on fill — drop the
  // book's memory so a warm seat's next read reloads instead of serving the pre-write value.
  try {
    GRAPH.invalidate(id);
  } catch (e) {
    /* a cold graph has nothing to drop */
  }
  return next;
}

// The sandbox has no Date.now — the tick is the clock, monotonic within a session only.
export function Date_now(objectApi) {
  try {
    return Math.floor(Number(objectApi && objectApi.getTick ? objectApi.getTick() : 0)) || 0;
  } catch (e) {
    return 0;
  }
}

// lib/phaselock.js decides WHEN a thing must be parked; this file only keeps the list.
export async function park(objectApi, name, note) {
  const nm = text(name).trim();
  if (!nm) return read(objectApi);
  const current = await read(objectApi);
  const already = current.parked.some((p) => p.name.toLowerCase() === nm.toLowerCase());
  if (already) return current;
  return set(objectApi, { parked: current.parked.concat([{ name: nm, status: "parked", note: text(note) }]) });
}

module.exports = {
  KEY,
  PHASES,
  STATUSES,
  blank,
  normalize,
  phaseName,
  allowsCode,
  bookId,
  peek,
  read,
  set,
  park,
};
