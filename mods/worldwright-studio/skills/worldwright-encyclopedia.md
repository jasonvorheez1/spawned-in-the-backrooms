---
name: worldwright-encyclopedia
description: "The pull lane from the annias-encyclopedia mod (by annias) into Worldwright Studio — Codex is the one space that integrates and coordinates the mods, and this is how the encyclopedia's entries land in a codex folder. Where the mod keeps its data (mods/annias-encyclopedia/lib/data/encyclopedia.json, read via api.getScript — its player.state.encyclopedia block is reading position, not content), and the recipe for a dedicated read-only MIRROR folder named Encyclopedia in the author's own book: one card per entry, chapters and glossary as subfolders, compile=0 on the folder and every card so pulled reference never leaks into a manuscript export, and a re-pull that rewrites only the mirror. Pull-only: nothing is ever written back into the mod."
---

# Encyclopedia ▸ into a Codex folder

The creator's direction, verbatim (2026-08-27):

> "We want Worldwright Studio to pull from the mods. Not put anything into them. The encyclopedia, for
> example, could be given a special folder or button to display its information through Worldwright Studio."

> "The idea is to let the Worldwright Studio integrate and coordinate all the mods in one space."

So: **Worldwright Studio is the desk the mods' material lands on.** Encyclopedia entries go INTO a codex
folder. Never the other way. (The one documented exception in this app is a mod that needs input to
*function* — that gets a compatibility layer like `lib/shoot.js`, compiling from our own cards and
crossing the partner's documented door. The encyclopedia needs nothing from us: it is a reader.
This lane is pure pull.)

---

## 0. THE DEPENDENCY — credit first, instruction second

This lane is **annias-encyclopedia by annias**, currently `1.4.0`. It is a separate mod, not part of
Worldwright Studio, and **without it installed this lane is dead** — no data, no mirror, nothing to
display. Worldwright Studio never installs it for anybody: name it and let the creator install it from the
Spawn mod library (search "annias-encyclopedia"). Never copy its code, never vendor its JSON into
our tree, never edit its files.

The presence check is `spec.mods` — the same door `lib/shoot.js` `dependency()` and
`lib/assetshelf.js` `installed()` use, and it costs nothing:

```js
function encyclopediaInstalled(api) {
  try {
    const mods = api.getSpec ? api.getSpec("mods") : null;   // { "annias-encyclopedia": "1.4.0", … }
    return mods && typeof mods === "object" ? String(mods["annias-encyclopedia"] || "") : "";
  } catch (e) { return ""; }
}
```

Empty string → say it in one sentence with the author's name in it and stop:
*"The Encyclopedia mirror needs annias-encyclopedia by annias — the reference book it mirrors. It is
a separate mod, not part of Worldwright Studio. Install it from the Spawn mod library."*

---

## 1. Where the encyclopedia keeps its data (verified in the mod's own source)

| Thing | Where | What it is to us |
|---|---|---|
| **The book itself** | `mods/annias-encyclopedia/lib/data/encyclopedia.json` | **the only thing we read.** Static, shipped with the mod, ~130 KB: `{ intro, chapters[], glossary[] }` |
| Reading position | `player.state.encyclopedia` = `{ selectedChapter, search, view, tick }` + `player.state.activeTab` (`encyclopedia.js`) | the reader's *place in the book*, not content. Never read it as data, **never write it** |
| Its saved state | storage key `encyclopedia/v1/<userId>` (`ENCYCLOPEDIA_STORAGE.customKey`) | the mod's. Untouchable in both directions |
| Its renderer | `lib/ui-encyclopedia.js` | its UI. Do not wrap it, mount it, or reimplement it |
| Its actions | `encyclopedia:set-tab`, `:select-chapter`, `:set-search`, `:show-glossary`, `:show-chapter` | its own controls. Not a door for us — we never send them |

**The JSON's shape** (as shipped in 1.4.0 — 15 chapters, 26 glossary letter groups, 161 terms):

