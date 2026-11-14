// Phoebe (johnadams2, Nov 8): a quiet critter in a Partygoer's yellow coat who watches the intro and turns up,
// face in shadow, at the tutorial's end. Nothing about her is told yet: no name tag, no lines, no tag a player can read.
// Look from the creator's picture (/cdn/image-u2bhqzx6j.webp): ginger, mustard coat over black, a red tie at the collar.
import { furrySpec, critterSpec, HUMAN, humanFace, setStyle } from "./critter-model.js"
export const PHOEBE_LOOK = {
  species: "cat", sex: "f", fur: "#d9824a", belly: "#f3d9c4", tip: "#f3d9c4", nose: "#c86f6a", 
  topw: "longsleeve", top: "#141216", botw: "skirt", bottom: "#17141a", shoes: "boots", shoec: "#121014",
  expr: "smug", pupil: "#ffffff", glowEye: 1.1, sclera: "#120d10", eye: "#0e0a0c", // coat, hair, bow, chain and banded boots ride on top as the Blender outfit (art/phoebe-outfit/build.py)
}
// her human self (Shelly, Nov 9: "model phoebe too since she doesnt have a human equivalent"): the same girl on the human body,
// ginger hair, the Partygoer coat over black, smug and half-lidded, the white eyes glowing (rules: phoebe-always-looks-smug, white pupils glow)
export const PHOEBE_HUMAN = {
  id: "phoebe", fseed: "phoebe", sex: "f", skin: "#f1d2bd", ftype: "pixie", bust: 0.35,
  hair: "f_wolfcut", hairc: "#c4602b", eye: "#ffffff",
  topw: "pgcoat", top: "#b8975c", botw: "skirt", bottom: "#17141a", shoes: "boots", shoec: "#121014",
  expr: "smug",
}
const EYES = { color: "#ffffff", roughness: 0.3, metalness: 0, emissive: "#ffffff", emissiveIntensity: 2.2 }
function humanPhoebe() {
  const spec = critterSpec(PHOEBE_HUMAN)
  const face = humanFace("smug", false, null); face.X_Blink = Math.max(face.X_Blink ?? 0, 0.42); face.X_Smile = Math.max(face.X_Smile ?? 0, 0.45) // half-lidded, the grin held
  return { ...spec, model: { ...spec.model, materials: { ...spec.model.materials, Iris: EYES } }, morph: { ...spec.morph, ...face } }
}
// a local, unsaved watcher: spawned on the viewer's own machine for one beat, gone after `life` seconds
const OUTFIT = "/cdn/value.e43b3c8653d59ec8a87df263e493204dce99174142ce49d7deb6f7ae68473092.glb"
export function phoebeSpec(ctx) {
  setStyle(ctx.world.state.bodyStyle) // this script's own copy of the BODIES switch reads the world's setting, not its boot default
  const human = ctx.world.state.bodyStyle === "human" && !!HUMAN
  const spec = human ? humanPhoebe() : furrySpec(PHOEBE_LOOK) // BODIES human: her human self; furry: the ginger cat in her fitted outfit
  return { ...spec, human, children: [...(spec.children || []).filter((c) => human || !/cw-hair$/.test(c.id ?? "")), ...(human ? [] : [{ id: "phoebe-outfit", attachment: { skin: true }, model: OUTFIT }])] }
}
export function spawnPhoebe(ctx, id, at, yaw, life, pose) {
  if (ctx.getObject(id)) return id
  const { human, ...spec } = phoebeSpec(ctx)
  return ctx.spawn(id, {
    tags: ["phoebe"], audience: "local", lifetime: life, feetPosition: at, rotation: { yaw },
    ...spec,
    state: { cutPose: true },
    anim: { pose: { clip: pose ?? (human ? "cdn/clip-idle-female-loop.glb" : "cdn/clip-idle-loop.glb"), loop: "loop", weight: 1 } }, // never a bind pose: a clip from her first frame (Shelly: "t posing phoebe")
  })
  return id
}
export function dropPhoebe(ctx, id) { if (ctx.getObject(id)) ctx.destroy(id) }
