// Level 325 life layer: the city is empty. Rarely, an adult Faceling stands on the scaffold of a growing tower near you
// and throws rebar (scripts/l325-faceling.js). Savi's picks: one tower in nine qualifies per build cycle, it needs 4+ storeys up,
// at most 2 near any one wanderer; it stands on the street face at storey min(floors, 6).
import { towerAt, cellOf, keyOf, hash, STOREY, FOOT } from "./level325.js";
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
export const V = 1;
export function lay(ctx) {}
let n = 0;
const WEAR = [{ topw: "jacket", top: "#4a4f57", bottom: "#2b2a28" }, { topw: "hoodie", top: "#6d5a3c", bottom: "#24262b" }, { topw: "tee", top: "#7c7468", bottom: "#33302b" }];
export function tick(ctx) {
  if (++n % 3) return;
  const want = new Map(), dead = ctx.place.state.l325dead ?? {};
  for (const p of ctx.place.players) { const c = cellOf(p.feetPosition.x, p.feetPosition.z); let here = 0;
    for (let i = -2; i <= 2 && here < 2; i++) for (let j = -2; j <= 2 && here < 2; j++) {
      const t = towerAt(ctx, c.ix + i, c.iz + j); if (!t || (t.stage !== "build" && t.stage !== "near") || t.floors < 4) continue;
      if (hash(t.ix, t.iz, 900 + (t.cycle % 97)) > 0.11) continue;
      const slot = `l325f-${keyOf(t.ix, t.iz)}-${t.cycle}`; if (dead[slot]) continue;
      const side = Math.floor(hash(t.ix, t.iz, 901) * 4), off = FOOT / 2 + 1.2, y = Math.min(t.floors, 6) * STOREY + 0.15;
      const pos = side === 0 ? { x: t.x + off, z: t.z } : side === 1 ? { x: t.x - off, z: t.z } : side === 2 ? { x: t.x, z: t.z + off } : { x: t.x, z: t.z - off };
      want.set(slot, { t, pos: { ...pos, y }, k: Math.floor(hash(t.ix, t.iz, 902) * 3) }); here++;
    } }
  tick.have ??= new Set(ctx.query({ tags: ["l325f"], radius: 1e6, center: { x: 0, y: 0, z: 0 } }).map((o) => o.id));
  for (const id of [...tick.have]) if (!want.has(id) && !ctx.place.objects[id]?.state?.dead) { if (ctx.place.objects[id] && !ctx.place.objects[id].state?.fled) ctx.destroy(id); tick.have.delete(id); }
  for (const [id, w] of want) { if (ctx.place.objects[id]) continue;
    const look = npcLook(id, { species: "faceling", sex: w.k ? "m" : "f", botw: "pants", shoes: "boots", ...WEAR[w.k] }, "wanderer", 3);
    ctx.spawn(id, { ...critterSpec(look), tags: ["npc", "faceling", "l325f", "l325foe", "enemy"], feetPosition: w.pos, physics: { body: "kinematic", collider: "capsule" },
      behavior: ["scripts/humanoid-locomotion.js", "scripts/l325-faceling.js"],
      state: { name: "Adult Faceling", faction: "feral", factionName: "Faceling", killable: false, attackOnSight: true, stay: true, home: { x: w.pos.x, z: w.pos.z }, hp: 70, maxHp: 70, ix: w.t.ix, iz: w.t.iz, cycle: w.t.cycle, slot: id } });
    tick.have.add(id);
  }
  if (n % 300 === 0) { const keep = {}; for (const k of Object.keys(dead)) if (ctx.place.objects[k]) keep[k] = true; ctx.place.state.l325dead = keep; }
}
