// the builders' emote wheel: N opens it, a slice plays its dance until you move, jump or pick again
import EMOTES from "./lib/data/emotes.yml"
const CLOCK = `fx
pop ring n=1 at=point() size=1.9 sz=$size*(1+.03*flick(2,1)) col=hdr(2.2,1.6,.6) a=.35 r=sprite(soft-ring,add)
pop tick rate=10 on=arc(.95) life=.8..1.3 v=up(.3..0.7) size=.04..0.07 acc=drag(1.2) col=hdr(3,2.2,.8)>hdr(1.4,.7,.2) a=1>0 r=sprite(ember,add)
pop glow n=1 at=point() r=light(<1,.8,.45>,6,5)`
const stopSong = (ctx) => { const id = ctx.self.session.emoteSong; if (id) { ctx.emit("stopSound", { soundId: id }); ctx.self.session.emoteSong = null } }
function stop(ctx) {
  const st = ctx.self.state
  if (!st.emote) return
  st.emote = null; ctx.self.anim.emote = null; stopSong(ctx)
  const fx = ctx.self.session.emoteFx; if (fx) { ctx.destroy(fx); ctx.self.session.emoteFx = null }
}
function play(ctx, row) {
  stop(ctx)
  const me = ctx.self
  me.state.emote = row.id
  me.anim.emote = { clip: row.clip, weight: 4, loop: "loop" }
  if (row.song) me.session.emoteSong = ctx.emit("playSound", { clip: row.song, position: me.feetPosition, volume: 0.7, refDistance: 3, maxDistance: 30 })
  if (row.clock) me.session.emoteFx = ctx.spawn({ parent: me.id, audience: "all", scope: "session", feetPosition: { x: 0, y: 1.15, z: 0.35 }, fx: { script: CLOCK } })
}
export function onInput(ctx, input) {
  const me = ctx.self, st = me.state
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
  if (st.emote) {
    const moving = Math.abs(input.axes?.moveX || 0) > 0.2 || Math.abs(input.axes?.moveZ || 0) > 0.2
    if (moving || input.pressed?.jump || input.pressed?.attack) stop(ctx)
  }
}
export function onSpawn(ctx) { if (ctx.self.state?.emote) { ctx.self.state.emote = null; ctx.self.anim.emote = null } }
