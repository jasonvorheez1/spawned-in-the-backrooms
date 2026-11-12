// The Wind-up Music Box (Christmas Area): set it down from the bag, it plays its four bars and slowly winds down;
// anyone within RANGE gains sanity while it plays. E picks it back up; the spring needs REST before it plays again.
// Shelly Nov 12: "a holdable you can place and it stops working after a bit, slowly raising sanity". Numbers are Savi's picks.
export const MB = { play: 90, range: 5, perSec: 0.35, rest: 180, slowAt: 15 }
export const MB_LOOP = "/cdn/moodboard-gothic-horror/sfx-wind-up-music-box-slow-tinkling-carol-loop.mp3"
export const MB_WIND = "/cdn/moodboard-gothic-horror/sfx-music-box-crank-winding-clicks-short.mp3"
const NOTES = `fx
pop notes rate=1.2 on=disc(.06) life=2..3 v=up(.25..0.4)+sdir()*.08 size=.035..0.05 acc=curl(.4)*.2 col=<1,.85,.55> a=0>.15:.8>.7:.6>0 sz=$size r=sprite(soft-disc,add)`
const WOOD = { color: "oklch(0.38 0.08 40)", roughness: 0.55 }, BRASS = { color: "oklch(0.78 0.12 85)", roughness: 0.3, metalness: 0.9 }
export const MB_BODY = {
  primitive: { kind: "box", width: 0.2, height: 0.11, depth: 0.14 }, material: WOOD,
  children: [
    { id: "trim", feetPosition: { x: 0, y: 0.1, z: 0 }, primitive: { kind: "box", width: 0.206, height: 0.014, depth: 0.146 }, material: BRASS },
    { id: "lid", feetPosition: { x: 0, y: 0.11, z: 0.07 }, pivot: [0.5, 0, 1], rotation: { pitch: -105 }, primitive: { kind: "box", width: 0.2, height: 0.016, depth: 0.14 }, material: WOOD },
    { id: "mirror", feetPosition: { x: 0, y: 0.125, z: 0.075 }, rotation: { pitch: -15 }, primitive: { kind: "box", width: 0.16, height: 0.1, depth: 0.004 }, material: { color: "oklch(0.85 0.02 230)", roughness: 0.05, metalness: 1 } },
    { id: "velvet", feetPosition: { x: 0, y: 0.104, z: 0 }, primitive: { kind: "box", width: 0.18, height: 0.004, depth: 0.12 }, material: { color: "oklch(0.35 0.14 20)", roughness: 0.95 } },
    { id: "dancer", feetPosition: { x: 0, y: 0.108, z: -0.01 }, primitive: { kind: "lathe", points: [[0, 0], [0.012, 0], [0.012, 0.004], [0.003, 0.01], [0.003, 0.04], [0.016, 0.05], [0.003, 0.056], [0.006, 0.066], [0.0065, 0.074], [0, 0.08]], segments: 16 }, material: { color: "oklch(0.93 0.03 20)", roughness: 0.4 } },
    { id: "crank", feetPosition: { x: 0.1, y: 0.05, z: 0 }, rotation: { roll: 90 }, primitive: { kind: "cylinder", radiusTop: 0.004, radiusBottom: 0.004, height: 0.03 }, material: BRASS,
      children: [{ feetPosition: { x: 0, y: 0.03, z: 0 }, primitive: { kind: "box", width: 0.04, height: 0.006, depth: 0.012 }, material: BRASS }] },
    ...[[-0.085, -0.055], [0.085, -0.055], [-0.085, 0.055], [0.085, 0.055]].map(([x, z], i) => ({ id: "foot" + i, feetPosition: { x, y: -0.008, z }, primitive: { kind: "sphere", radius: 0.012 }, material: BRASS })),
  ],
}
export function placeMusicBox(ctx) {
  const s = ctx.self.state, now = ctx.now(), n = s.snacks?.musicbox ?? 0
  if (n <= 0) return
  const left = ((s.keepAt?.musicbox ?? -1e12) + MB.rest * 1000 - now) / 1000
  if (left > 0) { s.notice = { text: `Wind-up Music Box: the spring needs ${Math.ceil(left)} s more`, at: now }; return }
  const f = ctx.self.feetPosition, yaw = ((ctx.self.camera?.rotation?.yaw ?? 0) * Math.PI) / 180
  const at = { x: f.x - Math.sin(yaw) * 0.8, y: f.y + 0.01, z: f.z - Math.cos(yaw) * 0.8 }
  s.snacks = { ...s.snacks, musicbox: n - 1 }; s.keepAt = { ...s.keepAt, musicbox: now }
  ctx.spawn({ tags: ["usable", "musicbox"], feetPosition: at, rotation: { yaw: (ctx.self.camera?.rotation?.yaw ?? 0) + 180 }, ...MB_BODY,
    behavior: "scripts/musicbox.js", fx: { script: NOTES },
    audio: { clip: MB_LOOP, loop: true, gain: 0.35, spatial: true, maxDistance: 14 },
    state: { kind: "musicbox", wound: true, until: now + MB.play * 1000, name: "Wind-up Music Box", verb: "Pick up", info: "Playing. Stay close, it steadies you" } })
  ctx.emit("playSound", { clip: MB_WIND, position: at, volume: 0.7, maxDistance: 10 })
  s.notice = { text: "Wind-up Music Box set down · stay close while it plays", at: now }
}
// sanity per second from a playing box within range (player.js), read once a second
export function musicNear(ctx) {
  const ses = ctx.self.session, now = ctx.now()
  if (now - (ses.mbAt ?? -1e9) > 1000) { ses.mbAt = now; ses.mbNear = ctx.query({ tags: ["musicbox"], radius: MB.range }).some((r) => r.state?.wound) }
  return ses.mbNear ? MB.perSec : 0
}
