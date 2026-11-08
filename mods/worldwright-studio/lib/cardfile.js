// cardfile.js — THE writer: one canonical cardspec card in, one real shelf card out (title/summary/status/tags/folder path/sections/pages). A pass is ONE FILE_CARDS journal row. Journal failure means nothing to the cards: the row is recorded AFTER every write landed, so it folds into .warnings, never .ok.

const CARDS = require("lib/cards.js");
const SPEC = require("lib/cardspec.js");
const CHANGELOG = require("lib/changelog.js");


const NOTHING_THERE =
  "that card held nothing to file — a card needs at least a title or a summary";
// Same word lib/cardsections.js gives a nameless section — keep the two spellings identical.
const SECTION_FALLBACK = "Note";
const COMMAND = "FILE_CARDS";


export function str(v) {
  return v === null || v === undefined ? "" : String(v);
}

export function trim(v) {
  return str(v).trim();
}

export function lower(v) {
  return str(v).toLowerCase();
}

export function isArr(v) {
  return Object.prototype.toString.call(v) === "[object Array]";
}

export function isObj(v) {
  return !!v && typeof v === "object" && !isArr(v);
}

export function has(o, k) {
  return Object.prototype.hasOwnProperty.call(o, k);
}

export function reasonOf(e) {
  return trim((e && e.message) || e) || "the write was refused without naming a reason";
}

export function listOf(v) {
  if (isArr(v)) return v;
  if (isObj(v) && isArr(v.cards)) return v.cards;
  if (isObj(v) || typeof v === "string" || typeof v === "number") return [v];
  return [];
}

export function titleGuess(entry) {
  if (isObj(entry)) {
    const t = trim(entry.title) || trim(entry.name);
    if (t) return t.slice(0, 120);
  }
  if (typeof entry === "string" || typeof entry === "number") return trim(entry).slice(0, 120);
  return "an unnamed card";
}

export function capOf(o) {
  const n = Math.floor(Number(o.cap));
  const ceiling = Math.floor(Number(SPEC.CAPS && SPEC.CAPS.cards)) || 200;
  if (isFinite(n) && n > 0) return Math.min(n, ceiling);
  return ceiling;
}

// Holds the repository's per-write journal rows for the pass — scoped to this book and create-shaped types, so anything else recording meanwhile is forwarded untouched.

const QUIET_TYPES = {
  CREATE_CARD: 1,
  CREATE_FOLDER: 1,
  SET_CARD_META: 1,
  RENAME_CARD: 1,
  CREATE_SECTION: 1,
  SET_SECTION_CONTENT: 1,
  RENAME_SECTION: 1,
  CREATE_PAGE: 1,
  SET_PAGE_CONTENT: 1,
  SET_PAGE_CHROME: 1,
  ADD_TAG: 1,
  TRASH_CARD: 1,
  TRASH_FOLDER: 1,
  RESTORE_CARD: 1,
  RESTORE_FOLDER: 1,
};

export function quiet() {
  const log = CHANGELOG && typeof CHANGELOG.record === "function" ? CHANGELOG : null;
  const mine = {};
  const state = { held: 0, closed: false, ok: false };
  if (!log) {
    return {
      add: function () {},
      close: function () {
        return state;
      },
      state: state,
    };
  }
  const real = log.record;
  const wrapper = function (api, cmd) {
    const c = cmd || {};
    if (!state.closed && mine[trim(c.bookId)] && QUIET_TYPES[trim(c.type)]) {
      state.held += 1;
      return Promise.resolve(0);
    }
    return real.call(log, api, cmd);
  };
  log.record = wrapper;
  state.ok = log.record === wrapper;
  return {
    add: function (bookId) {
      if (trim(bookId)) mine[trim(bookId)] = true;
    },
    close: function () {
      state.closed = true;
      if (log.record === wrapper) log.record = real;
      return state;
    },
    state: state,
  };
}


export function declareCommand() {
  const table = CHANGELOG && CHANGELOG.COMMANDS;
  if (table && !table[COMMAND]) {
    table[COMMAND] = { undoable: true, structural: true, target: "book" };
  }
  if (CHANGELOG && typeof CHANGELOG.registerUndo === "function") {
    CHANGELOG.registerUndo(COMMAND, reverseFiling);
  }
  return !!(table && table[COMMAND]);
}

