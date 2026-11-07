// Level 3 lore set pieces, laid once by places/level3/sim.js: purpified bodies sunk in the brick, murals, torn diary pages,
// the moth wall, a sludge pipe pouring into four kegs, boiler rooms, the small round brick room, a bulb over Object 56,
// and a rumble + steam on every generator. Models are Blender builds (art/level3/lore.py); cells are picked by hash().
import { N, S, cellCenter, openings, isOpen, isBars, zoneOf, hash, ARRIVE, SLUDGE, SPARKS, GENS, BLOCKS, inGamma } from "./level3.js";

const LM = {
  purp: { id: "/cdn/value.1394eef313a56a2544202697e05a7132f579cbdf1e2f1e2429af5b1c28cd0cf4.glb", offset: [0.004, 0.01, -0.491] },
  moths: { id: "/cdn/value.d6ac0dfdcabc8a82f53c1d1f0d1aa228ad6ad3fbc324e30368d757d259555d72.glb", offset: [-0.016, 0.247, -0.009] },
  kegs: { id: "/cdn/value.b8c96422bfc9190416d479cbaea370c1b8a48002cc3dcddc469711d8d8746632.glb", offset: [0.95, -0.025, -0.761] },
  boiler: { id: "/cdn/value.3b362439083eaf08b29b479da7bcf9611f127d27dd9a63a31aada7673c2b3ee4.glb", offset: [0.028, 0, -0.58] },
  drum: { id: "/cdn/value.3902cd8965935c1ec502fd39f545a0e7b367d5930202d3c96983dfe5341553d0.glb", offset: [0, 0, 0.161] },
};
const SFX = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const FACE = 1.7; // a wall's face from its cell centre (walls are 0.3 m each side of the line)
const closed = (cx, cz, d) => !isOpen(cx, cz, d) && !isBars(cx, cz, d);
// a point on wall d of a cell: `along` metres sideways (+ = the model's +X), `out` metres into the room, y up
function wallPt(cx, cz, d, along = 0, out = 0, y = 0) {
  const c = cellCenter(cx, cz), [dx, dz] = D4[d];
  return { x: c.x + dx * (FACE - out) + dz * along, y, z: c.z + dz * (FACE - out) - dx * along };
}
const yawOf = (d) => Math.atan2(D4[d][0], D4[d][1]) * 57.2958; // the model's -Z looks into the room

const PURPLE = `fx
pop motes rate=flick(.25,.7)*4 on=box(.7,.9,.08).c(1.2) life=3..5 v=up(.04..0.12)+sdir()*.05 size=.015..0.035 acc=curl(.3)*.15 col=hdr(1.6,.45,2.8) a=0>.25:.9>.75:.7>0 sz=$size r=sprite(mote,add)
pop glow n=1 at=point().c(1.2) r=light(<.62,.22,1>,1.3+.7*(time()*.9).sin,5)`;
const MOTHS = `fx
pop flutter n=?mobile:4|7 on=box(1.3,1,.4).c(1.5) life=2..4 v=sdir()*.3 acc=curl(1.2)*1.4+drag(1.2) size=.035..0.05 col=<.36,.31,.25> a=1 sz=$size*flick(16,.7) r=sprite(leaf,alpha)`;
const DRIP = `fx
pop drip rate=flick(.4,.5)*.9 on=point() life=.6..0.8 v=<0,-.3,0> acc=grav() size=.03..0.045 col=<.012,.01,.014> a=1 sz=$size r=sprite(droplet,alpha,velocity,.04) floor=die
pop splash on=@drip size=.03 burst=3 life=.3..0.5 v=up(.6..1)+sdir()*.4 acc=grav() col=<.02,.02,.025> a=1>0 sz=$size r=sprite(droplet,alpha)`;
const STEAM = `fx
pop steam rate=flick(.35,.8)*10 on=point() life=1..2 v=up(.5)+cone(30)*(.3..0.7) size=.1..0.18 acc=buoy(.4)+curl(.4)*.3+drag(1) col=<.7,.7,.68> a=0>.15:.22>.6:.12>0 sz=$size*(.6>2.6) rot=spin(.2) r=sprite(smoke-puff,alpha)`;
const FIRE = `fx
pop glow n=1 at=point() r=light(<1,.28,.06>,fire()*3.5+1,5)`;
const TUBE = `fx
pop buzz n=1 at=point() r=light(<.75,.88,1>,.9*flick(9,.35)*(.75+.25*step(.12,(time()*.37).sin.abs)),5)`;

