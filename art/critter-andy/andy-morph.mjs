// The critter body toward Eclipsed Andy (Shelly #175181, "use these as reference for furry characters"; Nov 11 yes #198456 after "body and face first").
// Adds ONE morph target, "Andy", on top of "Dandy" to every mesh of the body GLB (skin and every garment), so clothes keep their fit.
// Worked in world metres: world = 0.625 * raw + (0, 0.583, -0.002) (the skin's bind), joints never move.
//   torso: a chunkier bean, a soft belly out front; arms: thick rubber-hose limbs, bigger mitten paws; legs: thick soft thighs, wide bean feet
// Usage: node andy-morph.mjs <body-with-Dandy.glb> <out.glb>   (gltf-transform + meshoptimizer in node_modules)
const pkg = (n) => import(n);
const { NodeIO } = await pkg("@gltf-transform/" + "core");
const { ALL_EXTENSIONS } = await pkg("@gltf-transform/" + "extensions");
const { dequantize, quantize, meshopt, sparse } = await pkg("@gltf-transform/" + "functions");
const { MeshoptDecoder, MeshoptEncoder } = await pkg("mesh" + "optimizer");
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const [, , src, out] = process.argv;
const S = 0.625, OY = 0.583, OZ = -0.002;
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) };
const bump = (a, b, c, d, x) => sm(a, b, x) * (1 - sm(c, d, x));
const LX = 0.09, SHY = 0.955;
const thick = (ax, a0, k) => ax >= a0 ? a0 + (ax - a0) * k : ax + ((k - 1) / a0) * ax * (ax - a0); // grows about a0, never crosses 0
export function field(x, y, z, mesh = "") {
  let X = x, Y = y, Z = z; const s = x < 0 ? -1 : 1, ax = Math.abs(x);
  const armZone = sm(0.13, 0.19, ax) * bump(0.8, 0.86, 1.08, 1.14, y);
  // torso: wider, deeper, belly forward (front is -Z)
  { const w = bump(0.56, 0.64, 0.93, 1.0, y) * (1 - armZone)
    if (w > 0) { const kx = 1 + 0.2 * w, kz = 1 + 0.24 * w; X *= kx; Z *= kz
      const belly = Math.exp(-(((y - 0.72) / 0.1) ** 2)) * w; if (Z < 0) Z -= 0.03 * belly * sm(0, -0.05, z) } }
  // arms: thicker about the arm axis, paws a little more
  if (armZone > 0) { const k = 1 + armZone * (0.32 + 0.12 * sm(0.46, 0.56, ax)); Y = SHY + (Y - SHY) * k; Z = Z * k
    X = s * (ax + armZone * 0.02 * sm(0.5, 0.6, ax)) }
  // legs: soft thick thighs tapering to the ankle, bean feet wider and longer
  { const legW = 1 - sm(0.56, 0.66, y)
    if (legW > 0 && ax < 0.32) {
      const k = 1 + legW * (0.26 + 0.16 * sm(0.25, 0.5, y)) + 0.12 * sm(0.13, 0.05, y)
      X = s * thick(ax, LX, k); Z = Z * k
      if (y < 0.1) Z += (Z < 0 ? -0.025 : 0.01) * sm(0.1, 0.03, y) } }
  return [X, Y, Z];
}
const doc = await io.read(src);
await doc.transform(dequantize());
let n = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  const names = [...(mesh.getExtras()?.targetNames ?? [])];
  if (names.includes("Andy")) continue;
  const di = names.indexOf("Dandy");
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION"), dt = di >= 0 ? prim.listTargets()[di]?.getAttribute("POSITION") : null, cnt = pos.getCount(), d = new Float32Array(cnt * 3), v = [0, 0, 0], e = [0, 0, 0];
    for (let i = 0; i < cnt; i++) {
      pos.getElement(i, v); if (dt) { dt.getElement(i, e); v[0] += e[0]; v[1] += e[1]; v[2] += e[2] }
      const wx = v[0] * S, wy = v[1] * S + OY, wz = v[2] * S + OZ, f = field(wx, wy, wz, mesh.getName());
      d[i * 3] = (f[0] - wx) / S; d[i * 3 + 1] = (f[1] - wy) / S; d[i * 3 + 2] = (f[2] - wz) / S
    }
    const acc = doc.createAccessor().setType("VEC3").setArray(d).setBuffer(pos.getBuffer());
    const t = doc.createPrimitiveTarget("Andy").setAttribute("POSITION", acc);
    const other = prim.listTargets()[0];
    if (other) for (const sem of other.listSemantics()) if (sem !== "POSITION") t.setAttribute(sem, doc.createAccessor().setType("VEC3").setArray(new Float32Array(cnt * 3)).setBuffer(pos.getBuffer()));
    prim.addTarget(t);
  }
  mesh.setExtras({ ...(mesh.getExtras() ?? {}), targetNames: [...names, "Andy"] });
  mesh.setWeights([...mesh.getWeights(), 0]); n++;
}
await doc.transform(sparse({ ratio: 1 / 3 }), quantize({ quantizePosition: 14, quantizeNormal: 10 }), meshopt({ encoder: MeshoptEncoder, level: "high" }));
await io.write(out, doc);
console.log("Andy target on", n, "meshes");
