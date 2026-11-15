---
name: Game sound
description: The whole sound of a Spawn game beyond its effects kit: the mix's anchor and bus gains, music direction (moods, stems, stingers, holds), ambience beds and sweeteners, room tail, footsteps by surface, voice lines and barks, ducking, crowd rules for many units, and the listening pass. Run on Shattered Earth: Abyss (Nov 2026) for the effects, beds and listening pass; music, footsteps and voice sections are still starting values to tune by ear.
---

# Game sound

The problem: a game with good single sounds that still sounds wrong as a whole. Music restarts or flickers, a bed drones, forty units step at once, a voice line drowns under a fight. `sound-direction` makes the effects kit. This skill makes the rest and joins it into one mix. Order: the mix's shape, then music, ambience, footsteps, voice, then the pass.

Status: §1, §2's crowd rules, §4's bed and room, §7 and §8 were run on a top-down management game (Shattered Earth: Abyss): about 90 clips recast into one material family, levelled to -18 LUFS, with the creator judging by ear. §3, §5, §6 and lines marked (untested) are researched, not yet run.

## 1. The mix: an anchor, pillars, a bed

- **Name the anchor first**: the one thing the player must always hear, set by the core verb. Strategy and management: orders, alerts and what the player's units are doing. Shooter: the player's gun. Narrative: dialogue. Platformer: the body's movement. Every other level is balanced against the anchor, never the other way round.
- **Then two or three pillars** (the sounds that carry information most often) and the bed (music, ambience, far world). A mix is the answer to one question asked every second: what does the player need to hear right now?
- **The game's bus gains are one row** in world.config.yaml: `audio.gains { Master, Music, SFX, UI, Ambience, Voice, Footsteps }`. Starting shape: Voice 1.0, UI 0.9, SFX 1.0, Music 0.7 to 0.8, Ambience 0.6 to 0.8, Footsteps 0.5 to 0.7. A bus gain is a family decision; one loud sound is that sound's row, never the bus.
- **Loudness is authored in gain.** The engine's limiter catches peaks; it does not make a balanced mix. Level clips to one reference first (`sound-direction` §2), then the bus row means something. Console practice (Sony's ASWG-R001) is about -24 LUFS integrated for a living room and -18 for a handheld, true peak under -1 dBTP, measured over a long stretch of real play: use it as a check on a recorded play session (`ffmpeg ebur128`), not a target to chase per clip. A browser game on laptop speakers and phones sits nearer the handheld figure (untested).
- **No volume UI.** Spawn's rail owns the player's dials. A game may carry one mute. The mix is the gains row and the table.
- **Voice cap**: `maxVoices` (32 by default) and `cullBeyond` are the room's budget. Give warnings and voice lines a high `priority` so the cap takes a pick strike, never the "Heart under attack" line.

## 2. Ducking: who gets out of whose way

- **One ladder, top wins**: voice line > warning > the player's own acts > world > music > ambience. A higher rung ducks the rungs below it, never the reverse.
- **Music under a voice line**: 6 to 10 dB down (gain about 0.5 to 0.3), fast in (about 50 ms), slow out (300 to 500 ms). In the engine: `ctx.music.duck(0.4, { duration })` called from the line's `onPlaying` hook, so the duck starts at the first heard sample and not when the line was asked for. Its attack and release are the engine's; the amount and the hold are yours.
- **Effects under an alert**: the table's own duck row. While an alert plays, world and bed tiers play at about half; the player's own acts are untouched.
- **A crowd ducks itself**: many copies of one family must not add up. The table's cap and step-quieter rule (`sound-direction` §2) is the script form of a self-ducking bus. Past the cap, the nearest to the screen centre win.
- **A duck that pumps is too deep or too fast out.** If the music audibly breathes under every bark, raise the floor to 0.6 or stop ducking for barks and keep it for full lines.

## 3. Music direction

