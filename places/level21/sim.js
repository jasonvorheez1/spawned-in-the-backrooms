// Level 2.1 "Locked" (backrooms-wiki.wikidot.com/level-2-1): the sublevel above Level 2 that M.E.G. Base Alef was locked into in 2020. You come up the one stairwell (Level 2's far
// dead end, once its steel shutter is broken); hot, humid storage halls of lockers and janitorial gear, Base Alef's gutted atrium and wings, Refrigerator Paradise (with Saltine
// stockpiles, coil-water collector, workbench and Quartermaster errand board), and in the east The Edges: deep, dark rock-cut concrete caves stalked by Smilers whose last tunnel
// runs into a cold cave mouth leading to Level 8. Layout: scripts/lib/level21.js; geometry: scripts/level21-geo.js; use & Smilers: scripts/l21-use.js.
import { N, S, H, HALF, ROOMS, zoneOf, cellCenter, hash, openings, isOpen, roomAt, laneCell, isEdge, DOWN, CAVE, LANE, EDGE_X, ARRIVE } from "../../scripts/lib/level21.js";
import L from "../../scripts/lib/data/level21.yml";
import { spawnContainerL2, spawnCrateL2, spawnRemains, spawnWeapon, rollWeaponL2 } from "../../scripts/lib/loot.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook } from "../../scripts/lib/clothes.js";
import { npcState } from "../../scripts/lib/stats.js";
import { keepPeople } from "../../scripts/lib/level-kit.js";
import { weaponBody } from "../../scripts/lib/weapon-look.js";
export const cadence = "500ms";
const V = 8; // 7: modeled cots, bunks and workbench (Shelly: less blocky)
const COT = { id: "/cdn/value.66bddc7e8f06c294092289342cca8265ad492304cd8e1df9cef66e01e9b94c72.glb", forward: "-z" }, BENCH = { id: "/cdn/value.79f1d7e5cb9f66321063c5449edeb0e169c6f6223a0bac5e89d7067905636e1e.glb", forward: "-z" };
const rm = (type) => ROOMS.filter((r) => r.type === type);
const center = (r) => cellCenter(r.x0 + (r.w - 1) / 2, r.z0 + (r.d - 1) / 2); // the middle of a room block
const edgeOf = (r, d) => { const c = center(r); return d === 0 ? c.x + (r.w * S) / 2 : d === 2 ? c.x - (r.w * S) / 2 : d === 1 ? c.z + (r.d * S) / 2 : c.z - (r.d * S) / 2; };
const sign = (w, h, html, bg = "oklch(0.22 0.012 90)") => ({ primitive: { kind: "box", width: w, height: h, depth: 0.05 }, material: { color: bg, roughness: 0.7 }, ui: html });
const MEG = (w) => `<div face="front" width="${w}m" style="font-family:Arial,sans-serif;font-weight:900;color:#f2d870;text-align:center;line-height:1.1">`;
const STEEL = { color: "oklch(0.35 0.02 250)", roughness: 0.45, metalness: 0.75 };
const WOOD = { color: "oklch(0.42 0.06 65)", roughness: 0.85 };

const STEAM_FX = `fx
pop mist rate=8 life=1.0..1.8 on=disc(.18) v=up(-.35..-0.75)+sdir()*.18 size=.14..0.28 col=<.88,.9,.92> a=.25>0 sz=$size*(1>2) r=sprite(soft-disc)`;
const CAVE_MIST_FX = `fx
pop breath rate=12 life=1.6..2.8 on=box(.8,1.8,2.2) v=sdir()*.25 size=.32..0.65 col=rgb(.65,.78,.85) a=.22>0 sz=$size*(1>1.6) r=sprite(soft-disc)`;

