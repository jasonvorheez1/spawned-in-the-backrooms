// integrity — the sweep behind "delete forever". Every statement is a literal tagged template here (the digest law), and every one is idempotent: a clean database answers zero and stays zero. INBOUND edges to a dead card STAY — Deleted Reference rendering is by design and this sweep must never take them. · a trash row whose entity is gone, a compile_state row whose folder is gone, an undo_pointer whose seq names no change_log row · a CARD whose folderId is neither its book nor a folder that exists — reported, never purged by default: those rows hold the author's words.

const IDS = require("lib/ids.js");

export function rowsOf(res) {
  return (res && res.rows) || [];
}

export function num(v) {
  const n = Number(v || 0);
  return n === n ? n : 0;
}

// One round trip, one row per kind. Names match the delete lanes below, one for one. ONE ROW, one column per kind — scalar subqueries, never a compound SELECT: this SQLite refuses a UNION ALL this wide ("too many terms in compound SELECT").
export function scan(api) {
  return api.sql`SELECT
  (SELECT COUNT(*) FROM sections WHERE cardId NOT IN (SELECT id FROM cards)) AS sections,
  (SELECT COUNT(*) FROM pages WHERE cardId NOT IN (SELECT id FROM cards)) AS pages,
  (SELECT COUNT(*) FROM card_tags WHERE cardId NOT IN (SELECT id FROM cards)) AS card_tags,
  (SELECT COUNT(*) FROM card_stats WHERE cardId NOT IN (SELECT id FROM cards)) AS card_stats,
  (SELECT COUNT(*) FROM card_images WHERE cardId NOT IN (SELECT id FROM cards)) AS card_images,
  (SELECT COUNT(*) FROM card_names WHERE cardId NOT IN (SELECT id FROM cards)) AS card_names,
  (SELECT COUNT(*) FROM cards_fts WHERE cardId NOT IN (SELECT id FROM cards)) AS cards_fts,
  (SELECT COUNT(*) FROM atmo_marks WHERE cardId <> '' AND cardId NOT IN (SELECT id FROM cards)) AS atmo_marks,
  (SELECT COUNT(*) FROM page_pen WHERE cardId NOT IN (SELECT id FROM cards)) AS page_pen,
  (SELECT COUNT(*) FROM trash_stack WHERE cardId NOT IN (SELECT id FROM cards)) AS trash_stack,
  (SELECT COUNT(*) FROM cross_book_references WHERE fromId NOT IN (SELECT id FROM cards)) AS refs_out,
  (SELECT COUNT(*) FROM trash WHERE entityType = 'card' AND entityId NOT IN (SELECT id FROM cards)) AS trash_cards,
  (SELECT COUNT(*) FROM trash WHERE entityType = 'folder' AND entityId NOT IN (SELECT id FROM folders)) AS trash_folders,
  (SELECT COUNT(*) FROM compile_state WHERE folderId NOT IN (SELECT id FROM folders) AND folderId NOT IN (SELECT bookId FROM cards)) AS compile_state,
  (SELECT COUNT(*) FROM undo_pointer WHERE seq <> 0 AND seq NOT IN (SELECT seq FROM change_log)) AS undo_pointer,
  (SELECT COUNT(*) FROM cards WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders)) AS orphan_cards,
  (SELECT COUNT(*) FROM cards WHERE id NOT IN (SELECT cardId FROM card_names)) AS nameless_cards`;
}

// ── THE NAMELESS CARD (CUT B, 2026-08-31) ──────────────────────────────────────────────────── `cards` has no name column any more — card_names is the name's one home — so a cards row with no card_names row is a card that CANNOT BE NAMED: it lists as '' in its folder, every #[id] pointing at it renders dead, and no search matches its title. It is the exact inverse of the orphan card_names class above, and it is REPORTED ALWAYS and healed only on an explicit ask: the row holds the author's card, and '(unnamed)' is a guess, never a repair to make behind their back.
export function namelessCardRows(api) {
  return api.sql`SELECT id, bookId, folderId FROM cards
  WHERE id NOT IN (SELECT cardId FROM card_names) ORDER BY bookId, id LIMIT 200`;
}

