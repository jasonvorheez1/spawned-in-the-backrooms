// js — TrashSystem (doc 21). His retention rule (doc 21): nothing expires, ever — the only limit is size, 100,000 entries in a project, past which the can REFUSES rather than quietly dropping the oldest.

const CARDS = require("lib/cards.js");
const STORE = require("lib/store.js");
const SCHEMA = require("lib/schema.js");
// Nothing here READS through the in-memory book; this file's one duty is telling it when its copy went stale.
const GRAPH = require("lib/graph.js");
// THE BOOK STAMP for the one write here that goes around the repository (the stack repair).
const BOOKREV = require("lib/bookrev.js");
const IDS = require("lib/ids.js");
const LIB = require("lib/library.js");

const CARD = "card";
const FOLDER = "folder";
const STACK = "stack";

// doc 21: "Maximum entries 100,000", indefinite retention.
const CAP = 100000;
const FULL_MESSAGE = "trash is full — delete outright or cancel";
const RETENTION = {
  mode: "indefinite",
  expiresAfterDays: 0,
  cap: CAP,
  fullMessage: FULL_MESSAGE,
  note: "Nothing in the trash expires. It waits here until you put it back or delete it forever.",
};
// The two confirmations his doc names: a hold for one row, a typed phrase for the batch.
const CONFIRM = { holdMs: 760, phrase: emptyPhrase };

let READY = false;
const PROJECT_OF = {};


export function text(v) {
  return v === undefined || v === null ? "" : String(v);
}

export function rowsOf(res) {
  return (res && res.rows) || [];
}

export function fail(message) {
  throw new Error(message);
}

export function jsonList(v) {
  try {
    const out = JSON.parse(text(v) || "[]");
    return Array.isArray(out) ? out.map(text) : [];
  } catch (e) {
    return [];
  }
}

export function plural(n, one, many) {
  return Number(n) === 1 ? one : many;
}

// One row per card that went into the can while it belonged to a stack.
export async function ensure(api) {
  if (READY) return;
  await SCHEMA.ensureTrashStack(api);
  READY = true;
}

export function shapeReceipt(r) {
  if (!r) return null;
  return {
    cardId: text(r.cardId),
    bookId: text(r.bookId),
    projectId: text(r.projectId),
    stackId: text(r.stackId),
    role: text(r.role) || "member",
    members: jsonList(r.members),
    refs: Number(r.refs || 0),
    at: Number(r.at || 0),
  };
}

export async function readReceipt(api, cardId) {
  await ensure(api);
  const res = await api.sql`SELECT cardId, bookId, projectId, stackId, role, members, refs, at
    FROM trash_stack WHERE cardId = ${text(cardId)}`;
  return shapeReceipt(rowsOf(res)[0]);
}

export async function receiptsForBook(api, bookId) {
  await ensure(api);
  const res = await api.sql`SELECT cardId, bookId, projectId, stackId, role, members, refs, at
    FROM trash_stack WHERE bookId = ${text(bookId)}`;
  const out = {};
  for (const r of rowsOf(res)) {
    const rec = shapeReceipt(r);
    if (rec) out[rec.cardId] = rec;
  }
  return out;
}

export async function writeReceipt(api, rec) {
  await ensure(api);
  const members = JSON.stringify((rec.members || []).map(text));
  await api.sql`INSERT INTO trash_stack (cardId, bookId, projectId, stackId, role, members, refs, at)
    VALUES (${text(rec.cardId)}, ${text(rec.bookId)}, ${text(rec.projectId)}, ${text(rec.stackId)},
            ${text(rec.role)}, ${members}, ${Number(rec.refs || 0)}, ${Number(rec.at || 0)})
    ON CONFLICT(cardId) DO UPDATE SET
      bookId = excluded.bookId, projectId = excluded.projectId, stackId = excluded.stackId,
      role = excluded.role, members = excluded.members, refs = excluded.refs, at = excluded.at`;
  return true;
}

export async function dropReceipt(api, cardId) {
  await ensure(api);
  await api.sql`DELETE FROM trash_stack WHERE cardId = ${text(cardId)}`;
  return true;
}

