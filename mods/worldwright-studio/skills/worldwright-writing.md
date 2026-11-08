---
name: worldwright-writing
description: "The MANUSCRIPT lane — how to actually WRITE a book in Worldwright Studio (a novel, with arcs, chapters and scenes) rather than file a design notebook. The hierarchy (arc folders → chapter folders → the chapter card + a scene folder → scene cards), the grain LIFECYCLE (draft every scene as its own card so stacks carry per-scene takes; when a chapter's scenes are all final, MERGE into the chapter card and flip the scene folder's Compile to N — NOTHING trashed at merge, trash is compaction-only under the chapter-card guard, §6b), pages = the prose itself, sections = beats, the NEIGHBOURS law that holds reading order (beforeId lands BEFORE that sibling, afterId AFTER, neither appends), stacks as drafts/takes (stackId is the PRIMARY's id; the top card is stackOrder's first entry; setStackPrimary is the only op that rewrites references), continuity through a Cast/Places folder and inline #[id] refs with backlinks, and the revision passes (card_stats word counts, Find & Replace, document exports). Scopes the grain law: \"one card, one feature\" is the CODEX lane's law (worldwright-routing), not a rule over manuscripts."
---

# The manuscript lane — arcs, chapters, scenes

The creator's ask, verbatim:

> "We need you to be able to write a book properly. With arcs, chapters, and scenes."

Everything else in these skills teaches the **design notebook**: an ask arrives, it gets filed, a card
holds one feature and its questions. This skill is the other job — **ordered prose read straight
through**, front to back, arcs above it and scenes inside it.

**Where this lane lives:** a manuscript is written in the author's **own** book, never the locked
Codex — so no `CARDS.authoring()` lift is involved here at all; that lift, the write fence and the
allow-list gate are `worldwright-routing`'s to state. Read them there.

---

## 1. THE GRAIN LAW IS THE CODEX'S LAW — not a law over manuscripts

His ruling, verbatim:

> "One card one feature was for writing CODEX entries specifically."

For CODEX entries, the newer 2026-09-17 correction is **concept folder → independent part
cards → full usable A3 pages**, stated in `worldwright-codex` and `worldwright-routing` §3.
The historical quote above does not require an entire subject to stay in one card. A manuscript is simply **outside that lane**: not a notebook of
entries but ordered prose, its card-grain chosen by the shape of the book. Nothing here is an
exception to a global law, because there was never a global law to except.

---

## 2. THE LADDER — arcs, chapters, scenes (his hierarchy)

His rulings, verbatim:

> "Cards are also not just chapters. They can be individual scenes."

> "folders are arc, chapters, scenes. a book contains arc folders, which contain their own chapter
> folders, which contain their own chapter cards and scene folders, and scene folders hold the
> scene cards."

```
book
└─ arc folder            Part One — The Salt Road
   └─ chapter folder     2 · Salt and Iron
      ├─ chapter card    the merged, finalized prose (absent until the merge, §6b)
      └─ scene folder    Scenes — the drafting bench
         └─ scene cards  one card per scene, in reading order; stacks carry each scene's takes
```

**A scene card is allowed to carry more than prose.** It can hold a **shot list** — film-kit's
doctrine written as the card's own set section and `#[cam: …]` beats (`worldwright-cinema`) — and a
**soundscape** section — the cue track, the location's ambience bed (`worldwright-sound`). Both ride
the scene card the manuscript already has; neither mints a parallel folder. **Shoot compiles one scene
card to two targets** — Absolute Cinema's clip and film-kit's `scripts/lib/data/film.json` rows — from
a single read of that card, so writing the scene well IS the production data.

Pages are the prose and sections are the beats (§5), on whichever card holds the prose right now.
The NEIGHBOURS law (§3) holds reading order at every rung — arcs among arcs, chapters among
chapters, scenes among scenes.

**The grain is a LIFECYCLE.** His refinement, verbatim:

> "use cards for scenes until all scenes are in their finalized state, then merge to a chapter
> card. this way it is easier to make alternate versions and drafts of scenes."

**Drafting:** the chapter folder holds no chapter card yet — every scene is its own card in the
scene folder, because drafts and alternates are STACKS and stacks live at card grain (§6): a
scene-as-card can carry takes, be cycled, promoted, split, without dragging the rest of the
chapter through every alternate. **Finalized:** ALL of the chapter's scenes final → they merge
into the chapter card, each scene a page in reading order, and the scene folder's **Compile
flips to N** and the folder is KEPT (§6b) — the drafting history stays readable in the app and
invisible in the shipped export. A book mid-draft legitimately holds both: merged chapters behind
you, scene folders still drafting ahead.

