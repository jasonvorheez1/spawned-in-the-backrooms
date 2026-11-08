// the HALOGEN wrist unit lying on a desk: a chamfered olive body with an amber CRT face, knobs and a curled strap
export function geometry(ctx) {
  const seg = 18
  const ring = (cx, cy, cz, r, w, a0, a1, col) => { // the strap: a band curled about the z axis
    ctx.color(col)
    for (let i = 0; i < seg; i++) {
      const u0 = a0 + (a1 - a0) * i / seg, u1 = a0 + (a1 - a0) * (i + 1) / seg
      const p = (u, rr, z) => [cx + Math.cos(u) * rr, cy + Math.sin(u) * rr, cz + z]
      ctx.quad(...p(u0, r, -w), ...p(u1, r, -w), ...p(u1, r, w), ...p(u0, r, w))
      ctx.quad(...p(u0, r - 0.006, w), ...p(u1, r - 0.006, w), ...p(u1, r - 0.006, -w), ...p(u0, r - 0.006, -w))
    }
  }
  ring(0, 0.042, 0, 0.04, 0.022, Math.PI * 0.95, Math.PI * 2.05, "oklch(0.25 0.02 60)")
  // body: an octagonal slab with bevelled top
  const oct = (r, y) => Array.from({ length: 8 }, (_, i) => { const a = (i + 0.5) / 8 * Math.PI * 2; return [Math.cos(a) * r * 1.25, y, Math.sin(a) * r] })
  const lo = oct(0.05, 0.004), mid = oct(0.05, 0.03), hi = oct(0.042, 0.038)
  ctx.color("oklch(0.42 0.05 115)")
  for (let i = 0; i < 8; i++) { const j = (i + 1) % 8; ctx.quad(...lo[i], ...lo[j], ...mid[j], ...mid[i]); ctx.quad(...mid[i], ...mid[j], ...hi[j], ...hi[i]) }
  ctx.color("oklch(0.3 0.04 115)"); for (let i = 1; i < 7; i++) ctx.quad(...hi[0], ...hi[i + 1], ...hi[i], ...hi[i])
  // the screen
  ctx.emissive([1.6, 1.0, 0.3]); ctx.color("#ffb347")
  ctx.quad(-0.032, 0.0386, 0.022, 0.032, 0.0386, 0.022, 0.032, 0.0386, -0.022, -0.032, 0.0386, -0.022)
  ctx.emissive(null)
  // two knobs on the side
  ctx.color("oklch(0.6 0.02 80)")
  for (const z of [-0.016, 0.014]) { const x = 0.062, y = 0.02, r = 0.008; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, b = (i + 1) / 8 * Math.PI * 2; ctx.quad(x, y + Math.cos(a) * r, z + Math.sin(a) * r, x + 0.012, y + Math.cos(a) * r, z + Math.sin(a) * r, x + 0.012, y + Math.cos(b) * r, z + Math.sin(b) * r, x, y + Math.cos(b) * r, z + Math.sin(b) * r) } }
  ctx.color(null)
  return {}
}
