# One game, many levels: the shared systems
Shelly, Nov 13: "fix once, apply everywhere". A level brings content (its map, people, lines, quests, hazards);
the systems below decide how that content behaves. A fix goes in the shared file, never in one level's copy.
Layering: shared default (scripts/lib) -> level data (places/<level>, dlg-*.yml, data/*.yml) -> one NPC/object's state -> a named, commented exception.

| system | shared file(s) | every level's content plugs in as |
|---|---|---|
| dialogue + choices, speech checks, retries | scripts/talk.js, scripts/lib/dialogue.js | scripts/lib/data/dlg-*.yml (q / a / sk / fail / do / then) |
| dialogue actions | scripts/talk.js (`do:` heal, discount, recruit, boilerkey, l31:*, trail:*, errand:*) | one `do:` word on a choice |
| quest journal, tracker, quest messages | scripts/lib/quests.js (setQuest, endQuest, questStep, tellQuest) | each level's quest table (tips, marks) |
| side jobs | scripts/lib/errands.js | scripts/lib/data/errands.yml rows |
| main story trail | scripts/lib/dina-quest.js, scripts/lib/quest-route.js | clue rows |
| NPC weapons + temper (first hit warns, second within 20 s fights) | scripts/lib/npc-temper.js | the NPC's state.kind weapon |
| hostility, incidents, forgiveness (assaulted(): first stray hit warns, second within 20 s or a kill is assault, allies join) | scripts/lib/forgive.js, scripts/lib/rep.js | faction fields on the NPC |
| armed people (fight, cover, barks, companions) | scripts/meg-agent.js, scripts/lib/companion.js | NPC rows + dlg barks |
| breakable walls/props | scripts/lib/breakables.js | data/breakables.yml |
| doors | scripts/door-geo.js, scripts/lib/door-swing.js | door rows |
| tapes (HALOGEN) | scripts/player.js HOLO + scripts/lib/items.js holo:<id> | a holo:<id> token in any container |
| loot + items | scripts/lib/loot.js, scripts/lib/items.js, data/weapons.yml | loot tables |
| player notices | scripts/lib/notify.js | text |

## Intentionally separate
- Every person NPC (meg-agent on every level incl. Level 70 town, l4-people, l5-people, l61-staff, Samantha, companions) decides hostility through scripts/lib/forgive.js: one fix reaches them all.
- Creature brains (l8-life spiders, partygoers, l13-foes, l7-tiny, hounds, smilers, deathmoths) are hostile by nature; each keeps its own hunt. Shared rules for them go in a lib file the same way.
- Quest files (level13/31/70/remodel/zenith) keep their own story steps but write the journal and messages only through scripts/lib/quests.js.

## Checking every level at once
`python3 tests/check.py`: imports, missing scripts, dialogue structure and actions, quest place names, data files, across all places.
Run it after any change to a shared file.
