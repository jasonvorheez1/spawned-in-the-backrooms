// The laundromat (Shelly Nov 17: the new opening, "not AI slop, not grandiose, a completely different setting").
// One script, several pieces by params.kind: shell (the room), washer (front loader), dryer (stacked pair), table (folding counter),
// chair (molded plastic), vend (soap vending), sign. Origin at each piece's feet, -Z forward (the door faces -Z).
const T = {
  floor: "cdn/texture-worn-checkered-vinyl-floor-tiles.png",
  wall: "cdn/texture-pale-mint-painted-cinderblock-wall.png",
  ceil: "cdn/texture-stained-acoustic-ceiling-tile.png",
  steel: "cdn/texture-brushed-stainless-steel.png",
  enamel: "cdn/texture-scuffed-white-appliance-enamel.png",
  formica: "cdn/texture-worn-beige-formica-countertop.png",
}

// a box with chamfered edges: b = chamfer size. Faces wind outward.
function cbox(ctx, x0, y0, z0, x1, y1, z1, b = 0.01) {
  const X = [x0, x0 + b, x1 - b, x1], Y = [y0, y0 + b, y1 - b, y1], Z = [z0, z0 + b, z1 - b, z1]
  const q = (a, c, d, e) => ctx.quad(...a, ...c, ...d, ...e)
  // main faces
  q([X[1], Y[1], Z[3]], [X[2], Y[1], Z[3]], [X[2], Y[2], Z[3]], [X[1], Y[2], Z[3]]) // +z
  q([X[2], Y[1], Z[0]], [X[1], Y[1], Z[0]], [X[1], Y[2], Z[0]], [X[2], Y[2], Z[0]]) // -z
  q([X[3], Y[1], Z[2]], [X[3], Y[1], Z[1]], [X[3], Y[2], Z[1]], [X[3], Y[2], Z[2]]) // +x
  q([X[0], Y[1], Z[1]], [X[0], Y[1], Z[2]], [X[0], Y[2], Z[2]], [X[0], Y[2], Z[1]]) // -x
  q([X[1], Y[3], Z[2]], [X[2], Y[3], Z[2]], [X[2], Y[3], Z[1]], [X[1], Y[3], Z[1]]) // +y
  q([X[1], Y[0], Z[1]], [X[2], Y[0], Z[1]], [X[2], Y[0], Z[2]], [X[1], Y[0], Z[2]]) // -y
  // vertical edges
  q([X[2], Y[1], Z[3]], [X[3], Y[1], Z[2]], [X[3], Y[2], Z[2]], [X[2], Y[2], Z[3]])
  q([X[3], Y[1], Z[1]], [X[2], Y[1], Z[0]], [X[2], Y[2], Z[0]], [X[3], Y[2], Z[1]])
  q([X[1], Y[1], Z[0]], [X[0], Y[1], Z[1]], [X[0], Y[2], Z[1]], [X[1], Y[2], Z[0]])
  q([X[0], Y[1], Z[2]], [X[1], Y[1], Z[3]], [X[1], Y[2], Z[3]], [X[0], Y[2], Z[2]])
  // top edges
  q([X[1], Y[2], Z[3]], [X[2], Y[2], Z[3]], [X[2], Y[3], Z[2]], [X[1], Y[3], Z[2]])
  q([X[2], Y[2], Z[0]], [X[1], Y[2], Z[0]], [X[1], Y[3], Z[1]], [X[2], Y[3], Z[1]])
  q([X[3], Y[2], Z[2]], [X[3], Y[2], Z[1]], [X[2], Y[3], Z[1]], [X[2], Y[3], Z[2]])
  q([X[0], Y[2], Z[1]], [X[0], Y[2], Z[2]], [X[1], Y[3], Z[2]], [X[1], Y[3], Z[1]])
  // bottom edges
  q([X[2], Y[1], Z[3]], [X[1], Y[1], Z[3]], [X[1], Y[0], Z[2]], [X[2], Y[0], Z[2]])
  q([X[1], Y[1], Z[0]], [X[2], Y[1], Z[0]], [X[2], Y[0], Z[1]], [X[1], Y[0], Z[1]])
  q([X[3], Y[1], Z[1]], [X[3], Y[1], Z[2]], [X[2], Y[0], Z[2]], [X[2], Y[0], Z[1]])
  q([X[0], Y[1], Z[2]], [X[0], Y[1], Z[1]], [X[1], Y[0], Z[1]], [X[1], Y[0], Z[2]])
  // corners
  const t = (a, c, d) => ctx.tri(...a, ...c, ...d)
  t([X[2], Y[3], Z[2]], [X[3], Y[2], Z[2]], [X[2], Y[2], Z[3]]); t([X[1], Y[3], Z[2]], [X[1], Y[2], Z[3]], [X[0], Y[2], Z[2]])
  t([X[2], Y[3], Z[1]], [X[2], Y[2], Z[0]], [X[3], Y[2], Z[1]]); t([X[1], Y[3], Z[1]], [X[0], Y[2], Z[1]], [X[1], Y[2], Z[0]])
  t([X[2], Y[0], Z[2]], [X[2], Y[1], Z[3]], [X[3], Y[1], Z[2]]); t([X[1], Y[0], Z[2]], [X[0], Y[1], Z[2]], [X[1], Y[1], Z[3]])
  t([X[2], Y[0], Z[1]], [X[3], Y[1], Z[1]], [X[2], Y[1], Z[0]]); t([X[1], Y[0], Z[1]], [X[1], Y[1], Z[0]], [X[0], Y[1], Z[1]])
}
// a ring in the XY plane facing -Z at depth z: r0 inner, r1 outer, with a rounded lip of depth d
function ring(ctx, cx, cy, z, r0, r1, d, n = 32) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2
    const P = (r, ang, zz) => [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, zz]
    const rm = (r0 + r1) / 2
    ctx.quad(...P(r1, a, z), ...P(r1, b, z), ...P(rm, b, z - d), ...P(rm, a, z - d))
    ctx.quad(...P(rm, a, z - d), ...P(rm, b, z - d), ...P(r0, b, z), ...P(r0, a, z))
  }
}
function disc(ctx, cx, cy, z, r, bulge, n = 32) { // a slightly domed disc facing -Z
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2
    ctx.tri(cx, cy, z - bulge, cx + Math.cos(b) * r, cy + Math.sin(b) * r, z, cx + Math.cos(a) * r, cy + Math.sin(a) * r, z)
  }
}
function knob(ctx, cx, cy, z, r) { ctx.smooth(); ring(ctx, cx, cy, z, 0.001, r, 0.025, 16); ctx.flat() }

