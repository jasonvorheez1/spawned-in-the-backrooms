import { overlapPoint } from "builtin/physics";
import { npcState } from "../../scripts/lib/stats.js";
import { LURKER_MODEL, LURKER_SCALE } from "../../scripts/lurkers.js";
import { MODEL as SMILER_MODEL, SCALE as SMILER_SCALE } from "../../scripts/smilers.js";
// Level 0's referee: keeps almond water on the floor and smilers in the dark.
import L from "../../scripts/lib/data/level0.yml";
const MID = (L.hub[0] + L.hub[1]) / 2; // the safe room's centre cell
import W, { rarityCap, rarityIdx } from "../../scripts/lib/weapons.js";
import { spawnAlmond, spawnWeapon, rollWeapon, rollCash } from "../../scripts/lib/loot.js";
import { spawnFurniture, pickKind, wallSpot0 } from "../../scripts/lib/furniture.js";
import { N, S, H, HALF, zoneOf, inHub, hasPit, hasPillar, cellCenter, cellAt, wallX, wallZ, EXIT, openPoint } from "../../scripts/lib/maze.js";
const PAPER = { texture: "/cdn/value.00a4e744acf9ab763779bbb0cc7f26fb1dd20aeafc69448c536939cd7212caeb.png", color: "oklch(0.98 0.01 90)", repeat: [1, 1] };
import B from "../../scripts/lib/data/breakables.yml";
import { syncLevel0 } from "../../scripts/lib/breakables.js";
import { layMoments } from "../../scripts/lib/level0-moments.js";
import { layZenithEntry } from "../../scripts/lib/zenith-quest.js";
export const cadence = "1s";
// office furniture: breakable props scattered through the halls (desk, chair, shelf: [mat, hp])
// Blender-built office pieces (art/office-furniture/build.py), front +Z
const FMODEL = { desk: "/cdn/value.dc2f7ac92df4c08964be1ea4af5e520bbf4c12d50609157f85b41db8f3c21fcf.glb", chair: "/cdn/value.34ee5f211b991e7489c032ed09d062af9fda8ef8a79c69afadafd1a650be47d8.glb", shelf: "/cdn/value.9f3b838cc1b4403a54d96e1b80372c75c9a440c1d4e61a4760f60de82133526b.glb", copier: "/cdn/value.5489a9397b8e52f5ea0f528a387d0449d0787726d6bc65bd041ec8faf80f9362.glb" };
const fmodel = (kind) => ({ id: FMODEL[kind], forward: "+z" });
const FURN = { desk: ["wood", 80], chair: ["metal", 45], shelf: ["metal", 110], copier: ["machine", 110] };
// what an office desk's drawers hold: office junk, snacks, a little cash, now and then a tool. Weights are Savi's picks; no ammo.
const DESK = [["cash", 22], ["bobbypin", 16], ["lobby_wafer", 12], ["bar", 9], ["almond", 12], ["tape", 8], ["battery", 8], ["book", 4], ["bandage", 5], ["weapon", 3]];
function deskItems(ctx) {
  const n = ctx.random() < 0.15 ? 0 : 1 + Math.floor(ctx.random() * 3), out = [], tot = DESK.reduce((a, [, w]) => a + w, 0);
  for (let i = 0; i < n; i++) {
    let r = ctx.random() * tot, k = "almond";
    for (const [kk, w] of DESK) { r -= w; if (r <= 0) { k = kk; break; } }
    out.push(k === "cash" ? rollCash(ctx) : k === "weapon" ? "weapon:" + rollWeapon(ctx) : k === "book" ? "book:lockpick" : k);
  }
  return out.join(",");
}
function furnish(ctx) {
  let n = 0;
  for (let k = 0; k < 900 && n < (L.furniture ?? 140); k++) {
    const cx = 1 + Math.floor(ctx.random() * (N - 2)), cz = 1 + Math.floor(ctx.random() * (N - 2));
    if (inHub(cx, cz) || hasPit(cx, cz) || hasPillar(cx, cz) || !["halls", "expanse", "dark", "red"].includes(zoneOf(cx, cz))) continue;
    const c = cellCenter(cx, cz), r = ctx.random(), kind = r < 0.38 ? "desk" : r < 0.64 ? "chair" : r < 0.84 ? "shelf" : "copier", [mat, hp] = FURN[kind];
    const along = ctx.random() < 0.5, side = ctx.random() < 0.5 ? -1 : 1, off = kind === "shelf" || kind === "copier" ? S / 2 - 0.35 : (ctx.random() - 0.5) * 1.6;
    const pos = along ? { x: c.x + side * off, y: 0, z: c.z + (ctx.random() - 0.5) } : { x: c.x + (ctx.random() - 0.5), y: 0, z: c.z + side * off };
    const yaw = kind === "chair" ? ctx.random() * 360 : (along ? 90 : 0) + (side < 0 ? 180 : 0);
    ctx.spawn({ tags: kind === "desk" ? ["breakable", "furniture", kind, "container"] : ["breakable", "furniture", kind], feetPosition: pos, rotation: yaw, visibleRange: { max: 46 }, castShadow: kind !== "chair", physics: { body: "static", collider: "box" }, model: fmodel(kind), state: { mat, hp, maxHp: hp, name: kind === "desk" ? "Desk drawers" : kind[0].toUpperCase() + kind.slice(1), ...(kind === "desk" ? { items: deskItems(ctx) } : {}) } });
    n++;
  }
}
// sunken furniture (Kane Pixel's Backrooms): office pieces half swallowed by the carpet, tilted where they went under, a dark damp ring around each
const SUNK_H = { desk: 0.76, chair: 0.95, shelf: 1.9, copier: 1.15 }; // her pick: rough heights of build-geo's kinds
function sink(ctx) {
  let n = 0;
  for (let k = 0; k < 600 && n < (L.sunken ?? 42); k++) {
    const cx = 1 + Math.floor(ctx.random() * (N - 2)), cz = 1 + Math.floor(ctx.random() * (N - 2));
    if (inHub(cx, cz) || hasPit(cx, cz) || hasPillar(cx, cz)) continue;
    if (Math.abs(cx - MID) < 5 && Math.abs(cz - MID) < 5) continue;
    const c = cellCenter(cx, cz), r = ctx.random(), kind = r < 0.35 ? "desk" : r < 0.65 ? "chair" : r < 0.85 ? "shelf" : "copier";
    const h = SUNK_H[kind], depth = h * (0.35 + ctx.random() * 0.4); // 35-75% under the carpet
    const x = c.x + (ctx.random() - 0.5) * 1.6, z = c.z + (ctx.random() - 0.5) * 1.6;
    const tilt = (ctx.random() - 0.5) * 36, roll = (ctx.random() - 0.5) * 28;
    const id = ctx.spawn({ tags: ["furniture", "sunken", "breakable", kind], feetPosition: { x, y: -depth, z }, rotation: { yaw: ctx.random() * 360, pitch: tilt, roll }, visibleRange: { max: 46 }, castShadow: false, physics: { body: "static", collider: "box" }, model: fmodel(kind), state: { name: "Sunken " + kind, mat: kind === "chair" ? "wood" : "metal", hp: 60, maxHp: 60 } }); // Z heaves it out of the carpet (grab.js), a swing breaks it
    // the carpet slumps into a wet dark ring where it went down
    ctx.spawn({ tags: ["sunken-stain"], feetPosition: { x, y: 0.012, z }, rotation: { pitch: -90 }, castShadow: false, visibleRange: { max: 30 }, primitive: { kind: "circle", radius: 0.9 + h * 0.5, segments: 20 }, material: { color: "oklch(0.2 0.03 70 / 0.55)", transparent: true, roughness: 0.35, depthWrite: false }, receiveShadow: true, castShadow: false, visibleRange: { max: 34 } });
    ctx.spawn({ tags: ["sunken-stain"], feetPosition: { x, y: 0.014, z }, rotation: { pitch: -90 }, castShadow: false, visibleRange: { max: 30 }, primitive: { kind: "circle", radius: 0.45 + h * 0.3, segments: 16 }, material: { color: "oklch(0.13 0.02 70 / 0.7)", transparent: true, roughness: 0.2, depthWrite: false }, castShadow: false, visibleRange: { max: 34 } });
    n++;
  }
}
// broken walls stay broken for this room, then grow back (never while someone stands in the gap)
function regrow(ctx, s, now) {
  const br = s.broken; if (!br) return;
  for (const [k, at] of Object.entries(br)) {
    if (now - at < B.regrowMinutes * 60000) continue;
    const [ax, cx, cz] = k.split(":"), c = cellCenter(+cx, +cz), w = ax === "x" ? { x: c.x + S / 2, z: c.z } : { x: c.x, z: c.z + S / 2 };
    if (ctx.place.players.some((p) => Math.abs(p.feetPosition.x - w.x) < 1.2 && Math.abs(p.feetPosition.z - w.z) < 1.2)) continue;
    delete br[k];
  }
}

