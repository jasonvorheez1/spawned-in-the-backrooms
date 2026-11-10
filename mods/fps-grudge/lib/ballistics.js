// ASHLINE rounds: one shared flight for players (scripts/player.js) and raiders (scripts/raiders.js).
// fly() marches the arc in C.ballistics.step slices, one raycast each; events land now (t <= instant) or through
// ctx.after(t, "bulletLands", { evs }) on the shooter's entity: each caller exports bulletLands and hands non-hit
// events to landCommon. Tracers, whiz/crack, near-miss marks and impacts are fx/sound only, never entities.
import { raycast } from "builtin/physics";
import C from "./data/combat.yml";
import * as FX from "./fx.js";
import { hitSnd } from "./hitsfx.js";

const B = C.ballistics, G = B.gravity;
const SND = "/cdn/moodboard-realistic-gritty/";
const UP = { x: 0, y: 1, z: 0 };
// real recorded gunfire: the creator's s&box pack (beretta 9mm, mp7, awp, remington 870, suppressed beretta) and her free gun-sounds rifle shot
// three takes a class so a string of shots never repeats; FAR is the 870's distance tail, heard by whoever stands past FAR_AT metres
const V = (h) => `/cdn/value.${h}.mp3`;
const SHOT = {
  pistol: [V("aecb825805a334ff8a5aa04442bf82678b24271f0529c5d92cf5d1f5d689a7cc"), V("3c2ffd1c533334727f5e77ce8384d4f07b119e08b8e005379634da14f8949039"), V("81183dce583111b94cc04af425e89bc6691f6ffcda316bd784a161b8c1aa5b8e")],
  smg: [V("801efd7ae4df9ccfad5e510c08cc4d26bd26357af2981d3331847ff7399477d1"), V("605d189a13be7f89774ccb0c22bfbdfb2dc6ec7e16d24f6cd2a5c30d998970a3"), V("76c76f481c23fbd5213f37eb1ab6c36dd0cbf9c33d66b2e8135b7ff89c8102d5")],
  rifle: [V("1dc23b1c3078ab901cd8b705298cb8169d8c2270c3abf363f35460867b004d7d"), V("6d725446bf715576ce4d72d23041b8f5fa58673d815fa178d51a922621c836de")],
  lmg: [V("68cdca34bfd714855b376593d56572ead073ed7629e58e84cd0b6d03f5962005")],
  shotgun: [V("a2eee742451bcf90b0f4f2b5b8f20020fb18f7826468d3164a113d523c8a59b9"), V("1186ec40dd400d77ff676f5a204c07d5f71d2d5662ad058d4399fb9668796c56"), V("500a7fe86ddccd464f591ed200d3a2d6c45c185dcdbe7e93efd8e9e2e164fa8e")],
  sniper: [V("91e2f9efd7a7320785878a9d4e0342627a96d316113753f23acb968865ee8b46"), V("c3f1688e38e2217036cbcc7a42387e151bf95acd9bea211ef08875522efa8aea"), V("e424fdd995c835e1559b70522f986771ab4976efc1eef63dd2e05cd74c477cb3")],
  suppressed: [V("9708e41e8cc4143d7852cd3bd4ab90717e583a9272c682c8e304584d7839551f"), V("946ab360003a5371714e7074d6f1907c1c66fd36798ca27c4ad895840ca3f7ad"), V("b001c64d6143c17e1b0a8a1cf4a5970004bebe71ab610f72d8b5ab63e2c09329")],
};
const FAR = V("f7b183cda78bdfc3bbcd25dd0e94b6e15ef22d58eaaf5b89cef2f5ed0556d1dc"), FAR_AT = 45;
export const shotClip = (cls, suppressed, r = 0) => { const set = suppressed ? SHOT.suppressed : SHOT[cls] ?? SHOT.rifle; return set[Math.floor(r * set.length) % set.length]; };
// one shot heard in 3D from the muzzle (the panner gives the direction); past FAR_AT m a listener also gets the rolling distance tail from the same spot
export function shotSound(ctx, pos, cls, suppressed, vol = 1) {
  ctx.emit("playSound", { clip: shotClip(cls, suppressed, ctx.random()), position: pos, volume: suppressed ? 0.45 * vol : vol, pitch: 0.96 + ctx.random() * 0.08, maxDistance: suppressed ? 30 : 110 });
  if (suppressed) return;
  for (const p of ctx.place.players) {
    const f = p.feetPosition; if (!f) continue;
    const d = Math.hypot(f.x - pos.x, f.z - pos.z);
    if (d > FAR_AT && d < 420) ctx.emit("playSound", { clip: FAR, position: pos, volume: Math.min(0.9, 0.35 + (cls === "sniper" || cls === "shotgun" ? 0.3 : 0.15)), pitch: cls === "pistol" || cls === "smg" ? 1.15 : cls === "sniper" ? 0.85 : 1, maxDistance: 450 }, { audience: { player: p.id } });
  }
}
export const speedOf = (cls) => B.speed[cls] ?? B.speed.rifle;

