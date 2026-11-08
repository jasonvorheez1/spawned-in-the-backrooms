// Guarded undo/redo and history. Verify current values before restoring rows; preserve identity and refresh affected caches and indexes.

const IDS = require("lib/ids.js");
// This file writes two `books` columns directly and mirrors them into the shelf index (applyRow).
const SHELFX = require("lib/shelf.js");
const STORE = require("lib/store.js");
// THE BOOK STAMP: a reversal runs the repository SILENT (nothing records), so this lane stamps the
//   book itself - once per undo or redo, after the side has been applied (lib/bookrev.js).
const BOOKREV = require("lib/bookrev.js");

const PLACEHOLDER = false; // the seam is filled

const CAP = 2000; // commands per person per project; oldest evicted
const TEXT_WINDOW = 0.4; // his 400ms text batching window, in seconds
const CONFIRM_ABOVE = 19; // "an 'are you sure?' confirmation dialogue on moves with more than 19 files"
const PROBE = "probe";

// --- the command list His Undoable Commands + the target each restores through. `structural: true` = reversing it creates or destroys rows, the repository's pipeline (house rule 2: a delete cleans pages, sections, card_tags, fts, stack membership and references BY HAND) — those reverse through a handler the repository registers, never through a half-cleanup here. NOT in his undoable list = journalled, not forwarded to UndoSystem — the doc's own structure ("Non-Undoable Operations — written only to ChangeLog"), so an unknown type from a plugin lands on the safe side by default. Reads are never journaled at all.

const COMMANDS = {
  // books
  CREATE_BOOK: { undoable: true, structural: true, target: "book" },
  RENAME_BOOK: { undoable: true, structural: false, target: "book" },
  DELETE_BOOK: { undoable: true, structural: true, target: "book" },
  REORDER_BOOK: { undoable: true, structural: false, target: "book" },
  // folders
  CREATE_FOLDER: { undoable: true, structural: true, target: "folder" },
  RENAME_FOLDER: { undoable: true, structural: false, target: "folder" },
  DELETE_FOLDER: { undoable: true, structural: true, target: "folder" },
  MOVE_FOLDER: { undoable: true, structural: false, target: "folder" },
  REORDER_FOLDER: { undoable: true, structural: false, target: "folder" },
  // cards
  CREATE_CARD: { undoable: true, structural: true, target: "card" },
  RENAME_CARD: { undoable: true, structural: false, target: "card" },
  DUPLICATE_CARD: { undoable: true, structural: true, target: "card" },
  MOVE_CARD: { undoable: true, structural: false, target: "card" },
  REORDER_CARD: { undoable: true, structural: false, target: "card" },
  UPDATE_CARD_METADATA: { undoable: true, structural: false, target: "card" },
  // tags on cards
  ADD_TAG_TO_CARD: { undoable: true, structural: false, target: "card" },
  REMOVE_TAG_FROM_CARD: { undoable: true, structural: false, target: "card" },
  // sections
  CREATE_SECTION: { undoable: true, structural: true, target: "section" },
  RENAME_SECTION: { undoable: true, structural: false, target: "section" },
  DELETE_SECTION: { undoable: true, structural: true, target: "section" },
  REORDER_SECTION: { undoable: true, structural: false, target: "section" },
  // pages
  CREATE_PAGE: { undoable: true, structural: true, target: "page" },
  DELETE_PAGE: { undoable: true, structural: true, target: "page" },
  REORDER_PAGE: { undoable: true, structural: false, target: "page" },
  UPDATE_PAGE_HEADER: { undoable: true, structural: false, target: "page" },
  UPDATE_PAGE_FOOTER: { undoable: true, structural: false, target: "page" },
  // Routes through a registered handler because the page spec lives in the book's settings, not in
  //   a schema.js book table — there is no statement here to reverse it with.
  SET_ASSET_PAGES: { undoable: true, structural: true, target: "card" },
  SET_SCORE_INSTRUMENTS: { undoable: true, structural: true, target: "card" },
  UPDATE_PAGE_SPEC: { undoable: true, structural: true, target: "book" },
  // stacks
  SET_STACK_PRIMARY: { undoable: true, structural: false, target: "stack" },
  REORDER_STACK_CARD: { undoable: true, structural: false, target: "card" },
  // content — one command per batching window, never one per keystroke
  INSERT_TEXT: { undoable: true, structural: false, target: "text", text: true },
  DELETE_TEXT: { undoable: true, structural: false, target: "text", text: true },
  REPLACE_TEXT: { undoable: true, structural: false, target: "text", text: true },

  // lib/cards.js is the only lane that records, and it writes these names — a name missing from this
  //   table lands as UNKNOWN and is never forwarded to UndoSystem.
  SET_CARD_META: { undoable: true, structural: false, target: "card" }, // his UPDATE_CARD_METADATA
  ADD_TAG: { undoable: true, structural: false, target: "card" }, // his ADD_TAG_TO_CARD
  REMOVE_TAG: { undoable: true, structural: false, target: "card" }, // his REMOVE_TAG_FROM_CARD
  SET_PAGE_CONTENT: { undoable: true, structural: false, target: "page" },
  SET_PAGE_CHROME: { undoable: true, structural: false, target: "page" }, // title/header/footer
  // A paste is ONE gesture however many pages it spilled into — one row, one Ctrl+Z.
  PASTE_PAGES: { undoable: true, structural: true, target: "page" },
  SET_SECTION_CONTENT: { undoable: true, structural: false, target: "section" },
  // A card's PICTURE — one press of Generate / Regenerate / Remove. Routed through a registered handler (structural in the routing sense only, like UPDATE_PAGE_SPEC) because the row lives in card_images and no statement here reverses it; app-shell registers the inverse. before/after carry { prompt, url, version } — version 0 = "this card had no picture".
  SET_CARD_IMAGE: { undoable: true, structural: true, target: "card" },
  // Edit ▸ Find & Replace…. Routed through a registered handler (structural in the routing sense only) because the reversal walks that payload — pages, sections, summaries, card names in one pass — the repository's pipeline, not a single statement here. Target is the BOOK: the gesture's scope.
  REPLACE_IN_BOOK: { undoable: true, structural: true, target: "book" },
  // Trash and restore ARE reversible here — a departure from the doc block above: his list has no TRASH_ENTITY, and the Trash view still owns its own restore. What jace asked for is that Ctrl+Z takes back the card he just dropped in the can — so the pair reverses through the repository's own trash pipeline (a registered handler), not through a row rewrite.
  TRASH_CARD: { undoable: true, structural: true, target: "card" },
  RESTORE_CARD: { undoable: true, structural: true, target: "card" },
  TRASH_FOLDER: { undoable: true, structural: true, target: "folder" },

  // his Non-Undoable Operations — journalled, never forwarded to UndoSystem
  MOVE_FOLDER_CROSS_BOOK: {
    undoable: false,
    target: "folder",
    reason: "a cross-book move is not undoable — his ruling: it would be too expensive",
  },
  MOVE_CARD_CROSS_BOOK: {
    undoable: false,
    target: "card",
    reason: "a cross-book move is not undoable — his ruling: it would be too expensive",
  },
  SET_FOLDER_COLLAPSED: {
    undoable: false,
    target: "folder",
    reason: "collapse state lives in the book's own table and is not tracked by UndoSystem",
  },
  TRASH_ENTITY: {
    undoable: false,
    target: "entity",
    reason: "not in his undoable list — the Trash view owns restore",
  },
  RESTORE_ENTITY: {
    undoable: false,
    target: "entity",
    reason: "not in his undoable list — the Trash view owns restore",
  },
  PURGE_ENTITY: {
    undoable: false,
    target: "entity",
    reason: "permanent delete runs the reference replacement pipeline; it does not come back",
  },
};