const MURALS = [ // eyes, the spiral, a figure down a hallway, the scribbled-out angel
  `<svg viewBox='0 0 160 110' width='1.6m'><rect width='160' height='110' fill='#2a2620'/><g fill='none' stroke='#c9b98f' stroke-width='2'>${[[30, 30], [80, 22], [128, 34], [50, 70], [104, 74], [80, 95], [20, 88], [142, 86]].map(([x, y], i) => `<ellipse cx='${x}' cy='${y}' rx='${12 - (i % 3) * 2}' ry='6'/><circle cx='${x}' cy='${y}' r='3.5' fill='#0d0b09'/>`).join("")}</g><text x='80' y='108' font-family='sans-serif' font-size='5' fill='#7a2a24' text-anchor='middle'>THEY ARE BEHIND THE BARS</text></svg>`,
  `<svg viewBox='0 0 120 120' width='1.3m'><rect width='120' height='120' fill='#1c1d22'/><path d='M60 60 ${Array.from({ length: 70 }, (_, i) => { const a = i * 0.45, r = i * 0.75; return `L${(60 + Math.cos(a) * r).toFixed(1)} ${(60 + Math.sin(a) * r).toFixed(1)}`; }).join(" ")}' fill='none' stroke='#8d3b2c' stroke-width='2.2'/><circle cx='60' cy='60' r='3' fill='#e8dcc0'/></svg>`,
  `<svg viewBox='0 0 160 110' width='1.5m'><rect width='160' height='110' fill='#0b0a08'/><polygon points='0,0 160,0 98,42 62,42' fill='#3a2a1a'/><polygon points='0,110 160,110 98,68 62,68' fill='#4a4238'/><polygon points='0,0 62,42 62,68 0,110' fill='#5a3a26'/><polygon points='160,0 98,42 98,68 160,110' fill='#5a3a26'/><rect x='62' y='42' width='36' height='26' fill='#e8d8a0'/><path d='M80 66 L80 52 M76 56 L84 56 M80 66 L77 68 M80 66 L83 68' stroke='#050403' stroke-width='2.4'/><circle cx='80' cy='49' r='2.6' fill='#050403'/></svg>`,
  `<svg viewBox='0 0 110 140' width='1.1m'><rect width='110' height='140' fill='#d8cfb8'/><rect x='4' y='4' width='102' height='132' fill='none' stroke='#3a2c1c' stroke-width='5'/><path d='M55 30 C40 40 42 70 55 100 C68 70 70 40 55 30 Z' fill='#e9e2cf' stroke='#6a6050'/><path d='M50 50 C20 30 12 60 22 80 C34 70 44 62 50 58 M60 50 C90 30 98 60 88 80 C76 70 66 62 60 58' fill='#efe9da' stroke='#6a6050'/><circle cx='55' cy='24' r='8' fill='none' stroke='#b39a40' stroke-width='2'/><path d='M14 20 L96 120 M20 110 L92 26 M10 70 L100 66 M30 30 L80 110 M20 50 L95 95' stroke='#121010' stroke-width='5'/></svg>`,
];

