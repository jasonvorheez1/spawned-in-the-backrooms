---
name: favi
description: Ask Favi to do anything, or run a checkup (/favi optimize, /favi loadFaster, /favi smoother, /favi phone, /favi size...). She tries her own tools first, then your installed mods, then installs a market mod that can do it, and only then hands it to Savi. Usage: /favi [what you want]
---

# /favi: Favi's router

The words after /favi are the ask. If world.state.favi is missing, seed it with `{ log: [{ who: "favi", text: "hey, it's favi. i can see your game from here. what are we making?", at: ctx.now() }], typing: false, conv: 1 }`.

## Bare /favi: the guide
`/favi` with no words: post the guide below in Savi's chat, and do nothing else this turn (no edits; the one `ls` below is the only read). Send it as ONE say, word for word, in markdown. If other mods are installed (`ls mods/*/commands/*.md`, skip favi's own), add one line per extra command under "your other mods" as `/favi <id>`: its description's first sentence. Leave that part out when there are none. The creator writing in another language gets the guide in theirs.

```
**favi's commands**

**/favi** · this guide
**/favi [anything]** · ask for anything. favi tries her own tools, then your mods, then a mod from the market, and if none of them can do it Savi does it ("Sorry, Favi can't do that")
**/mods** · installs every mod favi suggests for your plan and game. add a word to focus it: /mods combat
**/style [art style]** · finds 10+ reference pictures and uses them as the look. no word = your active style
**/uninstall** · removes every mod except favi. add a description to remove some: /uninstall the audio ones
**/autoremind** (anywhere in a prompt) · favi holds that task and nudges Savi to keep going if she stops before it's done. /autoremind crew <task> hands it to a crew that keeps building while you're out of the app (uses fuel). /autoremind stop ends it
**/clear** (in favi's chat) · empties the chat

**checkups** · faster and lighter, same look and play
**/favi optimize** · every checkup below, game and mods
**/favi loadFaster** · opens quicker: smaller pictures, loads things later
**/favi smoother** · less lag, steadier frame rate
**/favi server** · lighter work behind the scenes
**/favi network** · less sent between players
**/favi phone** · fits and runs better on phones
**/favi size** · cleans out unused files and leftovers
**/favi mods** · checkups on your mods only
**/favi game** · checkups on your game only
stack them: /favi loadFaster phone mods
any other word reads as a goal: /favi battery = smoother + phone

**shortcuts**
**/favi [mod command]** · runs an installed mod's command: /favi codex = /codex

**in god mode, Favi tab 💬** · Main Favi chat, Forge Files, Reference Images, Mod Market, Playtest Eyes
```

## Checkups: /favi optimize and its denominators
Run this BEFORE door 0 when the first word of the ask, read loosely (case, spaces, dashes and underscores ignored: `loadFaster` = `load faster` = `load-faster` = `loadfaster`), is a checkup below or plainly means one ("make it faster", "why is it laggy", "shrink it"). Each denominator is its own job; `/favi optimize` alone runs every one of them.

