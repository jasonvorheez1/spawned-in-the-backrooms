// Safe entry for pinned authored documents. Existing ordinary-book routes stay intact.
const POLICY = require("lib/document-export-policy.js");
const WALK = require("lib/exportwalk.js");
const JSONDOC = require("lib/cardjson.js");
const BUNDLE = require("lib/cardbundle.js");
const CARDS = require("lib/cards.js");
export async function bookDocument(objectApi, bookId, bookName, format, opts) {
  POLICY.assertExportable(bookId); // before any repository or content read
  await WALK.prepareDocuments(objectApi, bookId);
  // Deliberately no resolver: source references remain references, including native JSON.
  const o = opts || {};
  if (format === "json") {
    const b = await BUNDLE.bookBundle(objectApi, bookId, bookName, {
      author: o.author || "", project: o.project || "", stamp: bookName,
    });
    return { bookId, addr: b.addr, text: b.index, files: b.entries, bundle: true,
      foldersLeftOut: b.foldersLeftOut, cardsLeftOut: b.cardsLeftOut, error: "" };
  }
  const compile = await CARDS.compileFlags(objectApi, bookId);
  const order = await WALK.bookOrder(objectApi, bookId, { compile, cardCeiling: 0 });
  const out = { cards: [], notCompiled: [] };
  for (const entry of order.entries) {
    if (entry.kind === "card") out.cards.push(await JSONDOC.cardAsCard(objectApi, bookId, entry.id, entry.name, entry.parts));
    if (entry.kind === "folderCut") out.notCompiled.push({ kind: "folder" });
    if (entry.kind === "cardCut") out.notCompiled.push({ kind: "card" });
  }
  const lines = ["# " + bookName];
  for (const c of out.cards) {
    lines.push("", "## " + (c.folder ? c.folder + "/" : "") + c.title);
    if (c.summary) lines.push("", c.summary);
    if (c.status) lines.push("status: " + c.status);
    for (const s of c.sections || []) lines.push("", "### " + s.name, s.content);
    for (const p of c.pages || []) lines.push("", "### " + (p.title || "Page"), p.header || "", p.body || "", p.footer || "");
  }
  const cuts = out.notCompiled || [];
  return { bookId, addr: bookName, text: lines.join("\n"), files: [], bundle: false,
    foldersLeftOut: cuts.filter((x) => x.kind === "folder").length,
    cardsLeftOut: cuts.filter((x) => x.kind === "card").length, error: "" };
}
module.exports = { bookDocument };
