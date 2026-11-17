// Multiplayer (Shelly Nov 15): "NPCS also cant die (unless theyre meant to be shot at)".
// A person in a room with a multiplayer player drops to a knee instead of dying; the born-hostile and anything tagged killable still die.
import { faction } from "./forgive.js";
import { isMulti } from "./run-opts.js";
const BORN = new Set(["l7-ezra", "l7-tobit"]);
const short = (id) => String(id ?? "").split("/").pop();
export const shootable = (npc) => !!(npc?.state?.attackOnSight || npc?.state?.killable || npc?.tags?.includes("l8-hostile") || BORN.has(short(npc?.id)) || faction(npc) === "lightless");
export const multiRoom = (ctx) => (ctx.place.players ?? []).some((p) => isMulti(p.state));
// Shelly Nov 17: in solo a killed person stays dead for good, and the quests know
export const soloPlace = (ctx) => !multiRoom(ctx) && !String(ctx.self?.place ?? ctx.place?.id ?? "").startsWith("bonus");
export function markDead(ctx, npc) {
  if (!npc?.tags?.includes("npc") || !soloPlace(ctx)) return;
  const id = String(npc.id).split("/").pop(), s = ctx.place.state;
  s.npcPerm = { ...(s.npcPerm ?? {}), [id]: 1 };
  for (const p of ctx.place.players ?? []) if (!isMulti(p.state)) p.state.npcDead = { ...(p.state.npcDead ?? {}), [id]: npc.state?.name ?? id };
}
export function spared(ctx, npc) {
  const s = npc?.state;
  if (!s || s.overboard || !npc.tags?.includes("npc") || shootable(npc) || s.hostile || s.questHostile || !multiRoom(ctx)) return false; // Shelly Nov 17: online, a friendly npc goes unconscious and gets back up; the hostile die
  s.dead = false; s.hp = Math.max(1, Math.round((s.maxHp ?? 100) * 0.3)); s.stunUntil = ctx.now() + 12000; s.koUntil = ctx.now() + 12000;
  const p = npc.feetPosition;
  if (p) ctx.emit("damageNumber", { position: { x: p.x, y: p.y + 1.8, z: p.z }, text: "UNCONSCIOUS", color: "#ffb347" });
  return true;
}
