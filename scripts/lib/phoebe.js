// Phoebe (johnadams2, Nov 8): a quiet critter in a Partygoer's yellow coat who watches the intro and turns up,
// face in shadow, at the tutorial's end. Nothing about her is told yet: no name tag, no lines, no tag a player can read.
// Look from the creator's picture (/cdn/image-u2bhqzx6j.webp): ginger, mustard coat over black, a red tie at the collar.
import { furrySpec, critterSpec, HUMAN, humanFace, setStyle, seatHead, buildFor, baseBones, CAT_JIGGLE } from "./critter-model.js"
export const PHOEBE_LOOK = {
  species: "cat", sex: "f", hairc: "#c4602b", fur: "#d9824a", belly: "#f3d9c4", tip: "#f3d9c4", nose: "#c86f6a", 
  hair: "none", topw: "longsleeve", top: "#141216", botw: "", bottom: "#17141a", shoes: "boots", shoec: "#121014",
  expr: "neutral", etype: "sleepy", pupil: "#ffffff", glowEye: 1.1, sclera: "#120d10", eye: "#ffffff", // Shelly Nov 14: no grin, eyes glowing white; half-lidded calm reads smug // coat, hair, bow, chain and banded boots ride on top as the Blender outfit (art/phoebe-outfit/build.py)
}
// her human self (Shelly, Nov 9: "model phoebe too since she doesnt have a human equivalent"): the same girl on the human body,
// ginger hair, the Partygoer coat over black, smug and half-lidded, the white eyes glowing (rules: phoebe-always-looks-smug, white pupils glow)
export const PHOEBE_HUMAN = {
  id: "phoebe", fseed: "phoebe", sex: "f", skin: "#f1d2bd", ftype: "pixie", bust: 0.35,
  hair: "f_wolfcut", hairc: "#c4602b", eye: "#ffffff",
  topw: "pgcoat", top: "#b8975c", botw: "skirt", bottom: "#17141a", shoes: "boots", shoec: "#121014",
  expr: "neutral",
}
const EYES = { color: "#ffffff", roughness: 0.3, metalness: 0, emissive: "#ffffff", emissiveIntensity: 2.2 }
function humanPhoebe() {
  const spec = critterSpec(PHOEBE_HUMAN)
  const face = humanFace("smug", false, null); face.X_Blink = Math.max(face.X_Blink ?? 0, 0.42); face.X_Smile = Math.max(face.X_Smile ?? 0, 0.45) // half-lidded, the grin held
  return { ...spec, model: { ...spec.model, materials: { ...spec.model.materials, Iris: EYES } }, morph: { ...spec.morph, ...face } }
}
// a local, unsaved watcher: spawned on the viewer's own machine for one beat, gone after `life` seconds
const OUTFIT = "/cdn/value.0944d7255be1466469d42ba43941181b4fdcee353786f3742759e83faec9abac.glb" // the cat outfit wearing her original Nov 8 hair (art/phoebe-outfit/hair_back.py; Shelly Nov 14 "isnt using the model from before")
export function phoebeSpec(ctx) {
  setStyle(ctx.world.state.bodyStyle) // this script's own copy of the BODIES switch reads the world's setting, not its boot default
  const human = ctx.world.state.bodyStyle === "human" && !!HUMAN
  const spec = human ? humanPhoebe() : furrySpec(PHOEBE_LOOK) // BODIES human: her human self; furry: the ginger cat in her fitted outfit. Its hair and skirt are the outfit's own, so the wardrobe's hair and skirt stay off (Shelly Nov 14: two hairs stacked)
  return { ...spec, human, children: [...(spec.children || []).filter((c) => human || !["cw-hair", "cw-botw"].includes(c.id)), ...(human ? [] : [{ id: "phoebe-outfit", attachment: { skin: true }, model: OUTFIT }])] }
}
// the one dress code for every Phoebe (Shelly: "phoebe in the hub should be for all phoebe appearances"):
// her head, her own hub build, bones, bust and cat jiggle, so the coat sits as fitted wherever she stands
export function dressPhoebe(ctx, me) {
  if (!me) return
  me.state.wear = PHOEBE_LOOK
  seatHead(ctx, me, PHOEBE_LOOK)
  for (const k of ["cw-hair", "cw-botw"]) { try { ctx.destroy(me.id + "/" + k) } catch (e) {} } // the head seat re-dresses the wardrobe's hair and skirt; hers are the outfit's own (the stacked orange hair hid her face)
  const b = buildFor("hub-phoebe", "f"); me.state.build = b; me.scale = { x: b.w, y: b.h, z: b.w }
  me.bones = baseBones(b, PHOEBE_LOOK); me.morph = { ...(me.morph ?? {}), Bust: b.bust }; me.jiggle = CAT_JIGGLE
}
// extra: fields laid over the cut defaults (a talking NPC Phoebe passes audience, tags, physics, behavior, state); same body either way
export function spawnPhoebe(ctx, id, at, yaw, life, pose, extra) {
  if (ctx.getObject(id)) return id
  const { human, ...spec } = phoebeSpec(ctx)
  const sid = ctx.spawn(id, {
    tags: ["phoebe"], audience: "local", lifetime: life, feetPosition: at, rotation: { yaw },
    ...spec,
    state: { cutPose: true },
    ...(extra ?? {}),
    anim: { pose: { clip: pose ?? (human ? "cdn/clip-idle-female-loop.glb" : "cdn/clip-idle-loop.glb"), loop: "loop", weight: 1 } }, // never a bind pose: a clip from her first frame (Shelly: "t posing phoebe")
  })
  if (!human) dressPhoebe(ctx, ctx.getObject(sid)) // the hub's build on every cut Phoebe
  return sid
}
export function dropPhoebe(ctx, id) { if (ctx.getObject(id)) ctx.destroy(id) }
