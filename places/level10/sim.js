// Level 10 "Bumper Crop": lays the farm once per version. Entrances and exits (wiki):
//  - from Level 11: a back road off the city's south street (lv10-backroad there) → you walk in on the farm track here (l10-from-l11)
//  - following the track far enough leads to Level 11 (l10-road-north at its far end, l10-road-south behind the spawn)
//  - swimming down into the lake leads to an aquatic level: Level 7 (l10-lake-deep)
export const cadence = "1s";
const V = 4;
const BRK = (mat, hp) => ({ mat, hp, maxHp: hp });
const T = (x, z, up = 0) => ({ x, z, y: { terrain: up } });
const BARN = (w, d, h, ridge, wall, door) => ({ primitive: { kind: "scripted", script: "scripts/barn10.js", params: { w, d, h, ridge, wall, door } }, physics: "static" });
const DOOR = (to, w, h, d) => ({ primitive: { kind: "box", width: w, height: h, depth: d }, visible: false, physics: { body: "static", trigger: true }, behavior: "scripts/level-door.js", state: { to } });
const tree = (kind, h, seed) => ({ primitive: { kind: "scripted", script: "scripts/tree10.js", params: { kind, h }, seed }, material: { alphaTest: 0.5 }, physics: "static" });
const AMB = "cdn/ambience-wind-through-ripe-wheat-field-overcast-countryside-distant-crows-loop.mp3";
function lay(ctx) {
  const sp = (id, spec) => { if (ctx.getObject(id)) ctx.destroy(id); ctx.spawn(id, spec); };
  // ---- arrivals and exits
  sp("l10-from-l11", { feetPosition: T(0, 30, 0.2), rotation: { yaw: 0 } });
  sp("l10-road-north", { ...DOOR("level11#lv10-arrive", 8, 4, 2), feetPosition: T(0, -282, 0) });
  sp("l10-road-south", { ...DOOR("level11#lv10-arrive", 8, 4, 2), feetPosition: T(0, 72, 0) });
  sp("l10-lake-deep", { ...DOOR("level7#l7-from-l6", 8, 1.2, 8), feetPosition: { x: 70, y: -2.6, z: -95 } });
  // the road out: a leaning farm sign where the track leaves, and the city's glow felt in the fog at the far end
  sp("l10-sign-city", { feetPosition: T(4, -270, 0), rotation: { yaw: 15 }, primitive: { kind: "box", width: 1.4, height: 0.5, depth: 0.05 }, material: { color: "oklch(0.75 0.02 90)", roughness: 0.9 },
    ui: '<div face="front" width="1.4m" style="font-family:Arial,sans-serif;font-weight:800;color:#2b2b2b;text-align:center;font-size:120px;line-height:1">CITY →</div>' });
  sp("l10-sign-post", { feetPosition: T(4, -270, -0.3), primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.06, height: 2.3 }, material: { color: "oklch(0.4 0.03 60)", roughness: 0.9 } });
  // ---- buildings: the big brick barn on the yard, a stable, two plank sheds out in the plots
  sp("l10-barn", { ...BARN(18, 9, 4.6, 8.4, "brick", 4.2), feetPosition: T(-30, -40, 0), rotation: { yaw: 180 } });
  sp("l10-stable", { ...BARN(12, 7, 3.4, 5.8, "brick", 3), feetPosition: T(-58, -105, 0), rotation: { yaw: 90 } });
  sp("l10-shed-a", { ...BARN(5, 4, 2.6, 3.9, "plank", 1.8), feetPosition: T(36, -150, 0), rotation: { yaw: -20 } });
  sp("l10-shed-b", { ...BARN(4.5, 3.6, 2.5, 3.6, "plank", 1.6), feetPosition: T(95, -60, 0), rotation: { yaw: 200 } });
  // what's inside: wood, nails and the odd thing someone left (the wiki: the barns hold building stock)
  const crate = (id, x, z, name, items, yaw = 0) => sp(id, { tags: ["container", "breakable"], feetPosition: T(x, z, 0.06), rotation: { yaw },
    model: "/cdn/value.f486431ac39339f8b882a258015ef61fde74d5aebc0c828678d0af923f2d02d9.glb", layout: { box: { min: { x: -0.45, y: 0, z: -0.35 }, max: { x: 0.45, y: 0.7, z: 0.35 } } }, physics: { body: "static", collider: "box" }, state: { name, items, ...BRK("wood", 40) } });
  crate("l10-barn-bin", -36, -42, "Feed bin", "tape,wire,ration,almond", 10);
  crate("l10-barn-chest", -24, -37, "Tool chest", "weapon:crowbar,tape,battery", -8);
  crate("l10-stable-bin", -58, -103, "Tack box", "bandage,ration,cloth:topw:jacket:5a4630", 90);
  crate("l10-shed-a-box", 36, -150, "Nail box", "wire,tape,bobbypin", 0);
  // straw bales by the barn door, stacked and spilled
  const bale = (id, x, y, z, yaw) => sp(id, { tags: ["breakable"], feetPosition: { x, y: { terrain: y }, z }, rotation: { yaw }, primitive: { kind: "cylinder", radiusTop: 0.75, radiusBottom: 0.75, height: 1.2 },
    pivot: "center", material: { texture: "cdn/texture-golden-rolled-straw-hay-bale.png", color: "oklch(0.82 0.08 85)" }, physics: "static", state: { name: "Hay bale", ...BRK("cloth", 30) } });
  bale("l10-bale-0", -22, 0, -48, 0); bale("l10-bale-1", -20.4, 0, -48.3, 10); bale("l10-bale-2", -38, 0, -50, 70);
  // ---- hedgerows: oaks, ash and shrubs along the plot lines near the farm
  const rows = [];
  for (const x of [-120, -40, 40, 120]) rows.push({ cx: x, cz: -110, w: 5, d: 360 });
  for (const z of [-270, -210, -150, -90, -30, 30]) rows.push({ cx: 0, cz: z, w: 320, d: 5 });
  rows.forEach((r, i) => sp(`l10-hedge-${i}`, { feetPosition: T(r.cx, r.cz), scatter: { bounds: { shape: "rectangle", width: r.w, depth: r.d }, count: Math.round(Math.max(r.w, r.d) / 9), seed: 30 + i,
    variation: { scale: [0.8, 1.25], yaw: [0, 360] }, templates: [{ weight: 3, ...tree("hedge", 4, 1) }, { weight: 2, ...tree("oak", 12, 2) }, { weight: 1, ...tree("ash", 14, 3) }] } }));
  // ---- the lake's pale reeds (reference: dry reed fringe on the near bank)
  sp("l10-reeds", { feetPosition: T(70, -95), scatter: { bounds: { shape: "ring", innerRadius: 24, outerRadius: 29 }, count: 220, seed: 9, variation: { scale: [1.2, 1.9], yaw: [0, 360] },
    templates: [{ primitive: { kind: "scripted", script: "scripts/wheat10.js", params: { h: 1.2, n: 9, head: 0.18 }, seed: 5 }, material: { color: "oklch(0.86 0.03 85)" } }] } });
  // ---- the canola patch (wiki: walk into canola among the wheat to reach Level 184): a bright yellow island in a wheat plot
  sp("l10-canola", { feetPosition: T(-85, -185), scatter: { bounds: { shape: "circle", radius: 11 }, count: 520, seed: 18, variation: { scale: [0.9, 1.3], yaw: [0, 360] },
    templates: [{ primitive: { kind: "scripted", script: "scripts/wheat10.js", params: { h: 1.1, n: 6, head: 0.08 }, seed: 6 }, material: { color: "oklch(0.88 0.19 100)", emissive: "oklch(0.3 0.08 100)" } },
      { primitive: { kind: "scripted", script: "scripts/wheat10.js", params: { h: 0.9, n: 8, head: 0.06 }, seed: 7 }, material: { color: "oklch(0.62 0.12 135)" } }] } });
  // ---- the sound of the place: wind in the crop, crows far off
  sp("l10-ambience", { feetPosition: T(0, 0), audience: "local", audio: { clip: AMB, gain: 0.2, loop: true, spatial: false, bus: "Ambience" } });
}
export function tick(ctx) {
  const s = ctx.place.state;
  if ((s.builtV ?? 0) < V) { s.builtV = V; lay(ctx); }
}
