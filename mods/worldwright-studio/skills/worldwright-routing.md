---
name: worldwright-routing
description: "The governing law for any game with Worldwright Studio installed — the reading order before anything is built (Codex → Research → the card the ask names), then who may write at all (the allow list; god mode is not access; the game's creator can never be locked out), then every ask the creator makes gets FILED as a card before it gets built. Which book, which FOLDER (the filing law — the author's defined folders, never the book root), new card or edit, THE CODEX WRITE LANE (the Codex book is read-only in the app — CARDS.authoring(true)/(false) is Savi's own lift), THE GRAIN for Codex entries (concept folders and independently maintainable part cards), and the standing laws (primaries only; the database is a cost; notes go in the Codex, not in script comments). Load this first, on every ask, not just build asks."
---

## Physical paper — shared contract

Load `worldwright-paper` before any page write. NEVER exceed a zone's line capacity; ALWAYS paginate overflow. Measure the chosen format's actual width and all bands before and after writing. Preserve explicit formats, whole content and page identities; never silently resize paper. `worldwright-piano-roll` owns score editing and continuous visible-page loading. This reminder delegates the complete fitting recipe to the shared contract.


# Worldwright Studio routing — hear it, file it, build it

This game has **Worldwright Studio** installed: a writing/design notebook that lives in the
creator's god-mode rail. It holds books → folders → cards → pages → sections → references, and it
persists in this game's own SQL tables. It is not decoration. It is where the creator's intent is
written down, and it is where your next build is supposed to come FROM.

---

## THE READING ORDER — before anything is built

The creator's ask, verbatim (2026-08-26):

> "Reference Codex, then research, then the appropriate player book/folder/card. Fill out and
> follow the Codex, the trim/cleanup the codex after each pass/phase."

That is the order of authority, and it is not per-feature — it is how EVERY build ask is served.
Reads are never fenced (see the gate below), so this order runs first, whoever asked.

**First — the Codex.** The build document: the pinned book **`CODEX0000BOOK`**, named *Codex*, always
present in this install (see the current registry in `lib/pinned.js`). Read it, find
the phase the ask lives in, and let its Invariants and its open questions constrain what you are
about to do. The Codex outranks memory and outranks your own recall of past sessions — it IS this
game's truth on design intent. (A separate `codex` mod, if this game also has one, is its own
document with its own directive — `use_skill({ skills: ["codex#codex"] })`. It does not replace the
Codex book.)

**Second — Research.** Load `worldwright-research-walk` and do the walk: the pinned Research book
(`RESEARCH0BOOK`), the `#[...]` reference map, the governing folders for the kind of thing being
built. The walk's laws hold in full — primaries only, batch the database, reads are never fenced.

**Third — the source.** The player book / folder / card the ask actually names. It is read LAST on
purpose: by the time you open it, the Codex has told you what the game intends and Research has told
you what the world permits — so one card can never send the build against the world's rules.

**Fill out and follow the Codex while the build runs.** Decisions made mid-build land in the phase
they belong to; creator input arriving mid-phase is FILED into its phase, not chased; a discovered
gap becomes an open question on the card it belongs to, never a silent guess. Writing into the Codex
goes through the write lane in §1b — the book refuses ordinary writes by design.

**Trim when a pass or phase closes.** Strike checklist rows that shipped and bug rows that closed,
collapse notes a later decision superseded, and fold an answered question into the tab that owns it.
The stamps, the compaction order, and what may never be compacted away are §4b.

---

## FIRST — WHO MAY WRITE

Opening a creator tab is not permission to edit someone else's books. God mode, editor/admin rights and hosting a room do not establish ownership. The game's verified owner can never be denied access to this tool, including by themselves.

### a) Verify ownership, not a label

Read `lib/game-owner.js` and `worldwright-maintenance`. The host's platform record supplies its owner; the game link finds that record when needed. The host-owned `scripts/lib/data/worldwright-owner.json` binds the verified account to **this world's id**. Match the asker's trusted durable actor id, never a typed name or `isEditor()` flag. An owner record copied from another world is invalid. Missing proof is something to resolve, not a reason to invent ownership.

The owner has implicit read/write access on every WWS shelf before any ACL query. Old deny rows and removed allow rows do not change that. Own-shelf access is also implicit. Neither privilege requires a grant row.

