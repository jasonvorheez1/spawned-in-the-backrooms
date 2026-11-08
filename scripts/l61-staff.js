// Level 6.1 "The Snackrooms": its natural entities, the Facelings (Entity 9), and the Snackrooms staff who work beside them.
// The wiki: friendly, they cook, clean and serve and give food without payment.
// Custom Level 6.1 animations: counter wiping, plate serving, burger flipping, tray carrying, 80s jukebox grooving, coffee sipping, and diner lounging.
// state.job: "post" (counter staff / seated patrons) | "route" (clearing tables, carrying trays, restocking), state.route = [{ x, z, dwell, act }].

import { heard } from "./lib/hear.js";
import { findPath } from "builtin/nav";
import { raycast } from "builtin/physics";
import FC from "./lib/data/faceling.yml";
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
import { handTray } from "./lib/snacktray.js";

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

    if (me.tags?.includes("l61fc")) {
      if (s.dead) return;
      if (s.hostile || s.mood === "angry" || s.mood === "defend") { tell("(it stares at you. no plate.)", "#ff9a7a"); return; }
      s.met = { ...(s.met ?? {}), [uid]: (s.met?.[uid] ?? 0) + 1 };
      const n = nickFor(s, who);
      if (n) tell(pickOf(ctx, FC.greetNick).replace("{n}", n));
    }
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

