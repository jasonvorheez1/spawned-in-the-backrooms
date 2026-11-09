// The lurker pack: pale things that only move when nobody is looking at them. A wanderer who keeps one in view
// holds it still (and pays sanity for it); look away, or break the line of sight, and it closes the gap fast.
// They wander the halls like smilers, but never cross into the safe room. Dead lurkers are cleared here.

import { knocked } from "./lib/knock.js";
import { heard } from "./lib/hear.js";
import { hearOf, sighting, leadOf, raise, alertFor } from "./lib/hunt.js";
import L from "./lib/data/level0.yml";
import { cellAt, cellCenter as cellMid, openPoint, hasPillar, inHub, wallX, wallZ, hasPit, N } from "./lib/maze.js";
const cellCenter = openPoint; // every standing spot this pack picks is clear of the cell's pillar
import { stepToward as stepToward0 } from "./lib/maze0path.js";
import { raycast } from "builtin/physics";
import { npcMul, derived, dmgAfterArmor } from "./lib/stats.js";

const sn = (p) => (p?.state?.attr ? derived(p.state).sneak : 1);

export const LURKER_MODEL = {
  id: "/cdn/value.1ab72159712e0df88095f833909b0aaffb6ee0d75924e3fc05806836daa110af.glb",
  forward: "+x",
};
export const LURKER_SCALE = 1.333; // 1.8 m file -> 2.4 m

const CLIP = {
  Idle: "cdn/clip-crouch-idle-loop.glb",
  Creep: "cdn/clip-crouch-walk-loop.glb",
  Death: "cdn/clip-die.glb",
  Grab: "cdn/clip-attack.glb",
  Scream: "cdn/clip-angry.glb",
  PoseReach: "cdn/clip-point.glb",
  PoseCock: "cdn/clip-shrug.glb",
  PoseCrouch: "cdn/clip-crouch-idle-loop.glb",
  PoseClose: "cdn/clip-block-loop.glb",
};

const POSES = ["PoseReach", "PoseCock", "PoseCrouch", "PoseClose"];
const HOLD = 1.2;
const ME = "scripts/lurkers.js";
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;

const POOF = `fx
pop dust burst=18..24 life=.6..1.1 on=box(.6,1.8,.6).c(1) v=sdir()*(.4..1.2)+up(.5) size=.25..0.5 acc=buoy(.4)+drag(1.4) col=<.8,.78,.74> a=0>.35:.5>0 sz=$size*(.6>1.5) r=sprite(smoke-puff,alpha)`;

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


// Raycast check: open air between two points
function clear(ctx, a, b, ignore) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  return !raycast(ctx, a, { x: dx / d, y: dy / d, z: dz / d }, { distance: d, physicsOnly: true, ignoreEntities: ignore, bodies: "static" });
}

// Throttled raycast check for pursuit line of sight
function checkClearThrottled(ctx, m, now, a, b, ignore, targetId) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const d2 = dx * dx + dz * dz;

  if (d2 > 16 * 16) return false;

  if (m.los && now < m.los.until && m.los.targetId === targetId) {
    return m.los.clear;
  }

  const d = Math.sqrt(d2 + dy * dy) || 1;
  const hit = raycast(ctx, a, { x: dx / d, y: dy / d, z: dz / d }, { distance: d, physicsOnly: true, ignoreEntities: ignore, bodies: "static" });
  const isClear = !hit;

  m.los = {
    clear: isClear,
    until: now + 150 + (dx % 40),
    targetId,
  };
  return isClear;
}

function playAnim(w, m, clip, loop = true) {
  if (m.clip === clip) return;
  m.clip = clip;
  w.anim.body = { clip: CLIP[clip] ?? clip, loop, clampWhenFinished: !loop };
}

