// Level 169 piece, filled by its build lane. Contract: places/level169/sim.js calls these.
// Ferry's house: the shell and the hand-built rooms from scripts/l169-house-geo.js (params.part), laid at the house's centre, plus doors that swing and the lamps.
// Every number comes from scripts/lib/data/level169.yml (house, houseBuild). Ids: l169-house-*.
const GEO = "scripts/l169-house-geo.js";
const SHELL_GLB = "/cdn/value.150c87b478df0c8f2ab37379e19a56d85bda160aaaadbb1080ce0a3d3b1a23a7.glb";
export function layHouse(ctx, put, L) {
  const h = L.house, b = L.houseBuild, C = h.center, r = h.rooms;
  const ground = ctx.place.terrain?.heightAt?.(C.x, C.z) ?? 0, F = ground + h.floorUp;
  const part = (id, p, x, z, y, extra = {}) => put(`l169-house-${id}`, { feetPosition: { x, y, z }, primitive: { kind: "scripted", script: GEO, params: p }, physics: "static", ...extra });
  for (const p of ["shell", "yard", "kitchen", "basement"]) part(p, { part: p }, C.x, C.z, ground);
  // the shell you see is the Blender build (art/ferry-house/build.py); the scripted shell stays as its collider, unseen
  const getO = ctx.getObject?.("l169-house-shell"); if (getO) getO.visible = false;
  const tx = (t, rep, extra = {}) => ({ texture: t, repeat: rep, wrap: "repeat", ...extra });
  put("l169-house-look", { feetPosition: { x: C.x, y: ground, z: C.z }, castShadow: true, receiveShadow: true, visibleRange: { max: 900 },
    model: { id: SHELL_GLB, materials: {
      stucco: tx("cdn/texture-pale-adobe-stucco.png", [0.5, 0.5], { color: "oklch(0.95 0.03 70)" }), plaster: tx("cdn/texture-limewash-plaster.png", [0.5, 0.5]),
      floor: tx("cdn/texture-swept-wood-plank-floor.png", [0.5, 0.5]), concrete: tx("cdn/texture-smooth-poured-concrete.png", [0.5, 0.5]),
      timber: tx("cdn/texture-weathered-timber-planks.png", [0.7, 0.7]), trim: tx("cdn/texture-weathered-timber-planks.png", [1, 1], { color: "oklch(0.93 0.04 75)" }),
      shutter: tx("cdn/texture-chipped-sage-green-painted-wood.png", [1, 1]), roof: tx("cdn/texture-galvanized-corrugated-steel-sheet-weathered.png", [0.5, 0.5], { metalness: 0.6, roughness: 0.5 }),
      rust: tx("cdn/texture-rusty-corrugated-tin-roof-sheet.png", [1, 1]), brick: tx("cdn/texture-sun-faded-red-brick-wall.png", [1, 1]),
      glass: { color: "oklch(0.85 0.04 220 / 0.3)", roughness: 0.08, opacity: 0.3, transparent: true } } } });
  // doors: front on the south face, living and kitchen off the hall's south wall, the bedrooms and den off its north wall
  const wallZ = { front: r.porch[2], living: r.hall[3], kitchen: r.hall[3], bed1: r.hall[2], bed2: r.hall[2], bed3: r.hall[2], den: r.hall[2] };
  for (const [k, [x0, x1]] of Object.entries(b.doors)) {
    const swing = k === "front" || k === "living" || k === "kitchen" ? -1 : 1; // into the room it guards
    part(`door-${k}`, { part: "door", w: x1 - x0, col: k === "front" ? "oklch(0.75 0.08 200)" : undefined }, x0, wallZ[k], F,
      { tags: ["usable"], rotation: 0, behavior: "scripts/l169-door.js", state: { yaw0: 0, swing, open: false, name: k === "front" ? "Front door" : "Door", verb: "Open" } });
  }
  // beds: three bedrooms and two cots in the den, kits at their feet
  const mid = (k) => [(r[k][0] + r[k][1]) / 2, (r[k][2] + r[k][3]) / 2];
  let n = 0;
  for (const k of ["bed1", "bed2", "bed3"]) {
    const [x, z] = mid(k);
    part(`bed-${k}`, { part: "bed" }, x - 1.2, z - 0.6, F, { tags: ["usable"], state: { name: "Bed", verb: "Look", info: "made up, a blanket folded at the foot" } });
    part(`kit-${k}`, { part: "kit", n: n++ % 3 }, x + 0.8, z - 2.4, F);
  }
  { const [x, z] = mid("den"); part("cot-1", { part: "bed", cot: true }, x - 1.3, z - 0.6, F); part("cot-2", { part: "bed", cot: true }, x + 1.3, z - 0.6, F); }
  // living: rug, bench, the map table and the board of routes
  { const [x, z] = mid("living"); part("rug", { part: "rug", w: 3, d: 2.2 }, x, z + 0.5, F + 0.005); part("bench", { part: "bench" }, x, z + 2.2, F, { rotation: 180 });
    part("maptable", { part: "maptable" }, x - 2.4, z - 1.2, F); part("mapboard", { part: "mapboard" }, x - 2.4, r.hall[3] + 0.12, F + 1, { rotation: 180, physics: undefined }); }
  // lamps: one per room, hung under the ceiling
  for (const k of ["living", "kitchen", "hall", "bed1", "bed2", "bed3", "den", "porch"]) {
    const [x, z] = mid(k), y = F + h.wallH - 0.62;
    part(`lamp-${k}`, { part: "lamp", drop: 0.5 }, x, z, y, { physics: undefined, children: [{ feetPosition: { x: 0, y: -0.05, z: 0 }, light: { kind: "point", color: b.lamp.color, intensity: b.lamp.intensity * 0.12, distance: b.lamp.distance, shadow: { enabled: k === "living" || k === "kitchen" } } }] });
  }
}
