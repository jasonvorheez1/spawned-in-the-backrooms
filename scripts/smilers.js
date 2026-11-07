// The pack manager: one script moves every smiler. They drift cell to cell along open doorways,
// lock on to a wanderer they can see, stalk, then lunge and bite. They never cross into the safe room.
// Body: a Blender crawler (art/smiler/build.py) with baked clips idle, skitter, freeze, lunge-bite, recoil, death.
// A flashlight held on one makes it flinch (recoil) and lock rigid (freeze) until the beam leaves it.
import L from "./lib/data/level0.yml";
import { cellAt, cellCenter, inHub, wallX, wallZ, hasPit, N } from "./lib/maze.js";
import { raycast } from "builtin/physics";
import { npcMul, derived, dmgAfterArmor } from "./lib/stats.js";
const sn = (p) => (p?.state?.attr ? derived(p.state).sneak : 1);

export const MODEL = { id: "/cdn/value.fb443f6a23bcd4977c437db42b3f9abe2510fcb6cf2076ee4956fb235d581b26.glb", forward: "+x" }; // Tripo shadow crawler, mixamo rig (art/creatures/build.py)
export const SCALE = 1.6; // 1.2 m file -> ~1.9 m hunched
// the manager's clip names, played as library clips on the mixamo rig
const CLIP = { idle: "cdn/clip-crouch-idle-loop.glb", skitter: "cdn/clip-crouch-walk-loop.glb", freeze: "cdn/clip-block-loop.glb", "lunge-bite": "cdn/clip-attack.glb", recoil: "cdn/clip-hit-react.glb", death: "cdn/clip-die.glb" };
const MDL = 2; // bump with a new upload: older rows swap their body
const EYE = 1.1; // head height of the crawler
const LUNGE = { range: 4, speed: 9.5, ms: 430, hit: 1.35, pull: 4.5, cooldown: 1.8 };
const FREEZE_RANGE = 14; // a beam held on it from this close pins it
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const POOF = `fx
pop shade burst=22..30 life=.8..1.4 on=box(.8,.5,1.2).c(.3) v=sdir()*(.4..1.2)+up(.6) size=.3..0.6 acc=buoy(.6)+curl(.6)+drag(1.2) col=<.04,.03,.06> a=0>.5:.6>0 sz=$size*(.6>1.6) rot=spin(.4) r=sprite(smoke-puff,alpha)
pop spark burst=10 life=.4..0.8 on=point() v=sdir()*(1..2.5) size=.03..0.05 acc=drag(2) col=hdr(3,2.8,2.2) a=1>0 r=sprite(ember,add)`;

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
const act = (w, clip, extra) => { w.anim.act = { clip: CLIP[clip] ?? clip, loop: "once", blend: "override", weight: 4, time: 0, ...extra }; };

