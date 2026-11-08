// Level 6.1 "The Snackrooms": its natural entities, the Facelings (Entity 9), and the Snackrooms staff who work beside them.
// The wiki: friendly, they cook, clean and serve and give food without payment.
// Custom Level 6.1 animations: counter wiping, plate serving, burger flipping, tray carrying, 80s jukebox grooving, coffee sipping, and diner lounging.
// state.job: "post" (counter staff / seated patrons) | "route" (clearing tables, carrying trays, restocking), state.route = [{ x, z, dwell, act }].

import { heard } from "./lib/hear.js";
import { findPath } from "builtin/nav";
import { raycast } from "builtin/physics";
import {
  WIPE_COUNTER,
  SERVE_PLATE,
  FLIP_BURGER,
  EAT_SNACK,
  SIP_DRINK,
  CARRY_TRAY,
  GROOVE_80S,
  DINER_LOUNGE,
  RELIEF_SIGH,
} from "./lib/l61-anim.js";

const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;

const ACT = {
  wipe: [WIPE_COUNTER, 2400, 0.9],
  serve: [SERVE_PLATE, 2000, 0.9],
  grill: [FLIP_BURGER, 2800, 0.95],
  eat: [EAT_SNACK, 3200, 0.85],
  drink: [SIP_DRINK, 3000, 0.85],
  tray: [CARRY_TRAY, 2500, 0.9],
  groove: [GROOVE_80S, 2000, 0.85],
  lounge: [DINER_LOUNGE, 4000, 0.9],
  relief: [RELIEF_SIGH, 3500, 0.85],
  laugh: ["cdn/clip-laugh-loop.glb", 2400, 0.7],
  nod: ["cdn/clip-nod-yes.glb", 1400, 0.8],
};

const GESTS = [
  [GROOVE_80S, 2000, 0.85],
  [SERVE_PLATE, 2000, 0.85],
  [RELIEF_SIGH, 3500, 0.85],
  ["cdn/clip-nod-yes.glb", 1500, 0.8],
  ["cdn/clip-point.glb", 1900, 0.8],
  ["cdn/clip-wave-loop.glb", 2200, 0.8],
  ["cdn/clip-clap-loop.glb", 1600, 0.6],
];

const yawOf = (dx, dz) => (Math.atan2(-dx, -dz) * 180) / Math.PI;
const turn = (cur, want, k) => {
  const d = ((want - cur + 540) % 360) - 180;
  return cur + d * k;
};
const easeVal = (c, t, dt) => c + (t - c) * Math.min(1, 7 * dt);

function applyRest(me, dt) {
  const v = me.velocity ?? { x: 0, z: 0 };
  me.velocity = {
    x: (v.x ?? 0) * 0.6,
    y: (v.y ?? 0) - 20 * dt,
    z: (v.z ?? 0) * 0.6,
  };
}

function playGesture(me, m, now, g) {
  if (!g) return;
  const clip = g[0];
  const isLoop = typeof clip === "string" && clip.includes("loop");
  me.anim.gest = {
    clip,
    loop: isLoop ? "loop" : "once",
    weight: g[2] ?? 0.85,
    blendIn: 0.25,
    blendOut: 0.35,
    mask: { from: "Spine" },
  };
  m.gestEnd = now + (g[1] ?? 2000);
}

// Navmesh walking: checks line of sight between points
function clearLine(ctx, me, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
  if (d < 0.3) return true;
  return !raycast(
    ctx,
    { x: a.x, y: (a.y ?? 0) + 0.5, z: a.z },
    { x: dx / d, y: 0, z: dz / d },
    { distance: d, radius: 0.3, ignoreEntities: [me.id], bodies: "static", physicsOnly: true }
  );
}

