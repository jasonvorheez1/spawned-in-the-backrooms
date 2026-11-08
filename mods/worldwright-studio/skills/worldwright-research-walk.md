---
name: worldwright-research-walk
description: "Before building anything from a Worldwright Studio card, folder or book. Reads are NOT fenced by the allow-list rule — the walk is always permitted, only the filing at its end is gated (and a filing into the locked Codex book takes the write lane in worldwright-routing §1b). The walk itself: the ordered walk through the pinned Research book (RESEARCH0BOOK), the #[...] reference map (backlinks are MANDATORY when the source is an INBOUND focus — edges point one-way at characters/locations/items/factions, concepts sparingly, so an inbound focus card's context is what points AT it; the TIMELINE is the one OUTWARD focus, author-side summarized events pointing out at everything, walked by refs-out), and the Codex's Level Design card, so a scene/world/location/character is built from the world's rules and not from one fragment. The standing laws (primaries only, the database is a cost, find by name) live in worldwright-routing. Carries THE FILING LAW: every card written into Research files INTO the governing one of the author's 14 defined folders — scope first (per-book subfolder for book-specific, root tree for global), then a subfolder per subject on the root's axis (History by historical body, Fauna by region) — never dumped at the book root, never a new root folder minted."
---

# The research walk — read before you build

This game has **Worldwright Studio** installed. When the creator hands you a card, a folder or a
whole book as the source for something you are about to BUILD — a location, a scene, a character, a
world — you read the **Research** book first. Not all of it. The parts the source reaches.

---

## FIRST — THE ACCESS CHECK, and for this skill it comes back ALLOWED

**Reads are NOT fenced.** The access check that runs first in every Worldwright Studio skill (see
**FIRST — WHO MAY WRITE** at the top of `worldwright-routing`) gates *writes* only — the creator's
words are *"you should not make edits/additions/removals in story-builder on behalf of someone who
is not on the allow list"* — and this whole walk is reading. So the walk is **always permitted**,
whoever asked: open the shelf, load the book, read the cards, follow the `#[...]` references, read
Research, quote any of it back. Never refuse a read because someone is not on the allow list.

Only the **filing at the end** is gated: the Open Question card in Step 5, the gap you write down,
any card the walk makes you create or edit. That write needs the asker to be on the shelf's allow
list or to be this game's creator (who can never be locked out). If they are not, do the walk, give
them the answer, and say plainly that filing it is not yours to do on their behalf — name who can
grant it.

---

The creator's ask, verbatim:

> "a skill that directs you to read through research book when building from a card, folder, or book."

Why: the author put the world's standing rules in Research. Building from one card builds from a
fragment. A gate that ignores the Research card saying *this city has no iron* gets built in iron.

---

## 0. The constants and modules (real names — nothing here is guessable)

Worldwright Studio is a mod: its own files require each other as `lib/…`, but **from your own script or a
`run_script` in the installing game the same modules are `mods/worldwright-studio/lib/…`**.

```js
const CARDS = require("mods/worldwright-studio/lib/cards.js");   // reads + writes; the repository
const GRAPH = require("mods/worldwright-studio/lib/graph.js");   // the read path: one seat's book — skeleton held, bodies per card
const REFS  = require("mods/worldwright-studio/lib/refs.js");    // the #[...] reference map and backlinks
const PIN   = require("mods/worldwright-studio/lib/pinned.js");  // the registry of pinned books
const LIB   = require("mods/worldwright-studio/lib/library.js"); // the shelf: the author's own books
```

- **`RESEARCH0BOOK`** — the book id of the pinned **Research** book. It is a real book with real
  rows, filed on no shelf, seeded at boot. Also reachable as `PIN.ID` and as
  `require("mods/worldwright-studio/lib/ids.js").SENTINELS.RESEARCH`.
- Its 14 seeded root folders, from `lib/data/research-book.json`: **Timeline, Characters, Items,
  Locations, Factions, Languages, History, Mythology, Religion, Flora, Fauna, Themes, Concepts,
  External References.**
- **`PIN.ids()`** → every pinned book id in this install; **`PIN.all()`** → `[{ id, name, folders }]`;
  `PIN.isPinned(id)`, `PIN.bookOf(id)`, `PIN.folders(id)`. Use these instead of hardcoding a second
  id — a build-doc ("Codex") book is added to the registry as one JSON file plus one line, so it
  shows up here when it exists.
