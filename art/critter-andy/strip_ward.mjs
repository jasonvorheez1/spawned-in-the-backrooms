// Shelly #202602 "delete all the clothing were starting over": the old garments (~200k hidden verts) leave the body files, phones load only the body.
// Usage (beside node_modules): node strip_ward.mjs <in.glb> <out.glb>
const { NodeIO } = await import("@gltf-transform/core"); const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions"); const { prune } = await import("@gltf-transform/functions");
const { MeshoptDecoder, MeshoptEncoder } = await import("meshoptimizer"); await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const [, , src, out] = process.argv; const doc = await io.read(src); const W = /^(Ward_|Top_|Bot_|Shoes_|Hat_|Neck_|Eyew_)/;
for (const n of doc.getRoot().listNodes()) if (n.getMesh() && W.test(n.getMesh().getName())) n.dispose();
await doc.transform(prune());
let v = 0; const kept = []; for (const m of doc.getRoot().listMeshes()) { let c = 0; for (const p of m.listPrimitives()) c += p.getAttribute("POSITION").getCount(); v += c; kept.push(m.getName() + ":" + c); }
await io.write(out, doc); console.log("verts", v, kept.join(" "));
