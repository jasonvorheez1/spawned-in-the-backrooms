// Custodian robots outside Level 11 (the Enemy Bay): the same kit the Level 11 Custodians run in scripts/l11-crawlers.js,
// one manager for every row tagged "custodian-ai" (Shelly, Nov 13: "they dont act like how i remember them acting").
// Spot you and call it out, raise the rifle, hold at range on a clear line, sidestep between shots, back off when crowded,
// bolts that can miss a runner, the Suppressor's six-round bursts, metal footfalls, a bark when hurt, a wreck you can loot.
import { clearSight } from "./lib/sight.js";
import { dmgAfterArmor } from "./lib/stats.js";
import { knocked } from "./lib/knock.js";
import { targetsOf } from "./lib/decoys.js";
import BOT from "./lib/data/l11-sentry.yml";
import D from "./lib/data/l11-depths.yml";

const SAY = (t) => `/cdn/${BOT.throat}-saying-${encodeURIComponent(t)}.mp3`;
const BOLT = `fx
pop arc burst=14..20 life=.1..0.25 v=sdir()*(2..4) size=.03..0.05 acc=drag(3) col=hdr(5,2.6,.6)>hdr(2,.8,.1) a=1>0 sz=$size r=sprite(ember,add,velocity,.03)
pop glow burst=1 life=.15 col=<1,.6,.2> a=1>0 r=light(<1,.6,.2>,6,5)`;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function speak(ctx, f, m, ev, now, gap = 6000) {
  if (now < (m.talkUntil ?? 0)) return; const pool = BOT.lines?.[ev]; if (!pool?.length) return; m.talkUntil = now + gap;
  ctx.emit("playSound", { clip: SAY(pool[Math.floor(ctx.random() * pool.length)]), position: f.feetPosition, bus: "Voice", volume: 1, refDistance: 4, maxDistance: 30, follow: f.id, mode: "restart" });
}
export function update(ctx, dt) {
  const foes = ctx.query({ tags: ["custodian-ai"], radius: 1e4 });
  if (!foes.length) { ctx.sleep(1); return; }
  const now = ctx.now(), mem = (ctx.self.session.m ??= {}), g = ctx.place.gravity?.y ?? -9.8;
  const players = targetsOf(ctx, ctx.place.players).filter((p) => (p.state?.hp ?? 1) > 0);
  for (const row of foes) {
    const f = ctx.getObject(row.id); if (!f) continue;
    const s = f.state, m = (mem[f.id] ??= {}), K = D.kinds[s.kind] ?? D.kinds.sentry, pos = f.feetPosition;
    if ((s.hp ?? 1) <= 0) { // a wreck: it drops, sparks, and stays searchable a while
      if (!s.dead) { s.dead = now; f.anim.aim = null; f.anim.main = { clip: "cdn/clip-die.glb", loop: false, weight: 1, blend: 0.15 };
        ctx.emit("fx", { position: { ...pos, y: pos.y + 1 }, script: BOLT }); ctx.emit("playSound", { clip: "/cdn/moodboard-scifi-neon/sfx-robot-powering-down-whine-and-metal-collapse.mp3", position: pos, volume: 1 });
        const it = ["cells", "scrap_metal", "wire"]; if (ctx.random() < 0.6) it.push("cells"); if (ctx.random() < 0.55) it.push("circuit");
        f.tags = [...new Set([...(f.tags ?? []), "container", "remains"])]; s.items = it.join(","); s.name = "Wrecked " + (s.name ?? "Custodian"); }
      f.velocity = { x: 0, y: f.grounded ? -0.5 : (f.velocity?.y ?? 0) + g * dt, z: 0 };
      if (now - s.dead > 90000) ctx.destroy(f.id);
      continue;
    }
    if (knocked(ctx, f, now, dt)) { m.clip = m.up = null; continue; }
    let prey = null, best = 1e9;
    for (const p of players) { const d = flat(p.feetPosition, pos); if (d < best && d < 30) { best = d; prey = p; } }
    if (prey && !m.spoke) { m.spoke = 1; m.talkUntil = 0; speak(ctx, f, m, "spot", now); }
    if (!prey && m.spoke) { m.spoke = 0; m.talkUntil = 0; speak(ctx, f, m, "lost", now); }
    if ((m.lastHp ?? s.hp) - s.hp >= 25) speak(ctx, f, m, "hurt", now, 4000); m.lastHp = s.hp;
    let vx = 0, vz = 0;
    if (prey && !(s.stunUntil > now)) {
      const dx = prey.feetPosition.x - pos.x, dz = prey.feetPosition.z - pos.z, n = Math.hypot(dx, dz) || 1;
      f.rotation = { yaw: Math.atan2(-dx, -dz) * 180 / Math.PI };
      const eye = { x: pos.x, y: pos.y + 1.55, z: pos.z }, aim = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.1, z: prey.feetPosition.z };
      const los = clearSight(ctx, eye, aim, [f.id, prey.id]);
      if (!los || best > K.range) { vx = dx / n * K.speed; vz = dz / n * K.speed; }
      else if (best < K.keep - 2) { vx = -dx / n * K.speed * 0.7; vz = -dz / n * K.speed * 0.7; }
      else { if (now > (m.strafeAt ?? 0)) { m.strafeAt = now + 1800 + ctx.random() * 1600; m.strafe = ctx.random() < 0.3 ? 0 : ctx.random() < 0.5 ? 1 : -1; }
        vx = -dz / n * (m.strafe ?? 0) * K.speed * 0.6; vz = dx / n * (m.strafe ?? 0) * K.speed * 0.6; }
      if (los && best < K.range && now > (m.nextHit ?? 0)) {
        if (K.burst) { m.shots = ((m.shots ?? 0) + 1) % K.burst; m.nextHit = m.shots ? now + K.burstGap * 1000 : now + K.cd * 1000 * (0.85 + ctx.random() * 0.3); }
        else m.nextHit = now + K.cd * 1000 * (0.85 + ctx.random() * 0.3);
        const muzzle = { x: pos.x + dx / n * 0.6, y: pos.y + 1.25, z: pos.z + dz / n * 0.6 };
        const sp = Math.hypot(prey.velocity?.x ?? 0, prey.velocity?.z ?? 0), hits = ctx.random() > K.spread * (best / 4) * (sp > 3 ? 1.6 : 1);
        const end = hits ? aim : { x: aim.x + (ctx.random() - 0.5) * 1.6, y: aim.y + (ctx.random() - 0.3), z: aim.z + (ctx.random() - 0.5) * 1.6 };
        const L = Math.hypot(end.x - muzzle.x, end.y - muzzle.y, end.z - muzzle.z), col = `oklch(0.85 0.17 ${K.bolt ?? 65})`;
        ctx.spawn({ feetPosition: { x: (muzzle.x + end.x) / 2, y: (muzzle.y + end.y) / 2 - 0.025, z: (muzzle.z + end.z) / 2 }, pivot: "center", rotation: { lookAt: end, include: ["yaw", "pitch"] }, primitive: { kind: "box", width: 0.05, height: 0.05, depth: L }, material: { color: col, emissive: col, emissiveIntensity: 4 }, lifetime: 0.08 });
        ctx.emit("fx", { position: muzzle, script: BOLT });
        f.anim.fire = { clip: "cdn/clip-rifle-fire-01972c51.glb", loop: false, weight: 1, mask: "RightShoulder", blend: 0.05 };
        ctx.emit("playSound", { clip: "/cdn/moodboard-scifi-neon/sfx-retro-1950s-ray-gun-zap-with-warbling-oscillator.mp3", position: muzzle, volume: K.burst ? 0.6 : 0.9, pitch: K.burst ? 1.5 + ctx.random() * 0.15 : 1, mode: "overlap" });
        if (!m.shots && ctx.random() < 0.35) speak(ctx, f, m, "shoot", now, 7000);
        if (hits) { const dmg = dmgAfterArmor(prey.state.look, K.dmg); prey.state.hp -= dmg; ctx.emit("damageNumber", { position: aim, value: dmg, color: "#ffb040" }); ctx.emit("fx", { position: aim, script: BOLT });
          ctx.emit("cameraPunch", { direction: { x: dx / n, y: 0, z: dz / n }, intensity: 0.3 }, { audience: { player: prey.id } }); }
        else { ctx.emit("fx", { position: end, script: BOLT });
          ctx.emit("playSound", { clip: "/cdn/moodboard-scifi-neon/sfx-laser-bolt-whizzing-past-ear-close-flyby.mp3", position: { x: prey.feetPosition.x, y: aim.y + 0.5, z: prey.feetPosition.z }, volume: 0.9, maxDistance: 10 }); }
      }
    }
    if ((vx || vz) && now > (m.step ?? 0)) { m.step = now + 520; ctx.emit("playSound", { clip: "/cdn/moodboard-scifi-neon/sfx-heavy-metal-robot-footstep-clank-on-concrete.mp3", position: pos, volume: 0.6, pitch: 0.9 + ctx.random() * 0.2, maxDistance: 26 }); }
    const mv = (vx || vz) ? "cdn/clip-walk-loop.glb" : "cdn/clip-idle-loop.glb", up = !!prey;
    if (m.clip !== mv) { m.clip = mv; f.anim.main = { clip: mv, loop: true, weight: 1, blend: 0.25 }; }
    if (m.up !== up) { m.up = up; f.anim.aim = up ? { clip: "cdn/clip-rifle-up-50cc7349-loop.glb", loop: true, weight: 1, mask: "Spine", blend: 0.3 } : null; }
    f.velocity = { x: vx, y: f.grounded ? -0.5 : (f.velocity?.y ?? 0) + g * dt, z: vz };
  }
}
