// cardbundle.js — one book out as an archive of { name, text } entries (index.json, cards.json, cards/NNN-<slug>.json, images.json, README.txt); the caller zips them.

const CARDS = require("lib/cards.js");
const CARDJSON = require("lib/cardjson.js");
const STORE = require("lib/store.js");
// The export reads pictures and settings straight off SQL (they have no CARDS/GRAPH reader), so the desk is paid ONCE at the top of a bundle — otherwise a picture or a book setting staged inside the journal's 90-tick rest window is simply missing from the archive.
const JOURNAL = require("lib/journal.js");
const SPEC = require("lib/cardspec.js");
// THE ONE DESCENT, shared with lib/cardjson.js and app-shell's bookAsText.
const WALK = require("lib/exportwalk.js");

const MAX_DEPTH = WALK.MAX_DEPTH;
const CARD_CEILING = WALK.CARD_CEILING;

export function text(v) {
  return v === null || v === undefined ? "" : String(v);
}

export function slug(s) {
  const out = text(s)
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return out || "card";
}

export function pad3(n) {
  return (n < 10 ? "00" : n < 100 ? "0" : "") + n;
}

export function pathLabel(parts) {
  const list = [];
  for (const p of parts || []) {
    const seg = text(p).trim();
    if (seg) list.push(seg.replace(/\//g, " "));
  }
  return list.join("/");
}

// Emits the same tree cardjson.js does — same descent, same order — but keeps the ids: file names and picture hanging need them. compile = N is pruned by the descent and recorded here, so the sheet and index.json can say what stayed out.
export async function emit(objectApi, bookId, entries, acc, opts) {
  for (const e of entries || []) {
    if (e.kind === "folder") {
      acc.folders.push({ id: e.id, name: e.name, path: pathLabel(e.parts) });
      continue;
    }
    if (e.kind === "folderCut") {
      acc.notCompiled.push({ kind: "folder", name: e.name, path: pathLabel(e.parts) });
      continue;
    }
    if (e.kind === "cardCut") {
      acc.notCompiled.push({ kind: "card", name: e.name, path: pathLabel(e.parts) });
      continue;
    }
    if (acc.cards.length >= CARD_CEILING) return acc;
    try {
      const card = await CARDJSON.cardAsCard(objectApi, bookId, e.id, e.name, e.parts, opts);
      acc.cards.push({ id: e.id, card: card });
    } catch (err) {
      acc.skipped.push({ name: e.name || e.id, reason: (err && err.message) || String(err) });
      objectApi.log("[cardbundle] card skipped: " + e.id + " — " + ((err && err.message) || err));
    }
  }
  return acc;
}

export async function imageMap(objectApi, bookId) {
  const map = {};
  try {
    // .rows, not the result object: `for (const r of res)` threw on every call, the catch below
    // logged it and every archive shipped with an empty images.json (2026-08-30).
    const res = await STORE.book(bookId).imagesAll(objectApi);
    for (const r of (res && res.rows) || []) {
      const id = text(r && r.cardId);
      if (id) map[id] = { url: text(r.url), prompt: text(r.prompt), version: Number(r.version || 0) };
    }
  } catch (e) {
    objectApi.log("[cardbundle] pictures unreadable: " + ((e && e.message) || e));
  }
  return map;
}

export async function settingsOf(objectApi, bookId) {
  const out = {};
  try {
    // Same shape, same miss as imageMap above: index.json's book.settings was always {}.
    const res = await STORE.book(bookId).settingAll(objectApi);
    for (const r of (res && res.rows) || []) {
      const k = text(r && r.key);
      if (k) out[k] = text(r.value);
    }
  } catch (e) {
    objectApi.log("[cardbundle] settings unreadable: " + ((e && e.message) || e));
  }
  return out;
}

export async function bookBundle(objectApi, bookId, bookName, opts) {
  const o = opts || {};
  const label = text(bookName) || "Book";
  // PAY THE DESK FIRST. Every other read in this file goes through CARDS/GRAPH, which settle the journal themselves; imageMap and settingsOf read SQL directly, so without this a picture or a setting written seconds ago ships stale (or not at all).
  try {
    await JOURNAL.flush(objectApi, String(bookId));
  } catch (e) {
    objectApi.log("[cardbundle] the write desk for book " + String(bookId) + " could not be paid: " + ((e && e.message) || e));
  }
  const acc = { cards: [], folders: [], skipped: [], notCompiled: [] };
  if (!o.compile) {
    try {
      o.compile = await CARDS.compileFlags(objectApi, String(bookId));
    } catch (e) {
      o.compile = null;
    }
  }
  try {
    const order = await WALK.bookOrder(objectApi, String(bookId), {
      compile: o.compile || null,
      cardCeiling: CARD_CEILING,
    });
    await emit(objectApi, String(bookId), order.entries, acc, o);
  } catch (e) {
    acc.skipped.push({ name: "book root", reason: (e && e.message) || String(e) });
  }

  const pics = await imageMap(objectApi, String(bookId));
  const settings = await settingsOf(objectApi, String(bookId));

  const entries = [];
  const rows = [];
  const images = [];
  const all = [];

  let n = 0;
  for (const item of acc.cards) {
    n += 1;
    const card = item.card;
    const pic = pics[item.id] || null;
    if (pic && pic.prompt) card.image = pic.prompt;
    all.push(card);
    const file = "cards/" + pad3(n) + "-" + slug(card.title) + ".json";
    entries.push({ name: file, text: CARDJSON.stringify([card], label + " · " + text(card.title)) });
    rows.push({
      file: file,
      title: text(card.title),
      folder: text(card.folder),
      status: text(card.status),
      tags: card.tags || [],
      sections: (card.sections || []).length,
      pages: (card.pages || []).length,
      openQuestion: !!card.openQuestion,
      image: pic ? pic.url : "",
    });
    if (pic && pic.url) {
      images.push({
        card: text(card.title),
        file: file,
        url: pic.url,
        prompt: pic.prompt,
        version: pic.version,
      });
    }
  }

  const index = {
    codexbuilder: {
      format: "book-bundle",
      version: SPEC.VERSION,
      cardFormat: "cards",
      exported: text(o.stamp),
      author: text(o.author),
      project: text(o.project),
    },
    book: {
      name: label,
      cards: rows.length,
      folders: acc.folders.length,
      pictures: images.length,
      unreadable: acc.skipped.length,
      settings: settings,
    },
    folders: acc.folders.map((f) => ({ name: f.name, path: f.path })),
    cards: rows,
    skipped: acc.skipped,
    notCompiled: acc.notCompiled,
  };

  entries.unshift({ name: "index.json", text: JSON.stringify(index, null, 2) });
  entries.push({ name: "cards.json", text: CARDJSON.stringify(all, label) });
  if (images.length) entries.push({ name: "images.json", text: JSON.stringify({ pictures: images }, null, 2) });
  entries.push({ name: "README.txt", text: readme(label, rows.length, images.length) });

  const bits = [rows.length + " card" + (rows.length === 1 ? "" : "s")];
  if (acc.folders.length) bits.push(acc.folders.length + " folder" + (acc.folders.length === 1 ? "" : "s"));
  if (images.length) bits.push(images.length + " picture" + (images.length === 1 ? "" : "s"));
  if (acc.skipped.length) bits.push(acc.skipped.length + " unreadable");
  const foldersOut = acc.notCompiled.filter((n) => n.kind === "folder").length;
  const cardsOut = acc.notCompiled.length - foldersOut;
  if (foldersOut) bits.push(foldersOut + " folder" + (foldersOut === 1 ? "" : "s") + " not compiled");
  if (cardsOut) bits.push(cardsOut + " card" + (cardsOut === 1 ? "" : "s") + " not compiled");

  return {
    entries: entries,
    cards: rows.length,
    folders: acc.folders.length,
    images: images.length,
    skipped: acc.skipped,
    notCompiled: acc.notCompiled,
    foldersLeftOut: foldersOut,
    cardsLeftOut: cardsOut,
    addr: label + " — " + bits.join(" · "),
    index: entries[0].text,
  };
}

export function readme(label, cards, pics) {
  return (
    label +
    "\n" +
    new Array(Math.min(label.length, 60) + 1).join("=") +
    "\n\n" +
    "This folder is a Worldwright Studio book: " +
    cards +
    " card" +
    (cards === 1 ? "" : "s") +
    (pics ? ", " + pics + " picture" + (pics === 1 ? "" : "s") : "") +
    ".\n\n" +
    "index.json      what the book is — counts, saved settings, the folder tree, and the file each card lives in.\n" +
    "cards.json      the whole book in one file. File \u25b8 Import\u2026 takes this and rebuilds the book.\n" +
    "cards/          one file per card. Each one imports on its own, so a single card can travel.\n" +
    "images.json     every picture's address and the words it was made from.\n\n" +
    "Pictures are addresses, not files: in Worldwright Studio a picture IS its name, so the address in\n" +
    "images.json will draw the same picture again wherever it is opened.\n\n" +
    "To bring a book back: open the project you want it in, then File \u25b8 Import\u2026 and give it cards.json.\n"
  );
}

module.exports = {
  MAX_DEPTH,
  CARD_CEILING,
  bookBundle,
  slug,
};
