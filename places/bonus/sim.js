// The Bonus Room's referee: lays the four counter people once (Tom, Andrew, Dawn, Rico) at their bonus.yml spots.
// They're staff, not traders: E at the counter in front of each opens its menu (scripts/bonus-counter.js, scripts/hub-ui.js).
import B from "../../scripts/lib/data/bonus.yml"
import { critterSpec } from "../../scripts/lib/critter-model.js"
import { npcLook } from "../../scripts/lib/clothes.js"
export const cadence = "2s"
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
  for (const [id, p] of Object.entries(SHOPPERS)) {
    if (ctx.place.objects[id]) continue
    ctx.spawn(id, { tags: ["bonus-shopper"], feetPosition: { x: 7.5, y: 0.05, z: 28 }, ...critterSpec(npcLook(id, p.look, "civilian", 5)),
      behavior: "scripts/mall-shopper.js", anim: { idle: { clip: "cdn/clip-idle-loop.glb", loop: true, weight: 1 } }, state: {} })
  }
  for (const [id, p] of Object.entries(LOUNGERS)) {
    if (ctx.place.objects[id]) continue
    ctx.spawn(id, { tags: ["bonus-shopper"], feetPosition: { x: p.x, y: p.y, z: p.z }, rotation: { yaw: p.yaw }, physics: { body: "static", collider: "capsule" },
      ...critterSpec(npcLook(id, p.look, "civilian", 5)), anim: { idle: { clip: "cdn/clip-idle-loop.glb", loop: true, weight: 1 } }, state: {} })
  }
}
export function tick(ctx) {
  const s = ctx.place.state
  if (s.peopleV !== 1) { people(ctx); s.peopleV = 1 }
  if (s.staffV === 1) return
  for (const [id, p] of Object.entries(B.people ?? {})) {
    const st = STAFF[id]; if (!st || ctx.place.objects[id]) continue
    ctx.spawn(id, {
      tags: ["bonus-staff"], feetPosition: { x: p.x, y: p.y ?? 0.05, z: p.z }, rotation: { yaw: p.yaw ?? 0 }, physics: { body: "static", collider: "capsule" },
      ...critterSpec(npcLook(id, st.look, "trader", 5)),
      anim: { idle: { clip: "cdn/clip-idle-loop.glb", loop: true, weight: 1 } },
      state: { name: st.name, info: st.info },
    })
  }
  s.staffV = 1
}
