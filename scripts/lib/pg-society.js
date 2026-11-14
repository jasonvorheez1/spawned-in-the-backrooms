// Level 26 Partygoer society (Shelly's S.S. Fun brief, Nov 14): roles with posts and jobs, sight-bound telepathy,
// and a deck alert that lingers: unaware → suspicious → alerted → searching → recovery, with lockdown after repeat alerts.
// Read by scripts/partygoers.js once per Partygoer per tick; the pack manager is its only writer.
import { clearSight } from "./sight.js";
import SOC from "./data/pg-society.yml";
const T = SOC.tune;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const eye = (p) => ({ x: p.x, y: p.y + 1.3, z: p.z });
export const deckOf = (pos) => (pos.y < -40 ? "low" : "up");
export function yawOf(r) {
  if (typeof r === "number") return r;
  if (!r) return 0;
  if (typeof r.yaw === "number") return r.yaw;
  if (typeof r.w === "number") return Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.x * r.x + r.y * r.y)) * 180 / Math.PI;
  return 0;
}
export function roleOf(p) {
  return SOC.roles[p.id] ?? { role: "hunter", deck: deckOf(p.feetPosition), route: [[p.state.home?.x ?? p.feetPosition.x, p.state.home?.z ?? p.feetPosition.z, 0, "prowl"]] };
}
// ── the deck's memory: place.state.pgAlert[deck], written on change only ──
export function deck(ctx, d) { return (ctx.place.state.pgAlert ?? {})[d] ?? { level: "unaware", since: 0 }; }
function setDeck(ctx, d, patch) {
  const all = { ...(ctx.place.state.pgAlert ?? {}) };
  all[d] = { ...(all[d] ?? { level: "unaware", since: 0 }), ...patch };
  ctx.place.state.pgAlert = all;
}
export const lockedDown = (ctx, d, now) => now < (deck(ctx, d).lockUntil ?? 0);
const mem = (ctx, id) => ((ctx.self.session.pgm ??= {})[id] ??= { stop: 0, until: 0 });

