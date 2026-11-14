import { raycast } from "builtin/physics";

const BOOM = `fx
pop flash burst=1 life=.18 size=1 col=hdr(4,2,.5) a=1>0 r=sprite(soft-disc,add)
pop smoke burst=10 life=.6..1.2 v=sdir()*2+up(1) size=.18..0.3 col=<.3,.28,.25> a=.6>0 r=sprite(smoke-puff,alpha)`;

export function update(ctx, dt) {
  const me = ctx.self, s = me.state;
  if (s.done) return;
  const v = s.vel, p = me.feetPosition;
  v.y += (s.grenade ? -9.8 : -0.6) * dt;
  const speed = Math.hypot(v.x, v.y, v.z);
  const dir = { x: v.x / speed, y: v.y / speed, z: v.z / speed };
  const hit = raycast(ctx, p, dir, { distance: speed * dt, bodies: "all", physicsOnly: true, ignoreEntities: [me.id, s.owner] });
  s.age = (s.age ?? 0) + dt;
  if (hit || s.age > (s.grenade ? 2.2 : 4)) {
    const at = hit ? { x: hit.position.x + (hit.normal?.x ?? 0) * 0.08, y: hit.position.y + (hit.normal?.y ?? 0) * 0.08, z: hit.position.z + (hit.normal?.z ?? 0) * 0.08 } : p, radius = s.grenade ? 3.4 : 4.5, damage = s.grenade ? 45 : 65;
    s.done = true;
    for (const player of ctx.place.players) {
      const f = player.feetPosition, dx = f.x - at.x, dy = f.y + 0.8 - at.y, dz = f.z - at.z, d = Math.hypot(dx, dy, dz);
      if (d >= radius || player.state?.dead) continue;
      const obstruction = d > 0.1 && raycast(ctx, at, { x: dx / d, y: dy / d, z: dz / d }, { distance: Math.max(0, d - 0.25), bodies: "all", physicsOnly: true, ignoreEntities: [me.id, s.owner, player.id].filter(Boolean) });
      if (obstruction) continue;
      player.state.hp = Math.max(0, (player.state.hp ?? 100) - Math.round(damage * (1 - d / radius * 0.65)));
      ctx.emit("screenShake", { intensity: 0.45 * (1 - d / radius), duration: 0.3 }, { audience: { player: player.id } });
    }
    ctx.emit("fx", { position: at, script: BOOM });
    ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-frag-grenade-explosion.mp3", position: at, volume: 0.9, maxDistance: 45 });
    ctx.destroy(me.id);
    return;
  }
  me.feetPosition = { x: p.x + v.x * dt, y: p.y + v.y * dt, z: p.z + v.z * dt };
  s.vel = v;
}