// ---- the Facelings' own minds (Entity 9, "The 11 Effect"): mimicry, waving, names they learn, temper, closing ranks. Numbers: scripts/lib/data/faceling.yml
const pickOf = (ctx, a) => a[Math.floor(ctx.random() * a.length)];
const hashPick = (key, a) => { let h = 7; for (const c of String(key)) h = (h * 31 + c.charCodeAt(0)) | 0; return a[Math.abs(h) % a.length]; };
const uidOf = (q) => q.userId ?? q.id;
const CROUCH = "cdn/clip-crouch-idle-loop.glb", WAVE = "cdn/clip-wave-loop.glb";
function say(ctx, me, text, color, to) {
  const p = me.feetPosition;
  ctx.emit("damageNumber", { position: { x: p.x, y: p.y + 2.2, z: p.z }, text, color, size: 0.9 }, to ? { audience: { player: to } } : undefined);
}
export function nickFor(s, q) {
  const uid = uidOf(q);
  if (s.nick?.[uid]) return s.nick[uid];
  if ((s.met?.[uid] ?? 0) < FC.nickAfter) return null;
  const sp = q.state?.look?.species, n = hashPick(uid + (s.name ?? ""), FC.nicks[sp] ?? FC.nicks.any);
  s.nick = { ...(s.nick ?? {}), [uid]: n };
  return n;
}
function goHostile(ctx, me, s, whoId, now, line) {
  s.hostile = whoId; s.mood = "hostile"; s.hostileAt = now; me.anim.gest = null;
  if (line) say(ctx, me, line, "#ff5a4a");
}
// a player disturbed this one: the first time it stops, stares and warns; the second time it turns hostile. An attack calls the others within reach.defend
function disturb(ctx, me, s, m, who, now, attacked) {
  if (!who || s.dead) return;
  const uid = uidOf(who), t = { ...(s.temper ?? {}) };
  t[uid] = (t[uid] ?? 0) + 1; s.temper = t; s.calmAt = now + FC.temper.calm * 1000;
  if (t[uid] >= 2 || s.hostile === who.id) goHostile(ctx, me, s, who.id, now, s.hostile ? null : pickOf(ctx, FC.hostile));
  else { s.mood = "angry"; s.stareAt = who.id; m.stareEnd = now + FC.temper.stare * 1000; me.anim.gest = null; m.gestEnd = 0; say(ctx, me, pickOf(ctx, FC.warn), "#ffb35a"); }
  if (!attacked) return;
  for (const o of ctx.query({ tags: ["l61fc"], center: me.feetPosition, radius: FC.reach.defend })) {
    if (o.id === me.id || o.state?.dead || o.state?.hostile) continue;
    const h = ctx.getObject(o.id); if (!h) continue;
    if (s.hostile) goHostile(ctx, h, h.state, who.id, now, pickOf(ctx, FC.defend));
    else { h.state.mood = "defend"; h.state.defends = me.id; h.state.stareAt = who.id; h.state.hostileAt = now; }
  }
}
function stepTo(ctx, me, m, goal, speed, dt) {
  const v = me.velocity ?? { x: 0, z: 0 }, w = waypoint(ctx, me, m, goal);
  me.velocity = { x: easeVal(v.x ?? 0, w.ux * speed, dt), y: (v.y ?? 0) - 20 * dt, z: easeVal(v.z ?? 0, w.uz * speed, dt) };
  me.rotation = { yaw: turn(me.rotation?.yaw ?? 0, yawOf(w.ux, w.uz), 0.25) };
}
const faceTo = (me, at, k = 0.25) => { const p = me.feetPosition; me.rotation = { yaw: turn(me.rotation?.yaw ?? 0, yawOf(at.x - p.x, at.z - p.z), k) }; };
// returns true when the mind holds the body this tick (dead, hostile, angry, defending, copying a crouch, turning to someone)
function social(ctx, me, s, m, now, dt) {
  const p = me.feetPosition;
  if (s.hp == null) s.hp = FC.hp;
  m.hp0 ??= s.hp;
  if (s.dead || s.hp <= 0) { // down: an hour later it stands up again (Shelly: killed NPCs return after an hour)
    if (!s.dead || !m.downed) {
      m.downed = true; s.dead = true; s.hostile = null; s.mood = null;
      me.anim.gest = { clip: "cdn/clip-die.glb", weight: 4, loop: "once", clampWhenFinished: true };
      ctx.after(3600, "revive", {});
    }
    applyRest(me, dt); return true;
  }
  if (s.hp < m.hp0) { // struck: by a swing, a shot or something thrown
    const by = Object.keys(s.fresh ?? {})[0];
    const who = (by && ctx.place.players.find((q) => q.id === by)) || ctx.place.players.reduce((a, q) => (!a || (q.feetPosition.x - p.x) ** 2 + (q.feetPosition.z - p.z) ** 2 < (a.feetPosition.x - p.x) ** 2 + (a.feetPosition.z - p.z) ** 2 ? q : a), null);
    m.hp0 = s.hp; s.fresh = null;
    disturb(ctx, me, s, m, who, now, true);
  }
  if (s.hostile) {
    const q = ctx.place.players.find((o) => o.id === s.hostile);
    if (!q || q.state?.dead || (q.state?.hp ?? 1) <= 0 || now - (s.hostileAt ?? 0) > FC.temper.forget * 1000) { // gone, dead, or long enough: grudges drop
      s.hostile = null; s.mood = null; s.defends = null; if (q && ((q.state?.hp ?? 1) <= 0 || q.state?.dead)) s.temper = {};
      me.anim.gest = null; return false;
    }
    const qp = q.feetPosition, d = Math.hypot(qp.x - p.x, qp.z - p.z);
    if (d > FC.temper.reach) { stepTo(ctx, me, m, qp, FC.temper.run, dt); return true; }
    applyRest(me, dt); faceTo(me, qp, 0.4);
    if (now > (m.swingAt ?? 0)) {
      m.swingAt = now + FC.temper.swing * 1000;
      playGesture(me, m, now, ["cdn/clip-attack.glb", 900, 4]);
      q.state.hp -= FC.temper.hit;
      ctx.emit("damageNumber", { position: { x: qp.x, y: qp.y + 1.6, z: qp.z }, value: FC.temper.hit, color: "#ff5a4a" });
      ctx.emit("cameraPunch", { direction: { x: (qp.x - p.x) / (d || 1), y: 0, z: (qp.z - p.z) / (d || 1) }, intensity: 0.35 }, { audience: { player: q.id } });
      heard(ctx, { clip: G("heavy-pipe-hit-flesh-thud"), position: { x: qp.x, y: qp.y + 1, z: qp.z }, volume: 0.6, maxDistance: 14 });
    }
    return true;
  }
  if (s.mood === "defend") { // a sibling was hit: drop the work, stand over the one who did it
    const q = ctx.place.players.find((o) => o.id === s.stareAt), friend = s.defends && ctx.getObject(s.defends);
    if (!q || now - (s.hostileAt ?? 0) > 20000) { s.mood = null; s.defends = null; s.stareAt = null; return false; }
    if (friend?.state?.hostile === q.id) { goHostile(ctx, me, s, q.id, now, pickOf(ctx, FC.defend)); return true; }
    const qp = q.feetPosition;
    if ((qp.x - p.x) ** 2 + (qp.z - p.z) ** 2 > 3.2) stepTo(ctx, me, m, qp, FC.temper.run * 0.8, dt);
    else { applyRest(me, dt); faceTo(me, qp); }
    return true;
  }
  if (s.mood === "angry") {
    const q = ctx.place.players.find((o) => o.id === s.stareAt);
    if (q && now < (m.stareEnd ?? 0)) { applyRest(me, dt); faceTo(me, q.feetPosition, 0.3); return true; }
    if (now > (s.calmAt ?? 0)) { s.mood = null; s.stareAt = null; s.temper = {}; } // a single bump is forgiven in time
    else if (now >= (m.stareEnd ?? 0) && m.stareEnd) { m.stareEnd = 0; } // back to work, still remembering
  }
  // the scan: a few times a second, only with a player in reach.notice
  if (now >= (m.socAt ?? 0)) {
    m.socAt = now + FC.every.social * 1000;
    let q = null, d2 = FC.reach.notice ** 2;
    for (const o of ctx.place.players) { const op = o.feetPosition; if (!op) continue; const e = (op.x - p.x) ** 2 + (op.z - p.z) ** 2; if (e < d2) { d2 = e; q = o; } }
    m.near = q ? q.id : null;
    if (q) {
      const qp = q.feetPosition, d = Math.sqrt(d2), uid = uidOf(q), L = m.lastQ;
      const speed = L && L.id === q.id ? Math.hypot(qp.x - L.x, qp.z - L.z) / Math.max(0.05, (now - L.at) / 1000) : 0;
      m.lastQ = { id: q.id, x: qp.x, z: qp.z, at: now };
      const working = !!(m.gestEnd || m.arrived || s.job === "post" || s.deliver);
      if (d < FC.reach.shove && speed > FC.shoveSpeed && working && now > (m.shoveAt ?? 0)) { // barged straight through it while it worked
        m.shoveAt = now + FC.every.shove * 1000;
        ctx.emit("squash", { target: me.id, axis: "y", intensity: 0.2, duration: 0.2 });
        disturb(ctx, me, s, m, q, now, false);
        return true;
      }
      if (d < FC.reach.mimic) { // mimicry: it copies what you just did, now and then
        const crouch = !!q.state?.crouch;
        if (crouch && !m.crouch && now > (m.mimicAt ?? 0) && ctx.random() < FC.mimicChance) {
          m.mimicAt = now + FC.every.mimic * 1000; m.crouch = now + FC.crouchHold * 1000;
          me.anim.gest = { clip: CROUCH, loop: "loop", weight: 4, blendIn: 0.3, blendOut: 0.3 }; m.gestEnd = m.crouch;
        }
        if (m.crouch && (!crouch || now > m.crouch)) { m.crouch = 0; me.anim.gest = null; m.gestEnd = 0; }
        const emo = (q.state?.face?.until ?? 0) + "|" + (q.anim?.gest?.clip ?? "");
        if (m.emoSeen !== undefined && emo !== m.emoSeen && now > (m.mimicAt ?? 0) && ctx.random() < FC.mimicChance) {
          m.mimicAt = now + FC.every.mimic * 1000; m.faceUntil = now + 2600; m.faceId = q.id;
          playGesture(me, m, now, [WAVE, 2600, 4]);
        }
        m.emoSeen = emo;
      } else if (m.crouch) { m.crouch = 0; me.anim.gest = null; m.gestEnd = 0; }
      const idle = !s.deliver && !m.crouch && !(m.faceUntil && now < m.faceUntil) && s.mood !== "angry"; // a chore gesture gives way to a wave
      if (d < FC.reach.wave && idle && now - ((m.waved ??= {})[uid] ?? -1e9) > FC.every.wave * 1000) { // waving at whoever passes
        m.waved[uid] = now; m.faceUntil = now + 3600; m.faceId = q.id;
        s.lastWave = { uid, at: now };
        playGesture(me, m, now, [WAVE, 3600, 4]);
        const n = nickFor(s, q);
        if (n) say(ctx, me, pickOf(ctx, FC.greetNick).replace("{n}", n), "#ffe9a8", q.id);
      }
    } else if (m.crouch) { m.crouch = 0; me.anim.gest = null; m.gestEnd = 0; }
  }
  if (m.crouch || (m.faceUntil && now < m.faceUntil)) {
    const q = ctx.place.players.find((o) => o.id === (m.faceId ?? m.near));
    applyRest(me, dt); if (q) faceTo(me, q.feetPosition, 0.2);
    return true;
  }
  return false;
}
export function revive(ctx) {
  const s = ctx.self.state, m = (ctx.self.session.m ??= {});
  s.dead = false; s.hp = FC.hp; s.mood = null; s.hostile = null; s.temper = {};
  m.hp0 = s.hp; m.downed = false; ctx.self.anim.gest = null;
}

