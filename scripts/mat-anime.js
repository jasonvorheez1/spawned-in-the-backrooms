// Realistic-anime shading for the human characters (Shelly, Nov 10: "retexture all of them ... realistic-anime").
// Still a drawn look that holds under the Backrooms' yellow light (no clay faces, no black dark side), but with real-material cues:
// skin: a soft wrap with warm subsurface red where light turns away, a faint oily sheen, pores; cloth: woven thread, soft fold shading, a fabric sheen at grazing angles;
// hair: the shine band (the "angel ring") over strand streaks.
// params: { kind: "skin" | "hair" | "cloth", lift?: 0..1 } · the material's colour (the look's skin / hair / cloth hex) is the base.
import { uv, materialColor, normalWorld, positionWorld, positionGeometry, cameraPosition, vec3, float, dot, normalize, pow, smoothstep, max, saturate, mx_noise_float, mx_fractal_noise_float, abs, sin } from "builtin/tsl";
import { MeshStandardNodeMaterial } from "builtin/three";

export function material(ctx) {
  const kind = String(ctx.params.kind ?? "skin");
  const m = new MeshStandardNodeMaterial();
  const lift = Number(ctx.params.lift ?? (kind === "skin" ? 0.16 : kind === "hair" ? 0.5 : 0.22));
  const base = materialColor, N = normalize(normalWorld), V = normalize(cameraPosition.sub(positionWorld));
  const ndv = saturate(dot(N, V)), fres = pow(float(1).sub(ndv), 3.0);
  const g = positionGeometry;
  let col = base, glow = vec3(0, 0, 0);
  if (kind === "skin") {
    const pores = mx_noise_float(g.mul(420)).mul(0.5).add(0.5), mottle = mx_fractal_noise_float(g.mul(9)).mul(0.5).add(0.5);
    col = base.mul(float(0.95).add(pores.mul(0.05))).mul(vec3(1.0, float(0.97).add(mottle.mul(0.03)), float(0.96).add(mottle.mul(0.04))));
    // subsurface: the edge that turns away from the eye flushes warm, as light through a cheek or a knuckle does
    const sss = smoothstep(0.15, 0.75, float(1).sub(ndv)).mul(smoothstep(1.0, 0.85, float(1).sub(ndv)));
    glow = base.mul(vec3(0.85, 0.5, 0.42)).mul(sss).mul(0.12).add(base.mul(vec3(0.1, 0.03, 0.0))); // a living warmth under even the palest skin
    m.roughness = 0.52; m.metalness = 0;
  } else if (kind === "hair") {
    const h = dot(N, normalize(vec3(0, 1, 0).add(V.mul(0.6))));
    const band = smoothstep(0.46, 0.56, h).mul(float(1).sub(smoothstep(0.66, 0.8, h)));
    const streak = mx_noise_float(g.mul(vec3(90, 6, 90))).mul(0.5).add(0.5);
    col = base.mul(float(0.82).add(streak.mul(0.22)));
    if (ctx.params.tex) { // the hair file's own strand map: its alpha cuts each card into strands, its grey is the strand shading (Nov 10: shards were cards drawn solid)
      const t = ctx.texture(String(ctx.params.tex)).sample(uv());
      const lum = t.r.mul(0.3).add(t.g.mul(0.59)).add(t.b.mul(0.11));
      col = base.mul(float(0.55).add(lum.mul(0.65)));
      m.opacityNode = t.a; m.alphaTest = 0.35; m.transparent = false; m.side = 2;
    }
    col = col.add(base.mul(1.1).add(vec3(0.14, 0.13, 0.15)).mul(band.mul(0.5)));
    // no per-face view darkening: on thin two-sided strands it lit each strand apart, the shards look
    m.roughness = 0.8; m.metalness = 0;
  } else { // cloth
    const u = g.x.add(g.z.mul(0.7)), v = g.y;
    const weave = abs(sin(u.mul(320))).mul(0.5).add(abs(sin(v.mul(320))).mul(0.5));
    const fuzz = mx_noise_float(g.mul(260)).mul(0.5).add(0.5);
    const folds = mx_fractal_noise_float(g.mul(vec3(7, 3.5, 7))).mul(0.5).add(0.5); // soft creases, long down the body
    col = base.mul(float(0.88).add(weave.mul(0.08)).add(fuzz.mul(0.06))).mul(float(0.82).add(smoothstep(0.25, 0.75, folds).mul(0.22)));
    glow = base.mul(0.5).add(vec3(0.18, 0.17, 0.16)).mul(fres).mul(0.22); // fabric sheen at grazing angles
    m.roughness = 0.88; m.metalness = 0;
  }
  m.colorNode = kind === "skin" ? col.mul(vec3(0.97, 0.88, 0.8)).mul(float(1).sub(lift).mul(0.95)) : col.mul(float(1).sub(lift).mul(0.9)); // skin carries a little blood warmth in its albedo: pale picks read peach, not grey-white
  const shade = kind === "skin" ? col.mul(vec3(1.0, 0.8, 0.7)) : col.mul(vec3(0.92, 0.92, 1.0));
  const rim = fres.mul(kind === "skin" ? 0.04 : kind === "hair" ? 0.0 : 0.12); // a rim on every strand edge outlined the shards
  const rimCol = kind === "skin" ? base.mul(vec3(1.1, 0.7, 0.55)) : vec3(1, 0.96, 0.9); // skin rims in its own blood-warm tone, never white
  m.emissiveNode = shade.mul(lift).add(glow).add(rimCol.mul(rim).mul(max(base.r, max(base.g, base.b)).mul(0.6).add(0.2)));
  return m;
}
