// js — every book filed under the project: create, rename, reorder, remove, and the shelf read. js; the Research book's key is RESEARCH0BOOK — uppercase, so a generated id can never collide with it. Nothing is swallowed — a failed insert leaves the merge and lastCreateError() names it. Writes are unchanged — the literal statement runs first, then the row is patched into the index rather than the index thrown away.
const IDS = require("lib/ids.js");
const INDEX = require("lib/shelf.js");
const PIN = require("lib/pinned.js");
// schema.js requires nothing, so this leaf require can never make a cycle.
const SCHEMA = require("lib/schema.js");

const RESEARCH_ID = IDS.SENTINELS.RESEARCH;
const TRASH_ID = IDS.SENTINELS.TRASH;

let ENSURED = false;
let CLOCK_OFFSET = null; // realMs - engineMs, learned once per seat
let LAST_ERROR = null; // { id, message }
const PENDING = {}; // bookId -> { row, queue, removed, error, done }
const WATCHERS = [];

export function forget() {
  ENSURED = false;
  CLOCK_OFFSET = null;
  LAST_ERROR = null;
  for (const k in PENDING) delete PENDING[k];
  INDEX.forget();
}

// The narrow drops, for a lane that wrote around this file. Nothing else may drop the index.
export function forgetProject(projectId) {
  return INDEX.forgetBooks(String(projectId || ""));
}

export function forgetBook(bookId) {
  return INDEX.dropBook(String(bookId || ""));
}

export function notify(event) {
  for (let i = 0; i < WATCHERS.length; i++) {
    try {
      WATCHERS[i](event);
    } catch (e) {
      /* a watcher never breaks a write */
    }
  }
}

export function onChange(fn) {
  if (typeof fn !== "function") return function () {};
  WATCHERS.push(fn);
  return function () {
    const i = WATCHERS.indexOf(fn);
    if (i >= 0) WATCHERS.splice(i, 1);
  };
}

// schema is the data dictionary — the books table's shape is SCHEMA.ensureBooks(), and this file keeps only what it does with the rows. The boot ALTERs and the re-homing UPDATE are GONE with his no-migration law: booting is how the app is used, so every live install ran them long ago, and every insert here writes projectId and sortKey itself.
export async function ensure(objectApi) {
  if (ENSURED) return;
  await SCHEMA.ensureBooks(objectApi);
  await backfillKeys(objectApi);
  await primeClock(objectApi);
  ENSURED = true;
}

export async function backfillKeys(objectApi) {
  const res = await objectApi.sql`SELECT id FROM books WHERE sortKey = '' OR sortKey IS NULL
    ORDER BY ordinal ASC, id ASC`;
  const rows = (res && res.rows) || [];
  if (!rows.length) return;
  const top = await objectApi.sql`SELECT MAX(sortKey) AS k FROM books WHERE sortKey <> ''`;
  let lower = String((((top && top.rows) || [])[0] || {}).k || "") || null;
  const keys = [];
  for (let i = 0; i < rows.length; i++) {
    const key = IDS.keyBetween(lower, null);
    keys.push(key);
    lower = key;
  }
  for (let i = 0; i < rows.length; i++) {
    await objectApi.sql`UPDATE books SET sortKey = ${keys[i]} WHERE id = ${String(rows[i].id)}`;
  }
}

export async function nowMs(objectApi) {
  const res = await objectApi.sql`SELECT CAST(unixepoch('subsec') * 1000 AS INTEGER) AS ms`;
  const row = res && res.rows ? res.rows[0] : null;
  return Number((row && row.ms) || 0);
}

// The engine's wall clock starts at the room's own zero: a fine stopwatch and a terrible calendar. Measured once against the database clock, it becomes both.

export function engineMs(objectApi) {
  try {
    if (typeof objectApi.getWallClockTimestamp === "function") return Number(objectApi.getWallClockTimestamp()) || 0;
    if (typeof objectApi.seconds === "function") return Math.floor(Number(objectApi.seconds()) * 1000) || 0;
  } catch (e) {
    /* fall through */
  }
  return 0;
}

export async function primeClock(objectApi) {
  if (CLOCK_OFFSET !== null) return CLOCK_OFFSET;
  const real = await nowMs(objectApi);
  if (!real) return null;
  CLOCK_OFFSET = real - engineMs(objectApi);
  return CLOCK_OFFSET;
}

// null until the seat's first ensure() has run.
export function nowMsSync(objectApi) {
  if (CLOCK_OFFSET === null) return null;
  return CLOCK_OFFSET + engineMs(objectApi);
}