function cell(ctx, zones) {
  for (let k = 0; k < 60; k++) {
    const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N);
    if (inHub(cx, cz) || hasPit(cx, cz)) continue;
    if (Math.abs(cx - MID) < 6 && Math.abs(cz - MID) < 6) continue; // not right outside the safe room
    if (zones && k < 45 && !zones.includes(zoneOf(cx, cz))) continue;
    return cellCenter(cx, cz);
  }
  return null;
}

const CREATURES = ["smiler", "lurker", "hound", "stealer", "npc"];
// a creature found inside a wall (a shifted wall, a lunge through a corner) is set back in the middle of the nearest open cell
function nearOpen(cx, cz) { for (let r = 1; r < 4; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { const x = cx + dx, z = cz + dz; if (x >= 0 && z >= 0 && x < N && z < N && !hasPit(x, z) && !inHub(x, z)) return { cx: x, cz: z }; } return { cx, cz }; }
function unstick(ctx, s, now) {
  if (now < (s.unstickAt ?? 0)) return; s.unstickAt = now + 1500;
  for (const c of ctx.query({ anyTags: CREATURES, radius: 60, center: ctx.place.players[0].feetPosition })) {
    if (c.state?.dead) continue;
    const f = c.feetPosition, hit = overlapPoint(ctx, { x: f.x, y: f.y + 0.9, z: f.z });
    const inWall = (hit?.objects ?? []).some((o) => (o.id ?? o) !== c.id && !String(o.id ?? o).startsWith(c.id + "/"));
    const pc = cellAt(f.x, f.z), inPit = f.y < -0.4 && hasPit(pc.cx, pc.cz); // dropped into a floor hole: set back up on the nearest open floor
    if (!inWall && !inPit) continue;
    const { cx, cz } = inPit ? nearOpen(pc.cx, pc.cz) : pc, m = openPoint(cx, cz);
    const o = ctx.place.objects[c.id]; if (!o) continue;
    o.feetPosition = { x: m.x, y: inPit ? 0.05 : Math.max(0.02, f.y), z: m.z }; o.velocity = { x: 0, y: 0, z: 0 };
  }
}
function shift(ctx, s, now) {
  for (const p of ctx.place.players) {
    const k = "shift_" + p.id;
    if (now < (s[k] ?? 0)) continue;
    s[k] = now + L.shiftEvery * 1000 * (0.7 + ctx.random() * 0.6);
    const ax = p.state?.aimX ?? 0, az = p.state?.aimZ ?? -1, back = 2 + Math.floor(ctx.random() * 2);
    const { cx, cz } = cellAt(p.feetPosition.x - ax * back * S, p.feetPosition.z - az * back * S);
    if (cx < 1 || cz < 1 || cx >= N - 1 || cz >= N - 1) continue;
    const z0 = zoneOf(cx, cz);
    if (z0 === "hub" || z0 === "arches") continue; // arch rooms never shift
    const edges = [];
    if (!wallX(cx, cz) && !["hub", "arches"].includes(zoneOf(cx + 1, cz))) edges.push("x");
    if (!wallZ(cx, cz) && !["hub", "arches"].includes(zoneOf(cx, cz + 1))) edges.push("z");
    if (!edges.length) continue;
    const e = edges[Math.floor(ctx.random() * edges.length)], c = cellCenter(cx, cz);
    const pos = e === "x" ? { x: (cx + 1) * S - HALF, y: 0, z: c.z } : { x: c.x, y: 0, z: (cz + 1) * S - HALF };
    if (ctx.query({ tags: ["shifted"], center: pos, radius: 0.5 }).length) continue;
    if (ctx.query({ anyTags: CREATURES, center: pos, radius: S / 2 + 0.8 }).length) continue; // never close a wall on a creature
    ctx.spawn({ tags: ["shifted"], lifetime: L.shiftLife, feetPosition: pos, primitive: { kind: "box", width: e === "x" ? 0.2 : S, height: H, depth: e === "x" ? S : 0.2 }, material: PAPER, physics: "static" });
  }
}

export function tick(ctx) {
  if (!ctx.place.players?.length) return; // empty level: nothing to run (perf)
  const s = ctx.place.state, now = ctx.now();
  layZenithEntry(ctx); // Level 0.1: Kade and the B.N.T.G. bulkhead in the safe room
  if (!s.almondTidy) { s.almondTidy = 1; for (const o of ctx.query({ tags: ["almond"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) { const p = o.feetPosition ?? { x: 0, y: 0, z: 0 }; if (p.y < 0.15 && !(false)) ctx.destroy(o.id); } } // loose floor bottles cleared once: almond water lives in containers and drops now
  if (!s.arrive2) { s.arrive2 = true; const ex = cellCenter(EXIT.cx, EXIT.cz); ctx.spawn("main-from-l1", { feetPosition: { x: -HALF + 2.4, y: 0.1, z: ex.z }, rotation: { yaw: -90 } }); } // Level 1's way back lets you out by the flickering wall
  if (!s.stairsSeeded) {
    s.stairsSeeded = true;
    let n = 0;
    for (let k = 0; k < 400 && n < L.stairsCount; k++) {
      const cx = 1 + Math.floor(ctx.random() * (N - 2)), cz = 1 + Math.floor(ctx.random() * (N - 2));
      if (zoneOf(cx, cz) !== "halls" || inHub(cx, cz) || hasPillar(cx, cz) || hasPit(cx, cz)) continue;
      if (Math.abs(cx - MID) < 5 && Math.abs(cz - MID) < 5) continue;
      const c = cellCenter(cx, cz);
      ctx.spawn({ tags: ["stairs"], feetPosition: { x: c.x + (ctx.random() < 0.5 ? -1 : 1), y: 0, z: c.z }, primitive: { kind: "scripted", script: "scripts/stairs-geo.js" }, physics: { body: "static", collider: "mesh" } });
      n++;
    }
  }
  if (s.momentsV !== 7) {
    if (s.momentsV) {
      for (const m of ctx.query({ tags: ["moment"] })) ctx.destroy(m.id);
    }
    s.momentsV = 7;
    s.moments = layMoments(ctx);
  }
  shift(ctx, s, now);
  unstick(ctx, s, now);
  if (!s.furnished) { s.furnished = true; furnish(ctx); }
  if (s.tableAlmondV !== 1) { // the four bottles on the safe room table were set dressing; now they're real almond water you can take
    const MODEL = "/cdn/value.d74570d765a2d43f965fc8756878f7bf22f833db5feaf4c335d84d8dc4ba5b62.glb";
    [[-5.01, -3.99], [-4.78, -3.89], [-4.42, -4.12], [-4.15, -4.02]].forEach(([x, z], i) => {
      const d = ctx.place.objects["hub/table/child-" + (5 + i)]; if (d) d.visible = false;
      ctx.spawn("hub-almond-" + i, { tags: ["almond"], feetPosition: { x, y: 0.74, z }, castShadow: false, model: MODEL, layout: { box: { min: { x: -0.08, y: 0, z: -0.08 }, max: { x: 0.08, y: 0.32, z: 0.08 } } } });
    });
    s.tableAlmondV = 1;
  }
  if (s.floorGateV !== 1 && ctx.place.players.length) { // floor weapons above the player's level go, the refill brings fitting ones
    const cap = rarityCap(Math.max(1, ...ctx.place.players.map((p) => p.state?.level ?? 1)));
    for (const w of ctx.query({ tags: ["weapon"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) if (w.state?.kind && rarityIdx(w.state.kind) > cap) ctx.destroy(w.id);
    s.floorGateV = 1;
  }
  if (s.deskV !== 1) { // once per room: sweep loose ammo, turn the desks already standing into drawers
    for (const a of ctx.query({ tags: ["ammo"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(a.id);
    for (const d of ctx.query({ tags: ["furniture", "desk"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
      const o = ctx.place.objects[d.id]; if (!o || o.tags.includes("sunken") || o.tags.includes("container")) continue;
      o.tags = [...o.tags, "container"]; o.state.items = deskItems(ctx); o.state.name = "Desk drawers";
    }
    s.deskV = 1;
  }
  if (s.sunkV !== 1) { s.sunkV = 1; sink(ctx); }
  regrow(ctx, s, now);
  syncLevel0(ctx);
  const weapons = ctx.query({ tags: ["weapon"] }).length;
  if (false && weapons < W.pickups && now >= (s.nextWeapon ?? 0)) {
    const fill = s.weaponsSeeded ? 1 : W.pickups - weapons;
    for (let i = 0; i < fill; i++) {
      const c = cell(ctx);
      if (c) spawnWeapon(ctx, c, rollWeapon(ctx, "l0", rarityCap(Math.max(1, ...ctx.place.players.map((p) => p.state?.level ?? 1)))));
    }
    s.weaponsSeeded = true;
    s.nextWeapon = now + (W.pickupRespawn * 1000) / 4;
  }
  // the creator: no ammo rounds lying around Level 0 (2026-11-08). Ammo only turns up inside containers and on bodies.
  const smilers = ctx.query({ tags: ["smiler"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((m) => !m.state?.dead).length;
  if (smilers < L.smilers && now >= (s.nextSmiler ?? 0)) {
    const fill = s.smilersSeeded ? 1 : L.smilers - smilers;
    for (let i = 0; i < fill; i++) {
      const c = cell(ctx, ["dark", "red", "pillars", "expanse"]);
      if (c) ctx.spawn({ tags: ["smiler"], feetPosition: { x: c.x, y: 0.05, z: c.z }, model: SMILER_MODEL, scale: SMILER_SCALE, physics: { body: "character" }, state: { ...npcState(ctx, "smiler", L.smilerHp), mdl: 2 } });
    }
    s.smilersSeeded = true;
    s.nextSmiler = now + L.smilerRespawn * 1000;
  }
  if (!s.furnitureSeeded) { // loot moved from crates into office furniture: clear the old crates once, then seed afresh
    for (const o of ctx.query({ tags: ["crate"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) if (o.tags?.includes("container")) ctx.destroy(o.id);
    s.furnitureSeeded = true; s.cratesSeeded = false; s.nextCrate = 0;
  }
  const crates = ctx.query({ tags: ["lootfurn"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).length;
  if (crates < W.crates.count && now >= (s.nextCrate ?? 0)) {
    const fill = s.cratesSeeded ? 1 : W.crates.count - crates;
    for (let i = 0; i < fill; i++) for (let k = 0; k < 8; k++) {
      const c = cell(ctx); if (!c) continue;
      const { cx, cz } = cellAt(c.x, c.z), kind = pickKind("main", ctx.random()), spot = wallSpot0(ctx, cx, cz, kind, ctx.random(), ctx.random());
      if (!spot || ctx.query({ tags: ["container"], radius: 1.2, center: { x: spot.x, y: 0, z: spot.z } }).length) continue;
      spawnFurniture(ctx, "main", kind, spot); break;
    }
    s.cratesSeeded = true;
    s.nextCrate = now + (W.crates.respawn * 1000);
  }
  if (!s.shellsSwept) { // no loose ammo on the floors (Shelly, Nov 9: "no random shotgun shells or the likes lying on floors"): sweep what lies there, never refill
    for (const a of ctx.query({ anyTags: ["shells", "ammo"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(a.id);
    s.shellsSwept = true;
  }
  const lurkers = ctx.query({ tags: ["lurker"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((m) => !m.state?.dead).length;
  if (lurkers < L.lurkers && now >= (s.nextLurker ?? 0)) {
    const fill = s.lurkersSeeded ? 1 : L.lurkers - lurkers;
    for (let i = 0; i < fill; i++) {
      const c = cell(ctx, ["halls", "arches", "holes", "offices"]);
      if (c) ctx.spawn({ tags: ["lurker"], feetPosition: { x: c.x, y: 0.05, z: c.z }, model: LURKER_MODEL, scale: LURKER_SCALE, physics: { body: "character" }, state: { ...npcState(ctx, "lurker", L.lurkerHp, { kind: "lurker" }), mesh: 3 } });
    }
    s.lurkersSeeded = true;
    s.nextLurker = now + L.lurkerRespawn * 1000;
  }
  // a creature that falls out of the world is put back at the player spawn (the safe room) by the engine: send it back out into the maze
  for (const m of ctx.query({ anyTags: ["smiler", "lurker", "hound", "stealer"] })) {
    if (m.state?.dead || (m.state?.owner ?? m.state?.horde)) continue;
    const f = m.feetPosition, o0 = cellCenter(0, 0), cs = L.cellSize ?? 4, cx = Math.round((f.x - o0.x) / cs), cz = Math.round((f.z - o0.z) / cs);
    if (!inHub(cx, cz) && f.y > -3) continue;
    const c = cell(ctx, m.tags.includes("smiler") ? ["dark", "red", "pillars", "expanse"] : ["halls", "arches", "holes", "offices"]);
    if (!c) continue;
    const o = ctx.getObject(m.id); if (!o) continue;
    o.feetPosition = { x: c.x, y: 0.05, z: c.z }; o.velocity = { x: 0, y: 0, z: 0 };
  }
}
