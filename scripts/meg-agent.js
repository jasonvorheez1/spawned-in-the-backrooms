import { rollLoot, garmentsOf } from "./lib/loot.js";
import { stripTo, SLOTS } from "./lib/clothes.js";
// An M.E.G. agent: holds its post, greets players, and fights. It paths (builtin/nav) to the nearest creature
// (hound, stealer) or a player who attacked the camp, shoots from range with line of sight, and goes home after.
// Hostility is per player: scripts/player.js marks state.angry when a player hits an agent; every agent nearby adopts it.
import { findPath } from "builtin/nav";
import { raycast } from "builtin/physics";
import { animate } from "builtin/tween";
import G from "./lib/data/meg.yml";
import { npcState, npcMul, lookOfNpc, dmgAfterArmor } from "./lib/stats.js";
const SHOT = "/cdn/moodboard-realistic-gritty/sfx-pistol-gunshot-concrete-echo.mp3";
const FLASH = `fx
pop flash burst=1 life=.06 size=.35 col=hdr(5,3.4,1.4) a=1>0 sz=$size r=sprite(soft-disc,add)
pop sparks burst=6 life=.1..0.2 v=sdir()*(2..4) size=.02 col=hdr(4,2.4,.8) a=1>0 r=sprite(ember,add,velocity,.03)
pop light burst=1 life=.07 r=light(<1,.7,.35>,14,5)`;
const HIT = `fx
pop blood burst=10 life=.4..0.7 v=sdir()*(1..2.4)+up(.6) size=.04..0.08 acc=grav() col=<.35,.05,.04> a=1>0 floor=stick r=sprite(soft-disc,alpha)`;
const FOES = ["hound", "stealer"];

