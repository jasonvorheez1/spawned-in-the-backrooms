// The lurker pack: pale things that only move when nobody is looking at them. A wanderer who keeps one in view
// holds it still (and pays sanity for it); look away, or break the line of sight, and it closes the gap fast.
// They wander the halls like smilers, but never cross into the safe room. Dead lurkers are cleared here.
import { heard } from "./lib/hear.js";
import { hearOf, sighting, leadOf, raise, alertFor } from "./lib/hunt.js";
import L from "./lib/data/level0.yml";
import { cellAt, cellCenter, inHub, wallX, wallZ, hasPit, N } from "./lib/maze.js";
import { raycast } from "builtin/physics";
import { npcMul, derived, dmgAfterArmor } from "./lib/stats.js";
const sn = (p) => (p?.state?.attr ? derived(p.state).sneak : 1);

export const LURKER_MODEL = { id: "/cdn/value.1ab72159712e0df88095f833909b0aaffb6ee0d75924e3fc05806836daa110af.glb", forward: "+x" }; // Tripo gaunt pale entity, mixamo rig (art/creatures/build.py)
export const LURKER_SCALE = 1.333; // 1.8 m file -> 2.4 m
// the pack's clip names, played as library clips on the mixamo rig
const CLIP = { Idle: "cdn/clip-crouch-idle-loop.glb", Creep: "cdn/clip-crouch-walk-loop.glb", Death: "cdn/clip-die.glb", Grab: "cdn/clip-attack.glb", Scream: "cdn/clip-angry.glb", PoseReach: "cdn/clip-point.glb", PoseCock: "cdn/clip-shrug.glb", PoseCrouch: "cdn/clip-crouch-idle-loop.glb", PoseClose: "cdn/clip-block-loop.glb" };
const POSES = ["PoseReach", "PoseCock", "PoseCrouch", "PoseClose"]; // it snaps to a new one each time it is caught
const HOLD = 1.2, ME = "scripts/lurkers.js";
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const POOF = `fx
pop dust burst=18..24 life=.6..1.1 on=box(.6,1.8,.6).c(1) v=sdir()*(.4..1.2)+up(.5) size=.25..0.5 acc=buoy(.4)+drag(1.4) col=<.8,.78,.74> a=0>.35:.5>0 sz=$size*(.6>1.5) r=sprite(smoke-puff,alpha)`;

function neighbor(ctx, pos) {
  const { cx, cz } = cellAt(pos.x, pos.z), o = [];
  if (cx < N - 1 && !wallX(cx, cz)) o.push([cx + 1, cz]);
  if (cx > 0 && !wallX(cx - 1, cz)) o.push([cx - 1, cz]);
  if (cz < N - 1 && !wallZ(cx, cz)) o.push([cx, cz + 1]);
  if (cz > 0 && !wallZ(cx, cz - 1)) o.push([cx, cz - 1]);
  const ok = o.filter(([a, b]) => !inHub(a, b) && !hasPit(a, b));
  if (!ok.length) return cellCenter(cx, cz);
  const [a, b] = ok[Math.floor(ctx.random() * ok.length)];
  return cellCenter(a, b);
}

// is there open air between the two points (no static body in the way)?
function clear(ctx, a, b, ignore) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz) || 1;
  return !raycast(ctx, a, { x: dx / d, y: dy / d, z: dz / d }, { distance: d, physicsOnly: true, ignoreEntities: ignore, bodies: "static" });
}

