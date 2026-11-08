// Firearm ballistics: every shot is real bullets, not a cone. Each bullet leaves the eye along the look plus a random angle (spread),
// then flies in short straight legs while gravity pulls it down and drag slows it (a ray per leg), so a slow pistol round drops and
// a pellet loses its punch long before a rifle bullet does. The first body it meets takes the hit (a hit above the shoulder is a
// headshot); a wall takes a bullet hole. scripts/player.js applies the damage this returns and plays the shot.
//   weapons.yml: mv (muzzle velocity m/s), drag (1/m: v falls by e^-drag per metre), acc [hip, ads] (half-angle of the spread cone in
//   degrees at rest), zero (the range the sights are set for, m), req { h: Hardiness, guns: skill } (scripts/lib/stats.js handling).
import { raycast } from 'builtin/physics'
import { attrsOf, skillsOf, handling } from './stats.js'

export const G = 9.81
const DEF = { mv: 330, drag: 0.005, acc: [3.5, 1.0], zero: 25 }
export const prof = (wp) => ({ mv: wp.mv ?? DEF.mv, drag: wp.drag ?? DEF.drag, acc: wp.acc ?? DEF.acc, zero: wp.zero ?? DEF.zero })
const RAD = Math.PI / 180
const norm = (v) => { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l } }
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })
const HEADS = { hound: 0.55, smiler: 0.8 } // body height by kind (m); anything else stands about 1.9
const TARGETS = ['smiler', 'lurker', 'hound', 'stealer', 'moths', 'l8spider', 'npc', 'l61fc', 'spamboss']

// the cone half-angle, degrees, for the next bullet: the weapon at rest, then what you are doing and what you can handle
export function spreadDeg(ctx, s, wp, w) {
  const P = prof(wp), H = handling(s, wp), k = skillsOf(s), ads = !!s.ads
  let d = (ads ? P.acc[1] : P.acc[0]) * H.spread * (1.2 - 0.4 * (k.guns ?? 15) / 100)
  const v = ctx.self.velocity ?? { x: 0, y: 0, z: 0 }, sp = Math.hypot(v.x, v.z)
  d *= 1 + Math.min(1, sp / 6) * (ads ? 0.4 : 0.75) // moving opens it up
  if (Math.abs(v.y ?? 0) > 1.2) d *= 1.8 // in the air
  if (s.crouch) d *= 0.78
  const cnd = (s['cnd_' + s.equipped] ?? 100) / 100; d *= 1 + (1 - cnd) * 0.7 // a worn gun shoots loose
  if (wp.spread) d += (w.heat ?? 0) * wp.spread / RAD * (ads ? 0.6 : 1) // a held trigger walks the cone open
  return d
}

// one bullet: the legs of its flight and what it hit. dir is a unit vector; ignore a list of entity ids to pass through
function fly(ctx, o, dir, wp, ignore) {
  const P = prof(wp), maxR = (wp.range ?? 30) * 1.5, leg = 6
  let pos = { ...o }, v = { x: dir.x * P.mv, y: dir.y * P.mv, z: dir.z * P.mv }, travelled = 0, t = 0
  const pts = [pos], ign = [...ignore]
  while (travelled < maxR) {
    const sp = Math.hypot(v.x, v.y, v.z), dt = leg / sp, dec = Math.exp(-P.drag * leg)
    v = { x: v.x * dec, y: v.y * dec - G * dt, z: v.z * dec } // drag over this leg, gravity over the time it took
    const nx = { x: pos.x + v.x * dt, y: pos.y + v.y * dt, z: pos.z + v.z * dt }, len = Math.hypot(nx.x - pos.x, nx.y - pos.y, nx.z - pos.z), d = norm({ x: nx.x - pos.x, y: nx.y - pos.y, z: nx.z - pos.z })
    let hit = null
    for (let tries = 0; tries < 4; tries++) {
      hit = raycast(ctx, pos, d, { distance: len, radius: 0.025, ignoreEntities: ign })
      if (!hit) break
      const e = hit.id ? ctx.getObject(hit.id) : null
      if (e?.state?.dead || e?.tags?.includes?.('weapon') || e?.tags?.includes?.('ammo')) { ign.push(hit.id); hit = null; continue } // a corpse or an item on the floor is no cover
      break
    }
    if (hit) { pts.push(hit.position); return { hit, pts, v: Math.hypot(v.x, v.y, v.z), travelled: travelled + hit.distance, t: t + hit.distance / sp } }
    pos = nx; travelled += len; t += dt; pts.push(pos)
  }
  return { hit: null, pts, v: Math.hypot(v.x, v.y, v.z), travelled, t }
}

const rootOf = (ctx, id) => { let o = ctx.getObject(id), guard = 0; while (o?.parent?.id && guard++ < 6) { const p = ctx.getObject(o.parent.id); if (!p) break; o = p } return o }
const isTarget = (o) => !!o && TARGETS.some((t) => o.tags?.includes?.(t))