- **The build doc is always here.** `PINNED = [CODEX_BOOK, RESEARCH_BOOK]` (`lib/pinned.js:9`), so
  the **Codex** book (`CODEX0000BOOK`) exists in every install — its ten seeded folders are
  Overview, Features, Level Design, UI, SFX, VFX, Invariants, Build Order, Phases, Notes. It is **locked**: reading it needs nothing, writing it takes the lane in
  `worldwright-routing` §1b (`CARDS.authoring(true)` … `authoring(false)` in a `finally`), or the
  write throws *"the Codex book is read-only — it is written for you, not in the app"*.
- **Reference tokens** are stored in card text as `#[<cardId>]` — the lexer is
  `#\[([^\[\]]{0,240})\]` (`REFS.TOKEN_SOURCE`). They point at **ids**, resolved to names at render
  time, so a rename never breaks one.

---

## 1. THE WALK, in order

**THE SEARCH ORDER — timeline first, then by need (his ruling, 2026-08-27).** Verbatim: *"timeline
is clearly a good first stop. concise, tells you who, what, when, where, why, and how; and you can
follow those to the more detailed explanations where ever you need to. The search order for the
rest sould depend on what you are looking for. it is silly to look for a place using a person. a
place may not exist until a certain time; so timeline first, everything else in order of need,
still holds."* So when the walk reaches Research: open the **timeline first, always** — it is the
summarized index whose refs-out reach everything, and it settles WHEN a thing exists at all (a
place may not exist yet at the moment your scene is set). After the timeline, route by WHAT you
are hunting — a place through locations, a person through characters, an object through items, a
group through factions — in order of need, never sideways through the wrong focus kind.

### Step 1 — resolve the source, primaries only

- a **card** = itself
- a **folder** = its cards (`CARDS.listFolder(api, bookId, folderId)`)
- a **book** = its folders (`CARDS.listFolders`) → their cards, or one whole-book walk
  (`CARDS.allCards(api, bookId)` — a fixed number of queries, never one per card)

Then filter every one of those lists:

```js
const sources = list.filter((c) => c.id === c.stackId);   // PRIMARIES ONLY — see §3
```

### Step 2 — follow references OUT, and treat Research hits as required reading

Load the map once and read the source's text once:

```js
const map   = await REFS.loadMap(api, bookId);     // { names: { id: { name, bookId, status, pinned, bookName } }, byName, trashed }
const pages = await CARDS.listPages(api, bookId, cardId);
const secs  = await CARDS.listSections(api, bookId, cardId);
const texts = pages.map(p => p.content).concat(secs.map(s => s.content));
// COST (routing §6): those two lines are ONE paired fetch — this card's bodies, once, then warm.
// Walking many cards? `CARDS.allPages` / `allSections` pull every body in one pass instead.
const out   = REFS.referencedIds(texts, map, bookId);   // every #[id] this card contains
```

Pass **all** of the card's text at once — pages *and* sections. Half a card's text yields half its
edges.

For every id in `out`, look at `map.names[id].bookId`:

- **`bookId === "RESEARCH0BOOK"` → REQUIRED READING.** Not optional colour. Open that card
  (`CARDS.getCard` + `listPages` + `listSections`) and let it constrain what you build.
- another book → read it if it is a thing you are about to build (a referenced prop, a referenced
  character), and follow one more hop outward; stop when hops stop mentioning Research.

**When the source IS an INBOUND focus, the backlinks pass is MANDATORY — not a reverse-view
extra.** The graph's own law (§5: characters, locations, items and factions are inbound foci —
concepts too, used sparingly; edges point one-way AT them) means an inbound focus card's context
lives almost entirely in what points at it — a refs-out walk from a character or a faction comes
back near-empty *by design*. So when the thing you are building IS an inbound focus kind, run
`REFS.backlinks(api, { projectId, bookId, cardId, primaryId })` and treat its Research hits exactly
like Step 2's required reading. Pass `primaryId` when the card on screen is a stack member, because
a stack's references always point at the primary, never at the top card.

**The TIMELINE is the one OUTWARD focus** — his ruling: it is the author-side ordered SUMMARY of
events, "summarized data pointing out at basically everything". A timeline card's context IS its
refs out, so the ordinary Step 2 walk already covers it; backlinks there are optional colour, not
required reading.

### Step 3 — read the Research folders that GOVERN this kind, even with no link

An author does not always link the rule. So open the governing folders for what you are building,
from the 14 above:

| Building… | Read at least |
|---|---|
| a location / a world | Locations, Geography-ish folders (Locations, Flora, Fauna), Factions, History, Themes |
| a character / an NPC | Characters, Factions, Languages, Religion, Themes |
| an item / a prop | Items, Concepts, History |
| a scene / a beat | Timeline, Themes, plus whatever the scene's own references reach |

Skim by name and summary first (`CARDS.listFolder` returns rows carrying name, summary, status — no
extra query), then open only the cards that plausibly bind. Primaries only, again.