// NOT commands: reads of any kind, selection, view state, and every Config setting.

// Structural reversal belongs to whoever owns the cleanup — registerUndo(type, fn), side "before" | "after".
const HANDLERS = {};
export function registerUndo(type, fn) {
  if (typeof fn === "function") HANDLERS[String(type)] = fn;
}

// A reversal writes the row back; refs.js/cards.js register the re-index. Until one is registered,
// every result carries `reindex` so the caller can do it themselves.
let REINDEX = null;
export function registerReindex(fn) {
  REINDEX = typeof fn === "function" ? fn : null;
}

// Writes land in the database immediately here, so "unsaved" = an open text batching window or a
//   record whose INSERT is still in flight. Per-seat, in memory, read synchronously by the footer.

const ind = { dirty: false, saving: 0, savedAt: 0, error: null };

export function indicator() {
  const state = ind.error
    ? "error"
    : ind.saving > 0
    ? "saving"
    : ind.dirty
    ? "unsaved"
    : ind.savedAt
    ? "saved"
    : "idle";
  return {
    state,
    unsaved: !!ind.dirty || ind.saving > 0,
    saving: ind.saving > 0,
    savedAt: ind.savedAt,
    error: ind.error,
  };
}

// Anything that moves the indicator calls fire() — a listener never breaks a write.
const LISTENERS = [];

export function watch(fn) {
  if (typeof fn !== "function") return function () {};
  if (LISTENERS.indexOf(fn) < 0) LISTENERS.push(fn);
  return function () {
    const i = LISTENERS.indexOf(fn);
    if (i >= 0) LISTENERS.splice(i, 1);
  };
}

export function fire() {
  const snap = indicator();
  for (let i = 0; i < LISTENERS.length; i++) {
    try {
      LISTENERS[i](snap);
    } catch (e) {
      /* a footer listener never breaks a write */
    }
  }
  return snap;
}

export function markDirty() {
  ind.dirty = true;
  ind.error = null;
  return fire();
}

export function markSaved(at) {
  ind.dirty = pendingText.size > 0;
  ind.error = null;
  if (Number(at || 0)) ind.savedAt = Number(at);
  return fire();
}

export function clearError() {
  ind.error = null;
  return fire();
}

// 'Undo Rename Card', not 'Undo' — the menu asks for words; the log holds a type.

const WORDS = {
  SET_CARD_META: "Card Details",
  SET_CARD_IMAGE: "Card Picture",
  SET_PAGE_CONTENT: "Page Text",
  SET_PAGE_CHROME: "Page Header",
  SET_SECTION_CONTENT: "Section Text",
  UPDATE_CARD_METADATA: "Card Details",
  UPDATE_PAGE_HEADER: "Page Header",
  UPDATE_PAGE_FOOTER: "Page Footer",
  UPDATE_PAGE_SPEC: "Page Layout",
  SET_ASSET_PAGES: "Asset Studio",
  SET_SCORE_INSTRUMENTS: "Score Instruments",
  ADD_TAG: "Add Tag",
  REMOVE_TAG: "Remove Tag",
  ADD_TAG_TO_CARD: "Add Tag",
  REMOVE_TAG_FROM_CARD: "Remove Tag",
  REPLACE_IN_BOOK: "Find & Replace",
  PASTE_PAGES: "Paste",
  SET_STACK_PRIMARY: "Set Primary",
  REORDER_STACK_CARD: "Reorder Stack",
  INSERT_TEXT: "Typing",
  DELETE_TEXT: "Typing",
  REPLACE_TEXT: "Typing",
};