### b) Everybody else follows the lists

The shelf belongs to its author, not the room. `lib/shelfaccess.js` owns its allow/deny lists and read grants. Usernames are normalized by `cleanName`. `tryShelf(api, ownerId, offeredKey, who)` is an **open/read** verdict, never proof of permission to write. Its precedence is own shelf → verified game owner → deny → existing read grant → allow → legacy mode/key. Denial revokes an ordinary caller's grant. Codes are retired; `ownerOfKey` returns an empty string without reading a retired key table.

`lib/writefence.js` is the write verdict: own shelf or verified game owner; otherwise a deny refuses, an allow permits, and unlisted means read-only. **An existing read grant is not an allow-list entry.** The result is cached per seat and refreshed at access changes, not queried per card write.

The Co-op panel edits the viewer's own shelf. It shows Who's here, Allow list and Deny list. No invite codes, access mode or session gate. Owner rows say always allowed and offer no deny control. `SHELF.denialReason`, `addName` and `revoke` enforce protection behind both typed input and roster actions; hiding controls is insufficient. Removing a redundant allow entry never revokes ownership.

### c) Savi's writing on behalf of an asker

1. Verify the actual asker from trusted conversation/player identity.
2. If the asker owns this game or the target shelf, they may write.
3. Otherwise read the target shelf's deny and allow lists; deny wins, allow is required. Do not substitute Savi's editor status or a read grant for the asker's permission.
4. If writing is not allowed, explain that the shelf owner can add them through Co-op → Allow list. Reading/quoting accessible material, following references and answering questions remain possible; do not silently edit on their behalf.

The Codex authoring lift later in this skill is for approved authoring, not an access bypass. Verify this gate **before** enabling it, and always release the lift in `finally`.

---

The creator's standing instruction, verbatim:

> "All work you do should first route through storybuilder. So when the user describes something
> they want, you should write it in the appropriate book and either its own new card or edit an
> existing card if the feature was already defined."

**The order is: hear it → file it → build it.** Not build-then-document. The card is written from
the creator's description BEFORE your hands go in, because the card is what the build is built
from. A doc written afterward is a summary; a card written first is a source. This is what keeps
the game and the doc from drifting, and it is what lets a fresh Savi months from now start from the
same page the creator actually spoke.

This fires on **every** ask, not only building asks. A lore aside, a rename, "make the fog bluer",
a bug report that reveals an unstated rule — all of it lands somewhere in Worldwright Studio first. Filing
is cheap and takes one batched pass (see THE DATABASE IS A COST below). A lost intent is not cheap.

---

## 0. The five-second version

1. Someone describes something.
2. **May they write?** Allow list, or this game's creator — the FIRST section above. No → do not
   write: say the refusal sentence, name who can grant it, offer the reads, stop here. Yes → on.
3. **Search** Worldwright Studio for it — is this feature/place/character already defined?
4. In the Codex, reuse/create the concept folder beneath its governing category, then locate
   each independently maintainable part card (`worldwright-codex`). Existing-part edits or
   alternatives follow §3; a new part is a new primary card, not an alternate or an appended
   subsystem in the old card. Never file loose at the book root (§2).
5. Write it as sections + pages (see the `worldwright-cards` skill for the split).
6. Writing into the **Codex** book? It refuses ordinary writes by design — take the write lane in
   §1b (`CARDS.authoring(true)` … `authoring(false)` in a `finally`).
7. *Then* build, reading Research first (see the `worldwright-research-walk` skill).
8. Tell the creator, in one line, which card you filed it under.

---

## 0b. THE CODE IS NOT THE NOTEBOOK — write fewer comments, file the notes

The creator's ruling, verbatim (2026-08-25):

> "The Worldwright Studio skills should direct you to write less comments in scripts, in favour of
> writing comments/notes in the appropriate section of the Codex."

A script is instructions to a machine. The reasoning behind it — why this shape, whose ruling, what
was tried and refused, the bug it closes, the law it enforces — belongs in the Codex, in the tab or
phase card that owns that feature, where the creator can read it, edit it and search it. A header
essay in a script is a note filed where only you will ever find it.

