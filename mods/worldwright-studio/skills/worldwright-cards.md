---
name: worldwright-cards
description: "How to WRITE a Worldwright Studio card — gated first by the allow-list check in worldwright-routing (god mode is not access; the game's creator is never locked out), and, in the locked Codex book, taken through the write lane (CARDS.authoring(true)/(false) — routing §1b). Then: sections are author notes, pages are the content itself, and cinematic pages are written to be SHOT through the shoot lane (lib/shootspec.js grammar, lib/cardbody.js bodies, lib/shoot.js hands, handed to the absolute-cinema mod). Carries the sections' SPACE LAW, THE PAGE LAW (measure with lib/pagelayout.js before every page write; overflow flows onto new pages — whole words move, nothing is ever cut), where a card files (the author's defined folders, never dumped at book root), and THE GRAIN for Codex entries (concept folder, independent part cards, full usable A3 pages). The standing laws — primaries only, the database is a cost, find by name — live in worldwright-routing."
---

## Physical paper — shared contract

Load `worldwright-paper` before any page write. NEVER exceed a zone's line capacity; ALWAYS paginate overflow. Measure the chosen format's actual width and all bands before and after writing. Preserve explicit formats, whole content and page identities; never silently resize paper. `worldwright-piano-roll` owns score editing and continuous visible-page loading. This reminder delegates the complete fitting recipe to the shared contract.


# The card builder — sections, pages, and shootable scenes

This game has **Worldwright Studio** installed. When you file an ask (see the
`worldwright-routing` skill — file it *before* you build it), this is how the card itself is
written. The split below is not a style preference; it is what makes a card readable by the next
person and usable by the machine.

---

## FIRST — THE GATE. Every verb in this skill is a WRITE.

Before you create, edit, rename, tag or delete anything here, run the access check at the top of the
`worldwright-routing` skill (**FIRST — WHO MAY WRITE**). The creator's ruling, verbatim:

> "Collaborators should not necessarily be given access to Story Builder, and you should not make
> edits/additions/removals in story-builder on behalf of someone who is not on the allow list. The
> game's creator should never be able to be locked out... Lol."

Two lines of it, and they are the whole gate: **god mode opens the tab, it does not make anyone an
author** — the allow list and the deny list in `lib/shelfaccess.js` (verdict from `SHELF.tryShelf`;
invite codes and access modes are struck) are what say who may write — and **this game's creator is
always allowed, on every shelf, outranking grant and deny.** If the asker is neither on the allow
list nor this game's creator, you do not write: say so, name who can grant it (the shelf's owner via
Co-op → Allow list, or the game's creator), and offer the reads. **Reads are never fenced** — reading
a card and quoting it back is always allowed. The full law, the live export list, the refusal
sentence and the order of the check live in `worldwright-routing`; do not re-derive them here.

**And the second gate, for one book only:** the pinned **Codex** book (`CODEX0000BOOK`) is LOCKED —
every verb in this skill throws *"the Codex book is read-only — it is written for you, not in the
app"* when it is aimed there. That is by design and it is not permanent: writing the Codex goes
through `CARDS.authoring(true)` … `CARDS.authoring(false)` in a `finally`, the worked example in
**`worldwright-routing` §1b**. Author books and Research take writes with no lift.

---

The creator's words:

> "You will want a card builder skill for writing sections as author/scene notes, and pages for
> descriptions/scenes/cinematic stuff (as appropriate via shoot)."

---

## 1. Choose the document lane; then split notes from content

Read an existing card's editor selection and complete document before writing. The shared editor
registry honors explicit selection first and classifies unselected structure; an ambiguity is a
refusal, not permission to replace it with prose. Native scores, arrangements, instruments and
Asset Studio files use their specialist readers/writers. Preserve editor metadata, every part/page,
linked components and unrelated sections. The prose example below is not a serializer for them.

The following split describes prose and Codex writing; defined machine sections are exceptions,
not spare storage for page overflow.

**SECTIONS = AUTHOR NOTES.** The margin. Short, structural, written to the builder:

- intent — what this is for, in one or two lines
- constraints — what it must not do, budgets, sizes, "never at night"
- open decisions — what is still unchosen; a question ABOUT the card takes the OpenQ shape below
- why it is the way it is — the reasoning, so nobody re-litigates it in three months
- what was tried and rejected, and why
- notes **about** a scene: pacing, what the beat is for, who the camera loves
- **the creator's own words, quoted.** This is where quotes live. A section that carries
  `Creator, <date>: "…"` is worth more than any paraphrase you can write.

**THE SPACE LAW (his ruling, 2026-08-26): NOTES sections have VERY limited space — a few short
lines, never paragraphs.** His words: *"sections are supposed to have very limited space... Not 158
words worth."* A notes section wanting more than ~4 lines is a page wearing the wrong coat: move the
prose to a page, leave the section a pointer. **The exemption, his amendment the same night:** *"we
may need to keep sections large for defining sets and stuff"* — a MACHINE-READ section (`Set` / a
named `Set: <name>`, §4) is sized by the set it defines, not by the space law. Tiny is for margin
notes; blocking data takes what it takes. Set `lineLimit` when creating
(`createSection(..., { lineLimit: N })`); past the cap the write is **refused and reported** — never
silently truncated. Give a section a real name ("Intent", "Constraints", "OpenQ", "Rejected",
"Set"), not "Notes 2".

**THE RESERVED SECTION NAMES — never give an author's notes section one of them.** Five names are
machine-read by the shoot lane, verbatim from `lib/cardbody.js:5`:

```js
var BODY_SECTION_NAMES = ["body", "asset", "appearance", "in-scene", "in scene"];
```

A section carrying one of those names is read as a **body** — model / primitive / light / none (§4b)
— and a paragraph of character notes under `## Appearance` is parsed as geometry: warnings the author
did not ask for, or a grey stand-in where prose was meant. Two more families are reserved the same
way: the SET names `set`, `stage`, `blocking`, `shoot`, `scene set` (`SET_SECTION_NAMES`,
`lib/shootspec.js`) and the SOUND names `sound`, `audio`, `sfx`, `sound design`
(`SOUND_SECTION_NAMES`, `lib/soundspec.js` — `worldwright-sound` §2). Notes about how a character
looks go in a section named **Look**, **Portrait** or **Silhouette**; notes about a place's sound go
in **Ambience**; the reserved name is for the machine.

**OPEN QUESTIONS ride the card, never a folder (his ruling, 2026-08-26).** His words: *"mark cards
as 'open question' when you have a question about them, instead of making a whole folder. You can
put your questions in the appropriate card's sections as OpenQ."* The shape: on the card the
question is about — `CARDS.setMeta(api, bookId, cardId, { openQuestion: true })` **plus** a short
section named **OpenQ** holding the question itself (a line or two, space law applies). When the
creator answers: fold that answer into the owning spec and clear only the answered question.
Keep `openQuestion: true` while any question on the card remains unanswered; set it false only
when all are resolved. The old "Open Questions" folder was cut 2026-08-26 — never recreate it.

**PAGES = THE CONTENT ITSELF.** The description, the scene as written, the cinematic. Prose a reader
reads straight through, not notes about prose. A page is the thing; a section is the thinking around it.

**THE PAGE LAW is `worldwright-paper`.** His ruling: "respect page line limits and create new pages as needed; preferring to move full words to a new page rather than cutting off." The repository accepting a write does not prove physical fit. Load the shared contract: actual sheet width first, Markdown-weighted zone capacity second, all pages preflighted before replacement and read back afterward. `PL.zoneFit` alone cannot detect soft-wrap overflow. Preserve headers/footers and reading order; continuation pages follow the last full page. No universal character count, source truncation or hidden overflow.

Test when you are unsure: *would the creator read this aloud as the work, or as a note to
themselves about the work?* Aloud as the work → page. Note → section.

**A structural exception:** a scene card's **`## Set`** section is not a
note — it is machine-read blocking (§4). It is a section because it is stable for the whole card
while the camera tags in the prose change per beat.

---

## 1a. THE GRAIN — concept folders and part cards