export function update(ctx, dt) {
  const now = ctx.now();
  const players = ctx.place.players.filter((p) => !(p.state?.downAt && now - p.state.downAt < 2000));
  const mem = (ctx.self.session.m ??= {});
  for (const w of ctx.query({ tags: ["smiler"] })) {
    const m = (mem[w.id] ??= {}), st = w.state ?? {}, pos = w.feetPosition, mu = npcMul(st);
    if (st.mdl !== MDL) { w.primitive = null; w.material = null; w.model = MODEL; w.scale = SCALE; w.state.mdl = MDL; m.mode = null; }
    if (st.dead) {
      // folds and melts into the carpet, then the shade lifts off it
      if (!m.dieAt) {
        m.dieAt = now; w.velocity = { x: 0, y: 0, z: 0 }; w.anim.body = null;
        act(w, "death", { clampWhenFinished: true });
        ctx.emit("playSound", { clip: SND("shadow-creature-dissolve-hiss"), position: pos, volume: 0.9, maxDistance: 35 });
      } else if (!m.gone && now - m.dieAt > 1700) { m.gone = true; ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.3, z: pos.z }, script: POOF }); ctx.destroy(w.id); }
      continue;
    }
    if (now >= (m.look ?? 0)) {
      m.look = now + 300 + ctx.random() * 200;
      let best = null, bd = Infinity;
      for (const p of players) {
        const pp = p.feetPosition, c = cellAt(pp.x, pp.z);
        if (inHub(c.cx, c.cz)) continue;
        const dx = pp.x - pos.x, dz = pp.z - pos.z, dy = pp.y + 1.3 - (pos.y + EYE), d = Math.hypot(dx, dz);
        // drawn to light: a lit flashlight is seen from far off, a dark wanderer only up close (prey already found keeps the normal range)
        const reach = L.smilerSight * mu.sight * sn(p) * (p.state?.light ? L.smilerSightLit : m.prey === p.id ? 1 : L.smilerSightDark);
        if (d >= reach || d >= bd) continue;
        const L3 = Math.hypot(dx, dy, dz) || 1;
        const hit = raycast(ctx, { x: pos.x, y: pos.y + EYE, z: pos.z }, { x: dx / L3, y: dy / L3, z: dz / L3 }, { distance: L3, physicsOnly: true, ignoreEntities: [w.id, p.id], bodies: "static" });
        if (hit) continue;
        best = p; bd = d;
      }
      if (best && !m.prey) ctx.emit("playSound", { clip: SND("smiler-wet-giggle-hiss-stalking"), position: pos, volume: 1, maxDistance: 30 });
      m.prey = best?.id ?? null;
      if (st.horde && players.some((p) => p.id === st.horde)) m.prey = st.horde; // a blackout horde hunts its player wherever they are
      if (best) m.last = { x: best.feetPosition.x, z: best.feetPosition.z, at: now };
    }
    const prey = m.prey ? players.find((p) => p.id === m.prey) : null;
    let goal, speed, lit = false;
    const pd = prey ? Math.hypot(prey.feetPosition.x - pos.x, prey.feetPosition.z - pos.z) : Infinity;
    if (prey) {
      goal = prey.feetPosition; speed = pd < 9 ? L.chargeSpeed : L.stalkSpeed;
      // eye contact: while the wanderer looks straight at it, it creeps; a flashlight held on it pins it rigid
      const yaw = prey.camera?.rotation?.yaw;
      if (yaw != null) {
        const r = (yaw * Math.PI) / 180, fx = -Math.sin(r), fz = -Math.cos(r);
        const tx = pos.x - goal.x, tz = pos.z - goal.z, tl = Math.hypot(tx, tz) || 1;
        const staring = (fx * tx + fz * tz) / tl > Math.cos((L.stareCone * Math.PI) / 180);
        if (staring) speed = L.stareSpeed;
        lit = staring && !!prey.state?.light && pd < FREEZE_RANGE && !m.lunge;
        if (staring !== !!m.stared) { m.stared = staring; if (!staring) ctx.emit("playSound", { clip: SND("creepy-wet-giggle-close"), position: pos, volume: 0.7, maxDistance: 20 }); }
      }
    }
    else if (m.last && now - m.last.at < 6000) { goal = m.last; speed = L.stalkSpeed; if (Math.hypot(goal.x - pos.x, goal.z - pos.z) < 0.8) m.last = null; }
    else { if (!m.next || Math.hypot(m.next.x - pos.x, m.next.z - pos.z) < 0.5 || now > (m.nextBy ?? 0)) { m.next = neighbor(ctx, pos); m.nextBy = now + 6000; } goal = m.next; speed = 1.3; }
    if (lit !== !!m.lit) {
      m.lit = lit;
      if (lit) { act(w, "recoil"); ctx.emit("playSound", { clip: SND("smiler-light-flinch-shriek"), position: pos, volume: 0.8, maxDistance: 22 }); }
    }
    let vx = 0, vz = 0;
    const dx = goal.x - pos.x, dz = goal.z - pos.z, d = Math.hypot(dx, dz);
    if (!lit && d > (prey ? 1.1 : 0.3)) { vx = (dx / d) * speed * mu.speed; vz = (dz / d) * speed * mu.speed; }
    // the lunge: one burst from up to 4 m, jaw unhinged; a hit drags the wanderer in
    if (prey && !lit && !m.lunge && pd <= LUNGE.range && now >= (m.bite ?? 0)) {
      m.lunge = { until: now + LUNGE.ms, x: (prey.feetPosition.x - pos.x) / (pd || 1), z: (prey.feetPosition.z - pos.z) / (pd || 1) };
      act(w, "lunge-bite");
      ctx.emit("playSound", { clip: SND("smiler-lunge-snap-shriek"), position: pos, volume: 1, maxDistance: 26 });
    }
    if (m.lunge) {
      if (now > m.lunge.until) { m.lunge = null; m.bite = now + LUNGE.cooldown * 1000; }
      else { const s = Math.min(1, pd / 0.9); vx = m.lunge.x * LUNGE.speed * s; vz = m.lunge.z * LUNGE.speed * s; }
    }
    const ahead = cellAt(pos.x + vx * 0.5, pos.z + vz * 0.5);
    if (inHub(ahead.cx, ahead.cz)) { vx = 0; vz = 0; m.next = null; m.last = null; m.prey = null; m.lunge = null; }
    const v = w.velocity ?? { y: 0 };
    w.velocity = { x: vx, y: (v.y ?? 0) + ctx.place.gravity.y * dt, z: vz };
    const face = prey ? { x: prey.feetPosition.x - pos.x, z: prey.feetPosition.z - pos.z } : { x: vx, z: vz };
    if (face.x || face.z) { const yaw = (Math.atan2(-face.x, -face.z) * 180) / Math.PI; if (Math.abs(((yaw - (m.yaw ?? 999) + 540) % 360) - 180) > 6) { m.yaw = yaw; w.rotation = yaw; } }
    // the gait: frozen rigid in the beam, skitter at the pace it moves, else the head-tilt sway
    const hs = Math.hypot(vx, vz);
    const mode = lit ? "freeze" : hs > 0.1 ? "skitter:" + Math.max(0.3, Math.min(1.8, Math.round((hs / 3.5) * 4) / 4)) : "idle";
    if (m.mode !== mode) { m.mode = mode; const [clip, sp] = mode.split(":"); w.anim.body = { clip: CLIP[clip] ?? clip, loop: "loop", speed: sp ? +sp : 1 }; }
    if (m.lunge && !m.lunge.hit && prey && pd < LUNGE.hit) {
      m.lunge.hit = true;
      const dmg = Math.round(L.biteDamage * mu.dmg);
      prey.state.hp -= dmgAfterArmor(prey.state.look, dmg); // worn clothes soak the hit (lib/clothes.yml DR)
      prey.state.sanity -= L.biteSanity;
      const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.4, z: prey.feetPosition.z };
      const to = { x: -m.lunge.x, y: 0, z: -m.lunge.z }, me = { player: prey.id }, mass = prey.measure?.mass ?? 75;
      ctx.emit("damageNumber", { position: at, value: dmg, color: "#ff4a3a" });
      ctx.emit("playSound", { clip: SND("creature-bite-snarl-wet"), position: at, volume: 1, maxDistance: 25 });
      ctx.emit("impulse", { target: prey.id, impulse: { x: to.x * mass * LUNGE.pull, y: mass * 1.2, z: to.z * mass * LUNGE.pull } }); // dragged ~1 m in
      ctx.emit("hitstop", { duration: 0.06 }, { audience: me });
      ctx.emit("screenFlash", { color: "#a00a05", duration: 0.3, intensity: 0.5 }, { audience: me });
      ctx.emit("cameraPunch", { direction: to, intensity: 0.6 }, { audience: me });
      ctx.emit("squash", { target: w.id, axis: "z", intensity: 0.2, duration: 0.2 });
    }
  }
}
