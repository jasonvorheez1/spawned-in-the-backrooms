// The pack manager: one script moves every smiler. They drift cell to cell along open doorways,
// lock on to a wanderer they can see, stalk, then lunge and bite. They never cross into the safe room.
// Body: a Blender crawler (art/smiler/build.py) with baked clips idle, skitter, freeze, lunge-bite, recoil, death.
// A flashlight held on one makes it flinch (recoil) and lock rigid (freeze) until the beam leaves it.

import { heard } from "./lib/hear.js";
import { hearOf, sighting, leadOf, raise, alertFor } from "./lib/hunt.js";
import L from "./lib/data/level0.yml";
import { cellAt, cellCenter as cellMid, openPoint, hasPillar, inHub, wallX, wallZ, hasPit, N } from "./lib/maze.js";
const cellCenter = openPoint; // every standing spot this pack picks is clear of the cell's pillar
import { stepToward as stepToward0 } from "./lib/maze0path.js";
import { raycast } from "builtin/physics";
import { npcMul, derived, dmgAfterArmor } from "./lib/stats.js";

const sn = (p) => (p?.state?.attr ? derived(p.state).sneak : 1);

export const MODEL = {
  id: "/cdn/value.fb443f6a23bcd4977c437db42b3f9abe2510fcb6cf2076ee4956fb235d581b26.glb",
  forward: "+x",
};
export const SCALE = 1.6;

// Mixamo rig animation clips
const CLIP = {
  idle: "cdn/clip-crouch-idle-loop.glb",
  skitter: "cdn/clip-crouch-walk-loop.glb",
  freeze: "cdn/clip-block-loop.glb",
  "lunge-bite": "cdn/clip-attack.glb",
  recoil: "cdn/clip-hit-react.glb",
  death: "cdn/clip-die.glb",
};

const MDL = 2;
const EYE = 1.1;
const LUNGE = { range: 4, speed: 9.5, ms: 430, hit: 1.35, pull: 4.5, cooldown: 1.8 };
const FREEZE_RANGE = 14; // a beam held on it from this close pins it
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;

const POOF = `fx
pop shade burst=22..30 life=.8..1.4 on=box(.8,.5,1.2).c(.3) v=sdir()*(.4..1.2)+up(.6) size=.3..0.6 acc=buoy(.6)+curl(.6)+drag(1.2) col=<.04,.03,.06> a=0>.5:.6>0 sz=$size*(.6>1.6) rot=spin(.4) r=sprite(smoke-puff,alpha)
pop spark burst=10 life=.4..0.8 on=point() v=sdir()*(1..2.5) size=.03..0.05 acc=drag(2) col=hdr(3,2.8,2.2) a=1>0 r=sprite(ember,add)`;

function neighbor(ctx, pos) {
  const { cx, cz } = cellAt(pos.x, pos.z);
  const o = [];
  if (cx < N - 1 && !wallX(cx, cz)) o.push([cx + 1, cz]);
  if (cx > 0 && !wallX(cx - 1, cz)) o.push([cx - 1, cz]);
  if (cz < N - 1 && !wallZ(cx, cz)) o.push([cx, cz + 1]);
  if (cz > 0 && !wallZ(cx, cz - 1)) o.push([cx, cz - 1]);
  const ok = o.filter(([a, b]) => !inHub(a, b) && !hasPit(a, b));
  if (!ok.length) return cellCenter(cx, cz);
  const [a, b] = ok[Math.floor(ctx.random() * ok.length)];
  return cellCenter(a, b);
}

// roam: a patrol leg several rooms long, often drifting toward the nearest wanderer's part of the maze, with a listening pause at each stop
// search: after losing a wanderer, sweep a few rooms around the spot they vanished before going back to patrol
// keep the body off walls and pillars: its model is wider than its capsule, so it stays ~1 m clear of each wall face and pillar
function wallPush(pos) {
  const { cx, cz } = cellAt(pos.x, pos.z), lx = pos.x - (cx * 4 - (N * 4) / 2), lz = pos.z - (cz * 4 - (N * 4) / 2), R = 1.0;
  let px = 0, pz = 0;
  if ((cx <= 0 || wallX(cx - 1, cz)) && lx < R) px += R - lx;
  if ((cx >= N - 1 || wallX(cx, cz)) && lx > 4 - R) px -= lx - (4 - R);
  if ((cz <= 0 || wallZ(cx, cz - 1)) && lz < R) pz += R - lz;
  if ((cz >= N - 1 || wallZ(cx, cz)) && lz > 4 - R) pz -= lz - (4 - R);
  if (hasPillar(cx, cz)) { const dx = lx - 2, dz = lz - 2, d = Math.hypot(dx, dz) || 0.01; if (d < 1.6) { px += (dx / d) * (1.6 - d); pz += (dz / d) * (1.6 - d); } }
  return { x: px, z: pz };
}

