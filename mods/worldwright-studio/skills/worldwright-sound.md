---
name: worldwright-sound
description: "Worldwright Studio scene audio — Sound tokens, voices, staged-body/screen/fixed origins, scene versus source clocks, roll cue hand-off and lifecycle cleanup. Piano Roll composition, custom instruments, notation and Render WAV live in worldwright-piano-roll; native audio never requires Sound Design Guide."
---

# Sound, voices and scene cues

`worldwright-piano-roll` owns composing and saving scores, clip instruments, continuous preview, notation and Render WAV. `worldwright-paper` owns physical page limits: never exceed them; paginate overflow before writing. Keep this lane about how an already-authored sound belongs to a scene, not a second score editor recipe.

## The current lane

Follow directive/routing before changing cards. Audio lives in ordinary card sections/pages, not a separate database or plugin. Sound Design Guide may inform a palette; it does not gate parsing, synthesis or playback, and is not a Supported Mods status entry.

Authoritative files: `lib/soundspec.js` (grammar v6), `lib/document-reference.js` (ordinary card sources), `lib/sound-origin.js` (origins/collection), `lib/shoot.js` (card/body reads), `lib/soundplay.js`, `sound-cue.js`, `roll-audio.js` and the player `cinema-courier.js`. Read those before changing a rule; do not patch Absolute Cinema.

## One token, two clocks

```text
#[sound: /cdn/example.mp3 on 2 at 125ms until 6.25 from 0.75 to 2.125 speaker screen gain 0.6]
#[sound: door-creak on 3 speaker <actual-door-card-id> range 20]
#[<actual-music-card-id>]
#[sound: <actual-music-card-id> at 1 from 0.5 to 2.5 speaker screen loop]
#[sound: bell position 4,1.5,-8 range 45]
```

Placeholders and example CDN paths are not ready assets. Use actual source/card/shot identities and verify resolution.

- Source: an ordinary saved native sound-card ID, CDN/file reference, or an Asset Library sound. Bare `#[card-id]` promotes only a valid sound document; non-sound links and set placements keep their meaning. Explicit editor metadata wins. Instrument cards are not audible score sources. Arrangement scene sources currently refuse until a safe compiled adapter is wired; never substitute the first clip or a shelf sound.
- `on <shot>` anchors a cue to that shot; `at` is the scene delay/offset. No `on`: a scene-card cue starts from the scene, a placed-body-card cue from that set's arrival.
- `until` is an absolute scene time. `stop at <time>` is its alias; `stop on <shot>` is a shot stop.
- `from`/`to` select a range **inside the source**, end exclusive. `start`/`end` are aliases. Cue times are seconds; accept decimals, `ms`, `s`, `m:ss` or `h:mm:ss`. Roll notes use beats instead.
- `pitch` affects playback rate and duration; `gain` controls level. Preserve the parser's ranges and duplicate-clause validation.
- Earliest source end, explicit stop, body departure or scene end wins. Invalid/backwards ranges warn and stay silent. Do not round away sub-second precision.
- Full-file loops and native-roll loops exist. **Trimmed recorded-file looping is refused**; the engine lacks the required honest loop-range transport. File stops are simulation-tick accurate, not sample-accurate. Native roll note ends use Web Audio scheduling.

## The emitter belongs somewhere

` speaker self` is the default: use the staged body belonging to the card containing the token. Sound tokens may occur in sections **and pages** of scene/body cards. Native score/instrument pages and Instrument metadata are excluded from cue-token scanning.

`speaker <card-id>` names another staged body. `speaker screen` is explicitly non-spatial narration/music. `position X,Y,Z` is a fixed world point, mutually exclusive with speaker. `range` is metres: default 30, greater than 0 through 500.

Shoot reads a placed character's pages/sections from that character's home book. Each staged instance owns its default emitter. Parenting carries movement; do not add a polling follower. Missing/deleted bodies and ambiguous explicit targets warn and stay silent, never fall back to world origin or the listener. Body departure stops that body's sounds.

`#[line: <character-card-id> — words]` uses that staged character. Narrator/screen lines are non-spatial. Subtitles remain if the body cannot be resolved. Untagged prose is not automatically spoken. There is no lip-sync claim.

A character's `Voice` section pins one voice identity, speaking style and level. Keep its stem stable when naming new lines; do not create a different voice for each sentence. Recorded voices use the Voice mix bus. Palette/provenance notes belong in a separate Notes section, not native JSON. A sound file still needs to exist or finish generating; a syntactically valid address is not an audible test.

## Native score and rendered-file hand-off

Link the saved editable score with `#[card-id]`; use universal `#[sound: card-id ...]` metadata when cue settings are needed. Use Render WAV → Copy sound tag for an immutable uploaded recording. These are different sources; editing score pages never updates a previously copied recording. The score skill owns shared first-page settings, note events, sample declarations and render restrictions.

Whole-roll tempo may override saved settings. Source trims are seconds at that tempo; note positions are beats. Whole-roll and note fades multiply without extending a trim or scene deadline. `on event:door-open` explicitly waits for a game event; `trigger door-open` is its alias. Existing shot anchors remain valid. Runtime events may scope to a listener with the supported soundOwner/player payload; preview's Fire event must remain private.

There are two different loop contracts: a direct recorded-file Sound cue cannot loop a trimmed range; a custom sample INSIDE a native score can loop its trim while held through the score transport. Do not apply the file-cue limitation to clip instruments, or promise sample-accurate file stops.

## File it, then verify the right thing

Read existing pages and sections before editing Sound/Voice content. Preserve palette, source rights and character voice identity. Use the existing repository and shared paper contract; no duplicate score section and no hidden source store.

Read parser/attachment/plan results first. Check real staged-body resolution, parented movement, explicit screen and fixed emitters, missing/ambiguous targets, body departure, Strike/re-shoot and cinema-stop cleanup. Parent event-note children to the owning cue; Stop/Strike/page exit must stop them all. Picture and sound arm together in the player courier, not on separate god-mode clocks.

Keep previews listener-scoped and sounds tied to their owner. A fixture or silent parent-follow test proves structure, not audible playback. State separately what was heard on a player outside god mode and what was verified in a published game. Do not reset the creator's work or change Absolute Cinema to make a test pass. See `worldwright-maintenance` for the cross-lane regression matrix.

## Clean-slate native studio

The creator discarded all old WWS content on 2026-09-15. There is no migration or legacy piano/roll grammar. New scores use wws-score pages plus Instrument metadata; links use ordinary card IDs. Keep new saves conflict-guarded and reject invalid documents rather than treating them as an empty score.