Load `worldwright-codex` for every Codex authoring pass. The creator's 2026-09-17 correction
supersedes treating an entire subject as one card: a concept gets its own folder under the
governing Codex category; each independently maintainable part gets a normal primary card.
Subdivide large parts again when they have distinct responsibilities. Stacks are alternative
versions, not a container for the parts that must all remain primary.

Within a part card, paginate related content across the full usable A3 body (`worldwright-paper`).
Do not put a whole subject in one ever-growing card, one small thought on each sheet, or long
notes in metadata sections. An optional Overview links the parts without repeating their specs.
This rule is Codex-specific; manuscripts and native specialist formats keep their own structure.
Existing-card splits preserve IDs, links and content through the explicit migration checklist in
`worldwright-codex`; this skill update does not migrate any saved documents.

---

### A Codex entry somebody else can build from

- **Summary:** this independently maintainable part and its purpose, not the entire subject or a progress diary.
- **Spec pages:** behavior, inputs, outcomes, constraints and checks. Record decided values
  accurately; missing values are OpenQs, not invented requirements.
- **Short sections:** intent, attributed decisions, constraints, rejected approaches and questions.
  Keep the existing phase/number stamps and paper/section limits.
- **Links:** reference the owning card or specialist file by ID instead of copying its specification.
- **Evidence:** distinguish requested, proposed, implemented and verified. A proposed check is not
  a passing result. Say what was actually read or measured and what remains unverified.

This checklist does not recreate existing cards or impose identical headings. Preserve the
creator's update-versus-alternative choice, primary-stack selection, quotes and filing preferences.

## 1b. Finding the card you are about to write to

**FIND BY NAME** — shelf → named book → named folder → named card, primaries only, one book loaded
once. The law's home is `worldwright-routing` §7; run it there and do not re-derive it here.

## 2. The mechanics (not guessable — use these exact names)

Worldwright Studio is a mod: its own files require each other as `lib/…`, but **from your own script or a
`run_script` in the installing game the same modules are `mods/worldwright-studio/lib/…`**.

```js
const CARDS = require("mods/worldwright-studio/lib/cards.js");   // every WRITE: cards, folders, pages, sections, tags
const GRAPH = require("mods/worldwright-studio/lib/graph.js");   // the read path — one seat's book: skeleton held, bodies per card
const REFS  = require("mods/worldwright-studio/lib/refs.js");    // #[...] tokens, the id→name map, backlinks
```

Writes (all `async`, all through `lib/cards.js` — never hand-write SQL; only statements living
literally in saved scripts may run at all). **Every verb in this table is gated by the access check
at the top of this skill** — allow list, or this game's creator; otherwise you do not write:

| Verb | Shape |
|---|---|
| `CARDS.createFolder(api, bookId, { name, folderId })` | → folderId. Omit `folderId` for a folder at the book root; nest by passing the parent folder's id. Walk what exists FIRST (`listFolders`) — a folder that already carries the name is the one to use, not to duplicate. |
| `CARDS.createCard(api, bookId, { name, folderId })` | → cardId. Omit `folderId` and the card lands at the book root (a top-level card's `folderId` **is** the book id) — but in a book whose author defined folders, the root is almost never where a card belongs: `listFolders` first and file into the governing one (THE FILING LAW — `worldwright-research-walk` §5). Name uniqueness is `(folderId, name)`; a clash takes a ` (2)` suffix. |
| `CARDS.createSection(api, bookId, cardId, { name, lineLimit, beforeId, afterId })` | → sectionId |
| `CARDS.setSectionContent(api, bookId, sectionId, text)` | refuses past `lineLimit`, loudly |
| `CARDS.createPage(api, bookId, cardId, { title, beforeId, afterId })` | → pageId. `afterId` is how continuation pages keep reading order (PAGE LAW, §1). |
| `CARDS.setPageContent(api, bookId, pageId, text)` | the page body — writes UNCONDITIONALLY, so measure with `PL.zoneFit` first (PAGE LAW, §1); overflow flows to a new page, never cut |
| `CARDS.setMeta(api, bookId, cardId, { summary, status, priority, openQuestion })` | the tile's face |
| `CARDS.ensureTag(...)` / `CARDS.addTag(api, bookId, cardId, tagId)` | tags |

**EXPORT IS SPELLED `compile: N` — one vocabulary, everywhere.** Compile Y/N is the switch at all
three grains (book, folder, card; his definition: *"compile y/n is for determining if the
book/folder/card should show up for export"*). `CARDS.setCardCompile(api, bookId, cardId, false)`
takes one card out of a whole-book export; `CARDS.setFolderCompile(api, bookId, folderId, false)`
takes the subtree, folder KEPT and readable in the app. Write it as **compile: N** / **compile: Y** in
prose, sections and card text — never "compile = 0", never "do not export", never "export: off". The
skills drifted through all three spellings; this is the one. Nothing is ever trashed to hide it.

Reads: `CARDS.getCard`, `listFolder`, `listFolders`, `listPages`, `listSections`, `listStack`,
`allCards` / `allPages` / `allSections` (whole-book walks, a fixed number of queries — never one per
card), `search(api, bookId, q)` and `searchBooks(api, bookIds, q)`.

**What a read costs** (routing §6): the book opens on its **skeleton** — cards, folders, tags, names
and page *titles* — and a card's page/section **bodies** arrive on the first `listPages` /
`listSections` for that card, then stay warm. Listings and counts on a warm book are free; one card
costs one paired fetch. Working over the WHOLE book, use `allPages` / `allSections` — one bulk pull
for every body — never `listPages` in a loop over N cards.

**References: link, never repeat — and linking is part of WRITING (his ruling, 2026-08-26).** A new
card is not finished until its text carries inline `#[...]` tokens to its related cards, and the
edges have a DIRECTION — his law (refined 2026-08-27): **characters, locations, items and factions
are INBOUND foci** (concepts too, sparingly) — tokens point AT them, and an inbound focus card does
not chase back every card that mentions it (`REFS.backlinks` is the reverse view, free); **the
timeline is the one OUTWARD focus** — author-side summarized events whose cards point out at
basically everything. That one-way flow, both directions honored, is what keeps the graph loop-free.
(History is not the timeline: history cards are the detailed in-world memory and stay peripheral,
pointing at the foci.) Where the prose mentions a thing that has a card, write the
token, not the bare name. A card that mentions another card carries the stored token
`#[<thatCardId>]` inside its text. `lib/refs.js` resolves it to that card's *current* name when the
page renders (`TOKEN_SOURCE` is `#\[([^\[\]]{0,240})\]`) — so a rename can never break a link,
because references point at IDs, not names. Useful surface:

- `REFS.loadMap(api, bookId)` → `{ names: { <cardId>: { name, bookId, status, pinned, bookName } }, byName, trashed, version }`
- `REFS.backlinks(api, { projectId, bookId, cardId, primaryId })` → what points *at* this card
- `REFS.referencedIds(texts, map, bookId)` → every `#[id]` a card contains. Pass **all** of a card's
  text at once (every page body, every section body): half the text would delete the other half's edges.

Copying another card's paragraph into this one is the mistake this system exists to prevent.

---

## 3. Save one bounded card at a time

**THE DATABASE IS A COST** — batch the writes, load a book once, never a call per field. The law's
home is `worldwright-routing` §6.

Here it means: one index hold around one bounded card, not the whole concept folder. Save and
read back each part before moving to another; the hold is not a SQL transaction. In the **Codex**, the same pass opens with the
authoring lift (routing §1b) — `CARDS.authoring(true)` outside the hold, `CARDS.authoring(false)` in
an OUTER `finally` around both the hold and flush. Do not place the release after an awaited
flush in the same block: a failed flush would skip it. Use routing §1b's nested example. An index
hold does not make these multi-write examples an atomic transaction.

This example is an author's prose/character card, not a Codex subject. For Codex concept/part
filing use routing §1b and `worldwright-codex`; do not translate this into one giant subject card.

```js
CARDS.holdIndex();                       // one re-index for the whole card, not one per write
try {
  const cardId = await CARDS.createCard(api, bookId, { name: "Brother Kael", folderId });
  await CARDS.setMeta(api, bookId, cardId, { summary: "Penitent swordsman. Speaks in litanies." });

  const s1 = await CARDS.createSection(api, bookId, cardId, { name: "Intent" });
  await CARDS.setSectionContent(api, bookId, s1, "Player's first mirror…");
  const s2 = await CARDS.createSection(api, bookId, cardId, { name: "Constraints" });
  await CARDS.setSectionContent(api, bookId, s2, "Never seen unarmoured before act 3.");

  const p1 = await CARDS.createPage(api, bookId, cardId, { title: "Who he is" });
  await CARDS.setPageContent(api, bookId, p1, "…the prose…");   // measured against the page spec FIRST — PAGE LAW, §1
} finally {
  await CARDS.flushIndex(api);           // ALWAYS in a finally — a hold must never survive a throw
}
```

Never a call per keystroke, per mark, or per open.

---

## 4. CINEMATIC PAGES — they go through **shoot**, and shoot does not move

The creator answered where cinematics live: **they do not move.** Not a book folder, not a Quill
plugin, not a separate surface. They are the **shoot lane** — three files, three jobs, exactly as
`lib/shoot.js`'s own header states it:

| File | Job |
|---|---|
| `lib/shootspec.js` | **THE GRAMMAR** — pure, zero requires. Words in, placements + shots out. |
| `lib/cardbody.js` | **THE BODY** — pure, zero requires. A card's `Body` section into object properties. |
| `lib/shoot.js` | **THE HANDS** — the only one that touches SQL, the world, or the mod. |

### The three steps, in order

1. **`read()`** — pulls the card's **sections + pages** through `lib/cards.js`, shapes them into
   shootspec's cardspec shape, and parses them into `{ placements, shots, effects, warnings }`.
2. **`dress()`** — each placement's `#[cardId]` token IS the card (the reference map only proves
   it lives); its `Body` section is read and spawned at the placement's coordinates. Every spawn wears the tag
   **`sb-set`** with id prefix **`sb-set-`**, and the next `dress()` **strikes the last set first** —
   re-shooting is free and never additive, and a strike can only ever destroy `sb-set` objects, never
   the room's own furniture. A set is capped at **120** placements with a visible warning
   ("usually a reference loop, not a scene") — capped loudly, never dropped silently. Set pieces
   spawn with `physics: "none"` unless the body says otherwise: scenery must not shove the camera.
3. **`roll()`** — `shootspec.compile()` emits the clip and `lib/shoot.js` hands it to the
   **absolute-cinema** mod:
   - `absolute-cinema:cinema:libImport` with `{ data: JSON.stringify(clip), name: clip.name, replace: true }`
   - `absolute-cinema:cinema:play` with `{ name: clip.name }`
   - **The payload crosses as JSON TEXT, not as an object.** The director trims the string and
     `JSON.parse`s it; passing an object gets a silent "Invalid clip data" and nothing else.
   - Compiled clip shape: `{ name, nodes:[{id,name,position:{x,y,z},yaw,pitch}], sequence:[{nodeId,hold,transition,easing,ending?}], effects:[{type,time,params}] }`. `hold` and `transition` are **seconds**; `transition: 0` is a hard cut.
   - absolute-cinema is a **separate mod by ress** (`DEP` in `lib/shoot.js`: id `absolute-cinema`,
     min version **1.14.0**), installed from the mod browser — not part of Worldwright Studio.
     `SHOOT.dependency(objectApi)` reads `spec.mods` and hands back
     `{ installed, version, notice, credit, install }`; when it is missing, `roll()` refuses with
     that `notice` sentence — credit first, install instruction second — and nothing half-plays.
     Never vendor or reimplement it.

**For everything in a shot that is not ours, load the other mod's own skill.** absolute-cinema,
atmosphere-kitchen, asset-library and the rest ship their own skills, and `use_skill("{mod}#{skill-id}")`
loads one **even before that mod is installed** — so staging, lighting, camera craft and
set-dressing guidance comes from there (e.g. `use_skill("absolute-cinema#cinema")`), not from this
file. This section teaches only Worldwright Studio's half: the card grammar and the hand-off.

`shoot(objectApi, bookId, cardId, opts)` is the one call a button makes: read → dress → compile →
hand over, with every stage's warnings riding out together.

### What makes a card SHOOTABLE (this is the part worth teaching)

A scene card written as pretty prose cannot be dressed or rolled. A shootable card has three things:

**a) A `## Set` section — one placement per line.** Section names read as the set:
`set`, `stage`, `blocking`, `shoot`, `scene set` (case-insensitive).