// The heal, one statement: projectId is derived from a SIBLING card's phonebook row in the same book
// (never through `books` — 0 rows in this room by design), '' when the book has no named card left.
export function healNamelessCards(api) {
  return api.sql`INSERT INTO card_names (cardId, bookId, projectId, name)
  SELECT c.id, c.bookId,
    COALESCE((SELECT cn.projectId FROM card_names cn JOIN cards c2 ON c2.id = cn.cardId
              WHERE c2.bookId = c.bookId LIMIT 1), ''),
    '(unnamed)'
  FROM cards c WHERE c.id NOT IN (SELECT cardId FROM card_names)
  ON CONFLICT(cardId) DO NOTHING`;
}

// The row-level ghosts, in ONE transaction. Nothing here can touch a live card's rows: every WHERE
// is "…and no card by that id exists".
export function purgeGhosts(api) {
  return api.sql`DELETE FROM sections WHERE cardId NOT IN (SELECT id FROM cards);
  DELETE FROM pages WHERE cardId NOT IN (SELECT id FROM cards);
  DELETE FROM card_tags WHERE cardId NOT IN (SELECT id FROM cards);
  DELETE FROM card_stats WHERE cardId NOT IN (SELECT id FROM cards);
  DELETE FROM card_images WHERE cardId NOT IN (SELECT id FROM cards);
  DELETE FROM card_names WHERE cardId NOT IN (SELECT id FROM cards);
  DELETE FROM cards_fts WHERE cardId NOT IN (SELECT id FROM cards);
  DELETE FROM atmo_marks WHERE cardId <> '' AND cardId NOT IN (SELECT id FROM cards);
  DELETE FROM page_pen WHERE cardId NOT IN (SELECT id FROM cards);
  DELETE FROM trash_stack WHERE cardId NOT IN (SELECT id FROM cards);
  DELETE FROM cross_book_references WHERE fromId NOT IN (SELECT id FROM cards);
  DELETE FROM trash WHERE entityType = 'card' AND entityId NOT IN (SELECT id FROM cards);
  DELETE FROM trash WHERE entityType = 'folder' AND entityId NOT IN (SELECT id FROM folders);
  DELETE FROM compile_state WHERE folderId NOT IN (SELECT id FROM folders) AND folderId NOT IN (SELECT id FROM books);
  UPDATE undo_pointer SET seq = 0 WHERE seq <> 0 AND seq NOT IN (SELECT seq FROM change_log)`;
}

// The author's words: only on an explicit ask, and the card's own mirror rows go with it.
export function purgeOrphanCards(api) {
  return api.sql`DELETE FROM sections WHERE cardId IN (SELECT id FROM cards WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders));
  DELETE FROM pages WHERE cardId IN (SELECT id FROM cards WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders));
  DELETE FROM card_tags WHERE cardId IN (SELECT id FROM cards WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders));
  DELETE FROM card_stats WHERE cardId IN (SELECT id FROM cards WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders));
  DELETE FROM card_images WHERE cardId IN (SELECT id FROM cards WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders));
  DELETE FROM card_names WHERE cardId IN (SELECT id FROM cards WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders));
  DELETE FROM cards_fts WHERE cardId IN (SELECT id FROM cards WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders));
  DELETE FROM atmo_marks WHERE cardId IN (SELECT id FROM cards WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders));
  DELETE FROM page_pen WHERE cardId IN (SELECT id FROM cards WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders));
  DELETE FROM trash_stack WHERE cardId IN (SELECT id FROM cards WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders));
  DELETE FROM cross_book_references WHERE fromId IN (SELECT id FROM cards WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders));
  DELETE FROM trash WHERE entityType = 'card' AND entityId IN (SELECT id FROM cards WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders));
  DELETE FROM cards WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders)`;
}

// The one that lists them, for a report the author can read before anything is taken.
export function orphanCardRows(api) {
  return api.sql`SELECT id, bookId, folderId, name FROM cards
  WHERE folderId <> bookId AND folderId NOT IN (SELECT id FROM folders) ORDER BY bookId, id LIMIT 200`;
}

