---
name: worldwright-atmosphere
description: "Worldwright Studio location Looks and mood tags — durable card prose/marks work without Atmosphere Kitchen; its optional guide/picker supplies vocabulary. Pull recipes onto author-owned cards, distinguish stored mood from applied world lighting, and never edit the partner."
---

# Worldwright Studio ▸ the LOOK of a place

The creator's direction, verbatim (2026-08-27):

> "We want Worldwright Studio to pull from the mods. Not put anything into them."

> "We should integrate film-kit shot lists into scene cards, not the other way around. Same pattern
> for everything else. The idea is to let the Worldwright Studio integrate and coordinate all the mods in
> one space."

So this lane runs one way: **Atmosphere Kitchen presets INTO location cards.** Worldwright Studio is the
desk the kitchen's material lands on. Applying an atmosphere to a running world is the host Savi's
ordinary work and always was — this skill is about the **CARD being the durable record of the
choice**, written in the kitchen's vocabulary.

**THE SEAM:** a location card should carry its LOOK, so **the place can be rebuilt from the card
alone.** A card that says *"the drowned market"* and nothing else gets rebuilt in a different
weather every time. A card carrying `Horror Fog · exp2 0.025 · cold blue-green` gets rebuilt the way
the author saw it, by any Savi, in any game, a year later.

---

## FIRST — THE DEPENDENCY. Credit first, instruction second.

Worldwright Studio owns stored mood words and marks, not a competing atmosphere cookbook. Read the current partner listing/guide for fresh recipes; the following identifies the historical baseline:

| | |
|---|---|
| id | `atmosphere-kitchen` |
| title | **Atmosphere Kitchen** |
| author | **spawn** |
| version this lane was written against | **1.0.0** |
| what | twelve ready-made moods — sky, fog, sun and light — plus the cycles between them |
| install | "Install it from the Spawn mod library — search “atmosphere kitchen”." |

— a **separate optional mod** (`lib/data/supported-mods.yml`,
`usedBy: "Atmospheres"`). Never copy its recipes into our code, never vendor it, never reimplement
it. WWS never installs it automatically; an explicit creator request may authorize a normal mod installation.

**The presence check — the same shape `lib/shoot.js`'s `dependency()` uses for absolute-cinema:
`spec.mods`, the one honest answer, and it costs nothing.**

```js
const KITCHEN = require("mods/worldwright-studio/lib/atmokitchen.js");
const version = KITCHEN.installed(objectApi);      // "" | "1.0.0" — one getSpec("mods") key, no cache, no db
if (!version) {
  // Credit first, instruction second — say whose it is, then where it comes from.
  // "The moods come from Atmosphere Kitchen by spawn — twelve ready-made looks. It is a separate
  //  mod, not part of Worldwright Studio. Install it from the Spawn mod library — search “atmosphere kitchen”."
}
```

**Without it installed, the OFFERING is what goes quiet — not the lane.** `atmosphere-kitchen@1.0.0`
was a guide-only baseline; verify the installed package before describing its current internals. WWS's native vocabulary lives in **our own** `lib/data/atmo-presets.yml`, and every mood written on a card
is **Worldwright Studio's own row** in its own `atmo_marks` table. So moods already written keep
painting, keep searching and keep exporting whether the mod is there or not; what a missing mod costs is the optional picker's list. Readable craft can still inform a requested Look; ordinary mood text is never gated. Say that plainly rather than refusing.

