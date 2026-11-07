// Spawn 3D Modeling Studio: one root at the dais centre. the canvas, pedestal and shelf are its children;
// studio.js on the root shows world.state.m3d (pictures on the canvas, models on the pedestal and shelf).
const STAGE = "mods/modeling-studio/lib/stage.js";
const spot = (y) => ({ feetPosition: { x: -0.9, y: y + 0.45, z: -0.3 }, light: { kind: "spot", color: "oklch(0.9 0.07 75)", intensity: 3, distance: 3, angle: 55, penumbra: 0.6, aim: { x: -1.9, y, z: -0.3 } } });
export const studio = {
  feetPosition: { x: 0, y: 0, z: 6 },
  tags: ["modeling-studio"],
  behavior: "mods/modeling-studio/studio.js",
  primitive: { kind: "scripted", script: STAGE, params: { part: "dais", r: 2.8 } },
  receiveShadow: true,
  children: [
    { id: "frame", feetPosition: { x: 0.2, y: 1.6, z: -1.85 }, primitive: { kind: "scripted", script: STAGE, params: { part: "frame" } }, castShadow: true },
    { id: "canvas", feetPosition: { x: 0.2, y: 2.16, z: -1.805 }, primitive: { kind: "plane", width: 1.68, height: 1.12 }, anchor: "center", pivot: "center", material: { color: "oklch(0.93 0.01 250)", roughness: 0.9, emissive: "oklch(1 0 0)", emissiveIntensity: 0.12 } },
    { id: "pedestal", feetPosition: { x: 1.35, y: 0, z: -1.2 }, primitive: { kind: "scripted", script: STAGE, params: { part: "pedestal" } }, physics: "static", castShadow: true, receiveShadow: true },
    { id: "pedestal-light", feetPosition: { x: 1.35, y: 1.9, z: -1 }, light: { kind: "point", color: "oklch(0.85 0.1 40)", intensity: 1.2, distance: 3 } },
    { id: "shelf", feetPosition: { x: -1.78, y: 0, z: -0.3 }, primitive: { kind: "scripted", script: "mods/modeling-studio/lib/shelf.js" }, physics: "static", castShadow: true, receiveShadow: true },
    { id: "shelf-light-0", ...spot(0.12) },
    { id: "shelf-light-1", ...spot(0.77) },
    { id: "shelf-light-2", ...spot(1.42) },
  ],
};