function searchTarget(ctx, pos, at) {
  for (let t = 0; t < 6; t++) {
    const c = cellAt(at.x + (ctx.random() * 2 - 1) * 9, at.z + (ctx.random() * 2 - 1) * 9);
    const cx = Math.max(0, Math.min(N - 1, c.cx)), cz = Math.max(0, Math.min(N - 1, c.cz));
    if (inHub(cx, cz) || hasPit(cx, cz)) continue;
    const g = cellCenter(cx, cz);
    if (stepToward0(pos.x, pos.z, g.x, g.z, 25)) return g;
  }
  return null;
}

function roamTarget(ctx, pos, players) {
  let near = null, nd = 70;
  for (const p of players) { const d = Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z); if (d < nd) { nd = d; near = p; } }
  for (let t = 0; t < 6; t++) {
    const base = near && ctx.random() < 0.6 ? near.feetPosition : pos;
    const spread = base === pos ? 18 : 10;
    const c = cellAt(base.x + (ctx.random() * 2 - 1) * spread, base.z + (ctx.random() * 2 - 1) * spread);
    const cx = Math.max(0, Math.min(N - 1, c.cx)), cz = Math.max(0, Math.min(N - 1, c.cz));
    if (inHub(cx, cz) || hasPit(cx, cz)) continue;
    const g = cellCenter(cx, cz);
    if (stepToward0(pos.x, pos.z, g.x, g.z, 25)) return g;
  }
  return neighbor(ctx, pos);
}

function act(w, clip, extra) {
  w.anim.act = { clip: CLIP[clip] ?? clip, loop: "once", blend: "override", weight: 4, time: 0, ...extra };
}

// Throttled raycast line of sight check
function checkSightThrottled(ctx, m, now, a, b, ignoreId, targetId) {
  const dx = b.x - a.x;
  const dy = (b.y ?? 0) - (a.y ?? 0);
  const dz = b.z - a.z;
  const d2 = dx * dx + dz * dz;

  if (d2 > 14 * 14) return false;

  if (m.los && now < m.los.until && m.los.targetId === targetId) {
    return m.los.clear;
  }

  const l = Math.sqrt(d2 + dy * dy) || 1;
  const hit = raycast(
    ctx,
    { x: a.x, y: (a.y ?? 0) + EYE, z: a.z },
    { x: dx / l, y: dy / l, z: dz / l },
    { distance: l, physicsOnly: true, bodies: "static", ignoreEntities: [ignoreId, targetId] }
  );

  const clear = !hit;
  m.los = {
    clear,
    until: now + 150 + (dx % 40),
    targetId,
  };
  return clear;
}

