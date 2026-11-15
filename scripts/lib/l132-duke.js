// Level 132 · duke. lay(ctx, L) builds once (guard on ctx.place.state.dukeV); tick(ctx, L) runs each second while someone is here.
// Level 132 · the Duke of Morigont and his Palace. lay(ctx, L) builds once (guard on ctx.place.state.dukeV);
// tick(ctx, L) walks his stroll each second while someone is here. Numbers: scripts/lib/data/l132-duke.yml.
// The Duke talks through the game's own dialogue (tag npc, dlg "l132-duke"); his body script is scripts/l132-duke-npc.js.
import { animate } from "builtin/tween"
import { traverseCheck } from "builtin/physics"
import D from "./data/l132-duke.yml"

const yawTo = (dx, dz) => (Math.atan2(-dx, -dz) * 180) / Math.PI
const rot = (x, z, deg) => { const a = (deg * Math.PI) / 180; return { x: x * Math.cos(a) + z * Math.sin(a), z: -x * Math.sin(a) + z * Math.cos(a) } }
const TORCH_FX = `fx
pop flame rate=flick(.45,.2)*?low:18|30 on=disc(.06).c(.02) life=.35..0.6 v=up(1.1)+cone(18)*(.2..0.5) size=.12..0.22 acc=curl(.5)+buoy(1.8)+drag(1.4) sz=$size*(.5>.25:1>.7:.7>.1) col=hdr(4.6,3.2,1.3)>.3:hdr(3,1.3,.3)>.65:hdr(1.6,.45,.1)>hdr(.5,.1,.02) a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop embers rate=2 on=disc(.06) life=.6..1.2 v=up(1.6)+cone(30)*(.3..0.8) size=.015..0.03 acc=curl(.8)+grav()*.4+drag(.5) col=hdr(5,2.6,.7)>hdr(1.4,.3,.05) a=(0>.1:1>.7:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)
pop smoke on=@flame?.15 inh=p;v:$v*.4 life=1.2..2 size=.1..0.18 acc=buoy(.8)+curl(.3)*.5+drag(.8) sz=$size*(.7>2.6) col=<.2,.19,.18> a=0>.2:.25>.7:.15>0 r=sprite(smoke-puff,alpha)
pop glow n=1 at=point().c(.2) glo=fire()*(#flame/16)~ r=light(<1,.58,.26>,$glo*14,9)`
const CHIMNEY_FX = `fx
pop smoke rate=?low:2|mobile:3|5 on=disc(.35) life=5..8 v=up(.7..1.1)+sdir()*.15 size=.6..1 acc=buoy(.15)+curl(.2)*.4+drag(.35)+wind()*.3 sz=$size*(.6>3.4) col=<.42,.4,.4>><.3,.3,.32> a=0>.1:.32>.6:.18>0 rot=spin(.05) r=sprite(smoke-puff,alpha)`
const WINDOW_FX = `fx
pop pane n=1 at=point() size=1.1 col=hdr(2.2,1.4,.45)*flick(.6,.08) a=.85 sz=$size r=sprite(soft-disc,add)
pop halo n=1 at=point() size=2.4 col=hdr(1,.6,.18) a=.35 sz=$size r=sprite(soft-disc,add)`

function stallsOf(L) {
  const out = []
  for (let k = 0; k < L.stalls.count; k++) { const a = ((22.5 + 45 * k) * Math.PI) / 180; out.push({ x: Math.cos(a) * L.stalls.ring, z: Math.sin(a) * L.stalls.ring }) }
  return out
}
function stallYaw(L, at) {
  let best = 1e9, s0 = null
  for (const s of stallsOf(L)) { const d = Math.hypot(s.x - at[0], s.z - at[1]); if (d < best) { best = d; s0 = s } }
  return yawTo(s0.x - at[0], s0.z - at[1])
}
const unbuilt = (o) => !o || !o.model

