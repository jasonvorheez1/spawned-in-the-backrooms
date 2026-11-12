// Level 11 "The Infinite City": the modelled city (Shelly: make it realistic, not blocky, interesting; wiki: backrooms-wiki.wikidot.com/level-11).
// Real buildings with window grids (art/level11/build.py), a road grid and canal running out to the fog, density that thins from skyscrapers to suburb,
// street furniture, parked cars that shuffle between kerbs when nobody watches, billboards that change their ads, steaming manholes, a subway stair.
// places/level11/sim.js calls layCity (the far city and the street dressing) and tickCity (the living parts) from its own lay/update.
import MODELS from "./data/level11-models.yml";

const T = (name, rep = 1) => ({ texture: `cdn/texture-${name}.png`, repeat: [rep, rep], wrap: "repeat" });
const TEX = {
  brick: { ...T("old-red-brick-wall", 2.4), roughness: 0.85 }, stone: { ...T("large-grey-brick-wall-dusty-mortar", 1.5), roughness: 0.78 },
  concrete: { ...T("smooth-cold-poured-concrete-wall", 1.4), roughness: 0.75 }, plaster: { ...T("cream-painted-plaster-wall", 1.4), roughness: 0.85 },
  siding: { ...T("white-vinyl-lap-siding", 1.2), roughness: 0.7 }, shingle: { ...T("dark-asphalt-roof-shingles", 1.5), roughness: 0.95 },
  wood: { ...T("weathered-painted-wood-planks", 1.2), roughness: 0.8 }, metal: { ...T("rusty-galvanized-sheet-metal", 1), roughness: 0.6, metalness: 0.4 },
};
// the tower kit's shared slots (art/level11/tower_kit.py): stone trim, tar roofs, painted wood, galvanised metal
const KIT = { trim: { ...TEX.stone, color: "oklch(0.95 0.02 85)" }, roof: { ...T("tar-paper-roof", 2), color: "oklch(0.7 0.01 80)", roughness: 0.95 }, wood: { ...TEX.wood, color: "oklch(0.78 0.06 55)" }, metal: { ...TEX.metal, color: "oklch(0.8 0.01 240)" } };
const hs = (a, b = 0, c = 0) => { let h = 2166136261 ^ (a * 374761393) ^ (b * 668265263) ^ (c * 1274126177); h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const hue = (u, l = 0.62, c = 0.08) => `oklch(${l} ${c} ${Math.round(u * 360)})`;
// what colour each kind of building is dressed in, per lot
// Nov 10 (Shelly: "the rendering is very poor here"): the kit's flat window slots read as paper; glass now mirrors the sky, lit rooms glow a warm dim amber behind it
const WIN = (u) => ({
  glass: { color: `oklch(${0.42 + u * 0.08} 0.04 ${225 + u * 20})`, metalness: 0.85, roughness: 0.08 },
  glassBlue: { color: `oklch(${0.5 + u * 0.1} 0.06 ${215 + u * 25})`, metalness: 0.95, roughness: 0.04 },
  glassLit: { color: "oklch(0.86 0.025 85)", emissive: "oklch(0.9 0.04 85)", emissiveIntensity: 0.18, roughness: 0.2, metalness: 0.1 },
});
function dress(kind, u) { return { ...WIN(u), ...dress0(kind, u) }; }
function dress0(kind, u) {
  const ld = 0.55 + u * 0.3;
  if (kind === "brick_a" || kind === "brick_b") return { brick: { ...TEX.brick, color: `oklch(${0.72 + u * 0.14} ${0.07 + u * 0.05} ${30 + u * 14})` }, concrete: { ...TEX.concrete, color: "oklch(0.88 0.01 80)" }, ...KIT };
  if (kind === "mall") return { brick: { ...TEX.brick, color: `oklch(${0.74 + u * 0.12} 0.07 ${40 + u * 30})` }, concrete: { ...TEX.concrete, color: "oklch(0.72 0.01 80)" } };
  if (kind === "stone") return { stone: { ...TEX.stone, color: `oklch(${0.9 + u * 0.05} 0.02 ${80 + u * 20})` }, concrete: { ...TEX.concrete, color: "oklch(0.88 0.01 80)" } };
  if (kind === "house") return { ...KIT, siding: { ...TEX.siding, color: hue(u, 0.86, 0.05) }, shingle: { ...TEX.shingle, color: `oklch(${0.62 + u * 0.15} 0.02 ${20 + u * 40})` }, trim: { ...TEX.plaster, color: "oklch(0.97 0.01 90)" }, concrete: { ...TEX.concrete, color: "oklch(0.7 0.01 80)" }, door: { ...TEX.wood, color: `oklch(0.6 0.12 ${u > 0.5 ? 25 : 250})` } };
  return { concrete: { ...TEX.concrete, color: "oklch(0.68 0.012 240)" } }; // glass towers: the glass stays as modelled
}
// footprint of each model, as built (width along local x, depth along local y)
const FOOT = { glass_a: [23.6, 24.3], glass_b: [17, 17], stone: [21.2, 21.6], brick_a: [19.7, 16.1], brick_b: [13.7, 13.1], mall: [24.5, 15.3], house: [9.5, 12.8] };
const HEIGHT = { glass_a: 101, glass_b: 105, stone: 43, brick_a: 37.6, brick_b: 20.2, mall: 7.3, house: 11.1 };
export const RADIUS = 190; export const SHADOW_R = 75; // buildings beyond this many metres of the middle cast no shadow
export const DBG = { buildings: true, city: true, street: true }; // how far out the buildings go (the road grid and the ground go on to the fog)
const PAINT = ["#b81c28", "#2f4f8a", "#e8e4d8", "#2a2a30", "#3a6a4a", "#c8a24a", "#7a7a84", "#8a2a2a", "#d8d0b8", "#1e3a5a"];

export function layCity(ctx, h) {
  if (!DBG.city) return { TOWER: { x: 27, z: 31 }, nBuildings: 0 };
  const { sp, bx } = h, put = (id, kind, x, z, yaw, extra = {}, y = 0) => sp(id, { feetPosition: { x, y, z }, rotation: { yaw }, physics: { body: "static", collider: extra.collider ?? "box" }, model: { id: MODELS[kind], forward: "-z", materials: extra.materials }, castShadow: Math.hypot(x, z - 20) < SHADOW_R, ...(extra.spec ?? {}) }); // a building far from the middle casts no shadow: the sun's shadow pass drew the whole city every frame for shadows nobody could see
  const ASPH = { ...T("weathered-grey-asphalt-road-with-fine-gravel", 6), color: "oklch(0.92 0.005 250)", roughness: 0.88 }, WALK = { ...T("weathered-city-sidewalk-concrete-squares-scored-joints-gum-stains", 0.6), color: "oklch(0.95 0.006 80)", roughness: 0.88 };
  const CANAL = { ...T("smooth-cold-poured-concrete-wall", 2), color: "oklch(0.62 0.02 240)", roughness: 0.65 }, CURB = { ...T("smooth-cold-poured-concrete-wall", 1), color: "oklch(0.72 0.02 85)", roughness: 0.65 };
  const YEL = { color: "oklch(0.84 0.18 88)", roughness: 0.45 };
  const X_AVE = [-140, -70, 0, 70, 140], Z_ST = [-160, -92, 12, 84, 156, 228], CANAL_Z = -30, ROAD_Z = [12, 84, 156, -92, -160, 228];

  // ---- the ground, so the city stands on something to the edge of the fog
  { // Leave the canal and the subway stairwell open; a continuous slab hid the water.
    const G = { ...T("stained-concrete-floor", 40), color: "oklch(0.55 0.015 85)", roughness: 0.9 };
    bx("l11-ground",0,-.45,-175,620,.3,270,G);
    bx("l11-ground-before-subway",0,-.45,19.2,620,.3,78.4,G);
    for(const side of [-1,1])bx(`l11-ground-canal-end-${side}`,side*280,-.45,-30,60,.3,20,G);
    bx("l11-ground-n", 0, -0.45, 226.3, 620, 0.3, 327.4, G);
    bx("l11-ground-w", -148.8, -0.45, 60.5, 322.4, 0.3, 4.2, G);
    bx("l11-ground-e", 162.4, -0.45, 60.5, 295.2, 0.3, 4.2, G);
  }
  // ---- avenues (north-south) and streets (east-west): long slabs, kerbs, sidewalks; the centre already has its own (sim.js), so these start where those stop
  // sidewalks and kerbs stop at every crossing road, so a car drives straight through an intersection instead of hopping a kerb
  const cutsFor = (list, half) => list.map((c) => [c - half, c + half]);
  const spans = (a0, a1, cuts) => { const out = []; let a = a0; for (const [c0, c1] of cuts.filter(([c0, c1]) => c1 > a0 && c0 < a1).sort((p, q) => p[0] - q[0])) { if (c0 - a > 1) out.push([a, c0]); a = Math.max(a, c1); } if (a1 - a > 1) out.push([a, a1]); return out; };
  const AVE_CUTS = X_AVE.map((x) => [x - (x === 0 ? 15.8 : 12), x + (x === 0 ? 15.8 : 12)]), ST_CUTS = cutsFor(Z_ST, 12);
  for (const ax of X_AVE) {
    if (ax === 0) { // the main avenue just continues past the old ends
      for (const [z0, z1] of [[-250, -82], [78, 250]]) { const zc = (z0 + z1) / 2, L = z1 - z0; bx(`l11-ave0-${z0}`, 0, -0.05, zc, 16, 0.2, L, ASPH); for (const s of [-1, 1]) for (const [a, b] of spans(z0, z1, ST_CUTS)) { bx(`l11-ave0-sw-${z0}-${s}-${Math.round(a)}`, s * 12, 0.08, (a + b) / 2, 7.6, 0.25, b - a, WALK); bx(`l11-ave0-kb-${z0}-${s}-${Math.round(a)}`, s * 8.1, 0.08, (a + b) / 2, 0.2, 0.28, b - a, CURB); } }
      continue;
    }
    bx(`l11-ave-${ax}`, ax, -0.05, 0, 12, 0.2, 520, ASPH);
    for (const s of [-1, 1]) for (const [a, b] of spans(-260, 260, ST_CUTS)) { bx(`l11-ave-sw-${ax}-${s}-${Math.round(a)}`, ax + s * 9, 0.08, (a + b) / 2, 6, 0.25, b - a, WALK); bx(`l11-ave-kb-${ax}-${s}-${Math.round(a)}`, ax + s * 6.1, 0.08, (a + b) / 2, 0.2, 0.28, b - a, CURB); }
    for (let z = -140; z < 140; z += 28) bx(`l11-ave-ln-${ax}-${z}`, ax, 0.06, z, 0.14, 0.01, 8, YEL, { physics: undefined });
  }
  for (const zs of Z_ST) {
    const runs = zs === 12 ? [[-250, -36], [36, 250]] : [[-260, 260]];
    for (const [x0, x1] of runs) {
      const xc = (x0 + x1) / 2, L = x1 - x0, key = zs === 12 ? `l11-st12-${x0}` : `l11-st-${zs}`;
      bx(key, xc, -0.051, zs, L, 0.2, 12, ASPH);
      for (const s of [-1, 1]) for (const [a, b] of spans(x0, x1, AVE_CUTS)) { bx(`${key}-sw-${s}-${Math.round(a)}`, (a + b) / 2, 0.08, zs + s * 9, b - a, 0.25, 6, WALK); bx(`${key}-kb-${s}-${Math.round(a)}`, (a + b) / 2, 0.08, zs + s * 6.1, b - a, 0.28, 0.2, CURB); }
    }
    if (zs !== 12) for (let x = -140; x < 140; x += 28) bx(`l11-st-ln-${zs}-${x}`, x, 0.06, zs, 8, 0.01, 0.14, YEL, { physics: undefined });
  }
  // corner pads: where an avenue's sidewalk meets a street's, the square between them was bare road, so lamps, hydrants and signals stood in the asphalt
  for (const ax of X_AVE) for (const zs of Z_ST) {
    if (zs === 12 && Math.abs(ax) < 36) continue; // the centre crossing is sim.js's own
    const inner = ax === 0 ? 8.2 : 6, outer = ax === 0 ? 15.8 : 12;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const za = zs + sz * 6, zb = zs + sz * 12;
      if (ax === 0 && Math.max(za, zb) > -82 && Math.min(za, zb) < 78) continue; // inside the old centre: sim.js laid it
      const xc = ax + sx * (inner + outer) / 2, w = outer - inner, zc = zs + sz * 9, k = `l11-cnr-${ax}-${zs}-${sx}${sz}`;
      bx(k, xc, 0.08, zc, w, 0.25, 6, WALK);
      bx(`${k}-kz`, xc, 0.08, zs + sz * 6.1, w + 0.2, 0.28, 0.2, CURB); // kerb along the street
      bx(`${k}-kx`, ax + sx * (inner - 0.1), 0.08, zc, 0.2, 0.28, 6, CURB); // kerb along the avenue
    }
  }
  // the canal runs on past the old ends, with a bridge at every avenue
  for (const [x0, x1] of [[-250, -59], [59, 250]]) {
    const xc = (x0 + x1) / 2, L = x1 - x0;
    bx(`l11-canal-bed-${x0}`, xc, -4.5, CANAL_Z, L, 0.4, 24, CANAL); bx(`l11-canal-water-${x0}`, xc, -2.2, CANAL_Z, L, 0.08, 20, { color: "oklch(0.38 0.09 220)", opacity: 0.88, transparent: true, roughness: 0.06, metalness: 0.2 });
    for (const s of [-1, 1]) { sp(`l11-canal-wall-${x0}-${s}`, { feetPosition: { x: xc, y: -4.25, z: CANAL_Z + s * 10.5 }, primitive: { kind: "scripted", script: "scripts/l11-masonry.js", params: { kind: "quay", L, t: 1.0, H: 4.4, side: -s } }, physics: "static" }); for(const [a,b] of spans(x0,x1,X_AVE.map(x=>[x-12.3,x+12.3])))bx(`l11-canal-cope-${x0}-${s}-${Math.round(a)}`,(a+b)/2,.2,CANAL_Z+s*10.5,b-a,.3,1.3,CURB); }
  }
  for (const ax of X_AVE) if (ax !== 0) {
    bx(`l11-bridge-${ax}`, ax, -0.45, CANAL_Z, 24, 0.6, 24, ASPH); for (const s of [-1, 1]) { sp(`l11-bridge-par-${ax}-${s}`, { feetPosition: { x: ax + s * 11.5, y: 0.5, z: CANAL_Z }, primitive: { kind: "scripted", script: "scripts/l11-masonry.js", params: { kind: "parapet", L: 24, t: 0.4, H: 0.95 } }, physics: "static" }); sp(`l11-bridge-arch-${ax}-${s}`, { feetPosition: { x: ax + s * 11.7, y: -2.4, z: CANAL_Z }, primitive: { kind: "scripted", script: "scripts/l11-masonry.js", params: { kind: "arch", L: 24, t: 1.2, H: 4.2, S: 17, r: 2.9 } }, physics: "static" }); }
  }

  // ---- the lots: blocks between the roads, buildings facing outward to the avenues, density thinning with distance from downtown
  const ROWS = [[-149, -103, 2], [-81, -45, 1], [-17, 1, 1], [23, 73, 2], [95, 145, 2], [167, 217, 2]];
  const GAPS = [[-200, -140], [-140, -70], [-70, 0], [0, 70], [70, 140], [140, 200]];
  // All three density tiers must fit inside RADIUS; the old outer tier began beyond the city edge.
  const KINDS = [["glass_a", "glass_b", "stone", "glass_b", "brick_a", "glass_a", "stone"], ["brick_a", "stone", "brick_b", "mall", "glass_b", "brick_a", "brick_b"], ["house", "house", "brick_b", "mall", "brick_a", "house", "house"]];
  let n = 0;
  if (DBG.buildings) for (const [gx0, gx1] of GAPS) for (const [rz0, rz1, subs] of ROWS) for (const side of [0, 1]) for (let sub = 0; sub < subs; sub++) {
    const cx = side ? gx1 - 11 - 12 : gx0 + 11 + 12, depthZ = (rz1 - rz0) / subs, cz = rz0 + depthZ * (sub + 0.5), yaw = side ? -90 : 90; // west column faces west, east column faces east
    if (Math.abs(cx) <= 47 && cz > -85 && cz < 76) continue; // the centre is hand-placed (sim.js)
    if (cz < -22 && cz > -45 && true) continue; // the canal
    const d = Math.hypot(cx, cz - 20), tier = d < 90 ? 0 : d < 145 ? 1 : 2, u = hs(Math.round(cx), Math.round(cz), 3), kind = Math.abs(cz-CANAL_Z)<38 && d<145 ? (hs(Math.round(cx),Math.round(cz),7)<.5 ? "glass_a" : "glass_b") : KINDS[tier][Math.floor(hs(Math.round(cx), Math.round(cz), 7) * KINDS[tier].length)];
    if (d > RADIUS) continue;
    const dr = dress(kind, hs(Math.round(cx), Math.round(cz), 11));
    if (kind === "house") { for (const k of [-1, 1]) put(`l11-b-${n++}`, kind, cx, cz + k * Math.min(7.5, depthZ / 4 + 3), yaw, { materials: dress(kind, hs(n, 2, 5)) }); }
    else {
      // Background blocks vary; the enterable tower and skydeck retain authored heights.
      const tall=kind.startsWith("glass"),height=kind==="mall"?1:(tall ? .86 : .92)+u*(tall ? .22 : .16);
      put(`l11-b-${n++}`,kind,cx,cz,yaw,{materials:dr,spec:{scale:{x:1,y:height,z:1}}});
    }
  }
  // ---- hand-placed hero buildings around the old centre (the new ones the level was missing)
  const dressOf = (kind, s) => dress(kind, s);
  if (!DBG.buildings) return { TOWER: { x: 27, z: 31 }, nBuildings: 0 };
  put("l11-hero-mall", "mall", -24, -57, -90, { materials: dressOf("mall", 0.3) });
  put("l11-hero-glass", "glass_a", 28, -58, 90, { materials: dressOf("glass_a", 0.5) });
  put("l11-hero-brick1", "brick_a", -27, 85, -90, { materials: dressOf("brick_a", 0.2) });
  put("l11-hero-brick2", "brick_b", 31, -3, 90, { materials: dressOf("brick_b", 0.7) });
  put("l11-hero-house1", "house", -30, 51.85, -90,  // its own lot between the mall (z<47) and the glass tower (z>56.7)
    { materials: dressOf("house", 0.6), collider: "mesh" });
  put("l11-hero-mall2", "mall", 26, 62, 90, { materials: dressOf("mall", 0.8) });
  put("l11-hero-glass2", "glass_b", -28, 64, -90, { materials: dressOf("glass_b", 0.1), spec: { scale: 0.85 } }); // slimmer, so it clears the house and the street
  const TOWER = { x: 27, z: 31 }; put("l11-ntower", "stone", TOWER.x, TOWER.z, 90, { materials: dressOf("stone", 0.4) });
  return { TOWER, nBuildings: n };
}

