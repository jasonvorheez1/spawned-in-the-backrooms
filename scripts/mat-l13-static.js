// Level 13's television snow: a CRT's coarse grey-blue static with scanlines and a slow rolling band. No texture, no params.
import { uv, time, vec2, vec3, floor, fract, sin, dot, mix, smoothstep, length } from "builtin/tsl";
import { MeshStandardNodeMaterial } from "builtin/three";
export function material(ctx) {
  const m = new MeshStandardNodeMaterial();
  const p = uv(), g = floor(p.mul(vec2(110, 82))), t = floor(time.mul(20));
  const n = fract(sin(dot(g.add(t.mul(vec2(7.13, 3.71))), vec2(12.9898, 78.233))).mul(43758.5453));
  const roll = smoothstep(0.0, 0.14, fract(p.y.add(time.mul(0.21)))).mul(0.4).add(0.6);
  const line = sin(p.y.mul(82 * 3.14159)).mul(0.14).add(0.86);
  const vig = smoothstep(0.78, 0.25, length(p.sub(0.5))).mul(0.65).add(0.35);
  m.colorNode = vec3(0.01, 0.012, 0.016);
  m.emissiveNode = mix(vec3(0.04, 0.06, 0.1), vec3(0.72, 0.84, 1.0), n.mul(0.85).add(0.08)).mul(roll).mul(line).mul(vig).mul(1.5);
  m.roughness = 0.25;
  return m;
}
