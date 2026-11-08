// Level 2 props: every visible prop is a Tripo mesh from lib/data/l2props.yml, fitted to real size, with its own box collider.
// Tagged for the shared systems: "breakable" + state { mat, hp, maxHp, name } (breakables.js, loose.yml by name), chair+furniture (kick.js),
// dynamic light bodies (grab.js lifts anything breakable within strength).
import P from "./data/l2props.yml";
export const PROPS = P;
export const fitBox = (sz) => ({ box: { min: { x: -sz[0] / 2, y: 0, z: -sz[2] / 2 }, max: { x: sz[0] / 2, y: sz[1], z: sz[2] / 2 } } });
export function spawnProp(ctx, kind, pos, yaw, extra = {}) {
  const K = P.kinds[kind]; if (!K) return null;
  const kg = P.dynamic[kind];
  return ctx.spawn({ tags: ["l2prop", "l2p-" + kind, "breakable", ...(K.tags ?? [])], feetPosition: { x: pos.x, y: pos.y ?? 0.01, z: pos.z }, rotation: { yaw },
    physics: kg ? { body: "dynamic", collider: "box", mass: kg, friction: 0.7, restitution: 0.05 } : { body: "static", collider: "box" },
    visibleRange: { max: 45 }, castShadow: false, receiveShadow: true,
    model: { id: K.id, forward: P.forward }, layout: fitBox(K.size),
    ...extra, state: { name: K.name, kind, mat: K.mat, hp: K.hp, maxHp: K.hp, ...(extra.state ?? {}) } });
}
// a side room's dressing, in its frame: P(a, b, y) the room's point maker, n the door's way out, t across
export function dressRoom(ctx, type, Pt, [nx, nz], yawOf) {
  const tx = -nz, tz = nx, face = { door: [nx, nz], back: [-nx, -nz], "+b": [tx, tz], "-b": [-tx, -tz] };
  for (const [kind, a, b, f, y] of P.rooms[type] ?? []) { const [dx, dz] = face[f] ?? face.door; spawnProp(ctx, kind, Pt(a, b, (y ?? 0) + 0.01), yawOf(dx, dz)); }
}
export function dressHall(ctx, cx, cz) { for (const [kind, x, z, yaw] of P.hall ?? []) spawnProp(ctx, kind, { x: cx + x, z: cz + z }, yaw); }
// the model a container or crate wears (loot.js); null keeps its old look
export const containerModel = (kind) => P.containers[kind] ?? null;
export const crateModel = (name) => P.crates[(name ?? "").replace(/ \(locked\)$/, "")] ?? P.crates.default;