// Navmesh waypoint following with line-of-sight shortcutting and anti-stuck sidestep
function waypoint(ctx, me, m, goal) {
  const p = me.feetPosition, now = ctx.now(), N = (m.nav ??= {});
  const g = { x: goal.x, y: goal.y ?? p.y ?? 0, z: goal.z };

  // Repath when goal shifts or path has expired
  const goalShifted = N.goal ? (g.x - N.goal.x) ** 2 + (g.z - N.goal.z) ** 2 > 1 : true;
  if (!N.path || now > (N.repath ?? 0) || goalShifted) {
    const r = findPath(ctx, { x: p.x, y: p.y ?? 0, z: p.z }, g, { radius: 0.3 });
    N.path = r?.points?.length ? r.points : null;
    N.i = 0;
    N.goal = g;
    N.seeAt = 0;
    N.repath = now + (r?.partial ? 250 : 1500);
  }

  let to = g;
  if (N.path) {
    // Advance index past reached points
    while (N.i < N.path.length - 1 && (N.path[N.i].x - p.x) ** 2 + (N.path[N.i].z - p.z) ** 2 < 0.36) {
      N.i++;
    }
    // String-pulling: skip ahead if direct line-of-sight is unobstructed
    if (now > N.seeAt) {
      N.seeAt = now + 300;
      for (let k = Math.min(N.path.length - 1, N.i + 4); k > N.i; k--) {
        if (clearLine(ctx, me, p, N.path[k])) {
          N.i = k;
          break;
        }
      }
    }
    to = N.path[N.i] ?? g;
  }

  // Stuck detection: if we haven't moved much in 1.2s despite having distant goal
  N.stuckCheck ??= { x: p.x, z: p.z, at: now };
  if (now - N.stuckCheck.at > 1200) {
    const movedSq = (p.x - N.stuckCheck.x) ** 2 + (p.z - N.stuckCheck.z) ** 2;
    const toDistSq = (to.x - p.x) ** 2 + (to.z - p.z) ** 2;
    if (movedSq < 0.09 && toDistSq > 0.64) {
      N.side = { s: ctx.random() < 0.5 ? -1 : 1, until: now + 600 };
      N.repath = 0;
    }
    N.stuckCheck = { x: p.x, z: p.z, at: now };
  }

  let dx = to.x - p.x, dz = to.z - p.z;
  const d = Math.hypot(dx, dz) || 1;
  dx /= d;
  dz /= d;

  // Apply sidestep impulse when stuck
  if (N.side && now < N.side.until) {
    const s = N.side.s, ox = dx;
    dx = dx * 0.4 - dz * s * 0.9;
    dz = dz * 0.4 + ox * s * 0.9;
  }

  return { ux: dx, uz: dz };
}

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by);
    if (!who?.state) return;
    const now = ctx.now(), uid = who.userId ?? by, cool = (s.cool ??= {}), me = ctx.self;
    const pos = me.worldFeetPosition ?? me.feetPosition;
    const tell = (text, color = "#ffe9a8") =>
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 2.0, z: pos.z }, text, color, size: 0.9 }, { audience: { player: who.id } });

    if (now - (cool[uid] ?? -1e9) < 25000) {
      tell("(they point at the machines. you have already eaten.)", "#c8d0e0");
      return;
    }
    cool[uid] = now;
    const list = (s.gives ?? "pizza,burger,doritos,coolranch,coke,pepsi,dew,almond").split(",");
    const tok = list[Math.floor(ctx.random() * list.length)];
    (me.session.m ??= {}).react = now + 2400;

    // Play smooth plate serving presentation animation
    playGesture(me, me.session.m, now, [SERVE_PLATE, 2000, 0.95]);

    heard(ctx, { clip: G("paper-plate-slid-across-counter"), position: { x: pos.x, y: pos.y + 1, z: pos.z }, volume: 0.7, maxDistance: 12 });
    who.state.payout = { xp: 2, items: [tok] };
    tell("+" + tok.toUpperCase(), "#9fffb0");
  },
};

