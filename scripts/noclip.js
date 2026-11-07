// The noclip sequences' sound and timing. Two moments: you fall into Level 0 the first time you arrive
// (state.noclipIn, a timestamp), and you clip out through the flickering wall (state.exitAt, written by
// scripts/player.js). scripts/noclip-ui.js draws both from those timestamps; this plays the sound.
import { heard } from "./lib/hear.js";
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
function play(ctx, name, volume = 0.8) {
  const p = ctx.self.feetPosition
  heard(ctx, { clip: SND(name), position: { x: p.x, y: p.y + 1.2, z: p.z }, volume, maxDistance: 40 }, { audience: { player: ctx.self.id } })
}
export function noclipCue(ctx, d) { play(ctx, d.n, d.v) }

function schedule(ctx, list) { for (const [t, n, v] of list) ctx.after(t, 'noclipCue', { n, v }) }

export function update(ctx, dt) {
  const s = ctx.self.state, m = (ctx.self.session.noclip ??= { exit: 0 })
  if (s.level == null) return
  if (s.noclipIn == null) { // first arrival: the fall
    s.noclipIn = ctx.now()
    schedule(ctx, [[0.2, 'electric-hum-buzz-rising', 0.7], [1.5, 'static-burst-glitch', 0.8], [1.9, 'deep-wind-rushing-fall', 0.9], [4.0, 'heavy-impact-thud-boom', 1.0], [4.3, 'fluorescent-light-buzz-hum', 0.5]])
  }
  if (s.exitAt && s.exitAt !== m.exit) { // the way out
    m.exit = s.exitAt
    schedule(ctx, [[0.0, 'heavy-impact-thud-boom', 0.7], [0.5, 'deep-wind-rushing-fall', 0.8], [1.6, 'electric-hum-buzz-rising', 0.6], [2.2, 'fluorescent-light-buzz-hum', 0.5]])
  }
}
