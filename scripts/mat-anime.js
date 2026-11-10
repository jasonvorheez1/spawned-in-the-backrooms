// Anime shading for the human characters (Shelly, Nov 9: "anime styled characters ... DO NOT make them ugly"). The standard material lit skin like clay:
// muddy in the Backrooms' yellow light, grey in shadow. This is a drawn look that holds under any light: the lamp only moves the colour a little
// (a face never goes black on its dark side, and never blotches where a low mesh turns from the light), shadow is a warm tint of the colour itself,
// a thin rim of light sits on the edge facing away, and hair wears a band of shine that slides round the head as the camera moves (the "angel ring").
// params: { kind: "skin" | "hair" | "cloth", lift?: 0..1, cel?: 0|1 } · the material's colour (the look's skin / hair hex, times the body's own texture) is the base.
import { materialColor, normalWorld, positionWorld, cameraPosition, vec3, float, dot, normalize, pow, smoothstep, mix, max, saturate } from "builtin/tsl";
import { MeshToonNodeMaterial, MeshLambertNodeMaterial } from "builtin/three";

export function material(ctx) {
  const kind = String(ctx.params.kind ?? "skin");
  const cel = Number(ctx.params.cel ?? (kind === "skin" ? 0 : 1)) > 0; // skin takes a soft turn (no hard shadow shapes across a face); hair and cloth take the cel step
  const m = cel ? new MeshToonNodeMaterial() : new MeshLambertNodeMaterial();
  const lift = Number(ctx.params.lift ?? (kind === "skin" ? 0.46 : kind === "hair" ? 0.34 : 0.3));
  const base = materialColor, N = normalize(normalWorld), V = normalize(cameraPosition.sub(positionWorld));
  const ndv = saturate(dot(N, V)), fres = pow(float(1).sub(ndv), 3.0);
  let col = base;
  if (kind === "hair") {
    // the shine band: where the surface faces a point above and a little toward the eye
    const h = dot(N, normalize(vec3(0, 1, 0).add(V.mul(0.6))));
    const band = smoothstep(0.46, 0.56, h).mul(float(1).sub(smoothstep(0.66, 0.8, h)));
    col = base.add(base.mul(1.2).add(vec3(0.16, 0.15, 0.17)).mul(band.mul(0.55)));
    col = col.mul(float(0.8).add(ndv.mul(0.26))); // locks darken toward the silhouette, so the mass reads as a shape with depth
  }
  // the lamp's share: what is left after the lift, so a lit cheek lands near the colour itself and not past it
  m.colorNode = col.mul(float(1).sub(lift).mul(0.82));
  // shadows: never black. skin keeps a warm rose in the dark side, hair and cloth a cooler share of themselves
  const shade = kind === "skin" ? col.mul(vec3(1.0, 0.86, 0.84)) : col.mul(vec3(0.9, 0.9, 1.0));
  const rim = fres.mul(kind === "skin" ? 0.16 : 0.24);
  m.emissiveNode = shade.mul(lift).add(vec3(1, 0.96, 0.9).mul(rim).mul(max(base.r, max(base.g, base.b)).mul(0.6).add(0.2)));
  return m;
}
