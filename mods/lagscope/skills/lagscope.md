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

## 2.0: the AI brief
Every report opens with **AI BRIEF v2** (lib/brief.js), written to be read once and acted on:
- `bound:` which side holds the frame: gpu · cpu (the renderer's CPU) · sim (scripts and physics) · hitch · outside · ok.
- `numbers:` one line; a number the machine could not measure is left out, never shown as `?`.
- up to **10 culprits**, ranked by impact = severity × how far over budget, ×2 on the bound side; a `bad` sim culprit (game-thread, scripts-per-object, freeze, …) is always ×2 so a script problem is never buried under drawing hints. A smooth machine (`ok`) still lists what a weaker device will meet, at half weight.
- each culprit: `who` (kind × count, template, script file, two example ids, where they stand; `same as #N` when it repeats), `open` (only the template and script files of its own who rows), `fix`, `code` (the line to write: always on #1 and the short ones), `saves` (what goes away, counted from the reading: "7,200 fewer shadow draws", "149 fewer update() calls a tick"; never a guessed ms), `check` (the number that proves it).
- the engine's default player scripts (scripts/humanoid-locomotion.js, scripts/player.js, scripts/camera.js, templates/player.js, templates/camera.js) and mods/lagscope/* are never named in who or open, unless one is measured hot.
- a culprit with no who says where to look: `look:` a `spawn perf` flag or a grep line; a who spawned live with no template carries `find: grep -rn "<name>" scripts sim.js places`.
- the text stays under 6000 characters: detail (code, then the explaining first sentence of a fix) drops from the bottom culprits first; every culprit keeps who/open/fix/saves/check.
- culprit keys (stable): game-thread, scripts-per-object, freeze, dynamic-bodies, character-bodies, mesh-colliders, entity-leak (only when the object count grew steadily: `steady === true` when the watch reports it), spawn-burst, broken-scripts, shadow-lights, lights, particles, fx-count, triangles, heavy-model, vegetation, render-scale, gpu-memory, draw-calls, no-draw-distance, small-shadows, shadow-casters, skinned-bodies, dense-objects, sprites, hud-layout, memory-leak, gc-churn, state-chatter, audio-loops, download-weight, ping.

The same brief is `data.ai` in the row (JSON), the panel's copy button (the copied text starts with `AI BRIEF v2`, the raw reading follows), and the top of the send-to-Savi message (merged over every report sent: impact summed over the reports that carry a culprit).
- **A reading on demand**: `ctx.emit("lagscope:scan", { why: "after fix" })` from run_script or any script; every machine in the room saves one report about 6 s later. Before and after a fix, with no panel open.
- New readings: how often update() really ran (Hz of 30) and its longest gap, per-frame render CPU and GPU p99 from `ctx.view.frames`, mesh colliders, the scripts running nearby with their object counts, bytes and messages on the wire both ways.
- The tables are made with CREATE TABLE IF NOT EXISTS: a fresh game's log no longer shows a `no such table: lagscope_kv` fault.

What it cannot see: the milliseconds each script spends (the brief names the scripts and how many objects run each; `spawn perf --script <file>` times them) and the server's tick; it reports what the player's machine and the engine show.