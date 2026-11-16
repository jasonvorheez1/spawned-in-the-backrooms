// Every lit surface in this world is shaded by this one function. The engine hands it the surface
// and the lights that reach it — the sun with its shadow, every placed light with its falloff and
// shadow, the sky's ambient — and takes back a color. This file is the standard model (Cook-Torrance
// GGX + Lambert, the math a PBR engine runs). Edit a line and every surface follows; delete one and
// see what it did. Toon, flat, hatching: the "looks" skill shows each as a few edits of this file.
import { dot, max, min, mix, normalize, pow, clamp, float, vec3, oneMinus, smoothstep, PI, mx_noise_float } from "builtin/tsl";
import { wet } from "builtin/lighting";

export function lighting(surface, lights) {
  const { normal: N, view: V, roughness, metalness, position: P } = surface;
  // wear (Shelly Nov 12 "feel realistic"): two octaves of world-space noise shade every surface a few percent lighter or darker,
  // so a tiled texture never repeats the same patch twice and broad walls read as aged, not printed
  const wear = mx_noise_float(P.mul(0.35)).mul(0.6).add(mx_noise_float(P.mul(1.7)).mul(0.4));
  const wetMask = wet.mul(smoothstep(0.35, 0.9, N.y));
  const baseAlbedo = surface.albedo.mul(wear.mul(0.13).add(0.985));
  const albedo = mix(baseAlbedo, baseAlbedo.mul(0.72), wetMask.mul(0.65));
  // micro-roughness breakup from the same noise (zero extra noise taps) + glossy slickness on wet upward faces
  const microR = clamp(roughness.add(wear.mul(0.09).sub(0.03)), 0.04, 0.99);
  const rSurf = mix(microR, min(microR, float(0.14)), wetMask);
  // f0: how much a surface reflects head-on — 4% for anything that is not metal, its own color for metal (boosted slightly when wet).
  const dielec = mix(float(0.04), float(0.07), wetMask);
  const f0 = mix(vec3(dielec, dielec, dielec), albedo, metalness);
  const NdotV = max(dot(N, V), 1e-4);

  // One call per light that reaches this point. light.direction points at the light; light.radiance is
  // its color × intensity after falloff and shadow (light.color and light.shadow are the two halves);
  // light.specular is the share of it the highlight takes (1 unless the light sets less).
  const direct = lights.each((light) => {
    const L = light.direction;
    const NdotL = max(dot(N, L), 0);
    const H = normalize(V.add(L));
    const NdotH = max(dot(N, H), 0);
    // D — how tight the highlight is (GGX).
    const a = rSurf.mul(rSurf);
    const a2 = a.mul(a);
    const d = NdotH.mul(NdotH).mul(a2.sub(1)).add(1);
    const D = a2.div(max(PI.mul(d).mul(d), 1e-6));
    // G — the microfacets shadowing each other (Smith).
    const r = rSurf.add(1);
    const k = r.mul(r).div(8);
    const G = NdotV.div(NdotV.mul(oneMinus(k)).add(k)).mul(NdotL.div(NdotL.mul(oneMinus(k)).add(k)));
    // F — more reflection at grazing angles (Schlick).
    const F = f0.add(oneMinus(f0).mul(pow(clamp(oneMinus(max(dot(H, V), 0)), 0, 1), 5)));
    const specular = D.mul(G).mul(F).div(max(float(4).mul(NdotV).mul(NdotL), 1e-4));
    // What fresnel did not reflect scatters as diffuse; metal has no diffuse.
    const diffuse = oneMinus(F).mul(oneMinus(metalness)).mul(albedo).div(PI);
    return diffuse.add(specular.mul(light.specular)).mul(light.radiance).mul(NdotL);
  });

  // Roughness-aware Fresnel for environment & hemisphere ambient: crisp grazing reflections on marble, chrome, glass and wet stone,
  // directional ceiling-vs-floor ambient grounding, and energy-conserved diffuse (keeping an ambient specular term so indoor metals never go black).
  const smoothness = oneMinus(rSurf);
  const envFresnel = f0.add(max(vec3(smoothness, smoothness, smoothness), f0).sub(f0).mul(pow(clamp(oneMinus(NdotV), 0, 1), 5)));
  const hemi = clamp(N.y.mul(0.18).add(0.88), 0.72, 1.04);
  const ambientDiffuse = albedo.mul(oneMinus(metalness)).mul(oneMinus(envFresnel)).mul(hemi).mul(lights.ambient).mul(1 / Math.PI);
  const envSpec = envFresnel.mul(oneMinus(rSurf.mul(0.35))).mul(lights.ambient.mul(0.38 / Math.PI).add(lights.environment));
  return direct.add(ambientDiffuse.add(envSpec).mul(surface.occlusion));
}
