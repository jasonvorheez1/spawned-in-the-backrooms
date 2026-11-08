// Recover — the lane back for work that is in the database but not on anybody's shelf. The digest law: every statement here is a literal tagged template; nothing is concatenated at runtime. RESEARCH0BOOK looks exactly like orphan content (shared-table rows, no books row) — it is excluded from the content list and refused by sweep().

const LIB = require("lib/library.js");
const IDS = require("lib/ids.js");
const STORE = require("lib/store.js");

const RESEARCH_ID = LIB.RESEARCH_ID;

// A pathological database must still answer inside one call's budget.
const MAX_ROWS = 200;

export function str(v) {
  return String(v === undefined || v === null ? "" : v);
}

export function num(v) {
  return Number(v || 0) || 0;
}

// { projects, books, content, errors } — errors is one readable sentence per section that refused.
export async function scan(objectApi, ownerId, myUserId) {
  const shelf = str(ownerId);
  const me = str(myUserId);
  const out = { projects: [], books: [], content: [], errors: [] };

  // `projects` stays an empty key because the window's shape reads it.
  // His ruling: show ALL books and whether or not they need recovering — every row carries `lost`
  // and its reason, and only a lost row is offered a button.
  try {
    await LIB.ensure(objectApi);
    const res = await objectApi.sql`SELECT b.id, b.name, b.projectId,
      (SELECT COUNT(*) FROM cards c WHERE c.bookId = b.id) AS cards,
      (SELECT COUNT(*) FROM projects p WHERE p.id = b.projectId) AS filed
      FROM books b
      ORDER BY b.name ASC, b.id ASC
      LIMIT ${MAX_ROWS}`;
    const rows = (res && res.rows) || [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const id = str(r.id);
      // The pinned books are never shelf furniture; they are never offered here either.
      if (!id || IDS.isSentinel(id)) continue;
      const pid = str(r.projectId);
      const filed = num(r.filed) > 0;
      const lost = !pid || !filed;
      out.books.push({
        id: id,
        name: str(r.name) || "Untitled Book",
        projectId: pid,
        cards: num(r.cards),
        lost: lost,
        reason: lost ? (pid ? "project-gone" : "no-project") : "shelved",
      });
    }
  } catch (e) {
    const msg = str((e && e.message) || e);
    objectApi.log("[recover] the books scan refused: " + msg);
    out.errors.push("the book rows could not be read: " + msg);
  }

  // One grouped pass over the four shared tables. RESEARCH0BOOK is bound out of it by name.
  try {
    const res = await objectApi.sql`SELECT t.bookId AS bookId,
      SUM(CASE WHEN t.src = 'card' THEN 1 ELSE 0 END) AS cards,
      SUM(CASE WHEN t.src = 'folder' THEN 1 ELSE 0 END) AS folders,
      SUM(CASE WHEN t.src = 'page' THEN 1 ELSE 0 END) AS pages,
      SUM(CASE WHEN t.src = 'section' THEN 1 ELSE 0 END) AS sections
      FROM (
        SELECT bookId, 'card' AS src FROM cards
        UNION ALL SELECT bookId, 'folder' AS src FROM folders
        UNION ALL SELECT bookId, 'page' AS src FROM pages
        UNION ALL SELECT bookId, 'section' AS src FROM sections
      ) t
      WHERE t.bookId IS NOT NULL AND t.bookId <> '' AND t.bookId <> ${RESEARCH_ID}
        AND NOT EXISTS (SELECT 1 FROM books b WHERE b.id = t.bookId)
      GROUP BY t.bookId
      ORDER BY t.bookId ASC
      LIMIT ${MAX_ROWS}`;
    const rows = (res && res.rows) || [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const bookId = str(r.bookId);
      // Second gate on the pinned book, for any sentinel a future release adds.
      if (!bookId || IDS.isSentinel(bookId)) continue;
      out.content.push({
        bookId: bookId,
        cards: num(r.cards),
        folders: num(r.folders),
        pages: num(r.pages),
        sections: num(r.sections),
      });
    }
  } catch (e) {
    const msg = str((e && e.message) || e);
    objectApi.log("[recover] the orphan-content scan refused: " + msg);
    out.errors.push("the loose cards and folders could not be counted: " + msg);
  }

  return out;
}

// Writes here go around lib/library.js, so the affected shelf is forgotten, not patched.
const SHELFX = require("lib/shelf.js");