// fire a whole shot (every pellet). base: damage for the whole shot, already skilled and crit-rolled.
// returns { bullets, targets: [{ m, dmg, head }], world: the first wall/prop hit { hit, dir } | null, spread }
export function fire(ctx, s, wp, w, eye, fwd, pitch, base) {
  const P = prof(wp), n = Math.max(1, wp.pellets ?? 1), H = handling(s, wp), spread = spreadDeg(ctx, s, wp, w)
  const cp = Math.cos(pitch), dir0 = { x: fwd.x * cp, y: Math.sin(pitch), z: fwd.z * cp }
  const right = norm(cross(dir0, { x: 0, y: 1, z: 0 })), up = cross(right, dir0), now = ctx.now() / 1000
  const sway = (H.sway ?? 0) * RAD // a heavy gun in weak arms wanders off the aim
  const bx = Math.sin(now * 1.9) * sway, by = Math.cos(now * 1.3) * sway * 0.7
  const zero = (0.5 * G * P.zero) / (P.mv * P.mv) // the sights sit above the bore: it points a hair up so the drop meets the aim at `zero`
  const per = (wp.pellets ? (wp.pelletMul ?? 1.5) / n : 1) * base
  const hits = new Map(), bullets = []; let world = null
  for (let i = 0; i < n; i++) {
    const th = Math.tan(spread * RAD) * Math.sqrt(ctx.random()), ph = ctx.random() * 2 * Math.PI
    const d = norm({ x: dir0.x + right.x * (th * Math.cos(ph) + bx) + up.x * (th * Math.sin(ph) + by), y: dir0.y + right.y * (th * Math.cos(ph) + bx) + up.y * (th * Math.sin(ph) + by) + zero, z: dir0.z + right.z * (th * Math.cos(ph) + bx) + up.z * (th * Math.sin(ph) + by) })
    const f = fly(ctx, eye, d, wp, [ctx.self.id]), b = { d, pts: f.pts, hit: f.hit, travelled: f.travelled, t: f.t }
    bullets.push(b)
    if (!f.hit) continue
    const e = f.hit.id ? rootOf(ctx, f.hit.id) : null
    const energy = Math.max(0.25, Math.min(1, (f.v / P.mv) ** 2)) * Math.max(0.35, 1 - Math.max(0, f.travelled - (wp.range ?? 30)) / ((wp.range ?? 30) * 0.5)) // a slowed bullet, or one past its range, hits softer
    if (isTarget(e) && !e.state?.dead) {
      const H0 = (e.tags?.includes?.('hound') ? HEADS.hound : e.tags?.includes?.('smiler') ? HEADS.smiler : 1.9) * (e.scale?.y ?? 1)
      const head = f.hit.position.y - (e.feetPosition?.y ?? 0) > 0.78 * H0
      b.body = true
      const r = hits.get(e.id) ?? { m: e, dmg: 0, head: false, n: 0 }; r.dmg += per * energy * (head ? 2 : 1); r.head ||= head; r.n++; hits.set(e.id, r)
    } else if (!world) world = { hit: f.hit, dir: d }
  }
  return { bullets, targets: [...hits.values()], world, spread }
}

// ---- what it looks like: a streak down each bullet's path, and a hole and a puff where it lands in a wall
const TRACER = `fx
pop t burst=1 life=.12 v=<%vx|0,%vy|0,%vz|-1> size=.028 col=hdr(7,5,2) a=1>0 sz=$size r=sprite(ember,add,velocity,.09)`
const IMPACT = `fx
pop spark burst=3..5 life=.08..0.16 on=point() v=<%nx|0,%ny|1,%nz|0>*(1.5..4)+sdir()*(.6..1.4) size=.012..0.022 acc=grav() col=hdr(5,3.4,1.4) a=1>0 r=sprite(ember,add)
pop dust burst=3..5 life=.5..0.9 on=point() v=<%nx|0,%ny|1,%nz|0>*(.3..0.8)+sdir()*(.1..0.3) size=.04..0.08 acc=buoy(.2)+drag(1.6) col=<.62,.6,.56> a=0>.35:.5>0 sz=$size*(1>2.4) r=sprite(smoke-puff,alpha)`
const HOLE = `fx
pop hole burst=1 life=40 on=point() size=.05 col=<.035,.035,.04> a=.95>.9:.9>0 r=sprite(soft-disc,alpha)
pop ring burst=1 life=40 on=point() size=.085 col=<.12,.11,.1> a=.35>.3:.3>0 r=sprite(soft-disc,alpha)`
export function show(ctx, res, wp, muzzle) {
  for (const b of res.bullets) {
    const end = b.pts[b.pts.length - 1], dx = end.x - muzzle.x, dy = end.y - muzzle.y, dz = end.z - muzzle.z, dist = Math.hypot(dx, dy, dz) || 1, speed = dist / 0.12 // the streak crosses its whole path in its short life
    if (dist > 1.2) ctx.emit('fx', { position: muzzle, script: TRACER, params: { vx: dx / dist * speed, vy: dy / dist * speed, vz: dz / dist * speed } })
    if (b.hit && !b.body) {
      const nm = b.hit.normal ?? { x: 0, y: 1, z: 0 }, at = { x: b.hit.position.x + nm.x * 0.012, y: b.hit.position.y + nm.y * 0.012, z: b.hit.position.z + nm.z * 0.012 }
      ctx.emit('fx', { position: at, script: IMPACT, params: { nx: nm.x, ny: nm.y, nz: nm.z } })
      ctx.emit('fx', { position: at, script: HOLE })
    }
  }
}
