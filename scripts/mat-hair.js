// Hair for every hairstyle (Shelly Nov 12: "improve its textures and material + uv"). Drawn from the hair's own bind-pose position, not its UVs,
// so Tripo's broken UV islands can't seam it: fine strands running down the fall, clumps, a darker root at the scalp, lighter tips,
// and an anime shine band that slides with the view (a Kajiya highlight along the strand direction). Colour = the material colour.
import { materialColor, positionGeometry, positionWorld, normalWorld, cameraPosition, normalize, dot, pow, saturate, vec3, float, abs, mix, smoothstep, clamp, sqrt, mx_noise_float, mx_fractal_noise_float } from "builtin/tsl";
import { MeshStandardNodeMaterial } from "builtin/three";

export function material(ctx) {
  const m = new MeshStandardNodeMaterial();
  const P = (n, d) => ctx.param(n, Number(ctx.params[n] ?? d));
  const q = positionGeometry;
  // strands: noise stretched along y (the fall), fine and coarse; clumps break it into locks
  const fine = mx_noise_float(q.mul(vec3(520, 26, 520))).mul(0.5).add(0.5);
  const coarse = mx_noise_float(q.mul(vec3(140, 9, 140))).mul(0.5).add(0.5);
  const clump = mx_fractal_noise_float(q.mul(vec3(34, 6, 34))).mul(0.5).add(0.5);
  const strand = fine.mul(0.55).add(coarse.mul(0.45));
  // root darker near the crown, tips lighter low down (bind space: crown ≈ the top of the head)
  const crown = P("crown", 1.0);
  const root = smoothstep(crown.sub(0.1), crown.add(0.02), q.y);
  const tip = smoothstep(crown.sub(0.18), crown.sub(0.42), q.y);
  let col = materialColor.mul(float(0.78).add(strand.mul(0.26)).mul(float(0.9).add(clump.mul(0.16))));
  col = col.mul(float(1).sub(root.mul(0.18))).mul(float(1).add(tip.mul(0.1)));
  // shine band: tangent = down the fall, projected onto the surface
  const N = normalize(normalWorld), V = normalize(cameraPosition.sub(positionWorld));
  const down = vec3(0, -1, 0), T = normalize(down.sub(N.mul(dot(N, down))));
  const H = normalize(V.add(vec3(0.25, 1, 0.15)));
  const th = dot(T, H).add(strand.sub(0.5).mul(0.35)).add(clump.sub(0.5).mul(0.25));   // the strands break the band so it reads as hair, not plastic
  const spec = pow(saturate(sqrt(saturate(float(1).sub(th.mul(th))))), P("shineSharp", 70));
  const band = spec.mul(smoothstep(0.35, 0.7, strand)).mul(P("shine", 0.55));
  const fres = pow(float(1).sub(saturate(abs(dot(N, V)))), 3.0);
  m.colorNode = col;
  m.emissiveNode = col.mul(0.05).add(materialColor.mul(0.6).add(vec3(0.35, 0.33, 0.3)).mul(band)).add(col.mul(fres).mul(0.18));
  m.roughnessNode = mix(float(0.55), float(0.75), strand);
  m.metalness = 0;
  return m;
}

// the same soft two-band toon light the cat skin wears, so hair and fur sit in one look
export function lighting(surface, lights, ctx) {
  const direct = lights.each((light) => {
    const ndl = clamp(dot(surface.normal, light.direction), 0, 1);
    const band = mix(float(0.3), float(0.85), smoothstep(-0.1, 0.7, ndl));
    return surface.albedo.mul(light.color).mul(band).mul(light.shadow);
  });
  return direct.add(surface.albedo.mul(lights.ambient.add(lights.environment)).mul(surface.occlusion).mul(0.45));
}
