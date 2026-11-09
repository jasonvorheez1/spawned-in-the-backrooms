// Level 0 moments: the places a walk through the yellow remembers. Laid once (place.state.momentsV), every
// cell picked by hash() so each room of the game finds them in the same spots. Props sit against walls only.
import { N, S, H, HALF, MID, hash, inHub, zoneOf, cellCenter, wallX, wallZ, isArchWall, hasPit, hasPillar, hasLight, EXIT } from "./maze.js";
import { DRIP, STATIC } from "../moments.js";
const GEO = "scripts/moments-geo.js";
const FMODEL = {
  desk: "/cdn/value.dc2f7ac92df4c08964be1ea4af5e520bbf4c12d50609157f85b41db8f3c21fcf.glb",
  chair: "/cdn/value.34ee5f211b991e7489c032ed09d062af9fda8ef8a79c69afadafd1a650be47d8.glb",
  shelf: "/cdn/value.9f3b838cc1b4403a54d96e1b80372c75c9a440c1d4e61a4760f60de82133526b.glb",
  copier: "/cdn/value.5489a9397b8e52f5ea0f528a387d0449d0787726d6bc65bd041ec8faf80f9362.glb",
};
const lo = (c) => c * S - HALF;
const hasWall = (cx, cz, d) => d === 0 ? wallX(cx, cz) && !isArchWall(cx, cz, "x") : d === 1 ? wallZ(cx, cz) && !isArchWall(cx, cz, "z") : d === 2 ? wallX(cx - 1, cz) && !isArchWall(cx - 1, cz, "x") : wallZ(cx, cz - 1) && !isArchWall(cx, cz - 1, "z");
const YAW = [90, 0, -90, 180];
const NRM = [[-1, 0], [0, -1], [1, 0], [0, 1]]; // into the room from wall d
// a pose on wall d of a cell: along = metres from the wall's middle, off = metres out from its face
export function wallPose(cx, cz, d, along = 0, off = 0) {
  const c = cellCenter(cx, cz), T = 0.1 + off;
  if (d === 0) return { x: lo(cx + 1) - T, z: c.z + along, yaw: 90 };
  if (d === 1) return { x: c.x - along, z: lo(cz + 1) - T, yaw: 0 };
  if (d === 2) return { x: lo(cx) + T, z: c.z - along, yaw: -90 };
  return { x: c.x + along, z: lo(cz) + T, yaw: 180 };
}
function picker(used) {
  return (seed, ok, rMin = 4, rMax = 17) => {
    for (let i = 0; i < 600; i++) {
      const cx = Math.floor(MID + (hash(i, seed, 1) * 2 - 1) * rMax), cz = Math.floor(MID + (hash(i, seed, 2) * 2 - 1) * rMax);
      if (cx < 1 || cz < 1 || cx >= N - 1 || cz >= N - 1 || inHub(cx, cz) || hasPit(cx, cz) || hasPillar(cx, cz) || used.has(cx + "," + cz)) continue;
      if (Math.max(Math.abs(cx - MID), Math.abs(cz - MID)) < rMin) continue;
      const r = ok(cx, cz, i); if (r === false || r == null) continue;
      used.add(cx + "," + cz); return { cx, cz, r };
    }
    return null;
  };
}
// what's under each seam's paper: grey drywall, a water bloom, and one thing someone left
const WALLPAPER = "/cdn/value.00a4e744acf9ab763779bbb0cc7f26fb1dd20aeafc69448c536939cd7212caeb.png";
const DRY = (inner) => `<svg viewBox='0 0 120 220' width='0.6m'><defs><radialGradient id='st' cx='.35' cy='.8' r='.6'><stop offset='0' stop-color='#6d6450' stop-opacity='.55'/><stop offset='1' stop-color='#8c8a80' stop-opacity='0'/></radialGradient></defs><rect x='0' y='0' width='120' height='220' fill='#9a978c'/><rect x='0' y='0' width='120' height='220' fill='url(#st)'/><path d='M0 30 L120 34 M0 140 L120 137' stroke='#7f7c72' stroke-width='1.2'/><g fill='#5e5a4e'>${[[14, 22], [100, 26], [18, 132], [104, 135]].map(([x, y]) => `<circle cx='${x}' cy='${y}' r='1.6'/>`).join("")}</g>${inner}<path d='M0 0 L0 220 M120 0 L120 220' stroke='#c9b46a' stroke-width='3' stroke-dasharray='5 3'/></svg>`;
const UNDER = [
  DRY(`<g font-family='serif' font-style='italic' fill='#3b3a36' fill-opacity='.8' transform='rotate(-3 60 100)'><text x='60' y='78' text-anchor='middle' font-size='13'>Room 409?</text><text x='60' y='100' text-anchor='middle' font-size='10'>Mom, if you're</text><text x='60' y='116' text-anchor='middle' font-size='10'>looking for me,</text><text x='60' y='136' text-anchor='middle' font-size='13'>I went west.</text></g><path d='M30 150 L58 152' stroke='#3b3a36' stroke-opacity='.6' stroke-width='1.2'/>`),
  DRY(`<rect x='42' y='0' width='36' height='220' fill='#3a342b'/><g fill='none' stroke-linecap='round'><path d='M50 0 C46 60 56 110 49 220' stroke='#b8693a' stroke-width='4'/><path d='M60 0 C64 70 55 130 61 220' stroke='#c47a44' stroke-width='3.5'/><path d='M70 0 C74 50 66 150 71 220' stroke='#8e4f2c' stroke-width='4'/><path d='M60 96 L66 88 L62 92 L70 84' stroke='#fff6c8' stroke-width='1.5' filter='drop-shadow(0 0 3px #ffd36a)'/></g><g fill='#2a2620'><rect x='38' y='60' width='44' height='6' rx='2'/><rect x='38' y='160' width='44' height='6' rx='2'/></g>`),
  DRY(`<g fill='none' stroke='#e2ddd0' stroke-width='1.4' stroke-linecap='round'><path d='M14 136 L104 132 M14 152 L100 150 M14 168 L96 168' stroke-dasharray='9 4 3 4'/><path d='M20 186 L34 182 M86 184 L102 190'/></g><g font-family='sans-serif' font-weight='700' fill='#e2ddd0' transform='rotate(-4 60 100)'><text x='60' y='70' text-anchor='middle' font-size='19'>DON'T</text><text x='60' y='94' text-anchor='middle' font-size='19'>SLEEP</text><text x='60' y='114' text-anchor='middle' font-size='11'>ON THE CARPET</text></g><text x='60' y='206' text-anchor='middle' font-family='sans-serif' font-size='7.5' fill='#e2ddd0' fill-opacity='.8'>walls shift when you blink</text>`),
  DRY(`<g stroke='#2f56a8' stroke-opacity='.75' fill='none' stroke-linecap='round' stroke-linejoin='round'><path d='M14 112 L96 112' stroke-width='5'/><path d='M76 90 L100 112 L76 134' stroke-width='5'/><path d='M14 104 L14 120 M30 106 L30 118 M46 106 L46 118 M62 106 L62 118' stroke-width='2'/></g><text x='58' y='154' text-anchor='middle' font-family='sans-serif' font-size='9' fill='#2f56a8' fill-opacity='.7'>PERIM. 0.4 KM</text><text x='22' y='86' font-family='sans-serif' font-size='7' fill='#2f56a8' fill-opacity='.55'>S-17</text>`),
];
const walls = (cx, cz) => [0, 1, 2, 3].filter((d) => hasWall(cx, cz, d));
const corner = (cx, cz) => [[1, 2, 0], [0, 1, 90], [3, 0, 180], [2, 3, -90]].find(([a, b]) => hasWall(cx, cz, a) && hasWall(cx, cz, b)); // [back, left, yaw]
const plainZone = (cx, cz) => ["halls", "expanse", "offices"].includes(zoneOf(cx, cz));