```
intro     { title, what_it_is, how_it_helps[], how_to_use }
chapters  [ { id: "ch-01-foundations", number: 1, title, status: "full"|"stub"|"teaser",
              summary, sections: [ { heading, body } ] } ]
glossary  [ { letter: "A", entries: [ { term, definition } ] } ]
```

Section `body` is Markdown with `\n\n` paragraph breaks, up to ~1,900 characters — that matters at
the page law (§4).

## 2. The read — `getScript`, not `require`

```js
const RAW = api.getScript("mods/annias-encyclopedia/lib/data/encyclopedia.json");
let DATA = null;
try { DATA = RAW ? JSON.parse(RAW) : null; } catch (e) { DATA = null; }
if (!DATA || !Array.isArray(DATA.chapters)) return "the encyclopedia's data did not read — nothing mirrored.";
```

`require("mods/annias-encyclopedia/lib/data/encyclopedia.json")` does resolve while the mod is
installed, but it **throws** when it is not — and a missing partner mod must be a quiet empty shelf,
never a throw. Same doctrine as `lib/assetshelf.js`: read the text, parse it, absence is `null`.
Read it **once** per pull and hold it in a local; it is 130 KB.

## 3. The mirror folder

One folder, in the **author's own book** — never the Codex (locked; it takes writes only through
routing §1b, and pulled reference is not build data) and never Research. Ask which book if it was not
named, then find it by name off the shelf (`LIB.list`, routing §7 — never guess a book id).

```
<author's book>
└── Encyclopedia            ← the mirror. compile = 0
    ├── About the Encyclopedia          (one card, from `intro`)
    ├── Chapters/                       (subfolder — one card per chapter, 15 of them)
    └── Glossary/                       (subfolder — one card per LETTER, 26 of them)
```

The mod's own two views (`VALID_VIEWS = ["chapter", "glossary"]`) are what the two subfolders mirror
— that is the "tabs → subfolders" case being natural. **Do not mint 161 glossary cards**: a letter is
the entry at that grain, its terms are its page body.

**Card names are the join key on a re-pull**, so they are fixed:
`"1. Foundations of Game Development Language"` (number + title) and `"Glossary — A"`.

## 4. The pull — one pass, one hold

