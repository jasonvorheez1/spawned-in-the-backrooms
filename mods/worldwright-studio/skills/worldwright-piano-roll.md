---
name: worldwright-piano-roll
description: "Worldwright Studio native DAW scores, named instrument metadata, source-preserving samples, preview and WAV rendering. Ordinary card editor metadata and shared guarded saves; no piano/roll source grammar."
---

# Sound Studio · native DAW

## Documents and opening

Sound Studio (`0MUSIC00BOOK0`) owns projects with music/SFX folders, arrangements and a separate shared Custom Instruments folder. Research is prose. Use ordinary books, folders, cards, pages and sections; no separate song database. Partner mods are optional.

Open through the shared editor session. Explicit card editor metadata wins; Automatic uses unambiguous native structure. DAW uses the internal editor key `piano`, not a page-specific flag. Opening must not create a page or change metadata. Saving an Automatic document leaves it Automatic. Save/Discard/Cancel, Back, load errors and stale-reply refusal belong to the same lifecycle as every editor.

The 2026-09-15 clean-slate ruling discards old WWS content and compatibility. Do not write, convert or retain old piano/roll tags, Length/Track grammar, pageEditor settings or legacy score sections.

## Native score and instruments

Pages hold `wws-score` version 1 documents. Each track refers to a stable named instrument ID and revision. Card metadata contains a separate `Instrument: <id>` section per definition; samples and editable synth patches belong there, not in note tags. Instrument library pages contain native instrument references to their own metadata.

Use `sound-document.encode(data, {cardId, sections})`, `decode(content, sections)` and `piano-pages.paginate(data, spec, options)`. Read their current schemas and limits before generating data. Always supply actual Instrument sections; never invent a revision or rely on another card having warmed an in-memory voice cache.

`roll-editor` owns drafts; `instrument-library` owns reusable sampled instrument Save/load; `cards.setSoundDocument` owns the atomic guarded write. Save pages and metadata together, with a held pen, full baseline, write permission and current opening. A refusal keeps the draft and may not acknowledge success. New-draft retries reuse the pending card.

Native pagination uses bounded notes/bytes/pages, not prose line-fitting. Native source pages, the continuous roll viewport and derived notation sheets are different representations. Never truncate notes, pauses, events or voices to fit a display. Notation must receive the card's real Instrument sections.

## Making sound

Built-in piano, bell and synth, editable synth envelopes/filter/pan, and sampled instruments use the shared audio transport and render voices. A missing sample is a visible failure, not an oscillator substitution. Keep the compact Salamander piano bank's Alexander Holm / CC BY 3.0 credits and license.

A pitched sample transposes from its MIDI root; SFX keeps original pitch. Trim and looping are non-destructive descriptors over the original recording. Waveform selection, zero crossing, normalization and pitch estimation do not create replacement recordings. Pitch estimation needs a clean sustained note, not arbitrary instrument separation from a mixed song. Respect source permissions and attribution. Audition and Apply to track edit or preview a draft; neither is Save.

Continuous preview streams bounded visible/neighbor pages, retaining held tails and one audio clock. Stop/Back/leave must stop the listener's voices. Do not add idle polling, repeat AudioContexts or a second editor-only audio lifecycle.

## Arrangement, links and rendering

An arrangement references saved score cards; it does not copy or flatten their pages. Use ordinary `#[card-id]` links. `worldwright-sound` owns scene clocks, origins and optional `#[sound: card-id ...]` cue settings. Instrument cards are definitions, not audible score sources. Do not pretend an arrangement is scene-playable until its compiled adapter supports it.

Save before Render WAV. Rendering reads saved pages and metadata; event-triggered notes without fixed timeline positions must refuse rather than disappear. PCM16 WAV is derived output, not source. A current URL/fingerprint permits Play file and Copy sound tag; changed source invalidates reuse. Local completed WAV bytes may remain downloadable after an upload failure, but an uploaded URL is required for a reusable sound tag. Read `roll-render`, `roll-file` and their current receipts rather than promising a download/upload occurred.

## Evidence

Run the native-authoring, core-entry and clean-slate integration checks. They use isolated SQLite and make zero live database calls; they do not prove tablet playback, creator-seat mounting or published acceptance. Record what was actually heard separately. The live repository is still SQL-backed; the staged file-cache module is not a completed cutover.