// scribbles: one SVG per message, drawn like marker and chalk on wallpaper
const INK = "#3a2416", CHALK = "#2b2b2e";
const SCRIBBLE = {
  notsafe: `<svg viewBox='0 0 300 120' width='1.5m'><g transform='rotate(-4 150 60)'><text x='150' y='72' text-anchor='middle' font-family='display' font-size='58' fill='${INK}' stroke='${INK}' stroke-width='2'>IT'S NOT SAFE</text><path d='M30 92 L270 86' stroke='${INK}' stroke-width='5' fill='none'/></g></svg>`,
  lights: `<svg viewBox='0 0 300 120' width='1.3m'><g transform='rotate(3 150 60)'><text x='150' y='50' text-anchor='middle' font-family='serif' font-style='italic' font-size='36' fill='${INK}'>don't trust</text><text x='150' y='96' text-anchor='middle' font-family='serif' font-style='italic' font-size='36' fill='${INK}'>the lights</text></g></svg>`,
  tally: `<svg viewBox='0 0 300 120' width='1.1m'><g stroke='${CHALK}' stroke-width='5' stroke-linecap='round' fill='none'>${[0, 1, 2, 3, 4].map((g) => [0, 1, 2, 3].map((k) => `<path d='M${14 + g * 58 + k * 10} ${22 + (k % 2) * 3} L${16 + g * 58 + k * 10} ${92 - (k % 3) * 2}'/>`).join("") + `<path d='M${6 + g * 58} 80 L${54 + g * 58} 34'/>`).join("")}<path d='M${14 + 5 * 58} 24 L${15 + 5 * 58} 92'/><path d='M${24 + 5 * 58} 22 L${26 + 5 * 58} 90'/></g><text x='150' y='116' text-anchor='middle' font-family='sans-serif' font-size='16' fill='${CHALK}'>days?</text></svg>`,
  arrow: `<svg viewBox='0 0 200 100' width='0.9m'><g stroke='${CHALK}' stroke-width='9' stroke-linecap='round' stroke-linejoin='round' fill='none'><path d='M18 54 C60 46 110 56 170 50'/><path d='M138 22 L176 50 L136 80'/></g></svg>`,
  exit: `<svg viewBox='0 0 200 100' width='0.9m'><g stroke='${CHALK}' stroke-width='8' stroke-linecap='round' stroke-linejoin='round' fill='none'><path d='M18 58 C60 50 110 60 170 54'/><path d='M138 26 L176 54 L136 84'/></g><text x='96' y='34' text-anchor='middle' font-family='sans-serif' font-size='22' fill='${CHALK}'>EXIT</text></svg>`,
};
const EXIT_LEFT = `<svg viewBox='0 0 200 100' width='0.9m'><g stroke='${CHALK}' stroke-width='8' stroke-linecap='round' stroke-linejoin='round' fill='none'><path d='M182 58 C140 50 90 60 30 54'/><path d='M62 26 L24 54 L64 84'/></g><text x='104' y='34' text-anchor='middle' font-family='sans-serif' font-size='22' fill='${CHALK}'>EXIT</text></svg>`; // the word stays readable when the arrow points left
const mirror = (svg) => svg.replace(/<svg ([^>]*)>/, "<svg $1><g transform='translate(200 0) scale(-1 1)'>").replace(/<\/svg>$/, "</g></svg>");

