import S from "./lib/data/smoothies.yml"
import { maxHp, maxSan } from "./player.js"
import { critterSpec } from "./lib/critter-model.js"
const CLIP = { talk: "cdn/clip-talk-loop.glb", point: "cdn/clip-point.glb", cheer: "cdn/clip-cheer-loop.glb", clap: "cdn/clip-clap-loop.glb", wave: "cdn/clip-wave-loop.glb" }
function salBeat(ctx, clip, expr) { // Sal acts each beat: a clip over his idle and a face
  const sal = ctx.place.objects["bonus-sal"]; if (!sal) return
  sal.anim.idle = { clip: "cdn/clip-idle-loop.glb", loop: true, weight: clip ? 0 : 1 }
  sal.anim.act = clip ? { clip: CLIP[clip], loop: clip !== "point", weight: 1 } : null
  const look = sal.state.look; if (look) { const m = critterSpec({ ...look, expr: expr || look.expr }).model; if (m) sal.model = m }
}
export const updateSchedule = { every: { seconds: 1 } }
const key = (mix) => [...mix].sort().join("+")
const K = { x: 6.6, y: 0, z: 12 }, SAL = { x: 7.5, y: 1.6, z: 12 }
const say = (ctx, line) => { const c = S.lines?.[line]; if (c) ctx.emit("playSound", { clip: c, position: SAL, bus: "Voice", refDistance: 4, maxDistance: 18, mode: "restart" }) }
const SPLASH = (col) => `fx
pop juice burst=40 life=.5..0.9 v=up(2.2..3.4)+sdir()*(.6..1.4) size=.04..0.09 acc=grav()+drag(.6) col=${col} a=1>.8:1>0 sz=$size floor=die r=sprite(soft-disc,alpha)`
const CONFETTI = `fx
pop conf burst=90 life=1.4..2.4 v=up(4..6)+sdir()*(1.5..3) size=.05..0.09 spin=-10..10 acc=grav()*.35+drag(1.2) col=<1,.4,.72>..<.3,.95,1> a=1>.8:1>0 sz=$size rot=$age*$spin r=sprite(soft-disc,alpha)
pop sparkle burst=30 life=.6..1.2 v=sdir()*(1..2.5) size=.06..0.12 acc=drag(2) col=hdr(4,3,1.6) a=1>0 sz=$size r=sprite(soft-disc,add)
pop glow n=1 life=1.2 glo=1>0 r=light(<1,.6,.85>,$glo*20,8)`
export function onInput(ctx, input) {
  if (!input.pressed?.smoothie) return
  const s = ctx.self.state, d = input.actionData?.smoothie ?? {}
  if (d.k === "close") { s.smoothieOpen = false; s.smix = []; return }
  if (!s.smoothieOpen) return
  const mix = [...(s.smix ?? [])]
  if (d.k === "add" && S.fruits[d.f] && mix.length < 3 && !mix.includes(d.f)) { s.smix = [...mix, d.f]; ctx.emit("playSound", { clip: "cdn/sfx-plastic-cup-ice-cube-drop-clink.mp3", volume: 0.5 }) }
  if (d.k === "clear") s.smix = []
  if (d.k === "order" && mix.length >= 2) {
    if ((s.cents ?? 0) < S.price * 100) { s.smoothieMsg = "Not enough cash"; say(ctx, "broke"); return }
    s.cents = (s.cents ?? 0) - S.price * 100
    const k = key(mix), c = S.combos[k], b = c ?? S.house
    const book = s.smoothieBook ?? []
    const isNew = !!c && !book.includes(k)
    if (isNew) s.smoothieBook = [...book, k]
    s.smoothieBuff = { k: c ? k : "house", name: b.name, desc: b.desc, col: S.fruits[mix[0]]?.color ?? "#ff77b7", total: b.minutes * 60, left: b.minutes * 60, hp: b.hp ?? 0, san: b.san ?? 0, food: b.food ?? 0, every: b.every ?? 1 }
    s.smix = []
    s.smoothieMsg = isNew ? `New recipe: ${b.name}!` : c ? `${b.name}` : "House Mix. No new recipe."
    const col = S.fruits[mix[0]]?.color ?? "#ff77b7"
    s.smoothieOpen = false
    s.sCut = { at: ctx.now(), name: b.name, desc: b.desc, isNew, house: !c, col, mins: b.minutes }
    ctx.view.camera = { eye: { x: K.x - 2.6, y: 1.55, z: K.z + 0.9 }, aim: { x: K.x, y: 1.1, z: K.z }, fov: 50 }
    say(ctx, "blend")
    salBeat(ctx, "talk", "joy")
    ctx.emit("playSound", { clip: "cdn/sfx-countertop-blender-whirring-ice-then-stop.mp3", position: { x: K.x, y: 1.2, z: K.z }, volume: 0.9 })
    ctx.emit("shake", { target: "bc-juicebar", intensity: 0.25, duration: 1.8 })
    ctx.after(0.9, "sCutPour", { col })
    ctx.after(2.0, "sCutReveal", { isNew, house: !c })
    ctx.after(4.6, "sCutEnd", {})
  }
}
export function sCutPour(ctx, p) {
  ctx.view.camera = { eye: { x: K.x - 1.15, y: 1.4, z: K.z - 0.35 }, aim: { x: K.x, y: 1.15, z: K.z }, fov: 42 }
  const hex = p.col.replace("#", ""), v = [0, 2, 4].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(2))
  salBeat(ctx, "point", "smile")
  ctx.emit("fx", { position: { x: K.x - 0.2, y: 1.25, z: K.z }, script: SPLASH(`<${v.join(",")}>`) })
}
export function sCutReveal(ctx, p) {
  ctx.view.camera = { eye: { x: K.x - 1.9, y: 1.75, z: K.z + 0.5 }, aim: { x: SAL.x, y: 1.35, z: SAL.z }, fov: 48 }
  say(ctx, p.isNew ? "newRecipe" : p.house ? "house" : "known")
  salBeat(ctx, p.isNew ? "cheer" : p.house ? "talk" : "clap", p.isNew ? "joy" : "smile")
  if (p.isNew) {
    ctx.emit("fx", { position: { x: K.x, y: 1.6, z: K.z }, script: CONFETTI })
    ctx.emit("playSound", { clip: "cdn/sfx-bright-retro-arcade-jingle-discovery-chime.mp3", volume: 0.7 })
    ctx.emit("screenFlash", { color: "#ffd9f0", duration: 0.25, intensity: 0.35 })
  }
  ctx.emit("squash", { target: "bonus-sal", axis: "y", intensity: 0.12, duration: 0.5 })
}
export function sCutEnd(ctx) { salBeat(ctx, null, null); ctx.view.camera = null; ctx.self.state.sCut = null; ctx.self.state.smoothieOpen = true }
export function update(ctx) {
  const s = ctx.self.state, ses = ctx.self.session
  if (s.smoothieOpen) {
    const k = ctx.place.objects["bc-juicebar"]
    const p = ctx.self.feetPosition, q = k?.feetPosition
    if (!q || Math.hypot(p.x - q.x, p.z - q.z) > 4.5) { s.smoothieOpen = false; s.smix = [] }
  }
  if (s.sCut && ctx.now() - s.sCut.at > 8000) { s.sCut = null; ctx.view.camera = null; salBeat(ctx, null, null) }
  const b = s.smoothieBuff
  if (!b || s.menuOpen || s.dead) return
  ses.sTick = (ses.sTick ?? 0) + 1
  if (ses.sTick % 10) return
  const n = (ses.sTick / 10) % (b.every || 1) === 0
  const left = b.left - 10
  if (n) {
    if (b.hp) s.hp = Math.min(maxHp(s.level, s), (s.hp ?? 0) + b.hp)
    if (b.san) s.sanity = Math.min(maxSan(s.level, s), (s.sanity ?? 0) + b.san)
    if (b.food) { s.hunger = Math.min(100, (s.hunger ?? 100) + b.food); s.thirst = Math.min(100, (s.thirst ?? 100) + b.food) }
  }
  s.smoothieBuff = left > 0 ? { ...b, left } : null
}
