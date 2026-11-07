// The lurker pack: pale things that only move when nobody is looking at them. A wanderer who keeps one in view
// holds it still (and pays sanity for it); look away, or break the line of sight, and it closes the gap fast.
// They wander the halls like smilers, but never cross into the safe room. Dead lurkers are cleared here.
import L from "./lib/data/level0.yml";
import { cellAt, cellCenter, inHub, wallX, wallZ, hasPit, N } from "./lib/maze.js";
import { raycast } from "builtin/physics";

const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const POOF = `fx
pop dust burst=18..24 life=.6..1.1 on=box(.6,1.8,.6).c(1) v=sdir()*(.4..1.2)+up(.5) size=.25..0.5 acc=buoy(.4)+drag(1.4) col=<.8,.78,.74> a=0>.35:.5>0 sz=$size*(.6>1.5) r=sprite(smoke-puff,alpha)`;

function neighbor(ctx, pos) {
  const { cx, cz } = cellAt(pos.x, pos.z), o = [];
  if (cx < N - 1 && !wallX(cx, cz)) o.push([cx + 1, cz]);
  if (cx > 0 && !wallX(cx - 1, cz)) o.push([cx - 1, cz]);
  if (cz < N - 1 && !wallZ(cx, cz)) o.push([cx, cz + 1]);
  if (cz > 0 && !wallZ(cx, cz - 1)) o.push([cx, cz - 1]);
  const ok = o.filter(([a, b]) => !inHub(a, b) && !hasPit(a, b));
  if (!ok.length) return cellCenter(cx, cz);
  const [a, b] = ok[Math.floor(ctx.random() * ok.length)];
  return cellCenter(a, b);
}

// is there open air between the two points (no static body in the way)?
function clear(ctx, a, b, ignore) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz) || 1;
  return !raycast(ctx, a, { x: dx / d, y: dy / d, z: dz / d }, { distance: d, physicsOnly: true, ignoreEntities: ignore, bodies: "static" });
}

export function update(ctx, dt) {
  const now = ctx.now();
  const players = ctx.place.players.filter((p) => !(p.state?.downAt && now - p.state.downAt < 2000));
  const mem = (ctx.self.session.m ??= {});
  for (const w of ctx.query({ tags: ["lurker"] })) {
    const m = (mem[w.id] ??= {}), st = w.state ?? {}, pos = w.feetPosition;
    if (st.dead) {
      if (!m.gone) { m.gone = true; ctx.emit("fx", { position: { x: pos.x, y: pos.y + 1, z: pos.z }, script: POOF }); ctx.emit("playSound", { clip: SND("shadow-creature-dissolve-hiss"), position: pos, volume: 0.8, maxDistance: 30 }); ctx.destroy(w.id); }
      continue;
    }
    const eye = { x: pos.x, y: pos.y + 1.6, z: pos.z };
    if (now >= (m.look ?? 0)) {
      m.look = now + 150 + ctx.random() * 100;
      let best = null, bd = L.lurkerSight, watched = null;
      for (const p of players) {
        const pp = p.feetPosition, c = cellAt(pp.x, pp.z);
        if (inHub(c.cx, c.cz)) continue;
        const dx = pp.x - pos.x, dz = pp.z - pos.z, d = Math.hypot(dx, dz);
        if (d >= L.lurkerSight) continue;
        const head = { x: pp.x, y: pp.y + 1.5, z: pp.z };
        if (!clear(ctx, eye, head, [w.id, p.id])) continue;
        // is the wanderer facing it? (aim is the direction they look; the lurker is at -d from them)
        const ax = p.state?.aimX ?? 0, az = p.state?.aimZ ?? -1;
        if (((-dx) * ax + (-dz) * az) / (d || 1) > L.lurkerWatchCos) watched = p;
        if (d < bd) { best = p; bd = d; }
      }
      if (best && !m.prey) ctx.emit("playSound", { clip: SND("bone-crack-twist"), position: pos, volume: 0.8, maxDistance: 24 });
      m.prey = best?.id ?? null;
      m.watched = !!watched;
      if (watched) watched.state.sanity = Math.max(0, watched.state.sanity - L.lurkerGaze * 0.2);
      if (best) m.last = { x: best.feetPosition.x, z: best.feetPosition.z, at: now };
    }
    const prey = m.prey ? players.find((p) => p.id === m.prey) : null;
    let goal, speed;
    if (prey) { goal = prey.feetPosition; speed = L.lurkerSpeed; }
    else if (m.last && now - m.last.at < 5000) { goal = m.last; speed = L.lurkerSpeed * 0.6; if (Math.hypot(goal.x - pos.x, goal.z - pos.z) < 0.8) m.last = null; }
    else { if (!m.next || Math.hypot(m.next.x - pos.x, m.next.z - pos.z) < 0.5 || now > (m.nextBy ?? 0)) { m.next = neighbor(ctx, pos); m.nextBy = now + 7000; } goal = m.next; speed = 1.0; }
    let vx = 0, vz = 0;
    const dx = goal.x - pos.x, dz = goal.z - pos.z, d = Math.hypot(dx, dz);
    if (d > (prey ? 1.1 : 0.3)) { vx = (dx / d) * speed; vz = (dz / d) * speed; }
    if (m.watched) { vx = 0; vz = 0; } // frozen under a gaze
    const ahead = cellAt(pos.x + vx * 0.5, pos.z + vz * 0.5);
    if (inHub(ahead.cx, ahead.cz)) { vx = 0; vz = 0; m.next = null; m.last = null; m.prey = null; }
    const v = w.velocity ?? { y: 0 };
    w.velocity = { x: vx, y: (v.y ?? 0) + ctx.place.gravity.y * dt, z: vz };
    const face = prey ? { x: prey.feetPosition.x - pos.x, z: prey.feetPosition.z - pos.z } : { x: vx, z: vz };
    if (!m.watched && (face.x || face.z)) { const yaw = (Math.atan2(-face.x, -face.z) * 180) / Math.PI; if (Math.abs(((yaw - (m.yaw ?? 999) + 540) % 360) - 180) > 6) { m.yaw = yaw; w.rotation = yaw; } }
    if (prey && !m.watched && Math.hypot(prey.feetPosition.x - pos.x, prey.feetPosition.z - pos.z) < 1.6 && now >= (m.bite ?? 0)) {
      m.bite = now + L.lurkerBiteCooldown * 1000;
      prey.state.hp -= L.lurkerBite;
      prey.state.sanity -= L.lurkerSanity;
      const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.4, z: prey.feetPosition.z };
      ctx.emit("damageNumber", { position: at, value: L.lurkerBite, color: "#ff4a3a" });
      ctx.emit("playSound", { clip: SND("creature-bite-snarl-wet"), position: at, volume: 1, maxDistance: 25 });
      ctx.emit("screenShake", { intensity: 0.5, duration: 0.3 }, { audience: { player: prey.id } });
      ctx.emit("screenFlash", { color: "#e8e4d8", duration: 0.2, intensity: 0.4 }, { audience: { player: prey.id } });
    }
  }
}