// o origin, d unit direction; pass(h) true = the round flies on through that hit (a pierced target, a mate)
export function fly(ctx, o, d, speed, opt = {}) {
  const maxT = opt.maxT ?? B.maxT, maxDist = opt.maxDist ?? B.maxDist, ignore = opt.ignore ?? [], pass = opt.pass;
  let p = { x: o.x, y: o.y, z: o.z }, vx = d.x * speed, vy = d.y * speed, vz = d.z * speed, t = 0, dist = 0;
  const hits = [], pts = [{ x: o.x, y: o.y, z: o.z, t: 0 }], seen = new Set();
  while (t < maxT - 1e-6 && dist < maxDist) {
    const dt = Math.min(t < 0.1 ? B.step : (B.stepFar ?? B.step), maxT - t);
    const q = { x: p.x + vx * dt, y: p.y + vy * dt - 0.5 * G * dt * dt, z: p.z + vz * dt };
    const sx = q.x - p.x, sy = q.y - p.y, sz = q.z - p.z, L = Math.hypot(sx, sy, sz) || 1e-6;
    let r = raycast(ctx, p, { x: sx / L, y: sy / L, z: sz / L }, { distance: L, multiple: true, ignoreEntities: ignore }) ?? [];
    if (!Array.isArray(r)) r = [r];
    for (const h of r) {
      if (h.id && seen.has(h.id)) continue;
      if (h.id) seen.add(h.id);
      const th = t + dt * (h.distance / L), row = { id: h.id ?? null, position: h.position, normal: h.normal ?? UP, distance: dist + h.distance, t: th };
      hits.push(row);
      if (!pass || !pass(h)) { pts.push({ ...h.position, t: th }); return { hits, end: h.position, t: th, pts, stopped: true, drop: dropOf(o, d, h.position) }; }
    }
    vy -= G * dt; p = q; t += dt; dist += L; pts.push({ ...q, t });
  }
  return { hits, end: p, t, pts, stopped: false, drop: dropOf(o, d, p) };
}
// how far the round fell below the line it left on
export function dropOf(o, d, e) { const s = (e.x - o.x) * d.x + (e.y - o.y) * d.y + (e.z - o.z) * d.z; return o.y + d.y * s - e.y; }

// what the round struck: the ground is dirt, a wreck or a lamp is metal, the rest concrete
export function matOf(ctx, h) {
  if (!h.id) return "dirt";
  const gy = ctx.place.terrain?.heightAt?.(h.position.x, h.position.z);
  if (gy != null && Math.abs(h.position.y - gy) < 0.08) return "dirt";
  const o = ctx.getObject(h.id); if (!o) return "dirt";
  const tg = (o.tags ?? []).join(" "), sc = o.primitive?.script ?? "";
  if (/metal|wreck|car|container|lamp/.test(tg) || /wreck|streetlamp|charge|container/.test(sc)) return "metal";
  return "concrete";
}