| denominator (and its aliases) | what Favi checks and fixes |
|---|---|
| `optimize` · `all` · `everything` | every row below, on the game AND every installed mod |
| `loadFaster` · `load` · `boot` · `startup` | `spawn perf --boot`: the bytes before a player stands (bar 450 KB, ~1 s on 4G) and before the first picture. Fixes: pictures the first frame does not need load later (on first need, or spawned from the place's onArrive); big pngs repainted or re-uploaded smaller (≤1024 px, jpg/webp for photos); scripts the boot does not need move behind `import()` on first use; big data tables read on first need, not imported at boot |
| `smoother` · `fps` · `lag` · `frames` · `perf` | `spawn perf --wait` from a real device. Fixes: `update()` that runs with nothing moving gets `ctx.sleep`; state written every tick only when it changes; too many lights/shadow casters cut; endless fx capped (`?mobile:` counts); far scenery gets `visibleRange`; copies share one model/template |
| `server` · `tick` · `cpu` · `sim` | sim.js and every behavior's tick: work that grows with players or objects spread across ticks, `cadence` slowed where 30 Hz is not needed, timers via `ctx.after` instead of polling |
| `network` · `multiplayer` · `sync` | shared state churn: per-frame values out of world/place/entity state, big arrays trimmed, rows only written on change |
| `phone` · `mobile` · `touch` | the phone frame (`look` target player, device phone): HUD fits 390 px and clears Spawn's right rail, every bound action has a touch button and no dead buttons, texture and fx counts lighter on mobile |
| `size` · `clean` · `tidy` · `shrink` | files and assets nothing reads (grep every path and /cdn/ address before calling it unused), duplicate code folded into one helper, old debug logs removed |
| `mods` | only the installed mods: every row above, on mods only |
| `game` | only the game: every row above, with mods left alone |

**Several at once.** The ask can stack denominators: `/favi loadFaster phone`, `/favi smoother network mods`, `/favi load, size + phone`. Split on spaces, commas, `+`, `&` and "and" (and camelCase joins like `loadFasterPhone`), read each piece by the table, and run every checkup named, each once. `mods` and `game` are aims, not checkups: they point the other words at one side (`/favi loadFaster mods` = loading, on mods only); with no other word they mean every checkup on that side; both together = both sides. `optimize` anywhere in the list = all of them. Measure all the named checkups first, fix them together (one undo version named up front), measure again, and report one line per checkup in the order typed.

A denominator not in the table: read it as a goal ("/favi loadImages" → the load row, aimed at pictures; "/favi battery" → smoother + phone). If nothing fits, run `optimize` and say which denominator it read.

**How a checkup runs**
1. Measure first (the row's own read: `spawn perf --boot`, `spawn perf --wait`, a look, a grep). Write down the numbers.
2. Name the version that undoes it (`spawn versions`, the current seq) in your first text, then fix.
3. Fix only what makes it lighter or faster. Never change how the game looks, plays or reads: same art, same rules, same feel. A fix that would change the look (a smaller texture that shows, a lower draw distance) is offered, not done.
4. Mods: a mod the creator authored (its `mod.json` author is them, or its source lives in this world) is fixed in its source, and you offer the mod update; publishing it waits for their yes. Another author's mod is never edited (its next update would erase the edit): report what it costs and offer the fix it would need (a setting, uninstalling it, or a note to its author).
5. Measure again with the same read. Report as Favi in plain words, one line each: what was slow, what changed, before → after ("startup went from 1.6 MB to 420 KB, so it opens in about a second on a phone"). Nothing to fix is a real answer: "favi checked loading. already fast, nothing to do."
6. Record it: `f.checkups = [...(f.checkups ?? []), { kind, at: ctx.now(), before, after, changed: [..] }].slice(-20)` in world.state.favi.

## Door 0: an installed mod's own command, by name
If the first word of the ask (a leading "/" optional) is the id of any installed mod's command (`ls mods/*/commands/*.md`: the filename without .md, e.g. `codex`, `mods`, `style`, `headbob-2`), or the name of an installed mod that has exactly one command, run THAT command exactly as if the creator had typed `/<id> <rest of the ask>`: read `mods/<mod>/commands/<id>.md` and follow it whole, with the rest of the words as its arguments. `/favi codex` = `/codex`. This covers every base function a mod ships as a command (its docs, its planning, its own workflow); a command whose file edits the game still runs, since the creator named it. Say in one line which mod's command ran. Several mods sharing the id: the creator's named mod wins, else ask which.

Otherwise walk these four doors IN ORDER and stop at the first that can do the ask. You (Savi) are Favi's hands: you do the work, but every reply to the creator speaks as Favi did it ("favi did X"), except at door 4.

Before door 1, one readOnly run_script: `const f = ctx.world.state.favi; return { order: f.forge.order, files: Object.fromEntries(f.forge.order.map(id => [id, { title: f.forge.files[id].title, pitch: f.forge.files[id].pitch }])), refs: { active: f.refs?.active, styles: Object.keys(f.refs?.styles ?? {}) }, mods: f.mods, installed: f.installedMods }`.

## Door 1: the Favi mod itself
Favi can do these; match the ask against them (the code is mods/favi/favi.js and mods/favi/lib/):
- **talk / review / ideas / names / what's missing / quiz** → write the ask into Main Favi's chat so she answers in her tab: `f.log.push({ who: "you", text })` then run her: in a run_script, `const { system } = await import("mods/favi/lib/persona.js")` and fire `ctx.job("llm:chat", { conversationId: \`favi:${ctx.world.id ?? "world"}:${f.conv ?? 1}\`, system: system(ctx), message: text, maxHistory: 24, model: "smart" })`; the result lands in getLogs: read it on the next run and push `{ who: "favi", text }` into f.log. Tell the creator her answer in one line too.
- **a new game idea / Forge file** → create it the way the tab does: `blank(id, pitch, now)` from lib/forge.js into `f.forge.files` + `f.forge.order` (front), named with `nameFrom(pitch)`.
- **edit a Forge field / title / pitch** → write the field on the matching file (`cats[].fields[].value`, the title field also sets `p.title`).
- **finalize: prompt / rate / pitch card / plain data** → produce it yourself from the file (the presets live in PRESETS) and store it where the tab shows it (`p.prompts[preset]`, `p.rating`, `p.card`), then show it.
- **build the game from a Forge file** → read its `prompts.spawn` (write one from PRESETS "spawn" if missing) and build it, as Savi, in this world.
- **reference images for an art style / more like an image** → run the /style command flow (mods/favi/commands/style.md).
- **find / suggest / install mods for the project** → run the /mods command flow (mods/favi/commands/mods.md).
- **rank the market** → clear `f.marketRank` so the Mod Market re-ranks on open, or rank it now.

## Door 2: a mod already installed
`spawn mod list`. For each installed mod (skip favi), read `mods/<name>/mod.json` and the names + descriptions of its `commands/*.md` and `skills/*.md`. A mod whose command or skill covers the ask: load its skill (`use_skill <mod>#<skill>` as its install note says) or follow its command file, and do the ask with it. Say which mod did it and the command they can type themselves next time.

## Door 3: a mod on the market
Search Favi's market: `mods/favi/lib/catalog.js` (gist, keywords, commands) and `mods/favi/lib/catalog-full.js` (full descriptions) for the ask's nouns; confirm with `spawn mod search "<noun>"` and `spawn mod info <name>`. Pick the best FREE fit (a paid one: name it and its price, never buy). `spawn mod install <name>`, then do the ask with it as in door 2. Record it: push `{ name, version, why }` onto `f.mods.installed` (create `f.mods` if missing) and add the name to `f.installedMods`. Tell the creator what got installed and why in one line.

## Door 4: Savi
Nothing above can do it. Your first text starts exactly with **"Sorry, Favi can't do that"**, then, as Savi, you take the ask as a normal request and build/answer it yourself.