export async function dropReceiptsForBook(api, bookId) {
  await ensure(api);
  await api.sql`DELETE FROM trash_stack WHERE bookId = ${text(bookId)}`;
  return true;
}


// One project, always (his ruling) — lib/schema.js's PROJECT_ID, no `books` read behind it. Still
// async: every call site awaits it.
export async function projectOf(api, bookId) {
  return SCHEMA.PROJECT_ID;
}

// How full the can is, project-wide — his cap counts the project, not the book.
export async function capacity(api, bookId) {
  const pid = await projectOf(api, bookId);
  const res = pid
    ? await api.sql`SELECT COUNT(*) AS n FROM trash WHERE projectId = ${pid}`
    : await api.sql`SELECT COUNT(*) AS n FROM trash`;
  const count = Number((rowsOf(res)[0] || {}).n || 0);
  return {
    count,
    cap: CAP,
    full: count >= CAP,
    remaining: Math.max(0, CAP - count),
    message: count >= CAP ? FULL_MESSAGE : "",
    retention: RETENTION,
  };
}

export async function guard(api, bookId) {
  const cap = await capacity(api, bookId);
  if (cap.full) fail(FULL_MESSAGE);
  return cap;
}

// GHOST HYGIENE. Idempotent, scoped to the book.
export async function pruneGhosts(api, bookId) {
  await api.sql`DELETE FROM trash WHERE originalBookId = ${text(bookId)} AND entityType = 'card'
    AND entityId NOT IN (SELECT id FROM cards WHERE bookId = ${text(bookId)})`;
  await api.sql`DELETE FROM trash WHERE originalBookId = ${text(bookId)} AND entityType = 'folder'
    AND entityId NOT IN (SELECT id FROM folders WHERE bookId = ${text(bookId)})`;
}

// THIS book's body count, raw — riders and all. The Empty Trash confirmation and empty()'s own check both read THIS number, so the phrase the author types names everything that actually dies — never the shorter visible-lines count (the mismatch he reported: pill said 11, confirm asked DELETE 6).
export async function bookCount(api, bookId) {
  const res = await api.sql`SELECT entityType, COUNT(*) AS n FROM trash
    WHERE originalBookId = ${text(bookId)} AND entityType IN ('card', 'folder') GROUP BY entityType`;
  let cards = 0;
  let folders = 0;
  for (const r of rowsOf(res)) {
    if (text(r.entityType) === FOLDER) folders = Number(r.n) || 0;
    else cards = Number(r.n) || 0;
  }
  return { cards, folders, total: cards + folders };
}

// `cache` is a per-call map so one listing never asks for the same folder trail twice.
export async function originOf(api, bookId, folderId, cache, bookName) {
  const bid = text(bookId);
  const fid = text(folderId);
  const root = { label: text(bookName) ? text(bookName) + " (root)" : "the book root", gone: false, path: [], root: true };
  if (!fid || fid === bid) return root;
  const seen = cache || {};
  if (seen[fid]) return seen[fid];

  let folder = null;
  try {
    folder = await CARDS.getFolder(api, bookId, fid);
  } catch (e) {
    folder = null;
  }
  let out;
  if (!folder) {
    out = { label: "a folder that no longer exists", gone: true, path: [], root: false };
  } else {
    let path = [];
    try {
      path = await CARDS.folderPath(api, bookId, fid);
    } catch (e) {
      path = [{ id: fid, name: folder.name }];
    }
    const names = path.length ? path.map((p) => text(p.name)) : [text(folder.name)];
    let trashed = false;
    try {
      trashed = await CARDS.isFolderTrashed(api, fid);
    } catch (e) {
      trashed = false;
    }
    out = {
      label: names.join(" › ") + (trashed ? " (itself in the trash)" : ""),
      gone: trashed,
      path: path,
      root: false,
    };
  }
  seen[fid] = out;
  return out;
}