// ── perception: a 120° cone ahead, a short ring all round, a crouched body half as far, never through walls ──
function sees(ctx, p, pl, hunting) {
  if (Math.abs(p.feetPosition.y - pl.feetPosition.y) > 6) return false;
  const low = pl.state?.crouch || pl.state?.crawl ? T.crouchMul : 1;
  const d = flat(p.feetPosition, pl.feetPosition), range = (hunting ? T.huntSight : T.sight) * low;
  if (d > range) return false;
  if (!hunting && d > T.near * low) {
    const y = yawOf(p.rotation) * Math.PI / 180, fx = -Math.sin(y), fz = -Math.cos(y);
    if ((fx * (pl.feetPosition.x - p.feetPosition.x) + fz * (pl.feetPosition.z - p.feetPosition.z)) / (d || 1) < 0.5) return false;
  }
  return clearSight(ctx, eye(p.feetPosition), eye(pl.feetPosition), [p.id, pl.id]);
}
// ── telepathy (lore: short range, line of sight): the call passes Partygoer to Partygoer, only where one can see the next ──
export function relay(ctx, src, pack, info, now) {
  const reached = new Set([src.id]), q = [src];
  while (q.length) {
    const a = q.shift();
    for (const o of pack) {
      if (reached.has(o.id) || o.state.dying || (o.state.hp ?? 1) <= 0) continue;
      if (flat(a.feetPosition, o.feetPosition) > T.relay || Math.abs(a.feetPosition.y - o.feetPosition.y) > 6) continue;
      if (!clearSight(ctx, eye(a.feetPosition), eye(o.feetPosition), [a.id, o.id])) continue;
      reached.add(o.id); q.push(o);
      const m = mem(ctx, o.id); m.know = { ...info.pos }; m.knowAt = now; m.heard = src.id;
      if (info.prey) { if (!o.state.hunting) o.state.hunting = true; if (o.state.prey !== info.prey) o.state.prey = info.prey; m.lastSeen = now; }
    }
  }
  return reached;
}
// something odd happened here: the deck turns suspicious and the two nearest workers (never guards) walk over to look
export function suspect(ctx, pack, pos, now, why) {
  const d = deckOf(pos), D = deck(ctx, d);
  if (D.level === "alerted" || D.level === "searching") return;
  setDeck(ctx, d, { level: "suspicious", since: now, last: { x: pos.x, y: pos.y, z: pos.z, at: now }, why });
  const near = pack.filter((o) => !o.state.dying && !o.state.hunting && roleOf(o).deck === d && roleOf(o).role !== "guard")
    .sort((a, b) => flat(a.feetPosition, pos) - flat(b.feetPosition, pos)).slice(0, 2);
  for (const o of near) { const m = mem(ctx, o.id); m.look = { x: pos.x + (ctx.random() - 0.5) * 2, y: pos.y, z: pos.z + (ctx.random() - 0.5) * 2 }; m.lookUntil = 0; }
}
function alert(ctx, d, pos, now) {
  const D = deck(ctx, d), fresh = D.level !== "alerted";
  const last = D.last;
  if (!fresh && last && now - last.at < 1000 && flat(last, pos) < 2) return false;
  const patch = { level: "alerted", last: { x: pos.x, y: pos.y, z: pos.z, at: now } };
  if (fresh) {
    patch.since = now;
    const alerts = [...(D.alerts ?? []).filter((t) => now - t < 600000), now];
    patch.alerts = alerts;
    if (alerts.length >= T.lockdownAfter && !(now < (D.lockUntil ?? 0))) patch.lockUntil = now + T.lockdownMs, patch.lockAt = now;
  }
  setDeck(ctx, d, patch);
  return fresh;
}
// once a tick, per deck: sight lost turns the chase into a search, a search runs dry into recovery, recovery settles
export function deckTick(ctx, pack, now) {
  for (const d of ["up", "low"]) {
    const D = deck(ctx, d);
    if (D.level === "alerted") {
      const seen = pack.some((o) => roleOf(o).deck === d && now - (mem(ctx, o.id).lastSeen ?? -1e9) < T.lostMs);
      if (!seen) setDeck(ctx, d, { level: "searching", since: now });
    } else if (D.level === "searching" && now - D.since > T.searchMs) setDeck(ctx, d, { level: "recovery", since: now });
    else if (D.level === "suspicious" && now - D.since > T.suspiciousMs) setDeck(ctx, d, { level: "recovery", since: now });
    else if (D.level === "recovery" && now - D.since > T.recoverMs) setDeck(ctx, d, { level: "unaware", since: now });
  }
  // the technician holds the lower lift shut through a lockdown, while it lives
  const tech = pack.find((o) => roleOf(o).role === "technician" && !o.state.dying && (o.state.hp ?? 1) > 0);
  const lock = !!tech && lockedDown(ctx, "low", now);
  if (!!ctx.place.state.pgLiftLocked !== lock) ctx.place.state.pgLiftLocked = lock;
}

const TASK = { guard: null, decorate: "cdn/clip-pickup.glb", trap: "cdn/clip-crouch-idle-loop.glb", panel: "cdn/clip-talk-loop.glb", haul: "cdn/clip-pickup.glb", brief: "cdn/clip-talk-loop.glb", prowl: null,
  party: ["cdn/clip-chicken-dance-loop.glb", "cdn/clip-clap-loop.glb", "cdn/clip-laugh-loop.glb", "cdn/clip-step-hip-hop-dance-loop.glb", "cdn/clip-cheer-loop.glb"] };
const LOOPS = { trap: 1, panel: 1, brief: 1, party: 1 };
const PACE = { scout: 1.7, hunter: 1.7, handler: 1.3 };

