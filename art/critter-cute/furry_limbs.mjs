// Species with dark limbs (panda, red panda) never showed them: the furry body files had no `limb` material on any mesh, so critter-model.js's limb colour
// had nothing to paint. The arm, hand, foot, shin, lower-thigh and shoulder skin pieces move to a `limb` material (same look as `fur` until a species sets a limb colour).
// Usage (outside the tree, gltf-transform installed): node furry_limbs.mjs in.glb out.glb
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune, meshopt } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import fs from 'node:fs'
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready])
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(process.argv[2]), root = doc.getRoot()
const fur = root.listMaterials().find((m) => m.getName() === 'fur')
const limb = fur.clone().setName('limb')
const PARTS = /^Skin_(upperarms|forearms|hands|feet|shin_hi|shin_low|thigh_low)(\.\d+)?$/
let n = 0
for (const nd of root.listNodes()) if (nd.getMesh() && PARTS.test(nd.getName())) for (const p of nd.getMesh().listPrimitives()) if (p.getMaterial() === fur) { p.setMaterial(limb); n++ }
console.log('primitives moved to limb', n)
await doc.transform(prune({ keepAttributes: true, keepLeaves: true }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
fs.writeFileSync(process.argv[3], await io.writeBinary(doc))
