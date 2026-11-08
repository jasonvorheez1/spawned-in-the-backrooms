// cardsections.js — the card modal's whole section plan (creates/renames/contents/deletes) written in ONE press, as one CARD_SECTIONS journal row. The inverse reconciles BY POSITION: public lib/cards.js cannot re-insert a deleted section under its old id, so undo rebuilds the list — same text and order, new ids.

const CARDS = require("lib/cards.js");
const CHANGELOG = require("lib/changelog.js");

// Same word lib/cardfile.js gives a nameless section — keep the two spellings identical.
const SECTION_FALLBACK = "Note";
const COMMAND = "CARD_SECTIONS";

export function str(v) {
  return v === null || v === undefined ? "" : String(v);
}

export function trim(v) {
  return str(v).trim();
}

export function isArr(v) {
  return Object.prototype.toString.call(v) === "[object Array]";
}

export function isObj(v) {
  return !!v && typeof v === "object" && !isArr(v);
}

export function listOf(v) {
  return isArr(v) ? v : [];
}

export function reasonOf(e) {
  return trim((e && e.message) || e) || "the write was refused without naming a reason";
}

export function logLine(objectApi, line) {
  try {
    objectApi.log("[cardsections] " + line);
  } catch (e) {
    // a seat without a log is not a reason to lose a section
  }
}

// Holds the repository's per-write journal rows for the pass — scoped to this book and these types, so anything else recording meanwhile is forwarded untouched.
const QUIET_TYPES = {
  CREATE_SECTION: 1,
  RENAME_SECTION: 1,
  SET_SECTION_CONTENT: 1,
  REORDER_SECTION: 1,
  DELETE_SECTION: 1,
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
    // structural: the reversal creates and destroys rows, so it routes through the handler below.
    table[COMMAND] = { undoable: true, structural: true, target: "card" };
  }
  if (CHANGELOG && typeof CHANGELOG.registerUndo === "function") {
    CHANGELOG.registerUndo(COMMAND, reverseSections);
  }
  return !!(table && table[COMMAND]);
}

// Ids ride along for the log's reading only — reconcile() below does not trust them.
export async function snapshot(objectApi, bookId, cardId) {
  const rows = await CARDS.listSections(objectApi, bookId, cardId);
  return listOf(rows).map(function (r) {
    return { id: trim(r && r.id), name: str(r && r.name), content: str(r && r.content) };
  });
}

// By POSITION: extras go, the overlap is corrected in place, the missing tail is created. A refusing step is counted and the walk carries on.
export async function reconcile(objectApi, bookId, cardId, want) {
  const have = await snapshot(objectApi, bookId, cardId);
  const wanted = listOf(want).map(function (r) {
    return { name: str(r && r.name), content: str(r && r.content) };
  });
  let moved = 0;
  let left = 0;

  for (let i = have.length - 1; i >= wanted.length; i--) {
    try {
      await CARDS.deleteSection(objectApi, bookId, have[i].id, {});
      moved += 1;
    } catch (e) {
      left += 1;
      logLine(objectApi, "reversal left section " + have[i].id + " standing: " + reasonOf(e));
    }
  }

  const shared = Math.min(have.length, wanted.length);
  for (let i = 0; i < shared; i++) {
    if (have[i].name !== wanted[i].name) {
      try {
        await CARDS.renameSection(objectApi, bookId, have[i].id, wanted[i].name, {});
        moved += 1;
      } catch (e) {
        left += 1;
        logLine(objectApi, "reversal could not rename section " + have[i].id + ": " + reasonOf(e));
      }
    }
    if (have[i].content !== wanted[i].content) {
      try {
        await CARDS.setSectionContent(objectApi, bookId, have[i].id, wanted[i].content, {});
        moved += 1;
      } catch (e) {
        left += 1;
        logLine(objectApi, "reversal could not restore section " + have[i].id + ": " + reasonOf(e));
      }
    }
  }

  for (let i = have.length; i < wanted.length; i++) {
    try {
      const id = await CARDS.createSection(objectApi, bookId, cardId, {
        name: trim(wanted[i].name) || SECTION_FALLBACK,
      });
      if (wanted[i].content) {
        await CARDS.setSectionContent(objectApi, bookId, trim(id), wanted[i].content, {});
      }
      moved += 1;
    } catch (e) {
      left += 1;
      logLine(objectApi, "reversal could not put a section back: " + reasonOf(e));
    }
  }

  if (left) {
    logLine(objectApi, "reversal made " + moved + " change(s) — " + left + " step(s) had moved on");
  }
  return moved;
}

