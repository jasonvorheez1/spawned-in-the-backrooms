// ASHLINE molotov in flight: the frag's gravity and sweep-ahead raycast, tumbling end over end; the first ground or wall it meets
// shatters it: glass, a whoosh, a scorch and a fire patch (scripts/firepatch.js) on the ground under the break.
import { raycast } from "builtin/physics";
import { patchSpec } from "./lib/molotov.js";
const SND = "/cdn/moodboard-realistic-gritty/";
const R = 0.06;
export function update(ctx, dt) {
  const me = ctx.self, s = me.state;
  if (s.broken) return;
  const g = ctx.place.gravity?.y ?? -24;
  const v = { ...(s.vel ?? { x: 0, y: 0, z: 0 }) };
  v.y += g * dt;
  const p = me.feetPosition, speed = Math.hypot(v.x, v.y, v.z);
  if (speed > 1e-4) {
    const dir = { x: v.x / speed, y: v.y / speed, z: v.z / speed };
    const hit = raycast(ctx, p, dir, { distance: speed * dt + R, bodies: "static", ignoreEntities: [me.id, s.ownerId].filter(Boolean) });
    if (hit) return shatter(ctx, hit.position, hit.normal ?? { x: 0, y: 1, z: 0 });
  }
  if ((s.age = (s.age ?? 0) + dt) > 5 || p.y < -50) return shatter(ctx, p, { x: 0, y: 1, z: 0 });
  s.vel = v;
  me.feetPosition = { x: p.x + v.x * dt, y: p.y + v.y * dt, z: p.z + v.z * dt };
  s.spin = ((s.spin ?? 0) + dt * 720) % 360;
  me.rotation = { yaw: (s.yaw ??= ctx.random() * 360), pitch: s.spin, roll: s.spin * 0.25 };
}
function shatter(ctx, at, n) {
  const me = ctx.self, s = me.state;
  s.broken = true;
  // a wall break pours down it: the fire lands on the ground at the wall's foot
  let c = { x: at.x + n.x * 0.15, y: at.y + n.y * 0.15, z: at.z + n.z * 0.15 };
  const down = raycast(ctx, { x: c.x, y: c.y + 0.2, z: c.z }, { x: 0, y: -1, z: 0 }, { distance: 12, bodies: "static", physicsOnly: true, ignoreEntities: [me.id] });
  if (down) c = { x: down.position.x, y: down.position.y + 0.02, z: down.position.z };
  else { const h = ctx.place.terrain?.heightAt?.(c.x, c.z); if (h != null && h <= c.y) c.y = h + 0.02; }
  ctx.spawn(patchSpec(c, { ownerId: s.ownerId, team: s.team || "", until: ctx.now() + 7000, nextAt: ctx.now() }));
  ctx.emit("playSound", { clip: SND + "sfx-glass-bottle-shatter.mp3", position: at, volume: 1, maxDistance: 60 });
  ctx.emit("playSound", { clip: SND + "sfx-fire-ignite-whoosh.mp3", position: c, volume: 0.9, maxDistance: 60 });
  ctx.emit("decal", { position: c, normal: { x: 0, y: 1, z: 0 }, texture: "cdn/texture-scorch-mark-blast-decal.png", size: 6.5, lifetime: 45, fade: 5 });
  ctx.emit("noise", { position: c, radius: 30, kind: "fire" }, { audience: { nearby: c, radius: 30 } });
  ctx.log("molotov shatter", { owner: s.ownerId, pos: { x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2) } });
  ctx.destroy(me.id);
}
