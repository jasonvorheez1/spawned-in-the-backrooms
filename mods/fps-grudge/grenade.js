// ASHLINE frag grenade in flight: gravity, sweep-ahead raycast, bounce (restitution 0.35) and ground friction, rolls to rest,
// spins in the air; at state.fuseAt it explodes once: 100 at the centre falling linearly to 0 at 6 m, line of sight to the chest.
import { raycast } from "builtin/physics";
import { flinchDir } from "./lib/flinch.js";
import { explosion } from "./lib/fx.js";
import { hitSnd } from "./lib/hitsfx.js";
import * as RAG from "./lib/ragdoll.js";
import N from "./lib/data/grenades.yml";
const SND = "/cdn/moodboard-realistic-gritty/";
const RING = 12, R = 0.04, REST = 0.35, FRICTION = 0.45, RADIUS = 6, DMG = 100, SHAKE = 15, CHEST = 1.25;
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export function update(ctx, dt) {
  const me = ctx.self, s = me.state;
  if (s.exploded) return;
  if (ctx.now() >= (s.fuseAt ?? 0)) return s.kind === "flash" ? flashPop(ctx) : s.kind === "smoke" ? smokePop(ctx) : explode(ctx);
  if (s.rest) return;
  const g = ctx.place.gravity?.y ?? -24;
  const v = { ...(s.vel ?? { x: 0, y: 0, z: 0 }) };
  v.y += g * dt;
  const p = me.feetPosition;
  let speed = Math.hypot(v.x, v.y, v.z), step = speed * dt;
  let next = { x: p.x + v.x * dt, y: p.y + v.y * dt, z: p.z + v.z * dt };
  if (speed > 1e-4) {
    const dir = { x: v.x / speed, y: v.y / speed, z: v.z / speed };
    const hit = raycast(ctx, p, dir, { distance: step + R, bodies: s.impact ? "all" : "static", ignoreEntities: [me.id, s.ownerId].filter(Boolean) });
    if (hit && s.impact && (ctx.now() - (s.born ??= ctx.now())) > 0) { me.feetPosition = { x: hit.position.x + (hit.normal?.x ?? 0) * 0.1, y: hit.position.y + (hit.normal?.y ?? 1) * 0.1, z: hit.position.z + (hit.normal?.z ?? 0) * 0.1 }; return explode(ctx); } // a launched round bursts on what it strikes
    if (hit) {
      const n = hit.normal ?? { x: 0, y: 1, z: 0 }, vn = dot(v, n);
      if (vn < 0) {
        const tan = { x: v.x - vn * n.x, y: v.y - vn * n.y, z: v.z - vn * n.z };
        const keep = n.y > 0.6 ? 1 - FRICTION : 0.85;
        v.x = tan.x * keep - vn * REST * n.x; v.y = tan.y * keep - vn * REST * n.y; v.z = tan.z * keep - vn * REST * n.z;
        if (-vn > 1.5) ctx.emit("playSound", { clip: SND + "sfx-grenade-bounce-metal-clink.mp3", position: hit.position, volume: Math.min(0.8, -vn / 12), pitch: 0.9 + ctx.random() * 0.2 });
      }
      const back = Math.max(0, hit.distance - R);
      next = { x: p.x + dir.x * back + n.x * 0.002, y: p.y + dir.y * back + n.y * 0.002, z: p.z + dir.z * back + n.z * 0.002 };
      if (n.y > 0.6 && Math.hypot(v.x, v.y, v.z) < 0.6) { s.rest = true; s.vel = { x: 0, y: 0, z: 0 }; me.feetPosition = next; return; }
      if (n.y > 0.6 && Math.abs(v.y) < 1.2) v.y = 0; // rolling: stay on the ground, friction bleeds it
    }
  }
  s.vel = v;
  me.feetPosition = next;
  const flying = Math.abs(v.y) > 0.5, spin = (s.spin ?? 0) + dt * (flying ? 900 : Math.hypot(v.x, v.z) * 1400);
  s.spin = spin % 360;
  me.rotation = { yaw: (s.spin * 0.3) % 360, pitch: s.spin, roll: flying ? s.spin * 0.5 : 0 };
}
function explode(ctx) {
  const me = ctx.self, s = me.state, now = ctx.now();
  s.exploded = true;
  const c = { ...me.feetPosition };
  const eye = { x: c.x, y: c.y + 0.15, z: c.z };
  const owner = s.ownerId, team = s.team || "";
  const targets = [];
  for (const r of ctx.query({ tags: ["raider"], center: c, radius: RADIUS + 1 })) { const o = ctx.getObject(r.id); if (o && (o.state?.hp ?? 0) > 0 && !o.state?.dead) targets.push(o); }
  for (const pl of ctx.place.players) if (!pl.state?.dead && (pl.state?.hp ?? 100) > 0) targets.push(pl);
  const hits = [];
  for (const t of targets) {
    const f = t.feetPosition, chest = { x: f.x, y: f.y + CHEST, z: f.z };
    const dx = chest.x - eye.x, dy = chest.y - eye.y, dz = chest.z - eye.z, dist = Math.hypot(dx, dy, dz);
    const flat = Math.hypot(f.x - c.x, f.z - c.z), reach = Math.min(dist, Math.hypot(flat, Math.max(0, f.y - c.y)));
    if (reach >= RADIUS) continue;
    const isOwner = t.id === owner, tt = t.state?.team || "";
    if (!isOwner && team && tt && tt === team) continue; // no friendly fire, the thrower still eats their own
    if (dist > 0.05) {
      const blk = raycast(ctx, eye, { x: dx / dist, y: dy / dist, z: dz / dist }, { distance: dist, bodies: "static", physicsOnly: true, ignoreEntities: [me.id, t.id] });
      if (blk && blk.distance < dist - 0.3) { hits.push({ id: t.id, blocked: true }); continue; }
    }
    let d = Math.round(DMG * (1 - reach / RADIUS)); if (isOwner) d = Math.round(d / 2);
    if (d <= 0) continue;
    const st = t.state;
    st.hitFrom = { x: c.x, y: c.y, z: c.z };
    st.flinch = { dir: flinchDir(t.yaw ?? t.rotation?.yaw ?? 0, f, c), at: now };
    if (t.tags?.includes("player") || ctx.place.players.some((p) => p.id === t.id)) { st.hurtAt = now; st.hurtFrom = st.hitFrom; st.lastHitAt = now; }
    st.hp = (st.hp ?? 100) - d; st.lastHitBy = owner; st.hitAt = now;
    if (t.tags?.includes("raider")) RAG.mark(t, d, c, now);
    hits.push({ id: t.id, d, at: +reach.toFixed(2) });
  }
  ctx.log("grenade explode", { id: me.id, owner, pos: { x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2) }, hits });
  ctx.emit("fx", { position: c, script: explosion });
  ctx.emit("decal", { position: c, normal: { x: 0, y: 1, z: 0 }, texture: "cdn/texture-scorch-mark-blast-decal.png", size: 2.4, lifetime: 40, fade: 4 });
  ctx.emit("decal", { position: c, normal: { x: 0, y: 1, z: 0 }, texture: "cdn/texture-concrete-blast-crater-cracks-decal.png", size: 3.4, lifetime: 60, fade: 5 }); // the cracked crater the blast bit into the ground
  ctx.emit("shockwave", { position: eye, speed: 30, thickness: 1.2, intensity: 0.6 });
  ctx.emit("playSound", { clip: SND + "sfx-frag-grenade-explosion.mp3", position: c, volume: 1, maxDistance: 120 });
  for (let i = 0; i < 4; i++) ctx.after(0.35 + i * 0.22 + ctx.random() * 0.15, "debris", { x: c.x + (ctx.random() - 0.5) * 6, y: c.y, z: c.z + (ctx.random() - 0.5) * 6, i }); // the blast's chunks coming back down
  for (const pl of ctx.place.players) {
    const f = pl.feetPosition, dd = Math.hypot(f.x - c.x, f.y - c.y, f.z - c.z);
    if (dd < SHAKE) ctx.emit("screenShake", { intensity: 0.9 * (1 - dd / SHAKE), duration: 0.5 }, { audience: { player: pl.id } });
    if (dd < RING && !pl.state?.dead) { // close enough to ring the ears: louder and longer the nearer it went off
      const k = Math.min(1, 1.15 * (1 - dd / RING)); pl.state.ringAt = now; pl.state.ringK = +k.toFixed(2);
      ctx.emit("playSound", { clip: SND + "sfx-flashbang-tinnitus-ear-ringing.mp3", position: { x: f.x, y: f.y + 1.6, z: f.z }, volume: 0.2 + 0.6 * k, maxDistance: 4 }, { audience: { player: pl.id } });
    }
  }
  for (const r of ctx.query({ center: c, radius: RADIUS, excludeTags: ["raider", "player", "grenade", "smoke"] })) { // loose props get thrown off the blast
    const o = ctx.getObject(r.id); if (!o || o.physics?.body !== "dynamic") continue;
    const f = r.feetPosition, dx = f.x - c.x, dz = f.z - c.z, L = Math.hypot(dx, dz) || 1, k = (1 - Math.min(1, L / RADIUS)) * 14 * (o.measure?.mass ?? 20);
    ctx.emit("impulse", { target: r.id, impulse: { x: dx / L * k, y: k * 0.6, z: dz / L * k }, angularImpulse: { x: (ctx.random() - 0.5) * k * 0.2, y: 0, z: (ctx.random() - 0.5) * k * 0.2 } });
  }
  ctx.emit("noise", { position: c, radius: 60, kind: "explosion" }, { audience: { nearby: c, radius: 60 } });
  ctx.destroy(me.id);
}

