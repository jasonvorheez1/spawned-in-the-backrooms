// The Bonus Room's referee: lays the four counter people once (Tom, Andrew, Dawn, Rico) at their bonus.yml spots.
// They're staff, not traders: E at the counter in front of each opens its menu (scripts/bonus-counter.js, scripts/hub-ui.js).
import { shopperFeet } from "../../scripts/mall-shopper.js"
import B from "../../scripts/lib/data/bonus.yml"
import { critterSpec, seatHumanHair, STYLE_V, wardChildren, seatWardrobe, setStyle, HUMAN } from "../../scripts/lib/critter-model.js"
import { npcLook } from "../../scripts/lib/clothes.js"
import { layBonusExtra } from "../../scripts/lib/bonus-extra.js"
export const cadence = "500ms" // was 2s: the diner music swap answers within half a second of the door
const STAFF = {
  "bonus-tom":    { name: "Tom", info: "Tom's Diner", look: { species: "bear", sex: "m", topw: "tee", top: "#f4f1ea", botw: "pants", bottom: "#2b2b33", shoes: "sneakers", hat: "cap", hatc: "#e85d75" } },
  "bonus-andrew": { name: "Andrew", info: "Andrew's Furniture", look: { species: "dog", sex: "m", topw: "longsleeve", top: "#3d5a98", botw: "pants", bottom: "#4a3b2c", shoes: "sneakers", eyew: "glasses" } },
  "bonus-dawn":   { name: "Dawn", info: "Liminal Clothes", look: { species: "cat", sex: "f", topw: "hoodie", top: "#b967ff", botw: "skirt", bottom: "#2b2b33", shoes: "sneakers" } },
  "bonus-rico":   { name: "Rico", info: "Teleport Station attendant", look: { species: "fox", sex: "m", topw: "tee", top: "#01cdfe", botw: "pants", bottom: "#1d2540", shoes: "sneakers", hat: "beanie", hatc: "#1d2540" } },
}
const SHOPPERS = {
  "bonus-shop-1": { look: { species: "rabbit", sex: "f", topw: "tee", top: "#ff71ce", botw: "shorts", bottom: "#a9d6e5", shoes: "sneakers" } },
  "bonus-shop-2": { look: { species: "wolf", sex: "m", topw: "hoodie", top: "#3a3a52", botw: "pants", bottom: "#24304a", shoes: "sneakers", hat: "cap", hatc: "#05ffa1" } },
  "bonus-shop-3": { look: { species: "raccoon", sex: "m", topw: "longsleeve", top: "#f6d55c", botw: "pants", bottom: "#5c4b3a", shoes: "sneakers" } },
  "bonus-shop-4": { look: { species: "deer", sex: "f", topw: "tee", top: "#b967ff", botw: "skirt", bottom: "#ffffff", shoes: "sneakers" } },
  "bonus-shop-5": { look: { species: "mouse", sex: "f", topw: "hoodie", top: "#01cdfe", botw: "shorts", bottom: "#2b2b33", shoes: "sneakers" } },
}
// two friends leaning on the upper balcony rail, talking
const LOUNGERS = {
  "bonus-rail-1": { x: 7.2, y: 5.55, z: 3.4, yaw: 0, look: { species: "otter", sex: "m", topw: "tee", top: "#05ffa1", botw: "pants", bottom: "#2b2b33", shoes: "sneakers" } },
  "bonus-rail-2": { x: 7.2, y: 5.55, z: 2.2, yaw: 180, look: { species: "cat", sex: "f", topw: "longsleeve", top: "#ff9a8b", botw: "skirt", bottom: "#3d5a98", shoes: "sneakers" } },
}
function people(ctx) {
  const starts = [0, 2, 4, 7, 10]
  for (const [i, [id, p]] of Object.entries(SHOPPERS).entries()) {
    const at = starts[i]
    const existing = ctx.place.objects[id]
    if (existing) {
      existing.state.at = at
      existing.feetPosition = shopperFeet(at)
      continue
    }
    ctx.spawn(id, { tags: ["bonus-shopper"], feetPosition: shopperFeet(at), ...critterSpec(npcLook(id, p.look, "civilian", 5)),
      behavior: "scripts/mall-shopper.js", anim: { idle: { clip: "cdn/clip-idle-loop.glb", loop: true, weight: 1 } }, state: { at } })
  }
  for (const [id, p] of Object.entries(LOUNGERS)) {
    if (ctx.place.objects[id]) continue
    ctx.spawn(id, { tags: ["bonus-shopper"], feetPosition: { x: p.x, y: p.y, z: p.z }, rotation: { yaw: p.yaw }, physics: { body: "static", collider: "capsule" },
      ...critterSpec(npcLook(id, p.look, "civilian", 5)), anim: { idle: { clip: "cdn/clip-idle-loop.glb", loop: true, weight: 1 } }, state: {} })
  }
}
// Shelly Nov 12: Tom's theme plays from his jukebox, and the mall music stops for whoever walks into the diner (floor x -24..-10, z -24..-6, ground level)
let musicKey = null
function dinerMusic(ctx) {
  const inside = (p) => { const f = p.feetPosition; return f && f.x > -24 && f.x < -10 && f.z > -24 && f.z < -6 && f.y < 3 }
  const inn = [], out = []
  for (const p of ctx.place.players) (inside(p) ? inn : out).push(p.id)
  const key = inn.join(',') + '|' + out.join(',')
  if (key === musicKey) return
  musicKey = key
  const m = ctx.place.objects['bonus-music'], j = ctx.place.objects['bd-jukebox']
  if (m?.audio) m.audio = { ...m.audio, listeners: out }
  if (j?.audio) j.audio = { ...j.audio, listeners: inn }
}
export function tick(ctx) {
  const s = ctx.place.state
  dinerMusic(ctx)
  if (s.peopleV !== 3) { for (const id of [...Object.keys(SHOPPERS), ...Object.keys(LOUNGERS)]) if (ctx.place.objects[id]) ctx.destroy(id); s.peopleV = 3 } // Nov 12, Shelly: no npcs in the mall but the special ones (staff + Gina); people() no longer runs
  if (s.shineV !== 1) { layBonusExtra(ctx); s.shineV = 1 }
  setStyle(ctx.world.state.bodyStyle) // Nov 11: furry is the default; the human re-dress pass below only in human mode
  if (HUMAN && s.hairV !== STYLE_V) { // the mall's people keep their look on state.wear so a hair rebuild re-seats on them too
    s.hairV = STYLE_V
    const rows = [...Object.entries(SHOPPERS).map(([id, p]) => [id, p.look, "civilian"]), ...Object.entries(LOUNGERS).map(([id, p]) => [id, p.look, "civilian"]), ...Object.entries(STAFF).map(([id, p]) => [id, p.look, "trader"])]
    for (const [id, look, role] of rows) { const o = ctx.place.objects[id]; if (!o) continue; const l = o.state?.wear ?? npcLook(id, look, role, 5); if (o.state && !o.state.wear) o.state.wear = l; seatHumanHair(ctx, o, l); if (l.sex && wardChildren(l).some((c) => { const g = ctx.place.objects[id + '/' + c.id]; return !g || (g.model?.id ?? g.model) !== c.model.id })) seatWardrobe(ctx, o, l) } // Nov 11: a remade garment file reaches the mall's people too (Andrew kept a pants file no list named)
  }
  if (s.ricoBack !== 1) { s.ricoBack = 1; s.staffV = 0 } // Nov 12: Rico is back (Shelly)
  if (s.ricoV !== 1 && ctx.place.objects["bonus-rico"]) { const r = ctx.place.objects["bonus-rico"]; r.behavior = ["scripts/rico.js"]; s.ricoV = 1 } // Nov 12: Rico works the platform (scripts/rico.js)
  if (s.staffV === 1) return
  for (const [id, p] of Object.entries(B.people ?? {})) {
    const st = STAFF[id]; if (!st || ctx.place.objects[id]) continue
    ctx.spawn(id, {
      tags: ["bonus-staff"], feetPosition: { x: p.x, y: p.y ?? 0.05, z: p.z }, rotation: { yaw: p.yaw ?? 0 }, physics: { body: "static", collider: "capsule" },
      ...critterSpec(npcLook(id, st.look, "trader", 5)),
      anim: { idle: { clip: "cdn/clip-idle-loop.glb", loop: true, weight: 1 } },
      state: { name: st.name, info: st.info },
      ...(id === "bonus-rico" ? { behavior: ["scripts/rico.js"] } : {}),
    })
  }
  s.staffV = 1
}
