// Phoebe in the Hub (Shelly, Nov 14: "attempting to kill phoebe will not work, she will just shrug it off, not even go hostile").
// No combat brain: hits land, the hp comes straight back, she shrugs, and nothing about her turns hostile.
import { seatHead, buildFor, baseBones, CAT_JIGGLE } from "./lib/critter-model.js"
import { PHOEBE_LOOK } from "./lib/phoebe.js"
const MAX = 100
const IDLE = "cdn/clip-idle-loop.glb", SHRUG = "cdn/clip-shrug.glb"
export function onSpawn(ctx) {
  const s = ctx.self.state
  s.hp = MAX; s.maxHp = MAX; s.dead = false; delete s.hitBy; delete s.hostile
  ctx.self.anim.idle = { clip: IDLE, loop: true, weight: 1 }
  const me = ctx.self // what meg-agent's dress() did for her: the face/head, her own build, bust and cat rig, so the coat sits as fitted
  me.state.wear = PHOEBE_LOOK
  seatHead(ctx, me, PHOEBE_LOOK)
  const b = buildFor("hub-phoebe", "f"); me.state.build = b; me.scale = { x: b.w, y: b.h, z: b.w }
  me.bones = baseBones(b, PHOEBE_LOOK); me.morph = { ...(me.morph ?? {}), Bust: b.bust }; me.jiggle = CAT_JIGGLE
}
export function update(ctx) {
  const me = ctx.self, s = me.state
  if ((s.hp ?? MAX) < MAX || s.dead || s.hitBy || s.hostile) {
    s.hp = MAX; s.dead = false; delete s.hitBy; delete s.hostile; delete s.aggro
    me.ragdoll = null
    if (ctx.now() - (me.session.shrugAt ?? -9e9) > 2500) {
      me.session.shrugAt = ctx.now()
      me.anim.react = { clip: SHRUG, loop: false, weight: 1 }
      ctx.emit("damageNumber", { position: { x: me.feetPosition.x, y: me.feetPosition.y + 1.9, z: me.feetPosition.z }, text: "*shrug*", color: "#d9c48a" })
      ctx.after(1.8, "endShrug")
    }
  }
  ctx.sleep()
}
export function endShrug(ctx) { ctx.self.anim.react = null }
