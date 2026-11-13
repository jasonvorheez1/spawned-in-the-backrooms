// The Hub: lays the tunnels, lamps, doors and camps once per room (place.state.hubV), then keeps its people.
import { RUNS, lamps } from "../../scripts/lib/thehub.js";
export const cadence = "1s";
const V = 1;
const SODIUM = "oklch(0.8 0.15 68)";
function layShell(ctx) {
  for (const r of RUNS) ctx.spawn("hub-run-" + r.id, { tags: ["hub-shell"], feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/thehub-geo.js", params: { run: r.id } }, material: { roughness: 0.88, pbr: true } });
}
function layLamps(ctx) {
  for (const l of lamps()) ctx.spawn("hub-lamp-" + l.k, { tags: ["hub-lamp"], feetPosition: { x: l.x, y: l.y, z: l.z }, rotation: { yaw: l.yaw }, primitive: { kind: "box", width: 0.9, height: 0.2, depth: 0.25 }, material: { color: SODIUM, emissive: SODIUM, emissiveIntensity: 4 },
    light: { kind: "point", color: SODIUM, intensity: 9, distance: 19, shadow: { enabled: false } } });
}
export function tick(ctx) {
  if (!ctx.place.players?.length) return;
  const s = ctx.place.state;
  if (s.hubV !== V) { s.hubV = V; layShell(ctx); layLamps(ctx); }
}
