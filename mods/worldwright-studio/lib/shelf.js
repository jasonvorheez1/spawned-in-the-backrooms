// js holds one book in, one level up. js), then the caller patches these maps; a write that cannot be mirrored exactly must drop its bucket instead of guessing. js owes this file a targeted drop, and the once-a-second roster tick must never become a database read.

const IDS = require("lib/ids.js");

const BOOKS = {}; // projectId -> [rows], sortKey order
const HOME = {}; // bookId -> projectId, so one book is found without scanning every shelf

export function copyBook(r) {
  return {
    id: String(r.id || ""),
    name: String(r.name || ""),
    sortKey: String(r.sortKey || ""),
    projectId: String(r.projectId || ""),
    compile: !!r.compile,
    notes: String(r.notes || ""),
    summary: String(r.summary || ""),
    createdAt: Number(r.createdAt || 0),
    updatedAt: Number(r.updatedAt || 0),
    lastEditor: String(r.lastEditor || ""),
  };
}

// BINARY collation, the same order the database's own ORDER BY sortKey ASC, id ASC gives.
export function cmpBooks(a, b) {
  return IDS.cmp(a.sortKey, b.sortKey) || IDS.cmp(a.id, b.id);
}

// null is the ONLY signal to go to SQL; an empty project answers with [], which is an answer.
export function heldBooks(projectId) {
  const pid = String(projectId || "");
  const rows = BOOKS[pid];
  return rows ? rows.map(copyBook) : null;
}

export function holdsBooks(projectId) {
  return !!BOOKS[String(projectId || "")];
}

export function putBooks(projectId, rows) {
  const pid = String(projectId || "");
  if (!pid) return;
  const held = BOOKS[pid];
  if (held) for (let i = 0; i < held.length; i++) delete HOME[held[i].id];
  const next = [];
  for (let i = 0; i < (rows || []).length; i++) {
    const row = copyBook(rows[i]);
    if (!row.id) continue;
    row.projectId = row.projectId || pid;
    next.push(row);
    HOME[row.id] = pid;
  }
  next.sort(cmpBooks);
  BOOKS[pid] = next;
}

export function bookRow(bookId) {
  const id = String(bookId || "");
  const pid = HOME[id];
  if (!pid) return null;
  const rows = BOOKS[pid] || [];
  for (let i = 0; i < rows.length; i++) if (rows[i].id === id) return copyBook(rows[i]);
  return null;
}

export function noteBook(row) {
  const r = copyBook(row || {});
  if (!r.id || !r.projectId) return false;
  const rows = BOOKS[r.projectId];
  if (!rows) return false;
  let found = false;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === r.id) {
      rows[i] = r;
      found = true;
      break;
    }
  }
  if (!found) rows.push(r);
  rows.sort(cmpBooks);
  HOME[r.id] = r.projectId;
  return true;
}

export function patchBook(bookId, patch) {
  const id = String(bookId || "");
  const pid = HOME[id];
  if (!pid || !patch) return false;
  const rows = BOOKS[pid] || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id !== id) continue;
    const next = copyBook(Object.assign({}, rows[i], patch));
    next.id = id;
    rows[i] = next;
    if (Object.prototype.hasOwnProperty.call(patch, "sortKey")) rows.sort(cmpBooks);
    if (next.projectId !== pid) {
      rows.splice(rows.indexOf(next), 1);
      delete HOME[id];
      noteBook(next);
    }
    return true;
  }
  return false;
}

export function dropBook(bookId) {
  const id = String(bookId || "");
  const pid = HOME[id];
  if (!pid) return false;
  const rows = BOOKS[pid] || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === id) {
      rows.splice(i, 1);
      break;
    }
  }
  delete HOME[id];
  return true;
}

export function forgetBooks(projectId) {
  const pid = String(projectId || "");
  if (!pid) {
    for (const k in BOOKS) delete BOOKS[k];
    for (const k in HOME) delete HOME[k];
    return true;
  }
  const rows = BOOKS[pid];
  if (rows) for (let i = 0; i < rows.length; i++) delete HOME[rows[i].id];
  delete BOOKS[pid];
  return true;
}

export function forget() {
  forgetBooks("");
  return true;
}

export function stats() {
  const shelves = Object.keys(BOOKS);
  let books = 0;
  for (let i = 0; i < shelves.length; i++) books += BOOKS[shelves[i]].length;
  return {
    shelves: shelves.length,
    books: books,
  };
}

module.exports = {
  heldBooks,
  holdsBooks,
  putBooks,
  bookRow,
  noteBook,
  patchBook,
  dropBook,
  forgetBooks,
  forget,
  stats,
};
