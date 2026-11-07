import { npcState } from "../../scripts/lib/stats.js";
import { LURKER_MODEL, LURKER_SCALE } from "../../scripts/lurkers.js";
import { MODEL as SMILER_MODEL, SCALE as SMILER_SCALE } from "../../scripts/smilers.js";
// Level 0's referee: keeps almond water on the floor and smilers in the dark.
import L from "../../scripts/lib/data/level0.yml";
const MID = (L.hub[0] + L.hub[1]) / 2; // the safe room's centre cell
import W from "../../scripts/lib/weapons.js";
import { spawnAlmond, spawnAmmo, spawnShells, spawnWeapon, rollWeapon } from "../../scripts/lib/loot.js";
import { spawnFurniture, pickKind, wallSpot0 } from "../../scripts/lib/furniture.js";
import { N, S, H, HALF, zoneOf, inHub, hasPit, hasPillar, cellCenter, cellAt, wallX, wallZ, EXIT } from "../../scripts/lib/maze.js";
const PAPER = { texture: "/cdn/value.00a4e744acf9ab763779bbb0cc7f26fb1dd20aeafc69448c536939cd7212caeb.png", color: "oklch(0.98 0.01 90)", repeat: [1, 1] };
import B from "../../scripts/lib/data/breakables.yml";
import { syncLevel0 } from "../../scripts/lib/breakables.js";
import { layMoments } from "../../scripts/lib/level0-moments.js";
export const cadence = "1s";
// office furniture: breakable props scattered through the halls (desk, chair, shelf: [mat, hp])
const FURN = { desk: ["wood", 80], chair: ["metal", 45], shelf: ["metal", 110], copier: ["machine", 110] };
function furnish(ctx) {
  let n = 0;
  for (let k = 0; k < 900 && n < (L.furniture ?? 140); k++) {
    const cx = 1 + Math.floor(ctx.random() * (N - 2)), cz = 1 + Math.floor(ctx.random() * (N - 2));
    if (inHub(cx, cz) || hasPit(cx, cz) || hasPillar(cx, cz) || !["halls", "expanse", "dark", "red"].includes(zoneOf(cx, cz))) continue;
    const c = cellCenter(cx, cz), r = ctx.random(), kind = r < 0.38 ? "desk" : r < 0.64 ? "chair" : r < 0.84 ? "shelf" : "copier", [mat, hp] = FURN[kind];
    const along = ctx.random() < 0.5, side = ctx.random() < 0.5 ? -1 : 1, off = kind === "shelf" || kind === "copier" ? S / 2 - 0.35 : (ctx.random() - 0.5) * 1.6;
    const pos = along ? { x: c.x + side * off, y: 0, z: c.z + (ctx.random() - 0.5) } : { x: c.x + (ctx.random() - 0.5), y: 0, z: c.z + side * off };
    const yaw = kind === "chair" ? ctx.random() * 360 : (along ? 90 : 0) + (side < 0 ? 180 : 0);
    ctx.spawn({ tags: ["breakable", "furniture", kind], feetPosition: pos, rotation: yaw, physics: { body: "static", collider: "box" }, primitive: { kind: "scripted", script: "scripts/build-geo.js", params: { kind } }, state: { mat, hp, maxHp: hp, name: kind[0].toUpperCase() + kind.slice(1) } });
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
    ctx.spawn({ tags: ["shifted"], lifetime: L.shiftLife, feetPosition: pos, primitive: { kind: "box", width: e === "x" ? 0.2 : S, height: H, depth: e === "x" ? S : 0.2 }, material: PAPER, physics: "static" });
  }
}

export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now();
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
  if (s.momentsV !== 1) { s.momentsV = 1; s.moments = layMoments(ctx); }
  shift(ctx, s, now);
  if (!s.furnished) { s.furnished = true; furnish(ctx); }
  regrow(ctx, s, now);
  syncLevel0(ctx);
  const weapons = ctx.query({ tags: ["weapon"] }).length;
  if (false && weapons < W.pickups && now >= (s.nextWeapon ?? 0)) {
    const fill = s.weaponsSeeded ? 1 : W.pickups - weapons;
    for (let i = 0; i < fill; i++) {
      const c = cell(ctx);
      if (c) spawnWeapon(ctx, c, rollWeapon(ctx));
    }
    s.weaponsSeeded = true;
    s.nextWeapon = now + (W.pickupRespawn * 1000) / 4;
  }
  const ammo = ctx.query({ tags: ["ammo"] }).length;
  if (ammo < W.ammo.floor && now >= (s.nextAmmo ?? 0)) {
    const fill = s.ammoSeeded ? 1 : W.ammo.floor - ammo;
    for (let i = 0; i < fill; i++) { const c = cell(ctx); if (c) spawnAmmo(ctx, c); }
    s.ammoSeeded = true;
    s.nextAmmo = now + (W.ammo.respawn * 1000) / 4;
  }
  const smilers = ctx.query({ tags: ["smiler"] }).filter((m) => !m.state?.dead).length;
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
  const shells = ctx.query({ tags: ["shells"] }).length;
  if (shells < W.shells.floor && now >= (s.nextShells ?? 0)) {
    const fill = s.shellsSeeded ? 1 : W.shells.floor - shells;
    for (let i = 0; i < fill; i++) { const c = cell(ctx); if (c) spawnShells(ctx, c); }
    s.shellsSeeded = true;
    s.nextShells = now + (W.shells.respawn * 1000) / 4;
  }
  const lurkers = ctx.query({ tags: ["lurker"] }).filter((m) => !m.state?.dead).length;
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