Every verb below is a WRITE into the author's book: run the access check at the top of
`worldwright-routing` **first** (god mode is not access; the game's creator is never locked out).

```js
const CARDS  = require("mods/worldwright-studio/lib/cards.js");
const CONFIG = require("mods/worldwright-studio/lib/config.js");
const PL     = require("mods/worldwright-studio/lib/pagelayout.js");

const cfg  = await CONFIG.getBook(api, bookId);                 // one read per book, not per page
const spec = cfg && cfg.pageSpec && typeof cfg.pageSpec === "object" ? cfg.pageSpec : PL.DEFAULT_SPEC;

CARDS.holdIndex();                                              // routing §6 — ONE index pass
try {
  // 1. the folder, found by name before it is created (never a second "Encyclopedia")
  const roots = await CARDS.listFolders(api, bookId);
  let mirror = roots.find((f) => f.name === "Encyclopedia");
  const mirrorId = mirror ? mirror.id
    : await CARDS.createFolder(api, bookId, { name: "Encyclopedia" });
  const kids = await CARDS.listFolders(api, bookId, mirrorId);
  const chaptersId = (kids.find((f) => f.name === "Chapters") || {}).id
    || await CARDS.createFolder(api, bookId, { name: "Chapters", folderId: mirrorId });

  // 2. one card per entry, reconciled by name against what is already there
  const have = {};
  for (const t of await CARDS.listFolder(api, bookId, chaptersId)) have[t.name] = t;

  for (const ch of DATA.chapters) {
    const name = ch.number + ". " + ch.title;
    const cardId = have[name] ? have[name].id
      // UNREAD: a Savi-minted card is created unread — it wears the dot until the author opens it
      : await CARDS.createCard(api, bookId, { name, folderId: chaptersId }, { unread: true });

    await CARDS.setMeta(api, bookId, cardId, { summary: ch.summary });   // summary only — the mod's
    // "full"/"stub"/"teaser" is ITS writing-completeness vocabulary, not the author's card status;
    // it goes in the Source section below, never into the book's own status filter.

    // provenance — a SHORT section, the space law applies (cards §1)
    const secs = await CARDS.listSections(api, bookId, cardId);
    const srcId = (secs.find((s) => s.name === "Source") || {}).id
      || await CARDS.createSection(api, bookId, cardId, { name: "Source", lineLimit: 4 });
    await CARDS.setSectionContent(api, bookId, srcId,
      "annias-encyclopedia@" + version + " · " + ch.id + " · " + ch.status +
      "\nRead-only mirror. Edits here are overwritten by the next pull.");

    // pages: one per section heading, measured, overflow FLOWS (cards §1, THE PAGE LAW)
    const pages = await CARDS.listPages(api, bookId, cardId);
    const planned = [];
    for (const s of ch.sections) {
      const text = "# " + s.heading + "\n\n" + wrap(s.body, spec); // §4a — actual width
      for (const part of split(text, spec, PL)) planned.push({ title: s.heading, content: part });
    }
    // Preflight the ENTIRE sequence, including rendered heading widths and all saved bands,
    // under worldwright-paper before replacing ANY page. wrap/split are supplied helpers.
    for (let i = 0; i < planned.length; i++) {
      if (!PL.zoneFit(planned[i].content, spec, "body").ok) throw Error("Body overflow");
      for (const zone of ["header", "footer"])
        if (!PL.zoneFit(pages[i]?.[zone] || "", spec, zone).ok) throw Error("Band overflow");
    }
    let n = 0;
    for (const part of planned) {
      const pid = pages[n] ? pages[n].id
        : await CARDS.createPage(api, bookId, cardId, { title: part.title, afterId: n ? pages[n-1].id : undefined });
      if (!pages[n]) pages[n] = { id: pid };
      await CARDS.setPageContent(api, bookId, pid, part.content);
      n++;
    }
    // Delete surplus only after the full replacement succeeds and its source is verified.
    for (let i = n; i < pages.length; i++) await CARDS.deletePage(api, bookId, pages[i].id);  // the surplus from a shorter re-pull

    await CARDS.setCardCompile(api, bookId, cardId, false);       // §5 — never in an export
  }

  await CARDS.setFolderCompile(api, bookId, mirrorId, false);
} finally {
  await CARDS.flushIndex(api);                                    // ALWAYS in a finally
}
```

Glossary is the same loop with `DATA.glossary`: card `"Glossary — " + g.letter`, body
`g.entries.map((e) => "**" + e.term + "** — " + e.definition).join("\n\n")`, wrapped and measured the
same way. `intro` is one card at the mirror root: `what_it_is` and `how_to_use` as page prose,
`how_it_helps[]` as a bulleted list.

### 4a. The shared paper contract is mandatory

Load `worldwright-paper` before the pull. `PL.zoneFit` counts weighted source lines, not soft wrap:
long encyclopedia paragraphs need wrapping against the actual sheet width and rendered typography,
then ordered pagination. The local `wrap()` and `split()` in the example are helpers you supply;
they MUST implement that contract, not a fixed character column. Keep headings, reference tokens,
whole words and every paragraph. Preflight all body/header/footer bands before replacement; read
back the complete sequence afterward. If a field cannot fit, preserve the source and report it.

## 5. THE MIRROR RULES — what makes it a mirror and not a mess

1. **It is read-only reference.** The author does not write in it; anything typed there is lost on the
   next pull. Say that on the card, in the `Source` section, in the author's own book — that is the
   only warning they will get.
2. **A re-pull rewrites the mirror folder and touches nothing else in the book.** Never a whole-book
   sweep, never a card outside `Encyclopedia/`, never a folder the author made.
3. **Rewrite in place; never purge-and-recreate.** The card id is what `#[id]` references point at —
   destroying a mirrored card breaks every reference the author wrote to it. Match by name, rewrite
   the pages, delete only the surplus pages.
4. **An entry that vanished upstream gets `CARDS.trashCard`, never `purgeCard`** — the row stays so
   `#[id]` still resolves as *Reference In Trash* — and you tell the author which ones and why.
5. **`compile = 0`, folder and cards both.** `CARDS.setFolderCompile(api, bookId, folderId, false)`
   takes the whole subtree out of a whole-book export; `CARDS.setCardCompile(api, bookId, cardId,
   false)` keeps a card out if it is ever moved. Somebody else's reference book must never print
   inside the author's manuscript. (Exporting one explicitly chosen card ignores the flag — asking
   for that card IS the decision.)
