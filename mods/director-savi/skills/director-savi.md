---
name: Director Savi
description: Plan, film, cut and finish a game trailer for a Spawn world. Ask the creator four questions (style, with a HUD yes/no for in-game styles; platform; content; Spawn endcard), turn the answers into an exact shot plan, then film, title, score and deliver it to the chosen platform's specs.
---

# Director Savi

The problem this solves: a trailer filmed and cut at random. It plays like a screen recording, puts plain painted text on top, and ignores how the target platform is watched.
A trailer is directed: a decided style, a known platform with its frame and length, one focus, and title cards that belong to the world.

Run the steps IN ORDER. Step 1 is talk: ask, wait. Step 2 is one plan message: show it, wait for a go. Steps 3–5 are the work.

## Think it through first (before the questions are even answered)

The rules below are a floor, not the recipe. Before planning, think the trailer through like a director:
- **Who watches it, where, and in what mood?** A TikTok scroller decides in a second, a Steam visitor is already curious, a Discord member already plays. That decides the hook, the pace and the length.
- **What is the one feeling or promise this trailer sells?** Write it as one sentence ("your team of strange heroes tears through a dying world"). Every shot either serves it or gets cut.
- **What makes this kind of trailer good, and what makes it bad?** Name both for this trailer before planning: e.g. good = variety, motion every second, the music driving the cut, words that sound like the world; bad = one character over and over, silence, slow fades, default fonts, plates that fight the mood, flashes that hurt.
- **Does every choice fit the music and the vibe?** The type, the card style, the transitions and the colour come from the track and the world, not from habit. A dark, heavy track wants the world's own gothic type straight on the footage. A plate or banner is a choice for when it fits, not the default. Flashes can be soft or not there at all.
- **What is the trailer really showing?** Pick shots for range: different heroes, different places, different moments. Several looks of the same hero only when the trailer is about that hero. Count claims the way the game means them (kits, versions, places), and say which.
- **Would you stop scrolling for it?** Watch the plan in your head at real speed. If a second is boring, it gets fixed on paper, not after filming.

Put this reasoning in the plan (Step 2) in a few lines: the audience, the one promise, the good and bad you're steering by, and why the type, music and pace fit. The creator corrects the thinking there, before any filming.

## Step 1: the four questions

Ask them in ONE message, numbered, each with its options. Offer your own pick for each, marked as your pick, so a one-word answer like "yes to your picks" is enough. Wait for the answers.

1. **Video style**: which kind of trailer?
   - **story**: a painted, animated telling (lore, a character, a moment). Painted stills brought to life, a voice or text that carries a story, game footage only as the payoff.
   - **gameplay**: real play, longer shots, the loop readable: what you do, what answers you, why it is fun.
   - **highlights**: short, fast cuts, each one a best moment (a crit, a summon, a boss, a victory), cut to the beat of the music.
   - **2d animation**: characters animated as sprite cycles (walk, run, attack, cast, idle) over a painted background that stays fixed or scrolls in parallax, like a 2D animated short. Good for a story beat, a hero reveal or a chase. Not tried yet: always test one 3–4 s shot first (see "2d animation shots" below).
   - several can mix (a story open into highlights); the answer names the main one.
   - **1a. HUD: yes / no** (asked only when the style films the game itself: gameplay or highlights, or a mix with in-game footage). Yes = the game's own HUD stays in frame (health bars, damage numbers, turn order, buttons), so the shot reads as real play. No = film with the HUD hidden for clean, cinematic frames (hide it through the game's own UI state or a camera take with no HUD, never by cropping). Either way, never Spawn's rail, the fps counter, chat or dev overlays. Your pick: yes for gameplay, no for highlights unless the HUD's numbers are the point (a crit, a damage burst).
2. **Platform(s)**: where it will play. Each platform maps to its frame, size, length and best practices in `lib/platforms.yml`. Several platforms mean one master edit and a cut per platform, never one file stretched to every frame.
3. **Content**: what this trailer is about. A latest update (read `spawn versions` and the patch notes and list what is new), the lore, one hero or feature, or something specific they name. One focus per trailer; everything else is background.
4. **Spawn endcard**: yes / no. Yes = the last 1.5–3 s is the game's title plus "Play free on Spawn" (or the platform's call to action) in the world's own title style.
   - **The endcard is the game's own logo, never a new one.** Take the wordmark from the launch kit (`spawn launch_kit look` → `wordmarks[0].url`, a transparent png) or the logo the creator hands you, on its own plain dark ground, with the call to action under it in the game's type. Never re-letter the title in a font, never put it on a new banner, never invent an endcard.

