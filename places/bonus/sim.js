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
export function tick(ctx) {
  const s = ctx.place.state
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
