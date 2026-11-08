---
name: Lagscope
description: LAGSCOPE, made by yui: finds where a Spawn game lags on players' machines, keeps the reports in the game's database, optionally posts them to Discord, and sends them to Savi to fix.
---

# LAGSCOPE

## Use it in five steps
1. **Install**: `spawn mod install lagscope` (or ask your Savi "install lagscope"). Nothing else to wire: every player's body starts watching its own machine, and builders get the 📡 LAGSCOPE tab.
2. **Play your game.** Walk to the places that feel heavy: a big base, a busy town, a fight. After 30 s each machine judges itself every 3 s. Test browsers and software renderers are skipped, so only real players' machines report.
3. **Open the panel**: Tab, then G for god mode, then the 📡 LAGSCOPE tab. Tabs inside: *live* (fps, 1% low, CPU/GPU ms, draws, ping, what to fix next, stalls), *scene* (what stands near you: triangles by model, shadow casters, lights, things with no draw distance), *reports* (every saved report, newest first), *settings*.
   Want it floating during play on F3? Add to your ui.js: `import { overlay } from "mods/lagscope/panel.js";` and end the render with `${overlay(ctx, player)}`. Only builders ever see it.
4. **Settings** (shared by every builder): Discord on/off (off by default), the webhook URL, the red and yellow fps lines, posts per hour, how long sent reports stay. A posted game has its own database: set it again there after you publish.
5. **Fix it**: in *reports* press **send all to savi**, or type `/lagscope` to your Savi. She reads the reports, groups the causes, finds them in your files and fixes the biggest first.

## What it does

What it does, in any game it is installed in:
- **Every player's machine watches itself** (watch.js on the player body). After 30 s in the world it judges fps, 1% lows, stalls over 50 ms (with the script file or engine step that held the frame, from Long Animation Frames), CPU/GPU ms, draw calls, triangles, heap, and what stands within 250 m (shadow casters, lights, effects, things with no draw distance, triangles by model). When the machine stays red it saves ONE report to the game's SQL (`lagscope_reports`); the same causes from the same player stay one row for 6 h; a "smooth again" row follows when it recovers. Yellow reports are optional.
- **Builders see the panel**: the LAGSCOPE tab on the god-mode rail (Tab, then G) works with nothing wired. For a floating, draggable panel during play (F3), add one line to the game's ui.js:
  `import { overlay } from "mods/lagscope/panel.js";` then end the render with `${overlay(ctx, player)}`.
- **Settings are shared by every builder** (SQL `lagscope_kv`): Discord on/off (off by default: reports still save), the webhook (only builders' machines ever read it, players never), red/yellow fps lines, posts per hour, and cleanup.
- **Send all to Savi** posts every report not sent yet, causes grouped by how often they came up, into the pressing builder's own Savi chat, and marks those rows with `savi_at`. Sent rows clear themselves after `keepSentH` hours (default 24); every row after `keepDays` (default 7). Unsent reports are never cleared early.

Reading the reports as Savi: `spawn game_db sql "SELECT id, lv, name, place, data FROM lagscope_reports ORDER BY id DESC LIMIT 40"`; `data.why` is the ranked causes, `data.fix` the suggested fixes, `text` the full report.

Every kind of game: besides fps it judges input delay (≈ two frames + half the ping; red past 180 ms), uneven frame delivery (jitter > 3 ms even at good fps: aim and combos), ping spikes, a 2D game under 60, sprite counts (tile maps, bullets) and how many things nearby each run their own script (minions, units), each with its fix.

What it cannot see: per-script timing inside the game's own behaviors (that needs the game's code to time itself) and the server's tick; it reports what the player's machine and the engine show.