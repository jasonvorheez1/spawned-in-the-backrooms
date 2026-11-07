// Level 5 Main Hall furnishing plan (lane l5-hall): every piece as a row { id, kind, x, y, z, yaw, p, box?, loot? }.
// Geometry: scripts/l5-hall-geo.js (furniture), scripts/l5-hall-fix.js (fixtures, leaves, placards, stairs).
// Room frame: u = x - door x, v = metres in from the door wall; s = +1 when v runs +z.
import { LIGHTS, ZONES, OPENINGS, PLACARDS, zoneAt } from "./level5.js";
const T = 0.075, R = [];
const add = (id, kind, x, z, yaw = 0, p = {}, o = {}) => R.push({ id: "l5-hall-" + id, kind, x: +x.toFixed(3), z: +z.toFixed(3), y: o.y ?? 0, yaw, p, loot: o.loot, fix: o.fix, pitch: o.pitch });
const L = (items, name, kind, lock, mat = "wood") => ({ items, name, kind, lock, mat });
// a frame: face(dir) = yaw that turns a piece's front toward the door (dir "door"), the back wall, -u (90) or +u (-90)
function frame(cd, zDoor, s) { const doorYaw = s > 0 ? 0 : 180; return { at: (u, v) => [cd + u, zDoor + s * v], door: doorYaw, back: doorYaw + 180, L: -90, R: 90 }; }
// ---- guest rooms: 4 x 8, door centred
const GUEST = {
  "room-n3": { bedU: 0.35, quilt: "oklch(0.82 0.08 20)", wood: "mahog", rug: "oklch(0.85 0.05 25)", odd: "suitcase", loot: ["almond,bandage", "ration,bobbypin", "almond,battery"], lockW: null },
  "room-n4": { bedU: -0.7, quilt: "oklch(0.75 0.06 150)", wood: "walnut", rug: "oklch(0.8 0.05 150)", odd: "radio", loot: ["firstaid", "beans,bar", "ammo"], lockW: "lockpick:25" },
  "room-n5": { bedU: 0.35, quilt: "oklch(0.86 0.04 240)", wood: "oak", rug: "oklch(0.82 0.04 240)", odd: "letter", loot: ["tape,almond", "bandage", "bar,bobbypin"] },
  "room-s1": { bedU: -0.35, quilt: "oklch(0.88 0.05 85)", wood: "walnut", rug: "oklch(0.8 0.06 70)", odd: "birdcage", loot: ["almond,almond", "battery,kit", "ration"] },
  "room-s2": { bedU: 0.35, quilt: "oklch(0.7 0.09 330)", wood: "mahog", rug: "oklch(0.75 0.07 330)", odd: "tea", loot: ["bar,beans", "bandage,almond", "shells"], lockW: "lockpick:40" },
  "room-s3": { bedU: -0.35, quilt: "oklch(0.8 0.06 200)", wood: "oak", rug: "oklch(0.78 0.05 190)", odd: "typewriter", loot: ["tape", "almond,ration", "bobbypin,bobbypin"] },
  "room-s4": { bedU: 0.7, quilt: "oklch(0.9 0.02 90)", wood: "walnut", rug: "oklch(0.7 0.06 45)", odd: "portrait", loot: ["firesalt", "almond,bandage", "meat:sardines,bar"] },
};
for (const o of OPENINGS) if (o.kind === "door" && GUEST[o.room]) {
  const g = GUEST[o.room], z = ZONES.find((q) => q.id === o.room), cd = (o.a0 + o.a1) / 2, s = o.at < 0 ? -1 : 1, F = frame(cd, o.at, s), n = o.room, no = PLACARDS[n];
  const uL = z.x0 - cd + T, uR = z.x1 - cd - T, vB = 8 - T, put = (id, kind, u, v, yaw, p, oo) => { const [x, zz] = F.at(u, v); add(n + "-" + id, kind, x, zz, yaw, p, oo); };
  put("rug", "rug", 0, 4.6, 0, { w: 2.6, d: 3.6, col: g.rug });
  put("bed", "bed", g.bedU, vB - 1.08, F.door, { w: 1.4, wood: g.wood, quilt: g.quilt, seed: no.length });
  const nsU = g.bedU > 0 ? g.bedU - 1.0 : g.bedU + 1.0;
  put("night", "nightstand", nsU, vB - 0.24, F.door, { wood: g.wood, deco: g.odd === "tea" ? "tea" : g.odd === "portrait" ? "clock" : "lamp", deco2: g.odd === "letter" ? "book" : undefined });
  put("wardrobe", "wardrobe", uL + 0.3, 3.4, F.L, { wood: g.wood, w: 1.1 }, { loot: L(g.loot[0], "Wardrobe", "wardrobe", g.lockW) });
  put("dresser", "dresser", uR - 0.26, 3.0, F.R, { wood: g.wood, w: 1.1, deco: g.odd === "birdcage" ? undefined : "vase", seed: no.length }, { loot: L(g.loot[1], "Dresser", "dresser") });
  put("chair", "sofa", uL + 0.55, 5.7, F.L + 25, { w: 1.0, up: g.odd === "tea" ? "velvet" : "leather", col: g.quilt });
  put("bag", g.odd === "suitcase" ? "openbag" : "luggage", uR - 0.45, 1.75, F.R + 10, { col: g.quilt, seed: no.length }, { loot: L(g.loot[2], g.odd === "suitcase" ? "Half-packed suitcase" : "Suitcase", "luggage", n === "room-s4" ? "lockpick:20" : undefined, "leather") });
  const wall = s < 0 ? -1 : 1;
  put("art", "painting", g.bedU, vB - 0.02, F.door, { w: 0.9, h: 0.6, style: "landscape", seed: no.length + 7 }, { y: 1.45 });
  if (g.odd === "radio") put("radiotable", "sidetable", 0.95, 7.4, F.door, { h: 0.7, wood: g.wood });
  if (g.odd === "letter") put("letter", "letter", g.bedU, vB - 0.55, F.door + 12, {}, { y: 0.67 });
  if (g.odd === "birdcage") put("cage", "birdcage", uR - 0.26, 3.0, F.R + 30, {}, { y: 0.86 });
  if (g.odd === "tea") put("teatable", "sidetable", uL + 0.5, 6.75, F.door, { h: 0.6, deco: "tea", wood: g.wood });
  if (g.odd === "typewriter") { put("wtable", "sidetable", uL + 0.3, 6.6, F.L, { h: 0.74, wood: g.wood }); put("tw", "typewriter", uL + 0.32, 6.6, F.L, {}, { y: 0.74 }); put("letter", "letter", uL + 0.5, 1.9, 40, {}, { y: 0 }); }
  if (g.odd === "portrait") put("turned", "painting", uL + 0.15, 1.9, F.R, { w: 0.6, h: 0.8, style: "portrait", seed: 99 }, { y: 0, pitch: -12 });
  R.push({ leafFor: o, room: n, no, cd, s });
}
// ---- suites: 10-11 x 7, writing desk, vanity, sofa, nicer
const SUITE = { "suite-nw": ["walnut", "oklch(0.78 0.08 30)", ["almond,ration,battery", "firstaid,bobbypin", "royal_ration", "ammo,shells"], "lockpick:45"], "suite-ne": ["mahog", "oklch(0.72 0.07 160)", ["almond,almond", "kit,tape", "bar,beans", "battery"], "lockpick:30"], "suite-sw": ["oak", "oklch(0.82 0.06 260)", ["ration,bandage", "almond", "firstaid", "ammo"], null], "suite-se": ["walnut", "oklch(0.7 0.1 350)", ["royal_ration,almond", "bobbypin,tape", "beans", "shells,battery"], "lockpick:60"] };
for (const o of OPENINGS) if (o.kind === "door" && SUITE[o.room]) {
  const [wood, col, loot, lock] = SUITE[o.room], z = ZONES.find((q) => q.id === o.room), cd = (o.a0 + o.a1) / 2, s = o.at < 0 ? 1 : -1, F = frame(cd, o.at, s), n = o.room, no = PLACARDS[n];
  const uL = z.x0 - cd + T, uR = z.x1 - cd - T, vB = 7 - T, put = (id, kind, u, v, yaw, p, oo) => { const [x, zz] = F.at(u, v); add(n + "-" + id, kind, x, zz, yaw, p, oo); };
  put("rug", "rug", 0, 3.6, 0, { w: 4.2, d: 3.4, col });
  put("bed", "bed", uL + 1.6, vB - 1.08, F.door, { w: 1.7, wood, quilt: col, seed: 20 + no.length });
  put("night1", "nightstand", uL + 0.3, vB - 0.24, F.door, { wood, deco: "lamp" }); put("night2", "nightstand", uL + 2.9, vB - 0.24, F.door, { wood, deco: "tea" });
  put("desk", "wdesk", uR - 1.6, vB - 0.33, F.door, { wood }, { loot: L(loot[0], "Writing desk", "desk", lock) });
  put("deskchair", "chair", uR - 1.6, vB - 1.0, F.back, { wood });
  put("vanity", "vanity", uR - 0.25, 3.6, F.R, { wood, mirror: true }, { loot: L(loot[1], "Vanity", "vanity") });
  put("stool", "stool", uR - 0.85, 3.6, F.R, { col });
  put("wardrobe", "wardrobe", uR - 0.3, 1.65, F.R, { wood, w: 1.2 }, { loot: L(loot[2], "Wardrobe", "wardrobe") });
  put("sofa", "sofa", uL + 0.46, 2.6, F.L, { w: 2.0, up: "velvet", col });
  put("ctable", "ctable", uL + 1.6, 2.6, F.L, { w: 1.0, d: 0.55 });
  put("bags", "luggage", uL + 3.5, vB - 0.3, F.door + 8, { col: "oklch(0.55 0.08 40)", seed: 5 }, { loot: L(loot[3], "Steamer trunk", "luggage", undefined, "leather") });
  put("art", "painting", uL + 1.6, vB - 0.02, F.door, { w: 1.2, h: 0.8, style: "landscape", seed: 40 + no.length }, { y: 1.5 });
  put("palm", "palm", uR - 0.4, 6.3, 0, { seed: 3 });
  R.push({ leafFor: o, room: n, no, cd, s: -s });
}
// ---- lobby (x -46..-30, z -13..13)
add("lobby-rug", "rug", -37.5, 0, 0, { w: 9, d: 14, col: "oklch(0.8 0.08 150)" });
add("lobby-table", "rtable", -37, 0, 0, { r: 0.65, orchid: true });
add("frontdesk", "frontdesk", -42.6, 3.2, -90, { w: 3.6 }, { loot: L("bobbypin,battery,almond", "Front desk drawers", "desk", "lockpick:30") });
add("cubbies", "cubbies", -45.74, 3.2, -90, { w: 1.9 });
for (const [i, sz] of [[0, -1], [1, 1]]) { const zc = sz * 7.6;
  add(`lobby-sofa${i}a`, "sofa", -37, zc - 1.7 * sz, sz < 0 ? 0 : 180, { w: 2.2, up: "leather" }); add(`lobby-sofa${i}b`, "sofa", -37, zc + 1.7 * sz, sz < 0 ? 180 : 0, { w: 2.2, up: "leather" });
  add(`lobby-ctable${i}`, "ctable", -37, zc, 0, { w: 1.3, d: 0.65 }); add(`lobby-arm${i}`, "sofa", -39.9, zc, -90, { w: 1.0, up: "velvet", col: "oklch(0.6 0.12 25)" });
  add(`lobby-side${i}`, "sidetable", -39.9, zc + 0.95 * sz, 0, { h: 0.62, deco: "lamp" }); }
