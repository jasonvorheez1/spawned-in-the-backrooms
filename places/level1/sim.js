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
import { N, H, zoneOf, lampAt, cellCenter, shelfSlots, BACK, ONWARD, ARRIVE, hash, S, HALF, hasPillar } from "../../scripts/lib/level1.js";
import { spawnAlmond } from "../../scripts/lib/loot.js";
import { spawnFurniture, pickKind, wallSpot1, sizeOf } from "../../scripts/lib/furniture.js";
import { tickChatter, CHATTER } from "../../scripts/lib/chatter.js";
const L1M = { door: "/cdn/value.020545cb36957131cc5f5eab3f6c2c38511e55076fb5e5542b93aff45e424288.glb", wall: "/cdn/value.1aa1542440b2b55ab177731e12bade8dfdb7ca60226cb2b55ff2491a998298fe.glb", board: "/cdn/value.1ed44cd9733b0a1d469ee47af7a8f609fcaee84b4aef6828e976544608979e8b.glb", wallDx: 0, boardYaw: 0 }; // Blender builds: art/level1/build.py

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

export function tick(ctx) {
  if (!ctx.place.players?.length) return; // empty level: nothing to run (perf)
  const s = ctx.place.state, now = ctx.now();
  if (!(Math.abs(now - (ctx.session.wallTick ?? -1e9)) < 2000)) { ctx.session.wallTick = now; tickWalls(ctx); } // broken interior walls: holes drawn, regrown after a while (lib/breakables.js)
  if (!s.almondTidy) { s.almondTidy = 1; for (const o of ctx.query({ tags: ["almond"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) { const p = o.feetPosition ?? { x: 0, y: 0, z: 0 }; if (p.y < 0.15 && !(Math.hypot(p.x - cellCenter(ARRIVE.cx, ARRIVE.cz).x - 2.4, p.z - cellCenter(ARRIVE.cx, ARRIVE.cz).z + 2.4) < 3)) ctx.destroy(o.id); } } // loose floor bottles cleared once: almond water lives in containers and drops now
  tickChatter(ctx, CHATTER.level1, {"meg-ale": "ale", "meg-ortiz": "ortiz", "meg-callum": "callum"}); // the camp talks among itself while someone's near
  if (!s.seeded) {
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
  if (!s.megCamp) { s.megCamp = true; // the M.E.G. waypoint: the camp, its fire, its lamps, and three agents
    if (ctx.place.objects["meg-cloth"]) ctx.destroy("meg-cloth");
    const a = cellCenter(ARRIVE.cx, ARRIVE.cz);
    ctx.spawn("meg-camp", { feetPosition: { x: a.x, y: 0, z: a.z }, physics: { body: "static", collider: "mesh" }, primitive: { kind: "scripted", script: "scripts/meg-camp-geo.js", params: { tripo: true } }, visibleRange: { max: 70 }, castShadow: false });
    ctx.spawn("meg-stove", { feetPosition: { x: a.x + 9.5, y: 0.72, z: a.z - 2.8 }, fx: { script: STOVE }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-small-fire-crackle-loop.mp3", gain: 0.25, loop: true, spatial: true, maxDistance: 14 } });
    ctx.spawn("meg-radio", { feetPosition: { x: a.x + 6.9, y: 1, z: a.z - 0.6 }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-radio-static-chatter-loop.mp3", gain: 0.1, loop: true, spatial: true, refDistance: 1, maxDistance: 6 } });
    for (const [dx, dz, col] of [[6, 4.2, "oklch(0.85 0.12 75)"], [6, -4.2, "oklch(0.85 0.12 75)"], [13, 0, "oklch(0.92 0.04 220)"]]) ctx.spawn({ feetPosition: { x: a.x + dx, y: 2.3, z: a.z + dz }, visibleRange: { max: 42 }, light: { kind: "point", color: col, intensity: 2.5, distance: 9, shadow: { enabled: false } } });
    for (const [id, dx, dz] of AGENTS) ctx.spawn(id, agentSpec(a, id, dx, dz));
  }
  if (s.megCamp && s.megTripo !== 1) { s.megTripo = 1; // the camp's tents, cots, table, stove, sandbags and pallets as real models (Shelly: less blocky)
    const a = cellCenter(ARRIVE.cx, ARRIVE.cz), camp = ctx.place.objects["meg-camp"]
    if (camp) camp.primitive = { kind: "scripted", script: "scripts/meg-camp-geo.js", params: { tripo: true } }
    const M = { tent: "/cdn/value.876d02a55c4b5fe879189ef5684d6e5d4836e9e5f6b7295f7e9b0b85ad9f7b58.glb", cot: "/cdn/value.7c6ab929e07fc61864842584ca2d254442f6dc31bfa7d2e2b9e4e3f48588f485.glb", table: "/cdn/value.c015312d6391f45684bfd1e30ad93c9391f659d879584af998cf53decc1613de.glb", stove: "/cdn/value.330d65cefe10f77c51d0fea1858662db291a4746b272dfdc2f81d21c681479f7.glb", bags: "/cdn/value.3ef438addb021fb2564e48689de4b5281d9464d3a65b502624bd0244ce8cad87.glb", pallet: "/cdn/value.e55e3090a6f8a13ae4db1cc993f62b0f07ee7a16a6c05c0fccde459bf7f1d9f8.glb" }
    const put = (id, m, dx, dz, w, h, yaw, solid = true) => ctx.spawn(id, { feetPosition: { x: a.x + dx, y: 0, z: a.z + dz }, rotation: { yaw }, model: { id: M[m] }, layout: { box: { min: { x: -w / 2, y: 0, z: -w / 2 }, max: { x: w / 2, y: h, z: w / 2 } } }, physics: solid ? "static" : undefined, visibleRange: { max: 70 } })
    put("meg-t-tent-n", "tent", 8.5, 6.5, 4.2, 2.4, 90); put("meg-t-tent-s", "tent", 8.5, -6.5, 4.2, 2.4, 90); put("meg-t-tent-med", "tent", 13, 0, 6, 3.0, 90)
    put("meg-t-cot-0", "cot", 5.5, 3.2, 2.0, 0.6, 0); put("meg-t-cot-1", "cot", 5.5, -3.2, 2.0, 0.6, 0); put("meg-t-cot-2", "cot", 11.6, 1.6, 2.0, 0.6, 0)
    put("meg-t-table", "table", 6.4, -0.5, 1.6, 1.4, 0); put("meg-t-stove", "stove", 9.5, -2.8, 0.75, 1.0, 30)
    for (const [i, dx, dz] of [[0, 14.5, 5.5], [1, 14.5, -5.5], [2, 11, -9], [3, 11, 9]]) put("meg-t-pallet-" + i, "pallet", dx + 0.35, dz, 1.3, 1.4, i * 20)
    let n = 0
    for (const sz of [-1, 1]) for (let x = -3; x <= 2; x += 1.6) put("meg-t-bags-" + n++, "bags", x, sz * 10.5, 1.6, 1.0, 90)
    for (const sz of [-1, 1]) for (let z = 2.8; z <= 8.5; z += 1.6) put("meg-t-bags-" + n++, "bags", 15.4, sz * z, 1.6, 1.0, 0)
  }
  if (s.l1Tripo !== 1) { s.l1Tripo = 1; // the halls' drums and box pallets as real models, each a loose thing you can hit, kick, grab and break (Shelly: less blocky)
    const DRUM = "/cdn/value.de68d3453156f6d0341dc0143da17f0a5f60f2da731a9b018363a51fcf233712.glb", PAL = "/cdn/value.52adc0a974c9920d51033154da8dae242fd9a7271b1190ad5a9d3a0f0b9f6c1f.glb";
    for (const id of Object.keys(ctx.place.objects)) { const o = ctx.place.objects[id]; if (o.primitive?.script === "scripts/level1-props-geo.js") o.primitive = { ...o.primitive, params: { tripo: true } }; }
    const drum = (id, x, z, yaw) => ctx.spawn(id, { tags: ["l1prop"], feetPosition: { x, y: 0, z }, rotation: { yaw }, model: { id: DRUM }, layout: { box: { min: { x: -0.3, y: 0, z: -0.3 }, max: { x: 0.3, y: 0.9, z: 0.3 } } }, physics: { body: "static", collider: "cylinder" }, visibleRange: { max: 45 }, state: { name: "Oil Drum", loose: "metal", mat: "sheet_steel" } });
    const pal = (id, x, z, yaw) => ctx.spawn(id, { tags: ["l1prop"], feetPosition: { x, y: 0, z }, rotation: { yaw }, model: { id: PAL }, layout: { box: { min: { x: -0.6, y: 0, z: -0.6 }, max: { x: 0.6, y: 1.3, z: 0.6 } } }, physics: { body: "static", collider: "box" }, visibleRange: { max: 45 }, state: { name: "Pallet of Boxes", loose: "wood", mat: "wood", items: "scrap_wood" } });
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
  if (s.megCamp) { // a fallen agent is replaced after a while; the new one holds no grudge
    const a = cellCenter(ARRIVE.cx, ARRIVE.cz), at = Object.fromEntries(AGENTS.map(([id, dx, dz]) => [id, [dx, dz]]));
    keepPeople(ctx, Object.keys(at), (ctx, id) => { ctx.spawn(id, agentSpec(a, id, ...at[id])); ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, ...weaponBody("pistol") }); });
  }
  if (!s.l1Stock) { s.l1Stock = layStock(ctx) || 1; }
  if (!s.puddles) { s.puddles = true;
    for (let i = 0; i < 70; i++) { const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N); if (zoneOf(cx, cz) !== "halls" && zoneOf(cx, cz) !== "storage") continue;
      const c = cellCenter(cx, cz), r = 0.6 + ctx.random() * 1.4;
      ctx.spawn({ tags: ["puddle"], feetPosition: { x: c.x + (ctx.random() - 0.5) * 5, y: 0.012, z: c.z + (ctx.random() - 0.5) * 5 }, rotation: { yaw: ctx.random() * 360, pitch: -90 }, scale: { x: 1, y: 0.5 + ctx.random() * 0.5, z: 1 }, primitive: { kind: "circle", radius: r, segments: 20 }, visibleRange: { max: 35 }, castShadow: false, material: { color: "oklch(0.5 0.012 240 / 0.32)", roughness: 0.02, metalness: 0.55, transparent: true } });
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
function layStock(ctx) {
  const PAILS = ["oklch(0.88 0.01 250)", "oklch(0.55 0.13 250)", "oklch(0.6 0.16 30)"];
  let n = 0;
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (zoneOf(cx, cz) !== "storage") continue;
    const c = cellCenter(cx, cz), x0 = c.x - RACK.len / 2;
    for (const r of RACK.rows) for (const [li, y] of RACK.levels.entries()) for (let k = 0; k < 6; k++) {
      const h0 = hash(cx * 7 + li, cz * 5 + k, r > 0 ? 71 : 73); if (h0 < 0.55) continue;
      const bx = x0 + 0.35 + k * 0.9 + (hash(cx, cz, 80 + k) - 0.5) * 0.2, bz = c.z + r + (hash(cx, cz, 90 + k) - 0.5) * 0.25;
      if (Math.abs(bx - c.x) < 0.15 || [-2.2, -0.75, 0.75, 2.2].some((dx) => Math.abs(bx - (c.x + dx)) < 0.35)) continue;
      const items = []; const m = 1 + Math.floor(ctx.random() * 2); for (let i = 0; i < m; i++) items.push(rollItemL1(ctx));
      if (h0 < 0.85) {
        const w = 0.3 + hash(cx, k, li) * 0.25, d = 0.3 + hash(k, cz, li) * 0.2, hh = 0.22 + hash(li, k, cz) * 0.28;
        ctx.spawn({ tags: ["container", "breakable", "l1stock"], feetPosition: { x: bx, y, z: bz }, rotation: { yaw: (hash(cx, k, 99) - 0.5) * 16 }, physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 40 },
          primitive: { kind: "scripted", script: "scripts/l1-stock-geo.js", params: { kind: "carton", w, d, h: hh, tint: h0 < 0.7 ? "oklch(0.78 0.06 70)" : "oklch(0.7 0.05 65)" } },
          state: { name: "Carton", mat: "wood", hp: 20, maxHp: 20, items: items.join(",") } });
      } else {
        ctx.spawn({ tags: ["container", "breakable", "l1stock"], feetPosition: { x: bx, y, z: bz }, rotation: { yaw: hash(cx, k, 98) * 360 }, physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 40 },
          primitive: { kind: "scripted", script: "scripts/l1-stock-geo.js", params: { kind: "pail", tint: PAILS[Math.floor(hash(cx, cz, k) * 3)] } },
          state: { name: "Paint pail", mat: "metal", hp: 30, maxHp: 30, items: items.join(",") } });
      }
      n++;
    }
  }
  return n;
}
function seedFurniture(ctx, n) { for (let i = 0; i < n; i++) placeOne(ctx); }
