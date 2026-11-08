// cloth patterns for the critter garments (Shelly, Nov 7: "add textures to most of the clothes"). Drawn on the garment's own
// bind-pose geometry (positionGeometry), so a pattern sticks to the cloth as it moves, and needs no UVs (many garment meshes have none).
// The garment's colour (material color = the look's hex) is the base; each pattern darkens/lightens it. params: { pat, s }
import { materialColor, positionGeometry, vec2, vec3, float, abs, fract, floor, sin, mix, smoothstep, step, max, min, mx_noise_float, mx_fractal_noise_float, mx_worley_noise_float } from "builtin/tsl";
import { MeshStandardNodeMaterial } from "builtin/three";

export function material(ctx) {
  const m = new MeshStandardNodeMaterial();
  const pat = String(ctx.params.pat ?? "weave"), S = Number(ctx.params.s ?? 1);
  const p = positionGeometry.mul(S);
  const u = p.x.add(p.z.mul(0.7)); // across the body
  const v = p.y;
  const base = materialColor;
  const fine = mx_noise_float(p.mul(260)).mul(0.5).add(0.5); // thread fuzz everywhere
  let col = base.mul(float(0.92).add(fine.mul(0.12)));
  let rough = 0.85;
  const band = (x, w) => smoothstep(0.5 - w - 0.02, 0.5 - w, abs(fract(x).sub(0.5))).oneMinus(); // 1 inside a centred band of half-width w
  if (pat === "denim") {
    const tw = fract(u.add(v).mul(140)); // diagonal twill
    const fade = mx_fractal_noise_float(p.mul(6)).mul(0.5).add(0.5);
    col = base.mul(float(0.78).add(smoothstep(0.35, 0.65, tw).mul(0.18))).mul(float(0.88).add(fade.mul(0.28)));
    col = mix(col, vec3(0.92, 0.94, 1), fine.mul(0.08));
  } else if (pat === "plaid" || pat === "tartan") {
    const a = band(u.mul(9), 0.18), b = band(v.mul(9), 0.18), t = band(u.mul(9).add(0.5), 0.03).max(band(v.mul(9).add(0.5), 0.03));
    col = base.mul(float(1).sub(a.mul(0.32)).sub(b.mul(0.32)));
    col = mix(col, vec3(0.95, 0.9, 0.78), t.mul(pat === "tartan" ? 0.55 : 0.35));
    col = col.mul(float(0.94).add(fract(u.add(v).mul(120)).mul(0.08)));
  } else if (pat === "gingham") {
    const a = step(0.5, fract(u.mul(14))), b = step(0.5, fract(v.mul(14)));
    col = mix(vec3(0.96, 0.95, 0.92), base, a.add(b).mul(0.5).add(a.mul(b).mul(0.5)).min(1).mul(0.85).add(0.1));
  } else if (pat === "stripes" || pat === "pinstripe" || pat === "breton") {
    const f = pat === "pinstripe" ? 22 : pat === "breton" ? 9 : 12, w = pat === "pinstripe" ? 0.04 : 0.22;
    const s = band(pat === "pinstripe" ? u.mul(f) : v.mul(f), w);
    col = mix(col, pat === "pinstripe" ? base.mul(2.2).min(vec3(0.95, 0.95, 0.95)) : vec3(0.95, 0.94, 0.9), s.mul(pat === "pinstripe" ? 0.7 : 0.85));
  } else if (pat === "camo") {
    const q = p.mul(5);
    const n1 = mx_fractal_noise_float(q), n2 = mx_fractal_noise_float(q.add(vec3(7.3, 1.1, 3.7)).mul(1.4));
    col = mix(base, base.mul(0.55), smoothstep(0.05, 0.12, n1));
    col = mix(col, mix(base, vec3(0.55, 0.48, 0.32), 0.55), smoothstep(0.1, 0.17, n2));
    col = mix(col, vec3(0.1, 0.1, 0.08), smoothstep(0.28, 0.34, n1.mul(n2.add(0.6))));
  } else if (pat === "knit" || pat === "cable") {
    const rib = abs(sin(u.mul(pat === "cable" ? 80 : 160)));
    const vv = fract(v.mul(110).add(abs(fract(u.mul(80)).sub(0.5)).mul(1.2)));
    let k = rib.mul(0.5).add(smoothstep(0.1, 0.5, vv).mul(0.5));
    if (pat === "cable") k = k.mul(float(0.85).add(abs(sin(v.mul(40).add(sin(u.mul(18)).mul(2)))).mul(0.25)));
    col = base.mul(float(0.72).add(k.mul(0.38)));
    rough = 0.95;
  } else if (pat === "argyle") {
    const a = abs(fract(u.mul(5)).sub(0.5)).add(abs(fract(v.mul(3.5)).sub(0.5)));
    const a2 = abs(fract(u.mul(5).add(0.5)).sub(0.5)).add(abs(fract(v.mul(3.5).add(0.5)).sub(0.5)));
    col = mix(base, base.mul(0.6), step(a, 0.5));
    col = mix(col, vec3(0.93, 0.9, 0.82), smoothstep(0.02, 0.0, abs(a2.sub(0.5))).mul(0.6));
    col = col.mul(float(0.85).add(abs(sin(u.mul(160))).mul(0.15)));
  } else if (pat === "polka" || pat === "floral") {
    const cell = vec2(u.mul(10), v.mul(10)), g = fract(cell).sub(0.5);
    const r = g.length();
    if (pat === "polka") col = mix(col, vec3(0.96, 0.95, 0.92), smoothstep(0.24, 0.2, r));
    else {
      const ang = g.y.atan2(g.x), petal = abs(sin(ang.mul(2.5))).mul(0.18).add(0.1);
      const jit = mx_noise_float(floor(cell).mul(3.1)).mul(0.5).add(0.5);
      const flower = smoothstep(petal.add(0.03), petal, r), eye = smoothstep(0.07, 0.05, r);
      col = mix(col, mix(vec3(0.98, 0.86, 0.9), vec3(1, 0.95, 0.75), jit), flower.mul(0.9));
      col = mix(col, vec3(0.95, 0.7, 0.2), eye);
    }
  } else if (pat === "leather") {
    const w = mx_worley_noise_float(p.mul(40));
    const scuff = mx_fractal_noise_float(p.mul(9)).mul(0.5).add(0.5);
    col = base.mul(float(0.8).add(smoothstep(0.0, 0.35, w).mul(0.25))).mul(float(0.85).add(scuff.mul(0.3)));
    rough = 0.55;
  } else if (pat === "canvas") {
    const wv = abs(sin(u.mul(220))).mul(abs(sin(v.mul(220))));
    const grime = mx_fractal_noise_float(p.mul(4)).mul(0.5).add(0.5);
    col = base.mul(float(0.84).add(wv.mul(0.16))).mul(float(0.8).add(grime.mul(0.3)));
    rough = 0.9;
  } else if (pat === "hivis") {
    const s = band(v.mul(4.2), 0.07);
    col = mix(col.mul(1.05), vec3(0.85, 0.87, 0.88), s);
    m.emissiveNode = vec3(0.5, 0.52, 0.5).mul(s).mul(0.35);
    rough = 0.7;
  } else if (pat === "scales") {
    const cell = vec2(u.mul(28), v.mul(20).add(step(0.5, fract(u.mul(14))).mul(0.5)));
    const g = fract(cell).sub(vec2(0.5, 0.0)), r = g.length();
    col = base.mul(float(0.6).add(smoothstep(0.62, 0.3, r).mul(0.6)));
    m.metalness = 0.35; rough = 0.45;
  } else if (pat === "velvet") {
    const sheen = mx_fractal_noise_float(p.mul(14)).mul(0.5).add(0.5);
    col = base.mul(float(0.75).add(sheen.mul(0.4)));
    rough = 0.65;
  } else if (pat === "oilskin") {
    const cr = mx_worley_noise_float(p.mul(22));
    col = base.mul(float(0.85).add(smoothstep(0.0, 0.15, cr).mul(0.18)));
    rough = 0.35;
  } else if (pat === "houndstooth") {
    const gu = fract(u.mul(14)), gv = fract(v.mul(14));
    const mu = step(0.5, gu), mv = step(0.5, gv);
    const fu = fract(gu.mul(2)), fv = fract(gv.mul(2));
    const d1 = step(fu, fv);
    const q0 = mu.mul(mv);
    const q_diag = step(0.5, abs(mu.sub(mv))).mul(d1);
    const h = q0.add(q_diag).min(1);
    col = mix(base.mul(0.35), vec3(0.95, 0.94, 0.90), h);
    col = col.mul(float(0.92).add(fine.mul(0.12)));
  } else if (pat === "fairisle") {
    const row = fract(v.mul(8)), col_x = fract(u.mul(16));
    const band1 = band(v.mul(8), 0.35);
    const star = abs(col_x.sub(0.5)).add(abs(row.sub(0.5)));
    const star_motif = smoothstep(0.35, 0.28, star);
    const dots = band(v.mul(24), 0.12).mul(band(u.mul(24), 0.12));
    const motif = star_motif.mul(band1).max(dots);
    col = mix(base, vec3(0.96, 0.94, 0.88), motif.mul(0.85));
    col = mix(col, base.mul(0.45), band(v.mul(16), 0.08).mul(motif.oneMinus()));
    col = col.mul(float(0.80).add(fine.mul(0.3)));
    rough = 0.95;
  } else if (pat === "corduroy") {
    const wale = abs(sin(u.mul(70)));
    const soft = smoothstep(0.15, 0.85, wale);
    col = base.mul(float(0.70).add(soft.mul(0.38)));
    rough = 0.82;
  } else if (pat === "quilted") {
    const d1 = fract(u.add(v).mul(12)).sub(0.5);
    const d2 = fract(u.sub(v).mul(12)).sub(0.5);
    const seam = min(abs(d1), abs(d2));
    const puff = max(float(0.0), float(0.25).sub(d1.mul(d1).add(d2.mul(d2)))).mul(3.5);
    col = base.mul(float(0.72).add(smoothstep(0.02, 0.08, seam).mul(0.22)).add(puff.mul(0.25)));
    rough = 0.65;
  } else if (pat === "ditsy") {
    const cell = vec2(u.mul(28), v.mul(28)), g = fract(cell).sub(0.5);
    const r = g.length();
    const ang = g.y.atan2(g.x);
    const petal = abs(sin(ang.mul(2.5))).mul(0.14).add(0.08);
    const jit = mx_noise_float(floor(cell).mul(5.7)).mul(0.5).add(0.5);
    const flower = smoothstep(petal.add(0.02), petal, r);
    const eye = smoothstep(0.05, 0.03, r);
    const leaf = smoothstep(0.12, 0.08, g.add(vec2(0.15, 0.12)).length());
    col = mix(col, vec3(0.42, 0.65, 0.38), leaf.mul(0.8));
    col = mix(col, mix(vec3(0.98, 0.88, 0.92), vec3(1.0, 0.92, 0.70), jit), flower.mul(0.95));
    col = mix(col, vec3(0.92, 0.65, 0.20), eye);
  } else { // weave: a plain fabric
    const wv = abs(sin(u.mul(300))).mul(0.5).add(abs(sin(v.mul(300))).mul(0.5));
    col = base.mul(float(0.9).add(wv.mul(0.1)).add(fine.mul(0.04)));
  }
  m.colorNode = col;
  m.roughness = rough;
  return m;
}