// Every write below is GUARDED in SQL and reports `changes`; one that matches nothing comes back { ok: false } with a sentence an author can read — house rule 3, nothing swallowed. The guard keeps this to books that genuinely have no project: it can never move a book off a shelf.
export async function adoptBook(objectApi, bookId, projectId) {
  const bid = str(bookId);
  const pid = str(projectId);
  if (!bid) return { ok: false, message: "that book has no id — nothing to file." };
  if (!pid) return { ok: false, message: "open a project first — a book has to be filed under one." };
  try {
    const owner = await objectApi.sql`SELECT id FROM projects WHERE id = ${pid}`;
    if (!(((owner && owner.rows) || [])[0] || {}).id) {
      return { ok: false, message: "the project you are filing it under is not there any more." };
    }
    const res = await objectApi.sql`UPDATE books SET projectId = ${pid}
      WHERE id = ${bid} AND (projectId IS NULL OR projectId = ''
        OR NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = books.projectId))`;
    const changes = num(res && res.changes);
    if (changes) {
      SHELFX.forgetBooks(pid);
    }
    if (!changes) {
      objectApi.log("[recover] book " + bid + " was not adopted — it already has a project");
      return { ok: false, changes: 0, message: "that book is already filed under a project, so it was left alone." };
    }
    return { ok: true, changes: changes };
  } catch (e) {
    const msg = str((e && e.message) || e);
    objectApi.log("[recover] adopt of book " + bid + " refused: " + msg);
    return { ok: false, message: "that book would not move to your project: " + msg };
  }
}

// A books row written under the id its cards already carry; sortKey minted past the tail, as library.js does.
export async function rebuildBook(objectApi, bookId, projectId, name) {
  const bid = str(bookId);
  const pid = str(projectId);
  const title = str(name).trim() || "Recovered Book";
  if (!bid) return { ok: false, message: "that content has no book id — there is nothing to rebuild." };
  if (IDS.isSentinel(bid)) {
    return { ok: false, message: "the Research book is pinned outside the shelf — it is never rebuilt." };
  }
  if (!IDS.isValidId(bid)) return { ok: false, message: "that book id is not one this app could have written." };
  if (!pid) return { ok: false, message: "open a project first — a book has to be filed under one." };
  try {
    await LIB.ensure(objectApi);
    const has = await objectApi.sql`SELECT id FROM books WHERE id = ${bid}`;
    if ((((has && has.rows) || [])[0] || {}).id) {
      return { ok: false, message: "there is already a book with that id — nothing was written." };
    }
    const owner = await objectApi.sql`SELECT id FROM projects WHERE id = ${pid}`;
    if (!(((owner && owner.rows) || [])[0] || {}).id) {
      return { ok: false, message: "the project you are filing it under is not there any more." };
    }
    const tail = await objectApi.sql`SELECT MAX(sortKey) AS k FROM books WHERE projectId = ${pid}`;
    const lower = str(((((tail && tail.rows) || [])[0] || {}).k) || "") || null;
    const key = IDS.keyBetween(lower, null);
    const ms = LIB.nowMsSync(objectApi);
    const stamp = ms === null ? await LIB.nowMs(objectApi) : ms;
    const res = await objectApi.sql`INSERT INTO books
      (id, name, ordinal, compile, notes, summary, createdAt, updatedAt, lastEditor, projectId, sortKey)
      VALUES (${bid}, ${title}, 0, 1, '', '', ${stamp}, ${stamp}, '', ${pid}, ${key})`;
    const changes = num(res && res.changes);
    if (changes) {
      SHELFX.forgetBooks(pid);
    }
    if (!changes) {
      objectApi.log("[recover] rebuild of book " + bid + " wrote no row");
      return { ok: false, changes: 0, message: "the book row would not write — nothing changed." };
    }
    return { ok: true, changes: changes, id: bid, name: title, sortKey: key };
  } catch (e) {
    const msg = str((e && e.message) || e);
    objectApi.log("[recover] rebuild of book " + bid + " refused: " + msg);
    return { ok: false, message: "that book would not come back: " + msg };
  }
}

// Never touches a pinned book, or a bookId that still has a books row — that one leaves through the
// ordinary delete.
export async function sweep(objectApi, bookId) {
  const bid = str(bookId);
  if (!bid) return { ok: false, message: "that content has no book id — nothing to discard." };
  if (IDS.isSentinel(bid)) {
    objectApi.log("[recover] sweep refused: " + bid + " is a pinned book");
    return { ok: false, message: "the Research book lives outside the shelf on purpose — it is never discarded." };
  }
  const rows = STORE.book(bid);
  if (!rows || typeof rows.drop !== "function") {
    objectApi.log("[recover] sweep refused: " + bid + " is not an id this app writes");
    return { ok: false, message: "that book id is not one this app could have written — nothing was touched." };
  }
  try {
    const has = await objectApi.sql`SELECT id FROM books WHERE id = ${bid}`;
    if ((((has && has.rows) || [])[0] || {}).id) {
      return { ok: false, message: "that book is on a shelf now — delete it from the shelf instead." };
    }
    await rows.drop(objectApi);
    return { ok: true };
  } catch (e) {
    const msg = str((e && e.message) || e);
    objectApi.log("[recover] sweep of " + bid + " refused: " + msg);
    return { ok: false, message: "those rows would not clear: " + msg };
  }
}

module.exports = {
  RESEARCH_ID,
  scan,
  adoptBook,
  rebuildBook,
  sweep,
};
