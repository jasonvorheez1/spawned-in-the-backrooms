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

- 2026-11-07: Smilers follow the wiki: a lit flashlight draws them from ~40 m (11 m dark); eye contact slows them to a creep. Shelly said yes.
- 2026-11-07: Level 0 wiki additions (Shelly: "i want all of it"): stairs to nowhere, walls that shift behind you (arch rooms never), deep wet carpet slows you in arch rooms, arch ledges restore stamina/sanity, hum spikes drain sanity while standing still, whispers/scratching behind walls, dark figures down long halls.

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

## Phase 2 decisions (2026-11-06, agent @@antigravity_pair)
- Loot: smilers can drop almond water (35%) or a weapon (18%) on death. Floor spawns use the same weighted roll.
- Weapon tiers: common / uncommon / rare, set in `weapons.yml`. Added Hatchet (Lv 6) and Fire axe (Lv 8) as rare; guns stay a later rare-loot step.
- Inventory: the HUD lists every owned weapon in its rarity colour; ones above your level are greyed with the level needed.
- Fixed a stray brace in `scripts/player.js` that stopped the player script from loading.
- 2026-11-06: first gun is a rare Pistol (level 5, 34 damage, 28 m, needs a clear line). It spends ammo, found as brass boxes in the maze (6 rounds each, 36 max, scarce) or dropped by smilers. Empty it just clicks; fists and melee still work.
- 2026-11-06: second enemy, the Lurker (halls, arches, holes zones). It freezes while a player faces it with a clear line, and costs that player sanity for watching; look away or break the line and it rushes (5.4 m/s, faster than the sprint). 35 hp, bites for 12 hp and 8 sanity, 80 xp. Same hit and loot rules as smilers.
- 2026-11-06: second gun, the rare Shotgun (level 10). One shot sprays 8 pellets in a wide cone out to 11 m, hitting everything in it (60 damage up close, weak at range). It uses shotgun shells, a separate ammo that is scarcer than pistol rounds (2 per pickup, 10 max).
- 2026-11-06: first-person gunplay. Hold the right mouse button to aim down the sights (zoom, tighter aim, slower walking, no sprint). Guns have a magazine (pistol 8; shotgun 4 loaded one shell at a time, and can be fired mid-reload) plus reserve ammo; R reloads, an empty gun reloads on the next click. The held arm and weapon are moved every display frame from the camera rig (`scripts/lib/vmpose.js`) with sway, bob, recoil, reload and equip animation, and have gun sounds for shots, dry fire, magazine and shell loading, pump and raise.
- 2026-11-06: critter look pass (reference: the Dandy's World OC base and CalArts-style cartoons). Thick ink outline on every critter (the material's native `outline`), smaller torso, big ringed eyes with one flat pupil and no shine (the creator dislikes highlights and busy faces), fully matte fur. New customization: eye shape (round / tall / wide) and face marks (freckles, forehead stripes, eye patch, cheek heart). Ten new expressions (laugh, blep, sparkle, kiss, shy, pout, evil, bored, cry, dizzy) for 21 in total, a rounder toothy grin, fangs on cat, fox and wolf.
- 2026-11-06: more critter variety. New animals: panda (black ears, limbs and eye patches), pig (snout), sheep (dark face, wool puffs), lion (mane, tail tuft). New outfits: jacket, half apron, pyjamas. New head and face accessories: beanie, crown, headphones, party hat, sunglasses. Objects as species come later.
- 2026-11-06: critters feel alive. They blink every few seconds (a closed-eye lid per eye, modelled tiny on its own bone and scaled up for about a tenth of a second; sometimes a double blink; skipped when the face already has closed eyes), twitch an ear now and then, and their ears and tail spring when they move (the engine's `jiggle`). The standing and walking motion is the engine's Idle/Walk/Run clips.
- 2026-11-06: critter bodies. Mitten hands like the reference bases (a soft paddle, a thumb nub in front and a rolled cuff at the wrist), rounded shoulders so arms join the body smoothly, chunkier thighs, big round bean feet, and a clearer waist-to-hip curve on the girl build. The first-person hand (scripts/viewmodel-geo.js) is still a realistic fingered hand: a mitten version of it would match the critters better.
- 2026-11-06: Fallout-style looting. Nothing is picked up by walking over it any more. Look at an item (within 3 m, nothing solid in between) and the HUD names it with its stats ("[E] Take Pipe scrap"), and it glows; press E to take it. Crates in the maze and the remains of killed smilers and lurkers are containers: press E on one to open a loot menu listing what is inside, with Take (click an item), Take all (R) and Close (E); walking more than 4.5 m away closes it. Corpses only appear if they carried something and are cleared when emptied or after 150 s. Switching weapons moved to X and the mouse wheel to free E. Items are short text tokens (scripts/lib/items.js), applied by `takeToken` in player.js.
