// Level 109's keeper: ONE behaviour moves every thing shut in the hospital's rooms (tags ["pen-foe"], spawned by
// scripts/lib/l109-foes.js). The rule: state.pen set = it stays inside state.penBox, paces, and comes to scratch at the
// inside of its shut door when it hears something; an opened door (containment.doorOpen) lets it walk out, and once past
// the room's edge it is loose for good (state.pen = null, state.penFrom = room): it hunts the corridors and no AI opens a door.
// Numbers: scripts/lib/data/l109-foes.yml.
import D from "./lib/data/l109-foes.yml";
import { raycast } from "builtin/physics";
import { inside, doorOpen } from "./lib/containment.js";
import { heard } from "./lib/hear.js";
import { wallSteer, wedged, canStrike, shotAt } from "./lib/hunt.js";
import { clearSight } from "./lib/sight.js";
import { dmgAfterArmor } from "./lib/stats.js";
import { CRAWL, FIDGET, MAW } from "./lib/clump.js";

const DEG = 180 / Math.PI, flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const kindOf = (f) => f.state.penKind ?? (f.state.kind === "moths" ? "deathmoth" : f.state.kind);
const between = (ctx, r) => r[0] + ctx.random() * (r[1] - r[0]);
// which way is "into the room" at this door: away from the box edge the door sits on
function frame(box, d) {
  const e = [[Math.abs(d.x - box.x0), 1, 0], [Math.abs(d.x - box.x1), -1, 0], [Math.abs(d.z - box.z0), 0, 1], [Math.abs(d.z - box.z1), 0, -1]].sort((a, b) => a[0] - b[0])[0];
  return { nx: e[1], nz: e[2] };
}
export const ears = {
  noise: (ctx, n) => { if (n?.position) ctx.self.session.noise = { x: n.position.x, z: n.position.z, r: n.radius ?? 20, at: ctx.now() }; },
  "pen:door": (ctx, e) => { if (e?.pos) ctx.self.session.noise = { x: e.pos.x, z: e.pos.z, r: 26, at: ctx.now() }; }, // a door somewhere: the neighbours stir
};
function sense(ctx, f, K, pos, players) { // the nearest wanderer it sees (clear line) or hears (close, on its feet)
  let out = null;
  const eye = { x: pos.x, y: pos.y + 0.7, z: pos.z };
  for (const p of players) {
    const t = p.feetPosition, d = flat(t, pos); if (d > K.sight || (p.state?.hp ?? 1) <= 0 || p.state?.god && p.state?.ghost) continue;
    const seen = clearSight(ctx, eye, { x: t.x, y: t.y + 1.2, z: t.z }, [f.id, p.id]);
    const v = p.velocity ?? {}, loud = !p.state?.crouch && Math.hypot(v.x ?? 0, v.z ?? 0) > 1.5;
    if ((seen || (loud && d < K.hear)) && (!out || d < out.d)) out = { p, d, seen };
  }
  return out;
}
function setClip(f, m, kind, name) {
  if (m.clip === name) return; m.clip = name;
  if (kind === "hound") f.anim.main = { clip: name, loop: name !== "maul" && name !== "pounce", weight: 1, blend: 0.2 };
  else if (kind === "clump") f.anim.main = name === "maul" ? { clip: MAW, loop: false, weight: 1, blend: 0.1 } : { clip: name === "idle" ? FIDGET : CRAWL, loop: true, weight: 1, blend: 0.2 };
  else if (kind === "skinstealer") {
    if (name === "maul") f.anim.act = { clip: "Slash", weight: 4, loop: false };
    else { f.anim.act = null; f.anim.base = { clip: name === "idle" ? "Hunt" : name === "run" ? "Run" : "Walk", weight: 1, loop: true }; }
  }
}
function die(ctx, f, m, kind, now) {
  m.died = now; if (!f.state.dead) f.state.dead = true; f.state.diedAt ??= now;
  f.velocity = { x: 0, y: 0, z: 0 }; if (f.audio) f.audio = null;
  if (kind === "hound") f.anim.main = { clip: "death", loop: false, clampWhenFinished: true, weight: 1 };
  else if (kind === "skinstealer") { f.anim.base = null; f.anim.act = { clip: "Death", weight: 4, loop: false, clampWhenFinished: true }; }
  else if (kind === "clump") f.anim.main = null;
  else { f.fx = null; for (let i = 0; i < 3; i++) { const k = ctx.getObject(`${f.id}/m${i}`); if (k) k.anim.main = { clip: "Death", loop: false, clampWhenFinished: true }; } }
}
export function update(ctx, dt) {
  const now = ctx.now(), ses = ctx.self.session, mem = (ses.m ??= {}), g = ctx.place.gravity?.y ?? -9.8;
  const players = ctx.place.players.filter((p) => p.feetPosition);
  const foes = ctx.query({ tags: ["pen-foe"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
  if (!players.length) return;
  { const me = ctx.self.feetPosition; let best = null, bd = 1e9; for (const p of players) { const d = flat(p.feetPosition, me); if (d < bd) { bd = d; best = p; } }
    if (best && bd > D.mgrFollow) ctx.self.feetPosition = { x: best.feetPosition.x, y: 0, z: best.feetPosition.z }; } // stay where the world ticks
  const noise = ses.noise && now - ses.noise.at < 1500 ? ses.noise : null;
  const live = new Set();
  for (const f of foes) {
    live.add(f.id);
    const kind = kindOf(f), K = D.kinds[kind]; if (!K) continue;
    const m = (mem[f.id] ??= { senseAt: now + ctx.random() * 200 }), pos = f.feetPosition, S = D.sounds[kind], moth = kind === "deathmoth";
    if (f.state.dead || f.state.hp <= 0) { if (!m.died) die(ctx, f, m, kind, now); else if (moth && now - m.died > 1500) ctx.destroy(f.id); continue; }
    if (moth && !m.wings) { m.wings = 1; for (let i = 0; i < 3; i++) { const k = ctx.getObject(`${f.id}/m${i}`); if (k) k.anim.main = { clip: "Flutter", loop: true }; } }
    if (now >= m.senseAt) { m.senseAt = now + 220; m.prey = sense(ctx, f, K, pos, players); if (m.prey) m.last = { x: m.prey.p.feetPosition.x, z: m.prey.p.feetPosition.z, at: now }; }
    const shot = shotAt(f.state, now); if (shot && !m.prey) m.last = { x: shot.x, z: shot.z, at: now };
    const prey = m.prey && ctx.place.players.includes(m.prey.p) ? m.prey : null;
    let goal = null, speed = 0, clip = "idle", face = null, pass = false;
    const pen = f.state.pen, box = f.state.penBox, door = f.state.penDoor ?? f.state.lure;
    if (pen && box && !inside(box, pos, 0.3)) { f.state.pen = null; f.state.penFrom = pen; m.exit = false; m.sq = null; m.last = m.last ?? { x: pos.x, z: pos.z, at: now }; } // over the threshold: loose for good
    else if (pen && box && door) {
      const fr = (m.fr ??= frame(box, door)), inPt = { x: door.x + fr.nx * D.doorIn, z: door.z + fr.nz * D.doorIn }, outPt = { x: door.x - fr.nx * D.doorOut, z: door.z - fr.nz * D.doorOut };
      const open = doorOpen(ctx, pen), lured = f.state.lure && now - f.state.lure.at < D.lureSec * 1000;
      if (noise && flat(noise, door) < noise.r) m.stir = now + D.noiseSec * 1000;
      else if (now > (m.stepAt ?? 0)) { m.stepAt = now + 400; for (const p of players) { const v = p.velocity ?? {}; if (!p.state?.crouch && Math.hypot(v.x ?? 0, v.z ?? 0) > 1.5 && flat(p.feetPosition, door) < D.doorHear) m.stir = now + D.noiseSec * 1000; } }
      if (open && (lured || prey || m.exit || shot)) { // the door is open: to the doorway, then through it
        m.exit = true; if (flat(pos, inPt) < 0.5) m.atIn = true;
        goal = m.atIn ? outPt : inPt; speed = K.run * 0.8; clip = "run"; pass = Math.abs((pos.x - door.x) * fr.nz + (pos.z - door.z) * fr.nx) < D.doorPass;
        if (m.atIn && !m.sq && now > (m.sqAt ?? 0)) { m.sqAt = now + 800; if (flat(pos, m.sqP ?? { x: 1e9, z: 1e9 }) < 0.15) m.sq = { fx: pos.x, fz: pos.z, t: 0 }; m.sqP = { x: pos.x, z: pos.z }; } // jammed in the frame: it squeezes through
      } else {
        m.exit = false; m.atIn = false; m.sq = null;
        if (now < (m.stir ?? 0)) { // something out there: to the door, and scratch
          if (flat(pos, inPt) > 0.7) { goal = inPt; speed = K.run * 0.6; clip = "run"; }
          else { face = { x: -fr.nx, z: -fr.nz };
            if (!open && now > (m.thumpAt ?? 0)) { m.thumpAt = now + between(ctx, D.thumpEvery) * 1000; clip = "maul"; m.clipHold = now + 500;
              heard(ctx, { clip: S.thump, position: { x: door.x, y: 1, z: door.z }, volume: 0.9, pitch: 0.92 + ctx.random() * 0.16, refDistance: 3, maxDistance: D.thumpHear }); } }
        } else { // pace the room
          if (!m.wp || now > m.wpUntil || flat(pos, m.wp) < 0.6) { m.wp = ctx.random() < 0.35 ? null : { x: box.x0 + 2 + ctx.random() * (box.x1 - box.x0 - 4), z: box.z0 + 2 + ctx.random() * (box.z1 - box.z0 - 4) }; m.wpUntil = now + between(ctx, D.wander) * 1000; m.wp ??= { x: pos.x, z: pos.z }; }
          if (flat(pos, m.wp) > 0.6) { goal = m.wp; speed = K.walk; clip = "prowl"; }
        }
      }
    } else { // loose in the halls
      if (noise && !prey && flat(noise, pos) < noise.r) m.last = { x: noise.x, z: noise.z, at: now };
      if (prey?.seen || (prey && prey.d < K.hear)) { goal = prey.p.feetPosition; speed = K.run; clip = "run"; if (prey.d < K.reach * 0.7) { goal = null; face = { x: goal?.x ?? prey.p.feetPosition.x - pos.x, z: prey.p.feetPosition.z - pos.z }; } }
      else if (m.last && now - m.last.at < D.lostSec * 1000 && flat(pos, m.last) > 0.8) { goal = m.last; speed = K.run * 0.8; clip = "run"; }
      else { // prowl: follow the corridor, turn where it ends
        if (!m.h || now > (m.hAt ?? 0)) { m.hAt = now + 500;
          const ray = (x, z, dist) => raycast(ctx, { x: pos.x, y: pos.y + 0.6, z: pos.z }, { x, y: 0, z }, { distance: dist, physicsOnly: true, ignoreEntities: [f.id], excludeTags: ["pen-foe", "player"] })?.distance ?? dist;
          if (!m.h || ray(m.h.x, m.h.z, 1.6) < 1.6) { const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([x, z]) => !m.h || x !== m.h.x || z !== m.h.z).map(([x, z]) => ({ x, z, d: ray(x, z, D.prowlLook) + ctx.random() * 2 - (m.h && x === -m.h.x && z === -m.h.z ? 4 : 0) })).sort((a, b) => b.d - a.d); m.h = { x: opts[0].x, z: opts[0].z }; } }
        goal = { x: pos.x + m.h.x * 4, z: pos.z + m.h.z * 4 }; speed = K.walk; clip = "prowl";
      }
      if (prey && now > (m.nextHit ?? 0) && canStrike(ctx, pos, prey.p, K.reach, [f.id, prey.p.id])) { // the blow: reach, same floor, nothing solid between
        m.nextHit = now + K.cd * 1000; clip = "maul"; m.clipHold = now + 600; m.clip = null;
        const p = prey.p; p.state.hp -= dmgAfterArmor(p.state.look, K.dmg);
        if (K.sanity) p.state.sanity = Math.max(0, (p.state.sanity ?? 100) - K.sanity);
        ctx.emit("playSound", { clip: S.hit, position: p.feetPosition, volume: 1 });
        ctx.emit("screenShake", { intensity: 0.25, duration: 0.2 }, { audience: { player: p.id } });
      }
      if (prey?.seen && !m.cried) { m.cried = 1; ctx.emit("playSound", { clip: S.cry, position: pos, volume: 0.9, maxDistance: 30 }); }
    }
    if (f.state.stunUntil > now || f.state.downUntil > now) { goal = null; face = null; }
    let vx = 0, vz = 0;
    if (m.sq) { // squeezing through the open frame: carried across, back where it was if the door shuts first
      const fr = m.fr, out = { x: door.x - fr.nx * D.doorOut, z: door.z - fr.nz * D.doorOut };
      if (!doorOpen(ctx, pen)) { f.feetPosition = { x: m.sq.fx, y: pos.y, z: m.sq.fz }; m.sq = null; }
      else { m.sq.t = Math.min(1, m.sq.t + dt / 1.1); f.feetPosition = { x: m.sq.fx + (out.x - m.sq.fx) * m.sq.t, y: pos.y, z: m.sq.fz + (out.z - m.sq.fz) * m.sq.t }; if (m.sq.t >= 1) m.sq = null; }
    } else if (goal) {
      const dx = goal.x - pos.x, dz = goal.z - pos.z, n = Math.hypot(dx, dz) || 1;
      const [ux, uz] = pen ? [dx / n, dz / n] : wallSteer(ctx, m, now, pos, dx / n, dz / n, f.id);
      vx = ux * speed; vz = uz * speed;
      if (now > (m.wedgeAt ?? 0)) { m.wedgeAt = now + 800; if (wedged(m, flat(pos, m.was ?? pos), true)) { m.wp = null; m.h = null; m.last = null; } m.was = { x: pos.x, z: pos.z }; }
    }
    if (pen && box && !pass && !m.sq) { // shut in: it never crosses the room's edge except through its own open doorway
      if (pos.x < box.x0 + 0.5 && vx < 0 || pos.x > box.x1 - 0.5 && vx > 0) vx = 0;
      if (pos.z < box.z0 + 0.5 && vz < 0 || pos.z > box.z1 - 0.5 && vz > 0) vz = 0;
    }
    if (!m.sq) f.velocity = moth ? { x: vx, y: (K.hover - pos.y) * 3, z: vz } : { x: vx, y: f.grounded ? -0.5 : (f.velocity?.y ?? 0) + g * dt, z: vz };
    if (moth) { m.spin = ((m.spin ?? 0) + 140 * dt) % 360; f.rotation = { yaw: m.spin }; }
    else if (kind !== "clump") { const tx = face ? face.x : vx, tz = face ? face.z : vz; if (tx || tz) { const yaw = Math.atan2(-tx, -tz) * DEG; if (Math.abs(yaw - (m.yaw ?? 1e9)) > 3) { m.yaw = yaw; f.rotation = { yaw }; } } }
    if (now > (m.clipHold ?? 0) || clip === "maul") setClip(f, m, kind, clip === "maul" ? "maul" : (vx || vz) ? clip : "idle");
  }
  for (const id of Object.keys(mem)) if (!live.has(id)) delete mem[id];
}
