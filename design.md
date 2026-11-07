# Backrooms MMORPG (working title)

A persistent, shared Level 0. Players scavenge, fight and level up in an endless yellow maze, and push deeper in groups.
The tone is dread first: you start weak and the place is bigger than you.

## Decisions
- Camera: first person by default, with a toggle to third person (key V). Third person must not clip through walls or ceiling.
- Combat: survival combat. Players start bare-handed (weak punches) and need a weapon fast.
- Death: players keep their items. Not a hardcore game. Death costs time (respawn in the hub), not progress.
- Guns: rare loot first; crafting and player/NPC trading come later.
- Progress: saved per player (player.state), not shared across the world.
- First-push scope: not decided yet (default: Phase 1 first).

## Power curve
| Stage | Player | Weapons and tools | Threat |
|---|---|---|---|
| Early | Weak, slow stamina, fists only | Found melee: table leg, pipe scrap, crowbar, bat. Primitive tools: flashlight, rope, lighter | Smilers one at a time; sanity is the main enemy |
| Mid | Levels 10-25, better stats | Pipe weapons, hatchet, pistol, shotgun; ammo is scarce | Packs, new enemy types, dark and red zones |
| Late | Built like a soldier: armor, rifles, high hp | Rifle, body armor, night vision, explosives | Deep levels, bosses, events with many enemies |

Weapons come from loot and crafting, not only from level. Level gates the stats and what you can equip, so a new player can't just be handed a gun.

## Phases (each playable alone)
1. Core loop: stats, HUD, fists, sprint, almond water, smilers, sanity by zone.
2. RPG: XP and levels, loot, an inventory, weapon tiers, death rules.
3. MMO: shared hub, chat, leaderboard, co-op (revive, sanity drains slower near others), enemy count scales with players.
4. Depth: Level 1+, exit doors, hub quests, rare events.

## Open questions
- None right now. Next step is Phase 1.

## Direction: 7 Days to Die / voxel-style play (user request)
Take the mechanics, not the assets: a block world you can dig and build in, scavenging and crafting, a base to defend, and a day/night threat clock with waves of enemies.
- Voxel building and digging (engine has voxel terrain: see the voxel-terrain skill). Open question: the whole world voxel, or Level 0 stays a maze and a new voxel level is added.
- Crafting from scavenged parts (ties into weapons: rare guns, crafted pipe weapons).
- Base defense: placeable barricades and traps, with periodic smiler hordes that test the base.
- Day/night or "the lights fail" timer that raises the threat.
