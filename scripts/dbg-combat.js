// TEMP bench (wisp lane): a mannequin runs body3's real combat calls on a loop so third-person moves can be judged; delete after
import { swing3, fire3, aimPose, longHands, famOf, tick3, heldRot } from './lib/body3.js'
import { weaponBody, HOLD } from './lib/weapon-look.js'
import { baseOf } from './lib/weapons.js'
export function onSpawn(ctx) { ctx.self.session.t = 0 }
export function update(ctx) {
  const me = ctx.self, s = me.state, ss = me.session, now = ctx.now(), k = s.kind
  if (k !== 'fists' && !ss.held) {
    const g = HOLD[baseOf(k)] ?? 0
    ss.held = ctx.spawn({ parent: me.id, attachment: { bone: 'RightHand' }, feetPosition: { x: 0, y: 0, z: -g }, tags: ['temp'], ...weaponBody(k), ...heldRot(k) })
  }
  tick3(me, now)
  if (!me.anim.base) me.anim.base = { clip: 'cdn/clip-idle-loop.glb', loop: 'loop', weight: 1 }
  const fam = famOf(k)
  if (fam === 'pistol' || fam === 'long') {
    aimPose(me, fam, s.mode ?? 'aim', 0)
    if (fam === 'long') me.bones = longHands(me, ss.held, (me.rotation?.yaw ?? s.yaw ?? 0) * Math.PI / 180, 0, (s.mode ?? 'aim') !== 'ready', false, 0.9 * 0.55)
    if (s.fire && now - (ss.t ?? 0) > 1500) { ss.t = now; fire3(ctx, me, k) }
  } else if (now - (ss.t ?? 0) > 1800) { ss.t = now; ss.c = (ss.c ?? 0) + 1; swing3(ctx, k, 0, ss.c, me) }
}
