---
name: worldwright-cinema
description: "Worldwright Studio's cinema desk — film-kit shot lists INTO scene cards, and the shoot lane that hands the compiled clip to Absolute Cinema by ress. Opens with the dependency self-gate (both mods named, credited, presence-checked through spec.mods like SHOOT.dependency). Thread 1, the standing shoot lane, documented not invented: a scene card compiles through lib/shootspec.js + lib/shoot.js and crosses the mod's documented door absolute-cinema:cinema:libImport as JSON TEXT — a compatibility layer like shoot, the one sanctioned outbound hand-off, invoking playback and never storing into the mod. Thread 2, pull-only: film-kit's filmmaking doctrine (shot lists, holds, the edit) is the craft an author PULLS when writing a shootable scene card, and every shoot result — clip name, cast, shot order — files back into the AUTHOR'S OWN BOOK as cards and sections, never into either mod."
---

# Worldwright Studio ▸ cinema

Worldwright Studio is the one space that integrates and coordinates the installed mods — the desk their
material lands on. This lane is the film desk: **film-kit's shot lists come INTO scene cards**, and
the card that results is played back by **Absolute Cinema**.

The creator's direction law, verbatim (2026-08-27):

> "We should integrate film-kit shot lists into scene cards, not the other way around. Same pattern
> for everything else. The idea is to let the Worldwright Studio integrate and coordinate all the mods in
> one space."

And its one exception, his words the same night:

> "So if we need to hand stuff to a mod for it to work, yes we need that... But as a compatability
> layer like shoot."

So: **pull-only, except where a mod needs input to function — and that hand-off is a compatibility
layer shaped like `lib/shoot.js`.** Codex compiles from its own cards, the payload crosses the
partner's *documented* door, credit is given, presence is gated, and nothing of Codex ever reaches
into the mod's internals or storage.

---

## FIRST — separate craft from installed playback

Read current registry presence and the partner's public contract; the versions below are historical baselines, not installation evidence. Cards and local music remain usable with neither partner. Missing Absolute Cinema prevents that camera playback target, not storing/planning a scene. Film Kit craft is readable separately from its installed export target. Never edit Absolute Cinema.


| Mod | Who | What it is here | Without it |
|---|---|---|---|
| **Absolute Cinema** `absolute-cinema` (1.16.0) | **by ress** | the camera director that plays these shots back | this camera playback target is unavailable; cards can still be planned and sets dressed |
| **film-kit** `film-kit` (1.0.0) | its Spawn mod-browser listing names its author — credit it there; Worldwright Studio is not its author | the filmmaking doctrine — shot lists, holds, casting, the edit | the craft skill can still be read; the installed Film Kit export target remains unavailable |

