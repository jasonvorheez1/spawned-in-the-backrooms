// Level 1's hounds: one manager steps the pack. They roam the halls, hunt when they see or hear you,
// hunt harder in a Flickering, and never cross into the corridors (safe ground).
import L from "./lib/data/level1.yml";
import { zoneAt, safeZone, cellCenter, N } from "./lib/level1.js";
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const POOF = `fx
pop dust burst=16 life=.6..1 on=box(.5,.5,.8).c(.5) v=sdir()*(.4..1)+up(.4) size=.2..0.4 acc=drag(1.4) col=<.4,.38,.36> a=0>.4:.5>0 sz=$size*(.6>1.5) r=sprite(smoke-puff,alpha)`;
export function update(ctx, dt) {
  const now = ctx.now(), dark = ctx.place.state.flicker === "dark", mem = (ctx.self.session.m ??= {});
  const players = ctx.place.players.filter((p) => !safeZone(zoneAt(p.feetPosition.x, p.feetPosition.z)) && !(p.state?.downAt && now - p.state.downAt < 2000));
  for (const h of ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
    const m = (mem[h.id] ??= {}), pos = h.feetPosition, st = h.state ?? {};
    if (st.dead || (st.hp ?? 1) <= 0) { if (!m.gone) { m.gone = true; ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.6, z: pos.z }, script: POOF }); ctx.emit("playSound", { clip: SND("hound-death-yelp"), position: pos, volume: 0.8 }); ctx.destroy(h.id); } continue; }
    const sight = L.houndSight * (dark ? L.houndSightFlicker : 1);
    let prey = null, best = Infinity;
    for (const p of players) {
      const d = Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z);
      const loud = (p.state?.sprinting ? L.houndHear : 0) || (dark && p.state?.light ? L.houndHearLight : 0);
      if (d < Math.max(sight, loud) && d < best) { best = d; prey = p; }
    }
    let goal;
    if (prey) goal = prey.feetPosition;
    else { if (!m.roam || now > m.until) { const a = ctx.random() * 6.283; m.roam = { x: pos.x + Math.cos(a) * 14, z: pos.z + Math.sin(a) * 14 }; m.until = now + 4000; } goal = m.roam; }
    const dx = goal.x - pos.x, dz = goal.z - pos.z, d = Math.hypot(dx, dz) || 1;
    let sp = prey ? L.houndSpeed * (dark ? 1.15 : 1) : 2;
    const nx = pos.x + dx / d * sp * dt, nz = pos.z + dz / d * sp * dt;
    if (safeZone(zoneAt(nx, nz))) sp = 0; // the corridors turn them back
    h.velocity = { x: d > 1.2 ? dx / d * sp : 0, y: (h.velocity?.y ?? 0) - 20 * dt, z: d > 1.2 ? dz / d * sp : 0 };
    if (sp > 0) h.rotation = { yaw: Math.atan2(-dx, -dz) * 57.2958 };
    if (prey && !m.hunting) { m.hunting = true; ctx.emit("playSound", { clip: SND("hound-snarl-growl"), position: pos, volume: 0.9, maxDistance: 35 }); }
    if (!prey) m.hunting = false;
    if (prey && best < 1.6 && now >= (m.next ?? 0)) {
      m.next = now + L.houndCooldown * 1000; prey.state.hp -= L.houndBite;
      const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1, z: prey.feetPosition.z };
      ctx.emit("damageNumber", { position: at, value: L.houndBite, color: "#ff5040" });
      ctx.emit("playSound", { clip: SND("hound-bite-snap"), position: at, volume: 0.9 });
      ctx.emit("screenShake", { intensity: 0.3, duration: 0.2 }, { audience: { player: prey.id } });
    }
  }
}
