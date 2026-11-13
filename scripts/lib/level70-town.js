// Level 70 "town" layer: the arrival hut and white door, Kelpie Street, Burns Crescent (house, storm cellar, neighbours) and the igloo.
// lay(ctx) builds it once per V (ctx.place.state.v70town), tick(ctx) runs each second. Every visible thing is a Tripo or Blender mesh
// (art/l70-town/*.py build the house and igloo; art/l70-town/models.py fills M from the Tripo logs). Map: ./level70.js.
import { HUT, SPOT } from "./level70.js";
export const V = 3;
const M = /*M*/{"house": "/cdn/value.1bdea65fb6af6ad08a32a36c5ec23a3c92b1c4d62a8e79105ba254af48e2f198.glb", "housecol": "/cdn/value.0edcb5f24560a45372d0b4c4c776acb8d9b4db9e4754df04f2d1b331c6228efd.glb", "igloo": "/cdn/value.600dc4c53bd57d818bd513ffa49258c425f38da0de26e07d7795c0be9b1a6f91.glb", "lamp": "/cdn/value.df187005a34dd410bd5de07e4253a96b988c4a12840d62b14ec6248dd28cfc52.glb", "pole": "/cdn/value.76853fda663d318c17f12d0d8b66410e8ba2b131260ef1a373fe11a2a1629d1e.glb", "sedan": "/cdn/value.8bab8a27c8807090412480c7a890104a34ddd3178edf5f288a57d6941440a8d0.glb", "pickup": "/cdn/value.077bedb487349a0148196019451d1bd4543792c89251898bc5e1cc6e8777b37d.glb", "snowbank": "/cdn/value.75d1df4b5d1422d80730a71a826476df08278524ae162e5b4a374b80d21e5e68.glb", "bldga": "/cdn/value.7e99de62f1d6a8e9730d41fbd07ad2686651db9127868f64e4c18fbbd1ef63ec.glb", "bldgb": "/cdn/value.198edb96a33553fe6d550ac9b35acc12754e4414467a7542fd372462df11898a.glb", "nhouse": "/cdn/value.82b465081f6775e6c5d0483430060c237943db4f47082b5d4e532099671dad29.glb", "shelter": "/cdn/value.e2e5e8dfabdb35770aee07467ae5acc35db33c82e79e3b110218ad9ad4318b03.glb", "swing": "/cdn/value.1d56eef705a4541fa9f97a6174118d8491550fe41610969a2420b08378acb671.glb"}/*M*/;
const HUTG = "/cdn/value.0b1ccbbffd913e4a0cf600a19d17f5eb95171b6cb43c624ad0f61ee3fccf3f01.glb", DOORG = "/cdn/value.9fdae43fcaf5713af173eb262dfa4b526ccc98a79e34d99b72f458948db6e11d.glb";
const HS = SPOT.house, IG = SPOT.igloo;
export const HUT_DOOR = { x: HUT.x, y: 0, z: 45 };
export const HOUSE_DOOR = { x: HS.x + 7.4, y: 0, z: HS.z };          // foot of the porch steps; the door is 2.5 m west, up three steps
export const HOUSE_LIVING = { x: HS.x - 1.5, y: 0.54, z: HS.z + 1.5 };
export const HOUSE_CELLAR = { x: HS.x - 2.5, y: 0.02, z: HS.z - 5.6 }; // storm cellar floor: through the kitchen's north door, three steps down
export const CELLAR_BENCH = { x: HS.x - 2.5, y: 0.92, z: HS.z - 6.95 }; // clear spot on the workbench top
export const IGLOO_DOOR = { x: IG.x + 3.6, y: 0, z: IG.z };
const SODIUM = "oklch(0.8 0.13 70)";
const TUNE = { lampYaw: 0, bankYaw: 0, bldgW: -90, bldgE: 90, carYaw: 0 }; // each Tripo mesh's own facing, read off the look
const FIRE = `fx
pop flame rate=flick(.45,.2)*40 on=disc(.16) life=.4..0.8 v=up(1.2)+cone(22)*(.3..0.7) size=.16..0.3 acc=curl(.5)*1.2+buoy(2)+drag(1.5)
  sz=$size*(.5>.25:1>.7:.7>.14) col=hdr(4.6,3.4,1.4)>.3:hdr(3.2,1.4,.3)>.65:hdr(1.8,.5,.1)>hdr(.6,.12,.03) a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop embers rate=3 on=disc(.16) life=.7..1.4 v=up(2)+cone(30)*(.4..1) size=.02..0.04 acc=curl(.8)+grav()*.45+drag(.5) col=hdr(5,2.8,.8)>hdr(1,.22,.04) a=(0>.08:1>.65:.9>0) sz=$size r=sprite(ember,add,velocity,.02)
pop smoke on=@flame?.2 inh=p;v:$v*.4 life=1.8..3 size=.14..0.24 acc=buoy(.9)+curl(.35)*.5+drag(.8) sz=$size*(.7>3.2) col=<.3,.28,.26>><.15,.15,.16> a=0>.25:.3>.7:.2>0 r=sprite(smoke-puff,alpha)`;
const HOUSE_MATS = {
  siding: { texture: "cdn/texture-weathered-sage-grey-vinyl-lap-siding.png", roughness: 0.7 }, shingle: { texture: "cdn/texture-dark-asphalt-roof-shingles-frosted.png", roughness: 0.95 },
  concrete: { texture: "cdn/texture-poured-concrete-foundation-wall-water-stained.png", roughness: 0.92 }, brick: { texture: "cdn/texture-weathered-red-canadian-brick-with-frost.png", roughness: 0.9 },
  wall: { texture: "cdn/texture-yellowed-cream-painted-drywall-scuffed.png", roughness: 0.85 }, ceiling: { texture: "cdn/texture-white-popcorn-stucco-ceiling.png", roughness: 0.95 },
  floor: { texture: "cdn/texture-worn-honey-oak-hardwood-floor-planks.png", roughness: 0.55 }, lino: { texture: "cdn/texture-2000s-beige-checker-kitchen-linoleum-scuffed.png", roughness: 0.45 },
  door: { texture: "cdn/texture-chipped-burgundy-painted-wood-door.png", roughness: 0.5 }, steel: { color: "oklch(0.55 0.01 250)", metalness: 0.9, roughness: 0.45 },
  glass: { color: "oklch(0.2 0.02 250)", roughness: 0.08 }, snow: { color: "oklch(0.95 0.012 245)", roughness: 0.9 }, ice: { color: "oklch(0.88 0.03 225)", roughness: 0.12 },
  trim: { color: "oklch(0.92 0.008 95)", roughness: 0.5 }, soot: { color: "oklch(0.14 0.005 60)", roughness: 1 }, bulb: { color: "oklch(0.95 0.06 85)", emissive: "oklch(0.9 0.1 80)", emissiveIntensity: 2 },
};
export function lay(ctx) {
  const ids = [];
  const sp = (id, spec) => { try { if (ctx.place.objects[id]) ctx.destroy(id); ids.push(id); return ctx.spawn(id, spec); } catch (e) { ctx.log("l70-town", id, String(e)); } };
  const asset = (name) => { const r = Object.entries(ctx.world.assets ?? {}).find(([k, a]) => a?.name === name && k.endsWith(".glb")); return r ? r[0] : null; };
  const H = (y, x, z) => ({ box: { min: { x: x ? -x / 2 : undefined, y: 0, z: z ? -z / 2 : undefined }, max: { x: x ? x / 2 : undefined, y, z: z ? z / 2 : undefined } } });
  const solid = { body: "static", collider: "mesh" };
  const mesh = (id, g, x, z, h, o = {}) => g && sp(id, { tags: ["l70", "l70-town", ...(o.tags ?? [])], feetPosition: { x, y: o.y ?? 0, z }, rotation: { yaw: o.yaw ?? 0, roll: o.roll ?? 0, pitch: o.pitch ?? 0 }, scale: o.scale ?? 1,
    model: o.fwd ? { id: g, forward: o.fwd } : { id: g, ...(o.materials ? { materials: o.materials } : {}) }, layout: o.layout ?? H(h), physics: o.solid === false ? undefined : o.physics ?? solid, castShadow: o.shadow ?? true, visible: o.visible ?? true });
  const lamp = (id, x, y, z, color, intensity, distance) => sp(id, { tags: ["l70", "l70-town", "l70-light"], feetPosition: { x, y, z }, light: { kind: "point", color, intensity, distance, shadow: { enabled: false } } });
  const heap = asset("l70-snowheap"), lantern = asset("lantern"), rnd = (i) => { const s = Math.sin(i * 127.1 + 31.7) * 43758.5453; return s - Math.floor(s); };
  const snow = (id, x, z, h, yaw) => mesh(id, heap, x, z, h, { yaw, solid: false, y: -0.05 });

  // 1. arrival: the brick stairwell hut, the white 70 door in its north face, a sodium lamp over it, drift at the sills
  mesh("l70-bp-hut", HUTG, HUT.x, HUT.z, 3.2, { fwd: "+x" });
  mesh("l70-hut-door", DOORG, 0, 45.02, 2.05, { fwd: "+x", solid: false });
  mesh("l70-hut-lamp", lantern, 0, 44.82, 0.34, { y: 2.3, solid: false });
  lamp("l70-hut-lamp-light", 0, 2.5, 44.3, SODIUM, 2.2, 10);
  [[-2.2, 45.4, 0.9, 20], [2.3, 45.6, 1.1, 140], [-2.4, 48.2, 1.3, 250], [2.5, 48.6, 1.0, 80], [-1.1, 44.5, 0.35, 0], [1.2, 44.4, 0.4, 200]].forEach(([x, z, h, yaw], i) => snow("l70-hut-snow-" + i, x, z, h, yaw));

  // 2. Kelpie Street: sodium lamps, leaning poles and sagging lines, buried cars, banks, the downtown rows
  [30, 8, -14, -36, -58, -80, -102].forEach((z, i) => { const s = i % 2 ? -1 : 1;
    mesh("l70-lamp-" + i, M.lamp, s * 5.5, z, 6.4, { yaw: TUNE.lampYaw + (s > 0 ? 0 : 180), roll: (rnd(i) - 0.5) * 2, physics: { body: "static", collider: "box" } });
    lamp("l70-lamp-" + i + "-light", s * 4.0, 5.6, z, SODIUM, 2.5, 22); snow("l70-lamp-" + i + "-snow", s * 5.8, z + 0.5, 0.5, i * 70); });
  const poles = [25, -20, -65, -110].map((z, i) => ({ x: -7.6 + rnd(i + 9) * 0.6, z, roll: (rnd(i + 3) - 0.35) * 9 }));
  poles.forEach((p, i) => { mesh("l70-pole-" + i, M.pole, p.x, p.z, 9, { roll: p.roll, yaw: rnd(i) * 20 - 10, physics: { body: "static", collider: "box" } }); snow("l70-pole-" + i + "-snow", p.x - 0.3, p.z + 0.4, 0.6, i * 95); });
  for (let i = 0; i + 1 < poles.length; i++) for (const off of [-0.7, 0.7]) { const a = poles[i], b = poles[i + 1], pts = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([(b.x - a.x) * t, 8.3 - 1.5 * 4 * t * (1 - t), (b.z - a.z) * t]); }
    sp("l70-line-" + i + (off < 0 ? "a" : "b"), { tags: ["l70", "l70-town"], feetPosition: { x: a.x + off, y: 0, z: a.z }, spline: { kind: "powerline", points: pts, width: 0.03 } }); }
  [["sedan", 4.4, 13, 12, 1.72], ["sedan", -4.5, -7, 172, 1.72], ["pickup", 4.6, -30, -18, 2.25], ["sedan", -4.3, -53, 33, 1.72], ["pickup", 4.5, -96, 186, 2.25]].forEach(([k, x, z, yaw, h], i) => {
    mesh("l70-car-" + i, M[k], x, z, h, { yaw: yaw + TUNE.carYaw }); snow("l70-car-" + i + "-snow", x + (x > 0 ? 1.5 : -1.5), z + 1.2, 0.7, i * 50); snow("l70-car-" + i + "-snow2", x - (x > 0 ? 0.4 : -0.4), z - 2.6, 0.5, i * 110); });
  lamp("l70-car-1-light", -4.5, 1.15, -7, "oklch(0.86 0.05 230)", 0.9, 4);
  let n = 0; for (const s of [-1, 1]) for (let z = 36; z > -118; z -= 8.5) { n++; const gap = (Math.abs(z + 20) < 5.5) || (z < -58 && z > -86); if (gap) continue;
    mesh("l70-bank-" + n, M.snowbank, s * (6.7 + rnd(n) * 0.5), z + rnd(n + 5) * 2, 0.9 + rnd(n + 2) * 0.5, { yaw: TUNE.bankYaw + (rnd(n + 7) - 0.5) * 16 + (n % 2 ? 180 : 0), y: -0.06 }); }
  n = 0; for (const s of [-1, 1]) [24, 12, 0, -11.5, -31, -43].forEach((z, i) => { n++; const k = (i + (s > 0 ? 1 : 0)) % 2 ? "bldgb" : "bldga", h = k === "bldgb" ? 14 : 11.5;
    mesh("l70-bldg-" + n, M[k], s * 12.6, z, h, { layout: H(h, 11.4, 7.2), fwd: "+z", yaw: s < 0 ? TUNE.bldgW : TUNE.bldgE, physics: { body: "static", collider: "box" } });
    if (i % 2 === (s > 0 ? 0 : 1)) lamp("l70-bldg-" + n + "-win", s * 8.4, 4.2 + (i % 3) * 2.6, z + (rnd(n) - 0.5) * 5, "oklch(0.84 0.1 75)", 1.1, 6);
    snow("l70-bldg-" + n + "-snow", s * 8.6, z + 3.5, 0.8, n * 40); });
  mesh("l70-shelter", M.shelter, -5.9, -44.5, 1.7, { yaw: 24 }); snow("l70-shelter-snow", -6.4, -43, 0.8, 30);
  const mail = asset("mailbox"); [[5.5, 19.5, -90], [-5.6, -16.2, 95], [HS.x + 9.2, HS.z + 2.6, -80]].forEach(([x, z, yaw], i) => { mesh("l70-mailbox-" + i, mail, x, z, 1.25, { yaw, roll: i ? 5 : -3 }); snow("l70-mailbox-" + i + "-snow", x + 0.3, z + 0.4, 0.35, i * 77); });
  const stop = asset("stop-sign") ?? asset("stopsign"); mesh("l70-stop", stop, 5.6, -55.5, 2.6, { roll: 6 });
  const can = asset("trashcan-2"); mesh("l70-bin-0", can, -5.8, 2.5, 0.95, { roll: 4 }); mesh("l70-bin-1", can, 5.9, -40.5, 0.95, { pitch: 88, yaw: 40, y: 0.3 });

  // 3. Burns Crescent: the house (Blender; walkable ground floor + storm cellar on its north wall), its invisible shell, furniture, neighbours
  mesh("l70-bp-house", M.house, HS.x, HS.z, 6.9, { y: -0.3, layout: null, solid: false, materials: HOUSE_MATS });
  mesh("l70-house-shell", M.housecol, HS.x, HS.z, 6.5, { y: -0.3, layout: null, visible: false, shadow: false });
  const at = (x, z) => [HS.x + x, HS.z + z], F = 0.54, put = (id, g, x, z, h, o = {}) => mesh(id, g, ...at(x, z), h, { y: o.y ?? F, ...o });
  put("l70-house-sofa", asset("sofa-4") ?? asset("sofa"), -1.2, 2.75, 0.85, { yaw: 180 }); put("l70-house-table", asset("coffee-table"), -1.3, 1.5, 0.45, {});
  put("l70-house-fridge", asset("fridge"), 1.5, -2.9, 1.75, { yaw: 180 }); put("l70-house-stove", asset("stove"), 0.4, -2.95, 0.93, { yaw: 180 }); put("l70-house-counter", asset("counter-furniture") ?? asset("counter"), -0.9, -2.95, 0.93, { yaw: 180 });
  put("l70-house-crate", asset("crate-2"), 3.9, 2.7, 0.5, { yaw: 20 });
  lamp("l70-house-light-living", HS.x - 1.4, 2.85, HS.z + 1.4, "oklch(0.86 0.06 80)", 1.6, 8); lamp("l70-house-light-kitchen", HS.x - 1.4, 2.85, HS.z - 1.9, "oklch(0.9 0.03 220)", 1.3, 7); lamp("l70-house-light-hall", HS.x + 3.4, 2.85, HS.z, "oklch(0.86 0.06 80)", 1.2, 7);
  lamp("l70-house-light-porch", HS.x + 6.0, 2.6, HS.z, SODIUM, 1.4, 8);
  put("l70-cellar-bench", asset("workbench"), -2.5, -6.9, 0.95, { y: 0.02, layout: H(1.0, 1.9, 0.75) }); put("l70-cellar-shelf", asset("shelf-2") ?? asset("shelf"), -0.62, -5.4, 1.9, { y: 0.02, yaw: 90 });
  put("l70-cellar-furnace", asset("boiler"), -4.15, -6.6, 1.7, { y: 0.02 }); put("l70-cellar-crate", asset("wcrate") ?? asset("crate-2"), -4.2, -4.6, 0.55, { y: 0.02, yaw: 15 });
  sp("l70-cellar-bulb", { tags: ["l70", "l70-town", "l70-light"], feetPosition: { x: HS.x - 2.5, y: 1.78, z: HS.z - 5.4 }, light: { kind: "point", color: "oklch(0.85 0.1 75)", intensity: 1.8, distance: 7, shadow: { enabled: false } } });
  mesh("l70-nhouse-0", M.nhouse, HS.x + 3, HS.z + 20, 7.6, { layout: H(7.6, 11, 9.5), fwd: "+z", yaw: TUNE.bldgW, physics: { body: "static", collider: "box" } });
  mesh("l70-nhouse-1", M.nhouse, HS.x + 4, HS.z - 17.5, 7.2, { layout: H(7.2, 10.5, 9), fwd: "+z", yaw: TUNE.bldgW + 8, physics: { body: "static", collider: "box" } });
  mesh("l70-drive-car", M.sedan, HS.x + 10.5, HS.z + 6.5, 1.72, { yaw: 78 + TUNE.carYaw }); snow("l70-drive-car-snow", HS.x + 9, HS.z + 8, 0.8, 10); snow("l70-drive-car-snow2", HS.x + 12.3, HS.z + 5.6, 0.6, 130);
  mesh("l70-swing", M.swing, HS.x - 9.5, HS.z + 8.5, 2.2, { yaw: 35 }); snow("l70-swing-snow", HS.x - 10.3, HS.z + 9.3, 0.7, 60);
  [[8.2, -3.3, 0.6], [8.4, 3.4, 0.7], [-8.5, 0, 0.9], [2, 6.5, 0.6]].forEach(([x, z, h], i) => snow("l70-house-snow-" + i, HS.x + x, HS.z + z, h, i * 85));

  // 4. the igloo (Blender): entry passage on +x, lantern and furs inside, a small fire outside
  mesh("l70-bp-igloo", M.igloo, IG.x, IG.z, 2.9, { y: -0.06, layout: null, materials: { snow: { color: "oklch(0.95 0.014 240)", roughness: 0.88 }, pack: { color: "oklch(0.86 0.02 240)", roughness: 0.95 }, fur: { texture: "cdn/texture-thick-brown-bear-fur-pelt.png", color: "oklch(0.92 0.03 70)", roughness: 1 } } });
  mesh("l70-igloo-lantern", lantern, IG.x - 0.2, IG.z + 1.2, 0.4, { y: 0.05, solid: false }); lamp("l70-igloo-light", IG.x - 0.2, 0.7, IG.z + 0.9, "oklch(0.82 0.13 65)", 1.8, 6);
  mesh("l70-igloo-fire", asset("firepit"), IG.x + 5.4, IG.z + 2.2, 0.4, {});
  sp("l70-igloo-fire-fx", { tags: ["l70", "l70-town"], feetPosition: { x: IG.x + 5.4, y: 0.25, z: IG.z + 2.2 }, fx: { script: FIRE }, light: { kind: "point", color: "oklch(0.78 0.16 55)", intensity: 2.2, distance: 9, shadow: { enabled: false } }, audio: { clip: "cdn/moodboard-realistic-gritty/sfx-small-campfire-crackle-loop.mp3", gain: 0.25, loop: true, spatial: true, maxDistance: 14 } });

  // the Modeling Studio shelf: every mesh this lane made, registered once
  const s = ctx.world.state.m3d ?? (ctx.world.state.m3d = { items: [], pending: [], showing: {} }), have = new Set((s.items ?? []).map((i) => i.id)), add = [];
  for (const [k, g] of Object.entries({ ...M, hut: HUTG, whitedoor: DOORG })) if (g && k !== "housecol" && !have.has("m-l70-" + k)) add.push({ id: "m-l70-" + k, kind: "model", name: "Froidetown " + k, prompt: "Level 70 town layer", by: "savi", made: ctx.world.date,
    spec: { model: { id: g, forward: k === "hut" || k === "whitedoor" ? "+x" : "+z" } }, turn: 0, from: [], how: { tool: k === "house" || k === "igloo" ? "Blender (art/l70-town)" : "Tripo text-to-model v3.1", inputs: [], steps: "detailed geometry and texture, 30k faces, PBR; fitted to true size by layout box" } });
  if (add.length) s.items = [...(s.items ?? []), ...add];
  ctx.place.state.l70townIds = ids;
}
export function tick(ctx) {
  const b = ctx.place.objects["l70-cellar-bulb"]; if (!b) return;
  const r = ctx.random(); b.light = { ...b.light, intensity: r < 0.12 ? 0.25 : r < 0.3 ? 1.1 : 1.9 }; // the bulb's bad contact
}
