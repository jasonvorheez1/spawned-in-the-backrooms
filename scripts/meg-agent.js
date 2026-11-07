// An M.E.G. agent: holds its post, greets players, and fights. It paths (builtin/nav) to the nearest creature
// (hound, stealer) or a player who attacked the camp, shoots from range with line of sight, and goes home after.
// Hostility is per player: scripts/player.js marks state.angry when a player hits an agent; every agent nearby adopts it.
import { findPath } from "builtin/nav";
import { raycast } from "builtin/physics";
import G from "./lib/data/meg.yml";
const SHOT = "/cdn/moodboard-realistic-gritty/sfx-pistol-gunshot-concrete-echo.mp3";
const FLASH = `fx
pop flash burst=1 life=.06 size=.35 col=hdr(5,3.4,1.4) a=1>0 sz=$size r=sprite(soft-disc,add)
pop sparks burst=6 life=.1..0.2 v=sdir()*(2..4) size=.02 col=hdr(4,2.4,.8) a=1>0 r=sprite(ember,add,velocity,.03)
pop light n=1 life=.07 r=light(<1,.7,.35>,14,5)`;
const HIT = `fx
pop blood burst=10 life=.4..0.7 v=sdir()*(1..2.4)+up(.6) size=.04..0.08 acc=grav() col=<.35,.05,.04> a=1>0 floor=stick r=sprite(soft-disc,alpha)`;
const FOES = ["hound", "stealer"];

export function onSpawn(ctx) {
  const me = ctx.self;
  me.state.hp ??= G.hp;
  me.state.home ??= { x: me.feetPosition.x, y: me.feetPosition.y, z: me.feetPosition.z };
  me.anim.idle = { clip: "Idle", loop: "loop", weight: 1 };
}

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const chest = (p) => ({ x: p.x, y: p.y + 1.1, z: p.z });

function pickTarget(ctx, me, m) {
  const p = me.feetPosition;
  let best = null, bd = G.sight;
  for (const tag of FOES) for (const f of ctx.query({ tags: [tag], radius: G.sight })) {
    if (f.state?.dead || (f.state?.hp ?? 1) <= 0) continue;
    const d = flat(f.feetPosition, p); if (d < bd) { bd = d; best = f; }
  }
  // a player who attacked the camp: this agent's grudge, or a neighbour's
  const grudges = new Set(Object.keys(me.state.angry ?? {}));
  for (const n of ctx.query({ tags: ["npc"], radius: 30 })) for (const k of Object.keys(n.state?.angry ?? {})) if (!grudges.has(k)) { grudges.add(k); me.state.angry = { ...(me.state.angry ?? {}), [k]: true }; }
  for (const pl of ctx.place.players) {
    if (!grudges.has(pl.id) || (pl.state?.hp ?? 1) <= 0) continue;
    const d = flat(pl.feetPosition, p); if (d < bd) { bd = d; best = pl; }
  }
  return best;
}

function seesIt(ctx, me, t) {
  const o = chest(me.feetPosition), q = chest(t.feetPosition), dx = q.x - o.x, dy = q.y - o.y, dz = q.z - o.z, l = Math.hypot(dx, dy, dz) || 1;
  return !raycast(ctx, o, { x: dx / l, y: dy / l, z: dz / l }, { distance: l, physicsOnly: true, bodies: "static", ignoreEntities: [me.id, t.id] });
}

function shoot(ctx, me, t) {
  const o = chest(me.feetPosition), q = chest(t.feetPosition), dx = q.x - o.x, dz = q.z - o.z, l = Math.hypot(dx, dz) || 1;
  const muzzle = { x: o.x + dx / l * 0.5, y: o.y + 0.15, z: o.z + dz / l * 0.5 };
  ctx.emit("fx", { position: muzzle, script: FLASH });
  ctx.emit("playSound", { clip: SHOT, position: muzzle, volume: 0.9, maxDistance: 45 });
  if (ctx.random() > G.hitChance) return;
  const isPlayer = !!ctx.place.players.find((p) => p.id === t.id), dmg = isPlayer ? G.playerShot : G.shot;
  t.state.hp -= dmg;
  ctx.emit("damageNumber", { position: { x: q.x, y: q.y + 0.4, z: q.z }, value: dmg, color: isPlayer ? "#ff5040" : "#c6f060" });
  ctx.emit("fx", { position: q, script: HIT, params: {} });
  ctx.emit("flash", { target: t.id, color: "#ffffff", duration: 0.08 });
  if (isPlayer) { ctx.emit("cameraPunch", { direction: { x: dx / l, y: 0, z: dz / l }, intensity: 0.35 }, { audience: { player: t.id } }); ctx.emit("screenShake", { intensity: 0.25, duration: 0.15 }, { audience: { player: t.id } }); }
}

