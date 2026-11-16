import { dressLevel } from "../../scripts/lib/kit-levels.js";
// Level 34 "Sewer System": the referee. Lays the sewer once (V), keeps its Drain Smilers fed back in after a while.
// Layout, all at floor y 0, the bore four feet high (crawl through: scripts/crawl.js):
//   shaft A (0,0) step-irons up to Level 9's storm drain → tunnel north 20 m → junction (0,25): foul pool, dive down to Level 7;
//   a dead-end east branch (the smilers' lair) → tunnel on 20 m → shaft B (0,50) step-irons up to Level 11's street grate.
export const cadence = "1s";
const V = 5;
const RELAY_CASE = {
  tags: ["usable"],
  feetPosition: { x: 17.2, y: 0.05, z: 25 },
  rotation: { yaw: -90 },
  primitive: { kind: "box", width: 0.36, height: 0.2, depth: 0.28 },
  material: { color: "#4e5642", roughness: 0.6 },
  physics: { body: "static", collider: "box" },
  behavior: "scripts/l11-ch2-drop.js",
  state: { kind: "l34-ch2-relay", name: "Waterproof Relay Case", verb: "Recover Relay" },
  children: [{ offset: { x: 0.14, y: 0.11, z: 0.09 }, primitive: { kind: "box", width: 0.06, height: 0.03, depth: 0.06 }, material: { color: "#7fe0b0", emissive: "#48c78e", emissiveIntensity: 1.4 } }],
};
const GEO = "scripts/l34-sewer-geo.js";
const WATER = { kind: "water", color: "oklch(0.52 0.09 95)", opacity: 0.88, waveIntensity: 0.15 };
const SMILERS = [
  { id: "l34-smiler-lair", at: { x: 16.5, z: 25 }, route: [[16.5, 25], [5, 25], [2.6, 25], [2.6, 27.5], [0, 31], [2.6, 27.5], [2.6, 25], [5, 25]] },
  { id: "l34-smiler-run", at: { x: 0, z: 40 }, route: [[0, 46], [0, 30], [-2.6, 27.5], [-2.6, 22.5], [0, 19], [0, 6], [0, 19], [-2.6, 22.5], [-2.6, 27.5], [0, 30]] },
];
const RESPAWN_MS = 6 * 60 * 1000; // her pick: a killed smiler is back six minutes later