// the people who made it to Refrigerator Paradise and stayed
const PEOPLE = {
  "l21-goknar": { name: "Goknar · M.E.G. Agent", voice: "reyes", gun: "pistol", sp: "dog", sex: "m", eye: "#6a4a2a", top: "#4a5a3a", at: [-3, -1.5] },
  "l21-ned": { name: "Ned · Alef Quartermaster", voice: "hollis", gun: "crowbar", sp: "raccoon", sex: "m", eye: "#2a2a30", top: "#6a6a52", at: [3.5, 1.5] },
};
function person(ctx, id) {
  const g = PEOPLE[id], r = rm("fridges")[0], c = center(r);
  const look = { species: g.sp, sex: g.sex, eye: g.eye, topw: "jacket", top: g.top, botw: "pants", bottom: "#33332a", shoes: "boots", shoec: "#2a2018" };
  const x = c.x + g.at[0], z = c.z + g.at[1];
  ctx.spawn(id, { tags: ["npc", "l21-npc"], feetPosition: { x, y: 0.05, z }, rotation: { yaw: 0 }, physics: "character", ...critterSpec(npcLook(id, look, "survivor", 8)),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: g.name, role: "survivor", voice: g.voice, faction: "alef", factionName: "the Base Alef survivors of Level 2.1, locked out since July 2020", rounds: [{ x, y: 0.05, z, dwell: 40, act: null, look: { x: c.x, z: c.z } }], ri: 0, nerve: "steady", home: { x, z }, ...npcState(ctx, "agent", 80) } });
  ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
}