**Read scope-aware, along THE FILING LAW's own tree (§5):** inside each governing root, read the
per-book subfolder named for the SOURCE's book plus the root's global rung — and skip other books'
subfolders entirely. The scope axis exists so a walk can prune: on a shelf with several novels,
another book's canon is not this build's context.

This table does double duty: when the walk ends in a WRITE, the same row names the folder the new
card files into — **THE FILING LAW, §5.**

### Step 4 — read the build doc's Level Design card for the same place, if one exists

The split across the two halves of this tool is **by kind, not by subject**:

> Creator: "keep level design in the codex since that pertains to more technical things beyond
> descriptions of the scenery."

- The **story card** gives the **FEELING** — what the place means, who lives there, what happened
  there, its mood and its smell.
- The **Codex's Level Design card** gives the **SHAPE** — blockout, dimensions, flow, spawn points,
  encounter beats, sightlines, connections, traversal, what the player can and cannot reach.

The same location legitimately has a card on both sides; that is correct, not duplication. Build
from **both**. Find it by searching the Codex — `CARDS.search(api, "CODEX0000BOOK", name)` — or by
opening its **Level Design** folder
(`RESEARCH.folderIdNamed(api, "CODEX0000BOOK", "Level Design")` → `CARDS.listFolder`). Reading it
needs no lift; only writing does.

### Step 5 — build, then name what you built from

Build the thing. Then, in your report to the creator, **name the cards you built from** — book ›
folder › card, one line each, including the Research cards that constrained it. That sentence is
how they check you read the right canon, and it is how the next Savi knows where to look.

If the walk turned up a **contradiction** (two cards disagree) or a **gap** (nothing in Research
covers the thing you must invent), do not silently pick. File it — INTO the governing folder of the
14, never at the book root (**THE FILING LAW, §5**) — as an Open Question card / page —
**stamped `[P<phase>·<n>]`**, phase off the build-order rail and a running number inside it, per
`worldwright-routing` §4b, which also carries the compaction rules that keep the tab readable — and
say so — filing is a write, so it needs the asker on the allow list or to be this game's creator
(FIRST, above); if they are not, say the gap out loud instead of filing it for them — and remember the routing law: what you invent to fill the gap gets written down as a card
*before* it gets built (see the `worldwright-routing` skill).

---

## 2. Finding the source at all

**FIND BY NAME** — shelf → the named book → the named folder → the named card, reading only what
that path needs, and if the named thing is not there, say so and ask. That is the entry to Step 1,
and its home is `worldwright-routing` §7.

## 3. The two standing laws, as this walk meets them

- **PRIMARIES ONLY** — filter every list to the primary of its stack, at every level of the walk.
  The law's home is `worldwright-routing` §5.
- **THE DATABASE IS A COST** — open the book once through `lib/graph.js` (skeleton up front, a
  card's bodies on first read), prefer the whole-book verbs (`allCards` / `allPages` /
  `allSections`, one bulk pull) over per-card loops, call `REFS.loadMap` once per book,
  search once with a good query, and batch any write behind
  `CARDS.holdIndex()` … `finally { await CARDS.flushIndex(api); }`. The law's home is
  `worldwright-routing` §6.

---

## 5. LAW — FILE INTO HIS FOLDERS

The creator's complaint, verbatim (2026-08-26, after reading another install's work):

> "Other you did not use any of the folders I so generously defined for you."

The 14 seeded root folders are not scenery — they are **the author's own filing system**, and every
card written into Research files INTO the one that governs it. The govern-table in Step 3 does
double duty: **the same table that tells you what to READ tells you where to FILE.** A character gap
files under **Characters**, a place under **Locations**, an invented rite under **Religion**, a word
of a tongue under **Languages** — and when two plausibly govern, the more specific one wins.

**THE SHAPE INSIDE A ROOT — scope first, then subject.** His ruling, verbatim (2026-08-26):

> "When you write to it you should use per-book folders to hold information that is specific to a
> book. History folder would contain faction history as well, so each historical body (a faction, a
> planet, etc) should have its own subfolder within the appropriate per-book folder or the history
> folder itself. This pattern repeats for the other folders as well. Fauna would be divided by
> per-book or global, then a folder for what region of the world the fauna is found in."

So a Research root is a TREE, and the tree has two axes, in this order:

1. **SCOPE** — information specific to ONE story book files under a per-book subfolder named for
   that book; world-global information files in the root folder's own tree directly (global is the
   root itself, not a folder named "Global").
