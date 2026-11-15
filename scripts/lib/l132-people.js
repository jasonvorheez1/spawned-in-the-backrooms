// Level 132 · people: twelve named Lumirians (eight stallkeepers, three shopkeepers, Odalys on her bench) and six strollers.
// Everyone walks with scripts/meg-agent.js (state.rounds, builtin/nav through scripts/lib/nav.js, its stuck sidestep/repath).
// lay(ctx, L) builds once (place.state.peopleV); tick(ctx, L) keeps them alive, seats Odalys and runs the square's chatter.
import P from "./data/l132-people.yml";
import { keepPeople, every } from "./level-kit.js";
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { npcState } from "./stats.js";
import { tickChatter, CHATTER } from "./chatter.js";
import { raycast } from "builtin/physics";

const NAMED = Object.fromEntries(P.named.map((n) => [n.id, n]));
const STROLL = Object.fromEntries(P.strollers.map((n) => [n.id, n]));
const IDS = [...Object.keys(NAMED), ...Object.keys(STROLL)];
const VOICES = Object.fromEntries(P.named.map((n) => [n.id, n.voice ?? n.id]));
const G = P.ground ?? 0, T = P.tree ?? { x: 0, z: 0 };
const BENCH = "l132-odalys-bench", LAPTOP = "l132-odalys-laptop";

// a stop: [x, z, dwell, { look }]; stall-front stops (r 10..14) face their stall, everything else faces the tree
function stop([x, z, dwell, o = {}]) {
  const r = Math.hypot(x, z), k = r > 10 && r < 14 ? 15 / r : 0;
  const look = o.look ? { x: o.look[0], y: G, z: o.look[1] } : k ? { x: x * k, y: G, z: z * k } : { x: T.x, y: G, z: T.z };
  return { x, y: G, z, dwell: dwell ?? 10, look, ...(o.act ? { act: o.act } : {}) };
}
function person(ctx, id) {
  const n = NAMED[id] ?? STROLL[id]; if (!n) return;
  const named = !!NAMED[id], odalys = id === "l132-odalys";
  const rounds = odalys ? [] : (n.rounds ?? []).map(stop);
  const [x, z, yaw] = n.post ?? [n.rounds[0][0], n.rounds[0][1], 0];
  const look = { species: "cat", sex: n.sex ?? "f", ...(n.look ?? {}) };
  ctx.spawn(id, {
    tags: ["npc", "l132", "friendly", "l132-person", named ? "l132-named" : "l132-stroller"],
    feetPosition: { x, y: G, z }, rotation: { yaw: yaw ?? 0 }, physics: "character",
    ...critterSpec(npcLook(id, look, "survivor", P.level, "resident")),
    behavior: odalys ? ["scripts/humanoid-locomotion.js"] : ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: n.name ?? (n.sex === "m" ? "Lumirian" : "Lumirian"), role: "resident", faction: "lumiria", dlg: named ? id : undefined, voice: named ? n.voice : undefined,
      job: n.job, collects: n.collects, wants: n.wants, offers: n.offers, ...(rounds.length ? { rounds } : {}), home: { x, y: G, z }, ...npcState(ctx, "agent", P.hp) },
  });
}
function odalysProps(ctx) {
  const B = P.odalysBench, o = ctx.place.objects;
  const yaw = NAMED["l132-odalys"].post[2];
  if (!o[BENCH]) ctx.spawn(BENCH, { tags: ["l132-person-prop"], model: B.bench.id, scale: B.bench.s, feetPosition: { x: B.x, y: G, z: B.z }, rotation: { yaw }, physics: { body: "static", collider: "mesh" } });
}
// once the bench mesh is in, measure its seat and sit Odalys (parented, so the gait plays its own sit) with the laptop beside her
function seatOdalys(ctx) {
  const s = ctx.place.state, B = P.odalysBench, me = ctx.place.objects["l132-odalys"], bench = ctx.place.objects[BENCH];
  if (!me || !bench) return;
  if (s.l132seatY == null) {
    const hit = raycast(ctx, { x: B.x, y: G + 2, z: B.z }, { x: 0, y: -1, z: 0 }, { distance: 2.2, hits: "geometry", tags: ["l132-person-prop"] });
    if (!hit || hit.position.y - G < 0.25 || hit.position.y - G > 0.9) return;
    s.l132seatY = Math.round((hit.position.y - G) * 1000) / 1000;
  }
  const sy = s.l132seatY / (B.bench.s || 1);
  if (me.parent?.id !== BENCH) { me.velocity = { x: 0, y: 0, z: 0 }; me.parent = BENCH; me.feetPosition = { x: 0, y: sy - 0.12 / (B.bench.s || 1), z: 0.05 }; me.rotation = { yaw: 0 }; }
  if (!ctx.place.objects[LAPTOP]) ctx.spawn(LAPTOP, { parent: BENCH, tags: ["l132-person-prop"], model: B.laptop.id, scale: B.laptop.s / (B.bench.s || 1), feetPosition: { x: B.laptopSide / (B.bench.s || 1), y: sy, z: 0 }, rotation: { yaw: B.laptop.yaw ?? 0 } });
}
export function lay(ctx, L) {
  const s = ctx.place.state;
  if ((s.peopleV ?? 0) >= P.peopleV) return;
  s.peopleV = P.peopleV; s.l132seatY = null;
  for (const id of IDS) { if (ctx.place.objects[id]) ctx.destroy(id); person(ctx, id); }
  if (ctx.place.objects[LAPTOP]) ctx.destroy(LAPTOP);
  odalysProps(ctx);
}
// a walker that left town (an old sleep kept its stride) goes back to its own spot
function strays(ctx) {
  for (const id of IDS) {
    if (id === "l132-odalys") continue;
    const o = ctx.place.objects[id], f = o?.worldFeetPosition; if (!f) continue;
    if (Math.hypot(f.x - T.x, f.z - T.z) < (P.strayR ?? 75) && f.y > G - 2) continue;
    const h = o.state?.home ?? { x: 0, y: G, z: 10 };
    o.velocity = { x: 0, y: 0, z: 0 }; o.feetPosition = { x: h.x, y: G, z: h.z };
    if (o.state) { o.state.ri = 0; }
  }
}
export function tick(ctx, L) {
  if (every(ctx, "l132people", 5000)) { keepPeople(ctx, IDS, person); odalysProps(ctx); strays(ctx); }
  seatOdalys(ctx);
  tickChatter(ctx, CHATTER.level132 ?? [], VOICES);
}
