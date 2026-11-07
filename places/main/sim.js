// Level 0's referee: keeps almond water on the floor and smilers in the dark.
import L from "../../scripts/lib/data/level0.yml";
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
      if (c) ctx.spawn({ tags: ["almond"], feetPosition: { x: c.x + (ctx.random() - 0.5) * 2, y: 0.01, z: c.z + (ctx.random() - 0.5) * 2 }, rotation: ctx.random() * 360, scale: 1.7, primitive: { kind: "scripted", script: "scripts/almond-geo.js" }, material: { emissiveIntensity: 1.6 } });
    }
    s.almondsSeeded = true;
    s.nextAlmond = now + (L.almondRespawn * 1000) / 4;
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
}
