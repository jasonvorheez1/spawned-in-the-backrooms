// Level 109's medical hardware as real models (Shelly Nov 14: nothing blocky). medLook(params) swaps a scripted
// l109-med-geo piece for its fitted model; parts with no model yet (curtain, sheet, tiles, cage, cooler…) keep their geometry.
// box = the old piece's own bounds in its frame (origin = floor point, or the wall-mount centre for wall pieces).
const C = "/cdn/value.";
export const KIT = {
  ivstand:  { id: C + "037765be9225249f337f40e3a58d665d7359a83ed4a9bbc387111c701d75672a.glb", min: [-0.31, 0, -0.28], max: [0.32, 1.98, 0.33] },
  alarm:    { id: C + "0642436528f7e6f358dc4e5c7ce72a6aba6fbfde2785a4b9656a1dcca465cdd6.glb", min: [-0.09, -0.11, -0.08], max: [0.09, 0.11, 0] },
  tube:     { id: C + "554efeb4612a4b4d06b3c9405006315a571782c5768b8378248046052cf2be8c.glb", min: [-0.2, 0, -0.12], max: [0.2, 0.55, 0] },
  monitor:  { id: C + "a3231523828f0f07ea0b1732309238753d3c5d22886fd369d758808b833e928a.glb", min: [-0.28, 0, -0.24], max: [0.28, 1.42, 0.29] },
  surglamp: { id: C + "7564276d71349c6284bed68cee5fc565b31212c2ba19a1d692b8a34144e401fb.glb", min: [-0.38, -0.1, -0.38], max: [0.67, 1.05, 0.38] },
  breaker:  { id: C + "98cc7a5e38b998052fe8227c519a305f173d1ae956e559356ebe72214dccef4c.glb", min: [-0.22, -0.28, -0.12], max: [0.22, 0.28, 0] },
  tray:     { id: C + "99451e590026b9da571c84ee9d02f5bea7838fe87ed38c7e8c39cb16ad371271.glb", min: [-0.27, 0, -0.21], max: [0.27, 1.02, 0.21] },
  terminal: { id: C + "e34cc1d9f7372ca63d2b282551192420c146db38efcf89c878263e2d3c5b52fc.glb", min: [-0.22, 0, -0.24], max: [0.22, 0.4, 0.16] },
  intercom: { id: C + "fe2c201f75c57783e3c55f8a618d0d81b05d619c58d31ede666f1b898babadd9.glb", min: [-0.11, -0.16, -0.05], max: [0.11, 0.16, 0] },
  cooler:   { id: C + "b292cf9727abf8dcaf2aa0e70b682b4d29c8d43ad722c29420ca75bf8af578a7.glb", fwd: "+x", min: [-0.17, 0, -0.17], max: [0.17, 1.12, 0.17] },
  gas:      { id: C + "5666003cb6446bc93b8df5e1bfeffbe58e17e407d523e0881097415c02f38b85.glb", min: [-0.27, 0, -0.19], max: [0.39, 1.42, 0.21] },
};
const v = ([x, y, z]) => ({ x, y, z });
// what a placement wears: { model, layout } for a kit part (a wall piece's model rides a child set down to its mount centre), else the old geometry
export function medLook(p, seed = 0) {
  const k = KIT[p.part];
  if (!k) return { primitive: { kind: "scripted", script: "scripts/l109-med-geo.js", params: p, seed } };
  const h = k.max[1] - k.min[1], look = { model: { id: k.id, forward: k.fwd ?? "+z" }, layout: { box: { min: v([k.min[0], 0, k.min[2]]), max: v([k.max[0], h, k.max[2]]) } } };
  return k.min[1] < 0 ? { children: [{ feetPosition: { x: 0, y: k.min[1], z: 0 }, ...look }] } : look;
}
