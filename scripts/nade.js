// Thrown frag grenades and molotovs (borrowed from FPS Grudge's flight, bounce and blast, rewired to this game's foes).
import { freshenerAt } from "./lib/remodel-quest.js";
// state: { kind: "frag" | "molotov" | "fire", vel, ownerId, fuseAt }. The blast doesn't judge kills itself: it sends the
// thrower a "blast" with every foe it reached, and the thrower's scripts/player.js lands each through hitTarget (XP, loot, ragdoll).
import { raycast } from "builtin/physics";
import T from "./lib/data/throwables.yml";
const SND = "/cdn/moodboard-realistic-gritty/";
const FOES = ["smiler", "lurker", "hound", "stealer", "moths", "l8spider", "l8-hostile", "npc", "l61fc", "spamboss", "zdrone", "l11foe", "l5rat", "l7beast", "l10worm"];
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const BOOM = `fx
pop flash burst=1 life=.16 size=4 col=hdr(9,6,3) a=1>0 sz=$size*(.5>1.3) r=sprite(soft-disc,add)
pop fire burst=?mobile:16|30 life=.3..0.6 v=sdir()*(3..7)+up(1) size=.5..1 acc=drag(3)+buoy(1) sz=$size*(.6>1.6) col=hdr(5,2.6,.8)>hdr(1.4,.4,.1) a=1>0 rot=spin(.4) r=sprite(flame-wisp,add)
pop sparks burst=?mobile:24|50 life=.4..0.9 v=sdir()*(8..16) size=.02..0.05 acc=grav()*.8+drag(1) col=hdr(6,3.5,1)>hdr(1.5,.4,.1) a=1>0 floor=bounce(.3) r=sprite(ember,add,velocity,.03)
pop smoke burst=?mobile:8|14 life=2..3.5 v=sdir()*(1..2.5)+up(1) size=1..1.8 acc=drag(1.2)+buoy(.5)+curl(.3) sz=$size*(.6>2.4) col=<.18,.16,.14> a=0>.7:.1>.6:.6>0 rot=spin(.1) r=sprite(smoke-puff,alpha)
pop dirt burst=?mobile:10|20 life=.8..1.3 v=up(4..8)+sdir()*(2..4) size=.04..0.09 spin=-8..8 acc=grav() col=<.25,.2,.15> a=1 rot=$age*$spin floor=die r=sprite(stalk,alpha)
pop glow burst=1 life=.3 r=light(<1,.6,.3>,80*(1>0),16)`;
const FIRE = `fx
pop bed n=?mobile:12|22 on=disc(%r|2.6) size=.25..0.5 tint=<2.6,1,.25>..<1.2,.35,.08> sz=$size*flick(.6,.15) col=$tint*flick(.9,.3) a=.75 r=sprite(soft-disc,add)
pop flame rate=?mobile:34|64 on=disc(%r|2.6) life=.45..0.85 v=up(1.6..2.6)+cone(18)*(.2..0.6) size=.35..0.7 acc=curl(.5)*1.2+buoy(2.2)+drag(1.5)
  sz=$size*(.5>.25:1>.7:.7>.14) col=hdr(4.6,3.4,1.4)>.3:hdr(3.2,1.4,.3)>.65:hdr(1.8,.5,.1)>hdr(.6,.12,.03) a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop embers rate=?mobile:6|12 on=disc(%r|2.6) life=.8..1.6 v=up(2.4)+cone(35)*(.4..1.4) size=.02..0.05 acc=curl(.8)+grav()*.4+drag(.5) sz=$size*(1>.7:.8>.3) col=hdr(5,2.8,.8)>.6:hdr(2.4,.8,.15)>hdr(1,.22,.04) a=(0>.08:1>.65:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)
pop smoke on=@flame?.12 inh=p;v:$v*.4 life=2..3.4 size=.4..0.7 acc=buoy(1)+curl(.35)*.5+drag(.8) sz=$size*(.7>3.4) col=<.22,.2,.18>><.12,.12,.13> a=0>.3:.35>.7:.2>0 rot=spin(.15) r=sprite(smoke-puff,alpha)
pop glow n=1 at=disc(.3).c(.6) glo=fire()*(#flame/45)~ r=light(<1,.55,.24>,$glo*45,11)`;
export const RAG = `fx
pop rag rate=?mobile:12|24 at=point() life=.2..0.35 v=up(.6)+sdir()*.3 size=.05..0.09 sz=$size*(1>.3) col=hdr(4,2,.5)>hdr(1.5,.4,.1) a=1>0 r=sprite(flame-wisp,add)`;

