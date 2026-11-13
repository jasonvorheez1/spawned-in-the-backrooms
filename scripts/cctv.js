// The CCTV desk view (Sedco, Level 11). Pressing the monitor wall writes state.cctv = { i, at }; this script owns the view from there:
// A/D (or 1-8) switch camera, W/S zoom, E or Space leaves. The camera sweeps on its own; a switch cuts with static.
// The body holds still at the desk. Quest: sedcoQ 2 needs Cam 04 watched for 2 s (the vault gate), not just the wall pressed.
import { CAMS, ZOOM_MIN } from './lib/l11-cctv.js'
import { setSedcoStep } from './lib/level11-quests.js'
const STATIC = '/cdn/moodboard-realistic-gritty/sfx-telephone-earpiece-line-static-hiss-and-crackle.mp3'
const CLICK = '/cdn/moodboard-realistic-gritty/sfx-brass-elevator-button-click.mp3'
const HUM = '/cdn/moodboard-realistic-gritty/sfx-crt-monitor-high-pitch-whine-and-soft-electric-hum-loop.mp3'
const L = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u })

function go(ctx, i) {
  const s = ctx.self.state, n = CAMS.length
  s.cctv = { ...s.cctv, i: ((i % n) + n) % n, cutAt: ctx.now(), zoom: 1 }
  ctx.emit('playSound', { clip: STATIC, volume: 0.35, pitch: 0.9 + ctx.random() * 0.3 })
  ctx.emit('playSound', { clip: CLICK, volume: 0.5 })
}
function leave(ctx) {
  const s = ctx.self.state, m = ctx.self.session
  s.cctv = null; s.cctvOffAt = ctx.now(); ctx.view.camera = null
  if (m.cctvHum) { ctx.emit('stopSound', { soundId: m.cctvHum }); m.cctvHum = null }
  ctx.emit('playSound', { clip: CLICK, volume: 0.5, pitch: 0.8 })
}

export function onInput(ctx, input) {
  const s = ctx.self.state, c = s.cctv
  if (!c) return
  const m = ctx.self.session, x = input.axes?.moveX ?? 0, z = input.axes?.moveZ ?? 0
  if (ctx.now() - (c.at ?? 0) < 400) { m.cx = x; return } // the press that opened the desk is not a press to leave it
  const d = input.actionData?.cctv
  if (input.pressed.cctv && d) { if (d.go === 'exit') return leave(ctx); if (d.go === 'next') return go(ctx, c.i + 1); if (d.go === 'prev') return go(ctx, c.i - 1); if (typeof d.cam === 'number') return go(ctx, d.cam) }
  if (input.pressed.interact || input.pressed.jump) return leave(ctx)
  for (let k = 1; k <= 8; k++) if (input.pressed['quick' + k]) return go(ctx, k - 1)
  if (x > 0.5 && !((m.cx ?? 0) > 0.5)) go(ctx, c.i + 1)
  if (x < -0.5 && !((m.cx ?? 0) < -0.5)) go(ctx, c.i - 1)
  m.cx = x; m.cz = z
}

export function update(ctx, dt) {
  if (ctx.self.isLocal === false) return
  const me = ctx.self, s = me.state, c = s.cctv, m = me.session
  if (!c) { if (m.cctvOn) { m.cctvOn = false; ctx.view.camera = null; if (m.cctvHum) { ctx.emit('stopSound', { soundId: m.cctvHum }); m.cctvHum = null } } return }
  if (me.place !== 'level11' || s.dead) return leave(ctx)
  if (!m.cctvOn) { m.cctvOn = true; m.cctvHum = ctx.emit('playSound', { clip: HUM, volume: 0.12, loop: true }) }
  const v = me.velocity; me.velocity = { x: 0, y: Math.min(0, v.y), z: 0 } // sat at the desk
  const cam = CAMS[c.i] ?? CAMS[0], now = ctx.now()
  m.zoom = Math.max(ZOOM_MIN, Math.min(1, (m.zoom ?? 1) - (m.cz ?? 0) * dt * 0.8))
  if (m.lastCam !== c.i) { m.lastCam = c.i; m.zoom = 1; m.watch = 0 }
  const u = 0.5 - 0.5 * Math.cos((now / 1000) * (2 * Math.PI) / cam.sweep) // a slow servo sweep, A to B and back
  ctx.view.camera = { eye: cam.eye, aim: L(cam.a, cam.b, u), fov: cam.fov * m.zoom }
  // the round-the-clock quest read: Cam 04 on the vault gate
  if (cam.vault && s.sedcoQ === 2 && !s.sedcoMonitorsChecked) {
    m.watch = (m.watch ?? 0) + dt
    if (m.watch > 2) {
      s.sedcoMonitorsChecked = true
      if (s.sedcoCounterChecked) setSedcoStep(ctx, me, 3, 'Spotlight on Sedco · Camera four covers the vault stair · Turn the stage spotlight on its lens')
      else s.notice = { text: 'CAM 04: the B2 vault gate, down the 14th St subway stair. Now search the sales counter.', at: now }
    }
  }
}
