// The Drain Smiler (Level 34): the game's Smiler, hunched low and wet to fit the sewer. Its eyes and grin glow a sick yellow.
// Lore (level-34): it sees you down the tunnel; get low and hold still (crouch or crawl) and it loses you: "if you think it's gone, it's gone".
// It walks its route along the tunnels, chases what it sees, bites. Every number is Savi's pick.
import { raycast } from "builtin/physics";
import { knocked } from "./lib/knock.js";
import { heard } from "./lib/hear.js";
import { dmgAfterArmor } from "./lib/stats.js";
const T = { sight: 14, walk: 1.1, run: 3.3, bite: 1.1, biteCd: 1300, biteDmg: 18, biteSan: 8, loseMs: 1600 };
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const EYES = `fx
local
pop eyeL n=1 pos=<.16,.86,-.08> size=.045 col=hdr(3.6,3.4,.9)*flick(3,.15) a=1 sz=$size r=sprite(soft-disc,add)
pop eyeR n=1 pos=<.16,.86,.08> size=.045 col=hdr(3.6,3.4,.9)*flick(3,.15) a=1 sz=$size r=sprite(soft-disc,add)
pop grin n=1 pos=<.2,.76,0> size=.14 asp=3.2 col=hdr(3,2.8,.8)*flick(2,.2) a=.9 sz=$size r=sprite(soft-disc,add)
pop drip rate=3 on=box(.5,.2,.4).c(.6) life=.5..0.8 v=up(-.4) size=.02..0.035 acc=grav() col=<.35,.33,.15> a=.8>0 r=sprite(soft-disc,alpha)`;
const POOF = `fx
pop shade burst=22 life=.8..1.4 on=box(.6,.4,.6).c(.3) v=sdir()*(.4..1)+up(.5) size=.3..0.5 acc=buoy(.5)+drag(1.2) col=<.05,.05,.02> a=0>.5:.6>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;
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
    if (!m.dieAt) { m.dieAt = now; w.fx = null; w.velocity = { x: 0, y: -1, z: 0 }; w.anim.act = { clip: CLIP.die, loop: "once", blend: "override", weight: 4, time: 0 }; heard(ctx, { clip: SND("shadow-creature-dissolve-hiss"), position: pos, volume: 0.9, maxDistance: 26 }); }
    else if (now - m.dieAt > 1800 && !m.gone) { m.gone = true; ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.3, z: pos.z }, script: POOF }); ((ctx.place.state.deadAt ??= {})[w.id.split("/").pop()] = now); ctx.destroy(w.id); }
    return;
  }
  if (!w.fx) w.fx = { script: EYES };
  if (knocked(ctx, w, now, dt)) return;
  if (now >= (m.look ?? 0)) {
    m.look = now + 400;
    let best = null, bd = Infinity;
    for (const p of ctx.place.players) {
      const ps = p.state ?? {}; if (ps.dead || (ps.hp ?? 1) <= 0) continue;
      const d = Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z);
      if (d < bd && sees(ctx, w, p)) { best = p; bd = d; }
    }
    if (best) {
      const ps = best.state ?? {}, v = best.velocity ?? { x: 0, z: 0 }, still = Math.hypot(v.x, v.z) < 0.3, low = ps.crawl || ps.crouch;
      if (low && still && bd > 2.5) { m.hideSince ??= now; if (now - m.hideSince > T.loseMs) best = null; } else m.hideSince = null;
    } else m.hideSince = null;
    if (best && m.prey !== best.id) heard(ctx, { clip: SND("smiler-wet-giggle-hiss-stalking"), position: pos, volume: 0.9, maxDistance: 26 });
    m.prey = best?.id ?? null;
  }
  const prey = m.prey ? ctx.place.players.find((p) => p.id === m.prey) : null;
  let goal, speed;
  if (prey) { goal = prey.feetPosition; speed = T.run; }
  else {
    const r = st.route ?? [[pos.x, pos.z]], [gx, gz] = r[(st.leg ?? 0) % r.length];
    if (Math.hypot(gx - pos.x, gz - pos.z) < 0.6) st.leg = ((st.leg ?? 0) + 1) % r.length;
    goal = { x: gx, z: gz }; speed = T.walk;
  }
  const dx = goal.x - pos.x, dz = goal.z - pos.z, d = Math.hypot(dx, dz), vy = (w.velocity?.y ?? 0) + ctx.place.gravity.y * dt;
  if (prey && d < T.bite) {
    w.velocity = { x: 0, y: vy, z: 0 }; play(w, m, "idle");
    if (now - (m.bit ?? 0) > T.biteCd) {
      m.bit = now; w.anim.act = { clip: CLIP.bite, loop: "once", blend: "override", weight: 4, time: 0 };
      const ps = prey.state; ps.hp = Math.max(0, (ps.hp ?? 100) - dmgAfterArmor(ps.look, T.biteDmg)); ps.sanity = Math.max(0, (ps.sanity ?? 100) - T.biteSan);
      ctx.emit("damageNumber", { position: { x: prey.feetPosition.x, y: prey.feetPosition.y + 1, z: prey.feetPosition.z }, value: T.biteDmg, color: "#ff2233" });
      ctx.emit("cameraPunch", { direction: { x: dx, y: 0, z: dz }, intensity: 0.45 }, { audience: { player: prey.id } });
      ctx.emit("squash", { target: w.id, axis: "z", intensity: 0.18, duration: 0.2 });
      heard(ctx, { clip: SND("smiler-teeth-snap-bite"), position: pos, volume: 1, maxDistance: 20 });
    }
  } else if (d > 0.2) {
    w.velocity = { x: (dx / d) * speed, y: vy, z: (dz / d) * speed }; play(w, m, "move");
  } else { w.velocity = { x: 0, y: vy, z: 0 }; play(w, m, "idle"); }
  if (d > 0.2 && now >= (m.turn ?? 0)) { m.turn = now + 250; w.rotation = { lookAt: { x: goal.x, y: pos.y, z: goal.z } }; }
}