export function update(ctx, dt) {
  const me = ctx.self, s = me.state;
  if (s.kind === "fire") return burn(ctx);
  if (s.done) return;
  if (s.kind === "frag" && ctx.now() >= (s.fuseAt ?? 0)) return explode(ctx);
  if (s.rest) return ctx.sleep((s.fuseAt - ctx.now()) / 1000);
  const g = ctx.place.gravity?.y ?? -9.8, v = { ...(s.vel ?? { x: 0, y: 0, z: 0 }) };
  v.y += g * dt;
  const p = me.feetPosition, speed = Math.hypot(v.x, v.y, v.z);
  let next = { x: p.x + v.x * dt, y: p.y + v.y * dt, z: p.z + v.z * dt };
  if ((s.age = (s.age ?? 0) + dt) > 6 || p.y < -60) return s.kind === "fresh" ? settle(ctx, p) : s.kind === "molotov" ? shatter(ctx, p, { x: 0, y: 1, z: 0 }) : s.kind === "bauble" ? bauble(ctx, p) : explode(ctx);
  if (speed > 1e-4) {
    const dir = { x: v.x / speed, y: v.y / speed, z: v.z / speed };
    const hit = raycast(ctx, p, dir, { distance: speed * dt + 0.06, bodies: "static", physicsOnly: true, ignoreEntities: [me.id, s.ownerId].filter(Boolean) });
    if (hit && s.kind === "fresh") return settle(ctx, hit.position);
    if (hit && s.kind === "bauble") return bauble(ctx, hit.position);
    if (hit && s.kind === "molotov") return shatter(ctx, hit.position, hit.normal ?? { x: 0, y: 1, z: 0 });
    if (hit) { // the frag bounces and rolls (Grudge: restitution .35, ground friction .45)
      const n = hit.normal ?? { x: 0, y: 1, z: 0 }, vn = dot(v, n);
      if (vn < 0) {
        const keep = n.y > 0.6 ? 0.55 : 0.85, tan = { x: v.x - vn * n.x, y: v.y - vn * n.y, z: v.z - vn * n.z };
        v.x = tan.x * keep - vn * 0.35 * n.x; v.y = tan.y * keep - vn * 0.35 * n.y; v.z = tan.z * keep - vn * 0.35 * n.z;
        if (-vn > 1.5) ctx.emit("playSound", { clip: SND + "sfx-grenade-bounce-metal-clink.mp3", position: hit.position, volume: Math.min(0.8, -vn / 12), pitch: 0.9 + ctx.random() * 0.2 });
      }
      const back = Math.max(0, hit.distance - 0.05);
      next = { x: p.x + dir.x * back + n.x * 0.003, y: p.y + dir.y * back + n.y * 0.003, z: p.z + dir.z * back + n.z * 0.003 };
      if (n.y > 0.6 && Math.hypot(v.x, v.y, v.z) < 0.6) { s.rest = true; s.vel = { x: 0, y: 0, z: 0 }; me.feetPosition = next; return; }
      if (n.y > 0.6 && Math.abs(v.y) < 1.2) v.y = 0;
    }
  }
  s.vel = v; me.feetPosition = next;
  s.spin = ((s.spin ?? 0) + dt * 720) % 360;
  me.rotation = { yaw: (s.yaw ??= ctx.random() * 360), pitch: s.spin, roll: s.spin * 0.3 };
}

