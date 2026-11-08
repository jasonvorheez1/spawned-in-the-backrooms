// Phoebe (johnadams2, Nov 8): a quiet critter in a Partygoer's yellow coat who watches the intro and turns up,
// face in shadow, at the tutorial's end. Nothing about her is told yet: no name tag, no lines, no tag a player can read.
// Look from the creator's picture (/cdn/image-u2bhqzx6j.webp): ginger, mustard coat over black, a red tie at the collar.
import { critterSpec } from "./critter-model.js"
export const PHOEBE_LOOK = {
  species: "cat", sex: "f", fur: "#d9824a", belly: "#f3d9c4", tip: "#f3d9c4", nose: "#c86f6a", 
  topw: "longsleeve", top: "#141216", botw: "skirt", bottom: "#17141a", shoes: "boots", shoec: "#121014",
  expr: "smug", pupil: "#ffffff", glowEye: 3, sclera: "#120d10", eye: "#0e0a0c", // coat, hair, bow, chain and banded boots ride on top as the Blender outfit (art/phoebe-outfit/build.py)
}
// a local, unsaved watcher: spawned on the viewer's own machine for one beat, gone after `life` seconds
const OUTFIT = "/cdn/value.e43b3c8653d59ec8a87df263e493204dce99174142ce49d7deb6f7ae68473092.glb"
export function spawnPhoebe(ctx, id, at, yaw, life) {
  if (ctx.getObject(id)) return id
  const spec = critterSpec(PHOEBE_LOOK)
  return ctx.spawn(id, {
    tags: ["phoebe"], audience: "local", lifetime: life, feetPosition: at, rotation: { yaw },
    ...spec,
    children: [...(spec.children || []), { id: "phoebe-outfit", attachment: { skin: true }, model: OUTFIT }],
    state: { cutPose: true },
  })
}
export function dropPhoebe(ctx, id) { if (ctx.getObject(id)) ctx.destroy(id) }