// side "before" = undo (back to how the list looked before the press); "after" = redo.
export async function reverseSections(objectApi, row, side) {
  const snap = ((side === "before" ? row && row.before : row && row.after) || {});
  const bookId = trim(row && row.bookId);
  const cardId = trim(snap.cardId) || trim(row && row.targetId);
  if (!bookId || !cardId) throw new Error("that section change has no card to put back");
  const q = quiet();
  q.add(bookId);
  const holding = typeof CARDS.holdIndex === "function" && typeof CARDS.flushIndex === "function";
  if (holding) CARDS.holdIndex();
  try {
    return await reconcile(objectApi, bookId, cardId, snap.sections || []);
  } finally {
    if (holding) {
      try {
        await CARDS.flushIndex(objectApi);
      } catch (e) {
        logLine(objectApi, "the sections came back — the search index was rebuilt late (" + reasonOf(e) + ").");
      }
    }
    q.close();
  }
}

// Declared at load, so a seat can undo a section press it never ran.
declareCommand();


export function planOf(plan) {
  const p = isObj(plan) ? plan : {};
  return {
    creates: listOf(p.creates).map(function (c) {
      const o = isObj(c) ? c : {};
      return { tempId: trim(o.tempId), name: str(o.name), content: str(o.content) };
    }),
    renames: listOf(p.renames)
      .map(function (r) {
        const o = isObj(r) ? r : {};
        return { id: trim(o.id), name: str(o.name) };
      })
      .filter(function (r) {
        return !!r.id;
      }),
    contents: listOf(p.contents)
      .map(function (r) {
        const o = isObj(r) ? r : {};
        return { id: trim(o.id), content: str(o.content) };
      })
      .filter(function (r) {
        return !!r.id;
      }),
    deletes: listOf(p.deletes)
      .map(function (d) {
        return trim(d);
      })
      .filter(function (d) {
        return !!d;
      }),
  };
}

export function planEmpty(p) {
  return !p.creates.length && !p.renames.length && !p.contents.length && !p.deletes.length;
}

// Journal failure is a log line and a flag, never a refusal — the sections are already in the book.
export async function journalPass(objectApi, ctx, out, before, after) {
  const declared = declareCommand();
  try {
    if (!ctx.projectId) {
      throw new Error("this press was handed no project id, so the log had nowhere to file the row");
    }
    out.seq =
      (await CHANGELOG.record(objectApi, {
        projectId: ctx.projectId,
        bookId: ctx.bookId,
        type: COMMAND,
        targetId: ctx.cardId,
        targetType: "card",
        before: { label: out.label, cardId: ctx.cardId, sections: before },
        after: { label: out.label, cardId: ctx.cardId, sections: after },
        actor: ctx.actor,
      })) || 0;
    out.oneCommand = declared && !!out.seq;
  } catch (e) {
    const why = reasonOf(e);
    logLine(objectApi, "the sections landed but the change log refused their row: " + why);
    out.journalWhy = why;
  }
  return out;
}

