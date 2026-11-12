// Rico, the Bonus Line attendant (Shelly Nov 12: "i dont like that rico creepily stands near me. HUGE overhaul").
// He keeps the platform running on the far side, away from the walk-in and the boarding line: soda, the station board,
// the luggage trolley, the bin, a break on the bench, watching the tracks. He never turns to stare; only a player who
// opened a talk with him gets his face. During the boarding scene (scripts/hub.js sets state.sceneUntil) he is the scene's.
// Every move is a rig-pack clip (Shelly: "keep using the animations provided").
import { animate } from "builtin/tween"
const CL = {
  walk: "cdn/clip-rig-walking-a-aadc5ff6-loop.glb", idle: "cdn/clip-rig-idle-a-09a9fec3-loop.glb", idle2: "cdn/clip-rig-idle-b-201d4da9-loop.glb",
  hold: "cdn/clip-rig-holding-a-ad457997-loop.glb", work: "cdn/clip-rig-working-a-13f5043b-loop.glb", use: "cdn/clip-rig-use-item-b9e64fa1-loop.glb",
  pickup: "cdn/clip-rig-pickup-005103f0-loop.glb", sitDown: "cdn/clip-rig-sit-chair-down-ea7a343c.glb", sitIdle: "cdn/clip-rig-sit-chair-idle-ddb4171e-loop.glb",
  sitUp: "cdn/clip-rig-sit-chair-standup-ead7634f.glb",
}
const Y = 5.5, SPEED = 1.15 // m/s, an unhurried walk (my pick)
const ROUND = [
  { at: { x: -11.5, z: -9.2 }, face: { x: -10.6, z: -9.2 }, act: "use", dwell: 5 },         // buys a soda
  { at: { x: -11.7, z: -13 }, face: { x: -9.7, z: -13 }, act: "hold", dwell: 10 },           // checks the station board
  { at: { x: -12.4, z: -18.5 }, face: { x: -13.2, z: -18.5 }, act: "work", dwell: 9 },       // sorts the luggage trolley
  { at: { x: -14.8, z: -21.5 }, face: { x: -15.5, z: -21.5 }, act: "pickup", dwell: 3.5 },   // empties the bin
  { at: { x: -16.4, z: -21.2 } },                                                            // around the bench end
  { at: { x: -16.3, z: -19 }, seat: { x: -15.75, z: -19 }, face: { x: -20, z: -19 }, dwell: 14 }, // break on the bench
  { at: { x: -18.4, z: -22.5 }, face: { x: -21, z: -22.5 }, act: "idle2", dwell: 7 },        // watches the line
]
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
const play = (me, clip, loop = true) => { me.anim.rico = { clip: CL[clip], weight: 3, loop } }
const face = (me, p) => { me.rotation = { lookAt: { x: p.x, y: Y, z: p.z } } }
export const updateSchedule = { every: { seconds: 0.25 } }
export function onSpawn(ctx) { const me = ctx.self; me.anim.idle = null; me.anim.walk = null; play(me, "idle") }
function walkTo(ctx, me, s, p, now) {
  const d = flat(me.feetPosition, p)
  if (d < 0.05) { s.until = now; return }
  const dur = d / SPEED
  face(me, p); play(me, "walk")
  animate(ctx, me, { "feetPosition.x": p.x, "feetPosition.z": p.z }, { duration: dur, easing: "linear" })
  s.until = now + dur * 1000
}
export function update(ctx) {
  const me = ctx.self, s = me.session, now = ctx.now()
  if ((me.state.sceneUntil ?? 0) > now) { s.phase = null; return } // the boarding scene owns him
  const talker = ctx.place.players.find((p) => p.state?.talkWith === me.id)
  if (talker && s.phase !== "walk") { if (s.phase !== "talk") { s.phase = "talk"; s.seated = false; play(me, "idle"); me.feetPosition = { x: ROUND[s.i ?? 0].at.x, y: Y, z: ROUND[s.i ?? 0].at.z } } face(me, talker.feetPosition); return }
  if (s.phase === "talk") s.phase = null
  if (!s.phase) { // fresh start or after a scene: head for the nearest stop
    let best = 0, bd = 1e9; ROUND.forEach((r, i) => { const d = flat(me.feetPosition, r.at); if (d < bd) { bd = d; best = i } })
    s.i = best; s.phase = "walk"; walkTo(ctx, me, s, ROUND[best].at, now); return
  }
  if (now < s.until) return
  const st = ROUND[s.i]
  if (s.phase === "walk") {
    if (!st.dwell) { s.i = (s.i + 1) % ROUND.length; walkTo(ctx, me, s, ROUND[s.i].at, now); return }
    if (st.seat) { me.feetPosition = { x: st.seat.x, y: Y, z: st.seat.z }; face(me, st.face); play(me, "sitDown", false); s.phase = "sitting"; s.until = now + 1200; return }
    face(me, st.face); play(me, st.act); s.phase = "act"; s.until = now + st.dwell * 1000; return
  }
  if (s.phase === "sitting") { play(me, "sitIdle"); s.phase = "seated"; s.until = now + st.dwell * 1000; return }
  if (s.phase === "seated") { play(me, "sitUp", false); s.phase = "rising"; s.until = now + 1300; return }
  if (s.phase === "rising") me.feetPosition = { x: st.at.x, y: Y, z: st.at.z }
  s.i = (s.i + 1) % ROUND.length; s.phase = "walk"; walkTo(ctx, me, s, ROUND[s.i].at, now)
}
