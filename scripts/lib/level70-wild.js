// Level 70 "wild" layer: the land between (trees, boulders, fences, signs, pylon, skyline), the Carnifices of Gelu camp in Iceshed,
// Froston (the dead B.N.T.G. extraction camp) and the River Guard post on the Burns River. lay(ctx) once per V; tick(ctx) lays the trees in batches.
import { ZONES, SPOT, RIVER, wildness, zoneAt } from "./level70.js";
export const V = 1;
const U = (h) => "/cdn/value." + h + ".glb";
export const GLB = {
  spruce: U("04eaaea5ce01839348a9b539d39fb1da7be7b82825c48883f28ea36c21dbac23"), birch: U("00db5651af342e40af65ef83853f2d6cd6d55635511f8b26a862fd23e02cc2eb"),
  rock: U("1f476b4b6a563130114293a25d61a70f2e36523fad4fbf44162549689161da92"), skyline: U("cef9cf5cf3a27ed533697f71c4c9b8797fdde6d5138e96cac33391deda27a534"),
  pylon: U("ace8e24a92be32a5081e99121e369b5871066b57a0c284e52ba70451b16c2ffa"), tent: U("8d7b3d9f2b7478726087d5f40b053afa15b33f6c3704fbe04f35a44f595e0cca"),
  altar: U("4437b5c2fb6c0ee74cca0b675a5670affa4d220433b2e68039eea3eb93372672"), totem: U("614ecd5ceb48c5e547fb4c0a607a859f98b93dffa2e76b97d29a19e7b97ee057"),
  rack: U("5ad22535100f27ec3d9663ed54416b2079e850f15adc7dcc84affd713efb117e"), rig: U("e908749c6e537ead6b0515b5bc7be870e9f03ecb63f26a2bae330c4be7c20dd5"),
  container: U("55ce2395b0ad47cf94d5c2211cf12f41ed72a0bffa8616cdc91483657c1a3e64"), hut: U("87db01036896a2e01375996d8cbfc98d6ef1e2940c640ac3ddd2ad6fc3af45c0"),
  openbox: U("bcdfc96b1aef5d96f15aceb915363fdf3bc3727d0f2ba12e6658da98230326d0"), banner: U("6edcba81ce0f4821240cdabb3634540db8ce6e3be1bfdb96cc52da65de073337"),
  fence: U("ee923ef0e1da164ba64409cc7e7acf8977e2ce6c28cf1d0ff42a691dc4da8f19"), icehole: U("99d9ecaabafd0ec53f68d3eb38d1084e15ec58de5167600564b087f35e0b594d"),
  jetty: U("910ea79be78abe13a4fd43986924310ab3f762c4cc3472107bdb95004addd3b6"), papers: U("195633c74204cfc499314ed0898d641823db21aa196ad19724829f8c1b635cb2"),
  signSpeed: U("c72211a3c2a3886dc4d7bc6db96a56669f42a56adb489ea14d522ce6cbceb6b4"), signMoose: U("26c7fed346858a62a72b5c65c5ba7662c121f7ad91002a14fcae7c5bcf17a24c"),
  heap: U("d50ad70cf192d658a3f668642719d22be936237c3da32fcb52ffa2223bd57af4"),
  generator: U("43dce37c5c94828c4f73c350c550d1912c43026086ce914206d5ef670c478c2e"), drum: U("de68d3453156f6d0341dc0143da17f0a5f60f2da731a9b018363a51fcf233712"),
  desk: U("c19a3a1207063b8231b343d67d98657a158515407d7c01b6c2286a1bd2d5c18c"), rowboat: U("a8149ca591b3615ade17735a3a0a1e972028c35be8f1351899565924f9d32a16"),
  sandbags: "/cdn/value.3ef438addb021fb2564e48689de4b5281d9464d3a65b502624bd0244ce8cad87.glb", stool: "/cdn/value.aafae0e5ed4c77675ec12a25bb3f8eac5c887ceaf6219d322cd50996a57e1552.glb", brazier: "/cdn/value.f9480030aeb78abf6f6f50b8f2a655d8ca77540fbddc0301e23d8b2fe1ee82ef.glb",
};
const C = SPOT.camp, R = SPOT.rig, D = SPOT.dock;
export const CAMP_FIRE = { x: C.x, y: 0, z: C.z };
export const ALTAR = { x: C.x, y: 0, z: C.z - 4.6 };
export const TENTS = [45, 135, 225, 315].map((a) => ({ x: +(C.x + Math.cos(a * Math.PI / 180) * 6.6).toFixed(2), y: 0, z: +(C.z + Math.sin(a * Math.PI / 180) * 6.6).toFixed(2) }));
export const RIG = { x: R.x, y: 0, z: R.z };
export const CONTAINER_DESK = { x: R.x - 11.9, y: 0.16, z: R.z + 5 };
export const DOCK_POST = { x: D.x, y: 0, z: D.z };
const HOME = { x: 0, z: -72 };
const LINES = [CAMP_FIRE, RIG, DOCK_POST];
const segD = (x, z, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a.x - dx * t, z - a.z - dz * t); };
const clear = (x, z, m) => LINES.every((p) => segD(x, z, HOME, p) > m);
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// the wood: seeded, the same on every machine. Iceshed is thick (inside its disc, off the camp clearing), the rest thins with distance from it.
export const TREES = (() => {
  const r = rng(7070), out = [], I = ZONES.iceshed;
  const ok = (x, z, gap) => out.every((t) => Math.hypot(t.x - x, t.z - z) > gap);
  for (let n = 0; out.length < 74 && n < 4000; n++) {
    const a = r() * 6.283, d = 12.5 + Math.sqrt(r()) * 34, x = C.x + Math.cos(a) * d, z = C.z + Math.sin(a) * d;
    if (Math.hypot(x - I.x, z - I.z) > I.r + 16 || !clear(x, z, 3.2) || !ok(x, z, 3.4)) continue;
    const k = zoneAt(x, z); if (k !== "iceshed" && k !== "wild") continue;
    out.push({ x, z, kind: r() < 0.8 ? "spruce" : "birch", h: 7 + r() * 6, yaw: r() * 360, solid: true });
  }
  for (let n = 0; out.length < 172 && n < 9000; n++) {
    const a = r() * 6.283, d = 20 + Math.sqrt(r()) * 200, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (wildness(x, z) <= 0.3 || Math.abs(z - RIVER.z) < RIVER.w / 2 + 3 || !clear(x, z, 3.2) || !ok(x, z, 5)) continue;
    if (r() > 0.25 + 0.75 * Math.max(0, 1 - Math.hypot(x - I.x, z - I.z) / 150)) continue;
    out.push({ x, z, kind: r() < 0.55 ? "spruce" : "birch", h: 6 + r() * 7, yaw: r() * 360, solid: Math.hypot(x, z + 40) < 110 });
  }
  return out;
})();
const yawTo = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z)) * 180 / Math.PI;
const fit = (h) => ({ box: { min: { y: 0 }, max: { y: h } } });
const MESH = { body: "static", collider: "mesh" };
const m = (glb, x, y, z, h, yaw = 0, extra = {}) => ({ feetPosition: { x, y, z }, rotation: { yaw }, model: { id: GLB[glb] }, layout: fit(h), ...extra });
const COLD_FIRE = `fx
pop coals n=8 on=disc(.3) size=.07..0.15 tint=<.5,1.3,2.6>..<.3,.7,1.6> sz=$size*flick(.5,.12) col=$tint*flick(.8,.3) a=.9 r=sprite(soft-disc,add)
pop flame rate=flick(.45,.2)*46 on=disc(.26) life=.6..1.1 v=up(1.2)+cone(18)*(.2..0.6) size=.22..0.42 acc=curl(.5)*1.1+buoy(1.7)+drag(1.5)
  sz=$size*(.5>.25:1>.7:.7>.14) col=hdr(3.2,4.2,5)>.3:hdr(1.2,2.6,4.4)>.65:hdr(.4,1,2.6)>hdr(.1,.25,.9) a=0>.12:1>.75:.8>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop motes rate=5 on=disc(.25) life=1..2 v=up(1.4)+cone(30)*(.3..0.9) size=.02..0.045 acc=curl(.8)+drag(.5) sz=$size col=hdr(2.5,4,5)>hdr(.4,1,2) a=(0>.08:1>.65:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)
pop frost on=@flame?.18 inh=p;v:$v*.3 life=2..3.2 size=.2..0.3 acc=buoy(.35)+curl(.3)*.5+drag(.8) sz=$size*(.7>3) col=<.8,.9,1> a=0>.2:.16>.7:.1>0 rot=spin(.15) r=sprite(smoke-puff,alpha)`;
const WARM_FIRE = `fx
pop flame rate=flick(.45,.2)*34 on=disc(.16) life=.4..0.8 v=up(1.3)+cone(20)*(.2..0.6) size=.16..0.3 acc=curl(.5)+buoy(2)+drag(1.5)
  sz=$size*(.5>.25:1>.7:.7>.14) col=hdr(4.6,3.4,1.4)>.3:hdr(3.2,1.4,.3)>.65:hdr(1.8,.5,.1)>hdr(.6,.12,.03) a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop embers rate=3 on=disc(.15) life=.7..1.4 v=up(2)+cone(30)*(.4..1) size=.02..0.04 acc=curl(.8)+grav()*.4+drag(.5) sz=$size col=hdr(5,2.8,.8)>hdr(1,.22,.04) a=(0>.08:1>.65:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)`;
