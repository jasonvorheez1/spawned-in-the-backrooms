// Level 8 "Cave Systems" (backrooms-wiki.wikidot.com/level-8): the first level whose environment is wholly enclosed. A sprawling network of organic karst caves, cold, dark,
// jagged spikes from the ceiling and floor, tunnels branching on all sides. This is the 9th Road: one cave built in Blender (art/level8/build.py > cave_road.glb, the
// stations in scripts/lib/data/level8.yml): the entrance lake you wade out of (from Level 7's diving bell), the welcome sign, a hall whose crawl tunnel loops back once,
// a cavern that floods to the chin with parkour ledges and a dead caver in an orange caving suit, Hyperspace Lane (glowing fungi, resonance altar and light guides), a spider nest,
// a pool of boiling tar with a B.N.T.G. dredge winch and reaching hands, a survivor camp round a fire with Carla, and the asphalt road to Level 9. Life: scripts/l8-life.js; use: scripts/l8-use.js.
import L8 from "../../scripts/lib/data/level8.yml";
import { tickChatter, CHATTER } from "../../scripts/lib/chatter.js";
export const cadence = "1s";
const V = 16;
const GLB = {
  cave: "/cdn/value.6ae7c035c9583dda020bc92a7e80e75e9d3d462632234677d4a5f5a717fe311b.glb",
  spider: "/cdn/value.f2baeaec87cf017372e92e66ec42fae95179b52161e15051d3253036b89b9323.glb",
  // Tripo props (Shelly, Nov 8: "use tipo to improve on level 8")
  mush: "/cdn/value.d3b7d8e9110577ffa40ba0d9c1ab1dd92c464eb05dc3560a673c833a98e46fdd.glb",
  cocoon: "/cdn/value.2a6a8eedd1ffea6228c05b641a8d9aad94f0241211e7b80b5f3b9bc853529fa7.glb",
  tar: "/cdn/value.378791ac6389f68afbed57b1ae75094394050d6534c623bd7e658f96072246db.glb",
  flow: "/cdn/value.fc172db4defdc02603c499ccc386d3fea6fb504d8b388408de18c1ef734f6c34.glb",
};
const ST = Object.fromEntries(L8.stations.map((s) => [s.name, s]));
// a point on the road: s metres along it, side metres to the right of it (left is negative), up metres above its floor; yaw faces along the road
function P(s, side = 0, up = 0) {
  const R = L8.road; let i = 0; while (i < R.length - 2 && R[i + 1][0] <= s) i++;
  const [s0, x0, y0, z0, h0] = R[i], [s1, x1, y1, z1, h1] = R[i + 1], t = Math.max(0, Math.min(1, (s - s0) / (s1 - s0)));
  const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, z = z0 + (z1 - z0) * t, h = ((h0 + (h1 - h0) * t) * Math.PI) / 180;
  return { x: x + Math.cos(h) * side, y: y + up, z: z + Math.sin(h) * side, yaw: -((h0 + (h1 - h0) * t)) };
}
const at = (p, extra = {}) => ({ feetPosition: { x: p.x, y: p.y, z: p.z }, rotation: { yaw: p.yaw }, ...extra });
const ROCK = { color: "oklch(0.46 0.025 65)", roughness: 0.94 };
const WET_ROCK = { color: "oklch(0.32 0.03 220)", roughness: 0.25, metalness: 0.15 };
const FLOW_MAT = { color: "oklch(0.74 0.045 82)", roughness: 0.58, metalness: 0.05 };
const ROAD_MAT = { color: "oklch(0.55 0.03 75)", roughness: 0.88 };
const BIOLUM_MAT = { color: "oklch(0.72 0.14 190)", emissive: "oklch(0.78 0.16 185)", emissiveIntensity: 2.6, roughness: 0.35 };
const TAR_ROCK = { color: "oklch(0.14 0.015 280)", roughness: 0.16, metalness: 0.25 };
const CAVE = (kind, m) => ({ kind: "scripted", script: "scripts/mat-cave.js", params: { kind, s: 1 }, color: m.color, metalness: m.metalness ?? 0 });
const BOX = (w, h, d) => ({ box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } });
const STEEL = { color: "oklch(0.34 0.02 250)", roughness: 0.45, metalness: 0.75 };
const RUST = { color: "oklch(0.36 0.08 42)", roughness: 0.8, metalness: 0.45 };
const WOOD = { color: "oklch(0.38 0.06 65)", roughness: 0.88 };
const sign = (w, h, html, bg = "oklch(0.2 0.015 80)") => ({ primitive: { kind: "box", width: w, height: h, depth: 0.06 }, material: { color: bg, roughness: 0.7 }, ui: html });
const MEG = `<div face="front" width="2.6m" style="font-family:Arial,sans-serif;font-weight:900;color:#f2d870;text-align:center;line-height:1.1">`;

// Particle FX scripts
const FIRE_FX = `fx
pop flame rate=28 life=.45..0.9 on=disc(.32) v=up(.8..1.6)+sdir()*.22 size=.18..0.34 col=hdr(2.8,1.1,.2)>hdr(1.4,.2,0) a=.85>0 sz=$size*(1>.5) r=sprite(soft-disc,add)
pop ember rate=12 life=1.2..2.2 on=disc(.35) v=up(1.4..2.6)+sdir()*.45 size=.03..0.06 col=hdr(3.0,1.4,.3) a=1>0 sz=$size r=sprite(disc,add)`;
const STEAM_FX = `fx
pop mist rate=10 life=1.2..2.0 on=disc(.22) v=up(.45..0.85)+sdir()*.12 size=.12..0.26 col=rgb(.85,.88,.92) a=.28>0 sz=$size*(1>2) r=sprite(soft-disc)`;
const TAR_FX = `fx
pop fume rate=16 life=1.5..2.8 on=disc(2.8) v=up(.35..0.75)+sdir()*.18 size=.28..0.55 col=rgb(.08,.06,.10) a=.45>0 sz=$size*(1>1.8) r=sprite(soft-disc)
pop spark rate=6 life=.8..1.5 on=disc(2.4) v=up(.5..1.1) size=.05..0.11 col=hdr(1.8,.5,.15) a=.7>0 sz=$size r=sprite(soft-disc,add)`;
const SPORE_FX = `fx
pop spore rate=9 life=1.6..3.0 on=sphere(1.8) v=up(.12..0.32)+sdir()*.15 size=.03..0.07 col=hdr(.3,2.2,2.0) a=.75>0 sz=$size r=sprite(soft-disc,add)`;

// ---- things to harvest (scripts/l8-use.js and the breakables system): each is a spec with how long it takes to grow back once it is gone
const rxAt = (s) => { const st = L8.stations.find((q) => s >= q.s0 && s <= q.s1); return st ? st.rx : 4; };
const DEFS = {};
const def = (id, delay, spec) => { DEFS[id] = { delay, spec }; };
const brk = (mat, hp, name) => ({ mat, hp, maxHp: hp, name });
const stalkMat = { color: "oklch(0.78 0.05 180)", roughness: 0.75 };
const capMat = { color: "oklch(0.72 0.14 190)", emissive: "oklch(0.76 0.16 185)", emissiveIntensity: 2.4, roughness: 0.35 };

// glowing caps: multi-stem bioluminescent mushroom clusters along Hyperspace Lane and in the chambers
const FUNG = [...Array(22).keys()].map((k) => ({ s: 218 + k * 2.4, side: (k % 2 ? 1 : -1) * (3 + (k % 5)), up: 0.05 + (k % 3) * 0.45 })).concat([[62, -5.5, 0.1], [88, 6, 0.1], [168, -8, 0.2], [290, -9, 0.1], [318, 8, 0.15], [356, -8, 0.2], [388, 7, 0.1], [420, -10, 0.1], [452, 9, 0.15], [474, 2.5, 0.1]].map(([s, side, up]) => ({ s, side, up })));
FUNG.forEach((f, k) => {
  const p = P(f.s, f.side), r = 0.16 + (k % 3) * 0.05, stemH = 0.22 + (k % 3) * 0.08;
  def(`l8-glow-${k}`, 150, {
    feetPosition: { x: p.x, y: P(f.s).y + f.up, z: p.z }, rotation: { yaw: k * 53 }, tags: ["usable"], behavior: "scripts/l8-use.js",
    model: { id: GLB.mush, materials: {} }, layout: BOX(r * 3.6, r * 4.2, r * 3.6), material: { emissive: "oklch(0.7 0.14 190)", emissiveIntensity: 0.35 },
    ...(k % 4 === 0 ? { fx: { script: SPORE_FX } } : {}),
    state: { kind: "fungus", name: "Glowing fungus cluster", verb: "Pick the caps", info: "Bioluminescent caps on almond-wet rock. They bruise easily, and make a good light.", tint: "#6fe8d8" },
    children: [
      { feetPosition: { x: 0, y: stemH + 0.15, z: 0 }, light: { kind: "point", color: "oklch(0.72 0.15 190)", intensity: 1.05, distance: 8.5 } },
    ],
  });
});