```
## Set
#[<brotherKaelCardId>] at 0, 0, 0 facing 180
#[<swordCardId>] at 3, 0.9, -2 facing 90 scale 1.2
#[<altarCardId>] at 3, 0, -2
```

**ONE token system** (creator ruling, 2026-08-26: *"We should make sure tagging/references are
universal. We do not want multiple tag/reference systems."*): a set line's `#[cardId]` is a PLAIN
card reference — the same token `lib/refs.js` walks everywhere — so a scene card automatically
links (edges + backlinks) to everything standing on its set. Ids in the source, names at render.
The old `[[Name]]` / `{{tag}}` grammar is struck, not dual-read: never emit it.

Everything after the token is optional (missing position = origin, facing = 0, scale = 1).
Coordinates are world metres, feet-position (bottom-centre), Y up, yaw 0 faces −Z. A line with no
card token is just prose and is skipped quietly, so notes can sit inside the Set section.

**MULTIPLE SETS on one card (creator ruling, 2026-08-26: *"We will need shoot scenes/sets to be
able to handle multiple scenes/sets on a card"*).** A named set is a section named
**`Set: <name>`** (any of the set-section words work as the prefix — `Stage: Docks` too); a bare
`Set` is the unnamed set. Same-name sections merge. The scene OPENS on the first set section; the
prose cuts over with an inline **`#[set: <name>]`** token — every `#[cam: …]` after it aims into
that set until the next switch:

```
## Set
#[<heroCardId>] at 0, 0, 0 facing 180

## Set: Throne Room
#[<kingCardId>] at 10, 0, -5 facing 90
#[<throneCardId>] at 12, 0, -6

(page prose)
He walks alone. #[cam: wide on <heroCardId> | 3s | cut]
#[set: throne room] The doors open. #[cam: medium on <kingCardId> | 4s | blend 2]
```

At playback the swap is real: `shoot()` resolves every set's pieces at press time into the staged
schedule (`segments` on `sbStage`), and `cinema-courier.js` strikes and re-dresses the world on the
director's own clock, mid-take — objects only, the cue conductor keeps playing. A `#[set: …]`
naming no set section warns and is dropped. A per-shot aim is validated against the set that is
LIVE at that shot. Set sections are machine-read blocking — the space law's exemption (§1): they
take the space their set needs.

**b) Every referenced card needs a `## Body` section**, or it stands in as a grey placeholder.
`lib/cardbody.js` reads exactly five section names —
`["body", "asset", "appearance", "in-scene", "in scene"]` (`BODY_SECTION_NAMES`, `lib/cardbody.js:5`;
they are reserved — §1) — and understands four body kinds:

```
## Body
model /cdn/moodboard-<family>/model-sword-of-dorn.glb   scale 1.2   pose Idle
box 2 x 0.3 x 5 color #6b5a3e
sphere r 0.4      ·  cylinder r 0.2 h 3   ·  plane 8 x 8
light point color #ffbb66 intensity 4 distance 12
none          ← a concept card: resolves, warns about nothing, puts nothing in the world.
              The camera can still aim at its coordinates — that is how you shoot an empty chair.
```

Define the sword once; place it in fifty scenes; change the Body line once and every scene
re-dresses next time it is shot. The four bodies are `model`, a primitive, `light` and `none` —
there is no `prop <kit-name>` form; the scripted-geometry prop kits are gone from this build.

**c) Camera tokens `#[cam: …]` in the PAGE prose, next to the beat they shoot.**

