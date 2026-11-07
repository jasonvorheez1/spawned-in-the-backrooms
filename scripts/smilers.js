// The pack manager: one script moves every smiler. They drift cell to cell along open doorways,
// lock on to a wanderer they can see, stalk, then charge and bite. They never cross into the safe room.
import L from "./lib/data/level0.yml";
import { cellAt, cellCenter, inHub, wallX, wallZ, hasPit, N } from "./lib/maze.js";
import { raycast } from "builtin/physics";
import { npcMul, derived } from "./lib/stats.js";
const sn = (p) => (p?.state?.attr ? derived(p.state).sneak : 1);

const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const POOF = `fx
pop shade burst=22..30 life=.8..1.4 on=box(.6,1.8,.6).c(1) v=sdir()*(.4..1.2)+up(.6) size=.3..0.6 acc=buoy(.6)+curl(.6)+drag(1.2) col=<.04,.03,.06> a=0>.5:.6>0 sz=$size*(.6>1.6) rot=spin(.4) r=sprite(smoke-puff,alpha)
pop spark burst=10 life=.4..0.8 on=point() v=sdir()*(1..2.5) size=.03..0.05 acc=drag(2) col=hdr(3,2.8,2.2) a=1>0 r=sprite(ember,add)`;

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

export function update(ctx, dt) {
  const now = ctx.now();
  const players = ctx.place.players.filter((p) => !(p.state?.downAt && now - p.state.downAt < 2000));
  const mem = (ctx.self.session.m ??= {});
  for (const w of ctx.query({ tags: ["smiler"] })) {
    const m = (mem[w.id] ??= {}), st = w.state ?? {}, pos = w.feetPosition, mu = npcMul(st);
    if (st.dead) {
      if (!m.gone) { m.gone = true; ctx.emit("fx", { position: { x: pos.x, y: pos.y + 1, z: pos.z }, script: POOF }); ctx.emit("playSound", { clip: SND("shadow-creature-dissolve-hiss"), position: pos, volume: 0.9, maxDistance: 35 }); ctx.destroy(w.id); }
      continue;
    }
    if (now >= (m.look ?? 0)) {
      m.look = now + 300 + ctx.random() * 200;
      let best = null, bd = Infinity;
      for (const p of players) {
        const pp = p.feetPosition, c = cellAt(pp.x, pp.z);
        if (inHub(c.cx, c.cz)) continue;
        const dx = pp.x - pos.x, dz = pp.z - pos.z, dy = pp.y + 1.3 - (pos.y + 1.7), d = Math.hypot(dx, dz);
        // drawn to light: a lit flashlight is seen from far off, a dark wanderer only up close (prey already found keeps the normal range)
        const reach = L.smilerSight * mu.sight * sn(p) * (p.state?.light ? L.smilerSightLit : m.prey === p.id ? 1 : L.smilerSightDark);
        if (d >= reach || d >= bd) continue;
        const L3 = Math.hypot(dx, dy, dz) || 1;
        const hit = raycast(ctx, { x: pos.x, y: pos.y + 1.7, z: pos.z }, { x: dx / L3, y: dy / L3, z: dz / L3 }, { distance: L3, physicsOnly: true, ignoreEntities: [w.id, p.id], bodies: "static" });
        if (hit) continue;
        best = p; bd = d;
      }
      if (best && !m.prey) ctx.emit("playSound", { clip: SND("creepy-wet-giggle-close"), position: pos, volume: 0.9, maxDistance: 28 });
      m.prey = best?.id ?? null;
      if (best) m.last = { x: best.feetPosition.x, z: best.feetPosition.z, at: now };
    }
    const prey = m.prey ? players.find((p) => p.id === m.prey) : null;
    const mode = prey ? "Hunt" : "Idle";
    if (m.mode !== mode) { m.mode = mode; w.anim.body = { clip: "anim/creatures.yml#smiler" + mode, loop: "loop" }; }
    let goal, speed;
    if (prey) {
      goal = prey.feetPosition; speed = Math.hypot(goal.x - pos.x, goal.z - pos.z) < 9 ? L.chargeSpeed : L.stalkSpeed;
      // eye contact: while the wanderer looks straight at it, it creeps; turn your back and it runs
      const yaw = prey.camera?.rotation?.yaw;
      if (yaw != null) {
        const r = (yaw * Math.PI) / 180, fx = -Math.sin(r), fz = -Math.cos(r);
        const tx = pos.x - goal.x, tz = pos.z - goal.z, tl = Math.hypot(tx, tz) || 1;
        const staring = (fx * tx + fz * tz) / tl > Math.cos((L.stareCone * Math.PI) / 180);
        if (staring) speed = L.stareSpeed;
        if (staring !== !!m.stared) { m.stared = staring; if (!staring) ctx.emit("playSound", { clip: SND("creepy-wet-giggle-close"), position: pos, volume: 0.7, maxDistance: 20 }); }
      }
    }
    else if (m.last && now - m.last.at < 6000) { goal = m.last; speed = L.stalkSpeed; if (Math.hypot(goal.x - pos.x, goal.z - pos.z) < 0.8) m.last = null; }
    else { if (!m.next || Math.hypot(m.next.x - pos.x, m.next.z - pos.z) < 0.5 || now > (m.nextBy ?? 0)) { m.next = neighbor(ctx, pos); m.nextBy = now + 6000; } goal = m.next; speed = 1.3; }
    let vx = 0, vz = 0;
    const dx = goal.x - pos.x, dz = goal.z - pos.z, d = Math.hypot(dx, dz);
    if (d > (prey ? 1.1 : 0.3)) { vx = (dx / d) * speed * mu.speed; vz = (dz / d) * speed * mu.speed; }
    const ahead = cellAt(pos.x + vx * 0.5, pos.z + vz * 0.5);
    if (inHub(ahead.cx, ahead.cz)) { vx = 0; vz = 0; m.next = null; m.last = null; m.prey = null; }
    const v = w.velocity ?? { y: 0 };
    w.velocity = { x: vx, y: (v.y ?? 0) + ctx.place.gravity.y * dt, z: vz };
    const face = prey ? { x: prey.feetPosition.x - pos.x, z: prey.feetPosition.z - pos.z } : { x: vx, z: vz };
    if (face.x || face.z) { const yaw = (Math.atan2(-face.x, -face.z) * 180) / Math.PI; if (Math.abs(((yaw - (m.yaw ?? 999) + 540) % 360) - 180) > 6) { m.yaw = yaw; w.rotation = yaw; } }
    if (prey && Math.hypot(prey.feetPosition.x - pos.x, prey.feetPosition.z - pos.z) < 1.6 && now >= (m.bite ?? 0)) {
      m.bite = now + L.biteCooldown * 1000;
      prey.state.hp -= Math.round(L.biteDamage * mu.dmg);
      prey.state.sanity -= L.biteSanity;
      const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.4, z: prey.feetPosition.z };
      ctx.emit("damageNumber", { position: at, value: Math.round(L.biteDamage * mu.dmg), color: "#ff4a3a" });
      ctx.emit("playSound", { clip: SND("creature-bite-snarl-wet"), position: at, volume: 1, maxDistance: 25 });
      ctx.emit("screenShake", { intensity: 0.35, duration: 0.25 }, { audience: { player: prey.id } });
      ctx.emit("screenFlash", { color: "#7a0a05", duration: 0.25, intensity: 0.35 }, { audience: { player: prey.id } });
      ctx.emit("squash", { target: w.id, axis: "z", intensity: 0.2, duration: 0.2 });
      w.anim.bite = { clip: "anim/creatures.yml#smilerBite", loop: "once", blend: "override", time: 0 };
    }
  }
}