// Rides a grabbed player's body: held still, view dragged onto its face, then the scream
function held(ctx, dt) {
  const s = ctx.self.state;
  const h = s.lurkHold;
  const now = ctx.now();

  const drop = () => {
    if (ctx.self.isLocal) ctx.view.camera = null;
    ctx.self.session.lh = null;
    if (ctx.self.state.crouch) ctx.self.state.crouch = false; // let go: you stand back up
    const b = ctx.self.behavior;
    if (Array.isArray(b)) ctx.self.behavior = b.filter((x) => x !== ME);
  };

  if (!h) return drop();
  const lk = ctx.getObject(h.by);
  if (!lk || lk.state?.dead || now - h.at > 4000) {
    s.lurkHold = null;
    return drop();
  }

  const lh = (ctx.self.session.lh ??= { t: 0 });
  const p = ctx.self.feetPosition;
  const f = lk.feetPosition;
  const v = ctx.self.velocity ?? {};
  ctx.self.velocity = { x: 0, y: Math.min(0, v.y ?? 0), z: 0 };

  const dx = f.x - p.x;
  const dz = f.z - p.z;
  const d = Math.hypot(dx, dz) || 1;
  const ax = s.aimX ?? 0;
  const az = s.aimZ ?? -1;
  const looking = (dx * ax + dz * az) / d > 0.7;

  lh.t += dt * (looking ? 2.4 : 1); // meet its face and it lets go sooner

  if (ctx.self.isLocal) {
    const eye = { x: p.x, y: p.y + 1.5, z: p.z };
    const k = Math.min(1, lh.t * 3) * 0.8;
    const own = { x: eye.x + ax * 3, y: eye.y, z: eye.z + az * 3 };
    const face = { x: f.x, y: f.y + 2.05, z: f.z };
    ctx.view.camera = {
      eye,
      aim: { x: own.x + (face.x - own.x) * k, y: own.y + (face.y - own.y) * k, z: own.z + (face.z - own.z) * k },
      fov: 58 - k * 12,
    };
  }

  if (lh.t >= HOLD) {
    s.hp -= dmgAfterArmor(s.look, h.dmg);
    s.sanity = Math.max(0, (s.sanity ?? 100) - h.san);
    const at = { x: p.x, y: p.y + 1.4, z: p.z };
    ctx.emit("damageNumber", { position: at, value: h.dmg, color: "#ff4a3a" });
    heard(ctx, { clip: SND("lurker-distorted-tearing-scream"), position: { x: f.x, y: f.y + 2, z: f.z }, volume: 1, maxDistance: 40 });
    ctx.emit("screenShake", { intensity: 1.1, duration: 0.9 }, { audience: { player: ctx.self.id } });
    ctx.emit("screenFlash", { color: "#c8a94a", duration: 0.35, intensity: 0.55 }, { audience: { player: ctx.self.id } });
    s.lurkHold = null;
    drop();
  }
}