```
He kneels. #[cam: close on <brotherKaelCardId> | 3s | cut]
The blade catches the votive light. #[cam: low wide on <swordCardId> from left | 4s | blend 1.5]
#[cam: fade in] #[cam: title: FOR THE EMPEROR] #[cam: shake]
```

The target is the **bare card id after `on`** — a token's inner can never nest another token
(the refs lexer forbids brackets inside). Hand-placed camera: `#[cam: at 4,2,-6 looking at 0,1.5,0 | 5s]`.

**Separators are keyboard characters** (jace, 2026-09-01: "No emdashes in tags, keyboards do not
have an emdash button."): parts of a shot are split by ` | ` (also `;` or ` -- `); a spoken line is
`Name: words` (also ` - `). The parser still reads `·` and `—` in old pages, but nothing we write
uses them — a tag an author cannot type is a tag they cannot fix.

- **Sizes:** extreme close / close / medium close / medium / full / wide / establishing (plus
  aliases: ecu, cu, mcu, bust, ms, waist, figure, ws, vista, master).
- **Angles:** front · three quarter (3/4) · from left · from right · behind · over the shoulder (ots).
- **Heights:** low · high · bird (overhead) · dutch.
- **Timing:** `| 3s |` is the hold; `cut` = hard cut, `blend 1.5` = a 1.5s transition; easings
  linear / ease / easeIn / easeOut / easeInOut.
- **Effects (their own track):** fade in, fade out, shake, flash, letterbox, vignette, turbulence,
  and `title: TEXT`.
- Writing the scene **is** shooting it. Nothing bakes; every shot is re-derived from the words, so
  editing a line and re-shooting is the whole workflow. Shots cap at 200.

**d) Three more directives, written in the prose beside the beat they belong to.** Same bracket
system, same lexer — no new grammar, ever (`worldwright-compile` §2 carries the full table):

