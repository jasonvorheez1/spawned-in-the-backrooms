// Level 0's referee: keeps almond water on the floor and smilers in the dark.
import L from "../../scripts/lib/data/level0.yml";
import W from "../../scripts/lib/data/weapons.yml";
import { spawnAlmond, spawnAmmo, spawnShells, spawnWeapon, spawnCrate, rollWeapon } from "../../scripts/lib/loot.js";
import { N, S, H, HALF, zoneOf, inHub, hasPit, hasPillar, cellCenter, cellAt, wallX, wallZ } from "../../scripts/lib/maze.js";
const PAPER = { texture: "cdn/texture-yellow-chevron-damask-wallpaper-aged.png", color: "oklch(0.98 0.01 90)", repeat: [1, 1] };
export const cadence = "1s";

function cell(ctx, zones) {
  for (let k = 0; k < 60; k++) {
    const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N);
    if (inHub(cx, cz) || hasPit(cx, cz)) continue;
    if (Math.abs(cx - 17.5) < 6 && Math.abs(cz - 17.5) < 6) continue; // not right outside the safe room
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
  if (!s.stairsSeeded) {
    s.stairsSeeded = true;
    let n = 0;
    for (let k = 0; k < 400 && n < L.stairsCount; k++) {
      const cx = 1 + Math.floor(ctx.random() * (N - 2)), cz = 1 + Math.floor(ctx.random() * (N - 2));
      if (zoneOf(cx, cz) !== "halls" || inHub(cx, cz) || hasPillar(cx, cz) || hasPit(cx, cz)) continue;
      if (Math.abs(cx - 17.5) < 5 && Math.abs(cz - 17.5) < 5) continue;
      const c = cellCenter(cx, cz);
      ctx.spawn({ tags: ["stairs"], feetPosition: { x: c.x + (ctx.random() < 0.5 ? -1 : 1), y: 0, z: c.z }, primitive: { kind: "scripted", script: "scripts/stairs-geo.js" }, physics: { body: "static", collider: "mesh" } });
      n++;
    }
  }
  shift(ctx, s, now);
  const almonds = ctx.query({ tags: ["almond"] }).length;
  if (almonds < L.almonds && now >= (s.nextAlmond ?? 0)) {
    const fill = s.almondsSeeded ? 1 : L.almonds - almonds;
    for (let i = 0; i < fill; i++) {
      const c = cell(ctx);
      if (c) spawnAlmond(ctx, c);
    }
    s.almondsSeeded = true;
    s.nextAlmond = now + (L.almondRespawn * 1000) / 4;
  }
  const weapons = ctx.query({ tags: ["weapon"] }).length;
  if (weapons < W.pickups && now >= (s.nextWeapon ?? 0)) {
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
      const c = cell(ctx, ["dark", "red", "pillars"]);
      if (c) ctx.spawn({ tags: ["smiler"], feetPosition: { x: c.x, y: 0.05, z: c.z }, primitive: { kind: "scripted", script: "scripts/smiler-geo.js" }, physics: { body: "character" }, material: { emissiveIntensity: 3.5 }, state: { hp: L.smilerHp } });
    }
    s.smilersSeeded = true;
    s.nextSmiler = now + L.smilerRespawn * 1000;
  }
  const crates = ctx.query({ tags: ["crate"] }).length;
  if (crates < W.crates.count && now >= (s.nextCrate ?? 0)) {
    const fill = s.cratesSeeded ? 1 : W.crates.count - crates;
    for (let i = 0; i < fill; i++) { const c = cell(ctx); if (c) spawnCrate(ctx, c); }
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
      const c = cell(ctx, ["halls", "arches", "holes"]);
      if (c) ctx.spawn({ tags: ["lurker"], feetPosition: { x: c.x, y: 0.05, z: c.z }, primitive: { kind: "scripted", script: "scripts/lurker-geo.js" }, physics: { body: "character" }, state: { hp: L.lurkerHp, kind: "lurker" } });
    }
    s.lurkersSeeded = true;
    s.nextLurker = now + L.lurkerRespawn * 1000;
  }
}
