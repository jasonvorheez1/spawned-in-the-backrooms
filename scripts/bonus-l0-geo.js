// Behind the mall's north glass (Shelly Nov 17: "make a seamless entrance back to level zero here"): the Lobby itself,
// carpet, wallpaper and drop ceiling butting straight up to the glass, a hall running back and turning right.
// Walking round that corner is the way home (scripts/bonus-l0-exit.js). Origin: the mall's (0,0,0).
const WALLPAPER = "/cdn/value.00a4e744acf9ab763779bbb0cc7f26fb1dd20aeafc69448c536939cd7212caeb.png"
const CARPET = "cdn/texture-damp-beige-berber-office-carpet.png"
const CEILING = "cdn/texture-white-acoustic-drop-ceiling-tile-grid.png"
const H = 3, T = 0.1, Z0 = 32.2
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
// [axis, p, a, b] as in scripts/lib/tut0.js
const WALLS = [["x", -8.1, Z0, 40], ["x", 8.1, Z0, 40], ["z", 40, -8.1, -1.5], ["z", 40, 1.5, 8.1],
  ["x", -1.5, 40, 51], ["x", 1.5, 40, 48.4], ["z", 51, -1.5, 5], ["z", 48.4, 1.5, 5], ["x", 5, 48.4, 51]]
const FLOORS = [[-8.1, Z0, 8.1, 40], [-1.5, 40, 1.5, 51], [1.5, 48.4, 5, 51]]
const PANELS = [[-4, 35], [4, 35], [0, 38], [0, 43.5], [0, 49.6], [3.4, 49.7]]
const span = (w) => w[0] === "x" ? [w[1] - T, w[2] - T, w[1] + T, w[3] + T] : [w[2] - T, w[1] - T, w[3] + T, w[1] + T]
export function geometry(ctx) {
  ctx.albedo(CARPET); ctx.color("oklch(0.97 0.01 90)")
  for (const [a, b, c, d] of FLOORS) face(ctx, [a, 0.004, b], [a, 0.004, d], [c, 0.004, d], [c, 0.004, b], [0, 1, 0])
  ctx.albedo(CEILING)
  for (const [a, b, c, d] of FLOORS) { ctx.color(hash(a, b, 1) < 0.5 ? "oklch(0.92 0.03 85)" : "oklch(0.97 0.015 95)"); face(ctx, [a, H, b], [c, H, b], [c, H, d], [a, H, d], [0, -1, 0]) }
  ctx.albedo(WALLPAPER)
  WALLS.forEach((w, i) => { const [a, b, c, d] = span(w); ctx.color(hash(i, 2, 7) < 0.3 ? "oklch(0.9 0.03 80)" : "oklch(0.98 0.01 90)"); box(ctx, a, 0, b, c, H, d) })
  // the Lobby's own wall above its ceiling, seen through the upper panes: the mall's glass bolted onto it
  box(ctx, -10, H, Z0, 10, 8.8, Z0 + 0.2)
  ctx.albedo(null)
  ctx.color("oklch(0.72 0.05 85)"); ctx.roughness(0.6)
  for (const w of WALLS) { const [a, b, c, d] = span(w); box(ctx, a - 0.02, 0, b - 0.02, c + 0.02, 0.1, d + 0.02) }
  ctx.roughness(0.9)
  // where the two floors meet: the mall's terrazzo stops dead, the carpet curls up at the seam, a tide line of damp
  ctx.color("oklch(0.32 0.05 70)", 0.4)
  for (let k = 0; k < 9; k++) { const x = -7.5 + k * 1.85 + hash(k, 1, 1) * 0.6, r = 0.4 + hash(k, 2, 2) * 0.7; face(ctx, [x - r, 0.008, Z0 + 0.05], [x + r, 0.008, Z0 + 0.05], [x + r * 0.6, 0.008, Z0 + 0.3 + r], [x - r * 0.7, 0.008, Z0 + 0.25 + r * 0.8], [0, 1, 0]) }
  ctx.color("oklch(0.62 0.05 80)"); box(ctx, -8, 0, Z0, 8, 0.03, Z0 + 0.06)
  // leak stains running down from the ceiling
  WALLS.forEach((w, i) => {
    if (hash(i, 3, 9) > 0.55) return
    const u = w[2] + (w[3] - w[2]) * (0.25 + hash(i, 5, 9) * 0.5)
    for (const sd of [-1, 1]) {
      const off = w[1] + sd * (T + 0.004), n = w[0] === "x" ? [sd, 0, 0] : [0, 0, sd], P = (uu, y) => w[0] === "x" ? [off, y, uu] : [uu, y, off]
      ctx.color("oklch(0.4 0.06 70)", 0.2)
      for (let d = 0; d < 3; d++) { const du = u + (hash(i, d, sd) - 0.5) * 0.8, len = 0.5 + hash(d, i, sd) * 1.2, ww = 0.03 + hash(i, d, 4) * 0.04; face(ctx, P(du - ww, H - 0.25 - len), P(du + ww, H - 0.25 - len), P(du + ww * 1.8, H - 0.01), P(du - ww * 1.8, H - 0.01), n) }
    }
  })
  ctx.roughness(null)
  for (const [x, z] of PANELS) {
    ctx.color("oklch(0.75 0.01 90)"); box(ctx, x - 0.66, H - 0.04, z - 0.36, x + 0.66, H - 0.005, z + 0.36)
    ctx.emissive([2.4, 2.25, 1.8]); ctx.color("#fffaf0")
    face(ctx, [x - 0.62, H - 0.045, z - 0.32], [x + 0.62, H - 0.045, z - 0.32], [x + 0.62, H - 0.045, z + 0.32], [x - 0.62, H - 0.045, z + 0.32], [0, -1, 0]); ctx.emissive(null)
  }
}
