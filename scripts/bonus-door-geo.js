// The Bonus Rooms door in Level 0 (Shelly Nov 17: "somewhere in the start of level 0 should have the bonus rooms entrance").
// A painted steel door frame set into the wallpaper, the door gone, pink-and-teal light spilling out of the opening, a small
// enamel sign above it. Faces -Z; the opening is 1.2 x 2.3 m.
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

export function geometry(ctx) {
  ctx.albedo("cdn/texture-chipped-painted-steel-door-frame.png"); ctx.color("oklch(0.9 0.03 85)"); ctx.roughness(0.6)
  cbox(ctx, -0.75, 0, -0.08, -0.6, 2.45, 0.08, 0.015); cbox(ctx, 0.6, 0, -0.08, 0.75, 2.45, 0.08, 0.015); cbox(ctx, -0.75, 2.3, -0.08, 0.75, 2.45, 0.08, 0.015)
  // the glow plane inside the opening, set back, pastel gradient by vertex colour
  ctx.albedo(null); ctx.roughness(1)
  const z = 0.3
  ctx.emissive("oklch(0.75 0.15 350)"); ctx.color("oklch(0.85 0.12 350)")
  ctx.quad(-0.6, 0, z, 0.6, 0, z, 0.6, 1.15, z, -0.6, 1.15, z)
  ctx.emissive("oklch(0.78 0.12 200)"); ctx.color("oklch(0.88 0.1 200)")
  ctx.quad(-0.6, 1.15, z, 0.6, 1.15, z, 0.6, 2.3, z, -0.6, 2.3, z)
  ctx.emissive(null)
  // reveal: the short tunnel walls between frame and glow
  ctx.color("oklch(0.35 0.05 320)")
  ctx.quad(-0.6, 0, -0.0, -0.6, 0, z, -0.6, 2.3, z, -0.6, 2.3, 0); ctx.quad(0.6, 0, z, 0.6, 0, 0, 0.6, 2.3, 0, 0.6, 2.3, z)
  // the enamel sign: dark plate, a lit pink strip; the words are a vector on its own row
  ctx.color("oklch(0.2 0.02 300)"); ctx.metalness(0.5); cbox(ctx, -0.5, 2.55, -0.06, 0.5, 2.85, -0.02, 0.01); ctx.metalness(null)
  ctx.emissive("oklch(0.8 0.17 350)"); ctx.color("oklch(0.85 0.15 350)"); cbox(ctx, -0.45, 2.58, -0.075, 0.45, 2.6, -0.06, 0.003); ctx.emissive(null)
}
export function collider(ctx) { return [ { kind: "box", width: 0.15, height: 2.45, depth: 0.16, center: [-0.675, 1.225, 0] }, { kind: "box", width: 0.15, height: 2.45, depth: 0.16, center: [0.675, 1.225, 0] } ] }
