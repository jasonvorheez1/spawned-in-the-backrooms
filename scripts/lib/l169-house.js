// Level 169 piece, filled by its build lane. Contract: places/level169/sim.js calls these.
// Ferry's house: the shell and the hand-built rooms from scripts/l169-house-geo.js (params.part), laid at the house's centre, plus doors that swing and the lamps.
// Every number comes from scripts/lib/data/level169.yml (house, houseBuild). Ids: l169-house-*.
const GEO = "scripts/l169-house-geo.js";
const SHELL_GLB = "/cdn/value.150c87b478df0c8f2ab37379e19a56d85bda160aaaadbb1080ce0a3d3b1a23a7.glb";
const ROAD_GEO = "scripts/l169-road-geo.js";
export function layTrail(ctx, put, L) { // cairns every T.every m up the track mark, arrows facing the walker, and the yard's wind pump
  const T = L.trail; if (!T) return;
  const pts = ctx.place.terrain?.marks?.[T.mark]?.points ?? [[0, -14], [6, -120], [-10, -260], [14, -400], [18, -488]];
  let i = 0, carry = 0;
  for (let s = 0; s < pts.length - 1; s++) {
    const [ax, az] = pts[s], [bx, bz] = pts[s + 1], len = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / len, dz = (bz - az) / len;
    for (let d = carry; d < len; d += T.every, i++) {
      const side = i % 2 ? T.side : -T.side, x = ax + dx * d - dz * side, z = az + dz * d + dx * side;
      put(`l169-trail-${i}`, { feetPosition: { x, z, y: { terrain: -0.05 } }, rotation: (Math.atan2(-dx, -dz) * 180) / Math.PI, physics: "static", visibleRange: { max: 320 }, castShadow: true,
        primitive: { kind: "scripted", script: ROAD_GEO, params: { kind: "cairn", n: T.stones, sd: i + 3, arrow: true } } });
      carry = d + T.every - len;
    }
  }
  const m = T.mill; put("l169-trail-mill", { feetPosition: { x: m.x, z: m.z, y: { terrain: 0 } }, rotation: m.yaw, physics: "static", visibleRange: { max: 900 }, castShadow: true,
    primitive: { kind: "scripted", script: ROAD_GEO, params: { kind: "windmill", roll: 0 } } });
}
// Ferry's pantry: every tin and jar its own prop on the bare shelves (shelfUnit in l169-house-geo.js: x 4.2..7.4 house-local, shelf tops 0.12/0.58/1.02/1.46 m, front 0.32 m out of the hall wall)
const PANTRY = [ // token, shape, label or fill, name
  ["beans", "tin", "oklch(0.6 0.16 28)", "Can of beans"], ["beans", "tall", "oklch(0.55 0.1 250)", "Can of beans"], ["tomato_soup", "tin", "oklch(0.62 0.17 30)", "Tin of tomato soup"],
  ["tomato_soup", "tall", "oklch(0.85 0.12 95)", "Tin of tomato soup"], ["stale_ration", "tin", "oklch(0.6 0.12 150)", "Expired M.E.G. tin"], ["beans", "tin", "oklch(0.7 0.13 55)", "Can of beans"],
  ["peach_jar", "jar", "oklch(0.74 0.14 65)", "Jar of peaches"], ["pickle_jar", "jar", "oklch(0.6 0.11 125)", "Jar of pickles"], ["peach_jar", "jar", "oklch(0.7 0.15 50)", "Jar of peaches"],
];
function layPantry(ctx, put, L, C, F) {
  const r = L.house.rooms, T = L.houseBuild.wallT, zc = r.hall[3] + T / 2 + 0.16;
  let seed = 169; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let n = 0;
  for (const [s, yy] of [0.12, 0.58, 1.02, 1.46].entries()) {
    for (let x = 4.2 + 0.14; x < 7.4 - 0.12; ) {
      if (rnd() < 0.14) { x += 0.12; continue; } // a gap where something was already eaten
      const row = PANTRY[Math.floor(rnd() * PANTRY.length)], w = row[1] === "tall" ? 0.072 : 0.084;
      put(`l169-pantry-${n++}`, { tags: ["usable", "l169-pantry"], behavior: "scripts/pantry-item.js", feetPosition: { x: C.x + x + w / 2, y: F + yy, z: zc - 0.05 + rnd() * 0.1 }, rotation: -90 + (rnd() - 0.5) * 40,
        primitive: { kind: "scripted", script: "scripts/pantry-geo.js", params: row[1] === "jar" ? { kind: "jar", fill: row[2] } : { kind: row[1], label: row[2] } },
        physics: { body: "static", collider: "cylinder" }, visibleRange: { max: 40 },
        state: { name: row[3], verb: "Take", info: "Ferry's pantry · Tobin counts every tin", token: row[0], jar: row[1] === "jar", taken: false, owner: "l169-friend-2", ownerName: "Tobin", steal: true } });
      x += w + 0.012;
    }
  }
}
export function layHouse(ctx, put, L) {
  layTrail(ctx, put, L);
  const h = L.house, b = L.houseBuild, C = h.center, r = h.rooms;
  const ground = ctx.place.terrain?.heightAt?.(C.x, C.z) ?? 0, F = ground + h.floorUp;
  const part = (id, p, x, z, y, extra = {}) => put(`l169-house-${id}`, { feetPosition: { x, y, z }, primitive: { kind: "scripted", script: GEO, params: p }, physics: "static", ...extra });
  for (const p of ["shell", "yard", "basement"]) part(p, { part: p }, C.x, C.z, ground);
  part("kitchen", { part: "kitchen", shelfOnly: true, goods: false }, C.x, C.z, ground);
  layPantry(ctx, put, L, C, ground + h.floorUp);
  // the shell you see is the Blender build (art/ferry-house/build.py); the scripted shell stays as its collider, unseen
  const getO = ctx.getObject?.("l169-house-shell"); if (getO) getO.visible = false;
  const tx = (t, rep, extra = {}) => ({ texture: t, repeat: rep, wrap: "repeat", ...extra });
  put("l169-house-look", { feetPosition: { x: C.x, y: ground - 2.9, z: C.z + (b.lookDz ?? 0) } /* the model's lowest point is the basement slab, 2.9 m under the yard */, castShadow: true, receiveShadow: true, visibleRange: { max: 900 },
    model: { id: SHELL_GLB, materials: {
      stucco: tx("cdn/texture-pale-adobe-stucco.png", [0.5, 0.5], { color: "oklch(0.95 0.03 70)" }), plaster: tx("cdn/texture-limewash-plaster.png", [0.5, 0.5]),
      floor: tx("cdn/texture-swept-wood-plank-floor.png", [0.5, 0.5]), concrete: tx("cdn/texture-smooth-poured-concrete.png", [0.5, 0.5]),
      timber: tx("cdn/texture-weathered-timber-planks.png", [0.7, 0.7]), trim: tx("cdn/texture-weathered-timber-planks.png", [1, 1], { color: "oklch(0.93 0.04 75)" }),
      shutter: tx("cdn/texture-chipped-sage-green-painted-wood.png", [1, 1]), roof: tx("cdn/texture-galvanized-corrugated-steel-sheet-weathered.png", [0.5, 0.5], { metalness: 0.6, roughness: 0.5 }),
      rust: tx("cdn/texture-rusty-corrugated-tin-roof-sheet.png", [1, 1]), brick: tx("cdn/texture-sun-faded-red-brick-wall.png", [1, 1]),
      glass: { color: "oklch(0.85 0.04 220 / 0.3)", roughness: 0.08, opacity: 0.3, transparent: true } } } });
  // doors: front on the south face, living and kitchen off the hall's south wall, the bedrooms and den off its north wall
  const wallZ = { front: r.porch[2], living: r.hall[3], kitchen: r.hall[3], bed1: r.hall[2], bed2: r.hall[2], bed3: r.hall[2], den: r.hall[2] };
  for (const [k, [x0, x1]] of Object.entries(b.doors)) {
    const swing = k === "front" || k === "living" || k === "kitchen" ? -1 : 1; // into the room it guards
    part(`door-${k}`, { part: "door", w: x1 - x0, zo: 0.035 * swing, col: k === "front" ? "oklch(0.75 0.08 200)" : undefined }, x0, wallZ[k], F,
      { tags: ["usable"], rotation: 0, behavior: "scripts/l169-door.js", state: { yaw0: 0, swing, open: false, name: k === "front" ? "Front door" : "Door", verb: "Open" } });
  }
  // beds: three bedrooms and two cots in the den, kits at their feet
  const mid = (k) => [(r[k][0] + r[k][1]) / 2, (r[k][2] + r[k][3]) / 2];
  let n = 0;
  for (const k of ["bed1", "bed2", "bed3"]) {
    const [x, z] = mid(k);
    part(`bed-${k}`, { part: "bed" }, x - 1.2, z - 0.6, F, { tags: ["usable"], state: { name: "Bed", verb: "Look", info: "made up, a blanket folded at the foot" } });
    part(`kit-${k}`, { part: "kit", n: n++ % 3 }, x + 0.8, z - 2.4, F);
  }
  { const [x, z] = mid("den"); part("cot-1", { part: "bed", cot: true }, x - 1.3, z - 0.6, F); part("cot-2", { part: "bed", cot: true }, x + 1.3, z - 0.6, F); }
  // living: rug, bench, the map table and the board of routes
  { // basement crates you search (Shelly, Nov 15: "make some stuff lootables"): the shared container loot flow, E opens it
    const CR = "/cdn/value.64a96b8ea948f646874ae3d6f6e3f8139fcef1699363a1eb7523a8d82f929995.glb", XM = r.living[1], zs = r.living[3] - 0.2, BF = F - 3;
    const loot = [["Ferry's supply crate", "almond,almond,bandage,beans,cash:6"], ["Crate of spares", "battery,battery,bobbypin,bandage"], ["Dusty crate", "almond,bobbypin,beans,cash:3"]];
    [[XM + 7.3, zs - 0.4, 0, 6], [XM + 7.3, zs - 0.4, 0.6, 2], [XM + 8.15, zs - 0.35, 0, 15]].forEach(([x, z, up, yaw], i) =>
      put(`l169-house-loot-${i}`, { tags: ["container"], feetPosition: { x, y: BF + up, z }, rotation: { yaw }, model: { id: CR }, castShadow: true,
        layout: { box: { min: { x: -0.4, y: 0, z: -0.3 }, max: { x: 0.4, y: 0.6, z: 0.3 } } }, physics: "static",
        state: { items: loot[i][1], name: loot[i][0], verb: "Search", kind: "wood", owner: "l169-friend-2", ownerName: "Tobin" } })); }
  { const [x, z] = mid("living"); part("rug", { part: "rug", w: 3, d: 2.2 }, x, z + 0.5, F + 0.005); part("bench", { part: "bench" }, x, z + 2.2, F, { rotation: 180 });
    part("maptable", { part: "maptable" }, x - 2.4, z - 1.2, F); part("mapboard", { part: "mapboard" }, x - 2.4, r.hall[3] + 0.12, F + 1, { rotation: 180, physics: undefined });
    put("l169-house-mapchart", { feetPosition: { x: x - 2.4, y: F + 1.36, z: r.hall[3] + 0.135 }, rotation: 180, castShadow: false, primitive: { kind: "box", width: 1.62, height: 1.08, depth: 0.004 }, material: { texture: "/cdn/value.09c60272c011fe4220138ed9ce018805d3b1f67967b51a56c0ef026eb0415450.png", repeat: [1, 1], roughness: 0.85, transparent: true, alphaTest: 0.5 } }); }
  // the furniture you see: Tripo models (art pass, Nov 14); the scripted pieces stay as colliders, unseen
  const M = { bed: "/cdn/value.a80517cebda3855752e83ec0efa57adef4cd9ed8b993927ec4db5c6f7be3bc7c.glb", cot: "/cdn/value.8d3339a3fa5c283cf1251d0f11abb47f8b0388e7b576bfa7cef2560394e77bef.glb",
    kit: "/cdn/value.eca8c598b9635ca9dd37710d90c09c2a22fb1cd6c7bc4350026df9cf54ebf4b1.glb", bench: "/cdn/value.deb5057b345d8bf77d5e45c5b29111addfa13c16a2eccf25438e8967603bcce2.glb",
    table: "/cdn/value.d58e97357089082f01e8258e9db20ea148a8af7714637429c16482e89e92ac99.glb", counter: "/cdn/value.8afef9eb454fce97b4c7a21956c2213dc0c80e905f95988d8bdab1793861121d.glb" };
  const look = (id, m, x, z, yaw, hx, hy, hz) => put(`l169-house-m-${id}`, { feetPosition: { x, y: F, z }, rotation: yaw, castShadow: true, receiveShadow: true, model: { id: m }, layout: { box: { min: { x: -hx, y: 0, z: -hz }, max: { x: hx, y: hy, z: hz } } } });
  // Ferry's map desk, split (art/desk-split, Nov 15: "split this model into separate usable models"): the bare desk plus five pieces, each its own E (scripts/desk-item.js)
  const DESK = { desk: "/cdn/value.04803102ca40b0d0dc8b4853bff7bd2198abf4f1213ce1fa9dd2b0f2857ea99b.glb",
    map: ["/cdn/value.b62f2e86e0bbeeccfb3d81c045eadf98aa750b924ee8a271774fc915c6fcfbca.glb", 0.0282, 0.647, 0.0371, "Ferry's map", "Read", "hand-drawn, the routes she trusts"],
    books: ["/cdn/value.fd03cd9b6fa8eafa9e85c9e8f8560257ffca352f9de0da34eabee12d6a350c03.glb", 0.0489, 0.6476, 0.4125, "Books", "Read", "worn hardcovers, notes in the margins"],
    mug: ["/cdn/value.2cedc48f2ae996d7f430bed6bae3d4f30cda6fc82844f182b55f6a848bf71c2f.glb", -0.1728, 0.6476, -0.4161, "Tin mug", "Drink", "cold coffee, still half full"],
    compass: ["/cdn/value.fadf3574dd80a724bff92b6899b31b9a151b1f1600f3efd00ead7b6473f9c816.glb", -0.0413, 0.6476, -0.2151, "Old compass", "Take", "brass, the needle still swings"],
    pencils: ["/cdn/value.97b1bb6132d572acd2914627da7721a563fa65e39cc159d9b96e0b5abf2d0fee.glb", 0.1464, 0.647, -0.4061, "Pencils", "Sketch", "two stubs, sharpened with a knife"] };
  const desk = (id, x, z, yaw) => { // yaw 90: the model's +x runs to world -z, its +z to world +x
    put(`l169-house-m-${id}`, { feetPosition: { x, y: F, z }, rotation: yaw, castShadow: true, receiveShadow: true, physics: "static", model: { id: DESK.desk } });
    const c = Math.cos(yaw * Math.PI / 180), sn = Math.sin(yaw * Math.PI / 180);
    for (const [k, [m, ox, oy, oz, name, verb, info]] of Object.entries(DESK)) { if (k === "desk") continue;
      put(`l169-house-m-${id}-${k}`, { feetPosition: { x: x + ox * c + oz * sn, y: F + oy, z: z - ox * sn + oz * c }, rotation: yaw, castShadow: k !== "map", model: { id: m },
        tags: ["usable"], behavior: "scripts/desk-item.js", state: { kind: k, name, verb, info, owner: "l169-friend-3", ownerName: "Senna", steal: k === "compass" || k === "mug" } }); } }; // Senna's desk (Shelly, Nov 15: "mark their stuff as their own")
  const hide = (id) => { const o = ctx.getObject?.(`l169-house-${id}`); if (o) o.visible = false; };
  for (const k of ["bed1", "bed2", "bed3"]) {
    const [x, z] = mid(k); hide(`bed-${k}`); hide(`kit-${k}`);
    look(`bed-${k}`, M.bed, x - 1.2, z - 0.6, 90, 1.03, 1.1, 0.47); // the model's long side is its x; turn it into the bed collider's z axis
    look(`kit-${k}-a`, M.kit, x + 0.8 - 0.95, z - 2.4, 0, 0.21, 0.8, 0.2); look(`kit-${k}-b`, M.kit, x + 0.8 + 0.95, z - 2.4, 0, 0.21, 0.8, 0.2);
  }
  { const [x, z] = mid("den"); hide("cot-1"); hide("cot-2"); look("cot-1", M.cot, x - 1.3, z - 0.6, 0, 0.38, 0.5, 0.97); look("cot-2", M.cot, x + 1.3, z - 0.6, 0, 0.38, 0.5, 0.97); }
  { const [x, z] = mid("living"); hide("bench"); hide("maptable"); look("bench", M.bench, x, z + 2.2, 180, 0.8, 0.47, 0.22); desk("maptable", x - 2.4, z - 1.2, 90); }
  // the sitting corner (Nov 14 house pass): sofa against the kitchen wall facing the window, recliner across a coffee table, shelf and lamp behind
  { const sit = (id, m, fwd, x, z, yaw, s) => put(`l169-house-m-${id}`, { feetPosition: { x: x + (C.x - 18), y: F, z: z + (C.z + 500) }, rotation: yaw, castShadow: true, receiveShadow: true, physics: "static", model: { id: m, forward: fwd }, layout: { box: { min: { x: -s[0] / 2, y: 0, z: -s[2] / 2 }, max: { x: s[0] / 2, y: s[1], z: s[2] / 2 } } } });
    sit("sofa", "/cdn/value.ff13bc205536a957826e2f7fed75554c07ffe7848198e50e1d65f257cabacdd9.glb", "+x", 17.3, -496.4, 90, [2.1, 1.05, 1.01]);
    sit("coffee", "/cdn/value.b59b6a4d3115b48b5e3e42462530bbb5364e66607ba416592c80166a6cdd6483.glb", undefined, 15.6, -496.4, 90, [1.15, 0.46, 0.59]);
    sit("armchair", "/cdn/value.3e7196a1233581476ede9bfcb0b38934ec50b62b9174954d055d379c63fd73b6.glb", "+x", 13.9, -497.3, 242, [1.04, 1.05, 0.95]);
    sit("shelf", "/cdn/value.918584eed8336eda888580753019763471fcce0adcaf2bc66def78f53ae3fad0.glb", "+x", 16.7, -499.55, 180, [0.93, 1.85, 0.45]);
    sit("flamp", "/cdn/value.56e857c3fa9f839e7d3406ce7a54b6caaa028f92cfc1e5b9935ed654404c7d26.glb", "+x", 17.45, -494.7, 0, [0.51, 1.8, 0.51]); }
  { const kx = r.kitchen[1] - b.wallT - 0.31;
    look("counter-a", M.counter, kx, C.z + 2.6, 180, 0.31, 0.9, 1); look("counter-b", M.counter, kx, C.z + 4.6, 180, 0.31, 0.9, 1); // turned 180 so the sink and drawers face into the kitchen, not the wall
    desk("table", C.x + 4, C.z + 4, 90); }
  // the hall: a runner down its length, a bench under the family photo wall, pictures between the doors (painted Nov 14)
  { const hz = (r.hall[2] + r.hall[3]) / 2, nW = r.hall[2] + b.wallT / 2 + 0.012, sW = r.hall[3] - b.wallT / 2 - 0.012, PY = F + 1.22;
    part("runner-a", { part: "rug", w: 7.2, d: 0.78 }, 12.2, hz, F + 0.006, { physics: undefined }); part("runner-b", { part: "rug", w: 7.2, d: 0.78 }, 19.8, hz, F + 0.006, { physics: undefined });
    part("bench-hall", { part: "bench" }, 14, nW + 0.24, F); hide("bench-hall"); look("bench-hall", M.bench, 14, nW + 0.24, 0, 0.8, 0.47, 0.22);
    for (const [id, tex, x, wall, w, hh] of [
      ["family", "/cdn/value.0b63423a8a18a5ad62a92fed1a2174a298f8a5d442d9080abafddcb2be3b8e6d.png", 14, "n", 0.86, 0.645],
      ["map", "/cdn/value.b153a0ff6ed8d6b17054dbca88bfbd5832d6f582893a90b333dce335ad9dd5ed.png", 9.5, "n", 0.72, 0.54],
      ["mesa", "/cdn/value.2ef798fa20295d10074278acb94e961f53f0fec2477eb4ec82b6cd1658cbcf6e.png", 11.5, "s", 0.64, 0.48],
      ["well", "/cdn/value.93d50b65d189242b23f3a496a94c717f8925c2e1cdd44e23bd7b6e7f74a15956.png", 18, "s", 0.8, 0.6],
      ["mesa-2", "/cdn/value.2ef798fa20295d10074278acb94e961f53f0fec2477eb4ec82b6cd1658cbcf6e.png", 19, "n", 0.48, 0.36] ])
    { const y0 = PY + (id === "mesa-2" ? 0.12 : 0), wz = wall === "n" ? nW : sW, out = wall === "n" ? 1 : -1;
      part(`pic-${id}`, { part: "picture", w, h: hh, frame: id === "map" ? "oklch(0.4 0.05 50)" : undefined }, x, wz, y0, { physics: undefined, rotation: wall === "n" ? 180 : 0, castShadow: false });
      put(`l169-house-print-${id}`, { feetPosition: { x, y: y0 + 0.055 + 0.03, z: wz + out * 0.016 }, rotation: wall === "n" ? 0 : 180, castShadow: false, primitive: { kind: "box", width: w - 0.06, height: hh - 0.06, depth: 0.004 }, material: { texture: tex, repeat: [1, 1], roughness: 0.35 } }); } }
  // lamps: one per room, hung under the ceiling
  for (const k of ["living", "kitchen", "hall", "bed1", "bed2", "bed3", "den", "porch"]) {
    const [x, z] = mid(k), y = F + h.wallH - (k === "porch" ? 0.62 : 0.5);
    part(`lamp-${k}`, { part: "lamp", drop: 0.5 }, x, z, y, { physics: undefined, children: [{ feetPosition: { x: 0, y: -0.05, z: 0 }, light: { kind: "point", color: b.lamp.color, intensity: b.lamp.intensity * 0.12, distance: b.lamp.distance, shadow: { enabled: false } } }] });
  }
}
