// Level 70 "paths" layer: the trodden walks that join the pieces. Street to every door (house, igloo, garage, hotel, market), then
// trails out to the Gelu camp, Froston and the Burns River dock. Each walk: a terrain-hugging road spline in packed, boot-printed
// snow, banked with snow heaps (no collider, so nothing blocks a walker), a warm trail lantern where it leaves the street lamps.
// Also the invisible ramps the shells need (house porch and storm-cellar steps, Froston's container lip) and the seam sweep:
// a street snowbank standing in a walk's mouth is cleared. Walks and ramps are data rows below.
import { HOUSE_DOOR, IGLOO_DOOR } from "./level70-town.js";
import { GARAGE_DOOR, HOTEL_DOOR } from "./level70-civic.js";
import { CAMP_FIRE, RIG, DOCK_POST, TREES } from "./level70-wild.js";
export const V = 5;
const TEX = "cdn/texture-trampled-packed-snow-path-with-boot-prints-and-slush.png";
const HEAPS = ["/cdn/value.652183159aeb2aed35418c3c00070f3548523a47bf0459a44ca542e79acb5457.glb", "/cdn/value.652183159aeb2aed35418c3c00070f3548523a47bf0459a44ca542e79acb5457.glb"];
export const WALKS = [
  { id: "house", w: 2.4, pts: [[-4.6, -18.2], [-9, -17.4], [-18, -16.6], [-28, -16.2], [-32.2, -16.2]] },
  { id: "igloo", w: 1.8, pts: [[-24, -16.2], [-23, -6], [-34, -3.5], [-44, -4.2], [IGLOO_DOOR.x, IGLOO_DOOR.z]] },
  { id: "garage", w: 3.2, pts: [[4.6, -22], [12, -22], [GARAGE_DOOR.x + 1.5, GARAGE_DOOR.z]] },
  { id: "hotel", w: 2.8, pts: [[4.6, -82.4], [12, -81], [16, -80], [HOTEL_DOOR.x - 0.6, HOTEL_DOOR.z]] },
  { id: "market", w: 2.6, pts: [[-4.6, -74], [-12, -72.4], [-22, -72]] },
  { id: "camp", w: 1.6, pts: [[-22, -72], [-36, -73.5], [-50, -75], [-62, -77.5], [-74, -79.5], [-84, -81], [CAMP_FIRE.x + 4.5, CAMP_FIRE.z]] },
  { id: "froston", w: 2.2, pts: [[4.6, 18], [14, 18.6], [26, 18.4], [36, 19.6], [44, 21]] },
  { id: "dock", w: 2, pts: [[0, -119], [-1.5, -123], [1, -126.6], [DOCK_POST.x - 1.6, DOCK_POST.z + 1.4]] },
];
// invisible ramps: [id, x0, y0, z0, x1, y1, z1, width]
const RAMPS = [
  ["porch", -33.4, 0, -16.2, -36.0, 0.56, -16.2, 1.5],
  ["cellar", -43.2, 0.56, -19.6, -43.2, 0.02, -22.0, 1.1],
];
const MOUTHS = WALKS.filter((w) => Math.abs(w.pts[0][0]) > 3 && Math.abs(w.pts[0][0]) < 6).map((w) => ({ x: w.pts[0][0], z: w.pts[0][1] }));
const nearTree = (x, z, r) => TREES.some((t) => Math.hypot(t.x - x, t.z - z) < r);
function clearMouths(ctx) {
  for (const m of MOUTHS) for (const o of ctx.query({ center: { x: m.x, y: 0, z: m.z }, radius: 4.2 })) if (/^l70-bank-\d+$/.test(o.id)) ctx.destroy(o.id);
}
// The town's poles collide as their whole box (crossarm and wires), a wall across the sidewalk: each keeps a trunk-sized collider instead.
function poles(ctx) {
  for (let i = 0; i < 4; i++) {
    const p = ctx.place.objects["l70-pole-" + i]; if (!p) continue;
    if (p.physics?.body !== "none" && p.physics !== "none") p.physics = "none";
    const id = "l70-path-polecol-" + i;
    if (!ctx.place.objects[id]) ctx.spawn(id, { feetPosition: { ...p.feetPosition }, visible: false, primitive: { kind: "cylinder", radius: 0.2, height: 9 }, physics: { body: "static", collider: "cylinder" } });
  }
}
export function lay(ctx) {
  for (let i = 0; i < 4; i++) if (ctx.place.objects["l70-path-polecol-" + i]) ctx.destroy("l70-path-polecol-" + i);
  poles(ctx);
  const sp = (id, spec) => { if (ctx.place.objects[id]) ctx.destroy(id); return ctx.spawn(id, spec); };
  clearMouths(ctx);
  let rnd = 7;
  const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  for (const w of WALKS) {
    sp("l70-path-" + w.id, { feetPosition: { x: 0, y: 0, z: 0 }, receiveShadow: true, castShadow: false,
      spline: { kind: "road", points: w.pts.map(([x, z]) => [x, 0, z]), width: w.w, snapToTerrain: true, yOffset: 0.015 },
      material: { texture: TEX, wrap: "repeat", repeat: [0.45, 0.45], color: "oklch(0.95 0.01 245)", roughness: 0.93, metalness: 0, pbr: true } });
    // snow heaps both sides every ~6 m, skipping the ends and anything already standing there
    let n = 0;
    for (let i = 1; i < w.pts.length; i++) {
      const [ax, az] = w.pts[i - 1], [bx, bz] = w.pts[i], L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L;
      for (let s = 3; s < L - 2; s += 5.5 + r() * 2) {
        for (const side of [-1, 1]) {
          if (r() < 0.25) continue;
          const d = w.w / 2 + 0.9 + r() * 0.6, x = ax + tx * s - tz * d * side, z = az + tz * s + tx * d * side;
          if (nearTree(x, z, 1.8) || ctx.query({ center: { x, y: 0, z }, radius: 1.7 }).some((o) => !/^l70-path-/.test(o.id))) continue;
          const hx = 0.9 + r() * 0.7, hy = 0.35 + r() * 0.35;
          sp(`l70-path-${w.id}-heap${n++}`, { feetPosition: { x, z, y: { terrain: -0.06 } }, rotation: { yaw: Math.atan2(tx, tz) * 57.3 + 90 + (r() - 0.5) * 30 },
            model: HEAPS[n % 2], layout: { box: { min: { x: -hx, y: 0, z: -hx * 0.6 }, max: { x: hx, y: hy, z: hx * 0.6 } } }, castShadow: false });
        }
      }
    }
    if (n < 64) for (let k = n; k < n + 12; k++) if (ctx.place.objects[`l70-path-${w.id}-heap${k}`]) ctx.destroy(`l70-path-${w.id}-heap${k}`);
  }
  // trail lanterns where the walks leave the lamps behind: a warm glow, no body
  for (const [id, x, z] of [["camp-a", -50, -76.4], ["camp-b", -74, -81], ["froston", 30, 20.4], ["dock", -1.6, -121.4]])
    sp("l70-path-glow-" + id, { feetPosition: { x, y: 2.2, z }, light: { kind: "point", color: "#ffb36b", intensity: 1.6, distance: 11 } });
  for (const [id, x0, y0, z0, x1, y1, z1, wd] of RAMPS) {
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), a = Math.atan2(y1 - y0, L), yaw = Math.atan2(-dx, -dz);
    sp("l70-path-ramp-" + id, { feetPosition: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 - 0.05, z: (z0 + z1) / 2 }, pivot: "center", rotation: { yaw: yaw * 57.2958, pitch: a * 57.2958 },
      primitive: { kind: "box", width: wd, height: 0.1, depth: Math.hypot(L, y1 - y0) + 0.3 }, visible: false, physics: { body: "static", collider: "box" } });
  }
}
let at = 0;
// Leash: a Froidetownite, Guard or cultist stranded 30 m past every stop of its round (chased something over the river, fled into the snow)
// for 20 s is set back at its home. Foes keep their own manager.
const away = {};
function leash(ctx) {
  for (const [id, o] of Object.entries(ctx.place.objects)) {
    if (!/^l70-(npc|guard|gelu)-[^/]*$/.test(id)) continue;
    const s = o.state, f = o.feetPosition; if (!s?.home || !f) continue;
    const pts = s.rounds?.length ? s.rounds : [s.home];
    const d = Math.min(...pts.map((p) => Math.hypot(p.x - f.x, p.z - f.z)));
    if (d < 30 && f.y > -1) { delete away[id]; continue; }
    away[id] ??= ctx.now();
    if (ctx.now() - away[id] > 20000 || f.y < -1) { o.feetPosition = { x: s.home.x, y: 0.1, z: s.home.z }; o.velocity = { x: 0, y: 0, z: 0 }; s.ri = 0; delete away[id]; }
  }
}
export function tick(ctx) {
  poles(ctx); leash(ctx);
  if (ctx.now() - at < 10000) return; at = ctx.now();
  clearMouths(ctx);
}