// rides a grabbed player's own body: held still, view dragged onto its face, then the scream
function held(ctx, dt) {
  const s = ctx.self.state, h = s.lurkHold, now = ctx.now();
  const drop = () => { if (ctx.self.isLocal) ctx.view.camera = null; ctx.self.session.lh = null; const b = ctx.self.behavior; if (Array.isArray(b)) ctx.self.behavior = b.filter((x) => x !== ME); };
  if (!h) return drop();
  const lk = ctx.getObject(h.by);
  if (!lk || lk.state?.dead || now - h.at > 4000) { s.lurkHold = null; return drop(); }
  const lh = (ctx.self.session.lh ??= { t: 0 });
  const p = ctx.self.feetPosition, f = lk.feetPosition, v = ctx.self.velocity ?? {};
  ctx.self.velocity = { x: 0, y: Math.min(0, v.y ?? 0), z: 0 };
  const dx = f.x - p.x, dz = f.z - p.z, d = Math.hypot(dx, dz) || 1;
  const ax = s.aimX ?? 0, az = s.aimZ ?? -1, looking = (dx * ax + dz * az) / d > 0.7;
  lh.t += dt * (looking ? 2.4 : 1); // meet its face and it lets go sooner
  if (ctx.self.isLocal) {
    const eye = { x: p.x, y: p.y + 1.5, z: p.z }, k = Math.min(1, lh.t * 3) * 0.8;
    const own = { x: eye.x + ax * 3, y: eye.y, z: eye.z + az * 3 }, face = { x: f.x, y: f.y + 2.05, z: f.z };
    ctx.view.camera = { eye, aim: { x: own.x + (face.x - own.x) * k, y: own.y + (face.y - own.y) * k, z: own.z + (face.z - own.z) * k }, fov: 58 - k * 12 };
  }
  if (lh.t >= HOLD) {
    s.hp -= dmgAfterArmor(s.look, h.dmg);
    s.sanity = Math.max(0, (s.sanity ?? 100) - h.san);
    const at = { x: p.x, y: p.y + 1.4, z: p.z };
    ctx.emit("damageNumber", { position: at, value: h.dmg, color: "#ff4a3a" });
    heard(ctx, { clip: SND("lurker-distorted-tearing-scream"), position: { x: f.x, y: f.y + 2, z: f.z }, volume: 1, maxDistance: 40 });
    ctx.emit("screenShake", { intensity: 1.1, duration: 0.9 }, { audience: { player: ctx.self.id } });
    ctx.emit("screenFlash", { color: "#c8a94a", duration: 0.35, intensity: 0.55 }, { audience: { player: ctx.self.id } });
    s.lurkHold = null; drop();
  }
}

