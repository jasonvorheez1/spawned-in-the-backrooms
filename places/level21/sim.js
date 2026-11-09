// Level 2.1 "Locked" (backrooms-wiki.wikidot.com/level-2-1): the sublevel above Level 2 that M.E.G. Base Alef was locked into in 2020. You come up the one stairwell (Level 2's far
// dead end, once its steel shutter is broken); hot, humid storage halls of lockers and janitorial gear, Base Alef's gutted atrium and wings, Refrigerator Paradise (with Saltine
// stockpiles, coil-water collector, workbench and Quartermaster errand board), and in the east The Edges: deep, dark rock-cut concrete caves stalked by Smilers whose last tunnel
// runs into a cold cave mouth leading to Level 8. Layout: scripts/lib/level21.js; geometry: scripts/level21-geo.js; use & Smilers: scripts/l21-use.js.
import { N, S, H, HALF, ROOMS, zoneOf, cellCenter, hash, openings, isOpen, roomAt, laneCell, isEdge, DOWN, CAVE, LANE, EDGE_X, ARRIVE, heightOf } from "../../scripts/lib/level21.js";
import L from "../../scripts/lib/data/level21.yml";
import { spawnContainerL2, spawnCrateL2, spawnRemains, spawnWeapon, rollWeaponL2 } from "../../scripts/lib/loot.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook } from "../../scripts/lib/clothes.js";
import { npcState } from "../../scripts/lib/stats.js";
import { keepPeople } from "../../scripts/lib/level-kit.js";
import { weaponBody } from "../../scripts/lib/weapon-look.js";
import { fan, fanHousing, cable, DRIP, DUST, MIST } from "../../scripts/lib/ambient.js";
import { terminalSpec } from "../../scripts/lib/terminal.js";
import { tickChatter, CHATTER } from "../../scripts/lib/chatter.js";
import { spawnProp } from "../../scripts/lib/l2props.js";
export const cadence = "500ms";
const V = 25; // 18: locker room floor and mat to the ref photo, The Edges lit bright down every lane cell; // 17: Tripo props dress the rooms and halls (dress21), DANGER signs at dead ends; // 7: modeled cots, bunks and workbench; 8: stairwell props; 9: memo13, blast crater, survivor chatter; 10: fans, swinging cables and lamps, drips, dust and mist; 14: survey road flares, freezer frost, blast sparks, sandbags, show-don't-tell
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
const FLARE_FX = `fx
pop spark rate=22 life=.2..0.55 v=up(1.4..2.4)+sdir()*.65 size=.015..0.04 col=<1,.25,.08> a=.95>0 floor=die sz=$size*(1>.3) r=sprite(spark,alpha)
pop smoke rate=10 life=.9..1.8 on=disc(.06) v=up(.7..1.3)+sdir()*.22 size=.1..0.24 col=<.25,.18,.2> a=.4>0 sz=$size*(1>2.2) r=sprite(smoke-puff,alpha)`;
const CRATER_SPARK_FX = `fx
pop spark burst=14..24 rate=1.2 life=.15..0.4 v=sdir()*(1.2..2.8)+up(-.8) size=.01..0.035 col=<.9,.95,1> a=1>0 floor=die sz=$size*(1>.2) r=sprite(spark,alpha)`;
const FROST_FX = `fx
pop chill rate=8 life=1.6..2.8 on=box(5,.15,.8) v=up(-.06..-.18)+sdir()*.12 size=.22..0.48 col=<.82,.92,.98> a=.28>0 sz=$size*(1>1.5) r=sprite(soft-disc)`;

