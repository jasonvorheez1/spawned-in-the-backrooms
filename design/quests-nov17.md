# Quest audit, Nov 17

How it was traced: every quest lib read by script and by hand at its turn-in: journal calls (setQuest / advanceQuest / finishLevelQuest), marks,
every reward token against items.js / weapons.yml / clothes.yml / level data, every NPC and prop id against the place sims and scenes, every payout.
Not played through in a body. Faults: (1) can't finish, (2) no journal or marker, (3) pays nothing or thin, (4) no choice.

Reward curve (Savi's pick, commented in scripts/lib/quests.js): xp ≈ 60 × tier × (1 + danger). tier 1 errand (≤3 steps), 2 = 4-5 steps,
3 = chain / 6+. danger = loot.js POOL_TIER / 18. Backdollars ≈ $0.30 per xp when cash is the reward; a unique item stands in for cash.

| lib | quests | found (1/2/3/4) | fixed | state before → what changed |
|---|---|---|---|---|
| boom-quest.js (data for level11-quests) | Ground Rent | 0/0/0/0 | 0 | 300 xp, $20-$150 by branch, 3 endings. Unchanged. |
| ch2-quest.js | The Dead Signal, Frequency Lock, Wait for the Tone, +2 | 0/0/0/0 | 0 | Journal + marks on every step, 16 skill branches, 120-450 xp. Unchanged. |
| dina-quest.js | The Way Back, The Undelivered | 0/0/0/0 | 0 | Main story; pays through the chapter hand-offs, not cash. Unchanged. |
| doors21-quest.js (new) | Sign the Ledger, Room Service, The Rumoured Door | 1/0/0/0 | 0 | New today. `weapon:concierge_key` and `weapon:wardens_lantern` are not in weapons.yml in this lane's tree: the weapons lane owns them. Until they land the payout carries a token with no row. |
| hub-quest.js | The Missing Key, Lost Expedition Records, Uncharted Passage | 0/0/0/0 | 0 | Each is a chosen line with a paid or skill route. Unchanged. |
| l132-quests.js | The Missing Piece, Signal Strength | 0/0/2/2 | 4 | Both paid $0. → $45 and $60. Choice added to each: keep the record (xp only, Lumiria −3, Gus's shelf stays short, different line after) / bill Odalys $60 (no day pass, no friend-of-the-town flag, Lumiria −2, different line after). |
| level1-quests.js | Short Rations, Bad Water | 0/0/2/0 | 2 | Bad Water 110 xp, $0 → 150 xp, $45. Short Rations cash branches $5/$10/$15 → $20/$30/$40 (the $25 and $40 branches stand). |
| level10-quests.js | Harvest (beret), Cellar in the Shadows, +1 | 0/0/1/0 | 1 | Cellar 70 xp/$20 and 95 xp/$35 → 150 xp/$50 and 190 xp/$70. |
| level109-quest.js | Keep It Closed | 0/0/0/0 | 0 | Truth / cover choice at turn-in, pay from l109-outpost.yml. Unchanged. |
| level11-quests.js | Ground Rent, Sedco Platform Footage, +3 | 0/0/0/0 | 0 | 90-300 xp, $20-$150. Unchanged. |
| level13-quest.js | one quest, two patrons | 0/0/0/0 | 0 | 110-150 xp, $60-$120, quiet bonus. Unchanged. |
| level169-quest.js | Welcome to the Desert, The Road North | 0/0/2/2 | 2 | Both paid $0. → $45 and $90 (the Hub key stays). No choice: both are walked, nobody to choose with. Left: a choice wants a person on the road. |
| level178-quests.js | The Kitchens, An Unfamiliar Ingredient, An Arrangement, The Long Way Around, A Better Route, The Travel Station | 0/0/0/6 | 1 | Three pay $0 but hand a unique (katana, mask, naginata): left. Choice added to The Travel Station (last of the six): back the Order's spring story → no naginata, $90 and miso from the Order, survivors −3, Irawan annoyed. |
| level1c-quest.js | Walk the Line | 0/0/0/0 | 0 | Five ways past the gang. Unchanged. |
| level21-quests.js (Level 2.1) | Saltine run, Edges | 0/0/0/0 | 0 | 110-180 xp, $50-$70, two endings each. Unchanged. |
| level22-quest.js | Ruins Left Behind, Hilda, Twenty-Six Thousand | 0/3/0/3 | 0 | No quest marks, no choice. Not this lane's file: left for its owner. |
| level31-quest.js | Side B | 0/0/0/0 | 0 | Three routes, 320-420 xp. Unchanged. |
| level325-quest.js | Fifteen Seconds | 0/0/0/1 | 0 | 250 xp, $40, bolts. Taught by watching, no person in it: left. |
| level61-quests.js | five | 0/0/0/0 | 0 | 140-165 xp plus dividends. Unchanged. |
| level69-quest.js | Mile Markers | 0/1/0/1 | 0 | No marks, no choice. Not this lane's file: left. |
| level70-quest.js | two long quests | 0/0/0/0 | 0 | 120-450 xp, $40-$300, 8 branches. Unchanged. |
| level8-quests.js | Carla's errand, The Karst Survey, +1 | 0/0/2/0 | 2 | Carla 90 xp/$0 → 120 xp/$40. Karst Survey 110/125 xp → 220/235 xp. |
| remodel-quest.js | Fresh Paint | 0/0/0/0 | 0 | Sell or return. Unchanged. |
| zenith-quest.js | Zenith | 0/0/1/0 | 1 | Final payout 150 xp → 190 xp. |

Totals: (1) 1 found, 0 fixed (waits on the weapons lane). (2) 4 found, 0 fixed (all in the two libs this lane may not edit).
(3) 10 found, 10 fixed. (4) 15 found, 3 fixed by brief (The Missing Piece, Signal Strength, The Travel Station).

Level 21 chain as run today (two paths, driven by state):
- M.E.G. path: Sign the Ledger 150 xp, $75, level key → Room Service delivered 300 xp, $150, 2 firesalt, karma −1 → The Rumoured Door reported to Okafor (hub-meg-okafor) 450 xp, $225, 3 firesalt, Warden's lantern, M.E.G. +10.
- Desk path: tray opened, keys kept 300 xp, 3 level keys, karma +3 → told the Concierge 450 xp, $303.75, 2 firesalt, Concierge's key; M.E.G. never hears.
