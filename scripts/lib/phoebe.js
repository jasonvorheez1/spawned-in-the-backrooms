// Phoebe (johnadams2, Nov 8): a quiet critter in a Partygoer's yellow coat who watches the intro and turns up,
// face in shadow, at the tutorial's end. Nothing about her is told yet: no name tag, no lines, no tag a player can read.
// Look from the creator's picture (/cdn/image-u2bhqzx6j.webp): ginger, mustard coat over black, a red tie at the collar.
import { critterSpec } from "./critter-model.js"
export const PHOEBE_LOOK = {
  species: "cat", sex: "f", fur: "#d9824a", belly: "#f3d9c4", tip: "#f3d9c4", nose: "#c86f6a", eye: "#1a1214",
  topw: "jacket", top: "#d29a2c", botw: "longskirt", bottom: "#17141a", shoes: "boots", shoec: "#121014",
  neck: "bowtie", neckc: "#a8202a", expr: "smile",
}
// a local, unsaved watcher: spawned on the viewer's own machine for one beat, gone after `life` seconds
export function spawnPhoebe(ctx, id, at, yaw, life) {
  if (ctx.getObject(id)) return id
  return ctx.spawn(id, {
    tags: ["phoebe"], audience: "local", lifetime: life, feetPosition: at, rotation: { yaw },
    ...critterSpec(PHOEBE_LOOK),
    state: { cutPose: true },
  })
}
export function dropPhoebe(ctx, id) { if (ctx.getObject(id)) ctx.destroy(id) }