export function lay(ctx, L) {
  const ps = ctx.place.state
  if (ps.dukeV === D.dukeV) return
  ps.dukeV = D.dukeV
  const objs = ctx.place.objects
  const need = unbuilt(objs["l132-duke"]) || unbuilt(objs["l132-keep"]) || !objs["l132-keep-gate"] || !objs["l132-keep-torch-0"]
  if (!need) return
  ctx.commit("The Duke of Morigont and his Palace", () => {
    const K = L.keep, G = D.gate, dk = D.duke
    if (unbuilt(objs["l132-duke"])) {
      if (objs["l132-duke"]) ctx.destroy("l132-duke")
      const h = dk.height
      ctx.spawn("l132-duke", {
        tags: ["npc", "friendly", "l132", "usable"],
        feetPosition: { x: L.duke.x, y: L.ground + dk.hover, z: L.duke.z },
        rotation: { yaw: yawTo(-L.duke.x, -L.duke.z) },
        model: { id: dk.model, forward: dk.forward },
        layout: { box: { min: { x: -h, y: 0, z: -h }, max: { x: h, y: h, z: h } } },
        physics: { body: "kinematic", collider: "capsule" },
        behavior: ["scripts/l132-duke-npc.js"],
        state: { name: "The Duke of Morigont", role: "duke", voice: "l132-duke", dlg: "l132-duke", invulnerable: true, friendly: true, faction: L.faction?.id ?? "lumiria",
          hp: 100, maxHp: 100, stop: 0, nextAt: 0, faceYaw: yawTo(-L.duke.x, -L.duke.z) },
      })
    }
    if (unbuilt(objs["l132-keep"])) {
      if (objs["l132-keep"]) ctx.destroy("l132-keep")
      const [w, hh, d] = D.keep.size, ch = D.chimney, wi = D.window
      ctx.spawn("l132-keep", {
        tags: ["l132", "l132-palace"],
        feetPosition: { x: K.x, y: K.y, z: K.z },
        rotation: { yaw: D.keep.yaw },
        model: { id: D.keep.model, forward: D.keep.forward },
        layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: hh, z: d / 2 } } },
        physics: { body: "static", collider: "mesh" },
        state: { name: "The Duke's Palace" },
        children: [
          { id: "chimney", feetPosition: { x: ch[0], y: ch[1], z: ch[2] }, fx: { script: CHIMNEY_FX } },
          { id: "window", feetPosition: { x: wi[0], y: wi[1], z: wi[2] }, fx: { script: WINDOW_FX } },
        ],
      })
    }
    // the gate and its torches stand on the road side, along the wall (wall runs perpendicular to the keep's facing)
    const along = rot(1, 0, D.keep.yaw), inward = rot(0, 1, D.keep.yaw)
    const gx = G.at[0] + inward.x * G.inset, gz = G.at[1] + inward.z * G.inset
    const gy = ctx.place.terrain.heightAt(gx, gz) ?? K.y
    if (objs["l132-keep-gate"]) ctx.destroy("l132-keep-gate")
    ctx.spawn("l132-keep-gate", {
      tags: ["l132", "usable", "l132-palace"],
      feetPosition: { x: gx, y: gy, z: gz },
      rotation: { yaw: D.keep.yaw },
      model: { id: G.model, forward: G.forward },
      layout: { box: { min: { x: -G.size[0] / 2, y: 0, z: -G.size[2] / 2 }, max: { x: G.size[0] / 2, y: G.size[1], z: G.size[2] / 2 } } },
      physics: { body: "static", collider: "box" },
      behavior: "scripts/l132-duke-gate.js",
      state: { name: "Palace Gate", verb: "Knock", info: "shut" },
    })
    for (const side of [-1, 1]) {
      const id = `l132-keep-torch-${side < 0 ? 0 : 1}`
      if (objs[id]) ctx.destroy(id)
      const ti = D.torch.inset ?? 0, x = G.at[0] + inward.x * ti + along.x * D.torch.side * side, z = G.at[1] + inward.z * ti + along.z * D.torch.side * side
      ctx.spawn(id, {
        tags: ["l132", "l132-palace"],
        feetPosition: { x, y: ctx.place.terrain.heightAt(x, z) ?? gy, z },
        rotation: { yaw: D.keep.yaw },
        model: { id: D.torch.model },
        layout: { box: { min: { x: -0.4, y: 0, z: -0.4 }, max: { x: 0.4, y: D.torch.height, z: 0.4 } } },
        physics: { body: "static", collider: "box" },
        children: [{ id: "flame", feetPosition: { x: 0, y: D.torch.height, z: 0 }, fx: { script: TORCH_FX } }],
      })
    }
  })
}

export function tick(ctx, L) {
  const me = ctx.place.objects["l132-duke"]
  if (!me || !me.model) return
  const s = me.state, now = ctx.now()
  if (now < (s.nextAt ?? 0)) return
  const stops = D.duke.stops, next = ((s.stop ?? 0) + 1) % stops.length, leg = stops[next]
  const pts = [...leg.via, leg.at], xs = [], zs = []
  let from = { x: me.feetPosition.x, z: me.feetPosition.z }, walk = 0
  for (const p of pts) {
    const dist = Math.hypot(p[0] - from.x, p[1] - from.z), dur = Math.max(0.5, dist / D.duke.speed)
    const tc = traverseCheck(ctx, { x: from.x, y: 0.3, z: from.z }, { x: p[0], y: 0.3, z: p[1] })
    if (tc && !tc.traversable && tc.blockedBy !== me.id) ctx.log("l132-duke stroll blocked", from, p, tc.blockedBy)
    xs.push({ value: p[0], duration: dur }); zs.push({ value: p[1], duration: dur })
    walk += dur; from = { x: p[0], z: p[1] }
  }
  animate(ctx, me, { "feetPosition.x": xs, "feetPosition.z": zs }, { easing: "linear" })
  const [a, b] = D.duke.pause
  s.stop = next
  s.faceYaw = stallYaw(L, leg.at)
  s.nextAt = now + (walk + a + ctx.random() * (b - a)) * 1000
}
