import { restyleSigns } from "../../scripts/lib/sign-style.js";
import { dressThresholds } from "../../scripts/lib/thresholds.js";
import { keepPeople } from "../../scripts/lib/level-kit.js";
import { heard } from "../../scripts/lib/hear.js";
import { tickWalls } from "../../scripts/lib/breakables.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { fullLook, npcLook } from "../../scripts/lib/clothes.js";
import { npcState } from "../../scripts/lib/stats.js";
import MEG from "../../scripts/lib/data/meg.yml";
import { weaponBody } from "../../scripts/lib/weapon-look.js";
// Level 1's referee: lays the lamps, crates, supplies and thresholds once, then runs the Flickering.
import L from "../../scripts/lib/data/level1.yml";
import { RACK } from "../../scripts/lib/level1.js";
import { rollItemL1 } from "../../scripts/lib/loot.js";
import { N, H, zoneOf, lampAt, cellCenter, shelfSlots, BACK, BACK_OLD, DROP, ONWARD, ARRIVE, hash, S, HALF, hasPillar, DECK, RAMPS, rampBox, rampCell, inHole } from "../../scripts/lib/level1.js";
import { spawnAlmond } from "../../scripts/lib/loot.js";
import { spawnFurniture, pickKind, wallSpot1, sizeOf, remodelFurniture } from "../../scripts/lib/furniture.js";
import { tickChatter, CHATTER } from "../../scripts/lib/chatter.js";
import { symbolSvg } from "../../scripts/lib/thehub.js";
const symbolSvgL1 = (w) => symbolSvg(77, w);
const DECKS = [0.17, 0.69, 1.165, 1.72]; // the Tripo rack's wire floor and three boards, measured from the glb at its placed size
const RACK_GLB = "/cdn/value.8ceb4f350a3ca27cb5655cbf36551ce25ea905511cae0e3e598962655bc28f2b.glb"; // Tripo pallet rack, Nov 13
const L1M = { door: "/cdn/value.020545cb36957131cc5f5eab3f6c2c38511e55076fb5e5542b93aff45e424288.glb", wall: "/cdn/value.1aa1542440b2b55ab177731e12bade8dfdb7ca60226cb2b55ff2491a998298fe.glb", board: "/cdn/value.1ed44cd9733b0a1d469ee47af7a8f609fcaee84b4aef6828e976544608979e8b.glb", wallDx: 0, boardYaw: 0 }; // Blender builds: art/level1/build.py

const BOXSTACK = [ // the Tripo pallet-of-boxes cut into its pallet and three boxes in Blender (art/l1-boxstack/build.py): [model, y, width, height, depth]
      ["/cdn/value.55df1d3983bde51837c396491fff9015cc09598507749cb199fa144a6b53fd9b.glb", 0, 0.954, 0.261, 1.36],
      ["/cdn/value.bd7c0cbac7eefbb5c1584bd63005a7c39bfacfb2beb3d4e60a47252820cf552e.glb", 0.165, 0.677, 0.461, 0.991],
      ["/cdn/value.b38dc81280c35d3f87435921844ff0ee4594c8f1609dc3b020faf26416d137c6.glb", 0.612, 0.552, 0.421, 0.766],
      ["/cdn/value.d4da0db276e9457c56a83cce2ef518cccc8065d0f8e158c7c82f747f45c97b2f.glb", 0.982, 0.467, 0.318, 0.554]];