export function layMoments(ctx) {
  const used = new Set(), pick = picker(used), out = {}, put = (kind, spec) => { out[kind] = (out[kind] ?? 0) + 1; return ctx.spawn({ tags: ["moment", "m-" + kind], ...spec }); };
  const geo = (kind, params = {}) => ({ kind: "scripted", script: GEO, params: { kind, ...params } });
  const onWall = (kind, cx, cz, d, along, extra = {}) => { const w = wallPose(cx, cz, d, along); return put(kind, { feetPosition: { x: w.x, y: 0, z: w.z }, rotation: w.yaw, primitive: geo(kind), ...extra }); };
  const scrib = (key, cx, cz, d, along, y, svg = SCRIBBLE[key]) => { const w = wallPose(cx, cz, d, along, 0.012); return put("message", { feetPosition: { x: w.x, y, z: w.z }, rotation: w.yaw + 180, vector: svg, state: { msg: key } }); };

  // 1 · the Manila Room: a 3×3 patch of bare folder-yellow walls
  const man = pick(101, (cx, cz) => { for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (!plainZone(cx + a, cz + b) || inHub(cx + a, cz + b) || hasPit(cx + a, cz + b)) return false; return true; }, 6, 16);
  if (man) {
    const { cx, cz } = man;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) used.add(cx + a + "," + (cz + b));
    put("manila", { feetPosition: { x: 0, y: 0, z: 0 }, primitive: geo("manila", { cx0: cx, cz0: cz, w: 3, h: 3 }) });
    const mc = cellCenter(cx + 1, cz + 1);
    out.manilaAt = mc;
    // Wikidot lore: Desk, chair, filing cabinet, working lamp, and audio cassette recorder
    put("manila-desk", { feetPosition: { x: mc.x, y: 0, z: mc.z }, rotation: 0, physics: { body: "static", collider: "box" }, model: { id: FMODEL.desk, forward: "+z" } });
    put("manila-chair", { feetPosition: { x: mc.x, y: 0, z: mc.z + 0.8 }, rotation: 180, physics: { body: "static", collider: "box" }, model: { id: FMODEL.chair, forward: "+z" } });
    put("manila-lamp", { feetPosition: { x: mc.x - 0.45, y: 0.76, z: mc.z - 0.15 }, primitive: { kind: "cylinder", radiusTop: 0.08, radiusBottom: 0.12, height: 0.38 }, material: { color: "oklch(0.7 0.08 80)" }, light: { kind: "point", color: "oklch(0.85 0.14 75)", intensity: 3.5, distance: 8 } });
    put("manila-cassette", { tags: ["moment", "m-cassette", "usable"], feetPosition: { x: mc.x + 0.35, y: 0.76, z: mc.z }, primitive: { kind: "box", width: 0.28, height: 0.08, depth: 0.2 }, material: { color: "oklch(0.3 0.01 250)", roughness: 0.4 }, behavior: "scripts/moments.js", state: { kind: "cassette", name: "Manila Room Cassette Recorder", verb: "Play Audio Log" } });
    put("manila-almond", { tags: ["almond"], feetPosition: { x: mc.x + 0.6, y: 0.76, z: mc.z - 0.15 }, layout: { box: { min: { x: -0.08, y: 0, z: -0.08 }, max: { x: 0.08, y: 0.32, z: 0.08 } } }, model: "/cdn/value.d74570d765a2d43f965fc8756878f7bf22f833db5feaf4c335d84d8dc4ba5b62.glb" });
    put("manila-filing", { tags: ["moment", "m-filing", "usable", "container", "lootfurn"], feetPosition: { x: mc.x - 4.2, y: 0, z: mc.z - 4.2 }, rotation: 45, physics: { body: "static", collider: "box" }, model: { id: FMODEL.shelf, forward: "+z" }, state: { kind: "container", name: "Manila Room Filing Cabinet", verb: "Search Cabinet", items: "almond,compass,page:21" } });
  }
  // 2 · the pillar forest: low ceiling, thin columns in rows
  const pf = pick(202, (cx, cz) => { for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (!plainZone(cx + a, cz + b) || hasPit(cx + a, cz + b) || hasPillar(cx + a, cz + b) || used.has(cx + a + "," + (cz + b))) return false; return true; }, 6, 18);
  if (pf) { const { cx, cz } = pf; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) used.add(cx + a + "," + (cz + b)); put("forest", { feetPosition: { x: 0, y: 0, z: 0 }, primitive: geo("forest", { cx0: pf.cx, cz0: pf.cz, w: 3, h: 3 }), physics: { body: "static", collider: "auto" } }); out.forestAt = cellCenter(cx + 1, cz + 1); }
  // 3 · the dark sector: dead troffers, one hanging on by a thread, and the far sounds
  const dk = pick(303, (cx, cz) => zoneOf(cx, cz) === "dark", 4, 26);
  if (dk) {
    const { cx, cz } = dk, c = cellCenter(cx, cz);
    const FLICK = `fx
pop glow n=1 at=point().c(2.8) lit=(.55+.45*flick(.9,.5))*(.6+.4*noise(time()*.4)) r=light(<1,.9,.66>,$lit*7,11)
pop buzz n=1 at=point().c(2.92) size=.9 col=hdr(1.6,1.4,.9) a=.35+.4*flick(.9,.5) sz=$size r=sprite(soft-disc,add)`;
    put("troffer", { feetPosition: { x: c.x, y: 0, z: c.z }, primitive: geo("troffer", { lit: true }), fx: { script: FLICK } });
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) { const n = cellCenter(cx + dx, cz + dz); if (!inHub(cx + dx, cz + dz)) put("troffer", { feetPosition: { x: n.x, y: 0, z: n.z }, primitive: geo("troffer", { lit: false }) }); }
    put("farsound", { feetPosition: { x: c.x, y: 0, z: c.z }, behavior: "scripts/moments.js", state: { kind: "far" } });
    out.darkAt = c;
  }
  // 4 · the flooded room: an inch of standing water on the carpet, a stain above, drips (Wikidot moisture hazard)
  const fl = pick(404, (cx, cz) => plainZone(cx, cz) && hasLight(cx, cz) && walls(cx, cz).length >= 2, 4, 14);
  if (fl) {
    const c = cellCenter(fl.cx, fl.cz);
    put("water", {
      tags: ["moment", "m-water", "usable"],
      feetPosition: { x: c.x, y: 0.005, z: c.z },
      primitive: { kind: "box", width: S - 0.22, height: 0.025, depth: S - 0.22 },
      material: { kind: "water", color: "oklch(0.62 0.06 90)", opacity: 0.55, waveIntensity: 0.12 },
      audio: { clip: DRIP, loop: true, gain: 0.3, spatial: true, maxDistance: 14 },
      behavior: "scripts/moments.js",
      state: { kind: "damp-carpet", name: "Saturated Carpet Pool", verb: "Inspect Moisture" },
    });
    put("stain", { feetPosition: { x: c.x + 0.4, y: 0, z: c.z - 0.3 }, primitive: geo("stain", { seed: 3 }) });
    out.floodAt = c;
  }
  // 5 · strange details
  const one = (seed, need, fn, r0 = 4, r1 = 16) => { const p = pick(seed, (cx, cz) => { const ws = walls(cx, cz).filter((d) => need(cx, cz, d)); return ws.length ? ws[Math.floor(hash(cx, cz, seed) * ws.length)] : false; }, r0, r1); if (p) fn(p.cx, p.cz, p.r); return p; };
  const any = () => true;
  one(501, any, (cx, cz, d) => onWall("outlet", cx, cz, d, 0.6));
  one(502, any, (cx, cz, d) => onWall("falsedoor", cx, cz, d, 0, { physics: { body: "static", collider: "auto" } }));
  one(503, any, (cx, cz, d) => onWall("vending", cx, cz, d, -0.6, { physics: { body: "static", collider: "auto" } }));
  const ph = one(504, (cx, cz) => hasLight(cx, cz), (cx, cz, d) => onWall("payphone", cx, cz, d, 0.5, { physics: { body: "static", collider: "auto" }, behavior: "scripts/moments.js", tags: ["moment", "m-payphone", "usable"], state: { kind: "payphone", name: "Payphone", verb: "Answer", info: "it's ringing", tint: "#f2c14e" } }), 3, 9);
  if (ph) out.phoneAt = cellCenter(ph.cx, ph.cz);
  const ch = pick(505, (cx, cz) => corner(cx, cz) && plainZone(cx, cz));
  if (ch) { const [a, b] = corner(ch.cx, ch.cz), c = cellCenter(ch.cx, ch.cz), dx = -(NRM[a][0] + NRM[b][0]), dz = -(NRM[a][1] + NRM[b][1]); put("chair", { feetPosition: { x: c.x + dx * 1.1, y: 0, z: c.z + dz * 1.1 }, rotation: (Math.atan2(-dx, -dz) * 180) / Math.PI, primitive: geo("chair"), physics: { body: "static", collider: "auto" } }); }
  for (const seed of [506, 507]) { const p = pick(seed, (cx, cz) => plainZone(cx, cz)); if (p) { const c = cellCenter(p.cx, p.cz); put("holetile", { feetPosition: { x: c.x + 0.6, y: 0, z: c.z - 0.6 }, primitive: geo("holetile") }); } }
  const st = pick(508, (cx, cz) => plainZone(cx, cz)); if (st) { const c = cellCenter(st.cx, st.cz); put("stain", { feetPosition: { x: c.x - 0.5, y: 0, z: c.z + 0.4 }, primitive: geo("stain", { seed: 8 }) }); }
  // scribbles on walls
  const msg = [["notsafe", 1.55], ["lights", 1.5], ["tally", 1.3], ["notsafe", 1.7], ["lights", 1.45], ["tally", 1.4]];
  msg.forEach(([k, y], i) => { const p = one(520 + i, any, (cx, cz, d) => { scrib(k, cx, cz, d, (hash(cx, cz, 9) - 0.5) * 1.6, y); if (!out.msgAt) out.msgAt = { ...cellCenter(cx, cz), d }; }, 3, 15); });
  // 6 · the old wanderer's camp, with its note
  const cp = pick(601, (cx, cz) => corner(cx, cz) && plainZone(cx, cz) && hasLight(cx, cz), 4, 13);
  if (cp) {
    const [a, b, yw] = corner(cp.cx, cp.cz), xs = [a, b].includes(0) ? lo(cp.cx + 1) - 0.1 : lo(cp.cx) + 0.1, zs = [a, b].includes(1) ? lo(cp.cz + 1) - 0.1 : lo(cp.cz) + 0.1;
    put("camp", { feetPosition: { x: xs, y: 0, z: zs }, rotation: yw, primitive: geo("camp"), physics: { body: "static", collider: "auto" } });
    const r = (yw * Math.PI) / 180, lx = 1.05, lz = -1.05, nx = xs + lx * Math.cos(r) + lz * Math.sin(r), nz = zs - lx * Math.sin(r) + lz * Math.cos(r);
    put("note", { feetPosition: { x: nx, y: 0, z: nz }, tags: ["moment", "m-note", "usable", "container"], primitive: { kind: "box", width: 0.22, height: 0.02, depth: 0.3 }, visible: false, behavior: "scripts/moments.js", state: { kind: "note", name: "Wanderer's note", verb: "Read", info: "pencil, smudged", text: "Day 31? Ran out of the water. The lights hum louder when they're close. Follow the chalk west, it's still there, it HAS to be., R.", items: "page:23" } });
    scrib("tally", cp.cx, cp.cz, a, 0.9, 1.25);
    out.campAt = cellCenter(cp.cx, cp.cz);
  }
  // 6b · M.E.G. Waypoint Alpha-0 (Wikidot lore: attempted outposts / emergency caches)
  const meg = pick(602, (cx, cz) => corner(cx, cz) && plainZone(cx, cz) && hasLight(cx, cz), 5, 17);
  if (meg) {
    const [a, b, yw] = corner(meg.cx, meg.cz);
    const xs = [a, b].includes(0) ? lo(meg.cx + 1) - 0.15 : lo(meg.cx) + 0.15;
    const zs = [a, b].includes(1) ? lo(meg.cz + 1) - 0.15 : lo(meg.cz) + 0.15;
    put("meg-locker", {
      tags: ["moment", "m-meg-locker", "usable", "container", "lootfurn"],
      feetPosition: { x: xs, y: 0, z: zs },
      rotation: yw,
      physics: { body: "static", collider: "box" },
      model: { id: FMODEL.shelf, forward: "+z" },
      state: { kind: "container", name: "M.E.G. Waypoint Alpha-0 Locker", verb: "Open Locker", items: "almond,almond,firstaid,battery,page:22" },
    });
    const r = (yw * Math.PI) / 180, bx = xs + 0.8 * Math.cos(r), bz = zs - 0.8 * Math.sin(r);
    put("meg-board", {
      tags: ["moment", "m-meg-board", "usable"],
      feetPosition: { x: bx, y: 0.9, z: bz },
      primitive: { kind: "box", width: 0.28, height: 0.04, depth: 0.38 },
      material: { color: "oklch(0.68 0.07 75)" },
      behavior: "scripts/moments.js",
      state: { kind: "meg-board", name: "M.E.G. Waypoint Alpha-0 Notice", verb: "Read Survey Bulletin" },
    });
    scrib("meg", meg.cx, meg.cz, a, 0.8, 1.45, `<svg viewBox='0 0 300 120' width='1.4m'><g transform='rotate(-2 150 60)'><rect x='10' y='14' width='280' height='92' fill='none' stroke='${INK}' stroke-width='4'/><text x='150' y='58' text-anchor='middle' font-family='sans-serif' font-weight='900' font-size='34' fill='${INK}'>M.E.G. ALPHA-0</text><text x='150' y='88' text-anchor='middle' font-family='sans-serif' font-size='18' fill='${INK}'>WAYPOINT · DO NOT REMOVE</text></g></svg>`);
    out.megAt = cellCenter(meg.cx, meg.cz);
  }
  // 7 · the chalk route: arrows on side walls along the way from the safe room to the exit
  const key = (x, z) => x + "," + z, start = [Math.floor(MID), Math.floor(MID)], prev = new Map([[key(...start), null]]), Q = [start];
  const step = (x, z) => [[1, 0, !wallX(x, z)], [-1, 0, !wallX(x - 1, z)], [0, 1, !wallZ(x, z)], [0, -1, !wallZ(x, z - 1)]];
  while (Q.length) { const [x, z] = Q.shift(); if (x === EXIT.cx && z === EXIT.cz) break; for (const [dx, dz, open] of step(x, z)) { const nx = x + dx, nz = z + dz; if (!open || nx < 0 || nz < 0 || nx >= N || nz >= N || prev.has(key(nx, nz)) || hasPit(nx, nz)) continue; prev.set(key(nx, nz), [x, z]); Q.push([nx, nz]); } }
  const path = []; for (let c = prev.has(key(EXIT.cx, EXIT.cz)) ? [EXIT.cx, EXIT.cz] : null; c; c = prev.get(key(...c))) path.unshift(c);
  let last = -9, arrows = 0;
  for (let i = 1; i < path.length - 1 && arrows < 40; i++) {
    const [x, z] = path[i]; if (inHub(x, z)) continue;
    const turn = i > 0 && (path[i + 1][0] - x !== x - path[i - 1][0] || path[i + 1][1] - z !== z - path[i - 1][1]);
    if (i - last < (turn ? 1 : 3)) continue; // one at every turn, else every third room
    const tx = path[i + 1][0] - x, tz = path[i + 1][1] - z, sides = tx ? [1, 3] : [0, 2], ix = x - path[i - 1][0], iz = z - path[i - 1][1], ahead = turn ? [0, 1, 2, 3].find((q) => NRM[q][0] === -ix && NRM[q][1] === -iz && hasWall(x, z, q)) : undefined, d = sides.find((s) => hasWall(x, z, s)) ?? ahead; if (d == null) continue; // a side wall, else at a turn the wall you walk into
    const [nx, nz] = NRM[d], right = nz * tx + -nx * tz; // the viewer's right, facing the wall
    const svg = i === path.length - 2 || arrows % 4 === 3 ? SCRIBBLE.exit : SCRIBBLE.arrow;
    scrib("chalk", x, z, d, 0.4, 1.2 + hash(x, z, 4) * 0.25, right > 0 ? svg : svg === SCRIBBLE.exit ? EXIT_LEFT : mirror(svg)); out.message--; out.chalk = (out.chalk ?? 0) + 1;
    arrows++; last = i;
    if (arrows === 3) put("papers", { feetPosition: { ...cellCenter(x, z), y: 0 }, primitive: geo("papers", { seed: 7 }) });
  }
  out.routeLen = path.length;
  // 8 · Peeling Wallpaper Seams (Wikidot lore: wanderers peeling wallpaper looking for pipes / drywall / exits)
  // show, don't tell: a flap of the wall's own paper hangs half loose; a press peels it down and what's under it is drawn on the drywall
  for (let i = 0; i < 4; i++) {
    one(540 + i, any, (cx, cz, d) => {
      const w = wallPose(cx, cz, d, (hash(cx, cz, 12 + i) - 0.5) * 1.5, 0.012);
      const id = put("peeling", {
        tags: ["moment", "m-peeling", "usable"],
        feetPosition: { x: w.x, y: 1.35, z: w.z },
        rotation: w.yaw + 180,
        vector: UNDER[i],
        behavior: "scripts/moments.js",
        state: { kind: "peeling-wallpaper", name: "Torn Wallpaper Seam", verb: "Peel It Back", idx: i },
      });
      ctx.spawn({ id: "flap", parent: id, feetPosition: { x: 0, y: 0, z: 0.01 }, pivot: [0.5, 0, 0.5], rotation: { pitch: -9 }, primitive: { kind: "plane", width: 0.62, height: 1.14 }, material: { texture: WALLPAPER, repeat: [0.62 / 1.2, 1.14 / 1.2], color: "oklch(0.86 0.07 88)", roughness: 0.9, side: "double" }, castShadow: false });
    }, 4, 18);
  }
  // 9 · The Noclip Wall (Exit to Level 1, Wikidot Lore)
  const ex = cellCenter(EXIT.cx, EXIT.cz);
  const NOCLIP_FX = `fx
pop rift rate=8 burst=0 life=.6..1.2 on=box(.1,1.8,2.8) v=sdir()*.1 size=.03..0.07 col=<0,.85,.9> a=.7>0 sz=$size r=sprite(soft-disc,add)`;
  put("noclip-wall", {
    tags: ["moment", "m-noclip", "usable"],
    feetPosition: { x: -HALF + 0.05, y: 1.5, z: ex.z },
    rotation: 90,
    primitive: { kind: "plane", width: 3.2, height: 2.8 },
    material: { color: "#060910", roughness: 0.2 },
    ui: `<div face="front" width="3.2m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle,rgba(0,180,216,0.25) 0%,rgba(6,9,16,0.95) 75%);border:3px dashed #00d2d3;box-sizing:border-box;color:#00d2d3;font-family:'Courier New',monospace;padding:16px;text-align:center"><div style="font-size:36px;letter-spacing:4px;font-weight:900;text-shadow:0 0 12px #00d2d3">LEVEL 1 NOCLIP SEAM</div><div style="font-size:18px;color:#a8e6cf;margin-top:8px">PUSH THROUGH WALL TO NOCLIP</div><div style="font-size:14px;color:#888;margin-top:4px">WIKIDOT CLASS 1 · CONFIRMED EXIT</div></div>`,
    light: { kind: "point", color: "#00d2d3", intensity: 2.8, distance: 7 },
    fx: { script: NOCLIP_FX },
    audio: { clip: STATIC, loop: true, gain: 0.35, spatial: true, maxDistance: 12 },
    behavior: "scripts/moments.js",
    state: { kind: "noclip-wall", name: "Anomalous Noclip Wall Seam", verb: "Inspect Wall" },
  });
  // scattered paper elsewhere
  for (const seed of [701, 702, 703]) { const p = pick(seed, (cx, cz) => plainZone(cx, cz)); if (p) put("papers", { feetPosition: { ...cellCenter(p.cx, p.cz), y: 0 }, primitive: geo("papers", { seed: seed % 50 }) }); }
  return out;
}
