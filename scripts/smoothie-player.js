import S from "./lib/data/smoothies.yml"
import { maxHp, maxSan } from "./player.js"
export const updateSchedule = { every: { seconds: 1 } }
const key = (mix) => [...mix].sort().join("+")
export function onInput(ctx, input) {
  if (!input.pressed?.smoothie) return
  const s = ctx.self.state, d = input.actionData?.smoothie ?? {}
  if (d.k === "close") { s.smoothieOpen = false; s.smix = []; return }
  if (!s.smoothieOpen) return
  const mix = [...(s.smix ?? [])]
  if (d.k === "add" && S.fruits[d.f] && mix.length < 3 && !mix.includes(d.f)) { s.smix = [...mix, d.f]; ctx.emit("playSound", { clip: "cdn/sfx-plastic-cup-ice-cube-drop-clink.mp3", volume: 0.5 }) }
  if (d.k === "clear") s.smix = []
  if (d.k === "order" && mix.length >= 2) {
    if ((s.cash ?? 0) < S.price) { s.smoothieMsg = "Not enough cash"; return }
    s.cash = Math.round(((s.cash ?? 0) - S.price) * 100) / 100
    const k = key(mix), c = S.combos[k], b = c ?? S.house
    const book = s.smoothieBook ?? []
    const isNew = !!c && !book.includes(k)
    if (isNew) s.smoothieBook = [...book, k]
    s.smoothieBuff = { k: c ? k : "house", name: b.name, desc: b.desc, left: b.minutes * 60, hp: b.hp ?? 0, san: b.san ?? 0, food: b.food ?? 0, every: b.every ?? 1 }
    s.smix = []
    s.smoothieMsg = isNew ? `New recipe: ${b.name}!` : c ? `${b.name}` : "House Mix. No new recipe."
    ctx.emit("playSound", { clip: "cdn/sfx-countertop-blender-whirring-ice-then-stop.mp3", volume: 0.7 })
    if (isNew) ctx.emit("playSound", { clip: "cdn/sfx-bright-retro-arcade-jingle-discovery-chime.mp3", volume: 0.6 })
  }
}
export function update(ctx) {
  const s = ctx.self.state, ses = ctx.self.session
  if (s.smoothieOpen) {
    const k = ctx.place.objects["bc-juicebar"]
    const p = ctx.self.feetPosition, q = k?.feetPosition
    if (!q || Math.hypot(p.x - q.x, p.z - q.z) > 4.5) { s.smoothieOpen = false; s.smix = [] }
  }
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
