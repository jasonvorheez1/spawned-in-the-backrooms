// Level 6.1 "The Snackrooms": its natural entities, the Facelings (Entity 9), and the Snackrooms staff who work beside them.
// The wiki: friendly, they cook, clean and serve and give food without payment.
// Custom Level 6.1 animations: counter wiping, plate serving, burger flipping, tray carrying, 80s jukebox grooving, coffee sipping, and diner lounging.
// state.job: "post" (counter staff / seated patrons) | "route" (clearing tables, carrying trays, restocking), state.route = [{ x, z, dwell, act }].

import { heard } from "./lib/hear.js";
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
const turn = (cur, want, k) => { let d = ((want - cur + 540) % 360) - 180; return cur + d * k; };

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by); if (!who?.state) return;
    const now = ctx.now(), uid = who.userId ?? by, cool = (s.cool ??= {}), me = ctx.self, pos = me.worldFeetPosition ?? me.feetPosition;
    const tell = (text, color = "#ffe9a8") => ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 2.0, z: pos.z }, text, color, size: 0.9 }, { audience: { player: who.id } });
    if (now - (cool[uid] ?? -1e9) < 25000) { tell("(they point at the machines. you have already eaten.)", "#c8d0e0"); return; }
    cool[uid] = now;
    const list = (s.gives ?? "pizza,burger,doritos,coolranch,coke,pepsi,dew,almond").split(","), tok = list[Math.floor(ctx.random() * list.length)];
    (me.session.m ??= {}).react = now + 2400;

    // Play smooth plate serving presentation animation
    me.anim.gest = {
      clip: SERVE_PLATE,
      loop: "once",
      weight: 0.95,
      blendIn: 0.2,
      blendOut: 0.35,
      mask: { from: "Spine" },
    };
    (me.session.m ??= {}).gestEnd = now + 2000;

    heard(ctx, { clip: G("paper-plate-slid-across-counter"), position: { x: pos.x, y: pos.y + 1, z: pos.z }, volume: 0.7, maxDistance: 12 });
    who.state.payout = { xp: 2, items: [tok] };
    tell("+" + tok.toUpperCase(), "#9fffb0");
  },
};

