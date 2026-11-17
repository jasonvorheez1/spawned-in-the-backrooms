// Level 22: a slab panel that has let go of its rebar. It looks like floor until you see the cracks round it.
// Origin = centre of its top face. Params: w, d.
const T = 0.5;
export function geometry(ctx) {
  const P = ctx.params ?? {}, hw = (P.w ?? 3) / 2 - 0.03, hd = (P.d ?? 3) / 2 - 0.03;
  ctx.roughness(0.93); ctx.albedo("cdn/texture-parking-garage-concrete-floor-oil-stained-dusty.png"); ctx.color("#d9d5cb");
  ctx.quad(-hw, -0.035, -hd, -hw, -0.02, hd, hw, -0.045, hd, hw, -0.015, -hd);
  ctx.albedo("cdn/texture-broken-fractured-rough-concrete-aggregate.png"); ctx.color("#b9b4aa");
  ctx.quad(-hw, -T, hd, hw, -T, hd, hw, -0.045, hd, -hw, -0.02, hd); ctx.quad(hw, -T, -hd, -hw, -T, -hd, -hw, -0.035, -hd, hw, -0.015, -hd);
  ctx.quad(hw, -T, hd, hw, -T, -hd, hw, -0.015, -hd, hw, -0.045, hd); ctx.quad(-hw, -T, -hd, -hw, -T, hd, -hw, -0.02, hd, -hw, -0.035, -hd);
  ctx.quad(-hw, -T, -hd, hw, -T, -hd, hw, -T, hd, -hw, -T, hd);
  ctx.albedo(null); ctx.color("#1a1917"); // the cracks that give it away
  const cr = [[-hw, -0.3, -0.2, 0.1], [-0.2, 0.1, 0.5, -0.4], [0.5, -0.4, hw, 0.2], [-0.2, 0.1, 0.1, hd], [0.5, -0.4, 0.3, -hd]];
  for (const [x0, z0, x1, z1] of cr) { const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz), nx = (-dz / l) * 0.012, nz = (dx / l) * 0.012; ctx.quad(x0 - nx, -0.012, z0 - nz, x0 + nx, -0.012, z0 + nz, x1 + nx, -0.012, z1 + nz, x1 - nx, -0.012, z1 - nz); }
}
export function collider(ctx) { const P = ctx.params ?? {}; return { kind: "box", width: (P.w ?? 3) - 0.06, height: 0.46, depth: (P.d ?? 3) - 0.06, center: [0, -0.26, 0] }; }