6. **Never write the encyclopedia's storage, state, files or UI — in any direction.** No
   `patchState` on `state.encyclopedia`, no `encyclopedia/v1/<userId>`, no `sendAction` of an
   `encyclopedia:*` action, no edit under `mods/annias-encyclopedia/`. If the mirror is wrong, the
   fix is in THIS tree.
7. **EVERY CARD THIS PULL MINTS IS CREATED UNREAD.** A mirror lands 42 cards the author never typed
   — the unread dot is how they find out what arrived. `CARDS.createCard` takes `unread: true` in its
   opts; the dot clears through `CARDS.setCardRead` when the author opens the card, never by us
   pre-clearing it; the overlay's count reads `CARDS.unreadIds`. A re-pull does not re-mark a card the
   author already read: only the newly created ones are unread.
8. **Pull what was asked for.** "Mirror chapter 3" is the same recipe with a one-entry filter, and it
   is the cheaper, likelier ask. 42 cards and ~140 pages is a real database cost (routing §6): mirror
   the whole book once, on request, in one held pass — and never on a timer or a boot.

## 6. Using the mirror in real work

The mirror is a **reference shelf inside the book**, so the author's own cards point at it:
`#[<mirrorCardId>]` in the prose of a design card that leans on a definition. Direction holds — a
mirrored card is an inbound focus: it never chases back the cards that cite it (`REFS.backlinks` is
the free reverse view). And the mirror never gets `#[...]` tokens written INTO its text: its body is
the mod's words, mirrored verbatim, not our editorial.

Search finds mirrored cards like any other (`CARDS.search`) — which is the point: the encyclopedia's
161 terms become findable from inside the book the author is actually writing.

## 7. Failure modes

- Reading `player.state.encyclopedia` for content. It holds a chapter id and a search string.
- `require()`ing the mod's JSON in a game that may not have it — a throw where an empty shelf belonged.
- A second "Encyclopedia" folder because `listFolders` was skipped.
- Mirroring one card per glossary TERM. 161 cards nobody asked for.
- Writing pages unmeasured. Overflow prints past the page band in the author's own editor.
- Forgetting `compile = 0` — somebody else's reference book in the author's export.
- Purging on a re-pull, and taking every reference to it down.
- Any write aimed at the mod: its state, its storage key, its actions, its files.

---

### Maintainer notes — codex-builder dev tree only

- There is **no `lib/` door for this lane yet** — no `encyclopedia.js`, no table, no cached shelf.
  It is a script-side recipe on purpose: one JSON read and CARDS verbs. If it earns repetition (a
  button in the app, a pull on demand), it becomes a read-only reader in `lib/` shaped like
  `lib/assetshelf.js` — `installed()` / `rows()` / `search()`, text-parsed, zero SQL — and never a
  table mirroring the mod's data.
- Verified 2026-08-27 against annias-encyclopedia@1.4.0: `getSpec("mods")["annias-encyclopedia"]`,
  `api.getScript("mods/annias-encyclopedia/lib/data/encyclopedia.json")` (129,622 chars, parses),
  15 chapters / 26 glossary groups / 161 terms, section keys `heading` + `body` only.
- A newer mod version that reshapes the JSON is fixed HERE, in this skill and whatever lane grows
  from it — never by editing the mod.