**In scripts, write:**

- nothing where the code already says it (`// bump the version` over `REALM_V = 5` is noise),
- one short line where a reader would otherwise get it WRONG — a non-obvious order, a deliberate
  looking-wrong value, a trap ("`readonly`, not `disabled` — disabled greys the text out"),
- one line naming the Codex card when the why is long: `// why: Codex ▸ Phase 2 ▸ the leave guard`.

**In the Codex, write:** the ruling in his words, the mechanism, the failure it fixes, the receipts.
Rulings and decisions go in the phase/tab card; a bug's symptom and the fix that held goes with it.

Prose already in the scripts is not a cleanup project of its own — thin it as you touch a file, and
carry anything worth keeping into the Codex on the way past.

---

## 1. The modules and constants you need (nothing here is guessable — use these names)

Worldwright Studio is a MOD. Its own files require each other as `lib/…`; **from anywhere else in the
installing game — your own script, or a `run_script` — the same module is
`mods/worldwright-studio/lib/…`** (the engine's require only accepts `builtin/*`, `lib/*`, and
`mods/*/lib/*`; a bare `lib/cards.js` from outside the mod resolves to the game's own `scripts/lib/`
and is not found).

```js
const CARDS    = require("mods/worldwright-studio/lib/cards.js");     // THE REPOSITORY — every card/folder/page/section/tag WRITE
const GRAPH    = require("mods/worldwright-studio/lib/graph.js");     // the read path: one seat's book — skeleton held, bodies per card
const REFS     = require("mods/worldwright-studio/lib/refs.js");      // #[...] reference tokens, the id→name map, backlinks
const PIN      = require("mods/worldwright-studio/lib/pinned.js");    // the registry of PINNED (always-present) books
const RESEARCH = require("mods/worldwright-studio/lib/research.js");  // the lane for pinned books: seed, folderIdNamed
const LIB      = require("mods/worldwright-studio/lib/library.js");   // the shelf: the author's own books
```

Constants that are real and fixed:

- **`CODEX0000BOOK`** — the book id of the pinned **Codex** book, the build document. It is
  **locked** (`lib/data/codex-book.yml` → `"locked": true`): read-only to every seat in the app,
  and written through §1b.
- **`RESEARCH0BOOK`** — the book id of the pinned **Research** book. Also `PIN.ID`, and
  `require("mods/worldwright-studio/lib/ids.js").SENTINELS.RESEARCH`. Its name and its 14 seeded root
  folders come from `lib/data/research-book.yml`: *Timeline, Characters, Items, Locations, Factions,
  Languages, History, Mythology, Religion, Flora, Fauna, Themes, Concepts, External References.*
- **`PIN.ids()`** → every pinned book id in this install; **`PIN.all()`** → `[{ id, name, folders,
  locked }]`; `PIN.isPinned(id)`, `PIN.bookOf(id)`, `PIN.folders(id)`, `PIN.isLocked(id)`. The
  registry contains Codex, Research, Sound Studio (`0MUSIC00BOOK0`) and Asset Studio
  (`ASSET00STUDIO`), in that order. Sound Studio and Asset Studio use project navigation.
  Read the registry instead of maintaining a second list.
- **`RESEARCH.seed(api, bookId)`** ensures a pinned book's folders exist (idempotent, latched, and it
  does its own fence lift); **`RESEARCH.folderIdNamed(api, bookId, name)`** answers a pinned book's
  folder id by name, or `null` when the seed has not landed — never invent a folder id.
- A **top-level card's `folderId` is the book id itself** (`folderId = bookId` is the root parent).
- Card name uniqueness is `(folderId, name)`; a collision silently takes a ` (2)`, ` (3)`… suffix.

Never hand-write SQL against these tables; the app's own "digest law" means only statements living
literally in saved scripts may run — which is exactly why every write goes through `lib/cards.js`.

---

## 1b. THE CODEX WRITE LANE — the book is read-only in the app, and yours to write

His ruling, verbatim: **"Codex is locked readonly for users. Savi (you) can still put cards into the
codex."**

So the Codex book refuses every in-app write BY DESIGN. `lib/cards.js` wraps its whole write surface
(`LOCKED_VERBS` — every create/rename/set/move/trash verb for cards, pages, sections, tags and
folders) and a write aimed at a locked book throws, in these words:

> the Codex book is read-only — it is written for you, not in the app

**That throw is not a permanent refusal and it is not a bug.** The sanctioned lift is
`CARDS.authoring(true)` before your writes and `CARDS.authoring(false)` after — Savi's own code path;
the app never calls it, so no author's seat can ever be inside one. It lifts both fences at once: the
locked-book fence and the shelf write fence. It is a COUNTER, so every `true` needs exactly one
`false`, and the `false` belongs in a `finally` — a throw mid-pass must never leave the flag up.

One worked example for a NEW part after the folder/card search and paper preflight. Every verb
is a real export. This demonstrates structure and cleanup, not host-history acceptance: the
reported callerless host journal failure must be resolved before using it as a host write recipe.
The authoring lift does not create an authenticated player context; read back failures as well
as successes, because content and history may have diverged.


```js
const CARDS    = require("mods/worldwright-studio/lib/cards.js");
const RESEARCH = require("mods/worldwright-studio/lib/research.js");
const CODEX    = "CODEX0000BOOK";

await RESEARCH.seed(api, CODEX);                                   // folders exist; idempotent
const categoryId = await RESEARCH.folderIdNamed(api, CODEX, "Features");
if (!categoryId) throw Error("Codex Features folder is not ready; no card written");
const folders = await CARDS.listFolders(api, CODEX, categoryId);
const concept = folders.find(f => f.name === "Harbour Gate");

CARDS.authoring(true);
try {
  CARDS.holdIndex();
  try {
    const folderId = concept ? concept.id : await CARDS.createFolder(api, CODEX, {
      name: "Harbour Gate", folderId: categoryId
    });
    const cardId = await CARDS.createCard(api, CODEX, { name: "Opening and closing", folderId });
    await CARDS.setMeta(api, CODEX, cardId, { summary: "The gate's operating rules; other parts own its siege and sound design." });
    const secId = await CARDS.createSection(api, CODEX, cardId, { name: "Intent" });
    await CARDS.setSectionContent(api, CODEX, secId, "…the creator's actual instruction, attributed…");
    const pageId = await CARDS.createPage(api, CODEX, cardId, { title: "Spec" });
    await CARDS.setPageContent(api, CODEX, pageId, "…preflighted against this book's actual paper…");
  } finally {
    await CARDS.flushIndex(api);
  }
} finally {
  CARDS.authoring(false); // release even when holding or flushing the index fails
}
```

Three things that keep this honest:

- **Lift for the pass, not for the session.** Open it immediately before the writes, close it in the
  `finally`. Nothing else runs inside that window.
- **The lift is not a licence.** The allow-list gate above still decides whether this ask should be
  written at all; `authoring()` answers "may this book take a write", never "should I make it".
- **Reads never needed it.** `getCard`, `listFolder`, `listFolders`, `search`, `allCards` and the
  rest are not wrapped — opening, reading and searching the Codex works with no lift at all.

---

## 2. The routing decision — which book

Route by **KIND, not by subject.** The same castle legitimately has a card on both sides, and that
is correct, not duplication — link them with a reference (§4).

| The creator described… | It goes in |
|---|---|
| A feature, a system, UI, HUD, SFX, VFX, level design (shape, flow, blockout, dimensions, spawn points, encounter beats, sightlines, what connects to what), an invariant, a build phase | **The Codex** (`CODEX0000BOOK`, the build doc — written through §1b) |
| Lore, history, a character, an NPC, a faction, a place **as felt** — its mood, who lives there, what happened there, what it smells like | **The author's own story books** (the shelf) |
| A standing rule of the world that other cards must obey — how magic works, how the calendar works, what a given species can and cannot do, reference material | **Research** (`RESEARCH0BOOK`), in the governing root folder |

**Specialist documents:** editable scores, arrangements, SFX and instruments belong in Sound
Studio (`0MUSIC00BOOK0`); editable models, poses/animations, textures/materials, paths, effects,
object sets and level layouts belong in Asset Studio (`ASSET00STUDIO`). Both use Projects →
Types → Files; Sound Studio's root Custom Instruments folder is not a project. Research is not
storage for these files. The Codex specifies requirements and links to the specialist document,
rather than copying its source into a design card. Preserve the chosen editor and native format.
This distinction is not permission to move existing cards or create projects during a guide pass.