export async function commitSections(objectApi, bookId, cardId, plan, opts) {
  const o = isObj(opts) ? opts : {};
  const ctx = {
    bookId: trim(bookId),
    cardId: trim(cardId),
    actor: trim(o.actor),
    projectId: trim(o.projectId),
  };
  const p = planOf(plan);
  const out = {
    ok: true,
    created: [],
    renamed: 0,
    contented: 0,
    deleted: 0,
    failed: [],
    touched: false,
    seq: 0,
    oneCommand: false,
    held: 0,
    journalWhy: "",
    label: trim(o.label) || labelFor(p, trim(o.cardName)),
  };
  if (!ctx.bookId || !ctx.cardId) {
    out.ok = false;
    out.failed.push("there is no open card to write those sections to");
    return out;
  }
  if (planEmpty(p)) return out;

  let before = [];
  try {
    before = await snapshot(objectApi, ctx.bookId, ctx.cardId);
  } catch (e) {
    // A snapshot that will not read costs the press its undo row, never its writes.
    logLine(objectApi, "could not read the section list before the press: " + reasonOf(e));
  }

  const q = quiet();
  q.add(ctx.bookId);
  const holding = typeof CARDS.holdIndex === "function" && typeof CARDS.flushIndex === "function";
  if (holding) CARDS.holdIndex();

  const fail = function (line, e) {
    out.ok = false;
    const why = line + " (" + reasonOf(e) + ")";
    out.failed.push(why);
    logLine(objectApi, why);
  };

  try {
    // CREATES first, in the author's visible order, so sort keys land ascending behind them.
    for (let i = 0; i < p.creates.length; i++) {
      const c = p.creates[i];
      const name = trim(c.name) || SECTION_FALLBACK;
      try {
        const id = trim(
          await CARDS.createSection(objectApi, ctx.bookId, ctx.cardId, { name: name, actor: ctx.actor })
        );
        if (!id) throw new Error("the section was not given an id");
        out.created.push(id);
        out.touched = true;
        if (c.content) {
          await CARDS.setSectionContent(objectApi, ctx.bookId, id, c.content, { actor: ctx.actor });
        }
      } catch (e) {
        fail('the new section "' + name + '" would not go on this card', e);
      }
    }

    for (let i = 0; i < p.renames.length; i++) {
      const r = p.renames[i];
      try {
        await CARDS.renameSection(objectApi, ctx.bookId, r.id, r.name, { actor: ctx.actor });
        out.renamed += 1;
        out.touched = true;
      } catch (e) {
        fail('that section could not be renamed to "' + trim(r.name) + '"', e);
      }
    }
    for (let i = 0; i < p.contents.length; i++) {
      const r = p.contents[i];
      try {
        await CARDS.setSectionContent(objectApi, ctx.bookId, r.id, r.content, { actor: ctx.actor });
        out.contented += 1;
        out.touched = true;
      } catch (e) {
        fail("that section's text could not be written", e);
      }
    }

    // DELETES last, so a row the author removed is not deleted out from under an edit above.
    for (let i = 0; i < p.deletes.length; i++) {
      try {
        await CARDS.deleteSection(objectApi, ctx.bookId, p.deletes[i], { actor: ctx.actor });
        out.deleted += 1;
        out.touched = true;
      } catch (e) {
        fail("that section could not be removed", e);
      }
    }
  } finally {
    if (holding) {
      try {
        await CARDS.flushIndex(objectApi);
      } catch (e) {
        logLine(objectApi, "the sections landed — the search index was rebuilt late (" + reasonOf(e) + ").");
      }
    }
    out.held = q.close().held;
  }

  if (!out.touched) return out;

  let after = [];
  try {
    after = await snapshot(objectApi, ctx.bookId, ctx.cardId);
  } catch (e) {
    logLine(objectApi, "could not read the section list after the press: " + reasonOf(e));
    after = before;
  }
  await journalPass(objectApi, ctx, out, before, after);
  return out;
}

export function labelFor(p, cardName) {
  const bits = [];
  if (p.creates.length) bits.push(p.creates.length === 1 ? "added a section" : "added " + p.creates.length + " sections");
  if (p.deletes.length) bits.push(p.deletes.length === 1 ? "removed a section" : "removed " + p.deletes.length + " sections");
  const edits = p.renames.length + p.contents.length;
  if (edits) bits.push(edits === 1 ? "edited a section" : "edited " + edits + " sections");
  const what = bits.length
    ? bits.length === 1
      ? bits[0]
      : bits.slice(0, -1).join(", ") + " and " + bits[bits.length - 1]
    : "changed the sections";
  const who = trim(cardName);
  return who ? what.charAt(0).toUpperCase() + what.slice(1) + " on “" + who + "”" : what.charAt(0).toUpperCase() + what.slice(1);
}

module.exports = {
  commitSections: commitSections,
  SECTION_FALLBACK: SECTION_FALLBACK,
  COMMAND: COMMAND,
  declareCommand: declareCommand,
};