// Everything in this book's trash, newest first, plus the can's own state.
export async function list(api, bookId, opts) {
  const o = opts || {};
  await ensure(api);
  await pruneGhosts(api, bookId);
  const rows = await CARDS.listTrash(api, bookId);
  const cap = await capacity(api, bookId);
  const receipts = await receiptsForBook(api, bookId);
  const cache = {};
  const names = {};

  const inCan = {};
  for (const r of rows) inCan[r.id] = true;
  const ridersOf = {};
  for (const k in receipts) {
    const rec = receipts[k];
    if (rec.role !== "member" || !rec.stackId) continue;
    if (!inCan[rec.cardId]) continue;
    ridersOf[rec.stackId] = (ridersOf[rec.stackId] || 0) + 1;
  }

  const nameOf = async function (id) {
    const key = text(id);
    if (!key) return "";
    if (names[key] !== undefined) return names[key];
    let card = null;
    try {
      card = await CARDS.getCard(api, bookId, key);
    } catch (e) {
      card = null;
    }
    names[key] = card ? text(card.name) : "";
    return names[key];
  };

  const items = [];
  for (const r of rows) {
    const origin = await originOf(api, bookId, r.folderId, cache, o.bookName);
    const rec = r.entityType === CARD ? receipts[r.id] || null : null;
    const item = Object.assign({}, r, {
      origin: origin.label,
      originGone: !!origin.gone,
      originPath: origin.path,
      restoresTo: origin.gone ? "root" : "origin",
      restoreNote: origin.gone ? "its folder is gone — Put Back drops it in the book root" : "",
      stack: null,
      restoreAs: r.entityType === FOLDER ? FOLDER : CARD,
    });

    if (r.rider) {
      item.restoreNote = r.riderOfName
        ? "rode in with “" + r.riderOfName + "” — Put Back on that folder brings everything home; putting just this back lands it in the book root"
        : "rode a trashed folder in — putting just this back lands it in the book root";
    }

    if (rec && rec.role === "handoff") {
      const head = await nameOf(rec.stackId);
      item.stack = {
        role: "handoff",
        stackId: rec.stackId,
        headName: head,
        references: rec.refs,
        members: rec.members.length,
      };
      item.stackNote = rec.refs
        ? "was the primary of a stack — " +
          rec.refs +
          " " +
          plural(rec.refs, "mention", "mentions") +
          " now point at " +
          (head ? "“" + head + "”" : "the next draft") +
          "; Put Back brings them back"
        : "was the primary of a stack — the stack answers to " +
          (head ? "“" + head + "”" : "the next draft") +
          " until you put this back";
    } else if (rec && rec.role === "member") {
      const head = await nameOf(rec.stackId);
      item.stack = { role: "member", stackId: rec.stackId, headName: head, references: 0, members: rec.members.length };
      item.stackNote = inCan[rec.stackId]
        ? "a draft from a stack that went in whole"
        : "a draft of " + (head ? "“" + head + "”" : "a stack") + " — Put Back rejoins it";
    } else if (rec && rec.role === "stack") {
      const riders = ridersOf[rec.cardId] || 0;
      item.stack = { role: "stack", stackId: rec.cardId, headName: text(r.name), references: 0, members: riders + 1 };
      item.restoreAs = STACK;
      item.stackNote =
        "a whole stack — " + (riders + 1) + " drafts; Put Back brings all of them back together";
    }
    items.push(item);
  }

  return {
    items,
    entries: await bookCount(api, bookId),
    count: cap.count,
    cap: cap.cap,
    full: cap.full,
    remaining: cap.remaining,
    retention: RETENTION,
  };
}

// The one door in. opts: { entityType: 'card' | 'folder' | 'stack', actor }.
export async function trash(api, bookId, id, opts) {
  const o = opts || {};
  await ensure(api);
  await guard(api, bookId);
  const kind = text(o.entityType) || CARD;
  if (kind === FOLDER) return await trashFolder(api, bookId, id, o);
  if (kind === STACK) return await trashStack(api, bookId, id, o);
  return await trashOne(api, bookId, id, o);
}

