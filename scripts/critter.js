// The player's critter body: wears player.state.look as the scripted critter, swaps the face on T,
// opens the wardrobe on C (a turning preview of you stands in front while it's open), and lets the
// game's moods show on the face: a hit makes you wince, low hp is sad, low sanity is scared.
import C from './lib/data/critter.yml'
const SCRIPT = 'scripts/critter-geo.js'
export const updateSchedule = { every: { seconds: 0.2 } }

function lookOf(ctx) { return { ...C.default, ...(ctx.self.state.look || {}) } }

export function onInput(ctx, input) {
  const st = ctx.self.state
  if (input.pressed?.wardrobe) st.wardrobeOpen = !st.wardrobeOpen
  if (input.pressed?.emote) {
    const l = lookOf(ctx), cur = ctx.self.session.face || l.expr
    const next = C.expr[(C.expr.indexOf(cur) + 1) % C.expr.length]
    st.face = { expr: next, until: ctx.now() + C.holdFace * 1000 }
  }
  const d = input.actionData?.dress
  if (input.pressed?.dress && d && typeof d.k === 'string') {
    if (d.k === 'close') { st.wardrobeOpen = false; return }
    if (d.k === 'face') { st.face = { expr: d.v, until: ctx.now() + C.holdFace * 1000 }; return }
    if (!(d.k in C.default)) return
    st.look = { ...(st.look || {}), [d.k]: d.v }
    if (d.k === 'expr') st.face = null
  }
}

function moodFace(ctx, l) {
  const s = ctx.self.state, now = ctx.now(), ses = ctx.self.session
  if (s.face && now < s.face.until) return s.face.expr
  const hp = s.hp ?? 100
  if (ses.hp != null && hp < ses.hp - 0.5) ses.hurtUntil = now + C.hurtFace * 1000
  ses.hp = hp
  if (now < (ses.hurtUntil || 0)) return 'scared'
  if (hp <= 0) return 'sad'
  if (hp < 30) return 'sad'
  if ((s.san ?? 100) < 25) return 'scared'
  return l.expr
}

export function update(ctx) {
  const l = lookOf(ctx), face = moodFace(ctx, l), ses = ctx.self.session
  ses.face = face
  const params = { species: l.species, sex: l.sex, eye: l.eye, outfit: l.outfit, top: l.top, bottom: l.bottom, acc: l.acc, expr: face }
  if (l.fur) params.fur = l.fur
  const key = JSON.stringify(params)
  if (key !== ses.key) { ses.key = key; ctx.self.primitive = { kind: 'scripted', script: SCRIPT, params } }
  // the wardrobe mirror: only on this player's own screen
  const me = ctx.place.players.find((p) => p.id === ctx.self.id)
  if (!me?.isLocal) return
  if (ctx.self.state.wardrobeOpen) {
    const yaw = ((me.camera?.rotation?.yaw ?? 0) * Math.PI) / 180, f = ctx.self.feetPosition
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw)
    ses.spin = (ses.spin || 0) + 0.2 * 40
    const pos = { x: f.x + fx * 2.3 + rx * 0.55, y: f.y, z: f.z + fz * 2.3 + rz * 0.55 }
    const rot = { yaw: (yaw * 180) / Math.PI + Math.sin(ctx.now() / 1400) * 35 }
    const mirror = ses.mirror && ctx.getObject(ses.mirror)
    if (!mirror) ses.mirror = ctx.spawn({ audience: 'local', feetPosition: pos, rotation: rot, primitive: { kind: 'scripted', script: SCRIPT, params }, light: { kind: 'point', color: '#fff2d8', intensity: 2, distance: 4 } })
    else { mirror.feetPosition = pos; mirror.rotation = rot; if (ses.mirrorKey !== key) mirror.primitive = { kind: 'scripted', script: SCRIPT, params } }
    ses.mirrorKey = key
  } else if (ses.mirror) { ctx.destroy(ses.mirror); ses.mirror = null; ses.mirrorKey = null }
}
