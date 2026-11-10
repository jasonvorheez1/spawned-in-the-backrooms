// ASHLINE grenades: the throw. throwNade(ctx, pose, kind) from the thrower's own body (ctx.self); the flight, bounce and
// the pop (frag blast, flashbang, smoke cloud) live in scripts/grenade.js. Every number: lib/data/grenades.yml.
import N from "./data/grenades.yml";
export const NADES = N, NADE_ORDER = N.order, THROW = N.throw;
export const GRENADE = { price: N.frag.price, max: N.frag.max, speed: N.throw.speed, lift: N.throw.lift, fuse: N.frag.fuse, ahead: N.throw.ahead };
const SND = "/cdn/moodboard-realistic-gritty/";
// the model fitted to its row's size, centred so it spins about its middle
export const nadeModel = (kind) => { const r = N[kind] ?? N.frag, s = r.size; return { model: r.model, layout: { maxExtents: { x: s, y: s, z: s } }, pivot: "center" }; };
export function nadeSpec(kind, pos, state) {
  return { tags: ["grenade"], lifetime: kind === "smoke" ? (NADES.smoke?.fuse ?? 1600) / 1000 + (NADES.smoke?.life ?? 18) + 8 : 8, state: { ...state, kind }, feetPosition: { x: pos.x, y: pos.y, z: pos.z }, behavior: "mods/fps-grudge/grenade.js", castShadow: true, ...nadeModel(kind) };
}
export const fragSpec = (pos, state) => nadeSpec("frag", pos, state);
export function throwNade(ctx, pose, kind = "frag") {
  const o = pose.o, d = pose.d, a = THROW.ahead, row = N[kind] ?? N.frag;
  const pos = { x: o.x + d.x * a, y: o.y + d.y * a, z: o.z + d.z * a };
  const vel = { x: d.x * THROW.speed, y: d.y * THROW.speed + THROW.lift, z: d.z * THROW.speed };
  const id = ctx.spawn(nadeSpec(kind, pos, { vel, ownerId: ctx.self.id, team: ctx.self.state.team ?? "", fuseAt: ctx.now() + row.fuse }));
  ctx.emit("playSound", { clip: SND + "sfx-grenade-pin-pull-throw.mp3", position: o, volume: 0.8 });
  return id;
}
export const throwGrenade = (ctx, pose) => throwNade(ctx, pose, "frag");
