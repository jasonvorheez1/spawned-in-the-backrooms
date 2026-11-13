// Crawling, every level (Shelly, Nov 13: "the global crawling system", first for Level 34's four-foot sewers).
// Hold C (crouch) for a moment: you go down on hands and knees. Tap C or Space: you get back up, if there is room over you.
// Walk into an opening too low to stand in and you drop to a crawl on your own; under a low ceiling you cannot stand.
// While crawling: the body's capsule shrinks to CAP_H (fits a 1.2 m bore), the eye sits low, the crawl clip plays at your pace,
// and scripts/player.js slows you (state.crawl, CRAWL_MUL there). Runs after scripts/player.js and scripts/climb.js.
import { raycast } from 'builtin/physics'
import { rotate } from 'builtin/vec3'
// Shelly's prone clips (her "sneak" .kf files, Nov 13), converted onto the body's skeleton by art/sneak/kf2glb.py
const PRONE = { f: 'cdn/clip-prone-forward-0962574f.glb', b: 'cdn/clip-prone-backward-e06fc4ae.glb', l: 'cdn/clip-prone-left-543e6f4a.glb', r: 'cdn/clip-prone-right-37f8f4c3.glb' }
const HOLD = 0.35          // s of held C before a crouch becomes a crawl
const CAP_H = 0.85, CAP_R = 0.32, STAND_H = 1.9, STAND_R = 0.35   // capsules: crawling, and the body's own (read off the player: 1.9 x 0.35)
const NEED = 1.95          // m of clear height over the feet to stand up
// the old hands-and-knees keyframes, kept as a fallback, unused: keyed on the body's own bones (the library crawl clip names bones this rig lacks, so it never played). Savi's pick: 1.1 s a cycle
const L = (a, b) => [a, b, a]                                  // a there-and-back swing
const CLIP = { duration: 1.1, tracks: {
  Hips: { pitch: [-62, -62, -62], roll: [3, -3, 3] },
  Spine: { pitch: [8, 10, 8] }, Spine1: { pitch: [6, 6, 6] }, Spine2: { pitch: [4, 4, 4] },
  Neck: { pitch: [-30, -30, -30] }, Head: { pitch: [-22, -18, -22] },
  LeftUpLeg: { pitch: L(-30, -62) }, RightUpLeg: { pitch: L(-62, -30) },
  LeftLeg: { pitch: [95, 85, 95] }, RightLeg: { pitch: [85, 95, 85] },
  LeftArm: { pitch: L(-50, -80), roll: [-10, -10, -10] }, RightArm: { pitch: L(-80, -50), roll: [10, 10, 10] },
  LeftForeArm: { pitch: [-10, -20, -10] }, RightForeArm: { pitch: [-20, -10, -20] },
} }
const SCUFF = '/cdn/moodboard-realistic-gritty/sfx-crawling-hands-knees-on-wet-stone-scuff.mp3'

export function onInput(ctx, input) {
  const me = ctx.self, s = me.state, m = (me.session.crawl ??= {})
  if (s.level == null) return
  if (input.pressed.crouch) { m.downAt = ctx.now(); m.held = true; if (s.crawl) { m.wantUp = true; s.crouch = true } } // player.js flipped crouch: crawling, a tap means "up a step", to a crouch
  if (input.released.crouch) m.held = false
  if (m.held && !s.crawl && !s.swimming && !s.climbing && ctx.now() - (m.downAt ?? 0) > HOLD * 1000) { m.held = false; m.wantDown = true }
  if (s.crawl && input.pressed.jump) { m.wantUp = true; const v = me.velocity; me.velocity = { x: v.x, y: 0, z: v.z } } // no hop from your knees
  m.mv = Math.hypot(input.axes?.moveX ?? 0, input.axes?.moveZ ?? 0)
}

const headroom = (ctx, p) => { // clear height over the feet, capped at 3 m
  const h = raycast(ctx, { x: p.x, y: p.y + 0.3, z: p.z }, { x: 0, y: 1, z: 0 }, { distance: 2.7, radius: 0.2, physicsOnly: true })
  return h ? h.distance + 0.3 : 3
}