function frontLoader(ctx, y0, dryer) {
  const W = 0.68, H = dryer ? 0.8 : 0.9, D = 0.72
  ctx.albedo(T.enamel); ctx.color("oklch(0.95 0.01 90)"); ctx.roughness(0.45)
  cbox(ctx, -W / 2, y0, -D / 2, W / 2, y0 + H, D / 2, 0.025)
  // control panel strip, a shade darker, slanted
  ctx.albedo(T.steel); ctx.color("oklch(0.92 0 0)"); ctx.metalness(0.8); ctx.roughness(0.35)
  const py = y0 + H - 0.14
  cbox(ctx, -W / 2 + 0.02, py, -D / 2 - 0.02, W / 2 - 0.02, y0 + H - 0.02, -D / 2 + 0.02, 0.008)
  // coin slide + timer knob + little window
  ctx.albedo(null); ctx.color("oklch(0.35 0.01 250)"); ctx.metalness(0.9)
  cbox(ctx, 0.08, py + 0.03, -D / 2 - 0.05, 0.26, py + 0.09, -D / 2 - 0.015, 0.006)
  ctx.color("oklch(0.2 0 0)"); knob(ctx, -0.18, py + 0.06, -D / 2 - 0.02, 0.03)
  ctx.emissive("oklch(0.55 0.2 25)"); ctx.color("oklch(0.3 0.1 25)"); cbox(ctx, -0.06, py + 0.045, -D / 2 - 0.03, 0.02, py + 0.075, -D / 2 - 0.02, 0.003); ctx.emissive(null)
  // porthole: chrome ring, dark glass, rubber gasket behind
  const cy = y0 + (H - 0.14) / 2 + 0.02, R = dryer ? 0.27 : 0.25
  ctx.color("oklch(0.85 0 0)"); ctx.metalness(1); ctx.roughness(0.18); ctx.smooth()
  ring(ctx, 0, cy, -D / 2 - 0.001, R - 0.05, R + 0.015, 0.05, 40)
  ctx.metalness(0); ctx.roughness(0.9); ctx.color("oklch(0.18 0 0)")
  ring(ctx, 0, cy, -D / 2 + 0.03, R - 0.09, R - 0.05, -0.03, 40)
  ctx.flat(); ctx.roughness(0.05); ctx.metalness(0.2); ctx.color(dryer ? "oklch(0.32 0.02 230 / 0.55)" : "oklch(0.25 0.03 220 / 0.6)")
  disc(ctx, 0, cy, -D / 2 - 0.035, R - 0.05, 0.03, 40)
  // door handle on the right of the ring
  ctx.color("oklch(0.75 0 0)"); ctx.metalness(1); ctx.roughness(0.25)
  cbox(ctx, R + 0.0, cy - 0.06, -D / 2 - 0.05, R + 0.03, cy + 0.06, -D / 2 - 0.005, 0.006)
  // feet
  ctx.color("oklch(0.15 0 0)"); ctx.metalness(0); ctx.roughness(0.8)
  if (!dryer) for (const sx of [-1, 1]) for (const sz of [-1, 1]) cbox(ctx, sx * 0.28 - 0.025, y0 - 0.03, sz * 0.28 - 0.025, sx * 0.28 + 0.025, y0, sz * 0.28 + 0.025, 0.005)
  return H
}

