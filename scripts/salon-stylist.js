// Gina, the Glow Up Salon's stylist. When someone sits in a mirror chair (tag seat, state.salon) with the makeover open,
// she walks behind the chair and cuts: a custom upper-body clip (lean, head down, shoulder sway) plus both hands on IK,
// the right hand snipping in an arc beside the head with the shears, the left holding a lock at the crown.
// Every change the sitter makes in the menu gets a snip flurry, falling clippings and a line. Done or standing up sends her home.
const HOME = { x: 13.2, z: 1.2, yaw: 180 } // beside the first mirror chair, out of the walkway
const WALK = 1.3, BEHIND = 0.5, SIDE = 0.42, HEAD_Y = 1.45 // Savi's picks: head height of a sitter above the chair's feet, measured on the 1.84 m body
const SNIP = "/cdn/moodboard-realistic-gritty/sfx-steel-hair-shears-snip-close-crisp.mp3"
const THROAT = "voice-warm-friendly-thirties-woman-hairstylist"
const say = (line) => `/cdn/${THROAT}-saying-${encodeURIComponent(line)}.mp3`
const HELLO = ["Hey, have a seat. What are we doing today?", "Hi! Sit back, I'll take care of you."]
const NICE = ["Ooh, that works.", "Hold still for me.", "Okay, I like that.", "Bold. I'm into it.", "That suits you."]
const BYE = ["All done. Looks good on you.", "There you go. Come back anytime."]
const CLIPPINGS = `fx
pop hair burst=14..22 on=sphere(.12) life=.9..1.5 v=sdir()*(.2..0.6)+up(.15) size=.02..0.04 spin=-8..8 acc=grav()*.45+drag(2.2) col=<.22,.16,.11> a=1>.8:1>0 sz=$size rot=$age*$spin floor=stick r=sprite(stalk,alpha,velocity,.015)`
// the cutting stance: an upper-body loop, legs left to the idle
const CUT = { duration: 2.4, tracks: {
  Spine: { pitch: [-8, -10, -8], roll: [0, 2, 0, -2, 0] },
  Spine1: { pitch: [-6, -7, -6] }, Spine2: { pitch: [-4, -5, -4], yaw: [0, 6, 0, -4, 0] },
  Neck: { pitch: [-10, -12, -10] }, Head: { pitch: [-14, -10, -16, -12, -14], yaw: [0, 8, 0, -6, 0], roll: [0, 4, 0, -3, 0] },
} }
const FLOURISH = { duration: 1.2, tracks: { Spine: { pitch: [-8, 6, 0] }, Head: { pitch: [-14, 6, 0], roll: [0, -8, 0] } } }
const pick = (ctx, a) => a[Math.floor(ctx.random() * a.length)]
const yawOf = (r) => (typeof r === "number" ? r : r?.yaw ?? 0)
const fwd = (yaw) => { const r = (yaw * Math.PI) / 180; return { x: -Math.sin(r), z: -Math.cos(r) } }
const lookKey = (l) => JSON.stringify(l ?? {})

