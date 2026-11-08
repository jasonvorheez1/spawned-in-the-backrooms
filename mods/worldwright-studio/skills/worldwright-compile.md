---
name: worldwright-compile
description: "THE COMPILE — a folder designated 'cinematic' or 'level' is a prose design doc whose cards speak #[…] directives, and a Compile press reads the whole folder ONCE, shows the author what CHANGED (added / changed / removed / kept + warnings) before anything lands, then lands it through one adapter contract per mod. Written for a Savi: the folder flag and its verb (CARDS.setFolderDoc / docFlag / DOCS), the full token grammar with real spellings (#[asset:] #[cam:] #[shot:] #[atmo:] #[sound:] #[pose:] #[line:] #[score:]), the lane row shape and how to ADD a mod lane (installed/planLane/landLane in a lib/ file, WWS-owned modules only; never require partner code, including inside a gate), the compile_state manifest, the plan/land shapes, the laws that bind every lane (mods never edited, per-target active law, read a mod's storage as text, the db is a cost), where the switch lives for the author (the folder's METADATA pane — Doc row Story/Cinematic/Level, Compile beneath), and how to drive the same COMPILE.compilePlan / COMPILE.compileLand verbs from chat instead of pressing it."
---

# Worldwright Studio ▸ THE COMPILE

The creator's direction, verbatim (jace, 2026-08-28):

> "We will want a cinematic folder... We can add a flag to it. I'd like to be able to define a scene,
> set up the props referenced through assets, and the poses, and all that. Not just cinema. So level
> design will be a prose design doc. Eminently tweakable by the user if they want."

> "A compile would be good for the user to see what changed. This is collaborative. So this system is
> meant to help you too by keeping the logic you need for each mod consistent and simple."

**That second sentence names YOU.** This lane exists so that every mod you have to speak to — the
camera director, the shelf, the kitchen, the posing bench — is reached the same way: one row, three
functions, one diff. You do not learn a new hand-off per mod. You learn this page once.

**THE PROSE IS THE SOURCE OF TRUTH.** Nothing is baked. A folder's cards are the design doc; the
compile derives everything from the words, and `compile_state` remembers only what LANDED so the next
press can say what changed. Delete that memory and the next plan simply reports the whole folder as
new. The author tweaks the prose and recompiles — that is the whole workflow.

---

## 1. THE FLAG — a folder wears a designation

A folder carries **`doc`**: `''` (**Story** — plain prose, compiles nothing; his ruling 2026-08-28:
"Plain and story ate the same") · `'cinematic'` · `'level'`. Column in `folders`, written by one
verb, read off the row every listing already holds.

| Surface | Shape |
|---|---|
| `CARDS.DOCS` | `["", "cinematic", "level"]` — the vocabulary, `lib/cards.js:2615` |
| `CARDS.docFlag(v)` | any word → one of the three. **An unknown word lands as `''`**, never a throw and never a guess |
| `CARDS.setFolderDoc(api, bookId, folderId, doc)` | the write. → the designation that actually landed |
| `CARDS.folderDoc(api, bookId, folderId)` | the read, off `getFolder` |
| every folder row | carries **`.doc`** already (`shapeFolder`, `lib/cards.js:2549`) — a tile, a tree walk or `CARDS.getFolder` answers the designation with no second query |

The two SQL statements behind it live in `lib/store.js`'s book statement set: **`folderSetDoc`**,
**`foldersDoc`**. Never write that UPDATE by hand — schema is the data dictionary (§8).

`COMPILE.KINDS` is `["cinematic", "level"]` — the two designations that compile. `''` is not an
error state; it is the default (the UI calls it **Story**), and a plan on a story folder comes back
with one sentence saying so.

## 2. THE TOKEN GRAMMAR — one bracket system, eight kinds

**ONE reference system** (his ruling, 2026-08-26: *"We do not want multiple tag/reference systems"*).
Every directive is `#[name: value]`, `lib/refs.js` is the only lexer, and **no lane invents grammar.**
The lexer's source is `REFS.TOKEN_SOURCE` = `#\[([^\[\]]{0,240})\]` — a token can never nest another.
`REFS.parseToken(inner)` → `{ raw, name, value, params }`; `REFS.resolveSegments(api, text, opts)` is
what the compile walks, and each directive segment comes back with a `kind`:

