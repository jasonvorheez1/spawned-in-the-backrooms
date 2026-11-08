---
name: lagscope
description: Read this game's LAGSCOPE lag reports and fix the top causes
---

Read the newest LAGSCOPE reports (`spawn game_db sql "SELECT id, at, lv, name, place, data FROM lagscope_reports WHERE lv != 'ok' ORDER BY id DESC LIMIT 40"`). Group them by `data.keys` (stable cause ids: game-thread, frame-dips, particles, dynamic, skinned, audio-loops, broken-scripts, entity-leak, spawn-burst, triangles, draws, shadows, no-range, model:<name>, script:<file>, ping…), count reports per key and per place, and name the top three with the report ids behind each.

For each, `data.where` names who does it (models, noRange, particles, dynamic, skinned, loops, broken: kind×count) and `data.fix` the first move. Read the report `text` for the game-thread line (late ms a beat, freezes) and the stalls list. Keep the sides apart: game-thread / spawn-burst / entity-leak / broken-scripts are the game's scripts and physics (run `spawn perf` and fix the top script row); frame-dips / triangles / draws / shadows / particles / skinned are drawing (visibleRange, lighter models, fewer emitters); ping is the connection and never lowers fps. Find each cause's source in this game's files, fix it starting with the most frequent, then say what changed and which report ids it answers.