Both install from the Spawn mod browser (`DEP.install` in `lib/shoot.js`: *"Install it from the mod
browser — search 'Absolute Cinema'"*). Worldwright Studio never installs a dependency automatically. An explicit creator request may authorize Savi to install it through the normal mod operation; see `worldwright-mods`. Never vendor either mod, never copy a line
of either, never reimplement a timeline.

**Presence check — `spec.mods`, exactly as `SHOOT.dependency()` does it** (`lib/shoot.js:317`):

```js
const SHOOT = require("mods/worldwright-studio/lib/shoot.js");   // from a host game's scripts/run_script
const dep = SHOOT.dependency(api);
// { id:"absolute-cinema", title:"Absolute Cinema", author:"ress", what, install,
//   version, installed, notice, credit }
if (!dep.installed) return dep.notice;   // credit first, instruction second — say it, do not half-play
```

`dependency()` reads `api.getSpec("mods")` and nothing else — the honest registry, costs nothing.
For film-kit, the same read answers: `api.getSpec("mods")["film-kit"]` → its version string or
undefined. Its craft loads with `use_skill({ skills: ["film-kit#filmmaking"] })` — **which works even before the
mod is installed** (`worldwright-mods`, discovery), so the doctrine is pullable while the runtime is not.

The credit line to show wherever a shoot is reported: `dep.credit` —
*"Playback by Absolute Cinema, a mod by ress."*

---

## THREAD 1 — the shoot lane (documented, not invented)

The ownership split (`lib/shoot.js` header; the full card grammar lives in
`worldwright-cards` §4 — do not re-derive it here):

| File | Job |
|---|---|
| `lib/shootspec.js` | **the grammar** — pure, zero requires. Card words in, `{ sets, placements, shots, effects, switches, activeSet, warnings }` out; `compile()` emits the clip. |
| `lib/cardbody.js` | **the body** — a referenced card's `## Body` section into object properties. |
| `lib/soundspec.js` + `lib/sound-origin.js` | **the sound track** — scene/body sections AND pages into cues with resolved emitters; see `worldwright-sound`. |
| `lib/shoot.js` | **the plan and staging** — repository reads, dressing and dependency-gated hand-off. |
| `cinema-courier.js` | **player playback coordination** — the player-side scene clock and owned audio/subtitle cleanup, separate from the god-seat shell. |

### The Absolute Cinema door

```js
const IMPORT_ACTION = "absolute-cinema:cinema:libImport";   // lib/shoot.js:312
const PLAY_ACTION   = "absolute-cinema:cinema:play";        // lib/shoot.js:313
send(IMPORT_ACTION, { data: JSON.stringify(clip), name: clip.name, replace: true });
send(PLAY_ACTION,   { name: clip.name });
```

- **The payload crosses as JSON TEXT, not as an object.** The director reads
  `input.actionData['cinema:libImport'].data`, `.trim()`s the string and `JSON.parse`s it
  (`mods/absolute-cinema/cinema-director.js:1005-1010`). Hand it an object and you get a silent
  *"Invalid clip data"* toast and nothing else.
- The director is a **player behavior**, like Codex's own shell — the clip goes across as an action,
  never a file, never a clipboard.
- Clip shape (verified against the director's own reader):
  `{ name, nodes:[{id,name,position:{x,y,z},yaw,pitch}], sequence:[{nodeId,hold,transition,easing,ending?}], effects:[{type,time,params}] }`.
  `hold`/`transition` are **seconds**; `transition: 0` is a hard cut.
- **This is invoking playback, not storing into the mod.** Codex writes nothing into
  `cinema_clips`, nothing into the director's state, nothing into its UI. What the director does
  behind its own public door is the director's business.

**This is the ONE outbound hand-off in the whole integration surface.** Every other mod lane in
Worldwright Studio is pure pull. When another lane looks like it needs one, it needs the same shape: the
partner's own documented action, a compiled payload from Codex's own cards, presence-gated, credited
— *"a compatibility layer like shoot."*

### The one call a button makes

```js
const res = await SHOOT.shoot(api, bookId, cardId, {
  send: (name, data) => { /* the caller's own sender — app-shell hands in its (lib/shoot.js:346) */ },
  play: true,        // false = load the clip, do not roll it
  dress: true,       // false = compile only, touch nothing (SHOOT.preview does exactly this)
  place: "main",
});
// → { ok, name, placed, struck, skipped, shots, sets, sounds, seconds, clip, cues,
//     segments, warnings, error, dep, missing }
SHOOT.summary(res);  // one sentence: "6 things on the set, 4 shots, 12.5s."
```

- `SHOOT.status(api, bookId, cardId)` — everything a panel needs before the author commits: the
  dependency shape plus a dry-run scene. Touches nothing.
- `SHOOT.preview(...)` — dry run (`dress:false`, `send:null`).
- `SHOOT.strike(api, place)` — pull the set down. It can only ever destroy objects tagged
  **`sb-set`** (ids prefixed **`sb-set-`**), so a strike never eats the room's own furniture.
- Re-shooting is free and never additive: every `dress()` strikes the last set first. Set cap
  **120** placements, warned loudly, never silently dropped.
- **Refusals are sentences.** `res.warnings` / `res.error` carry them in the author's own words —
  when you drive a shoot, surface them verbatim rather than reporting "done" over grey stand-ins.
  A missing dependency comes back as `res.missing` + *"The set is standing and the shots are ready —
  they just have nowhere to play yet."*

---

## THREAD 2 — film-kit shot lists INTO scene cards

Load `use_skill({ skills: ["film-kit#filmmaking"] })` and write the shot list **as the card**. film-kit's doctrine
is the craft source; the card is where it lands. Nothing is written back to film-kit — its own
contract file (`scripts/lib/data/film.json`, its commands `/film` `/shot` `/cut` `/roll`) belongs to
that mod's own pipeline and **Codex never writes it**.

### The translation table — its shot row, our card

| film-kit shot list | Codex scene card |
|---|---|
| `sets` | a `## Set` section — or `## Set: <name>` for a second set on the same card |
| `shots[].set` | the live set: `#[set: <name>]` inline in the prose switches it mid-scene |
| `shots[].subject` | `#[cam: … on <cardId>]` — the bare card id after `on` |
| `shots[].seconds` | the hold: `\| 3s \|` (default **3s**) — parts split on ` \| ` (also `;`, ` -- `; legacy `·` still reads) |
| `shots[].camera.from/to` | `#[cam: at 4,2,-6 looking at 0,1.5,0 \| 5s]` — a hand-placed camera wins over every framing word |
| `shots[].camera.ease` | `linear · ease · easeIn · easeOut · easeInOut` (`EASINGS`) |
| a cut vs. a move | `cut` (transition 0, the default) vs `blend 1.5` |
| `shots[].card` (title card) | `#[cam: title: FOR THE EMPEROR]` |
| `shots[].lines` / `music` | the `## Sound` section — `#[sound: …]` cue rows, played by Codex's own conductor |
| `cast` | the cards themselves: each `#[cardId]` on the set is the cast member, and the reference earns edges + backlinks for free |
| `lens` (fov) | **does not cross** — the cam grammar has sizes, not focal lengths. Choose the size that reads: `extreme close … establishing` |

### What a shootable card actually carries — verified against what `lib/shootspec.js` reads

`parseScene(card, nameOf)` reads **exactly two things**: `card.sections[{name,content}]` and
`card.pages[{title,header,body,footer}]`. Anything else on the card is invisible to a shoot.

1. **A set section.** Its NAME must be one of `set`, `stage`, `blocking`, `shoot`, `scene set`
   (case-insensitive) — or one of those + `: <name>`. `SET_SECTION_NAMES`, `lib/shootspec.js:59`.
   One placement per line: `#[cardId] at X, Y, Z facing YAW scale N` (`at X, Z` also parses; `hidden`
   skips the piece). Missing position = origin, facing 0, scale 1. A line with no `#[…]` token is
   prose and is skipped quietly — notes live safely inside the set. Cap **200** placements.
   Sets are machine-read blocking: exempt from the sections space law (`worldwright-cards` §1).
2. **Camera tokens in the page prose**, in writing order: `#[cam: …]`, and `#[set: …]` seams
   between them. `parseShots` walks **every page's header + body + footer, in page order**, and
   *then* every non-set section's content — so a shot list written as a section still shoots. Cap
   **200** shots.
3. **A `## Body` section on every referenced card** (`lib/cardbody.js`) — `model` / a primitive /
   `light` / `none`. No body = a **visible grey stand-in** plus a warning naming the card, never a
   hole. `none` is legitimate: the camera can still aim at an empty chair's coordinates.
4. **Optionally a `## Sound` section** — name it `sound`, `audio`, `sfx` or `sound design`
   (`SOUND_SECTION_NAMES`, `lib/soundspec.js:45`). Cues elsewhere are counted, named and **not
   played**. Cap **60** cues.
5. **`#[atmo: …]` in the page prose, ON THE CLOCK** (jace: "moonlit" is a mood | "atmo transitions
   should happen IN PAGE"). The token written at the beat where the light changes IS the setting;
   there is no page or card mood setting for a shoot and none must be written. `TOKEN_RE` walks it
   like `#[line:]`: it rides the shot it is written under (`after`; before the first shot = 0s, as the
   picture starts). `compile()` emits `.moods [{shot, time, raw, atmo: {id, name, source}}]` only when a
   card wrote one, through `opts.atmoOf` (lib/shoot.js lends `KITCHEN.place()`): an exact preset id or
   name is `preset`; ONE shared word (`moonlit` -> Moonlit Night, `snow` -> Snowy / Winter) is `nearest`;
   anything else (or an ambiguous word such as `night`) is `free` with id null and paints nothing | the
   drawer says `"<words>" is noted as the mood; no preset matches it, so the light stays.` once.
   `shoot()` returns `moods` beside `actions`; the paintable rows ride `actions` as `kind: "atmo"`
   (`{time, atmo, patch, blend, raw}`, the kitchen's AtmosphereDef values from
   `lib/data/atmo-presets.yml`). `cinema-courier.js runMoods` fires them on the director's clock,
   snapshots the room's live `getSpec("places.<place>.atmosphere")` the tick the picture starts and
   restores it byte-identically (inverse patch: added keys nulled, changed keys set back) at strike, the
   next Shoot, or the clip's end. Numeric leaves (fog near/far/density, sun/ambient/hemisphere
   intensity, sun pitch/yaw, timeOfDay) tween over `blendSeconds` (2) through runInTicks; sky, fog kind,
   colors and flags cut. A behavior's patchAtmosphere writes the session override layer, never the
   durable spec.

### The doctrine worth pulling (film-kit's, applied to cards)

- **3–8 seconds is a normal hold**; a hero landscape holds 12; under 2 is a cut, not a shot.
  The card's default hold is 3s — write the number when the beat wants a different one.
- **Six to eighteen shots is a film; three is a scene.** A scene card should read as a scene.
- **Still shots are legal and often better.** A card where every `#[cam: …]` blends reads as a
  screensaver — `cut` is the honest default.
- **Frame FOR the subject.** `on <cardId>` aims at a thing on the LIVE set; a shot aiming at
  something that is not on it keeps the previous camera and says so in a warning.
- **Trim before you add.** "The middle drags" is fixed by cutting holds, not by writing shots.
- **Roll it and LOOK** — a `look` at real frames mid-shot. A card that compiles clean can still
  dress a grey void.

---

## Filing the shoot back — into the AUTHOR'S OWN BOOK, never into a mod

A shoot's results are Codex's material the moment they exist. They land as **cards and sections in
the author's own book** — the sanctioned landing zone — and nowhere else.

```js
const CARDS = require("mods/worldwright-studio/lib/cards.js");
CARDS.holdIndex();                                    // one re-index for the whole filing
try {
  const secId = await CARDS.createSection(api, bookId, cardId, { name: "Shot log" });
  await CARDS.setSectionContent(api, bookId, secId,
    // SPACE LAW: a few short lines, never paragraphs (worldwright-cards §1)
    'Clip "' + res.name + '" — ' + res.shots + ' shots, ' + res.seconds + 's, '
    + res.placed + ' on set.\n' + SHOOT.summary(res));
} finally {
  await CARDS.flushIndex(api);                        // always in a finally
}
```

What files where:

| The result | Where it goes |
|---|---|
| clip name, shot count, runtime (`res.name`, `res.shots`, `res.seconds`) | a short **section** on the scene card — "Shot log", 2–4 lines |
| the **cast** | already filed: every `#[cardId]` on the set is a live reference, so the graph has it. Do not re-list names in prose. |
| **shot order** as an edit decision | a **page** on the scene card, or its own card in the same folder — measure with `PL.zoneFit` against the book's page spec before every page write (THE PAGE LAW, `worldwright-cards` §1) |
| warnings the author must act on | speak them; file the *decision* they produce, not the log |
| a take worth keeping beside another | `CARDS.createStackFrom(...)` — an alternate in the stack, the original stays primary |

**A card this lane MINTS is created unread** — a shot-order card the author did not type wears the
unread dot until they open it: `CARDS.createCard` takes `unread: true` in its opts, `CARDS.setCardRead`
is the clearing verb (the author's move, never ours), and `CARDS.unreadIds` is what the overlay counts.
A section added to a card the author already owns is not a mint and gets no dot.

Folders are **arcs > chapters > scenes** and a shoot log files under the scene it belongs to — never
dumped at book root. Compile Y/N on the book, folder and card is what gates export: a shot-log card
that is production notes, not manuscript, is filed **compile: N**.

---

## The fences — what this lane never does

- **Never edits a partner's private storage, runtime or UI.** Two supported outputs exist:
  Absolute Cinema's documented import/play pair, and Film Kit's host-owned film.json contract
  in Thread 3. Neither permits editing the partner package or copying its player. Each target
  has its own dependency gate; Film Kit output is not a replacement camera runtime.
- **Never wraps or replaces a mod's UI.** Absolute Cinema's own panel stays Absolute Cinema's.
- **Never reimplements playback.** Codex owns no camera director and will never grow one
  (`lib/shoot.js` §THE DEPENDENCY, jace 2026-08-23: *"Credit where credit is due!"*).
- **Never half-plays.** No dependency → show `dep.notice`, keep the set standing, say exactly what
  is missing.
- **Never invents an action name.** Only the partner's documented, namespaced doors.

---

## THREAD 3 — the film-kit target (landed; same compiler, second documented door)

His note, verbatim: *"In fact, I think we could use shoot for film-kit as well."* It is built. The
shoot compiler now emits **two** shapes from **one** card read — nothing about Thread 1 changed.

**One read, two emitters.** `SPEC.parseScene(card, nameOf)` parses the card once;
`SPEC.compile(scene, opts)` dresses that parse as Absolute Cinema's clip, `SPEC.emitFilm(scene, opts)`
dresses the SAME parse as film-kit's rows (`lib/shootspec.js` header, and `poolsOf(scene)` is the one
placement pooling both emitters read — they must never disagree about where a thing stands). **A
third target is a third emitter plus a `DEP` row — never a second card reader.**

**film-kit ships no scripts**, so the door is a FILE, not an action: `scripts/lib/data/film.json` —
the contract every `/film` `/shot` `/cut` `/roll` reads and writes, in the **host game's** tree.

```js
const SHOOT = require("mods/worldwright-studio/lib/shoot.js");

SHOOT.FILM_DEP        // { id: "film-kit", title: "film-kit", author: "", what, creditVerb, install }
SHOOT.FILM_CONTRACT   // "lib/data/film.json"      — the getScript/setScript key
SHOOT.FILM_PATH       // "scripts/lib/data/film.json" — the tree path it IS
SHOOT.filmDependency(api)                 // presence out of spec.mods, same gate as dependency()
SHOOT.filmStatus(api, bookId, cardId)     // is film-kit here, what is in its file, what this card emits — nothing written
const res = await SHOOT.film(api, bookId, cardId, { place: "main", write: true });  // write:false = dry read
SHOOT.filmSummary(res);   // "4 shots, one set, 12.5s, 4 replaced in scripts/lib/data/film.json."
```

- `SHOOT.readFilm` / `SHOOT.mergeFilm` / `SHOOT.landFilm` are the three stages `film()` runs;
  `SHOOT.emptyFilm()` is film-kit's own documented empty shape `{ title, family, sets, cast, shots }`
  — a file this lane creates starts exactly there and gains **nothing beyond the shots it compiled**.
- **`FILM_DEP.author` is `eva`, verified against the public mod listing on 2026-09-14. Previously it was empty.** film-kit's own skill names no author, and a guessed
  credit is worse than none (*"credit where credit is due"*). Say "film-kit" and point at the mod
  browser; if the listing names a person, credit the person.
- **The merge is keyed, not appended.** A re-shoot of the same card replaces that card's rows
  (`res.replaced`) instead of stacking duplicates; a `film.json` that is present but not readable
  film-kit JSON is **refused with a sentence and nothing is written**.
- **This lane writes that one file and nothing else** — never a command, never an internal, never a
  copy of film-kit's runtime. Codex compiles FROM its own cards and crosses THERE. Thread 2 above
  still holds for the craft: the doctrine comes IN, the shot list lives on the card.

*The two targets are the same shape, twice: compile from our cards, cross a documented door, credit
first, gate on `spec.mods` (`worldwright-mods`, integration boundary).*