// One Partygoer's decision: who it sees, where it goes, what its hands do.
// returns { prey, best, target, speed, loop, once, faceYaw, spotted, task, stopKey }
export function think(ctx, p, pack, players, now) {
  const s = p.state, m = mem(ctx, p.id), R = roleOf(p), y = SOC.decks[R.deck] ?? p.feetPosition.y;
  const D = deck(ctx, R.deck), lock = lockedDown(ctx, R.deck, now);
  let prey = null, best = Infinity, spotted = false;
  for (const pl of players) {
    if ((pl.state.hp ?? 1) <= 0) continue;
    if (!sees(ctx, p, pl, !!s.hunting)) continue;
    const d = flat(pl.feetPosition, p.feetPosition); if (d < best) { best = d; prey = pl; }
  }
  if (prey) {
    m.lastSeen = now; m.know = { ...prey.feetPosition }; m.knowAt = now; m.look = null;
    if (s.prey !== prey.id) s.prey = prey.id;
    if (!s.hunting) { s.hunting = true; spotted = true; relay(ctx, p, pack, { pos: prey.feetPosition, prey: prey.id }, now); }
    else if (now - (m.relayAt ?? 0) > 4000) { m.relayAt = now; relay(ctx, p, pack, { pos: prey.feetPosition, prey: prey.id }, now); }
    alert(ctx, R.deck, prey.feetPosition, now);
    return { prey, best, target: prey.feetPosition, speed: null, spotted };
  }
  // the chase without eyes: run to where it was last known, then search around it, sharing what it knows by sight
  if (s.hunting && m.know) {
    const age = now - (m.knowAt ?? 0);
    if (age > T.searchMs) { s.hunting = false; if (s.prey) s.prey = null; m.know = null; m.search = null; }
    else {
      if (now - (m.relayAt ?? 0) > 4000) { m.relayAt = now; relay(ctx, p, pack, { pos: m.know }, now); }
      if (now - (m.lastSeen ?? -1e9) > 8000 && s.prey) s.prey = null; // the [DANGER] tag drops once they've truly lost you
      if (!m.search || flat(p.feetPosition, m.search) < 0.8) {
        m.search = flat(p.feetPosition, m.know) > 1.5 && !m.reachedKnow ? { ...m.know }
          : { x: m.know.x + (ctx.random() - 0.5) * 12, y: m.know.y, z: m.know.z + (ctx.random() - 0.5) * 12 };
        if (flat(p.feetPosition, m.know) <= 1.5) m.reachedKnow = true;
      }
      return { prey: null, best: Infinity, target: m.search, speed: age < T.lostMs ? 3.4 : 2.2, loop: null };
    }
  } else if (s.hunting) { s.hunting = false; if (s.prey) s.prey = null; }
  m.reachedKnow = false;
  // something odd: walk over, look at it, go back to work
  if (m.look) {
    if (flat(p.feetPosition, m.look) > 0.9) return { prey: null, best: Infinity, target: m.look, speed: 1.8, loop: null };
    if (!m.lookUntil) { m.lookUntil = now + 4000; return { prey: null, best: Infinity, target: p.feetPosition, speed: 0, once: "cdn/clip-shrug.glb", loop: null }; }
    if (now < m.lookUntil) return { prey: null, best: Infinity, target: p.feetPosition, speed: 0, loop: null, faceYaw: ((now / 1500) % 2 < 1 ? 60 : -60) + yawOf(p.rotation) * 0 };
    m.look = null; m.lookUntil = 0;
  }
  // work: walk the route, do the job at each stop. Lockdown pins guards, technician, organizers to their first post.
  const pinned = (lock || D.level === "alerted" || D.level === "searching") && ["guard", "technician", "organizer", "decorator", "senior"].includes(R.role);
  const idx = pinned ? 0 : m.stop % R.route.length, stop = R.route[idx];
  const pos = { x: stop[0], y, z: stop[1] }, task = stop[3] ?? "prowl";
  if (flat(p.feetPosition, pos) > 0.6) { m.until = 0; return { prey: null, best: Infinity, target: pos, speed: (PACE[R.role] ?? 1.4) * (lock ? 1.5 : 1), loop: null }; }
  let once = null;
  if (!m.until) { m.until = now + T.stopMs[0] + ctx.random() * (T.stopMs[1] - T.stopMs[0]); if (!LOOPS[task]) once = TASK[task]; }
  if (now > m.until && !pinned) { m.stop++; m.until = 0; }
  let loop = null;
  if (LOOPS[task]) loop = task === "party" ? (lock || D.level !== "unaware" ? null : TASK.party[(p.id.length + Math.floor(now / 9000)) % TASK.party.length]) : TASK[task];
  return { prey: null, best: Infinity, target: pos, speed: 0, loop, once, faceYaw: stop[2] ?? null, task, stopKey: `${p.id}:${idx}`, atStop: pos };
}