export function debris(ctx, p) { hitSnd(ctx, p.i === 0 ? "heavy" : ctx.random() < 0.5 ? "heavy" : "stone", { x: p.x, y: p.y, z: p.z }, { volume: p.i === 0 ? 0.9 : 0.55, maxDistance: 50 }); }

// flashbang: one white pop; each player within radius with line of sight to it gets a screenFlash and a ring, sent to them alone,
// strength = nearness × facing (body yaw toward the pop). Raiders in sight are blinded (state.blindUntil, read by raiders.js).
const FLASH_FX = `fx
pop core burst=1 life=.18 size=3 col=hdr(8,8,7.5) a=1>0 sz=$size*(.6>1.4) r=sprite(soft-disc,add)
pop sparks burst=?mobile:14|28 life=.25..0.5 v=sdir()*(5..9) size=.03..0.06 acc=drag(3) col=hdr(6,5.5,4) a=1>0 r=sprite(ember,add,velocity,.03)
pop puff burst=4 life=1.2..2 v=sdir()*(.3..0.8) size=.5..0.9 acc=buoy(.4)+drag(1.5) sz=$size*(.6>2) col=<.75,.75,.72> a=0>.4:.1>.4:.6>0 r=sprite(smoke-puff,alpha)
pop glow burst=1 life=.25 r=light(<1,1,.95>,60*(1>0),18)`;
function flashPop(ctx) {
  const me = ctx.self, s = me.state, now = ctx.now(), F = N.flash;
  s.exploded = true;
  const c = { ...me.feetPosition }, eye = { x: c.x, y: c.y + 0.15, z: c.z };
  const sees = (to, ignore) => { const dx = to.x - eye.x, dy = to.y - eye.y, dz = to.z - eye.z, L = Math.hypot(dx, dy, dz); if (L < 0.05) return true; const h = raycast(ctx, eye, { x: dx / L, y: dy / L, z: dz / L }, { distance: L, bodies: "static", physicsOnly: true, ignoreEntities: [me.id, ignore] }); return !(h && h.distance < L - 0.3); };
  const hit = [];
  for (const pl of ctx.place.players) {
    if (pl.state?.dead) continue;
    const f = pl.feetPosition, pe = { x: f.x, y: f.y + 1.6, z: f.z }, d = Math.hypot(pe.x - c.x, pe.y - c.y, pe.z - c.z);
    if (d > F.radius || !sees(pe, pl.id)) continue;
    const yaw = (pl.rotation?.yaw ?? pl.yaw ?? 0) * Math.PI / 180, fx = -Math.sin(yaw), fz = -Math.cos(yaw), L = Math.hypot(c.x - f.x, c.z - f.z) || 1;
    const face = d < 2 ? 1 : Math.max(0, (fx * (c.x - f.x) + fz * (c.z - f.z)) / L), k = Math.sqrt(1 - d / F.radius) * (0.3 + 0.7 * face);
    if (k < 0.08) continue;
    ctx.emit("screenFlash", { color: "#ffffff", duration: Math.max(0.4, F.blind * k), intensity: Math.min(1, 0.35 + k) }, { audience: { player: pl.id } });
    pl.state.flashAt = now; pl.state.flashK = +k.toFixed(2); pl.state.flashMs = Math.round(Math.max(800, F.blind * 1000 * (0.6 + 1.4 * k))); pl.state.ringAt = now; pl.state.ringK = +Math.min(1, k + 0.2).toFixed(2); // the HUD's white burn, blur and ringing
    ctx.emit("playSound", { clip: SND + "sfx-flashbang-tinnitus-ear-ringing.mp3", position: pe, volume: Math.min(1, 0.3 + k), maxDistance: 4 }, { audience: { player: pl.id } });
    hit.push({ id: pl.id, k: +k.toFixed(2) });
  }
  for (const r of ctx.query({ tags: ["raider"], center: c, radius: F.radius })) { const o = ctx.getObject(r.id); const f = o?.feetPosition; if (!f || o.state?.dead) continue; const pe = { x: f.x, y: f.y + 1.5, z: f.z }; if (sees(pe, o.id)) { const k = 1 - Math.hypot(pe.x - c.x, pe.z - c.z) / F.radius; o.state.blindUntil = now + F.blind * 1000 * (0.4 + 0.6 * k); hit.push({ id: o.id, raider: true }); } }
  ctx.log("flashbang", { pos: { x: +c.x.toFixed(1), y: +c.y.toFixed(1), z: +c.z.toFixed(1) }, hit });
  ctx.emit("fx", { position: eye, script: FLASH_FX });
  ctx.emit("playSound", { clip: SND + "sfx-flashbang-bang-sharp-crack.mp3", position: c, volume: 1, maxDistance: 90 });
  ctx.emit("noise", { position: c, radius: 45, kind: "explosion" }, { audience: { nearby: c, radius: 45 } });
  ctx.destroy(me.id);
}
// smoke: the canister pops a grey cloud (radius, life from grenades.yml); the cloud row (tag smoke, state r/until) is what raiders.js tests sight against
function smokeFx(r) {
  const R = (r * 0.62).toFixed(2), R2 = (r * 0.9).toFixed(2);
  return `fx
pop bloom burst=?low:16|mobile:18|30 on=disc(${R}).c(1.4) life=9..12 v=sdir()*(.8..1.8)+up(.25) size=3..4.4 acc=drag(1)+curl(.2)*.3 sz=$size*(.3>1:.2>1.2) col=<.66,.66,.64>><.55,.55,.54> a=0>.95:.1>.95:.82>0 rot=spin(.05) r=sprite(smoke-puff,alpha)
pop body rate=?low:4|mobile:5|9 win=0;14 on=disc(${R2}).c(1.5) life=6..8 v=up(.1..0.3)+sdir()*.35 size=3.4..4.8 acc=drag(1)+curl(.25)*.3 sz=$size*(.5>1.15) col=<.62,.62,.6> a=0>.9:.15>.9:.8>0 rot=spin(.04) r=sprite(smoke-puff,alpha)
pop floor rate=?low:2|mobile:3|5 win=0;14 on=disc(${R2}).c(.4) life=6..9 v=sdir()*.25 size=2.6..3.6 acc=drag(1.4) sz=$size*(.6>1.2) col=<.58,.58,.56> a=0>.85:.2>.85:.8>0 rot=spin(.03) r=sprite(smoke-puff,alpha)
pop hiss rate=?mobile:8|16 win=0;4 life=.8..1.4 v=up(1.5..2.8)+cone(25)*(.4..1) size=.3..0.55 acc=drag(1.2) sz=$size*(.5>2.6) col=<.74,.74,.72> a=0>.7:.2>0 r=sprite(smoke-puff,alpha)`;
}
function smokePop(ctx) {
  // the canister becomes the cloud: a row spawned from here would die with it (spawned things die with their spawner),
  // so the grenade itself stays, stops moving, takes the "smoke" tag raiders.js and player.js read, and leaves when the cloud does
  const me = ctx.self, s = me.state, now = ctx.now(), S = N.smoke;
  const c = { ...me.feetPosition };
  me.state = { ...s, exploded: true, rest: true, vel: { x: 0, y: 0, z: 0 }, r: S.radius, until: now + S.life * 1000 };
  me.tags = [...(me.tags ?? []).filter((t) => t !== "grenade"), "smoke"];
  me.fx = { script: smokeFx(S.radius) };
  ctx.emit("playSound", { clip: SND + "sfx-smoke-grenade-hiss-release.mp3", position: c, volume: 0.5, maxDistance: 30 });
  ctx.after(S.life + 6, "vanish");
  ctx.log("smoke", { pos: { x: +c.x.toFixed(1), y: +c.y.toFixed(1), z: +c.z.toFixed(1) } });
}
export function vanish(ctx) { ctx.destroy(ctx.self.id); }
const nadeModelLocal = () => ({ model: N.smoke.model, layout: { maxExtents: { x: N.smoke.size, y: N.smoke.size, z: N.smoke.size } }, pivot: "center" });