export function onSpawn(ctx) {
  const me = ctx.self;
  if (!me.state.attr) { const r = npcState(ctx, "agent", G.hp); me.state.attr = r.attr; me.state.title = r.title; me.state.maxHp = r.hp; me.state.hp ??= r.hp; }
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
  for (const n of ctx.query({ tags: ["npc"], radius: 30 })) for (const k of Object.keys(n.state?.angry ?? {})) if (!grudges.has(k) && !(me.state.pardoned?.[k] && !me.state.angry?.[k] && !n.state?.fresh?.[k])) { grudges.add(k); me.state.angry = { ...(me.state.angry ?? {}), [k]: true }; }
  for (const pl of ctx.place.players) {
    if (!grudges.has(pl.id) || (pl.state?.hp ?? 1) <= 0) continue;
    // holstering calms the camp once (like Fallout): weapon away within sight, never pardoned before
    if (pl.state?.equipped === "fists" && !me.state.pardoned?.[pl.id] && flat(pl.feetPosition, p) < G.sight) {
      for (const n of [me, ...ctx.query({ tags: ["npc"], radius: 40 })]) {
        const a = { ...(n.state?.angry ?? {}) }; delete a[pl.id]; n.state.angry = a;
        n.state.pardoned = { ...(n.state?.pardoned ?? {}), [pl.id]: true };
      }
      grudges.delete(pl.id);
      ctx.emit("damageNumber", { position: { x: p.x, y: p.y + 2.1, z: p.z }, text: "STAND DOWN", color: "#c6f060", size: 1.1 }, { audience: { player: pl.id } });
      continue;
    }
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
  animate(ctx, me.id, { "bones.Spine2.pitch": [0, 7, 0], "bones.RightArm.pitch": [0, 12, 0] }, { duration: 0.2 }); // the kick
  if (ctx.random() > G.hitChance) return;
  const isPlayer = !!ctx.place.players.find((p) => p.id === t.id), dmg = Math.round((isPlayer ? G.playerShot : G.shot) * npcMul(me.state).dmg);
  t.state.hp -= dmg;
  ctx.emit("damageNumber", { position: { x: q.x, y: q.y + 0.4, z: q.z }, value: dmg, color: isPlayer ? "#ff5040" : "#c6f060" });
  ctx.emit("fx", { position: q, script: HIT, params: {} });
  ctx.emit("flash", { target: t.id, color: "#ffffff", duration: 0.08 });
  if (isPlayer) { ctx.emit("cameraPunch", { direction: { x: dx / l, y: 0, z: dz / l }, intensity: 0.35 }, { audience: { player: t.id } }); ctx.emit("screenShake", { intensity: 0.25, duration: 0.15 }, { audience: { player: t.id } }); }
}

function moveAlong(ctx, me, m, goal, speed, dt) {
  const p = me.feetPosition, now = ctx.now();
  const fin = (q, y0) => ({ x: Number.isFinite(q?.x) ? q.x : p.x, y: Number.isFinite(q?.y) ? q.y : y0, z: Number.isFinite(q?.z) ? q.z : p.z });
  goal = fin(goal, Number.isFinite(p.y) ? p.y : 0);
  if (!m.path || now > m.repath || flat(goal, m.pathGoal ?? goal) > 2) {
    const r = findPath(ctx, fin(p, goal.y), goal, {});
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

// two-handed aim: both hands reach for the target's chest, followed every frame; written only when the target changes
// the pistol: on the right hip while calm, in the right hand while fighting
function holster(ctx, me, m, drawn) {
  if (m.drawn === drawn) return;
  const gun = (me.children ?? []).map((c) => (typeof c === "string" ? ctx.getObject(c) : c?.id ? ctx.getObject(c.id) : c)).find((c) => c && (c.model || c.primitive));
  if (!gun) return; m.drawn = drawn;
  gun.attachment = drawn ? { bone: "RightHand" } : { bone: "Hips" };
  gun.feetPosition = drawn ? { x: 0, y: 0, z: 0 } : { x: 0.17, y: -0.06, z: 0.02 };
  gun.rotation = drawn ? { yaw: 0, pitch: 0, roll: 0 } : { yaw: 0, pitch: -90, roll: 0 };
  ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-gun-holster-leather.mp3", position: me.feetPosition, volume: 0.5, maxDistance: 15 });
}
function aim(me, m, t) {
  const id = t?.id ?? null;
  if (m.aimAt === id) return; m.aimAt = id;
  me.bones = id ? { RightHand: { reach: { to: { object: id, offset: { x: 0, y: 1.1, z: 0 } }, blendIn: 0.15, blendOut: 0.3 } }, LeftHand: { reach: { to: { object: id, offset: { x: 0, y: 1.05, z: 0 } }, blendIn: 0.2, blendOut: 0.3 } } } : null;
}

export function update(ctx, dt) {
  const me = ctx.self, s = me.state, m = (me.session.m ??= { waved: {}, next: 0, shots: 0 }), now = ctx.now();
  if (s.dead || (s.hp ?? 1) <= 0) {
    if (!m.down) {
      m.down = true; stop(me, dt); aim(me, m, null); me.anim.talk = null; me.anim.hit = null; me.anim.wave = null; me.bones = null;
      // a ragdoll: the body drops where it was hit, in its own fur and jacket, knocked back off its feet
      const yaw = ((typeof me.rotation === "number" ? me.rotation : me.rotation?.yaw) ?? 0) * Math.PI / 180;
      me.ragdoll = { impulse: { x: Math.sin(yaw) * 60, y: 25, z: Math.cos(yaw) * 60 }, settleSeconds: 2 };
      if (s.items === undefined) s.items = ["ammo", ...rollLoot(ctx, 1.4), ...garmentsOf(lookOfNpc(me))].join(","); // what they carried (always a box of rounds) and every garment they wore
      if (!s.look) s.look = lookOfNpc(me); // the body's look as it fell; looting a garment strips it off
      s.name = (s.name ?? "Agent") + "'s body";
      ctx.after(90, "vanish", {});
    }
    if (s.look && m.stripped !== s.items) { // a garment taken from the remains comes off the body
      m.stripped = s.items;
      const l = stripTo(s.look, String(s.items ?? "").split(",").filter(Boolean));
      if (me.primitive?.params && SLOTS.some((k) => (me.primitive.params[k] ?? "none") !== l[k])) me.primitive = { ...me.primitive, params: { ...me.primitive.params, ...Object.fromEntries(SLOTS.map((k) => [k, l[k]])) } };
    }
    return;
  }
  // a flinch every time something takes hp off them
  if (m.lastHp != null && (s.hp ?? 0) < m.lastHp - 0.5) me.anim.hit = { clip: "cdn/clip-hit-react.glb", loop: "once", weight: 0.8, blendIn: 0.05, blendOut: 0.3, timeAt: now };
  m.lastHp = s.hp;
  // talking: interact.js stamps state.talkAt and talkTo when a player presses E on them
  const talking = s.talkAt && now - s.talkAt < 2600;
  if (talking !== !!m.talking) { m.talking = talking; me.anim.talk = talking ? { clip: "cdn/clip-talk-loop.glb", loop: "loop", weight: 1, blendIn: 0.25, blendOut: 0.4, mask: { from: "Spine" } } : null; }
  const home = s.home ?? me.feetPosition;
  const t = pickTarget(ctx, me, m);
  holster(ctx, me, m, !!(t && flat(t.feetPosition, home) < G.leash));
  if (t && flat(t.feetPosition, home) < G.leash) {
    const d = flat(t.feetPosition, me.feetPosition), see = seesIt(ctx, me, t), reloading = now < (m.reloadUntil ?? 0);
    if (d > G.range || !see) { gait(me, m, "run"); aim(me, m, null); moveAlong(ctx, me, m, t.feetPosition, G.run, dt); }
    else { gait(me, m, "idle"); stop(me, dt); aim(me, m, reloading ? null : t); face(me, t.feetPosition.x - me.feetPosition.x, t.feetPosition.z - me.feetPosition.z, dt); }
    if (see && d <= G.range && !reloading && now >= m.next) {
      m.next = now + G.fireEvery * 1000 * (0.85 + ctx.random() * 0.3); shoot(ctx, me, t);
      if (++m.shots >= 8) { m.shots = 0; m.reloadUntil = now + 1800; ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-pistol-magazine-reload-click.mp3", position: me.feetPosition, volume: 0.6, maxDistance: 20 }); } // arms drop, a fresh mag
    }
    return;
  }
  aim(me, m, null);
  if (flat(home, me.feetPosition) > 1) { gait(me, m, "walk"); moveAlong(ctx, me, m, home, G.walk, dt); return; }
  stop(me, dt); gait(me, m, "idle"); m.path = null;
  // at the post: turn to whoever walks up, wave once (not at someone the camp is at war with)
  let near = null, best = 7;
  for (const pl of ctx.place.players) { const d = flat(pl.feetPosition, me.feetPosition); if (d < best) { best = d; near = pl; } }
  if (!near) {
    if (now > (m.glance ?? 0)) { m.glance = now + 5000 + ctx.random() * 5000; animate(ctx, me.id, { "bones.Head.yaw": [0, (ctx.random() - 0.5) * 80, 0] }, { duration: 2.8, easing: "easeInOutSine" }); } // a glance down the halls
    ctx.sleep(0.5); return;
  }
  face(me, near.feetPosition.x - me.feetPosition.x, near.feetPosition.z - me.feetPosition.z, dt);
  if (!m.waved[near.id] && best < 5 && !s.angry?.[near.id]) { m.waved[near.id] = true; me.anim.wave = { clip: "cdn/clip-wave-loop.glb", loop: "once", weight: 1, blendIn: 0.25, blendOut: 0.4, mask: { from: "Spine" } }; }
}
export function vanish(ctx) { ctx.destroy(ctx.self.id); }
