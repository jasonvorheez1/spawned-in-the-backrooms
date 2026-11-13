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
| hostility, incidents, forgiveness | scripts/lib/forgive.js, scripts/lib/rep.js | faction fields on the NPC |
| armed people (fight, cover, barks, companions) | scripts/meg-agent.js, scripts/lib/companion.js | NPC rows + dlg barks |
| breakable walls/props | scripts/lib/breakables.js | data/breakables.yml |
| doors | scripts/door-geo.js, scripts/lib/door-swing.js | door rows |
| loot + items | scripts/lib/loot.js, scripts/lib/items.js, data/weapons.yml | loot tables |
| player notices | scripts/lib/notify.js | text |

## Still separate (next to fold in)
- Per-level NPC brains with their own movement/fight loops: l4-people, l8-life, l13-foes, l7-tiny, partygoers, l61-staff, level70-life.
  Their weapon + temper rules should import npc-temper.js; their movement should move onto one shared walker.
- Quest files with their own step logic beyond the journal: level1-quests, level13-quest, level31-quest, level70-quest, zenith-quest.

## Checking every level at once
`python3 tests/check.py`: imports, missing scripts, dialogue structure and actions, quest place names, data files, across all places.
Run it after any change to a shared file.