// the people who made it to Refrigerator Paradise and stayed
const PEOPLE = {
  "l21-goknar": { name: "Goknar · M.E.G. Agent", voice: "reyes", gun: "pistol", sp: "dog", sex: "m", eye: "#6a4a2a", top: "#4a5a3a", at: [-3, -1.5] },
  "l21-ned": { name: "Ned · Alef Quartermaster", voice: "hollis", gun: "crowbar", sp: "raccoon", sex: "m", eye: "#2a2a30", top: "#6a6a52", at: [3.5, 1.5] },
};
function person(ctx, id) {
  const g = PEOPLE[id], r = rm("fridges")[0], c = center(r);
  const look = { species: g.sp, sex: g.sex, eye: g.eye, topw: "jacket", top: g.top, botw: "pants", bottom: "#33332a", shoes: "boots", shoec: "#2a2018" };
  const shortName = g.name.split(" ")[0];
  const roundsNed = [
    { x: edgeOf(r, 2) + 0.85, y: 0.05, z: c.z + 1.4, dwell: 30, act: null, look: { x: edgeOf(r, 2) + 0.65, z: c.z + 1.4 } },
    { x: edgeOf(r, 2) + 0.85, y: 0.05, z: c.z - 1.5, dwell: 20, act: "cdn/clip-crouch-idle-loop.glb", look: { x: edgeOf(r, 2) + 0.65, z: c.z - 2.2 } },
    { x: edgeOf(r, 2) + 1.1, y: 0.05, z: c.z - 0.5, dwell: 22, act: null, look: { x: edgeOf(r, 2) + 0.12, z: c.z - 0.5 } },
    { x: c.x - 0.6, y: 0.05, z: c.z + 0.8, dwell: 25, act: "cdn/clip-pickup.glb", look: { x: c.x - 0.6, z: c.z } },
  ];
  const roundsGoknar = [
    { x: edgeOf(r, 0) - 1.2, y: 0.05, z: c.z, dwell: 35, act: null, look: { x: edgeOf(r, 0) + 3, z: c.z } },
    { x: c.x - 2.5, y: 0.05, z: edgeOf(r, 3) + 1.4, dwell: 22, act: null, look: { x: c.x - 2.5, z: edgeOf(r, 3) } },
    { x: c.x + 1.2, y: 0.05, z: c.z, dwell: 28, act: null, look: { x: c.x - 0.6, z: c.z } },
    { x: edgeOf(r, 2) + 1.4, y: 0.05, z: c.z - 2.0, dwell: 18, act: null, look: { x: edgeOf(r, 2) + 0.65, z: c.z - 2.2 } },
  ];
  const rounds = id === "l21-ned" ? roundsNed : roundsGoknar;
  const p0 = rounds[0];
  ctx.spawn(id, {
    tags: ["npc", "l21-npc", "usable"], feetPosition: { x: p0.x, y: 0.05, z: p0.z }, rotation: { yaw: 0 }, physics: "character", ...critterSpec(npcLook(id, look, "survivor", 8)),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js", "scripts/l21-use.js"],
    state: {
      name: g.name, role: "survivor", voice: g.voice, faction: "alef", factionName: "the Base Alef survivors of Level 2.1, locked out since July 2020",
      rounds, ri: 0, nerve: "steady", home: { x: p0.x, z: p0.z }, ...npcState(ctx, "agent", 80),
      kind: id === "l21-ned" ? "ned" : "goknar", verb: `Talk to ${shortName}`, info: `A survivor in Refrigerator Paradise.`, tint: id === "l21-ned" ? "#e8c070" : "#7aff9a"
    }
  });
  ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
}