| Written | `seg.kind` | Owning lane | What it says |
|---|---|---|---|
| `#[asset: Market Stall]` | `asset` | Level | a prop off the asset shelf. **This IS the prop token** — never mint a second one |
| `#[cam: close on <cardId> \| 3s \| blend 1.5]` | `cam` | Cinema | a shot. `REFS.camTarget()` reads the id after `on`; parts split on ` \| ` (also `;`, ` -- `; legacy `·` still reads) |
| `#[shot: <clipName>]` | `shot` | Cinema | a clip already in Absolute Cinema's vault |
| `#[set: Throne Room]` | (shootspec) | Cinema | cuts the live set inside a scene card (`lib/shootspec.js`) |
| `#[atmo: dusk storm]` | `atmo` | Atmosphere | the mood the scene is lit by. `REFS.atmoTokens()` finds them |
| `#[atmo: moonlit]` ON THE CLOCK | `atmo` | Cinema (shoot) | inside a scene card the same token is ALSO a light change at the shot it is written under (`lib/shootspec.js` TOKEN_RE walks it like `#[line:]`; `compile()` emits `.moods [{shot, time, raw, atmo: {id, name, source: preset \| nearest \| free}}]` through `lib/atmokitchen.js place()`). A preset id/name paints that preset; one shared word (`moonlit` -> Moonlit Night) paints the nearest; free text paints nothing and the Shoot drawer says so once. The courier (`cinema-courier.js runMoods`) snapshots the room's live atmosphere the tick the picture starts and restores it byte-identically at strike, the next Shoot, or the clip's end. No page or card mood setting exists for this (jace: transitions happen IN PAGE) |
| `#[sound: rain-loop on 02 loop]` | `sound` | Cinema | a cue, parsed by `SOUND.parseCue` (`lib/soundspec.js`) |
| `#[pose: Guard Stance on <cardId>]` | `pose` | — | Reference-only; Compile warns that it is not applied. Pose/keyframe the model in Asset Studio and use its exported GLB. `REFS.poseParse()` preserves the annotation. |
| `#[line: <cardId>: Hold the door.]` | `line` | Cinema | a spoken line, written `Name: words` (or ` - `). `REFS.lineParse()` also still reads legacy `—` / `–` — keyboards have no em dash, so nothing we write uses one |
| `#[score: dirge-strings on 03 loop]` | `score` | Cinema | music under the picture — **the same cue grammar** as `#[sound:]`, `SOUND.parseCue` again |
| `#[<cardId>]` | `ref` | — | a plain card reference. Not a directive; the compile skips it |

Predicates, when you need to test one token: `REFS.isAssetToken` · `isShotToken` · `isAtmoToken` ·
`isSoundToken` · `isCamToken` · `isPoseToken` · `isLineToken` · `isScoreToken`. Glyphs the chips
paint with: `POSE_GLYPH` ⚘ · `LINE_GLYPH` ❝ · `SCORE_GLYPH` ♬ (`CAM_GLYPH` ▣, `SOUND_GLYPH` ♪,
`ATMO_GLYPH` ◐, `SHOT_GLYPH` ▶, `ASSET_GLYPH` per asset kind).

**Two rules that keep this one system:**

1. **A new kind of thing does not get a new bracket.** If a mod needs input the grammar cannot say,
   the answer is a value inside an existing token — never `<<…>>`, never `@thing`, never a second
   `#[asset:]` twin under a prettier name.
2. **One token, one parser.** `#[line:]` is read by `REFS.lineParse`; `#[score:]` and `#[sound:]` by
   `SOUND.parseCue`; `#[pose:]` by `REFS.poseParse`. A lane that re-derives a grammar it does not own
   is how two spellings are born. `lib/shootspec.js` records `#[line:]`/`#[score:]` RAW with the shot
   they sit under and lets those parsers do the reading.

## 3. THE PLAN — what changed, before anything lands

```js
const plan = await COMPILE.compilePlan(api, bookId, folderId);   // lands NOTHING
```

```
{ v, bookId, folderId, kind, folderName, cards, tokens,
  counts: { add, update, remove, keep },
  landedAt, landedBy, warnings: [ … ],
  lanes: [ { id, name, modId, modBy, what, installed, version,
             counts: { add, update, remove, keep }, warnings: [ … ],
             items: [ { op:'add'|'update'|'remove'|'keep', what, detail, warn, key, sig, payload } ] } ] }
```

