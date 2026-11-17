// The Level 31 crawl's one manager. Rink Wardens (tag l31bot): battered rink-mascot security robots on a rigged body:
// they walk a patrol loop, spot you by sight (a cone and a clear line, or close behind them), talk through a broken
// speaker, zap from range with the arm, shove up close, flinch when hit and fold in sparks at 0 hp.
// Level 13's lurkers and tenants (tag l31foe) come down here on the same manager: close, bite on a cooldown, smoke away.
import { raycast } from "builtin/physics";
import { dmgAfterArmor } from "./lib/stats.js";
import { targetsOf } from "./lib/decoys.js";
const VOICE = "voice-cheerful-broken-rink-mascot-robot-tinny-glitchy-speaker";
const say = (line) => `/cdn/${VOICE}-saying-${encodeURIComponent(line)}.mp3`;
const LINES = {
  spot: ["Unauthorized guest detected.", "Welcome back, skater! Please return your skates."],
  attack: ["Couple skate only. Couple skate only."],
  hurt: ["Please! No roughhousing on the rink!"],
  idle: ["Have a rink-tastic day!"],
  die: ["Shutting... down... thank you for skating."],
};
const W = { hp: 140, walk: 1.3, chase: 2.4, sight: 16, close: 4.5, zapMin: 3.2, zapMax: 12, zapCd: 2.1, zapDmg: 9, shoveAt: 2.0, shoveCd: 1.7, shoveDmg: 12, forget: 6000 };
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const ZAP = "/cdn/moodboard-scifi-neon/sfx-retro-1950s-ray-gun-zap-with-warbling-oscillator.mp3";
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const SPARKS = `fx
pop spark burst=40..55 life=.4..0.9 v=up(2.5..4)+sdir()*(2..4) size=.03..0.06 acc=grav()*.9+drag(.6) col=hdr(5,3.4,1.2)>hdr(2.4,.9,.2) a=1>.7:1>0 floor=bounce(.3) r=sprite(ember,add,velocity,.03)
pop flash burst=1 life=.18 size=1.4 col=hdr(4,4.5,6) a=1>0 sz=$size r=sprite(soft-disc,add)
pop smoke burst=10 on=sphere(.3) life=1.4..2.2 v=up(.8)+sdir()*.3 size=.3..0.5 acc=buoy(.5)+drag(1) sz=$size*(.6>2) col=<.08,.08,.08> a=0>.5:.4>.6:.3>0 r=sprite(smoke-puff,alpha)`;
const SPARK = `fx
pop spark burst=10..16 life=.25..0.5 v=sdir()*(1.5..3)+up(1) size=.02..0.04 acc=grav()*.8 col=hdr(5,4,1.6) a=1>0 r=sprite(ember,add,velocity,.03)`;
const SMOKE = `fx
pop smoke burst=24 on=sphere(.4) life=1.2..2.2 v=up(1)+sdir()*.5 size=.25..0.5 acc=buoy(.6)+drag(1) sz=$size*(.6>2) col=<.06,.06,.06> a=0>.6:.5>.6:.3>0 r=sprite(smoke-puff,alpha)`;
function speak(ctx, f, kind, now, mem) {
  if (now < (mem.quiet ?? 0) && kind !== "die") return;
  const pool = LINES[kind]; mem.quiet = now + (kind === "idle" ? 9000 : 4500);
  ctx.emit("playSound", { clip: say(pool[Math.floor(ctx.random() * pool.length)]), position: { ...f.feetPosition, y: f.feetPosition.y + 1.5 }, volume: 0.95, bus: "Voice", maxDistance: 26, refDistance: 3, mode: "restart" });
}
function play(f, mem, k, clip) { if (mem.base === k) return; mem.base = k; f.anim.base = { clip, loop: true, weight: 1, blend: 0.25 }; }
function sees(ctx, f, p, d) {
  if (d > W.sight) return false;
  const yaw = ((f.rotation?.yaw ?? 0) * Math.PI) / 180, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const dot = ((p.feetPosition.x - f.feetPosition.x) * fx + (p.feetPosition.z - f.feetPosition.z) * fz) / Math.max(d, 0.01);
  if (d > W.close && dot < 0.35) return false;
  const eye = { x: f.feetPosition.x, y: f.feetPosition.y + 1.5, z: f.feetPosition.z }, to = { x: p.feetPosition.x - eye.x, y: p.feetPosition.y + 1.4 - eye.y, z: p.feetPosition.z - eye.z };
  const L = Math.hypot(to.x, to.y, to.z), hit = raycast(ctx, eye, { x: to.x / L, y: to.y / L, z: to.z / L }, { distance: L, ignoreEntities: [f.id], physicsOnly: true, bodies: "static" });
  return !hit || hit.distance >= L - 0.6;
}
export function update(ctx, dt) {
  const players = targetsOf(ctx, ctx.place.players).filter((p) => !(p.state?.hp <= 0));
  const now = ctx.now(), g = ctx.place.gravity?.y ?? -24, mems = (ctx.self.session.m ??= {});
  // failing tubes
  if (now > (ctx.self.session.flk ?? 0)) { ctx.self.session.flk = now + 90 + ctx.random() * 260;
    for (const r of ctx.query({ tags: ["l31c-flicker"], radius: 1e4, center: { x: 0, y: 0, z: 0 } })) { const l = ctx.getObject(r.id + "/" + (ctx.getObject(r.id)?.children?.[0]?.id?.split("/").pop() ?? "")); const on = ctx.random() > 0.3;
      const o = ctx.getObject(r.id); if (o) o.material = { ...o.material, emissiveIntensity: on ? 2.2 : 0.1 }; if (l?.light) l.light = { ...l.light, intensity: on ? (r.state.base ?? 9) : 0.4 }; } }
  for (const f of ctx.query({ tags: ["l31bot"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) warden(ctx, f, players, now, dt, g, (mems[f.id] ??= {}));
  for (const f of ctx.query({ tags: ["l31foe"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) walker(ctx, f, players, now, dt, g, (mems[f.id] ??= {}));
}
function warden(ctx, f, players, now, dt, g, mem) {
  const s = f.state;
  if ((s.hp ?? 1) <= 0) {
    if (!s.dead) { s.dead = now; f.anim.base = { clip: "cdn/clip-die.glb", loop: false, weight: 1, blend: 0.15 }; f.anim.arm = null; speak(ctx, f, "die", now, mem);
      ctx.emit("fx", { position: { ...f.feetPosition, y: f.feetPosition.y + 1.2 }, script: SPARKS }); ctx.emit("playSound", { clip: SND("electrical-short-circuit-sparks-crackle-and-power-down-whine"), position: f.feetPosition, volume: 0.9 }); }
    f.velocity = { x: 0, y: f.grounded ? 0 : (f.velocity?.y ?? 0) + g * dt, z: 0 };
    if (now - s.dead > 1500 && now - (mem.sp ?? 0) > 700) { mem.sp = now; ctx.emit("fx", { position: { ...f.feetPosition, y: f.feetPosition.y + 0.5 }, script: SPARK }); }
    if (now - s.dead > 9000) { ctx.emit("fx", { position: { ...f.feetPosition, y: f.feetPosition.y + 0.6 }, script: SMOKE }); ctx.destroy(f.id); }
    return;
  }
  if (mem.hp != null && s.hp < mem.hp) { f.anim.hurt = { clip: "cdn/clip-hit-react.glb", loop: false, weight: 0.9, blend: 0.05 }; mem.hurtAt = now; s.alert = now;
    ctx.emit("fx", { position: { ...f.feetPosition, y: f.feetPosition.y + 1.3 }, script: SPARK }); if (ctx.random() < 0.5) speak(ctx, f, "hurt", now, mem); }
  mem.hp = s.hp;
  if (mem.hurtAt && now - mem.hurtAt > 600) { f.anim.hurt = null; mem.hurtAt = 0; }
  let prey = null, best = 1e9;
  for (const p of players) { const d = flat(p.feetPosition, f.feetPosition); if (d < best && (sees(ctx, f, p, d) || (s.alert && now - s.alert < W.forget && d < W.sight * 1.4))) { best = d; prey = p; } }
  if (prey && sees(ctx, f, prey, best)) { if (!s.alert || now - s.alert > W.forget) speak(ctx, f, "spot", now, mem); s.alert = now; }
  let goal = null, speed = 0;
  if (prey) {
    if (best > W.zapMax) { goal = prey.feetPosition; speed = W.chase; } else if (best > W.shoveAt + 0.4 && best > W.zapMin) { goal = prey.feetPosition; speed = W.walk * 0.6; } else if (best > W.shoveAt) { goal = prey.feetPosition; speed = W.chase; }
    f.rotation = { yaw: (Math.atan2(-(prey.feetPosition.x - f.feetPosition.x), -(prey.feetPosition.z - f.feetPosition.z)) * 180) / Math.PI };
  } else {
    const r = s.route ?? []; if (r.length) { const t = r[(s.leg ?? 0) % r.length]; if (Math.hypot(t[0] - f.feetPosition.x, t[1] - f.feetPosition.z) < 0.6) s.leg = ((s.leg ?? 0) + 1) % r.length; else { goal = { x: t[0], z: t[1] }; speed = W.walk; } }
    if (goal) f.rotation = { yaw: (Math.atan2(-(goal.x - f.feetPosition.x), -(goal.z - f.feetPosition.z)) * 180) / Math.PI };
    if (ctx.random() < dt / 25) speak(ctx, f, "idle", now, mem);
  }
  let vx = 0, vz = 0;
  if (goal && speed) { const d = Math.max(0.01, flat(goal, f.feetPosition)); vx = ((goal.x - f.feetPosition.x) / d) * speed; vz = ((goal.z - f.feetPosition.z) / d) * speed; }
  f.velocity = { x: vx, y: f.grounded ? 0 : (f.velocity?.y ?? 0) + g * dt, z: vz };
  play(f, mem, speed > 2 ? "run" : speed ? "walk" : "idle", `cdn/clip-${speed > 2 ? "run" : speed ? "walk" : "idle"}-loop.glb`);
  if (mem.armAt && now - mem.armAt > 700) { f.anim.arm = null; mem.armAt = 0; }
  if (!prey || now < (s.nextHit ?? 0)) return;
  const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.1, z: prey.feetPosition.z };
  if (best <= W.shoveAt) { // the shove: both arms, a hard push back
    s.nextHit = now + W.shoveCd * 1000; mem.armAt = now;
    f.anim.arm = { clip: "cdn/clip-attack.glb", loop: false, weight: 1, mask: "Spine", blend: 0.05 };
    const dmg = dmgAfterArmor(prey.state.look, W.shoveDmg); prey.state.hp -= dmg;
    const dx = prey.feetPosition.x - f.feetPosition.x, dz = prey.feetPosition.z - f.feetPosition.z, n = Math.max(0.01, Math.hypot(dx, dz));
    ctx.emit("impulse", { target: prey.id, impulse: { x: (dx / n) * 420, y: 120, z: (dz / n) * 420 } });
    ctx.emit("damageNumber", { position: at, value: dmg, color: "#ff4040" });
    ctx.emit("playSound", { clip: SND("heavy-metal-robot-arm-clang-shove-impact"), position: at, volume: 0.9 });
    ctx.emit("cameraPunch", { direction: { x: dx, y: 0.2, z: dz }, intensity: 0.6 }, { audience: { player: prey.id } });
    if (ctx.random() < 0.4) speak(ctx, f, "attack", now, mem);
  } else if (best <= W.zapMax && sees(ctx, f, prey, best)) { // the zap: the right arm comes up, a bolt crosses
    s.nextHit = now + W.zapCd * (0.85 + ctx.random() * 0.3) * 1000; mem.armAt = now;
    f.anim.arm = { clip: "cdn/clip-rifle-fire-01972c51.glb", loop: false, weight: 1, mask: "RightShoulder", blend: 0.05 };
    const yaw = ((f.rotation?.yaw ?? 0) * Math.PI) / 180, muzzle = { x: f.feetPosition.x - Math.sin(yaw) * 0.5 + Math.cos(yaw) * 0.3, y: f.feetPosition.y + 1.3, z: f.feetPosition.z - Math.cos(yaw) * 0.5 - Math.sin(yaw) * 0.3 };
    const sp = Math.hypot(prey.velocity?.x ?? 0, prey.velocity?.z ?? 0), hits = ctx.random() > 0.12 * (best / 4) * (sp > 3 ? 1.6 : 1);
    const end = hits ? at : { x: at.x + (ctx.random() - 0.5) * 1.6, y: at.y + (ctx.random() - 0.3), z: at.z + (ctx.random() - 0.5) * 1.6 }, L = Math.hypot(end.x - muzzle.x, end.y - muzzle.y, end.z - muzzle.z);
    ctx.spawn({ feetPosition: { x: (muzzle.x + end.x) / 2, y: (muzzle.y + end.y) / 2 - 0.02, z: (muzzle.z + end.z) / 2 }, pivot: "center", rotation: { lookAt: end, include: ["yaw", "pitch"] }, primitive: { kind: "box", width: 0.04, height: 0.04, depth: L }, material: { color: "oklch(0.88 0.12 230)", emissive: "oklch(0.88 0.12 230)", emissiveIntensity: 5 }, lifetime: 0.09 });
    ctx.emit("fx", { position: end, script: SPARK });
    ctx.emit("playSound", { clip: ZAP, position: muzzle, volume: 0.85, pitch: 1.2, mode: "overlap" });
    if (hits) { const dmg = dmgAfterArmor(prey.state.look, W.zapDmg); prey.state.hp -= dmg; ctx.emit("damageNumber", { position: at, value: dmg, color: "#7fd0ff" }); }
    if (ctx.random() < 0.3) speak(ctx, f, "attack", now, mem);
  }
}
function walker(ctx, f, players, now, dt, g, mem) {
  const s = f.state, B = s.brain; if (!B) return;
  if ((s.hp ?? 1) <= 0) {
    if (!s.dead) { s.dead = now; f.anim.base = { clip: "cdn/clip-die.glb", loop: false, weight: 1, blend: 0.15 }; ctx.emit("playSound", { clip: SND("wet-creature-death-gurgle"), position: f.feetPosition, volume: 0.8 }); }
    f.velocity = { x: 0, y: f.grounded ? 0 : (f.velocity?.y ?? 0) + g * dt, z: 0 };
    if (now - s.dead > 2500) { ctx.emit("fx", { position: { ...f.feetPosition, y: f.feetPosition.y + 0.6 }, script: SMOKE }); ctx.destroy(f.id); }
    return;
  }
  let prey = null, best = 14;
  for (const p of players) { const d = flat(p.feetPosition, f.feetPosition); if (d < best) { best = d; prey = p; } }
  const moving = prey && best > B.reach * 0.85; let vx = 0, vz = 0;
  if (moving) { const k = B.speed / best; vx = (prey.feetPosition.x - f.feetPosition.x) * k; vz = (prey.feetPosition.z - f.feetPosition.z) * k; }
  if (prey) f.rotation = { yaw: (Math.atan2(-(prey.feetPosition.x - f.feetPosition.x), -(prey.feetPosition.z - f.feetPosition.z)) * 180) / Math.PI };
  f.velocity = { x: vx, y: f.grounded ? 0 : (f.velocity?.y ?? 0) + g * dt, z: vz };
  play(f, mem, moving ? (B.speed > 2.5 ? "run" : "walk") : "idle", `cdn/clip-${moving ? (B.speed > 2.5 ? "run" : "walk") : "idle"}-loop.glb`);
  if (prey && best <= B.reach && now >= (s.nextBite ?? 0)) {
    s.nextBite = now + B.cd * 1000;
    const dmg = dmgAfterArmor(prey.state.look, B.dmg), at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.1, z: prey.feetPosition.z };
    prey.state.hp -= dmg; f.anim.arm = { clip: "cdn/clip-attack.glb", loop: false, weight: 1, mask: "Spine", blend: 0.05 };
    ctx.emit("damageNumber", { position: at, value: dmg, color: "#ff4040" });
    ctx.emit("playSound", { clip: SND("animal-bite-flesh-tear"), position: at, volume: 0.9 });
  }
}
