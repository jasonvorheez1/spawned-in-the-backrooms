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
pop flash burst=1 life=.22 size=3 col=hdr(9,6,3) a=1>0 sz=$size*(.4>1.6) r=sprite(soft-disc,add)
pop fire burst=18..24 on=sphere(.35) life=.35..0.7 v=sdir()*(1.5..3.5)+up(.6) size=.4..0.8 acc=buoy(1.2)+drag(2) col=hdr(5,2.6,.7)>.4:hdr(2.4,.8,.15)>hdr(.5,.12,.03) a=1>.5:.8>0 sz=$size*(.6>1.5) rot=spin(.4) r=sprite(flame-wisp,add)
pop shard burst=24..34 on=sphere(.15) life=.8..1.4 v=sdir()*(2.5..6)+up(1..2) size=.02..0.06 spin=-12..12 acc=grav()+drag(.3) col=<.55,.58,.62> a=1>.8:1>0 sz=$size rot=$age*$spin floor=bounce(.2) r=mesh(box,1,.3,.7)
pop spark burst=30 on=sphere(.2) life=.3..0.8 v=sdir()*(3..7) size=.015..0.03 acc=grav()*.6 col=hdr(7,4,1.5) a=1>0 floor=die r=sprite(ember,add,velocity,.02)
pop smoke burst=10 on=sphere(.35) life=1.5..2.6 v=up(.6..1.2)+sdir()*.5 size=.35..0.7 acc=buoy(.4)+curl(.3)+drag(1.1) col=<.16,.16,.18> a=0>.55:.4>0 sz=$size*(.6>2.8) r=sprite(smoke-puff,alpha)
pop glow burst=1 life=.5 r=light(<1,.6,.3>,60*(1>0),10)`; // every pop ends: no floor=stick, so the effect finishes and nothing lingers
const CHARGE = (c) => `fx
pop c burst=14 on=sphere(.5) life=.5..0.9 v=<0,0,0> acc=attract(3) size=.02..0.04 col=hdr(${c}) a=0>1:1>0 r=sprite(ember,add)
pop glow burst=1 life=1 r=light(<${c}>,6*(0>1),4)`;
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const say = (ctx, d, kind) => { // one sentry line from the drone itself, never two over each other
  const list = V[kind], m = (ctx.self.session.voice ??= {}); if (!list?.length) return;
  if (d.state.dead || (d.state.hp ?? 1) <= 0) return; // KO'd: silent (Shelly, Nov 9)
  if (ctx.now() - (m[d.id] ?? -1e9) < T.voiceGap * 1000) return; m[d.id] = ctx.now();
  (ctx.self.session.vid ??= {})[d.id] = ctx.emit("playSound", { clip: list[Math.floor(ctx.random() * list.length)], position: d.feetPosition, volume: 1, refDistance: 3, maxDistance: 30, bus: "Voice" });
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
function blast(ctx, d, t, f) { // the ko: a fireball that hurts every player and drone in reach, falling off with distance
  const B = T.blast, big = t.size / 0.75;
  ctx.spawn({ feetPosition: f, fx: { script: BOOM }, lifetime: 3, tags: ["zboom"] }); // a row with a lifetime: the blast is gone 3 s later, whatever the effect does
  ctx.emit("shockwave", { position: f, speed: 9, thickness: 0.4, intensity: 0.5 * big });
  ctx.emit("playSound", { clip: SND("small-drone-explodes-metal-burst-sparks"), position: f, volume: 1, maxDistance: 50 });
  for (const p of ctx.place.players ?? []) {
    const c = chest(p), r = Math.hypot(c.x - f.x, c.y - f.y, c.z - f.z), k = 1 - r / (B.radius * big);
    if (k <= 0) continue;
    const dmg = Math.round(B.dmg * big * k); p.state.hp -= dmg; p.state.hurtAt = ctx.now();
    ctx.emit("damageNumber", { position: c, value: dmg, color: "#ffb347" });
    ctx.emit("screenShake", { intensity: 0.5 * k, duration: 0.35 }, { audience: { player: p.id } });
    ctx.emit("impulse", { target: p.id, impulse: { x: (c.x - f.x) / (r || 1) * 6 * k, y: 3 * k, z: (c.z - f.z) / (r || 1) * 6 * k } });
  }
  for (const o of ctx.query({ tags: ["zdrone"], center: f, radius: B.radius * big })) if (o.id !== d.id && !o.state.dead) { o.state.hp -= B.drone * big; ctx.emit("damageNumber", { position: o.feetPosition, value: B.drone * big, color: "#ffb347" }); }
  for (const o of ctx.query({ tags: ["loose"], center: f, radius: B.radius * big })) ctx.emit("impulse", { target: o.id, impulse: { x: (o.feetPosition.x - f.x) * 8, y: 6, z: (o.feetPosition.z - f.z) * 8 } });
}
function die(ctx, d, t) {
  const f = { ...d.feetPosition };
  blast(ctx, d, t, f);
  const items = (t.drops ?? []).filter(([, c]) => ctx.random() < c).map(([k]) => k);
  spawnRubble(ctx, { x: f.x, y: 0.02, z: f.z }, items, `${t.name} wreck`);
  delete ctx.self.session.m?.[d.id];
  ctx.place.state.droneGone = { ...(ctx.place.state.droneGone ?? {}), [d.id]: ctx.now() }; // the sim refills the post an hour on
  ctx.destroy(d.id);
}
const SMOKE = `fx
pop smoke rate=40 on=point() life=.6..1.1 v=up(.3)+sdir()*.3 size=.12..0.2 acc=buoy(.2)+drag(1) col=<.12,.12,.13> a=0>.6:.5>0 sz=$size*(1>2.6) r=sprite(smoke-puff,alpha)
pop spark rate=30 on=point() life=.15..0.35 v=sdir()*(2..4) size=.012..0.02 acc=grav() col=hdr(6,3.5,1.2) a=1>0 r=sprite(ember,add,velocity,.02)`;
const free = (ctx, d, from, dir, dist, size) => { const w = raycast(ctx, from, dir, { distance: dist + size * 0.6, ignoreEntities: [d.id], physicsOnly: true }); return !w ? dist : Math.max(0, w.distance - size * 0.6); };
function call(ctx, d, tgt, at) { // backup: every drone in earshot learns where you are
  for (const o of ctx.query({ tags: ["zdrone"], center: d.feetPosition, radius: T.backup })) {
    if (o.id === d.id || o.state.dead || o.state.mode === "combat") continue;
    o.state.mode = "alert"; o.state.target = tgt.id; o.state.last = { x: at.x, z: at.z };
    const mm = (ctx.self.session.m ??= {})[o.id] ??= { bob: ctx.random() * 6 }; mm.alertAt = ctx.now(); mm.saw = ctx.now();
  }
}
export function update(ctx, dt) {
  const now = ctx.now(), players = ctx.place.players ?? [], M = (ctx.self.session.m ??= {});
  const all = ctx.query({ tags: ["zdrone"], radius: 1e4, center: { x: 0, y: 0, z: 0 } });
  all.forEach((row, idx) => {
    const d = ctx.getObject(row.id); if (!d) return;
    const s = d.state, t = T[s.type] ?? T.watcher, f = d.feetPosition, m = (M[d.id] ??= { bob: ctx.random() * 6, slot: idx });
    // ko: a smoking spiral, then the blast
    if (s.hp <= 0 || s.dead) {
      if (!m.fallAt) { m.fallAt = now; s.dead = true; s.mode = "down"; d.fx = { script: SMOKE }; const vid = ctx.self.session.vid?.[d.id]; if (vid) ctx.emit("stopSound", { soundId: vid }); ctx.emit("playSound", { clip: SND("damaged-drone-rotor-sputtering-failing-whine"), position: f, volume: 1, maxDistance: 30 }); }
      const k = Math.min(1, (now - m.fallAt) / (T.fall * 1000));
      d.feetPosition = { x: f.x, y: Math.max(0.25, t.hover * (1 - k * k)), z: f.z }; d.rotation = { yaw: (d.rotation?.yaw ?? 0) + 900 * dt, roll: 35 * k };
      if (k >= 1) die(ctx, d, t);
      return;
    }
    if (s.lastHp != null && s.hp < s.lastHp) { // hurt: it squeals, sparks, juke sideways, and turns on you
      if (ctx.random() < 0.5) say(ctx, d, "hit"); ctx.emit("fx", { position: f, script: SPARKS });
      if (s.mode !== "combat") { s.mode = "combat"; m.saw = now; const p = players.reduce((a, q) => (!a || Math.hypot(q.feetPosition.x - f.x, q.feetPosition.z - f.z) < Math.hypot(a.feetPosition.x - f.x, a.feetPosition.z - f.z) ? q : a), null); if (p) { s.target = p.id; call(ctx, d, p, p.feetPosition); } }
      { const q = players.reduce((a, b) => (!a || Math.hypot(b.feetPosition.x - f.x, b.feetPosition.z - f.z) < Math.hypot(a.feetPosition.x - f.x, a.feetPosition.z - f.z) ? b : a), null); if (q) { s.last = { x: q.feetPosition.x, z: q.feetPosition.z }; m.saw = now } } // every hit tells it where the shooter is, in sight or not
      if (now > (m.dodgeCd ?? 0) && ctx.random() < T.dodge.chance) { m.dodgeCd = now + T.dodge.cd * 1000; const side = ctx.random() < 0.5 ? -1 : 1, yaw = (d.rotation?.yaw ?? 0) * Math.PI / 180; m.dodge = { x: Math.cos(yaw) * side, z: -Math.sin(yaw) * side, until: now + 280 }; }
      if (s.hp < s.maxHp * 0.5 && !m.hurtFx) { m.hurtFx = true; d.fx = { script: SMOKE.replace("rate=40", "rate=8").replace("rate=30", "rate=4") }; } // smoking when half gone
    }
    s.lastHp = s.hp;
    // who it hunts: the nearest player it can see
    let tgt = null, best = 1e9;
    for (const p of players) { const dd = Math.hypot(p.feetPosition.x - f.x, p.feetPosition.z - f.z); if (dd < best && (p.state?.hp ?? 1) > 0 && sees(ctx, d, p, s.mode === "combat" ? t.sight * 1.4 : t.sight)) { best = dd; tgt = p; } }
    if (tgt) { m.saw = now; s.target = tgt.id; s.last = { x: tgt.feetPosition.x, z: tgt.feetPosition.z }; }
    if (tgt && (s.mode === "idle" || s.mode === "search" || !s.mode)) { s.mode = "alert"; m.alertAt = now; say(ctx, d, "normaltoalert"); call(ctx, d, tgt, tgt.feetPosition); }
    if (s.mode === "alert" && tgt && now - (m.alertAt ?? 0) > T.alertFor * 1000) { s.mode = "combat"; say(ctx, d, "alerttocombat"); m.next = now + 300; }
    if ((s.mode === "combat" || s.mode === "alert") && !tgt && now - (m.saw ?? 0) > (s.mode === "alert" ? 8000 : T.lostAfter * 1000)) { s.mode = "search"; m.searchAt = now; say(ctx, d, "combattolost"); }
    if (s.mode === "search" && now - (m.searchAt ?? 0) > T.searchFor * 1000) { s.mode = "idle"; s.target = null; s.last = null; }
    m.bob += dt * 2.2;
    // where it goes
    const kami = s.type === "watcher" && s.hp < s.maxHp * T.kamikaze && tgt && s.mode === "combat";
    let goal = s.home, speed = t.speed;
    if (kami) { goal = tgt.feetPosition; speed = t.speed * 2.6; if (!m.kamiSaid) { m.kamiSaid = true; say(ctx, d, "attack"); ctx.emit("playSound", { clip: SND("drone-overload-beeping-faster-alarm"), position: f, volume: 1, maxDistance: 25 }); } if (best < 1.4) { s.hp = 0; return; } }
    else if (tgt && s.mode === "combat") { // each drone takes its own bearing round you: two drones never stack, they pinch
      const tp = tgt.feetPosition, base = Math.atan2(f.z - tp.z, f.x - tp.x), off = ((m.slot % 3) - 1) * 0.7 + Math.sin(now / 1900 + m.bob) * 0.35;
      const a = base + off * dt * 2, r = s.hp < s.maxHp * 0.35 && s.type !== "watcher" ? t.keep * 1.4 : t.keep; // a hurt enforcer or warden backs off
      goal = { x: tp.x + Math.cos(a + off * 0.15) * r, z: tp.z + Math.sin(a + off * 0.15) * r };
    } else if ((s.mode === "search" || ((s.mode === "alert" || s.mode === "combat") && !tgt)) && s.last) goal = { x: s.last.x + Math.cos(now / 1500 + m.bob) * 2, z: s.last.z + Math.sin(now / 1500 + m.bob) * 2 }; // circles where you were
    else goal = { x: s.home.x + Math.cos(now / 4000 + m.bob) * 1.5, z: s.home.z + Math.sin(now / 4000 + m.bob) * 1.5 };
    let nx = f.x, nz = f.z;
    if (m.dodge && now < m.dodge.until) { const dir = { x: m.dodge.x, y: 0, z: m.dodge.z }, st = free(ctx, d, f, dir, T.dodge.dist * dt / 0.28, t.size); nx += dir.x * st; nz += dir.z * st; }
    else {
      const gx = goal.x - f.x, gz = goal.z - f.z, gd = Math.hypot(gx, gz);
      if (gd > 0.05) { // steer: straight if it can, else slide along the wall
        const want = Math.min(gd, speed * dt), dir = { x: gx / gd, y: 0, z: gz / gd };
        let st = free(ctx, d, f, dir, want, t.size);
        if (st >= want * 0.9) { nx += dir.x * st; nz += dir.z * st; }
        else for (const sd of [1, -1]) { const sl = { x: -dir.z * sd, y: 0, z: dir.x * sd }; const s2 = free(ctx, d, f, sl, want, t.size); if (s2 > want * 0.5) { nx += sl.x * s2; nz += sl.z * s2; break; } }
      }
      // keep apart from the other drones
      for (const o of all) { if (o.id === d.id) continue; const ox = nx - o.feetPosition.x, oz = nz - o.feetPosition.z, od = Math.hypot(ox, oz); if (od > 0.01 && od < 1.4) { nx += ox / od * 0.6 * dt; nz += oz / od * 0.6 * dt; } }
    }
    d.feetPosition = { x: nx, y: t.hover + Math.sin(m.bob) * 0.08 + (kami ? -0.6 : 0), z: nz };
    const look = tgt ? tgt.feetPosition : goal;
    if (Math.hypot(look.x - nx, look.z - nz) > 0.2) d.rotation = { yaw: Math.atan2(-(look.x - nx), -(look.z - nz)) * 180 / Math.PI, roll: m.dodge && now < m.dodge.until ? 25 : 0 };
    if (kami) return;
    // the volley: it leads a running target a little
    if (s.mode === "combat" && tgt && now >= (m.next ?? 0)) {
      if (t.charge && !m.chargeAt) { m.chargeAt = now; ctx.emit("fx", { position: f, script: CHARGE(hex(t.beam).map((v) => (v * 4).toFixed(2)).join(",")) }); ctx.emit("playSound", { clip: SND("energy-weapon-charging-rising-whine"), position: f, volume: 0.9, maxDistance: 30 }); return; }
      if (t.charge && now - m.chargeAt < t.charge * 1000) return;
      if (!sees(ctx, d, tgt, t.sight * 1.4)) { m.chargeAt = 0; m.next = now + 400; return; }
      m.chargeAt = 0; m.shots = t.burst; m.shotAt = 0; m.next = now + (t.cool + t.burst * t.gap) * 1000 * (0.85 + ctx.random() * 0.3);
      if (ctx.random() < 0.3) say(ctx, d, "attack");
    }
    if (m.shots > 0 && tgt && now >= (m.shotAt ?? 0)) { m.shots -= 1; m.shotAt = now + t.gap * 1000; bolt(ctx, d, t, tgt); }
  });
}