- **`op` comes from one diff** (`COMPILE.diffLane`): a key the manifest never held is **add**; the
  same key with a different `sig` is **update**; same sig is **keep**; a key the manifest holds that
  the prose no longer says is **remove** — the author deleted a line, and a compile that silently
  left it standing is the surprise this feature exists to kill.
- **`sig`** is the lane's own signature of the line (the level lane hashes asset + path + position +
  yaw + scale + solid + pose). Everything that should trigger a re-land belongs in it; everything
  that should not (a mood, a comment) stays out.
- **`payload`** is the row the lane would write. A UI that strips payloads makes `compileLand` say
  "press Compile again" rather than guess — pass the plan through whole.
- `COMPILE.summary(plan)` → *"4 added, 1 changed, 2 unchanged · 3 cards"* — the one-line notice.
- A plan on an undesignated folder, a folder with no cards, or a folder whose cards speak no
  directive returns with a `warnings` sentence and empty lanes. That is a complete answer, not a
  failure.

## 4. THE LANDING

```js
const res = await COMPILE.compileLand(api, plan, { actor, landedAt, targets, send, play });
```

```
{ ok, bookId, folderId, kind, landed, skipped, landedAt, warnings: [ … ], error,
  lanes: [ { id, name, modId, installed, landed, skipped, warnings: [ … ], error } ] }
```

- Lanes run **in registry order**, each handed only its own items. **A lane that throws is NAMED and
  the rest still land** — one broken mod may not take the compile with it.
- `targets` is ONE map for the whole press: a lane that stands a body up writes its id there and a
  later lane (poses onto the props the level lane just placed) finds it. Pass your own `{}` only if
  you want to read it after.
- `send(actionName, data)` is how a lane reaches a mod that listens on an ACTION rather than a file
  (`lib/shoot.js` → `absolute-cinema:cinema:libImport`, JSON **text**). Without one, that half says
  so in its own sentence and the rest still lands. `play: true` asks for playback after import.
- `landedAt` is the caller's clock — **this file never reads a wall clock.** The app's press uses the
  house clock (`LIB.nowMsSync` / `LIB.nowMs`, `lib/library.js`, as `app-shell.js`'s
  `compileLandPress` does); from a run_script pass the same kind of stamp or `0`.
- `COMPILE.compileForget(api, bookId, folderId)` erases the memory of a press. The prose is untouched;
  the next plan reports the whole folder as new.

## 5. `compile_state` — the manifest

One row per **(book, folder)** — DDL in `lib/schema.js`, statements in `lib/store.js`, and the table
is in `lib/uninstall.js`'s `TABLES` (it goes with the app, never with a mod):

```
compile_state (bookId, folderId, kind, manifest TEXT, landedAt INTEGER, landedBy TEXT)
```

Statement set: **`compileStateGet` · `compileStatesAll` · `compileStateSet` · `compileStateClear` ·
`compileStateDeleteAll`**. `manifest` is `COMPILE`'s own JSON:

```
{ v, kind, folderId, lanes: { <laneId>: { <itemKey>: { what, detail, sig, landed? } } } }
```

- **It records what the prose SAYS after a press, not what a mod acknowledged** — a lane that skipped
  because its mod is absent must not read as a *removal* next time.
- `landed` is the half the prose cannot supply: what the lane actually put in the world for that line
  (an object id, the position it stands at). It is how a plan can ask *"is the thing still where we
  left it"* and not only *"did the words change"* — that is what produces the hand-moved warning.
- **No row = nothing has ever landed.** `COMPILE.manifestOf(api, bookId, folderId)` reads it; it is
  never a cache of the prose.

## 6. THE ADAPTER CONTRACT — one row per mod

`COMPILE.LANES` (`lib/compile.js`) is the registry. Every row answers the same questions:

```
{ id, name, file, modId, modBy, what, kinds: [tokenKind], docs: ['cinematic'|'level'],
  installed(api), plan(ctx), land(ctx) }
```

Shipping today (`COMPILE.laneRow(id)` fetches one):

