// Level 9's Mangled: one manager steps every one of them. They exist only while the fog sits (place.state.l9fog.on, written by
// places/level9/sim.js): they arrive on the streets out of sight, stand dead still while anyone has them on screen, close when
// nobody looks, and never go indoors: a wanderer in a house gets one standing outside the nearest wall, facing them.
import { clearSight } from "./lib/sight.js";
import { knocked } from "./lib/knock.js";
import { heard } from "./lib/hear.js";
import { dmgAfterArmor } from "./lib/stats.js";
import { layout, zoneAt, HOUSES } from "./lib/level9.js";
import T from "./lib/data/l9-mangled.yml";
const DEG = 57.2958, C = T.clips, S = T.sounds;
const MIST = `fx
pop mist burst=22 life=1.2..2 on=box(.5,1.2,.5).c(1.2) v=sdir()*(.2..0.7)+up(.2) size=.5..0.9 acc=drag(1.2) col=<.2,.21,.24> a=0>.3:.5>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)`;
let LAY = null;
const town = (seed) => (LAY && LAY.seed === seed ? LAY : (LAY = layout(seed)));
const anim = (h, m, clip, loop = true, speed = 1) => { const k = clip + speed; if (m.clip === k) return; m.clip = k; h.anim.main = { clip, loop, speed, clampWhenFinished: !loop, weight: 1 }; };
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// a lot's own frame: u across the house, v toward its door; a = half width, b = half depth
const local = (l, p) => ({ u: (p.x - l.x) * -l.fz + (p.z - l.z) * l.fx, v: (p.x - l.x) * l.fx + (p.z - l.z) * l.fz });
const world = (l, u, v) => ({ x: l.x + u * -l.fz + v * l.fx, z: l.z + u * l.fx + v * l.fz });
const half = (l, pad) => ({ a: HOUSES[l.kind].w / 2 + pad, b: HOUSES[l.kind].d / 2 + pad });
const lotOf = (L, p) => { let best = null, bd = Infinity; for (const l of L.lots) { const d = Math.hypot(l.x - p.x, l.z - p.z); if (d < l.rad * 0.7 && d < bd) { bd = d; best = l; } } return best; };
// the rectangle's rim as one number: param() the rim point nearest (u, v), point() back
function rim(a, b) {
  const P = 4 * (a + b);
  return { P,
    param(u, v) { const du = a - Math.abs(u), dv = b - Math.abs(v); if (du < dv) return u > 0 ? Math.max(-b, Math.min(b, v)) + b : 2 * a + 2 * b + (b - Math.max(-b, Math.min(b, v))); return v > 0 ? 2 * b + (a - Math.max(-a, Math.min(a, u))) : 2 * a + 4 * b + Math.max(-a, Math.min(a, u)) + a; },
    point(t) { t = ((t % P) + P) % P; if (t < 2 * b) return [a, t - b]; t -= 2 * b; if (t < 2 * a) return [a - t, b]; t -= 2 * a; if (t < 2 * b) return [-a, b - t]; t -= 2 * b; return [t - a, -b]; } };
}
// the next step toward the wall of lot l nearest the player inside it, walking round the house, never through it
function windowStep(l, pos, prey) {
  const { a, b } = half(l, T.windowGap), R = rim(a, b), c = local(l, pos), g = local(l, prey);
  const tg = R.param(g.u, g.v), tc = R.param(c.u, c.v), [cu, cv] = R.point(tc);
  if (Math.hypot(c.u - cu, c.v - cv) > 1.2) return { ...world(l, cu, cv), far: true };
  let d = tg - tc; if (d > R.P / 2) d -= R.P; if (d < -R.P / 2) d += R.P;
  const [u, v] = R.point(tc + Math.sign(d) * Math.min(2, Math.abs(d)));
  return { ...world(l, u, v), far: Math.abs(d) > 0.5 };
}
// a heading that would cut through a house slides along its wall instead
function skirt(L, pos, dx, dz) {
  for (const l of L.lots) {
    if (Math.hypot(l.x - pos.x, l.z - pos.z) > l.rad + 3) continue;
    const { a, b } = half(l, T.lotMargin), c = local(l, pos); if (Math.abs(c.u) >= a || Math.abs(c.v) >= b) continue;
    let du = dx * -l.fz + dz * l.fx, dv = dx * l.fx + dz * l.fz;
    if (a - Math.abs(c.u) < b - Math.abs(c.v)) { du = Math.sign(c.u) || 1; dv = Math.sign(dv) || 1; } else { dv = Math.sign(c.v) || 1; du = Math.sign(du) || 1; }
    const n = Math.hypot(du, dv); du /= n; dv /= n;
    return [du * -l.fz + dv * l.fx, du * l.fx + dv * l.fz];
  }
  return [dx, dz];
}
function arrive(ctx, L, players, all, now) {
  const out = players.filter((p) => zoneAt(L, p.feetPosition.x, p.feetPosition.z) === "l9_street"), pool = out.length ? out : players;
  const p = pool[Math.floor(ctx.random() * pool.length)].feetPosition, spots = [];
  const ok = (x, z) => { const d = Math.hypot(x - p.x, z - p.z); return d >= T.spawnMin && d <= T.spawnMax && zoneAt(L, x, z) === "l9_street" && L.lots.every((l) => Math.hypot(l.x - x, l.z - z) > l.rad) && players.every((q) => flat(q.feetPosition, { x, z }) >= T.spawnMin) && all.every((h) => flat(h.feetPosition, { x, z }) > 6); };
  for (const l of L.lamps) if (!l.lit) { const x = l.x - Math.sin(l.yaw / DEG) * 1.1, z = l.z - Math.cos(l.yaw / DEG) * 1.1; if (ok(x, z)) spots.push([x, z], [x, z]); } // a dead streetlight is its favourite place to be found
  for (const s of L.streets) for (const [x, z] of s.pts) if (ok(x, z)) spots.push([x, z]);
  if (!spots.length) return null;
  const [x, z] = spots[Math.floor(ctx.random() * spots.length)];
  const id = ctx.spawn({ template: "templates/mangled.js#mangled", feetPosition: { x, y: 0.1, z }, rotation: { yaw: Math.atan2(-(p.x - x), -(p.z - z)) * DEG } });
  heard(ctx, { clip: S.spawn, position: { x, y: 1.5, z }, volume: 0.9, refDistance: 8, maxDistance: 45 });
  return id;
}
export function update(ctx, dt) {
  const players = ctx.place.players;
  if (!players.length) { ctx.sleep(2); return; }
  const now = ctx.now(), fog = ctx.place.state.l9fog?.on === true, mem = (ctx.self.session.m ??= {});
  if (!mem.all || now >= (mem.censusAt ?? 0)) { mem.censusAt = now + 1000; mem.all = ctx.query({ tags: ["mangled"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }); }
  const all = mem.all;
  if (!fog && !all.length) { ctx.sleep(1); return; } // no fog, none standing: nothing to step
  const seed = ctx.place.state.l9seed; if (seed == null) { ctx.sleep(1); return; }
  const L = town(seed);
  if (fog && now >= (mem.nextAt ?? 0) && all.filter((h) => !h.state?.dead && (h.state?.hp ?? 1) > 0).length < Math.min(T.cap, T.base + players.length)) {
    mem.nextAt = now + (T.spawnEvery[0] + ctx.random() * (T.spawnEvery[1] - T.spawnEvery[0])) * 1000;
    if (arrive(ctx, L, players, all, now)) mem.all = null;
  }
  const ignore = [...all.map((h) => h.id), ...players.map((p) => p.id)];
  const up = players.filter((p) => !(p.state?.downAt && now - p.state.downAt < 4500) && !p.state?.dead);
  for (const h of all) {
    if (!(h.id in ctx.place.objects)) { mem.all = null; delete mem[h.id]; continue; }
    const m = (mem[h.id] ??= {}), pos = h.feetPosition, st = h.state ?? {}, vy = (h.velocity?.y ?? 0) - 20 * dt;
    if (knocked(ctx, h, now, dt)) continue;
    if (st.dead || (st.hp ?? 1) <= 0) { // it comes apart into the fog it came from
      if (!m.deadAt) { m.deadAt = now; if (!st.corpseAt) anim(h, m, C.die, false); h.velocity = { x: 0, y: -2, z: 0 }; h.audio = null; heard(ctx, { clip: S.die, position: pos, volume: 0.8, refDistance: 5, maxDistance: 30 }); }
      else if (!m.gone && now - m.deadAt > T.deathMs && now > (st.inspectUntil ?? 0)) { m.gone = true; ctx.emit("fx", { position: pos, script: MIST }); ctx.destroy(h.id); mem.all = null; }
      continue;
    }
    const stand = () => { anim(h, m, C.idle, true, 0.3); h.velocity = { x: 0, y: vy, z: 0 }; };
    const face = (x, z) => { const yaw = Math.atan2(-(x - pos.x), -(z - pos.z)) * DEG; if (Math.abs(yaw - (m.yaw ?? 999)) > 2) { m.yaw = yaw; h.rotation = { yaw }; } };
    const go = (x, z, speed, clip, rate) => { let dx = x - pos.x, dz = z - pos.z; const n = Math.hypot(dx, dz) || 1; [dx, dz] = skirt(L, pos, dx / n, dz / n); face(pos.x + dx, pos.z + dz); anim(h, m, clip, true, rate); h.velocity = { x: dx * speed, y: vy, z: dz * speed }; };
    if (now < (st.stunUntil ?? 0)) { stand(); continue; }
    let near = null, nd = Infinity; for (const p of players) { const d = flat(p.feetPosition, pos); if (d < nd) { nd = d; near = p; } }
    if (!fog) { // the bank is rolling out: it turns and walks off into what is left of it
      m.leaveAt ??= now;
      if (nd > T.leaveClear || now - m.leaveAt > T.leaveMs) { ctx.emit("fx", { position: pos, script: MIST }); ctx.destroy(h.id); mem.all = null; delete mem[h.id]; continue; }
      go(pos.x * 2 - near.feetPosition.x, pos.z * 2 - near.feetPosition.z, T.walk, C.walk, 1); continue;
    }
    m.leaveAt = null;
    if (now >= (m.watchAt ?? 0)) { // on anyone's screen with nothing between: it does not move
      m.watchAt = now + T.watchEvery; m.watched = false;
      for (const p of players) {
        const q = p.feetPosition, dx = pos.x - q.x, dz = pos.z - q.z, d = Math.hypot(dx, dz); if (d > T.watchRange) continue;
        const yaw = (p.camera?.rotation?.yaw ?? (typeof p.rotation === "number" ? p.rotation : p.rotation?.yaw) ?? 0) / DEG;
        if (d > 0.5 && (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) / d < Math.cos(T.watchCone / DEG)) continue;
        if (clearSight(ctx, { x: q.x, y: q.y + (p.state?.crouch ? 0.9 : 1.5), z: q.z }, { x: pos.x, y: pos.y + 1.9, z: pos.z }, ignore)) { m.watched = true; break; }
      }
    }
    if (m.watched && !(st.shot && now - st.shot.at < T.flinchMs)) { stand(); continue; }
    let prey = null, best = Infinity, inside = null, bin = Infinity;
    for (const p of up) { const d = flat(p.feetPosition, pos); if (zoneAt(L, p.feetPosition.x, p.feetPosition.z) === "l9_street") { if (d < best) { best = d; prey = p; } } else if (d < bin) { bin = d; inside = p; } }
    if (prey) {
      const q = prey.feetPosition;
      if (best <= T.reach) {
        face(q.x, q.z); h.velocity = { x: 0, y: vy, z: 0 };
        if (now >= (m.next ?? 0)) { // the swipe
          m.next = now + T.swipeCd * 1000; m.clip = null; anim(h, m, C.swipe, false, 1.3);
          prey.state.hp -= dmgAfterArmor(prey.state.look, T.damage);
          if (prey.state.sanity != null) prey.state.sanity -= Math.min(T.sanity, prey.state.sanity); // sanity never kills
          const at = { x: q.x, y: q.y + 1.2, z: q.z }, kx = (q.x - pos.x) / (best || 1), kz = (q.z - pos.z) / (best || 1), me = { audience: { player: prey.id } };
          ctx.emit("damageNumber", { position: at, value: T.damage, color: "#ff5040" });
          ctx.emit("cameraPunch", { direction: { x: kx, y: 0.3, z: kz }, intensity: 0.8 }, me);
          ctx.emit("screenShake", { intensity: 0.5, duration: 0.3 }, me);
          heard(ctx, { clip: S.hit, position: at, volume: 1, maxDistance: 12 }, me);
        } else if (now > (m.next ?? 0) - T.swipeCd * 1000 + 700) anim(h, m, C.idle, true, 1);
        continue;
      }
      const run = best < T.runWithin;
      go(q.x, q.z, run ? T.run : T.walk, run ? C.run : C.walk, run ? 1.15 : 1);
      if (run && now >= (m.stepAt ?? 0)) { m.stepAt = now + 300; heard(ctx, { clip: S.step, position: pos, volume: 0.7, pitch: 0.9 + ctx.random() * 0.2, refDistance: 3, maxDistance: 24 }); }
      continue;
    }
    const lot = inside && lotOf(L, inside.feetPosition);
    if (!lot) { stand(); continue; }
    const w = windowStep(lot, pos, inside.feetPosition); // indoors is safe ground: it comes to the wall nearest them and stands there
    if (w.far) go(w.x, w.z, T.walk, C.walk, 1); else { face(inside.feetPosition.x, inside.feetPosition.z); stand(); }
  }
}