// Undo trashes what the pass made, redo restores it — both walk ROOTS only, since a folder takes its contents.
export async function reverseFiling(objectApi, row, side) {
  const after = (row && row.after) || {};
  const roots = after.roots || [];
  const q = quiet();
  let moved = 0;
  let left = 0;
  try {
    for (let i = 0; i < roots.length; i++) q.add(trim((roots[i] || {}).bookId) || trim(row.bookId));
    const order = side === "before" ? roots.slice().reverse() : roots.slice();
    for (let i = 0; i < order.length; i++) {
      const r = order[i] || {};
      const bookId = trim(r.bookId) || trim(row.bookId);
      try {
        if (side === "before") {
          if (r.kind === "folder") await CARDS.trashFolder(objectApi, bookId, r.id, {});
          else await CARDS.trashCard(objectApi, bookId, r.id, {});
        } else {
          if (r.kind === "folder") await CARDS.restoreFolder(objectApi, bookId, r.id, {});
          else await CARDS.restoreCard(objectApi, bookId, r.id, {});
        }
        moved += 1;
      } catch (e) {
        left += 1;
        objectApi.log("[cardfile] reversal left " + r.kind + " " + r.id + " alone: " + reasonOf(e));
      }
    }
  } finally {
    q.close();
  }
  if (left) {
    objectApi.log(
      "[cardfile] reversal moved " + moved + " of " + roots.length + " roots — " + left + " had moved on"
    );
  }
  return moved;
}

// Declared at load, so a seat can undo a filing it never ran.
declareCommand();

// One object carries what the whole payload shares — caches, warning sink, undo manifest, actor. Lives exactly one fileCards call.

export function newPass(objectApi, bookId, o) {
  return {
    api: objectApi,
    bookId: trim(bookId),
    actor: trim(o.actor),
    projectId: trim(o.projectId),
    source: trim(o.source) || "the drawer",
    label: trim(o.label),
    root: trim(o.folderId) || trim(bookId),
    cap: capOf(o),
    onRow: typeof o.onRow === "function" ? o.onRow : null,
    // parentId \u0000 lowercased-name -> folder id: 'places' and 'Places' are one folder.
    folders: {},
    listed: {}, // parentId -> true, so a parent is listed at most once per pass
    tags: {}, // lowercased tag name -> tag id
    tagsPrimed: false,
    madeFolders: 0,
    reusedFolders: 0,
    // The undo manifest holds ROOTS only — a card inside a folder this pass made is not one.
    roots: [],
    mine: {}, // folder ids this pass created
    held: 0,
    warnings: [],
    said: {},
  };
}

export function note(pass, line) {
  const s = trim(line);
  if (!s || has(pass.said, s)) return;
  pass.said[s] = 1;
  pass.warnings.push(s);
  try {
    pass.api.log("[cardfile] " + s);
  } catch (e) {
    // A seat without a log is not a reason to lose a card.
  }
}

// 'Lore/Places' walks a segment at a time from the book root; an existing segment is REUSED case-insensitively.

export async function folderIdFor(pass, path) {
  let parent = pass.bookId;
  for (let i = 0; i < path.length; i++) {
    const seg = trim(path[i]);
    if (!seg) continue;
    const key = parent + "\u0000" + lower(seg);
    if (has(pass.folders, key)) {
      pass.reusedFolders += 1;
      parent = pass.folders[key];
      continue;
    }
    // One listing per parent for the whole pass, siblings cached.
    if (!has(pass.listed, parent)) {
      pass.listed[parent] = true;
      const tiles = (await CARDS.listFolders(pass.api, pass.bookId, parent)) || [];
      for (let j = 0; j < tiles.length; j++) {
        const t = tiles[j];
        const k = parent + "\u0000" + lower(t && t.name);
        if (t && t.id && !has(pass.folders, k)) pass.folders[k] = trim(t.id);
      }
    }
    if (has(pass.folders, key)) {
      pass.reusedFolders += 1;
      parent = pass.folders[key];
      continue;
    }
    const parentWasMine = has(pass.mine, parent);
    const row = await CARDS.createFolderRow(pass.api, pass.bookId, {
      name: seg,
      folderId: parent,
      actor: pass.actor,
    });
    if (!row || !row.id) throw new Error('the folder "' + seg + '" could not be created');
    // Wait here, or the card that lands inside beats its own folder into the database.
    const settle = CARDS.folderSettleOf(pass.bookId, row.id);
    if (settle) {
      const done = await settle;
      if (done && done.ok === false) {
        throw new Error('the folder "' + seg + '" was refused: ' + (done.error || "the write did not land"));
      }
    }
    const id = trim(row.id);
    pass.folders[key] = id;
    // Cache a collision-resolved name under its real spelling too, or the next card makes a second folder.
    pass.folders[parent + "\u0000" + lower(row.name)] = id;
    pass.madeFolders += 1;
    pass.mine[id] = true;
    // Only the top-most new folder goes on the manifest: its children ride with it.
    if (!parentWasMine) pass.roots.push({ kind: "folder", id: id, bookId: pass.bookId });
    parent = id;
  }
  return parent;
}