---

## 3. THE NEIGHBOURS LAW — this is what holds reading order

Verbatim from `lib/cards.js:6`:

> NEIGHBOURS (moveCard/reorderPage/reorderSection): beforeId = land immediately BEFORE that sibling,
> afterId = immediately AFTER it. Neither = append.

One law, three rungs — cards in a folder, pages in a card, sections in a card. Reading order is a
`sortKey` between neighbours, so an insertion never renumbers the rest of the book.

```js
await CARDS.moveCard(api, bookId, cardId, { beforeId, afterId, folderId }); // folderId re-files it
await CARDS.reorderPage(api, bookId, pageId, { beforeId, afterId });        // within its card
await CARDS.reorderSection(api, bookId, sectionId, { beforeId, afterId });  // within its card
```

**`createCard` and `createFolder` take no neighbours** — a create APPENDS to its folder's tail
(`planCard`); create in reading order, or place it after with `moveCard`. `createPage`/
`createSection` DO take `beforeId`/`afterId` at create time, same law. And **moving a tile moves the
whole stack** (`cards.js:1493`): drafts share the tile's folder and sort key, so re-ordering never
scatters a chapter's takes.

---

## 4. ARCS ARE FOLDERS

`CARDS.createFolder(api, bookId, { name, folderId })` — `folderId` is the PARENT (omit it: book
root). `CARDS.moveFolder(api, bookId, folderId, { folderId: newParent, beforeId, afterId })`
re-parents under the same law, so a Part Three that turns out to be a coda of Part Two becomes its
child without touching one card. Nesting is real, with two refusals — never silent truncations:
depth 32, 500 folders per book. Reads: `folderTree`, `folderPath`, `listFolders`, `listFolder`.

---

## 5. SCENES ARE PAGES, BEATS ARE SECTIONS

```js
const pageId = await CARDS.createPage(api, bookId, cardId, { title, beforeId, afterId });
await CARDS.setPageContent(api, bookId, pageId, prose);   // also: listPages, getPage, deletePage
const secId  = await CARDS.createSection(api, bookId, cardId, { name, lineLimit, beforeId, afterId });
await CARDS.setSectionContent(api, bookId, secId, text);  // renameSection, deleteSection alongside
```

- **Pages are the prose.** Load `worldwright-paper`: actual-format width, then all zone limits,
  before every write and again on saved rows. Use `createPage(...,{afterId:<previous-page>})`
  for overflow. Whole words and paragraphs move; nothing is cut, hidden, shrunk or silently resized.
  `PL.zoneFit` counts weighted source lines, so width needs a separate check; no fixed character wrap.
- **Sections are beats — the margin, not the prose.** What the beat is for, whose turn it is, what
  must land by the last line, the creator's own words quoted. A section carries a `name` (the UI's
  title) and a `lineLimit`; past the cap `setSectionContent` **refuses and reports**, never
  truncates. The SPACE LAW holds: a few short lines. A beat wanting paragraphs is prose — page it.

---

## 6. STACKS ARE DRAFTS — the take that ships

Verbatim from `lib/cards.js:5`:

> stackId is the PRIMARY card's id; the TOP card is stackOrder's FIRST entry, NOT necessarily the
> primary. setStackPrimary is the only operation that rewrites references.

Two different ideas: **primary** is the identity every reference in the book points at; **top** is
whichever take is face-up on the tile right now.

```js
// standalone → mints a blank second take, original stays primary (no reference moves);
// already a stack → duplicates the whole stack.
const stackId = await CARDS.createStackFrom(api, bookId, cardId);
const members = await CARDS.listStack(api, bookId, stackId);     // stackOrder ascending: [0] is TOP
await CARDS.cycleStack(api, bookId, stackId, "left" | "right");  // riffle the takes
await CARDS.setStackPrimary(api, bookId, stackId, winnerId);     // → { stackId: winnerId, references }
await CARDS.splitFromStack(api, bookId, memberId);               // a take that became its own chapter
```

**In the UI a press-and-hold opens a stack** (`app-shell.js:3158`) — the edit window belongs to a
single card. Promote a take and every `#[id]` in the book follows it; the stack's id becomes the
winner's id.