function lay(ctx) {
  const sp = (id, spec) => ctx.spawn(id, spec);
  // a rebuild (V bumped): take down what the last build laid
  for (const id of Object.keys(ctx.place.objects ?? {})) if (/^l21-/.test(id) && !id.includes("/") && !PEOPLE[id] && !/^l21-smiler/.test(id)) ctx.destroy(id);
  for (const tag of ["l2box", "container", "weapon", "crate", "remains"]) for (const o of ctx.query({ tags: [tag], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id); // the loot of the last build goes too: it was laid under auto ids
  sp("l21-geo", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level21-geo.js" }, material: { roughness: 0.88 } });

  // ---- lamps: white fluorescent tubes, a few flickering; The Edges are lit down the lane and almost nowhere else
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const z = zoneOf(cx, cz), c = cellCenter(cx, cz), r = hash(cx, cz, 201), h = z === "edge" || z === "edgecave" ? L.edgeHeight : z === "base" ? H + 0.5 : H;
    let on = r < 0.62;
    if (z === "edge") on = cz === LANE.z0 + 1 && cx % 2 === 0; else if (z === "edgecave") on = r < 0.1;
    if (z === "fridges" || z === "base" || z === "lockers") on = r < 0.9;
    if (!on) continue;
    const col = z === "edge" || z === "edgecave" ? "oklch(0.93 0.05 150)" : r < 0.07 ? "oklch(0.9 0.1 70)" : "oklch(0.97 0.012 200)", along = isOpen(cx, cz, 1) && !isOpen(cx, cz, 0) ? 90 : 0;
    const spec = { feetPosition: { x: c.x, y: h - 0.1, z: c.z }, rotation: { yaw: along }, primitive: { kind: "box", width: 1.2, height: 0.06, depth: 0.2 }, material: { color: col, emissive: col, emissiveIntensity: 2.4 } };
    if (hash(cx, cz, 203) < 0.1 && z !== "edge") sp(`l21-lamp-${cx}-${cz}`, { ...spec, fx: { script: `fx\npop flick n=1 r=light(<.9,.95,1>,flick(5,.5)*5,9)` } });
    else sp(`l21-lamp-${cx}-${cz}`, { ...spec, light: { kind: "point", color: col, intensity: z === "edge" ? 7 : 5, distance: z === "edge" ? 16 : 11, shadow: { enabled: false } } });
    // Occasional hissing ceiling steam leak in the hot storage halls
    if (z === "hall" && hash(cx, cz, 209) < 0.045) sp(`l21-steam-${cx}-${cz}`, { feetPosition: { x: c.x + 0.9, y: h - 0.28, z: c.z }, fx: { script: STEAM_FX } });
  }

  // ---- the way down and the way east (the breathing cave mouth to Level 8)
  sp("l21-from-l2", { feetPosition: { x: DOWN.x + 2.4, y: 0.1, z: DOWN.z }, rotation: { yaw: -90 } });
  sp("l21-from-l8", { feetPosition: { x: CAVE.x - 3.2, y: 0.1, z: CAVE.z }, rotation: { yaw: -90 } });
  sp("l21-down", { feetPosition: { x: DOWN.x + 0.7, y: 0, z: DOWN.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.6, height: 2.4, depth: 1.4 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level2#l2-from-l21" } });
  sp("l21-cave", { feetPosition: { x: CAVE.x - 1.0, y: 0, z: CAVE.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 1.2, height: 3, depth: 3 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level8#l8-from-l21" } });
  sp("l21-down-sign", { feetPosition: { x: DOWN.x + 0.3, y: 2.4, z: DOWN.z }, rotation: { yaw: 90 }, ...sign(1.3, 0.4, `<div face="front" width="1.3m" style="font-size:90px;font-weight:900;color:#d8f0c0;text-align:center">STAIRS DOWN · LEVEL 2</div>`, "oklch(0.25 0.04 150)") });
  sp("l21-cave-sign", {
    feetPosition: { x: CAVE.x - 0.6, y: 3.1, z: CAVE.z }, rotation: { yaw: -90 },
    ...sign(2.4, 0.5, `<div face="front" width="2.4m" style="font-family:Arial,sans-serif;font-weight:900;color:#e8e0c0;text-align:center;line-height:1.05"><div style="font-size:90px;color:#ff9a4a">UNSURVEYED</div><div style="font-size:42px">DO NOT ENTER WITHOUT A ROPE</div></div>`, "oklch(0.1 0.01 60)"),
    fx: { script: CAVE_MIST_FX },
    children: [{ feetPosition: { x: 0, y: -1.6, z: -1.2 }, light: { kind: "point", color: "oklch(0.7 0.1 220)", intensity: 3.5, distance: 13 } }],
  });

  // ---- signs: Base Alef, the exploration wing, Refrigerator Paradise, the edge of the maps
  const L1 = rm("base")[0], bc = center(L1);
  sp("l21-sign-alef", { feetPosition: { x: cellCenter(2, ARRIVE.cz).x - 1.6, y: 2.3, z: DOWN.z }, rotation: { yaw: -90 }, ...sign(2.6, 0.9, `${MEG(2.6)}<div style="font-size:84px">M.E.G. BASE ALEF</div><div style="font-size:40px;color:#e8e0c0">sublevel storage &amp; quarters · 53 staff</div><div style="font-size:34px;color:#e8a098">COMMS DOWN · ACCESS SUSPENDED</div></div>`) });
  const ex = rm("explo")[0]; sp("l21-sign-explo", { feetPosition: { x: edgeOf(ex, 2) + 0.25, y: 2.3, z: center(ex).z }, rotation: { yaw: -90 }, ...sign(1.8, 0.5, `${MEG(1.8)}<div style="font-size:66px">EXPLORATION WING</div><div style="font-size:34px;color:#c8d8b8">team gear · sign out all equipment</div></div>`) });
  const fr = rm("fridges")[0], fc = center(fr); sp("l21-sign-fridge", { feetPosition: { x: fc.x, y: 2.4, z: edgeOf(fr, 3) + 0.2 }, rotation: { yaw: 0 }, ...sign(2.6, 0.7, `<div face="front" width="2.6m" style="font-family:Arial,sans-serif;font-weight:900;color:#f0f4f8;text-align:center;line-height:1.05"><div style="font-size:84px">REFRIGERATOR PARADISE</div><div style="font-size:36px;color:#a8d8c8">saltines · enough for the rest of our lives</div></div>`, "oklch(0.3 0.04 200)") });
  sp("l21-sign-edges", { feetPosition: { x: cellCenter(EDGE_X - 1, LANE.z0 + 1).x + 1.6, y: 2.3, z: cellCenter(0, LANE.z0 + 1).z }, rotation: { yaw: -90 }, ...sign(2.0, 0.7, `${MEG(2.0)}<div style="font-size:80px">THE EDGES</div><div style="font-size:36px;color:#e8a098">edge of the survey · no light beyond · smilers reported</div></div>`) });

  // ---- Base Alef: the atrium gutted, lockers along its walls, cots and an interactive lockout comms terminal
  for (let i = 0; i < 5; i++) spawnContainerL2(ctx, "locker", { x: edgeOf(L1, 2) + 0.5, z: bc.z - 6 + i * 3 }, -90, { noLock: i % 2 === 0, room: 70 });
  spawnContainerL2(ctx, "desk", { x: bc.x + 1.5, z: edgeOf(L1, 1) - 0.9 }, 180, { room: 70 });
  sp("l21-comms", {
    feetPosition: { x: bc.x + 1.5, y: 1.0, z: edgeOf(L1, 1) - 0.9 }, tags: ["usable"], behavior: "scripts/l21-use.js",
    ...sign(0.9, 0.5, `<div face="front" width="0.9m" style="font-family:monospace;color:#7aff9a;font-size:60px;text-align:left;line-height:1.1">BASE ALEF<br>NO CARRIER<br>LAST SYNC 11 JUL 2020</div>`, "oklch(0.1 0.01 150)"),
    state: { kind: "comms", name: "Base Alef lockout terminal", verb: "Read lockout logs", info: "Buffered M.E.G. dispatches from July–August 2020, recorded after the steel wall sealed Base Alef inside Level 2.1.", tint: "#7aff9a" },
    children: [{ feetPosition: { x: 0, y: 0.2, z: -0.25 }, light: { kind: "point", color: "oklch(0.75 0.16 145)", intensity: 1.1, distance: 4.5 } }],
  });
  for (let i = 0; i < 4; i++) sp(`l21-cot-${i}`, { feetPosition: { x: bc.x - 2 + (i % 2) * 2.2, y: 0, z: bc.z + 1.2 + Math.floor(i / 2) * 2.2 }, rotation: { yaw: (i % 2 ? 4 : -3) }, model: COT, layout: { box: { min: { x: -0.95, y: 0, z: -0.95 }, max: { x: 0.95, y: 0.55, z: 0.95 } } }, physics: { body: "static", collider: "box" } });
  spawnRemains(ctx, { x: bc.x + 2.6, z: bc.z - 1.4 }, ["ration", "bandage", "page:11", "ammo"], "Alef operative's remains");
  spawnRemains(ctx, { x: bc.x - 3.0, z: bc.z + 4.6 }, ["almond", "kit", "battery"], "Alef operative's remains");

  // ---- the Exploration Wing: bags, medical supplies, tools, and the Forbidden Berries Specimen Case (Memo #13)
  const exc = center(ex);
  [["cagecrate", -2.2, -2], ["cagecrate", -2.2, 0], ["lockbox", 2, -2.2], ["toolbox", 2, 0.4], ["cabinet", 0, 2.4]].forEach(([k, a, b], i) => spawnContainerL2(ctx, k, { x: exc.x + a, z: exc.z + b }, i % 2 ? 90 : -90, { bonus: 1, room: 71 }));
  spawnRemains(ctx, { x: exc.x + 1.4, z: exc.z + 3.6 }, ["firstaid", "battery", "battery", "page:12"], "Alef operative's remains");
  sp("l21-berries", {
    feetPosition: { x: exc.x, y: 0.0, z: exc.z - 0.6 }, tags: ["usable"], physics: "static", behavior: "scripts/l21-use.js",
    primitive: { kind: "box", width: 0.85, height: 0.88, depth: 0.65 }, material: STEEL,
    state: { kind: "berries", name: "Specimen Jar #09 (Forbidden Berries)", verb: "Eat the strange berries", info: "A sealed glass specimen cylinder labeled: 'DO NOT CONSUME — BY ORDER OF ALEF ADMINISTRATION (SEE MEMO #13)'.", tint: "#ff5a78" },
    children: [
      { feetPosition: { x: 0, y: 0.88, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.22, radiusBottom: 0.22, height: 0.44 }, material: { color: "oklch(0.75 0.06 200)", opacity: 0.42, transparent: true, roughness: 0.15 } },
      { feetPosition: { x: 0, y: 0.94, z: 0 }, primitive: { kind: "sphere", radius: 0.14 }, material: { color: "oklch(0.55 0.22 20)", emissive: "oklch(0.6 0.24 18)", emissiveIntensity: 2.2 } },
      { feetPosition: { x: 0, y: 1.25, z: 0 }, light: { kind: "point", color: "oklch(0.62 0.22 20)", intensity: 1.1, distance: 5 } },
    ],
  });

  // ---- quarters, the offices, the locker room (checkered tile, grey and brown lockers), restrooms, break room, storage rooms
  const bk = rm("bunks")[0], kc = center(bk);
  for (let i = 0; i < 6; i++) sp(`l21-bunk-${i}`, { feetPosition: { x: kc.x - 3.4 + (i % 3) * 3.4, y: 0.32, z: kc.z - 2.4 + Math.floor(i / 3) * 4.2 }, primitive: { kind: "box", width: 0.95, height: 0.1, depth: 1.95 }, material: { color: "oklch(0.35 0.05 30)", roughness: 0.9 }, physics: "static" });
  spawnContainerL2(ctx, "cabinet", { x: kc.x, z: edgeOf(bk, 1) - 0.8 }, 180, { room: 72 });
  const of = rm("office")[0], oc = center(of);
  [["filing", -4], ["filing", -2.4], ["desk", 0.5], ["desk", 3]].forEach(([k, a], i) => spawnContainerL2(ctx, k, { x: oc.x + a, z: edgeOf(of, 1) - (k === "desk" ? 1.6 : 0.7) }, 180, { room: 73 + i }));
  spawnRemains(ctx, { x: oc.x - 1, z: oc.z + 1 }, ["bar", "keycard", "page:13"], "Alef administrator's remains");
  const lk = rm("lockers")[0], lc = center(lk);
  for (let i = 0; i < 6; i++) spawnContainerL2(ctx, "locker", { x: lc.x - 4.8 + i * 1.0, z: edgeOf(lk, 3) + 0.45 }, 0, { noLock: i % 3 === 0, room: 80 }); // the brown ones, in a row
  for (let i = 0; i < 4; i++) spawnContainerL2(ctx, "locker", { x: edgeOf(lk, 0) - 0.45, z: lc.z - 3.6 + i * 1.0 }, 90, { noLock: false, room: 81 }); // and the grey ones, padlocked
  spawnRemains(ctx, { x: lc.x, z: lc.z }, ["bandage", "almond", "page:14"], "Operative's remains");
  const rr = rm("restroom")[0]; spawnContainerL2(ctx, "cabinet", { x: center(rr).x, z: edgeOf(rr, 1) - 0.6 }, 180, { room: 82 });
  const br = rm("break")[0]; spawnContainerL2(ctx, "vending", { x: edgeOf(br, 0) - 0.6, z: center(br).z - 2 }, 90, { room: 83 }); spawnContainerL2(ctx, "fridge", { x: edgeOf(br, 0) - 0.5, z: center(br).z + 1 }, 90, { room: 84 });
  rm("store").forEach((r, i) => { const c = center(r); [["toolbox", -1.5], ["locker", 0.2], ["cabinet", 1.8]].forEach(([k, a], j) => spawnContainerL2(ctx, k, { x: c.x + a, z: edgeOf(r, 1) - 0.6 }, 180, { bonus: i === 1 ? 1 : 0, room: 90 + i * 3 + j })); });

  // ---- Refrigerator Paradise: fridges and freezers, interactive Saltine stockpile, coil-water collector, workbench, and Quartermaster errand board
  for (let i = 0; i < 6; i++) spawnContainerL2(ctx, "fridge", { x: fc.x - 7 + i * 2.8, z: edgeOf(fr, 3) + 0.55 }, 0, { bonus: 2, noLock: true, room: 100 + i });
  for (let i = 0; i < 4; i++) spawnContainerL2(ctx, "fridge", { x: fc.x - 7 + i * 4.5, z: edgeOf(fr, 1) - 0.55 }, 180, { bonus: 1, noLock: true, room: 110 + i });
  spawnContainerL2(ctx, "cabinet", { x: edgeOf(fr, 0) - 0.5, z: fc.z - 2 }, 90, { bonus: 1, noLock: true, room: 120 }); spawnContainerL2(ctx, "cabinet", { x: edgeOf(fr, 0) - 0.5, z: fc.z + 1.5 }, 90, { bonus: 1, noLock: true, room: 121 });
  sp("l21-fridge-glow", { feetPosition: { x: fc.x, y: 2.5, z: fc.z }, light: { kind: "point", color: "oklch(0.92 0.04 200)", intensity: 4.5, distance: 15 } });
  // Interactive Saltine Cracker Stockpile on the central table
  sp("l21-saltines", {
    feetPosition: { x: fc.x - 0.6, y: 0.8, z: fc.z }, tags: ["usable"], behavior: "scripts/l21-use.js",
    primitive: { kind: "box", width: 0.65, height: 0.34, depth: 0.45 }, material: { color: "oklch(0.82 0.14 85)", roughness: 0.65 },
    state: { kind: "saltines", name: "Carton of Saltine crackers", verb: "Grab a handful of Saltines", info: "Crisp, salted crackers in wax-paper sleeves. Refrigerator Paradise has enough of them to last a lifetime.", tint: "#f5d468" },
  });
  // Interactive Freezer-Coil Condensation Water Collector
  sp("l21-cooler", {
    feetPosition: { x: edgeOf(fr, 2) + 0.65, y: 0.0, z: fc.z - 2.2 }, tags: ["usable"], physics: "static", behavior: "scripts/l21-use.js",
    primitive: { kind: "box", width: 0.52, height: 0.85, depth: 0.52 }, material: { color: "oklch(0.86 0.015 220)", roughness: 0.4 },
    state: { kind: "cooler", name: "Freezer-coil water collector", verb: "Drink cold coil water", info: "Ned rigged copper tubing from the freezer condensers into a 5-gallon jug. Ice-cold, clean water.", tint: "#74d4f8" },
    children: [
      { feetPosition: { x: 0, y: 0.85, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.19, radiusBottom: 0.21, height: 0.52 }, material: { color: "oklch(0.65 0.14 230)", opacity: 0.72, transparent: true, roughness: 0.15 } },
    ],
  });
  // Refrigerator Paradise Workbench
  sp("l21-bench", {
    feetPosition: { x: edgeOf(fr, 2) + 0.65, y: 0.0, z: fc.z + 1.4 }, rotation: { yaw: 0 }, tags: ["bench"], physics: "static",
    model: BENCH, layout: { box: { min: { x: -0.85, y: 0, z: -0.85 }, max: { x: 0.85, y: 1.7, z: 0.85 } } }, state: { name: "Quartermaster's workbench" },
    children: [
      { feetPosition: { x: 0, y: 1.65, z: 0 }, light: { kind: "point", color: "oklch(0.88 0.11 85)", intensity: 2.2, distance: 8 } },
    ],
  });
  // Alef Quartermaster Errand Board
  sp("l21-board", {
    feetPosition: { x: edgeOf(fr, 2) + 0.12, y: 1.45, z: fc.z - 0.5 }, rotation: { yaw: 90 }, tags: ["usable"], behavior: "scripts/l21-use.js",
    ...sign(1.4, 0.95, `<div face="front" width="1.4m" style="font-family:Arial,sans-serif;font-weight:900;color:#e8e0c0;text-align:center;line-height:1.1"><div style="font-size:58px;color:#f2d870">ALEF QUARTERMASTER</div><div style="font-size:32px">salvage &amp; survey bounties · see Ned</div><div style="font-size:26px;color:#a8d8c8">wire · metal · tape · electronics · The Edges</div></div>`),
    state: { kind: "board", name: "Quartermaster errand board", verb: "Check quartermaster board", info: "Jobs posted by Ned and Goknar to keep Refrigerator Paradise running.", tint: "#f2d870" },
  });

  // ---- the halls: crates, fallen operatives with cans of beans & journal pages, and weapons
  let crates = 0;
  for (let cx = 3; cx < EDGE_X && crates < L.crates; cx++) for (let cz = 0; cz < N && crates < L.crates; cz++) {
    const z = zoneOf(cx, cz); if (z !== "hall" && z !== "store") continue;
    if (hash(cx, cz, 301) > (openings(cx, cz).length === 1 ? 0.45 : 0.05)) continue;
    const c = cellCenter(cx, cz); spawnCrateL2(ctx, { x: c.x + (hash(cx, cz, 303) - 0.5) * 1.4, z: c.z + (hash(cx, cz, 305) - 0.5) * 1.4 }); crates++;
  }
  let bodies = 0;
  for (let cx = 6; cx < EDGE_X && bodies < 6; cx++) for (let cz = 0; cz < N && bodies < 6; cz++) {
    if (zoneOf(cx, cz) !== "hall" || openings(cx, cz).length !== 1 || hash(cx, cz, 401) > 0.18) continue;
    const c = cellCenter(cx, cz); bodies++;
    spawnRemains(ctx, { x: c.x + 0.4, z: c.z - 0.4 }, bodies === 3 ? ["beans", "beans", "page:15"] : bodies === 5 ? ["almond", "page:16"] : ["beans", "bar", "bandage"], bodies % 2 ? "Alef operative's remains" : "Wanderer's remains");
  }
  for (let i = 0; i < 6; i++) { const c = cellCenter(4 + Math.floor(ctx.random() * (EDGE_X - 4)), Math.floor(ctx.random() * N)); spawnWeapon(ctx, { x: c.x - 0.6, z: c.z + 0.5 }, rollWeaponL2(ctx)); }

  // ---- The Edges: John Banks's last note, his interactive T-handle blasting plunger & dynamite crate, and the fallen survey operative
  const jbX = cellCenter(EDGE_X - 1, LANE.z0 + 1).x + 1.9, jbZ = cellCenter(0, LANE.z0 - 1).z + 0.2;
  sp("l21-note-banks", { feetPosition: { x: jbX, y: 1.6, z: jbZ }, rotation: { yaw: 0 }, ...sign(0.7, 0.5, `<div face="front" width="0.7m" style="font-family:'Courier New',monospace;color:#2a2418;background:#e8dca0;font-size:34px;line-height:1.15;padding:10px;text-align:left">DEPTH ~5 m<br>6 STICKS<br>SOLID CONCRETE<br>"now or never"<br>— J.B.</div>`, "oklch(0.85 0.1 95)") });
  sp("l21-blaster", {
    feetPosition: { x: jbX + 0.45, y: 0.0, z: jbZ + 0.55 }, tags: ["usable"], physics: "static", behavior: "scripts/l21-use.js",
    primitive: { kind: "box", width: 0.42, height: 0.48, depth: 0.36 }, material: { color: "oklch(0.45 0.12 45)", roughness: 0.8 },
    state: { kind: "blaster", name: "John Banks's blasting plunger & crate", verb: "Inspect blasting gear", info: "A wooden T-handle dynamo detonator wired to the blasted concrete ceiling above, beside a crate of spare demolition supplies.", tint: "#ff9a52" },
    children: [
      { feetPosition: { x: 0, y: 0.48, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.02, radiusBottom: 0.02, height: 0.28 }, material: STEEL },
      { feetPosition: { x: 0, y: 0.74, z: 0 }, primitive: { kind: "box", width: 0.28, height: 0.045, depth: 0.045 }, material: WOOD }, // T-handle
      { feetPosition: { x: 0.45, y: 0.0, z: 0.1 }, primitive: { kind: "box", width: 0.36, height: 0.24, depth: 0.28 }, material: { color: "oklch(0.52 0.2 28)", roughness: 0.7 } }, // dynamite box
    ],
  });
  const eb = cellCenter(25, LANE.z0), suitMat = { color: "oklch(0.42 0.06 140)", roughness: 0.85 };
  sp("l21-edge-body", {
    feetPosition: { x: eb.x, y: 0, z: eb.z }, tags: ["container", "remains"],
    primitive: { kind: "box", width: 0.65, height: 0.78, depth: 0.42 }, material: suitMat,
    state: { name: "Operative's remains (The Edges)", verb: "Search", info: "A tied climbing rope, a flickering headlamp, a notebook. Whoever it was went on without being asked to turn back.", items: "battery,almond,bandage,page:17" },
    children: [
      { feetPosition: { x: 0, y: 0.8, z: 0.04 }, primitive: { kind: "sphere", radius: 0.19 }, material: { color: "oklch(0.68 0.05 65)", roughness: 0.8 } },
      { feetPosition: { x: 0, y: 0.9, z: 0.02 }, primitive: { kind: "sphere", radius: 0.22 }, material: { color: "oklch(0.35 0.04 145)", roughness: 0.5 } },
      { feetPosition: { x: 0, y: 0.96, z: 0.22 }, primitive: { kind: "cylinder", radiusTop: 0.045, radiusBottom: 0.05, height: 0.07 }, rotation: { pitch: 90 }, material: { color: "#fff8d0", emissive: "#fff4b8", emissiveIntensity: 3.5 } },
      { feetPosition: { x: -0.17, y: 0, z: 0.48 }, primitive: { kind: "box", width: 0.2, height: 0.18, depth: 0.68 }, material: suitMat },
      { feetPosition: { x: 0.17, y: 0, z: 0.48 }, primitive: { kind: "box", width: 0.2, height: 0.18, depth: 0.68 }, material: suitMat },
      { feetPosition: { x: 0.48, y: 0.02, z: 0.2 }, primitive: { kind: "torus", radius: 0.24, tube: 0.055 }, rotation: { pitch: 90 }, material: { color: "oklch(0.72 0.08 75)", roughness: 0.9 } }, // coiled rope
      { feetPosition: { x: 0, y: 1.0, z: 0.45 }, light: { kind: "point", color: "oklch(0.9 0.08 85)", intensity: 1.4, distance: 7 } },
    ],
  });
  sp("l21-life", { behavior: "scripts/l21-use.js" });
}

export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now();
  if ((s.builtV ?? 0) < V) { s.builtV = V; lay(ctx); s.peopleV = 0; }
  if (!ctx.getObject("l21-life")) ctx.spawn("l21-life", { behavior: "scripts/l21-use.js" });
  if (!s.peopleV) { s.peopleV = 1; for (const id of Object.keys(PEOPLE)) if (!ctx.getObject(id)) person(ctx, id); }
  if (now - (ctx.self.session.roofAt ?? 0) > 2000) { ctx.self.session.roofAt = now; // nobody stands on the ceiling: anyone above head height goes back to their spot on the floor
    for (const id of Object.keys(PEOPLE)) { const o = ctx.getObject(id); if (o && o.feetPosition.y > 1.5) { const h = o.state.home ?? o.feetPosition; o.feetPosition = { x: h.x, y: 0.05, z: h.z }; o.velocity = { x: 0, y: 0, z: 0 }; } } }
  keepPeople(ctx, Object.keys(PEOPLE), person);
  // hounds roam the halls and The Edges, kept topped up (scripts/hounds.js steps the pack; scripts/lib/maze21path.js steers them)
  if (!s.packMgr || !(s.packMgr in ctx.place.objects)) s.packMgr = ctx.spawn({ behavior: "scripts/hounds.js" });
  if (!s.houndAt) s.houndAt = now; // the first pack comes a while after the room starts
  if (now - s.houndAt > L.entityRespawn * 1000) {
    s.houndAt = now;
    const have = ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((h) => !h.state?.dead).length;
    for (let i = have; i < L.hounds; i++) {
      const c = cellCenter(14 + Math.floor(ctx.random() * (N - 14)), Math.floor(ctx.random() * N));
      ctx.spawn({ tags: ["hound"], feetPosition: { x: c.x, y: 0.05, z: c.z }, physics: { body: "character" }, primitive: { kind: "scripted", script: "scripts/hound-geo.js" }, state: npcState(ctx, "hound", 60, { xp: 40 }) });
    }
  }
}