// every player near the path but not the shooter or the struck hears it pass; a round landing beside one marks where it came from
export function passBy(ctx, pts, end, tEnd, skip, from, speed, landed) {
  const evs = [], path = pts.filter((p) => p.t < tEnd); path.push({ ...end, t: tEnd });
  for (const pl of ctx.place.players) {
    if (skip.includes(pl.id) || pl.state?.dead) continue;
    const f = pl.feetPosition, c = { x: f.x, y: f.y + 1.5, z: f.z };
    let best = Infinity, bp = null, bt = 0;
    for (let j = 1; j < path.length; j++) {
      const a = path[j - 1], b = path[j], ex = b.x - a.x, ey = b.y - a.y, ez = b.z - a.z, ll = ex * ex + ey * ey + ez * ez || 1e-9;
      const u = Math.max(0, Math.min(1, ((c.x - a.x) * ex + (c.y - a.y) * ey + (c.z - a.z) * ez) / ll));
      const px = a.x + ex * u, py = a.y + ey * u, pz = a.z + ez * u, dd = Math.hypot(c.x - px, c.y - py, c.z - pz);
      if (dd < best) { best = dd; bp = { x: px, y: py, z: pz }; bt = a.t + (b.t - a.t) * u; }
    }
    if (best < B.whizRadius) evs.push({ k: "whiz", pid: pl.id, pos: bp, t: bt, crack: speed >= B.crackSpeed });
    if (landed) { const ny = end.y - Math.max(f.y, Math.min(f.y + 1.8, end.y)); if (Math.hypot(end.x - f.x, ny, end.z - f.z) < B.nearMiss) evs.push({ k: "near", pid: pl.id, from: { x: from.x, z: from.z }, pos: { x: end.x, y: end.y, z: end.z }, t: tEnd }); }
  }
  return evs;
}

// the streak: one particle that flies the same arc and dies at the mark; rifles and snipers leave a faint wisp line
export function tracer(ctx, from, end, t, cls, audience) {
  const life = Math.max(0.03, t), g = t >= 0.03 ? G : 0;
  const vel = { x: (end.x - from.x) / life, y: (end.y - from.y) / life + 0.5 * g * life, z: (end.z - from.z) / life };
  ctx.emit("fx", { position: from, script: B.smoke.includes(cls) ? FX.tracerSmoke : FX.tracerHot, params: { vel, life, g: { x: 0, y: -g, z: 0 } } }, { audience });
}
export const showTracer = (n, auto) => !auto || n % B.tracerEvery === 0;

// a hit: the spray at the wound, then red splat where it lands: the wall behind the target along the round's line (3 m), and the ground under it
export function blood(ctx, pos, n, from) {
  let dir = { x: -(n?.x ?? 0), y: -(n?.y ?? 0), z: -(n?.z ?? 1) };
  if (from) { const dx = pos.x - from.x, dy = pos.y - from.y, dz = pos.z - from.z, L = Math.hypot(dx, dy, dz) || 1; dir = { x: dx / L, y: dy / L, z: dz / L }; }
  ctx.emit("fx", { position: pos, script: FX.blood, params: { normal: n, dir } }); // entry puff back at the shooter, the exit spray on through along the round
  const splat = (h, size) => ctx.emit("decal", { position: h.position, normal: h.normal ?? UP, texture: "cdn/texture-blood-splatter-red-decal.png", size, lifetime: 45, fade: 5 });
  if (from) {
    const dx = pos.x - from.x, dy = pos.y - from.y, dz = pos.z - from.z, L = Math.hypot(dx, dy, dz) || 1;
    const d = { x: dx / L, y: dy / L, z: dz / L }, o = { x: pos.x + d.x * 0.5, y: pos.y + d.y * 0.5, z: pos.z + d.z * 0.5 };
    const w = raycast(ctx, o, d, { distance: 3, bodies: "static", physicsOnly: true });
    if (w) splat(w, 0.5 + (3 - w.distance) * 0.25);
  }
  const g = raycast(ctx, { x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: -1, z: 0 }, { distance: 2.5, bodies: "static", physicsOnly: true });
  if (g) splat(g, 0.45 + ctx.random() * 0.35);
}

