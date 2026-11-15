---
name: Trailer mix
description: Score and mix a trailer cut: one music bed, game sound under it, cuts on the beat, loudness to the platform, and an honest listen before delivery.
---

# The trailer mix

- **One continuous music bed** from the game's own tracks. Never restart music at a cut; cut the picture to the music.
- **Find the beats, don't guess them**: detect the track's onsets (ffmpeg or a short python read of the waveform), list beat times, and put each cut, card change and big hit on one. Pick the section of the track whose energy matches the trailer's shape; end on a natural phrase end and fade the tail, never mid-note.
- **Game sound stays in** and sells the hits. Duck it under the bed, then let the biggest moments (the boss hit, the summon) poke through by ducking the bed for a beat instead. One narrator at most; never two voices at once.
- **Loudness to the platform**: measure the master with ffmpeg's `ebur128` / `loudnorm`. Social video sits around -14 LUFS integrated with true peak under -1 dBTP; check the platform notes. Normalise the master once at the end, not per clip.
- **Per take**: trim each clip's game audio with a few ms fade in and out at every cut so nothing clicks. Watch for sounds cut in half at a cut (a cast with no impact).
- **Subtitles**: if the game has a language setting, the trailer's spoken lines carry subtitles in the viewer's language. Overlaid files are easier to redo than burned-in text. Make one language right first, then derive the others from it.
- **Before delivery**: play the whole cut at real speed with sound. A frame sheet and a level reading are not a listen; if you could not hear it, say so plainly and ask the creator to listen to it first.