**While drafting (§2's lifecycle), the stack's card is the SCENE** — takes of a scene ride its
tile, and moving the scene moves them all. After the merge a chapter card can still stack (a
whole-chapter rewrite), but the per-scene alternates were the point of drafting at scene grain.

---

## 6b. THE MERGE — a finished chapter's scenes become the chapter card

When every scene card in the chapter's scene folder reads `status: final` (`setMeta` writes it,
`statusCounts` is the progress read), merge — per chapter, all scenes, ONE pass:

1. **Save a document export first** (§8) — a merge is a re-arc. An export is a document copy, not a full database backup.
2. **Settle the stacks.** A scene still carrying takes merges its PRIMARY: `setStackPrimary` the
   winner first, so the take that ships is the take that merges.
3. **Mint the chapter card in the CHAPTER folder** — beside the scene folder, never inside it.
4. **Flow the prose.** Walk the scene cards in reading order; each scene's pages become the chapter
   card's pages (`createPage` with the scene's title, `setPageContent`), measured page by page —
   THE PAGE LAW (§5) applies at the destination, not just the source. Beats still worth keeping
   ride along as sections; most drafting beats die here, finished prose has absorbed them.
5. **NOTHING IS TRASHED.** His ruling, verbatim: *"no do not trash. mark them as do not export...
   scene cards can be kept, with the scene folder skipped from export."* The switch is **Compile**
   — his definition, verbatim: *"compile y/n is for determining if the book/folder/card should
   show up for export"* — one switch at all three grains (books have carried it from the start;
   folders and cards mirror it). Flip the scene folder's Compile to N —
   `CARDS.setFolderCompile(api, bookId, sceneFolderId, false)` (`lib/cards.js`; the folder's
   metadata carries the same Compile Y/N the book's does, and `setCardCompile` excludes one card
   the same way) — and every whole-book export prunes that subtree while the app keeps it
   readable. Refs are safe as-is: the scene cards stay live, so
   `#[sceneId]` still resolves; re-aim a ref to the chapter card (`applyReplacements`) only when
   it should follow the shipped prose.

**Compaction is the ONLY trash lane, and it is guarded.** Verbatim: *"Only trash scene cards when
compacting and there is a chapter card in the folder containing the scene folder w/cards."* A
compaction pass may `trashCard` scene cards (then `trashFolder` the emptied scene folder) ONLY
when the chapter folder above that scene folder holds the chapter card. No chapter card, no
trash — the scenes ARE the chapter until the merge has landed.

---

## 7. CONTINUITY — Cast, Places, and who appears where

Keep a **Cast** folder and a **Places** folder beside the arcs, one **primary** card per person and
per place. Scenes name them inline: `#[<cardId>]` in page or section text resolves to the card's live
name, so a rename can never break the prose. Never paste another card's paragraph in — reference it.

- `REFS.backlinks(api, { projectId, bookId, cardId, primaryId })` answers *where does this character
  appear* — `{ sameBook, crossBook }`, plus `viaStack` when a member was passed.
- **Refs point at the stack PRIMARY, never the top card** (`lib/refs.js:954`): when the card in hand
  is a stack member, pass `primaryId: card.stackId` or the answer is a half-truth.
