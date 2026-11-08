// The tutorial Level 0 as one mesh: damp carpet, yellow wallpaper, drop ceiling, light panels, baseboards,
// water stains and the dark wet patch in room F. Layout: scripts/lib/tut0.js
import { H, WALLS, PILLARS, LIGHTS, BOUNDS, SOFT } from "./lib/tut0.js"
const WALLPAPER = "/cdn/value.00a4e744acf9ab763779bbb0cc7f26fb1dd20aeafc69448c536939cd7212caeb.png"
const CARPET = "cdn/texture-damp-beige-berber-office-carpet.png"
const CEILING = "cdn/texture-white-acoustic-drop-ceiling-tile-grid.png"
const T = 0.1
const hash = (a, b, c) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s) }
function face(ctx, a, b, c, d, n) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx
  if (cx * n[0] + cy * n[1] + cz * n[2] >= 0) ctx.quad(...a, ...b, ...c, ...d); else ctx.quad(...d, ...c, ...b, ...a)
}
function box(ctx, x0, y0, z0, x1, y1, z1) {
  face(ctx, [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0])
  face(ctx, [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [0, 0, -1])
  face(ctx, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1])
  face(ctx, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0])
  face(ctx, [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0])
}
const span = (w) => w[0] === "x" ? [w[1] - T, w[2] - T, w[1] + T, w[3] + T] : [w[2] - T, w[1] - T, w[3] + T, w[1] + T]
function blob(c, r, seed, y) { const p = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, k = r * (0.65 + 0.55 * hash(seed, i, 3)); p.push([c[0] + Math.cos(a) * k, y, c[1] + Math.sin(a) * k]) } return p }
function fan(ctx, c, pts, n) { for (let i = 0; i < pts.length; i++) face(ctx, c, pts[i], pts[(i + 1) % pts.length], pts[(i + 1) % pts.length], n) }
export function geometry(ctx) {
  const { x0, x1, z0, z1 } = BOUNDS
  ctx.albedo(CARPET); ctx.color("oklch(0.98 0.01 90)")
  for (let x = x0; x < x1; x += 4) for (let z = z0; z < z1; z += 4) face(ctx, [x, 0, z], [x, 0, Math.min(z + 4, z1)], [Math.min(x + 4, x1), 0, Math.min(z + 4, z1)], [Math.min(x + 4, x1), 0, z], [0, 1, 0])
  ctx.albedo(CEILING)
  for (let x = x0; x < x1; x += 4) for (let z = z0; z < z1; z += 4) { ctx.color(hash(x, z, 1) < 0.12 ? "oklch(0.88 0.04 75)" : "oklch(0.97 0.015 95)"); face(ctx, [x, H, z], [Math.min(x + 4, x1), H, z], [Math.min(x + 4, x1), H, Math.min(z + 4, z1)], [x, H, Math.min(z + 4, z1)], [0, -1, 0]) }
  ctx.albedo(WALLPAPER)
  for (const w of WALLS) { const [a, b, c, d] = span(w); ctx.color(hash(a, b, 7) < 0.2 ? "oklch(0.9 0.03 80)" : "oklch(0.98 0.01 90)"); box(ctx, a, 0, b, c, H, d) }
  for (const [px, pz] of PILLARS) box(ctx, px - 0.5, 0, pz - 0.5, px + 0.5, H, pz + 0.5)
  ctx.albedo(null)
  // baseboards
  ctx.color("oklch(0.72 0.05 85)"); ctx.roughness(0.6)
  for (const w of WALLS) { const [a, b, c, d] = span(w); box(ctx, a - 0.02, 0, b - 0.02, c + 0.02, 0.1, d + 0.02) }
  ctx.roughness(0.9)
  // tea-brown leak stains down the walls, damp blooms on the carpet
  WALLS.forEach((w, i) => {
    if (hash(i, 3, 9) > 0.45) return
    const u = w[2] + (w[3] - w[2]) * (0.2 + hash(i, 5, 9) * 0.6), top = H - 0.25
    for (const sd of [-1, 1]) {
      const off = w[1] + sd * (T + 0.004), n = w[0] === "x" ? [sd, 0, 0] : [0, 0, sd], P = (uu, y) => w[0] === "x" ? [off, y, uu] : [uu, y, off]
      ctx.color("oklch(0.4 0.06 70)", 0.18)
      for (let d = 0; d < 3; d++) { const du = u + (hash(i, d, sd) - 0.5) * 0.8, len = 0.5 + hash(d, i, sd) * 1.3, ww = 0.03 + hash(i, d, 4) * 0.04; face(ctx, P(du - ww, top - len), P(du + ww, top - len), P(du + ww * 1.8, top), P(du - ww * 1.8, top), n) }
      ctx.color("oklch(0.4 0.06 70)", 0.2); face(ctx, P(u - 0.7, top - 0.2), P(u + 0.7, top - 0.2), P(u + 0.9, H - 0.01), P(u - 0.9, H - 0.01), n)
    }
  })
  for (let k = 0; k < 26; k++) {
    const x = x0 + 2 + hash(k, 1, 2) * (x1 - x0 - 4), z = z0 + 2 + hash(k, 2, 1) * (z1 - z0 - 4), r = 0.5 + hash(k, 3, 3) * 0.8
    ctx.color("oklch(0.3 0.04 70)", 0.2); fan(ctx, [x, 0.006, z], blob([x, z], r * 1.4, k, 0.006), [0, 1, 0])
  }
  // the soft floor in room F: soaked through, nearly black at its heart
  ctx.color("oklch(0.28 0.04 70)", 0.35); fan(ctx, [SOFT.x, 0.007, SOFT.z], blob([SOFT.x, SOFT.z], SOFT.r * 1.9, 91, 0.007), [0, 1, 0])
  ctx.color("oklch(0.16 0.03 70)", 0.55); fan(ctx, [SOFT.x, 0.009, SOFT.z], blob([SOFT.x, SOFT.z], SOFT.r * 1.1, 92, 0.009), [0, 1, 0])
  ctx.color("oklch(0.08 0.02 70)", 0.6); fan(ctx, [SOFT.x, 0.011, SOFT.z], blob([SOFT.x, SOFT.z], SOFT.r * 0.5, 93, 0.011), [0, 1, 0])
  ctx.roughness(null)
  // light panels (the blackout hall's panels are their own object: places/tutorial0/sim.js)
  for (const [x, z, hall] of LIGHTS) {
    if (hall) continue
    ctx.color("oklch(0.85 0.01 90)"); box(ctx, x - 0.67, H - 0.04, z - 0.37, x + 0.67, H, z + 0.37)
    ctx.emissive([2.4, 2.25, 1.8]); ctx.color("#fffaf0")
    face(ctx, [x - 0.62, H - 0.045, z - 0.32], [x + 0.62, H - 0.045, z - 0.32], [x + 0.62, H - 0.045, z + 0.32], [x - 0.62, H - 0.045, z + 0.32], [0, -1, 0]); ctx.emissive(null)
  }
  ctx.color(null)
  return { bounds: { min: [x0, -0.1, z0], max: [x1, H + 0.1, z1] } }
}
