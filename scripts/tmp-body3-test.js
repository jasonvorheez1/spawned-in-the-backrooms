// TEMP test rig (wisp combat lane): drives body3 on a human body; deleted after checks
import { swing3, fire3, aimPose, aimMode, longHands, famOf, tick3 } from './lib/body3.js'
import { humanBody } from './lib/critter-model.js'
import { weaponBody } from './lib/weapon-look.js'
const LIB = { idle: 'cdn/clip-idle-loop.glb', walk: 'cdn/clip-walk-loop.glb', run: 'cdn/clip-run-loop.glb', sprint: 'cdn/clip-sprint-loop.glb' }
const FEM = { ...LIB, idle: 'cdn/clip-idle-female-loop.glb', walk: 'cdn/clip-walk-female-loop.glb' }
export function onSpawn(ctx) {
  const me = ctx.self, s = me.state
  me.model = humanBody({ sex: s.sex ?? 'm', skin: s.skin ?? (s.sex === 'f' ? '#e8b896' : '#c58c66') })
  s.gaitClips = s.sex === 'f' ? FEM : LIB
  if (s.kind && s.kind !== 'fists') me.session.held = ctx.spawn({ parent: me.id, attachment: { bone: 'RightHand' }, tags: ['temp'], ...weaponBody(s.kind) })
  me.session.t0 = ctx.now(); me.session.n = 0; me.session.next = 0
}
export function update(ctx, dt) {
  const me = ctx.self, s = me.state, ss = me.session, now = ctx.now(), t = (now - ss.t0) / 1000
  tick3(me, now)
  const sp = s.speed ?? 0, dir = Math.sin(t * Math.PI / (s.leg ?? 6)) >= 0 ? 1 : -1
  me.velocity = { x: sp * dir, y: (me.velocity?.y ?? 0) + ctx.place.gravity.y * dt, z: 0 }
  if (me.grounded) me.velocity.y = Math.max(0, me.velocity.y)
  const fam = famOf(s.kind)
  if (s.mode === 'gun') {
    const pitch = Math.sin(t * 0.7) * 0.5 * (s.pitchSwing ?? 0)
    aimPose(me, fam, aimMode(me, true, !!s.crouch), pitch)
    if (fam === 'long') me.bones = longHands(me, ss.held, sp ? (dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (s.yaw ?? 0), pitch, true, !!s.crouch, 0.5)
    if (now > ss.next) { ss.next = now + (s.every ?? 1500); fire3(ctx, me, s.kind) }
  } else if (s.mode === 'melee') {
    if (now > ss.next) { ss.next = now + (s.every ?? 800); ss.n = now - (ss.at ?? 0) > 1100 ? 0 : ss.n + 1; ss.at = now; s.lastHit = now + 1000 * swing3(ctx, s.kind, 0, ss.n, me); s.combo = ss.n }
  }
}