// cocoons in the nest: bound silk pods anchored by ceiling web strands
[292, 300, 308, 318, 326, 334, 342].forEach((s, k) => {
  const side = (k % 2 ? 1 : -1) * (3 + (k * 5) % 6), p = P(s, side), silk = { color: "oklch(0.9 0.012 230)", roughness: 0.95 };
  def(`l8-cocoon-${k}`, 300, {
    feetPosition: { x: p.x, y: P(s).y, z: p.z }, rotation: { yaw: k * 47 }, tags: ["usable"], behavior: "scripts/l8-use.js",
    model: { id: GLB.cocoon }, layout: BOX(0.8, 1.5, 0.8),
    state: { kind: "cocoon", name: "Silk cocoon", verb: "Cut open", info: "Something was wrapped tightly in this. It is not moving.", tint: "#e8eef2" },
    children: [
      { feetPosition: { x: 0, y: 1.45, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.08, height: 3.8 }, material: { color: "oklch(0.92 0.01 230)", opacity: 0.55, transparent: true } },
    ],
  });
});

// the tar pool's seeps: bubbling pitch mounds you can scrape, at a price
[[366, 5.2], [376, 5.8], [386, -5.4], [394, 4.6]].forEach(([s, side], k) => {
  const p = P(s, side), pitchMat = { color: "oklch(0.07 0.008 280)", roughness: 0.14, metalness: 0.25 };
  def(`l8-seep-${k}`, 120, {
    feetPosition: { x: p.x, y: P(s).y, z: p.z }, tags: ["usable"], behavior: "scripts/l8-use.js",
    model: { id: GLB.tar }, layout: BOX(1.5, 0.42, 1.5),
    state: { kind: "seep", name: "Tar seep", verb: "Scrape pitch", info: "Warm, black and slow. The Tar is not far below it.", tint: "#8a7a9a" },
    children: [
      { feetPosition: { x: 0, y: 0.3, z: 0 }, light: { kind: "point", color: "oklch(0.6 0.16 40)", intensity: 0.6, distance: 4 } }, { feetPosition: { x: 0.05, y: 0.12, z: -0.08 }, primitive: { kind: "sphere", radius: 0.07 }, material: { color: "oklch(0.35 0.12 45)", emissive: "oklch(0.45 0.15 40)", emissiveIntensity: 1.2 } },
    ],
  });
});

// flowstone (pale stalagmite clusters) and ironstone (dark red-brown ore veins): break them, best with a pickaxe
[54, 66, 80, 94, 164, 188, 206, 224, 240, 256, 268, 286, 304, 322, 340, 352, 372, 392, 410, 430, 452, 470, 484].forEach((s, k) => {
  const sd = (k % 2 ? 1 : -1) * rxAt(s) * (0.3 + (k % 3) * 0.08), p = P(s, sd), h = 1.15 + (k % 4) * 0.35;
  def(`l8-flow-${k}`, 420, {
    feetPosition: { x: p.x, y: P(s).y - 0.1, z: p.z }, rotation: { yaw: k * 37 }, tags: ["breakable"], physics: "static",
    model: { id: GLB.flow }, layout: BOX(1.2 + (k % 3) * 0.25, h * 1.25, 1.1 + (k % 3) * 0.2), state: brk("flowstone", 150, "Flowstone"),
  });
});
[60, 90, 170, 230, 262, 296, 330, 360, 396, 420, 458, 476].forEach((s, k) => {
  const sd = (k % 2 ? -1 : 1) * rxAt(s) * 0.42, p = P(s, sd);
  def(`l8-iron-${k}`, 420, {
    feetPosition: { x: p.x, y: P(s).y + 0.05, z: p.z }, rotation: { yaw: k * 63 }, tags: ["breakable"], physics: "static",
    primitive: { kind: "dodecahedron", radius: 0.64 }, material: { color: "oklch(0.36 0.07 38)", roughness: 0.85, metalness: 0.25 }, state: brk("ironstone", 230, "Ironstone vein"),
    children: [
      { feetPosition: { x: 0.28, y: 0.22, z: 0.18 }, primitive: { kind: "octahedron", radius: 0.28 }, material: { color: "oklch(0.48 0.09 42)", roughness: 0.45, metalness: 0.65 } },
      { feetPosition: { x: -0.24, y: 0.15, z: -0.22 }, primitive: { kind: "octahedron", radius: 0.24 }, material: { color: "oklch(0.44 0.08 40)", roughness: 0.5, metalness: 0.6 } },
    ],
  });
});