const WAIT = ["Be right with you!", "One sec, hon, you're next.", "Get comfy, I'm coming."]
const IDLE_SWAP = 60000 // a sitter who changes nothing for 60 s while another waits gets passed to the next chair
function sitters(ctx) { // every salon chair whose sitter has the makeover open
  const out = []
  for (const r of ctx.query({ tags: ["seat"], center: ctx.self.feetPosition, radius: 12 })) {
    const ch = ctx.getObject(r.id); if (!ch?.state?.salon) continue
    const who = ch.state.by?.[0]; if (!who) continue
    const p = ctx.getObject(who); if (p?.state?.salonOpen && p.state.sit?.id === ch.id) out.push({ ch, p })
  }
  return out
}
function client(ctx) { // first come, first served: the earliest sitter, kept until they leave or idle past IDLE_SWAP while someone waits
  const ses = ctx.self.session, now = ctx.now(), all = sitters(ctx)
  ses.since ??= {}; ses.active ??= {}
  const ids = new Set(all.map((c) => c.p.id))
  for (const k of Object.keys(ses.since)) if (!ids.has(k)) { delete ses.since[k]; delete ses.active[k] }
  for (const c of all) { ses.since[c.p.id] ??= now; const k = lookKey(c.p.state.look); if (ses.active[c.p.id]?.k !== k) ses.active[c.p.id] = { k, at: now } }
  all.sort((a, b) => ses.since[a.p.id] - ses.since[b.p.id])
  let cur = all.find((c) => c.ch.id === ses.on)
  const waiting = all.filter((c) => c !== cur)
  if (cur && waiting.length && now - ses.active[cur.p.id].at > IDLE_SWAP && now - (ses.servedAt ?? 0) > IDLE_SWAP) { ses.since[cur.p.id] = now; cur = null } // to the back of the line
  if (!cur) { all.sort((a, b) => ses.since[a.p.id] - ses.since[b.p.id]); cur = all[0] ?? null }
  // the line everyone's menu reads: who she's with, who waits; written only when it changes
  const line = cur ? [cur.p.id, ...all.filter((c) => c !== cur).map((c) => c.p.id)] : []
  if (JSON.stringify(ctx.self.state.queue ?? []) !== JSON.stringify(line)) {
    for (const id of line.slice(1)) if (!(ctx.self.state.queue ?? []).includes(id) && now > (ses.waitTalk ?? 0)) { ses.waitTalk = now + 4000; ctx.emit("playSound", { clip: say(pick(ctx, WAIT)), position: { ...ctx.self.feetPosition, y: ctx.self.feetPosition.y + 1.6 }, bus: "Voice", volume: 0.9, maxDistance: 14, mode: "restart" }) }
    ctx.self.state.queue = line
  }
  return cur
}
function walkTo(ctx, x, z, faceYaw, dt) {
  const me = ctx.self, dx = x - me.feetPosition.x, dz = z - me.feetPosition.z, d = Math.hypot(dx, dz)
  if (d < 0.05) { if (me.anim.walk) me.anim.walk = null; me.rotation = { yaw: faceYaw }; return true }
  const s = Math.min(d, WALK * dt)
  me.feetPosition = { x: me.feetPosition.x + (dx / d) * s, y: me.feetPosition.y, z: me.feetPosition.z + (dz / d) * s }
  me.rotation = { yaw: (Math.atan2(-dx, -dz) * 180) / Math.PI }
  if (!me.anim.walk) me.anim.walk = { clip: "cdn/clip-walk-female-loop.glb", loop: true, weight: 3, blendIn: 0.25 }
  return false
}
function hands(ctx, ch, t, flurry) {
  const me = ctx.self, y = yawOf(ch.rotation), f = fwd(y), r = { x: -f.z, z: f.x }, c = ch.feetPosition
  const head = { x: c.x - f.x * 0.08, y: c.y + HEAD_Y, z: c.z - f.z * 0.08 } // the sitter's head sits a little back on the seat
  const at = (side, up, back) => ({ x: head.x + r.x * side - f.x * back, y: head.y + up, z: head.z + r.z * side - f.z * back })
  const sp = flurry ? 9 : 3.2, sw = Math.sin(t * sp), arc = Math.sin(t * 0.7)
  // right hand (her right = the chair's right): the shears travel an arc from temple to nape, snipping
  me.bones.RightHand = { reach: { to: at(0.15 + 0.03 * sw, 0.06 + 0.07 * arc, 0.06 + 0.06 * Math.cos(t * 0.7)), pole: at(0.55, -0.35, 0.45), weight: 1, blendIn: 0.3 } }
  // left hand: a lock held up at the crown, drifting with the cut
  me.bones.LeftHand = { reach: { to: at(-0.05 + 0.04 * arc, 0.17 + 0.02 * sw, 0.1), pole: at(-0.55, -0.3, 0.45), weight: 1, blendIn: 0.3 } }
  me.bones.Head = { aim: head }
}
function letGo(ctx) { const me = ctx.self; me.bones.RightHand = null; me.bones.LeftHand = null; me.bones.Head = null; if (me.anim.cut) me.anim.cut = null }