- **A mood table, not calls scattered in scripts**: one data row per mood (track, fade in, hold) and one function that reads the game's state and returns a mood. One place calls `ctx.music.play`. Calling it with the same clip is free, so it can run on a slow tick.
- **Write the moods as a ladder of energy**: menu, calm, tension, fight, aftermath. Three to five is enough. Each mood names what game fact turns it on, and that fact must be something the player can see.
- **Hold times stop flicker**: a fight mood stays 6 to 10 seconds after the last blow; a calm mood needs 15+ seconds of calm before it returns. Fast in to danger (0.6 to 1.5 s fade), slow out to calm (2.5 to 4 s).
- **Three ways music follows play**, pick per game:
  - *Horizontal*: a different track per mood, crossfaded. Simple, tells the player the story moved. The cost is the seam.
  - *Vertical*: one piece cut into stems (bed, pulse, drums, lead) that start together and fade in and out by intensity. No seam, but it cannot change key or form. In the engine a stem is a `layer`; start every stem in the same tick at volume 0 or 1 and ramp volumes, never restart one (untested: check the stems stay in step over ten minutes).
  - *Stingers*: a 1 to 4 second phrase over whatever plays, for a find, a level-up, a boss stepping in. `loop: false` on its own layer. A stinger also hides a hard mood change.
- **Shared key and tempo across every track** is what lets any of this work: crossfades and stingers land anywhere without clashing. Put the key and tempo words in every track's name.
- **The engine crossfades on time, not on the bar.** So: fades long enough to blur the bar (2 s+), or a stinger on top of a short one. No beat-matched jump is promised.
- **Silence is a mood.** After a long fight, 5 to 10 seconds of bed only before calm returns. A loop heard for 20 minutes needs a rest: a playlist of two or three calm tracks crossing near each track's end, or a stretch with no music at all.
- **Music level**: under the anchor always. If a tester turns music down in Settings, it was too loud or too busy, usually both.

## 4. Ambience and the room

- **Three layers**: (1) a bed: one quiet loop per zone, `ambience-…-loop`, gain about 0.1 to 0.2, with no event in it a listener could count; (2) sweeteners: short one-shots (a drip, a far rockfall, a bat) at random spots around the ear, every 5 to 15 seconds, never the same one twice running, the next one waiting until the last has ended; (3) spot emitters: a placed looping row on the thing that makes the sound (a forge, a waterfall), gain about 0.2, `maxDistance` where the source leaves sight.
- **Loops sum.** Ten torches are not ten loops at 0.2: one row per cluster, or a cap by distance to the ear.
- **Zones change by crossfade**: start the next bed silent as the player nears the border, cross over 2 to 4 seconds, stop the old one. Never cut a bed.
- **The bed answers the game**: thin it during a fight (duck Ambience with the world tier), let it come forward in the quiet after. Day and night, depth, weather are bed swaps, not new one-shots.
- **One room for the whole game**: `ctx.place.acoustics.reverb` sets the place's tail (0 dry to 1). A cave or hall sits around 0.3 to 0.5, open ground 0 to 0.1. Make every clip dry and let the place add the room; a clip with its own baked hall inside a place with a tail is two rooms at once. UI and voice-over stay dry.
- **A sweetener must fit the kit**: it comes from the world's source materials (`sound-direction` §1), and it must never sound like a gameplay cue. If a tester turns to look for it, it is too loud or too close to a real alert.

## 5. Footsteps and movement

- **Decide first whether steps exist.** One body in close view: yes, they are the body's weight. A top-down crowd: individual steps are noise. Use a group layer instead (one soft "troop moving" loop whose gain follows how many bodies move on screen) and keep single steps for heroes and big things.
- **Surface picks the clip**: read the ground under the foot (terrain material, tile kind, a tag on the floor object) and map it to a short set: stone, dirt, wood, water, metal, grass. Unknown falls back to the place's main surface.
- **Per surface**: 4 to 6 takes, never the same twice running, pitch ±3 to 5%, gain ±1.5 dB. Under 0.25 s, dry, no tone.
- **Timed by the walk, not a timer**: fire on the animation's foot-down, or on distance travelled (one step per stride length), so a slow walk and a sprint sound different without new files. Run = same takes, slightly louder and brighter, shorter gap. A landing is its own heavier clip sized to the drop.
- **Size is the same source at another weight**: a small body tighter and brighter, a large one lower and longer with a short ground thud layered under.
- **On their own bus** (`Footsteps`) at the bed tier: about 0.2 for others, a little more for the player's own body. `follow` keeps a positioned step on the mover.
- **Cloth and gear** is a second quiet layer on the same trigger for a hero in armour; skip it for crowds.

## 6. Voice lines and barks

