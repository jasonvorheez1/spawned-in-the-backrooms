// Multiplayer (Shelly Nov 15): "NPCS also cant die (unless theyre meant to be shot at)".
// A person in a room with a multiplayer player drops to a knee instead of dying; the born-hostile and anything tagged killable still die.
import { faction } from "./forgive.js";
import { isMulti } from "./run-opts.js";
const BORN = new Set(["l7-ezra", "l7-tobit"]);
const short = (id) => String(id ?? "").split("/").pop();
export const shootable = (npc) => !!(npc?.state?.attackOnSight || npc?.state?.killable || npc?.tags?.includes("l8-hostile") || BORN.has(short(npc?.id)) || faction(npc) === "lightless");
export const multiRoom = (ctx) => (ctx.place.players ?? []).some((p) => isMulti(p.state));
export function spared(ctx, npc) {
  const s = npc?.state;
  if (!s || s.overboard || !npc.tags?.includes("npc") || shootable(npc) || !multiRoom(ctx)) return false;
  s.dead = false; s.hp = Math.max(1, Math.round((s.maxHp ?? 100) * 0.3)); s.stunUntil = ctx.now() + 4000;
  const p = npc.feetPosition;
  if (p) ctx.emit("damageNumber", { position: { x: p.x, y: p.y + 1.8, z: p.z }, text: "DOWN", color: "#ffb347" });
  return true;
}