The creator drew the level-design line himself:

> "keep level design in the codex since that pertains to more technical things beyond descriptions
> of the scenery."

So: **the Codex holds what gets BUILT; the story books hold what gets FELT; Research holds what
GOVERNS.** When an ask straddles two, file both halves and reference each from the other — the
Level Design card for shape, the story card for feeling.

**Where inside the book? THE FILING LAW — the folders are not scenery.** The creator's complaint,
verbatim (2026-08-26, after reading another install's work): *"Other you did not use any of the
folders I so generously defined for you."* He defined them to be USED, and a card dumped at the
book root is a filing error, full stop:

1. **`CARDS.listFolders(api, bookId)` FIRST**, every time — file into the deepest existing folder
   that governs the kind, matched by name against what is actually there. (`listFolders` takes an
   optional third argument, the parent folder id, for walking deeper than the root.)
2. In **Research** the roots are the 14 seeded above, and inside a root the tree is **scope first,
   then subject** (his ruling): book-specific information under a per-book subfolder, global in the
   root's own tree; then a subfolder per subject on the root's own axis — History by historical
   body (a faction, a planet), Fauna by region — the full model is `worldwright-research-walk`
   §5.
3. In the **Codex** the seeded folders are exactly these ten (`lib/data/codex-book.yml`):
   **Overview, Features, Level Design, UI, SFX, VFX, Invariants, Build Order, Phases, Notes.**
   A concept folder nests beneath its governing category (Features, Invariants, Level Design,
   Phases, etc.); independently maintained part cards live inside it. A phase overview links its
   parts instead of copying their specifications — never loose at the root. There is no *Open Questions* folder:
   he cut it from the seed (2026-08-27), and a question about a card rides THAT card
   (`openQuestion: true` + an OpenQ section, per `worldwright-cards` §1). An install seeded
   before 1.2.0 may still show the old folder — treat it as dead, never file into it.
4. In the **author's own books**, put it where its siblings already live — never invent a new
   folder when a fitting one exists, and never mint a new ROOT folder without the author's word.

The long form, with the Research govern-table, is `worldwright-research-walk` §5.

---

## 3. Find the concept folder, then the part — search before creating

The 2026-09-17 creator correction is governed by `worldwright-codex`: a whole concept is a
folder, not an ever-growing card. Its distinct responsibilities are ordinary primary cards
within that folder; large parts subdivide into nested folders and smaller part cards. The old
“one feature per card” wording must not override this finer grain. An optional Overview links
parts rather than duplicating their source. Pages continue ONE part, not the whole subject.

Find the concept and the exact part before judging a search hit. An Overview mentioning a
part is not a duplicate detailed specification. Reuse existing folders/IDs; new semantic parts
need their own primary cards. A different version of the same part is what stacks are for.
Preserve the creator's existing-card update/alternative choice below. Deliberate subdivision
uses the identity-preserving migration checklist in `worldwright-codex`; do not silently rewrite
existing manuscripts, native documents or other worlds' books.

```js
// One search, whole book, straight to FTS (search is deliberately NOT cached).
const hits = await CARDS.search(api, bookId, "harbour gate");
// Or across several books at once — still one lane, not one call per book:
const wide = await CARDS.searchBooks(api, [bookIdA, bookIdB, "RESEARCH0BOOK"], "harbour gate");
```

Then apply **PRIMARIES ONLY** (§5) to the hits before you judge whether the thing already exists.

- **A hit that is a primary card about this same thing → ASK, THEN WRITE. Never decide this one
  yourself.** His law, verbatim (2026-08-25): *"if a card exists for an ask, you should ask the user
  if they want the existing card updated, or create a new card in the existing card's stack and have
  the new details be added to it as an alternative."*

  One line, before any write: *"<Card> already covers this — update it, or keep it and add this as
  an alternative in its stack?"* Then:

  - **Update it** — append a section for the new constraint, or extend the page. The card keeps its
    identity, and every existing `#[...]` reference in the other cards still points at its id.
  - **Alternative** — `CARDS.createStackFrom(api, bookId, cardId)` mints a fresh card **inside that
    card's stack** and the ORIGINAL STAYS PRIMARY, so not one reference moves; write the new details
    into that new member, and name it for what makes it different. (Already a stack? The same call
    duplicates the whole stack. To place a copy you already made into a stack, `duplicateCard` takes
    `{ stackId }`.) Say which member you wrote and that the old one is still the one canon reads —
    `setStackPrimary` is the only call that ever changes that, and it is HIS to ask for.

  The ask is cheap and the recovery is not: an overwritten paragraph is gone, and a wrong primary
  quietly rewrites every reference in the book. If he does not answer, the safe default is the
  alternative — it destroys nothing.
- **No matching part → create its primary card**, in the concept folder beneath the governing
  category. If the ask contains several parts, plan all their cards first, not one umbrella card.
- **A hit that is a near-miss** (a different feature that merely mentions the words) → new card,
  and add a reference between the two.

Never resolve an ambiguity by creating a duplicate "v2" card. If you truly cannot tell whether two
things are one feature, mark the card `openQuestion: true` with an OpenQ section and ask the creator.

---

## 4. Filing the ask (the shape of one routed write)

Mechanics belong to the `worldwright-cards` skill; the one-paragraph version:

- **Sections are author notes** — intent, constraints, open decisions, why it is this way, what was
  tried and rejected, and **the creator's own words, quoted**.
- **Pages are the content itself** — the description, the scene, the shootable cinematic.
- **Reference, never repeat.** A card that mentions another card carries the stored token
  `#[<thatCardId>]` in its text. `lib/refs.js` resolves the token to that card's current name at
  render time, so renaming a card can never break a link — references point at IDs.
- Do the whole card in **one batched pass** (§6) — and if the book is the Codex, inside the
  authoring window (§1b).

Then say it out loud to the creator in one line: *"Filed under <Book> › <Folder> › <Card>."* That
sentence is how they check your routing without opening the panel.

---

## 4b. STAMP EVERY QUESTION AND NOTE, AND COMPACT THEM AS YOU GO

The creator's ask, 2026-08-25: *"modify the story builder skills to periodically compact the notes,
open questions, and codex entries; and to mark each open question and note with a phase and
number."* Both halves are law in the Codex book and in every Codex build document.

### The stamp

Every **Open Question**, every **Note**, and every entry inside a phase (steps, bugs, notes) opens
with a stamp, before any other text:

```
[P4·2] When a shelf changes hands, what preserves card references?
```

- `P<n>` is the **phase number off the build-order rail** the entry belongs to — the phase whose work
  the answer changes. An entry that belongs to no phase yet is `[P?·n]`, and finding its phase is
  part of answering it.
- `·<n>` is a **running number inside that phase**, never reused. The next number is one past the
  highest stamp already carrying that phase, even if that entry was compacted away — numbers are
  addresses, not a count.
- Say the stamp out loud when you file or answer: *"Filed as [P4·2]."* / *"[P4·2] is settled."* That
  is how the creator points at one line without quoting it back.

A stamp is never rewritten when a phase gets renamed or reordered; it records where the question was
born. If a ruling moves the work to another phase, add the new one — `[P4·2 → P8]` — and leave the
original.

### The compaction

Questions and notes accumulate faster than they resolve, and a tab nobody can read is a tab nobody
checks. So **compact at every phase boundary**, and any time one tab passes roughly a dozen live
entries:

1. **A resolved question is not a question.** Once ruled, its answer belongs in the thing it
   produced — an Invariant, a feature card, a build-order step. Move it there, then delete the
   question. Keep only the stamp and the one-line ruling as a trailing line on whatever it produced,
   so the address still resolves.
2. **A note that has become true of the code is history, not a note.** Fold it into the feature card
   or the invariant that now says it, and delete it.
3. **Merge duplicates into the oldest stamp.** Two entries about one thing become one entry under
   the lower number, with both quotes kept.
4. **Never compact away the creator's own words.** A verbatim quote and its timestamp survive every
   pass — move it, shorten around it, never paraphrase it. If a compaction would lose a quote, the
   quote gets its own Notes entry instead.
5. **Never compact an open question.** Unanswered is exactly what the tab is for.

Compaction is a write, so it obeys §6 (and §1b, in the Codex): bounded passes by owning part
card, not one oversized phase/tab payload or a call per keystroke. Keep the phase overview
small; a growing part splits by responsibility, not by discarding unresolved work. And say what you did in one line — *"Open Questions compacted: 9 → 4, three folded into
Invariants."*

---

## 5. LAW ONE — PRIMARIES ONLY

Cards can be **stacked**: an author keeps drafts and alternates of the same card together in one
pile. Only the **primary** card of a stack ever counts — for reference checks, for building scenes,
worlds, locations and characters, for export, for everything you do.

**The predicate is exact and cheap:**

```js
const isPrimary = (card) => card.id === card.stackId;   // no join, no extra query
```

`lib/cards.js` states it outright: *"stackId = the PRIMARY card's id, a standalone card its own
stack of one."* A standalone card is therefore always primary, and the filter costs nothing.

**The trap:** the **TOP** card is `stackOrder`'s first entry and is **NOT necessarily the primary**.
Cycling a stack changes what the tile DRAWS — its name, summary, status, vitals — and changes
nothing about what a reference resolves to. `setStackPrimary` is the only operation in the whole
repository that rewrites references or changes a stack id; everything else leaves stored `#[...]`
tokens exactly where they are.

So every walk you do filters to primaries:

```js
const cards = (await CARDS.allCards(api, bookId)).filter((c) => c.id === c.stackId);
```

A reader that walks all stack members is treating the author's drafts and alternates as canon —
which is precisely what a stack exists to prevent.

**This law's home is here.** `worldwright-cards` and `worldwright-research-walk` point at this
section; they do not restate it.

## 6. LAW TWO — THE DATABASE IS A COST

The creator's standing law in every game he builds:

> "database calls should be minimized. Better to send in batches. Personally I would prefer to
> avoid db calls unless necessary."

In practice, here:

- **Reads go through `lib/graph.js`** — one seat's book, held in memory, every read a copy. The
  **skeleton** (every folder, card, tag, name and page *title*) arrives in one parallel gulp when
  the book opens; page and section **bodies** load **per card, on first read**, and stay warm for
  the session. So: a folder open on a warm book costs **no** SQL — `listFolder` / `listFolders` and
  the counts are arithmetic — and a card's first `listPages` / `listSections` costs **one paired
  fetch**, free every time after.
- **Bulk work takes the bulk verbs.** `allPages` / `allSections` pull every body in **one** pass;
  `listPages` looped over N cards is N fetches for the same answer. Export, mirrors, audits and any
  whole-book walk go through the whole-book verbs — never a per-card loop.
- **Search and the LIKE scans are never cached** (`search`, `searchBooks`, `allPages`, `allSections`
  go to the tables). Search once with a good query; do not poll.
- **Batch a card's writes.** Wrap a multi-write pass in the repository's index hold so the whole
  card is re-indexed once instead of once per write:

```js
CARDS.holdIndex();
try {
  const cardId = await CARDS.createCard(api, bookId, { name: "Harbour Gate", folderId });
  const secId  = await CARDS.createSection(api, bookId, cardId, { name: "Intent" });
  await CARDS.setSectionContent(api, bookId, secId, "…");
  const pageId = await CARDS.createPage(api, bookId, cardId, { title: "Description" });
  await CARDS.setPageContent(api, bookId, pageId, "…");
} finally {
  await CARDS.flushIndex(api);   // ALWAYS in a finally — a hold must never survive a throw
}
```

Never a call per keystroke, per mark, or per open. Keep truth in memory and write it down at the
beats that matter.

**This law's home is here** — the other Worldwright Studio skills point at this section rather than
repeating it.

---

## 7. LAW THREE — FIND BY NAME: read the shelf, by name, primaries only

This is settled. The creator's answer, verbatim:

> "How do the skills FIND the author's cards? Answer: read the shelf, focused on the specified
> book/folder/card contents by name, primaries only."

So the walk is fixed, and it is short:

1. **THE SHELF IS THE ENTRY POINT.** Never guess a book id and never scan every book. Read the
   shelf first, always: `LIB.list(objectApi, projectId)` from `lib/library.js` — the index behind it
   is `lib/shelf.js` (`heldBooks`, `bookRow`), which answers from this seat's memory once it has been
   read. That tells you which books exist and what they are called. Pinned books come from
   `PIN.all()` / `PIN.ids()` alongside it (`CODEX0000BOOK` and `RESEARCH0BOOK` are always both there).
2. **NAME-DIRECTED, NOT EXHAUSTIVE.** You are after a NAMED thing. Narrow at every level —
   shelf → the named **book** → the named **folder** (`CARDS.listFolders`) → the named **card**
   (`CARDS.listFolder`, then `CARDS.getCard`) — reading only what that path needs. A
   whole-database sweep is the wrong move.
3. **PRIMARIES ONLY, at every level** (§5): `card.id === card.stackId`. The TOP card of a stack is
   not necessarily the primary, and only the primary's references resolve.
4. **THE DATABASE IS A COST, and the name-directed walk is why** (§6). `lib/graph.js` opens one
   seat's book with its **skeleton** in 10 parallel statements and caches it, then fetches a card's
   words the first time someone reads them: **one** book read is cheap, repeated reads inside it are
   free, while reading five books to find one is not. Pick the book by name off the shelf, open it
   once, walk it in memory.
5. **If the named thing is not there, SAY SO and ask.** No broad-scan fallback, no invented book, no
   guessed near-match. Nothing swallowed. And when the creator answers, file that answer as a card.

**This law's home is here** too; the cards and research-walk skills point at it.

---

## 8. Failure modes to avoid

- Reading a locked-book throw as a permanent refusal. *"the Codex book is read-only — it is written
  for you, not in the app"* means take the write lane in §1b, not that the Codex cannot be written.
- Leaving `CARDS.authoring(true)` up after a throw. It is a counter; the `false` lives in a `finally`.
- Requiring `lib/cards.js` from outside the mod. From the game's own scripts it is
  `mods/worldwright-studio/lib/cards.js`.
- Filing an ask for somebody who is not on the shelf's allow list. God mode opened the tab; it did
  not make them an author, and the write is not yours to do on their behalf (FIRST, above).
- Refusing to READ for someone because of that same rule. Reads are not fenced. Only writes are.
- Sending someone looking for an invite code or an access mode. Both are struck; the Co-op window is
  two lists and who is here.
- Building first and filing after. The card stops being the source.
- A second card for a feature that already had one. Split canon; the next reader picks wrong.
- Applying the one-feature grain to a manuscript. It is a Codex law; author books have their own.
- Walking every member of a stack. Drafts get treated as canon.
- One `api.sql`-shaped call per field. The creator will see it and it is the one law he repeats.
- Copying another card's text into this one instead of referencing it with `#[<id>]`.
- Filing a felt description into the Codex, or a blockout into a story book. Route by kind.

## 9. Related skills

- `worldwright-directive` — the standing order in one page: the reading order, and back to here.
- `worldwright-cards` — how to actually write the card: sections vs pages, and cinematic pages
  through `lib/shoot.js`.
- `worldwright-research-walk` — what to read before you build anything from a card.
- `worldwright-writing` — the author's own books: manuscript grain, and how prose is filed.
- `worldwright-assets` — pointing a card at an asset.
- `worldwright-mods` — how Worldwright Studio behaves alongside other mods in this game.


## Current authoring leaves

`worldwright-paper` owns the shared page contract; `worldwright-piano-roll` owns score composition, continuous page loading, clip instruments, notation and Render WAV. `worldwright-sound` owns scene cues and speaker/timing cleanup. Keep this routing guide about reading order, access, filing and safe repository use.


### Permanent specialist books · 2026-09-14
Fixed shelf order: Codex (`CODEX0000BOOK`), Research (`RESEARCH0BOOK`), Music (`0MUSIC00BOOK0`), Asset Studio (`ASSET00STUDIO`). They cannot move, rename or be removed; only Codex is read-only inside. Research contains prose reference material, not source media. File piano scores, recordings, instrument samples and SFX in Music. File models, poses, sets, images, materials and textures in Asset Studio. Prose can reference specialist cards by their unchanged IDs. Read Codex and Research constraints first, then the relevant specialist source. Never regenerate or duplicate a card merely because its containing book changed.