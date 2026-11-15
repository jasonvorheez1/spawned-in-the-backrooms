---
name: Sound direction
description: Make a game's sound effects one coherent kit instead of hundreds of unrelated files: a source kit per family, one table every script plays through, levelled clips, loudness tiers, gaps and caps, a naming recipe, and the listening checks a batch must pass.
---

# Sound direction

The problem: each sound named, made and placed alone, at whatever volume its maker needed that day. The result sounds like many games at once. A sound designer makes a kit, then a mix, then the sounds. Do it in that order.

## 1. The kit: what this game is made of

- Write the world's source materials once (from its look: e.g. wet timber, leather, iron, brass, bone, mud, stone). Every sound is something a microphone could record in that world.
- Each family (each element, weapon class, monster family, loot, UI) gets 3 to 5 source materials. A new fire skill gets the fire kit at a new weight, never a new idea of fire. Small and big are the same source: small is tighter and brighter, big is lower and longer.
- Synthetic sound must be earned by the fiction. If the game has one digital or alien thing (a system voice, a machine), that is the only synthetic voice, and the contrast is the point.
- No melody in the fight: chimes, choirs, swells and flutes clash with the music and tire the ear. Tonal sounds are kept for rare rewards, and the reward family is one instrument (for example one struck bell, graded by size).

## 2. The mix: one table, one door

- **Every sound effect plays through one helper that reads one table**: event name → takes, tier, gain, pitch jitter, gap, cap, reach. No script names a clip or a volume. Voices and music can stay outside it.
- **Level every take before it gets a gain**: trim the head silence, make it mono if it plays from a point, level it to one reference (about -20 dB RMS). Only then does a gain mean the same thing for every sound. Unlevelled clips commonly span 20+ dB.
- **Tiers, loud to quiet** (starting values to tune by ear): warnings (boss tells, hit taken, low life, death) 1.0 and never thinned; the player's own casts and hits 0.7; the world (monsters, other players, loot landing) 0.4; the bed (steps, cloth, small ticks) 0.2; UI on its own bus, not positioned; rare rewards on the UI bus.
- **Every event has a gap and a cap**: about 60 ms between plays of one event and 3 copies alive at once; each extra live copy plays a step quieter; when the cap is hit the losing play is skipped, never queued. A pile of the same thing should sound like one sound getting thicker, not a machine gun.
- **How often decides how big**: many times a second → under 0.4 s, dry, no tone, 4+ variations; every few seconds → under 1 s, clear attack, short tail; a few times a run → may ring; once a session → the one place for a long, big sound.
- **Mine is near, theirs is far, UI is nowhere**: the player's own sounds play at their body with a generous full-volume distance so a far camera doesn't thin them; world sounds at their source with a limit around 30 to 40 m; UI and reward stings are not positioned.
- **One clip, one meaning**: if the rare-drop bell also plays for "chest opened" and "quest done", it teaches nothing. A new meaning gets its own row, even if it reuses a family member.
- **Take sound away to make a moment**: a boss entrance or a legendary drop ducks the world and bed tiers for a second; loud is made by the quiet around it.
- **Decide what gets no sound.** Silence is a valid row. Fix caps, gaps and ranks before making a new file.

## 3. The making: a sound is made from its recipe

- Keep a short recipe per kind of sound (what it is made of, how long it may be, the shape of its name). A sound that fits no recipe gets a recipe first.
- **Name the physics, never the mood**: the name is the prompt. Say what hits what, how hard and how long: `waxed bowstring snapping off a wooden limb with a low thump, single, dry, close, 0.25 seconds`. Avoid magic, mystic, shimmer, sparkle, ethereal, epic, swell, choir, and "whoosh" alone.
- **One event per file.** A cast, a flight and an impact are three files. A name asking for two events comes back smeared. A hit or click peaks within about 15 ms with no dead air before it.
- **Hold the session constant**: always "single", "dry" (the place adds the room), close, with a length word. Change one slot at a time.
- **The hit is told by what was hit**: the weapon picks the swing, the target's material picks the impact (flesh, bone, plate, wood, stone), the outcome (block, crit) picks the top layer.
- **Weight**: lightning is a whip crack and a short low thud, not rolling thunder; a war cry is one human chest voice, one syllable, pitched down, not a scream. Real matter is the body; the element is one layer on top.
- **Variations or it doesn't ship**: anything heard more than once in ten seconds gets 3+ takes, played without repeats, with about ±4% pitch and ±1.5 dB on top. No pitch jitter on tonal clips.
- **Reuse before making**: a shared body layer per family plus one identity layer per skill beats two unrelated files.
- **Make to reject**: make several takes, measure them (length, attack, level, band), drop the ones outside the recipe without listening, and only listen to the rest. A flawed take is replaced, never just turned down.

## 4. The check

- Measure every new file: no head silence over 20 ms, attack and length inside its recipe, not tonal unless it is a reward.
- Hear it in the fight three ways: alone; in a big pack with the skill held for 20 seconds; with the music up. If it tires in the held test, it is too long, too bright or too tonal.
- Your own listening is borrowed (reading the clip, the device's sound line during play). The creator's ear decides: after each batch they tap through the new sounds in play order, and their verdicts go at the top of the table before the next batch.
- Say what was heard and what was only measured. "Wired" or "loads with no errors" is not "sounds right".