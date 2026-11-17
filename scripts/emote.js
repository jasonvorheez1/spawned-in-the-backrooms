// the builders' emote wheel: N opens it, a slice plays its dance in third person with its face;
// walking keeps it going on the upper body (a traversal emote), standing still gives it the whole body.
// attack, or the same slice again, ends it
import EMOTES from "./lib/data/emotes.yml"
const CLOCK_TEX = "/cdn/value.e42a4e3f680683976bc9f15ad7892b5ad20b1cb4c5762f5cf5c6ff772fa8edf6.png"
const CLOCK = `fx
pop face n=1 at=point() size=2.3 sz=$size*(1+.025*flick(1.6,1)) col=<.95,.85,.65> a=.7 rot=$age*.35 r=sprite(${CLOCK_TEX},alpha)
pop halo n=1 at=point() size=3.2 col=<1,.75,.35> a=.05*flick(1.2,.4) r=sprite(soft-disc,add)
pop tick rate=14 on=disc(1.05) life=.7..1.2 v=sdir()*.25+up(.2..0.5) size=.03..0.06 acc=drag(1.4) col=hdr(3.2,2.3,.8)>hdr(1.4,.7,.2) a=1>0 r=sprite(ember,add)
pop glow n=1 at=point() r=light(<1,.78,.42>,1.2,3)`
const SPIN = (r) => ({ clip: r.clip, weight: 4, loop: "loop" })
const UPPER = (r) => ({ clip: r.clip, weight: 4, loop: "loop", mask: { from: "Spine" } })
function stop(ctx) {
  const me = ctx.self, st = me.state, s = me.session
  if (!st.emote) return
  st.emote = null; me.anim.emote = null
  if (s.emoteSong) { ctx.emit("stopSound", { soundId: s.emoteSong }); s.emoteSong = null }
  if (s.emoteFx) { ctx.destroy(s.emoteFx); s.emoteFx = null }
  if (st.face?.emote) st.face = null
  if (s.emoteTp === false) st.tp = false
  s.emoteTp = null
  if (s.emoteSheath) { st.sheathed = false; s.emoteSheath = false }
  if (s.emoteEq) { st.equipped = s.emoteEq; s.emoteEq = null }
}
function play(ctx, row) {
  stop(ctx)
  const me = ctx.self, st = me.state, s = me.session
  st.emote = row.id; s.emoteRow = row; s.emoteUpper = false
  me.anim.emote = SPIN(row)
  if (st.equipped && st.equipped !== 'fists') { s.emoteEq = st.equipped; st.equipped = 'fists' } // the gun leaves your hands for the dance
  if (!st.sheathed) { st.sheathed = true; st.sheathAt = ctx.now() - 1000; s.emoteSheath = true } // both hands free to dance
  s.emoteTp = !!st.tp; st.tp = true // third person while it plays, put back after
  if (row.face) st.face = { expr: row.face, until: ctx.now() + 600000, emote: true }
  if (row.song) s.emoteSong = ctx.emit("playSound", { clip: row.song, position: me.feetPosition, volume: 0.7, refDistance: 3, maxDistance: 30 })
  if (row.clock) s.emoteFx = ctx.spawn({ parent: me.id, audience: "all", scope: "session", feetPosition: { x: 0, y: 1.15, z: -0.75 }, fx: { script: CLOCK } }) // the side the camera looks past
}
export function onInput(ctx, input) {
  const me = ctx.self, st = me.state, s = me.session
  if (!me.isEditor) { if (st.emoteWheel) st.emoteWheel = false; return } // builders only, for now
  if (input.pressed?.emote) { st.emoteWheel = !st.emoteWheel; return }
  const d = input.actionData?.emotePick
  if (input.pressed?.emotePick && d) {
    st.emoteWheel = false
    const row = EMOTES.find((r) => r.id === d.id)
    if (!row) return
    if (row.id === "face") { st.emoteFaceNext = ctx.now(); return } // critter.js cycles the face on this stamp
    if (st.emote === row.id) return stop(ctx)
    return play(ctx, row)
  }
  if (!st.emote) return
  if (input.pressed?.attack || input.pressed?.aim) return stop(ctx)
  const row = s.emoteRow || EMOTES.find((r) => r.id === st.emote)
  if (!row) return stop(ctx)
  const moving = Math.abs(input.axes?.moveX || 0) > 0.15 || Math.abs(input.axes?.moveZ || 0) > 0.15 || !me.grounded
  if (moving !== !!s.emoteUpper) { s.emoteUpper = moving; me.anim.emote = moving ? UPPER(row) : SPIN(row) } // legs to the gait while you travel
}
export function onSpawn(ctx) { const st = ctx.self.state; if (st?.emote) { st.emote = null; ctx.self.anim.emote = null; if (st.face?.emote) st.face = null } }