export function update(ctx, dt) {
  if (!ctx.place.players.length) { ctx.sleep(2); return; }
  const now = ctx.now();
  const players = ctx.place.players.filter((p) => !(p.state?.downAt && now - p.state.downAt < 4500));
  const mem = (ctx.self.session.m ??= {});
  if (!mem.smilersAt || now > mem.smilersAt || !mem.allSmilers) {
    mem.smilersAt = now + 1200;
    mem.allSmilers = ctx.query({ tags: ["smiler"] });
  }
  const objs = ctx.place.objects;
  const allSmilers = mem.allSmilers.filter((w) => w.id in objs); // one destroyed since the last census is skipped, never written to

  for (const w of allSmilers) {
    const m = (mem[w.id] ??= {});
    const st = w.state ?? {};
    const pos = w.feetPosition;
    const mu = npcMul(st);

    if (st.mdl !== MDL) {
      w.primitive = null;
      w.material = null;
      w.model = MODEL;
      w.scale = SCALE;
      w.state.mdl = MDL;
      m.mode = null;
    }

    // Death: folds and melts into the carpet, then shade dissolves
    if (st.dead) {
      if (!m.dieAt) {
        m.dieAt = now;
        w.velocity = { x: 0, y: 0, z: 0 };
        w.anim.body = null;
        act(w, "death", { clampWhenFinished: true });
        heard(ctx, { clip: SND("shadow-creature-dissolve-hiss"), position: pos, volume: 0.9, maxDistance: 35 });
      } else if (!m.gone && now - m.dieAt > 1700 && now > (st.inspectUntil ?? 0)) {
        m.gone = true;
        ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.3, z: pos.z }, script: POOF });
        ctx.destroy(w.id);
      }
      continue;
    }

    // Vision check (throttled)
    if (now >= (m.look ?? 0)) {
      m.look = now + 300 + ctx.random() * 200;
      let best = null;
      let bd = Infinity;

      for (const p of players) {
        const pp = p.feetPosition;
        const c = cellAt(pp.x, pp.z);
        if (inHub(c.cx, c.cz)) continue;

        const dx = pp.x - pos.x;
        const dz = pp.z - pos.z;
        const dy = pp.y + 1.3 - (pos.y + EYE);
        const d = Math.hypot(dx, dz);

        // Drawn to light: flashlight seen from far off, dark wanderer only up close
        const pVel = p.velocity;
        const pMoving = pVel && (pVel.x * pVel.x + pVel.z * pVel.z > 1);
        const glimpseMul = pMoving ? (L.smilerGlimpse ?? 6) / L.smilerSight : 0;
        const baseReach = p.state?.light ? L.smilerSightLit : m.prey === p.id ? 1 : Math.max(L.smilerSightDark, glimpseMul);
        const reach = L.smilerSight * mu.sight * sn(p) * baseReach;

        if (d >= reach || d >= bd) continue;

        const L3 = Math.hypot(dx, dy, dz) || 1;
        const hit = raycast(
          ctx,
          { x: pos.x, y: pos.y + EYE, z: pos.z },
          { x: dx / L3, y: dy / L3, z: dz / L3 },
          { distance: L3, physicsOnly: true, ignoreEntities: [w.id, p.id], bodies: "static" }
        );
        if (hit) continue;

        best = p;
        bd = d;
      }

      if (best && !m.prey) {
        heard(ctx, { clip: SND("smiler-wet-giggle-hiss-stalking"), position: pos, volume: 1, maxDistance: 30 });
      }

      m.prey = best?.id ?? null;
      if (st.horde && players.some((p) => p.id === st.horde)) {
        m.prey = st.horde; // blackout horde hunts its player
      }

      // Audio cues if not visually spotted
      if (!best && !m.prey) {
        const h = hearOf(pos, players, (p) => {
          const c = cellAt(p.feetPosition.x, p.feetPosition.z);
          return inHub(c.cx, c.cz);
        }, ctx);

        if (h) {
          m.last = sighting(h, now);
          m.heard = true;
        } else {
          const a = alertFor(ctx, pos);
          if (a && (!m.last || m.last.at < a.at)) {
            m.last = { ...a };
            m.heard = false;
            m.lead = null;
          }
        }
      }

      if (best) {
        if (!m.called || now - m.called > 6000) {
          m.called = now;
          raise(ctx, best);
        }
        m.last = sighting(best, now);
        m.search = null;
        m.heard = false;
        m.lead = null;
      }
    }

    const prey = m.prey ? players.find((p) => p.id === m.prey) : null;
    let goal;
    let speed;
    let lit = false;
    const pd = prey ? Math.hypot(prey.feetPosition.x - pos.x, prey.feetPosition.z - pos.z) : Infinity;

    if (prey) {
      goal = prey.feetPosition;
      speed = pd < 9 ? L.chargeSpeed : L.stalkSpeed;

      // Eye contact: while wanderer stares straight at it, it creeps; flashlight pins it rigid
      const yaw = prey.camera?.rotation?.yaw;
      if (yaw != null) {
        const r = (yaw * Math.PI) / 180;
        const fx = -Math.sin(r);
        const fz = -Math.cos(r);
        const tx = pos.x - goal.x;
        const tz = pos.z - goal.z;
        const tl = Math.hypot(tx, tz) || 1;
        const staring = (fx * tx + fz * tz) / tl > Math.cos((L.stareCone * Math.PI) / 180);

        if (staring) speed = L.stareSpeed;
        lit = staring && !!prey.state?.light && pd < FREEZE_RANGE && !m.lunge;

        if (staring !== !!m.stared) {
          m.stared = staring;
          if (!staring) {
            heard(ctx, { clip: SND("creepy-wet-giggle-close"), position: pos, volume: 0.7, maxDistance: 20 });
          }
        }
      }
    } else if (m.last && now - m.last.at < (L.chaseMemory ?? 12) * 1000) {
      m.lead ??= leadOf(m.last);
      goal = m.heard ? m.last : m.lead;
      speed = m.heard ? L.stalkSpeed : (L.chaseMemory ? L.stalkSpeed * 1.25 : L.stalkSpeed);

      if (Math.hypot(goal.x - pos.x, goal.z - pos.z) < 0.8) {
        if (!m.heard && m.lead && goal === m.lead) {
          m.lead = null;
          m.last = { ...m.last, x: goal.x, z: goal.z };
        } else {
          m.search = { x: m.last.x, z: m.last.z, left: 3 };
          m.next = null;
          m.restUntil = 0;
          m.last = null;
          m.lead = null;
        }
      }
    } else {
      if (m.next && Math.hypot(m.next.x - pos.x, m.next.z - pos.z) < 0.6 && !m.restUntil) m.restUntil = now + 1500 + ctx.random() * 2500;
      if (!m.next || now > (m.nextBy ?? 0) || (m.restUntil && now > m.restUntil)) {
        const sg = m.search && m.search.left-- > 0 ? searchTarget(ctx, pos, m.search) : null;
        if (!sg) m.search = null;
        m.next = sg ?? roamTarget(ctx, pos, players);
        m.nextBy = now + 25000;
        m.restUntil = 0;
      }
      goal = m.restUntil ? pos : m.next;
      speed = m.restUntil ? 0 : m.search ? L.stalkSpeed * 0.8 : 2.1;
    }

    if (lit !== !!m.lit) {
      m.lit = lit;
      if (lit) {
        act(w, "recoil");
        heard(ctx, { clip: SND("smiler-light-flinch-shriek"), position: pos, volume: 0.8, maxDistance: 22 });
      }
    }

    const sight = prey && checkSightThrottled(ctx, m, now, pos, prey.feetPosition, w.id, prey.id);
    let way = null;
    if ((prey || m.last || m.next) && !sight) {
      way = stepToward0(pos.x, pos.z, goal.x, goal.z, 25);
    }

    const tgt = way && way.cells > 0 ? way.next : goal;
    const dx = tgt.x - pos.x;
    const dz = tgt.z - pos.z;
    const d = Math.hypot(dx, dz) || 1;
    let ux = dx / d;
    let uz = dz / d;

    // Stuck detection: sidestep & repath if trapped against collider
    m.sk ??= { x: pos.x, z: pos.z, at: now };
    if (now - m.sk.at > 700) {
      const moved = Math.hypot(pos.x - m.sk.x, pos.z - m.sk.z);
      if (!lit && speed > 1 && moved < 0.2) {
        m.side = { s: ctx.random() < 0.5 ? -1 : 1, until: now + 500 };
        m.next = null;
      }
      // wedged: a body that has not budged for ~2 s while trying to walk (a wall shifted onto it) is lifted back to open floor
      m.wedge = moved < 0.05 && !lit && speed > 0.5 ? (m.wedge ?? 0) + 1 : 0;
      if (m.wedge >= 3) { const c = cellAt(pos.x, pos.z), cc = cellCenter(c.cx, c.cz), far = Math.hypot(cc.x - pos.x, cc.z - pos.z) > 0.6, to = far ? cc : neighbor(ctx, pos); w.feetPosition = { x: to.x, y: pos.y + 0.05, z: to.z }; w.velocity = { x: 0, y: 0, z: 0 }; m.wedge = 0; m.next = null; m.side = null; }
      m.sk = { x: pos.x, z: pos.z, at: now };
    }

    if (m.side && now < m.side.until) {
      const s = m.side.s;
      const curX = ux;
      const curZ = uz;
      ux = curX * 0.4 - curZ * s * 0.9;
      uz = curZ * 0.4 + curX * s * 0.9;
    }

    // Separation: push away from nearby smilers (squared distance check)
    if (now >= (m.sepAt ?? 0)) {
      m.sepAt = now + 250;
      let sx = 0;
      let sz = 0;
      for (const o of allSmilers) {
        if (o.id === w.id) continue;
        const ox = pos.x - o.feetPosition.x;
        const oz = pos.z - o.feetPosition.z;
        const d2 = ox * ox + oz * oz;
        if (d2 < 1.96 && d2 > 0.0001) { // 1.4^2
          const od = Math.sqrt(d2);
          const push = (1.4 - od) / od;
          sx += ox * push;
          sz += oz * push;
        }
      }
      m.sep = { x: sx, z: sz };
    }

    if (m.sep) {
      ux += m.sep.x * 1.1;
      uz += m.sep.z * 1.1;
    }

    { const wp = wallPush(pos); ux += wp.x * 2.2; uz += wp.z * 2.2; }
    const ul = Math.hypot(ux, uz) || 1;
    ux /= ul;
    uz /= ul;

    let vx = 0;
    let vz = 0;
    const near = way && way.cells > 0 ? 0.35 : prey ? 1.1 : 0.3;
    if (!lit && d > near) {
      vx = ux * speed * mu.speed;
      vz = uz * speed * mu.speed;
    }

    // Lunge attack: burst from up to 4m
    if (prey && !lit && !m.lunge && pd <= LUNGE.range && now >= (m.bite ?? 0)) {
      m.lunge = {
        until: now + LUNGE.ms,
        x: (prey.feetPosition.x - pos.x) / (pd || 1),
        z: (prey.feetPosition.z - pos.z) / (pd || 1),
      };
      act(w, "lunge-bite");
      heard(ctx, { clip: SND("smiler-lunge-snap-shriek"), position: pos, volume: 1, maxDistance: 26 });
    }

    if (m.lunge) {
      if (now > m.lunge.until) {
        m.lunge = null;
        m.bite = now + LUNGE.cooldown * 1000;
      } else {
        const s = Math.min(1, pd / 0.9);
        vx = m.lunge.x * LUNGE.speed * s;
        vz = m.lunge.z * LUNGE.speed * s;
      }
    }

    const ahead = cellAt(pos.x + vx * 0.5, pos.z + vz * 0.5);
    if (inHub(ahead.cx, ahead.cz)) {
      vx = 0;
      vz = 0;
      m.next = null;
      m.last = null;
      m.prey = null;
      m.lunge = null;
    }

    const curVy = w.velocity?.y ?? 0;
    w.velocity = { x: vx, y: curVy + ctx.place.gravity.y * dt, z: vz };

    const face = prey ? { x: prey.feetPosition.x - pos.x, z: prey.feetPosition.z - pos.z } : { x: vx, z: vz };
    if (face.x || face.z) {
      const yaw = (Math.atan2(-face.x, -face.z) * 180) / Math.PI;
      if (Math.abs((((yaw - (m.yaw ?? 999) + 540) % 360) - 180)) > 6) {
        m.yaw = yaw;
        w.rotation = yaw;
      }
    }

    // Gait animation: freeze when lit, skitter when moving, idle sway when still
    const hs = Math.hypot(vx, vz);
    const mode = lit ? "freeze" : hs > 0.1 ? "skitter:" + Math.max(0.3, Math.min(1.8, Math.round((hs / 3.5) * 4) / 4)) : "idle";
    if (m.mode !== mode) {
      m.mode = mode;
      const [clip, sp] = mode.split(":");
      w.anim.body = { clip: CLIP[clip] ?? clip, loop: "loop", speed: sp ? +sp : 1 };
    }

    // Lunge hit resolution
    if (m.lunge && !m.lunge.hit && prey && pd < LUNGE.hit) {
      m.lunge.hit = true;
      const dmg = Math.round(L.biteDamage * mu.dmg);
      prey.state.hp -= dmgAfterArmor(prey.state.look, dmg);
      prey.state.sanity -= L.biteSanity;

      const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.4, z: prey.feetPosition.z };
      const to = { x: -m.lunge.x, y: 0, z: -m.lunge.z };
      const me = { player: prey.id };
      const mass = prey.measure?.mass ?? 75;

      ctx.emit("damageNumber", { position: at, value: dmg, color: "#ff4a3a" });
      heard(ctx, { clip: SND("creature-bite-snarl-wet"), position: at, volume: 1, maxDistance: 25 });
      ctx.emit("impulse", { target: prey.id, impulse: { x: to.x * mass * LUNGE.pull, y: mass * 1.2, z: to.z * mass * LUNGE.pull } });
      ctx.emit("hitstop", { duration: 0.06 }, { audience: me });
      ctx.emit("screenFlash", { color: "#a00a05", duration: 0.3, intensity: 0.5 }, { audience: me });
      ctx.emit("cameraPunch", { direction: to, intensity: 0.6 }, { audience: me });
      ctx.emit("squash", { target: w.id, axis: "z", intensity: 0.2, duration: 0.2 });
    }
  }
}
