import { targetsOf } from "./lib/decoys.js";
// The Enemy Bay's stand-in brain (Shelly, Nov 13: "im pretty sure theres more enemies than that"): foes whose home
// manager walks its own level's map (deathmoths on Level 3's cells, the Level 6 smiler, Level 5's rats, the Clump,
// Level 13's tenant and lurker) come out here with their real model, hp and bite, and this one manager makes them hunt:
// close on the nearest player in the bay, bite on a cooldown, fold and smoke away at 0 hp. Rows tagged "baybrain".
import { dmgAfterArmor } from "./lib/stats.js";
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const BAY = { x0: 24.5, x1: 49.5, z0: -25.5, z1: -2.5 };
const SMOKE = `fx
pop smoke burst=24 on=sphere(.4) life=1.2..2.2 v=up(1)+sdir()*.5 size=.25..0.5 acc=buoy(.6)+drag(1) sz=$size*(.6>2) col=<.06,.06,.06> a=0>.6:.5>.6:.3>0 r=sprite(smoke-puff,alpha)`;
export function update(ctx, dt) {
  const players = targetsOf(ctx, ctx.place.players).filter((p) => p.feetPosition.x > BAY.x0 && p.feetPosition.x < BAY.x1 && p.feetPosition.z > BAY.z0 && p.feetPosition.z < BAY.z1 && !(p.state?.hp <= 0));
  const foes = ctx.query({ tags: ["baybrain"], radius: 1e4 });
  if (!foes.length) return ctx.sleep(1);
  const now = ctx.now(), g = ctx.place.gravity?.y ?? -9.8, seen = (ctx.self.session.gait ??= {});
  for (const f of foes) {
    const s = f.state, B = s.brain;
    if (!B) continue;
    if ((s.hp ?? 1) <= 0) {
      if (!s.dead) { s.dead = now; ctx.emit("playSound", { clip: SND(B.die ?? "wet-creature-death-gurgle"), position: f.feetPosition, volume: 0.8 }); if (B.rig) f.anim.base = { clip: "cdn/clip-die.glb", loop: false, weight: 1, blend: 0.15 }; }
      if (!B.fly) f.velocity = { x: 0, y: f.velocity.y + g * dt, z: 0 };
      if (now - s.dead > 2500) { ctx.emit("fx", { position: { ...f.feetPosition, y: f.feetPosition.y + 0.6 }, script: SMOKE }); ctx.destroy(f.id); }
      continue;
    }
    let prey = null, best = 1e9;
    for (const p of players) { const d = flat(p.feetPosition, f.feetPosition); if (d < best) { best = d; prey = p; } }
    const moving = prey && (B.range ? best > B.range || best < B.keep - 2 : best > B.reach * 0.85);
    let vx = 0, vz = 0;
    if (moving && B.range && best < B.keep - 2) { const k = -B.speed * 0.7 / best; vx = (prey.feetPosition.x - f.feetPosition.x) * k; vz = (prey.feetPosition.z - f.feetPosition.z) * k; } // a robot backs off to its range
    else if (moving) { const k = B.speed / best; vx = (prey.feetPosition.x - f.feetPosition.x) * k; vz = (prey.feetPosition.z - f.feetPosition.z) * k; }
    if (prey) f.rotation = { yaw: (Math.atan2(-(prey.feetPosition.x - f.feetPosition.x), -(prey.feetPosition.z - f.feetPosition.z)) * 180) / Math.PI };
    if (B.fly) { // a swarm hangs at head height and drifts in
      const y = (prey ? prey.feetPosition.y : 0) + 1.4 + Math.sin(now / 300) * 0.15;
      f.feetPosition = { x: f.feetPosition.x + vx * dt, y: f.feetPosition.y + (y - f.feetPosition.y) * Math.min(1, dt * 3), z: f.feetPosition.z + vz * dt };
    } else f.velocity = { x: vx, y: f.grounded ? 0 : f.velocity.y + g * dt, z: vz };
    if (B.rig) { const k = moving ? (B.speed > 3 ? "run" : "walk") : "idle"; if (seen[f.id] !== k) { seen[f.id] = k; f.anim.base = { clip: `cdn/clip-${k}-loop.glb`, loop: true, weight: 1, blend: 0.25 }; } }
    if (prey && B.range && best <= B.range && now >= (s.nextBite ?? 0)) { // a Custodian fires a bolt (bursts for the Suppressor); a bolt can miss a moving target
      s.shots = B.burst ? ((s.shots ?? 0) + 1) % B.burst : 0; s.nextBite = now + (s.shots ? B.burstGap : B.cd * (0.85 + ctx.random() * 0.3)) * 1000;
      const muzzle = { x: f.feetPosition.x, y: f.feetPosition.y + 1.25, z: f.feetPosition.z }, aim = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.1, z: prey.feetPosition.z };
      const sp = Math.hypot(prey.velocity?.x ?? 0, prey.velocity?.z ?? 0), hits = ctx.random() > 0.15 * (best / 4) * (sp > 3 ? 1.6 : 1);
      const end = hits ? aim : { x: aim.x + (ctx.random() - 0.5) * 1.6, y: aim.y + (ctx.random() - 0.3), z: aim.z + (ctx.random() - 0.5) * 1.6 }, L = Math.hypot(end.x - muzzle.x, end.y - muzzle.y, end.z - muzzle.z);
      ctx.spawn({ feetPosition: { x: (muzzle.x + end.x) / 2, y: (muzzle.y + end.y) / 2 - 0.025, z: (muzzle.z + end.z) / 2 }, pivot: "center", rotation: { lookAt: end, include: ["yaw", "pitch"] }, primitive: { kind: "box", width: 0.05, height: 0.05, depth: L }, material: { color: `oklch(0.85 0.17 ${B.bolt})`, emissive: `oklch(0.85 0.17 ${B.bolt})`, emissiveIntensity: 4 }, lifetime: 0.08 });
      f.anim.fire = { clip: "cdn/clip-rifle-fire-01972c51.glb", loop: false, weight: 1, mask: "RightShoulder", blend: 0.05 };
      ctx.emit("playSound", { clip: "/cdn/moodboard-scifi-neon/sfx-retro-1950s-ray-gun-zap-with-warbling-oscillator.mp3", position: muzzle, volume: B.burst ? 0.6 : 0.9, pitch: B.burst ? 1.5 : 1, mode: "overlap" });
      if (hits) { const dmg = dmgAfterArmor(prey.state.look, B.dmg); prey.state.hp -= dmg; ctx.emit("damageNumber", { position: aim, value: dmg, color: "#ffb040" }); }
    }
    else if (prey && !B.range && best <= B.reach && now >= (s.nextBite ?? 0)) {
      s.nextBite = now + B.cd * 1000;
      const dmg = dmgAfterArmor(prey.state.look, B.dmg), at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.1, z: prey.feetPosition.z };
      prey.state.hp -= dmg;
      ctx.emit("damageNumber", { position: at, value: dmg, color: "#ff4040" });
      ctx.emit("playSound", { clip: SND(B.bite ?? "animal-bite-flesh-tear"), position: at, volume: 0.9 });
      ctx.emit("squash", { target: f.id, axis: "z", intensity: 0.15, duration: 0.2 });
      ctx.emit("cameraPunch", { direction: { x: prey.feetPosition.x - f.feetPosition.x, y: 0, z: prey.feetPosition.z - f.feetPosition.z }, intensity: 0.35 }, { audience: { player: prey.id } });
    }
  }
}
