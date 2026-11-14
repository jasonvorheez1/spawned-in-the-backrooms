// Thrown frag grenades and molotovs (borrowed from FPS Grudge's flight, bounce and blast, rewired to this game's foes).
import { freshenerAt } from "./lib/remodel-quest.js";
// state: { kind: "frag" | "molotov" | "fire", vel, ownerId, fuseAt }. The blast doesn't judge kills itself: it sends the
// thrower a "blast" with every foe it reached, and the thrower's scripts/player.js lands each through hitTarget (XP, loot, ragdoll).
import { raycast } from "builtin/physics";
import T from "./lib/data/throwables.yml";
import { damageEntity } from "./lib/breakables.js";
import { BLAST, feelBlast } from "./lib/blast-fx.js";
const SND = "/cdn/moodboard-realistic-gritty/";
const FOES = ["smiler", "lurker", "hound", "stealer", "moths", "l8spider", "l8-hostile", "npc", "l61fc", "spamboss", "zdrone", "l11foe", "l5rat", "l7beast", "l10worm"];
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const BOOM = `fx
pop flash burst=1 life=.16 size=4 col=hdr(9,6,3) a=1>0 sz=$size*(.5>1.3) r=sprite(soft-disc,add)
pop fire burst=?mobile:16|30 life=.3..0.6 v=sdir()*(3..7)+up(1) size=.5..1 acc=drag(3)+buoy(1) sz=$size*(.6>1.6) col=hdr(5,2.6,.8)>hdr(1.4,.4,.1) a=1>0 rot=spin(.4) r=sprite(flame-wisp,add)
pop sparks burst=?mobile:24|50 life=.4..0.9 v=sdir()*(8..16) size=.02..0.05 acc=grav()*.8+drag(1) col=hdr(6,3.5,1)>hdr(1.5,.4,.1) a=1>0 floor=bounce(.3) r=sprite(ember,add,velocity,.03)
pop smoke burst=?mobile:8|14 life=2..3.5 v=sdir()*(1..2.5)+up(1) size=1..1.8 acc=drag(1.2)+buoy(.5)+curl(.3) sz=$size*(.6>2.4) col=<.18,.16,.14> a=0>.7:.1>.6:.6>0 rot=spin(.1) r=sprite(smoke-puff,alpha)
pop dirt burst=?mobile:10|20 life=.8..1.3 v=up(4..8)+sdir()*(2..4) size=.04..0.09 spin=-8..8 acc=grav() col=<.25,.2,.15> a=1 rot=$age*$spin floor=die r=sprite(stalk,alpha)
pop ring burst=?mobile:14|28 on=disc(.6) life=.8..1.4 v=sdir()*<1,0,1>*(5..8)+up(.4) size=.4..0.8 acc=drag(2.5)+buoy(.2) sz=$size*(.6>2.2) col=<.42,.38,.3> a=0>.5:.15>.7:.4>0 rot=spin(.1) r=sprite(smoke-puff,alpha)
pop glow burst=1 life=.3 r=light(<1,.6,.3>,80*(1>0),16)`;
const ROCKET_BOOM = `fx
pop flash burst=1 life=.14 size=4.5 col=hdr(5,3.4,1.8) a=.8>0 sz=$size*(.4>1.3) r=sprite(soft-disc,add)
pop core burst=?mobile:14|26 life=.4..0.8 v=sdir()*(2..5)+up(1.5) size=1..1.8 acc=drag(3)+buoy(1.6) sz=$size*(.5>1.8) col=hdr(7,3.6,1.1)>.5:hdr(3,1,.2)>hdr(.5,.15,.05) a=1>.6:1>0 rot=spin(.5) r=sprite(flame-wisp,add)
pop fire burst=?mobile:20|40 life=.5..1 v=sdir()*(5..10)+up(2) size=.5..1.1 acc=drag(3.4)+buoy(1.2) sz=$size*(.6>1.7) col=hdr(5,2.6,.8)>hdr(1.4,.4,.1) a=1>0 rot=spin(.4) r=sprite(flame-wisp,add)
pop sparks burst=?mobile:40|90 life=.5..1.3 v=sdir()*(10..22) size=.02..0.05 acc=grav()*.8+drag(.8) col=hdr(7,4,1.2)>hdr(1.6,.4,.1) a=1>0 floor=bounce(.35) r=sprite(ember,add,velocity,.035)
pop chunks burst=?mobile:10|22 life=1.4..2.4 v=sdir()*(5..11)+up(4..7) size=.05..0.12 spin=-10..10 acc=grav()+drag(.3) col=<.22,.2,.17>..<.5,.46,.38> a=1 rot=$age*$spin floor=bounce(.25) r=mesh(box,1,.6,.8)
pop trails on=@chunks?.5 life=.5..0.9 size=.08..0.14 acc=buoy(.3)+drag(1.2) sz=$size*(.6>2.2) col=<.3,.28,.26> a=0>.4:.25>.6:.15>0 r=sprite(smoke-puff,alpha)
pop column burst=?mobile:8|14 life=3..5 v=up(2..3.5)+sdir()*(.4..1) size=1.2..2 acc=drag(.9)+buoy(.6)+curl(.25) sz=$size*(.6>3.2) col=<.16,.14,.12>><.3,.29,.28> a=0>.75:.1>.55:.6>0 rot=spin(.08) r=sprite(smoke-puff,alpha)
pop smoke burst=?mobile:10|18 life=2.5..4 v=sdir()*(1.5..3.5)+up(.8) size=1..1.8 acc=drag(1.2)+buoy(.4)+curl(.3) sz=$size*(.6>2.8) col=<.2,.18,.16> a=0>.7:.1>.6:.6>0 rot=spin(.1) r=sprite(smoke-puff,alpha)
pop ring burst=?mobile:18|36 on=disc(.8) life=.9..1.6 v=sdir()*<1,0,1>*(7..11)+up(.4) size=.5..1 acc=drag(2.6)+buoy(.2) sz=$size*(.6>2.6) col=<.44,.4,.33> a=0>.55:.15>.7:.4>0 rot=spin(.1) r=sprite(smoke-puff,alpha)
pop embers burst=?mobile:12|26 life=1.5..3 v=sdir()*(1..3)+up(1.5..3) size=.02..0.04 acc=curl(.8)+grav()*.15+drag(.8) col=hdr(5,2.4,.6)>hdr(1.2,.3,.05) a=(1>.7:1>0)*flick(9,.4) r=sprite(ember,add,velocity,.02)
pop glow burst=1 life=.45 r=light(<1,.58,.28>,55*(1>.4:.3>0),16)`;
const FIRE = `fx
pop bed n=?mobile:12|22 on=disc(%r|2.6) size=.25..0.5 tint=<2.6,1,.25>..<1.2,.35,.08> sz=$size*flick(.6,.15) col=$tint*flick(.9,.3) a=.75 r=sprite(soft-disc,add)
pop flame rate=?mobile:34|64 on=disc(%r|2.6) life=.45..0.85 v=up(1.6..2.6)+cone(18)*(.2..0.6) size=.35..0.7 acc=curl(.5)*1.2+buoy(2.2)+drag(1.5)
  sz=$size*(.5>.25:1>.7:.7>.14) col=hdr(4.6,3.4,1.4)>.3:hdr(3.2,1.4,.3)>.65:hdr(1.8,.5,.1)>hdr(.6,.12,.03) a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop embers rate=?mobile:6|12 on=disc(%r|2.6) life=.8..1.6 v=up(2.4)+cone(35)*(.4..1.4) size=.02..0.05 acc=curl(.8)+grav()*.4+drag(.5) sz=$size*(1>.7:.8>.3) col=hdr(5,2.8,.8)>.6:hdr(2.4,.8,.15)>hdr(1,.22,.04) a=(0>.08:1>.65:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)
pop smoke on=@flame?.12 inh=p;v:$v*.4 life=2..3.4 size=.4..0.7 acc=buoy(1)+curl(.35)*.5+drag(.8) sz=$size*(.7>3.4) col=<.22,.2,.18>><.12,.12,.13> a=0>.3:.35>.7:.2>0 rot=spin(.15) r=sprite(smoke-puff,alpha)
pop glow n=1 at=disc(.3).c(.6) glo=fire()*(#flame/45)~ r=light(<1,.55,.24>,$glo*45,11)`;
const TINTS = [[2.6, .3, .25], [2.6, 1.8, .45], [.35, 2.2, .5], [.4, .9, 2.6]]; // red, gold, green, blue glass
const FUSE = `fx
pop smoke rate=?mobile:14|28 life=.4..0.8 v=sdir()*.2 size=.04..0.08 acc=buoy(.4)+drag(1.5) col=<.5,.48,.45> a=0>.35:.2>.7:.1>0 sz=$size*(.6>2.2) rot=spin(.2) r=sprite(smoke-puff,alpha)
pop spark rate=?mobile:10|20 life=.15..0.3 v=sdir()*(.5..1.5) size=.01..0.02 col=hdr(5,2.6,.6) a=1>0 r=sprite(ember,add,velocity,.02)
pop blink n=1 at=point() r=light(<1,.3,.15>,4*flick(4,.9),2)`;
const GLINT = `fx
pop glint rate=?mobile:12|24 life=.3..0.6 v=sdir()*.3 size=.02..0.04 col=<%tint|2.6,.3,.25>*flick(12,.6) a=1>0 sz=$size*(1>.2) r=sprite(mote,add)`;
export const RAG = `fx
pop rag rate=?mobile:12|24 at=point() life=.2..0.35 v=up(.6)+sdir()*.3 size=.05..0.09 sz=$size*(1>.3) col=hdr(4,2,.5)>hdr(1.5,.4,.1) a=1>0 r=sprite(flame-wisp,add)`;