```
#[pose: Guard Stance on <brotherKaelCardId>]     ⚘  a saved pose or cooked clip, on that body
#[line: <brotherKaelCardId>: Hold the door.]     ❝  a spoken line: who, then the words
#[score: dirge-strings on 03 loop]               ♬  music under the picture
```

- **`#[pose: …]`** takes the pose or clip name, then the body after `on` — exactly the shape
  `#[cam: … on …]` already taught. No `on` is a pose with no body yet: legible as a reference,
  never an error mid-sentence. `REFS.poseParse()` preserves it. Compile does not apply it;
  Asset Studio owns joint posing and keyframes, with animated-GLB export.
- **`#[line: …]`** splits on an em dash, an en dash, a spaced hyphen or a colon (`REFS.lineParse()`) —
  all four read the same on a phone keyboard. A card id as the speaker renders as their name; nothing
  after the dash is a speaker clearing their throat, and the compile says so. Lines ride the shot they
  are written under, into film-kit's own `shot.lines`.
- **`#[score: …]`** is a CUE, so it is read by the cue grammar `#[sound: …]` already uses
  (`SOUND.parseCue`, `lib/soundspec.js`: source, `on <shot>`, `loop`, `stop on <shot>`). One grammar,
  two names — sfx and music differ in which lane plays them, never in how the author writes them.

So: **a cinematic page is not a description of a camera move.** It is a page whose content is
shootable — written in shoot's own terms so it can be *played*, not just read.

### Shoot's honesty law — inherit it

**Nothing is swallowed.** Every refusal comes back as a readable sentence in `.warnings` or
`.error` that an author can act on:

- an unknown `#[cardId]` → *"…is not a card in this book — a grey stand-in is holding its place."*
- a card with no Body → *"…has no Body section yet — a grey stand-in is holding its place. Add one and re-shoot."*
- an over-cap set, a line that will not parse, a piece that will not spawn → all named, and parsing carries on.

**A missing body is a VISIBLE grey stand-in, never a hole.** When you drive a shoot, surface those
warnings to the creator verbatim instead of reporting "done" over a scene full of grey boxes.

---

## 5. Card shapes worth reusing