export function endFlourish(ctx) { if (ctx.self.anim.flourish) ctx.self.anim.flourish = null } // the flourish plays once, then she settles back to idle (it held its last pose at weight 4 forever)
export function onSpawn(ctx) {
  if (ctx.self.anim.flourish) ctx.self.anim.flourish = null
  ctx.self.anim.idle = { clip: "cdn/clip-idle-female-loop.glb", loop: true, weight: 1 }
}
export function update(ctx, dt) {
  const me = ctx.self, ses = me.session, now = ctx.now(), c = client(ctx)
  if (!c) {
    if (ses.on) { // a cut just ended: a goodbye and a little flourish
      ses.on = null; letGo(ctx)
      if (ses.sat) ctx.emit("playSound", { clip: say(pick(ctx, BYE)), position: { ...me.feetPosition, y: me.feetPosition.y + 1.6 }, bus: "Voice", volume: 0.9, maxDistance: 14, mode: "restart" })
      me.anim.flourish = { clip: FLOURISH, weight: 4, mask: { from: "Spine" } }; ctx.after(1.3, "endFlourish")
    }
    ses.sat = false; if (me.state.with) me.state.with = null
    if (walkTo(ctx, HOME.x, HOME.z, HOME.yaw, dt)) ctx.sleep(0.5)
    return
  }
  const { ch, p } = c, y = yawOf(ch.rotation), f = fwd(y), r = { x: -f.z, z: f.x }
  const spot = { x: ch.feetPosition.x - f.x * BEHIND + r.x * SIDE, z: ch.feetPosition.z - f.z * BEHIND + r.z * SIDE }
  if (ses.on !== ch.id) { ses.on = ch.id; ses.servedAt = now; ses.sat = false; ses.look = lookKey(p.state.look); ses.flurry = 0; letGo(ctx); me.anim.flourish = null
    ctx.emit("playSound", { clip: say(pick(ctx, HELLO)), position: { ...me.feetPosition, y: me.feetPosition.y + 1.6 }, bus: "Voice", volume: 0.9, maxDistance: 14, mode: "restart" }) }
  if (!walkTo(ctx, spot.x, spot.z, y, dt)) { if (me.state.with) me.state.with = null; return }
  if (me.state.with !== p.id) me.state.with = p.id // she stands behind this sitter: their menu opens (scripts/salon-ui.js)
  if (!ses.sat) { ses.sat = true; ses.t0 = now; me.anim.cut = { clip: CUT, loop: true, weight: 4, mask: { from: "Spine" }, blendIn: 0.4 } }
  const t = (now - ses.t0) / 1000, k = lookKey(p.state.look), flurry = now < (ses.flurry ?? 0)
  hands(ctx, ch, t, flurry)
  const head = { x: ch.feetPosition.x, y: ch.feetPosition.y + HEAD_Y + 0.1, z: ch.feetPosition.z }
  if (k !== ses.look) { // the sitter changed something: a quick run of snips, clippings falling, a word
    ses.look = k; ses.flurry = now + 1400
    ctx.emit("fx", { position: head, script: CLIPPINGS })
    if (now > (ses.talkAt ?? 0)) { ses.talkAt = now + 6000; ctx.emit("playSound", { clip: say(pick(ctx, NICE)), position: { ...me.feetPosition, y: me.feetPosition.y + 1.6 }, bus: "Voice", volume: 0.9, maxDistance: 14, mode: "restart" }) }
  }
  if (now > (ses.snipAt ?? 0)) { // the shears close on the beat of the hand
    ses.snipAt = now + (flurry ? 260 : 900 + ctx.random() * 700)
    ctx.emit("playSound", { clip: SNIP, position: head, volume: flurry ? 0.55 : 0.4, pitch: 0.92 + ctx.random() * 0.16, maxDistance: 8, mode: "overlap" })
  }
}
