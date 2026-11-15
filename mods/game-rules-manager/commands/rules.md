---
name: rules
description: Sync the Game Rules Manager files with Savi's notes and mark pending rules applied.
---

Read rules/ALL_GAMES_RULES.md and rules/GAME_RULES.md. For every `[pending]` row, write or update the matching note in memory (all-games rules in the creator's personal notes, game rules in memory/game/rules/), honour the file's order as priority, then rewrite the row as `[applied]` and run `rulesLoad` (or rewrite world.state.grm) so the panel shows it running.