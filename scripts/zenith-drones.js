// Zenith Station's security drones, one manager (places/level01/sim.js lays it with the drones). Each row tagged zdrone hovers its post
// (state.home), spots a player in sight, says so in the sentry bot's voice (Shelly's pack, scripts/lib/data/zenith-voice.yml), keeps its
// range and fires laser volleys. Hits on it land through scripts/player.js hitTarget like any foe; at 0 hp it bursts and drops cells.
// Types and numbers: scripts/lib/data/zenith-drones.yml.
import { raycast } from "builtin/physics";
import T from "./lib/data/zenith-drones.yml";
import V from "./lib/data/zenith-voice.yml";
import { spawnRubble } from "./lib/breakables.js";
export const updateSchedule = { every: { seconds: 0.1 } };
const SND = (n) => `/cdn/moodboard-scifi-neon/sfx-${n}.mp3`;
const SPARKS = `fx
pop spark burst=10..16 on=point() life=.15..0.4 v=sdir()*(2..5) size=.012..0.025 acc=grav()*.7 col=hdr(6,4,2) a=1>0 floor=bounce(.3) r=sprite(ember,add,velocity,.02)
pop smoke burst=2 life=.5..0.9 v=up(.4) size=.08..0.14 acc=buoy(.3)+drag(1.4) col=<.3,.3,.32> a=0>.4:.4>0 sz=$size*(1>2) r=sprite(smoke-puff,alpha)`;
const BOOM = `fx
pop flash burst=1 life=.18 size=1.6 col=hdr(8,5,3) a=1>0 sz=$size*(.4>1.4) r=sprite(soft-disc,add)
pop shard burst=24..34 on=sphere(.15) life=.7..1.4 v=sdir()*(2.5..6)+up(1..2) size=.02..0.06 spin=-12..12 acc=grav()+drag(.3) col=<.55,.58,.62> a=1 sz=$size rot=$age*$spin floor=stick r=mesh(box,1,.3,.7)
pop spark burst=30 on=sphere(.2) life=.3..0.8 v=sdir()*(3..7) size=.015..0.03 acc=grav()*.6 col=hdr(7,4,1.5) a=1>0 floor=bounce(.3) r=sprite(ember,add,velocity,.02)
pop smoke burst=8 on=sphere(.3) life=1.5..2.6 v=up(.6..1.2)+sdir()*.4 size=.3..0.6 acc=buoy(.4)+curl(.3)+drag(1.1) col=<.18,.18,.2> a=0>.55:.4>0 sz=$size*(.6>2.6) r=sprite(smoke-puff,alpha)
pop glow n=1 life=.4 r=light(<1,.6,.3>,40*(1>0),8)`;
const CHARGE = (c) => `fx
pop c burst=14 on=sphere(.5) life=.5..0.9 v=<0,0,0> attract(3) size=.02..0.04 col=hdr(${c}) a=0>1:1>0 r=sprite(ember,add)
pop glow n=1 life=1 r=light(<${c}>,6*(0>1),4)`;
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const say = (ctx, d, kind) => { // one sentry line from the drone itself, never two over each other
  const list = V[kind], m = (ctx.self.session.voice ??= {}); if (!list?.length) return;
  if (ctx.now() - (m[d.id] ?? -1e9) < T.voiceGap * 1000) return; m[d.id] = ctx.now();
  ctx.emit("playSound", { clip: list[Math.floor(ctx.random() * list.length)], position: d.feetPosition, volume: 1, refDistance: 3, maxDistance: 30, bus: "Voice" });
};
const chest = (p) => ({ x: p.feetPosition.x, y: p.feetPosition.y + 1.3, z: p.feetPosition.z });
function sees(ctx, d, p, range) {
  const a = d.feetPosition, b = chest(p), dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, dist = Math.hypot(dx, dy, dz);
  if (dist > range) return false;
  const hit = raycast(ctx, a, { x: dx / dist, y: dy / dist, z: dz / dist }, { distance: dist, ignoreEntities: [d.id], physicsOnly: true });
  return !hit || hit.id === p.id || hit.distance > dist - 0.6;
}
function bolt(ctx, d, t, p) { // one laser bolt: a beam from the drone to where it lands, the zap, and the hurt if it hits
  const a = { ...d.feetPosition }, c = chest(p), mv = Math.hypot(p.velocity?.x ?? 0, p.velocity?.z ?? 0);
  const chance = t.aim * (p.state?.crouch ? 0.8 : 1) * (1 - Math.min(0.45, mv / 12));
  const hitP = ctx.random() < chance;
  const end = hitP ? c : { x: c.x + (ctx.random() - 0.5) * 2.4, y: c.y + (ctx.random() - 0.3) * 1.4, z: c.z + (ctx.random() - 0.5) * 2.4 };
  let dx = end.x - a.x, dy = end.y - a.y, dz = end.z - a.z, len = Math.hypot(dx, dy, dz) || 1;
  if (!hitP) { const w = raycast(ctx, a, { x: dx / len, y: dy / len, z: dz / len }, { distance: len + 6, ignoreEntities: [d.id], physicsOnly: true }); if (w) { end.x = w.position.x; end.y = w.position.y; end.z = w.position.z; dx = end.x - a.x; dy = end.y - a.y; dz = end.z - a.z; len = Math.hypot(dx, dy, dz) || 1; } }
  const mid = { x: (a.x + end.x) / 2, y: (a.y + end.y) / 2, z: (a.z + end.z) / 2 };
  ctx.spawn({ feetPosition: mid, pivot: "center", rotation: { lookAt: end, include: ["yaw", "pitch"] }, primitive: { kind: "box", width: t.size > 1 ? 0.07 : 0.035, height: t.size > 1 ? 0.07 : 0.035, depth: len }, material: { color: t.beam, emissive: t.beam, emissiveIntensity: 9, roughness: 1 }, castShadow: false, lifetime: t.size > 1 ? 0.22 : 0.12 });
  ctx.emit("playSound", { clip: SND(t.size > 1 ? "heavy-plasma-laser-cannon-blast-deep" : "sci-fi-laser-blaster-zap-shot"), position: a, volume: 0.85, maxDistance: 40, mode: "overlap" });
  ctx.emit("fx", { position: end, script: SPARKS });
  if (!hitP) return;
  if (p.state.downAt && ctx.now() - p.state.downAt < 3000) return;
  const dmg = Math.round(t.dmg * (0.9 + ctx.random() * 0.2));
  p.state.hp -= dmg; // stepped, never assigned: player.js reads hp <= 0 as the fall
  p.state.hurtAt = ctx.now();
  ctx.emit("damageNumber", { position: c, value: dmg, color: "#ff5a5a" });
  ctx.emit("playSound", { clip: SND("laser-burn-hit-sizzle-on-flesh"), volume: 0.7 }, { audience: { player: p.id } });
  ctx.emit("screenFlash", { color: t.beam, duration: 0.15, intensity: t.size > 1 ? 0.4 : 0.2 }, { audience: { player: p.id } });
  ctx.emit("cameraPunch", { direction: { x: dx / len, y: 0, z: dz / len }, intensity: t.size > 1 ? 0.5 : 0.22 }, { audience: { player: p.id } });
}
function die(ctx, d, t) {
  const f = d.feetPosition;
  say(ctx, d, "death");
  ctx.emit("fx", { position: f, script: BOOM });
  ctx.emit("shockwave", { position: f, speed: 7, thickness: 0.3, intensity: 0.35 });
  ctx.emit("playSound", { clip: SND("small-drone-explodes-metal-burst-sparks"), position: f, volume: 1, maxDistance: 45 });
  const items = (t.drops ?? []).filter(([, c]) => ctx.random() < c).map(([k]) => k);
  spawnRubble(ctx, { x: f.x, y: 0.02, z: f.z }, items, `${t.name} wreck`);
  ctx.destroy(d.id);
}
export function update(ctx, dt) {
  const now = ctx.now(), players = ctx.place.players ?? [];
  for (const row of ctx.query({ tags: ["zdrone"], radius: 1e4, center: { x: 0, y: 0, z: 0 } })) {
    const d = ctx.getObject(row.id); if (!d) continue;
    const s = d.state, t = T[s.type] ?? T.watcher, f = d.feetPosition, M = (ctx.self.session.m ??= {}), m = (M[d.id] ??= { bob: ctx.random() * 6 });
    if (s.dead || s.hp <= 0) { die(ctx, d, t); continue; }
    if (s.lastHp != null && s.hp < s.lastHp) { if (ctx.random() < 0.5) say(ctx, d, "hit"); ctx.emit("fx", { position: f, script: SPARKS }); if (!s.target) { s.mode = "combat"; m.saw = now; } }
    s.lastHp = s.hp;
    // who it hunts: the nearest player it can see
    let tgt = null, best = 1e9;
    for (const p of players) { const dd = Math.hypot(p.feetPosition.x - f.x, p.feetPosition.z - f.z); if (dd < best && (p.state?.hp ?? 1) > 0 && sees(ctx, d, p, s.mode === "combat" ? t.sight * 1.4 : t.sight)) { best = dd; tgt = p; } }
    if (!tgt && s.mode === "combat" && s.target) { const p = players.find((q) => q.id === s.target); if (p && now - (m.saw ?? 0) < T.lostAfter * 1000) tgt = p; }
    else if (tgt) m.saw = now;
    if (tgt && s.mode !== "combat" && s.mode !== "alert") { s.mode = "alert"; m.alertAt = now; say(ctx, d, "normaltoalert"); }
    if (s.mode === "alert" && tgt && now - m.alertAt > T.alertFor * 1000) { s.mode = "combat"; say(ctx, d, "alerttocombat"); m.next = now + 300; }
    if (s.mode === "combat" && !tgt) { s.mode = "idle"; s.target = null; say(ctx, d, "combattolost"); }
    if (tgt) s.target = tgt.id;
    // where it goes: its post when idle, a ring at its keep range around the target in a fight, strafing
    m.bob += dt * 2.2;
    let goal = s.home;
    if (tgt && s.mode === "combat") {
      const tp = tgt.feetPosition, ax = f.x - tp.x, az = f.z - tp.z, dd = Math.hypot(ax, az) || 1, side = Math.sin(now / 1700 + m.bob) * 0.9;
      goal = { x: tp.x + (ax / dd) * t.keep - (az / dd) * side * 2, z: tp.z + (az / dd) * t.keep + (ax / dd) * side * 2 };
    } else if (!tgt) goal = { x: s.home.x + Math.cos(now / 4000 + m.bob) * 1.5, z: s.home.z + Math.sin(now / 4000 + m.bob) * 1.5 };
    const gx = goal.x - f.x, gz = goal.z - f.z, gd = Math.hypot(gx, gz), step = Math.min(gd, t.speed * dt);
    let nx = f.x, nz = f.z;
    if (gd > 0.05) {
      const dir = { x: gx / gd, y: 0, z: gz / gd }, wall = raycast(ctx, f, dir, { distance: step + t.size * 0.6, ignoreEntities: [d.id], physicsOnly: true });
      if (!wall || players.some((p) => p.id === wall.id)) { nx += dir.x * step; nz += dir.z * step; }
    }
    d.feetPosition = { x: nx, y: t.hover + Math.sin(m.bob) * 0.08, z: nz };
    const look = tgt ? tgt.feetPosition : goal;
    if (Math.hypot(look.x - nx, look.z - nz) > 0.2) d.rotation = { yaw: Math.atan2(-(look.x - nx), -(look.z - nz)) * 180 / Math.PI };
    // the volley
    if (s.mode === "combat" && tgt && now >= (m.next ?? 0)) {
      if (t.charge && !m.chargeAt) { m.chargeAt = now; ctx.emit("fx", { position: f, script: CHARGE(hex(t.beam).map((v) => (v * 4).toFixed(2)).join(",")) }); ctx.emit("playSound", { clip: SND("energy-weapon-charging-rising-whine"), position: f, volume: 0.9, maxDistance: 30 }); continue; }
      if (t.charge && now - m.chargeAt < t.charge * 1000) continue;
      if (!sees(ctx, d, tgt, t.sight * 1.4)) { m.chargeAt = 0; m.next = now + 400; continue; }
      m.chargeAt = 0; m.shots = t.burst; m.shotAt = 0; m.next = now + (t.cool + t.burst * t.gap) * 1000 * (0.85 + ctx.random() * 0.3);
      if (ctx.random() < 0.3) say(ctx, d, "attack");
    }
    if (m.shots > 0 && tgt && now >= (m.shotAt ?? 0)) { m.shots -= 1; m.shotAt = now + t.gap * 1000; bolt(ctx, d, t, tgt); }
  }
}