export function geometry(ctx) {
  const k = ctx.params.kind ?? "washer"
  if (k === "washer") { frontLoader(ctx, 0.03, false); return }
  if (k === "dryer") { const h = frontLoader(ctx, 0, true); frontLoader(ctx, h + 0.01, true); return } // a stacked pair
  if (k === "table") { // a long folding counter: formica top with a rolled steel edge, two steel legs
    const L = ctx.params.len ?? 2.4
    ctx.albedo(T.formica); ctx.color("oklch(0.93 0.02 80)"); ctx.roughness(0.6)
    cbox(ctx, -L / 2, 0.86, -0.38, L / 2, 0.9, 0.38, 0.012)
    ctx.albedo(T.steel); ctx.color("oklch(0.8 0 0)"); ctx.metalness(0.85); ctx.roughness(0.4)
    cbox(ctx, -L / 2 - 0.01, 0.84, -0.39, L / 2 + 0.01, 0.865, 0.39, 0.008)
    for (const sx of [-1, 1]) { cbox(ctx, sx * (L / 2 - 0.25) - 0.03, 0, -0.3, sx * (L / 2 - 0.25) + 0.03, 0.84, 0.3, 0.01) }
    return
  }
  if (k === "chair") { // molded orange plastic on chrome legs
    ctx.albedo(null); ctx.color("oklch(0.62 0.16 45)"); ctx.roughness(0.5); ctx.smooth()
    cbox(ctx, -0.22, 0.43, -0.22, 0.22, 0.47, 0.2, 0.03)
    cbox(ctx, -0.21, 0.47, 0.17, 0.21, 0.85, 0.21, 0.025)
    ctx.flat(); ctx.color("oklch(0.85 0 0)"); ctx.metalness(1); ctx.roughness(0.3)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cbox(ctx, sx * 0.19 - 0.012, 0, sz * 0.18 - 0.012, sx * 0.19 + 0.012, 0.43, sz * 0.18 + 0.012, 0.004)
    return
  }
  if (k === "vend") { // a wall-mounted soap dispenser box, push buttons, a lit price strip
    ctx.albedo(T.steel); ctx.color("oklch(0.55 0.12 250)"); ctx.metalness(0.6); ctx.roughness(0.4)
    cbox(ctx, -0.35, 0.9, -0.12, 0.35, 1.7, 0.12, 0.02)
    ctx.albedo(null); ctx.emissive("oklch(0.85 0.08 95)"); ctx.color("oklch(0.9 0.05 95)")
    cbox(ctx, -0.3, 1.55, -0.14, 0.3, 1.64, -0.11, 0.004); ctx.emissive(null)
    ctx.color("oklch(0.9 0 0)"); ctx.metalness(0.9)
    for (let i = 0; i < 4; i++) knob(ctx, -0.22 + i * 0.147, 1.38, -0.12, 0.035)
    ctx.color("oklch(0.12 0 0)"); cbox(ctx, -0.2, 0.95, -0.14, 0.2, 1.08, -0.11, 0.01) // the tray
    return
  }
  if (k === "shell") shell(ctx)
}

