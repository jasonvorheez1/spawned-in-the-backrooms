// Entity 6, the Duller. Tall, grey, faceless. Seen, it slinks out of sight; charged, it bolts without a sound.
// It hunts from the other side of a wall: the plaster cracks, a long arm comes through, and you are dragged
// into its hall. It takes an almond water bottle and runs. Drink almond water and it will not touch you.
import { raycast } from "builtin/physics";
import { clearSight } from "./lib/sight.js";
import { navPath } from "./lib/nav.js";
import { heard } from "./lib/hear.js";
import { dmgAfterArmor } from "./lib/stats.js";
import { becomeCorpse } from "./lib/l5-hostile.js";
import { knocked } from "./lib/knock.js";
import D from "./lib/data/dullers.yml";
export const updateSchedule = { every: 2 };
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const S = { crack: "drywall-cracking-as-a-bony-hand-pushes-through-it", grip: "cold-long-fingers-clamping-hard-around-a-wrist", drag: "body-dragged-fast-across-carpet-and-through-drywall",
  hurt: "dry-airless-wheeze-from-a-faceless-thing", die: "brittle-thin-limbs-folding-onto-carpet", miss: "long-arm-snatching-back-through-a-wall-hole" };
const DUST = `fx
pop chunks burst=10..14 life=.6..1 v=<%n|0,0,1>*(1.5..3)+sdir()*(.6..1.2) size=.03..0.07 acc=grav()+drag(.4) col=<.82,.78,.62> a=1>.8:1>0 sz=$size floor=bounce(.2) r=sprite(soft-disc,alpha)
pop dust burst=8 life=.8..1.4 v=<%n|0,0,1>*(.6..1.2)+sdir()*.3 size=.25..0.45 acc=drag(1.5)+buoy(.2) col=<.78,.74,.6> a=0>.4:.4>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)`;
const AW = [["almonds", "grey"], ["almondsB", "blue"], ["almondsG", "green"], ["almondsR", "red"]];
const flat = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const alive = (p) => !(p.state?.dead || (p.state?.hp ?? 1) <= 0);
const say = (ctx, clip, position, volume = 0.9, maxDistance = 22) => heard(ctx, { clip: SND(clip), position, volume, maxDistance, refDistance: 3 });
const drank = (p, now) => now - (p.state?.almondAt ?? -1e12) < D.almondMs;
function anim(o, m, clip, loop = true) { if (m.clip === clip) return; m.clip = clip; o.anim.main = { clip, loop, clampWhenFinished: !loop, weight: 1, blend: 0.2 }; }
function face(o, m, dx, dz, now) { // its stance never settles: a slow drunken roll on top of every heading
  if (dx || dz) m.yaw = (Math.atan2(-dx, -dz) * 180) / Math.PI;
  o.rotation = { yaw: m.yaw ?? 0, roll: Math.sin(now / 260) * 5 + Math.sin(now / 97) * 1.5 };
}
function stand(ctx, o, dt) { o.velocity = { x: 0, y: (o.velocity?.y ?? 0) + ctx.place.gravity.y * dt, z: 0 }; }
function moveTo(ctx, o, m, goal, speed, dt, now) {
  const pos = o.feetPosition;
  if (!m.path || now > m.pathAt || flat(m.pathGoal, goal) > 2) {
    const r = navPath(ctx, pos, goal);
    if (!r.wait) { m.path = r.points?.length ? r.points.map((p) => ({ x: p.x, z: p.z })) : [{ x: goal.x, z: goal.z }]; m.pathAt = now + 700; m.pathGoal = { x: goal.x, z: goal.z }; }
  }
  if (m.path) while (m.path.length > 1 && flat(pos, m.path[0]) < 0.6) m.path.shift();
  const next = m.path?.[0] ?? goal, dx = next.x - pos.x, dz = next.z - pos.z, d = Math.hypot(dx, dz);
  const vy = (o.velocity?.y ?? 0) + ctx.place.gravity.y * dt;
  if (d < 0.3) { o.velocity = { x: 0, y: vy, z: 0 }; face(o, m, 0, 0, now); return 0; }
  o.velocity = { x: (dx / d) * speed, y: vy, z: (dz / d) * speed };
  face(o, m, dx, dz, now);
  return d;
}
function fleeGoal(ctx, o, from) { // the clearest way out, biased away from the threat
  const pos = o.feetPosition, eye = { x: pos.x, y: pos.y + 1.3, z: pos.z };
  const base = Math.atan2(pos.z - from.z, pos.x - from.x); let best = null;
  for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
    const a = base + off, dir = { x: Math.cos(a), y: 0, z: Math.sin(a) };
    const h = raycast(ctx, eye, dir, { distance: 14, physicsOnly: true, bodies: "static" });
    const len = (h ? h.distance : 14) - 0.7 - Math.abs(off) * 2;
    if (!best || len > best.len) best = { len, x: pos.x + dir.x * Math.max(0.5, (h ? h.distance : 14) - 0.7), z: pos.z + dir.z * Math.max(0.5, (h ? h.distance : 14) - 0.7) };
  }
  return best;
}
function wallBetween(ctx, o, p) { // a wall between it and you, close enough to reach through: where its hand comes out
  const a = { x: o.feetPosition.x, y: o.feetPosition.y + 1.3, z: o.feetPosition.z }, b = { x: p.feetPosition.x, y: p.feetPosition.y + 1.2, z: p.feetPosition.z };
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz) || 1;
  const h = raycast(ctx, a, { x: dx / d, y: dy / d, z: dz / d }, { distance: d, physicsOnly: true, bodies: "static", excludeTags: ["player", "duller"] });
  const n = Math.hypot(dx, dz) || 1;
  return h && h.distance < d - 0.3 ? { x: h.position.x, y: h.position.y, z: h.position.z, n: { x: dx / n, y: 0, z: dz / n } } : null;
}
function flee(ctx, o, m, from, now) { m.flee = now + D.fleeMs; m.fleeFrom = { x: from.x, z: from.z }; m.fleeGoal = null; m.path = null; }
export function update(ctx, dt) {
  const o = ctx.self, st = o.state, now = ctx.now(), m = (ctx.self.session.m ??= {}), pos = o.feetPosition;
  if (st.dead || (st.hp ?? 1) <= 0) return dead(ctx, o, m, now);
  if (knocked(ctx, o, now, dt)) return;
  let tgt = null, td = 1e9;
  for (const p of ctx.place.players) { if (!alive(p)) continue; const d = flat(pos, p.feetPosition); if (d < td) { td = d; tgt = p; } }
  if (!tgt || td > D.despawnRange) { // nobody near: it wanders off into the halls for good
    m.alone ??= now; stand(ctx, o, dt); anim(o, m, "Idle");
    if (now - m.alone > 30000) ctx.destroy(o.id); return;
  }
  m.alone = null;
  if (m.hp != null && (st.hp ?? 0) < m.hp) { say(ctx, S.hurt, { x: pos.x, y: pos.y + 2, z: pos.z }, 0.9); if (!m.grab) { m.reach = null; flee(ctx, o, m, tgt.feetPosition, now); } }
  m.hp = st.hp;
  if (m.grab) return grabStep(ctx, o, m, now, dt);
  if (m.reach) return reachStep(ctx, o, m, now, dt);
  // what you are doing to it
  const head = { x: tgt.feetPosition.x, y: tgt.feetPosition.y + (tgt.state?.crouch ? 0.8 : 1.5), z: tgt.feetPosition.z };
  const seen = td < D.sight && clearSight(ctx, { x: pos.x, y: pos.y + 2.2, z: pos.z }, head, [o.id, tgt.id]);
  const ax = tgt.state?.aimX ?? 0, az = tgt.state?.aimZ ?? -1, watched = seen && ((pos.x - tgt.feetPosition.x) * ax + (pos.z - tgt.feetPosition.z) * az) / (td || 1) > 0.55;
  const closing = m.lastTd != null && m.lastAt ? (m.lastTd - td) / Math.max(0.03, (now - m.lastAt) / 1000) : 0;
  m.lastTd = td; m.lastAt = now;
  if (now >= (m.flee ?? 0) && seen && (closing > D.charge || (watched && td < 9) || (drank(tgt, now) && td < D.almondKeep))) flee(ctx, o, m, tgt.feetPosition, now);
  if (now < (m.flee ?? 0)) { // bolting, silent
    if (!m.fleeGoal || now > (m.fleeAt ?? 0) || flat(pos, m.fleeGoal) < 1) { m.fleeGoal = fleeGoal(ctx, o, tgt.feetPosition); m.fleeAt = now + 1200; m.path = null; }
    moveTo(ctx, o, m, m.fleeGoal, D.run, dt, now); anim(o, m, "Run"); return;
  }
  if (seen) { // seen but not charged: it slinks back out of your sight
    if (!m.slink || now > m.slinkAt) { m.slink = fleeGoal(ctx, o, tgt.feetPosition); m.slinkAt = now + 1500; m.path = null; }
    moveTo(ctx, o, m, m.slink, D.walk * 1.3, dt, now); anim(o, m, "Walk"); return;
  }
  // unseen: it never comes round the corner. it finds the wall you are standing at and comes up behind it
  if (td < D.stalk && now >= (m.cool ?? 0) && !drank(tgt, now) && !tgt.state?.freeze) {
    const w = wallBetween(ctx, o, tgt);
    if (w && flat(tgt.feetPosition, w) < D.wallNear) {
      if (flat(pos, w) < D.armNear) {
        m.reach = { id: tgt.id, at: now, wall: w }; m.path = null; m.clip = null; anim(o, m, "cdn/clip-attack.glb", false);
        stand(ctx, o, dt); face(o, m, tgt.feetPosition.x - pos.x, tgt.feetPosition.z - pos.z, now);
        say(ctx, S.crack, w, 1, 20);
        ctx.emit("fx", { position: w, script: DUST, params: { n: w.n } });
        ctx.emit("screenShake", { intensity: 0.2, duration: 0.3 }, { audience: { player: tgt.id } });
        return;
      }
      const spot = { x: w.x - w.n.x * 0.7, z: w.z - w.n.z * 0.7 };
      if (moveTo(ctx, o, m, spot, D.walk, dt, now) > 0) anim(o, m, "Walk"); else anim(o, m, "Idle");
      return;
    }
  }
  if (moveTo(ctx, o, m, tgt.feetPosition, td < 6 ? D.walk * 0.7 : D.walk, dt, now) > 0) anim(o, m, "Walk"); else anim(o, m, "Idle");
}
function reachStep(ctx, o, m, now, dt) {
  const r = m.reach, p = ctx.place.players.find((q) => q.id === r.id); stand(ctx, o, dt);
  if (!p || !alive(p) || drank(p, now) || flat(p.feetPosition, r.wall) > D.reachRange + 0.8) { // stepped away, or the almond water on your breath: the arm snaps back
    m.reach = null; m.cool = now + D.cooldownMs * 0.5; say(ctx, S.miss, r.wall, 0.8, 18);
    if (p) flee(ctx, o, m, p.feetPosition, now); return;
  }
  if (now - r.at < D.tellMs) return;
  const pos = o.feetPosition, from = { x: p.feetPosition.x, y: p.feetPosition.y, z: p.feetPosition.z };
  const away = { x: pos.x - r.wall.x, z: pos.z - r.wall.z }, al = Math.hypot(away.x, away.z) || 1;
  const to = { x: pos.x - (away.x / al) * 0.2, y: pos.y, z: pos.z - (away.z / al) * 0.2 }; // its own hall, right where it stood
  o.feetPosition = { x: pos.x + (away.x / al) * 1.1, y: pos.y + 0.02, z: pos.z + (away.z / al) * 1.1 }; // it steps back to haul you through
  m.reach = null; m.grab = { id: p.id, at: now, from, to };
  p.state.freeze = { until: now + D.dragMs + 400, yaw: (Math.atan2(-(r.wall.x - from.x), -(r.wall.z - from.z)) * 180) / Math.PI, pitch: 0, by: "duller" };
  const len = Math.hypot(r.wall.x - from.x, r.wall.z - from.z) + 1.2;
  ctx.spawn({ id: "duller-arm-" + Math.floor(now), lifetime: D.dragMs / 1000 + 0.2, feetPosition: { x: r.wall.x, y: from.y + 1.2, z: r.wall.z },
    rotation: { lookAt: { x: from.x, y: from.y + 1.1, z: from.z }, include: ["yaw", "pitch"] },
    children: [{ feetPosition: { x: 0, y: 0, z: -len / 2 + 0.6 }, pivot: "center", rotation: { pitch: 90 }, primitive: { kind: "cylinder", radiusTop: 0.035, radiusBottom: 0.05, height: len }, material: { color: "oklch(0.58 0.012 90)", roughness: 0.9 }, castShadow: false }] });
  say(ctx, S.grip, from, 1, 18); say(ctx, S.drag, r.wall, 1, 26);
  ctx.emit("screenFlash", { color: "#2a2a26", duration: 0.35, intensity: 0.6 }, { audience: { player: p.id } });
  ctx.emit("screenShake", { intensity: 0.8, duration: 0.6 }, { audience: { player: p.id } });
}
function grabStep(ctx, o, m, now, dt) {
  const g = m.grab, p = ctx.place.players.find((q) => q.id === g.id); stand(ctx, o, dt);
  if (!p) { m.grab = null; return; }
  const k = Math.min(1, (now - g.at) / D.dragMs), e = k * k * (3 - 2 * k);
  p.feetPosition = { x: g.from.x + (g.to.x - g.from.x) * e, y: Math.max(g.from.y, g.to.y) + 0.05, z: g.from.z + (g.to.z - g.from.z) * e };
  if (k < 1) return;
  m.grab = null; m.cool = now + D.cooldownMs;
  const s = p.state, have = AW.find(([k]) => (s[k] ?? 0) > 0);
  let dmg = D.grabDmg;
  if (have) { s[have[0]] -= 1; o.state.stolen = [...String(o.state.stolen ?? "").split(",").filter(Boolean), "almond:" + have[1]].join(","); s.notice = { text: "It took a bottle of almond water and ran. Kill it to get it back.", at: now }; }
  else { dmg += D.noAlmondExtra; s.notice = { text: "Long grey fingers, then nothing. Keep almond water on you.", at: now }; }
  s.hp -= dmgAfterArmor(s.look, dmg); s.sanity = Math.max(0, (s.sanity ?? 100) - D.grabSan);
  ctx.emit("damageNumber", { position: { x: g.to.x, y: g.to.y + 1.3, z: g.to.z }, value: dmg, color: "#ff5040" });
  ctx.emit("cameraPunch", { direction: { x: 0, y: -0.3, z: 0.4 }, intensity: 0.8 }, { audience: { player: p.id } });
  flee(ctx, o, m, p.feetPosition, now); // and it is gone, with your bottle
}
function dead(ctx, o, m, now) {
  const pos = o.feetPosition;
  if (!m.deadAt) {
    m.deadAt = now; m.grab = null; m.reach = null; o.anim.main = null; m.clip = null; o.velocity = { x: 0, y: 0, z: 0 };
    say(ctx, S.die, pos, 0.9, 26);
    const loot = [...String(o.state.stolen ?? "").split(",").filter(Boolean), ...(ctx.random() < 0.5 ? ["almond"] : []), ...(ctx.random() < 0.4 ? ["cash:25"] : [])];
    if (!o.tags?.includes("remains")) becomeCorpse(ctx, o, "Duller", []);
    o.state.items = [...String(o.state.items ?? "").split(",").filter(Boolean), ...loot].join(",");
    return;
  }
  if ((!String(o.state.items ?? "") && now - m.deadAt > 60000 && now > (o.state.inspectUntil ?? 0)) || now - m.deadAt > 600000) ctx.destroy(o.id);
}
