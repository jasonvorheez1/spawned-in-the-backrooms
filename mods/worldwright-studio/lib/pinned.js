// pinned — THE REGISTRY of pinned books, and nothing else: JSON in, plain answers out, no api, no SQL. It lives apart from lib/research.js because refs.js needs the registry and cards.js requires refs.js — a require back into the lane would close a compile cycle. research.js re-exports it unchanged.

const RESEARCH_BOOK = require("lib/data/research-book.yml");
const CODEX_BOOK = require("lib/data/codex-book.yml");

// Order is the order they are ensured in and the order the nav draws them — his ruling: Codex above Research.
const MUSIC_BOOK = require("lib/data/music-book.yml");
const ASSET_BOOK = require("lib/data/asset-studio-book.yml");
const SOURCE_BOOK = require("lib/data/source-book.yml");
const PINNED = [CODEX_BOOK, RESEARCH_BOOK, MUSIC_BOOK, ASSET_BOOK];
// Reserved tombstone: old snapshots remain protected, but this book no longer opens or seeds.
const RETIRED = [SOURCE_BOOK];
export function isRetired(id) { const key=text(id).split(':')[0]; return RETIRED.some(spec=>String(spec.id)===key); }

const ID = String(RESEARCH_BOOK.id || "");
const NAME = String(RESEARCH_BOOK.name || "Research");

export function text(v) {
  return String(v === null || v === undefined ? "" : v).trim();
}

// Folder names match case-insensitively, so a case-only rename is not a second folder.
export function key(name) {
  return text(name).toLowerCase();
}

export function specFor(id) {
  const want = text(id);
  for (const spec of [...PINNED, ...RETIRED]) if (String(spec.id) === want) return spec;
  return null;
}

// The nav sends "RESEARCH0BOOK" or "RESEARCH0BOOK:Timeline" — the folder half is a NAME, never a row id.
export function parse(id) {
  const raw = text(id);
  if (!raw) return null;
  const cut = raw.indexOf(":");
  const head = cut === -1 ? raw : raw.slice(0, cut);
  const spec = specFor(head);
  if (!spec) return null;
  return {
    id: String(spec.id),
    name: String(spec.name || "Untitled Book"),
    folder: cut === -1 ? "" : raw.slice(cut + 1),
  };
}

export function isPinned(id) {
  return !!parse(id);
}

export function bookOf(id) {
  const p = parse(id);
  return p && !isRetired(id) ? { id: p.id, name: p.name } : null;
}

export function entry(id) {
  const p = parse(id || ID);
  return p && !isRetired(id) ? { id: p.id, name: p.name, compile: specFor(p.id)?.compile !== false } : null;
}

export function folders(id) {
  const spec = specFor(text(id) || ID);
  return spec && Array.isArray(spec.folders) ? spec.folders.map((f) => String(f)) : [];
}

export function all() {
  return PINNED.map((spec) => ({
    id: String(spec.id),
    name: String(spec.name || ""),
    folders: folders(spec.id),
    locked: isLocked(spec.id),
  }));
}

// LOCKED = read-only to everyone using the app — his ruling: no edit access to the Codex at all.
export function isLocked(id) {
  const spec = specFor(text(id) || (parse(id) || {}).id || "");
  return !!(spec && spec.locked);
}

// The registry as bare ids, for a lane that needs only the LIST.
export function ids() {
  return PINNED.map((spec) => String(spec.id));
}

module.exports = {
  PINNED,
  ID,
  NAME,
  text,
  key,
  specFor,
  parse,
  isPinned,
  isRetired,
  bookOf,
  entry,
  all,
  ids,
  folders,
  isLocked,
};