export function layLore(ctx) {
  const n = { purp: 0, statueBulb: 0, mural: 0, page: 0, moths: 0, sludgeDrip: 0, kegs: 0, boiler: 0, genRumble: 0, drum: 0 };
  const used = new Set(SLUDGE.concat(SPARKS).map((h) => h.cx + "," + h.cz));
  const far = (cx, cz) => Math.abs(cx - ARRIVE.cx) + Math.abs(cz - ARRIVE.cz) > 6;
  const near = (cx, cz) => [...used].some((k) => { const [x, z] = k.split(",").map(Number); return Math.max(Math.abs(x - cx), Math.abs(z - cz)) < 2; });
  const cells = [];
  for (let cz = 0; cz < N; cz++) for (let cx = 5; cx < N; cx++) { const z = zoneOf(cx, cz); if ((z === "hall" || z === "dark") && !inGamma(cx, cz) && far(cx, cz)) cells.push([cx, cz]); }
  const deadEnd = (cx, cz) => { const o = openings(cx, cz); if (o.length !== 1) return -1; const b = (o[0] + 2) % 4; return [0, 1, 2, 3].every((d) => d === o[0] || closed(cx, cz, d)) ? b : -1; };
  // take the next free cell in this seed's order; dead: needs a dead end (returns its back wall)
  function take(seed, dead) {
    const order = cells.slice().sort((a, b) => hash(a[0], a[1], seed) - hash(b[0], b[1], seed));
    for (const [cx, cz] of order) {
      if (near(cx, cz)) continue;
      let d = -1;
      if (dead) d = deadEnd(cx, cz);
      else { const cl = [0, 1, 2, 3].filter((k) => closed(cx, cz, k)); if (cl.length) d = cl[Math.floor(hash(cx, cz, seed + 1) * cl.length)]; }
      if (d < 0) continue;
      used.add(cx + "," + cz); return { cx, cz, d };
    }
    return null;
  }
  const model = (name, p, d, extra = {}) => ctx.spawn({ tags: ["lore", "lore-" + name], feetPosition: p, rotation: { yaw: yawOf(d) }, model: { id: LM[name].id, offset: LM[name].offset }, castShadow: false, ...extra });

  // 8. boiler rooms: three dead ends, a riveted boiler on the back wall, red firebox, steam hiss, low rumble
  for (let i = 0; i < 3; i++) { const t = take(5101 + i * 7, true); if (!t) continue; const { cx, cz, d } = t;
    model("boiler", wallPt(cx, cz, d), d, { physics: { body: "static", collider: "mesh" }, audio: { clip: SFX("boiler-low-rumble-loop"), gain: 0.25, loop: true, spatial: true, maxDistance: 14 } });
    ctx.spawn({ tags: ["lore"], feetPosition: wallPt(cx, cz, d, 0, 1.25, 0.5), fx: { script: FIRE } });
    ctx.spawn({ tags: ["lore"], feetPosition: wallPt(cx, cz, d, 0.62, 0.75, 2.6), fx: { script: STEAM }, audio: { clip: SFX("steam-pipe-hiss-loop"), gain: 0.18, loop: true, spatial: true, maxDistance: 9 } });
    n.boiler++; }
  // 7. sludge: the leaking wall pipes drip slow and black; one pipe pours into four kegs in a plank-lined corner
  for (const h of SLUDGE) { ctx.spawn({ tags: ["lore"], feetPosition: { x: h.x, y: 0.28, z: h.z }, fx: { script: DRIP }, audio: { clip: SFX("thick-oil-drip-loop"), gain: 0.15, loop: true, spatial: true, maxDistance: 7 } }); n.sludgeDrip++; }
  { const t = take(5201, true); if (t) { const { cx, cz, d } = t;
    model("kegs", wallPt(cx, cz, d, 0.01, 0), d, { physics: { body: "static", collider: "mesh" } });
    ctx.spawn({ tags: ["lore"], feetPosition: wallPt(cx, cz, d, 0.95, 0.75, 1.05), fx: { script: DRIP }, audio: { clip: SFX("thick-oil-drip-loop"), gain: 0.18, loop: true, spatial: true, maxDistance: 7 } });
    ctx.spawn({ tags: ["lore"], feetPosition: wallPt(cx, cz, d, -0.6, 1.2, 2.7), light: { kind: "point", color: "oklch(0.75 0.12 70)", intensity: 1.2, distance: 6 } });
    n.kegs++; } }
  // 9. the small round brick room in a dead end, its doorway on the way in, one weak buzzing tube
  { const t = take(5301, true); if (t) { const { cx, cz, d } = t; const o = (d + 2) % 4, c = cellCenter(cx, cz);
    model("drum", { x: c.x, y: 0, z: c.z }, o, { physics: { body: "static", collider: "mesh" } });
    const [ox, oz] = D4[o];
    ctx.spawn({ tags: ["lore"], feetPosition: { x: c.x + ox * 1.2, y: 2.35, z: c.z + oz * 1.2 }, fx: { script: TUBE }, audio: { clip: SFX("fluorescent-tube-weak-buzz-loop"), gain: 0.15, loop: true, spatial: true, maxDistance: 7 } });
    n.drum++; } }
  // 6. the moth wall: hundreds of still moths on one wall, a few loose, a dry rustle
  { const t = take(5401, false); if (t) { const { cx, cz, d } = t;
    model("moths", wallPt(cx, cz, d), d, { audio: { clip: SFX("moth-wings-dry-rustle-loop"), gain: 0.16, loop: true, spatial: true, maxDistance: 8 } });
    ctx.spawn({ tags: ["lore"], feetPosition: wallPt(cx, cz, d, 0, 0.4, 0), fx: { script: MOTHS } });
    n.moths++; } }
  // 1. purpification: three bodies half sunk in the brick, the wall stained and glowing violet around them
  for (let i = 0; i < 3; i++) { const t = take(5501 + i * 11, false); if (!t) continue; const { cx, cz, d } = t;
    model("purp", wallPt(cx, cz, d), d, { audio: { clip: SFX("low-electric-whine-loop"), gain: 0.12, loop: true, spatial: true, maxDistance: 7 } });
    ctx.spawn({ tags: ["lore"], feetPosition: wallPt(cx, cz, d, 0, 0.35, 0), fx: { script: PURPLE } });
    n.purp++; }
  // 3. murals and paintings, dim, each with a weak lamp
  for (let i = 0; i < MURALS.length; i++) { const t = take(5601 + i * 13, false); if (!t) continue; const { cx, cz, d } = t;
    const p = wallPt(cx, cz, d, 0, 0.03, 1.55);
    ctx.spawn({ tags: ["lore", "lore-mural"], feetPosition: p, rotation: { yaw: yawOf(d) }, vector: MURALS[i] });
    ctx.spawn({ tags: ["lore"], feetPosition: wallPt(cx, cz, d, 0, 0.9, 2.6), light: { kind: "point", color: "oklch(0.78 0.08 75)", intensity: 0.7, distance: 4 } });
    n.mural++; }
  // 4. diary pages: torn notebook pages by the walls, E reads them (a container holding page:<n>)
  const PAGES = [
    "they hum when nobody's there. they HUM. it gets in your head",
    "do not follow the ringing. do not look into the generator vents",
    "the statue moved. 2 rooms behind the bars. i counted",
    "moths on the wall. thousands of them. all facing me",
    "purple in the brick. it was Hank. he noclipped into the mortar",
    "the hounds bark in code. they herd you into the blind crawlways",
    "the black sludge is boiling. do not drink it. not almond water",
    "Base Gamma has the only thick walls left. pray they let you in"
  ];
  for (let i = 0; i < PAGES.length; i++) { const t = take(5701 + i * 17, false); if (!t) continue; const { cx, cz, d } = t;
    const p = wallPt(cx, cz, d, (hash(cx, cz, 3) - 0.5) * 2, 0.25, 0.005);
    ctx.spawn({ tags: ["lore", "lore-page", "container", "breakable"], feetPosition: p, rotation: { yaw: yawOf(d) + (hash(cx, cz, 4) - 0.5) * 50 }, physics: "static",
      primitive: { kind: "box", width: 0.21, height: 0.004, depth: 0.28 }, material: { color: "oklch(0.86 0.025 90)", roughness: 1 },
      ui: `<div face="top" width="0.21m" style="padding:10px;font-family:serif;font-size:15px;line-height:1.05;color:#1d2a52;background:repeating-linear-gradient(#e6dfcc 0 17px,#9fb0cf 17px 18px)">${PAGES[i]}<br>— — — —<br>it's so quiet when you stop</div>`,
      state: { mat: "wood", hp: 5, maxHp: 5, name: "Notebook page", items: "page:" + (1 + (i * 3) % 8) } });
    n.page++; }
  // 2. Object 56 (the Blender statue in its vault): one bare bulb over her
  for (const b of BLOCKS) if (b.type === "vault" && b.content === "statue") { const c0 = cellCenter(b.x0, b.z0), x = c0.x + S / 2, z = c0.z + S / 2;
    ctx.spawn({ tags: ["lore"], feetPosition: { x: x + 0.4, y: 2.55, z }, primitive: { kind: "sphere", radius: 0.05 }, material: { color: "oklch(0.95 0.06 85)", emissive: "oklch(0.9 0.12 80)", emissiveIntensity: 3 },
      light: { kind: "point", color: "oklch(0.82 0.1 75)", intensity: 3, distance: 7 } });
    ctx.spawn({ tags: ["lore"], feetPosition: { x: x + 0.4, y: 2.6, z }, primitive: { kind: "cylinder", radiusTop: 0.005, radiusBottom: 0.005, height: 0.4 }, material: { color: "#111" } });
    n.statueBulb++; }
  // 8. every generator room: a low rumble under the hum, steam off the housing
  for (const g of GENS) { ctx.spawn({ tags: ["lore"], feetPosition: { x: g.x + 0.6, y: 2.3, z: g.z }, fx: { script: STEAM }, audio: { clip: SFX("industrial-low-rumble-loop"), gain: 0.22, loop: true, spatial: true, maxDistance: 18 } }); n.genRumble++; }
  return n;
}
