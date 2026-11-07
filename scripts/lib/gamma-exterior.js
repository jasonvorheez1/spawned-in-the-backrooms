// Base Gamma's fortress face in Level 3: laid once by places/level3/sim.js (place.state.gammaExtV !== 1).
// The brick wall mesh, the great rusty white door (the level-door to "gamma"), its lit plate, two floodlights and a tower lamp.
export const GATE = { x: -44, z: -11.0 };
export function layGammaExterior(ctx) {
  const s = ctx.place.state, { x, z } = GATE;
  ctx.spawn("gamma-fortress", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/gamma-fortress-geo.js" }, material: { roughness: 0.9, pbr: true } });
  ctx.spawn("gamma-gate-door", { feetPosition: { x, y: 0, z }, rotation: { yaw: 180 }, physics: { body: "static", collider: "mesh" }, primitive: { kind: "scripted", script: "scripts/gamma-door-geo.js", params: { w: 2.4, h: 2.5, seal: true } }, material: { roughness: 0.7, pbr: true } });
  ctx.spawn("l3-gamma-door", { tags: ["door"], feetPosition: { x, y: 0, z: z + 0.6 }, rotation: { yaw: 180 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 2.4, height: 2.4, depth: 0.7 }, visible: false, behavior: "scripts/level-door.js", state: { to: "gamma#gamma-out" } });
  ctx.spawn("gamma-gate-plate", { feetPosition: { x: x + 3.2, y: 1.95, z: -11.27 }, rotation: { yaw: 180 }, primitive: { kind: "box", width: 1.5, height: 0.5, depth: 0.03 }, material: { color: "oklch(0.24 0.04 145)", roughness: 0.8 },
    ui: '<div face="front" width="1.5m" style="font-size:150px;font-weight:900;color:#dff5b8;text-align:center;line-height:1.05">BASE GAMMA<div style="font-size:62px;color:#c8e090">M.E.G. · all wanderers scanned</div></div>' });
  ctx.spawn("gamma-gate-lamp", { feetPosition: { x: x + 3.2, y: 2.4, z: -11.1 }, primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.12, height: 0.1 }, material: { color: "oklch(0.95 0.08 80)", emissive: "oklch(0.95 0.08 80)", emissiveIntensity: 3 },
    light: { kind: "spot", color: "oklch(0.9 0.08 80)", intensity: 6, distance: 6, angle: 55, penumbra: 0.6, aim: { x, y: 0.5, z: -9 } } });
  for (const px of [-47.6, -40.4]) ctx.spawn({ tags: ["gamma-flood"], feetPosition: { x: px, y: 2.3, z: -10.2 }, light: { kind: "spot", color: "oklch(0.95 0.04 90)", intensity: 16, distance: 14, angle: 60, penumbra: 0.5, aim: { x: px + (px < x ? 2 : -2), y: 0, z: -4 } } });
  ctx.spawn({ tags: ["gamma-flood"], feetPosition: { x: -50.7, y: 1.85, z: -8.6 }, light: { kind: "point", color: "oklch(0.85 0.12 75)", intensity: 1.5, distance: 4 } });
  s.gammaExtV = 1;
}
