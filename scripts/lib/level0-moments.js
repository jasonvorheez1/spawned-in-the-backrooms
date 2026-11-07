// Level 0 moments: the places a walk through the yellow remembers. Laid once (place.state.momentsV), every
// cell picked by hash() so each room of the game finds them in the same spots. Props sit against walls only.
import { N, S, H, HALF, MID, hash, inHub, zoneOf, cellCenter, wallX, wallZ, isArchWall, hasPit, hasPillar, hasLight, EXIT } from "./maze.js";
import { DRIP } from "../moments.js";
const GEO = "scripts/moments-geo.js";
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
const mirror = (svg) => svg.replace(/<svg ([^>]*)>/, "<svg $1><g transform='translate(200 0) scale(-1 1)'>").replace(/<\/svg>$/, "</g></svg>");

export function layMoments(ctx) {
  const used = new Set(), pick = picker(used), out = {}, put = (kind, spec) => { out[kind] = (out[kind] ?? 0) + 1; return ctx.spawn({ tags: ["moment", "m-" + kind], ...spec }); };
  const geo = (kind, params = {}) => ({ kind: "scripted", script: GEO, params: { kind, ...params } });
  const onWall = (kind, cx, cz, d, along, extra = {}) => { const w = wallPose(cx, cz, d, along); return put(kind, { feetPosition: { x: w.x, y: 0, z: w.z }, rotation: w.yaw, primitive: geo(kind), ...extra }); };
  const scrib = (key, cx, cz, d, along, y, svg = SCRIBBLE[key]) => { const w = wallPose(cx, cz, d, along, 0.012); return put("message", { feetPosition: { x: w.x, y, z: w.z }, rotation: w.yaw + 180, vector: svg, state: { msg: key } }); };

  // 1 · the Manila Room: a 3×3 patch of bare folder-yellow walls
  const man = pick(101, (cx, cz) => { for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (!plainZone(cx + a, cz + b) || inHub(cx + a, cz + b) || hasPit(cx + a, cz + b)) return false; return true; }, 6, 16);
  if (man) { const { cx, cz } = man; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) used.add(cx + a + "," + (cz + b)); put("manila", { feetPosition: { x: 0, y: 0, z: 0 }, primitive: geo("manila", { cx0: cx, cz0: cz, w: 3, h: 3 }) }); out.manilaAt = cellCenter(cx + 1, cz + 1); }
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
  // 4 · the flooded room: an inch of standing water on the carpet, a stain above, drips
  const fl = pick(404, (cx, cz) => plainZone(cx, cz) && hasLight(cx, cz) && walls(cx, cz).length >= 2, 4, 14);
  if (fl) {
    const c = cellCenter(fl.cx, fl.cz);
    put("water", { feetPosition: { x: c.x, y: 0.005, z: c.z }, primitive: { kind: "box", width: S - 0.22, height: 0.025, depth: S - 0.22 }, material: { kind: "water", color: "oklch(0.62 0.06 90)", opacity: 0.55, waveIntensity: 0.12 }, audio: { clip: DRIP, loop: true, gain: 0.25, spatial: true, maxDistance: 14 } });
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
  const msg = [["notsafe", 1.55], ["lights", 1.5], ["tally", 1.3], ["notsafe", 1.7], ["lights", 1.45], ["arrow", 1.4]];
  msg.forEach(([k, y], i) => { const p = one(520 + i, any, (cx, cz, d) => { scrib(k, cx, cz, d, (hash(cx, cz, 9) - 0.5) * 1.6, y); if (!out.msgAt) out.msgAt = { ...cellCenter(cx, cz), d }; }, 3, 15); });
  // 6 · the old wanderer's camp, with its note
  const cp = pick(601, (cx, cz) => corner(cx, cz) && plainZone(cx, cz) && hasLight(cx, cz), 4, 13);
  if (cp) {
    const [a, b, yw] = corner(cp.cx, cp.cz), xs = [a, b].includes(0) ? lo(cp.cx + 1) - 0.1 : lo(cp.cx) + 0.1, zs = [a, b].includes(1) ? lo(cp.cz + 1) - 0.1 : lo(cp.cz) + 0.1;
    put("camp", { feetPosition: { x: xs, y: 0, z: zs }, rotation: yw, primitive: geo("camp"), physics: { body: "static", collider: "auto" } });
    const r = (yw * Math.PI) / 180, lx = 1.05, lz = -1.05, nx = xs + lx * Math.cos(r) + lz * Math.sin(r), nz = zs - lx * Math.sin(r) + lz * Math.cos(r);
    put("note", { feetPosition: { x: nx, y: 0, z: nz }, tags: ["moment", "m-note", "usable"], primitive: { kind: "box", width: 0.22, height: 0.02, depth: 0.3 }, visible: false, behavior: "scripts/moments.js", state: { kind: "note", name: "Wanderer's note", verb: "Read", info: "pencil, smudged", text: "Day 31? Ran out of the water. The lights hum louder when they're close. Follow the chalk west, it's still there, it HAS to be. — R." } });
    scrib("tally", cp.cx, cp.cz, a, 0.9, 1.25);
    out.campAt = cellCenter(cp.cx, cp.cz);
  }
  // 7 · the chalk route: arrows on side walls along the way from the safe room to the exit
  const key = (x, z) => x + "," + z, start = [Math.floor(MID), Math.floor(MID)], prev = new Map([[key(...start), null]]), Q = [start];
  const step = (x, z) => [[1, 0, !wallX(x, z)], [-1, 0, !wallX(x - 1, z)], [0, 1, !wallZ(x, z)], [0, -1, !wallZ(x, z - 1)]];
  while (Q.length) { const [x, z] = Q.shift(); if (x === EXIT.cx && z === EXIT.cz) break; for (const [dx, dz, open] of step(x, z)) { const nx = x + dx, nz = z + dz; if (!open || nx < 0 || nz < 0 || nx >= N || nz >= N || prev.has(key(nx, nz)) || hasPit(nx, nz)) continue; prev.set(key(nx, nz), [x, z]); Q.push([nx, nz]); } }
  const path = []; for (let c = prev.has(key(EXIT.cx, EXIT.cz)) ? [EXIT.cx, EXIT.cz] : null; c; c = prev.get(key(...c))) path.unshift(c);
  let last = -9, arrows = 0;
  for (let i = 1; i < path.length - 1 && arrows < 14; i++) {
    const [x, z] = path[i]; if (inHub(x, z) || i - last < 4) continue;
    const tx = path[i + 1][0] - x, tz = path[i + 1][1] - z, sides = tx ? [1, 3] : [0, 2], d = sides.find((s) => hasWall(x, z, s)); if (d == null) continue;
    const [nx, nz] = NRM[d], right = nz * tx + -nx * tz; // the viewer's right, facing the wall
    const svg = i === path.length - 2 || arrows % 4 === 3 ? SCRIBBLE.exit : SCRIBBLE.arrow;
    scrib("chalk", x, z, d, 0.4, 1.2 + hash(x, z, 4) * 0.25, right > 0 ? svg : mirror(svg)); out.message--; out.chalk = (out.chalk ?? 0) + 1;
    arrows++; last = i;
    if (arrows === 3) put("papers", { feetPosition: { ...cellCenter(x, z), y: 0 }, primitive: geo("papers", { seed: 7 }) });
  }
  out.routeLen = path.length;
  // scattered paper elsewhere
  for (const seed of [701, 702, 703]) { const p = pick(seed, (cx, cz) => plainZone(cx, cz)); if (p) put("papers", { feetPosition: { ...cellCenter(p.cx, p.cz), y: 0 }, primitive: geo("papers", { seed: seed % 50 }) }); }
  return out;
}
