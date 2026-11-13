---
name: mods
description: Favi reads your plan and the game you've built so far, picks the catalog mods that fit, and installs every one. Usage: /mods [anything to focus on]
---

# /mods: install every mod Favi would suggest for this game

The creator typing /mods IS their yes: install the picks, no extra confirmation. Words after /mods narrow the focus ("/mods combat", "/mods just ui").

0. **Refresh Favi's market**: the catalog search pages at 20, so sweep it with many nouns (`""`, game, ui, combat, animation, camera, atmosphere, audio, 2d, 3d, horror, rpg, puzzle, multiplayer, mobile, npc, ai, skill, shader, terrain, vehicle, inventory, save, weapon, fx, model, pixel, tool, creator, level, menu, shop, racing, survival, lighting, quality, debug …), collect every unique `name@version: "desc" (N installs, N likes[, N spoins])`, and rewrite `mods/favi/lib/catalog.js` in its existing shape `{ n, v, g (first sentence ≤150 chars), i, l, p (spoins, 0 free), c (slash commands named in the desc), k (search keywords found in the full desc) }`, most installs first, with CATALOG_AT today. Main Favi and the Mod Market door read it.
1. **Read the plan and the game**, in one pass:
   - the plan: `run_script` (readOnly) `const f = ctx.world.state.favi; return { files: f?.forge?.files, order: f?.forge?.order, log: (f?.log ?? []).slice(-20) }` — the Forge file(s): pitch, genre, loop, features, art style, finalize notes; plus what was said to Favi lately.
   - the game: `design.md` at the world root if it stands, `world.config.yaml`, each `places/*/config.yaml` (mode, terrain), `ls scripts templates`, and a skim of the biggest scripts. Name in one line each: genre, mode (3d / 2d-side / 2d-top / ui-game), the core verb, the systems that exist, the systems the plan names that don't exist yet.
2. **See what's already here**: `spawn mod list`. Never reinstall, never remove; skip `favi` itself.
3. **Search the catalog with strong nouns** from step 1, one search per need: genre (platformer, rpg, horror…), each missing system (combat, animation, inventory, dialogue, ui, camera, atmosphere, audio, save, mobile…), the art style, the mode. `spawn mod search "<noun>"`, then `spawn mod info <name>` on each candidate to read what it ships and whether it costs spoins.
4. **Pick**: a mod earns a place when it serves a named part of the plan or the built game, fits the mode (no 3D-only kit in a 2D game), and doesn't duplicate a pick already made (one atmosphere kit, one combat kit). Prefer installs + likes as the tiebreaker. Usually 3–8 picks; never pad. **Free mods only**: a priced mod goes on the suggested list as "costs N spoins, not bought" and is never installed by this command.
5. **Install each pick**: `spawn mod install <name>`, one call per mod. A failed install is reported with its error, never retried in a loop.
6. **Record it** so the Favi tab shows it, one run_script: `ctx.world.state.favi.mods = { at: ctx.now(), for: <plan title>, installed: [{ name, version, why }], skipped: [{ name, why }] }`, `ctx.world.state.favi.installedMods = <every installed mod name from spawn mod list, favi excluded>` and push one Favi line into `ctx.world.state.favi.log`: `{ who: "favi", text: "grabbed N mods for your game: a, b, c. ask me about any of them", at: ctx.now() }`.
7. **Tell the creator** in one or two texts: how many installed, each name with the plan item it serves in three or four words, and anything skipped (paid, wrong mode). A mod that brings slash commands: name its main command.