// Project tag list read ONCE per pass; only a genuinely new name pays a mint.

export async function primeTags(pass) {
  if (pass.tagsPrimed) return;
  pass.tagsPrimed = true;
  try {
    const all = (await CARDS.listProjectTags(pass.api, pass.bookId)) || [];
    for (let i = 0; i < all.length; i++) {
      const t = all[i];
      const k = lower(t && t.name);
      if (k && t.id && !has(pass.tags, k)) pass.tags[k] = trim(t.id);
    }
  } catch (e) {
    note(pass, "could not read the project's tag list (" + reasonOf(e) + ") — tags were minted one by one.");
  }
}

export async function tagIdFor(pass, name) {
  const wanted = trim(name);
  const key = lower(wanted);
  if (!key) return "";
  if (has(pass.tags, key)) return pass.tags[key];
  const id = trim(await CARDS.ensureTag(pass.api, pass.bookId, wanted, { actor: pass.actor }));
  if (id) pass.tags[key] = id;
  return id;
}

// ---------------------------------------------------------------- one card, whole Order is deliberate: 1 the folder, so the card has somewhere to land 2 the row — the caller's beat fires here, before anything else is awaited 3 meta: status + summary + openQuestion in ONE setMeta (it queues behind the insert) 4 the settle check — a refused row is caught HERE, before six doomed piece-writes 5 tags, sections, pages: the card exists, so each rides the repository's own creator