function lay(ctx) {
  const sp = (id, spec) => ctx.spawn(id, spec);
  // a rebuild (V bumped): take down what the last build laid (not the life manager, the camp people, or what players carry)
  for (const id of Object.keys(ctx.place.objects ?? {})) if (/^l8-/.test(id) && !id.includes("/") && !/^l8-(life|hobb|wen|ivo|marit|carla-kid)$/.test(id) && !/^l8-(spider|broodmother|hand)/.test(id)) ctx.destroy(id);
  // the cave model (box min -10.91,-2.56,-455.46, max 124.61,14.62,0.40) placed by its bottom-centre with multi-zone karst materials
  sp("l8-cave", {
    feetPosition: { x: 56.85, y: -2.56, z: -227.53 }, physics: { body: "static", collider: "mesh" },
    model: { id: GLB.cave, materials: { rock: CAVE("rock", ROCK), wet_rock: CAVE("wet", WET_ROCK), flowstone: CAVE("rock", { color: "oklch(0.5 0.03 72)" }), road_bed: CAVE("road", ROAD_MAT), biolum: BIOLUM_MAT, tar_rock: CAVE("tar", TAR_ROCK) } },
    receiveShadow: true,
  });

  // caver work lamps strung along the road: warm pools between the cold dark, so the rock's grain reads (Shelly: "graphics could be much better")
  for (let k = 0, sd = 1; k * 15 + 20 < 500; k++, sd = -sd) {
    const at0 = 20 + k * 15, q = P(at0, sd * rxAt(at0) * 0.62), y = P(at0).y;
    sp(`l8-worklamp-${k}`, { feetPosition: { x: q.x, y, z: q.z }, rotation: { yaw: q.yaw }, physics: "static",
      primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.05, height: 1.7 }, material: RUST,
      children: [
        { feetPosition: { x: 0, y: -0.02, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.22, radiusBottom: 0.26, height: 0.06 }, material: STEEL },
        { feetPosition: { x: 0, y: 1.62, z: 0.06 }, primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.1, height: 0.16 }, material: STEEL },
        { feetPosition: { x: 0, y: 1.58, z: 0.06 }, primitive: { kind: "sphere", radius: 0.055 }, material: { color: "oklch(0.95 0.08 80)", emissive: "oklch(0.92 0.12 75)", emissiveIntensity: 4 } },
        { feetPosition: { x: 0, y: 1.5, z: 0.1 }, light: { kind: "point", color: "oklch(0.86 0.1 72)", intensity: 1.7, distance: 13 } },
      ] });
  }

  // ---- Station 1: the entrance lake and the M.E.G. diving bell that brought you down from Level 7's abyss
  const lake = P(12, 0, 0);
  sp("l8-lake", { tags: ["swimwater"], ...at({ ...lake, y: -2.65 }), primitive: { kind: "box", width: 26, height: 2.5, depth: 38 }, material: { kind: "water", color: "oklch(0.22 0.04 230)", opacity: 0.88, waveIntensity: 0.05 } });
  sp("l8-lake-back", { ...at({ ...P(10, 0, 0), y: -1.2 }), physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 26, height: 2.4, depth: 30 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level7#l7-from-l8" } });
  sp("l8-from-l7", at(P(31, 0, 0.1)));
  // Submerged M.E.G. Diving Bell & hoist cable rising into the flooded ceiling shaft
  const bellP = P(18, -4.8, 0);
  sp("l8-bell", {
    ...at({ ...bellP, y: -1.35 }), physics: "static", primitive: { kind: "cylinder", radiusTop: 1.05, radiusBottom: 1.35, height: 2.4 }, material: { color: "oklch(0.58 0.13 82)", roughness: 0.6, metalness: 0.55 },
    children: [
      { feetPosition: { x: 0, y: 2.1, z: 0 }, primitive: { kind: "sphere", radius: 1.05 }, material: { color: "oklch(0.55 0.13 82)", roughness: 0.6, metalness: 0.55 } },
      { feetPosition: { x: 0, y: 0.1, z: 0 }, primitive: { kind: "torus", radius: 1.38, tube: 0.12 }, rotation: { pitch: 90 }, material: RUST },
      { feetPosition: { x: 0, y: 1.3, z: 1.08 }, primitive: { kind: "cylinder", radiusTop: 0.36, radiusBottom: 0.36, height: 0.18 }, rotation: { pitch: 90 }, material: { color: "oklch(0.78 0.12 200)", emissive: "oklch(0.75 0.14 195)", emissiveIntensity: 2.2 } },
      { feetPosition: { x: 0, y: 3.1, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.05, height: 11.0 }, material: STEEL },
      { feetPosition: { x: 0, y: 3.3, z: 0 }, light: { kind: "point", color: "oklch(0.78 0.15 75)", intensity: 1.8, distance: 12 } },
    ],
  });
  // Shoreline work-lamp tripod & welcome sign
  const shoreLamp = P(34, -4.4, 0);
  sp("l8-shore-rig", {
    ...at(shoreLamp), physics: "static", primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.35, height: 1.9 }, material: STEEL,
    children: [
      { feetPosition: { x: 0, y: 1.9, z: 0 }, primitive: { kind: "box", width: 0.45, height: 0.28, depth: 0.22 }, material: { color: "oklch(0.88 0.12 85)", emissive: "oklch(0.9 0.14 85)", emissiveIntensity: 3 } },
      { feetPosition: { x: 0, y: 2.1, z: 0 }, light: { kind: "point", color: "oklch(0.86 0.11 85)", intensity: 1.6, distance: 14 } },
    ],
  });
  sp("l8-welcome", {
    ...at(P(38, 6.5, 1.0)), rotation: { yaw: P(38).yaw + 150 }, ...sign(2.8, 1.8, `${MEG}<div style="font-size:92px">WELCOME TO THE 9TH ROAD</div><div style="font-size:56px;color:#e8e0c0">« M.E.G. OUTPOST (8.7 MILES | 14 KM) »</div><div style="font-size:44px;color:#c8d8b8">Help is ahead! Stay strong.</div><div style="font-size:34px;opacity:.7;margin-top:6px">M.E.G. — Bettering Humanity</div></div>`),
    children: [
      { feetPosition: { x: -1.1, y: -1.0, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.06, height: 2.1 }, material: STEEL },
      { feetPosition: { x: 1.1, y: -1.0, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.06, height: 2.1 }, material: STEEL },
    ],
  });
  sp("l8-welcome-lamp", { feetPosition: { x: P(38, 5.2).x, y: P(38).y + 2.2, z: P(38, 5.2).z }, light: { kind: "point", color: "oklch(0.85 0.1 90)", intensity: 1.1, distance: 9 } });

  // ---- the markers: a plaque every 50 m mounted on steel stanchions with caged beacon bulbs; "stay on the road"
  for (let s = 50, n = 0; s <= 460; s += 50, n++) {
    const p = P(s, -(ST.hall.rx - 1.2), 1.55);
    sp(`l8-marker-${n}`, {
      ...at({ ...p, yaw: P(s).yaw - 90 }), ...sign(0.9, 0.5, `<div face="front" width="0.9m" style="font-family:Arial,sans-serif;font-weight:900;color:#f2d870;text-align:center;line-height:1.05"><div style="font-size:46px">9TH ROAD</div><div style="font-size:34px;color:#e8e0c0">MARKER #${82 - n}</div></div>`),
      children: [
        { feetPosition: { x: 0, y: -1.55, z: -0.04 }, primitive: { kind: "cylinder", radiusTop: 0.045, radiusBottom: 0.06, height: 1.8 }, material: STEEL },
        { feetPosition: { x: 0, y: 0.56, z: 0.04 }, primitive: { kind: "sphere", radius: 0.09 }, material: { color: "oklch(0.88 0.14 85)", emissive: "oklch(0.9 0.16 85)", emissiveIntensity: 2.8 } },
      ],
    });
    sp(`l8-marker-l-${n}`, { feetPosition: { x: p.x, y: p.y + 0.6, z: p.z }, light: { kind: "point", color: "oklch(0.82 0.12 90)", intensity: 0.65, distance: 7 } });
  }

  // ---- Station 2 & 3: the hall, the eerie Face Rock monolith, and the looping crawl (scripts/l8-use.js)
  // Marker #74 mounted prominently overhead directly in view of the loop return
  sp("l8-loop-sign", {
    ...at({ ...P(78, 0, 2.7), yaw: P(78).yaw + 180 }),
    ...sign(1.2, 0.65, `<div face="front" width="1.2m" style="font-family:Arial,sans-serif;font-weight:900;color:#f2d870;text-align:center;line-height:1.05"><div style="font-size:36px;color:#c8d8b8">▼ 9TH ROAD ▼</div><div style="font-size:56px;color:#fff;letter-spacing:2px">MARKER #74</div></div>`),
    visible: true, state: { loop: true },
    children: [
      { feetPosition: { x: -0.5, y: 0.55, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.035, radiusBottom: 0.035, height: 1.2 }, material: STEEL },
      { feetPosition: { x: 0.5, y: 0.55, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.035, radiusBottom: 0.035, height: 1.2 }, material: STEEL },
      { feetPosition: { x: 0, y: -0.42, z: 0.05 }, primitive: { kind: "sphere", radius: 0.1 }, material: { color: "oklch(0.88 0.16 85)", emissive: "oklch(0.9 0.18 85)", emissiveIntensity: 3.2 } },
    ],
  });
  sp("l8-loop-lamp", { feetPosition: { x: P(78).x, y: P(78).y + 2.9, z: P(78).z }, light: { kind: "point", color: "oklch(0.88 0.15 85)", intensity: 1.4, distance: 10 } });
  sp("l8-crawl-end", { ...at(P(154, 0, 1.0)), physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 2.6, height: 2.2, depth: 1.4 }, visible: false, behavior: "scripts/l8-use.js", state: { kind: "loop", back: P(72, 2, 0.2) } });

  // Sculpted Pareidolia "Face Rock" landmark with dramatic eerie shadow casting
  const fr = P(90, 7, 0.0);
  sp("l8-face-rock", {
    ...at({ ...fr, yaw: fr.yaw - 95 }), physics: "static", primitive: { kind: "dodecahedron", radius: 1.35 }, scale: { x: 0.95, y: 1.45, z: 0.85 }, material: FLOW_MAT,
    children: [
      { feetPosition: { x: 0, y: 1.75, z: 0.55 }, primitive: { kind: "box", width: 1.15, height: 0.28, depth: 0.45 }, material: ROCK }, // brow ridge
      { feetPosition: { x: -0.32, y: 1.42, z: 0.68 }, primitive: { kind: "sphere", radius: 0.22 }, material: TAR_ROCK }, // left eye socket
      { feetPosition: { x: 0.32, y: 1.42, z: 0.68 }, primitive: { kind: "sphere", radius: 0.22 }, material: TAR_ROCK },  // right eye socket
      { feetPosition: { x: 0, y: 1.05, z: 0.72 }, primitive: { kind: "cone", radius: 0.22, height: 0.68, radialSegments: 5 }, material: FLOW_MAT }, // nasal bridge
      { feetPosition: { x: 0, y: 0.62, z: 0.66 }, primitive: { kind: "box", width: 0.58, height: 0.26, depth: 0.35 }, material: TAR_ROCK }, // hollow stone mouth
    ],
  });
  sp("l8-face-lamp", { feetPosition: { x: fr.x - 2.4, y: fr.y + 0.8, z: fr.z + 1.5 }, light: { kind: "point", color: "oklch(0.72 0.08 240)", intensity: 1.6, distance: 12 } });

  // ---- Station 4: the flooded cavern: rising tide (scripts/l8-life.js), parkour stepping stones, tide gauge, and the Dead Caver on the high ledge
  const fl = P(176, 0, 0);
  sp("l8-flood", { tags: ["swimwater"], ...at({ ...fl, y: P(176).y - 0.5 }), primitive: { kind: "box", width: 30, height: 4.5, depth: 30 }, material: { kind: "water", color: "oklch(0.2 0.04 225)", opacity: 0.86, waveIntensity: 0.04 } });
  // Parkour stepping pillars & scramble ledges leading up out of the floodwaters to the Dead Caver's ledge
  [[166, -3.4, 0.6, 1.8], [171, -4.8, 1.15, 2.0], [177, -5.8, 1.7, 2.2], [183, -6.2, 2.2, 2.3], [189, -6.4, 2.6, 2.4]].forEach(([s, side, h, w], k) => {
    const sp0 = P(s, side, 0);
    sp(`l8-step-${k}`, { ...at(sp0), physics: "static", primitive: { kind: "cylinder", radiusTop: w * 0.52, radiusBottom: w * 0.65, height: h, radialSegments: 8 }, material: k % 2 ? FLOW_MAT : ROCK });
  });
  // Tide Depth Gauge Pole with warning beacon
  const gp = P(169, 3.6, 0);
  sp("l8-gauge", {
    ...at({ ...gp, yaw: gp.yaw + 180 }), physics: "static", primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.09, height: 3.8 }, material: { color: "oklch(0.75 0.16 80)", roughness: 0.5 },
    children: [
      { feetPosition: { x: 0, y: 2.6, z: 0.08 }, ...sign(0.65, 0.42, `<div face="front" width="0.65m" style="font-family:Arial,sans-serif;font-weight:900;color:#ff6a4a;text-align:center;line-height:1.05"><div style="font-size:38px">FLOOD GAUGE</div><div style="font-size:26px;color:#fff">HIGH TIDE: +3.5M · CLIMB LEFT</div></div>`) },
      { feetPosition: { x: 0, y: 3.8, z: 0 }, primitive: { kind: "sphere", radius: 0.12 }, material: { color: "oklch(0.65 0.22 30)", emissive: "oklch(0.7 0.24 28)", emissiveIntensity: 3 } },
      { feetPosition: { x: 0, y: 3.95, z: 0 }, light: { kind: "point", color: "oklch(0.68 0.22 30)", intensity: 1.1, distance: 9 } },
    ],
  });
  // Dead Caver in an orange caving suit with helmet, flickering headlamp beam, dual air tanks, and pack
  const cv = P(196, -6.5, 0.0), suitMat = { color: "oklch(0.62 0.18 52)", roughness: 0.78 };
  sp("l8-caver", {
    ...at({ ...cv, y: P(196).y + 2.9 }), rotation: { yaw: cv.yaw + 90 }, tags: ["container", "remains"],
    primitive: { kind: "box", width: 0.62, height: 0.85, depth: 0.42 }, material: suitMat,
    state: { name: "Dead caver (orange caving suit)", verb: "Search", info: "A dent in the helmet; not yet decayed. His headlamp still shines weakly across the wet stone.", items: "battery,battery,kit,ration,cloth:topw:jacket:ff7a1a,cloth:botw:pants:ff7a1a,cloth:shoes:boots:2b2b33" },
    children: [
      { feetPosition: { x: 0, y: 0.88, z: 0.04 }, primitive: { kind: "sphere", radius: 0.2 }, material: { color: "oklch(0.7 0.05 60)", roughness: 0.8 } }, // head
      { feetPosition: { x: 0, y: 0.98, z: 0.02 }, primitive: { kind: "sphere", radius: 0.23 }, material: { color: "oklch(0.82 0.15 85)", roughness: 0.35 } }, // caving helmet
      { feetPosition: { x: 0, y: 1.06, z: 0.24 }, primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.06, height: 0.08 }, rotation: { pitch: 90 }, material: { color: "#fff8d0", emissive: "#fff4b8", emissiveIntensity: 4 } }, // headlamp lens
      { feetPosition: { x: 0, y: 1.06, z: 0.55 }, light: { kind: "point", color: "oklch(0.92 0.08 85)", intensity: 1.8, distance: 10 } },
      { feetPosition: { x: -0.18, y: -0.02, z: 0.48 }, primitive: { kind: "box", width: 0.22, height: 0.2, depth: 0.72 }, material: suitMat }, // left leg
      { feetPosition: { x: 0.18, y: -0.02, z: 0.48 }, primitive: { kind: "box", width: 0.22, height: 0.2, depth: 0.72 }, material: suitMat },  // right leg
      { feetPosition: { x: -0.36, y: 0.18, z: 0.16 }, primitive: { kind: "box", width: 0.16, height: 0.58, depth: 0.18 }, rotation: { pitch: -25 }, material: suitMat }, // left arm
      { feetPosition: { x: 0.36, y: 0.18, z: 0.16 }, primitive: { kind: "box", width: 0.16, height: 0.58, depth: 0.18 }, rotation: { pitch: -25 }, material: suitMat },  // right arm
      { feetPosition: { x: -0.14, y: 0.22, z: -0.26 }, primitive: { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.09, height: 0.58 }, material: STEEL }, // O2 tank L
      { feetPosition: { x: 0.14, y: 0.22, z: -0.26 }, primitive: { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.09, height: 0.58 }, material: STEEL },  // O2 tank R
      { feetPosition: { x: 0.52, y: 0, z: 0.45 }, primitive: { kind: "box", width: 0.38, height: 0.48, depth: 0.28 }, material: { color: "oklch(0.32 0.05 110)", roughness: 0.85 } }, // pack
    ],
  });

  // ---- Station 5: Hyperspace Lane: glowing fungi, cold stream with stepping stones, stone kazoo shrine, and harmonic resonance altar
  for (const [id, d] of Object.entries(DEFS)) sp(id, d.spec);
  sp("l8-stream", { ...at({ ...P(244, 0, 0), y: P(244).y + 0.05 }), primitive: { kind: "box", width: 2.4, height: 0.12, depth: 46 }, material: { kind: "water", color: "oklch(0.3 0.05 215)", opacity: 0.8, waveIntensity: 0.08 } });
  // Carved stone shrine around the Stone Kazoo
  const kzP = P(262, 6.5, 0);
  sp("l8-shrine", {
    ...at({ ...kzP, yaw: kzP.yaw - 90 }), physics: "static", primitive: { kind: "cylinder", radiusTop: 0.45, radiusBottom: 0.58, height: 0.52, radialSegments: 8 }, material: FLOW_MAT,
    children: [
      { feetPosition: { x: -0.48, y: 0, z: -0.1 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.16, height: 1.55, radialSegments: 7 }, material: ROCK },
      { feetPosition: { x: 0.48, y: 0, z: -0.1 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.16, height: 1.55, radialSegments: 7 }, material: ROCK },
      { feetPosition: { x: 0, y: 1.48, z: -0.1 }, primitive: { kind: "box", width: 1.25, height: 0.22, depth: 0.42 }, material: FLOW_MAT },
      { feetPosition: { x: 0, y: 0.9, z: 0.1 }, light: { kind: "point", color: "oklch(0.78 0.14 190)", intensity: 1.2, distance: 7 } },
    ],
  });
  sp("l8-kazoo", {
    ...at(P(262, 6.5, 0.54)), tags: ["usable"], primitive: { kind: "box", width: 0.22, height: 0.09, depth: 0.12 }, material: { color: "oklch(0.65 0.04 88)", roughness: 0.75 }, behavior: "scripts/l8-use.js",
    state: { kind: "kazoo", name: "Stone kazoo", verb: "Take", info: "Cold, rough and jagged. Carved with acoustic holes that hum in the draft.", tint: "#bfb89c" },
  });
  // Interactive Harmonic Resonance Altar in Hyperspace Lane
  const altP = P(242, -5.2, 0);
  sp("l8-altar", {
    ...at({ ...altP, yaw: altP.yaw + 90 }), tags: ["usable"], physics: "static", behavior: "scripts/l8-use.js",
    primitive: { kind: "cylinder", radiusTop: 0.55, radiusBottom: 0.72, height: 0.95, radialSegments: 8 }, material: FLOW_MAT,
    fx: { script: SPORE_FX },
    state: { kind: "altar", name: "Acoustic stone pipes", verb: "Hum into the stone", info: "Hollow flowstone flutes carved by the Harmouth Society. They resonate with the blue-green light guides.", tint: "#7cf0e4" },
    children: [
      { feetPosition: { x: -0.22, y: 0.9, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.11, height: 0.85 }, material: BIOLUM_MAT },
      { feetPosition: { x: 0, y: 0.9, z: -0.08 }, primitive: { kind: "cylinder", radiusTop: 0.1, radiusBottom: 0.12, height: 1.15 }, material: BIOLUM_MAT },
      { feetPosition: { x: 0.22, y: 0.9, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.11, height: 0.75 }, material: BIOLUM_MAT },
    ],
  });

  // ---- almond water: mineral-rimmed rock basins in every chamber, generally safe to drink (a little bitter)
  [[56, 3], [86, -4], [170, 5], [232, 4], [296, -5], [360, 5], [424, -5]].forEach(([s, side], i) => sp(`l8-pool-${i}`, {
    ...at(P(s, side, 0.05)), tags: ["usable"], primitive: { kind: "cylinder", radiusTop: 0.92, radiusBottom: 1.05, height: 0.12 },
    material: { kind: "water", color: "oklch(0.55 0.08 90)", opacity: 0.82, waveIntensity: 0.03 },
    behavior: "scripts/l8-use.js", state: { kind: "pool", name: "Almond water pool", verb: "Drink", info: "Cold and bitter with harmless minerals. Do not bathe in it.", tint: "#d8d098" },
    children: [{ feetPosition: { x: 0, y: 0.02, z: 0 }, primitive: { kind: "torus", radius: 0.96, tube: 0.11 }, rotation: { pitch: 90 }, material: FLOW_MAT }],
  }));

  // ---- Station 6: the spider nest: 3D radial silk web spans across the chamber and the glowing red warning glyph
  const webMat = { color: "oklch(0.92 0.01 240)", opacity: 0.34, transparent: true, roughness: 1 };
  for (let k = 0; k < 14; k++) {
    const s = 286 + k * 4.5, side = ((k * 7) % 11) - 5, up = 1.6 + (k % 4) * 1.0, w = 3.4 + (k % 3);
    sp(`l8-web-${k}`, {
      ...at({ ...P(s, side, up), yaw: P(s).yaw + k * 23 }), primitive: { kind: "cylinder", radiusTop: 0.025, radiusBottom: 0.025, height: w * 1.3 }, rotation: { yaw: P(s).yaw + k * 23, roll: 52 }, material: webMat,
      children: [
        { feetPosition: { x: 0, y: 1.2, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.025, radiusBottom: 0.025, height: w * 1.3 }, rotation: { roll: -104 }, material: webMat },
        { feetPosition: { x: 0, y: 1.2, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.02, radiusBottom: 0.02, height: w * 1.1 }, rotation: { pitch: 90 }, material: webMat },
        { feetPosition: { x: 0, y: 1.2, z: 0 }, primitive: { kind: "torus", radius: w * 0.28, tube: 0.018 }, rotation: { pitch: 90 }, material: webMat },
        { feetPosition: { x: 0, y: 1.2, z: 0 }, primitive: { kind: "torus", radius: w * 0.48, tube: 0.016 }, rotation: { pitch: 90 }, material: webMat },
      ],
    });
  }
  sp("l8-glyph", { ...at({ ...P(278, -2.6, 1.6), yaw: P(278).yaw + 90 }), ...sign(1.3, 1.3, `<div face="front" width="1.3m" style="font-family:serif;font-weight:900;color:#ff5a4a;text-align:center;font-size:120px;line-height:1;text-shadow:0 0 18px #ff2a1a">⛧<div style="font-size:30px;font-family:Arial,sans-serif">NEVER ENTER</div></div>`, "oklch(0.09 0.01 20)"), children: [{ feetPosition: { x: 0, y: 0, z: 0.4 }, light: { kind: "point", color: "oklch(0.6 0.22 25)", intensity: 1.2, distance: 6.5 } }] });

  // ---- Station 7: the boiling tar pool, fume FX, and the B.N.T.G. Tar Dredge Winch
  const tp = P(376, 0, 0.04);
  sp("l8-tar", {
    ...at(tp), primitive: { kind: "cylinder", radiusTop: 3.45, radiusBottom: 3.55, height: 0.14 }, material: { color: "oklch(0.06 0.008 280)", roughness: 0.1, metalness: 0.3 },
    fx: { script: TAR_FX }, state: { c: { x: tp.x, z: tp.z } },
    children: [
      { feetPosition: { x: 0, y: 0.04, z: 0 }, primitive: { kind: "torus", radius: 3.5, tube: 0.22 }, rotation: { pitch: 90 }, material: TAR_ROCK },
      { feetPosition: { x: 0, y: 0.5, z: 0 }, light: { kind: "point", color: "oklch(0.55 0.16 40)", intensity: 0.9, distance: 9 } },
    ],
  });
  sp("l8-tar-warn", { ...at({ ...P(364, 3, 1.1), yaw: P(364).yaw + 180 }), ...sign(0.8, 0.5, `<div face="front" width="0.8m" style="font-family:Arial,sans-serif;font-weight:900;color:#ff9a4a;text-align:center;font-size:50px;line-height:1">TAR<div style="font-size:30px">KEEP BACK · IT IS HOT</div></div>`) });
  // B.N.T.G. Tar Dredge Winch & Timber Catwalk overlooking the Tar Pool
  const drP = P(370, -4.4, 0.05);
  sp("l8-dredge", {
    ...at({ ...drP, yaw: drP.yaw + 65 }), tags: ["usable"], physics: "static", behavior: "scripts/l8-use.js",
    primitive: { kind: "box", width: 2.2, height: 0.18, depth: 2.6 }, material: WOOD,
    state: { kind: "dredge", name: "B.N.T.G. tar dredge winch", verb: "Haul the dredge line", info: "A hand-cranked cable winch over the edge of the boiling tar. Prospectors use it to fish up pitch and sunken gear without stepping into reach of the hands.", tint: "#ffb86c" },
    children: [
      { feetPosition: { x: -0.75, y: 0.18, z: 0.8 }, primitive: { kind: "box", width: 0.14, height: 1.5, depth: 0.14 }, material: WOOD },
      { feetPosition: { x: 0.75, y: 0.18, z: 0.8 }, primitive: { kind: "box", width: 0.14, height: 1.5, depth: 0.14 }, material: WOOD },
      { feetPosition: { x: 0, y: 1.58, z: 0.8 }, primitive: { kind: "box", width: 1.75, height: 0.16, depth: 0.16 }, material: WOOD },
      { feetPosition: { x: 0, y: 0.85, z: 0.8 }, primitive: { kind: "cylinder", radiusTop: 0.22, radiusBottom: 0.22, height: 1.35 }, rotation: { roll: 90 }, material: RUST }, // winch drum
      { feetPosition: { x: 0, y: 1.65, z: 1.35 }, primitive: { kind: "box", width: 0.14, height: 0.14, depth: 1.4 }, material: STEEL }, // crane boom
      { feetPosition: { x: 0, y: 0.35, z: 1.95 }, primitive: { kind: "cylinder", radiusTop: 0.025, radiusBottom: 0.025, height: 1.3 }, material: STEEL }, // cable
      { feetPosition: { x: 0, y: 1.9, z: 0.8 }, light: { kind: "point", color: "oklch(0.82 0.14 75)", intensity: 1.4, distance: 8 } },
    ],
  });

  // ---- Station 8: the 9th Road Camp round the fire: stone hearth, flame FX, cooking tripod, pitched A-frame tents, radio desk, and Carla
  const cf = P(436, 0, 0.05);
  sp("l8-fire", {
    ...at(cf), tags: ["usable"], primitive: { kind: "cylinder", radiusTop: 0.62, radiusBottom: 0.72, height: 0.18 }, material: { color: "oklch(0.22 0.03 40)", roughness: 0.95 },
    fx: { script: FIRE_FX }, behavior: "scripts/l8-use.js",
    state: { kind: "fire", name: "Camp fire", verb: "Warm up", info: "Dry yourself. Rest a while.", tint: "#ffb066" },
    children: [
      { feetPosition: { x: 0, y: 0.08, z: 0 }, primitive: { kind: "torus", radius: 0.68, tube: 0.16 }, rotation: { pitch: 90 }, material: ROCK },
      { feetPosition: { x: 0, y: 0.18, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.1, height: 0.95 }, rotation: { pitch: 72, yaw: 25 }, material: WOOD },
      { feetPosition: { x: 0, y: 0.18, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.1, height: 0.95 }, rotation: { pitch: 72, yaw: 115 }, material: WOOD },
      { feetPosition: { x: 0, y: 0.15, z: 0 }, primitive: { kind: "sphere", radius: 0.32 }, scale: { x: 1.2, y: 0.5, z: 1.2 }, material: { color: "oklch(0.75 0.2 45)", emissive: "oklch(0.82 0.22 50)", emissiveIntensity: 3.5 } },
      { feetPosition: { x: 0, y: 1.0, z: 0 }, light: { kind: "point", color: "oklch(0.78 0.17 55)", intensity: 5.5, distance: 26 } },
    ],
  });
  sp("l8-pot", {
    ...at(P(436, 1.45, 0.08)), tags: ["usable"], primitive: { kind: "cylinder", radiusTop: 0.38, radiusBottom: 0.32, height: 0.44 },
    material: { color: "oklch(0.26 0.02 250)", metalness: 0.75, roughness: 0.45 }, fx: { script: STEAM_FX }, behavior: "scripts/l8-use.js",
    state: { kind: "soup", name: "Pot of soup", verb: "Buy a bowl ($3)", info: "The cook's pot. Eat it, or throw it.", tint: "#e8c070" },
    children: [
      { feetPosition: { x: 0, y: 0.39, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.35, radiusBottom: 0.35, height: 0.06 }, material: { color: "oklch(0.62 0.12 75)", roughness: 0.3 } }, // broth
      { feetPosition: { x: -0.35, y: 0, z: -0.25 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.04, height: 1.45 }, rotation: { pitch: 16, roll: -18 }, material: STEEL },
      { feetPosition: { x: 0.35, y: 0, z: -0.25 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.04, height: 1.45 }, rotation: { pitch: 16, roll: 18 }, material: STEEL },
      { feetPosition: { x: 0, y: 0, z: 0.42 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.04, height: 1.45 }, rotation: { pitch: -20 }, material: STEEL },
    ],
  });
  // Pitched A-frame canvas survivor tents with ridge poles, bedrolls, and warm lanterns
  const tentColors = ["oklch(0.44 0.07 65)", "oklch(0.38 0.06 150)", "oklch(0.46 0.09 35)", "oklch(0.36 0.05 245)"];
  [[-6.2, 5, 0.7], [-5.4, -6, 0.5], [6.2, -5, 0.6], [5.4, 6, 0.4]].forEach(([side, dz], i) => {
    const tp0 = P(436 + dz, side, 0.05), canvas = { color: tentColors[i], roughness: 0.92 };
    sp(`l8-tent-${i}`, {
      ...at({ ...tp0, yaw: P(436).yaw + i * 70 + 35 }), physics: "static",
      primitive: { kind: "box", width: 2.3, height: 0.12, depth: 2.8 }, material: { color: "oklch(0.24 0.03 60)", roughness: 0.95 }, // ground tarp
      children: [
        { feetPosition: { x: -0.56, y: 0.08, z: 0 }, primitive: { kind: "box", width: 0.08, height: 1.95, depth: 2.75 }, rotation: { roll: -34 }, material: canvas }, // left roof slope
        { feetPosition: { x: 0.56, y: 0.08, z: 0 }, primitive: { kind: "box", width: 0.08, height: 1.95, depth: 2.75 }, rotation: { roll: 34 }, material: canvas },  // right roof slope
        { feetPosition: { x: 0, y: 0.1, z: -1.32 }, primitive: { kind: "cone", radius: 1.12, height: 1.62, radialSegments: 4 }, rotation: { yaw: 45 }, material: canvas }, // rear gable flap
        { feetPosition: { x: 0, y: 0.08, z: 1.32 }, primitive: { kind: "cylinder", radiusTop: 0.045, radiusBottom: 0.05, height: 1.68 }, material: WOOD }, // front pole
        { feetPosition: { x: 0, y: 0.08, z: -1.32 }, primitive: { kind: "cylinder", radiusTop: 0.045, radiusBottom: 0.05, height: 1.68 }, material: WOOD }, // rear pole
        { feetPosition: { x: 0, y: 1.66, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.04, height: 2.85 }, rotation: { pitch: 90 }, material: WOOD }, // ridge beam
        { feetPosition: { x: -0.35, y: 0.12, z: -0.1 }, primitive: { kind: "box", width: 0.78, height: 0.18, depth: 1.85 }, material: { color: "oklch(0.52 0.09 45)", roughness: 0.9 } }, // sleeping bag
        { feetPosition: { x: 0, y: 1.42, z: 1.36 }, primitive: { kind: "sphere", radius: 0.09 }, material: { color: "#ffd890", emissive: "#ffbe60", emissiveIntensity: 2.5 } }, // lantern
      ],
    });
  });
  // Harmouth Field Radio & Survey Desk at the camp
  const radP = P(442, 5.2, 0.05);
  sp("l8-radio", {
    ...at({ ...radP, yaw: radP.yaw - 110 }), tags: ["usable"], physics: "static", behavior: "scripts/l8-use.js",
    primitive: { kind: "box", width: 1.25, height: 0.82, depth: 0.72 }, material: WOOD,
    state: { kind: "radio", name: "Harmouth field transceiver", verb: "Tune transceiver", info: "A shortwave cave-induction radio wired to a copper ground spike. It picks up Harmouth survey logs and M.E.G. outpost telemetry.", tint: "#88e8a0" },
    children: [
      { feetPosition: { x: -0.15, y: 0.82, z: 0 }, primitive: { kind: "box", width: 0.52, height: 0.34, depth: 0.38 }, material: { color: "oklch(0.28 0.04 145)", roughness: 0.5, metalness: 0.6 } },
      { feetPosition: { x: -0.15, y: 0.92, z: 0.2 }, primitive: { kind: "box", width: 0.28, height: 0.12, depth: 0.02 }, material: { color: "oklch(0.75 0.16 145)", emissive: "oklch(0.8 0.18 145)", emissiveIntensity: 2.5 } },
      { feetPosition: { x: 0.05, y: 1.15, z: -0.1 }, primitive: { kind: "cylinder", radiusTop: 0.01, radiusBottom: 0.02, height: 1.1 }, material: STEEL },
      { feetPosition: { x: -0.15, y: 1.15, z: 0.25 }, light: { kind: "point", color: "oklch(0.75 0.16 145)", intensity: 0.9, distance: 5 } },
    ],
  });
  sp("l8-camp-sign", { ...at({ ...P(414, 4.5, 1.4), yaw: P(414).yaw + 160 }), ...sign(2.0, 1.1, `${MEG}<div style="font-size:70px">9TH ROAD CAMP</div><div style="font-size:42px;color:#e8e0c0">M.E.G. · B.N.T.G. · HARMOUTH SOCIETY</div><div style="font-size:34px;color:#c8d8b8">hot meals · a place to rest · guides for hire</div></div>`) });
  sp("l8-from-camp", at(P(424, -2, 0.1)));

  // ---- Station 9: Physical terrain transition at the end of the Road:
  // 1. Rock to Sand & Rubble (s = 464..472)
  sp("l8-rubble-1", { ...at(P(465, -1.2, 0.02)), primitive: { kind: "box", width: 3.8, height: 0.12, depth: 4.5 }, material: { color: "oklch(0.34 0.03 62)", roughness: 0.95 } });
  sp("l8-rubble-2", { ...at(P(468, 1.4, 0.02)), primitive: { kind: "box", width: 3.4, height: 0.14, depth: 4.0 }, material: { color: "oklch(0.31 0.03 65)", roughness: 0.95 } });
  sp("l8-survey-stake", {
    ...at(P(466, 3.2, 0)), primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.03, height: 1.2 }, material: WOOD,
    children: [{ feetPosition: { x: 0, y: 1.05, z: 0.1 }, primitive: { kind: "box", width: 0.02, height: 0.16, depth: 0.26 }, material: { color: "#f2d870" } }],
  });

  // 2. Sand to Crushed Gravel Roadbed with Weathered Timber Curbs (s = 472..482)
  sp("l8-gravel", { ...at(P(476, 0, 0.03)), primitive: { kind: "box", width: 7.4, height: 0.14, depth: 10.5 }, material: { color: "oklch(0.26 0.02 70)", roughness: 0.98 } });
  sp("l8-curb-l", { ...at(P(476, -3.5, 0.12)), primitive: { kind: "box", width: 0.26, height: 0.22, depth: 10.2 }, material: WOOD });
  sp("l8-curb-r", { ...at(P(476, 3.5, 0.12)), primitive: { kind: "box", width: 0.26, height: 0.22, depth: 10.2 }, material: WOOD });

  // 3. Gravel to Asphalt with Painted Yellow Center Line Dashes (s = 484..504)
  const asp = P(492, 0, -0.04);
  sp("l8-asphalt", {
    ...at({ ...asp, y: P(492).y - 0.04 }), primitive: { kind: "box", width: 8.5, height: 0.14, depth: 26 }, material: { color: "oklch(0.18 0.005 260)", roughness: 0.92 }, physics: "static",
    children: [-10, -5, 0, 5, 10].map((dz) => ({
      feetPosition: { x: 0, y: 0.08, z: dz }, primitive: { kind: "box", width: 0.2, height: 0.02, depth: 2.8 }, material: { color: "oklch(0.8 0.18 85)", roughness: 0.65 },
    })),
  });

  // 4. Highway Guardrail along the shoulder
  const gr = P(492, 3.8, 0.1);
  sp("l8-guardrail", {
    ...at({ ...gr, yaw: gr.yaw }), physics: "static",
    primitive: { kind: "box", width: 0.12, height: 0.42, depth: 18 }, material: STEEL,
    children: [-7, -3.5, 0, 3.5, 7].map((dz) => ({
      feetPosition: { x: 0.05, y: -0.42, z: dz }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.05, height: 0.85 }, material: STEEL,
    })),
  });

  // 5. M.E.G. Road Hazard Barricade with flashing warning beacon (s = 489)
  const bPos = P(489, -1.2, 0.08);
  sp("l8-barricade", {
    ...at({ ...bPos, yaw: bPos.yaw + 180 }), physics: "static",
    children: [
      { feetPosition: { x: -0.85, y: 0.45, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.05, height: 1.0 }, material: WOOD },
      { feetPosition: { x: 0.85, y: 0.45, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.05, height: 1.0 }, material: WOOD },
      { feetPosition: { x: 0, y: 0.72, z: 0.04 }, ...sign(1.9, 0.55, `<div face="front" width="1.9m" style="font-family:Arial,sans-serif;font-weight:900;color:#fff;text-align:center;line-height:1.1"><div style="background:#b32400;padding:4px;font-size:42px">ROAD CLOSED</div><div style="color:#ffc850;font-size:26px;margin-top:2px">ABNORMAL TOPOLOGY · DO NOT CROSS</div></div>`) },
      { feetPosition: { x: 0, y: 1.15, z: 0 }, primitive: { kind: "sphere", radius: 0.1 }, material: { color: "#ffb020", emissive: "#ffa000", emissiveIntensity: 3.5 } },
      { feetPosition: { x: 0, y: 1.25, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.18 70)", intensity: 1.8, distance: 9 } },
    ],
  });

  // 6. Vintage Suburban Sodium Streetlight (s = 496)
  const sl = P(496, 3.7, 0.05);
  sp("l8-streetlight", {
    ...at({ ...sl, yaw: sl.yaw - 90 }), physics: "static",
    primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.11, height: 5.6 }, material: STEEL,
    children: [
      { feetPosition: { x: 1.1, y: 5.4, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.05, height: 2.4 }, rotation: { roll: -60 }, material: STEEL }, // mast arm
      { feetPosition: { x: 2.1, y: 5.85, z: 0 }, primitive: { kind: "box", width: 0.34, height: 0.18, depth: 0.65 }, material: STEEL }, // cobrahead housing
      { feetPosition: { x: 2.1, y: 5.74, z: 0 }, primitive: { kind: "box", width: 0.24, height: 0.04, depth: 0.42 }, material: { color: "#ffc860", emissive: "#ffa520", emissiveIntensity: 4.8 } }, // sodium lens
      { feetPosition: { x: 2.1, y: 5.5, z: 0 }, light: { kind: "point", color: "oklch(0.84 0.19 72)", intensity: 6.2, distance: 34 } },
    ],
  });

  // 7. Highway exit sign & suburban threshold glow (s = 502)
  const endSign = P(498, 3.4, 0);
  sp("l8-end-sign", {
    ...at({ ...endSign, yaw: endSign.yaw + 165 }), physics: "static", primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.06, height: 2.4 }, material: STEEL,
    children: [
      { feetPosition: { x: 0, y: 1.85, z: 0 }, ...sign(1.6, 0.75, `<div face="front" width="1.6m" style="font-family:Arial,sans-serif;font-weight:900;color:#fff;text-align:center;line-height:1.1"><div style="font-size:48px">LEVEL 9 · THE SUBURBS</div><div style="font-size:32px;color:#cfe8d8">NEXT EXIT · WATCH FOR NEIGHBORS</div></div>`, "oklch(0.28 0.08 155)") },
    ],
  });
  sp("l8-glow", { feetPosition: { x: P(502).x, y: P(502).y + 1.4, z: P(502).z }, primitive: { kind: "box", width: 3.2, height: 3.2, depth: 0.2 }, material: { color: "#fff6e0", emissive: "#fff0d0", emissiveIntensity: 3.5 }, children: [{ feetPosition: { x: 0, y: 0, z: 1.5 }, light: { kind: "point", color: "oklch(0.95 0.05 85)", intensity: 6.0, distance: 35 } }] });
  sp("l8-exit", { ...at(P(500, 0, 1.2)), physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 5, height: 2.6, depth: 1.2 }, visible: false, behavior: "scripts/l8-use.js", state: { kind: "exit", back: P(436, -4, 0.3) } });

  // ---- stuff to do: detailed supply crates to search, a workbench with tools, and an errand board at the camp (scripts/l8-use.js)
  const cache = (id, p, name, info, items, color = "oklch(0.35 0.05 120)") => sp(id, {
    ...at(p), tags: ["container", "breakable"], physics: "static", primitive: { kind: "box", width: 0.92, height: 0.58, depth: 0.56 },
    material: { color, roughness: 0.65, metalness: 0.35 }, state: { ...brk("metal", 120, name), name, verb: "Search", info, items },
    children: [
      { feetPosition: { x: 0, y: 0.54, z: 0 }, primitive: { kind: "box", width: 0.96, height: 0.09, depth: 0.6 }, material: STEEL },
      { feetPosition: { x: 0, y: 0.42, z: 0.29 }, primitive: { kind: "box", width: 0.16, height: 0.14, depth: 0.04 }, material: { color: "oklch(0.75 0.14 85)", metalness: 0.7 } },
    ],
  });
  cache("l8-cache-hall", P(64, 6.8, 0), "Harmouth Society cache", "A survey crate, lid pried and nailed back. Chalk on the lid: HALL 1.", "ration,bandage,bandage,almond,kit,battery");
  cache("l8-cache-lane", P(252, -6.4, 0), "Abandoned survey pack", "Left by someone who did not want to carry it any further.", "battery,battery,almond,cloth:hat:cap:3a302a,ration", "oklch(0.3 0.05 60)");
  cache("l8-cache-nest", P(336, 7.2, 0), "Expedition locker", "A hard case. The spiders have not worked out the latch.", "ammo,ammo,shells,firstaid,bandage,kit", "oklch(0.32 0.03 250)");
  cache("l8-cache-camp", P(428, -6.0, 0), "M.E.G. supply locker", "Stencilled: M.E.G. Bettering Humanity. The padlock is a joke.", "ammo,ammo,ammo,shells,bandage,bandage,firstaid,battery,kit", "oklch(0.3 0.04 150)");
  const diveBag = P(14, 4.0, 0.1);
  sp("l8-cache-lake", {
    ...at({ ...diveBag, y: -2.2 }), tags: ["container"], physics: "static", primitive: { kind: "box", width: 0.72, height: 0.42, depth: 0.52 }, material: { color: "oklch(0.32 0.06 230)", roughness: 0.85 },
    state: { name: "Sunken dive bag", verb: "Search", info: "On the lake bed, snagged on a rock. Someone swam out and did not swim back.", items: "battery,almond,almond,bandage,cash:2500" },
  });
  sp("l8-bench", {
    ...at({ ...P(428, 5.4, 0.05), yaw: P(428).yaw + 180 }), tags: ["bench"], primitive: { kind: "box", width: 1.7, height: 0.9, depth: 0.85 }, material: WOOD, physics: "static", state: { name: "9th Road workbench" },
    children: [
      { feetPosition: { x: 0, y: 0.88, z: -0.36 }, primitive: { kind: "box", width: 1.65, height: 0.75, depth: 0.08 }, material: STEEL }, // pegboard
      { feetPosition: { x: -0.55, y: 0.9, z: 0.25 }, primitive: { kind: "box", width: 0.26, height: 0.22, depth: 0.28 }, material: RUST }, // bench vice
      { feetPosition: { x: 0.45, y: 0.9, z: 0.1 }, primitive: { kind: "box", width: 0.42, height: 0.24, depth: 0.26 }, material: { color: "oklch(0.45 0.16 30)", metalness: 0.6 } }, // toolbox
      { feetPosition: { x: 0, y: 1.75, z: 0 }, light: { kind: "point", color: "oklch(0.88 0.12 80)", intensity: 2.5, distance: 10 } },
    ],
  });
  sp("l8-board", {
    ...at({ ...P(446, -5.2, 1.3), yaw: P(446).yaw + 20 }), tags: ["usable"], behavior: "scripts/l8-use.js", ...sign(1.5, 1.1, `<div face="front" width="1.5m" style="font-family:Arial,sans-serif;font-weight:900;color:#e8e0c0;text-align:center;line-height:1.1"><div style="font-size:64px;color:#f2d870">ERRANDS</div><div style="font-size:34px">bring it back to the camp · we pay</div><div style="font-size:28px;color:#c8d8b8">glow caps · chitin · pitch · flowstone · ironstone</div></div>`),
    state: { kind: "board", name: "Errand board", verb: "Read", info: "Jobs the camp needs doing. Pay on delivery.", tint: "#f2d870" },
    children: [
      { feetPosition: { x: -0.62, y: -1.3, z: -0.04 }, primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.06, height: 1.6 }, material: WOOD },
      { feetPosition: { x: 0.62, y: -1.3, z: -0.04 }, primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.06, height: 1.6 }, material: WOOD },
    ],
  });
  // ---- the way you can come from Level 2.1: a rough concrete tunnel mouth in the hall's wall, where the cave of The Edges runs out (scripts/level-door.js)
  const tm = P(46, -8.4, 0);
  sp("l8-from-l21", at(P(46, -5.4, 0.1), { rotation: { yaw: P(46).yaw + 90 } }));
  sp("l8-to-l21", { ...at(P(46, -8.9, 0)), physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 1.8, height: 2.6, depth: 1.8 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level21#l21-from-l8" } });
  sp("l8-l21-frame", { ...at({ ...tm, y: tm.y + 1.15, yaw: P(46).yaw + 90 }), primitive: { kind: "box", width: 2.3, height: 2.5, depth: 0.5 }, material: { color: "oklch(0.58 0.01 100)", roughness: 0.95 } });
  sp("l8-l21-dark", { ...at({ ...P(46, -8.75, 1.15), yaw: P(46).yaw + 90 }), primitive: { kind: "box", width: 1.5, height: 2.2, depth: 0.1 }, material: { color: "#050505" } });
  sp("l8-l21-sign", { ...at({ ...P(46, -8.2, 2.9), yaw: P(46).yaw - 90 }), ...sign(1.7, 0.45, `<div face="front" width="1.7m" style="font-family:Arial,sans-serif;font-weight:900;color:#d8f0c0;text-align:center;line-height:1.05"><div style="font-size:62px">CONCRETE TUNNEL</div><div style="font-size:34px">back to Level 2.1</div></div>`, "oklch(0.2 0.03 150)") });
  sp("l8-life", { behavior: "scripts/l8-life.js" });
}

export function tick(ctx) {
  const s = ctx.place.state;
  if ((s.builtV ?? 0) < V) { s.builtV = V; lay(ctx); }
  if (!ctx.getObject("l8-life")) ctx.spawn("l8-life", { behavior: "scripts/l8-life.js" });
  if (!s.campV || s.campV < 2) {
    s.campV = 2;
    for (const id of Object.keys(CAMP)) {
      if (ctx.place.objects[id] || ctx.getObject(id)) ctx.destroy(id);
    }
    spawnCamp(ctx);
  }
  if (ctx.now() > (s.campAt ?? 0)) { s.campAt = ctx.now() + 10000; if (Object.keys(CAMP).some((id) => !ctx.place.objects[id])) spawnCamp(ctx); } // anyone missing from the camp walks back in
  if ((s.denV ?? 0) < DEN_V) { s.denV = DEN_V; layDens(ctx); }
  keepWretched(ctx);
  tickChatter(ctx, CHATTER.level8, { "l8-hobb": "hollis", "l8-wen": "mags", "l8-ivo": "reyes", "l8-marit": "wren", "l8-carla-kid": "penny" }); // the camp talks among itself
  // what was harvested grows back: caps in a couple of minutes, cocoons and stone in a few more
  const now = ctx.now(), gone = { ...(s.regrow ?? {}) };
  let ch = false;
  for (const [id, d] of Object.entries(DEFS)) {
    if (ctx.getObject(id)) { if (gone[id] != null) { delete gone[id]; ch = true; } continue; }
    if (gone[id] == null) { gone[id] = now + d.delay * 1000; ch = true; } else if (now >= gone[id]) { ctx.spawn(id, d.spec); delete gone[id]; ch = true; }
  }
  if (ch) s.regrow = gone;
}

// the people of the camp: survivors round the fire (they fight what comes at them), and Carla
const CAMP = {
  "l8-hobb": { name: "Hobb · 9th Road Camp", voice: "hollis", gun: "crowbar", sp: "bear", sex: "m", eye: "#6a4a2a", at: [-2.6, 0], top: "#3a5a4a" },
  "l8-wen": { name: "Wen · 9th Road Camp", voice: "mags", gun: "knife", sp: "fox", sex: "f", eye: "#2fa36b", at: [3.0, 1.5], top: "#8a3a3a" },
  "l8-ivo": { name: "Ivo · 9th Road Camp (Harmouth)", voice: "reyes", gun: "pistol", sp: "wolf", sex: "m", eye: "#3f7fd9", at: [0, 3.2], top: "#d8a030" },
  "l8-marit": { name: "Marit · 9th Road Camp", voice: "wren", gun: "bat", sp: "sheep", sex: "f", eye: "#8a4fd8", at: [-3.2, -2.6], top: "#4a4a6a" },
  "l8-carla-kid": { name: "Carla", voice: "penny", gun: null, sp: "bunny", sex: "f", eye: "#2a1c14", at: [1.2, -1.2], top: "#c9b88a", child: true },
};
function spawnCamp(ctx) {
  Promise.all([import("../../scripts/lib/critter-model.js"), import("../../scripts/lib/clothes.js"), import("../../scripts/lib/stats.js"), import("../../scripts/lib/weapon-look.js")]).then(([{ critterSpec }, { npcLook }, { npcState }, { weaponBody }]) => {
    const cf = P(436, 0, 0.1);
    for (const [id, g] of Object.entries(CAMP)) {
      if (ctx.place.objects[id]) continue;
      const isCarla = id === "l8-carla-kid";
      const x = cf.x + g.at[0], z = cf.z + g.at[1], look = { species: g.sp, sex: g.sex, eye: g.eye, topw: "sweater", top: g.top, botw: g.child ? "overalls" : "pants", bottom: "#33332a", shoes: "boots", shoec: "#2a2018" };
      ctx.spawn(id, {
        tags: ["npc", "l8-npc", ...(isCarla ? ["usable"] : [])],
        feetPosition: { x, y: cf.y + 0.3, z },
        rotation: { yaw: 0 },
        physics: "character",
        ...critterSpec(npcLook(id, look, "survivor", 8)),
        ...(g.child ? { scale: { x: 0.68, y: 0.68, z: 0.68 } } : {}),
        behavior: isCarla
          ? ["scripts/humanoid-locomotion.js", "scripts/l8-use.js"]
          : ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
        state: {
          name: g.name,
          role: "survivor",
          voice: g.voice,
          faction: "camp",
          factionName: "the 9th Road camp: M.E.G. operatives, B.N.T.G. traders and the Harmouth Speleological Society",
          rounds: [{ x, y: cf.y + 0.3, z, dwell: 40, act: null, look: { x: cf.x, z: cf.z } }],
          ri: 0,
          nerve: g.child ? "coward" : "steady",
          home: { x, z },
          ...npcState(ctx, "agent", 90),
          ...(isCarla ? { kind: "carla", verb: "Talk to Carla", info: "A survivor child huddled by the fire.", tint: "#ffe0b0" } : {})
        },
      });
      if (g.gun) ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
    }
  });
}

// ---- the Lightless (Shelly: "parts of the map where theres insane people trying to kill you"): wanderers the dark got into. Two dens off the road:
// the Choir in a side pocket of the hall, the Tar-Drinkers past the dredge. Frenzied nerve (scripts/meg-agent.js): they go for anyone close, never each other.
// Killed, they stay dead an hour (Shelly's rule), then the den fills again.
const DEN_V = 2, RETURN_MS = 3600000;
const DENS = {
  choir: { s: 84, side: -5.5, tint: "oklch(0.55 0.2 25)" },
  tar: { s: 414, side: 9, tint: "oklch(0.5 0.16 300)" },
};
const WRETCH = {
  "l8x-choir-1": { den: "choir", name: "Hymn-Mouth", sp: "rat", sex: "m", gun: "pipe_scrap", at: [0, 0], top: "#4a3a2a" },
  "l8x-choir-2": { den: "choir", name: "Sister Lull", sp: "cat", sex: "f", gun: "knife", at: [2.2, 1.4], top: "#5a2a2a" },
  "l8x-choir-3": { den: "choir", name: "The Quiet One", sp: "goat", sex: "m", gun: "hatchet", at: [-2, 1.8], top: "#2a2a2a" },
  "l8x-tar-1": { den: "tar", name: "Blackjaw", sp: "bear", sex: "m", gun: "sledgehammer", at: [0, 0], top: "#1a1a1a" },
  "l8x-tar-2": { den: "tar", name: "Old Ink", sp: "raccoon", sex: "f", gun: "lineman_machete", at: [2.4, -1.2], top: "#2a1f2a" },
  "l8x-tar-3": { den: "tar", name: "Spit", sp: "fox", sex: "m", gun: "rebar", at: [-2.3, 1], top: "#3a2a1a" },
};
const WRETCH_BARKS = {
  spot: ["oh, a bright one.", "you brought a light. give it.", "shh shh shh. there you are.", "it told us you'd come.", "fresh. fresh!"],
  hostile: ["hold still and it won't hurt. much.", "the dark wants your eyes.", "sing with us!", "no lights. NO LIGHTS."],
  hit: ["hahaha! again!", "that's it, that's it.", "it doesn't hurt down here.", "ow. OW. ha."],
  kill: ["quiet now.", "shhh. shhh.", "it'll like that one."],
  move: ["the walls breathe if you listen.", "nine roads. nine. NINE.", "who turned the dark on.", "humming. always humming."],
  death: ["finally dark...", "it's... warm...", "the song..."],
  clear: ["gone. gone gone gone.", "more will come. they always come."],
};
function layDens(ctx) {
  for (const id of Object.keys(ctx.place.objects ?? {})) if (/^l8d-/.test(id) && !id.includes("/")) ctx.destroy(id); // a re-lay clears the last one
  for (const [k, d] of Object.entries(DENS)) {
    const c = P(d.s, d.side, 0), id = (n) => `l8d-${k}-${n}`;
    ctx.spawn(id("fire"), { feetPosition: { x: c.x, y: c.y, z: c.z }, fx: { script: FIRE_FX }, light: { kind: "point", color: d.tint, intensity: 1.6, distance: 11 }, audio: { clip: "cdn/ambience-many-voices-muttering-and-humming-tunelessly-in-a-stone-cave-loop.mp3", gain: 0.22, loop: true, spatial: true, maxDistance: 22 } });
    ctx.spawn(id("ring"), { feetPosition: { x: c.x, y: c.y, z: c.z }, primitive: { kind: "torus", radius: 0.55, tube: 0.13, radialSegments: 6, tubularSegments: 10 }, rotation: { pitch: 90 }, pivot: "center", material: { color: "oklch(0.18 0.01 60)", roughness: 0.9 }, physics: "static" });
    for (let i = 0; i < 4; i++) { // bedrolls kicked into a circle, stained
      const a = (i / 4) * Math.PI * 2 + 0.4, r = 2.4;
      ctx.spawn(id(`roll${i}`), { feetPosition: { x: c.x + Math.cos(a) * r, y: c.y, z: c.z + Math.sin(a) * r }, rotation: { yaw: (-a * 180) / Math.PI + 90 }, primitive: { kind: "capsule", radius: 0.16, halfHeight: 0.7 }, pivot: "center", scale: { x: 1, y: 1, z: 0.6 }, material: { color: ["oklch(0.32 0.05 60)", "oklch(0.28 0.04 30)", "oklch(0.3 0.03 140)", "oklch(0.25 0.02 260)"][i], roughness: 0.95 } });
    }
    for (let i = 0; i < 9; i++) { // a pile of picked bones by the fire
      const a = i * 2.4, r = 0.25 + (i % 3) * 0.12;
      ctx.spawn(id(`bone${i}`), { feetPosition: { x: c.x + 1.3 + Math.cos(a) * r, y: c.y + 0.05 + (i % 2) * 0.06, z: c.z - 1 + Math.sin(a) * r }, rotation: { yaw: i * 47, roll: 90 }, pivot: "center", primitive: { kind: "capsule", radius: 0.035, halfHeight: 0.16 + (i % 3) * 0.05 }, material: { color: "oklch(0.86 0.03 85)", roughness: 0.7 } });
    }
    ctx.spawn(id("skull"), { feetPosition: { x: c.x + 1.3, y: c.y + 0.12, z: c.z - 1 }, primitive: { kind: "sphere", radius: 0.12 }, scale: { x: 1, y: 0.9, z: 1.2 }, material: { color: "oklch(0.84 0.03 80)", roughness: 0.6 } });
    ctx.spawn(id("smash"), { feetPosition: { x: c.x - 1.5, y: c.y, z: c.z - 1.5 }, primitive: { kind: "box", width: 0.5, height: 0.3, depth: 0.4 }, rotation: { yaw: 20, roll: 12 }, material: { color: "oklch(0.3 0.02 250)", roughness: 0.6, metalness: 0.5 } }); // smashed flashlights: no lights here
    for (let i = 0; i < 5; i++) ctx.spawn(id(`torch${i}`), { feetPosition: { x: c.x - 1.4 + i * 0.18, y: c.y + 0.32, z: c.z - 1.5 + (i % 2) * 0.1 }, rotation: { yaw: i * 70, roll: 90 }, pivot: "center", primitive: { kind: "cylinder", radiusTop: 0.025, radiusBottom: 0.03, height: 0.2 }, material: { color: "oklch(0.25 0.02 250)", roughness: 0.4, metalness: 0.6 } });
  }
}
function keepWretched(ctx) {
  const s = ctx.place.state, now = ctx.now();
  if (now < (s.wretchAt ?? 0)) return; s.wretchAt = now + 5000;
  const deadAt = { ...(s.wretchDead ?? {}) }; let ch = false;
  for (const id of Object.keys(WRETCH)) {
    const o = ctx.place.objects[id];
    if (o && !o.state?.dead && (o.state?.hp ?? 1) > 0) continue;
    if (o && deadAt[id] == null) { deadAt[id] = now; ch = true; continue; }
    if (!o || now - deadAt[id] > RETURN_MS) { if (o) ctx.destroy(id); delete deadAt[id]; ch = true; spawnWretch(ctx, id); }
  }
  if (ch) s.wretchDead = deadAt;
}
function spawnWretch(ctx, id) {
  const g = WRETCH[id], d = DENS[g.den];
  Promise.all([import("../../scripts/lib/critter-model.js"), import("../../scripts/lib/clothes.js"), import("../../scripts/lib/stats.js"), import("../../scripts/lib/weapon-look.js")]).then(([{ critterSpec }, { npcLook }, { npcState }, { weaponBody }]) => {
    if (ctx.place.objects[id]) return;
    const c = P(d.s, d.side, 0), x = c.x + g.at[0], z = c.z + g.at[1];
    const look = { species: g.sp, sex: g.sex, eye: "#0a0a0a", topw: "sweater", top: g.top, botw: "pants", bottom: "#221e18", shoes: "boots", shoec: "#141010" };
    ctx.spawn(id, {
      tags: ["npc", "l8-npc", "l8-hostile", "wretched"], feetPosition: { x, y: c.y + 0.3, z }, rotation: { yaw: ctx.random() * 360 }, physics: "character", ...critterSpec(npcLook(id, look, "survivor", 8)),
      behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
      state: { ...npcState(ctx, "agent", 75), name: `${g.name} · the Lightless`, role: "survivor", faction: "lightless", factionName: "the Lightless: wanderers on the 9th Road whom the dark got into", nerve: "frenzied", arm: g.gun, barks: WRETCH_BARKS,
        rounds: [{ x, y: c.y + 0.3, z, dwell: 30, act: null, look: { x: c.x, z: c.z } }], ri: 0, home: { x, z } },
    });
    ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
  });
}
