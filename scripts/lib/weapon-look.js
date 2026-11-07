// What a weapon looks like: its Tripo mesh (fitted in art/weapons/build.py to the old scripted weapon's frame:
// length along +Z, handle at the origin), or the scripted shape for a kind with no mesh (fists, anything new).
// offset y = the fitted mesh's lowest point, so the file's origin sits on the object's feet like the old geometry did.
// A variant ("crowbar~taped", scripts/lib/weapons.js) wears its base's body, a tint on the mesh, and its look drawn over it.
import W, { baseOf } from './weapons.js'
const MESH = { // kind: [model, offset y, scale, the mesh's material slot]
  table_leg:  ["/cdn/value.4aaf9c7c64978c958d23a7a8a6304f31accb3d391d52f3043893a6d990453b17.glb", 0.003, 0, "tripo_material_56fe44d9-5412-443c-9632-5e086b2d0eb9"],
  pipe_scrap: ["/cdn/value.c2acc9e5cc7bdb121a5f3b529386a19df1bf55cd5184137d85ddb57d1978f7d9.glb", -0.006, 0, "tripo_material_38b8e37f-c1cb-4f2c-995d-80f28638caf6"],
  crowbar:    ["/cdn/value.26a60582c956ed9c19efc83291207f82a25034b07e680abcc16ab6d45a6c39de.glb", 0.025, 0, "tripo_material_6333f5c1-aa76-413a-8dd2-d7483635f47f"],
  bat:        ["/cdn/value.b9230b65f07cc34951b4d05d221181af8b81a9c9ff633c17ee867660dc01d4a1.glb", 0.0, 0, "tripo_material_ed96b284-b120-41ec-a6e8-b5a6c27428df"],
  hatchet:    ["/cdn/value.d5b03aa12f7ca58bef143468cf20432b163cb8a0b43a9d4d72190c9228502761.glb", 0.012, 0, "tripo_material_be6f1bf1-a677-4411-ad71-24b6df60e92c"],
  fire_axe:   ["/cdn/value.4cfc50ea098875687d7a11fbd93a6b8adc191957807e0b002f30007a8eead02e.glb", 0.008, 0.62, "tripo_material_3cfa6f0b-ba20-4b5f-9185-3a08bf3967ed"],
  pistol:     ["/cdn/value.bd1a0ff99d2e34491523ee49853ebddcbe4ec10b685abfb66bab58f6db1cbb00.glb", -0.064, 0, "tripo_material_b831ab79-8033-43a9-83a4-7a26d07345fd"],
  shotgun:    ["/cdn/value.5a2a421d33cd848a6df5ae7bf263814fc33ed17392a1dca306d6006fc6b33c34.glb", -0.032, 0, "tripo_material_7b83893e-ced9-4331-b685-1a4a787052e6"],
};
export function weaponBody(kind) {
  const base = baseOf(kind), w = W[kind] ?? {}, m = MESH[base], look = w.look, short = look === 'sawn' ? 0.72 : 1
  const body = m
    ? { model: { id: m[0], offset: [0, m[1], 0] } }
    : { primitive: { kind: "scripted", script: "scripts/weapon-geo.js", params: { kind: base } }, ...(w.tint ? { material: { color: w.tint } } : {}) }
  const sc = m?.[2] || 1
  if (sc !== 1 || short !== 1) body.scale = { x: sc, y: sc, z: sc * short }
  // the look rides as a child in the weapon's own fitted frame, scaled with it
  if (look) body.children = [{ primitive: { kind: "scripted", script: "scripts/weapon-geo.js", params: { kind: base, look } }, castShadow: false }]
  return body
}