**This lane hands the kitchen NOTHING.** A sanctioned hand-off elsewhere is *a compatibility
layer like shoot* — Codex compiles from its own cards and passes the payload through a partner mod's
own documented door (`lib/shoot.js` → absolute-cinema's import action), for a mod that needs input to
function. The kitchen needs no input: it is a cookbook. **Pure pull.**

---

## SECOND — THE GATE. Filing a Look is a WRITE.

Reading the kitchen, reading a card, quoting a mood back: never fenced. **Writing the Look section
is a card write** — run the access check at the top of `worldwright-routing`
(**FIRST — WHO MAY WRITE**) first: the asker is on the shelf's allow list, or is this game's creator
(who can never be locked out), or you do not write — you say the mood out loud and name who can
grant it. In the pinned **Codex** book the mood verbs refuse exactly the way a rename refuses
(*"the Codex book is read-only — it is written for you, not in the app"*); write it through the
authoring lane in `worldwright-routing` §1b.

---

## 0. The modules and the vocabulary (real names — nothing here is guessable)

```js
const CARDS   = require("mods/worldwright-studio/lib/cards.js");       // the repository — the mood verbs live here, fenced
const KITCHEN = require("mods/worldwright-studio/lib/atmokitchen.js"); // the ONLY file that knows the mod
const REFS    = require("mods/worldwright-studio/lib/refs.js");        // #[atmo:…] tokens, chips, backlinks
```

- `KITCHEN.presets()` → 12 rows `{ id, name, mood }`; `KITCHEN.transitions()` → 2.
- `KITCHEN.resolve(token)` → the row, or **`null`** — and null is **not a failure**: free text is
  first class (his ruling). `KITCHEN.label(atmo)` is what shows; `KITCHEN.moodOf(atmo)` is the
  one-line description; `KITCHEN.slug(v)` normalizes.
- **The recipes themselves are the mod's, not ours.** Load them from the mod's own skill —
  `use_skill("atmosphere-kitchen#atmosphere-kitchen")` — which works **even before the mod is
  installed**. That is where the `patchAtmosphere` blocks, the OKLCH guide and the lighting rules
  live. Do not re-derive them here.

| preset id | name |
|---|---|
| `sunny-day` | Sunny Day |
| `golden-hour` | Golden Hour / Sunset |
| `overcast` | Overcast / Cloudy |
| `moonlit-night` | Moonlit Night |
| `horror-fog` | Horror Fog |
| `neon-night` | Neon Night / Cyberpunk |
| `desert-heat` | Desert Heat |
| `underwater` | Underwater |
| `snowy-winter` | Snowy / Winter |
| `enchanted-forest` | Enchanted Forest |
| `volcanic` | Volcanic / Hellscape |
| `space-alien` | Space / Alien Planet |
| `day-night` | Day/Night Cycle *(transition)* |
| `weather` | Weather transition *(transition)* |

---

## 1. THE RECIPE — kitchen vocabulary onto a location card

1. **Read the kitchen.** `use_skill("atmosphere-kitchen#atmosphere-kitchen")`. Pick the preset whose
   recipe the place actually wants — by the author's words on the card, not by the place's name.
2. **Write the LOOK section** on the location card (shape in §2).
3. **Mark it machine-side**, so chips, search and export can see it:
   `await CARDS.setSectionAtmo(api, bookId, sectionId, "horror-fog")` — a preset id **or** the
   author's own words (`"dusk closing in"`, capped at `ATMOS.ATMO_MAX` = 240). Empty words CLEAR the
   mark: one door for set and unset. A page carries one the same way — `CARDS.setPageAtmo`.
4. **Turn the weather inside the prose** with the inline token: `#[atmo:horror-fog]`, or
   `#[atmo:the bruised violet of a dying storm]`. Same one token system as every other reference —
   never `[[Name]]`, never `{{tag}}`. The tokens are harvested out of section and page text on the
   same read that feeds search (`REFS.atmoTokens` in `lib/cards.js`), so a token costs no query of
   its own; the picker offers them from a grammar row typed as `atmo:`.
5. **One hold around the whole card**, as always:

```js
CARDS.holdIndex();
try {
  const look = await CARDS.createSection(api, bookId, cardId, { name: "Look" });
  await CARDS.setSectionContent(api, bookId, look, lines);   // 4 short lines — SPACE LAW
  await CARDS.setSectionAtmo(api, bookId, look, "horror-fog");
} finally {
  await CARDS.flushIndex(api);
}
```

**If the place has no card yet, the card Savi mints is created UNREAD** — `CARDS.createCard` takes
`unread: true` in its opts, so a location card the author did not type wears the unread dot until they
open it. The clearing verb is `CARDS.setCardRead` (the author's move, never a pre-clear of ours); the
overlay's count reads `CARDS.unreadIds`. A `Look` section added to a card the author already owns is
not a mint and gets no dot.

---

## 2. WHAT GOES IN THE LOOK — the name, and the few numbers that matter

A **`Look`** section is an author note, not a page: **THE SPACE LAW applies** (`worldwright-cards`
§1 — a few short lines, never paragraphs). It is not a machine-read section like `Set`, so it gets
no size exemption. Four lines, and the sensory prose goes on a **page** where prose belongs.

```
## Look
Horror Fog (horror-fog) — cold blue-green, no clouds, no stars.
Time: low pale sun, pitch 15. Fog: exp2, density 0.025.
Palette: horizon 0.30/0.02/200, zenith 0.18/0.03/220, ambient 0.55.
Never at noon; the market is only ever seen through it.
```

- **Line 1 — the name and the id**, then the mood in the card's own words. The id is what
  `KITCHEN.resolve` reads back; the words are what the author recognises.
- **Line 2 — time and fog.** Sun pitch (0 = horizon, 90 = overhead) and the fog kind with its one
  number: `linear near/far`, or `exp2 density`.
- **Line 3 — palette.** Horizon, zenith and ambient as OKLCH triples. Three colours rebuild a sky;
  a full preset block does not fit a section and does not need to — the recipe is the kitchen's.
- **Line 4 — the constraint**, if there is one. *"Never at night."* That is the line a build six
  months from now will thank the card for.

**Record the kitchen's rules, do not re-derive them.** Ambient ≥ 0.5 always, night is cool moonlit
blue and never darkness, fog colour matches the horizon — those are the mod's own lighting laws and
they live in its skill. The card carries the CHOICE; the kitchen carries the craft.

**Free text is a first-class mood.** When the author's words are the truth of the place and no
preset fits, write the words: `#[atmo:the green hour before the tide]`. `KITCHEN.resolve` answers
null, the chip paints as free rather than preset, and the mark is stored exactly the same. Never
force a place into a preset it is not.

**A mood you are not sure of is an OpenQ, not a guess** — `CARDS.setMeta(api, bookId, cardId,
{ openQuestion: true })` plus a short `OpenQ` section (`worldwright-cards` §1).

---

## 3. LOCATIONS ARE AN INBOUND FOCUS — so the Look must ride the CARD

The graph's law (`worldwright-research-walk` §2): **characters, locations, items and factions are
INBOUND foci — edges point one-way AT them, and the TIMELINE is the one OUTWARD focus.** A location
card's own refs-out come back near-empty *by design*; its context is what points at it.

Two consequences for this lane:

- **The weather belongs on the location card itself, never only in the scene that mentions it.** A
  scene card is reached from the timeline; a location is reached by **backlinks**. Put the Look on
  the place, and every scene that references the place inherits a rebuildable sky. Put it only in
  one scene's prose and it is invisible to the next build.
- **When you build from a location card, run the backlinks pass** — it is mandatory for an inbound
  focus: `REFS.backlinks(api, { projectId, bookId, cardId, primaryId })`, passing `primaryId` when
  the card on screen is a stack member. Scenes set in that place may carry inline `#[atmo:…]` marks
  that argue with the card's Look; when they disagree, the location card's Look is the standing
  weather and the scene's inline token is the exception, in that scene, for that beat.

**Filing** (THE FILING LAW, `worldwright-research-walk` §5): a location written into Research files
into **Locations** — scope first (the per-book subfolder for a book-specific place, the root rung for
a global one), never at the book root, never a new root folder. Reach it by name, never by a guessed
id: `RESEARCH.folderIdNamed(api, "RESEARCH0BOOK", "Locations")` → `CARDS.listFolder`. In the author's
own book the card files into **the author's own defined folders** (arcs › chapters › scenes) — the
Look section rides whatever card the place already has; do not mint a parallel "Atmospheres" folder.

**And the two halves stay split by kind, not by subject** (`worldwright-research-walk` §4): the
story card gives the **FEELING** — the Look is feeling, made precise. The Codex's **Level Design**
card gives the **SHAPE** — blockout, flow, sightlines. The same place legitimately has both; the
weather goes with the feeling.

---

## 4. READING IT BACK — rebuilding the place from the card

```js
const marks = await CARDS.listAtmos(api, bookId, cardId);
// { sections: { sectionId: atmo }, pages: { pageId: atmo }, inline: [ { atmo, sectionId, pageId, pos } ] }
const row = KITCHEN.resolve(marks.sections[lookSectionId]);   // row | null
```

- `row` → you have the preset name and id: open the kitchen's skill, take **its**
  `objectApi.patchAtmosphere({ … })` recipe for that preset, and adjust it toward the card's own
  numbers (fog density, sun pitch, the three OKLCH triples). Applying it to the place is ordinary
  world-building work — it belongs to the host Savi and to `patchAtmosphere`, not to this app.
- `row === null` → the author's own words are the brief. Use the current atmosphere craft and the creator's chosen hour/palette, keeping the scene readable
  with appropriate light rather than imposing a fixed ambient floor. Then, if it is
  worth keeping, **write the numbers you cooked back onto the Look line 2–3.** That is the card
  earning its keep: the second rebuild does not re-guess the first.
- **Search finds every place a mood is used** — the search report carries an Atmospheres group
  (`report.atmos`, one statement per run, `ATMOS.usage`). *"Where else is it Horror Fog?"* is one
  search, and it is how a world stays consistent across fifty cards.

---

## 5. THE FENCES — what this lane never does

- **Never write into Atmosphere Kitchen.** Its internals may vary by version; any partner-owned storage or state is still not ours. Its files under `mods/atmosphere-kitchen/`
  are read-only reference; never edit one, never patch one, never add a preset to one.
- **Never wrap or reimplement its UI or its recipes.** Load its skill and quote the recipe you used
  into the card. The transcription in our `lib/data/atmo-presets.yml` is a vocabulary list —
  ids, names and one-line moods — not a copy of its cookbook.
- **Pulled material lands in the author's own book, as cards.** That is the sanctioned landing zone:
  a section on a card, a mark in `atmo_marks`, a token in prose. Nothing else.
- **Never install implicitly.** Explain what the optional picker adds; install/update only on an explicit creator request via the normal mod operation. Credit the current listing.
- **Never claim a mood the author did not choose.** If nobody said what the place looks like, the
  Look section is an OpenQ, not your taste written down as canon.