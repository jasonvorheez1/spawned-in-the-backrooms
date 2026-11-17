# Balance sheet, Nov 17 rebalance (Savi's pick)

Read from the code and data; attributes all 5, Melee 15, no armor, no crits, no variance. "Before" is the game as it stood on Nov 16.

## Player
| Measure | L1 | L5 | L10 | L15 | L20 | Before → After |
|---|---|---|---|---|---|---|
| Max hp (100 + 10/level) | 100 | 140 | 190 | 240 | 290 | unchanged |
| Typical melee weapon | table leg | bat | machete | machete | machete | unchanged |
| Hit damage (base + 1.6/level) | 10 | 36 | 60 | 68 | 76 | unchanged |
| Damage per second | 20 | 46 | 86 | 98 | 109 | unchanged |

## Common foe of each level (hp at hardiness 5)
| Level, foe | Base hp | hp before | hp after | Hits to kill, L1 table leg: before → after | Seconds: before → after | L5 bat | L10 machete |
|---|---|---|---|---|---|---|---|
| 0, Smiler | 60 | 78 | 60 | 8 → 6 | 4.0 → 3.0 | 3 → 2 | 2 → 1 |
| 0, Lurker | 35 | 46 | 35 | 5 → 4 | 2.5 → 2.0 | 2 → 1 | 1 → 1 |
| 1, Hound | 45 | 59 | 45 | 6 → 5 | 3.0 → 2.5 | 2 → 2 | 1 → 1 |
| 2, Hound | 60 | 78 | 60 | 8 → 6 | 4.0 → 3.0 | 3 → 2 | 2 → 1 |
| 3, Hound | 70 | 91 | 91 | 10 → 10 | 5.0 → 5.0 | 3 → 3 | 2 → 2 |
| 4 | no common hostile (M.E.G. agents only) | - | - | - | - | - | - |
| 5, Hound | 75 | 98 | 98 | 10 → 10 | 5.0 → 5.0 | 3 → 3 | 2 → 2 |

## Hits to die (foe hit x 1.25, x the place's damage step)
| Foe | Hit before | Hit after | L1 | L5 | L10 | L15 | L20 (before → after) |
|---|---|---|---|---|---|---|---|
| Level 0 Smiler (bite 12) | 15 | 15 | 7 → 7 | 10 → 10 | 13 → 13 | 16 → 16 | 20 → 20 |
| Level 1-2 Hound (bite 14) | 17.5 | 17.5 | 6 → 6 | 8 → 8 | 11 → 11 | 14 → 14 | 17 → 17 |
| Level 3-5 Hound (bite 14, step 1.1) | 17.5 | 19.3 | 6 → 6 | 8 → 8 | 11 → 10 | 14 → 13 | 17 → 16 |
| Level 21 Clicker (hit 20, step 1.3, if it spawns through npcState) | - | 32.5 | 4 | 5 | 6 | 8 | 9 |

## The place curve (new: data/difficulty.yml tiers)
| Places | Meant for | hp multiplier before → after | damage step before → after |
|---|---|---|---|
| Levels 0, 1, 1.1, 2, 2.1, tutorial | player 1-5 | 1.3 → 1.0 | 1.0 → 1.0 |
| Levels 3, Gamma, 4, 5, 6, 6.1 | 5-10 | 1.3 → 1.3 | 1.0 → 1.1 |
| Levels 7-13 | 8-15 | 1.3 → 1.55 | 1.0 → 1.2 |
| Level 21 (doors21), Level 22 | 12+ | 1.3 → 1.9 | 1.0 → 1.3 |
| every other place | - | 1.3 → 1.3 | 1.0 → 1.0 |
Creatures already standing keep their old hp until they respawn.

## Needs (walking; AFK, Level 6, Bonus Rooms and Level ! still drain nothing)
| Measure | Before | After |
|---|---|---|
| Thirst per second | 0.028 | 0.0152 |
| Hunger per second | 0.018 | 0.0104 |
| Thirst, full to low warning (25) | 45 min | 82 min |
| Hunger, full to low warning | 69 min | 120 min |
| Thirst, full to empty (hurting) | 60 min | 110 min |
| Hunger, full to empty | 93 min | 160 min |
| Low stage | stamina recovery x0.9 per need | same |
| Empty stage | stamina recovery x0.8 per need, no hp loss | same, plus 1.2 hp a minute per empty bar down to 25% hp (survival.js needsHpDrain: not called by the player yet) |

## Scavenging, 10 minutes (about 10 item rolls)
| Measure | Before | After |
|---|---|---|
| Drain in 10 min: thirst / hunger | 16.8 / 10.8 | 9.1 / 6.2 |
| Level 0 yield: thirst / hunger | 83 / 32 | 83 / 32 |
| Level 0 payback | 4.9x / 3.0x | 9.1x / 5.2x |
| Level 1 yield: thirst / hunger | 24.5 / 35 | 24.5 / 35 |
| Level 1 payback | 1.46x / 3.2x | 2.7x / 5.6x |

## Sanity per minute in a normal lit zone (Nerve 5)
| Zone | Before | After |
|---|---|---|
| Level 0 halls | -7.2 | -7.2 (unchanged: target +0.6, see below) |
| Level 0 offices | -6.0 | -6.0 |
| Level 1 halls | -4.8 | -4.8 |
| Level 2 tunnels | -6.0 | -6.0 |
| Level 3 halls | -7.2 | -7.2 |
The target number (difficulty.yml sanity.lit: recover 0.6 a minute) is written but the drain lives in scripts/player.js and each level's own file, which this pass did not own.

## Loot
| Measure | Before | After |
|---|---|---|
| What sets quality | player level only (weapon rarity gate) | place danger and player level, half each (loot.js lootQuality) |
| Second box of ammo/shells with a find | never | up to 70% (Level 21 at level 15), 2% (Level 0 at level 1) |
| Bandage found as first aid | never | up to 45% |
| First aid found as trauma medkit (level 6+) | never | up to 40% |
| Level 21 / 22 loot pool | lobby pool, tier 1 | own pools, tier 18 / 19 |
| Level 21 closets | none | rollItemL21: hall and dark-wing (rich) tables |