// ---- the street: lamps, trees, hydrants, bins, benches, a bus shelter, newsboxes, parked cars, manholes, a subway stair, billboards (around the avenue's old extent)
const ADS = [["ALMOND WATER", "3 for $1 · it's what you came for", "#1e5a3a", "#f2e6a8"], ["THE CITY NEVER SLEEPS", "Neither do we · Open all hours", "#0e1a3a", "#ffd24a"], ["VISIT LEVEL 37", "Beautiful beaches · Book today", "#0d6c8a", "#fff2c8"], ["M.E.G. IS HIRING", "See the world's other worlds · Ask any agent", "#3a4a28", "#d8f0a0"], ["DON'T LOOK UP", "Brought to you by nobody", "#2a2a2e", "#d84a3a"]];
const BB_POS = [[-17.5, 74, -90], [17.5, -74, 90]];
// one billboard face at a time (a face is a big UI texture, so the ads swap by respawning it rather than keeping five)
function adSign(sp, b, k, x, z, yaw) {
  const [t1, t2, bg, fg] = ADS[k];
  sp(`l11-bb-ad-${b}`, { feetPosition: { x: x + (yaw > 0 ? -0.06 : 0.06), y: 6.2, z }, rotation: { yaw }, primitive: { kind: "box", width: 7.2, height: 3.7, depth: 0.06 }, material: { color: bg }, state: { ad: k }, ui: `<div face="front" width="7.2m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:Georgia,serif;background:${bg};color:${fg}"><div style="font-size:150px;font-weight:700;line-height:1">${t1}</div><div style="font-size:58px;margin-top:20px;opacity:.85">${t2}</div></div>` });
}
// the tripo street kit is already in metres (sedan 4.65 m, van 4.7 m long, along its own X): turned to run along the kerb, a touch up to sit with the 5.6 m taxi
const TRIPO = { sedan: { forward: "+x", scale: 1.15 }, van: { forward: "+x", scale: 1.15 }, bench: { forward: "+x", scale: 1.1 }, newsbox: { scale: 1.1 }, hydrant: { scale: 1.1 }, trashcan: { scale: 1.1 }, shelter: { forward: "+x", scale: 1.35 }, lamp: { scale: 2.1 } }; // tripo shelter 2.2 m raw -> 3 m, lamp 3.5 m raw -> 7.3 m
const FURN = new Set(["hydrant", "trashcan", "bench", "shelter", "newsbox"]); // street furniture stands ON the sidewalk (top 0.33), not sunk into it
export function layStreet(ctx, h) {
  if (!DBG.street) return { cars: [], billboards: [] };
  const { sp, bx, cyl } = h, put = (id, kind, x, z, yaw, extra = {}, y = (FURN.has(kind) && Math.abs(x) >= 8.2 && Math.abs(x) <= 15.8 ? 0.33 : 0)) => sp(id, { feetPosition: { x, y, z }, rotation: { yaw }, physics: extra.nophys ? undefined : { body: "static", collider: extra.collider ?? "box" }, model: { id: MODELS[kind], forward: TRIPO[kind]?.forward ?? "-z", materials: extra.materials }, ...(TRIPO[kind] ? { scale: TRIPO[kind].scale } : {}), ...(extra.spec ?? {}) });
  const LEN = [-66, -52, -9, 24, 40, 56, 72];
  LEN.forEach((z, i) => [-1, 1].forEach((s) => {
    sp(`l11-st-lamp-${i}-${s}`, { feetPosition: { x: s * 8.9, y: 0.33, z: z + (s > 0 ? 3 : 0) }, rotation: { yaw: s > 0 ? 90 : -90 }, primitive: { kind: "scripted", script: "scripts/l11-streetlamp.js", seed: 1 }, material: { roughness: 0.5 }, physics: { body: "static" }, castShadow: true }); // Nov 10: scripted cast-iron lamp; the tripo lamp had holes ("street lamp is missing faces")
    if (i % 2 === 0) sp(`l11-st-lamp-light-${i}-${s}`, { feetPosition: { x: s * 6.9, y: 6.93, z: z + (s > 0 ? 3 : 0) }, light: { kind: "point", color: "oklch(0.93 0.14 80)", intensity: 5, distance: 17, shadow: { enabled: false } } });
  }));
  [-64, -48, -8, 26, 38, 52, 66].forEach((z, i) => [-1, 1].forEach((s) => {
    const x = s * 13.4, zz = z + (s > 0 ? 4 : z === 52 ? 5.2 : 0), u = hs(i, s, 1);
    if (Math.hypot(x - 13.6, zz - 60.5) < 6) return; // the subway stairs stand here (SUB)
    sp(`l11-st-tree-${i}-${s}`, { feetPosition: { x, y: 0.1, z: zz }, rotation: { yaw: u * 360 }, physics: { body: "static" }, primitive: { kind: "scripted", script: "scripts/tree10.js", params: { kind: u > 0.5 ? "ash" : "oak", h: 6.5 + u * 2.5 }, seed: i * 7 + (s > 0 ? 3 : 0) }, material: { alphaTest: 0.5, side: "double" }, visibleRange: { max: 220 } }); // a branching street tree, not a blob (#74739)
    bx(`l11-st-grate-${i}-${s}`, x, 0.332, zz, 1.7, 0.01, 1.7, { texture: "cdn/texture-square-cast-iron-tree-grate-radial-slots-top-down-rusted.png", color: "oklch(0.8 0.03 60)", metalness: 0.7, roughness: 0.55 }, { physics: undefined, state: { floor: "grate" } });
  }));
  for (const [i, [x, z]] of [[-8.6, 3], [8.6, 11], [-8.6, 62], [8.6, -12], [8.6, 48]].entries()) put(`l11-st-hyd-${i}`, "hydrant", x, z, x < 0 ? -90 : 90, { collider: "cylinder" });
  for (const [i, [x, z]] of [[-8.7, -10], [8.7, 26], [-8.7, 21], [8.7, -64], [-8.7, 70]].entries()) put(`l11-st-bin-${i}`, "trashcan", x, z, 0, { collider: "cylinder" });
  for (const [i, [x, z]] of [[-14.5, 32.4], [-20.1, 53.4], [14.7, -68], [14.6, 36.2]].entries()) put(`l11-st-bench-${i}`, "bench", x, z, x < 0 ? -90 : 90, {}, 0.33);
  put("l11-st-shelter", "shelter", 14.4, 51.5, 90); put("l11-st-shelter2", "shelter", -14.4, -10.8, -90);
  for (const [i, [x, z]] of [[-9.2, 31.2], [9.2, 14.6], [9.2, 49.7], [-9.2, 3.9]].entries()) put(`l11-st-nbox-${i}`, "newsbox", x, z, x < 0 ? -90 : 90, { collider: "box", materials: { nbox: { color: ["#1d4fa0", "#c8231e", "#e7e2d2", "#2f7a3a"][i] } } });
  // parked cars along the kerbs, tinted at random; a few vans
  const SLOTS = []; for (let z = -76; z <= 76; z += 7.5) { if ((z > -48 && z < -14) || (z > 4 && z < 20)) continue; if (!(Math.abs(z - 52) < 5 || Math.abs(z + 8.5) < 4)) SLOTS.push([-6.95, z]); SLOTS.push([6.95, z]); } // the west kerb leaves room for the roadworks (z 52) and the taxi (z -8.5)
  const cars = [];
  SLOTS.forEach(([x, z], i) => {
    if ((z >= 47 && z <= 56) || hs(i, 4, 9) < 0.5) return; // keep the bus stop and market frontage clear
    const kind = hs(i, 5, 2) < 0.22 ? "van" : "sedan", yaw = x < 0 ? (hs(i, 6, 3) < 0.5 ? 0 : 180) : (hs(i, 6, 3) < 0.5 ? 0 : 180), col = PAINT[Math.floor(hs(i, 7, 4) * PAINT.length)];
    put(`l11-car-${i}`, kind, x, z + (hs(i, 8, 5) - 0.5) * 1.6, yaw, {
      materials: { paint: { color: col, roughness: 0.35, metalness: 0.2 } },
      spec: {
        tags: ["usable", "l11car"],
        behavior: "scripts/level11-use.js",
        state: { kind: "parked-car", name: `Parked ${kind === "van" ? "Municipal Van" : "Sedan"}`, verb: "Disengage Parking Brake" },
      },
    }, 0.14); // wheels on the asphalt, not sunk into it cars.push(`l11-car-${i}`);
  });
  // moving traffic: tripo sedans and a van in both lanes (scripts/l11-traffic.js), right-hand drive
  [[-3.2, -60, 1, "sedan"], [-3.2, 10, 1, "van"], [3.2, 40, -1, "sedan"], [3.2, -20, -1, "sedan"]].forEach(([x, z, dir, kind], i) =>
    put(`l11-traffic-${i}`, kind, x, z, dir > 0 ? 180 : 0, {
      materials: { paint: { color: PAINT[(i * 3 + 1) % PAINT.length], roughness: 0.35, metalness: 0.2 } },
      spec: { tags: ["l11traffic"], physics: { body: "kinematic", collider: "box" }, behavior: "scripts/l11-traffic.js", state: { dir },
        audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-car-engine-idling-low-rumble-loop.mp3", loop: true, gain: 0.25, spatial: true, maxDistance: 30 } },
    }, 0.14));
  // manholes that steam, and a subway stair going down
  const STEAM = `fx
pop steam rate=14 on=disc(.35) life=1.6..2.6 v=up(.9..1.5)+sdir()*.12 size=.18..0.4 acc=drag(1.1)+buoy(.25) col=<.9,.9,.93> a=.3>0 sz=$size*(1>2.6) r=sprite(smoke-puff,alpha)`;
  for (const [i, [x, z]] of [[3.4, 32], [-3.6, -8], [2.4, 66], [-3, -60]].entries()) { cyl(`l11-manhole-${i}`, x, 0.06, z, 0.5, 0.5, 0.04, { color: "oklch(0.2 0.01 250)", metalness: 0.7, roughness: 0.5 }, { physics: undefined }); sp(`l11-manhole-steam-${i}`, { feetPosition: { x, y: 0.15, z }, fx: { script: STEAM } }); }
  const SUB = { x: 13.6, z: 60.5 };
  for (const w of [-1, 1]) bx(`l11-sub-well-${w}`, SUB.x + w * 1.3, -2.9, SUB.z, 0.2, 3.24, 4.2, { color: "oklch(0.72 0.05 160)", roughness: 0.7 }); // the stairwell's tiled sides, down to the platform corridor
  // the flight: sidewalk top (0.336, z 58.4) down to the hall landing (-2.6, z 62.6): 11 solid risers of 0.267 m (under the body's 0.3 m step),
  // each with a worn steel nosing; an unseen 35° ramp under them carries the feet smoothly
  const ST = { n: 11, top: 0.336, z0: 58.4, run: 4.2, drop: 2.94 }, rise = ST.drop / ST.n, tread = ST.run / ST.n;
  for (let k = 0; k < ST.n; k++) {
    const y = ST.top - (k + 1) * rise, z = ST.z0 + (k + 0.5) * tread;
    bx(`l11-sub-step-${k}`, SUB.x, -2.9, z, 2.4, y + 2.9, tread, { color: "oklch(0.52 0.015 80)", roughness: 0.9 });
    bx(`l11-sub-nose-${k}`, SUB.x, y - 0.02, z - tread / 2 + 0.04, 2.4, 0.03, 0.08, { color: "oklch(0.62 0.02 90)", metalness: 0.7, roughness: 0.35 }, { physics: undefined });
  }
  { const len = Math.hypot(ST.run, ST.drop), a = Math.atan2(ST.drop, ST.run) * 180 / Math.PI, n = 0.06 / Math.cos(a * Math.PI / 180);
    sp("l11-sub-ramp", { feetPosition: { x: SUB.x, y: ST.top - ST.drop / 2 - n, z: ST.z0 + ST.run / 2 }, pivot: "center", rotation: { pitch: a }, primitive: { kind: "box", width: 2.4, height: 0.12, depth: len }, visible: false, physics: { body: "static", collider: "box" } }); }
  const IRON = { color: "oklch(0.3 0.09 150)", metalness: 0.65, roughness: 0.45 }; // MTA green cast iron, worn at the grip
  for (const s of [-1, 1]) {
    const kids = [
      { feetPosition: { x: 0, y: 0.84, z: 0 }, primitive: { kind: "box", width: 0.06, height: 0.06, depth: 4, bevel: 0.025 }, material: { ...IRON, color: "oklch(0.36 0.07 140)", roughness: 0.3 } },
      { feetPosition: { x: 0, y: 0.1, z: 0 }, primitive: { kind: "box", width: 0.04, height: 0.05, depth: 4 }, material: IRON },
      ...Array.from({ length: 15 }, (_, i) => ({ feetPosition: { x: 0, y: 0.1, z: -1.75 + i * 0.25 }, primitive: { kind: "cylinder", radiusTop: 0.012, radiusBottom: 0.012, height: 0.74 }, material: IRON })),
      ...Array.from({ length: 4 }, (_, i) => ({ feetPosition: { x: 0, y: 0.45, z: -1.5 + i * 1 }, primitive: { kind: "torus", radius: 0.12, tube: 0.012 }, rotation: { yaw: 90 }, pivot: "center", material: IRON })),
      { feetPosition: { x: 0, y: 0, z: 1.98 }, primitive: { kind: "box", width: 0.09, height: 0.95, depth: 0.09 }, material: IRON },
      { feetPosition: { x: 0, y: 0.95, z: 1.98 }, primitive: { kind: "sphere", radius: 0.06 }, material: IRON },
    ];
    sp(`l11-sub-rail-${s}`, { feetPosition: { x: SUB.x + s * 1.2, y: 0.336, z: SUB.z }, primitive: { kind: "box", width: 0.07, height: 0.9, depth: 4.0 }, material: { color: "oklch(0 0 0 / 0)", transparent: true, opacity: 0, depthWrite: false }, castShadow: false, physics: { body: "static", collider: "box" }, children: kids });
    cyl(`l11-sub-post-${s}`, SUB.x + s * 1.2, 0.336, SUB.z - 2.1, 0.05, 0.08, 2.6, IRON);
    sp(`l11-sub-globe-${s}`, { feetPosition: { x: SUB.x + s * 1.2, y: 3.14, z: SUB.z - 2.1 }, primitive: { kind: "sphere", radius: 0.2 }, material: { color: "oklch(0.8 0.2 145)", emissive: "oklch(0.8 0.2 145)", emissiveIntensity: 2.4 }, light: { kind: "point", color: "oklch(0.85 0.2 145)", intensity: 2.5, distance: 8 }, behavior: "scripts/l11-globe.js", state: { base: 2.5 }, children: [{ feetPosition: { x: 0, y: -0.24, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.06, height: 0.08 }, material: IRON }] });
  }
  sp("l11-sub-sign", { feetPosition: { x: SUB.x, y: 2.74, z: SUB.z - 2.1 }, rotation: { yaw: 180 }, primitive: { kind: "box", width: 1.6, height: 0.5, depth: 0.06 }, material: { color: "oklch(0.2 0.02 250)" }, ui: `<div face="front" width="1.6m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:900;font-size:240px;letter-spacing:8px;color:#fff;background:#1a6b3a">SUBWAY</div>` });
  // billboards on stilts that change their ads when nobody is looking
  const bb = [];
  [[-17.5, 74, -90], [17.5, -74, 90]].forEach(([x, z, yaw], b) => {
    for (const sz of [-2.6, 2.6]) cyl(`l11-bb-post-${b}-${sz}`, x, 0, z + sz, 0.16, 0.2, 6.4, { color: "oklch(0.3 0.01 250)", metalness: 0.8, roughness: 0.5 });
    bx(`l11-bb-back-${b}`, x + (yaw > 0 ? 0.1 : -0.1), 6.2, z, 0.2, 4.0, 7.6, { color: "oklch(0.25 0.01 250)", metalness: 0.7, roughness: 0.5 });
    adSign(sp, b, 0, x, z, yaw); bb.push(b);
  });
  // the city's hum
  sp("l11-ambience", { feetPosition: { x: 0, y: 3, z: 10 }, audio: { clip: "cdn/sfx-large-city-street-ambience-distant-traffic-hum-and-wind-loop.mp3", loop: true, gain: 0.22, spatial: false, bus: "Ambience" } });
  return { cars, nAds: ADS.length, billboards: bb };
}

// ---- the living parts: ads change, parked cars move kerb to kerb, a siren or a horn a long way off
export function tickCity(ctx, mem, heard) {
  const now = ctx.now(), pls = ctx.place.players;
  const nearAny = (p, r) => pls.some((q) => Math.hypot(q.feetPosition.x - p.x, q.feetPosition.z - p.z) < r);
  if (!mem.adAt) { mem.adAt = now + 20000; mem.carAt = now + 30000; mem.farAt = now + 25000; }
  if (now > mem.adAt) { mem.adAt = now + 45000; // the billboards change their ads when nobody is looking at them
    BB_POS.forEach(([x, z, yaw], b) => { const o = ctx.getObject(`l11-bb-ad-${b}`); if (!o || nearAny(o.feetPosition, 55)) return; const next = ((o.state?.ad ?? 0) + 1) % ADS.length; ctx.destroy(o.id); adSign((id, s) => ctx.spawn(id, s), b, next, x, z, yaw); }); }
  if (now > mem.carAt) { mem.carAt = now + 35000 + ctx.random() * 30000;
    const cars = ctx.query({ tags: ["l11car"] }); if (cars.length > 3) { const a = cars[Math.floor(ctx.random() * cars.length)], b = cars[Math.floor(ctx.random() * cars.length)];
      if (a.id !== b.id && !nearAny(a.feetPosition, 45) && !nearAny(b.feetPosition, 45)) { const pa = a.feetPosition, pb = b.feetPosition; a.feetPosition = { x: pb.x, y: pb.y, z: pb.z }; b.feetPosition = { x: pa.x, y: pa.y, z: pa.z }; } } }
  if (now > mem.farAt) { mem.farAt = now + 40000 + ctx.random() * 50000;
    const pl = pls[0]; if (pl) { const a = ctx.random() * Math.PI * 2, p = { x: pl.feetPosition.x + Math.cos(a) * 90, y: 4, z: pl.feetPosition.z + Math.sin(a) * 90 };
      heard(ctx, { clip: ctx.random() < 0.5 ? "/cdn/moodboard-realistic-gritty/sfx-distant-police-siren-passing-far-away-in-a-city.mp3" : "/cdn/moodboard-realistic-gritty/sfx-two-car-horns-honking-far-away-city-street.mp3", position: p, volume: 0.5, maxDistance: 160 }); } }
}
