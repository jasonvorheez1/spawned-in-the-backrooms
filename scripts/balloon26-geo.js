// Entity 110, the Carnivorous Balloon (Shelly's Level 26 lore): a glossy latex body that is really thin contractile tissue,
// a puckered knot (the sphincter that drops its bait and bites), and a 1.2 m ribbon, the stinging tentacle, on four bones
// so scripts/partygoers.js can whip it. Origin = the knot's hang point on the floor below; the body floats ~1.5 m up.
const H = 1.45, R = 0.3 // body centre height, radius
export function skeleton() {
  return {
    body: { pivot: [0, H, 0] },
    r0: { parent: "body", pivot: [0, H - R * 1.25, 0] },
    r1: { parent: "r0", pivot: [0, H - R * 1.25 - 0.3, 0] },
    r2: { parent: "r1", pivot: [0, H - R * 1.25 - 0.6, 0] },
    r3: { parent: "r2", pivot: [0, H - R * 1.25 - 0.9, 0] },
  }
}
export function geometry(ctx) {
  const Q = (a, b, c, d) => ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2])
  const p = ctx.params || {}, col = p.color || "#d8262c", hi = ctx.lod <= 2
  const U = hi ? 28 : 14, V = hi ? 22 : 10
  // body: a balloon profile, rounder at the crown, pinching to the neck; a faint wrinkle where the tissue breathes
  const prof = (t) => { // t 0 top .. 1 neck
    const a = t * Math.PI, r = Math.sin(a) * R * (1 - 0.28 * t * t) + (t > 0.92 ? (t - 0.92) * 0.25 : 0)
    const y = H + Math.cos(a) * R * 1.18 - (t > 0.5 ? (t - 0.5) * 0.06 : 0)
    return [Math.max(0.012, r), y]
  }
  ctx.smooth(); ctx.bone("body"); ctx.color(col); ctx.roughness(0.18); ctx.metalness(0.05)
  const ring = (t) => { const [r, y] = prof(t); const out = []; for (let i = 0; i < U; i++) { const a = (i / U) * Math.PI * 2, w = 1 + 0.025 * Math.sin(a * 3 + t * 9) * Math.sin(t * Math.PI); out.push([Math.cos(a) * r * w, y, Math.sin(a) * r * w]) } return out }
  let prev = ring(0)
  for (let j = 1; j <= V; j++) {
    const cur = ring(j / V)
    for (let i = 0; i < U; i++) { const k = (i + 1) % U; Q(prev[i], cur[i], cur[k], prev[k]) }
    prev = cur
  }
  // highlight-catching sheen patch is the material's; the knot: a puckered torus-ish collar, darker, wet
  const ky = prof(1)[1]
  ctx.color(mix(col, "#3a0408", 0.45)); ctx.roughness(0.35)
  const KU = hi ? 14 : 8, KV = 6
  for (let j = 0; j < KV; j++) for (let i = 0; i < KU; i++) {
    const pt = (ii, jj) => { const a = (ii / KU) * Math.PI * 2, b = (jj / KV) * Math.PI * 2, pucker = 1 + 0.25 * Math.sin(a * 5); const rr = (0.028 + 0.012 * Math.cos(b)) * pucker; return [Math.cos(a) * rr, ky - 0.03 + 0.016 * Math.sin(b), Math.sin(a) * rr] }
    Q(pt(i, j), pt(i, j + 1), pt(i + 1, j + 1), pt(i + 1, j))
  }
  // the ribbon: a thin curled strip, glossy, its tip barbed and tinged; each 0.3 m rides its own bone
  ctx.color(p.ribbon || "#f2f2f2"); ctx.roughness(0.25)
  const N = hi ? 40 : 16, L = 1.2, top = ky - 0.05, wid = 0.022
  let a0 = null
  for (let i = 0; i <= N; i++) {
    const t = i / N, y = top - t * L, cx = Math.sin(t * 11) * 0.035 * t, cz = Math.cos(t * 11) * 0.035 * t
    const tw = t * 9, dx = Math.cos(tw) * wid, dz = Math.sin(tw) * wid
    const seg = Math.min(3, Math.floor(t * 4)), f = t * 4 - seg
    const w = seg < 3 ? { ["r" + seg]: 1 - f * 0.5, ["r" + (seg + 1)]: f * 0.5 } : { r3: 1 }
    ctx.bone(w)
    if (t > 0.85) ctx.color(mix(p.ribbon || "#f2f2f2", "#b8ff60", (t - 0.85) / 0.15))
    const A = [cx - dx, y, cz - dz], B = [cx + dx, y, cz + dz]
    if (a0) { Q(a0[0], a0[1], B, A); Q(a0[1], a0[0], A, B) }
    a0 = [A, B]
  }
  ctx.bone(null); ctx.color(null); ctx.roughness(null); ctx.metalness(null)
}
export function collider() { return { kind: "sphere", radius: 0.32, center: [0, H, 0] } }
function mix(a, b, t) {
  const h = (c) => { const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
  const x = h(a), y = h(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")
}
