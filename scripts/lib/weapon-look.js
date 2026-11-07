// What a weapon looks like: its Tripo mesh (fitted in art/weapons/build.py to the old scripted weapon's frame:
// length along +Z, handle at the origin), or the scripted shape for a kind with no mesh (fists, anything new).
// offset y = the fitted mesh's lowest point, so the file's origin sits on the object's feet like the old geometry did.
const MESH = {
  table_leg:  ["/cdn/value.4aaf9c7c64978c958d23a7a8a6304f31accb3d391d52f3043893a6d990453b17.glb", 0.003],
  pipe_scrap: ["/cdn/value.c2acc9e5cc7bdb121a5f3b529386a19df1bf55cd5184137d85ddb57d1978f7d9.glb", -0.006],
  crowbar:    ["/cdn/value.26a60582c956ed9c19efc83291207f82a25034b07e680abcc16ab6d45a6c39de.glb", 0.025],
  bat:        ["/cdn/value.b9230b65f07cc34951b4d05d221181af8b81a9c9ff633c17ee867660dc01d4a1.glb", 0.0],
  hatchet:    ["/cdn/value.d5b03aa12f7ca58bef143468cf20432b163cb8a0b43a9d4d72190c9228502761.glb", 0.012],
  fire_axe:   ["/cdn/value.4cfc50ea098875687d7a11fbd93a6b8adc191957807e0b002f30007a8eead02e.glb", 0.008, 0.62],
  pistol:     ["/cdn/value.bd1a0ff99d2e34491523ee49853ebddcbe4ec10b685abfb66bab58f6db1cbb00.glb", -0.064],
  shotgun:    ["/cdn/value.5a2a421d33cd848a6df5ae7bf263814fc33ed17392a1dca306d6006fc6b33c34.glb", -0.032],
};
export function weaponBody(kind) {
  const m = MESH[kind];
  return m ? { model: { id: m[0], offset: [0, m[1], 0] }, ...(m[2] ? { scale: m[2] } : {}) } : { primitive: { kind: "scripted", script: "scripts/weapon-geo.js", params: { kind } } };
}
