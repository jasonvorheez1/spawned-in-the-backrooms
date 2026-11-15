// The Duke of Morigont (Level 132). Talk is the game's own (interact.js: tag npc -> talk.js under dlg "l132-duke").
// He cannot be hurt: hp comes straight back, he laughs it off, nothing turns hostile (the Phoebe rule).
// Floats and bobs, faces whoever comes within range, faces where he walks; the stroll itself is scripts/lib/l132-duke.js.
import { animate } from "builtin/tween"
import D from "./lib/data/l132-duke.yml"
const MAX = 100
const SHADOW = `fx
pop hem rate=?low:4|mobile:6|9 on=disc(.26).c(.08) life=1.2..2 v=up(.06..0.16)+sdir()*(.04..0.1) size=.16..0.3 acc=buoy(.05)+curl(.25)*.3+drag(1.2) sz=$size*(.7>1.3) col=<.03,.01,.05> a=0>.15:.5>.6:.25>0 rot=spin(.08) r=sprite(smoke-puff,alpha)
pop wisps rate=?low:3|mobile:4|7 on=disc(.22).c(.1) life=1..1.8 v=sdir()*(.15..0.35)+up(.08) size=.08..0.15 acc=curl(.6)*.5+drag(1.4) sz=$size*(1>.3) col=<.04,.01,.07> a=0>.2:.75>.7:.35>0 r=sprite(flame-wisp,alpha)`
export function onSpawn(ctx) {
  const s = ctx.self.state
  s.hp = MAX; s.maxHp = MAX; s.dead = false; s.invulnerable = true; delete s.hitBy; delete s.hostile
  ctx.self.fx = { script: SHADOW }
  const y0 = D.duke.hover
  animate(ctx, ctx.self, { "feetPosition.y": [y0, y0 + D.duke.bob, y0] }, { duration: D.duke.bobSeconds, loop: true, easing: "easeInOutSine" })
}
const yawTo = (dx, dz) => (Math.atan2(-dx, -dz) * 180) / Math.PI
export function update(ctx, dt) {
  const me = ctx.self, s = me.state, ses = me.session
  if ((s.hp ?? MAX) < MAX || s.dead || s.hitBy || s.hostile || s.aggro || s.incidents) {
    s.hp = MAX; s.dead = false; delete s.hitBy; delete s.hostile; delete s.aggro; delete s.incidents
    me.ragdoll = null
    if (ctx.now() - (ses.shrugAt ?? -9e9) > 2500) {
      ses.shrugAt = ctx.now()
      ctx.emit("damageNumber", { position: { x: me.feetPosition.x, y: me.feetPosition.y + 2.7, z: me.feetPosition.z }, text: "*chuckles*", color: "#e8c766" })
    }
  }
  const p = me.feetPosition, last = ses.last ?? p
  ses.last = { x: p.x, z: p.z }
  const mx = p.x - last.x, mz = p.z - last.z
  let want = null
  if (Math.hypot(mx, mz) > 0.004) want = yawTo(mx, mz)
  else {
    let best = D.duke.faceRange, who = null
    for (const pl of ctx.place.players) { const d = Math.hypot(pl.feetPosition.x - p.x, pl.feetPosition.z - p.z); if (d < best) { best = d; who = pl } }
    want = who ? yawTo(who.feetPosition.x - p.x, who.feetPosition.z - p.z) : s.faceYaw ?? null
  }
  if (want == null) return
  const cur = ses.yaw ?? s.faceYaw ?? 0
  let d = ((want - cur + 540) % 360) - 180
  if (Math.abs(d) < 0.5) return
  const step = Math.sign(d) * Math.min(Math.abs(d), D.duke.turnRate * dt)
  ses.yaw = cur + step
  me.rotation = { yaw: ses.yaw }
}
