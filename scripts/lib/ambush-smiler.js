// Shared AI loop for ambush Smilers (Level 34 Drain Smiler & Level 9 House Smiler):
// drifts its route lurking in dark/water, wakes on flashlight beams or noisy sprints up close,
// retreats if the wanderer kills their light and looks down, and bites on reach.
import { raycast } from "builtin/physics";
import { navPath } from "./nav.js";
import { knocked } from "./knock.js";
import { heard } from "./hear.js";
import { dmgAfterArmor } from "./stats.js";

const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const POOF = `fx
pop shade burst=22 life=.8..1.4 on=box(.6,.4,.6).c(.3) v=sdir()*(.4..1)+up(.5) size=.3..0.5 acc=buoy(.5)+drag(1.2) col=<.05,.05,.02> a=0>.5:.6>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;
const CLIP = { idle: "cdn/clip-crouch-idle-loop.glb", move: "cdn/clip-crouch-walk-loop.glb", bite: "cdn/clip-attack.glb", die: "cdn/clip-die.glb" };

function sees(ctx, w, p, sight) {
  const a = w.feetPosition, b = p.feetPosition, dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, l = Math.hypot(dx, dy, dz) || 1;
  if (l > sight) return false;
  return !raycast(ctx, { x: a.x, y: a.y + 0.8, z: a.z }, { x: dx / l, y: dy / l, z: dz / l }, { distance: l, physicsOnly: true, bodies: "static", ignoreEntities: [w.id, p.id] });
}

function play(w, m, k) {
  if (m.clip === k) return;
  m.clip = k;
  w.anim.main = { clip: CLIP[k], loop: true, weight: 1 };
}

export function stepAmbushSmiler(ctx, dt, cfg) {
  const { stats: T, eyesFx, lurkFx, hideWhileLurking = false, wakeSfx, retreatSfx, splashFx = null, navHeight = 1.7, playerAllowed } = cfg;
  const w = ctx.self, st = w.state, now = ctx.now(), m = (w.session.m ??= {}), pos = w.feetPosition;
  if (!ctx.place.players.length) { w.velocity = { x: 0, y: 0, z: 0 }; ctx.sleep(2); return; }
  if (st.dead || (st.hp ?? 1) <= 0) {
    if (!m.dieAt) {
      m.dieAt = now; w.fx = null; w.visible = true; w.velocity = { x: 0, y: -1, z: 0 };
      w.anim.act = { clip: CLIP.die, loop: "once", blend: "override", weight: 4, time: 0 };
      heard(ctx, { clip: SND("shadow-creature-dissolve-hiss"), position: pos, volume: 0.9, maxDistance: 26 });
    } else if (now - m.dieAt > 1800 && !m.gone) {
      m.gone = true;
      ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.3, z: pos.z }, script: POOF });
      ((ctx.place.state.deadAt ??= {})[w.id.split("/").pop()] = now);
      ctx.destroy(w.id);
    }
    return;
  }
  if (!hideWhileLurking && w.visible === false) w.visible = true;
  if (m.up === undefined) { m.up = false; w.visible = !hideWhileLurking; w.fx = { script: lurkFx }; }
  const surface = (on) => {
    if (m.up === on) return;
    m.up = on;
    w.visible = hideWhileLurking ? on : true;
    w.fx = { script: on ? eyesFx : lurkFx };
    heard(ctx, { clip: on ? wakeSfx : retreatSfx, position: pos, volume: on ? 1 : 0.6, maxDistance: 26 });
    if (on && splashFx) ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.1, z: pos.z }, script: splashFx });
  };
  if (knocked(ctx, w, now, dt)) return;

  if (now >= (m.look ?? 0)) {
    m.look = now + 300;
    const ign = (m.ign ??= {});
    let best = null, bd = Infinity;
    for (const p of ctx.place.players) {
      if (playerAllowed && !playerAllowed(st, p)) continue;
      const ps = p.state ?? {};
      if (ps.dead || (ps.hp ?? 1) <= 0 || now < (ign[p.id] ?? 0)) continue;
      const d = Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z);
      const lit = !!ps.light, v = p.velocity ?? { x: 0, z: 0 }, loud = Math.hypot(v.x, v.z) > 2.5 && !ps.crawl && !ps.crouch;
      const draws = m.prey === p.id ? (lit || d < T.near * 2 || loud) : (lit || d < T.near || (loud && d < 6));
      if (draws && d < bd && sees(ctx, w, p, T.sight)) { best = p; bd = d; }
    }
    if (best) {
      const ps = best.state ?? {}, v = best.velocity ?? { x: 0, z: 0 }, still = Math.hypot(v.x, v.z) < 0.3;
      const pitch = best.camera?.rotation?.pitch ?? ps.aimPitch ?? 0, down = pitch < T.downPitch || (ps.crawl && still);
      if (!ps.light && down && bd > 1.4) {
        m.hideSince ??= now;
        if (now - m.hideSince > T.loseMs) {
          ign[best.id] = now + T.ignoreMs;
          best = null;
          st.leg = ((st.leg ?? 0) + 1) % (st.route?.length || 1);
        }
      } else m.hideSince = null;
    } else m.hideSince = null;
    m.prey = best?.id ?? null;
    surface(!!best);
  }

  const prey = m.prey ? ctx.place.players.find((p) => p.id === m.prey) : null;
  let goal, speed;
  if (prey) { goal = prey.feetPosition; speed = T.run; }
  else {
    const r = st.route ?? [[pos.x, pos.z]], [gx, gz] = r[(st.leg ?? 0) % r.length];
    if (Math.hypot(gx - pos.x, gz - pos.z) < 0.6) st.leg = ((st.leg ?? 0) + 1) % r.length;
    goal = { x: gx, z: gz }; speed = T.walk;
  }

  const P = (m.path ??= { pts: null, i: 0, at: 0, gx: 1e9, gz: 1e9 });
  if (now >= P.at || Math.hypot(goal.x - P.gx, goal.z - P.gz) > 1) {
    const r = navPath(ctx, pos, { x: goal.x, y: pos.y, z: goal.z }, { radius: 0.35, height: navHeight });
    if (r && !r.wait && (!r.partial || r.points?.length)) { P.pts = r.points?.length ? r.points : null; P.i = 0; P.at = now + (r.partial ? 250 : 800); P.gx = goal.x; P.gz = goal.z; }
  }
  let aim = goal;
  if (P.pts) { while (P.i < P.pts.length - 1 && Math.hypot(P.pts[P.i].x - pos.x, P.pts[P.i].z - pos.z) < 0.4) P.i++; aim = P.pts[P.i]; }
  if (now >= (m.stuckAt ?? 0)) { const mv = m.lastPos ? Math.hypot(pos.x - m.lastPos.x, pos.z - m.lastPos.z) : 1; if (mv < 0.15 && m.clip === "move") { m.side = now + 500; P.at = 0; } m.lastPos = { x: pos.x, z: pos.z }; m.stuckAt = now + 1000; }

  const gd = Math.hypot(goal.x - pos.x, goal.z - pos.z);
  let dx = aim.x - pos.x, dz = aim.z - pos.z;
  if (now < (m.side ?? 0)) { const t = dx; dx = -dz; dz = t; }
  const vy = (w.velocity?.y ?? 0) + (ctx.place.gravity?.y ?? -9.8) * dt;
  if (prey && gd < T.bite) {
    w.velocity = { x: 0, y: vy, z: 0 }; play(w, m, "idle");
    if (now - (m.bit ?? 0) > T.biteCd) {
      m.bit = now; w.anim.act = { clip: CLIP.bite, loop: "once", blend: "override", weight: 4, time: 0 };
      const ps = prey.state; ps.hp = Math.max(0, (ps.hp ?? 100) - dmgAfterArmor(ps.look, T.biteDmg)); ps.sanity = Math.max(0, (ps.sanity ?? 100) - T.biteSan);
      ctx.emit("damageNumber", { position: { x: prey.feetPosition.x, y: prey.feetPosition.y + 1, z: prey.feetPosition.z }, value: T.biteDmg, color: "#ff2233" });
      ctx.emit("cameraPunch", { direction: { x: dx, y: 0, z: dz }, intensity: 0.45 }, { audience: { player: prey.id } });
      ctx.emit("squash", { target: w.id, axis: "z", intensity: 0.18, duration: 0.2 });
      heard(ctx, { clip: SND("smiler-teeth-snap-bite"), position: pos, volume: 1, maxDistance: 20 });
    }
  } else if (gd > 0.2) {
    const l = Math.hypot(dx, dz) || 1; w.velocity = { x: (dx / l) * speed, y: vy, z: (dz / l) * speed }; play(w, m, "move");
  } else {
    w.velocity = { x: 0, y: vy, z: 0 }; play(w, m, "idle");
  }
  if (gd > 0.2 && now >= (m.turn ?? 0)) { m.turn = now + 250; w.rotation = { lookAt: { x: pos.x + dx, y: pos.y, z: pos.z + dz } }; }
}
