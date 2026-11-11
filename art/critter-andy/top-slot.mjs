import { NodeIO } from "@gltf-transform/core"; import { ALL_EXTENSIONS } from "@gltf-transform/extensions"; import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer"; await MeshoptDecoder.ready; await MeshoptEncoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder })
const d = await io.read(process.argv[2]); const R = d.getRoot();
const TOP = /^(Top_|Ward_)(tee|tank|longsleeve|shirt|officeshirt|jerrytee|sweater|hoodie|gmhoodie|pghoodie|pphoodie|jacket|megjacket|padjacket|pajamas|dress|apron|vest|blazer|coat|robe|poncho|seawatchsuit|plate|pinstripe|bellhop|tailcoat|oilskin|opera|hauberk|cardigan|polo|turtleneck|crop|uniform|suit|labcoat|parka|windbreaker|tracktop|flannel|gown|hotelrobe|maidapron|pgcoat|chitinplate|abysshauberk)/i;
const hat = R.listMaterials().find(m => m.getName() === "cloth_hat"); let top = R.listMaterials().find(m => m.getName() === "cloth_top");
if (!top) { top = hat.clone().setName("cloth_top") }
let n = 0; const names = new Set();
for (const m of R.listMeshes()) if (TOP.test(m.getName())) for (const p of m.listPrimitives()) if (p.getMaterial() === hat) { p.setMaterial(top); n++; names.add(m.getName()) }
const left = R.listMeshes().filter(m => m.listPrimitives().some(p => p.getMaterial() === hat)).map(m => m.getName());
console.log("moved", n, [...names].join(","), "\nstill hat:", left.join(","));
await io.write(process.argv[3], d)
