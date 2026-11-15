---
name: Trailer actor
description: A scripted player that plays the game on the filming page, so every take repeats: how to gear it, drive it from the game's own HUD, stage its fights, and what to check before a take is kept.
---

# The trailer actor

A take is only as good as the play in it. A live agent driving the hero wanders, freezes or reacts seconds late, and an autopilot or test flag is not play. The actor is a small script on the filming box that presses the same keys and mouse a player would, reading what the player reads. Judge it by the take, not the method; if the creator's own hand plays better, film the creator.

## The page and the hero

- The filming browser's own player is the hero: a fresh nameless player, not your body. Your body's page films nothing worth keeping and wears your look, not the hero's.
- Set the hero up by run_script on that player before rolling: level, gear, gems and key binds, a pass flag the film stage admits, then cross it where the shot is. Write each setup as one function you can rerun; a kit that "applied" is checked by reading the state back, binds included.
- **Gear to the zone, not to win.** A hero far above the zone kills in one hit and the fight reads empty; a hero below it dies on camera. Aim for packs that take 2 to 4 casts. Real gear with real affixes (the game's own item roller) beats raw stat edits, which leave tooltips and numbers wrong.
- Dismiss every leftover panel before rolling: death recaps, "slain by" bars, tutorials, task popups, level-up toasts from setup. A stale panel from an earlier death ruins a perfect fight.
- View settings (zoom, camera distance) often reset when the hero crosses into a place: apply them after each arrival, then wait for gear and props to finish loading.

## Reading the game like a player

- Read the game's own HUD in the page (enemy plates or bars and their screen positions, the life and mana readouts) through the browser's DevTools protocol. That is what a player sees, so the actor reacts to the same things, on the same frame.
- A loop of about 10 Hz is enough: pick the nearest live enemy, walk toward it when far, use the gap-closer at mid range, and in range aim at the pack's centre and run the rotation. Low life: drink, step back, return.
- Ranged and caster heroes kite: step away between casts, never stand and tank. Melee heroes close, hit, reposition. A hero standing still while enemies walk in reads as a bot.
- Use the build's whole kit on camera: if the trailer sells auras, charges, a bar swap or a summon, the rotation has to show it, and the frame has to show it working (the buff ring, the charge counter, the minions). Count it in the frame sheet, not the script.
- To show a skill growing, repeat the same skill at each step; a different skill each step reads as a list.

## Where to film

- **A solo copy or a film stage** that nobody else simulates gives repeatable takes: an encounter director lays each pack on cue, enemies walk in, shuffle and swing. Keep its floor wide and flat so the actor never wedges or sinks.
- **Real zones** give variety and life (events, loot, rares) but other players and shared simulation can cause stutter or enemies jumping. If a take shows either, test the same shot on the stage before blaming the capture or the game.
- Scout each location before filming: is the floor flat and walkable for the shot's length, do the boss bars and telegraphs fit the frame at the trailer's zoom, does the crossing land the hero with live packs nearby.

## On set

- Roll 2 seconds before the action and keep 1 to 2 seconds after; trim in the cut.
- Film each shot at least twice its needed length, and more than one take.
- A boss shot needs the boss's tells to be read: the actor dodges the telegraph, or the take shows the hit landing on purpose. Never cut a boss take moments before the hero dies; a death reads as the game being unfair.
- In a vertical frame, keep boss and rare bars inside the crop; check one full frame per shot before cutting.

## Before a take is kept

- A frame sheet at 1 per second plus one full frame at the action: no black, loading, frozen frames, gear pop-in, stuck hero, panel half on screen, or bars cut off.
- Measure frame timing (gaps over 50 ms, duplicate frames) instead of eyeballing.
- Write down what the actor really did in each kept take (kills, skills used, deaths) so the cut's claims stay true.
- Tell the creator what was staged: a spawned pack, test gear, a scripted trigger. They decide whether it belongs in the trailer.