// the room: 7 m wide, 12 m deep, 3 m ceiling, a storefront of glass at z = 0 looking onto a wet street, a back door at z = -12
function shell(ctx) {
  const W = 3.5, D = 12, H = 3.0
  ctx.albedo(T.floor); ctx.color("oklch(0.93 0.01 90)"); ctx.roughness(0.35)
  ctx.quad(-W, 0, 0, W, 0, 0, W, 0, -D, -W, 0, -D)
  ctx.albedo(T.ceil); ctx.color("oklch(0.92 0.01 90)"); ctx.roughness(0.95)
  ctx.quad(-W, H, -D, W, H, -D, W, H, 0, -W, H, 0)
  ctx.albedo(T.wall); ctx.color("oklch(0.93 0.02 160)"); ctx.roughness(0.9)
  ctx.quad(-W, 0, -D, -W, 0, 0, -W, H, 0, -W, H, -D) // left
  ctx.quad(W, 0, 0, W, 0, -D, W, H, -D, W, H, 0) // right
  // back wall with a door hole 1.0 x 2.2 at x 2.2
  ctx.quad(-W, 0, -D, 1.7, 0, -D, 1.7, H, -D, -W, H, -D)
  ctx.quad(2.7, 0, -D, W, 0, -D, W, H, -D, 2.7, H, -D)
  ctx.quad(1.7, 2.2, -D, 2.7, 2.2, -D, 2.7, H, -D, 1.7, H, -D)
  // storefront: a knee wall, aluminium mullions, a header with the painted sign band
  ctx.quad(W, 0, 0, -W, 0, 0, -W, 0.5, 0, W, 0.5, 0)
  ctx.quad(W, 2.5, 0, -W, 2.5, 0, -W, H, 0, W, H, 0)
  ctx.albedo(T.steel); ctx.color("oklch(0.75 0 0)"); ctx.metalness(0.8); ctx.roughness(0.35)
  for (const x of [-3.45, -1.2, 1.2, 3.45]) cbox(ctx, x - 0.05, 0.5, -0.06, x + 0.05, 2.5, 0.06, 0.01)
  cbox(ctx, -W, 0.46, -0.08, W, 0.52, 0.08, 0.01); cbox(ctx, -W, 2.47, -0.08, W, 2.53, 0.08, 0.01)
  // baseboard
  ctx.albedo(null); ctx.color("oklch(0.35 0.03 160)"); ctx.metalness(0); ctx.roughness(0.6)
  cbox(ctx, -W, 0, -D, -W + 0.02, 0.12, 0, 0.004); cbox(ctx, W - 0.02, 0, -D, W, 0.12, 0, 0.004)
  // fluorescent troffers: two rows of four, one dead near the back
  for (const x of [-1.6, 1.6]) for (let i = 0; i < 4; i++) {
    const z = -1.8 - i * 2.8, dead = x > 0 && i === 3
    ctx.albedo(null); ctx.color("oklch(0.85 0 0)"); ctx.metalness(0.5)
    cbox(ctx, x - 0.32, H - 0.05, z - 0.62, x + 0.32, H - 0.005, z + 0.62, 0.008)
    if (!dead) ctx.emissive("oklch(0.97 0.02 150)"); ctx.color(dead ? "oklch(0.6 0 0)" : "oklch(0.98 0.01 150)")
    ctx.quad(x - 0.28, H - 0.051, z + 0.58, x + 0.28, H - 0.051, z + 0.58, x + 0.28, H - 0.051, z - 0.58, x - 0.28, H - 0.051, z - 0.58)
    ctx.emissive(null)
  }
  ctx.metalness(null)
}

export function collider(ctx) {
  const k = ctx.params.kind ?? "washer"
  if (k === "washer") return { kind: "box", width: 0.68, height: 0.93, depth: 0.72, center: [0, 0.465, 0] }
  if (k === "dryer") return { kind: "box", width: 0.68, height: 1.61, depth: 0.72, center: [0, 0.805, 0] }
  if (k === "table") { const L = ctx.params.len ?? 2.4; return { kind: "box", width: L, height: 0.9, depth: 0.76, center: [0, 0.45, 0] } }
  if (k === "chair") return { kind: "box", width: 0.44, height: 0.85, depth: 0.44, center: [0, 0.425, 0] }
  if (k === "vend") return { kind: "box", width: 0.7, height: 0.8, depth: 0.24, center: [0, 1.3, 0] }
  if (k === "shell") return [
    { kind: "box", width: 7, height: 0.2, depth: 12, center: [0, -0.1, -6] },
    { kind: "box", width: 0.2, height: 3, depth: 12, center: [-3.6, 1.5, -6] },
    { kind: "box", width: 0.2, height: 3, depth: 12, center: [3.6, 1.5, -6] },
    { kind: "box", width: 7, height: 3, depth: 0.2, center: [0, 1.5, 0.1] },
    { kind: "box", width: 5.2, height: 3, depth: 0.2, center: [-0.9, 1.5, -12.1] },
  ]
}