- `REFS.loadMap`, `REFS.referencedIds` (pass **all** of a card's text at once) — full surface in
  `worldwright-cards` §3.

---

## 8. REVISION

- **Word counts ride `card_stats`, one row per card**, written by the same `reindex()` pass that
  mirrors FTS — badge and footer cannot disagree. `CARDS.bookStats(api, bookId)` → `{ cards, pages,
  words, statusCounts }` is the footer roll-up in aggregate reads, never one query per card;
  `CARDS.recountWords` re-walks the book when the counting rule itself changes.
- **Find & Replace is the sweep pass**: `CARDS.applyReplacements(api, bookId, edits)` — many targets
  (pages, sections, summaries, card names), ONE undoable change-log row. Renaming a character across
  a manuscript is this verb, not fifty writes.
- **Before a major rewrite, export a document copy.** Native book snapshots are retired. An export
  is not a full database backup; ordinary saves, Undo/Redo and Trash remain. Draft state rides `CARDS.setMeta(api, bookId, cardId,
  { status, summary })`; `statusCounts` makes it a progress read of the whole manuscript.

---

## 9. ONE PASS, END TO END

The hierarchy of §2, drafted at scene grain, then one chapter merged. The verbs never change —
only which rung they aim at.

```js
const CARDS = require("lib/cards.js");
const REFS  = require("lib/refs.js");
const PL    = require("lib/pagelayout.js");
const CFG   = require("lib/config.js");
await CARDS.ensureBook(api, bookId);

// --- the arcs: folders at book root, created in reading order (a create appends) ---------------
const arcs = [];
for (const name of ["Part One — The Salt Road", "Part Two — The Drowned Court", "Part Three — Ash"]) {
  arcs.push(await CARDS.createFolder(api, bookId, { name }));
}
await CARDS.moveFolder(api, bookId, arcs[2], { folderId: arcs[1] });  // Part Three reads as a coda
// --- continuity: a Cast folder, one primary card per person ------------------------------------
const cast = await CARDS.createFolder(api, bookId, { name: "Cast" });
const wren = await CARDS.createCard(api, bookId, { name: "Wren Calloway", folderId: cast });
// --- chapter FOLDERS in reading order inside arc one, each with its scene folder ---------------
const chf1 = await CARDS.createFolder(api, bookId, { name: "1 · Low Tide",      folderId: arcs[0] });
const chf2 = await CARDS.createFolder(api, bookId, { name: "2 · Salt and Iron", folderId: arcs[0] });
const scenes2 = await CARDS.createFolder(api, bookId, { name: "Scenes", folderId: chf2 });
// --- the scenes: one CARD per scene, in reading order, inside the scene folder -----------------
const sc1 = await CARDS.createCard(api, bookId, { name: "The forge at dusk",  folderId: scenes2 });
const sc2 = await CARDS.createCard(api, bookId, { name: "Salt on the stairs", folderId: scenes2 });
// --- the scene's prose: a page on the SCENE card, MEASURED before written (THE PAGE LAW) -------
const cfg   = await CFG.getBook(api, bookId);
const spec  = cfg && cfg.pageSpec && typeof cfg.pageSpec === "object" ? cfg.pageSpec : PL.DEFAULT_SPEC;
const p1    = await CARDS.createPage(api, bookId, sc1, { title: "The forge at dusk" });
const prose = [
  "#[" + wren + "] came up the seawall with the tide already at her heels, and the",
  "forge light showed her the one thing she came to be sure of: the door stood open.",
].join("\n");
if (PL.zoneFit(prose, spec, "body").ok) await CARDS.setPageContent(api, bookId, p1, prose);
// else: split at a paragraph seam, flow the rest onto createPage(..., { afterId: p1 })
// --- beats ride the scene card while drafting ---------------------------------------------------
const beatA = await CARDS.createSection(api, bookId, sc1, { name: "Beat — she lies about the knife", lineLimit: 4 });
await CARDS.setSectionContent(api, bookId, beatA, "Turn: the lie is cheap and she knows it.");
// --- alternates: a second take of scene one — the point of drafting at scene grain (§6) --------
const stackId = await CARDS.createStackFrom(api, bookId, sc1);   // === sc1: original stays primary
const members = await CARDS.listStack(api, bookId, stackId);     // members[0] is the TOP card
const take2   = (members.find((m) => m.id !== sc1) || {}).id;
await CARDS.renameCard(api, bookId, take2, "The forge at dusk (take 2)");
// …write take two…  then promote it — the ONLY op that moves the references:
await CARDS.setStackPrimary(api, bookId, stackId, take2);        // → { stackId: take2, references }
// --- THE MERGE (§6b): every scene final → the chapter card, nothing trashed --------------------
await CARDS.setMeta(api, bookId, take2, { status: "final" });
await CARDS.setMeta(api, bookId, sc2,   { status: "final" });
const ch2 = await CARDS.createCard(api, bookId, { name: "2 · Salt and Iron", folderId: chf2 });
// walk scene cards in reading order; each scene's pages flow onto ch2 (measured, PAGE LAW)…
await CARDS.setFolderCompile(api, bookId, scenes2, false); // Compile N: folder KEPT, out of the export
// --- where does Wren appear? -------------------------------------------------------------------
const appearances = await REFS.backlinks(api, { projectId, bookId, cardId: wren, primaryId: wren });
// a stack member asks with primaryId: card.stackId — refs live on the primary, never the top card
```