export async function fileOne(pass, entry, index) {
  const ws = [];
  const card = SPEC.normalizeCard(entry, { warnings: ws });
  for (let i = 0; i < ws.length; i++) note(pass, ws[i]);
  if (!card) throw new Error(NOTHING_THERE);

  const folderId = card.folderPath && card.folderPath.length
    ? await folderIdFor(pass, card.folderPath)
    : pass.root;

  const row = await CARDS.createCardRow(pass.api, pass.bookId, {
    folderId: folderId,
    name: card.title,
    actor: pass.actor,
  });
  if (!row || !row.id) throw new Error("the card could not be planned in that folder");
  const id = trim(row.id);

  if (pass.onRow) {
    try {
      pass.onRow(row, index);
    } catch (e) {
      pass.api.log("[cardfile] the caller's onRow hook threw: " + reasonOf(e));
    }
  }

  if (card.summary || card.status || card.openQuestion || card.editor) {
    await CARDS.setMeta(
      pass.api,
      pass.bookId,
      id,
      { summary: card.summary, status: card.status, openQuestion: card.openQuestion, ...(card.editor?{editor:card.editor}:{}) },
      { actor: pass.actor }
    );
  }

  const settled = await CARDS.settleOf(pass.bookId, id);
  if (settled && settled.ok === false) {
    throw new Error(settled.error || "the card could not be written to the book");
  }

  // The card is real from here on, so it goes on the undo manifest — unless it landed inside a
  // folder this same pass created, which will take it back on its own.
  if (!has(pass.mine, folderId)) pass.roots.push({ kind: "card", id: id, bookId: pass.bookId });

  const label = trim(row.name) || card.title;

  if (card.tags.length) await primeTags(pass);
  for (let i = 0; i < card.tags.length; i++) {
    const name = card.tags[i];
    try {
      const tagId = await tagIdFor(pass, name);
      if (!tagId) throw new Error("the tag could not be minted");
      await CARDS.addTag(pass.api, pass.bookId, id, tagId, { actor: pass.actor });
    } catch (e) {
      note(pass, 'the tag "' + name + '" would not go on “' + label + '” (' + reasonOf(e) + ").");
    }
  }

  for (let i = 0; i < card.sections.length; i++) {
    const s = card.sections[i];
    try {
      const sid = await CARDS.createSection(pass.api, pass.bookId, id, {
        name: trim(s.name) || SECTION_FALLBACK,
        actor: pass.actor,
      });
      if (s.content) {
        await CARDS.setSectionContent(pass.api, pass.bookId, sid, s.content, { actor: pass.actor });
      }
    } catch (e) {
      note(
        pass,
        'the section "' + (trim(s.name) || SECTION_FALLBACK) + '" would not go on “' + label +
          "” (" + reasonOf(e) + ")."
      );
    }
  }

  for (let i = 0; i < card.pages.length; i++) {
    const p = card.pages[i];
    try {
      const pid = await CARDS.createPage(pass.api, pass.bookId, id, {
        title: p.title,
        actor: pass.actor,
      });
      // `body` is the wire word (cardspec) and `content` is the database's — the mapping belongs to
      // this lane, and this is the one line that does it.
      if (p.body) await CARDS.setPageContent(pass.api, pass.bookId, pid, p.body, { actor: pass.actor });
      if (p.header || p.footer) {
        await CARDS.setPageChrome(
          pass.api,
          pass.bookId,
          pid,
          { header: p.header, footer: p.footer },
          { actor: pass.actor }
        );
      }
    } catch (e) {
      note(
        pass,
        "page " + (i + 1) + ' of “' + label + "” would not be written (" + reasonOf(e) + ")."
      );
    }
  }

  return { id: id, title: label, folderId: trim(row.folderId) || folderId };
}

// ---------------------------------------------------------------- the one journal row Recorded AFTER every write has landed and the quiet window has closed. Its failure is a warning + a log line, never a refusal: the card is on the shelf, a missing log row does not take it off, and the door must not say otherwise.

export async function journalPass(pass, made) {
  const n = made.length;
  const out = {
    label:
      pass.label ||
      "Filed " + n + " card" + (n === 1 ? "" : "s") + " from " + pass.source,
    seq: 0,
    oneCommand: false,
  };
  if (!n) return out; // nothing landed, so there is nothing to take back
  const declared = declareCommand();
  try {
    const pid = trim(pass.projectId);
    if (!pid) throw new Error("this filing was handed no project id, so the log had nowhere to file the row");
    out.seq =
      (await CHANGELOG.record(pass.api, {
        projectId: pid,
        bookId: pass.bookId,
        type: COMMAND,
        targetId: pass.bookId,
        targetType: "book",
        before: { label: out.label, roots: [] },
        after: {
          label: out.label,
          roots: pass.roots,
          counts: { cards: n, folders: pass.madeFolders },
        },
        actor: pass.actor,
      })) || 0;
    out.oneCommand = declared && !!out.seq;
    if (!declared) {
      note(pass, "the change log took this filing as one journal row, but not an undoable one");
    }
  } catch (e) {
    // ── THE LINE. Everything the pass wrote is already in the book; a refusing journal is a warning
    //   and .ok is never touched here — what stops a written card coming back as a refusal.
    const why = reasonOf(e);
    try {
      pass.api.log("[cardfile] the filing landed but the change log refused its row: " + why);
    } catch (e2) {
      // a seat without a log is not a reason to lose a card
    }
    note(pass, "the cards landed — undo will not take this pass back in one step (" + why + ").");
  }
  return out;
}

// ---------------------------------------------------------------- the two doors