function reached(ctx, c, radius, lift) { // foes in reach with a clear line from the blast to their chest
  const out = [], eye = { x: c.x, y: c.y + lift, z: c.z };
  for (const r of ctx.query({ anyTags: FOES, center: c, radius: radius + 1 })) {
    if (r.state?.dead || (r.state?.hp ?? 1) <= 0) continue;
    const f = r.feetPosition, ch = { x: f.x, y: f.y + 1.1, z: f.z }, dx = ch.x - eye.x, dy = ch.y - eye.y, dz = ch.z - eye.z, d = Math.hypot(dx, dy, dz);
    const flat = Math.hypot(f.x - c.x, f.z - c.z); if (flat > radius) continue;
    if (d > 0.1) { const b = raycast(ctx, eye, { x: dx / d, y: dy / d, z: dz / d }, { distance: d, bodies: "static", physicsOnly: true, ignoreEntities: [ctx.self.id, r.id] }); if (b && b.distance < d - 0.3) continue; }
    out.push({ id: r.id, flat, dir: { x: (f.x - c.x) / (flat || 1), z: (f.z - c.z) / (flat || 1) } });
  }
  return out;
}

function explode(ctx) {
  const me = ctx.self, s = me.state, c = { ...me.feetPosition }, F = T.frag;
  s.done = true;
  const hits = reached(ctx, c, F.radius, 0.2).map((h) => ({ id: h.id, d: Math.round(F.damage * (1 - h.flat / F.radius) + F.damage * 0.15), dir: h.dir, heavy: h.flat < F.radius * 0.5 ? 1 : 0.5 }));
  const self = ctx.place.players.find((p) => p.id === s.ownerId), sf = self?.feetPosition, sd = sf ? Math.hypot(sf.x - c.x, sf.z - c.z) : 99;
  if (s.ownerId) ctx.emit("blast", { hits, self: sd < F.radius ? Math.round(F.damage * 0.5 * (1 - sd / F.radius)) : 0, from: c }, { to: s.ownerId });
  ctx.emit("fx", { position: { ...c, y: c.y + 0.2 }, script: BOOM });
  ctx.emit("decal", { position: c, normal: { x: 0, y: 1, z: 0 }, texture: "cdn/texture-scorch-mark-blast-decal.png", size: 2.6, lifetime: 60, fade: 5 });
  ctx.emit("shockwave", { position: { ...c, y: c.y + 0.3 }, speed: 30, thickness: 1.2, intensity: 0.6 });
  ctx.emit("playSound", { clip: SND + "sfx-frag-grenade-explosion.mp3", position: c, volume: 1, maxDistance: 120 });
  for (const pl of ctx.place.players) { const f = pl.feetPosition, dd = Math.hypot(f.x - c.x, f.y - c.y, f.z - c.z); if (dd < 16) ctx.emit("screenShake", { intensity: 0.9 * (1 - dd / 16), duration: 0.5 }, { audience: { player: pl.id } }); }
  ctx.emit("noise", { position: c, radius: 60, kind: "explosion" }, { audience: { nearby: c, radius: 60 } });
  ctx.destroy(me.id);
}

function settle(ctx, at) { // a Reality Freshener: lands upright, hisses, the room holds still around it
  const me = ctx.self; freshenerAt(ctx, { x: at.x, y: at.y + 0.01, z: at.z }); ctx.destroy(me.id);
}
function shatter(ctx, at, n) {
  const me = ctx.self, s = me.state, M = T.molotov;
  s.done = true;
  let c = { x: at.x + n.x * 0.15, y: at.y + n.y * 0.15, z: at.z + n.z * 0.15 };
  const down = raycast(ctx, { x: c.x, y: c.y + 0.2, z: c.z }, { x: 0, y: -1, z: 0 }, { distance: 12, bodies: "static", physicsOnly: true, ignoreEntities: [me.id] });
  if (down) c = { x: down.position.x, y: down.position.y + 0.02, z: down.position.z };
  ctx.spawn({ tags: ["firepatch"], lifetime: M.burn + 1, feetPosition: c, behavior: "scripts/nade.js", state: { kind: "fire", ownerId: s.ownerId, until: ctx.now() + M.burn * 1000, nextAt: ctx.now() },
    fx: { script: FIRE, params: { r: M.radius } }, audio: { clip: SND + "sfx-fire-burning-roar-crackle-loop.mp3", gain: 0.5, loop: true, spatial: true, maxDistance: 35 } });
  ctx.emit("playSound", { clip: SND + "sfx-glass-bottle-shatter.mp3", position: at, volume: 1, maxDistance: 60 });
  ctx.emit("playSound", { clip: SND + "sfx-fire-ignite-whoosh.mp3", position: c, volume: 0.9, maxDistance: 60 });
  ctx.emit("decal", { position: c, normal: { x: 0, y: 1, z: 0 }, texture: "cdn/texture-scorch-mark-blast-decal.png", size: M.radius * 2.2, lifetime: 60, fade: 5 });
  ctx.emit("noise", { position: c, radius: 30, kind: "fire" }, { audience: { nearby: c, radius: 30 } });
  ctx.destroy(me.id);
}