export async function trashFolder(api, bookId, folderId, opts) {
  const o = opts || {};
  const res = await CARDS.trashFolder(api, bookId, folderId, { actor: o.actor });
  const cards = Number(res && res.cards) || 0;
  return {
    kind: FOLDER,
    id: text(folderId),
    folders: Number(res && res.folders) || 0,
    cards,
    references: 0,
    note: cards
      ? "the folder went in with " + cards + " " + plural(cards, "card", "cards") + " — Put Back brings them all back"
      : "the folder went in",
  };
}

// If this is the PRIMARY of a live stack, the handoff happens here and is written down so Put Back
// can undo it.
export async function trashOne(api, bookId, cardId, opts) {
  const o = opts || {};
  const card = await CARDS.getCard(api, bookId, cardId);
  if (!card) fail("no card " + JSON.stringify(text(cardId)) + " in book " + text(bookId));

  const members = await CARDS.listStack(api, bookId, card.stackId);
  const rest = members.filter((m) => m.id !== card.id);
  const isPrimary = text(card.stackId) === text(card.id) && rest.length > 0;
  const ms = await LIB.nowMs(api);
  const pid = await projectOf(api, bookId);
  let note = "";
  let references = 0;
  let successor = "";

  if (isPrimary) {
    // Stack order decides the successor, chosen here by name, with the moved-token count handed back.
    successor = rest[0].id;
    const res = await CARDS.setStackPrimary(api, bookId, card.stackId, successor, { actor: o.actor });
    references = Number(res && res.references) || 0;
    await writeReceipt(api, {
      cardId: card.id,
      bookId: text(bookId),
      projectId: pid,
      stackId: successor,
      role: "handoff",
      members: rest.map((m) => m.id),
      refs: references,
      at: ms,
    });
    note = references
      ? references +
        " " +
        plural(references, "mention", "mentions") +
        " of this draft now point at “" +
        text(rest[0].name) +
        "” — Put Back moves them home again"
      : "the stack now answers to “" + text(rest[0].name) + "” — Put Back hands it back";
  } else if (rest.length) {
    await writeReceipt(api, {
      cardId: card.id,
      bookId: text(bookId),
      projectId: pid,
      stackId: text(card.stackId),
      role: "member",
      members: members.map((m) => m.id),
      refs: 0,
      at: ms,
    });
    note = "one draft out of a stack — Put Back rejoins it";
  }

  await CARDS.trashCard(api, bookId, card.id, { actor: o.actor });
  return {
    kind: CARD,
    id: card.id,
    name: text(card.name),
    wasPrimary: isPrimary,
    stackId: successor || (rest.length ? text(card.stackId) : ""),
    references,
    note,
  };
}

// Members first, primary LAST — the primary is a stack of one by then, so splitFromStack never runs
// and not a single reference is rewritten.
export async function trashStack(api, bookId, stackId, opts) {
  const o = opts || {};
  const members = await CARDS.listStack(api, bookId, stackId);
  if (!members.length) fail("no stack " + JSON.stringify(text(stackId)) + " in book " + text(bookId));
  const primary = members.find((m) => text(m.id) === text(stackId)) || members[0];
  const order = members.map((m) => m.id);
  const ms = await LIB.nowMs(api);
  const pid = await projectOf(api, bookId);

  for (const m of members) {
    if (m.id === primary.id) continue;
    await writeReceipt(api, {
      cardId: m.id,
      bookId: text(bookId),
      projectId: pid,
      stackId: primary.id,
      role: "member",
      members: order,
      refs: 0,
      at: ms,
    });
    await CARDS.trashCard(api, bookId, m.id, { actor: o.actor });
  }
  await writeReceipt(api, {
    cardId: primary.id,
    bookId: text(bookId),
    projectId: pid,
    stackId: primary.id,
    role: "stack",
    members: order,
    refs: 0,
    at: ms,
  });
  await CARDS.trashCard(api, bookId, primary.id, { actor: o.actor });

  return {
    kind: STACK,
    id: primary.id,
    name: text(primary.name),
    members: order.length,
    references: 0,
    note: "the whole stack went in — " + order.length + " drafts, and no reference moved",
  };
}

export async function kindOf(api, bookId, id) {
  const res = await api.sql`SELECT entityType FROM trash WHERE entityId = ${text(id)}`;
  const row = rowsOf(res)[0];
  return text(row && row.entityType) === FOLDER ? FOLDER : CARD;
}

