// Config — every default the app reads, in three scopes: user (follows the person), room (cadences everyone must agree on, host wins), book (per-book overrides). A scope refuses any key absent from its own block in lib/data/config-defaults.json — silently (`false`), so a key must be ADDED to the block before anything writes it.

const DEFAULTS = require("lib/data/config-defaults.yml");
const PAGE_SIZES = require("lib/page-sizes.js");
// Schema owns table setup; page presets above remain pure and independent.
const SCHEMA = require("lib/schema.js");
// The pinned-book registry — a pure leaf (JSON in, answers out), so no cycle through here either.
const PINREG = require("lib/pinned.js");

const SCOPES = { user: "user_prefs", room: "room_defaults", book: "book_settings" };

export function clone(v) {
  return v === undefined || v === null ? v : JSON.parse(JSON.stringify(v));
}

export function encode(value) {
  return JSON.stringify({ v: value === undefined ? null : value });
}

export function decode(text) {
  try {
    const box = JSON.parse(String(text));
    return box && Object.prototype.hasOwnProperty.call(box, "v") ? box.v : null;
  } catch (e) {
    return null;
  }
}

// schema is the data dictionary — the user and room scopes are SCHEMA.ensureConfig(). The book scope is book_settings, a shared BOOK table: its one shape lives in SCHEMA.ensureProject() beside cards and sections, and this file takes that instance rather than keeping a second copy that could drift a column away from it.
export async function ensure(objectApi) {
  await SCHEMA.ensureConfig(objectApi);
  await SCHEMA.ensureProject(objectApi);
}

// Every read returns the full scope — defaults with stored rows laid over them. A missing table, a
//   malformed row or an unknown key falls back to the default, never to undefined.

export function overlay(base, rows) {
  const out = clone(base) || {};
  for (const row of rows || []) {
    const key = String(row.key || "");
    if (!key || key === "snapshotCap") continue;
    out[key] = decode(row.value);
  }
  return out;
}

// Older audio-category sliders accidentally stored JSON text inside the value envelope.
// Accept it on read without rewriting anyone's preferences; new writes store an object.
export function audioCategoriesOf(value) {
  let cats = value;
  if (typeof cats === "string") {
    try { cats = JSON.parse(cats); } catch (e) { return {}; }
  }
  return cats && typeof cats === "object" && !Array.isArray(cats) ? Object.assign({}, cats) : {};
}

export async function getUser(objectApi, userId) {
  await ensure(objectApi);
  const id = String(userId || "");
  const res = await objectApi.sql`SELECT key, value FROM user_prefs WHERE userId = ${id}`;
  const prefs = overlay(DEFAULTS.user, (res && res.rows) || []);
  prefs.audioCategories = audioCategoriesOf(prefs.audioCategories);
  return prefs;
}

export async function getRoom(objectApi) {
  await ensure(objectApi);
  const res = await objectApi.sql`SELECT key, value FROM room_defaults`;
  return overlay(DEFAULTS.room, (res && res.rows) || []);
}

export async function getBook(objectApi, bookId) {
  await ensure(objectApi);
  const id = String(bookId || "");
  if (!id) return clone(DEFAULTS.book);
  const res = await objectApi.sql`SELECT key, value FROM book_settings WHERE bookId = ${id}`;
  const out=overlay(DEFAULTS.book, (res && res.rows) || []);
  if(!out.pageSpec&&PINREG.isPinned(id))out.pageSpec=PAGE_SIZES.preset(id==='0MUSIC00BOOK0'?'piano':'a3');
  return out;
}

// His spec: written immediately on each change. No batching, no autosave timer.

export function clampUser(key, value) {
  if (key === "audioCategories") return audioCategoriesOf(value);
  if (key === "audioMaster") return Math.max(0, Math.min(1, Number(value) || 0));
  // Font size is one of five steps — anything else lands back on Normal, never an unreadable app.
  if (key === "fontScale") {
    const n = Number(value);
    const steps = [0.85, 1, 1.15, 1.3, 1.5];
    for (const s of steps) if (Math.abs(s - n) < 0.001) return s;
    return 1;
  }
  // On-screen paper zoom — presentation only, 96dpi stays the model's truth (his ask, 2026-09-01: "Pages set to specific dimensions should be as close to their actual sizes as possible"). Free values inside hard rails; snapped to 2 decimals so the % readout never shows dust.
  if (key === "paperZoom") {
    const n = Number(value);
    if (!isFinite(n) || n <= 0) return 1;
    return Math.max(0.5, Math.min(3, Math.round(n * 100) / 100));
  }
  return value;
}