export function update(ctx, dt) {
  const me = ctx.self, s = me.state, now = ctx.now(), m = (me.session.m ??= { i: 0, next: now + 2000 + ctx.random() * 4000 });
  const p = me.feetPosition, v = me.velocity ?? { x: 0, z: 0 };
  const rest = () => { me.velocity = { x: (v.x ?? 0) * 0.6, y: (v.y ?? 0) - 20 * dt, z: (v.z ?? 0) * 0.6 }; };

  const gesture = (g) => {
    if (!g) return;
    const clip = g[0];
    const isLoop = typeof clip === "string" ? /loop/.test(clip) : false;
    me.anim.gest = {
      clip,
      loop: isLoop ? "loop" : "once",
      weight: g[2] ?? 0.85,
      blendIn: 0.25,
      blendOut: 0.35,
      mask: { from: "Spine" },
    };
    m.gestEnd = now + (g[1] ?? 2000);
  };

  if (m.gestEnd && now > m.gestEnd) { me.anim.gest = null; m.gestEnd = 0; }

  // Somebody took a plate: turn to them, finish serving gesture
  if (m.react && now < m.react) {
    const near = ctx.place.players.map((q) => q.feetPosition).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (near) me.rotation = { yaw: turn(me.rotation?.yaw ?? 0, yawOf(near.x - p.x, near.z - p.z), 0.2) };
    rest();
    return;
  }
  if (s.orderAt && s.orderAt > (m.seenOrder ?? 0)) { m.seenOrder = s.orderAt; gesture(ACT.serve); m.next = now + 6000; } // an order just came in: the kitchen moves
  if (s.deliver) { // waiting on you: walk the tray over, hand it across, go back to the round
    const D = s.deliver, who = ctx.getObject(D.who), tray = ctx.getObject(D.tray);
    if (!who || !tray || now > D.until) { s.deliver = null; }
    else {
      const dx = who.feetPosition.x - p.x, dz = who.feetPosition.z - p.z, d = Math.hypot(dx, dz);
      if (d < 1.4) {
        s.deliver = null; me.anim.gest = null; gesture(ACT.serve); rest(); me.rotation = { yaw: yawOf(dx, dz) };
        ctx.destroy(D.tray); who.state.l61Tray = now;
        who.state.payout = { xp: 2, items: D.items };
        ctx.emit("damageNumber", { position: { x: p.x, y: p.y + 2.1, z: p.z }, text: `ORDER #${D.n} SERVED!`, color: "#9fffb0", size: 0.95 }, { audience: { player: who.id } });
        heard(ctx, { clip: G("paper-plate-slid-across-counter"), position: { x: p.x, y: p.y + 1, z: p.z }, volume: 0.7, maxDistance: 12 });
        return;
      }
      const sp = 1.7 * (d < 1.8 ? 0.5 : 1), ux = dx / d, uz = dz / d, ease = (c, t) => c + (t - c) * Math.min(1, 7 * dt);
      me.velocity = { x: ease(v.x ?? 0, ux * sp), y: (v.y ?? 0) - 20 * dt, z: ease(v.z ?? 0, uz * sp) }; me.rotation = { yaw: turn(me.rotation?.yaw ?? 0, yawOf(ux, uz), 0.25) };
      return;
    }
  }
  if (s.job === "post" && s.greet && now > (m.greetAt ?? 0)) { // somebody walks up to the counter: a wave and a welcome
    const q = ctx.place.players.find((o) => Math.hypot(o.feetPosition.x - p.x, o.feetPosition.z - p.z) < 5);
    if (q) { m.greetAt = now + 60000; if (!m.gestEnd) gesture(GESTS[4]); ctx.emit("damageNumber", { position: { x: p.x, y: p.y + 2.1, z: p.z }, text: s.greet, color: "#ffe9a8", size: 0.85 }, { audience: { player: q.id } }); }
  }

  // Counter staff or seated patrons: face assigned direction and perform diner gestures (wiping, serving, grooving, sipping)
  if (s.job === "post") {
    rest();
    me.rotation = { yaw: turn(me.rotation?.yaw ?? 0, s.faceYaw ?? 0, 0.1) };
    if (now > m.next && !m.gestEnd) {
      m.next = now + 3500 + ctx.random() * 5500;
      const actKey = s.acts?.length ? s.acts[Math.floor(ctx.random() * s.acts.length)] : null;
      gesture(actKey && ACT[actKey] ? ACT[actKey] : GESTS[Math.floor(ctx.random() * GESTS.length)]);
    }
    return;
  }

  // A walking route: carry tray between waypoints, dwell wiping or grooving at tables
  const R = s.route ?? [];
  if (!R.length) { rest(); return; }
  const w = R[m.i % R.length], dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz);

  if (d < 0.5) {
    rest();
    if (!m.arrived) {
      m.arrived = now;
      if (w.act && ACT[w.act]) gesture(ACT[w.act]);
      else if (ctx.random() < 0.5) gesture(GESTS[Math.floor(ctx.random() * GESTS.length)]);
    }
    if (now - m.arrived > (w.dwell ?? 2) * 1000) { m.i++; m.arrived = 0; }
    return;
  }

  m.arrived = 0;
  // If moving between waypoints on a tray route, keep tray held steady
  if (s.hasTray && !m.gestEnd) {
    gesture(ACT.tray);
  }

  // Other bodies: step round them
  if (now > (m.sepAt ?? 0)) {
    m.sepAt = now + 300;
    let sx = 0, sz = 0;
    for (const o of ctx.query({ tags: ["npc"], center: p, radius: 1.1 })) {
      if (o.id === me.id) continue;
      const ox = p.x - o.feetPosition.x, oz = p.z - o.feetPosition.z, od = Math.hypot(ox, oz) || 0.01;
      sx += (ox / od) * (1.1 - od);
      sz += (oz / od) * (1.1 - od);
    }
    m.sep = { x: sx, z: sz };
  }

  let ux = dx / d + (m.sep?.x ?? 0) * 1.4, uz = dz / d + (m.sep?.z ?? 0) * 1.4;
  const ul = Math.hypot(ux, uz) || 1;
  ux /= ul;
  uz /= ul;

  const sp = (s.pace ?? 1.25) * (d < 1.2 ? Math.max(0.4, d / 1.2) : 1), ease = (c, t) => c + (t - c) * Math.min(1, 7 * dt);
  me.velocity = { x: ease(v.x ?? 0, ux * sp), y: (v.y ?? 0) - 20 * dt, z: ease(v.z ?? 0, uz * sp) };
  me.rotation = { yaw: turn(me.rotation?.yaw ?? 0, yawOf(ux, uz), 0.2) };
}
