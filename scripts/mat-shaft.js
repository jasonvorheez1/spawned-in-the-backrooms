// Additive soft skylight light shafts for The Bonus Room's central glass atrium.
// Cheap shaderpack cone lane: fresnel edge fade + vertical feather + soft depthFade so beams never clip hard into floors.
import {
  uv, normalWorld, positionWorld, cameraPosition, time, depthFade,
  float, vec2, vec3, dot, normalize, abs, pow, smoothstep, clamp, mx_noise_float,
} from "builtin/tsl";
import { MeshBasicNodeMaterial, AdditiveBlending, DoubleSide } from "builtin/three";

export function material(ctx) {
  const m = new MeshBasicNodeMaterial();
  const N = normalize(normalWorld);
  const V = normalize(cameraPosition.sub(positionWorld));
  const rim = pow(clamp(abs(dot(N, V)), 0, 1), 1.65);

  const v = uv().y;
  const topFade = smoothstep(0.98, 0.72, v);
  const botFade = smoothstep(0.0, 0.35, v);
  const shimmer = mx_noise_float(vec2(positionWorld.x.mul(0.35).add(time.mul(0.06)), positionWorld.z.mul(0.35))).mul(0.25).add(0.82);

  const col = vec3(1.0, 0.9, 0.96);
  const alpha = rim.mul(topFade).mul(botFade).mul(shimmer).mul(depthFade(1.2)).mul(ctx.param("alpha", 0.065));

  m.colorNode = col;
  m.opacityNode = alpha;
  m.transparent = true;
  m.depthWrite = false;
  m.blending = AdditiveBlending;
  m.side = DoubleSide;
  m.fog = false;
  return m;
}