for (const [i, x, z] of [[0, -31, -3.4], [1, -31, 3.4], [2, -45.3, -10.6], [3, -45.3, 10.6], [4, -31.2, -8.6], [5, -31.2, 9.3]]) add(`palm${i}`, "palm", x, z, i * 40, { seed: i + 1 });
add("gclock", "clock", -42, -12.72, 180, {});
add("hatstand", "hatstand", -43.6, 6.6, 0, {});
for (const [i, x] of [[0, -35.2], [1, -40.8]]) add(`portrait-n${i}`, "painting", x, -12.92, 180, { w: 0.8, h: 1.05, style: "portrait", seed: 3 + i }, { y: 1.7 });
for (const [i, x] of [[0, -34], [1, -38], [2, -42]]) add(`portrait-s${i}`, "painting", x, 12.92, 0, { w: 0.8, h: 1.05, style: "portrait", seed: 10 + i }, { y: 1.7 });
add("lobby-cab", "cabinet", -33.5, 12.69, 0, {}, { loot: L("almond,tape", "Curio cabinet", "cabinet", null, "wood") });
// ---- gallery (x -30..-6, z -3..3)
add("runner", "rug", -18, 0, 90, { w: 1.6, d: 22.5, col: "oklch(0.55 0.13 25)" });
for (const [i, x] of [[0, -27.6], [1, -25.8], [2, -22.2], [3, -13.4], [4, -9.8], [5, -8]]) add(`gal-shelf${i}`, "bookshelf", x, -2.715, 180, { w: 1.6, h: 2.6, seed: 30 + i });
for (const [i, x] of [[0, -22.5], [1, -12.4]]) { add(`gal-sofa${i}`, "sofa", x, 2.475, 0, { w: 2.1, up: "leather" }); add(`gal-side${i}a`, "sidetable", x - 1.45, 2.7, 0, { h: 0.65, deco: "lamp" }); add(`gal-side${i}b`, "sidetable", x + 1.45, 2.7, 0, { h: 0.65, deco: "vase" }); add(`gal-art${i}`, "painting", x, 2.92, 0, { w: 1.5, h: 1.0, style: "landscape", seed: 50 + i }, { y: 1.9 }); }
add("gal-cab0", "cabinet", -27, 2.695, 0, {}, { loot: L("almond", "China cabinet", "cabinet") }); add("gal-cab1", "cabinet", -8.5, 2.695, 0, {}, { loot: L("bandage,bar", "China cabinet", "cabinet", "lockpick:15") });
add("gal-art2", "painting", -14.5, 2.92, 0, { w: 0.7, h: 0.95, style: "portrait", seed: 61 }, { y: 1.8 });
// ---- cross halls and corridors
add("crossN-console", "console", -18.735, -6.5, -90, { w: 1.2, deco: "vase" }); add("crossN-art", "painting", -15.92 - 0.0, -6.5, 90, { w: 0.7, h: 0.95, style: "portrait", seed: 71 }, { y: 1.5 });
add("crossS-console", "console", -18.735, 6.5, -90, { w: 1.2, deco: "clock" }); add("crossS-urn", "urn", -16.4, 8.9, 0, {});
add("corrN-console0", "console", -21, -10.275, 0, { w: 1.2, deco: "vase" }); add("corrN-console1", "console", -14.4, -10.275, 0, { w: 1.2, deco: "lamp" }); add("corrN-urn", "urn", -6.4, -11.5, 0, {});
add("corrS-console0", "console", -22, 10.275, 180, { w: 1.2, deco: "vase" }); add("corrS-console1", "console", -14, 10.275, 180, { w: 1.2, deco: "book" });
add("cart", "cart", -7.3, 11.4, 62, {}, { loot: L("meat:chicken,almond", "Room-service cart (under the cloche)", "cart", null, "metal") });
// ---- library (x -30..-22, z -21..-13), door x -27..-25
for (const [i, x] of [[0, -29.05], [1, -27.4], [2, -24.6], [3, -22.95]]) add(`lib-shelf${i}`, "bookshelf", x, -20.715, 180, { w: 1.6, h: 3.3, seed: 80 + i });
for (const [i, z] of [[0, -18.2], [1, -16.5]]) { add(`lib-shelfW${i}`, "bookshelf", -29.715, z, -90, { w: 1.6, h: 3.3, seed: 90 + i }); add(`lib-shelfE${i}`, "bookshelf", -22.285, z, 90, { w: 1.6, h: 3.3, seed: 95 + i }); }
add("lib-ladder0", "ladder", -27.4, -20.45, 180, { h: 3.1 }); add("lib-ladder1", "ladder", -29.45, -17.2, -90, { h: 3.1 });
add("lib-map", "maptable", -26, -17.3, 0, {}); add("lib-tomes", "tomes", -25.4, -17.2, 20, { seed: 7 }, { y: 0.82 });
add("lib-lectern", "lectern", -23.4, -14.3, 135, {}); add("lib-arm", "sofa", -28.8, -14.4, -135, { w: 1.0, up: "leather", col: "oklch(0.45 0.08 30)" });
add("lib-desk", "wdesk", -23.2, -19.2, 90, { wood: "walnut" }, { loot: L("battery,tape", "Society desk", "desk", "lockpick:35") });
// ---- kitchen / dining (x -14..-6, z 13..21), door x -11..-9
add("k-counterL", "counter", -12.95, 20.59, 0, { w: 1.8 }, { loot: L("beans,ration", "Pantry counter", "counter") });
add("k-icebox", "icebox", -11.38, 20.615, 0, {}, { loot: L("meat:steak,almond", "Icebox", "icebox", null, "metal") });
add("k-range", "range", -9.5, 20.565, 0, {});
add("k-counterR", "counter", -7.38, 20.59, 0, { w: 2.5 }, { loot: L("weapon:knife,tape", "Prep counter drawers", "counter") });
add("k-prep", "counter", -13.59, 17.2, -90, { w: 2.0, h: 0.92 }, { loot: L("bar,beans", "Prep table", "counter") });
for (const [i, x] of [[0, -11.4], [1, -7.9]]) { add(`k-table${i}`, "dtable", x, 16.4, 0, { w: 1.8, seed: i });
  for (const [j, dx, dz, yw] of [[0, -0.45, -0.75, 180], [1, 0.45, -0.75, 180], [2, -0.45, 0.75, 0], [3, 0.45, 0.75, 0]]) add(`k-chair${i}${j}`, "chair", x + dx, 16.4 + dz, yw, {}); }
// ---- old stairway: the flight climbs -z from the arrival to the exit landing
add("stairs", "stairs", -8, -17.9, 0, { w: 2.6, n: 6, land: 1.33 }, { fix: true });
// ---- fixtures at every light point in this wing
const MINE = new Set(["lobby", "gallery", "crossN", "crossS", "corrN", "corrS", "library", "room-n3", "room-n4", "room-n5", "stairs4", "room-s1", "room-s2", "room-s3", "room-s4", "kitchen", "suite-nw", "suite-ne", "suite-sw", "suite-se"]);
LIGHTS.forEach((l, i) => { const z = zoneAt(l.x, l.z); if (!z || !MINE.has(z.id) || !["chandelier", "pendant", "sconce", "flush", "lamp", "bulb"].includes(l.kind)) return; if (l.kind === "chandelier" && z.id !== "lobby") return;
  add("fx-" + i, l.kind, l.x, l.z, 0, { drop: +(z.h - l.y).toFixed(2) }, { y: l.y, fix: true }); });
export const PIECES = R.filter((r) => r.id);
export const LEAVES = R.filter((r) => r.leafFor);