## Step 2: the plan (one message, then wait)

From the answers, write the shot plan before filming anything:
- the target file(s): platform → aspect, resolution, fps, length cap (from `lib/platforms.yml`)
- the thinking: audience, the one promise, the good and bad to steer by, why the type, music and pace fit
- the beat sheet by seconds: hook (0–2 s), each shot with what it shows and why, the title cards and their exact words, the endcard
- the music: which of the game's own tracks and where the cut lands on its beats
- every number or claim on a card, with the file it was counted from (count it again on the day of the cut)
Show it; wait for the creator's go or edits.

## Step 3: film with intent

- Film each shot on purpose: put the camera where the moment lands, wait for the moment, and capture at least twice the length you need. Never film one long take and hope.
- Film at the platform's frame: portrait for a 9:16 target (a real portrait viewport, never a crop from landscape unless the plan says so), landscape for 16:9.
- **Resolution**: the frames must reach the target size. A 390 px wide phone viewport scaled up to 1080 is soft. Film at device scale ≥ 2.5 or a larger viewport and check one frame's real pixel size BEFORE filming the rest (`ffprobe` on a frame). If the capture comes back smaller than the target, stop and fix the capture; do not upscale and ship.
- No dev UI, test flags, debug text, editor overlays or the fps counter in frame. Use a fresh or clean save when the shot is a first impression.
- Check every take's frame sheet (one frame per second) before you cut: black, loading, frozen, blurry, a hero clipping or a panel half off-screen means film it again.

### 2d animation shots

Built on the **sprite-cycle** mod's recipe (`use_skill({ skills: ["sprite-cycle#sprite-cycle"] })`; install it if it isn't in this world). Read its skill and worked example before the first shot.
- **Characters**: use the game's existing painted sprite sheets where they exist (they already match the game's art). Make new cycles with sprite-cycle only for what the shot needs: one direction (usually the side view, E/W, for movement across the screen) and only the clips in the beat sheet. Skip sprite-cycle's pixel step unless the world itself is pixel art: a painted world keeps painted frames at full resolution.
- **Background**: one painted plate per shot with `spawn paint`, in the world's look (its look file if it has one, else a screenshot), with no characters in it, at least the target frame's size. For a moving shot, paint it as 2–3 layers (far sky/mountains, mid scenery, near foreground) on wide canvases (≥ 2× the frame width), and scroll each at its own speed (far slowest) for parallax.
- **Staging**: put each character on a ground line with its feet pivot and a soft contact shadow. A walk or run moves across the ground at the speed its feet travel, so the feet don't slide (match the cycle's stride per loop to the pixels moved, or move the background instead of the figure). Hold the cycle's fps (often 12) while the video runs at the platform's fps.
- **Compositing**: ffmpeg `overlay` of the keyed RGBA frames onto the background layers (or a short PIL script that writes the frames), then add game FX, a light grade and camera moves (a slow push-in or pan) so it doesn't feel static.
- **Check**: a frame sheet AND a real-speed watch of the test shot: foot slide, flicker at the cycle seam, edge halos from keying, and the figure's scale against the background. Show the creator the test shot before making the rest.

### hero line-ups and reveals

- **One scale for everyone, by real body size.** Never fit each sheet to the frame: a show-off sheet's box includes weapons, wings and effects, so fitting boxes makes a dwarf or a small creature as tall as a human. Measure each hero's head-top and feet in its own sheet (a frame sheet with 10% lines), then scale so head-to-feet = one human height × the race's size (read `race` in the hero data and ask the creator when sizes aren't written down; e.g. small races ~0.55, dwarves ~0.72, big golem races ~1.25). Feet on one ground line, every hero.
- Weapons, wings and spell effects may pass behind a title plate; the head and face never do: keep every head below the plate's lowest edge, the largest hero first.
- Show many different characters, not versions of one, unless the trailer is about that one.