// events: now if the round is already there, else one ctx.after per 40 ms bucket
export function schedule(ctx, evs, apply) {
  const later = [];
  for (const e of evs) if (e.t <= B.instant) apply(ctx, e); else later.push(e);
  later.sort((a, b) => a.t - b.t);
  for (let i = 0; i < later.length;) { const t0 = later[i].t, grp = []; while (i < later.length && later[i].t - t0 < B.bucket) grp.push(later[i++]); ctx.after(t0, "bulletLands", { evs: grp }); }
}

const IMPACT = { dirt: FX.impactDirt, metal: FX.impactMetal, concrete: FX.impact };
export function landCommon(ctx, e) {
  if (e.k === "wall") {
    ctx.emit("fx", { position: e.pos, script: IMPACT[e.mat] ?? FX.impact, params: { normal: e.normal ?? UP } });
    if (e.decal) ctx.emit("decal", { position: e.pos, normal: e.normal ?? UP, texture: `cdn/texture-bullet-hole-${e.mat === "dirt" ? "dirt" : e.mat === "metal" ? "metal" : "concrete"}-decal.png`, size: e.mat === "dirt" ? 0.16 : 0.12, lifetime: 25, fade: 3 });
    if (e.decal && e.mat === "concrete") ctx.emit("decal", { position: e.pos, normal: e.normal ?? UP, texture: "cdn/texture-concrete-impact-chip-scar-decal.png", size: 0.3 + ctx.random() * 0.15, lifetime: 40, fade: 4 }); // the chipped crater and dust ring round the hole
    if (e.loud) ctx.emit("playSound", { clip: SND + `sfx-bullet-impact-${e.mat}.mp3`, position: e.pos, volume: 0.55, pitch: 0.9 + ctx.random() * 0.2, maxDistance: 40 });
    if (e.loud && e.mat !== "metal") hitSnd(ctx, e.mat === "dirt" ? "wood" : "stone", e.pos, { volume: 0.35, maxDistance: 25 }); // the knock of the surface under the crack
  } else if (e.k === "whiz") {
    const aud = { audience: { player: e.pid } };
    ctx.emit("playSound", { clip: SND + "sfx-bullet-whiz-by.mp3", position: e.pos, volume: 0.8, pitch: 0.9 + ctx.random() * 0.2, maxDistance: 12 }, aud);
    if (e.crack) ctx.emit("playSound", { clip: SND + "sfx-supersonic-bullet-crack.mp3", position: e.pos, volume: 0.6, maxDistance: 12 }, aud);
    ctx.emit("screenShake", { intensity: 0.05, duration: 0.12 }, aud);
    const o = ctx.getObject(e.pid); if (o) o.state.zipAt = ctx.now(); // the HUD's suppression edge
  } else if (e.k === "near") {
    const o = ctx.getObject(e.pid), now = ctx.now(); if (!o) return;
    o.state.nearMissFrom = { x: e.from.x, z: e.from.z, at: now };
    if (now - (o.state.ringAt ?? -1e9) > 2500) { // a round smacking in beside your head: a soft ring in that player's ears, not stacked
      o.state.ringAt = now; o.state.ringK = 0.25;
      ctx.emit("playSound", { clip: SND + "sfx-soft-ear-ringing-tinnitus-faint.mp3", position: e.pos ?? { ...o.feetPosition, y: o.feetPosition.y + 1.6 }, volume: 0.22, maxDistance: 6 }, { audience: { player: e.pid } });
    }
  }
}
