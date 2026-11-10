// The furry body's Dandy shape (Shelly, Nov 9: "the furry models are awful"; refs: Dandy's World OC bases with a hint of a fluffy cat).
// The body GLB is compiled by the wardrobe pipeline (art/human-cloth/compile_wardrobe.py) with every garment fitted to it, so instead of
// rebuilding it this adds ONE morph target, "Dandy", to every mesh in it: the same smooth field moves skin and every garment alike, so clothes stay fitted.
// The joints do not move (the clips and the heads bind to them): limbs grow round about their own bones, nothing shortens.
//   legs: stubby soft noodles (thicker about each leg's axis, inner side eased so a skirt or crotch never crosses the middle), bean feet
//   arms: rounder noodle arms, mitten hands
//   hips: the wide female hip pulled in toward a bean torso
//   neck: the 4.6 cm stick filled out so the head sits on a body, not a pole
// Usage (gltf-transform + meshoptimizer installed): node dandy-morph.mjs <body.glb> <out.glb>
// an offline tool, not part of the game: its packages load at run time (npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer)
const pkg = (n) => import(n);
const { NodeIO } = await pkg("@gltf-transform/" + "core");
const { ALL_EXTENSIONS } = await pkg("@gltf-transform/" + "extensions");
const { dequantize, quantize, meshopt, sparse } = await pkg("@gltf-transform/" + "functions");
const { MeshoptDecoder, MeshoptEncoder } = await pkg("mesh" + "optimizer");
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const [, , src, out] = process.argv;
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) };
const LX = 0.09, SHY = 0.955; // leg axis x, shoulder/arm axis height (glTF: y up)
// monotonic remap of |x| that thickens a limb about the axis at a0 by k, without crossing 0
const thick = (ax, a0, k) => ax >= a0 ? a0 + (ax - a0) * k : ax + ((k - 1) / a0) * ax * (ax - a0);
export function field(x, y, z, mesh = "") {
  let X = x, Y = y, Z = z; const s = x < 0 ? -1 : 1;
  // hips: pull the widest part in (bean torso, not an hourglass)
  { const w = Math.exp(-(((y - 0.63) / 0.085) ** 2)) * (1 - sm(0.2, 0.34, Math.abs(X))); X *= 1 - 0.13 * w }
  // legs: round and soft, thickest at the shin, feet a bean
  { const legW = 1 - sm(0.52, 0.64, y), ax = Math.abs(X)
    if (legW > 0 && ax < 0.3) {
      const k = 1 + legW * (0.26 + 0.1 * sm(0.45, 0.2, y)) + 0.14 * sm(0.14, 0.06, y)
      X = s * thick(ax, LX, k); Z = Z * k
    } }
  // arms: rounder, mitten hands
  { const ax = Math.abs(X), near = 1 - sm(0.16, 0.24, Math.abs(y - SHY)), on = sm(0.15, 0.24, ax) * near
    if (on > 0) { const k = 1 + on * (0.2 + 0.2 * sm(0.48, 0.55, ax)); Y = SHY + (Y - SHY) * k; Z = Z * k } }
  // neck: fill it out, between the neck joint (1.0) and just over the Head bone (1.06); unbounded above, it widened every hat and pair of glasses 42% at the middle (Nov 10)
  { const w = sm(0.95, 1.0, y) * (1 - sm(1.08, 1.14, y)) * (1 - sm(0.09, 0.14, Math.abs(X)))
    if (w > 0) { const k = 1 + 0.42 * w; X *= k; Z *= k } }
  // headphones (two cups, no band) were fitted to a human head and sat buried inside every furry skull (half-width up to 0.38 here): cups out 9 cm, snug on the wide skulls and only a little off the narrow ones (Nov 10)
  if (/headphones/i.test(mesh)) X += s * 0.09 * sm(0.15, 0.22, Math.abs(x));
  return [X, Y, Z];
}
const doc = await io.read(src);
await doc.transform(dequantize());
let n = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  const names = [...(mesh.getExtras()?.targetNames ?? [])];
  if (names.includes("Dandy")) continue;
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION"), cnt = pos.getCount(), d = new Float32Array(cnt * 3), v = [0, 0, 0];
    for (let i = 0; i < cnt; i++) { pos.getElement(i, v); const f = field(v[0], v[1], v[2], mesh.getName()); d[i * 3] = f[0] - v[0]; d[i * 3 + 1] = f[1] - v[1]; d[i * 3 + 2] = f[2] - v[2] }
    const acc = doc.createAccessor().setType("VEC3").setArray(d).setBuffer(pos.getBuffer());
    const t = doc.createPrimitiveTarget("Dandy").setAttribute("POSITION", acc); // gltf-transform writes targetNames from the targets' own names
    // every target in a mesh carries the same attribute set (glTF rule): a target with normals gets zero normal deltas
    const other = prim.listTargets()[0];
    if (other) for (const sem of other.listSemantics()) if (sem !== "POSITION") t.setAttribute(sem, doc.createAccessor().setType("VEC3").setArray(new Float32Array(cnt * 3)).setBuffer(pos.getBuffer()));
    prim.addTarget(t);
  }
  mesh.setExtras({ ...(mesh.getExtras() ?? {}), targetNames: [...names, "Dandy"] });
  mesh.setWeights([...mesh.getWeights(), 0]); n++;
}
await doc.transform(sparse({ ratio: 1 / 3 }), quantize({ quantizePosition: 14, quantizeNormal: 10 }), meshopt({ encoder: MeshoptEncoder, level: "high" }));
await io.write(out, doc);
console.log("Dandy target on", n, "meshes");