export function newId(objectApi, ms) {
  return IDS.uid(objectApi, ms);
}

export function shape(row) {
  return {
    id: String(row.id),
    name: String(row.name || "Untitled Book"),
    sortKey: String(row.sortKey || ""),
    projectId: String(row.projectId || ""),
    compile: Number(row.compile || 0) === 1,
    notes: String(row.notes || ""),
    summary: String(row.summary || ""),
    createdAt: Number(row.createdAt || 0),
    updatedAt: Number(row.updatedAt || 0),
    lastEditor: String(row.lastEditor || ""),
  };
}

export function sortRows(rows) {
  return rows.sort(function (a, b) {
    return IDS.cmp(a.sortKey, b.sortKey) || IDS.cmp(a.id, b.id);
  });
}

export function pendingOf(id) {
  return PENDING[String(id || "")] || null;
}

export function isPending(id) {
  return !!pendingOf(id);
}

export function lastCreateError() {
  return LAST_ERROR;
}

export function settleOf(id) {
  const e = pendingOf(id);
  return e && e.done ? e.done : Promise.resolve({ ok: true, id: String(id || "") });
}

export function pendingBooks(projectId) {
  const pid = String(projectId || "");
  const out = [];
  for (const id in PENDING) {
    const e = PENDING[id];
    if (e.removed) continue;
    if (pid && e.row.projectId !== pid) continue;
    out.push(Object.assign({}, e.row, { pending: true }));
  }
  return sortRows(out);
}

export function queueOn(entry, job) {
  entry.queue.push(job);
  return true;
}

export async function runInsert(objectApi, entry) {
  const r = entry.row;
  try {
    await ensure(objectApi);
    await objectApi.sql`INSERT INTO books (id, name, ordinal, compile, notes, summary, createdAt, updatedAt, lastEditor, projectId, sortKey)
      VALUES (${r.id}, ${r.name}, 0, 1, ${r.notes}, ${r.summary}, ${r.createdAt}, ${r.updatedAt}, ${r.lastEditor}, ${r.projectId}, ${r.sortKey})`;
  } catch (e) {
    const message = String((e && e.message) || e);
    entry.error = message;
    LAST_ERROR = { id: r.id, message: message };
    delete PENDING[r.id];
    objectApi.log("[library] book " + r.id + " could not be written: " + message);
    notify({ kind: "book", op: "create", ok: false, id: r.id, error: message });
    return { ok: false, id: r.id, error: message };
  }
  // The entry leaves the map BEFORE the queue drains, so a queued job takes the ordinary path.
  delete PENDING[r.id];
  r.pending = false;
  INDEX.noteBook(r);
  while (entry.queue.length) {
    const job = entry.queue.shift();
    try {
      await job(objectApi);
    } catch (e) {
      const message = String((e && e.message) || e);
      LAST_ERROR = { id: r.id, message: message };
      objectApi.log("[library] a queued edit on book " + r.id + " failed: " + message);
      notify({ kind: "book", op: "queued", ok: false, id: r.id, error: message });
    }
  }
  notify({ kind: "book", op: "create", ok: true, id: r.id });
  return { ok: true, id: r.id };
}

export function tailKey(projectId) {
  const pid = String(projectId || "");
  let top = null;
  const known = INDEX.heldBooks(pid) || [];
  for (let i = 0; i < known.length; i++) {
    const k = String(known[i].sortKey || "");
    if (k && (!top || IDS.cmp(k, top) > 0)) top = k;
  }
  for (const id in PENDING) {
    const e = PENDING[id];
    if (e.removed || e.row.projectId !== pid) continue;
    const k = String(e.row.sortKey || "");
    if (k && (!top || IDS.cmp(k, top) > 0)) top = k;
  }
  return top;
}

// SCOPED by default: no projectId named, nothing comes back. { allProjects: true } is the whole table across every author — the id lookups and probes only, NEVER a lane that shows or exports CONTENT (that was the 2026-08-22 export leak).
export async function list(objectApi, projectId, opts) {
  const pid = String(projectId || "");
  const everything = !!(opts && opts.allProjects);
  if (!pid && !everything) return [];
  if (pid) {
    const held = INDEX.heldBooks(pid);
    if (held) return merge(held, pid);
  }
  await ensure(objectApi);
  const res = pid
    ? await objectApi.sql`SELECT * FROM books WHERE projectId = ${pid} ORDER BY sortKey ASC, id ASC`
    : await objectApi.sql`SELECT * FROM books ORDER BY sortKey ASC, id ASC`;
  const rows = ((res && res.rows) || []).map(shape);
  if (pid) INDEX.putBooks(pid, rows);
  return merge(rows, pid);
}