export function update(ctx, dt) {
  if (ctx.self.tags?.includes?.("player") || ctx.self.userId) return held(ctx, dt);
  if (!ctx.place.players.length) { ctx.sleep(2); return; }

  const now = ctx.now();
  const players = ctx.place.players.filter((p) => !(p.state?.downAt && now - p.state.downAt < 4500));
  const mem = (ctx.self.session.m ??= {});
  if (!mem.lurkersAt || now > mem.lurkersAt || !mem.allLurkers) {
    mem.lurkersAt = now + 1200;
    mem.allLurkers = ctx.query({ tags: ["lurker"] });
  }
  const objs = ctx.place.objects;
  const allLurkers = mem.allLurkers.filter((w) => w.id in objs);

  for (const w of allLurkers) {
    const m = (mem[w.id] ??= {});
    const st = w.state ?? {};
    const pos = w.feetPosition;
    const mu = npcMul(st);
    if (knocked(ctx, w, now, dt)) continue;

    if (st.mesh !== 3) {
      w.primitive = null;
      w.model = LURKER_MODEL;
      w.scale = LURKER_SCALE;
      st.mesh = 3;
      m.clip = null;
    }

    if (st.dead) {
      if (!m.dying) {
        m.dying = now;
        playAnim(w, m, "Death", false);
        w.velocity = { x: 0, y: -2, z: 0 };
        heard(ctx, { clip: SND("bone-crack-twist"), position: pos, volume: 0.9, maxDistance: 24 });
      }
      if (now - m.dying > 3200 && !m.gone && now > (st.inspectUntil ?? 0)) {
        m.gone = true;
        ctx.emit("fx", { position: { x: pos.x, y: pos.y + 1, z: pos.z }, script: POOF });
        heard(ctx, { clip: SND("shadow-creature-dissolve-hiss"), position: pos, volume: 0.8, maxDistance: 30 });
        ctx.destroy(w.id);
      }
      continue;
    }

    const eye = { x: pos.x, y: pos.y + 1.6, z: pos.z };

    // Vision scan (throttled)
    if (now >= (m.look ?? 0)) {
      m.look = now + 150 + ctx.random() * 100;
      let best = null;
      let bd = L.lurkerSight * mu.sight;
      let watched = null;

      for (const p of players) {
        const pp = p.feetPosition;
        const c = cellAt(pp.x, pp.z);
        if (inHub(c.cx, c.cz)) continue;

        const dx = pp.x - pos.x;
        const dz = pp.z - pos.z;
        const d = Math.hypot(dx, dz);
        if (d >= L.lurkerSight * mu.sight * sn(p)) continue;

        const head = { x: pp.x, y: pp.y + 1.5, z: pp.z };
        if (!clear(ctx, eye, head, [w.id, p.id])) continue;

        // Is the wanderer facing it?
        const ax = p.state?.aimX ?? 0;
        const az = p.state?.aimZ ?? -1;
        if (((-dx) * ax + (-dz) * az) / (d || 1) > L.lurkerWatchCos) {
          watched = p;
        }
        if (d < bd) {
          best = p;
          bd = d;
        }
      }

      if (best && !m.prey) {
        heard(ctx, { clip: SND("bone-crack-twist"), position: pos, volume: 0.8, maxDistance: 24 });
      }
      m.prey = best?.id ?? null;
      if (st.horde && players.some((p) => p.id === st.horde)) {
        m.prey = st.horde;
      }

      if (watched && !m.watched) {
        let k;
        do {
          k = POSES[Math.floor(ctx.random() * POSES.length)];
        } while (k === m.pose && POSES.length > 1);
        m.pose = k;
      }
      m.watched = !!watched;
      if (watched) {
        watched.state.sanity = Math.max(0, watched.state.sanity - L.lurkerGaze * 0.2);
      }

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

    if (prey) {
      goal = prey.feetPosition;
      speed = L.lurkerSpeed;
    } else if (m.last && now - m.last.at < (L.chaseMemory ?? 12) * 1000) {
      m.lead ??= leadOf(m.last);
      goal = m.heard ? m.last : m.lead;
      speed = m.heard ? L.lurkerSpeed * 0.6 : (L.chaseMemory ? L.lurkerSpeed * 0.6 * 1.25 : L.lurkerSpeed * 0.6);

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
      if (m.next && Math.hypot(m.next.x - pos.x, m.next.z - pos.z) < 0.6 && !m.restUntil) m.restUntil = now + 2000 + ctx.random() * 3000;
      if (!m.next || now > (m.nextBy ?? 0) || (m.restUntil && now > m.restUntil)) {
        const sg = m.search && m.search.left-- > 0 ? searchTarget(ctx, pos, m.search) : null;
        if (!sg) m.search = null;
        m.next = sg ?? roamTarget(ctx, pos, players);
        m.nextBy = now + 25000;
        m.restUntil = 0;
      }
      goal = m.restUntil ? pos : m.next;
      speed = m.restUntil ? 0 : m.search ? L.lurkerSpeed * 0.4 : 1.7;
    }

    const sight = prey && checkClearThrottled(ctx, m, now, eye, { x: prey.feetPosition.x, y: prey.feetPosition.y + 1.5, z: prey.feetPosition.z }, [w.id, prey.id], prey.id);
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

    // Stuck detection: sidestep & repath
    m.sk ??= { x: pos.x, z: pos.z, at: now };
    if (now - m.sk.at > 700) {
      const moved = Math.hypot(pos.x - m.sk.x, pos.z - m.sk.z);
      if (!m.watched && speed > 1 && moved < 0.2) {
        m.side = { s: ctx.random() < 0.5 ? -1 : 1, until: now + 500 };
        m.next = null;
      }
      // wedged: a body that has not budged for ~2 s while trying to walk (a wall shifted onto it) is lifted back to open floor
      m.wedge = moved < 0.05 && !m.watched && speed > 0.5 ? (m.wedge ?? 0) + 1 : 0;
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

    // Separation: avoid clumping with nearby lurkers (squared distance check)
    if (now >= (m.sepAt ?? 0)) {
      m.sepAt = now + 250;
      let sx = 0;
      let sz = 0;
      for (const o of allLurkers) {
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
    if (d > near) {
      vx = ux * speed * mu.speed;
      vz = uz * speed * mu.speed;
    }

    // Frozen under a gaze, or executing a grab
    const rage = now < (m.frenzy ?? 0);
    if ((m.watched && !rage) || m.grab || now < (m.screamEnd ?? 0)) {
      vx = 0;
      vz = 0;
    } else if ((vx || vz) && Math.floor(now / 170) % 3 === 2) {
      vx = 0;
      vz = 0; // stop-motion lurch
    } else {
      vx *= 1.4;
      vz *= 1.4;
    }

    const ahead = cellAt(pos.x + vx * 0.5, pos.z + vz * 0.5);
    if (inHub(ahead.cx, ahead.cz)) {
      vx = 0;
      vz = 0;
      m.next = null;
      m.last = null;
      m.prey = null;
    }

    const curVy = w.velocity?.y ?? 0;
    w.velocity = { x: vx, y: curVy + ctx.place.gravity.y * dt, z: vz };

    if (m.grab) {
      const gp = ctx.place.players.find((p) => p.id === m.grab.id);
      const h = gp?.state?.lurkHold;
      if (!h || h.by !== w.id || now - m.grab.at > 4200) {
        m.grab = null;
        m.screamEnd = now + 1500;
        m.frenzy = now + 1500 + 7000; // after the throw: it comes after you for 7 s, your gaze can't freeze it (johnadams2: it should chase after the grab)
        m.prey = m.prey ?? gp?.id ?? null;
        m.bite = now + L.lurkerBiteCooldown * 1000 + 2500;
      }
    }

    if (m.grab) {
      playAnim(w, m, "Grab", false);
    } else if (now < (m.screamEnd ?? 0)) {
      playAnim(w, m, "Scream", false);
    } else if (m.watched && now >= (m.frenzy ?? 0)) {
      playAnim(w, m, m.pose ?? "PoseReach", false);
    } else {
      playAnim(w, m, prey || m.last || vx || vz || m.next ? "Creep" : "Idle", true);
    }

    const face = prey ? { x: prey.feetPosition.x - pos.x, z: prey.feetPosition.z - pos.z } : { x: vx, z: vz };
    if (!m.watched && (face.x || face.z)) {
      const yaw = (Math.atan2(-face.x, -face.z) * 180) / Math.PI;
      if (Math.abs((((yaw - (m.yaw ?? 999) + 540) % 360) - 180)) > 6) {
        m.yaw = yaw;
        w.rotation = yaw;
      }
    }

    // The catch: reached unseen, grabs and holds
    if (prey && !m.watched && !m.grab && !prey.state.lurkHold && Math.hypot(prey.feetPosition.x - pos.x, prey.feetPosition.z - pos.z) < 1.6 && now >= (m.bite ?? 0)) {
      m.grab = { id: prey.id, at: now };
      prey.state.lurkHold = {
        by: w.id,
        at: now,
        dmg: Math.round(L.lurkerBite * 1.6 * mu.dmg),
        san: L.lurkerSanity * 3,
      };
      const b = prey.behavior;
      if (Array.isArray(b) && !b.includes(ME)) {
        prey.behavior = [...b, ME];
      }
      heard(ctx, { clip: SND("bone-crack-twist"), position: pos, volume: 1, maxDistance: 25 });
      ctx.emit("screenFlash", { color: "#1a160c", duration: 0.25, intensity: 0.6 }, { audience: { player: prey.id } });
    }
  }
}