// The one door back out. opts: { entityType, actor }.
export async function restore(api, bookId, id, opts) {
  const o = opts || {};
  await ensure(api);
  const asked = text(o.entityType);
  const kind = asked || (await kindOf(api, bookId, id));
  if (kind === FOLDER) return await restoreFolderHome(api, bookId, id, o);
  if (kind === STACK) return await restoreStack(api, bookId, id, o);
  return await restoreOne(api, bookId, id, o);
}

// If its own parent is gone, the folder lands in the book root — same rule as a card, one level up.
export async function restoreFolderHome(api, bookId, folderId, opts) {
  const o = opts || {};
  const bid = text(bookId);
  const folder = await CARDS.getFolder(api, bookId, folderId);
  if (!folder) fail("that folder is not in this book any more — nothing to put back");
  const parent = text(folder.folderId);
  let orphaned = false;
  if (parent && parent !== bid) {
    let up = null;
    try {
      up = await CARDS.getFolder(api, bookId, parent);
    } catch (e) {
      up = null;
    }
    orphaned = !up || (await CARDS.isFolderTrashed(api, parent));
  }
  const res = await CARDS.restoreFolder(api, bookId, folderId, { actor: o.actor });
  const notes = [];
  if (orphaned) {
    await CARDS.moveFolder(api, bookId, folderId, { folderId: bid, actor: o.actor });
    notes.push("the folder it sat in is gone — it came back to the book root");
  }
  return {
    kind: FOLDER,
    id: text(folderId),
    name: text(folder.name),
    folderId: orphaned ? bid : parent || bid,
    toRoot: orphaned,
    folders: Number(res && res.folders) || 0,
    cards: Number(res && res.cards) || 0,
    references: 0,
    note: notes.join(" · "),
  };
}

// Back into its own folder when it is still there; into the book root, and it says so, when not.
export async function restoreOne(api, bookId, cardId, opts) {
  const o = opts || {};
  const bid = text(bookId);
  const id = text(cardId);
  const card = await CARDS.getCard(api, bookId, id);
  if (!card) fail("that card is not in this book any more — nothing to put back");
  const rec = await readReceipt(api, id);

  const home = text(card.folderId);
  let orphaned = false;
  if (home && home !== bid) {
    let folder = null;
    try {
      folder = await CARDS.getFolder(api, bookId, home);
    } catch (e) {
      folder = null;
    }
    orphaned = !folder || (await CARDS.isFolderTrashed(api, home));
  }

  const applied = await CARDS.restoreCard(api, bookId, id, { actor: o.actor });
  const notes = [];
  let folderId = home || bid;
  if (orphaned) {
    await CARDS.moveCard(api, bookId, id, { folderId: bid, actor: o.actor });
    folderId = bid;
    notes.push("the folder it came from is gone — it came back to the book root");
  }

  const back = await rejoin(api, bookId, id, rec, folderId, o);
  for (const n of back.notes) notes.push(n);
  await dropReceipt(api, id);

  return {
    kind: CARD,
    id,
    name: text(applied) || text(card.name),
    folderId,
    toRoot: orphaned,
    stackId: back.stackId,
    references: back.references,
    note: notes.join(" · "),
  };
}

