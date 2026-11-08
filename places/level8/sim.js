// Level 8 "Cave Systems" (backrooms-wiki.wikidot.com/level-8): the first level whose environment is wholly enclosed. A sprawling network of organic karst caves, cold, dark,
// jagged spikes from the ceiling and floor, tunnels branching on all sides. This is the 9th Road: one cave built in Blender (art/level8/build.py > cave_road.glb, the
// stations in scripts/lib/data/level8.yml): the entrance lake you wade out of (from Level 7's diving bell), the welcome sign, a hall whose crawl tunnel loops back once,
// a cavern that floods to the chin with a ledge and a dead caver in an orange caving suit, Hyperspace Lane (glowing fungi and light guides), a spider nest, a pool of tar
// with hands, a camp round a fire with a girl called Carla, and the asphalt road to Level 9. Markers every 50 m; almond water pools. Life: scripts/l8-life.js; use: scripts/l8-use.js.
import L8 from "../../scripts/lib/data/level8.yml";
export const cadence = "1s";
const V = 9;
const GLB = {
  cave: "/cdn/value.9bc4cd793bdb2ebcf2830e8a1da786f9f5c1011dc589b8c14cedee48ea949e1c.glb",
  spider: "/cdn/value.74a6298847904cccb7a38e00bdc5f6ddfe8254138ddc0e1ae65c75ba6eef6859.glb",
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
const ROCK = { color: "oklch(0.52 0.025 60)", roughness: 0.95 };
const sign = (w, h, html, bg = "oklch(0.2 0.015 80)") => ({ primitive: { kind: "box", width: w, height: h, depth: 0.06 }, material: { color: bg, roughness: 0.7 }, ui: html });
const MEG = `<div face="front" width="2.6m" style="font-family:Arial,sans-serif;font-weight:900;color:#f2d870;text-align:center;line-height:1.1">`;

// ---- things to harvest (scripts/l8-use.js and the breakables system): each is a spec with how long it takes to grow back once it is gone
const rxAt = (s) => { const st = L8.stations.find((q) => s >= q.s0 && s <= q.s1); return st ? st.rx : 4; };
const DEFS = {};
const def = (id, delay, spec) => { DEFS[id] = { delay, spec }; };
const brk = (mat, hp, name) => ({ mat, hp, maxHp: hp, name });
// glowing caps: along Hyperspace Lane (the 22 lights) and in a few of the other chambers
const FUNG = [...Array(22).keys()].map((k) => ({ s: 218 + k * 2.4, side: (k % 2 ? 1 : -1) * (3 + (k % 5)), up: 0.1 + (k % 3) * 1.4 })).concat([[62, -5.5, 0.4], [88, 6, 0.3], [168, -8, 0.5], [290, -9, 0.3], [318, 8, 0.4], [356, -8, 0.5], [388, 7, 0.3], [420, -10, 0.3], [452, 9, 0.4], [474, 2.5, 0.3]].map(([s, side, up]) => ({ s, side, up })));
FUNG.forEach((f, k) => { const p = P(f.s, f.side), r = 0.14 + (k % 3) * 0.05; def(`l8-glow-${k}`, 150, { feetPosition: { x: p.x, y: P(f.s).y + f.up, z: p.z }, tags: ["usable"], behavior: "scripts/l8-use.js", primitive: { kind: "sphere", radius: r }, material: { color: "oklch(0.7 0.12 190)", emissive: "oklch(0.75 0.15 185)", emissiveIntensity: 2.2 },
  state: { kind: "fungus", name: "Glowing fungus", verb: "Pick the caps", info: "Bioluminescent caps on almond-wet rock. They bruise easily, and make a good light.", tint: "#6fe8d8" }, children: [{ feetPosition: { x: 0, y: 0.2, z: 0 }, light: { kind: "point", color: "oklch(0.7 0.14 190)", intensity: 0.9, distance: 8 } }] }); });
// cocoons in the nest: silk, and sometimes what the spiders wrapped
[292, 300, 308, 318, 326, 334, 342].forEach((s, k) => { const side = (k % 2 ? 1 : -1) * (3 + (k * 5) % 6), p = P(s, side); def(`l8-cocoon-${k}`, 300, { feetPosition: { x: p.x, y: P(s).y, z: p.z }, rotation: { yaw: k * 47 }, tags: ["usable"], behavior: "scripts/l8-use.js", primitive: { kind: "capsule", radius: 0.34, halfHeight: 0.5 }, material: { color: "oklch(0.9 0.012 230)", roughness: 1 },
  state: { kind: "cocoon", name: "Silk cocoon", verb: "Cut open", info: "Something was wrapped in this. It is not moving.", tint: "#e8eef2" } }); });
// the tar pool's seeps: pitch you can scrape, at a price
[[366, 5.2], [376, 5.8], [386, -5.4], [394, 4.6]].forEach(([s, side], k) => { const p = P(s, side); def(`l8-seep-${k}`, 120, { feetPosition: { x: p.x, y: P(s).y, z: p.z }, tags: ["usable"], behavior: "scripts/l8-use.js", primitive: { kind: "sphere", radius: 0.45 }, scale: { x: 1.3, y: 0.45, z: 1.3 }, material: { color: "oklch(0.07 0.008 280)", roughness: 0.15, metalness: 0.2 },
  state: { kind: "seep", name: "Tar seep", verb: "Scrape pitch", info: "Warm, black and slow. The Tar is not far below it.", tint: "#8a7a9a" } }); });
// flowstone (pale stalagmite clusters) and ironstone (dark red-brown boulders): break them, best with a pickaxe
[54, 66, 80, 94, 164, 188, 206, 224, 240, 256, 268, 286, 304, 322, 340, 352, 372, 392, 410, 430, 452, 470, 484].forEach((s, k) => { const sd = (k % 2 ? 1 : -1) * rxAt(s) * (0.3 + (k % 3) * 0.08), p = P(s, sd), h = 1.1 + (k % 4) * 0.35;
  def(`l8-flow-${k}`, 420, { feetPosition: { x: p.x, y: P(s).y - 0.1, z: p.z }, tags: ["breakable"], physics: "static", primitive: { kind: "cone", radius: 0.5 + (k % 3) * 0.12, height: h, radialSegments: 7 }, material: { color: "oklch(0.8 0.03 85)", roughness: 0.8 }, state: brk("flowstone", 150, "Flowstone"),
    children: [{ feetPosition: { x: 0.45, y: 0, z: 0.2 }, primitive: { kind: "cone", radius: 0.3, height: h * 0.62, radialSegments: 6 }, material: { color: "oklch(0.78 0.03 85)", roughness: 0.8 } }, { feetPosition: { x: -0.35, y: 0, z: -0.3 }, primitive: { kind: "cone", radius: 0.26, height: h * 0.5, radialSegments: 6 }, material: { color: "oklch(0.82 0.03 85)", roughness: 0.8 } }] }); });
[60, 90, 170, 230, 262, 296, 330, 360, 396, 420, 458, 476].forEach((s, k) => { const sd = (k % 2 ? -1 : 1) * rxAt(s) * 0.42, p = P(s, sd);
  def(`l8-iron-${k}`, 420, { feetPosition: { x: p.x, y: P(s).y + 0.05, z: p.z }, rotation: { yaw: k * 63 }, tags: ["breakable"], physics: "static", primitive: { kind: "dodecahedron", radius: 0.62 }, material: { color: "oklch(0.36 0.07 38)", roughness: 0.9, metalness: 0.2 }, state: brk("ironstone", 230, "Ironstone vein") }); });

function lay(ctx) {
  const sp = (id, spec) => ctx.spawn(id, spec);
  // a rebuild (V bumped): take down what the last build laid (not the life manager, the camp people, or what players carry)
  for (const id of Object.keys(ctx.place.objects ?? {})) if (/^l8-/.test(id) && !id.includes("/") && !/^l8-(life|hobb|wen|ivo|marit|carla-kid)$/.test(id) && !/^l8-(spider|hand)/.test(id)) ctx.destroy(id);
  // a model stands on its feet: the bottom centre of its box is at feetPosition, so the cave (box min -10.91,-2.56,-455.46, max 124.61,14.62,0.40) is placed by its own centre to keep the road at its own coordinates
  sp("l8-cave", { feetPosition: { x: 56.85, y: -2.56, z: -227.53 }, physics: { body: "static", collider: "mesh" }, model: { id: GLB.cave, materials: { rock: ROCK } }, receiveShadow: true });

  // ---- the entrance lake and the way you came (Level 7's diving bell): you wade to the shore
  const lake = P(12, 0, 0);
  sp("l8-lake", { ...at({ ...lake, y: -2.65 }), primitive: { kind: "box", width: 26, height: 2.5, depth: 38 }, material: { kind: "water", color: "oklch(0.22 0.04 230)", opacity: 0.88, waveIntensity: 0.05 } });
  sp("l8-lake-back", { ...at({ ...P(10, 0, 0), y: -1.2 }), physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 26, height: 2.4, depth: 30 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level7#l7-from-l8" } });
  sp("l8-from-l7", at(P(31, 0, 0.1)));
  sp("l8-welcome", { ...at(P(38, 6.5, 1.0)), rotation: { yaw: P(38).yaw + 150 }, ...sign(2.8, 1.8, `${MEG}<div style="font-size:92px">WELCOME TO THE 9TH ROAD</div><div style="font-size:56px;color:#e8e0c0">« M.E.G. OUTPOST (8.7 MILES | 14 KM) »</div><div style="font-size:44px;color:#c8d8b8">Help is ahead! Stay strong.</div><div style="font-size:34px;opacity:.7;margin-top:6px">M.E.G. — Bettering Humanity</div></div>`) });
  sp("l8-welcome-lamp", { feetPosition: { x: P(38, 5.2).x, y: P(38).y + 2.2, z: P(38, 5.2).z }, light: { kind: "point", color: "oklch(0.85 0.1 90)", intensity: 0.7, distance: 6 } });

  // ---- the markers: a plaque every 50 m with the M.E.G. mark, glowing a little; "stay on the road"
  for (let s = 50, n = 0; s <= 460; s += 50, n++) {
    const p = P(s, -(ST.hall.rx - 1.2), 1.55);
    sp(`l8-marker-${n}`, { ...at({ ...p, yaw: P(s).yaw - 90 }), ...sign(0.9, 0.5, `<div face="front" width="0.9m" style="font-family:Arial,sans-serif;font-weight:900;color:#f2d870;text-align:center;line-height:1.05"><div style="font-size:46px">9TH ROAD</div><div style="font-size:34px;color:#e8e0c0">MARKER #${82 - n}</div></div>`) });
    sp(`l8-marker-l-${n}`, { feetPosition: { x: p.x, y: p.y + 0.5, z: p.z }, light: { kind: "point", color: "oklch(0.8 0.12 95)", intensity: 0.45, distance: 5 } });
  }

  // ---- the hall and the crawl that does not go where it should (scripts/l8-use.js): the first time through, the crawl brings you out where you started, under marker #74
  sp("l8-loop-sign", { ...at({ ...P(78, -(ST.hall.rx - 1.6), 2.2), yaw: P(78).yaw - 90 }), ...sign(0.9, 0.5, `<div face="front" width="0.9m" style="font-family:Arial,sans-serif;font-weight:900;color:#f2d870;text-align:center;line-height:1.05"><div style="font-size:46px">9TH ROAD: MARKER</div><div style="font-size:50px;color:#fff">#74</div></div>`), visible: false, state: { loop: true } });
  sp("l8-crawl-end", { ...at(P(154, 0, 1.0)), physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 2.6, height: 2.2, depth: 1.4 }, visible: false, behavior: "scripts/l8-use.js", state: { kind: "loop", back: P(72, 2, 0.2) } });
  sp("l8-face-rock", { ...at(P(90, 7, 0.9)), primitive: { kind: "sphere", radius: 0.9 }, scale: { x: 1.0, y: 1.25, z: 0.8 }, material: ROCK });

  // ---- the flooded cavern: the water climbs (scripts/l8-life.js), a ledge above the flood, a caver who got there first, sitting neat against the wall
  const fl = P(176, 0, 0);
  sp("l8-flood", { ...at({ ...fl, y: P(176).y - 0.5 }), primitive: { kind: "box", width: 30, height: 4.5, depth: 30 }, material: { kind: "water", color: "oklch(0.2 0.04 225)", opacity: 0.86, waveIntensity: 0.04 } });
  const cv = P(196, -6.5, 0.0);
  sp("l8-caver", { ...at({ ...cv, y: P(196).y + 2.9 }), rotation: { yaw: cv.yaw + 90 }, tags: ["container", "remains"], primitive: { kind: "box", width: 0.7, height: 0.9, depth: 0.45 }, material: { color: "oklch(0.62 0.18 55)", roughness: 0.8 },
    state: { name: "Dead caver (orange caving suit)", verb: "Search", info: "A dent in the skull; not yet decayed. A backpack at his feet.", items: "battery,battery,kit,ration,cloth:topw:jacket:ff7a1a,cloth:botw:pants:ff7a1a,cloth:shoes:boots:2b2b33" },
    children: [
      { feetPosition: { x: 0, y: 0.95, z: 0 }, primitive: { kind: "sphere", radius: 0.2 }, material: { color: "oklch(0.7 0.05 60)", roughness: 0.8 } },
      { feetPosition: { x: -0.18, y: -0.05, z: 0.5 }, primitive: { kind: "box", width: 0.22, height: 0.2, depth: 0.7 }, material: { color: "oklch(0.62 0.18 55)", roughness: 0.8 } },
      { feetPosition: { x: 0.18, y: -0.05, z: 0.5 }, primitive: { kind: "box", width: 0.22, height: 0.2, depth: 0.7 }, material: { color: "oklch(0.62 0.18 55)", roughness: 0.8 } },
      { feetPosition: { x: 0.5, y: 0, z: 0.5 }, primitive: { kind: "box", width: 0.35, height: 0.45, depth: 0.25 }, material: { color: "oklch(0.3 0.04 100)", roughness: 0.9 } }] });

  // ---- Hyperspace Lane: fungi and bacteria glowing on the almond water in the walls; a stream of plain cold water; a stone kazoo in a niche
  for (const [id, d] of Object.entries(DEFS)) sp(id, d.spec); // glowing caps, cocoons, tar seeps, flowstone and ironstone: things to harvest (regrown by tick)
  sp("l8-stream", { ...at({ ...P(244, 0, 0), y: P(244).y + 0.05 }), primitive: { kind: "box", width: 2.4, height: 0.12, depth: 46 }, material: { kind: "water", color: "oklch(0.3 0.05 215)", opacity: 0.8, waveIntensity: 0.08 } });
  sp("l8-kazoo", { ...at(P(262, 6.5, 0.5)), tags: ["usable"], primitive: { kind: "box", width: 0.18, height: 0.08, depth: 0.1 }, material: { color: "oklch(0.55 0.02 90)", roughness: 0.9 }, behavior: "scripts/l8-use.js",
    state: { kind: "kazoo", name: "Stone kazoo", verb: "Take", info: "Cold, rough and jagged. It still buzzes.", tint: "#bfb89c" } });

  // ---- almond water: pools in every chamber, generally safe to drink (a little bitter)
  [[56, 3], [86, -4], [170, 5], [232, 4], [296, -5], [360, 5], [424, -5]].forEach(([s, side], i) => sp(`l8-pool-${i}`, { ...at(P(s, side, 0.05)), tags: ["usable"], primitive: { kind: "cylinder", radiusTop: 0.9, radiusBottom: 0.9, height: 0.1 }, material: { kind: "water", color: "oklch(0.55 0.08 90)", opacity: 0.8, waveIntensity: 0.03 },
    behavior: "scripts/l8-use.js", state: { kind: "pool", name: "Almond water pool", verb: "Drink", info: "Cold and bitter with harmless minerals. Do not bathe in it.", tint: "#d8d098" } }));

  // ---- the spider nest: webs hung across the chamber, the glyphs on the wall by its mouth ("NEVER under any circumstance enter caverns with these markings")
  for (let k = 0; k < 14; k++) {
    const s = 286 + k * 4.5, side = ((k * 7) % 11) - 5, up = 1.8 + (k % 4) * 1.1;
    sp(`l8-web-${k}`, { ...at({ ...P(s, side, up), yaw: P(s).yaw + k * 23 }), primitive: { kind: "box", width: 3.2 + (k % 3), height: 2.4, depth: 0.02 }, material: { color: "oklch(0.92 0.01 240)", opacity: 0.22, transparent: true, roughness: 1 } });
  }
  sp("l8-glyph", { ...at({ ...P(278, -2.6, 1.6), yaw: P(278).yaw + 90 }), ...sign(1.3, 1.3, `<div face="front" width="1.3m" style="font-family:serif;font-weight:900;color:#ff5a4a;text-align:center;font-size:120px;line-height:1;text-shadow:0 0 18px #ff2a1a">⛧<div style="font-size:30px;font-family:Arial,sans-serif">NEVER ENTER</div></div>`, "oklch(0.09 0.01 20)"), children: [{ feetPosition: { x: 0, y: 0, z: 0.4 }, light: { kind: "point", color: "oklch(0.6 0.22 25)", intensity: 0.9, distance: 5 } }] });

  // ---- the tar pool: wandering too close brings the hands (scripts/l8-life.js)
  const tp = P(376, 0, 0.04);
  sp("l8-tar", { ...at(tp), primitive: { kind: "cylinder", radiusTop: 3.4, radiusBottom: 3.4, height: 0.12 }, material: { color: "oklch(0.07 0.008 280)", roughness: 0.12, metalness: 0.2 }, state: { c: { x: tp.x, z: tp.z } } });
  sp("l8-tar-warn", { ...at({ ...P(364, 3, 1.1), yaw: P(364).yaw + 180 }), ...sign(0.8, 0.5, `<div face="front" width="0.8m" style="font-family:Arial,sans-serif;font-weight:900;color:#ff9a4a;text-align:center;font-size:50px;line-height:1">TAR<div style="font-size:30px">KEEP BACK · IT IS HOT</div></div>`) });

  // ---- the camp round the fire: soup, a tent or three, the people who have not gone on
  const cf = P(436, 0, 0.1);
  sp("l8-fire", { ...at(cf), tags: ["usable"], primitive: { kind: "cylinder", radiusTop: 0.5, radiusBottom: 0.6, height: 0.3 }, material: { color: "oklch(0.25 0.04 40)", roughness: 1 }, behavior: "scripts/l8-use.js",
    state: { kind: "fire", name: "Camp fire", verb: "Warm up", info: "Dry yourself. Rest a while.", tint: "#ffb066" }, children: [{ feetPosition: { x: 0, y: 0.8, z: 0 }, light: { kind: "point", color: "oklch(0.78 0.17 55)", intensity: 5, distance: 24 } }] });
  sp("l8-pot", { ...at(P(436, 1.4, 0.1)), tags: ["usable"], primitive: { kind: "cylinder", radiusTop: 0.38, radiusBottom: 0.3, height: 0.45 }, material: { color: "oklch(0.3 0.02 250)", metalness: 0.7, roughness: 0.5 }, behavior: "scripts/l8-use.js",
    state: { kind: "soup", name: "Pot of soup", verb: "Take a bowl", info: "Hot. Do not ask what the chunks are.", tint: "#e8c070" } });
  [[-6, 5, 0.7], [-5, -6, 0.5], [6, -5, 0.6], [5, 6, 0.4]].forEach(([side, dz, r], i) => sp(`l8-tent-${i}`, { ...at({ ...P(436 + dz, side, 0.9), yaw: P(436).yaw + i * 70 }), primitive: { kind: "box", width: 2.2, height: 1.8, depth: 2.6 }, material: { color: ["oklch(0.4 0.06 60)", "oklch(0.35 0.05 150)", "oklch(0.45 0.08 30)", "oklch(0.32 0.04 250)"][i], roughness: 0.95 } }));
  sp("l8-camp-sign", { ...at({ ...P(414, 4.5, 1.4), yaw: P(414).yaw + 160 }), ...sign(2.0, 1.1, `${MEG}<div style="font-size:70px">9TH ROAD CAMP</div><div style="font-size:42px;color:#e8e0c0">M.E.G. · B.N.T.G. · HARMOUTH SOCIETY</div><div style="font-size:34px;color:#c8d8b8">hot meals · a place to rest · guides for hire</div></div>`) });
  sp("l8-from-camp", at(P(424, -2, 0.1)));
  sp("l8-carla", { ...at(P(437, 2.2, 0.1)), tags: ["usable"], visible: false, primitive: { kind: "box", width: 0.7, height: 1.2, depth: 0.7 }, behavior: "scripts/l8-use.js",
    state: { kind: "carla", name: "Carla", verb: "Say hello", info: "A child with matted blonde hair and bright eyes.", tint: "#ffe0b0" } });

  // ---- the end of the Road: rock turns to sand, sand to gravel, gravel to asphalt; a dim glow ahead
  sp("l8-asphalt", { ...at({ ...P(486, 0, -0.04), y: P(486).y - 0.05 }), primitive: { kind: "box", width: 8.5, height: 0.1, depth: 40 }, material: { color: "oklch(0.2 0.005 260)", roughness: 0.9 }, physics: "static" });
  sp("l8-glow", { feetPosition: { x: P(502).x, y: P(502).y + 1.4, z: P(502).z }, primitive: { kind: "box", width: 2.6, height: 2.6, depth: 0.2 }, material: { color: "#fff6e0", emissive: "#fff0d0", emissiveIntensity: 3 }, children: [{ feetPosition: { x: 0, y: 0, z: 1.5 }, light: { kind: "point", color: "oklch(0.95 0.05 85)", intensity: 5, distance: 30 } }] });
  sp("l8-exit", { ...at(P(500, 0, 1.2)), physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 5, height: 2.6, depth: 1.2 }, visible: false, behavior: "scripts/l8-use.js", state: { kind: "exit", back: P(436, -4, 0.3) } });
  // ---- stuff to do: caches to search, a bench to craft at, and a board of errands at the camp (scripts/l8-use.js)
  const cache = (id, p, name, info, items, color = "oklch(0.35 0.05 120)") => sp(id, { ...at(p), tags: ["container", "breakable"], physics: "static", primitive: { kind: "box", width: 0.9, height: 0.6, depth: 0.55 }, material: { color, roughness: 0.7, metalness: 0.3 }, state: { ...brk("metal", 120, name), name, verb: "Search", info, items } });
  cache("l8-cache-hall", P(64, 6.8, 0), "Harmouth Society cache", "A survey crate, lid pried and nailed back. Chalk on the lid: HALL 1.", "ration,bandage,bandage,almond,kit,battery");
  cache("l8-cache-lane", P(252, -6.4, 0), "Abandoned survey pack", "Left by someone who did not want to carry it any further.", "battery,battery,almond,cloth:hat:cap:3a302a,ration", "oklch(0.3 0.05 60)");
  cache("l8-cache-nest", P(336, 7.2, 0), "Expedition locker", "A hard case. The spiders have not worked out the latch.", "ammo,ammo,shells,firstaid,bandage,kit", "oklch(0.32 0.03 250)");
  cache("l8-cache-camp", P(428, -6.0, 0), "M.E.G. supply locker", "Stencilled: M.E.G. Bettering Humanity. The padlock is a joke.", "ammo,ammo,ammo,shells,bandage,bandage,firstaid,battery,kit", "oklch(0.3 0.04 150)");
  const diveBag = P(14, 4.0, 0.1); sp("l8-cache-lake", { ...at({ ...diveBag, y: -2.2 }), tags: ["container"], physics: "static", primitive: { kind: "box", width: 0.7, height: 0.4, depth: 0.5 }, material: { color: "oklch(0.3 0.04 230)", roughness: 0.9 },
    state: { name: "Sunken dive bag", verb: "Search", info: "On the lake bed, snagged on a rock. Someone swam out and did not swim back.", items: "battery,almond,almond,bandage,cash:2500" } });
  sp("l8-bench", { ...at({ ...P(428, 5.4, 0.1), yaw: P(428).yaw + 180 }), tags: ["bench"], primitive: { kind: "box", width: 1.6, height: 0.9, depth: 0.8 }, material: { color: "oklch(0.35 0.06 60)", roughness: 0.9 }, physics: "static", state: { name: "9th Road workbench" },
    children: [{ feetPosition: { x: 0, y: 1.7, z: 0 }, light: { kind: "point", color: "oklch(0.88 0.12 80)", intensity: 2.2, distance: 9 } }] });
  sp("l8-board", { ...at({ ...P(446, -5.2, 1.3), yaw: P(446).yaw + 20 }), tags: ["usable"], behavior: "scripts/l8-use.js", ...sign(1.5, 1.1, `<div face="front" width="1.5m" style="font-family:Arial,sans-serif;font-weight:900;color:#e8e0c0;text-align:center;line-height:1.1"><div style="font-size:64px;color:#f2d870">ERRANDS</div><div style="font-size:34px">bring it back to the camp · we pay</div><div style="font-size:28px;color:#c8d8b8">glow caps · chitin · pitch · flowstone · ironstone</div></div>`),
    state: { kind: "board", name: "Errand board", verb: "Read", info: "Jobs the camp needs doing. Pay on delivery.", tint: "#f2d870" } });
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
  if (!s.campV) { s.campV = 1; spawnCamp(ctx); }
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
      const x = cf.x + g.at[0], z = cf.z + g.at[1], look = { species: g.sp, sex: g.sex, eye: g.eye, topw: "sweater", top: g.top, botw: g.child ? "overalls" : "pants", bottom: "#33332a", shoes: "boots", shoec: "#2a2018" };
      ctx.spawn(id, {
        tags: ["npc", "l8-npc"], feetPosition: { x, y: cf.y + 0.3, z }, rotation: { yaw: 0 }, physics: "character", ...critterSpec(npcLook(id, look, "survivor", 8)), ...(g.child ? { scale: { x: 0.68, y: 0.68, z: 0.68 } } : {}),
        behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
        state: { name: g.name, role: "survivor", voice: g.voice, faction: "camp", factionName: "the 9th Road camp: M.E.G. operatives, B.N.T.G. traders and the Harmouth Speleological Society", rounds: [{ x, y: cf.y + 0.3, z, dwell: 40, act: null, look: { x: cf.x, z: cf.z } }], ri: 0, nerve: g.child ? "coward" : "steady", home: { x, z }, ...npcState(ctx, "agent", 90) },
      });
      if (g.gun) ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
    }
  });
}
