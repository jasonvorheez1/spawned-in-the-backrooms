// the catalog card: stills from the creator's own clips, sliders in frame, hung before the lens
// Oct 28 creator "feelsgoodrig still has that weird pic": the film caught the skyline before the picture loaded. A dark backdrop fills
// the whole frame and a drawn title sits under the picture, so the first frame is the rig card whether the picture is in or not
const IMG = "/cdn/value.0867b6e6110812b3cb6245fbc88f68956305136eedcf3625ed5af20ecc4f481c.png"; // Nov 9 creator: "update the mod's card shot to the feels good rig pic" (title is in the picture)
const P = { x: 0, y: 500, z: 0 };
ctx.spawn({ id: "fgr-card-back", feetPosition: { x: P.x, y: P.y, z: P.z - 0.4 }, primitive: { kind: "plane", width: 80, height: 40 }, anchor: "center", pivot: "center", material: { color: "oklch(0.17 0.02 285)", emissive: "oklch(0.17 0.02 285)", emissiveIntensity: 1, roughness: 1 }, castShadow: false });
ctx.spawn({ id: "fgr-card", feetPosition: P, primitive: { kind: "plane", width: 16, height: 10.667 }, anchor: "center", pivot: "center", material: { texture: IMG, color: "oklch(1 0 0)", emissive: "oklch(1 0 0)", emissiveMap: IMG, emissiveIntensity: 1, roughness: 1 }, castShadow: false });
ctx.view.camera = { eye: { x: P.x, y: P.y, z: P.z + 12.9 }, aim: { x: P.x, y: P.y, z: P.z }, fov: 45 };