// When it was the primary, handing the stack id back rewrites the tokens that moved at trash time.
export async function rejoin(api, bookId, cardId, rec, folderId, opts) {
  const o = opts || {};
  const out = { notes: [], references: 0, stackId: "" };
  if (!rec || !rec.stackId || rec.role === "stack") return out;
  const target = text(rec.stackId);
  const id = text(cardId);

  let head = null;
  try {
    head = await CARDS.getCard(api, bookId, target);
  } catch (e) {
    head = null;
  }
  if (!head) {
    out.notes.push("the stack it belonged to is gone — it came back on its own");
    return out;
  }
  if (await CARDS.isTrashed(api, target)) {
    out.notes.push("the rest of its stack is still in the trash — it came back on its own");
    return out;
  }
  if (text(head.folderId) !== text(folderId)) {
    out.notes.push("its stack lives in another folder now — it came back on its own");
    return out;
  }

  // STAYS ON SQL: the two calls below are WRITES in the stack-repair lane, and GRAPH.invalidate()
  // below is what keeps the in-memory book honest about them.
  const gen = STORE.book(text(bookId));
  if (!gen) {
    out.notes.push("its book could not be opened — it came back on its own");
    return out;
  }

  // The stack may have been re-headed while this card was away; follow the head's own stackId.
  const liveStackId = text(head.stackId) || target;
  const members = await CARDS.listStack(api, bookId, liveStackId);
  const order = orderWith(rec.members, members.map((m) => m.id), id);

  await gen.cardSetStack(api, id, liveStackId, IDS.seedKeys(1)[0]);
  const keys = IDS.seedKeys(order.length);
  for (let i = 0; i < order.length; i++) await gen.cardReorderInStack(api, order[i], keys[i]);
  // Written around the in-memory book, so the cache is told to forget this book - and STAMPED, so
  // every other open seat's poll learns the same (lib/bookrev.js; these rows never pass record()).
  GRAPH.invalidate(text(bookId));
  await BOOKREV.touch(api, text(bookId), text(o.actor));
  out.stackId = liveStackId;

  if (rec.role === "handoff") {
    const res = await CARDS.setStackPrimary(api, bookId, liveStackId, id, { actor: o.actor });
    out.references = Number(res && res.references) || 0;
    out.stackId = id;
    out.notes.push(
      out.references
        ? "back at the head of its stack — " +
          out.references +
          " " +
          plural(out.references, "mention", "mentions") +
          " point at it again"
        : "back at the head of its stack"
    );
  } else {
    out.notes.push("back in its stack");
  }
  return out;
}

// The order the stack had when the card left, filtered to who is still here — the returning card is
// never dropped.
export function orderWith(recorded, liveIds, cardId) {
  const live = {};
  for (const id of liveIds || []) live[text(id)] = true;
  live[text(cardId)] = true;
  const out = [];
  const seen = {};
  for (const id of recorded || []) {
    const k = text(id);
    if (live[k] && !seen[k]) {
      out.push(k);
      seen[k] = true;
    }
  }
  for (const id of liveIds || []) {
    const k = text(id);
    if (!seen[k]) {
      out.push(k);
      seen[k] = true;
    }
  }
  if (!seen[text(cardId)]) out.unshift(text(cardId));
  return out;
}

// The primary first — a card needs a stack to rejoin — then every draft that rode in with it.
export async function restoreStack(api, bookId, stackId, opts) {
  const o = opts || {};
  const id = text(stackId);
  const rec = await readReceipt(api, id);
  const head = await restoreOne(api, bookId, id, o);
  let drafts = 0;
  const order = (rec && rec.members) || [];
  for (const mid of order) {
    if (text(mid) === id) continue;
    const r = await readReceipt(api, mid);
    if (!r || text(r.stackId) !== id) continue;
    if (!(await CARDS.isTrashed(api, mid))) continue;
    try {
      await restoreOne(api, bookId, mid, o);
      drafts++;
    } catch (e) {
      // one bad draft must not strand the rest — the caller surfaces what came back
    }
  }
  return {
    kind: STACK,
    id,
    name: head.name,
    folderId: head.folderId,
    toRoot: head.toRoot,
    members: drafts + 1,
    references: head.references,
    note: [head.note, drafts ? drafts + " " + plural(drafts, "draft", "drafts") + " came back with it" : ""]
      .filter(Boolean)
      .join(" · "),
  };
}