## Step 4: titles, writing and music

**Title cards are design, not captions.** Every trailer needs proper title cards. Plain text from an image generator or a default font over the footage is not a title card.
- Use the world's own type (the font the game's UI ships, or the wordmark's letterform, e.g. a blackletter) and its palette and finish (read the world's look file if it has one, else its HUD and a screenshot), with a stroke or shadow so it reads on any frame. A plate, frame, rune or seal from the game's UI is optional: use one only when it fits the music and mood; often the type alone, right on the footage, is stronger.
- Write like the world, in the trailer's voice: a story trailer speaks in the lore's tone (a line a character would say, a prophecy, a name); a gameplay or highlights trailer speaks in short, punchy claims. Never generic marketing filler ("an epic adventure awaits").
- Cards enter and leave with motion (a stamp, a slide, a burn-in, a light sweep), never a hard pop on and off. Max ~6 words on a card; it stays up long enough to read twice (≈ 0.4 s per word, at least 1 s).
- **Text fits its card, every frame.** A framed plate (banner, scroll, cartouche) has an inner panel: measure that panel once in the plate image's pixels (where the dark face sits, minus gems or ornaments that cut into it) and fit every line inside it with a margin (scale the text down, never let it run over the frame). One line per plate; a second line gets its own card or replaces the first after a beat. Entry motion grows INTO the panel (0.85 → 1.0), never shrinks from bigger, so no frame spills. Check the busiest card (longest word, biggest number) at full size before rendering.
- **Flashes are soft or absent.** A cut flash peaks at 30–40% white over ≤ 0.1 s, never a full white frame. Nobody gets blinded, and it stays safe for light-sensitive viewers. Many trailers are better with straight beat cuts and no flash at all; decide by the music.
- Keep cards inside the platform's safe zone (`lib/platforms.yml` → `safe`): platform buttons and captions cover the edges.
- Music: the game's own tracks. Cut on beats; the hit, the summon and the card changes land on them. Fade the end; never cut sound mid-note.
- Sound effects stay in when the footage has them; they sell the hits.

## Step 5: cut, check, deliver

- Cut to the plan. Then watch the WHOLE cut at real speed with sound before calling it done, plus a frame sheet. Say what you checked and what you did not.
- Export to each platform's spec in `lib/platforms.yml`: codec h264 (yuv420p, +faststart), AAC 192k, the platform's fps, size and length cap.
- Deliver: `spawn upload` each file and give its /cdn/ address. Only a trailer about a Spawn game leaves Spawn. For the game's own page: `spawn publish set_trailer --video <file>` (it plays silent and looped there).
- In the delivery message: the file(s), the platform each is for, length and size, the counts used and where they came from, and what still needs the creator's eye.

## Lessons from the set (learned shooting real trailers)

### Staging a take
- **Pre-roll and tail.** Start the recording 2 s before the action and keep 1–2 s after it, then trim. Gear, props and effects often finish loading a beat after a crossing: a take that starts at once shows a hero without weapon or armor.
- **Script the actor; don't hope.** A live agent driving the hero (Jev, a wisp at play) wanders, stands still or walks into walls. Drive the hero with a script that holds each beat (move here, aim there, cast this) so the take repeats exactly. Judge by the result, not the technique.
- **A solo film stage beats a shared zone.** Film in a place nobody else simulates, with an encounter director that lays each pack on cue. Keep its open floor wide and flat so actors never wedge in a corner or sink under the ground.
- **Enemies move.** A pack that stands still looks fake. Packs walk in, shuffle and swing; the hero meets them. Ranged and caster heroes kite: step back between shots, never stand and tank.
- **Frame for the aspect.** In 9:16, place the enemies above and below the hero, not far left and right where the frame cuts them.
- **Gear the actor to survive the take** (a full high-level kit), and dismiss any death, recap or tutorial panel before rolling.
- **Camera settings reset on a crossing.** Zoom and similar view settings applied before a place change are lost: apply them after the load.
- **A progression showcase repeats the same skill** at each level step so the growth reads; a different skill per step reads as a list, not growth.

