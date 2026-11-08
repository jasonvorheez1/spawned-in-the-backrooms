// Bookrev - THE BOOK STAMP: one integer per book that every write bumps, so a seat can ask "has anyone else written here since I last looked" in ONE statement instead of re-reading the book. js) was invisible to an open seat until the book reloaded, and that seat's next Save carried its stale rows back over the other write. One write, one bump - never one per row. SEEN is the memo of the last rev THIS seat wrote or reloaded to, so a seat never reloads for its own ink, and a fresh open memos first instead of firing a reload (the first poll is a read).

const STORE = require("lib/store.js");

const SEEN = {}; // bookId -> rev this seat last wrote or loaded

export function str(v) {
  return v == null ? "" : String(v);
}

export function int(v) {
  const n = Number(v);
  return n === n && n !== Infinity && n !== -Infinity ? n : 0;
}

export function rowsOf(res) {
  return (res && res.rows) || [];
}

// Bump the book. Returns the new rev; memos it so this seat's poll stays quiet about its own write.
// A stamp must never cost the write it rides: a failure is logged and answers 0.
export async function touch(api, bookId, who) {
  const b = str(bookId);
  if (!b) return 0;
  try {
    // Publish only committed ink. Usually landed() already paid this desk;
    // an empty flush costs no SQL, and a failed flush must publish nothing.
    await require("lib/journal.js").flush(api, b);
    const res = await STORE.bookrev.touch(api, b, str(who), null);
    const rev = int((rowsOf(res)[0] || {}).rev);
    if (rev > 0) {
      SEEN[b] = rev;
      // Room push, not a database poll. Other rooms catch up on focus/open.
      // Offline fixtures and older callers may not expose a world handle.
      if (api.world && api.world.state) {
        api.world.state.wwsBookRevisions ??= {};
        api.world.state.wwsBookRevisions[b] = { rev, by: str(who) };
      }
    }
    return rev;
  } catch (e) {
    if (api && typeof api.log === "function") api.log("[bookrev] stamp on " + b + " failed: " + str((e && e.message) || e));
    return 0;
  }
}

// One statement. {rev, by, touchedAt}; a book nobody has stamped answers rev 0.
export async function read(api, bookId) {
  const b = str(bookId);
  const row = b ? rowsOf(await STORE.bookrev.read(api, b))[0] || {} : {};
  return { rev: int(row.rev), by: str(row.by), touchedAt: int(row.touchedAt) };
}

export function seen(bookId) {
  const b = str(bookId);
  return b in SEEN ? SEEN[b] : null;
}

export function markSeen(bookId, rev) {
  const b = str(bookId);
  if (b) SEEN[b] = int(rev);
  return SEEN[b];
}

// THE POLL'S QUESTION, one statement: has another seat stamped this book past what I hold?
//   First look at a book memos the rev and answers false - a fresh open must never reload itself.
export async function changed(api, bookId) {
  const b = str(bookId);
  if (!b) return { changed: false, rev: 0, by: "" };
  const now = await read(api, b);
  if (!(b in SEEN)) {
    SEEN[b] = now.rev;
    return { changed: false, rev: now.rev, by: now.by, first: true };
  }
  return { changed: now.rev !== SEEN[b], rev: now.rev, by: now.by };
}

export function forget() {
  for (const k in SEEN) delete SEEN[k];
}

module.exports = { touch, read, seen, markSeen, changed, forget };