export function merge(rows, projectId) {
  const pid = String(projectId || "");
  const out = [];
  const seen = {};
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (PIN.isRetired(r.id)) continue;
    const e = pendingOf(r.id);
    if (e && e.removed) continue;
    seen[r.id] = true;
    out.push(e ? Object.assign({}, r, { name: e.row.name, pending: true }) : Object.assign({}, r, { pending: false }));
  }
  for (const id in PENDING) {
    const e = PENDING[id];
    if (e.removed || seen[id] || PIN.isRetired(id)) continue;
    if (pid && e.row.projectId !== pid) continue;
    out.push(Object.assign({}, e.row, { pending: true }));
  }
  return sortRows(out);
}

export function listCached(projectId) {
  const pid = String(projectId || "");
  return merge(INDEX.heldBooks(pid) || [], pid);
}

export async function lastKey(objectApi, projectId) {
  const res = await objectApi.sql`SELECT MAX(sortKey) AS k FROM books WHERE projectId = ${String(projectId || "")}`;
  return String((((res && res.rows) || [])[0] || {}).k || "") || null;
}

export async function add(objectApi, projectId, name, editor) {
  const row = await addRow(objectApi, projectId, name, editor);
  return row ? row.id : null;
}

export async function addRow(objectApi, projectId, name, editor) {
  const pid = String(projectId || "");
  // his ruling ("No project, no book"): a projectless create THROWS, never the silent null it used to return.
  if (!pid) throw new Error("[library] a book needs a project — refused (no project, no book)");
  if (!ENSURED || CLOCK_OFFSET === null || !INDEX.holdsBooks(pid)) {
    await ensure(objectApi);
    if (!INDEX.holdsBooks(pid)) await list(objectApi, pid);
  }
  const ms = nowMsSync(objectApi);
  if (ms === null) {
    const real = await nowMs(objectApi);
    const id = IDS.uid(objectApi, real);
    const key = IDS.keyBetween(await lastKey(objectApi, pid), null);
    const title = String(name || "Untitled Book");
    const who = String(editor || "");
    await objectApi.sql`INSERT INTO books (id, name, ordinal, compile, notes, summary, createdAt, updatedAt, lastEditor, projectId, sortKey)
      VALUES (${id}, ${title}, 0, 1, '', '', ${real}, ${real}, ${who}, ${pid}, ${key})`;
    const landed = shape({
      id: id,
      name: title,
      sortKey: key,
      projectId: pid,
      compile: 1,
      createdAt: real,
      updatedAt: real,
      lastEditor: who,
    });
    landed.pending = false;
    INDEX.noteBook(landed);
    return landed;
  }
  const id = IDS.uid(objectApi, ms);
  const row = shape({
    id: id,
    name: String(name || "Untitled Book"),
    sortKey: IDS.keyBetween(tailKey(pid), null),
    projectId: pid,
    compile: 1,
    createdAt: ms,
    updatedAt: ms,
    lastEditor: String(editor || ""),
  });
  row.pending = true;
  const entry = { row: row, queue: [], removed: false, error: null, done: null };
  PENDING[id] = entry;
  entry.done = runInsert(objectApi, entry);
  return Object.assign({}, row);
}

export async function remove(objectApi, id) {
  const key = String(id || "");
  if (!key || IDS.isSentinel(key)) return false;
  const e = pendingOf(key);
  if (e) {
    e.removed = true;
    queueOn(e, function (a) {
      INDEX.dropBook(key);
      return a.sql`DELETE FROM books WHERE id = ${key}`;
    });
    return true;
  }
  await ensure(objectApi);
  await objectApi.sql`DELETE FROM books WHERE id = ${key}`;
  INDEX.dropBook(key);
  return true;
}

export async function touch(objectApi, id, editor) {
  const ms = nowMsSync(objectApi);
  const stamp = ms === null ? await nowMs(objectApi) : ms;
  const who = String(editor || "");
  await objectApi.sql`UPDATE books SET updatedAt = ${stamp}, lastEditor = ${who} WHERE id = ${String(id)}`;
  INDEX.patchBook(id, { updatedAt: stamp, lastEditor: who });
}

