// Level 6 "Lights Out" Smiler: a terrifying predator lurking in total darkness.
// Follows Wikidot Backrooms lore:
// - Pitch dark: only its glowing luminescent white eyes and predatory smile are visible.
// - Eye contact: stare directly at it and it freezes rigid, locked in place.
// - Break eye contact or turn your back, and it charges at blinding speed to lunge.
// - Flashlights don't work in Level 6, so wanderers cannot blind or pin it with a torch beam.
import { knocked } from "./lib/knock.js";
import { heard } from "./lib/hear.js";
import { raycast } from "builtin/physics";
import { shotAt, wallSteer, wedged } from "./lib/hunt.js";
import { stepToward6, cellAt, cellCenter, isWalkable } from "./lib/level6path.js";
import { npcMul, derived, dmgAfterArmor } from "./lib/stats.js";

export const MODEL = { id: "/cdn/value.fb443f6a23bcd4977c437db42b3f9abe2510fcb6cf2076ee4956fb235d581b26.glb", forward: "+x" };
export const SCALE = 1.6;

const CLIP = {
  idle: "cdn/clip-crouch-idle-loop.glb",
  skitter: "cdn/clip-crouch-walk-loop.glb",
  freeze: "cdn/clip-block-loop.glb",
  "lunge-bite": "cdn/clip-attack.glb",
  recoil: "cdn/clip-hit-react.glb",
  death: "cdn/clip-die.glb",
};

const EYE = 1.1;
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const POOF = `fx
pop shade burst=22..30 life=.8..1.4 on=box(.8,.5,1.2).c(.3) v=sdir()*(.4..1.2)+up(.6) size=.3..0.6 acc=buoy(.6)+curl(.6)+drag(1.2) col=<.04,.03,.06> a=0>.5:.6>0 sz=$size*(.6>1.6) rot=spin(.4) r=sprite(smoke-puff,alpha)
pop spark burst=10 life=.4..0.8 on=point() v=sdir()*(1..2.5) size=.03..0.05 acc=drag(2) col=hdr(3,2.8,2.2) a=1>0 r=sprite(ember,add)`;

function anim(w, m, clip, loop = true, speed = 1) {
  if (m.clip === clip) return;
  m.clip = clip;
  w.anim.main = { clip: CLIP[clip] ?? clip, loop, speed, weight: 1 };
}

function act(w, clip, extra = {}) {
  w.anim.act = { clip: CLIP[clip] ?? clip, loop: "once", blend: "override", weight: 4, time: 0, ...extra };
}

function hasClearSight(ctx, a, b, ignoreId, targetId) {
  const dx = b.x - a.x, dy = (b.y ?? 0) - (a.y ?? 0), dz = b.z - a.z, d = Math.hypot(dx, dz);
  if (d > 18) return false;
  const l = Math.hypot(dx, dy, dz) || 1;
  const hit = raycast(ctx, { x: a.x, y: (a.y ?? 0) + EYE, z: a.z }, { x: dx / l, y: dy / l, z: dz / l }, { distance: l, physicsOnly: true, bodies: "static", ignoreEntities: [ignoreId, targetId] });
  return !hit;
}