### Checking a capture before cutting
- **Measure frame timing, don't eyeball a frame sheet.** Sample the game frame's requestAnimationFrame intervals and scan the video for duplicate frames; flag any gap over 50 ms. A frame sheet never shows stutter.
- **Stutter or teleporting that only shows in the capture is a recording fault, not the game.** Stop reshooting, file it with the numbers (median and p95 frame interval, longest duplicate gap, CPU/GPU load) and wait for the cause; more takes on a sick capture waste the day.
- **Check effects at camera size.** An effect sized for gameplay can fill the whole vertical frame; look at one full frame mid-cast of every skill on the beat sheet.

### Cutting
- **Full HUD in 9:16:** a landscape game's HUD doesn't survive a centre crop. Stack two crops of the same frame: the action (a centre crop) on top, the game's own bottom HUD strip (globes, flasks, skill bar) below it, so the shot reads as real play.
- **Mix:** game sound effects stay in, ducked under one continuous music bed. Never layer two voices; a story trailer has one narrator.
- **Short-form conversion (TikTok, Shorts, Reels):** open on the single biggest moment (an explosion, a boss), no logo or title first; the hook line on screen in the first 2 s; at most one short menu or UI shot; ~15 s; the end card carries the full play URL.
- **Story trailers:** when the creator wants story without gameplay, the action comes from painted action views brought to life (a punch-in, a soft flash on the beat), and every line speaks in the lore's own voice, never a generic invitation.

### Delivering honestly
- Name anything staged in the delivery message: a scripted trigger in place of a real click, test items, a spawned pack. The creator decides whether a staged moment is fine for the cut.
- A frame sheet is not a watch: say plainly when the cut was not played at full speed with sound.

## Companion skills in this mod

Load them when the step needs them (`use_skill({ skills: ["director-savi#trailer-actor", "director-savi#trailer-mix", "director-savi#sound-direction"] })`):
- **trailer-actor**: the scripted player for in-game shots: gearing to the zone, reading the game's own HUD, kiting, showing the whole kit, scouting, keeping takes.
- **trailer-mix**: music bed, cutting on beats, ducking, loudness to the platform, subtitles, the real-speed listen.
- **sound-direction**: when the game's own sound effects are what's wrong on camera: a kit, one table every script plays through, levelled clips, tiers, gaps and caps, naming recipes, and the creator's ear closing each batch.
- **game-sound** (run on Abyss for effects and beds; music, footsteps and voice still researched only): the whole game's sound beyond the effects kit: the mix's anchor and bus gains, ducking, music moods and stems, ambience and room tail, footsteps by surface, voice lines and barks, crowds, the listening pass.

## More lessons from the set

- A world's look file may not exist in every world: read the HUD, the world's config and a screenshot for palette and type when it is missing.
- The trailer's words stay close to the game's lore and the style of its existing trailers; marketing lines in another voice read as someone else's game.
- Respect the creator's standing trailer choices (HUD on or off, what never appears on screen, the opening shot) as written down; a one-time pick is not a rule for the next trailer.
- A first cut is a proposal: its words, music and length are yours until the creator says yes. Ask them about the hook (the first 3 seconds) and the card words before any reshoot.
- In the delivery, separate what you watched at real speed, what you only sampled, and what you did not hear.

## Always, whatever the answers

- Read `lib/platforms.yml` for the platform's best practices before planning. Do not record and cut at random: every shot has a reason on the beat sheet.
- The hook comes first: the first 1–2 seconds must show motion and a reason to keep watching. No logo or slow fade-in first on short-form platforms.
- Every claim on screen is true today: count it from the game's data on the day of the cut.
- The creator approves the edit (hook, counts, shot order) before any reshoot at higher quality or any publish.
- A trailer is never published, posted or set on the game page without the creator saying so.

## How the result is judged

Right frame and size for its platform (checked with ffprobe), within the platform's length, the hook in the first 2 seconds, title cards in the world's own type and finish, every line inside its card's panel and the safe zone, heroes at true relative size with faces clear of plates, the launch kit's own logo on the endcard, soft or no flashes, a range of heroes and moments, type and cards that fit the music, the game's music cut to the beat, every count true, and no dev UI, blur or broken frames on a full real-speed watch.