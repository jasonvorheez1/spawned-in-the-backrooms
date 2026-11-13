---
name: uninstall
description: Uninstall mods. Bare /uninstall removes every installed mod except Favi; /uninstall [description] removes the mods that match what you describe (names, what they do, "the audio ones", "everything but codex").
---

# /uninstall

The creator typing this command IS the approval: remove, don't ask, except where a rule below says ask.

1. `spawn mod list`: the installed mods with versions. Also read each one's `mods/<name>/mod.json` description, and Favi's catalog entry (`mods/favi/lib/catalog.js`, `mods/favi/lib/catalog-full.js`) for what it does.

2. Pick the targets.
   - **No words after /uninstall:** every installed mod EXCEPT `favi` (Favi carries this command; removing her is only on her name: `/uninstall favi`).
   - **Words:** match them against each installed mod's name, displayName, description and tags. "the audio ones" = every audio/sound/music mod; "codex and headbob" = those two; "everything but X" = all except X (and except favi unless named); "favi" or "everything including favi" = include her. A word that matches nothing: say so. A description that could fairly mean two different sets: name both sets in one line and ask which, remove nothing yet.

3. Before removing, one line naming what goes and the world version that brings it back (`spawn versions`, the newest seq): "removing codex, audio-tools. `spawn undo` to <seq> brings them back."

4. Remove each: `spawn mod remove <name>`. If remove refuses because a script outside the folder names `mods/<name>/` (it lists the files): read those files. A line in the world's own code that only wires that mod (an import, a HUD hook) is cut cleanly so the game still runs, then remove again. Anything more tangled: leave that mod installed and say which file holds it. Never `--force`.

5. Clean Favi's records: in one run_script, drop each removed name from `world.state.favi.installedMods`, from `world.state.favi.mods.installed` (by `.name`) and from `world.state.favi.modAsks`, and `delete world.state.favi.marketRank` so the market re-ranks.

6. `spawn mod list` again to prove it. Tell the creator, one line: what got removed, what stayed and why.