function lay(ctx) {
  const sp = (id, spec) => {
    const o = { ...spec };
    if (id !== "l21-geo" && !o.visibleRange && !/npc/.test(String(o.tags))) {
      o.visibleRange = { max: 45 };
    }
    const pr = o.primitive;
    if (pr && pr.kind === "box" && Math.max(pr.width ?? 1, pr.height ?? 1, pr.depth ?? 1) < 1.2 && o.castShadow === undefined) o.castShadow = false;
    if (pr && pr.kind === "cylinder" && (pr.height ?? 1) < 1.2 && o.castShadow === undefined) o.castShadow = false;
    if (o.light) {
      const lgt = { ...o.light };
      if (lgt.shadow === undefined) lgt.shadow = { enabled: false };
      if (!lgt.visibleRange) lgt.visibleRange = { max: 35 };
      o.light = lgt;
    }
    if (Array.isArray(o.children)) {
      o.children = o.children.map(c => {
        const ck = { ...c };
        const cpr = ck.primitive;
        if (cpr && cpr.kind === "box" && Math.max(cpr.width ?? 1, cpr.height ?? 1, cpr.depth ?? 1) < 1.2 && ck.castShadow === undefined) ck.castShadow = false;
        if (cpr && cpr.kind === "cylinder" && (cpr.height ?? 1) < 1.2 && ck.castShadow === undefined) ck.castShadow = false;
        if (ck.light) {
          const lgt = { ...ck.light };
          if (lgt.shadow === undefined) lgt.shadow = { enabled: false };
          if (!lgt.visibleRange) lgt.visibleRange = { max: 35 };
          ck.light = lgt;
        }
        return ck;
      });
    }
    return ctx.spawn(id, o);
  };
  // a rebuild (V bumped): take down what the last build laid
  for (const id of Object.keys(ctx.place.objects ?? {})) if (/^l21-/.test(id) && !id.includes("/") && !PEOPLE[id] && !/^l21-smiler/.test(id)) ctx.destroy(id);
  for (const tag of ["l2box", "container", "weapon", "crate", "remains", "l2prop"]) for (const o of ctx.query({ tags: [tag], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id); // the loot of the last build goes too: it was laid under auto ids
  sp("l21-geo", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level21-geo.js" }, material: { roughness: 0.88 } });

  // ---- lamps: white fluorescent tubes, a few flickering; The Edges are lit down the lane and almost nowhere else
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const z = zoneOf(cx, cz), c = cellCenter(cx, cz), r = hash(cx, cz, 201), h = z === "edge" || z === "edgecave" ? L.edgeHeight : z === "base" ? H + 0.5 : H;
    let on = r < 0.62;
    if (z === "edge") on = cz === LANE.z0 + 1; /* the ref photo: one unbroken line of white tubes down the tunnel */ else if (z === "edgecave") on = r < 0.1;
    if (z === "fridges" || z === "lockers") on = r < 0.9;
    if (z === "base") on = r < 0.35; // Alef was abandoned in 2020: most tubes dead, the rest failing
    if (!on) continue;
    const col = z === "edge" ? "oklch(0.97 0.015 210)" : z === "edgecave" ? "oklch(0.93 0.05 150)" : r < 0.07 ? "oklch(0.9 0.1 70)" : "oklch(0.97 0.012 200)", along = isOpen(cx, cz, 1) && !isOpen(cx, cz, 0) ? 90 : 0;
    const spec = { feetPosition: { x: c.x, y: h - 0.1, z: c.z }, rotation: { yaw: along }, primitive: { kind: "box", width: 1.2, height: 0.06, depth: 0.2 }, material: { color: col, emissive: col, emissiveIntensity: 2.4 } };
    if (hash(cx, cz, 203) < (z === "base" ? 0.6 : 0.1) && z !== "edge") sp(`l21-lamp-${cx}-${cz}`, { ...spec, fx: { script: `fx\npop flick n=1 r=light(<.9,.95,1>,flick(5,.5)*5,9)` } });
    else if (hash(cx, cz, 207) < 0.07 && z === "hall") sp(`l21-lamp-${cx}-${cz}`, { ...spec, behavior: "scripts/ambient-anim.js", state: { anim: { kind: "sway", deg: 4, sec: 3.1 + hash(cx, cz, 208), axis: "roll", phase: hash(cx, cz, 209) } }, light: { kind: "point", color: col, intensity: 5, distance: 11, shadow: { enabled: false } } }); // a tube hanging from one chain, swinging in the draught
    else sp(`l21-lamp-${cx}-${cz}`, { ...spec, light: { kind: "point", color: col, intensity: z === "edge" ? 11 : 5, distance: z === "edge" ? 20 : 11, shadow: { enabled: false } } });
    // Occasional hissing ceiling steam leak in the hot storage halls
    if (z === "hall" && hash(cx, cz, 209) < 0.045) sp(`l21-steam-${cx}-${cz}`, { feetPosition: { x: c.x + 0.9, y: h - 0.28, z: c.z }, fx: { script: STEAM_FX } });
  }

  // ---- the rock vault from the tunnel photo: four 9 m Blender stretches (art/level21/edgevault.py) down the lane's north side, rising from the floor and curving into the roof
  const VAULT = ["/cdn/value.7f23537f28502dcf9e8eefee13cbc7daeab46345e1cd787474a0f0b40fee50e2.glb", "/cdn/value.2aec8d36a7b47be02fa536ad5fdcff5984ce5c81e7c60aa74f8da5121521b068.glb"], VOFF = [[-0.05, -0.164, 3.075], [-0.05, -0.197, 3.075]];
  const vx0 = EDGE_X * S - HALF, vz = LANE.z0 * S - HALF;
  for (let k = 0; k < 4; k++) sp(`l21-vault-${k}`, { feetPosition: { x: vx0 + 4.5 + k * 9, y: 0, z: vz }, visibleRange: { max: 80 }, castShadow: false, receiveShadow: true, physics: { body: "static", collider: "mesh" }, model: { id: VAULT[k % 2], offset: VOFF[k % 2] } });

  // ---- the photo's green EXIT signs, hung from the ceiling down the length of The Edges, both faces lit
  for (let cx = EDGE_X + 1; cx < N; cx += 4) { const c = cellCenter(cx, LANE.z0 + 1), h = heightOf(cx, LANE.z0 + 1), face = (f) => `<div face="${f}" emissive style="width:0.42m;height:0.16m;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:900;font-size:110px;color:#eafff0;background:#118a3a">EXIT</div>`;
    sp(`l21-edge-exit-${cx}`, { tags: ["l21-sign"], feetPosition: { x: c.x, y: h - 0.85, z: c.z - 0.3 }, rotation: { yaw: 90 }, castShadow: false, primitive: { kind: "box", width: 0.44, height: 0.18, depth: 0.06 }, material: { color: "oklch(0.9 0.01 240)", emissive: "oklch(0.6 0.18 150)", emissiveIntensity: 0.6 }, ui: face("front") + face("back") }); }

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
  // Sandbag redoubts defending Base Alef perimeter (Fallout / 7DTD survival outpost fortification)
  sp("l21-sandbags-0", { feetPosition: { x: cellCenter(2, ARRIVE.cz).x - 0.8, y: 0, z: DOWN.z + 1.6 }, primitive: { kind: "box", width: 1.4, height: 0.75, depth: 0.45 }, material: { color: "oklch(0.55 0.08 75)", roughness: 0.95 }, physics: "static" });
  sp("l21-sandbags-1", { feetPosition: { x: cellCenter(2, ARRIVE.cz).x - 0.8, y: 0, z: DOWN.z - 1.6 }, primitive: { kind: "box", width: 1.4, height: 0.75, depth: 0.45 }, material: { color: "oklch(0.52 0.08 72)", roughness: 0.95 }, physics: "static" });
  const ex = rm("explo")[0]; sp("l21-sign-explo", { feetPosition: { x: edgeOf(ex, 2) + 0.25, y: 2.3, z: center(ex).z }, rotation: { yaw: -90 }, ...sign(1.8, 0.5, `${MEG(1.8)}<div style="font-size:66px">EXPLORATION WING</div><div style="font-size:34px;color:#c8d8b8">team gear · sign out all equipment</div></div>`) });
  const fr = rm("fridges")[0], fc = center(fr); sp("l21-sign-fridge", { feetPosition: { x: fc.x, y: 2.4, z: edgeOf(fr, 3) + 0.2 }, rotation: { yaw: 0 }, ...sign(2.6, 0.7, `<div face="front" width="2.6m" style="font-family:Arial,sans-serif;font-weight:900;color:#f0f4f8;text-align:center;line-height:1.05"><div style="font-size:84px">REFRIGERATOR PARADISE</div><div style="font-size:36px;color:#a8d8c8">saltines · enough for the rest of our lives</div></div>`, "oklch(0.3 0.04 200)") });
  sp("l21-sign-edges", { feetPosition: { x: cellCenter(EDGE_X - 1, LANE.z0 + 1).x + 1.6, y: 2.3, z: cellCenter(0, LANE.z0 + 1).z }, rotation: { yaw: -90 }, ...sign(2.0, 0.7, `${MEG(2.0)}<div style="font-size:80px">THE EDGES</div><div style="font-size:36px;color:#e8a098">edge of the survey · no light beyond · smilers reported</div></div>`) });

  // ---- Base Alef: the atrium gutted, lockers along its walls, cots and an interactive lockout comms terminal
  for (let i = 0; i < 5; i++) spawnContainerL2(ctx, "locker", { x: edgeOf(L1, 2) + 0.5, z: bc.z - 6 + i * 3 }, -90, { noLock: i % 2 === 0, room: 70 });
  spawnContainerL2(ctx, "desk", { x: bc.x + 1.5, z: edgeOf(L1, 1) - 0.9 }, 180, { room: 70 });
  // the comms desk is a working Back OS terminal (scripts/lib/terminal.js): its Backmail holds the lockout dispatches, its Database knows 2.1, and Level 8 (data/os.yml, profile alef)
  sp("l21-comms", terminalSpec({ host: "ALEF-COMMS-01", lock: "science:25", name: "Base Alef comms terminal", at: { x: bc.x + 1.5, y: 0.77, z: edgeOf(L1, 1) - 0.78 }, yaw: 0,
    note: "pw: Team A's leader, first name, lower case" }));
  // abandoned in a hurry: cots shoved out of line, one kicked over on its side, the paperwork of a locked-out base across the floor
  const COTPOSE = [{ yaw: 23 }, { yaw: -41 }, { yaw: 78, roll: 90 }, { yaw: 9 }], COTOFF = [[0, 0, 0], [0.4, 0, -0.5], [0.3, 0.42, 0.6], [-0.5, 0, 0.3]];
  for (let i = 0; i < 18; i++) sp(`l21-alef-paper-${i}`, { feetPosition: { x: bc.x + (hash(i, 3, 901) - 0.5) * 10, y: 0.006 + i * 0.0004, z: bc.z + (hash(i, 5, 902) - 0.5) * 14 }, rotation: { yaw: hash(i, 7, 903) * 360 }, primitive: { kind: "box", width: 0.21, height: 0.002, depth: 0.29 }, material: { color: i % 5 === 0 ? "oklch(0.86 0.06 90)" : "oklch(0.9 0.012 90)", roughness: 0.95 } });
  for (let i = 0; i < 4; i++) sp(`l21-cot-${i}`, { feetPosition: { x: bc.x - 2 + (i % 2) * 2.2 + COTOFF[i][0], y: COTOFF[i][1], z: bc.z + 1.2 + Math.floor(i / 2) * 2.2 + COTOFF[i][2] }, rotation: COTPOSE[i], model: COT, layout: { box: { min: { x: -0.95, y: 0, z: -0.95 }, max: { x: 0.95, y: 0.55, z: 0.95 } } }, physics: { body: "static", collider: "box" } });
  spawnRemains(ctx, { x: bc.x + 2.6, z: bc.z - 1.4 }, ["ration", "bandage", "page:11", "ammo"], "Alef operative's remains");
  spawnRemains(ctx, { x: bc.x - 3.0, z: bc.z + 4.6 }, ["almond", "kit", "battery"], "Alef operative's remains");

  // ---- the Exploration Wing: bags, medical supplies, tools, and the Forbidden Berries Specimen Case (Memo #13)
  const exc = center(ex);
  [["cagecrate", -2.2, -2], ["cagecrate", -2.2, 0], ["lockbox", 2, -2.2], ["toolbox", 2, 0.4], ["cabinet", 0, 2.4]].forEach(([k, a, b], i) => spawnContainerL2(ctx, k, { x: exc.x + a, z: exc.z + b }, i % 2 ? 90 : -90, { bonus: 1, room: 71 }));
  spawnRemains(ctx, { x: exc.x + 1.4, z: exc.z + 3.6 }, ["firstaid", "battery", "battery", "page:12"], "Alef operative's remains");
  sp("l21-memo13", {
    feetPosition: { x: exc.x + 0.65, y: 0.88, z: exc.z - 0.6 }, rotation: { pitch: -15 },
    ...sign(0.48, 0.62, `<div face="front" width="0.48m" style="font-family:Arial,sans-serif;color:#181818;background:#f5edd0;padding:8px;line-height:1.15;border:2px solid #8b7355"><div style="font-size:26px;font-weight:900;color:#a81010;border-bottom:2px solid #a81010;margin-bottom:4px;text-align:center">ADMIN MEMO #13</div><div style="font-size:16px;margin-bottom:4px"><b>SUBJECT:</b> Specimen #09</div><div style="font-size:15px;color:#333">Under NO circumstances are the crimson berries to be ingested. Severe hallucinogenic and mutational risks observed. Violators will forfeit ration quotas.</div></div>`, "oklch(0.85 0.08 85)"),
  });
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
  sp("l21-berries-ring", { feetPosition: { x: exc.x, y: 0.005, z: exc.z - 0.6 }, primitive: { kind: "torus", radius: 0.85, tube: 0.035 }, rotation: { pitch: 90 }, material: { color: "#e6a100", roughness: 0.4 } });

  // ---- quarters, the offices, the locker room (checkered tile, grey and brown lockers), restrooms, break room, storage rooms
  const bk = rm("bunks")[0], kc = center(bk);
  for (let i = 0; i < 6; i++) sp(`l21-bunk-${i}`, { feetPosition: { x: kc.x - 3.4 + (i % 3) * 3.4, y: 0.32, z: kc.z - 2.4 + Math.floor(i / 3) * 4.2 }, primitive: { kind: "box", width: 0.95, height: 0.1, depth: 1.95 }, material: { color: "oklch(0.35 0.05 30)", roughness: 0.9 }, physics: "static" });
  spawnContainerL2(ctx, "cabinet", { x: kc.x, z: edgeOf(bk, 1) - 0.8 }, 180, { room: 72 });
  const of = rm("office")[0], oc = center(of);
  [["filing", -4], ["filing", -2.4], ["desk", 0.5], ["desk", 3]].forEach(([k, a], i) => spawnContainerL2(ctx, k, { x: oc.x + a, z: edgeOf(of, 1) - (k === "desk" ? 1.6 : 0.7) }, 180, { room: 73 + i }));
  spawnRemains(ctx, { x: oc.x - 1, z: oc.z + 1 }, ["bar", "keycard", "page:13"], "Alef administrator's remains");
  const lk = rm("lockers")[0], lc = center(lk);
  // the ref's two kinds: a long row of tall brown perforated lockers, shoulder to shoulder, and banks of grey six-tier box lockers
  const VENT = { id: "/cdn/value.b8e3419a87b05bec8b066f3103daee6b0726b980c7aede0c36ffbf208bc02ae2.glb", paints: ["#3b2a20", "#432f23", "#36261c", "#4a3426"] };
  const BOXL = { id: "/cdn/value.441b77290ec0c2949a34dfde8f17c29c43443b39ae05f3b1914924257234d008.glb", paints: ["#b9b6ab", "#c2bfb3", "#aeaba0"] };
  for (let i = 0; i < 12; i++) spawnContainerL2(ctx, "locker", { x: lc.x - 5 + i * 0.43, z: edgeOf(lk, 3) + 0.3 }, 0, { noLock: i % 3 === 0, room: 80, model: VENT, size: [0.42, 1.95, 0.54] });
  for (let i = 0; i < 9; i++) spawnContainerL2(ctx, "locker", { x: edgeOf(lk, 0) - 0.27, z: lc.z - 4.2 + i * 0.39 }, 90, { noLock: i % 4 === 1, room: 81, model: BOXL, size: [0.38, 1.85, 0.48] });
  for (let i = 0; i < 5; i++) spawnContainerL2(ctx, "locker", { x: lc.x - 2.2 + i * 0.39, z: lc.z + 3.4 }, 180, { noLock: i % 2 === 0, room: 81, model: BOXL, size: [0.38, 1.85, 0.48] }); // a freestanding grey bank, back to the bench
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
      { feetPosition: { x: -0.16, y: 1.15, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.014, radiusBottom: 0.014, height: 0.95 }, rotation: { pitch: 18 }, material: { color: "#b87333", metalness: 0.85, roughness: 0.3 } },
    ],
  });
  sp("l21-cooler-puddle", { feetPosition: { x: edgeOf(fr, 2) + 0.65, y: 0.005, z: fc.z - 2.2 }, primitive: { kind: "cylinder", radiusTop: 0.45, radiusBottom: 0.48, height: 0.01 }, material: { color: "#0e1a22", roughness: 0.08, metalness: 0.1 } });
  sp("l21-fridge-frost", { feetPosition: { x: fc.x - 1.5, y: 0.1, z: edgeOf(fr, 3) + 0.6 }, fx: { script: FROST_FX } });
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
  sp("l21-blast-crater", {
    feetPosition: { x: jbX + 0.45, y: 3.2, z: jbZ + 0.55 },
    primitive: { kind: "cylinder", radiusTop: 1.15, radiusBottom: 1.25, height: 0.14 }, material: { color: "#141414", roughness: 0.96 },
    fx: { script: CRATER_SPARK_FX },
    children: [
      { feetPosition: { x: 0, y: -0.85, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.008, radiusBottom: 0.008, height: 1.7 }, material: { color: "#d04020" } },
      { feetPosition: { x: 0.12, y: -0.65, z: 0.08 }, primitive: { kind: "cylinder", radiusTop: 0.008, radiusBottom: 0.008, height: 1.3 }, material: { color: "#202020" } },
    ],
  });
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
  // Emergency chemical road flares marking the survey trail into the pitch darkness of The Edges
  [
    [EDGE_X + 2, -0.6],
    [EDGE_X + 5, 0.5],
    [N - 3, -0.4],
  ].forEach(([cx, dz], i) => {
    const c = cellCenter(cx, LANE.z0 + 1);
    sp(`l21-flare-${i}`, {
      feetPosition: { x: c.x, y: 0.0, z: c.z + dz },
      rotation: { pitch: 24, yaw: 45 * i },
      primitive: { kind: "cylinder", radiusTop: 0.022, radiusBottom: 0.022, height: 0.28 },
      material: { color: "#d82820", roughness: 0.6 },
      fx: { script: FLARE_FX },
      children: [
        { feetPosition: { x: 0, y: 0.18, z: 0 }, light: { kind: "point", color: "oklch(0.68 0.28 25)", intensity: 5.8, distance: 14 } },
        { feetPosition: { x: 0, y: 0.14, z: 0 }, primitive: { kind: "sphere", radius: 0.032 }, material: { color: "#ffeedd", emissive: "oklch(0.85 0.25 40)", emissiveIntensity: 5.0 } },
      ],
      audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-single-fluorescent-tube-buzzing-hum-loop.mp3", loop: true, gain: 0.12, spatial: true, maxDistance: 7 },
    });
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

  // ---- things that move: fans turning in the big rooms, loose cables swinging, drips from the pipes, dust in the light, damp breath over The Edges
  for (const r of ROOMS) {
    if (!["base", "fridges", "restroom", "lockers", "break", "explo", "office"].includes(r.type)) continue;
    const c = center(r), y = (r.type === "base" ? H + 0.5 : H) - 0.06, spots = r.type === "base" ? [[-3.5, 0], [3.5, 0]] : r.type === "fridges" ? [[-4, 0], [4, 0]] : [[0, 0]];
    spots.forEach(([a, b], k) => { sp(`l21-fanh-${r.i}-${k}`, fanHousing({ x: c.x + a, y: y + 0.01, z: c.z + b })); sp(`l21-fan-${r.i}-${k}`, fan({ x: c.x + a, y, z: c.z + b }, 0.7 + hash(r.i, k, 33) * 0.5, hash(r.i, k, 34))); });
    sp(`l21-dust-${r.i}`, { feetPosition: { x: c.x, y: 1.2, z: c.z }, fx: { script: DUST } });
  }
  let nCab = 0;
  for (let cx = 1; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const z = zoneOf(cx, cz), c = cellCenter(cx, cz); if (z !== "hall") continue;
    const q = hash(cx, cz, 701);
    if (q < 0.09) { nCab++; sp(`l21-cable-${cx}-${cz}`, cable({ x: c.x + (hash(cx, cz, 702) - 0.5) * 1.6, y: H - 0.04, z: c.z + (hash(cx, cz, 703) - 0.5) * 1.6 }, Math.floor(q * 1000), 0.5 + hash(cx, cz, 704) * 0.7)); }
    else if (q < 0.15) sp(`l21-drip-${cx}-${cz}`, { feetPosition: { x: c.x + (hash(cx, cz, 705) - 0.5) * 2.4, y: H - 0.2, z: c.z + (hash(cx, cz, 706) - 0.5) * 2.4 }, fx: { script: DRIP } });
  }
  for (let cx = EDGE_X; cx < N - 1; cx += 2) for (let cz = LANE.z0; cz < LANE.z0 + LANE.d; cz++) {
    const c = cellCenter(cx, cz);
    if (hash(cx, cz, 711) < 0.45) sp(`l21-edrip-${cx}-${cz}`, { feetPosition: { x: c.x + (hash(cx, cz, 712) - 0.5) * 3, y: L.edgeHeight - 0.3, z: c.z + (hash(cx, cz, 713) - 0.5) * 3 }, fx: { script: DRIP } });
    if (hash(cx, cz, 714) < 0.4) sp(`l21-mist-${cx}-${cz}`, { feetPosition: { x: c.x, y: 0.25, z: c.z }, fx: { script: MIST } });
  }
}


// ---- Tripo props (scripts/lib/data/l2props.yml): the wiki's storage sublevel, "janitorial supplies and standard work equipment" in every hall,
// furnished rooms in real meshes; a red DANGER placard on the door at the end of a dead-end hall, as in the wiki's photo of The Halls
const yawOf = (dx, dz) => Math.atan2(-dx, -dz) * 180 / Math.PI; // the yaw that turns a front (-Z) toward (dx, dz)
const D4W = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const HALL_KIT = ["mop", "mop", "drum", "canister", "shelf", "shelf", "stackchair", "drum", "fuse"]; // weighted: mop buckets and shelving most
function dress21(ctx) {
  const W = 0.18, put = (k, x, z, face, y) => spawnProp(ctx, k, { x, z, y }, yawOf(face[0], face[1]));
  for (const r of ROOMS) {
    const c = center(r), xW = edgeOf(r, 2) + W, xE = edgeOf(r, 0) - W, zN = edgeOf(r, 3) + W, zS = edgeOf(r, 1) - W;
    const S_ = [0, 1], N_ = [0, -1], E_ = [1, 0], W_ = [-1, 0];
    if (r.type === "break") {
      for (const dz of [-2.2, 1.6]) { put("table", c.x - 0.2, c.z + dz, S_); for (const [ox, oz, f] of [[-0.45, -0.7, S_], [0.45, -0.7, S_], [-0.45, 0.7, N_], [0.45, 0.7, N_]]) put("stackchair", c.x - 0.2 + ox, c.z + dz + oz, f); }
      put("counter", c.x - 1.5, zN + 0.32, S_); put("counter", c.x + 0.8, zN + 0.32, S_); put("microwave", c.x + 0.6, zN + 0.3, S_, 0.93);
      put("chair", xE - 0.8, zS - 0.9, [-0.7, -0.7]);
    } else if (r.type === "store") {
      const n = Math.max(2, Math.floor((xE - xW) / 1.55));
      for (let i = 0; i < n; i++) { const x = xW + 0.85 + i * 1.5; if (x > xE - 0.7) break; put("shelf", x, zN + 0.26, S_); if (r.d > 2 || i % 2) put("shelf", x, zS - 0.26, N_); }
      put("drum", xE - 0.5, c.z - 0.6, W_); put("drum", xE - 0.55, c.z + 0.1, W_); put("canister", xE - 0.45, c.z + 0.7, W_);
      put("mop", xW + 0.45, c.z, E_); put("stackchair", c.x + 0.4, c.z + 0.3, [0.4, -1]);
    } else if (r.type === "office") {
      for (const [dx, dz] of [[-2.6, -1.8], [1.6, -1.8], [-2.6, 2.2], [1.6, 2.2]]) { put("table", c.x + dx, c.z + dz, S_); put("chair", c.x + dx, c.z + dz + 0.75, N_); }
      for (const dz of [-2.4, -0.9, 0.6]) put("shelf", xW + 0.26, c.z + dz, E_);
      put("stackchair", xE - 0.7, zN + 0.7, [-1, 1]);
    } else if (r.type === "explo") {
      for (const dx of [-3.2, -1.6, 0, 1.6, 3.2]) put("shelf", c.x + dx, zN + 0.26, S_);
      put("bench", c.x, c.z + 1.0, N_); put("lantern", c.x - 0.5, c.z + 1.0, N_, 0.9); put("stove", c.x + 0.4, c.z + 1.05, N_, 0.9);
      put("stackchair", c.x - 0.6, c.z + 1.8, N_); put("canister", xE - 0.45, zS - 0.5, W_);
    } else if (r.type === "lockers") {
      put("mop", xW + 0.6, zS - 0.6, [1, -1]); put("canister", xW + 0.5, zS - 1.3, E_);
      // the photo's black rubber entry mat, its edge taped in blue, and the cardboard boxes shoved on top of the brown lockers
      ctx.spawn("l21-lk-mat", { feetPosition: { x: c.x - 3.2, y: 0.004, z: c.z + 1.5 }, visibleRange: { max: 35 }, castShadow: false, primitive: { kind: "box", width: 2.6, height: 0.012, depth: 3.2 }, material: { color: "oklch(0.16 0.005 260)", roughness: 1 },
        children: [{ feetPosition: { x: 1.32, y: 0, z: 0 }, primitive: { kind: "box", width: 0.05, height: 0.014, depth: 3.2 }, material: { color: "oklch(0.55 0.17 250)", roughness: 0.6 } }] });
      for (let i = 0; i < 6; i++) { const w = 0.38 + hash(i, 1, 811) * 0.2, hh = 0.22 + hash(i, 2, 812) * 0.2;
        ctx.spawn(`l21-lk-box-${i}`, { feetPosition: { x: c.x - 5 + i * 0.9 + hash(i, 3, 813) * 0.3, y: 1.96, z: zN + 0.32 }, rotation: { yaw: (hash(i, 4, 814) - 0.5) * 30 }, visibleRange: { max: 35 }, castShadow: false,
          primitive: { kind: "box", width: w, height: hh, depth: 0.42 }, material: { color: i === 2 ? "oklch(0.6 0.16 45)" : "oklch(0.62 0.07 70)", roughness: 0.95 } }); }
    } else if (r.type === "base") {
      // Alef's abandoned mess: two tables, a chair knocked over on its side, a cold camp stove and lantern
      put("table", c.x - 1.6, c.z - 1.2, S_); put("table", c.x + 1.4, c.z - 1.0, S_);
      put("stackchair", c.x - 1.6, c.z - 0.5, N_); put("stackchair", c.x + 1.4, c.z - 0.3, N_); put("chair", c.x + 2.6, c.z + 2.6, [-1, -0.3]);
      put("stove", c.x - 1.4, c.z - 1.2, S_, 0.77); put("lantern", c.x + 1.2, c.z - 1.1, S_, 0.77);
      put("drum", xE - 0.6, zN + 0.6, W_); put("drum", xE - 0.6, zN + 1.3, W_);
    } else if (r.type === "bunks") {
      put("stackchair", c.x + 5.0, c.z, W_); put("lantern", c.x + 5.0, c.z, W_, 0.48);
    }
  }
  // the halls: one piece of janitorial kit against a blank wall in about one cell of six, never in a doorway
  for (let cx = 0; cx < EDGE_X; cx++) for (let cz = 0; cz < N; cz++) {
    if (zoneOf(cx, cz) !== "hall") continue;
    const c = cellCenter(cx, cz), opens = openings(cx, cz);
    if (opens.length === 1) { // a dead end: the DANGER door the wiki photographed
      const d = [0, 1, 2, 3].find((k) => k !== opens[0] && k === (opens[0] + 2) % 4), [nx, nz] = D4W[d], w = S / 2 - W - 0.06;
      if (hash(cx, cz, 731) < 0.55) ctx.spawn(`l21-danger-${cx}-${cz}`, { tags: ["l21-sign"], feetPosition: { x: c.x + nx * w, y: 1.35, z: c.z + nz * w }, rotation: { yaw: yawOf(-nx, -nz) }, visibleRange: { max: 30 }, castShadow: false,
        primitive: { kind: "box", width: 0.5, height: 0.34, depth: 0.012 }, material: { color: "oklch(0.95 0.01 90)", roughness: 0.6 },
        ui: `<div face="front" class="w-full h-full flex flex-col" style="width:500px;height:340px;background:#f2efe6;border:10px solid #111"><div style="background:#c8102e;color:#fff;font:900 92px sans-serif;text-align:center;letter-spacing:6px;padding:8px 0">DANGER</div><div style="color:#111;font:800 44px sans-serif;text-align:center;padding-top:26px;line-height:1.15">AUTHORIZED<br>PERSONNEL ONLY</div></div>` });
    }
    if (hash(cx, cz, 733) > 0.17) continue;
    const walls = [0, 1, 2, 3].filter((d) => !isOpen(cx, cz, d)); if (!walls.length) continue;
    const d = walls[Math.floor(hash(cx, cz, 734) * walls.length)], [nx, nz] = D4W[d], tx = -nz, tz = nx;
    const kind = HALL_KIT[Math.floor(hash(cx, cz, 735) * HALL_KIT.length)], K = PROPS_SIZE(kind), off = S / 2 - W - K / 2 - 0.05, along = (hash(cx, cz, 736) - 0.5) * 2.2;
    put(kind, c.x + nx * off + tx * along, c.z + nz * off + tz * along, [-nx, -nz], kind === "fuse" ? 0.95 : undefined);
    if (kind === "drum" && hash(cx, cz, 737) < 0.5) put("canister", c.x + nx * (off - 0.05) + tx * (along + 0.55), c.z + nz * (off - 0.05) + tz * (along + 0.55), [-nx, -nz]);
  }
}
const PROPS_SIZE = (k) => ({ mop: 0.45, drum: 0.6, canister: 0.32, shelf: 0.45, stackchair: 0.5, fuse: 0.24 })[k] ?? 0.6;

export function tick(ctx) {
  if (!ctx.place.players?.length) return; // empty level: nothing to run (perf)
  const s = ctx.place.state, now = ctx.now();
  if ((s.builtV ?? 0) < V) { s.builtV = V; lay(ctx); dress21(ctx); s.peopleV = 0; }
  if (!ctx.getObject("l21-life")) ctx.spawn("l21-life", { behavior: "scripts/l21-use.js" });
  if (!s.peopleV || s.peopleV < 2) {
    s.peopleV = 2;
    for (const id of Object.keys(PEOPLE)) {
      if (ctx.place.objects[id] || ctx.getObject(id)) ctx.destroy(id);
      person(ctx, id);
    }
  }
  if (now - (s.roofAt ?? 0) > 2000) { s.roofAt = now; // nobody stands on the ceiling: anyone above head height goes back to their spot on the floor
    for (const id of Object.keys(PEOPLE)) { const o = ctx.getObject(id); if (o && o.feetPosition.y > 1.5) { const h = o.state.home ?? o.feetPosition; o.feetPosition = { x: h.x, y: 0.05, z: h.z }; o.velocity = { x: 0, y: 0, z: 0 }; } } }
  keepPeople(ctx, Object.keys(PEOPLE), person);
  tickChatter(ctx, CHATTER.level21, { "l21-goknar": "reyes", "l21-ned": "hollis" });
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