export function tally(res) {
  const out = { total: 0, byKind: {} };
  const row = rowsOf(res)[0] || {};
  for (const kind in row) {
    const n = num(row[kind]);
    out.byKind[kind] = n;
    // Neither of the two REPORTED classes is a dangling row the blanket sweep may take: an orphan
    // card holds the author's words, and a nameless card is healed by a WRITE, not by a delete.
    if (kind !== "orphan_cards" && kind !== "nameless_cards") out.total += n;
  }
  out.orphanCards = num(out.byKind.orphan_cards);
  out.namelessCards = num(out.byKind.nameless_cards);
  return out;
}

// THE VERB. Idempotent, callable from code: report(), then take what it named, then read back. opts: { apply: true|false (default true), orphanCards: "report" | "purge", namelessCards: "report" | "heal" } — heal writes '(unnamed)', explicit ask only returns { found, purged, remaining, orphanCards, orphans[], namelessCards, nameless[], clean }
export async function sweep(api, opts) {
  const o = opts || {};
  const apply = o.apply === undefined ? true : !!o.apply;
  const found = tally(await scan(api));
  const orphans = found.orphanCards ? rowsOf(await orphanCardRows(api)).map((r) => ({
    id: String(r.id || ""),
    bookId: String(r.bookId || ""),
    folderId: String(r.folderId || ""),
    name: String(r.name || ""),
  })) : [];
  // Reported on every call, healed on none unless asked — the cards are real, only their names are
  // missing, and inventing one behind the author's back is the wrong repair.
  const nameless = found.namelessCards ? rowsOf(await namelessCardRows(api)).map((r) => ({
    id: String(r.id || ""),
    bookId: String(r.bookId || ""),
    folderId: String(r.folderId || ""),
  })) : [];
  const healing = found.namelessCards && String(o.namelessCards) === "heal";

  if (!apply || (found.total === 0 && !healing && !(found.orphanCards && String(o.orphanCards) === "purge"))) {
    return {
      found: found.byKind,
      purged: 0,
      remaining: found.byKind,
      orphanCards: found.orphanCards,
      orphans: orphans,
      namelessCards: found.namelessCards,
      nameless: nameless,
      clean: found.total === 0,
      applied: false,
    };
  }

  if (found.total > 0) await purgeGhosts(api);
  if (found.orphanCards && String(o.orphanCards) === "purge") await purgeOrphanCards(api);
  if (healing) await healNamelessCards(api);

  const after = tally(await scan(api));
  if (after.total > 0) {
    throw new Error("[integrity] the sweep ran and " + after.total + " dangling row(s) are still there: " + JSON.stringify(after.byKind));
  }
  return {
    found: found.byKind,
    purged: found.total,
    remaining: after.byKind,
    orphanCards: after.orphanCards,
    orphans: orphans,
    namelessCards: after.namelessCards,
    nameless: nameless,
    clean: true,
    applied: true,
  };
}

// Read-only twin, for a status line or a check that must not write.
export async function report(api) {
  return await sweep(api, { apply: false });
}

// ── THE AUDIT LANE ──────────────────────────────────────────────────────────────────────────── Saved statements, so they run from ANY seat (a browser seat may only run SQL that is literally in a saved script — the digest law).
export function logForTarget(api, targetId) {
  return api.sql`SELECT seq, userId, actor, type, bookId, targetId, targetType
  FROM change_log WHERE targetId = ${targetId} ORDER BY seq DESC LIMIT 20`;
}

// The probe broom: one target's journal rows and one owner's pointer, gone. For test fixtures only —
// a real author's history is never swept by id.
export function forgetTarget(api, targetId, owner) {
  return api.sql`DELETE FROM change_log WHERE targetId = ${targetId};
  DELETE FROM undo_pointer WHERE userId = ${owner}`;
}

// A card row, hard, with no cascade — the fixture teardown twin of purgeCardRows.
export function forgetCardRow(api, cardId) {
  return api.sql`DELETE FROM cards WHERE id = ${cardId};
  DELETE FROM card_names WHERE cardId = ${cardId};
  DELETE FROM cards_fts WHERE cardId = ${cardId}`;
}

module.exports = { sweep, report, logForTarget, forgetTarget, forgetCardRow, PLACEHOLDER: false, VERSION: IDS ? 1 : 1 };
