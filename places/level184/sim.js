// Level 184 "Field of Forgotten Forts": lays the countryside once per version.
//  - from Level 10: walking into the canola patch there (l10-canola-in) → you stand on the track here (l184-from-l10)
//  - back: the gap in the old stone wall at the track's far end (l184-back) → Level 10's canola patch (l10-from-l184)
export const cadence = "1s";
const V = 1;
const T = (x, z, up = 0) => ({ x, z, y: { terrain: up } });
const BRK = (mat, hp) => ({ mat, hp, maxHp: hp });
const BARN = (w, d, h, ridge, wall, door) => ({ primitive: { kind: "scripted", script: "scripts/barn10.js", params: { w, d, h, ridge, wall, door } }, physics: "static" });
const DOOR = (to, w, h, d) => ({ primitive: { kind: "box", width: w, height: h, depth: d }, visible: false, physics: { body: "static", trigger: true }, behavior: "scripts/level-door.js", state: { to } });
const tree = (kind, h, seed) => ({ primitive: { kind: "scripted", script: "scripts/tree10.js", params: { kind, h }, seed }, material: { alphaTest: 0.5 }, physics: "static" });
const M = { sedan: "/cdn/value.f486431ac39339f8b882a258015ef61fde74d5aebc0c828678d0af923f2d02d9.glb" };
const CRATE = "/cdn/value.f486431ac39339f8b882a258015ef61fde74d5aebc0c828678d0af923f2d02d9.glb";
const AMB = "cdn/ambience-wind-through-ripe-wheat-field-overcast-countryside-distant-crows-loop.mp3";
const RUST = { texture: "cdn/texture-flaking-rusted-sheet-metal-orange-brown.png", color: "oklch(0.62 0.08 50)", roughness: 0.9, metalness: 0.3 };
function lay(ctx) {
  const sp = (id, spec) => { if (ctx.getObject(id)) ctx.destroy(id); ctx.spawn(id, spec); };
  sp("l184-from-l10", { feetPosition: T(0, 8, 0.2), rotation: { yaw: 0 } });
  sp("l184-back", { ...DOOR("level10#l10-from-l184", 5, 3, 2), feetPosition: T(10, -172, 0) });
  // the old stone wall the track runs out through, a gap where the way back is
  sp("l184-wall-back-w", { feetPosition: { x: 0, y: 0, z: 0 }, spline: { kind: "wall", points: [[-80, 0, -172], [-30, 0, -175], [6, 0, -172]], snapToTerrain: true, height: 1.3, thickness: 0.6 }, material: { texture: "cdn/texture-dry-stone-wall-grey-fieldstone-moss.png", color: "oklch(0.7 0.02 90)" } });
  sp("l184-wall-back-e", { feetPosition: { x: 0, y: 0, z: 0 }, spline: { kind: "wall", points: [[14, 0, -172], [60, 0, -168], [120, 0, -174]], snapToTerrain: true, height: 1.3, thickness: 0.6 }, material: { texture: "cdn/texture-dry-stone-wall-grey-fieldstone-moss.png", color: "oklch(0.7 0.02 90)" } });
  // stone walls and metal fences cutting the plains into blind plots
  sp("l184-wall-a", { feetPosition: { x: 0, y: 0, z: 0 }, spline: { kind: "wall", points: [[20, 0, 10], [70, 0, -10], [120, 0, -4], [170, 0, -30]], snapToTerrain: true, height: 1.1, thickness: 0.6 }, material: { texture: "cdn/texture-dry-stone-wall-grey-fieldstone-moss.png", color: "oklch(0.68 0.02 90)" } });
  sp("l184-wall-b", { feetPosition: { x: 0, y: 0, z: 0 }, spline: { kind: "wall", points: [[-20, 0, 20], [-60, 0, 0], [-110, 0, 6]], snapToTerrain: true, height: 1.0, thickness: 0.55 }, material: { texture: "cdn/texture-dry-stone-wall-grey-fieldstone-moss.png", color: "oklch(0.66 0.02 90)" } });
  sp("l184-fence-a", { feetPosition: { x: 0, y: 0, z: 0 }, spline: { kind: "fence", points: [[30, 0, -110], [90, 0, -120], [140, 0, -100]], snapToTerrain: true, spacing: 2.5, height: 1.2 }, material: RUST });
  sp("l184-fence-b", { feetPosition: { x: 0, y: 0, z: 0 }, spline: { kind: "fence", points: [[-70, 0, -100], [-80, 0, -150], [-60, 0, -200]], snapToTerrain: true, spacing: 2.5, height: 1.2 }, material: RUST });
  // the abandoned farmhouse in the canola: small, the most furnished place here
  sp("l184-house", { ...BARN(9, 7, 3, 5.2, "plank", 1.4), feetPosition: T(-40, -62, 0), rotation: { yaw: 160 } });
  sp("l184-house-table", { tags: ["breakable"], feetPosition: T(-40, -63, 0.02), primitive: { kind: "box", width: 1.4, height: 0.76, depth: 0.8 }, material: { texture: "cdn/texture-worn-hardwood-grain.png", color: "oklch(0.5 0.05 55)" }, physics: "static", state: { name: "Kitchen table", ...BRK("wood", 30) } });
  [[-41, -62.2], [-39, -63.8]].forEach(([x, z], i) => sp(`l184-house-chair-${i}`, { tags: ["breakable"], feetPosition: T(x, z, 0.02), rotation: { yaw: i * 180 + 10 }, primitive: { kind: "box", width: 0.45, height: 0.46, depth: 0.45 }, material: { texture: "cdn/texture-worn-hardwood-grain.png", color: "oklch(0.45 0.05 55)" }, physics: "static", state: { name: "Chair", ...BRK("wood", 15) } }));
  const crate = (id, x, z, name, items, yaw = 0) => sp(id, { tags: ["container", "breakable"], feetPosition: T(x, z, 0.06), rotation: { yaw }, model: CRATE, layout: { box: { min: { x: -0.45, y: 0, z: -0.35 }, max: { x: 0.45, y: 0.7, z: 0.35 } } }, physics: { body: "static", collider: "box" }, state: { name, items, ...BRK("wood", 40) } });
  crate("l184-house-cupboard", -43, -60.5, "Kitchen cupboard", "ration,tape,almond", 160);
  // a second farm: big barn and a collapsing plank shed on the farm yard
  sp("l184-barn", { ...BARN(16, 9, 4.4, 8, "brick", 4), feetPosition: T(66, -88, 0), rotation: { yaw: 200 } });
  sp("l184-shed", { ...BARN(5, 4, 2.4, 3.6, "plank", 1.6), feetPosition: T(54, -76, 0), rotation: { yaw: 220, roll: 5, pitch: -3 } });
  crate("l184-barn-bin", 68, -90, "Feed bin", "wire,tape,battery", 20);
  // rusting machinery and a car left on the plain
  sp("l184-car", { model: M.sedan, feetPosition: T(28, 22, 0), rotation: { yaw: 70, roll: 3 }, layout: { box: { min: { x: -2.3, y: 0, z: -1 }, max: { x: 2.3, y: 1.5, z: 1 } } }, physics: { body: "static", collider: "box" }, material: { color: "oklch(0.55 0.06 45)", roughness: 0.95 } });
  sp("l184-tank", { feetPosition: T(76, -74, 0), rotation: { roll: 90, yaw: 20 }, pivot: "center", primitive: { kind: "cylinder", radiusTop: 1, radiusBottom: 1, height: 3.6 }, material: RUST, physics: "static" });
  // a road sign nobody reads any more
  sp("l184-sign", { feetPosition: T(4, -45, 1.6), rotation: { yaw: -10, roll: 6 }, primitive: { kind: "box", width: 1.2, height: 0.5, depth: 0.04 }, material: { color: "oklch(0.7 0.02 90)", roughness: 0.9 },
    ui: '<div face="front" width="1.2m" style="font-family:Arial,sans-serif;font-weight:800;color:#3a3a3a;text-align:center;font-size:110px;line-height:1">FARM</div>' });
  sp("l184-sign-post", { feetPosition: T(4, -45, -0.3), primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.06, height: 2.1 }, material: RUST });
  // trees in clumps along the walls and around the pond
  [[60, -6, 18], [-70, 4, 14], [44, 28, 10], [-30, -110, 16]].forEach(([x, z, r], i) => sp(`l184-trees-${i}`, { feetPosition: T(x, z), scatter: { bounds: { shape: "circle", radius: r }, count: Math.round(r / 2), seed: 40 + i, variation: { scale: [0.8, 1.25], yaw: [0, 360] },
    templates: [{ weight: 2, ...tree("oak", 12, 2) }, { weight: 1, ...tree("ash", 14, 3) }, { weight: 2, ...tree("hedge", 4, 1) }] } }));
  sp("l184-ambience", { feetPosition: T(0, 0), audience: "local", audio: { clip: AMB, gain: 0.2, loop: true, spatial: false, bus: "Ambience" } });
}
export function tick(ctx) {
  const s = ctx.place.state;
  if (!ctx.place.players.length) return;
  if ((s.builtV ?? 0) < V) { s.builtV = V; lay(ctx); }
}
