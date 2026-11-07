// Level 1's hounds: one manager steps the pack. They roam the halls, hunt when they see or hear you,
// hunt harder in a Flickering, and never cross into the corridors (safe ground).
import L from "./lib/data/level1.yml";
import { zoneAt, safeZone, cellCenter, N } from "./lib/level1.js";
import { zoneAt as zoneAt2 } from "./lib/level2.js";
import { npcMul, derived, dmgAfterArmor } from "./lib/stats.js";
import { zoneAt as zoneAt3, cellAt as cellAt3, cellCenter as cellCenter3, openings as openings3 } from "./lib/level3.js";
import { stepToward, cellNear } from "./lib/maze3path.js";
import C from "./lib/data/creatures3.yml";
const H3 = C.hounds3;
const sn = (p) => (p?.state?.attr ? derived(p.state).sneak : 1);
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const POOF = `fx
pop dust burst=16 life=.6..1 on=box(.5,.5,.8).c(.5) v=sdir()*(.4..1)+up(.4) size=.2..0.4 acc=drag(1.4) col=<.4,.38,.36> a=0>.4:.5>0 sz=$size*(.6>1.5) r=sprite(smoke-puff,alpha)`;
export function update(ctx, dt) {
  const L3 = ctx.self.place === "level3";
  const safeAt = L3 ? (x, z) => zoneAt3(x, z) === "gamma" : ctx.self.place === "level2" ? (x, z) => zoneAt2(x, z) === "camp" : (x, z) => safeZone(zoneAt(x, z));
  const now = ctx.now(), dark = ctx.place.state.flicker === "dark", mem = (ctx.self.session.m ??= {});
  const players = ctx.place.players.filter((p) => !safeAt(p.feetPosition.x, p.feetPosition.z) && !(p.state?.downAt && now - p.state.downAt < 2000));
  for (const h of ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
    const m = (mem[h.id] ??= {}), pos = h.feetPosition, st = h.state ?? {}, mu = npcMul(st);
    if (st.dead || (st.hp ?? 1) <= 0) { if (!m.gone) { m.gone = true; ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.6, z: pos.z }, script: POOF }); ctx.emit("playSound", { clip: SND("hound-death-yelp"), position: pos, volume: 0.8 }); ctx.destroy(h.id); } continue; }
    const sight = L.houndSight * mu.sight * (dark ? L.houndSightFlicker : 1);
    let prey = null, best = Infinity;
    for (const p of [...players, ...ctx.query({ tags: ["npc"], radius: sight, center: pos }).filter((n) => !n.state?.dead)]) { // agents are meat too
      const d = Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z);
      const loud = (p.state?.sprinting ? L.houndHear : 0) || (dark && p.state?.light ? L.houndHearLight : 0);
      if (d < Math.max(sight, loud) * sn(p) && d < best) { best = d; prey = p; }
    }
    if (L3) { // brigades: share the spotter's prey, and lie in wait in dead ends
      if (prey && !m.hunting) { // the spotter barks and calls its brigade in
        ctx.emit("playSound", { clip: SND("hound-bark-howl-call"), position: pos, volume: 1, maxDistance: H3.barkRange });
        for (const o of ctx.query({ tags: ["hound"], radius: H3.packRadius, center: pos })) if (o.id !== h.id) { const om = (mem[o.id] ??= {}); om.pack = prey.id; om.packUntil = now + H3.packHold * 1000; }
      }
      if (!prey && m.pack && now < m.packUntil) { prey = players.find((p) => p.id === m.pack) ?? ctx.query({ tags: ["npc"], radius: 60, center: pos }).find((n) => n.id === m.pack && !n.state?.dead) ?? null; if (prey) best = Math.hypot(prey.feetPosition.x - pos.x, prey.feetPosition.z - pos.z); }
      if (!prey) { // ambush: crouched in a dead end until someone walks past or turns their back
        m.home ??= { x: pos.x, z: pos.z };
        if (!m.lurkAt) { const hc = cellAt3(m.home.x, m.home.z), c = cellNear(() => ctx.random(), hc.cx, hc.cz, H3.lurkSearch, (x, z) => openings3(x, z).length === 1); m.lurkAt = c ? cellCenter3(c[0], c[1]) : m.home; }
        if (Math.hypot(m.lurkAt.x - pos.x, m.lurkAt.z - pos.z) < 0.8) {
          if (!st.lurk) { h.state.lurk = true; h.scale = { x: 1, y: H3.lurkScale, z: 1 }; }
          for (const p of players) {
            const dx = pos.x - p.feetPosition.x, dz = pos.z - p.feetPosition.z, d = Math.hypot(dx, dz), yaw = (p.camera?.rotation?.yaw ?? 0) / 57.2958;
            const back = (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) < 0; // the hound is behind where they look
            if (d < H3.pounceNear * sn(p) || (back && d < H3.pounceBack * sn(p))) { prey = p; best = d; m.pounceUntil = now + H3.pounceTime * 1000; break; }
          }
        }
      }
      if (prey && st.lurk) { h.state.lurk = false; h.scale = 1; m.lurkAt = null; }
      if (!prey && m.hunting) m.lurkAt = null; // a lost hunt picks a fresh hiding spot
    }
    let goal;
    if (prey) goal = prey.feetPosition;
    else if (L3 && m.lurkAt) goal = m.lurkAt;
    else { if (!m.roam || now > m.until) { const a = ctx.random() * 6.283; m.roam = { x: pos.x + Math.cos(a) * 14, z: pos.z + Math.sin(a) * 14 }; m.until = now + 4000; } goal = m.roam; }
    const way = L3 ? stepToward(pos.x, pos.z, goal.x, goal.z, 30) : null; // level 3: follow the halls cell by cell
    if (L3 && !way && !prey) m.roam = null;
    const tgt = way && way.cells > 0 ? way.next : goal;
    const dx = tgt.x - pos.x, dz = tgt.z - pos.z, d = Math.hypot(dx, dz) || 1;
    let sp = prey ? mu.speed * L.houndSpeed * (dark ? 1.15 : 1) : 2;
    if (L3 && prey && now < (m.pounceUntil ?? 0)) sp *= H3.pounceBoost;
    if (L3 && st.lurk) sp = 0;
    if (now < (st.stunUntil ?? 0)) sp *= H3.stunSpeed; // stunned, every level
    const nx = pos.x + dx / d * sp * dt, nz = pos.z + dz / d * sp * dt;
    if (safeAt(nx, nz)) sp = 0; // the corridors turn them back
    const near = way && way.cells > 0 ? 0.3 : 1.2;
    h.velocity = { x: d > near ? dx / d * sp : 0, y: (h.velocity?.y ?? 0) - 20 * dt, z: d > near ? dz / d * sp : 0 };
    if (sp > 0) h.rotation = { yaw: Math.atan2(-dx, -dz) * 57.2958 };
    if (prey && !m.hunting) { m.hunting = true; ctx.emit("playSound", { clip: SND("hound-snarl-growl"), position: pos, volume: 0.9, maxDistance: 35 }); }
    if (!prey) m.hunting = false;
    if (prey && best < 1.6 && now >= (m.next ?? 0)) {
      m.next = now + L.houndCooldown * 1000; prey.state.hp -= dmgAfterArmor(prey.state.look, Math.round(L.houndBite * mu.dmg)); // worn clothes soak the hit (lib/clothes.yml DR)
      const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1, z: prey.feetPosition.z };
      ctx.emit("damageNumber", { position: at, value: Math.round(L.houndBite * mu.dmg), color: "#ff5040" });
      ctx.emit("playSound", { clip: SND("hound-bite-snap"), position: at, volume: 0.9 });
      ctx.emit("screenShake", { intensity: 0.3, duration: 0.2 }, { audience: { player: prey.id } });
    }
  }
}