export const cadence = "250ms";
const LAMP_ON = 9;
// the M.E.G. agents are critters like the players: lime hi-vis jackets, the agency's look
const AGENT = {
  "meg-ale": { name: "Ale · M.E.G. Scout", role: "scout", look: { species: "fox", sex: "f", eye: "#28a46e", belly: "#ffffff", tip: "#ffffff", nose: "#241814", topw: "jacket", top: "#b6e04a", botw: "pants", bottom: "#4a5a3a", shoes: "boots", shoec: "#2a2420", hat: "cap", hatc: "#b6e04a", expr: "beam" } },
  "meg-ortiz": { name: "Dr. Ortiz · M.E.G. Medic", role: "medic", look: { species: "bunny", sex: "f", eye: "#684878", belly: "#ffffff", nose: "#ff9eb2", inner: "#ffc2d1", topw: "jacket", top: "#eef2f0", botw: "pants", bottom: "#4a5a3a", shoes: "boots", shoec: "#2a2420", neck: "scarf", neckc: "#b6e04a", expr: "smile" } },
  "meg-callum": { name: "Callum · Quartermaster", role: "quarter", look: { species: "bear", sex: "m", eye: "#8a582c", belly: "#e8c89e", nose: "#221814", topw: "jacket", top: "#b6e04a", botw: "pants", bottom: "#4a5a3a", shoes: "boots", shoec: "#2a2420", hat: "beanie", hatc: "#7a3a2a", expr: "grin" } },
};
const AGENTS = [["meg-ale", 2.6, -0.6], ["meg-ortiz", 11.5, -3.6], ["meg-callum", 7.9, -1.6]];
export function agentSpec(a, id, dx, dz) {
  const g = AGENT[id];
  return { tags: ["npc"], feetPosition: { x: a.x + dx, y: 0, z: a.z + dz }, rotation: { yaw: 90 }, physics: "character",
    ...critterSpec(npcLook(id, g.look, g.faction ?? "meg", g.level ?? 4, g.role)), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"], state: { name: g.name, role: g.role } };
}
const STOVE = `fx
pop flame rate=26 on=disc(.18) life=.4..0.7 v=up(1.1)+cone(18)*(.2..0.5) size=.14..0.26 acc=curl(.5)+buoy(1.6)+drag(1.5) sz=$size*(.5>1:.25>.12) col=hdr(4,2.6,1)>hdr(2.6,1,.25)>hdr(.5,.1,.03) a=0>.15:1>.7:.8>0 r=sprite(flame-wisp,add)
pop smoke on=@flame?.2 life=1.5..2.5 size=.15..0.25 acc=buoy(.8)+curl(.3)*.4+drag(.8) sz=$size*(.7>2.6) col=<.3,.28,.26> a=0>.2:.25>0 r=sprite(smoke-puff,alpha)
pop glow n=1 r=light(<1,.55,.24>,fire()*6,7)`;

// the tutorial's drop point isn't a door; the dresser lays M.E.G.'s welcome there too, turned toward the camp
const l1Ways = () => { const a = cellCenter(ARRIVE.cx, ARRIVE.cz), dx = a.x - DROP.x, dz = a.z - DROP.z, l = Math.hypot(dx, dz); return [{ id: "l1-drop", at: { x: DROP.x - dx / l * 0.9, y: 0, z: DROP.z - dz / l * 0.9 }, fwd: { x: dx / l, z: dz / l } }]; };
export function tick(ctx) {
  restyleSigns(ctx, "level1"); // every sign dressed as its own board (scripts/lib/sign-style.js)
  dressThresholds(ctx, l1Ways()); // the ways in and out, dressed with what people left there (scripts/lib/thresholds.js)
  if (!ctx.place.players?.length) return; // empty level: nothing to run (perf)
  const s = ctx.place.state, now = ctx.now();
  remodelFurniture(ctx); // 2026-11-14 furnModelV 1: standing filing/desk/cabinet boxes wear their fitted Tripo meshes
  if (!(Math.abs(now - (ctx.session.wallTick ?? -1e9)) < 2000)) { ctx.session.wallTick = now; tickWalls(ctx); } // broken interior walls: holes drawn, regrown after a while (lib/breakables.js)
  if (!s.almondTidy) { s.almondTidy = 1; for (const o of ctx.query({ tags: ["almond"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) { const p = o.feetPosition ?? { x: 0, y: 0, z: 0 }; if (p.y < 0.15 && !(Math.hypot(p.x - cellCenter(ARRIVE.cx, ARRIVE.cz).x - 2.4, p.z - cellCenter(ARRIVE.cx, ARRIVE.cz).z + 2.4) < 3)) ctx.destroy(o.id); } } // loose floor bottles cleared once: almond water lives in containers and drops now
  tickChatter(ctx, CHATTER.level1, {"meg-ale": "ale", "meg-ortiz": "ortiz", "meg-callum": "callum"}); // the camp talks among itself while someone's near
  if (s.seeded && s.corrV !== 1) { s.corrV = 1; // Nov 13 corridor pass: every back-corridor room lit by its bulkhead (scripts/level1-geo.js draws the fixture)
    for (const o of ctx.query({ tags: ["l1lamp"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) { const p = o.feetPosition; const { cx, cz } = { cx: Math.floor((p.x + N * S / 2) / S), cz: Math.floor((p.z + N * S / 2) / S) }; if (zoneOf(cx, cz) === "corridors") ctx.destroy(o.id); }
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) { if (zoneOf(cx, cz) !== "corridors") continue; const c = cellCenter(cx, cz);
      ctx.spawn({ tags: ["l1lamp", "l1corr"], feetPosition: { x: c.x, y: H - 0.55, z: c.z }, light: { kind: "point", color: "oklch(0.92 0.06 85)", intensity: 3.2, distance: 11, shadow: { enabled: false } } }); }
  }
  if (!s.seeded) { s.backV = 2; s.corrV = 1; // a fresh room lays its wall home where it belongs: nothing to move
    s.seeded = true;
    ctx.spawn("l1-geo", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level1-geo.js" }, material: { roughness: 0.85, emissiveIntensity: 2 } });
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      const k = lampAt(cx, cz); if (!k) continue;
      const c = cellCenter(cx, cz), tube = k === "tube";
      ctx.spawn({ tags: ["l1lamp"], feetPosition: { x: c.x, y: H - (tube ? 0.08 : 0.5), z: c.z }, primitive: tube ? { kind: "box", width: 0.35, height: 0.06, depth: 2.4 } : { kind: "sphere", radius: 0.09 },
        material: { color: "oklch(0.97 0.02 220)", emissive: "oklch(0.95 0.03 220)", emissiveIntensity: 2.2 },
        visibleRange: { max: 42 },
        light: { kind: "point", color: tube ? "oklch(0.95 0.02 220)" : "oklch(0.9 0.08 80)", intensity: tube ? LAMP_ON : 2.5, distance: tube ? 20 : 9, shadow: { enabled: false } } });
    }
    ctx.spawn({ feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/level1-props-geo.js" }, material: { roughness: 0.85 } }); // clutter, camp and guide line
    { const c = cellCenter(ARRIVE.cx, ARRIVE.cz); for (const [dx, dz, col] of [[3.4, 3.4, "oklch(0.85 0.14 70)"], [-5, 0, "oklch(0.85 0.12 80)"]]) ctx.spawn({ feetPosition: { x: c.x + dx, y: 0.9, z: c.z + dz }, primitive: { kind: "sphere", radius: 0.07 }, material: { color: col, emissive: col, emissiveIntensity: 2 }, visibleRange: { max: 42 }, castShadow: false, light: { kind: "point", color: col, intensity: 4, distance: 11, shadow: { enabled: false } } }); } // camp lanterns
    ctx.spawn({ feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/level1-details-geo.js" }, material: { roughness: 0.85 } }); // beams, sprinkler pipes, wet stains, strip lights
    for (let i = 2; i < N; i += 2) for (let j = 2; j < N; j += 2) { // stencilled grid letters and numbers on the pillars, as in a real car park
      if (!hasPillar(i, j) || hash(i, j, 401) > 0.55) continue;
      const x = i * S - HALF, z = j * S - HALF, letter = String.fromCharCode(65 + ((i / 2 - 1) % 15)) + (j / 2);
      ctx.spawn({ feetPosition: { x, y: 0.5, z: z + 0.465 }, rotation: { yaw: 0 }, primitive: { kind: "box", width: 0.01, height: 0.01, depth: 0.01 }, visibleRange: { max: 35 }, castShadow: false, ui: '<div face="front" width="0.6m" style="font-size:220px;font-weight:800;color:#3a4048;text-align:center;opacity:.8">' + letter + '</div>' });
    }
    // supplies: crates on the racks first, then loose ones; almond water; M.E.G. landmarks near arrival
    seedFurniture(ctx, L.crates);
    const a = cellCenter(ARRIVE.cx, ARRIVE.cz);
    for (let i = 0; i < 3; i++) spawnAlmond(ctx, { x: a.x + 2 + i * 0.4, z: a.z - 2 });
    ctx.spawn({ id: "meg-cloth", feetPosition: { x: a.x + 2.4, y: 0, z: a.z - 2.6 }, primitive: { kind: "box", width: 1.4, height: 0.02, depth: 0.9 }, material: { color: "oklch(0.85 0.2 125)" }, visibleRange: { max: 35 }, castShadow: false,
      ui: '<div face="top" width="1.3m" style="font-size:120px;font-weight:900;color:#1d2a10;text-align:center">M.E.G.</div>' });
    // the thresholds: home to level 0
    ctx.spawn("l1-back", { feetPosition: { x: BACK.x + 0.5, y: 0, z: BACK.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.8, height: 2.4, depth: 2.2 }, visible: false, behavior: "scripts/level-door.js", state: { to: "main" } });
    ctx.spawn({ feetPosition: { x: BACK.x + 0.4, y: 0, z: BACK.z }, visibleRange: { max: 35 }, light: { kind: "point", color: "oklch(0.85 0.12 92)", intensity: 3, distance: 6, shadow: { enabled: false } } });
    s.nextFlicker = now + 60000;
  }
  if (!s.arrive2) { s.arrive2 = true; // where a doorway lets you out: just inside each door, facing into the level
    ctx.spawn("l1-from-main", { feetPosition: { x: BACK.x + 2.4, y: 0.1, z: BACK.z }, rotation: { yaw: -90 } });
    ctx.spawn("l1-from-l2", { feetPosition: { x: ONWARD.x - 2.4, y: 0.1, z: ONWARD.z }, rotation: { yaw: 90 } });
  }
  if (!s.l2door) { s.l2door = true; // the pipeworks: a green door in the east wall, down into Level 2
    ctx.spawn("l1-onward", { feetPosition: { x: ONWARD.x - 0.3, y: 0, z: ONWARD.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.8, height: 2.4, depth: 1.6 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level2" } });
    ctx.spawn("l1-onward-door", { feetPosition: { x: ONWARD.x + 0.45, y: 0, z: ONWARD.z }, physics: { body: "static", collider: "box" }, model: { id: L1M.door }, visibleRange: { max: 60 }, castShadow: false });
    ctx.spawn({ feetPosition: { x: ONWARD.x - 0.6, y: 2.6, z: ONWARD.z }, visibleRange: { max: 35 }, light: { kind: "point", color: "oklch(0.8 0.12 150)", intensity: 2.5, distance: 7, shadow: { enabled: false } } });
  }
  if ((s.envV ?? 0) < 1) { s.envV = 1; // env pass (Nov 9): modelled fire door, back wall breach and map board replace the box versions
    const d = ctx.place.objects["l1-onward-door"];
    if (d) { d.ui = null; d.primitive = null; d.model = { id: L1M.door }; d.physics = { body: "static", collider: "box" }; d.visibleRange = { max: 60 }; }
    if (!ctx.place.objects["l1-backwall"]) ctx.spawn("l1-backwall", { feetPosition: { x: BACK.x - 0.2 + L1M.wallDx, y: 0, z: BACK.z }, physics: "static", model: { id: L1M.wall }, receiveShadow: true, castShadow: false });
    const a = cellCenter(ARRIVE.cx, ARRIVE.cz);
    if (!ctx.place.objects["l1-mapboard"]) ctx.spawn("l1-mapboard", { feetPosition: { x: a.x + 1, y: 0, z: a.z + 8.6 }, rotation: { yaw: L1M.boardYaw }, physics: { body: "static", collider: "box" }, model: { id: L1M.board }, visibleRange: { max: 50 }, castShadow: false });
  }
  if ((s.envV ?? 0) < 2) { s.envV = 2; const a = cellCenter(ARRIVE.cx, ARRIVE.cz);
    for (const id of Object.keys(ctx.place.objects)) { const o = ctx.place.objects[id], f = o.feetPosition; if (o.light && o.primitive?.kind === "sphere" && f && Math.abs(f.x - a.x - 1) < 0.1 && Math.abs(f.z - a.z - 8.2) < 0.1) ctx.destroy(id); } // the old map lamp sat inside the board
  }
  // Nov 11: the flickering wall home stands in the far west halls (scripts/lib/level1.js BACK). A room laid before had its door
  // moved by a position write, which leaves a static trigger's collider where it was spawned: the way back to Level 0 stayed
  // invisible beside the camp. So the door, its wall, its lamp and the arrival are taken down, then laid fresh a tick later.
  if ((s.backV ?? 0) < 3 && s.seeded && s.arrive2) { // v3: moved flush into the west wall
    for (const id of ["l1-back", "l1-backwall", "l1-from-main", "l1-back-lamp"]) if (ctx.place.objects[id]) ctx.destroy(id);
    for (const [id, o] of Object.entries(ctx.place.objects)) { const f = o.feetPosition; if (o.light && !o.primitive && !o.model && f && f.y < 0.5 && [BACK_OLD, BACK].some((b) => Math.abs(f.x - b.x - 0.4) < 0.15 && Math.abs(f.z - b.z) < 0.15)) ctx.destroy(id); }
    s.backV = 3; s.backLay = true;
  } else if (s.backLay) { s.backLay = false;
    ctx.spawn("l1-back", { feetPosition: { x: BACK.x + 0.5, y: 0, z: BACK.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.8, height: 2.4, depth: 2.2 }, visible: false, behavior: "scripts/level-door.js", state: { to: "main" } });
    ctx.spawn("l1-back-lamp", { feetPosition: { x: BACK.x + 0.4, y: 0, z: BACK.z }, visibleRange: { max: 35 }, light: { kind: "point", color: "oklch(0.85 0.12 92)", intensity: 3, distance: 6, shadow: { enabled: false } } });
    ctx.spawn("l1-from-main", { feetPosition: { x: BACK.x + 2.4, y: 0.1, z: BACK.z }, rotation: { yaw: -90 } });
    ctx.spawn("l1-backwall", { feetPosition: { x: BACK.x - 0.2 + L1M.wallDx, y: 0, z: BACK.z }, physics: "static", model: { id: L1M.wall }, receiveShadow: true, castShadow: false });
  }
  if (s.seeded && !s.hubDoor) { s.hubDoor = true; // Nov 13: the Hub's way in. Deep in the south-east halls, one more door in the east wall, unmarked but for a carved mark over it
    const hz = cellCenter(N - 1, 28).z, hx = HALF;
    ctx.spawn("l1-to-hub", { feetPosition: { x: hx - 0.9, y: 0, z: hz }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.8, height: 2.4, depth: 1.6 }, visible: false, behavior: "scripts/level-door.js", state: { to: "thehub" } });
    ctx.spawn("l1-hub-door", { feetPosition: { x: hx - 0.15, y: 0, z: hz }, physics: { body: "static", collider: "box" }, model: { id: L1M.door }, visibleRange: { max: 60 }, castShadow: false });
    ctx.spawn("l1-hub-mark", { feetPosition: { x: hx - 0.3, y: 2.75, z: hz }, rotation: { yaw: 90 }, vector: symbolSvgL1(0.9), visibleRange: { max: 30 } });
    ctx.spawn("l1-hub-lamp", { feetPosition: { x: hx - 1.2, y: 3.2, z: hz }, visibleRange: { max: 40 }, light: { kind: "point", color: "oklch(0.78 0.15 68)", intensity: 2.2, distance: 7, shadow: { enabled: false } } });
  }
  if (s.seeded && !s.hubArrive) { s.hubArrive = true; // Shelly Nov 14: arriving from the Hub you stand beside its door, facing into the halls
    const hz = cellCenter(N - 1, 28).z, hx = HALF;
    ctx.spawn("l1-from-hub", { feetPosition: { x: hx - 2.6, y: 0.1, z: hz }, rotation: { yaw: 90 } });
  }
  if (!s.megCamp) { s.megCamp = true; // the M.E.G. waypoint: the camp, its fire, its lamps, and three agents
    if (ctx.place.objects["meg-cloth"]) ctx.destroy("meg-cloth");
    const a = cellCenter(ARRIVE.cx, ARRIVE.cz);
    ctx.spawn("meg-camp", { feetPosition: { x: a.x, y: 0, z: a.z }, physics: { body: "static", collider: "mesh" }, primitive: { kind: "scripted", script: "scripts/meg-camp-geo.js", params: { tripo: true } }, visibleRange: { max: 70 }, castShadow: false });
    ctx.spawn("meg-stove", { feetPosition: { x: a.x + 9.5, y: 0.72, z: a.z - 2.8 }, fx: { script: STOVE }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-small-fire-crackle-loop.mp3", gain: 0.25, loop: true, spatial: true, maxDistance: 14 } });
    ctx.spawn("meg-radio", { feetPosition: { x: a.x + 6.9, y: 1, z: a.z - 0.6 }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-radio-static-chatter-loop.mp3", gain: 0.1, loop: true, spatial: true, refDistance: 1, maxDistance: 6 } });
    for (const [dx, dz, col] of [[6, 4.2, "oklch(0.85 0.12 75)"], [6, -4.2, "oklch(0.85 0.12 75)"], [13, 0, "oklch(0.92 0.04 220)"]]) ctx.spawn({ feetPosition: { x: a.x + dx, y: 2.3, z: a.z + dz }, visibleRange: { max: 42 }, light: { kind: "point", color: col, intensity: 2.5, distance: 9, shadow: { enabled: false } } });
    for (const [id, dx, dz] of AGENTS) ctx.spawn(id, agentSpec(a, id, dx, dz));
  }
  if (s.megCamp && s.megTripo !== 3) { s.megTripo = 3; // the camp's tents, cots, table, stove, sandbags and pallets as real models (Shelly: less blocky)
    const a = cellCenter(ARRIVE.cx, ARRIVE.cz), camp = ctx.place.objects["meg-camp"]
    if (camp) camp.primitive = { kind: "scripted", script: "scripts/meg-camp-geo.js", params: { tripo: true } }
    const M = { tent: "/cdn/value.876d02a55c4b5fe879189ef5684d6e5d4836e9e5f6b7295f7e9b0b85ad9f7b58.glb", cot: "/cdn/value.7c6ab929e07fc61864842584ca2d254442f6dc31bfa7d2e2b9e4e3f48588f485.glb", table: "/cdn/value.c015312d6391f45684bfd1e30ad93c9391f659d879584af998cf53decc1613de.glb", stove: "/cdn/value.330d65cefe10f77c51d0fea1858662db291a4746b272dfdc2f81d21c681479f7.glb", bags: "/cdn/value.3ef438addb021fb2564e48689de4b5281d9464d3a65b502624bd0244ce8cad87.glb", pallet: "/cdn/value.e55e3090a6f8a13ae4db1cc993f62b0f07ee7a16a6c05c0fccde459bf7f1d9f8.glb" }
    const put = (id, m, dx, dz, w, h, yaw, solid = true) => ctx.spawn(id, { feetPosition: { x: a.x + dx, y: 0, z: a.z + dz }, rotation: { yaw }, model: { id: M[m] }, layout: { box: { min: { x: -w / 2, y: 0, z: -w / 2 }, max: { x: w / 2, y: h, z: w / 2 } } }, physics: solid && m !== "tent" ? "static" : undefined /* tents: the invisible side walls hold them, the open end lets you in */, visibleRange: { max: 70 } }) // tents: mesh colliders so the door is a door (Shelly: "i cant get in tents")
    put("meg-t-tent-n", "tent", 8.5, 6.5, 4.6, 3.3, 90, false); put("meg-t-tent-s", "tent", 8.5, -6.5, 4.6, 3.3, 90, false); put("meg-t-tent-med", "tent", 13, 0, 6.4, 3.9, 90, false) // tall enough to walk in standing
    tentWalls(ctx, a) // canvas sides solid, both ends open: you walk in (Shelly: "i cant get in tents")
    put("meg-t-cot-0", "cot", 5.5, 3.2, 2.0, 0.6, 0); put("meg-t-cot-1", "cot", 5.5, -3.2, 2.0, 0.6, 0); put("meg-t-cot-2", "cot", 11.6, 1.6, 2.0, 0.6, 0)
    put("meg-t-table", "table", 6.4, -0.5, 1.6, 1.4, 0); put("meg-t-stove", "stove", 9.5, -2.8, 0.75, 1.0, 30)
    for (const [i, dx, dz] of [[0, 14.5, 5.5], [1, 14.5, -5.5], [2, 11, -9], [3, 11, 9]]) put("meg-t-pallet-" + i, "pallet", dx + 0.35, dz, 1.3, 1.4, i * 20)
    let n = 0
    for (const sz of [-1, 1]) for (let x = -3; x <= 2; x += 1.6) put("meg-t-bags-" + n++, "bags", x, sz * 10.5, 1.6, 1.0, 0) // the model's wall runs along its own x
    for (const sz of [-1, 1]) for (let z = 2.8; z <= 8.5; z += 1.6) put("meg-t-bags-" + n++, "bags", 15.4, sz * z, 1.6, 1.0, 90)
  }
  if (s.megCamp && s.megCrates !== 2) { s.megCrates = 2; // the camp's crates as Tripo models in loose stacks by the sandbags, not unbroken walls of boxes (Shelly Nov 11: less blocky, sensible placement)
    const a = cellCenter(ARRIVE.cx, ARRIVE.cz), CRATE = "/cdn/value.96f48b56e826ebb5fd584d269b08f2272040ab5d50589b2e04101b00f31d82a2.glb"; // 0.63 x 0.6 x 0.77 m
    for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("meg-crate-")) delete ctx.place.objects[id];
    let n = 0;
    const crate = (dx, dz, y, yaw, k = 1) => { const j = hash(n, 3, 77) - 0.5;
      ctx.spawn("meg-crate-" + n++, { tags: ["l1prop"], feetPosition: { x: a.x + dx + j * 0.06, y, z: a.z + dz - j * 0.05 }, rotation: { yaw: yaw + j * 14 }, model: { id: CRATE },
        layout: { box: { min: { x: -0.315 * k, y: 0, z: -0.385 * k }, max: { x: 0.315 * k, y: 0.6 * k, z: 0.385 * k } } }, physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 45 }, state: { name: "Supply Crate", loose: "wood", mat: "wood" } }); };
    // a stack: two crates side by side (long side along the line), one riding across the pair
    const stack = (dx, dz, along, top = true) => { const ux = along === "x" ? 0.4 : 0, uz = along === "z" ? 0.4 : 0, yaw = along === "x" ? 90 : 0;
      crate(dx - ux, dz - uz, 0, yaw); crate(dx + ux, dz + uz, 0, yaw); if (top) crate(dx + ux * 0.2, dz + uz * 0.2, 0.6, yaw + 90); };
    for (const sz of [-1, 1]) { stack(-4.9, sz * 10.5, "x"); stack(3.4, sz * 10.6, "x", sz > 0); stack(10.6, sz * 11.2, "x"); crate(12.5, sz * 11.3, 0, 80); } // the sandbag lines' open ends and the tent row's back
    for (const sz of [-1, 1]) stack(15.5, sz * 10.1, "z", sz < 0); // the east corners, past the sandbags; the gate between them stays 4 m wide
    crate(6.1, 0.65, 0, 15, 0.75); crate(6.95, -1.65, 0, -20, 0.75); // stools at the radio table
    for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("meg-t-bags-")) { const o = ctx.place.objects[id], f = o.feetPosition; // the sandbag walls stood crossways, like fins: turned to run along their lines
      if (f) o.rotation = { yaw: Math.abs(f.x - a.x - 15.4) < 0.3 ? 90 : 0 }; }
    for (const id of Object.keys(ctx.place.objects)) { const o = ctx.place.objects[id], f = o?.feetPosition; // the two camp lanterns stood at 0.9 m on nothing: one hangs by the string-light pole, one sits on a crate stack
      if (o?.primitive?.kind !== "sphere" || o.primitive.radius !== 0.07 || !f || Math.abs(f.y - 0.9) > 0.05 || Math.hypot(f.x - a.x, f.z - a.z) > 7) continue;
      o.feetPosition = f.x > a.x ? { x: a.x + 4.15, y: 2.25, z: a.z + 4.2 } : { x: a.x - 4.85, y: 1.22, z: a.z + 10.5 }; }
  }
  if (s.l1Tripo !== 3) { s.l1Tripo = 3; // the halls' drums and box pallets as real models, each a loose thing you can hit, kick, grab and break (Shelly: less blocky)
    const DRUM = "/cdn/value.de68d3453156f6d0341dc0143da17f0a5f60f2da731a9b018363a51fcf233712.glb", PAL = "/cdn/value.52adc0a974c9920d51033154da8dae242fd9a7271b1190ad5a9d3a0f0b9f6c1f.glb";
    for (const id of Object.keys(ctx.place.objects)) { const o = ctx.place.objects[id]; if (o.primitive?.script === "scripts/level1-props-geo.js") o.primitive = { ...o.primitive, params: { tripo: true } }; }
    const drum = (id, x, z, yaw) => ctx.spawn(id, { tags: ["l1prop"], feetPosition: { x, y: 0, z }, rotation: { yaw }, model: { id: DRUM }, layout: { box: { min: { x: -0.3, y: 0, z: -0.3 }, max: { x: 0.3, y: 0.9, z: 0.3 } } }, physics: { body: "static", collider: "cylinder" }, visibleRange: { max: 45 }, state: { name: "Oil Drum", loose: "metal", mat: "sheet_steel" } });
    const pal = (id, x, z, yaw) => { // separate pieces (Shelly: "the boxes in this model should be separated"): the pallet, then each box its own thing you open, kick, grab or break
      for (const k of ["", "-p", "-b0", "-b1", "-b2", "-b3"]) if (ctx.place.objects[id + k]) delete ctx.place.objects[id + k];
      const n = 2 + Math.floor(hash(x, z, 7) * 2.99); // 1 to 3 boxes still on it
      BOXSTACK.slice(0, n + 1).forEach(([m, y, w, h, d], i) => {
        const box = i > 0, j = box ? (hash(x, z, 30 + i) - 0.5) : 0;
        ctx.spawn(id + (box ? "-b" + (i - 1) : "-p"), { tags: box ? ["l1prop", "container", "breakable"] : ["l1prop"], feetPosition: { x: x + j * 0.08, y, z: z - j * 0.06 }, rotation: { yaw: yaw + j * 14 }, model: { id: m }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } }, physics: { body: "static", collider: "box" }, visibleRange: { max: 45 },
          state: box ? { name: "Cardboard Box", loose: "wood", mat: "wood", hp: 20, maxHp: 20, items: "scrap_wood" } : { name: "Pallet", loose: "wood", mat: "wood", items: "scrap_wood" } });
      });
    };
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      const zone = zoneOf(cx, cz); if (zone !== "halls" && zone !== "storage") continue;
      const r = hash(cx, cz, 201), c = cellCenter(cx, cz), x = c.x + (hash(cx, cz, 203) - 0.5) * 3.2, z = c.z + (zone === "storage" ? 0 : (hash(cx, cz, 205) - 0.5) * 3.2), k = `l1d-${cx}-${cz}`;
      if (r < 0.1) { drum(k + "-0", x, z, r * 3600); drum(k + "-1", x + 0.68, z + 0.1, r * 7200); if (r < 0.05) drum(k + "-2", x + 0.3, z + 0.65, r * 900); }
      else if (r < 0.19) pal(`l1p-${cx}-${cz}`, x, z, hash(cx, cz, 209) * 180);
    }
    const a = cellCenter(ARRIVE.cx, ARRIVE.cz); pal("l1p-camp", a.x - 2.5, a.z + 7.4, 11); drum("l1d-camp", a.x + 5.6, a.z - 1.4, 40);
  }
  if (s.l1Kit !== 1) { s.l1Kit = 1; // the car park's kit as real models: hanging tube fixtures, hose reels, cement sacks, rebar, cones (Shelly: level 1 the blockiest)
    const K = { lamp: "/cdn/value.e1d7e9d8285363fde672073e9fa6ea81325922de9f94306bc9ce454a7b0b53b7.glb", hose: "/cdn/value.62af66caeebc701ab7021c12a15afee889aee3a7232b0e2fb74a6e352c9e2593.glb", cement: "/cdn/value.6f370e387809e6002bc4ee4ad843ad10de7dd44da5962e3aee65b7b8ecf5c221.glb", rebar: "/cdn/value.629540d3c37c77cf85e34278659821898a559fdc86122ac7b51315a9948b7eab.glb", cone: "/cdn/value.a551b5000627f75d0d6595406211bf3c968f4ec63f676742b66ef4c667374d92.glb" };
    const fit = (w, h, d) => ({ box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } });
    for (const id of Object.keys(ctx.place.objects)) { const o = ctx.place.objects[id];
      if (o.primitive?.script === "scripts/level1-details-geo.js") o.primitive = { ...o.primitive, params: { tripo: true } };
      if (o.tags?.includes("l1lamp") && o.primitive?.kind === "box") { const f = o.feetPosition; // the old glowing slab becomes a chain-hung twin-tube batten with its tubes still lit
        o.primitive = null; o.material = null; o.model = { id: K.lamp }; o.layout = fit(2.4, 0.55, 0.3); o.rotation = { yaw: 90 }; o.feetPosition = { x: f.x, y: H - 0.55, z: f.z };
        ctx.spawn({ parent: id, feetPosition: { x: 0, y: 0.015, z: 0 }, primitive: { kind: "box", width: 2.2, height: 0.035, depth: 0.07 }, material: { color: "oklch(0.97 0.02 220)", emissive: "oklch(0.95 0.03 220)", emissiveIntensity: 2.4 }, castShadow: false, visibleRange: { max: 42 } }); }
    }
    for (let i = 2; i < N; i += 4) for (let j = 2; j < N; j += 4) { if (!hasPillar(i, j) || hash(i, j, 331) > 0.45) continue;
      ctx.spawn(`l1k-hose-${i}-${j}`, { tags: ["l1kit"], feetPosition: { x: i * S - HALF, y: 0.95, z: j * S - HALF + 0.54 }, rotation: { yaw: 180 }, model: { id: K.hose, forward: "+z" }, layout: fit(0.5, 0.5, 0.16), castShadow: false, visibleRange: { max: 45 } }); }
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      const zone = zoneOf(cx, cz); if ((zone !== "halls" && zone !== "storage") || Math.abs(cx - ARRIVE.cx) + Math.abs(cz - ARRIVE.cz) < 3) continue;
      const c = cellCenter(cx, cz), r = hash(cx, cz, 341), x = c.x + (hash(cx, cz, 343) - 0.5) * 5, z = c.z + (hash(cx, cz, 345) - 0.5) * 5, k = `l1k-${cx}-${cz}`;
      if (r < 0.06) ctx.spawn(k, { tags: ["l1kit"], feetPosition: { x, y: 0, z }, rotation: { yaw: r * 6000 }, model: { id: K.cement }, layout: fit(0.75, 0.5, 0.5), physics: { body: "static", collider: "box" }, visibleRange: { max: 45 } });
      else if (r < 0.1) ctx.spawn(k, { tags: ["l1kit"], feetPosition: { x, y: 0, z }, rotation: { yaw: r * 3000 }, model: { id: K.rebar }, layout: fit(1.9, 0.3, 0.45), physics: { body: "static", collider: "box" }, visibleRange: { max: 40 } });
      if (zone === "halls" && hash(cx, cz, 351) < 0.08) for (let q = 0; q < 3; q++) ctx.spawn(`${k}-cone${q}`, { tags: ["l1kit"], feetPosition: { x: c.x + 1.2 + q * 0.9, y: 0, z: c.z - 2 + hash(q, cx, cz) * 0.6 }, rotation: { yaw: q * 40 }, model: { id: K.cone }, layout: fit(0.36, 0.5, 0.36), visibleRange: { max: 40 } });
    }
  }
  if (s.l1Deck === 3 && s.l1DeckLamps !== 1) { s.l1DeckLamps = 1; // the upper deck's lights were bare glowing slabs: the same chain-hung twin-tube batten as downstairs (Shelly Nov 11: less blocky)
    const TOP = DECK.y + DECK.h;
    for (const id of Object.keys(ctx.place.objects)) { const o = ctx.place.objects[id];
      if (!(id.startsWith("l1-dl-") || id.startsWith("l1-rl-")) || o?.primitive?.kind !== "box") continue;
      const f = o.feetPosition, lit = !!o.light;
      o.primitive = null; o.material = null; o.model = { id: "/cdn/value.e1d7e9d8285363fde672073e9fa6ea81325922de9f94306bc9ce454a7b0b53b7.glb" }; o.layout = { box: { min: { x: -1.2, y: 0, z: -0.15 }, max: { x: 1.2, y: 0.55, z: 0.15 } } }; o.feetPosition = { x: f.x, y: TOP - 0.55, z: f.z };
      if (lit) ctx.spawn({ parent: id, feetPosition: { x: 0, y: 0.015, z: 0 }, primitive: { kind: "box", width: 2.2, height: 0.035, depth: 0.07 }, material: { color: "oklch(0.97 0.02 220)", emissive: "oklch(0.95 0.03 220)", emissiveIntensity: 2.4 }, castShadow: false, visibleRange: { max: 42 } });
    }
  }
  if (s.seeded && s.l1Spr !== 1) { s.l1Spr = 1; // a pendant sprinkler under the red main every other bay, threads up into the pipe
    const SPR = "/cdn/value.984d06dc216cff395889a0b02b9b200c97991f11e10b6043cea18ffb298d1fd0.glb";
    for (let j = 1; j < N; j += 2) for (let i = 0; i < N; i += 2) { const x = i * S - HALF + 2, z = j * S - HALF + 1.9; if (inHole(x, z)) continue;
      ctx.spawn("l1-spr-" + i + "-" + j, { feetPosition: { x, y: H - 0.9, z: z + 0.07 }, rotation: { yaw: 0, pitch: 0, roll: 180 }, pivot: "center", model: { id: SPR }, layout: { box: { min: { x: -0.05, y: 0, z: -0.05 }, max: { x: 0.05, y: 0.24, z: 0.05 } } }, castShadow: false, visibleRange: { max: 28 } }); }
  }
  if (s.l1Tripo === 3 && s.l1Rubble !== 2) { s.l1Rubble = 2; for (const o of ctx.query({ tags: ["l1prop"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) if (o.id.startsWith("l1-rub")) ctx.destroy(o.id); // Nov 13 (Shelly: "improve this"): the fallen ceiling slab as Tripo concrete with rebar, a rubble pile beside it, no flat grit decal
    const SLAB = "/cdn/value.fc1fe594b7588d296db3f7bb983c8832fe77245a72f41a83471a278e732ec9fc.glb" /* Nov 13 v2: painted concept → Tripo, three tilted chunks with rebar and its own grit */, PILE = "/cdn/value.644c38e17be893d9013699ab57f00c4a1413a0d76642683fe9dff4f249a73e3c.glb";
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      if (zoneOf(cx, cz) !== "halls") continue; const r = hash(cx, cz, 201); if (r < 0.19 || r >= 0.23) continue;
      const c = cellCenter(cx, cz), x = c.x + (hash(cx, cz, 203) - 0.5) * 3.2, z = c.z + (hash(cx, cz, 205) - 0.5) * 3.2, yaw = hash(cx * 13 + cz, 2, 5) * 360;
      ctx.spawn("l1-rub-" + cx + "-" + cz, { tags: ["l1prop"], feetPosition: { x, y: 0, z }, rotation: { yaw }, model: { id: SLAB }, layout: { box: { min: { x: -1.3, y: 0, z: -0.95 }, max: { x: 1.3, y: 0.95, z: 0.95 } } }, physics: { body: "static", collider: "box" }, visibleRange: { max: 45 }, state: { name: "Fallen slab", mat: "concrete" } });
      // the heap carries its own rubble now: no separate pile
    }
  }
  if (s.l1Tripo === 3 && s.l1Kit === 1 && s.l1Nooks !== 1) s.l1Nooks = tuckClutter(ctx) || (s.l1NookTry = (s.l1NookTry | 0) + 1) > 3 ? 1 : 0;
  if (s.megCamp) { // a fallen agent is replaced after a while; the new one holds no grudge
    const a = cellCenter(ARRIVE.cx, ARRIVE.cz), at = Object.fromEntries(AGENTS.map(([id, dx, dz]) => [id, [dx, dz]]));
    keepPeople(ctx, Object.keys(at), (ctx, id) => { ctx.spawn(id, agentSpec(a, id, ...at[id])); ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, ...weaponBody("pistol") }); });
  }
  if (s.l1Deck !== 3 && !s.l1DeckPh) { s.l1DeckPh = 1; s.l1DeckCx = DECK.cx0; // laid over several passes (Nov 12: one pass of the whole deck froze the room 3 s)
    for (const o of ctx.query({ tags: ["l1deck"] })) delete ctx.place.objects[o.id]; // the upper deck (Shelly: "there should be at least a second floor"): its slab, ramps, lamps and what was left up there
    for (const r of RAMPS) { const b = rampBox(r); for (const id of Object.keys(ctx.place.objects)) { const o = ctx.place.objects[id], f = o?.feetPosition; if (!f || id === "l1-geo" || o.tags?.includes?.("player") || f.y > 3.5) continue;
      if (f.x > b.x0 - 0.3 && f.x < b.x1 + 0.3 && f.z > b.z0 + 0.4 && f.z < b.z1 - 0.4) delete ctx.place.objects[id]; } } // nothing parked on the ramps
    ctx.spawn("l1-deck", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level1-deck-geo.js" }, material: { roughness: 0.85, emissiveIntensity: 3 } });
    const Y = DECK.y, TOP = DECK.y + DECK.h;
    for (let cx = DECK.cx0; cx <= DECK.cx1; cx++) for (let cz = DECK.cz0; cz <= DECK.cz1; cz++) { // a tube in every other bay, a few dead
      if ((cx + cz) % 2) continue; const c = cellCenter(cx, cz), dead = hash(cx, cz, 501) < 0.15;
      ctx.spawn("l1-dl-" + cx + "-" + cz, { tags: dead ? ["l1deck"] : ["l1lamp", "l1deck"], feetPosition: { x: c.x, y: TOP - 0.62, z: c.z }, primitive: { kind: "box", width: 2.4, height: 0.06, depth: 0.3 }, castShadow: false, visibleRange: { max: 50 },
        material: dead ? { color: "oklch(0.55 0.01 240)" } : { color: "oklch(0.97 0.02 220)", emissive: "oklch(0.95 0.03 220)", emissiveIntensity: 2.4 },
        light: dead ? undefined : { kind: "point", color: "oklch(0.95 0.02 220)", intensity: LAMP_ON, distance: 18, shadow: { enabled: false } } });
    }
    for (const r of RAMPS) { const b = rampBox(r); ctx.spawn("l1-rl-" + r.cx, { tags: ["l1lamp", "l1deck"], feetPosition: { x: (b.x0 + b.x1) / 2, y: TOP - 0.62, z: (b.za + b.zb) / 2 }, primitive: { kind: "box", width: 2.4, height: 0.06, depth: 0.3 }, castShadow: false, visibleRange: { max: 50 },
      material: { color: "oklch(0.97 0.02 220)", emissive: "oklch(0.95 0.03 220)", emissiveIntensity: 2.4 }, light: { kind: "point", color: "oklch(0.95 0.02 220)", intensity: LAMP_ON, distance: 20, shadow: { enabled: false } } }); }
    for (const z of [DECK.cz0 * S - HALF - 1.2, (DECK.cz1 + 1) * S - HALF + 1.2]) for (let cx = DECK.cx0; cx <= DECK.cx1; cx += 2) // daylight spilling in through the slots, cold and flat
      ctx.spawn("l1-day-" + cx + "-" + (z < 0 ? "a" : "b"), { tags: ["l1deck"], feetPosition: { x: (cx + 1) * S - HALF, y: Y + 2.4, z }, light: { kind: "point", color: "oklch(0.96 0.02 95)", intensity: 6, distance: 14, shadow: { enabled: false } } });
    return;
  }
  if (s.l1Deck !== 3 && s.l1DeckPh) { const Y = DECK.y, ph = s.l1DeckPh;
    const stack = (id, x, z, yaw) => BOXSTACK.slice(0, 2 + Math.floor(hash(x, z, 7) * 2.99) + 1).forEach(([m, y, w, h, d], i) => { const bx = i > 0, j = bx ? hash(x, z, 30 + i) - 0.5 : 0;
      ctx.spawn(id + (bx ? "-b" + (i - 1) : "-p"), { tags: bx ? ["l1prop", "l1deck", "container", "breakable"] : ["l1prop", "l1deck"], feetPosition: { x: x + j * 0.08, y: Y + y, z: z - j * 0.06 }, rotation: { yaw: yaw + j * 14 }, model: { id: m }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } }, physics: { body: "static", collider: "box" }, visibleRange: { max: 45 },
        state: bx ? { name: "Cardboard Box", loose: "wood", mat: "wood", hp: 20, maxHp: 20, items: rollItemL1(ctx) } : { name: "Pallet", loose: "wood", mat: "wood", items: "scrap_wood" } }); });
    // Tripo pieces (Shelly: "make them not blocky using tripo"): guard rails round the ramp holes, rubber corner guards on every column, wheel stops in the bays
    const RAIL = "/cdn/value.be04f02e2a445068518e992e9c7a1813ef6cc5a7eb5c337211af69ba5babfc44.glb", CGUARD = "/cdn/value.694ad4a95ed42749ebfbc4893edb3a22bd6d676c4c219b786fbe7cf4d55b828f.glb", STOP = "/cdn/value.9bb20ea40f4fe00c4725e7939096b42e95266469a2015a09133e471af18e3891.glb";
    const rail = (id, x, z, yaw, len) => ctx.spawn(id, { tags: ["l1deck"], feetPosition: { x, y: Y + 0.25, z }, rotation: { yaw }, model: { id: RAIL }, layout: { box: { min: { x: -len / 2, y: 0, z: -0.12 }, max: { x: len / 2, y: 1.0, z: 0.12 } } }, physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 45 } });
    if (ph === 1) { s.l1DeckPh = 2;
    for (const r of RAMPS) { const b = rampBox(r), n = Math.round((b.x1 - b.x0) / 2), m = Math.round((b.z1 - b.z0) / 2);
      for (let k = 0; k < n; k++) { const x = b.x0 + ((k + 0.5) / n) * (b.x1 - b.x0); rail(`l1-dr-${r.cx}-a${k}`, x, b.z0 - 0.07, 0, (b.x1 - b.x0) / n); rail(`l1-dr-${r.cx}-b${k}`, x, b.z1 + 0.07, 0, (b.x1 - b.x0) / n); }
      for (let k = 0; k < m; k++) rail(`l1-dr-${r.cx}-e${k}`, b.xl, b.z0 + ((k + 0.5) / m) * (b.z1 - b.z0), 90, (b.z1 - b.z0) / m); }
    return; }
    if (ph === 2) { s.l1DeckPh = 3;
    for (let i = DECK.cx0; i <= DECK.cx1 + 1; i++) for (let j = DECK.cz0; j <= DECK.cz1 + 1; j++) { if (!hasPillar(i, j)) continue;
      ctx.spawn(`l1-dg-${i}-${j}`, { tags: ["l1deck"], feetPosition: { x: i * S - HALF, y: Y, z: j * S - HALF }, rotation: { yaw: (i * 7 + j * 3) % 4 * 90 }, model: { id: CGUARD }, layout: { box: { min: { x: -0.55, y: 0, z: -0.55 }, max: { x: 0.55, y: 1.41, z: 0.55 } } }, castShadow: false, visibleRange: { max: 40 } }); }
    return; }
    if (ph === 3) { const cx = s.l1DeckCx; if (cx >= DECK.cx1) s.l1DeckPh = 4; else s.l1DeckCx = cx + 1; // one column of wheel stops a pass
    for (const cz of [DECK.cz0, DECK.cz1]) {
      const x0 = cx * S - HALF, z = cz === DECK.cz0 ? cz * S - HALF + 1.0 : (cz + 1) * S - HALF - 1.0;
      for (let k = 0; k < 3; k++) { if (hash(cx, cz, 520 + k) < 0.18) continue; // a few bays lost theirs
        ctx.spawn(`l1-dw-${cx}-${cz}-${k}`, { tags: ["l1deck"], feetPosition: { x: x0 + ((k + 0.5) / 3) * S + (hash(cx, cz, 530 + k) - 0.5) * 0.3, y: Y, z }, rotation: { yaw: (hash(cx, cz, 540 + k) - 0.5) * 8 }, model: { id: STOP }, layout: { box: { min: { x: -0.9, y: 0, z: -0.16 }, max: { x: 0.9, y: 0.2, z: 0.16 } } }, physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 35 } }); } }
    return; }
    for (let cx = DECK.cx0; cx <= DECK.cx1; cx++) for (const cz of [DECK.cz0, DECK.cz1]) { // pallets left in the bays, nosed to the parapet
      if (rampCell(cx, cz) || hash(cx, cz, 511) > 0.32) continue; const c = cellCenter(cx, cz), out = cz === DECK.cz0 ? -1 : 1;
      stack("l1dp-" + cx + "-" + cz, c.x + (hash(cx, cz, 513) - 0.5) * 4, c.z + out * 2.2, hash(cx, cz, 515) * 30 - 15 + 90);
    }
    s.l1Deck = 3; delete s.l1DeckPh; delete s.l1DeckCx;
  }
  if (s.l1RackV !== 3) { s.l1RackV = 3; // Nov 13 (Shelly: "massively revamp this area ... tripo"): real modeled pallet racking, two 3 m bays per rack row
    for (const o of ctx.query({ tags: ["l1rack"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id);
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) { if (zoneOf(cx, cz) !== "storage") continue; const c = cellCenter(cx, cz);
      for (const [ri, r] of RACK.rows.entries()) for (const b of [-1, 1]) ctx.spawn(`l1rack-${cx}-${cz}-${ri}-${b}`, { tags: ["l1rack"], feetPosition: { x: c.x + b * RACK.len / 4, y: 0, z: c.z + r }, rotation: { yaw: (ri ? 180 : 0) + (hash(cx, cz, 600 + ri * 2 + b) - 0.5) * 1.2 },
        model: { id: RACK_GLB }, layout: { box: { min: { x: -RACK.len / 4, y: 0, z: -RACK.depth / 2 }, max: { x: RACK.len / 4, y: RACK.top, z: RACK.depth / 2 } } }, physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 45 } }); }
  }
  if (s.l1StockV !== 4) { s.l1StockV = 4; for (const o of ctx.query({ tags: ["l1stock"] })) delete ctx.place.objects[o.id]; s.l1Stock = 0; } // stock v2: real box models
  if (!s.l1Stock) { s.l1Stock = layStock(ctx) || 1; }
  if (s.puddles !== 2) { s.puddles = 2; for (const o of ctx.query({ tags: ["puddle"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id);
    for (let i = 0; i < 70; i++) { const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N); if (zoneOf(cx, cz) !== "halls" && zoneOf(cx, cz) !== "storage") continue;
      const c = cellCenter(cx, cz), r = 0.6 + ctx.random() * 1.4;
      ctx.spawn({ tags: ["puddle"], feetPosition: { x: c.x + (ctx.random() - 0.5) * 5, y: 0.012, z: c.z + (ctx.random() - 0.5) * 5 }, rotation: { yaw: ctx.random() * 360, pitch: -90 }, scale: { x: 1, y: 0.5 + ctx.random() * 0.5, z: 1 }, primitive: { kind: "circle", radius: r, segments: 20 }, visibleRange: { max: 35 }, castShadow: false, material: { color: "oklch(0.62 0.01 230 / 0.16)", roughness: 0.04, metalness: 0.1, transparent: true, depthWrite: false } });
    }
  }
  if (now >= (s.nextClang ?? 0)) { s.nextClang = now + 9000 + ctx.random() * 14000;
    for (const p of ctx.place.players) { const a = ctx.random() * 6.283;
      heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-distant-metal-pipe-clang-echo.mp3", position: { x: p.feetPosition.x + Math.cos(a) * 14, y: H - 0.3, z: p.feetPosition.z + Math.sin(a) * 14 }, volume: 0.5, maxDistance: 40 }, { audience: { player: p.id } }); }
  }
  // the pack: a manager, and hounds kept topped up (more while the lights are out)
  if (!s.furnitureSeeded) { // loot moved from crates into shelving bins, toolboxes, lockers and duffels: clear the old crates once
    for (const o of ctx.query({ tags: ["crate"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) if (o.tags?.includes("container")) ctx.destroy(o.id);
    s.furnitureSeeded = true; if (s.seeded) seedFurniture(ctx, L.crates);
  }
  if ((!s.packMgr || !(s.packMgr in ctx.place.objects))) s.packMgr = ctx.spawn({ behavior: "scripts/hounds.js" });
  const want = L.hounds + (s.flicker === "dark" ? L.flickerHounds : 0);
  const have = ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((h) => !h.state?.dead).length;
  if (have < want && now >= (s.nextHound ?? 0)) {
    s.nextHound = now + (s.flicker === "dark" ? 1500 : L.entityRespawn * 1000);
    for (let tries = 0; tries < 20; tries++) {
      const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N), z = zoneOf(cx, cz);
      if (z !== "halls" && z !== "storage") continue;
      if (Math.abs(cx - ARRIVE.cx) + Math.abs(cz - ARRIVE.cz) < 4) continue;
      const c = cellCenter(cx, cz);
      ctx.spawn({ tags: ["hound"], feetPosition: { x: c.x, y: 0.05, z: c.z }, physics: { body: "character" }, primitive: { kind: "scripted", script: "scripts/hound-geo.js" }, state: npcState(ctx, "hound", L.houndHp, { xp: L.xpHound }) });
      break;
    }
  }
  // the skin-stealers: a manager, and a few kept walking the halls
  if ((!s.stealMgr || !(s.stealMgr in ctx.place.objects))) s.stealMgr = ctx.spawn({ behavior: "scripts/stealers.js" });
  const stealers = ctx.query({ tags: ["stealer"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((h) => !h.state?.dead).length;
  if (stealers < L.stealers && now >= (s.nextStealer ?? 0)) {
    s.nextStealer = now + (s.stealersSeeded ? L.entityRespawn * 1000 : 0);
    for (let tries = 0; tries < 20; tries++) {
      const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N);
      if (zoneOf(cx, cz) !== "halls" || Math.abs(cx - ARRIVE.cx) + Math.abs(cz - ARRIVE.cz) < 5) continue;
      const c = cellCenter(cx, cz);
      ctx.spawn({ tags: ["stealer"], feetPosition: { x: c.x, y: 0.05, z: c.z }, physics: { body: "character" }, primitive: { kind: "scripted", script: "scripts/stealer-geo.js", params: { revealed: false } }, state: npcState(ctx, "stealer", L.stealerHp, { xp: L.xpStealer }) });
      break;
    }
    if (stealers + 1 >= L.stealers) s.stealersSeeded = true;
  }
  // the Flickering: a stutter, then black, then the lights come back
  const lamps = () => ctx.query({ tags: ["l1lamp"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
  const set = (on) => { if (ctx.session.l1lit === on) return; ctx.session.l1lit = on; for (const r of lamps()) { const o = ctx.place.objects[r.id]; if (!o) continue; o.light = { ...o.light, intensity: on ? (o.light?.distance > 10 ? LAMP_ON : 2.5) : 0 }; o.material = { ...o.material, emissiveIntensity: on ? 2.2 : 0 }; } };
  if (!s.flicker && now >= s.nextFlicker) { s.flicker = "warn"; s.flickerAt = now; heard(ctx, { maxDistance: 32, refDistance: 5, clip: "/cdn/moodboard-realistic-gritty/sfx-fluorescent-light-flicker-buzz.mp3", volume: 0.5 }, { audience: { place: ctx.place.id } }); }
  if (s.flicker === "warn") { const t = (now - s.flickerAt) / 1000; set(Math.floor(t * 6) % 3 !== 0); if (t > L.flickerWarn) { s.flicker = "dark"; s.flickerAt = now; s.darkFor = (L.flickerLength[0] + ctx.random() * (L.flickerLength[1] - L.flickerLength[0])) * 1000; set(false); } }
  else if (s.flicker === "dark" && now - s.flickerAt > s.darkFor) { s.flicker = null; set(true); afterFlicker(ctx); s.nextFlicker = now + (L.flickerEvery[0] + ctx.random() * (L.flickerEvery[1] - L.flickerEvery[0])) * 1000; }
}

// when the lights come back: the extra hunters slink off, and fresh crates have appeared on the racks (the wiki's "after a Flickering")
function afterFlicker(ctx) {
  const hounds = ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((h) => !h.state?.dead);
  for (const h of hounds.slice(L.hounds)) ctx.destroy(h.id);
  const have = ctx.query({ tags: ["lootfurn"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).length;
  seedFurniture(ctx, Math.min(8, L.crates - have));
}

// searchable furniture: steel bins on the rack shelves, toolboxes, lockers and dropped duffels back to a wall
function placeOne(ctx) {
  for (let k = 0; k < 12; k++) {
    const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N), kind = pickKind("level1", ctx.random());
    let spot = null;
    if (kind === "shelfbin") { // on a rack shelf, back to the rack's spine, open side to the aisle
      const slots = shelfSlots(cx, cz); if (!slots.length) continue;
      const p = slots[Math.floor(ctx.random() * slots.length)], c = cellCenter(cx, cz), into = p.z < c.z ? 1 : -1, back = sizeOf(kind)[2] / 2 + 0.015;
      spot = { x: p.x, y: p.y, z: p.z + into * back, dx: 0, dz: into };
    } else spot = wallSpot1(cx, cz, kind, ctx.random(), ctx.random());
    if (!spot || ctx.query({ tags: ["container"], radius: 0.9, center: { x: spot.x, y: spot.y ?? 0, z: spot.z } }).length) continue;
    spawnFurniture(ctx, "level1", kind, spot); return true;
  }
  return false;
}
// rack stock (Shelly: "the stock could be useable too"): cartons and paint pails on the rack decks, each one searchable.
// Laid once per place; the shelf bins keep their own slots (k at the bay middle is skipped, crates sit at ±0.75/2.2).
// the tents' long canvas sides as invisible walls; the door ends stay open
function tentWalls(ctx, a) {
  for (const [k, dx, dz, hw, hd, h] of [["n", 8.5, 6.5, 1.85, 2.3, 2.6], ["s", 8.5, -6.5, 1.85, 2.3, 2.6], ["med", 13, 0, 2.55, 3.2, 3.2]])
    for (const sx of [-1, 1]) ctx.spawn("meg-t-tentwall-" + k + (sx > 0 ? "e" : "w"), { feetPosition: { x: a.x + dx + sx * (hw - 0.25), y: 0, z: a.z + dz }, primitive: { kind: "box", width: 0.5, height: h * 0.7, depth: hd * 2 }, visible: false, physics: "static" })
}
function layStock(ctx) {
  const PAILS = ["/cdn/value.14aaae5f8ff7dc07b0f3bbf46f2d5efae93cdd6819b5dd66ae8aba348b3769be.glb", "/cdn/value.e172acdb25d4f81d7a58f04fe25b6f01fce49336a281df46d7c91621861b7dac.glb", "/cdn/value.a1ef6570297b658f585c8842ce65c0aadb030f8ba592abab028f7eccf36fca1f.glb"]; // Tripo pails, Nov 13 (Shelly: "paint buckets need an overhaul too")
  let n = 0;
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (zoneOf(cx, cz) !== "storage") continue;
    const c = cellCenter(cx, cz), x0 = c.x - RACK.len / 2;
    for (const r of RACK.rows) for (const [li, y] of DECKS.entries()) for (let k = 0; k < 6; k++) {
      const h0 = hash(cx * 7 + li, cz * 5 + k, r > 0 ? 71 : 73); if (h0 < 0.84) continue; // about 350 across the level: each is its own draw
      const bx = x0 + 0.35 + k * 0.9 + (hash(cx, cz, 80 + k) - 0.5) * 0.2, bz = c.z + r + (hash(cx, cz, 90 + k) - 0.5) * 0.25;
      const ax = Math.abs(bx - c.x); if (ax < 0.45 || ax > 2.55) continue; // inside one of the two 2.5 m Tripo bays, clear of its uprights
      const items = []; const m = 1 + Math.floor(ctx.random() * 2); for (let i = 0; i < m; i++) items.push(rollItemL1(ctx));
      if (h0 < 0.95) {
        const w = 0.3 + hash(cx, k, li) * 0.25, d = 0.3 + hash(k, cz, li) * 0.2, hh = 0.22 + hash(li, k, cz) * 0.28;
        ctx.spawn({ tags: ["container", "breakable", "l1stock"], feetPosition: { x: bx, y, z: bz }, rotation: { yaw: (hash(cx, k, 99) - 0.5) * 16 }, physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 40 },
          model: { id: hash(cx, k, li + 7) < 0.5 ? "/cdn/value.d4da0db276e9457c56a83cce2ef518cccc8065d0f8e158c7c82f747f45c97b2f.glb" : "/cdn/value.b38dc81280c35d3f87435921844ff0ee4594c8f1609dc3b020faf26416d137c6.glb" }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: hh, z: d / 2 } } }, // the real cardboard boxes cut from the pallet model, not flat blocks
          state: { name: "Carton", mat: "wood", hp: 20, maxHp: 20, items: items.join(",") } });
      } else {
        ctx.spawn({ tags: ["container", "breakable", "l1stock"], feetPosition: { x: bx, y, z: bz }, rotation: { yaw: hash(cx, k, 98) * 360 }, physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 40 },
          model: { id: PAILS[Math.floor(hash(cx, cz, k) * 3)] }, layout: { box: { min: { x: -0.15, y: 0, z: -0.15 }, max: { x: 0.15, y: 0.36, z: 0.15 } } }, // a 5-gallon pail, ~36 cm tall
          state: { name: "Paint pail", mat: "metal", hp: 30, maxHp: 30, items: items.join(",") } });
      }
      n++;
    }
  }
  return n;
}
function seedFurniture(ctx, n) { for (let i = 0; i < n; i++) placeOne(ctx); }

// the halls' clutter (drums, pallets of boxes, cement sacks, rebar) tucked into the corner beside one of the cell's pillars, square to the grid,
// where a car park's leftovers end up; it used to stand anywhere within 2.5 m of the bay's middle, in the driving aisle (Shelly Nov 11: "more sensible placements")
// storage cells keep theirs (between the racks), ramp cells and the camp's surroundings are skipped. Returns how many groups moved.
function tuckClutter(ctx) {
  const O = ctx.place.objects, ids = Object.keys(O); let moved = 0;
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (zoneOf(cx, cz) !== "halls" || rampCell(cx, cz) || Math.abs(cx - ARRIVE.cx) + Math.abs(cz - ARRIVE.cz) < 3) continue;
    const corners = [[cx, cz], [cx + 1, cz], [cx, cz + 1], [cx + 1, cz + 1]].filter(([i, j]) => hasPillar(i, j)).sort((p, q) => hash(p[0], p[1], 901) - hash(q[0], q[1], 901));
    const groups = [`l1d-${cx}-${cz}-`, `l1p-${cx}-${cz}-`, `l1k-${cx}-${cz}`].map((pre) => ids.filter((id) => pre.endsWith("-") ? id.startsWith(pre) : id === pre).map((id) => O[id]).filter((o) => o?.feetPosition && o.feetPosition.y < 1.5)).filter((g) => g.length);
    groups.forEach((g, gi) => {
      const corner = corners[gi]; if (!corner) return; // more groups than pillars: it stays where it was
      const [i, j] = corner, px = i * S - HALF, pz = j * S - HALF, sx = i === cx ? 1 : -1, sz = j === cz ? 1 : -1;
      const rebar = g[0].id.startsWith("l1k-") && g[0].model?.id?.includes("629540d3"), drum = g[0].id.startsWith("l1d-"), pallet = g[0].id.startsWith("l1p-");
      const off = drum ? 1.15 : pallet ? 1.3 : 0.95, tx = px + sx * (rebar ? 1.55 : off), tz = pz + sz * (rebar ? 0.75 : off);
      if (inHole(tx, tz)) return;
      const ax = g.reduce((a, o) => a + o.feetPosition.x, 0) / g.length, az = g.reduce((a, o) => a + o.feetPosition.z, 0) / g.length;
      for (const o of g) { const f = o.feetPosition; o.feetPosition = { x: f.x - ax + tx, y: f.y, z: f.z - az + tz }; }
      if (rebar) g[0].rotation = { yaw: (hash(i, j, 905) - 0.5) * 8 }; // the bundle lies along the pillar line, not across the aisle (a pallet keeps its turn: its boxes ride it)
      moved++;
    });
  }
  return moved;
}