export function update(ctx, dt) {
  if (ctx.self.tags?.includes?.("player") || ctx.self.userId) return held(ctx, dt);
  const now = ctx.now();
  const players = ctx.place.players.filter((p) => !(p.state?.downAt && now - p.state.downAt < 4500));
  const mem = (ctx.self.session.m ??= {});
  for (const w of ctx.query({ tags: ["lurker"] })) {
    const m = (mem[w.id] ??= {}), st = w.state ?? {}, pos = w.feetPosition, mu = npcMul(st);
    if (st.mesh !== 3) { w.primitive = null; w.model = LURKER_MODEL; w.scale = LURKER_SCALE; st.mesh = 3; m.clip = null; }
    const play = (clip, loop = true) => { if (m.clip !== clip) { m.clip = clip; w.anim.body = { clip: CLIP[clip] ?? clip, loop, clampWhenFinished: !loop }; } };
    if (st.dead) {
      if (!m.dying) { m.dying = now; play("Death", false); w.velocity = { x: 0, y: -2, z: 0 }; heard(ctx, { clip: SND("bone-crack-twist"), position: pos, volume: 0.9, maxDistance: 24 }); }
      if (now - m.dying > 3200 && !m.gone) { m.gone = true; ctx.emit("fx", { position: { x: pos.x, y: pos.y + 1, z: pos.z }, script: POOF }); heard(ctx, { clip: SND("shadow-creature-dissolve-hiss"), position: pos, volume: 0.8, maxDistance: 30 }); ctx.destroy(w.id); }
      continue;
    }
    const eye = { x: pos.x, y: pos.y + 1.6, z: pos.z };
    if (now >= (m.look ?? 0)) {
      m.look = now + 150 + ctx.random() * 100;
      let best = null, bd = L.lurkerSight * mu.sight, watched = null;
      for (const p of players) {
        const pp = p.feetPosition, c = cellAt(pp.x, pp.z);
        if (inHub(c.cx, c.cz)) continue;
        const dx = pp.x - pos.x, dz = pp.z - pos.z, d = Math.hypot(dx, dz);
        if (d >= L.lurkerSight * mu.sight * sn(p)) continue;
        const head = { x: pp.x, y: pp.y + 1.5, z: pp.z };
        if (!clear(ctx, eye, head, [w.id, p.id])) continue;
        // is the wanderer facing it? (aim is the direction they look; the lurker is at -d from them)
        const ax = p.state?.aimX ?? 0, az = p.state?.aimZ ?? -1;
        if (((-dx) * ax + (-dz) * az) / (d || 1) > L.lurkerWatchCos) watched = p;
        if (d < bd) { best = p; bd = d; }
      }
      if (best && !m.prey) heard(ctx, { clip: SND("bone-crack-twist"), position: pos, volume: 0.8, maxDistance: 24 });
      m.prey = best?.id ?? null;
      if (st.horde && players.some((p) => p.id === st.horde)) m.prey = st.horde; // a blackout horde hunts its player wherever they are
      if (watched && !m.watched) { let k; do k = POSES[Math.floor(ctx.random() * POSES.length)]; while (k === m.pose && POSES.length > 1); m.pose = k; }
      m.watched = !!watched;
      if (watched) watched.state.sanity = Math.max(0, watched.state.sanity - L.lurkerGaze * 0.2);
      if (!best && !m.prey) { const h = hearOf(pos, players, (p) => { const c = cellAt(p.feetPosition.x, p.feetPosition.z); return inHub(c.cx, c.cz); }, ctx); if (h) { m.last = sighting(h, now); m.heard = true; } else { const a = alertFor(ctx, pos); if (a && (!m.last || m.last.at < a.at)) { m.last = { ...a }; m.heard = false; m.lead = null; } } } // heard, not seen: it comes to look
      if (best) { if (!m.called || now - m.called > 6000) { m.called = now; raise(ctx, best); } m.last = sighting(best, now); m.heard = false; m.lead = null; }
    }
    const prey = m.prey ? players.find((p) => p.id === m.prey) : null;
    let goal, speed;
    if (prey) { goal = prey.feetPosition; speed = L.lurkerSpeed; }
    else if (m.last && now - m.last.at < (L.chaseMemory ?? 12) * 1000) { m.lead ??= leadOf(m.last); goal = m.heard ? m.last : m.lead; speed = m.heard ? L.lurkerSpeed * 0.6 : (L.chaseMemory ? L.lurkerSpeed * 0.6 * 1.25 : L.lurkerSpeed * 0.6); if (Math.hypot(goal.x - pos.x, goal.z - pos.z) < 0.8) { if (!m.heard && m.lead && goal === m.lead) { m.lead = null; m.last = { ...m.last, x: goal.x, z: goal.z }; } else { m.last = null; m.lead = null; } } }
    else { if (!m.next || Math.hypot(m.next.x - pos.x, m.next.z - pos.z) < 0.5 || now > (m.nextBy ?? 0)) { m.next = neighbor(ctx, pos); m.nextBy = now + 7000; } goal = m.next; speed = 1.0; }
    let vx = 0, vz = 0;
    const dx = goal.x - pos.x, dz = goal.z - pos.z, d = Math.hypot(dx, dz);
    if (d > (prey ? 1.1 : 0.3)) { vx = (dx / d) * speed * mu.speed; vz = (dz / d) * speed * mu.speed; }
    if (m.watched || m.grab || now < (m.screamEnd ?? 0)) { vx = 0; vz = 0; } // frozen under a gaze, or busy with a catch
    else if ((vx || vz) && Math.floor(now / 170) % 3 === 2) { vx = 0; vz = 0; } // stop-motion: lurch, lurch, hold
    else { vx *= 1.4; vz *= 1.4; }
    const ahead = cellAt(pos.x + vx * 0.5, pos.z + vz * 0.5);
    if (inHub(ahead.cx, ahead.cz)) { vx = 0; vz = 0; m.next = null; m.last = null; m.prey = null; }
    const v = w.velocity ?? { y: 0 };
    w.velocity = { x: vx, y: (v.y ?? 0) + ctx.place.gravity.y * dt, z: vz };
    if (m.grab) {
      const gp = ctx.place.players.find((p) => p.id === m.grab.id), h = gp?.state?.lurkHold;
      if (!h || h.by !== w.id || now - m.grab.at > 4200) { m.grab = null; m.screamEnd = now + 1500; m.bite = now + L.lurkerBiteCooldown * 1000 + 2500; }
    }
    if (m.grab) play("Grab", false);
    else if (now < (m.screamEnd ?? 0)) play("Scream", false);
    else if (m.watched) play(m.pose ?? "PoseReach", false);
    else play(prey || m.last || vx || vz || m.next ? "Creep" : "Idle", true);
    const face = prey ? { x: prey.feetPosition.x - pos.x, z: prey.feetPosition.z - pos.z } : { x: vx, z: vz };
    if (!m.watched && (face.x || face.z)) { const yaw = (Math.atan2(-face.x, -face.z) * 180) / Math.PI; if (Math.abs(((yaw - (m.yaw ?? 999) + 540) % 360) - 180) > 6) { m.yaw = yaw; w.rotation = yaw; } }
    // the catch: reached you unseen, it grabs; the hold and the scream run on your own body (held above)
    if (prey && !m.watched && !m.grab && !prey.state.lurkHold && Math.hypot(prey.feetPosition.x - pos.x, prey.feetPosition.z - pos.z) < 1.6 && now >= (m.bite ?? 0)) {
      m.grab = { id: prey.id, at: now };
      prey.state.lurkHold = { by: w.id, at: now, dmg: Math.round(L.lurkerBite * 1.6 * mu.dmg), san: L.lurkerSanity * 3 };
      const b = prey.behavior; if (Array.isArray(b) && !b.includes(ME)) prey.behavior = [...b, ME];
      heard(ctx, { clip: SND("bone-crack-twist"), position: pos, volume: 1, maxDistance: 25 });
      ctx.emit("screenFlash", { color: "#1a160c", duration: 0.25, intensity: 0.6 }, { audience: { player: prey.id } });
    }
  }
}
