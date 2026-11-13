// Rides each player: now and then, in an unsafe part of Levels 0 to 20, a Duller comes into being out of your sight.
import { raycast, overlapPoint } from "builtin/physics";
import { clearSight } from "./lib/sight.js";
import { dullerSpec } from "./lib/duller-spec.js";
import { cellAt, inHub } from "./lib/maze.js";
import D from "./lib/data/dullers.yml";
export const updateSchedule = { every: { seconds: 5 } };
export function update(ctx) {
  const me = ctx.self, cfg = D.places[me.place];
  if (!cfg || !me.isLocal || me.state?.dead) return;
  const now = ctx.now(), s = ctx.session;
  if (s.dullerNext == null) { s.dullerNext = now + D.rollEvery * 1000; return; }
  if (now < s.dullerNext) return;
  s.dullerNext = now + D.rollEvery * 1000;
  if (ctx.query({ tags: ["duller"], radius: 1e5, select: "ids" }).length >= cfg.cap) return;
  if (ctx.random() > cfg.chance) return;
  const p = me.feetPosition, sp = ctx.place.defaultSpawnPoint ?? { x: 0, z: 0 };
  const safe = (x, z) => Math.hypot(x - (sp.x ?? 0), z - (sp.z ?? 0)) < D.safeRadius || (me.place === "main" && (() => { const c = cellAt(x, z); return inHub(c.cx, c.cz); })());
  if (safe(p.x, p.z)) return; // you are somewhere safe: nothing comes
  const eye = { x: p.x, y: p.y + 1.5, z: p.z };
  for (let i = 0; i < 12; i++) {
    const a = ctx.random() * Math.PI * 2, r = 18 + ctx.random() * 14, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
    if (safe(x, z)) continue;
    const h = raycast(ctx, { x, y: p.y + 2.4, z }, { x: 0, y: -1, z: 0 }, { distance: 5, physicsOnly: true, bodies: "static" });
    if (!h || Math.abs(h.position.y - p.y) > 1.2 || (h.normal && h.normal.y < 0.8)) continue;
    const y = h.position.y;
    if (overlapPoint(ctx, { x, y: y + 1.2, z }).objects?.length || overlapPoint(ctx, { x, y: y + 2.2, z }).objects?.length) continue;
    if (clearSight(ctx, eye, { x, y: y + 1.5, z }, [me.id])) continue; // born where you are not looking
    ctx.spawn(dullerSpec({ x, y: y + 0.02, z }, (Math.atan2(-(p.x - x), -(p.z - z)) * 180) / Math.PI));
    return;
  }
}