function down(ctx, m) {
  const me = ctx.self, s = me.state
  s.crawl = true; s.crouch = true
  me.physics = { body: 'character', collider: 'capsule', capsule: { height: CAP_H, radius: CAP_R } }
  m.clip = null
}
function up(ctx, m, toCrouch) {
  const me = ctx.self, s = me.state
  s.crawl = false; s.crouch = !!toCrouch
  me.physics = { body: 'character', collider: 'capsule', capsule: { height: STAND_H, radius: STAND_R } }
  me.anim.crawl = null; m.clip = null
}

export function update(ctx, dt) {
  if (ctx.self.isLocal === false) return
  const me = ctx.self, s = me.state, m = (me.session.crawl ??= {}), p = me.feetPosition
  if (s.level == null) return
  if (!m.boot) { m.boot = true; if (s.crawl) down(ctx, m) } // a reload or a level change: the saved crawl takes the small capsule again
  const busy = s.dead || (s.hp ?? 1) <= 0 || s.swimming || s.climbing || s.sit || me.parent
  if (busy) { if (s.crawl) up(ctx, m, false); m.wantDown = m.wantUp = false; return }
  m.t = (m.t ?? 0) + dt
  if (m.wantDown) { m.wantDown = false; down(ctx, m) }
  if (s.crawl && m.wantUp) {
    m.wantUp = false
    if (headroom(ctx, p) >= NEED) up(ctx, m, true)
    else if (ctx.now() - (m.noRoomAt ?? 0) > 2500) { m.noRoomAt = ctx.now(); s.notice = { text: 'No room to stand up here.', at: ctx.now() } }
  }
  // a low ceiling, or a low opening straight ahead: down you go on your own
  if (!s.crawl && m.t > 0.12) {
    m.t = 0
    if (headroom(ctx, p) < 1.6) down(ctx, m)
    else if ((m.mv ?? 0) > 0.2) {
      const v = me.velocity, sp = Math.hypot(v.x, v.z)
      if (sp > 0.3) {
        const d = { x: v.x / sp, y: 0, z: v.z / sp }
        const hiHit = raycast(ctx, { x: p.x, y: p.y + 1.45, z: p.z }, d, { distance: 0.75, physicsOnly: true })
        const loHit = raycast(ctx, { x: p.x, y: p.y + 0.45, z: p.z }, d, { distance: 1.2, physicsOnly: true })
        if (hiHit && !loHit && (hiHit.normal?.y ?? 0) < 0.5) {
          const ahead = { x: p.x + d.x * 0.9, y: p.y, z: p.z + d.z * 0.9 } // a lintel, not a wall: there is floor and low room past it
          if (headroom(ctx, ahead) < 1.6) down(ctx, m)
        }
      }
    }
  }
  if (!s.crawl) return
  if (!s.crouch) s.crouch = true // a sprint or a jump stands a crouch up (scripts/player.js); not a crawl
  const v = me.velocity, sp = Math.hypot(v.x, v.z), moving = sp > 0.15
  let dir = 'f'
  if (moving) { // which way the body goes against where it faces
    const fw = rotate(me.rotation, { x: 0, y: 0, z: -1 }), fx = fw.x, fz = fw.z
    const along = (v.x * fx + v.z * fz) / sp, side = (v.x * -fz + v.z * fx) / sp
    dir = Math.abs(along) >= Math.abs(side) ? (along >= 0 ? 'f' : 'b') : (side >= 0 ? 'r' : 'l')
  }
  const clip = moving ? dir + Math.round(Math.max(0.6, sp / 0.9) * 4) : 'still'
  if (m.clip !== clip) { m.clip = clip; me.anim.crawl = { clip: PRONE[dir], loop: 'loop', weight: 6, blendIn: 0.25, speed: moving ? Math.max(0.6, sp / 0.9) : 0.0001 } }
  if (moving) { m.scuff = (m.scuff ?? 0) + dt * sp; if (m.scuff > 1.7) { m.scuff = 0; ctx.emit('playSound', { clip: SCUFF, volume: 0.12, pitch: 0.92 + ctx.random() * 0.16, position: p, maxDistance: 10 }) } }
}
