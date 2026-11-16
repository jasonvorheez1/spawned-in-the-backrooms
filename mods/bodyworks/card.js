// The catalog card: the painted three-stage fitting picture (bare → top → full gear) on a lit board, filmed straight on.
// The card's first frame is its cover, so the board stands right in front of the copy's default eye (origin, looking −Z)
// and the camera is set before anything else: the cover shows the board even if the camera lands a frame late.
const IMG = "/cdn/value.6afba0202f67b02b4a8b16f0b23c40762fce99a46b7fa4e70e315c751f6c4fe8.png";
const W = 6, H = 4, FOV = 40; // picture is 1536×1024
const D = (H / 2) / Math.tan((FOV * Math.PI) / 360) * 0.92; // a hair closer so the board fills the 16:9 height
const Y = 1.7;
if (typeof ctx !== "undefined") {
  ctx.emit("preload", { refs: [IMG] }, { audience: "all" });
  ctx.view.camera = { eye: { x: 0, y: Y, z: 0 }, aim: { x: 0, y: Y, z: -D }, fov: FOV };
  ctx.spawn({ id: "bw-card", feetPosition: { x: 0, y: Y, z: -D }, primitive: { kind: "plane", width: W, height: H }, anchor: "center", pivot: "center", material: { color: "#d9d6d1", texture: IMG, emissive: "#ffffff", emissiveMap: IMG, emissiveIntensity: 1, roughness: 1 }, castShadow: false, receiveShadow: false, physics: "none" });
  ctx.spawn({ id: "bw-card-back", feetPosition: { x: 0, y: Y, z: -D - 0.05 }, primitive: { kind: "plane", width: 60, height: 40 }, anchor: "center", pivot: "center", material: { color: "#d9d6d1", emissive: "#d9d6d1", emissiveIntensity: 1 }, physics: "none" });
}
