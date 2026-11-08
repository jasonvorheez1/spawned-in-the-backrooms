// Level 8 karst rock (Shelly, Nov 8: "the graphics for level 8 could be much better"). The cave model has no UVs, so the rock is
// drawn in world space: layered limestone strata, worley fractures, damp streaks running down, mineral stain, and a bump from
// the same height field so every wall has grain under a lamp. params: { kind: rock|wet|flow|road|tar, s: scale }
import { materialColor, positionWorld, positionView, normalView, float, vec3, abs, fract, mix, smoothstep, sin, max, min, dFdx, dFdy, cross, dot, sign, normalize, mx_fractal_noise_float, mx_worley_noise_float, mx_noise_float } from "builtin/tsl";
import { MeshStandardNodeMaterial } from "builtin/three";

export function material(ctx) {
  const m = new MeshStandardNodeMaterial();
  const kind = String(ctx.params.kind ?? "rock"), S = Number(ctx.params.s ?? 1);
  const p = positionWorld.mul(S);
  const warp = mx_fractal_noise_float(p.mul(0.35)).mul(0.6);
  const strata = sin(p.y.add(warp).mul(kind === "flow" ? 9 : 3.4)).mul(0.5).add(0.5); // bedding planes
  const big = mx_fractal_noise_float(p.mul(0.22)).mul(0.5).add(0.5);
  const mid = mx_fractal_noise_float(p.mul(1.3)).mul(0.5).add(0.5);
  const fine = mx_noise_float(p.mul(9)).mul(0.5).add(0.5);
  const crack = smoothstep(0.0, 0.07, mx_worley_noise_float(p.mul(0.9).add(vec3(warp, 0, warp)))); // 0 in a fracture
  const drip = smoothstep(0.55, 0.85, mx_fractal_noise_float(vec3(p.x.mul(2.2), p.y.mul(0.15), p.z.mul(2.2))).mul(0.5).add(0.5)); // vertical damp streaks
  const base = materialColor;
  let col = base.mul(float(0.62).add(big.mul(0.5)).add(strata.mul(0.14)).add(fine.mul(0.1)));
  col = mix(col, col.mul(vec3(1.12, 0.9, 0.7)), smoothstep(0.55, 0.8, big).mul(0.5)); // iron stain
  col = mix(col, col.mul(0.45), drip.mul(0.55)); // wet run-off
  col = col.mul(float(0.35).add(crack.mul(0.65)));
  let rough = float(0.92).sub(drip.mul(0.5));
  let h = big.mul(0.6).add(mid.mul(0.5)).add(strata.mul(0.25)).add(fine.mul(0.12)).add(crack.mul(0.6));
  let bumpK = 0.9;
  if (kind === "wet") { rough = float(0.22).add(fine.mul(0.2)); col = col.mul(0.85); bumpK = 0.6; }
  if (kind === "flow") { col = mix(col, base.mul(1.15), 0.35); rough = float(0.45).add(mid.mul(0.25)); h = strata.mul(0.8).add(fine.mul(0.15)); bumpK = 0.5; }
  if (kind === "road") { const grit = mx_noise_float(p.mul(24)).mul(0.5).add(0.5); col = base.mul(float(0.7).add(mid.mul(0.35)).add(grit.mul(0.12))).mul(float(0.5).add(crack.mul(0.5))); rough = float(0.9); h = grit.mul(0.4).add(crack.mul(0.5)); bumpK = 0.5; }
  if (kind === "tar") { col = base.mul(float(0.8).add(mid.mul(0.4))); rough = float(0.12).add(fine.mul(0.15)); h = mid.mul(0.5); bumpK = 0.4; }
  m.colorNode = col;
  m.roughnessNode = rough;
  // three's bump mapping off the height field, in view space
  const hh = h.mul(bumpK * 0.035);
  const dpdx = dFdx(positionView), dpdy = dFdy(positionView), n = normalView;
  const r1 = cross(dpdy, n), r2 = cross(n, dpdx), det = dot(dpdx, r1);
  const grad = sign(det).mul(r1.mul(dFdx(hh)).add(r2.mul(dFdy(hh))));
  m.normalNode = normalize(abs(det).mul(n).sub(grad));
  return m;
}
