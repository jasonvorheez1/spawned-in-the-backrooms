// First-person arm: a canvas jacket sleeve running back past the camera and a hand closed around a
// vertical grip at the origin. Camera space: -Z forward, +Y up. The held weapon is a child object.
// Every limb is a capped, tapered tube (no hollow ends) with joints that swell, so the hand reads as
// soft knuckled fingers and not as a pile of pipes and balls.
import { tube, sphere } from "./lib/shapes.js";
import { SPECIES } from "./critter2-geo.js";
// params (from the wearer's critter look): species, fur, topw, top. A long-sleeved top dresses the forearm; otherwise it is bare fur.
const LONG = new Set(["longsleeve", "hoodie", "sweater", "jacket", "pajamas"]);

const S = 0.9 // the whole arm, a little smaller than the first version so it never crowds the weapon
const P = (p) => [p[0] * S, p[1] * S, p[2] * S]

// a tube that closes itself: radii fall to nothing just past both ends
function rod(ctx, pts, rads, M, sq = [1, 1]) {
  const n = pts.length, a = pts[0], b = pts[1], y = pts[n - 1], z = pts[n - 2]
  const ext = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t)
  tube(ctx, [ext(a, b, -0.04), ext(a, b, -0.02), a, ...pts.slice(1, -1), y, ext(y, z, -0.02), ext(y, z, -0.04)].map(P),
    [1e-4, rads[0] * 0.75, rads[0], ...rads.slice(1, -1), rads[n - 1], rads[n - 1] * 0.7, 1e-4].map((r) => r * S), M, sq, 0, 1)
  sphere(ctx, P(a), rads[0] * 0.97 * S, M, [sq[0], sq[1], sq[0]]); sphere(ctx, P(y), rads[n - 1] * 0.97 * S, M, [sq[0], sq[1], sq[0]]) // round caps: no flat cut ends
}
const ball = (ctx, c, r, M, sq) => sphere(ctx, P(c), r * S, M, sq)