export function update(ctx, dt) {
  const me = ctx.self, s = me.state, now = ctx.now();
  const m = (me.session.m ??= { i: 0, next: now + 2000 + ctx.random() * 4000 });
  const p = me.feetPosition, v = me.velocity ?? { x: 0, z: 0 };

  if (m.gestEnd && now > m.gestEnd) {
    me.anim.gest = null;
    m.gestEnd = 0;
  }

  // Somebody took a plate: turn to them, finish serving gesture
  if (m.react && now < m.react) {
    let near = null, minDistSq = Infinity;
    for (const q of ctx.place.players) {
      const qp = q.feetPosition;
      if (!qp) continue;
      const d2 = (qp.x - p.x) ** 2 + (qp.z - p.z) ** 2;
      if (d2 < minDistSq) {
        minDistSq = d2;
        near = qp;
      }
    }
    if (near) {
      me.rotation = { yaw: turn(me.rotation?.yaw ?? 0, yawOf(near.x - p.x, near.z - p.z), 0.2) };
    }
    applyRest(me, dt);
    return;
  }

  // An order came into the food court register: kitchen staff moves
  if (s.orderAt && s.orderAt > (m.seenOrder ?? 0)) {
    m.seenOrder = s.orderAt;
    playGesture(me, m, now, ACT.serve);
    m.next = now + 6000;
  }

  // Waiting on tray delivery: walk the tray over to customer
  if (s.deliver) {
    const D = s.deliver, who = ctx.getObject(D.who), tray = ctx.getObject(D.tray);
    if (!who || !tray || now > D.until) {
      s.deliver = null;
    } else {
      const dx = who.feetPosition.x - p.x, dz = who.feetPosition.z - p.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < 1.96) { // reached patron (< 1.4m)
        s.deliver = null;
        me.anim.gest = null;
        playGesture(me, m, now, ACT.serve);
        applyRest(me, dt);
        me.rotation = { yaw: yawOf(dx, dz) };
        ctx.destroy(D.tray);
        who.state.l61Tray = now;
        who.state.payout = { xp: 2, items: D.items };
        ctx.emit(
          "damageNumber",
          { position: { x: p.x, y: p.y + 2.1, z: p.z }, text: `ORDER #${D.n} SERVED!`, color: "#9fffb0", size: 0.95 },
          { audience: { player: who.id } }
        );
        heard(ctx, { clip: G("paper-plate-slid-across-counter"), position: { x: p.x, y: p.y + 1, z: p.z }, volume: 0.7, maxDistance: 12 });
        return;
      }
      const { ux, uz } = waypoint(ctx, me, m, who.feetPosition);
      const sp = 1.7 * (distSq < 3.24 ? 0.5 : 1);
      me.velocity = {
        x: easeVal(v.x ?? 0, ux * sp, dt),
        y: (v.y ?? 0) - 20 * dt,
        z: easeVal(v.z ?? 0, uz * sp, dt),
      };
      me.rotation = { yaw: turn(me.rotation?.yaw ?? 0, yawOf(ux, uz), 0.25) };
      return;
    }
  }

  // Greeting nearby players when at counter post
  if (s.job === "post" && s.greet && now > (m.greetAt ?? 0)) {
    const q = ctx.place.players.find((o) => {
      const op = o.feetPosition;
      return op && (op.x - p.x) ** 2 + (op.z - p.z) ** 2 < 25;
    });
    if (q) {
      m.greetAt = now + 60000;
      if (!m.gestEnd) playGesture(me, m, now, GESTS[4]);
      ctx.emit(
        "damageNumber",
        { position: { x: p.x, y: p.y + 2.1, z: p.z }, text: s.greet, color: "#ffe9a8", size: 0.85 },
        { audience: { player: q.id } }
      );
    }
  }

  // Counter staff or seated patrons: face assigned direction and perform diner gestures
  if (s.job === "post") {
    applyRest(me, dt);
    me.rotation = { yaw: turn(me.rotation?.yaw ?? 0, s.faceYaw ?? 0, 0.1) };
    if (now > m.next && !m.gestEnd) {
      m.next = now + 3500 + ctx.random() * 5500;
      const actKey = s.acts?.length ? s.acts[Math.floor(ctx.random() * s.acts.length)] : null;
      playGesture(me, m, now, actKey && ACT[actKey] ? ACT[actKey] : GESTS[Math.floor(ctx.random() * GESTS.length)]);
    }
    return;
  }

  // A walking route: carry tray between waypoints, dwell wiping or grooving at tables
  const R = s.route ?? [];
  if (!R.length) {
    applyRest(me, dt);
    return;
  }
  const w = R[m.i % R.length], dx = w.x - p.x, dz = w.z - p.z;
  const distSq = dx * dx + dz * dz;

  if (distSq < 0.25) { // within 0.5m of waypoint
    applyRest(me, dt);
    if (!m.arrived) {
      m.arrived = now;
      if (w.act && ACT[w.act]) playGesture(me, m, now, ACT[w.act]);
      else if (ctx.random() < 0.5) playGesture(me, m, now, GESTS[Math.floor(ctx.random() * GESTS.length)]);
    }
    if (now - m.arrived > (w.dwell ?? 2) * 1000) {
      m.i++;
      m.arrived = 0;
      m.nav = null;
    }
    return;
  }

  m.arrived = 0;
  // If moving between waypoints on a tray route, keep tray held steady
  if (s.hasTray && !m.gestEnd) {
    playGesture(me, m, now, ACT.tray);
  }

  // Other bodies: step round them (facelings, patrons, NPCs)
  if (now > (m.sepAt ?? 0)) {
    m.sepAt = now + 300;
    let sx = 0, sz = 0;
    for (const o of ctx.query({ anyTags: ["l61npc", "npc", "faceling"], center: p, radius: 1.1 })) {
      if (o.id === me.id) continue;
      const ox = p.x - o.feetPosition.x, oz = p.z - o.feetPosition.z;
      const od = Math.hypot(ox, oz) || 0.01;
      sx += (ox / od) * (1.1 - od);
      sz += (oz / od) * (1.1 - od);
    }
    m.sep = { x: sx, z: sz };
  }

  const way = waypoint(ctx, me, m, w);
  let ux = way.ux + (m.sep?.x ?? 0) * 1.4, uz = way.uz + (m.sep?.z ?? 0) * 1.4;
  const ul = Math.hypot(ux, uz) || 1;
  ux /= ul;
  uz /= ul;

  const sp = (s.pace ?? 1.25) * (distSq < 1.44 ? Math.max(0.4, Math.sqrt(distSq) / 1.2) : 1);
  me.velocity = {
    x: easeVal(v.x ?? 0, ux * sp, dt),
    y: (v.y ?? 0) - 20 * dt,
    z: easeVal(v.z ?? 0, uz * sp, dt),
  };
  me.rotation = { yaw: turn(me.rotation?.yaw ?? 0, yawOf(ux, uz), 0.2) };
}
