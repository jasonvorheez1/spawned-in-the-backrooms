# The Backrooms: lore so far, and how the enemies think
Written Nov 9 for Shelly. Lore follows the Wikidot Backrooms with this game's own liberties. The lorebook (Worldwright Studio) is the source of truth; this page holds the same text, ready to go in.

## The world
You no-clip out of a 2000s bedroom into the Backrooms. HALOGEN, a wrist unit owned by Backrooms Robotics, runs your gear, stats and notes. M.E.G. and B.N.T.G. are the big human groups. Almond water is food, drink and money. The main quest burns slowly from Level 1 to Level 5, and you can break the order (Level 26 early). Phoebe appears in the intro, then hides until SS Fun.

## Levels
- **Level 0, The Lobby.** Endless mono-yellow wallpaper, damp carpet, a fluorescent hum. Walls shift. Smilers and lurkers roam. A safe room holds Kade, a B.N.T.G. official, and the locked bulkhead to Zenith.
- **Level 0.1, Zenith Station.** A damaged spherical research station grown into Level 0, built of metal and glass. The habitation ring of Sector 7-C has a vestibule, a spine hall that stays intact in the south and fails toward the north, and eight rooms: control, lab, crew quarters, a frozen wash room, mess and galley, hydroponics, gym, and an overheating maintenance room. A gallery window looks out over the hollow shell and its lit core. Cleaning bots still keep their routes. Security drones still guard the halls (see below). Kade's job, The Zenith Survey, sends you for the flight-recorder drive in the control room.
- **Level 1, Habitable Zone.** Concrete warehouse halls with supply crates and flickering lights. Hounds hunt the halls. The corridors are safe ground.
- **Level 2, Pipe Dreams.** Hot, narrow maintenance tunnels full of pipes and sludge. Survivors Hollis (medic), Mags (trader) and Wren live here.
- **Level 2.1, Locked.** Home of Base Alef.
- **Level 3, Electrical Station.** Humming machinery, and blackouts that bring the horde.
- **Base Gamma.** A M.E.G. outpost.
- **Level 4, Abandoned Office.** Residents keep schedules and claim homes. Time 4 Fun posters hang here only.
- **Level 5, Terror Hotel.** Residents' rooms, a ballroom, a library with ladders, and Facelings working as staff. Death Rats nest in the Boiler Room.
- **Level 6** (and 6.1). Dark, with no hunger or thirst drain.
- **Level 7, Thalassophobia.** A sea of islands with forts, a dory you row, and timber towers you climb.
- **Level 8, Cave Systems.** A flooded cavern, spider nests with a Broodmother, a tar pool of grasping hands, Carla and her kazoo.
- **Level 10.** A wheat field over a silo, with earthworm swarms under the soil.
- **Level 11.** An endless city with hackable panels.
- **Level 26, SS Fun =).** A party liner in green fog. Phoebe is glimpsed here, then gone.
- **The Bonus Room.** A shared vaporwave mall with shops, an arcade, the Glow Up Salon and the Teleport Station. It's the one multiplayer hub.
- **Spamton's alley.** Talk first, then a real-time fight: spare him or shoot him down.

## Zenith security drones (new)
Backrooms Robotics security units still running their patrols. They speak in a sentry bot's voice.
- **Watcher.** Light and quick. Fires single red bolts. Below 30% hp it stops shooting and rams you, then blows.
- **Enforcer.** Mid-weight. Fires three-shot orange bursts and backs off when hurt.
- **Warden.** Heavy and slow. Charges a purple beam for about a second (you can hear the whine), then hits hard.
- They drop energy cells, and sometimes a ZL-2 laser pistol or a ZR-7 laser rifle. Those weapons run on the **Energy Weapons** skill (Perception-led).

## How the enemies think (report)
Each kind runs on one manager script that steps the whole pack. That keeps them cheap and keeps them moving in step.

| Enemy | Senses | Plan | Strength | Weakness to fix |
|---|---|---|---|---|
| Smilers (L0) | sight | drift room to room, lock on, stalk, lunge and bite | a flashlight freezes them, a good scare | no hearing, no group play |
| Lurkers (L0) | your view of them | move only when unseen, then close fast | real tension, costs sanity | steady once you learn it |
| Hounds (L1) | sight and sound | roam, hunt, hunt harder in a Flickering | hearing makes sneaking matter | straight-line chase, no flanking |
| Death Rats (L5) | nearness | come up from the vents in packs, swarm when alone or hurt | scatter from light or a raised weapon | little reaction to losses |
| Spiders (L8) | nearness | nest hunt, can't swim | water is a counter | simple chase |
| Worms (L10) | footsteps in the crop | track the ripple, erupt, bite, sink | standing still is the counter, a clear rule | — |
| M.E.G. agents and NPCs | sight, reputation, witnesses | remember who shot first, fight rival factions, shove trespassers | social memory, stealth, pickpocket | ranged cover use is thin |
| Spamton | scripted | circle, throw money, stop to talk | a boss with a spare path | one arena only |
| Horde (blackout) | given your position | everything hunts you and tears at your builds | the big set piece | — |
| Zenith drones | sight with line-of-sight rays | idle, alert, combat, search; call backup within 18 m; each drone takes its own bearing so two pinch you; juke when hit; search where you were last seen; lead into kamikaze or charge shots; spiral down and explode on ko | the most tactical enemy so far | no cover-seeking yet |

**What would lift the rest, in order:**
1. Shared hearing. Gunshots already emit noise, so every pack should take `noise` the way hounds do.
2. Last-known-position search for every hunter, like the drones, instead of giving up or tracking you perfectly.
3. Spread around the target, so packs pinch and flank instead of queuing in a line.
4. Morale: a pack that loses half its members breaks and runs (rats first).
5. Agents who fight with guns use cover: pick the nearest wall ray off your line, then peek out to shoot.
