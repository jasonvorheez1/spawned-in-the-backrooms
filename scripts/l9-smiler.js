// The House Smiler (Level 9, Wikidot: Smilers haunt the Suburbs): the game's Smiler, standing full height in a house whose lights are out.
// The street has hounds, so a house feels safe; a dark one is not: only a grin hangs in the hall. It keeps to its own house (state.home, state.leash).
// A lit flashlight or a run up close draws it out: it giggles and lunges. Light off and look down and it fades back into the dark.
// Built on scripts/l34-smiler.js (same rules the drain smiler taught the player); every number is Savi's pick.
import { raycast } from "builtin/physics";
import { findPath } from "builtin/nav";
import { knocked } from "./lib/knock.js";
import { heard } from "./lib/hear.js";
import { dmgAfterArmor } from "./lib/stats.js";
const T = { sight: 14, near: 2.2, walk: 0.9, run: 4.6, bite: 1.1, biteCd: 1300, biteDmg: 16, biteSan: 8, loseMs: 1200, ignoreMs: 9000, downPitch: -28 };
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const EYES = `fx
local
pop eyeL n=1 pos=<.16,1.5,-.08> size=.045 col=hdr(3.6,3.4,.9)*flick(3,.15) a=1 sz=$size r=sprite(soft-disc,add)
pop eyeR n=1 pos=<.16,1.5,.08> size=.045 col=hdr(3.6,3.4,.9)*flick(3,.15) a=1 sz=$size r=sprite(soft-disc,add)
pop grin n=1 pos=<.2,1.36,0> size=.14 asp=3.2 col=hdr(3,2.8,.8)*flick(2,.2) a=.9 sz=$size r=sprite(soft-disc,add)`;
const LURK = `fx
local
pop eyeL n=1 pos=<.16,1.5,-.08> size=.03 col=hdr(1.6,1.5,.5)*flick(.6,.4) a=.7 sz=$size r=sprite(soft-disc,add)
pop eyeR n=1 pos=<.16,1.5,.08> size=.03 col=hdr(1.6,1.5,.5)*flick(.6,.4) a=.7 sz=$size r=sprite(soft-disc,add)
pop grin n=1 pos=<.2,1.36,0> size=.12 asp=3.2 col=hdr(1.8,1.7,.5)*flick(.8,.35) a=.6 sz=$size r=sprite(soft-disc,add)`;
const POOF = `fx
pop shade burst=22 life=.8..1.4 on=box(.6,.4,.6).c(.3) v=sdir()*(.4..1)+up(.5) size=.3..0.5 acc=buoy(.5)+drag(1.2) col=<.05,.05,.02> a=0>.5:.6>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;
const SPLASH = `fx
pop spray burst=26 on=disc(.4) life=.5..0.9 v=up(2..3.4)+sdir()*(.5..1.2) size=.03..0.07 acc=grav() col=<.5,.47,.22> a=.9>0 floor=die r=sprite(soft-disc,alpha)`;
const CLIP = { idle: "cdn/clip-crouch-idle-loop.glb", move: "cdn/clip-crouch-walk-loop.glb", bite: "cdn/clip-attack.glb", die: "cdn/clip-die.glb" };

function sees(ctx, w, p) {
  const a = w.feetPosition, b = p.feetPosition, dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, l = Math.hypot(dx, dy, dz) || 1;
  if (l > T.sight) return false;
  return !raycast(ctx, { x: a.x, y: a.y + 0.8, z: a.z }, { x: dx / l, y: dy / l, z: dz / l }, { distance: l, physicsOnly: true, bodies: "static", ignoreEntities: [w.id, p.id] });
}
function play(w, m, k) { if (m.clip === k) return; m.clip = k; w.anim.main = { clip: CLIP[k], loop: true, weight: 1 }; }

export function update(ctx, dt) {
  const w = ctx.self, st = w.state, now = ctx.now(), m = (w.session.m ??= {}), pos = w.feetPosition;
  if (!ctx.place.players.length) { w.velocity = { x: 0, y: 0, z: 0 }; ctx.sleep(2); return; }
  if (st.dead || (st.hp ?? 1) <= 0) {
    if (!m.dieAt) { m.dieAt = now; w.fx = null; w.visible = true; w.velocity = { x: 0, y: -1, z: 0 }; w.anim.act = { clip: CLIP.die, loop: "once", blend: "override", weight: 4, time: 0 }; heard(ctx, { clip: SND("shadow-creature-dissolve-hiss"), position: pos, volume: 0.9, maxDistance: 26 }); }
    else if (now - m.dieAt > 1800 && !m.gone) { m.gone = true; ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.3, z: pos.z }, script: POOF }); ((ctx.place.state.deadAt ??= {})[w.id.split("/").pop()] = now); ctx.destroy(w.id); }
    return;
  }
  if (m.up === undefined) { m.up = false; w.visible = false; w.fx = { script: LURK }; }
  const surface = (on) => { if (m.up === on) return; m.up = on; w.visible = on; w.fx = { script: on ? EYES : LURK };
    heard(ctx, { clip: on ? SND("smiler-wet-giggle-hiss-stalking") : SND("smiler-giggle-fading-into-dark-room"), position: pos, volume: on ? 1 : 0.6, maxDistance: 26 });
  };
  if (knocked(ctx, w, now, dt)) return;
  if (now >= (m.look ?? 0)) {
    m.look = now + 300;
    const ign = (m.ign ??= {});
    let best = null, bd = Infinity;
    for (const p of ctx.place.players) {
      const hm = st.home; if (hm && Math.hypot(p.feetPosition.x - hm.x, p.feetPosition.z - hm.z) > (st.leash ?? 6)) continue; // it never leaves its house
      const ps = p.state ?? {}; if (ps.dead || (ps.hp ?? 1) <= 0 || now < (ign[p.id] ?? 0)) continue;
      const d = Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z);
      const lit = !!ps.light, v = p.velocity ?? { x: 0, z: 0 }, loud = Math.hypot(v.x, v.z) > 2.5 && !ps.crawl && !ps.crouch;
      const draws = m.prey === p.id ? (lit || d < T.near * 2 || loud) : (lit || d < T.near || (loud && d < 6)); // the light calls it; a splashing run up close does too
      if (draws && d < bd && sees(ctx, w, p)) { best = p; bd = d; }
    }
    if (best) {
      const ps = best.state ?? {}, v = best.velocity ?? { x: 0, z: 0 }, still = Math.hypot(v.x, v.z) < 0.3;
      const pitch = best.camera?.rotation?.pitch ?? ps.aimPitch ?? 0, down = pitch < T.downPitch || (ps.crawl && still);
      if (!ps.light && down && bd > 1.4) { m.hideSince ??= now; if (now - m.hideSince > T.loseMs) { ign[best.id] = now + T.ignoreMs; best = null; st.leg = ((st.leg ?? 0) + 1) % (st.route?.length || 1); } } else m.hideSince = null;
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
  // pathing: a walked path over the sewer's colliders, re-asked when the goal moves a metre or every 0.8 s; it steers at the next corner
  const P = (m.path ??= { pts: null, i: 0, at: 0, gx: 1e9, gz: 1e9 });
  if (now >= P.at || Math.hypot(goal.x - P.gx, goal.z - P.gz) > 1) {
    const r = findPath(ctx, pos, { x: goal.x, y: pos.y, z: goal.z }, { radius: 0.35, height: 1.7 });
    if (!r.partial) { P.pts = r.points?.length ? r.points : null; P.i = 0; P.at = now + 800; P.gx = goal.x; P.gz = goal.z; }
  }
  let aim = goal;
  if (P.pts) { while (P.i < P.pts.length - 1 && Math.hypot(P.pts[P.i].x - pos.x, P.pts[P.i].z - pos.z) < 0.4) P.i++; aim = P.pts[P.i]; }
  // stuck: barely moved for a second while walking: sidestep along the wall and ask again
  if (now >= (m.stuckAt ?? 0)) { const mv = m.lastPos ? Math.hypot(pos.x - m.lastPos.x, pos.z - m.lastPos.z) : 1; if (mv < 0.15 && m.clip === "move") { m.side = now + 500; P.at = 0; } m.lastPos = { x: pos.x, z: pos.z }; m.stuckAt = now + 1000; }
  const gd = Math.hypot(goal.x - pos.x, goal.z - pos.z);
  let dx = aim.x - pos.x, dz = aim.z - pos.z;
  if (now < (m.side ?? 0)) { const t = dx; dx = -dz; dz = t; }
  const d = Math.max(Math.hypot(dx, dz), gd < 0.25 ? 0 : 0.21), vy = (w.velocity?.y ?? 0) + ctx.place.gravity.y * dt;
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
  } else { w.velocity = { x: 0, y: vy, z: 0 }; play(w, m, "idle"); }
  if (gd > 0.2 && now >= (m.turn ?? 0)) { m.turn = now + 250; w.rotation = { lookAt: { x: pos.x + dx, y: pos.y, z: pos.z + dz } }; }
}