**A character card** (author's story book). Sections: *Intent* (what they are for in the story),
*Voice* (how they speak — three real lines), *Constraints* (what they never do), *Open decisions*.
Pages: *Who they are* (the prose), *First appearance* (the scene). Add `## Body` if they will ever
stand in a shot. Reference their home with `#[<locationCardId>]`, their faction likewise.

**Character & plot development with the author:** grow a card, do not restart it. A name becomes a
person by adding sections one conversation at a time — the questions that earn their keep are
*what do they want, what will they not do, who can hurt them, what do they sound like when they are
losing.* File each answer into the card as you get it (routing law: hear it → file it → build it),
quote the creator in the section, and keep plot beats as their own cards in the same folder,
referenced from the character's card so the beat order is a graph, not a list buried in prose.

**A location card** has two halves in two books, by kind: the story book card carries what a place
*means, feels and smells like*; the Codex's Level Design card carries *shape, flow, blockout,
dimensions, spawn points, encounter beats, sightlines, what connects to what*. Both exist; link
them to each other with `#[...]`. Build from both (see `worldwright-research-walk`).

**A concept folder and part cards** (Codex). The folder groups the subject; each part owns its
short *Intent*, *Constraints*, *Invariants*, *OpenQ* and *Rejected* sections as needed, with its
actual specification on full usable A3 pages. Quote the creator in *Intent*, or link to measured
pages for a long quotation. The Overview does not duplicate every part. See `worldwright-codex`.

**Open Question and Note cards** (Codex) open with a stamp — `[P<phase>·<n>]`, the build-order phase
they belong to and a running number inside it — and they get compacted at every phase boundary:
resolved questions fold into what they produced and go, notes that the code now says fold into their
feature card, duplicates merge into the lower number, the creator's verbatim words survive every
pass. The rules in full: `worldwright-routing` §4b.

---

## 6. Stacks — and the law that governs them

**PRIMARIES ONLY** — only a stack's primary card ever counts, and the top card is not necessarily
the primary. The law's home is `worldwright-routing` §5; write to the primary, filter every walk.

**A stack is also the answer to "this card already exists."** When an ask lands on a card that is
already there, you do not choose for the author — you ask whether to update that card or to keep it
and add the new details as an alternative beside it (`worldwright-routing` §3 carries his wording
and the exact calls: `CARDS.createStackFrom(api, bookId, cardId)` mints the alternate inside the
existing stack and leaves the original primary, so no reference moves).

When you write, write to the primary. When you walk cards, filter:
`(await CARDS.allCards(api, bookId)).filter((c) => c.id === c.stackId)`. A reader that walks all
stack members is treating the author's drafts and alternates as canon — exactly what a stack exists
to prevent.

### Stack verbs (creation + management — the complete set, same fence as §2)

| Verb | What it does |
|---|---|
| `CARDS.createStackFrom(api, bookId, cardId)` | THE way a stack is born. Standalone card → mints a blank 'New Card' beside it as the alternate; the original stays primary, no reference moves. Card already in a stack → duplicates the whole stack instead. → stackId |
| `CARDS.duplicateStack(api, bookId, stackId)` | copies every member onto fresh rows (meta, sections, pages, tags). → the NEW stackId |
| `CARDS.cycleStack(api, bookId, stackId, dir)` | `'left'` sends top to bottom, `'right'` bottom to top. Changes what the tile draws, never what a reference resolves to. |
| `CARDS.setStackPrimary(api, bookId, stackId, cardId)` | the ONE reference-moving verb: the stack id becomes `cardId` and every stored `#[old]` across the project is rewritten. → `{ stackId, references }` |
| `CARDS.splitFromStack(api, bookId, cardId)` | the card leaves as its own stack of one. If the PRIMARY leaves, the top of what remains inherits the stack — references and all. → the card's new stackId |
| `CARDS.listStack(api, bookId, stackId)` | read: members in stack order, top first. |

**There is no merge verb — by design** (his ruling, 2026-08-26: *"By design."* — never offer to
build one). Two existing cards cannot be joined into one stack — the repository has no such
operation, and inventing one by writing `stackId` directly is a bypass of everything §6 protects. The honest shape when two cards should become one pile: `createStackFrom` on the keeper,
then move the other card's content over and trash it — and that choice is the author's, asked first.

---

## 7. Related skills

- `worldwright-routing` — the standing laws (primaries only, the database is a cost, find by
  name), the write gate, the Codex write lane (§1b), and filing the ask *before* building.
- `worldwright-writing` — the author's own books: manuscript grain and how prose is filed.
- `use_skill("{mod}#{skill-id}")` — any installed-or-not mod's own skill: cinema, atmosphere, assets.
- `worldwright-research-walk` — what to read before you build anything from a card.