| id | file | mod | kinds | docs | state |
|---|---|---|---|---|---|
| `cinema` | `lib/shoot.js` | `absolute-cinema` **by ress** (+ film-kit) | cam, shot, line, score, sound | cinematic | one folder compiles as ONE film: `installed` / `planLane` / `landLane` |
| `level` | `lib/levellane.js` | ours — asset rows come from `asset-library` | asset | level | `installed` / `planLane` / `landLane`; props stand up in the world |
| `atmosphere` | `lib/atmokitchen.js` | `atmosphere-kitchen` | atmo | cinematic, level | **read-only by design**: the plan SHOWS a mood change, the mood rides the scene it is written in |

**The lane module's three exports** (`lib/levellane.js` is the placement exemplar;
`lib/shoot.js` §7 is the big one):

```js
installed(api)   // -> { installed, version, notice }   — cheap, off api.getSpec("mods"), no db
planLane(ctx)    // -> { items: [{ key, what, detail, sig, warn, payload }], warnings: [] }
landLane(ctx)    // -> { landed, skipped, warnings: [], error, manifest? }
```

`plan` ctx: `{ api, bookId, folderId, kind, folderName, lane, cards, tokens, installed, prev, cache,
warnings }` — `tokens` are already filtered to the lane's `kinds`, `prev` is the lane's slice of the
manifest, `cache` is the ONE shared read cache for the press.
`land` ctx: `{ api, bookId, folderId, kind, lane, plan, items, live, targets, send, play, installed,
warnings }` — `live` is `items` minus the removes.
`planLane` may be sync or async (the orchestrator awaits either); `landLane` is awaited.

### Adding a lane — the whole recipe

1. **Write `lib/<mod>lane.js`** exporting the three functions. Zero SQL (cards arrive on `ctx.cards`),
   zero module-scope knowledge of the mod beyond its id.
2. **Add its row** to `LANES` and its `require` line to `laneFile(id)` — the file is required **by
   literal path AT CALL TIME**, so a lane still being built costs a sentence in the plan
   (*"…lane has no file yet"*), never a boot error in the app.
3. **`kinds`** must be kinds `lib/refs.js` already emits (§2). If yours is not there, you are adding
   grammar — stop and read law 2 again.
4. **`docs`** decides which designations run it.
5. **Credit the mod in the row** — `modId` + `modBy`. The window prints *"Absolute Cinema — by ress"*
   and, when it is absent, says Worldwright Studio cannot install it for you.

**Nothing else in `lib/compile.js` moves.** That is the point of the contract, and it is the promise
his sentence made to you: the logic you need for each mod stays consistent and simple.

## 7. THE LAWS EVERY LANE IS BOUND BY