function treeSpec(t) {
  const spec = { tags: ["l70-tree"], feetPosition: { x: t.x, z: t.z, y: { terrain: -0.2 } }, rotation: { yaw: t.yaw }, model: { id: GLB[t.kind] }, layout: fit(t.h), visibleRange: { max: 320 } };
  if (t.solid) spec.children = [{ feetPosition: { x: 0, y: 0, z: 0 }, visible: false, physics: "static", primitive: { kind: "cylinder", radiusTop: 0.28, radiusBottom: 0.34, height: 3 } }];
  return spec;
}
export function lay(ctx) {
  const sp = (id, spec) => { if (ctx.place.objects[id]) ctx.destroy(id); return ctx.spawn(id, spec); };
  const r = rng(31);
  // ---- Iceshed: the Carnifices of Gelu camp (root at the cold fire; children local to it)
  const kids = [];
  TENTS.forEach((t, i) => {
    kids.push({ id: "tent" + i, tags: ["l70-tent"], ...m("tent", t.x - C.x, 0, t.z - C.z, 3.2 + (i % 2) * 0.25, yawTo(t.x, t.z, C.x, C.z) + (r() - 0.5) * 14), physics: MESH });
    kids.push({ id: "tentheap" + i, ...m("heap", (t.x - C.x) * 1.42, 0, (t.z - C.z) * 1.42, 0.7 + r() * 0.4, r() * 360) });
  });
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + 0.3; kids.push({ id: "pit" + i, ...m("rock", Math.cos(a) * 0.72, -0.05, Math.sin(a) * 0.72, 0.3 + r() * 0.12, r() * 360) }); }
  kids.push({ id: "altar", tags: ["l70-altar"], ...m("altar", 0, 0, -4.6, 1.35, 0), physics: MESH });
  kids.push({ id: "altarglow", feetPosition: { x: 0, y: 1.7, z: -4.2 }, light: { kind: "point", color: "oklch(0.85 0.09 230)", intensity: 5, distance: 7 } });
  kids.push({ id: "rack", ...m("rack", 0.6, 0, 4.9, 1.75, 90), physics: MESH });
  [[9.2, -3.4, 3.4], [9.2, 3.6, 2.9], [-9.4, 0.8, 3.7], [-2.6, -8.6, 2.6]].forEach(([x, z, h], i) => kids.push({ id: "totem" + i, tags: ["l70-totem"], ...m("totem", x, -0.15, z, h, yawTo(x, z, 0, 0) + 180), rotation: { yaw: yawTo(x, z, 0, 0) + 180, roll: (r() - 0.5) * 8 } }));
  kids.push({ id: "heapA", ...m("heap", 4.8, 0, -1.6, 0.5, 40) }, { id: "heapB", ...m("heap", -3.6, 0, 7.6, 0.8, 200) });
  kids.push({ id: "firelight", feetPosition: { x: 0, y: 1.1, z: 0 }, light: { kind: "point", color: "oklch(0.86 0.1 235)", intensity: 26, distance: 20 } });
  kids.push({ id: "pines", feetPosition: { x: 0, y: 4, z: 0 }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-wind-through-frozen-pine-forest-creaking-boughs-loop.mp3", loop: true, spatial: true, maxDistance: 75, gain: 0.16, bus: "ambience" } });
  sp("l70-bp-camp", { tags: ["l70-wild", "l70-campfire"], feetPosition: { x: C.x, y: 0, z: C.z }, fx: { script: COLD_FIRE }, children: kids });
  // ---- Froston: the dead B.N.T.G. extraction camp (root is the rig)
  const fk = [
    { id: "office", tags: ["l70-container-open"], ...m("openbox", -10, 0, 5, 3.0, 0), physics: MESH },
    { id: "desk", tags: ["l70-desk"], ...m("desk", -11.9, 0.16, 5, 1.2, -90), physics: "static" },
    { id: "papers", ...m("papers", -10.4, 0.17, 5.2, 0.08, 20) },
    { id: "papers2", ...m("papers", -6.2, 0.02, 5.6, 0.08, 140) },
    { id: "worklight", feetPosition: { x: -10, y: 2.1, z: 5 }, light: { kind: "point", color: "oklch(0.8 0.05 240)", intensity: 3, distance: 7 } },
    { id: "box2", ...m("container", 7.5, -0.1, -8.5, 2.9, 24), physics: MESH },
    { id: "gen", ...m("generator", -3.5, 0, -6.5, 1.15, 200), physics: "static" },
    { id: "banner", ...m("banner", -1.5, 0, 9.5, 3.5, 165) },
    { id: "drum0", ...m("drum", 5, 0, 6, 0.9, 10), physics: "static" }, { id: "drum1", ...m("drum", 5.75, 0, 6.5, 0.9, 130), physics: "static" },
    { id: "drum2", ...m("drum", 5.1, 0, 6.9, 0.9, 250), physics: "static" },
    { id: "drum3", feetPosition: { x: 7.4, y: 0.28, z: 5.2 }, rotation: { yaw: 40, roll: 90 }, pivot: "center", model: { id: GLB.drum }, layout: fit(0.9) },
    { id: "heap0", ...m("heap", -10.5, 0, 2.2, 1.0, 5) }, { id: "heap1", ...m("heap", 8.5, 0, -5.6, 1.1, 200) }, { id: "heap2", ...m("heap", 3.6, 0, -3.2, 0.6, 90) }, { id: "heap3", ...m("heap", 6.4, 0, 7.6, 0.55, 300) },
    { id: "rock0", ...m("rock", -6, -0.2, -10, 1.3, 70), physics: MESH },
    { id: "beacon", feetPosition: { x: 0, y: 3, z: 2.5 }, light: { kind: "point", color: "oklch(0.8 0.04 245)", intensity: 6, distance: 16 } },
  ];
  sp("l70-bp-froston", { tags: ["l70-wild", "l70-rig"], ...m("rig", R.x, 0, R.z, 9, 0), physics: MESH, children: fk });
  // ---- River Guard post (root is the watch hut's ground anchor at the dock)
  const dk = [
    { id: "hut", tags: ["l70-hut"], ...m("hut", -4.2, 0, 3.6, 3.4, 180), physics: MESH },
    { id: "brazier", ...m("brazier", 2, 0, 1.6, 0.95, 0), physics: "static", fx: { script: WARM_FIRE }, children: [{ feetPosition: { x: 0, y: 1.3, z: 0 }, light: { kind: "point", color: "oklch(0.8 0.14 60)", intensity: 22, distance: 16 } }] },
    { id: "bags0", ...m("sandbags", 4.6, 0, 4.2, 0.95, 8), physics: MESH }, { id: "bags1", ...m("sandbags", 7.3, 0, 3.2, 0.95, 38), physics: MESH },
    { id: "jetty", ...m("jetty", 2.2, 0, -5.4, 1.56, 0), physics: MESH },
    { id: "hole", ...m("icehole", -3.2, 0, -8, 1.04, 30) },
    { id: "stool", ...m("stool", -2.2, 0, -7.2, 0.46, 60), physics: "static" },
    { id: "boat", ...m("rowboat", 7.6, -0.16, -6.2, 0.72, 62), physics: MESH },
    { id: "heap0", ...m("heap", -5.6, 0, 1.2, 0.8, 0) }, { id: "heap1", ...m("heap", 8.4, -0.05, -5.2, 0.5, 120) }, { id: "heap2", ...m("heap", 0.4, 0, 5.8, 0.45, 210) },
    { id: "creak", feetPosition: { x: 0, y: 1, z: -12 }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-frozen-river-ice-creaking-and-groaning-deep-loop.mp3", loop: true, spatial: true, maxDistance: 48, gain: 0.13, bus: "ambience" } },
  ].filter((k) => !k.model || k.model.id);
  sp("l70-bp-dock", { tags: ["l70-wild", "l70-dock"], feetPosition: { x: D.x, y: 0, z: D.z }, children: dk });
  // ---- the land between
  const g = (x, z, dy = 0) => ({ x, z, y: { terrain: dy } });
  let n = 0;
  for (let i = 0; n < 16 && i < 600; i++) {
    const a = r() * 6.283, d = 30 + r() * 170, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.7 + r() * r() * 2.2;
    if (wildness(x, z) <= 0.3 || !clear(x, z, 4) || Math.abs(z - RIVER.z) < 14) continue;
    sp("l70-rock" + n++, { tags: ["l70-wild", "l70-rock"], feetPosition: g(x, z, -h * 0.18), rotation: { yaw: r() * 360 }, model: { id: GLB.rock }, layout: fit(h), physics: MESH, visibleRange: { max: 260 } });
  }
  [[-17, 30, 90], [-17, 21.3, 90], [-17.4, 12.6, 94], [19, 34, 90], [19.3, 25.2, 86], [-24, -112, 12], [-32.5, -113.8, 12]].forEach(([x, z, yaw], i) =>
    sp("l70-fence" + i, { tags: ["l70-wild"], feetPosition: g(x, z, -0.45 - (i % 3) * 0.12), rotation: { yaw, roll: (i % 2 ? 3 : -2) }, model: { id: GLB.fence }, layout: fit(1.68), physics: MESH }));
  sp("l70-sign-speed", { tags: ["l70-wild"], feetPosition: g(8.2, 24, -1.05), rotation: { yaw: 172, roll: 7 }, model: { id: GLB.signSpeed }, layout: fit(3), physics: "static" });
  sp("l70-sign-moose", { tags: ["l70-wild"], feetPosition: g(-8.4, -104, -1.25), rotation: { yaw: 12, roll: -9 }, model: { id: GLB.signMoose }, layout: fit(3), physics: "static" });
  sp("l70-sign-heap0", { tags: ["l70-wild"], feetPosition: g(8.9, 24.6, -0.05), model: { id: GLB.heap }, layout: fit(0.6) });
  sp("l70-sign-heap1", { tags: ["l70-wild"], feetPosition: g(-9, -103.4, -0.05), rotation: { yaw: 80 }, model: { id: GLB.heap }, layout: fit(0.7) });
  sp("l70-pylon", { tags: ["l70-wild"], feetPosition: g(172, -34, -0.5), rotation: { yaw: 78, roll: 2.5 }, model: { id: GLB.pylon }, layout: fit(44), visibleRange: { max: 700 } });
  [[-150, -215, 52, 0], [-88, -232, 44, 90], [-30, -222, 60, 180], [34, -236, 47, 270], [92, -218, 56, 90], [150, -205, 42, 0],
   [-120, 208, 46, 180], [-52, 226, 58, 270], [18, 214, 43, 0], [84, 222, 54, 90], [146, 196, 41, 180]].forEach(([x, z, h, yaw], i) =>
    sp("l70-skyline" + i, { tags: ["l70-wild", "l70-skyline"], feetPosition: g(x, z, -1), rotation: { yaw }, model: { id: GLB.skyline }, layout: fit(h), castShadow: false, visibleRange: { max: 900 } }));
  [[-60, 30, -200], [60, 26, -200], [0, 28, 192]].forEach(([x, y, z], i) => sp("l70-cityglow" + i, { tags: ["l70-wild"], feetPosition: { x, y, z }, light: { kind: "point", color: "oklch(0.78 0.15 65)", intensity: 900, distance: 90 } }));
  ctx.place.state.w70i = 0;
}
export function tick(ctx) {
  const s = ctx.place.state; let i = s.w70i ?? 0;
  if (i >= TREES.length) return;
  const end = Math.min(TREES.length, i + 30);
  for (; i < end; i++) { const id = "l70-tree" + i; if (ctx.place.objects[id]) ctx.destroy(id); ctx.spawn(id, treeSpec(TREES[i])); }
  s.w70i = i;
}