function lay(ctx) {
  for (const id of Object.keys(ctx.place.objects ?? {})) if (/^l34-/.test(id) && !id.includes("/")) ctx.destroy(id); // smilers too: they respawn on the new routes
  const sp = (id, spec) => ctx.spawn(id, spec);
  const geo = (id, x, z, params, extra = {}) => sp(id, { feetPosition: { x, y: 0, z }, primitive: { kind: "scripted", script: GEO, params }, castShadow: false, ...extra });
  const B = (id, x0, x1, y0, y1, z0, z1) => sp(id, { feetPosition: { x: (x0 + x1) / 2, y: y0, z: (z0 + z1) / 2 }, primitive: { kind: "box", width: x1 - x0, height: y1 - y0, depth: z1 - z0 }, visible: false, physics: "static" });
  // the drawn sewer
  geo("l34-a", 0, 0, { kind: "room", w: 3, d: 3, h: 6, shaft: true, doors: [["s", 0]] });
  geo("l34-t1", 0, 1.5, { kind: "tunnel", len: 20 });
  geo("l34-j", 0, 25, { kind: "room", w: 7, d: 7, h: 2, rise: 1.2, doors: [["n", 0], ["s", 0], ["e", 0]], pool: [3, 3, 2.5] });
  geo("l34-t2", 0, 28.5, { kind: "tunnel", len: 20 });
  geo("l34-b", 0, 50, { kind: "room", w: 3, d: 3, h: 6, shaft: true, doors: [["n", 0]] });
  geo("l34-t3", 3.5, 25, { kind: "tunnel", len: 15, axis: "x", caps: [0, 1] });
  // what you stand on and bump into
  B("l34-c-floor-s", -4, 19, -0.3, 0, -2, 23.5); B("l34-c-floor-n", -4, 19, -0.3, 0, 26.5, 52);
  B("l34-c-floor-w", -4, -1.5, -0.3, 0, 23.5, 26.5); B("l34-c-floor-e", 1.5, 19, -0.3, 0, 23.5, 26.5);
  B("l34-c-pool-bed", -1.5, 1.5, -2.8, -2.5, 23.5, 26.5);
  for (const [z0, z1] of [[1.5, 21.5], [28.5, 48.5]]) { // straight tunnels
    B(`l34-c-tw-${z0}`, -1.1, -0.8, 0, 1.6, z0, z1); B(`l34-c-te-${z0}`, 0.8, 1.1, 0, 1.6, z0, z1); B(`l34-c-tc-${z0}`, -1.1, 1.1, 1.25, 1.6, z0, z1);
  }
  B("l34-c-t3n", 3.5, 18.8, 0, 1.6, 23.9, 24.2); B("l34-c-t3s", 3.5, 18.8, 0, 1.6, 25.8, 26.1); B("l34-c-t3c", 3.5, 18.8, 1.25, 1.6, 23.9, 26.1); B("l34-c-t3end", 18.5, 18.8, 0, 1.6, 24, 26);
  for (const [k, cz, door] of [["a", 0, "s"], ["b", 50, "n"]]) { // the two shafts
    B(`l34-c-${k}w`, -1.8, -1.5, 0, 6.3, cz - 1.5, cz + 1.5); B(`l34-c-${k}e`, 1.5, 1.8, 0, 6.3, cz - 1.5, cz + 1.5);
    B(`l34-c-${k}top`, -1.8, 1.8, 6, 6.3, cz - 1.8, cz + 1.8);
    const solid = door === "s" ? cz - 1.5 : cz + 1.5, open = door === "s" ? cz + 1.5 : cz - 1.5, s = door === "s" ? -1 : 1;
    B(`l34-c-${k}solid`, -1.8, 1.8, 0, 6.3, Math.min(solid, solid - s * 0.3), Math.max(solid, solid - s * 0.3));
    const oz0 = Math.min(open, open + -s * 0.3), oz1 = Math.max(open, open + -s * 0.3);
    B(`l34-c-${k}dl`, -1.5, -0.8, 0, 6, oz0, oz1); B(`l34-c-${k}dr`, 0.8, 1.5, 0, 6, oz0, oz1); B(`l34-c-${k}dt`, -0.8, 0.8, 1.25, 6, oz0, oz1);
  }
  // junction room 7 x 7, doors north, south, east
  B("l34-c-jw", -3.8, -3.5, 0, 3.4, 21.5, 28.5); B("l34-c-jc", -3.8, 3.8, 3.2, 3.5, 21.2, 28.8);
  for (const [k, z0, z1] of [["n", 21.2, 21.5], ["s", 28.5, 28.8]]) { B(`l34-c-j${k}l`, -3.8, -0.8, 0, 3.4, z0, z1); B(`l34-c-j${k}r`, 0.8, 3.8, 0, 3.4, z0, z1); B(`l34-c-j${k}t`, -0.8, 0.8, 1.25, 3.4, z0, z1); }
  B("l34-c-jel", 3.5, 3.8, 0, 3.4, 21.5, 24.2); B("l34-c-jer", 3.5, 3.8, 0, 3.4, 25.8, 28.5); B("l34-c-jet", 3.5, 3.8, 1.25, 3.4, 24.2, 25.8);
  // water: the junction pool you swim (scripts/swim.js) and the gutters' foul yellow trickle
  sp("l34-pool", { tags: ["swimwater"], feetPosition: { x: 0, y: -2.5, z: 25 }, primitive: { kind: "box", width: 3, height: 2.35, depth: 3 }, material: WATER, castShadow: false });
  sp("l34-pool-down", { feetPosition: { x: 0, y: -2.5, z: 25 }, primitive: { kind: "box", width: 2.6, height: 0.55, depth: 2.6 }, visible: false, physics: { body: "static", trigger: true }, behavior: "scripts/level-door.js", state: { to: "level7#l7-from-l6" } });
  for (const [id, x, z, w, d] of [["g1", 0, 11.5, 0.64, 20], ["g2", 0, 38.5, 0.64, 20], ["g3", 11, 25, 15, 0.64]]) sp(`l34-${id}`, { feetPosition: { x, y: -0.065, z }, primitive: { kind: "box", width: w, height: 0.03, depth: d }, material: WATER, castShadow: false });
  // the ways up: iron step-irons in each shaft wall, pressed to climb
  const IRONS = (id, z, yaw, to, where) => sp(id, { tags: ["usable"], feetPosition: { x: 0, y: 0, z }, rotation: { yaw }, primitive: { kind: "scripted", script: GEO, params: { kind: "rungs", n: 18 } }, physics: { body: "static", collider: "box" }, behavior: "scripts/sewer-grate.js", state: { name: "Step irons", verb: "Climb up", to, info: where } });
  IRONS("l34-up-l9", -1.5, 180, "level9#l9-from-l34", "Up to a storm drain.");
  IRONS("l34-up-l11", 51.5, 0, "level11#l11-from-l34", "Up to a street grate.");
  // a thin cold light falling down each shaft through the grate above: the only light the sewer has of its own
  sp("l34-a-glow", { feetPosition: { x: 0, y: 5.6, z: 0 }, light: { kind: "point", color: "oklch(0.78 0.12 65)", intensity: 3, distance: 14, shadow: { enabled: false } } });
  sp("l34-b-glow", { feetPosition: { x: 0, y: 5.6, z: 50 }, light: { kind: "point", color: "oklch(0.82 0.03 230)", intensity: 3, distance: 14, shadow: { enabled: false } } });
  // a knee-high stone lip round the pool (Shelly fell in walking through, Nov 13): you walk round it, or hop it on purpose to dive
  const LIP = { color: "oklch(0.36 0.025 80)", roughness: 0.95 };
  for (const [id, x, z, w, d] of [["n", 0, 26.6, 3.4, 0.2], ["s", 0, 23.4, 3.4, 0.2], ["e", 1.6, 25, 0.2, 3], ["w", -1.6, 25, 0.2, 3]])
    sp("l34-pool-lip-" + id, { feetPosition: { x, y: 0, z }, primitive: { kind: "box", width: w, height: 0.4, depth: d }, material: LIP, physics: "static", castShadow: false });
  sp("l34-pool-glow", { feetPosition: { x: 0, y: -0.6, z: 25 }, light: { kind: "point", color: "oklch(0.7 0.12 110)", intensity: 0.35, distance: 6, shadow: { enabled: false } } });
  sp("l34-a-grate", { feetPosition: { x: 0, y: 5.95, z: 0 }, primitive: { kind: "box", width: 0.9, height: 0.05, depth: 0.6 }, material: { texture: "cdn/texture-rusty-cast-iron-storm-drain-grate-slots.png", color: "oklch(0.35 0.03 50)", roughness: 0.7, metalness: 0.5 } });
  sp("l34-b-grate", { feetPosition: { x: 0, y: 5.95, z: 50 }, primitive: { kind: "box", width: 0.9, height: 0.05, depth: 0.6 }, material: { texture: "cdn/texture-rusty-cast-iron-storm-drain-grate-slots.png", color: "oklch(0.35 0.03 50)", roughness: 0.7, metalness: 0.5 } });
  // arrivals: at the foot of each shaft's irons, looking down the tunnel
  sp("l34-from-l9", { feetPosition: { x: 0, y: 0.1, z: 0.2 }, rotation: { lookAt: { x: 0, y: 0, z: 10 } } });
  sp("l34-from-l11", { feetPosition: { x: 0, y: 0.1, z: 49.8 }, rotation: { lookAt: { x: 0, y: 0, z: 40 } } });
  // the sound of it: water dripping into water, a trickle, the hush of a long brick throat
  sp("l34-bed", { feetPosition: { x: 0, y: 1, z: 25 }, audio: { clip: "cdn/ambience-sewer-tunnel-dripping-water-echo-slow-trickle-loop.mp3", loop: true, gain: 0.16, spatial: false, bus: "Ambience" } });
  sp("l34-pool-drip", { feetPosition: { x: 0, y: 0.5, z: 25 }, audio: { clip: "cdn/sfx-water-drops-falling-into-deep-pool-echo-loop.mp3", loop: true, gain: 0.3, spatial: true, maxDistance: 14 } });
  sp("l34-courier-bag", { tags: ["container"], feetPosition: { x: -2.4, y: 0, z: 25 }, rotation: { yaw: 25 }, primitive: { kind: "box", width: 0.52, height: 0.28, depth: 0.34 }, material: { color: "oklch(0.28 0.04 160)", roughness: 0.7 }, physics: "static", visibleRange: { max: 35 }, state: { name: "Waterproof Courier Drybag", verb: "Search", info: "Wedged behind a drainage pipe.", items: "ubook:l34_sewer_sneak,bandage,battery" } });
}