export function geometry(ctx) {
  const M = ctx.lod <= 2 ? 16 : 9, P0 = ctx.params ?? {}
  if (P0.hidden) { ctx.tri(0, 0, 0, 0.0001, 0, 0, 0, 0.0001, 0); return } // a worn model's own arm holds the weapon
  const HU = !!P0.human, sp = HU ? null : SPECIES[P0.species] ?? null, FUR = HU ? (P0.skin || "oklch(0.88 0.035 60)") : P0.fur || sp?.fur || "oklch(0.74 0.055 55)", PAD = sp?.nose && sp.nose !== "#2a1c18" ? "#ffb3c1" : "oklch(0.45 0.03 40)"
  const sleeved = HU ? LONG.has(P0.topw) : !sp || LONG.has(P0.topw), SLEEVE = sp || HU ? (P0.top || "#7a8aa0") : "oklch(0.36 0.03 85)"
  ctx.smooth()
  if (P0.support) { supportHand(ctx, P0, { sp, FUR, PAD, sleeved, SLEEVE, M }); ctx.color(null); return } // the off hand on a two-handed weapon

  // ---- sleeve: worn canvas jacket, two cuff folds at the wrist
  ctx.color(sleeved ? SLEEVE : FUR); ctx.roughness(0.95)
  rod(ctx, [[0.03, -0.075, 0.075], [0.06, -0.15, 0.2], [0.1, -0.26, 0.4], [0.14, -0.4, 0.62]], [0.056, 0.062, 0.07, 0.078], M, [1, 0.92])
  if (sleeved) {
    ctx.color(sp || P0.human ? mix(SLEEVE, 0.82) : "oklch(0.3 0.03 85)")
    rod(ctx, [[0.03, -0.066, 0.062], [0.036, -0.094, 0.1]], [0.057, 0.059], M, [1, 0.92]) // cuff, inner fold
    ctx.color(sp || P0.human ? mix(SLEEVE, 0.92) : "oklch(0.34 0.03 85)")
    rod(ctx, [[0.037, -0.098, 0.105], [0.042, -0.118, 0.14]], [0.06, 0.062], M, [1, 0.92]) // cuff, outer fold
  } else if (sp) { // a fur ruff at the wrist where the bare arm meets the paw
    ctx.color(mix(FUR, 1.08))
    for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283; ball(ctx, [0.032 + Math.cos(a) * 0.036, -0.074 + Math.sin(a) * 0.03, 0.072], 0.016, 6, [1, 1, 1.6]) }
  }

  // ---- skin
  const SKIN = sp || P0.human ? FUR : "oklch(0.74 0.055 55)", TIP = sp ? PAD : P0.human ? "oklch(0.86 0.045 30)" : "oklch(0.86 0.04 60)"
  ctx.color(SKIN); ctx.roughness(sp ? 0.9 : 0.55)
  // wrist, rounder across than deep
  rod(ctx, [[0.032, -0.07, 0.07], [0.033, -0.048, 0.044]], [0.033, 0.038], M, [1, 0.8])
  // palm and the back of the hand: one broad pad running up the grip, thickest across the knuckles
  rod(ctx, [[0.034, -0.052, 0.035], [0.034, -0.015, 0.024], [0.033, 0.02, 0.02], [0.033, 0.046, 0.022]], [0.03, 0.036, 0.037, 0.03], M, [0.78, 1])
  // heel of the thumb
  ball(ctx, [0.045, -0.002, 0.04], 0.027, M, [0.9, 1.3, 1])

  // ---- four fingers curled round the grip, each a three-jointed arc with swelling knuckles and a rounded tip
  for (let k = 0; k < 4; k++) {
    const y = 0.034 - k * 0.0225, r = (0.0118 - k * 0.0007) * (sp ? 1.3 : 1)
    const R = 0.034 - k * 0.0009, sweep = 218 - k * 9 // the little finger curls a touch less and tighter
    const pts = [], rad = []
    const steps = 7
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, a = (-8 + sweep * t) * Math.PI / 180
      pts.push([R * Math.cos(a) + 0.01 * (1 - t), y + Math.sin(t * Math.PI) * 0.0012, -R * Math.sin(a) + 0.02 * (1 - t)])
      // swell at the knuckle (t~0.12), the first joint (t~0.4) and the second (t~0.7); narrow to the tip
      const bump = 0.1 * Math.exp(-Math.pow((t - 0.12) / 0.1, 2)) + 0.06 * Math.exp(-Math.pow((t - 0.42) / 0.07, 2)) + 0.05 * Math.exp(-Math.pow((t - 0.72) / 0.07, 2))
      rad.push(r * (1.02 + (sp ? bump * 0.25 : bump)) * (1 - (sp ? 0.12 : 0.34) * t * t)) // a paw's fingers stay round to the tip
    }
    rod(ctx, pts, rad, ctx.lod <= 2 ? 10 : 6)
    ctx.color(TIP) // a nail, or on a critter a soft toe bean, at each tip
    const e = pts[steps]; if (sp) { const q = pts[steps - 1]; ball(ctx, [e[0] * 0.92 + q[0] * 0.08, e[1], e[2] * 0.92 + q[2] * 0.08], r * 0.55, 6, [1, 0.7, 1]) } else ball(ctx, [e[0] * 1.03, e[1] + r * 0.2, e[2] * 1.03], r * 0.62, 6, [1, 0.5, 1])
    ctx.color(SKIN)
  }

  // ---- thumb laid over the top of the fingers
  rod(ctx, [[0.05, -0.016, 0.052], [0.042, 0.02, 0.034], [0.018, 0.048, 0.0], [-0.006, 0.054, -0.024], [-0.026, 0.046, -0.026]],
    [0.019, 0.0165, 0.0145, 0.0135, 0.011], ctx.lod <= 2 ? 10 : 6, [1, 0.9])
  ctx.color(TIP)
  ball(ctx, [-0.026, 0.052, -0.027], sp ? 0.0095 : 0.0075, 6, sp ? [1, 0.8, 1] : [1, 0.5, 1]) // thumbnail / bean
  ctx.color(null)
}
export function collider() { return null }

