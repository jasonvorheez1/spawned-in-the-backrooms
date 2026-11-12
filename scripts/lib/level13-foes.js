// Level 13: foes. places/level13/sim.js calls layFoes(ctx) every 1 s tick; it lays its pieces once (own version key in ctx.place.state) and returns fast after.
// The Tenant (a3, a8: throws crockery, never leaves its flat) and the Hall Lurker (a5: drags a passer-by into its bedroom). One manager: scripts/l13-foes.js.
import D from "./data/level13.yml";
import { apt } from "./level13.js";
const F = D.foes;
export const TENANT = "/cdn/value.60afe8648699c01c68904550883b6709d58f958f5210297ba3237326a8804b87.glb"; // Tripo, rigged
export const LURKER = "/cdn/value.37d4b5fc217b17189b1aea9252e59baee53b9b4cc3625049cd2014336d36b694.glb"; // Tripo, rigged
export const SLOTS = [...F.tenant.flats.map((f) => ({ id: `l13e-tenant-${f}`, kind: "tenant", flat: f })), { id: `l13e-lurker-${F.lurker.flat}`, kind: "lurker", flat: F.lurker.flat }];
// where each one lives: the tenant at the kitchen end of its main room, the lurker just inside its bedroom door
export function homeOf(slot) {
  const a = apt(slot.flat);
  if (slot.kind === "tenant") return { x: a.main.cx + F.tenant.kitchenDx, z: a.main.cz + a.s * 0.9, tv: { x: a.main.cx - 2.6, z: a.main.cz + a.s * 0.9 } };
  return { x: a.x0 + 2.3, z: a.zm + a.s * 1.6 };
}
export function foeSpec(slot) {
  const h = homeOf(slot), T = slot.kind === "tenant", K = T ? F.tenant : F.lurker;
  return { tags: [T ? "tenant13" : "lurker13", "foe", "l8-hostile", "l13e"], feetPosition: { x: h.x, y: 0.05, z: h.z }, physics: { body: "character" },
    rotation: { yaw: T ? (Math.atan2(-(h.tv.x - h.x), -(h.tv.z - h.z)) * 180) / Math.PI : 0 },
    model: { id: T ? TENANT : LURKER, forward: "+x" }, layout: { box: { min: { x: -0.6, y: 0, z: -0.6 }, max: { x: 0.6, y: K.height, z: 0.6 } } },
    anim: { main: { clip: T ? "cdn/clip-idle-loop.glb" : "cdn/clip-crouch-idle-loop.glb", loop: true, weight: 1 } },
    state: { hp: K.hp, maxHp: K.hp, name: T ? "Tenant" : "Hall Lurker", kg: T ? 62 : 48, slot: slot.id } };
}
export function layFoes(ctx) {
  const s = ctx.place.state;
  if (s.ev === F.v) return;
  for (const o of ctx.query({ tags: ["l13e"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id);
  for (const slot of SLOTS) if (slot.id in ctx.place.objects) ctx.destroy(slot.id);
  if ("l13e-mgr" in ctx.place.objects) ctx.destroy("l13e-mgr");
  ctx.spawn("l13e-mgr", { tags: ["l13e"], feetPosition: { x: -20, y: 0, z: 0 }, visible: false, audience: "all", state: {}, behavior: "scripts/l13-foes.js" });
  for (const slot of SLOTS) ctx.spawn(slot.id, foeSpec(slot));
  s.ev = F.v;
}
