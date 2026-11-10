// Level 5 Main Hall: lays every furnishing, fixture, door leaf and placard of scripts/lib/l5-hall-layout.js once per V,
// and dresses the radios and sealed doors in their real meshes (same ids, state/audio/behavior kept).
import { PIECES, LEAVES } from "./lib/l5-hall-layout.js";
import { ZONES } from "./lib/level5.js";
const DOOR = "scripts/door-geo.js";
const V = 6, GEO = "scripts/l5-hall-geo.js", FIX = "scripts/l5-hall-fix.js";
const FIXK = new Set(["chandelier", "pendant", "sconce", "flush", "lamp", "bulb", "stairs", "leaf", "placard"]);
const NOCOL = new Set(["rug", "painting", "letter", "typewriter", "tomes", "birdcage", "window", "chandelier", "pendant", "sconce", "flush", "lamp", "bulb", "placard"]);
const SEATK = new Set(["chair", "sofa", "stool", "bench", "armchair"]);
const HP = { wood: 60, metal: 120, leather: 30 };
function row(r) {
  const fix = FIXK.has(r.kind), mat = r.loot?.mat ?? (["range", "icebox", "cart", "urn"].includes(r.kind) ? "metal" : "wood");
  const spec = { tags: ["l5-hall", "furniture", "breakable"], feetPosition: { x: r.x, y: r.y, z: r.z }, rotation: { yaw: r.yaw, pitch: r.pitch ?? 0 },
    primitive: { kind: "scripted", script: fix ? FIX : GEO, params: { kind: r.kind, ...r.p } }, state: { mat, hp: HP[mat] ?? 60, maxHp: HP[mat] ?? 60 } };
  if (!NOCOL.has(r.kind)) spec.physics = "static";
  if (fix && r.kind !== "stairs") { spec.tags = ["l5-hall", "l5-hall-fix"]; delete spec.state; }
  if (r.kind === "stairs") spec.tags = ["l5-hall"];
  if (SEATK.has(r.kind)) {
    spec.tags.push("seat", "usable");
    spec.state = { ...(spec.state ?? {}), seat: { d: r.kind === "sofa" ? 0.15 : 0.04, w: r.kind === "sofa" ? ((r.p?.w ?? 1) > 1.5 ? 3 : 2) : 1, gap: 0.62 }, verb: "Sit", name: r.kind === "sofa" ? "Velvet sofa" : r.kind === "chair" ? "Hotel chair" : r.kind === "armchair" ? "Leather armchair" : "Stool" };
  }
  if (r.loot) { spec.tags = ["l5-hall", "container", "furniture", "lootfurn", "breakable"]; Object.assign(spec.state, { items: r.loot.items, kind: r.loot.kind, name: r.loot.name }); if (r.loot.lock) spec.state.lock = r.loot.lock; }
  return spec;
}
function lay(ctx) {
  for (const r of PIECES) ctx.spawn(r.id, row(r));
  for (const l of LEAVES) { const o = l.leafFor, z = ZONES.find((q) => q.id === l.room), dir = Math.sign((z.z0 + z.z1) / 2 - o.at), w = o.a1 - o.a0;
    // scripts/door-geo.js: the leaf's feet ARE its hinge (bottom corner at a0), it runs +X; the frame stands at the opening's centre, same plane
    const z0 = o.at + dir * 0.09, dp = { style: "hotel", w: w - 0.04, h: 2.2, hingeSide: "left", swing: dir > 0 ? 1 : -1, seed: Number(l.no) || 0 };
    ctx.spawn("l5-hall-leaf-" + l.room, { tags: ["l5-hall", "usable", "l5-hall-door"], feetPosition: { x: o.a0 + 0.02, y: 0, z: z0 }, rotation: { yaw: 0 },
      physics: "kinematic", primitive: { kind: "scripted", script: DOOR, params: { ...dp, part: "leaf" } }, material: { pbr: true }, behavior: "scripts/l5-hall-door.js",
      state: { name: "Room " + l.no, verb: "Open", info: "Guest room door", open: false, openYaw: dir > 0 ? -90 : 90, baseYaw: 0, mat: "wood", hp: 60, maxHp: 60, c: { x: (o.a0 + o.a1) / 2, y: 1.1, z: z0 } } });
    ctx.spawn("l5-hall-frame-" + l.room, { tags: ["l5-hall"], feetPosition: { x: (o.a0 + o.a1) / 2, y: 0, z: z0 }, rotation: { yaw: 0 }, castShadow: false,
      physics: { body: "static", collider: "auto" }, primitive: { kind: "scripted", script: DOOR, params: { ...dp, part: "frame" } }, material: { pbr: true } });
    ctx.spawn("l5-hall-plaque-" + l.room, { tags: ["l5-hall"], feetPosition: { x: o.a1 + 0.32, y: 1.5, z: o.at - dir * 0.09 }, rotation: { yaw: dir > 0 ? 0 : 180 },
      primitive: { kind: "scripted", script: FIX, params: { kind: "placard", no: String(l.no), text: String(l.no), label: String(l.no) } } }); }
  for (const q of ctx.query({ tags: ["l5-radio"] })) { const o = ctx.getObject(q.id); if (o) o.primitive = { kind: "scripted", script: FIX, params: { kind: "radio" } }; }
  for (const q of ctx.query({ tags: ["l5-sealed"] })) { const o = ctx.getObject(q.id); if (o) o.primitive = { kind: "scripted", script: FIX, params: { kind: "sealed", seed: q.id.length } }; }
}
export function update(ctx) {
  if (ctx.self.state.v === V) return ctx.sleep(30);
  ctx.commit("Main Hall furnished", () => { lay(ctx); ctx.self.state.v = V; });
}