export function clampRoom(key, value) {
  return value;
}

export async function setUser(objectApi, userId, key, value) {
  // Read legacy appearance rows for compatibility, but personalization is retired.
  if (key === "themeId" || key === "themeAdjustments") return false;
  await ensure(objectApi);
  const id = String(userId || "");
  const k = String(key || "");
  if (!id || !k || !Object.prototype.hasOwnProperty.call(DEFAULTS.user, k)) return false;
  const payload = encode(clampUser(k, value));
  await objectApi.sql`INSERT INTO user_prefs (userId, key, value) VALUES (${id}, ${k}, ${payload})
    ON CONFLICT(userId, key) DO UPDATE SET value = excluded.value`;
  return true;
}

// His rule: per-user, except when it breaks co-op — these are shared cadences, host only.
export async function setRoom(objectApi, key, value, isHost, editor) {
  await ensure(objectApi);
  const k = String(key || "");
  if (!k || !Object.prototype.hasOwnProperty.call(DEFAULTS.room, k)) return false;
  if (!isHost) return false;
  const payload = encode(clampRoom(k, value));
  const who = String(editor || "");
  await objectApi.sql`INSERT INTO room_defaults (key, value, setBy) VALUES (${k}, ${payload}, ${who})
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, setBy = excluded.setBy`;
  return true;
}

export async function setBook(objectApi, bookId, key, value) {
  await ensure(objectApi);
  const id = String(bookId || "");
  const k = String(key || "");
  if (!id || !k || !Object.prototype.hasOwnProperty.call(DEFAULTS.book, k)) return false;
  const payload = encode(value);
  await objectApi.sql`INSERT INTO book_settings (bookId, key, value) VALUES (${id}, ${k}, ${payload})
    ON CONFLICT(bookId, key) DO UPDATE SET value = excluded.value`;
  return true;
}

export async function clearBook(objectApi, bookId) {
  await ensure(objectApi);
  await objectApi.sql`DELETE FROM book_settings WHERE bookId = ${String(bookId || "")}`;
}

// Copied ONCE at creation: editing the user default later never reaches back into a book that already carries its own flag. With no author id, no copy is written and the book inherits the live default. projectId is still taken so existing calls keep their shape — nothing reads it.
export async function seedBook(objectApi, bookId, projectId, userId) {
  let id = String(userId || "");
  if (!id) {
    try {
      id = String(objectApi.userId || "");
    } catch (e) {
      id = "";
    }
  }
  if (!id) return;
  const user = await getUser(objectApi, id);
  await setBook(objectApi, bookId, "exportInclude", user.exportIncludeDefault !== false);
}


export function usable(labels) {
  return Array.isArray(labels) && labels.length > 0;
}

export async function resolveDepthLabels(objectApi, bookId, projectId, userId) {
  // Pinned reference books speak plain FOLDERS, never the narrative ladder — his ruling, 2026-08-29: "Research book should have 'folders' not arc/chapter/scene." The deepest label keeps applying all the way down, so one word is the whole ladder; book/user ladders are for authored books only. pinned.js is a pure leaf — no cycle through here.
  if (PINREG.isPinned(bookId)) return { labels: ["Folder"], from: "pinned" };
  const book = await getBook(objectApi, bookId);
  if (usable(book.depthLabels)) return { labels: clone(book.depthLabels), from: "book" };
  const user = await getUser(objectApi, userId);
  if (usable(user.depthLabels)) return { labels: clone(user.depthLabels), from: "user" };
  return { labels: clone(DEFAULTS.user.depthLabels), from: "default" };
}

// depth_1 .. depth_n, and the deepest label defined keeps applying all the way down.
export function labelForDepth(labels, depth) {
  const list = usable(labels) ? labels : DEFAULTS.user.depthLabels;
  const i = Math.max(1, Math.floor(Number(depth) || 1));
  return String(list[Math.min(i, list.length) - 1]);
}

// The book's own flag, then the author's default.
export async function resolveExportInclude(objectApi, bookId, projectId, userId) {
  const book = await getBook(objectApi, bookId);
  if (typeof book.exportInclude === "boolean") return book.exportInclude;
  const user = await getUser(objectApi, userId);
  return user.exportIncludeDefault !== false;
}

module.exports = {
  audioCategoriesOf,
  DEFAULTS,
  SCOPES,
  ensure,
  getUser,
  getRoom,
  getBook,
  setUser,
  setRoom,
  setBook,
  clearBook,
  seedBook,
  resolveDepthLabels,
  labelForDepth,
  resolveExportInclude,
};