export async function rename(objectApi, id, name, editor) {
  const key = String(id || "");
  if (!key || IDS.isSentinel(key)) return false;
  const title = String(name || "").trim() || "Untitled Book";
  const e = pendingOf(key);
  if (e) {
    e.row.name = title;
    queueOn(e, function (a) {
      return rename(a, key, title, editor);
    });
    return true;
  }
  await ensure(objectApi);
  await objectApi.sql`UPDATE books SET name = ${title} WHERE id = ${key}`;
  INDEX.patchBook(key, { name: title });
  await touch(objectApi, key, editor);
  return true;
}

export async function setMeta(objectApi, id, field, value, editor) {
  const key = String(id || "");
  if (!key || IDS.isSentinel(key)) return false;
  if (field !== "compile" && field !== "notes" && field !== "summary") return false;
  const e = pendingOf(key);
  if (e) {
    if (field === "compile") e.row.compile = !!value;
    else e.row[field] = String(value || "");
    queueOn(e, function (a) {
      return setMeta(a, key, field, value, editor);
    });
    return true;
  }
  await ensure(objectApi);
  if (field === "compile") {
    const on = value ? 1 : 0;
    await objectApi.sql`UPDATE books SET compile = ${on} WHERE id = ${key}`;
    INDEX.patchBook(key, { compile: !!value });
  } else if (field === "notes") {
    const text = String(value || "");
    await objectApi.sql`UPDATE books SET notes = ${text} WHERE id = ${key}`;
    INDEX.patchBook(key, { notes: text });
  } else {
    const text = String(value || "");
    await objectApi.sql`UPDATE books SET summary = ${text} WHERE id = ${key}`;
    INDEX.patchBook(key, { summary: text });
  }
  await touch(objectApi, key, editor);
  return true;
}

export async function reorder(objectApi, id, toIndex, projectId) {
  await ensure(objectApi);
  const key = String(id || "");
  if (!key || IDS.isSentinel(key)) return false;
  const books = await list(objectApi, projectId);
  const from = books.findIndex((b) => b.id === key);
  if (from < 0) return false;
  const rest = books.filter((b) => b.id !== key);
  const to = Math.max(0, Math.min(rest.length, Math.floor(Number(toIndex))));
  const before = to > 0 ? rest[to - 1].sortKey : null;
  const after = to < rest.length ? rest[to].sortKey : null;
  const next = IDS.keyBetween(before, after);
  const e = pendingOf(key);
  if (e) {
    e.row.sortKey = next;
    queueOn(e, function (a) {
      INDEX.patchBook(key, { sortKey: next });
      return a.sql`UPDATE books SET sortKey = ${next} WHERE id = ${key}`;
    });
    return true;
  }
  await objectApi.sql`UPDATE books SET sortKey = ${next} WHERE id = ${key}`;
  INDEX.patchBook(key, { sortKey: next });
  return true;
}

// Does this room's SQLite have fts5 at all? The scratch table's shape is the dictionary's
// (SCHEMA.ensureFtsProbe); writing to it, reading it back and tearing it down is this file's business.
export async function ftsProbe(objectApi) {
  try {
    await SCHEMA.ensureFtsProbe(objectApi);
    await objectApi.sql`INSERT INTO fts_probe (body) VALUES ('the lantern on the dock glowed')`;
    const r = await objectApi.sql`SELECT body FROM fts_probe WHERE fts_probe MATCH 'lantern'`;
    const rows = (r && r.rows) || [];
    await objectApi.sql`DROP TABLE fts_probe`;
    return { fts5: true, matched: rows.length };
  } catch (e) {
    return { fts5: false, error: String((e && e.message) || e) };
  }
}

module.exports = {
  RESEARCH_ID,
  TRASH_ID,
  ensure,
  list,
  listCached,
  add,
  addRow,
  remove,
  rename,
  setMeta,
  reorder,
  newId,
  nowMs,
  nowMsSync,
  primeClock,
  ftsProbe,
  forgetProject,
  forgetBook,
  forget,
  onChange,
  isPending,
  pendingBooks,
  lastCreateError,
  settleOf,
};

// his ruling: the allow-list fence covers books as well as cards — it wraps this file's write verbs with the verdict lib/writefence.js decided when the shelf opened. Reads are untouched.
const FENCE = require("lib/writefence.js");
const FENCED_VERBS = ["add", "addRow", "remove", "rename", "setMeta", "reorder"];
for (let i = 0; i < FENCED_VERBS.length; i++) {
  const name = FENCED_VERBS[i];
  const inner = module.exports[name];
  if (typeof inner !== "function") continue;
  module.exports[name] = function () {
    if (!FENCE.mayWrite()) throw new Error(FENCE.refusalLine(FENCE.get().name));
    return inner.apply(null, arguments);
  };
}