- **One throat per character**, one constant every line derives from. A cast list is a table: who, throat words, which events they speak on.
- **Barks are information, not flavour**: a unit's reply to an order, an alert, a death. Each bark event gets 3 to 5 lines, no repeats until the set is used, a per-speaker gap (4 to 8 s) and a global gap (1.5 to 3 s) so two voices never overlap. One voice at a time; a higher-rank line may cut a lower one, never talk over it.
- **Rank the lines**: alert ("the Heart is under attack") > story line > order reply > idle chatter. Idle chatter is the first thing cut and should be rare enough to be noticed.
- **Alerts are not positioned** and never thinned: the player hears them wherever the camera is. An alert also needs a cooldown per kind (20 to 30 s) and an on-screen mark, so the ear and the eye agree.
- **Voice level**: the loudest steady thing in the mix, on the Voice bus, dry. Music ducks under full lines (§2).
- **Captions come from the hook**: show the caption at `onPlaying` and clear it at the sound's end, never by a guessed length.
- **Never relay a player's own words** through a game voice; voice chat and its moderation are Spawn's.

## 7. Many things at once (strategy, hordes, top-down)

- **The ear rides the view**: put the listener on the ground at the screen's centre (`ctx.place.listenerEntity`), not up at a far camera, or everything is equally distant and thin.
- **You hear what you see**: full inside the view, a short fade band outside it, silence beyond and under fog. Alerts, UI and voice are the exceptions.
- **Zoom is a level of detail**: close in, single strikes and steps; far out, fewer single sounds and more group layers (the battle as one bed, the work crew as one bed), everything a little quieter.
- **Distinct by silhouette**: each unit family's attack and death should be nameable with eyes closed. Heroes get a wider reach and a tier above the crowd.
- **Per family caps before per clip gains**: a cap per window for work sounds, for hits, for deaths; nearest to the centre win.

## 8. The pass: how a game's sound is judged

1. **Census**: list every placed `audio` row, what `ctx.music.now()` reports, every table row, and which bus each rides. Anything not in the table or the mood table is a stray.
2. **Measure**: level per clip (RMS, head silence, length), then integrated loudness of a 5 minute recorded play session. Numbers find outliers; they do not approve a mix.
3. **Four listens** in real play: the quiet minute (does the bed breathe or drone); the worst pile-up (can the anchor still be heard); a voice line during that pile-up; twenty minutes on (what has become tiring: that is the next cut).
4. **On small speakers**: a phone or laptop. Anything that only lives in the low end is silent there.
5. **The creator's ear decides.** Their verdict per family goes at the top of the table. Say what was heard, what was only measured, and what nobody has listened to yet.

## 9. When the generator will not make it

Proven on Abyss: small creature cries (rat, bat, spider), a loss sting and a cave-in failed three to five named takes each, coming back as toys, gunfire, wind-up clicks or papery rustle. Five rewordings rarely beat the second. After two misses, cut it by hand from takes that did pass:

- **Layer what passed**: a loss sting = the darkest passing pad or gong (first 5 s) with a passing masonry rumble 0.3 s under it, faded out over 1.3 s. A cave-in = the one take that really reads as stone sliding, top cut at 6 kHz.
- **Pitch and filter a near-miss**: a squeak that reads as a toy loses it at -12% pitch, a 6.5 kHz low-pass and the game's room.
- **Synthesize only what is simple physics**: bat chirps are three 35 ms sweeps from 7.5 to 4.5 kHz over band-passed brown noise with an 18 Hz tremolo (wing flutter).
- **Same room, same loudness**: every hand cut gets the kit's one short room (two taps, 45 and 90 ms) and the batch's integrated loudness (`ffmpeg loudnorm=I=-18:TP=-1.5`), or it stands out as a different game.
- **A blind listener cannot judge tiny cries**: a real rat squeak and a toy squeak read the same in text. Compare against the old row; if the hand cut is no worse and sits in the family, wire it and name it for the creator's ear.
- **A bed swapped in the table must swap live**: a looping row spawned once keeps its first clip. Patch `o.audio = { ...o.audio, clip }` when the table's clip differs.

## Sources read for this draft

Sony ASWG-R001 loudness figures; Greg Lester, "How to mix and QA test your game" (anchor and pillars, culling); Stray Pixels, "A technique for mixing RTS audio" (alert ducking, self-ducking unit groups, 2D attenuation); "A Year of Rain: Battling with Sound" (listener at screen centre on the ground, unspatialised alerts, distinct sets, instance limits); Mark Hollier, Eon Altar ambience system (zone beds primed and crossfaded, random sweeteners that wait for the last to end); Starchild Music on horizontal, vertical and stinger music and shared key/tempo; common practice figures for voice ducking (6 to 10 dB, about 50 ms in, 300 to 500 ms out).