// The left hand of a two-handed weapon, built round its own origin (the middle of the grip): guns (axis z) wrap the fore-end from below with the
// forearm coming in from the lower left, melee (axis y) takes the haft higher up. Drawn in camera space like the right arm, so the weapon's pose
// carries it. params.support = { axis: 'z' | 'y', r: the radius it grips }.
function supportHand(ctx, P0, C) {
  const { sp, FUR, PAD, sleeved, SLEEVE, M } = C, ax = P0.support.axis === 'y' ? 'y' : 'z', rr = (P0.support.r ?? 0.022) / S
  const a = ax === 'y' ? [0, 1, 0] : [0, 0, 1], u = ax === 'y' ? [0, 0, 1] : [-1, 0, 0], w = ax === 'y' ? [-1, 0, 0] : [0, -1, 0]
  const at = (s, R, phi) => [a[0] * s + R * (Math.cos(phi) * u[0] + Math.sin(phi) * w[0]), a[1] * s + R * (Math.cos(phi) * u[1] + Math.sin(phi) * w[1]), a[2] * s + R * (Math.cos(phi) * u[2] + Math.sin(phi) * w[2])]
  const SKIN = sp || P0.human ? FUR : "oklch(0.74 0.055 55)", TIP = sp ? PAD : P0.human ? "oklch(0.86 0.045 30)" : "oklch(0.86 0.04 60)"
  const d = [-0.18, -0.35, 0.75], dl = Math.hypot(...d), dn = d.map((v) => v / dl)
  const b0 = at(0, rr + 0.034, 0.75), along = (k) => [b0[0] + dn[0] * k, b0[1] + dn[1] * k, b0[2] + dn[2] * k]
  ctx.color(SKIN); ctx.roughness(sp ? 0.9 : 0.55)
  rod(ctx, [along(0.07), at(0.04, rr + 0.03, 0.75), at(-0.04, rr + 0.03, 0.75)], [0.033, 0.034, 0.03], M, [1, 0.75]) // wrist and the palm pad, on the near side of the grip
  for (let k = 0; k < 4; k++) { // four fingers curled round the grip
    const s = (k - 1.5) * 0.0225, R = rr + 0.0105, pts = [], rad = [], steps = 7
    for (let i = 0; i <= steps; i++) { const tt = i / steps, phi = (-0.35 + 4.4 * tt); pts.push(at(s, R + Math.sin(tt * Math.PI) * 0.002, phi)); rad.push((0.0115 - k * 0.0006) * (sp ? 1.3 : 1) * (1 - (sp ? 0.12 : 0.3) * tt * tt)) }
    rod(ctx, pts, rad, M)
    ctx.color(TIP); const e = pts[steps]; ball(ctx, e, 0.0075 * (sp ? 1.3 : 1), 6, [1, 0.8, 1]); ctx.color(SKIN)
  }
  rod(ctx, [at(0.065, rr + 0.016, -0.6), at(0.01, rr + 0.016, -0.6), at(-0.03, rr + 0.014, -0.45)], [0.0165, 0.014, 0.011], M, [1, 0.9]) // the thumb, along the top
  ctx.color(sleeved ? SLEEVE : FUR); ctx.roughness(0.95)
  rod(ctx, [along(0.06), along(0.2), along(0.42), along(0.66)], [0.056, 0.062, 0.07, 0.078], M, [1, 0.92]) // the forearm, back past the camera
}

// a hex colour lightened or darkened by a factor (oklch strings pass through)
function mix(c, k) {
  if (typeof c !== "string" || c[0] !== "#") return c
  const n = parseInt(c.slice(1, 7), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, "0")
  return "#" + f(n >> 16) + f((n >> 8) & 255) + f(n & 255)
}
