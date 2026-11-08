// js is the registry.

const PIN = require("lib/pinned.js");
const CARDS = require("lib/cards.js");
const LIB = require("lib/library.js");

const PINNED = PIN.PINNED;
const ID = PIN.ID;
const NAME = PIN.NAME;
const text = PIN.text;
const key = PIN.key;
const specFor = PIN.specFor;
const parse = PIN.parse;
const isPinned = PIN.isPinned;
const isRetired = PIN.isRetired;
const bookOf = PIN.bookOf;
const entry = PIN.entry;
const all = PIN.all;
const ids = PIN.ids;
const folders = PIN.folders;

// A shim for one caller: answers false forever, sending app-shell's boot down its open() branch.
// Delete this and the `if (RESEARCH.stamp(...))` in app-shell.js together.
export function stamp() {
  return false;
}

// Idempotent. `pending` means the statements have not reached this seat's compiled code yet and the
//   caller should park the id.
export async function open(objectApi) {
  const out = { ready: true, pending: false, books: [] };
  for (const spec of PINNED) {
    if (spec.lazy) continue; // Studio Code is inspected on demand, never at boot.
    const one = await seed(objectApi, String(spec.id));
    out.books.push(one);
    if (!one || !one.ready) {
      out.ready = false;
      out.pending = true;
    }
  }
  return out;
}

// A trashed folder is NOT re-seeded: the row still holds its name under UNIQUE (folderId, name), so
//   a re-seed would land a "Timeline 2" beside it.
export async function trashedFolderNames(objectApi, bookId) {
  const out = {};
  try {
    const rows = await CARDS.listTrash(objectApi, bookId);
    for (const r of rows || []) if (String(r.entityType) === "folder") out[key(r.name)] = true;
  } catch (e) {
    objectApi.log("[research] the trash could not be read while seeding: " + String((e && e.message) || e));
  }
  return out;
}

// A seeded folder that came back wearing a "(2)" was overtaken by another seat between the listing
//   and the insert — the twin is thrown away and the map points at the folder that won.
export async function adoptTwins(objectApi, bookId, twins, byName) {
  const suspect = (twins || []).filter((t) => t && t.id);
  if (!suspect.length) return;
  let have = null;
  try {
    have = await CARDS.listFolders(objectApi, bookId, bookId);
  } catch (e) {
    return;
  }
  const rows = {};
  for (const f of have || []) rows[String(f.id)] = String(f.name || "");
  for (const t of suspect) {
    const landed = rows[String(t.id)];
    if (landed === undefined || key(landed) === key(t.name)) continue;
    let keeper = "";
    for (const f of have || []) {
      if (String(f.id) !== String(t.id) && key(f.name) === key(t.name)) keeper = String(f.id);
    }
    if (!keeper) continue;
    byName[key(t.name)] = keeper;
    try {
      // Same fence, same reason as the seed loop: a locked book refuses purgeFolder from the app.
      CARDS.authoring(true);
      try {
        await CARDS.purgeFolder(objectApi, bookId, t.id, { actor: "seed" });
      } finally {
        CARDS.authoring(false);
      }
    } catch (e) {
      objectApi.log("[research] a seeded twin could not be cleared: " + String((e && e.message) || e));
    }
  }
}

// ONE SEEDING AT A TIME, PER BOOK: two callers reach seed() in one boot, and both listing first is how the book grew a twin of all 14 folders. The latch makes the second await the first; adoptTwin covers the cross-seat case the latch cannot see.
const SEEDING = {};

export async function seed(objectApi, bookId) {
  if (isRetired(bookId)) return null;
  const wantId = String((specFor(text(bookId) || ID) || {}).id || "");
  if (!wantId) return null;
  if (SEEDING[wantId]) return await SEEDING[wantId];
  const run = seedOnce(objectApi, wantId);
  SEEDING[wantId] = run;
  try {
    return await run;
  } finally {
    delete SEEDING[wantId];
  }
}

export async function seedOnce(objectApi, bookId) {
  if (isRetired(bookId)) return null;
  const spec = specFor(text(bookId) || ID);
  if (!spec) return null;
  const id = String(spec.id);
  const st = await CARDS.ensureBook(objectApi, id);
  if (!st || !st.ready) return { id, ready: false, created: [], folders: {} };
  await LIB.ensure(objectApi);
  if(id==='0MUSIC00BOOK0'||id==='ASSET00STUDIO')await require('lib/studio-projects.js').prepare(objectApi,id);

  const have = ((await CARDS.tableOf(id).foldersAll(objectApi)).rows || []).filter(f => String(f.folderId) === id);
  const byName = {};
  for (const f of have || []) byName[key(f.name)] = f.id;

  const missing = folders(id).filter((n) => !byName[key(n)]);
  const created = [];
  const twins = [];
  if (missing.length) {
    const gone = await trashedFolderNames(objectApi, id);
    // A locked book refuses createFolder, so the fence is lifted for exactly this loop and dropped
    // in the finally — nothing else may run inside that window.
    CARDS.authoring(true);
    try {
      for (const name of missing) {
        if (gone[key(name)]) continue;
        // actor "seed" keeps bootstrap folders out of the undo journal (cards.record drops them).
        const made = await CARDS.createFolder(objectApi, id, { name: name, actor: "seed" });
        if (!made) continue;
        byName[key(name)] = made;
        created.push({ id: made, name: name });
        twins.push({ id: made, name: name });
      }
    } finally {
      CARDS.authoring(false);
    }
    // Waiting on the inserts is what makes the NEXT boot's listing see them — an unsettled row
    // would be re-seeded as a twin.
    for (const c of created) {
      const settle = CARDS.folderSettleOf(id, c.id);
      if (settle) await settle;
    }
    await adoptTwins(objectApi, id, twins, byName);
  }
  return { id, ready: true, created, folders: byName, count: Object.keys(byName).length };
}

export async function seedIfPinned(objectApi, bookId) {
  if (!specFor(text(bookId))) return null;
  return await seed(objectApi, bookId);
}

// Null when the seed has not landed yet — the caller opens the book's root, never invents a folder.
export async function folderIdNamed(objectApi, bookId, name) {
  const spec = specFor(text(bookId) || ID);
  const want = key(name);
  if (!spec || !want) return null;
  const id = String(spec.id);
  const cached = CARDS.listFoldersCached(id, id) || [];
  for (const f of cached) if (key(f.name) === want) return f.id;
  const have = await CARDS.listFolders(objectApi, id, id);
  for (const f of have || []) if (key(f.name) === want) return f.id;
  return null;
}

module.exports = {
  ID,
  NAME,
  PINNED,
  all,
  ids,
  folders,
  parse,
  isPinned,
  isRetired,
  bookOf,
  entry,
  stamp,
  open,
  seed,
  seedIfPinned,
  folderIdNamed,
};
