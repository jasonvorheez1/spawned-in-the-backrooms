// Slims and packs a fitted Andy body for phones: simplify (ratio, error), then sparse + quantize + meshopt (the packing that wore clean, Nov 11 07:52Z).
// Usage: node pack.mjs <in.glb> <out.glb> [ratio=.5] [error=.003]
const pkg = (n) => import(n);
const { NodeIO } = await pkg("@gltf-transform/" + "core");
const { ALL_EXTENSIONS } = await pkg("@gltf-transform/" + "extensions");
const { simplify, weld, sparse, quantize, meshopt } = await pkg("@gltf-transform/" + "functions");
const { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } = await pkg("mesh" + "optimizer");
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const [, , src, out, r = ".5", e = ".003"] = process.argv;
const doc = await io.read(src);
await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: +r, error: +e, lockBorder: true }), sparse(), quantize({ quantizePosition: 14 }), meshopt({ encoder: MeshoptEncoder }));
await io.write(out, doc);
let v = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) v += p.getAttribute("POSITION").getCount();
console.log("verts", v);