export function update(ctx, dt) {
  if (!ctx.place.players.length) { ctx.sleep(2); return; }
  const me = ctx.self, s = me.state, now = ctx.now();
  const m = (me.session.m ??= { i: 0, next: now + 2000 + ctx.random() * 4000 });
  const p = me.feetPosition, v = me.velocity ?? { x: 0, z: 0 };

  // Tiered distance sleeping for staff when no active orders/deliveries
  if (!s.deliver && !s.orderAt && !(m.react && now < m.react) && !s.hostile && s.mood !== "defend") {
    let nearDistSq = Infinity;
    for (const q of ctx.place.players) {
      const qp = q.feetPosition;
      if (!qp) continue;
      const d2 = (qp.x - p.x) ** 2 + (qp.z - p.z) ** 2;
      if (d2 < nearDistSq) nearDistSq = d2;
    }
    if (nearDistSq > 45 * 45) { ctx.sleep(2); return; }
    if (nearDistSq > 28 * 28 && s.job === "post") { ctx.sleep(0.2); dt += 0.2; }
  }

  if (m.gestEnd && now > m.gestEnd) {
    me.anim.gest = null;
    m.gestEnd = 0;
  }
  if (me.tags?.includes("l61fc") && social(ctx, me, s, m, now, dt)) return;

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
        handTray(ctx, who, D.n); // the patron takes a real tray (scripts/lib/snacktray.js)
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
