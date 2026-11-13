// Who lives in the Hub (Nov 13, Shelly's brief #320257): Doorstep Carpet's M.E.G. crew, Camp Amber's two, the guard at the dark
// line, the Keymaster who is mostly not here, and the things the Hub's quests send you after (scripts/lib/hub-quest.js).
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { weaponBody } from "./weapon-look.js";
import { keepPeople } from "./level-kit.js";
import { BRANCHES, HW, DARK_X } from "./thehub.js";
// at: [x, z]; face: yaw. Doorstep Carpet's bay is x 4..28, z -5.5..-14.5 (north of the road); Camp Amber's x 176..194, z 5.5..11.5.
const CREW = {
  "hub-meg-okafor": { name: "Okafor · Post Lead", faction: "meg", role: "captain", gun: "carbine", at: [14.5, -9.2], face: 180, look: { species: "human", sex: "f", topw: "padjacket", top: "#4a5a3a", botw: "cargo", bottom: "#3a3a30", shoes: "boots", hat: "cap", hatc: "#b6e04a", expr: "calm" } },
  "hub-meg-lin": { name: "Lin · Key Cabinet", faction: "meg", role: "quarter", at: [23.2, -11.6], face: 200, look: { species: "human", sex: "f", topw: "megjacket", top: "#b6e04a", botw: "pants", bottom: "#4a5a3a", shoes: "boots", eyew: "glasses", expr: "smile" } },
  "hub-meg-sato": { name: "Sato · Surveyor", faction: "meg", role: "agent", at: [7.4, -8.2], face: 160, look: { species: "human", sex: "m", topw: "longsleeve", top: "#d8dccf", botw: "cargo", bottom: "#4a5a3a", shoes: "sneakers", neck: "scarf", neckc: "#b6e04a", expr: "beam" } },
  "hub-meg-dace": { name: "Dace · Line Guard", faction: "meg", role: "guard", gun: "shotgun", at: [DARK_X - 6, 2.2], face: 90, look: { species: "human", sex: "m", topw: "padjacket", top: "#3a4a30", botw: "cargo", bottom: "#33352c", shoes: "boots", hat: "padbeanie", hatc: "#2a2a24", expr: "calm" } },
  "hub-amber-jo": { name: "Jo · Camp Amber", faction: "survivor", role: "keeper", gun: "knife", at: [181.5, 8.6], face: 20, look: { species: "human", sex: "f", topw: "sweater", top: "#d89a3a", botw: "longskirt", bottom: "#4a3a2a", shoes: "boots", neck: "scarf", neckc: "#c8662a", expr: "smile" } },
  "hub-amber-pip": { name: "Pip · Camp Amber", faction: "survivor", role: "scout", gun: "crowbar", at: [189.8, 9.4], face: -30, look: { species: "human", sex: "m", topw: "hoodie", top: "#c87a2a", botw: "shorts", bottom: "#4a3a2a", shoes: "sneakers", hat: "beanie", hatc: "#e0a040", expr: "grin" } },
};
export const CREW_IDS = Object.keys(CREW);
function person(ctx, id) {
  const g = CREW[id]; if (!g) return;
  ctx.spawn(id, { tags: ["npc", "hub-npc"], feetPosition: { x: g.at[0], y: 0.25, z: g.at[1] }, rotation: { yaw: g.face }, physics: "character",
    ...critterSpec(npcLook(id, g.look, g.faction, 6, g.role)), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: g.name, role: g.role, faction: g.faction, faceYaw: g.face, home: { x: g.at[0], z: g.at[1] } } });
  if (g.gun) ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
}
// the things you press, each with its own pool of light so it reads in the dark end
const THINGS = [
  { id: "hub-ledger", kind: "ledger", at: [19.6, -7.2], face: 180, state: { kind: "ledger", name: "Key ledger", verb: "Read", info: "KEYS OUT, in three hands." } },
  { id: "hub-amberbox", kind: "amberbox", at: [185.2, 7.0], face: 10, state: { kind: "amberbox", name: "Newcomer box", verb: "Open", info: "One per face." } },
  { id: "hub-keytag", kind: "keytag", at: [360.6, -84.0], face: 30, lamp: 0.5, state: { kind: "keytag", name: "Something on the road", verb: "Pick up", info: "Small. Metal." } },
  { id: "hub-rec-0", kind: "recorder", at: [516.2, -2.6], face: 70, lamp: 0.6, state: { kind: "rec", i: 0, name: "Orange recorder", verb: "Take the tape", info: "M.E.G. survey, 2019." } },
  { id: "hub-rec-1", kind: "recorder", at: [534.8, 3.1], face: -40, lamp: 0.6, state: { kind: "rec", i: 1, name: "Orange recorder", verb: "Take the tape", info: "M.E.G. survey, 2019." } },
  { id: "hub-rec-2", kind: "recorder", at: [553.4, -1.2], face: 150, lamp: 0.6, state: { kind: "rec", i: 2, name: "Orange recorder", verb: "Take the tape", info: "M.E.G. survey, 2019." } },
];
export function layThings(ctx) {
  for (const t of THINGS) {
    if (ctx.place.objects[t.id]) continue;
    ctx.spawn(t.id, { tags: ["usable", "hub-thing"], feetPosition: { x: t.at[0], y: 0, z: t.at[1] }, rotation: { yaw: t.face }, physics: { body: "static", collider: "auto" }, castShadow: false,
      primitive: { kind: "scripted", script: "scripts/hub-props-geo.js", params: { kind: t.kind } }, behavior: "scripts/hub-thing.js", state: { ...t.state, c: { x: t.at[0], y: 0.4, z: t.at[1] } },
      children: t.lamp ? [{ id: "glint", feetPosition: { x: 0, y: 0.6, z: 0 }, light: { kind: "point", color: "oklch(0.75 0.06 80)", intensity: t.lamp, distance: 4, shadow: { enabled: false } } }] : [] });
  }
  // the blank door at the dead end of the dark road: a slab like the others, no mark, no keyhole, warm
  if (!ctx.place.objects["hub-blank"]) ctx.spawn("hub-blank", { tags: ["usable", "hub-thing"], feetPosition: { x: 559.95, y: 0, z: 0 }, rotation: { yaw: 90 }, physics: { body: "static", collider: "mesh" }, castShadow: false,
    primitive: { kind: "scripted", script: "scripts/hub-door-geo.js", params: { part: "frame" } }, material: { roughness: 0.9 }, behavior: "scripts/hub-thing.js",
    state: { kind: "blank", name: "Door with no mark", verb: "Touch", info: "No keyhole.", c: { x: 558.6, y: 1.2, z: 0 } },
    children: [{ id: "leaf", feetPosition: { x: 0, y: 0.2, z: 0.78 }, physics: { body: "static", collider: "mesh" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/hub-door-geo.js", params: { part: "leaf" }, seed: 9001 }, material: { roughness: 0.9 } }] });
}
export function keepCrew(ctx) { keepPeople(ctx, CREW_IDS, person); }
// The Keymaster: rare. A roll every four minutes while someone walks the tunnels (my picks: 18%, 2 minutes on the road).
// He stands at a side tunnel's mouth a good way ahead of whoever is nearest, never at the camps, and leaves when he is done.
const KM = "hub-keymaster", ROLL_MS = 240000, CHANCE = 0.18, STAY_MS = 120000;
export function keymaster(ctx) {
  const s = ctx.place.state, now = ctx.now(), o = ctx.place.objects[KM];
  if (o) { if (now > (o.state.leaveAt ?? 0) || o.state.dead) { ctx.destroy(KM); s.kmGoneAt = now; } return; }
  if (now - (s.kmRollAt ?? 0) < ROLL_MS) return; s.kmRollAt = now;
  if (ctx.random() > CHANCE) return;
  const p = ctx.place.players[Math.floor(ctx.random() * ctx.place.players.length)]; if (!p) return;
  const spots = BRANCHES.filter((b) => b.n !== 1 && Math.abs(b.x - p.feetPosition.x) > 25 && Math.abs(b.x - p.feetPosition.x) < 90 && !(b.x > 170 && b.x < 200));
  const b = spots[Math.floor(ctx.random() * spots.length)]; if (!b) return;
  const x = b.x + 3.2, z = b.side * (HW + 2.5);
  ctx.spawn(KM, { tags: ["npc", "hub-npc", "keymaster"], feetPosition: { x, y: 0.25, z }, rotation: { yaw: b.side < 0 ? 0 : 180 }, physics: "character",
    ...critterSpec(npcLook(KM, { species: "human", sex: "m", topw: "padjacket", top: "#26241f", botw: "slacks", bottom: "#1c1b18", shoes: "boots", hat: "cap", hatc: "#1a1916", expr: "calm" }, "wanderer", 20, "pilgrim")),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: "Tall stranger", role: "pilgrim", faction: "wanderer", faceYaw: b.side < 0 ? 0 : 180, home: { x, z }, leaveAt: now + STAY_MS, hp: 400, maxHp: 400 },
    children: [{ id: "ring", feetPosition: { x: 0.2, y: 0.95, z: 0.02 }, primitive: { kind: "torus", radius: 0.07, tube: 0.008 }, material: { color: "oklch(0.6 0.05 75)", metalness: 1, roughness: 0.35 } }] });
}
