// Deathmoths: one manager steps every swarm in the place. They hang about home, go hard for a lit
// flashlight (or anyone stood close), follow the halls cell by cell so they never fly through brick,
// nibble you and your nerves, and stay out of Base Gamma.
import C from "./lib/data/creatures3.yml";
import { cellAt, cellCenter, zoneAt } from "./lib/level3.js";
import { stepToward, cellNear } from "./lib/maze3path.js";
import { npcState, dmgAfterArmor } from "./lib/stats.js";
const M = C.moths;
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const BITE = `fx
pop moths burst=6..10 life=.5..1 v=sdir()*(1..2.2)+up(.5) size=.03..0.05 acc=curl(2)*2+drag(1.5) col=oklch(.5 .03 75) sz=$size*flick(18,.7) a=1>.7:1>0 r=sprite(petal,alpha)`;
const STRAY = `fx
pop moths burst=4..7 life=1.4..2.2 v=up(.6..1.2)+sdir()*(.8..1.6) size=.03..0.05 acc=curl(1.4)*2+drag(.6) col=oklch(.5 .03 75) sz=$size*flick(16,.7) a=1>.8:1>0 r=sprite(petal,alpha)`;
const DEATH = `fx
pop moths burst=50..70 on=sphere(.5) life=1.2..2 v=sdir()*(.3..1.2) size=.03..0.06 spin=-8..8 acc=grav()*.7+drag(1.2) col=oklch(.38 .025 70)..oklch(.55 .03 80) a=1>.8:1>0 sz=$size rot=$age*$spin floor=stick r=sprite(petal,alpha)
pop dust burst=10 on=sphere(.4) life=1..1.6 v=sdir()*(.2..0.5) size=.2..0.4 acc=drag(1.4)+buoy(.2) col=<.5,.46,.38> a=0>.3:.4>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;
const FLY_Y = 1.1;
export function update(ctx, dt) {
  const now = ctx.now(), mem = (ctx.self.session.m ??= {}), rnd = () => ctx.random();
  const players = ctx.place.players.filter((p) => zoneAt(p.feetPosition.x, p.feetPosition.z) !== "gamma" && (p.state?.hp ?? 1) > 0);
  for (const s of ctx.query({ tags: ["moths"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
    const m = (mem[s.id] ??= { bob: rnd() * 6 }), pos = s.feetPosition, st = s.state ?? {};
    if (st.hp == null && !st.dead) { Object.assign(s.state, npcState(ctx, "moths", M.hp, { xp: M.xp })); continue; }
    if (st.dead || st.hp <= 0) {
      if (!m.deadAt) {
        m.deadAt = now; if (!st.dead) s.state.dead = true; s.fx = null; s.audio = null;
        ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.4, z: pos.z }, script: DEATH });
        ctx.emit("playSound", { clip: SND("dusty-paper-moths-crumble-burst"), position: pos, volume: 0.8 });
      } else if (now - m.deadAt > 1000 && !m.gone) { m.gone = true; ctx.destroy(s.id); }
      continue;
    }
    const home = st.home ?? (s.state.home = { x: pos.x, z: pos.z });
    // what pulls them: the nearest lit flashlight in reach, else anyone stood close
    let prey = null, best = Infinity;
    for (const p of players) {
      const d = Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z);
      if ((d < M.lightReach && p.state?.light) || d < M.nearReach) { if (d < best) { best = d; prey = p; } }
    }
    let goal, sp = M.speed;
    if (prey) { goal = prey.feetPosition; sp = prey.state?.light ? M.chase : M.speed * 1.2; }
    else {
      if (!m.wander || now > m.wanderUntil) {
        const hc = cellAt(home.x, home.z), c = cellNear(rnd, hc.cx, hc.cz, M.roam), cc = c ? cellCenter(c[0], c[1]) : home;
        m.wander = { x: cc.x + (rnd() - 0.5) * 1.6, z: cc.z + (rnd() - 0.5) * 1.6 }; m.wanderUntil = now + 5000 + rnd() * 5000;
      }
      goal = m.wander;
    }
    // re-plan twice a second: the next cell centre on the way, or the goal itself in the same cell
    if (!m.plan || now > m.planAt || m.planFor !== (prey?.id ?? "wander")) {
      m.plan = stepToward(pos.x, pos.z, goal.x, goal.z, M.giveUp); m.planAt = now + 500; m.planFor = prey?.id ?? "wander";
      if (!m.plan) { if (prey) { prey = null; } m.wander = null; }
    }
    let tgt = m.plan ? (m.plan.cells === 0 ? goal : m.plan.next) : null;
    if (tgt && m.plan.cells === 0 && prey == null) tgt = goal;
    m.bob += dt * 2.3;
    let nx = pos.x, nz = pos.z;
    if (tgt) {
      const dx = tgt.x - pos.x, dz = tgt.z - pos.z, d = Math.hypot(dx, dz);
      const stop = prey && m.plan?.cells === 0 ? 0.6 : 0.15;
      if (d > stop) { const k = Math.min(d - stop, sp * dt) / d; nx += dx * k; nz += dz * k; }
    }
    if (zoneAt(nx, nz) === "gamma") { nx = pos.x; nz = pos.z; } // Base Gamma is not theirs
    s.feetPosition = { x: nx, y: FLY_Y + Math.sin(m.bob) * 0.18, z: nz };
    // bite
    if (prey && best < M.biteRange && now >= (m.nextBite ?? 0)) {
      m.nextBite = now + M.biteEvery * 1000;
      const dmg = dmgAfterArmor(prey.state.look, M.bite);
      prey.state.hp -= dmg; prey.state.sanity = Math.max(0, (prey.state.sanity ?? 100) - M.sanity);
      const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.3, z: prey.feetPosition.z };
      ctx.emit("damageNumber", { position: at, value: dmg, color: "#c8b48a" });
      ctx.emit("fx", { position: at, script: BITE });
      if (rnd() < 0.5) ctx.emit("playSound", { clip: SND("moth-wings-flurry-bite"), position: at, volume: 0.6, maxDistance: 12 });
    }
    // now and then a handful peel off and wander
    if (now > (m.strayAt ?? (m.strayAt = now + 4000 + rnd() * 6000))) {
      m.strayAt = now + (M.strayEvery[0] + rnd() * (M.strayEvery[1] - M.strayEvery[0])) * 1000;
      ctx.emit("fx", { position: { x: nx, y: FLY_Y + 0.4, z: nz }, script: STRAY }, { audience: { nearby: { x: nx, y: 1, z: nz }, radius: 30 } });
    }
  }
  for (const id in mem) if (mem[id].gone && now - mem[id].deadAt > 5000) delete mem[id];
}