function burn(ctx) { // every tick seconds: what stands in the fire takes dmg; the thrower half
  const me = ctx.self, s = me.state, now = ctx.now(), M = T.molotov;
  if (now >= (s.until ?? 0)) { ctx.destroy(me.id); return; }
  if (now < (s.nextAt ?? 0)) return ctx.sleep((s.nextAt - now) / 1000);
  s.nextAt = now + M.tick * 1000;
  const c = me.feetPosition, hits = reached(ctx, c, M.radius, 0.5).map((h) => ({ id: h.id, d: M.damage, dir: h.dir, heavy: 0, fire: true }));
  const self = ctx.place.players.find((p) => p.id === s.ownerId), sf = self?.feetPosition;
  const inMe = sf && Math.hypot(sf.x - c.x, sf.z - c.z) < M.radius && Math.abs(sf.y - c.y) < M.height;
  if (s.ownerId && (hits.length || inMe)) ctx.emit("blast", { hits, self: inMe ? Math.round(M.damage / 2) : 0, from: c, fire: true }, { to: s.ownerId });
}

const GLITTER = `fx
pop glass burst=?mobile:24|40 life=.5..1 v=sdir()*(2..4.5)+up(1.2) size=.02..0.045 spin=-12..12 tint=<2.6,.3,.25>..<2.6,1.9,.5> acc=grav()+drag(.6) col=$tint a=1>.7:1>0 sz=$size rot=$age*$spin floor=bounce(.3) r=sprite(shard,add,velocity,.02)
pop tinsel burst=?mobile:12|22 life=1..1.8 v=sdir()*(1..2.2)+up(1.4) size=.03..0.06 spin=-8..8 tint=<.3,2.2,.5>..<2.4,1.8,.4> acc=grav()*.35+drag(1.8) col=$tint*flick(6,.5) a=1>.6:1>0 sz=$size rot=$age*$spin r=sprite(stalk,add,velocity,.02)
pop flash burst=1 life=.18 tint=<1,.8,.5> r=light($tint,6,4)`;
function bauble(ctx, at) { // the Glass Bauble: shatters on contact into glitter and tinsel; a little damage and a daze on foes close by
  const me = ctx.self, s = me.state, B = T.bauble, c = { x: at.x, y: at.y + 0.05, z: at.z }, until = ctx.now() + B.daze * 1000;
  s.done = true;
  const hits = reached(ctx, c, B.radius, 0.3).map((h) => { const o = ctx.getObject(h.id); if (o) { o.state.stunUntil = Math.max(o.state.stunUntil ?? 0, until); o.state.dazeUntil = until; } return { id: h.id, d: B.damage, dir: h.dir, heavy: 0.3 }; });
  if (s.ownerId) ctx.emit("blast", { hits, self: 0, from: c }, { to: s.ownerId });
  ctx.emit("fx", { position: c, script: GLITTER });
  ctx.emit("playSound", { clip: "/cdn/moodboard-gothic-horror/sfx-glass-christmas-ornament-shatter-tinkle.mp3", position: c, volume: 0.8 });
  ctx.destroy(me.id);
}
