// The catalog card: Savi in the director chair on a chaotic film set.
// The picture rides the camera itself (attach: "camera"), so it fills the shot whatever rig the world's camera runs.
const IMG = "/cdn/value.75d1b6a98df4f75e3398c541aec3b9f2298a3bade3f0069587206b2ffde1db63.png"; // 1536×1024
const DEPTH = 1, FOV = 40;
const H = 2 * DEPTH * Math.tan((FOV * Math.PI) / 360) * 1.02, W = H * 1.5;
if (typeof ctx !== "undefined") {
  ctx.emit("preload", { refs: [IMG] }, { audience: "all" });
  ctx.view.camera = { eye: { x: 0, y: 1.7, z: 0 }, aim: { x: 0, y: 1.7, z: -5 }, fov: FOV };
  ctx.spawn({ id: "ds-card", feetPosition: { attach: "camera", x: 0, y: 0, depth: DEPTH }, primitive: { kind: "plane", width: W, height: H }, anchor: "center", pivot: "center", material: { color: "#ffffff", texture: IMG, emissive: "#ffffff", emissiveMap: IMG, emissiveIntensity: 1, roughness: 1, toneMapped: false }, castShadow: false, receiveShadow: false, physics: "none" });
}