function moveAlong(ctx, me, m, goal, speed, dt) {
  const p = me.feetPosition, now = ctx.now();
  if (!m.path || now > m.repath || flat(goal, m.pathGoal ?? goal) > 2) {
    const r = findPath(ctx, p, goal, {});
    if (r?.points?.length) { m.path = r.points; m.i = 0; m.pathGoal = { ...goal }; }
    m.repath = now + (r?.partial ? 150 : 1200);
  }
  let to = goal;
  if (m.path) { while (m.i < m.path.length - 1 && flat(m.path[m.i], p) < 0.6) m.i++; to = m.path[m.i] ?? goal; }
  const dx = to.x - p.x, dz = to.z - p.z, d = Math.hypot(dx, dz) || 1;
  me.velocity = { x: dx / d * speed, y: (me.velocity?.y ?? 0) - 20 * dt, z: dz / d * speed };
  face(me, dx, dz, dt);
}
function stop(me, dt) { me.velocity = { x: 0, y: (me.velocity?.y ?? 0) - 20 * dt, z: 0 }; }
function face(me, dx, dz, dt) {
  const want = Math.atan2(-dx, -dz) * 57.2958, cur = me.rotation?.yaw ?? 0, d = ((want - cur + 540) % 360) - 180;
  if (Math.abs(d) > 3) me.rotation = { yaw: cur + d * Math.min(1, dt * 8) };
}
function gait(me, m, kind) {
  if (m.gait === kind) return; m.gait = kind;
  me.anim.idle = { clip: kind === "run" ? "Run" : kind === "walk" ? "Walk" : "Idle", loop: "loop", weight: 1, blendIn: 0.2 };
}

export function update(ctx, dt) {
  const me = ctx.self, s = me.state, m = (me.session.m ??= { waved: {}, next: 0 }), now = ctx.now();
  if (s.dead || (s.hp ?? 1) <= 0) {
    if (!m.down) { m.down = true; stop(me, dt); me.anim.idle = { clip: "cdn/clip-death-backward.glb", loop: "once", weight: 1, blendIn: 0.15 }; ctx.after(4, "vanish", {}); }
    return;
  }
  const home = s.home ?? me.feetPosition;
  const t = pickTarget(ctx, me, m);
  if (t && flat(t.feetPosition, home) < G.leash) {
    const d = flat(t.feetPosition, me.feetPosition), see = seesIt(ctx, me, t);
    if (d > G.range || !see) { gait(me, m, "run"); moveAlong(ctx, me, m, t.feetPosition, G.run, dt); }
    else { gait(me, m, "idle"); stop(me, dt); face(me, t.feetPosition.x - me.feetPosition.x, t.feetPosition.z - me.feetPosition.z, dt); }
    if (see && d <= G.range && now >= m.next) { m.next = now + G.fireEvery * 1000 * (0.85 + ctx.random() * 0.3); shoot(ctx, me, t); }
    return;
  }
  if (flat(home, me.feetPosition) > 1) { gait(me, m, "walk"); moveAlong(ctx, me, m, home, G.walk, dt); return; }
  stop(me, dt); gait(me, m, "idle"); m.path = null;
  // at the post: turn to whoever walks up, wave once (not at someone the camp is at war with)
  let near = null, best = 7;
  for (const pl of ctx.place.players) { const d = flat(pl.feetPosition, me.feetPosition); if (d < best) { best = d; near = pl; } }
  if (!near) { ctx.sleep(0.5); return; }
  face(me, near.feetPosition.x - me.feetPosition.x, near.feetPosition.z - me.feetPosition.z, dt);
  if (!m.waved[near.id] && best < 5 && !s.angry?.[near.id]) { m.waved[near.id] = true; me.anim.wave = { clip: "cdn/clip-wave-loop.glb", loop: "once", weight: 1, blendIn: 0.25, blendOut: 0.4 }; }
}
export function vanish(ctx) { ctx.destroy(ctx.self.id); }