export function describe(type) {
  const t = str(type);
  if (!t) return "";
  if (WORDS[t]) return WORDS[t];
  return t
    .toLowerCase()
    .split("_")
    .filter(function (w) {
      return !!w;
    })
    .map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

// --- plugin emission limit
// The enforceable half of his PermissionDispatcher: commands go through here, so a plugin
//   invocation can be given a budget and refused past it.

const budgets = {};
export function pluginBudget(pluginId, limit) {
  const key = String(pluginId || "");
  if (!key) return null;
  const n = Math.max(0, Math.floor(Number(limit) || 0));
  budgets[key] = { left: n, limit: n };
  return budgets[key];
}
export function spendBudget(pluginId) {
  const key = String(pluginId || "");
  if (!key) return true;
  const b = budgets[key];
  if (!b) return true; // no budget declared = no limit
  if (b.left <= 0) return false;
  b.left -= 1;
  return true;
}

export function str(v) {
  return v === null || v === undefined ? "" : String(v);
}
export function json(v) {
  try {
    return JSON.stringify(v === null || v === undefined ? {} : v);
  } catch (e) {
    return "{}";
  }
}
export function unjson(v) {
  if (!v) return {};
  try {
    const out = JSON.parse(String(v));
    return out && typeof out === "object" ? out : {};
  } catch (e) {
    return {};
  }
}
export function rowsOf(res) {
  return (res && res.rows) || [];
}
export function first(res) {
  return rowsOf(res)[0] || null;
}
// Falls back to the other side, then a default — a partial snapshot must never write empty strings
// over columns the command did not touch.
export function pick(snap, other, key, dflt) {
  if (snap && Object.prototype.hasOwnProperty.call(snap, key) && snap[key] !== undefined) return snap[key];
  if (other && Object.prototype.hasOwnProperty.call(other, key) && other[key] !== undefined) return other[key];
  return dflt;
}

export function specFor(type) {
  return COMMANDS[String(type || "")] || null;
}

export function isCommand(type) {
  return !!specFor(type);
}

// undoable = his list says so, AND the caller did not opt out, AND a plugin command declared it.
export function isUndoable(type, opts) {
  const spec = specFor(type);
  if (!spec || !spec.undoable) return false;
  const o = opts || {};
  if (str(o.pluginId)) return o.undoable === true; // non-declared plugin commands are non-undoable
  return o.undoable !== false;
}

export function reasonFor(type, opts) {
  const spec = specFor(type);
  if (!spec) return "not one of his commands — journalled, not undoable";
  if (!spec.undoable) return spec.reason || "not in his undoable list";
  const o = opts || {};
  if (str(o.pluginId) && o.undoable !== true) return "the plugin did not declare this command undoable";
  if (o.undoable === false) return "the caller recorded it as non-undoable";
  return "";
}

// Append + pointer is one transaction. Document mutation is a separate repository operation.
export function namedOwner(lane, owner) {
  const id = str(owner);
  if (!id || (lane !== PROBE && lane !== "seat")) throw new Error("changelog: invalid history owner");
  return lane === PROBE ? "probe:" + id : id;
}
export function stmtAppend(api, lane, owner, r) {
  const p = r.projectId;
  const u = r.undoable ? 1 : 0;
  if (lane !== "player") {
    const ownerId = namedOwner(lane, owner);
    return api.sql`
      DELETE FROM change_log WHERE userId = ${ownerId} AND projectId = ${p} AND undoable = 1
        AND seq > (SELECT seq FROM undo_pointer WHERE userId = ${ownerId} AND projectId = ${p});
      INSERT INTO change_log (id, projectId, userId, actor, type, bookId, targetId, targetType, before, after, undoable, pluginId, lamport, at)
        VALUES (${r.id}, ${p}, ${ownerId}, ${r.actor}, ${r.type}, ${r.bookId}, ${r.targetId}, ${r.targetType},
          ${r.before}, ${r.after}, ${u}, ${r.pluginId},
          (SELECT COALESCE(MAX(lamport), 0) + 1 FROM change_log WHERE projectId = ${p}),
          CAST(unixepoch('subsec') * 1000 AS INTEGER));
      INSERT INTO undo_pointer (userId, projectId, seq, updatedAt)
        VALUES (${ownerId}, ${p},
          CASE WHEN ${u} = 1 THEN (SELECT MAX(seq) FROM change_log WHERE userId = ${ownerId} AND projectId = ${p}) ELSE 0 END,
          CAST(unixepoch('subsec') * 1000 AS INTEGER))
        ON CONFLICT(userId, projectId) DO UPDATE SET
          seq = CASE WHEN ${u} = 1 THEN excluded.seq ELSE undo_pointer.seq END,
          updatedAt = excluded.updatedAt;
      DELETE FROM change_log WHERE seq IN (
        SELECT seq FROM change_log WHERE userId = ${ownerId} AND projectId = ${p}
        ORDER BY seq DESC LIMIT -1 OFFSET ${CAP});
      SELECT seq, at FROM change_log WHERE userId = ${ownerId} AND projectId = ${p}
        ORDER BY seq DESC LIMIT 1`;
  }

  return api.sql`
    DELETE FROM change_log WHERE userId = @caller AND projectId = ${p} AND undoable = 1
      AND seq > (SELECT seq FROM undo_pointer WHERE userId = @caller AND projectId = ${p});
    INSERT INTO change_log (id, projectId, userId, actor, type, bookId, targetId, targetType, before, after, undoable, pluginId, lamport, at)
      VALUES (${r.id}, ${p}, @caller, ${r.actor}, ${r.type}, ${r.bookId}, ${r.targetId}, ${r.targetType},
        ${r.before}, ${r.after}, ${u}, ${r.pluginId},
        (SELECT COALESCE(MAX(lamport), 0) + 1 FROM change_log WHERE projectId = ${p}),
        CAST(unixepoch('subsec') * 1000 AS INTEGER));
    INSERT INTO undo_pointer (userId, projectId, seq, updatedAt)
      VALUES (@caller, ${p},
        CASE WHEN ${u} = 1 THEN (SELECT MAX(seq) FROM change_log WHERE userId = @caller AND projectId = ${p}) ELSE 0 END,
        CAST(unixepoch('subsec') * 1000 AS INTEGER))
      ON CONFLICT(userId, projectId) DO UPDATE SET
        seq = CASE WHEN ${u} = 1 THEN excluded.seq ELSE undo_pointer.seq END,
        updatedAt = excluded.updatedAt;
    DELETE FROM change_log WHERE seq IN (
      SELECT seq FROM change_log WHERE userId = @caller AND projectId = ${p}
      ORDER BY seq DESC LIMIT -1 OFFSET ${CAP});
    SELECT seq, at FROM change_log WHERE userId = @caller AND projectId = ${p}
      ORDER BY seq DESC LIMIT 1`;
}

// The candidate AND the verdict on it in ONE read: my newest applied undoable command, plus the
// newest LIVE command on the same target by anyone else after it.
export function stmtNextUndo(api, lane, owner, projectId) {
  if (lane !== "player") {
    const ownerId = namedOwner(lane, owner);
    return api.sql`
      WITH mine AS (
        SELECT c.seq, c.id, c.projectId, c.userId, c.actor, c.type, c.bookId, c.targetId, c.targetType,
               c.before, c.after, c.undoable, c.pluginId
        FROM change_log c JOIN undo_pointer p ON p.userId = c.userId AND p.projectId = c.projectId
        WHERE c.userId = ${ownerId} AND c.projectId = ${projectId} AND c.undoable = 1 AND c.seq <= p.seq
        ORDER BY c.seq DESC LIMIT 1)
      SELECT mine.*,
        (SELECT o.actor FROM change_log o LEFT JOIN undo_pointer q ON q.userId = o.userId AND q.projectId = o.projectId
           WHERE o.projectId = mine.projectId AND o.targetId = mine.targetId AND o.seq > mine.seq
             AND o.userId <> mine.userId AND (o.undoable = 0 OR o.seq <= COALESCE(q.seq, 0))
           ORDER BY o.seq DESC LIMIT 1) AS touchedActor,
        (SELECT o.userId FROM change_log o LEFT JOIN undo_pointer q ON q.userId = o.userId AND q.projectId = o.projectId
           WHERE o.projectId = mine.projectId AND o.targetId = mine.targetId AND o.seq > mine.seq
             AND o.userId <> mine.userId AND (o.undoable = 0 OR o.seq <= COALESCE(q.seq, 0))
           ORDER BY o.seq DESC LIMIT 1) AS touchedUser,
        (SELECT o.type FROM change_log o LEFT JOIN undo_pointer q ON q.userId = o.userId AND q.projectId = o.projectId
           WHERE o.projectId = mine.projectId AND o.targetId = mine.targetId AND o.seq > mine.seq
             AND o.userId <> mine.userId AND (o.undoable = 0 OR o.seq <= COALESCE(q.seq, 0))
           ORDER BY o.seq DESC LIMIT 1) AS touchedType
      FROM mine`;
  }
  return api.sql`
    WITH mine AS (
      SELECT c.seq, c.id, c.projectId, c.userId, c.actor, c.type, c.bookId, c.targetId, c.targetType,
             c.before, c.after, c.undoable, c.pluginId
      FROM change_log c JOIN undo_pointer p ON p.userId = c.userId AND p.projectId = c.projectId
      WHERE c.userId = @caller AND c.projectId = ${projectId} AND c.undoable = 1 AND c.seq <= p.seq
      ORDER BY c.seq DESC LIMIT 1)
    SELECT mine.*,
      (SELECT o.actor FROM change_log o LEFT JOIN undo_pointer q ON q.userId = o.userId AND q.projectId = o.projectId
         WHERE o.projectId = mine.projectId AND o.targetId = mine.targetId AND o.seq > mine.seq
           AND o.userId <> mine.userId AND (o.undoable = 0 OR o.seq <= COALESCE(q.seq, 0))
         ORDER BY o.seq DESC LIMIT 1) AS touchedActor,
      (SELECT o.userId FROM change_log o LEFT JOIN undo_pointer q ON q.userId = o.userId AND q.projectId = o.projectId
         WHERE o.projectId = mine.projectId AND o.targetId = mine.targetId AND o.seq > mine.seq
           AND o.userId <> mine.userId AND (o.undoable = 0 OR o.seq <= COALESCE(q.seq, 0))
         ORDER BY o.seq DESC LIMIT 1) AS touchedUser,
      (SELECT o.type FROM change_log o LEFT JOIN undo_pointer q ON q.userId = o.userId AND q.projectId = o.projectId
         WHERE o.projectId = mine.projectId AND o.targetId = mine.targetId AND o.seq > mine.seq
           AND o.userId <> mine.userId AND (o.undoable = 0 OR o.seq <= COALESCE(q.seq, 0))
         ORDER BY o.seq DESC LIMIT 1) AS touchedType
    FROM mine`;
}

// The pointer steps down to my previous applied undoable command (0 when there is none).
export function stmtPointerDown(api, lane, owner, projectId, seq) {
  if (lane !== "player") {
    const ownerId = namedOwner(lane, owner);
    return api.sql`UPDATE undo_pointer SET
      seq = COALESCE((SELECT MAX(seq) FROM change_log WHERE userId = ${ownerId} AND projectId = ${projectId}
        AND undoable = 1 AND seq < ${seq}), 0),
      updatedAt = CAST(unixepoch('subsec') * 1000 AS INTEGER)
      WHERE userId = ${ownerId} AND projectId = ${projectId}`;
  }
  return api.sql`UPDATE undo_pointer SET
    seq = COALESCE((SELECT MAX(seq) FROM change_log WHERE userId = @caller AND projectId = ${projectId}
      AND undoable = 1 AND seq < ${seq}), 0),
    updatedAt = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE userId = @caller AND projectId = ${projectId}`;
}

// My oldest undone command — redo re-applies in the order the undos took them off.
export function stmtNextRedo(api, lane, owner, projectId) {
  if (lane !== "player") {
    const ownerId = namedOwner(lane, owner);
    return api.sql`
      WITH mine AS (
        SELECT c.seq, c.id, c.projectId, c.userId, c.actor, c.type, c.bookId, c.targetId, c.targetType,
               c.before, c.after, c.undoable, c.pluginId
        FROM change_log c JOIN undo_pointer p ON p.userId = c.userId AND p.projectId = c.projectId
        WHERE c.userId = ${ownerId} AND c.projectId = ${projectId} AND c.undoable = 1 AND c.seq > p.seq
        ORDER BY c.seq ASC LIMIT 1)
      SELECT mine.*,
        (SELECT o.actor FROM change_log o LEFT JOIN undo_pointer q ON q.userId = o.userId AND q.projectId = o.projectId
           WHERE o.projectId = mine.projectId AND o.targetId = mine.targetId AND o.seq > mine.seq
             AND o.userId <> mine.userId AND (o.undoable = 0 OR o.seq <= COALESCE(q.seq, 0))
           ORDER BY o.seq DESC LIMIT 1) AS touchedActor,
        (SELECT o.userId FROM change_log o LEFT JOIN undo_pointer q ON q.userId = o.userId AND q.projectId = o.projectId
           WHERE o.projectId = mine.projectId AND o.targetId = mine.targetId AND o.seq > mine.seq
             AND o.userId <> mine.userId AND (o.undoable = 0 OR o.seq <= COALESCE(q.seq, 0))
           ORDER BY o.seq DESC LIMIT 1) AS touchedUser,
        (SELECT o.type FROM change_log o LEFT JOIN undo_pointer q ON q.userId = o.userId AND q.projectId = o.projectId
           WHERE o.projectId = mine.projectId AND o.targetId = mine.targetId AND o.seq > mine.seq
             AND o.userId <> mine.userId AND (o.undoable = 0 OR o.seq <= COALESCE(q.seq, 0))
           ORDER BY o.seq DESC LIMIT 1) AS touchedType
      FROM mine`;
  }
  return api.sql`
    WITH mine AS (
      SELECT c.seq, c.id, c.projectId, c.userId, c.actor, c.type, c.bookId, c.targetId, c.targetType,
             c.before, c.after, c.undoable, c.pluginId
      FROM change_log c JOIN undo_pointer p ON p.userId = c.userId AND p.projectId = c.projectId
      WHERE c.userId = @caller AND c.projectId = ${projectId} AND c.undoable = 1 AND c.seq > p.seq
      ORDER BY c.seq ASC LIMIT 1)
    SELECT mine.*,
      (SELECT o.actor FROM change_log o LEFT JOIN undo_pointer q ON q.userId = o.userId AND q.projectId = o.projectId
         WHERE o.projectId = mine.projectId AND o.targetId = mine.targetId AND o.seq > mine.seq
           AND o.userId <> mine.userId AND (o.undoable = 0 OR o.seq <= COALESCE(q.seq, 0))
         ORDER BY o.seq DESC LIMIT 1) AS touchedActor,
      (SELECT o.userId FROM change_log o LEFT JOIN undo_pointer q ON q.userId = o.userId AND q.projectId = o.projectId
         WHERE o.projectId = mine.projectId AND o.targetId = mine.targetId AND o.seq > mine.seq
           AND o.userId <> mine.userId AND (o.undoable = 0 OR o.seq <= COALESCE(q.seq, 0))
         ORDER BY o.seq DESC LIMIT 1) AS touchedUser,
      (SELECT o.type FROM change_log o LEFT JOIN undo_pointer q ON q.userId = o.userId AND q.projectId = o.projectId
         WHERE o.projectId = mine.projectId AND o.targetId = mine.targetId AND o.seq > mine.seq
           AND o.userId <> mine.userId AND (o.undoable = 0 OR o.seq <= COALESCE(q.seq, 0))
         ORDER BY o.seq DESC LIMIT 1) AS touchedType
    FROM mine`;
}

export function stmtPointerTo(api, lane, owner, projectId, seq) {
  if (lane !== "player") {
    const ownerId = namedOwner(lane, owner);
    return api.sql`UPDATE undo_pointer SET seq = ${seq}, updatedAt = CAST(unixepoch('subsec') * 1000 AS INTEGER)
      WHERE userId = ${ownerId} AND projectId = ${projectId}`;
  }
  return api.sql`UPDATE undo_pointer SET seq = ${seq}, updatedAt = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE userId = @caller AND projectId = ${projectId}`;
}

// canUndo/canRedo AND the words for each side, in the one round trip the greying already costs.
export function stmtStatus(api, lane, owner, projectId) {
  if (lane !== "player") {
    const ownerId = namedOwner(lane, owner);
    return api.sql`SELECT
      EXISTS(SELECT 1 FROM change_log c JOIN undo_pointer p ON p.userId = c.userId AND p.projectId = c.projectId
        WHERE c.userId = ${ownerId} AND c.projectId = ${projectId} AND c.undoable = 1 AND c.seq <= p.seq) AS canUndo,
      EXISTS(SELECT 1 FROM change_log c JOIN undo_pointer p ON p.userId = c.userId AND p.projectId = c.projectId
        WHERE c.userId = ${ownerId} AND c.projectId = ${projectId} AND c.undoable = 1 AND c.seq > p.seq) AS canRedo,
      (SELECT c.type FROM change_log c JOIN undo_pointer p ON p.userId = c.userId AND p.projectId = c.projectId
        WHERE c.userId = ${ownerId} AND c.projectId = ${projectId} AND c.undoable = 1 AND c.seq <= p.seq
        ORDER BY c.seq DESC LIMIT 1) AS undoType,
      (SELECT c.type FROM change_log c JOIN undo_pointer p ON p.userId = c.userId AND p.projectId = c.projectId
        WHERE c.userId = ${ownerId} AND c.projectId = ${projectId} AND c.undoable = 1 AND c.seq > p.seq
        ORDER BY c.seq ASC LIMIT 1) AS redoType,
      (SELECT COUNT(*) FROM change_log WHERE userId = ${ownerId} AND projectId = ${projectId}) AS logged`;
  }
  return api.sql`SELECT
    EXISTS(SELECT 1 FROM change_log c JOIN undo_pointer p ON p.userId = c.userId AND p.projectId = c.projectId
      WHERE c.userId = @caller AND c.projectId = ${projectId} AND c.undoable = 1 AND c.seq <= p.seq) AS canUndo,
    EXISTS(SELECT 1 FROM change_log c JOIN undo_pointer p ON p.userId = c.userId AND p.projectId = c.projectId
      WHERE c.userId = @caller AND c.projectId = ${projectId} AND c.undoable = 1 AND c.seq > p.seq) AS canRedo,
    (SELECT c.type FROM change_log c JOIN undo_pointer p ON p.userId = c.userId AND p.projectId = c.projectId
      WHERE c.userId = @caller AND c.projectId = ${projectId} AND c.undoable = 1 AND c.seq <= p.seq
      ORDER BY c.seq DESC LIMIT 1) AS undoType,
    (SELECT c.type FROM change_log c JOIN undo_pointer p ON p.userId = c.userId AND p.projectId = c.projectId
      WHERE c.userId = @caller AND c.projectId = ${projectId} AND c.undoable = 1 AND c.seq > p.seq
      ORDER BY c.seq ASC LIMIT 1) AS redoType,
    (SELECT COUNT(*) FROM change_log WHERE userId = @caller AND projectId = ${projectId}) AS logged`;
}

// A book's own reversal runs from here; library.js still owns every forward write to the shelf.
export function stmtBookName(api, id, name) {
  return api.sql`UPDATE books SET name = ${name} WHERE id = ${id}`;
}
export function stmtBookKey(api, id, sortKey) {
  return api.sql`UPDATE books SET sortKey = ${sortKey} WHERE id = ${id}`;
}

// --- reversal
// Every value-restoring inverse runs through statements that ALREADY exist in schema.js's
//   bookQueries() — nothing was added there. Structural ones go to a registered handler.

export async function applySide(objectApi, row, side) {
  await require("lib/book-home.js").history(objectApi,row);
  const spec = specFor(row.type);
  if (!spec) throw new Error(`changelog: ${row.type} is not a command`);
  const snap = side === "before" ? row.before : row.after;
  const other = side === "before" ? row.after : row.before;

  if (spec.structural) {
    const fn = HANDLERS[row.type];
    if (typeof fn !== "function") {
      const e = new Error(`changelog: ${row.type} needs a registered handler (registerUndo) to reverse`);
      e.code = "no-handler";
      throw e;
    }
    await fn(objectApi, row, side);
    return;
  }

  // These write `books` directly, around lib/library.js, so they owe the shelf index the same value —
  //   disk first, then memory, exactly as library.js does it.
  if (row.type === "RENAME_BOOK") {
    const name = str(pick(snap, other, "name", ""));
    await stmtBookName(objectApi, row.targetId, name);
    SHELFX.patchBook(row.targetId, { name: name });
    return;
  }
  if (row.type === "REORDER_BOOK") {
    const sortKey = str(pick(snap, other, "sortKey", ""));
    await stmtBookKey(objectApi, row.targetId, sortKey);
    SHELFX.patchBook(row.targetId, { sortKey: sortKey });
    return;
  }

  // A null entry means one thing only: row.bookId is not an id at all.
  const h = row.bookId ? STORE.book(row.bookId) : null;
  if (!h) {
    const e = new Error(`changelog: "${row.bookId || "(none)"}" is not a book id`);
    e.code = "no-book-tables";
    throw e;
  }
  const id = row.targetId;

  switch (row.type) {
    case "RENAME_CARD":
      await h.cardRename(objectApi, id, str(pick(snap, other, "name", "")));
      return;
    case "MOVE_CARD":
    case "REORDER_CARD":
      await h.cardMove(objectApi, id, str(pick(snap, other, "folderId", "")), str(pick(snap, other, "sortKey", "")));
      return;
    case "UPDATE_CARD_METADATA":
    case "SET_CARD_META":
      await h.cardSetMeta(
        objectApi,
        id,
        str(pick(snap, other, "status", "")),
        Math.floor(Number(pick(snap, other, "priority", 0)) || 0),
        str(pick(snap, other, "summary", "")),
        pick(snap, other, "openQuestion", 0) ? 1 : 0,
        pick(snap, other, "editor", undefined)
      );
      return;
    case "REORDER_STACK_CARD":
      await h.cardReorderInStack(objectApi, id, str(pick(snap, other, "stackOrder", "")));
      return;
    case "SET_STACK_PRIMARY":
      // The whole stack's membership key moves back to the side being restored.
      await h.stackSetPrimary(objectApi, str(pick(other, snap, "stackId", "")), str(pick(snap, other, "stackId", "")));
      return;
    case "ADD_TAG_TO_CARD":
    case "ADD_TAG": {
      const tagId = str(pick(snap, other, "tagId", ""));
      if (side === "before") await h.tagRemove(objectApi, id, tagId);
      else await h.tagAdd(objectApi, id, tagId);
      return;
    }
    case "REMOVE_TAG_FROM_CARD":
    case "REMOVE_TAG": {
      const tagId = str(pick(snap, other, "tagId", ""));
      if (side === "before") await h.tagAdd(objectApi, id, tagId);
      else await h.tagRemove(objectApi, id, tagId);
      return;
    }
    case "RENAME_FOLDER":
      await h.folderRename(objectApi, id, str(pick(snap, other, "name", "")));
      return;
    case "MOVE_FOLDER":
    case "REORDER_FOLDER":
      await h.folderMove(objectApi, id, str(pick(snap, other, "folderId", "")), str(pick(snap, other, "sortKey", "")));
      return;
    case "RENAME_SECTION":
      await h.sectionRename(objectApi, id, str(pick(snap, other, "name", "")));
      return;
    case "REORDER_SECTION":
      await h.sectionReorder(objectApi, id, str(pick(snap, other, "sortKey", "")));
      return;
    case "REORDER_PAGE":
      await h.pageReorder(objectApi, id, str(pick(snap, other, "sortKey", "")));
      return;
    case "UPDATE_PAGE_HEADER":
    case "UPDATE_PAGE_FOOTER":
    case "SET_PAGE_CHROME":
      await h.pageSetChrome(
        objectApi,
        id,
        str(pick(snap, other, "title", "")),
        str(pick(snap, other, "header", "")),
        str(pick(snap, other, "footer", ""))
      );
      return;
    case "INSERT_TEXT":
    case "DELETE_TEXT":
    case "REPLACE_TEXT":
    // The inverse is the same statement with the other side's text in it.
    case "SET_PAGE_CONTENT":
    case "SET_SECTION_CONTENT": {
      const content = str(pick(snap, other, "content", ""));
      if (row.targetType === "section" || row.type === "SET_SECTION_CONTENT") {
        await h.sectionSetContent(objectApi, id, content);
      } else {
        await h.pageSetContent(objectApi, id, content);
      }
      return;
    }
    default: {
      const e = new Error(`changelog: no inverse for ${row.type}`);
      e.code = "no-inverse";
      throw e;
    }
  }
}

// The fts row and the id->name map are not this lane's format. Tell whoever owns them.
export async function reindex(objectApi, row) {
  const note = {
    cardId: row.targetType === "card" ? row.targetId : "",
    bookId: row.bookId,
    type: row.type,
    done: false,
  };
  if (REINDEX) {
    await REINDEX(objectApi, row);
    note.done = true;
  }
  try {
    if (objectApi.emit) {
      objectApi.emit("changelog:reversed", {
        type: row.type,
        bookId: row.bookId,
        targetId: row.targetId,
        targetType: row.targetType,
      });
    }
  } catch (e) {
    /* emit is a courtesy to the listener lanes, never a reason to fail an undo */
  }
  return note;
}

export function shapeRow(raw) {
  return {
    seq: Number(raw.seq || 0),
    id: str(raw.id),
    projectId: str(raw.projectId),
    userId: str(raw.userId),
    actor: str(raw.actor),
    type: str(raw.type),
    bookId: str(raw.bookId),
    targetId: str(raw.targetId),
    targetType: str(raw.targetType),
    before: unjson(raw.before),
    after: unjson(raw.after),
    undoable: Number(raw.undoable || 0) === 1,
    pluginId: str(raw.pluginId),
  };
}

export async function recordOn(objectApi, cmd, lane, owner) {
  const c = cmd || {};
  const projectId = str(c.projectId);
  const type = str(c.type);
  if (!projectId) throw new Error("changelog: record needs a projectId");
  if (!type) throw new Error("changelog: record needs a type");
  const pluginId = str(c.pluginId);
  if (pluginId && !spendBudget(pluginId)) {
    const e = new Error(`changelog: plugin ${pluginId} is past its command emission limit`);
    e.code = "emission-limit";
    throw e;
  }
  const row = {
    id: IDS.uid(objectApi, 0),
    projectId,
    actor: str(c.actor),
    type,
    bookId: str(c.bookId),
    targetId: str(c.targetId),
    targetType: str(c.targetType) || (specFor(type) ? specFor(type).target : ""),
    before: json(c.before),
    after: json(c.after),
    undoable: isUndoable(type, c),
    pluginId,
  };
  ind.dirty = true;
  ind.saving += 1;
  fire(); // the footer reads "Saving…" for exactly as long as this INSERT is in the air
  let res = null;
  try {
    res = await stmtAppend(objectApi, lane, owner, row);
  } catch (e) {
    ind.saving = Math.max(0, ind.saving - 1);
    ind.error = (e && e.message) || String(e);
    fire(); // …and "Not saved — <reason>" the moment it isn't
    throw e; // a failed write is surfaced, never swallowed
  }
  ind.saving = Math.max(0, ind.saving - 1);
  const landed = first(res) || {};
  if (ind.saving === 0) markSaved(Number(landed.at || 0));
  else fire();
  return Number(landed.seq || 0);
}

// The acting seat's REAL id, from engine-verified sources only — api.userId where the handle is a player's, else the seat row behind a god entity (its id is "god/<playerEntityId>"). Never a parameter, never anything a caller could spell.
export function seatUserId(objectApi) {
  try {
    const direct = str(objectApi && objectApi.userId);
    if (direct) return direct;
  } catch (e) {
    /* not a player handle */
  }
  try {
    const id = str(objectApi && objectApi.id);
    const seat = id.indexOf("god/") === 0 ? id.slice(4) : id;
    const players = (objectApi && typeof objectApi.getPlayers === "function" && objectApi.getPlayers()) || [];
    for (let i = 0; i < players.length; i++) {
      const p = players[i] || {};
      if (str(p.id || p.entityId) === seat) return str(p.userId);
    }
  } catch (e) {
    /* no roster on this seat */
  }
  return "";
}

// Select before issuing SQL: a caught @caller refusal still faults a host pass.
export function historyScope(objectApi, opts) {
  const probe = str(opts && opts.probe);
  if (probe) return { lane: PROBE, owner: probe };
  const direct = str(objectApi && objectApi.userId);
  if (direct) return { lane: "player", owner: direct };
  const id = str(objectApi && (objectApi.id || (objectApi.self && objectApi.self.id)));
  if (id.indexOf("god/") === 0) {
    const owner = seatUserId(objectApi);
    if (!owner) throw new Error("changelog: this editor's player identity is unavailable; history was not changed");
    return { lane: "seat", owner };
  }
  return { lane: PROBE, owner: "savi" };
}

export function scopeKey(scope) { return scope.lane + "|" + scope.owner; }

export async function record(objectApi, cmd) {
  const scope = historyScope(objectApi, cmd);
  return recordOn(objectApi, cmd, scope.lane, scope.owner);
}

// His 400ms text window: one command per window, never one per keystroke — the first `before` is
//   kept, the latest `after` wins.

const pendingText = new Map();

export function textKey(cmd) {
  return `${str(cmd.projectId)}|${str(cmd.bookId)}|${str(cmd.targetType)}|${str(cmd.targetId)}|${str(cmd.type)}`;
}

export async function flushTextOn(objectApi, scope) {
  const key = scopeKey(scope), open = pendingText.get(key);
  if (!open) return 0;
  if (open.flushing) return open.flushing;
  open.flushing = recordOn(objectApi, open.cmd, scope.lane, scope.owner).then(seq => {
    if (pendingText.get(key) === open) pendingText.delete(key);
    // recordOn saw the pending entry; refresh the indicator after retiring it.
    ind.dirty = pendingText.size > 0;
    fire();
    return seq;
  }, error => {
    open.flushing = null; // retain the real before/after for an explicit retry
    throw error;
  });
  return open.flushing;
}

export async function flushText(objectApi, opts) {
  return flushTextOn(objectApi, historyScope(objectApi, opts));
}

// A pending window belongs to one history owner, never whichever seat flushes next.
export async function recordText(objectApi, cmd) {
  const c = cmd || {}, spec = specFor(c.type);
  if (!spec || !spec.text) return record(objectApi, c);
  const scope = historyScope(objectApi, c), ownerKey = scopeKey(scope), key = textKey(c);
  let open = pendingText.get(ownerKey);
  if (open && open.flushing) { await open.flushing; open = pendingText.get(ownerKey); }
  if (open && open.key === key) {
    open.cmd.after = c.after;
    markDirty();
    return 0;
  }
  if (open) await flushTextOn(objectApi, scope);
  const window = { key, cmd: Object.assign({}, c), flushing: null };
  pendingText.set(ownerKey, window);
  markDirty();
  if (typeof objectApi.runInSeconds === "function") {
    objectApi.runInSeconds(TEXT_WINDOW, () => {
      if (pendingText.get(ownerKey) !== window) return;
      flushTextOn(objectApi, scope).catch(e => {
        ind.error = (e && e.message) || String(e);
        if (typeof objectApi.log === "function") objectApi.log(`[changelog] text batch failed: ${ind.error}`);
      });
    });
  }
  return 0;
}

// Safe under a held button: one read decides, and a second press while the first is in flight is
//   refused rather than doubled.

const busy = {};

export async function undoOn(objectApi, opts, lane, owner) {
  const o = opts || {};
  const projectId = str(o.projectId);
  if (!projectId) throw new Error("changelog: undo needs a projectId");
  const gate = `${lane}|${owner}|${projectId}`;
  if (busy[gate]) return { ok: false, reason: "busy" };
  busy[gate] = true;
  try {
    await flushTextOn(objectApi, { lane, owner });
    const raw = first(await stmtNextUndo(objectApi, lane, owner, projectId));
    if (!raw) return { ok: false, reason: "nothing-to-undo", canUndo: false };
    const row = shapeRow(raw);
    if (raw.touchedUser) {
      // His rule, exactly: someone else has touched it since, so it does not come back.
      return {
        ok: false,
        denied: true,
        reason: "touched",
        touchedBy: str(raw.touchedActor) || str(raw.touchedUser),
        touchedById: str(raw.touchedUser),
        touchedType: str(raw.touchedType),
        command: {
          seq: row.seq,
          type: row.type,
          targetId: row.targetId,
          targetType: row.targetType,
          bookId: row.bookId,
        },
      };
    }
    ind.saving += 1;
    try {
      await applySide(objectApi, row, "before");
      await stmtPointerDown(objectApi, lane, owner, projectId, row.seq);
    } catch (e) {
      ind.saving = Math.max(0, ind.saving - 1);
      ind.error = (e && e.message) || String(e);
      throw e;
    }
    ind.saving = Math.max(0, ind.saving - 1);
    const note = await reindex(objectApi, row);
    await BOOKREV.touch(objectApi, row.bookId, str(row.actor) || str(objectApi && objectApi.userId));
    return { ok: true, command: row, restored: row.before, reindex: note };
  } finally {
    busy[gate] = false;
  }
}

export async function undo(objectApi, opts) {
  const scope = historyScope(objectApi, opts);
  return undoOn(objectApi, opts, scope.lane, scope.owner);
}

export async function redoOn(objectApi, opts, lane, owner) {
  const o = opts || {};
  const projectId = str(o.projectId);
  if (!projectId) throw new Error("changelog: redo needs a projectId");
  const gate = `${lane}|${owner}|${projectId}`;
  if (busy[gate]) return { ok: false, reason: "busy" };
  busy[gate] = true;
  try {
    await flushTextOn(objectApi, { lane, owner });
    const raw = first(await stmtNextRedo(objectApi, lane, owner, projectId));
    if (!raw) return { ok: false, reason: "nothing-to-redo", canRedo: false };
    const row = shapeRow(raw);
    if (raw.touchedUser) {
      // His rule, exactly: someone else has touched it since, so it does not come back.
      return {
        ok: false,
        denied: true,
        reason: "touched",
        touchedBy: str(raw.touchedActor) || str(raw.touchedUser),
        touchedById: str(raw.touchedUser),
        touchedType: str(raw.touchedType),
        command: {
          seq: row.seq,
          type: row.type,
          targetId: row.targetId,
          targetType: row.targetType,
          bookId: row.bookId,
        },
      };
    }
    ind.saving += 1;
    try {
      await applySide(objectApi, row, "after");
      await stmtPointerTo(objectApi, lane, owner, projectId, row.seq);
    } catch (e) {
      ind.saving = Math.max(0, ind.saving - 1);
      ind.error = (e && e.message) || String(e);
      throw e;
    }
    ind.saving = Math.max(0, ind.saving - 1);
    const note = await reindex(objectApi, row);
    await BOOKREV.touch(objectApi, row.bookId, str(row.actor) || str(objectApi && objectApi.userId));
    return { ok: true, command: row, restored: row.after, reindex: note };
  } finally {
    busy[gate] = false;
  }
}

export async function redo(objectApi, opts) {
  const scope = historyScope(objectApi, opts);
  return redoOn(objectApi, opts, scope.lane, scope.owner);
}

export async function statusOn(objectApi, opts, lane, owner) {
  const o = opts || {};
  const projectId = str(o.projectId);
  const live = indicator();
  if (!projectId) return Object.assign({ canUndo: false, canRedo: false, logged: 0, cap: CAP }, live);
  const row = first(await stmtStatus(objectApi, lane, owner, projectId)) || {};
  const undoType = str(row.undoType);
  const redoType = str(row.redoType);
  return Object.assign(
    {
      canUndo: Number(row.canUndo || 0) === 1,
      canRedo: Number(row.canRedo || 0) === 1,
      undoType,
      redoType,
      undoLabel: describe(undoType),
      redoLabel: describe(redoType),
      logged: Number(row.logged || 0),
      cap: CAP,
    },
    live
  );
}

export async function status(objectApi, opts) {
  const scope = historyScope(objectApi, opts);
  return statusOn(objectApi, opts, scope.lane, scope.owner);
}

// --- the >19 move confirmation His ruling replaced undoable cross-book moves with a confirmation: "an 'are you sure?' confirmation dialogue on moves with more than 19 files", naming count and destination. The count comes from the repository (listFolder walks the folder); policy and words live here, so the UI can ask before it commits.

export function moveConfirm(info) {
  const i = info || {};
  const count = Math.max(0, Math.floor(Number(i.count) || 0));
  const crossBook = !!i.crossBook;
  const destination = str(i.destination);
  const isCard = str(i.targetType) === "card";
  const needed = count > CONFIRM_ABOVE;
  const undoable = !crossBook;
  const where = destination ? ` to ${destination}` : "";
  const noun = count === 1 ? "item" : "items";
  return {
    needed,
    threshold: CONFIRM_ABOVE,
    count,
    crossBook,
    destination,
    undoable,
    commandType: crossBook
      ? isCard
        ? "MOVE_CARD_CROSS_BOOK"
        : "MOVE_FOLDER_CROSS_BOOK"
      : isCard
      ? "MOVE_CARD"
      : "MOVE_FOLDER",
    title: needed ? "Are you sure?" : "",
    message: needed
      ? `Move ${count} ${noun}${where}?${undoable ? "" : " A move between books can't be undone."}`
      : "",
    confirmLabel: "Move",
    cancelLabel: "Cancel",
  };
}

// The deny path cannot be shown from a single seat (identity is bound by the platform), so the probe
//   lane owns 'probe:' names and runs the real code against the real tables. Its rows are removed
//   before it returns.

export async function verify(objectApi, opts) {
  const o = opts || {};
  const projectId = str(o.projectId);
  const bookId = str(o.bookId);
  const folderId = str(o.folderId) || bookId;
  const out = { ok: false, steps: [], projectId, bookId };
  if (!projectId || !bookId) throw new Error("changelog: verify needs { projectId, bookId }");
  const h = STORE.book(bookId);
  if (!h) throw new Error(`changelog: "${bookId}" is not a book id`);

  const cardId = IDS.uid(objectApi, 0);
  const nameA = `zz-probe-${cardId}`;
  const nameB = `${nameA}-alpha`;
  const nameC = `${nameA}-beta`;
  try {
    // CUT B: the probe card's NAME rides card_names now — store.cardInsert writes both rows in one
    // transaction, so the trailing projectId is what files the phonebook row under this project.
    await h.cardInsert(objectApi, cardId, nameA, folderId, cardId, IDS.keyBetween(null, null), "", "", 0, 0, projectId);
    out.steps.push({ step: "probe card written", cardId, name: nameA });

    // alpha renames nameA -> nameB
    await h.cardRename(objectApi, cardId, nameB);
    const seqA = await recordOn(
      objectApi,
      {
        type: "RENAME_CARD",
        projectId,
        bookId,
        targetId: cardId,
        targetType: "card",
        before: { name: nameA },
        after: { name: nameB },
        actor: "Alpha",
      },
      PROBE,
      "alpha"
    );
    out.steps.push({ step: "alpha recorded RENAME_CARD", seq: seqA });

    // beta renames nameB -> nameC
    await h.cardRename(objectApi, cardId, nameC);
    const seqB = await recordOn(
      objectApi,
      {
        type: "RENAME_CARD",
        projectId,
        bookId,
        targetId: cardId,
        targetType: "card",
        before: { name: nameB },
        after: { name: nameC },
        actor: "Beta",
      },
      PROBE,
      "beta"
    );
    out.steps.push({ step: "beta recorded RENAME_CARD", seq: seqB });

    const denied = await undoOn(objectApi, { projectId }, PROBE, "alpha");
    out.deny = denied;
    out.denyPassed = denied.ok === false && denied.denied === true && denied.touchedBy === "Beta";

    const allowed = await undoOn(objectApi, { projectId }, PROBE, "beta");
    out.allow = allowed;
    const after = first(await h.cardGet(objectApi, cardId)) || {};
    out.nameInDb = str(after.name);
    out.allowPassed = allowed.ok === true && out.nameInDb === nameB;

    out.status = {
      alpha: await statusOn(objectApi, { projectId }, PROBE, "alpha"),
      beta: await statusOn(objectApi, { projectId }, PROBE, "beta"),
    };
    out.ok = !!(out.denyPassed && out.allowPassed);
  } finally {
    try {
      await h.cardDelete(objectApi, cardId);
      await h.ftsDelete(objectApi, cardId);
    } catch (e) {
      out.steps.push({ step: "probe card cleanup failed", error: (e && e.message) || String(e) });
    }
    try {
      await objectApi.sql`DELETE FROM change_log WHERE userId LIKE 'probe:%';
        DELETE FROM undo_pointer WHERE userId LIKE 'probe:%'`;
    } catch (e) {
      out.steps.push({ step: "probe log cleanup failed", error: (e && e.message) || String(e) });
    }
  }
  return out;
}

module.exports = {
  PLACEHOLDER,
  CAP,
  TEXT_WINDOW,
  CONFIRM_ABOVE,
  COMMANDS,
  isCommand,
  isUndoable,
  reasonFor,
  record,
  historyScope,
  recordText,
  flushText,
  undo,
  redo,
  status,
  indicator,
  // the footer's mirror: watch(fn) is called with a fresh indicator() on every move
  watch,
  describe,
  markDirty,
  markSaved,
  clearError,
  moveConfirm,
  registerUndo,
  registerReindex,
  pluginBudget,
  verify,
};

// Undo/redo puts writes back into the book WITHOUT lib/cards.js's wrapped verbs, so lib/writefence.js
// gates them here: a reader on someone else's shelf can read the history, not walk it.
const FENCE = require("lib/writefence.js");

const HISTORY_VERBS = ["undo", "redo"];
for (let i = 0; i < HISTORY_VERBS.length; i++) {
  const name = HISTORY_VERBS[i];
  const inner = module.exports[name];
  if (typeof inner !== "function") continue;
  module.exports[name] = function () {
    if (!FENCE.mayWrite()) throw new Error(FENCE.refusalLine(FENCE.get().name));
    return inner.apply(null, arguments);
  };
}