export async function fileCards(objectApi, bookId, cards, opts) {
  const o = isObj(opts) ? opts : {};
  const out = {
    ok: false,
    made: [],
    failed: [],
    warnings: [],
    folders: { made: 0, reused: 0 },
    label: "",
    seq: 0,
    oneCommand: false,
    held: 0,
  };
  let pass = null;
  try {
    pass = newPass(objectApi, bookId, o);
    if (!pass.bookId) {
      out.failed.push({ title: "", why: "there is no book to file into — open one first", index: -1 });
      return out;
    }
    const list = listOf(cards);
    if (!list.length) {
      out.failed.push({ title: "", why: "there was nothing to file — that payload held no cards", index: -1 });
      return out;
    }
    // ONE gesture: the repository's per-write rows are held from here until the finally below.
    const q = quiet();
    q.add(pass.bookId);
    // ONE index pass for the whole payload: the repository reindexes a card once per piece written (card, meta, every section, every page) — two cards cost ~24 full index passes where two is the truth. Both halves or neither — a hold with no flush would silently stop indexing this seat's writes, so the flag is set only when the repository carries the pair.
    const holding =
      typeof CARDS.holdIndex === "function" && typeof CARDS.flushIndex === "function";
    if (holding) CARDS.holdIndex();
    try {
      for (let i = 0; i < list.length; i++) {
        const entry = list[i];
        if (out.made.length + out.failed.length >= pass.cap) {
          out.failed.push({
            title: titleGuess(entry),
            why: "one pass files at most " + pass.cap + " cards — this one was over the line",
            index: i,
          });
          continue;
        }
        try {
          const made = await fileOne(pass, entry, i);
          out.made.push({ id: made.id, title: made.title, index: i });
        } catch (e) {
          const why = reasonOf(e);
          out.failed.push({ title: titleGuess(entry), why: why, index: i });
          try {
            objectApi.log('[cardfile] refused “' + titleGuess(entry) + '”: ' + why);
          } catch (e2) {
            // nothing to do — the sentence still rides back in .failed
          }
        }
      }
    } finally {
      // Index FIRST — the hold must never survive this pass, thrown error or not — then the log. Flushing a half-finished pass is safe: the repository indexes what landed and names what it could not; a failure here is a warning, never a refusal (cards are in the book either way).
      if (holding) {
        try {
          await CARDS.flushIndex(objectApi);
        } catch (e) {
          note(pass, "the cards landed — the search index was rebuilt late (" + reasonOf(e) + ").");
        }
      }
      pass.held = q.close().held;
    }

    // The one row for the whole press. Never fatal (journalPass owns that promise).
    const j = await journalPass(pass, out.made);
    out.label = j.label;
    out.seq = j.seq;
    out.oneCommand = j.oneCommand;
    out.held = pass.held;
    out.warnings = pass.warnings;
    out.folders = { made: pass.madeFolders, reused: pass.reusedFolders };
    out.ok = out.made.length > 0 && out.failed.length === 0;
    return out;
  } catch (e) {
    // The promise never to throw covers the pass itself, not just the cards in it.
    const why = reasonOf(e);
    try {
      objectApi.log("[cardfile] the filing pass itself failed: " + why);
    } catch (e2) {
      // ignore
    }
    if (pass) {
      out.warnings = pass.warnings;
      out.folders = { made: pass.madeFolders, reused: pass.reusedFolders };
      out.held = pass.held;
    }
    out.failed.push({ title: "", why: why, index: -1 });
    out.ok = false;
    return out;
  }
}

// One card, the same pass, flattened for a caller holding exactly one draft.
export async function fileCard(objectApi, bookId, card, opts) {
  const res = await fileCards(objectApi, bookId, [card], opts);
  const made = res.made[0] || null;
  const bad = res.failed[0] || null;
  return {
    ok: !!made,
    id: made ? made.id : "",
    title: made ? made.title : bad ? bad.title : "",
    why: made ? "" : bad ? bad.why : "the card was not filed",
    warnings: res.warnings,
    folders: res.folders,
    label: res.label,
    seq: res.seq,
    oneCommand: res.oneCommand,
    held: res.held,
  };
}

module.exports = {
  fileCards: fileCards,
  fileCard: fileCard,
  // Named so a caller can quote the same wording instead of writing a second copy of it.
  NOTHING_THERE: NOTHING_THERE,
  SECTION_FALLBACK: SECTION_FALLBACK,
  COMMAND: COMMAND,
  declareCommand: declareCommand,
};