// One row, forever. opts: { entityType, actor }. The window holds this behind a press-and-hold
// (CONFIRM.holdMs) — his doc's confirmation for a single item.
export async function purge(api, bookId, id, opts) {
  const o = opts || {};
  await ensure(api);
  const kind = text(o.entityType) || (await kindOf(api, bookId, id));
  if (kind === FOLDER) {
    const res = await CARDS.purgeFolder(api, bookId, id, { actor: o.actor });
    return {
      kind: FOLDER,
      id: text(id),
      folders: Number(res && res.folders) || 0,
      cards: Number(res && res.cards) || 0,
      note: "gone for good",
    };
  }
  if (kind === STACK) {
    const rec = await readReceipt(api, id);
    const order = (rec && rec.members) || [text(id)];
    let cards = 0;
    for (const mid of order) {
      try {
        await CARDS.purgeCard(api, bookId, mid, { actor: o.actor });
        cards++;
      } catch (e) {
        // a member already gone is not a failure of the batch
      }
      await dropReceipt(api, mid);
    }
    return { kind: STACK, id: text(id), cards, note: "the whole stack is gone for good" };
  }
  await CARDS.purgeCard(api, bookId, id, { actor: o.actor });
  await dropReceipt(api, id);
  return { kind: CARD, id: text(id), cards: 1, note: "gone for good" };
}

// The batch confirmation his doc names: the author types DELETE N, N being what is in the can.
export function emptyPhrase(n) {
  return "DELETE " + Math.max(0, Math.floor(Number(n) || 0));
}

export function emptyMatches(typed, n) {
  return text(typed).trim().toUpperCase().replace(/\s+/g, " ") === emptyPhrase(n);
}

// Refuses without the typed phrase — checked here, not only in the window, so a stray action can
// never empty the can.
export async function empty(api, bookId, opts) {
  const o = opts || {};
  await ensure(api);
  // Ghosts die first, so the count below only names rows the purge walk can actually reach.
  await pruneGhosts(api, bookId);
  // The check counts RAW rows (bookCount), the purge walks the LISTED rows — riders die inside
  // their folder's purge, so both lanes cover the same 11-for-11 body.
  const body = await bookCount(api, bookId);
  const rows = await CARDS.listTrash(api, bookId);
  if (!body.total) return { kind: "empty", cards: 0, folders: 0, errors: [], note: "the trash was already empty" };
  if (!emptyMatches(o.confirm, body.total)) {
    fail("type " + emptyPhrase(body.total) + " to empty the trash");
  }
  let cards = 0;
  let folders = 0;
  const errors = [];
  for (const r of rows) {
    // A rider line dies inside its carrier folder's purge — walking it too would double-purge
    // an already-gone entity and turn a clean run into a refusal.
    if (r.rider) continue;
    try {
      if (r.entityType === FOLDER) {
        const res = await CARDS.purgeFolder(api, bookId, r.id, { actor: o.actor });
        folders += Number(res && res.folders) || 0;
        cards += Number(res && res.cards) || 0;
      } else {
        await CARDS.purgeCard(api, bookId, r.id, { actor: o.actor });
        cards++;
      }
    } catch (e) {
      errors.push(text((e && e.message) || e));
    }
  }
  // Empty means EMPTY: a row the purge walk couldn't reach (its entity already gone — a ghost)
  // is swept here so the cap gauge lands on zero. Only on a clean run — a failed purge keeps
  // its row, and what it names stays restorable.
  if (!errors.length) {
    await api.sql`DELETE FROM trash WHERE originalBookId = ${text(bookId)} AND entityType IN ('card', 'folder')`;
  }
  await dropReceiptsForBook(api, bookId);
  return {
    kind: "empty",
    cards,
    folders,
    errors,
    note:
      "deleted " +
      cards +
      " " +
      plural(cards, "card", "cards") +
      (folders ? " and " + folders + " " + plural(folders, "folder", "folders") : "") +
      " forever",
  };
}

// A seat boots with no idea whether the receipt table exists; forget() drops that assumption.
export function forget() {
  READY = false;
  for (const k in PROJECT_OF) delete PROJECT_OF[k];
}

module.exports = {
  CAP,
  RETENTION,
  CONFIRM,
  FULL_MESSAGE,
  ensure,
  forget,
  list,
  capacity,
  bookCount,
  pruneGhosts,
  guard,
  originOf,
  trash,
  trashOne,
  trashStack,
  trashFolder,
  restore,
  restoreOne,
  restoreStack,
  restoreFolderHome,
  purge,
  empty,
  emptyPhrase,
  emptyMatches,
  readReceipt,
  receiptsForBook,
};
