// Level 27 "The Bunker Springs" (backrooms-wiki.wikidot.com/level-27): one small limestone cave around a warm, potable, mineral-rich spring.
// Two waterfalls feed it; a drain too small to crawl into empties it. The M.E.G. built steel stairs up to the tunnel the first waterfall runs out of:
// walk up the stream and you are back where you came from. No entities. The cave is art/level27/build.py (l27_cave.glb), in game coordinates.
// What you do here: bathe (sanity and health come back, past a few minutes the heat makes you dizzy), drink, and break travertine and calcite
// for the Level 27 recipes (scripts/lib/data/craft.yml). Use: scripts/l27-use.js. Numbers: Savi's picks.
import { maxHp, maxSan } from "../../scripts/player.js";
import { DRIP, RIPPLE } from "../../scripts/lib/ambient.js";
export const cadence = "1s";
const V = 5;
const CAVE = "/cdn/value.8ee97464d76b59ba323139f76410fd015f304ffe8a5df300024cac2cac8cee69.glb";
const FLOW = "/cdn/value.fc172db4defdc02603c499ccc386d3fea6fb504d8b388408de18c1ef734f6c34.glb"; // Level 8's flowstone mound
const ROCK = (kind, color) => ({ texture: kind === "wet" ? "cdn/texture-wet-grey-limestone-cave-wall-rock.png" : "cdn/texture-pale-cream-flowstone-calcite-cave-formation.png", wrap: "repeat", repeat: [0.4, 0.4], color, roughness: kind === "wet" ? 0.35 : 0.6, side: "double" });
const WATER = { kind: "water", color: "oklch(0.55 0.08 195)", opacity: 0.78, waveIntensity: 0.04 };
const BATH = { cx: -1.2, cz: -2.6, rx: 4.4, rz: 3.8 }, LOBE = { cx: 4.2, cz: -2.6, rx: 3.4, rz: 2.3 };
const inPool = (p) => p.y < 0.25 && [BATH, LOBE].some((e) => ((p.x - e.cx) / e.rx) ** 2 + ((p.z - e.cz) / e.rz) ** 2 < 0.95);
const STEAM = `fx
pop steam rate=?mobile:5|9 on=disc(3.6) life=4..7 v=up(.15..0.35)+sdir()*.05 size=.6..1.2 acc=curl(.2)*.3+drag(.4) sz=$size*(.6>2.4) col=<.92,.94,.95> a=0>.18:.12>.7:.06>0 rot=spin(.08) r=sprite(smoke-puff,alpha)`;
const FALL = `fx
pop sheet rate=?mobile:40|80 on=line(<-.35,0,0>,<.35,0,0>) life=.55..0.75 v=<0,-.5,.45>+sdir()*.08 size=.07..0.12 acc=grav()*.9 col=<.82,.9,.92> a=.75>.6:.6>0 sz=$size r=sprite(soft-disc,alpha,velocity,.05)
pop mist rate=?mobile:4|8 on=point() pos=<0,-%drop|2.4,.6> life=1..1.8 v=sdir()*.4+up(.2) size=.3..0.6 acc=drag(1)+buoy(.2) sz=$size*(.6>2) col=<.9,.94,.96> a=0>.2:.14>.6:.08>0 r=sprite(smoke-puff,alpha)`;
const pts = (n, f) => Array.from({ length: n }, (_, i) => f(i));
function lay(ctx) {
  const sp = (id, spec) => { if (ctx.place.objects[id]) ctx.destroy(id); return ctx.spawn(id, spec); };
  for (const id of ["l27-fall-w-sheet", "l27-fall-e-sheet"]) if (ctx.place.objects[id]) ctx.destroy(id);
  // the cave: the model's own box is min (-9.36,-1.31,-22.68) max (15.02,7.27,6.47); its bottom centre goes there so it stands in its own coordinates
  sp("l27-cave", { feetPosition: { x: 2.827, y: -1.314, z: -8.105 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, state: { floor: "rock" },
    model: { id: CAVE, materials: { limestone: ROCK("wet", "oklch(0.42 0.03 70)"), flowstone: ROCK("rock", "oklch(0.66 0.035 80)"), steel: { color: "oklch(0.34 0.01 230)", metalness: 0.8, roughness: 0.45 }, paint: { color: "oklch(0.74 0.15 85)", metalness: 0.2, roughness: 0.6 } } } });
  // the spring and its east lobe: warm, clear, waist deep
  sp("l27-pool", { tags: ["swimwater"], feetPosition: { x: BATH.cx, y: -1.3, z: BATH.cz }, primitive: { kind: "cylinder", radiusTop: 1, radiusBottom: 1, height: 1.18, radialSegments: 48 }, scale: { x: BATH.rx, y: 1, z: BATH.rz }, material: WATER });
  sp("l27-lobe", { tags: ["swimwater"], feetPosition: { x: LOBE.cx, y: -0.95, z: LOBE.cz }, primitive: { kind: "cylinder", radiusTop: 1, radiusBottom: 1, height: 0.83, radialSegments: 40 }, scale: { x: LOBE.rx, y: 1, z: LOBE.rz }, material: WATER });
  sp("l27-pool-glow", { feetPosition: { x: -1.2, y: -0.7, z: -2.6 }, light: { kind: "point", color: "oklch(0.75 0.1 195)", intensity: 2.2, distance: 9, shadow: { enabled: false } } });
  sp("l27-steam", { feetPosition: { x: 0.2, y: -0.05, z: -2.6 }, fx: { script: STEAM } });
  // the stream down the exit tunnel, along its east side, and the fall where it pours off the lip beside the stairs
  sp("l27-stream", { feetPosition: { x: -4.85, y: 2.41, z: -13.6 }, primitive: { kind: "box", width: 0.7, height: 0.02, depth: 14 }, material: WATER });
  sp("l27-fall-w", { feetPosition: { x: -4.85, y: 2.4, z: -6.55 }, fx: { script: FALL, params: { drop: 2.5 } }, audio: { clip: "cdn/sfx-small-waterfall-splashing-into-rock-pool-loop.mp3", loop: true, gain: 0.32, spatial: true, maxDistance: 22, bus: "Ambience" } });
  // the second fall, out of the tunnel that leads nowhere, into the east lobe
  sp("l27-fall-e", { feetPosition: { x: 7.05, y: 3.1, z: -2.5 }, rotation: { yaw: 90 }, fx: { script: FALL, params: { drop: 3.4 } }, audio: { clip: "cdn/sfx-small-waterfall-splashing-into-rock-pool-loop.mp3", loop: true, gain: 0.28, spatial: true, maxDistance: 20, bus: "Ambience" } });
  sp("l27-drain", { feetPosition: { x: -7.6, y: 0.05, z: 0.3 }, fx: { script: RIPPLE } });
  // light: a cold spot on the flowstone over the pool, as in the photo; warm M.E.G. work lamps by the stairs and up the tunnel
  sp("l27-spot", { feetPosition: { x: 2.5, y: 5.6, z: 3.5 }, light: { kind: "spot", color: "oklch(0.93 0.03 230)", intensity: 9, distance: 18, angle: 38, penumbra: 0.6, aim: { x: -1.5, y: 1.5, z: -5.5 }, shadow: { enabled: false } } });
  const lamp = (id, x, y, z) => sp(id, { feetPosition: { x, y, z }, physics: "static", primitive: { kind: "cylinder", radiusTop: 0.025, radiusBottom: 0.04, height: 1.6 }, material: { color: "oklch(0.74 0.15 85)", metalness: 0.3, roughness: 0.6 },
    children: [
      { feetPosition: { x: 0, y: 1.55, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.08, radiusBottom: 0.11, height: 0.14 }, material: { color: "oklch(0.3 0.01 230)", metalness: 0.7, roughness: 0.4 } },
      { feetPosition: { x: 0, y: 1.5, z: 0 }, primitive: { kind: "sphere", radius: 0.06 }, material: { color: "oklch(0.95 0.06 80)", emissive: "oklch(0.92 0.1 75)", emissiveIntensity: 4 } },
      { feetPosition: { x: 0, y: 1.45, z: 0 }, light: { kind: "point", color: "oklch(0.86 0.1 72)", intensity: 1.6, distance: 9, shadow: { enabled: false } } }] });
  lamp("l27-lamp-0", -7.5, 0, -1.6); lamp("l27-lamp-1", -7.4, 2.4, -9.5); lamp("l27-lamp-2", -7.4, 2.4, -15.5); lamp("l27-lamp-3", 5.6, 0, 3.4);
  // the M.E.G. placard at the foot of the stairs
  sp("l27-sign", { feetPosition: { x: -7.55, y: 1.0, z: -2.0 }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 0.9, height: 0.6, depth: 0.03 }, material: { color: "oklch(0.25 0.02 230)", roughness: 0.7 },
    ui: `<div face="front" width="0.86m" style="font-family:Arial,sans-serif;color:#e8e2c8;text-align:center;padding:14px"><div style="font-size:44px;font-weight:900;color:#e8c040">M.E.G. · LEVEL 27</div><div style="font-size:30px;margin-top:6px">THE BUNKER SPRINGS</div><div style="font-size:24px;margin-top:14px">EXIT: UP THE STAIRS, FOLLOW THE STREAM</div><div style="font-size:22px;margin-top:8px;color:#c8b890">Bathe no more than two hours. Leave room for others.</div><div style="font-size:22px;color:#c8b890">Do not climb the other waterfall.</div></div>` });
  // the arrival: the tunnel's far end, facing down the stream toward the spring; the way out is a step behind you
  sp("l27-from-tub", { feetPosition: { x: -6.2, y: 2.5, z: -18.5 }, rotation: { yaw: 180 } });
  sp("l27-exit", { tags: ["usable"], feetPosition: { x: -6.15, y: 2.4, z: -21.2 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 3, height: 2.4, depth: 1.2 }, visible: false, behavior: "scripts/l27-use.js", state: { kind: "exit" } });
  sp("l27-spring-tap", { tags: ["usable"], feetPosition: { x: -4.4, y: 0, z: 0.4 }, physics: { body: "static", trigger: true }, primitive: { kind: "sphere", radius: 0.6 }, visible: false, behavior: "scripts/l27-use.js", state: { kind: "drink", name: "Spring water", verb: "Drink" } });
  // drips off the stalactites over the pool
  pts(6, (i) => sp(`l27-drip-${i}`, { feetPosition: { x: -4 + i * 1.6, y: 5.2 - (i % 3) * 0.4, z: -1 - (i % 2) * 2.6 }, fx: { script: DRIP } }));
  sp("l27-bed", { feetPosition: { x: 0, y: 1.5, z: -4 }, audio: { clip: "cdn/ambience-quiet-limestone-cave-water-drips-soft-echo-loop.mp3", loop: true, gain: 0.14, spatial: false, bus: "Ambience" } });
  for (const k of Object.keys(NODES)) spawnNode(ctx, k);
}
// minerals: travertine mounds on the pool's rim, calcite crystal clusters in the wall niches. Each grows back three minutes after it breaks.
const NODES = {
  "l27-trav-0": ["trav", -4.6, 0, -4.4, 0], "l27-trav-1": ["trav", 2.6, 0, 1.3, 70], "l27-trav-2": ["trav", -3.6, 0, 1.1, 140], "l27-trav-3": ["trav", 6.4, 0, 0.4, 210], "l27-trav-4": ["trav", 1.6, 0, -6.8, 300], "l27-trav-5": ["trav", -6.8, 2.4, -12.5, 40],
  "l27-calc-0": ["calc", 6.8, 0, 2.4, 0], "l27-calc-1": ["calc", -1.0, 0, 4.4, 90], "l27-calc-2": ["calc", 5.6, 0, -5.8, 180], "l27-calc-3": ["calc", -7.4, 2.4, -17.5, 270], "l27-calc-4": ["calc", 3.4, 0, 4.6, 45],
};
const CRYSTAL = { color: "oklch(0.95 0.015 220)", roughness: 0.12, metalness: 0, opacity: 0.85, transparent: true, emissive: "oklch(0.7 0.03 210)", emissiveIntensity: 0.25 };
function spawnNode(ctx, id) {
  const [k, x, y, z, yaw] = NODES[id];
  if (k === "trav") return ctx.spawn(id, { tags: ["breakable"], feetPosition: { x, y: y - 0.05, z }, rotation: { yaw }, physics: "static", model: { id: FLOW }, layout: { box: { min: { x: -0.6, y: 0, z: -0.55 }, max: { x: 0.6, y: 0.9, z: 0.55 } } },
    material: { color: "oklch(0.86 0.035 85)" }, state: { mat: "travertine", hp: 120, maxHp: 120, name: "Travertine" }, visibleRange: { max: 40 } });
  const prism = (dx, dz, h, r, tilt, spin) => ({ feetPosition: { x: dx, y: 0, z: dz }, rotation: { yaw: spin, pitch: tilt, roll: tilt * 0.6 }, primitive: { kind: "cylinder", radiusTop: 0.005, radiusBottom: r, height: h, radialSegments: 6 }, material: CRYSTAL });
  return ctx.spawn(id, { tags: ["breakable"], feetPosition: { x, y, z }, rotation: { yaw }, physics: { body: "static", collider: "box" }, primitive: { kind: "sphere", radius: 0.22, widthSegments: 10, heightSegments: 6 }, material: { color: "oklch(0.7 0.03 80)", roughness: 0.9 },
    state: { mat: "calcite", hp: 90, maxHp: 90, name: "Calcite crystal" }, visibleRange: { max: 40 },
    children: [prism(0, 0, 0.62, 0.07, 6, 0), prism(0.09, 0.05, 0.44, 0.055, 22, 60), prism(-0.08, 0.06, 0.38, 0.05, -24, 130), prism(0.02, -0.1, 0.5, 0.06, 18, 210), prism(-0.06, -0.06, 0.3, 0.04, -30, 290),
      { feetPosition: { x: 0, y: 0.3, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.05 220)", intensity: 0.35, distance: 2.5, shadow: { enabled: false } } }] });
}
export function tick(ctx) {
  if (!ctx.place.players?.length) return;
  const s = ctx.place.state, now = ctx.now();
  if ((s.builtV ?? 0) < V) { s.builtV = V; lay(ctx); }
  // regrowth
  const gone = { ...(s.gone ?? {}) }; let ch = false;
  for (const id of Object.keys(NODES)) {
    if (ctx.place.objects[id]) { if (gone[id]) { delete gone[id]; ch = true; } continue; }
    if (!gone[id]) { gone[id] = now + 180000; ch = true; } else if (now > gone[id]) { spawnNode(ctx, id); delete gone[id]; ch = true; }
  }
  if (ch) s.gone = gone;
  // the bath: in the water your sanity and health come back; past four minutes straight the heat turns on you
  for (const p of ctx.place.players) {
    const w = p.state; if (!w || w.level == null) continue;
    if (!inPool(p.feetPosition)) { if (w.bathAt) w.bathAt = null; continue; }
    if (!w.bathAt) { w.bathAt = now; w.notice = { text: "The water's warm. You feel your shoulders drop.", at: now }; }
    const t = (now - w.bathAt) / 1000, ms = maxSan(w.level, w), mh = maxHp(w.level, w);
    if (t < 240) { w.sanity = Math.min(ms, (w.sanity ?? ms) + 2); w.hp = Math.min(mh, (w.hp ?? mh) + 1.5); }
    else { w.sanity = Math.max(0, (w.sanity ?? ms) - 1); if (Math.floor(t) % 20 === 0) w.notice = { text: "You're dizzy. Too long in the heat: get out.", at: now }; }
  }
}