2. **SUBJECT** — inside that scope, each subject gets its own subfolder, and the subject axis
   matches the root's kind. His two examples: **History** groups by historical BODY — each faction,
   each planet, its own subfolder holding its history cards; **Fauna** groups by the REGION of the
   world the creature is found in. The pattern repeats across the other roots — pick the axis of
   the same kind (a Locations tree by region, a Languages tree by tongue), and when the right axis
   for a root is genuinely unclear, ask the author rather than minting a guess.

Worked out: a faction's history in one book's world → `History › <Book> › <Faction> › cards`;
a world-global planet's history → `History › <Planet> › cards`; a book's marsh-cat →
`Fauna › <Book> › <Region> › card`.

The mechanics, in order:

1. **`CARDS.listFolders(api, RESEARCH0BOOK)` FIRST** — file into the deepest EXISTING folder that
   governs, matched **by name against what is there**. An existing `History › Ashfall Compact` is
   the folder; a near-synonym sibling of it is a filing error.
2. **Mint the missing rung, not a new shape.** When the scope or subject subfolder does not exist
   yet, creating it IS part of filing correctly (`createFolder` with the parent's `folderId`) — a
   per-book folder, a body folder, a region folder. What you never mint without the author's word
   is a new ROOT beside the 14, or a subfolder axis he didn't set.
3. **LINK the card into the web as you write it (his ruling, same day).** Filing is not done until
   the card's text carries inline `#[<cardId>]` tokens to its related cards. Where the prose
   MENTIONS a thing that has a card, write the token, not the bare name: tokens point at ids and
   survive renames, and they are the edges Step 2 of the walk follows — an unlinked card is
   invisible to every future walk. Resolve names to ids through `REFS.loadMap` (`map.byName`),
   never by guessing an id.
   **The graph has FOCI, in two directions — his words: "characters, locations, items, and the
   timeline as foci to prevent cyclical references", refined 2026-08-27: "timeline as an outward
   foci ... factions as inbound foci; concepts would be kinda vague, i think, but we can use
   them."**
   INBOUND foci — characters, locations, items, factions (+ concepts, sparingly): edges point AT
   them. A history card references the characters in it, the locations it happened at, the items
   that mattered, the faction it names. Inbound focus cards do not link back out at every card
   that mentions them — the reverse view is already free (`REFS.backlinks`), and one-way edges
   into the foci are what keep the graph from looping. Membership rides the pointing card
   ("captain of #[The Salt Guard]" lives on the character), so faction cards keep near-zero refs
   out. Two peripheral cards that relate meet AT their shared focus, not by referencing each other
   in a ring.
   OUTWARD focus — the timeline, alone: its cards are the author-side ordered summary of events
   and point OUT at basically everything; nothing loops because nothing needs to point back.
   History is NOT the timeline — his note: the timeline is "the actual story timeline on an
   author's side", history is "the detailed explanations of what has happened where and what they
   remember of it" — so History stays peripheral, pointing at the foci like any detailed card.
   **A pulled MIRROR folder is reference, peripheral the same way** — an `Encyclopedia/` mirrored
   out of a mod (`worldwright-encyclopedia`) is somebody else's reference book sitting inside the
   author's: cite it from a card that needs a definition, and **never start a focus walk inside
   one.** The walk starts at the author's own foci; a mirror is where it lands, never where it opens.
   **And the SUMMARY is part of the filing.** Step 3 of the walk skims folders by name + summary
   alone — a card filed with an empty summary is invisible to every future walk. One line, written
   as the constraint a builder must respect ("no iron anywhere in Vess"), never a restatement of
   the title.
4. **Never at the book root.** A card created with `folderId` omitted lands at the root — in
   Research that is a filing error, full stop.
5. **This law travels.** Any book whose author defined folders gets the same respect: walk
   `listFolders`, file into the governing one, root only when the book HAS no folders or the author
   says so. The old "Open Questions" folder stays dead — questions ride the card itself
   (`openQuestion: true` + an OpenQ section, per `worldwright-cards` §1).

---

## 6. Related skills

- `worldwright-routing` — the governing law: hear it → file it → build it; which book; new card vs edit.
- `worldwright-cards` — how a card is written: sections are author notes, pages are content,
  cinematic pages are shootable through `lib/shoot.js`.


### Permanent specialist books · 2026-09-14
Fixed shelf order: Codex (`CODEX0000BOOK`), Research (`RESEARCH0BOOK`), Music (`0MUSIC00BOOK0`), Asset Studio (`ASSET00STUDIO`). They cannot move, rename or be removed; only Codex is read-only inside. Research contains prose reference material, not source media. File piano scores, recordings, instrument samples and SFX in Music. File models, poses, sets, images, materials and textures in Asset Studio. Prose can reference specialist cards by their unchanged IDs. Read Codex and Research constraints first, then the relevant specialist source. Never regenerate or duplicate a card merely because its containing book changed.