1. **MODS ARE NEVER EDITED — AND NEVER REQUIRED.** All adapter code lives in our tree, and
   `require('mods/…')` is outlawed everywhere in it — module scope, call time, gated, all of it (his
   2026-09-01 law: *"no hard requires… only soft connections and compatibility layers. No stealing
   code"* — and no transcribing a partner's internals to dodge the require). Soft reads only:
   `getScript` as text, `spec.mods` for presence, a published action for hand-offs. A mod with no
   walkable soft door must report a quiet pending result, never a false success.
2. **Read a mod's storage as TEXT.** The exemplar is `lib/assetshelf.js`: `getScript` + parse + cache,
   quiet empty when the mod is absent, **never a throw**. You read their file; you do not import their
   runtime.
3. **Hand a mod input only through its own documented door**, and only where it needs input to
   function. The exemplar is `lib/shoot.js`: a JSON **text** payload over the action
   `absolute-cinema:cinema:libImport`. Credit first, install instruction second; never vendor,
   never reimplement.
4. **THE PER-TARGET ACTIVE LAW.** A lane with more than one target is active when **any** of them is
   installed and waiting only when **none** is. The cinema lane's `installed(api)` answers for both
   Absolute Cinema (the director) and film-kit (the shot list) and rides both gates out as `.cinema` /
   `.film` — the film rows still land when the director is missing, and the plan says which half
   crossed. Never gate a whole lane on the loudest dependency.
5. **THE DB IS A COST.** ONE batched read of the folder (`COMPILE.readFolder` — three book-wide reads
   the graph already serves, via `CARDS.allCards` / `allSections` / `allPages`), ONE reference map,
   ONE `compile_state` read per press. Never a query per card, never per keystroke, never per render.
   A lane that wants more reads takes them off `ctx.cache`.
6. **Every refusal is a readable sentence.** Absent mod, unparseable line, capped set, a prop moved by
   hand — all named in `warnings`, all survivable. Nothing is swallowed and nothing half-plays.

## 8. WHERE THE SWITCH IS (for the author)

His ruling (2026-08-28): *"Folders do not have a ... menu. Only metadata."* The designation lives in
the **metadata pane** — select a folder tile, or simply stand inside a folder with nothing selected,
and the pane shows that folder: a **Doc** row segmented *Story · Cinematic · Level* (`docSet`), a
teach line under it, and — on a designated folder — a **`Compile`** button (`compileOpen`). The
folder's tile banner wears its mark (◈ cinematic, ⬚ level); story folders wear none. The pane's
**Export** switch is the old whole-book include flag (`compile` column) — renamed so "Compile" means
exactly one thing.

The press opens **What Changed** (`lib/ui-compile.js`, `#sb-compile`): the four counts, the scope
line, plan warnings (hand-moved / collision wording rides a hot tier), then one section per lane with
its installed pill, its mod credit and its item rows. Two moves in the foot: **Land it**
(`compileLand`) and **Close** (`compileClose`); after a land the same window grows the per-lane
landed/skipped/error rows and the button reads "Land it again".

Every one of those four presses is declared **twice** — `app-shell.js`'s action table AND
`spec.inputs.actions` (plus `mod.json` for the shipped manifest). An undeclared action is a dead
button. `ui.compile.*` is written **only** by `app-shell.js` (`patchCompile`); `lib/ui-compile.js` is
a pure fragment that reads it and returns `""` when the window is closed.

## 9. DRIVING IT FROM CHAT — the same two verbs, no button

The author presses; you call. Same code path, same plan, same manifest — a compile you run and a
compile they press are indistinguishable afterwards.

```js
// From a host game's run_script or script. In THIS dev tree the same module is "lib/compile.js".
const COMPILE = require("mods/worldwright-studio/lib/compile.js");
const CARDS   = require("mods/worldwright-studio/lib/cards.js");

await CARDS.setFolderDoc(api, bookId, folderId, "level");     // designate, if it is still plain
const plan = await COMPILE.compilePlan(api, bookId, folderId); // reads; lands nothing
COMPILE.summary(plan);                                         // "3 added, 1 changed · 2 cards"
```

**Show the plan before you land it.** That is the whole point of the feature, and it is the same
courtesy in chat that the window gives on screen: read the counts and every warning back to the
author in their own terms, then land on their word:

```js
const res = await COMPILE.compileLand(api, plan, { actor: "savi", landedAt: stamp });
// res.landed / res.skipped / res.lanes[].warnings — relay them verbatim, never "done" over warnings.
```

Four practical facts:

- **`api.sql` throws inside `readOnly: true` run_scripts.** A plan reads the database — run it in an
  ordinary run_script.
- **`send` is not optional for the Absolute Cinema half.** `compileLand` only crosses to the director
  when the caller lends a sender: `send: (name, data) => …` delivering that action. Without one the
  film rows still land and the lane says plainly that nothing reached the director. (The app's own
  `compileLandPress` does not lend one today — the film-kit half lands from the button, the director
  import does not. Say so rather than promising playback.)
- **Do not land into a locked book.** The Codex is read-only to every seat (`worldwright-routing`
  §1b); designating and compiling a folder there is a write.
- **Re-running is free and honest.** A recompile with nothing edited is a pure **Kept** diff. If you
  want a fresh full report, `COMPILE.compileForget` first — never delete rows to force one.

Inspection verbs, when a diff surprises you: `COMPILE.readFolder(api, bookId, folderId)` (the batched
card read), `COMPILE.census(api, bookId, cards, cache)` (the token walk), `COMPILE.manifestOf(...)`
(what last landed), `COMPILE.diffLane(items, prev)` (the op decision in isolation).

## 10. Related

- `worldwright-cards` §4 — the card grammar itself: Set sections, Body sections, `#[cam:…]` and the
  three compile directives.
- `worldwright-cinema` — the cinema lane's craft and the door it crosses.
- `worldwright-atmosphere` · `worldwright-asset-shelf` — the lanes'
  own mods, read-only halves included.
- `worldwright-mods` §6 — THE INTEGRATION LAW: pull from the mods, and the four properties a
  hand-off must have.
- `use_skill("{mod}#{skill-id}")` — a partner mod's own skill, loadable even before it is installed.