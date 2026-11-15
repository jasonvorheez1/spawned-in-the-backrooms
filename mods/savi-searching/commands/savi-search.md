---
name: savi-search
description: "Research a character, game, show, place or event before building: search, pull and view art, sprites, fan art, gifs and videos, write research/<slug>.md"
requiresArgs: true
argsPlaceholder: <args>
---

Run the **savi-searching** skill (`use_skill savi-searching#savi-searching`) as a **full** pass on: $ARGUMENTS

1. Think first: which subject exactly (and which one if the name is ambiguous), what the creator wants with it, does `research/<slug>.md` exist (then top it up only).
2. Opener to the creator: one line naming the subject.
3. View the creator's own attachments and links first (`spawn attachments`), every gif and video included.
4. Search: wiki first (read the main page whole, list its files via the MediaWiki API), sprites, official art, fan art (safebooru `rating:general`), video.
5. Pull into /workspace/research/<slug>/: png/jpg with `spawn fetch`, gifs with curl. Pull every gif on the wiki page and at least 3 fan art pieces.
6. View every one: `bash mods/savi-searching/tools/sheet.sh <abs path>`, YouTube with `bash mods/savi-searching/tools/yt.sh <url> <dir>`, then Read the sheet. Each gif gets a motion line (no summary); each video a 3-6 sentence summary of what happens.
7. Write `research/<slug>.md`: who, look sheet with sampled hex colours, motion & moves, video summaries, refs table with /cdn/ addresses and credits, for-the-build, open questions.
8. Tell the creator the 1-2 line takeaway. A build ask: plan from the brief and build from the refs. A search alone: stop and offer the build.