export function update(ctx, dt) {
  if (!ctx.place.players.length) { ctx.sleep(2); return; } // nobody in this level: rest
  const now = ctx.now();
  const mem = (ctx.self.session.m ??= {});
  const players = ctx.place.players.filter((p) => !(p.state?.downAt && now - p.state.downAt < 4500));
  const smilers = ctx.query({ tags: ["l6-smiler"] });

  for (const w of smilers) {
    const m = (mem[w.id] ??= {}), st = w.state ?? {}, pos = w.feetPosition, mu = npcMul(st);
    if (knocked(ctx, w, now, dt)) continue;

    if (st.dead || (st.hp ?? 1) <= 0) {
      if (!m.dieAt) {
        m.dieAt = now;
        w.velocity = { x: 0, y: -1, z: 0 };
        act(w, "death");
        heard(ctx, { clip: SND("shadow-creature-dissolve-hiss"), position: pos, volume: 0.9, maxDistance: 30 });
      } else if (!m.gone && now - m.dieAt > 1800) {
        m.gone = true;
        ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.3, z: pos.z }, script: POOF });
        ctx.destroy(w.id);
      }
      continue;
    }

    // Target tracking
    if (now >= (m.look ?? 0)) {
      m.look = now + 350 + ctx.random() * 200;
      let best = null, bd = Infinity;
      for (const p of players) {
        const pp = p.feetPosition, dx = pp.x - pos.x, dz = pp.z - pos.z, d = Math.hypot(dx, dz);
        // Wikidot lore: Smilers detect motion and breathing in pitch dark up to 16m
        const sight = d < 16 && hasClearSight(ctx, pos, pp, w.id, p.id);
        if (sight && d < bd) { best = p; bd = d; }
      }
      if (best && !m.prey) {
        heard(ctx, { clip: SND("smiler-wet-giggle-hiss-stalking"), position: pos, volume: 0.9, maxDistance: 28 });
      }
      m.prey = best?.id ?? null;
      // shot from beyond its 16 m dark sight: it still turns on the shooter (player.js writes state.shot on every hit)
      if (!best && !m.prey) {
        const sh = shotAt(st, now);
        if (sh && (!m.last || m.last.at < sh.at)) m.last = { ...sh };
      }
    }

    const prey = m.prey ? players.find((p) => p.id === m.prey) : null;
    let goal = null, speed = 1.4, frozen = false;

    if (prey) {
      goal = prey.feetPosition;
      const pd = Math.hypot(prey.feetPosition.x - pos.x, prey.feetPosition.z - pos.z);

      // Eye contact detection: wanderer looking directly at the Smiler
      const yaw = prey.camera?.rotation?.yaw;
      if (yaw != null) {
        const r = (yaw * Math.PI) / 180, fx = -Math.sin(r), fz = -Math.cos(r);
        const tx = pos.x - goal.x, tz = pos.z - goal.z, tl = Math.hypot(tx, tz) || 1;
        // Looking directly within ~35 degrees
        const staring = (fx * tx + fz * tz) / tl > 0.82;
        if (staring && pd < 14) {
          frozen = true;
          speed = 0;
          if (!m.stared) {
            m.stared = true;
            heard(ctx, { clip: SND("creepy-wet-giggle-close"), position: pos, volume: 0.7, maxDistance: 20 });
          }
        } else {
          m.stared = false;
          // When not stared at, charge fast!
          speed = pd < 10 ? 6.2 : 3.8;
        }
      }

      // Attack if close enough
      if (pd < 1.7 && now > (m.attackCd ?? 0)) {
        m.attackCd = now + 1600;
        act(w, "lunge-bite");
        heard(ctx, { clip: SND("smiler-lunge-snap-shriek"), position: pos, volume: 1, maxDistance: 25 });
        const dmg = Math.round(24 * mu.dmg);
        prey.state.hp = Math.max(0, (prey.state.hp ?? 100) - dmgAfterArmor(prey.state.look, dmg));
        prey.state.sanity = Math.max(0, (prey.state.sanity ?? 100) - 12);
        ctx.emit("damageNumber", { position: { x: prey.feetPosition.x, y: 1.2, z: prey.feetPosition.z }, value: dmg, color: "#ff2233" });
        ctx.emit("screenShake", { intensity: 0.5, duration: 0.3 }, { audience: { player: prey.id } });
      }
    } else if (m.last && now - m.last.at < 8000) {
      // the shot's ground: it lopes for where the shooter stood, and forgets it standing there
      goal = m.last;
      speed = 3.8;
      if (Math.hypot(goal.x - pos.x, goal.z - pos.z) < 0.8) m.last = null;
    } else {
      // Roaming through the labyrinth
      if (!m.roam || now > (m.roamUntil ?? 0) || Math.hypot(pos.x - m.roam.x, pos.z - m.roam.z) < 0.6) {
        const c = cellAt(pos.x, pos.z);
        const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([di, dj]) => isWalkable(c.i + di, c.j + dj));
        if (dirs.length) {
          const pick = dirs[Math.floor(ctx.random() * dirs.length)];
          m.roam = cellCenter(c.i + pick[0], c.j + pick[1]);
        } else {
          m.roam = cellCenter(c.i, c.j);
        }
        m.roamUntil = now + 6000;
      }
      goal = m.roam;
      speed = 1.3;
    }

    if (frozen) {
      anim(w, m, "freeze", true, 0.5);
      w.velocity = { x: 0, y: (w.velocity?.y ?? 0) - 20 * dt, z: 0 };
      continue;
    }

    // Pathfinding
    const sight = prey && hasClearSight(ctx, pos, prey.feetPosition, w.id, prey.id);
    let way = null;
    if (goal && !sight) {
      way = stepToward6(pos.x, pos.z, goal.x, goal.z, 28);
    }
    const tgt = way && way.cells > 0 ? way.next : goal;
    const dx = tgt.x - pos.x, dz = tgt.z - pos.z, d = Math.hypot(dx, dz) || 1;
    let ux = dx / d, uz = dz / d;

    // Stuck avoidance
    m.sk ??= { x: pos.x, z: pos.z, at: now };
    if (now - m.sk.at > 650) {
      const moved = Math.hypot(pos.x - m.sk.x, pos.z - m.sk.z);
      if (speed > 1 && moved < 0.2) {
        m.side = { s: ctx.random() < 0.5 ? -1 : 1, until: now + 500 };
        m.roam = null;
      }
      // wedged: not budged for ~2 s while trying to walk: backed off the wall (the same cure the hounds and stealers take)
      if (wedged(m, moved, speed > 0.5) && d > 0.01) { w.feetPosition = { x: pos.x - (dx / d) * 0.7, y: pos.y + 0.05, z: pos.z - (dz / d) * 0.7 }; w.velocity = { x: 0, y: 0, z: 0 }; m.roam = null }
      m.sk = { x: pos.x, z: pos.z, at: now };
    }
    if (m.side && now < m.side.until) {
      const s = m.side.s;
      ux = ux * 0.4 + -uz * s * 0.9;
      uz = uz * 0.4 + (dx / d) * s * 0.9;
      const l = Math.hypot(ux, uz) || 1;
      ux /= l; uz /= l;
    }

    if (speed > 0) [ux, uz] = wallSteer(ctx, m, now, pos, ux, uz, w.id); // walls on any level: a short ray along the heading
    anim(w, m, speed > 3 ? "skitter" : "skitter", true, speed > 3 ? 1.6 : 1);
    w.velocity = { x: ux * speed, y: (w.velocity?.y ?? 0) - 20 * dt, z: uz * speed };
    w.rotation = { yaw: Math.atan2(-ux, -uz) * 57.2958 };
  }
}