function feed(ctx, s) {
  const now = ctx.now();
  for (const S of SMILERS) {
    if (ctx.place.objects[S.id]) continue;
    const dead = (s.deadAt ??= {})[S.id];
    if (dead && now - dead < RESPAWN_MS) continue;
    ctx.spawn(S.id, {
      tags: ["smiler", "l34-smiler", "hostile"], feetPosition: { x: S.at.x, y: 0.05, z: S.at.z }, castShadow: false, visibleRange: { max: 40 },
      model: { id: "/cdn/value.fb443f6a23bcd4977c437db42b3f9abe2510fcb6cf2076ee4956fb235d581b26.glb", forward: "+x" },
      layout: { box: { min: { x: -0.45, y: 0, z: -0.35 }, max: { x: 0.45, y: 1.12, z: 0.35 } } }, // hunched to fit the four-foot bore
      physics: { body: "character" }, behavior: "scripts/l34-smiler.js",
      state: { hp: 90, maxHp: 90, name: "Drain Smiler", route: S.route, leg: 0 },
    });
    delete s.deadAt[S.id];
  }
}

export function tick(ctx) {
  dressLevel(ctx, "level34");
  const s = ctx.place.state;
  if (s.l34V !== V) { lay(ctx); s.l34V = V; }
  if (!ctx.place.objects?.["l34-ch2-relay"]) ctx.spawn("l34-ch2-relay", RELAY_CASE);
  if (ctx.place.players.length) feed(ctx, s);
}
