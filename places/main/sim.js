// Level 0's referee: keeps almond water on the floor and smilers in the dark.
import L from "../../scripts/lib/data/level0.yml";
import W from "../../scripts/lib/data/weapons.yml";
import { spawnAlmond, spawnAmmo, spawnWeapon, rollWeapon } from "../../scripts/lib/loot.js";
import { N, zoneOf, inHub, hasPit, cellCenter } from "../../scripts/lib/maze.js";
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

export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now();
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