export function update(ctx, dt) {
  const me = ctx.self, s = me.state;
  if (s.kind === "fire") return burn(ctx);
  if (s.done) return;
  if (!s.trail && (s.kind === "frag" || s.kind === "bauble")) { // once per throw: the frag's fuse smokes and blinks, a bauble glints in its own colour
    s.trail = true;
    if (s.kind === "bauble" && !s.tint) s.tint = TINTS[Math.floor(ctx.random() * TINTS.length)];
    me.fx = s.kind === "frag" ? { script: FUSE } : { script: GLINT, params: { tint: s.tint } };
  }
  if (s.kind === "frag" && ctx.now() >= (s.fuseAt ?? 0)) return explode(ctx);
  if (s.kind === "rocket") return rocket(ctx, dt);
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

function rocket(ctx, dt) { // the M.E.G. launcher's round: straight and fast, a little drop, bursts on the first thing it meets
  const me = ctx.self, s = me.state, v = s.vel, p = me.feetPosition, sp = Math.hypot(v.x, v.y, v.z) || 1;
  v.y += (ctx.place.gravity?.y ?? -9.8) * 0.06 * dt;
  if ((s.age = (s.age ?? 0) + dt) > 4) return explode(ctx);
  const hit = raycast(ctx, p, { x: v.x / sp, y: v.y / sp, z: v.z / sp }, { distance: sp * dt + 0.2, bodies: "all", ignoreEntities: [me.id, s.ownerId].filter(Boolean) });
  if (hit) { s.hitN = hit.normal ?? null; s.hitId = hit.id ?? null; me.feetPosition = { x: hit.position.x - v.x / sp * 0.15, y: hit.position.y - v.y / sp * 0.15, z: hit.position.z - v.z / sp * 0.15 }; return explode(ctx); }
  me.feetPosition = { x: p.x + v.x * dt, y: p.y + v.y * dt, z: p.z + v.z * dt }; s.vel = v;
}
function explode(ctx) {
  const me = ctx.self, s = me.state, c = { ...me.feetPosition }, F = s.kind === "rocket" ? { ...T.frag, damage: s.dmg ?? T.frag.damage, radius: s.radius ?? T.frag.radius } : T.frag;
  s.done = true;
  const hits = reached(ctx, c, F.radius, 0.2).map((h) => ({ id: h.id, d: Math.round(F.damage * (1 - h.flat / F.radius) + F.damage * 0.15), dir: h.dir, heavy: h.flat < F.radius * 0.5 ? 1 : 0.5 }));
  const self = ctx.place.players.find((p) => p.id === s.ownerId), sf = self?.feetPosition, sd = sf ? Math.hypot(sf.x - c.x, sf.z - c.z) : 99;
  if (s.ownerId) ctx.emit("blast", { hits, self: sd < F.radius ? Math.round(F.damage * 0.5 * (1 - sd / F.radius)) : 0, from: c }, { to: s.ownerId });
  const big = s.kind === "rocket", n = (big && s.hitN) || { x: 0, y: 1, z: 0 };
  ctx.emit("fx", { position: { x: c.x + n.x * 0.2, y: c.y + 0.2, z: c.z + n.z * 0.2 }, script: BLAST, params: { s: big ? 1.5 : 1 } });
  ctx.emit("decal", { position: c, normal: n, texture: "cdn/texture-scorch-mark-blast-decal.png", size: big ? 4.2 : 2.6, lifetime: big ? 120 : 60, fade: 5 }); // the scorch lands on the wall or floor it hit
  if (big) smashAround(ctx, c, F.radius, n, s.hitId);
  if (big) { // a rocket throws the loose things around it and the shooter feels it land
    for (const o of ctx.query({ center: c, radius: F.radius * 1.4, excludeTags: ["player", "thrown"] })) { const h = ctx.getObject(o.id); if (!h || h.physics?.body !== "dynamic") continue; const dx = o.feetPosition.x - c.x, dz = o.feetPosition.z - c.z, d = Math.hypot(dx, dz) || 1, k = 900 * (1 - Math.min(1, d / (F.radius * 1.4))); ctx.emit("impulse", { target: o.id, impulse: { x: dx / d * k, y: k * 0.6, z: dz / d * k } }); }
    if (s.ownerId) { ctx.emit("hitstop", { duration: 0.07 }, { audience: { player: s.ownerId } }); ctx.emit("playSound", { clip: SND + "sfx-rocket-detonation-huge-boom-with-glass-and-ceiling-debris-falling.mp3", position: c, volume: 1, maxDistance: 140 }); }
  }
  ctx.emit("shockwave", { position: { ...c, y: c.y + 0.3 }, speed: big ? 46 : 34, thickness: big ? 2.6 : 1.8, intensity: big ? 1.2 : 0.85 });
  ctx.emit("playSound", { clip: SND + "sfx-frag-grenade-explosion.mp3", position: c, volume: 1, maxDistance: 120 });
  ctx.emit("playSound", { clip: SND + "sfx-explosion-concussion-thump-with-debris-rattle-and-room-rumble-tail.mp3", position: c, volume: 0.8, maxDistance: 90 });
  feelBlast(ctx, c, big ? 1.5 : 1); // shake, punch, ringing ears; no screen flash (the seizure note)
  ctx.emit("noise", { position: c, radius: 60, kind: "explosion" }, { audience: { nearby: c, radius: 60 } });
  ctx.destroy(me.id);
}

const KEEP = ["npc", "player", "critter", "enemy", "door", "wall", "thrown", "l5-sealed", "l5-elev-panel"];
function smashAround(ctx, c, radius, n, hitId) { // a rocket breaks what it lands on outright and wrecks what stands near (Shelly: "rockets dont instantly destroy objects")
  const done = new Set();
  const hurt = (h, dmg) => { if (!h || done.has(h.id) || h.parent || KEEP.some((t) => h.tags?.includes(t))) return; done.add(h.id); try { damageEntity(ctx, h, dmg, c, n, "explosion"); } catch (e) { ctx.log("rocket smash", h.id, e.message); } };
  const direct = hitId ? ctx.getObject(hitId) : null, sz = direct?.bounds?.size;
  if (direct && (direct.tags?.includes("breakable") || (sz && Math.max(sz.x, sz.y, sz.z) < 2.6))) { if (!direct.tags.includes("breakable") && !KEEP.some((t) => direct.tags?.includes(t))) { direct.tags = [...direct.tags, "breakable"]; direct.state.mat ??= "fixture"; } hurt(direct, 9999); }
  for (const r of ctx.query({ anyTags: ["breakable"], center: c, radius: radius * 1.3 })) { const f = r.feetPosition, d = Math.hypot(f.x - c.x, f.z - c.z); hurt(ctx.getObject(r.id), d < radius * 0.6 ? 9999 : Math.round(400 * (1 - Math.min(1, d / (radius * 1.3))))); } // the inner blast flattens, the edge cracks
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
pop glass burst=?mobile:24|40 life=2..3.5 v=sdir()*(2..4.5)+up(1.2) size=.02..0.045 spin=-12..12 acc=grav()+drag(.6) col=<%tint|2.6,.3,.25>*(.7..1.3)*flick(5,.4) a=1>.8:1>0 sz=$size rot=$age*$spin floor=stick r=sprite(shard,add,velocity,.02)
pop pop burst=1 life=.12 size=.7 col=<%tint|2.6,.3,.25> a=1>0 sz=$size*(.4>1.2) r=sprite(soft-disc,add)
pop tinsel burst=?mobile:12|22 life=1..1.8 v=sdir()*(1..2.2)+up(1.4) size=.03..0.06 spin=-8..8 tint=<.3,2.2,.5>..<2.4,1.8,.4> acc=grav()*.35+drag(1.8) col=$tint*flick(6,.5) a=1>.6:1>0 sz=$size rot=$age*$spin r=sprite(stalk,add,velocity,.02)
pop flash burst=1 life=.18 r=light(<%tint|2.6,.3,.25>,8*(1>0),4)`;
const FESTIVE = `fx
pop flash burst=1 life=.14 size=1.6 col=<%tint|2.6,.3,.2>*2 a=1>0 sz=$size*(.4>1.2) r=sprite(soft-disc,add)
pop ring burst=?mobile:30|60 life=.6..1.1 v=sdir()*(3..6)*<1,.35,1>+up(1.5) size=.03..0.06 spin=-10..10 tint=<2.6,.3,.25>..<.3,2.4,.5> acc=grav()*.4+drag(2.2) col=$tint*flick(8,.5) a=1>.6:1>0 sz=$size rot=$age*$spin floor=bounce(.3) r=sprite(stalk,add,velocity,.03)
pop stars burst=?mobile:10|20 life=.5..0.9 v=sdir()*(1.5..3)+up(1) size=.06..0.12 acc=drag(2.5) col=hdr(3.2,2.7,1.5)*flick(10,.6) a=1>0 sz=$size*(.3>1>0) rot=spin(2) r=sprite(mote,add)
pop snow burst=?mobile:12|24 life=1.2..2 v=sdir()*(.8..1.8)+up(1.6) size=.03..0.05 acc=grav()*.12+drag(1.5)+curl(.4) col=<1,1,1> a=1>.7:1>0 sz=$size r=sprite(snowflake,alpha)
pop glow burst=1 life=.35 r=light(<%tint|2.6,.3,.2>,40*(1>0),%r|3.2*2.5)`;
function bauble(ctx, at) { // the Glass Bauble: shatters on contact into glitter and tinsel; a little damage and a daze on foes close by
  const me = ctx.self, s = me.state, B = T.bauble, c = { x: at.x, y: at.y + 0.05, z: at.z }, R = s.radius ?? B.radius, until = ctx.now() + (s.daze ?? B.daze) * 1000;
  s.done = true;
  const hits = reached(ctx, c, R, 0.3).map((h) => { const o = ctx.getObject(h.id); if (o) { o.state.stunUntil = Math.max(o.state.stunUntil ?? 0, until); o.state.dazeUntil = until; } return { id: h.id, d: s.big ? Math.round((s.dmg ?? B.damage) * (1 - 0.5 * h.flat / R)) : B.damage, dir: h.dir, heavy: s.big ? 0.7 : 0.3 }; });
  if (s.ownerId) ctx.emit("blast", { hits, self: 0, from: c }, { to: s.ownerId });
  ctx.emit("fx", { position: c, script: GLITTER, params: { tint: s.tint ?? TINTS[0] } });
  ctx.emit("playSound", { clip: "/cdn/moodboard-gothic-horror/sfx-glass-christmas-ornament-shatter-tinkle.mp3", position: c, volume: 0.8, pitch: 0.9 + ctx.random() * 0.25 });
  if (s.big) { // the Carolynne's shell: a festive pop, a ring of tinsel and stars, a jingle on top of the glass
    ctx.emit("fx", { position: c, script: FESTIVE, params: { tint: s.tint ?? [2.6, .3, .2], r: R } });
    ctx.emit("shockwave", { position: { ...c, y: c.y + 0.3 }, speed: 14, thickness: 0.6, intensity: 0.25 });
    ctx.emit("playSound", { clip: "/cdn/moodboard-toon-vibrant/sfx-festive-ornament-burst-pop-with-sleigh-bell-jingle-and-glass-sparkle.mp3", position: c, volume: 0.9, maxDistance: 50 });
    for (const pl of ctx.place.players) { const f = pl.feetPosition, dd = Math.hypot(f.x - c.x, f.y - c.y, f.z - c.z); if (dd < 8) ctx.emit("screenShake", { intensity: 0.25 * (1 - dd / 8), duration: 0.25 }, { audience: { player: pl.id } }); }
    ctx.emit("noise", { position: c, radius: 25, kind: "explosion" }, { audience: { nearby: c, radius: 25 } });
  }
  ctx.destroy(me.id);
}
