// Level 0.2's numbers and the half-built door into it from Level 0 (laid by places/main/sim.js).
import { MID, zoneOf, inHub, hasPit, hasPillar, cellCenter } from "./maze.js";
export const S = 4, NX = 8, NZ = 5, X0 = -16, Z0 = -10, BASE = -3.4, CEIL = 3;
export const LIFT = { x: 14, z: 0, cx: 7, cz: 2, kg: 42 }; // Savi's pick: three 14 kg paint cans lower the stuck lift
export const BIN = { x: 11, z: -1 };
export const cxOf = (x) => Math.max(0, Math.min(NX - 1, Math.floor((x - X0) / S)));
export const xOf = (c) => X0 + (c + 0.5) * S, zOf = (r) => Z0 + (r + 0.5) * S;

const PLASTER = { color: "oklch(0.9 0.012 90)", roughness: 0.92, texture: "cdn/texture-unpainted-drywall-with-taped-seams.png", wrap: "repeat", repeat: [0.5, 0.5] };
import { animate } from "builtin/tween";
import P from "./data/l02-props.yml";
const PAINT = { color: "oklch(0.97 0.008 90)", roughness: 0.88, texture: "cdn/texture-freshly-painted-white-drywall-eggshell-roller-stipple.png", wrap: "repeat", repeat: [0.5, 0.5] };
const TRIM = { color: "oklch(0.5 0.12 25)", roughness: 0.45, texture: "cdn/texture-glossy-red-painted-wood-chair-rail-molding-grain.png", wrap: "repeat", repeat: [1, 1] };
const BASEB = { color: "oklch(0.96 0.006 90)", roughness: 0.4, texture: "cdn/texture-white-semi-gloss-painted-mdf-baseboard.png", wrap: "repeat", repeat: [1, 1] };
const CARPET = { color: "oklch(0.4 0.11 25)", roughness: 0.97, texture: "cdn/texture-dry-red-office-carpet-low-pile.png", wrap: "repeat", repeat: [0.5, 0.5] };
const STUD = { color: "oklch(0.8 0.07 78)", roughness: 0.85, texture: "cdn/texture-pine-lumber-stud-wood-grain.png", wrap: "repeat", repeat: [1, 1] };
const DRIP = `fx
pop drop rate=.6 on=point() life=.5 v=<0,-.3,0> size=.016 acc=grav() col=<.95,.93,.88> a=1 floor=die r=sprite(soft-disc,alpha)`;
const SIGN = (t, s) => `<svg viewBox='0 0 400 110' width='1.5m'><rect x='3' y='3' width='394' height='104' rx='4' fill='#f2efe6' stroke='#8a2a22' stroke-width='6'/><text x='200' y='48' text-anchor='middle' font-family='sans-serif' font-size='34' font-weight='bold' fill='#8a2a22'>${t}</text><text x='200' y='86' text-anchor='middle' font-family='sans-serif' font-size='22' fill='#3a3530'>${s}</text></svg>`;
export function layL02Door(ctx) {
  const o = ctx.place.objects, ps = ctx.place.state;
  if (ps.l02DoorV === 3 && "l0-to-l02" in o) return;
  let cell = null; const m = Math.round(MID);
  for (let d = 4; d < 14 && !cell; d++) for (const [cx, cz] of [[m + d, m], [m, m + d], [m - d, m], [m, m - d]]) {
    if (inHub(cx, cz) || hasPit(cx, cz) || hasPillar(cx, cz) || zoneOf(cx, cz) === "dark" || zoneOf(cx, cz) === "red") continue;
    cell = { cx, cz }; break;
  }
  if (!cell) return;
  ps.l02DoorV = 3;
  const c = cellCenter(cell.cx, cell.cz), x = c.x, z = c.z;
  for (const id of Object.keys(o)) if (id.startsWith("l0-l02-")) ctx.destroy(id);
  for (const id of ["l0-to-l02", "main-from-l02"]) if (id in o) ctx.destroy(id);
  // the remodel's edge: its face (+z) is Level 0.2 already, white paint and a red rail; its ends are bare studs where it stops
  const W = 3.6, HT = 3;
  const face = (dx, w, h, y = 0) => [
    { feetPosition: { x: dx, y, z: 0 }, primitive: { kind: "box", width: w, height: h, depth: 0.12 }, material: PLASTER, physics: "static" },
    { feetPosition: { x: dx, y, z: 0.062 }, primitive: { kind: "plane", width: w, height: h }, material: PAINT },
  ];
  const side = (W - 1.1) / 2, sx = 0.55 + side / 2;
  const kids = [...face(-sx, side, HT), ...face(sx, side, HT), ...face(0, 1.1, HT - 2.15, 2.15),
    ...[-1, 1].map((k) => ({ feetPosition: { x: k * sx, y: 0.9, z: 0.075 }, primitive: { kind: "box", width: side, height: 0.07, depth: 0.03 }, material: TRIM })),
    ...[-1, 1].map((k) => ({ feetPosition: { x: k * sx, y: 0, z: 0.075 }, primitive: { kind: "box", width: side, height: 0.12, depth: 0.025 }, material: BASEB })),
    // bare studs past each end, the frame they never sheathed
    ...[-1, 1].flatMap((k) => [0, 0.4, 0.8].map((d) => ({ feetPosition: { x: k * (W / 2 + 0.05 + d), y: 0, z: 0 }, rotation: { roll: d === 0.8 ? k * 3 : 0 }, primitive: { kind: "box", width: 0.045, height: d === 0.8 ? 2.2 : HT, depth: 0.09 }, material: STUD, physics: d === 0 ? "static" : "none" }))),
    ...[-1, 1].map((k) => ({ feetPosition: { x: k * (W / 2 + 0.45), y: 0, z: 0 }, primitive: { kind: "box", width: 0.85, height: 0.045, depth: 0.09 }, material: STUD })),
    ...[-1, 1].map((k) => ({ feetPosition: { x: k * (W / 2 + 0.3), y: HT - 0.045, z: 0 }, primitive: { kind: "box", width: 0.55, height: 0.045, depth: 0.09 }, material: STUD })),
  ];
  ctx.spawn("l0-l02-wall", { tags: ["l02door"], feetPosition: { x, y: 0, z }, physics: "static", primitive: { kind: "box", width: 0.01, height: 0.01, depth: 0.01 }, material: PLASTER, children: kids });
  ctx.spawn("l0-l02-door", { feetPosition: { x, y: 0, z }, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { style: "wood", w: 1.0, h: 2.1, part: "set", seed: 2 } } });
  ctx.spawn("l0-to-l02", { tags: ["door"], feetPosition: { x, y: 0, z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.9, height: 2.2, depth: 0.5 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level02" } });
  ctx.spawn("main-from-l02", { feetPosition: { x, y: 0.1, z: z + 1.3 }, rotation: { yaw: 180 } });
  // the crew's brass plate on the door, at eye height: their insignia, no words
  ctx.spawn("l0-l02-plate", { feetPosition: { x: x + 0.25, y: 1.5, z: z + 0.09 }, primitive: { kind: "box", width: 0.2, height: 0.2, depth: 0.012 }, material: { color: "oklch(0.75 0.11 80)", metalness: 0.85, roughness: 0.3 },
    children: [{ feetPosition: { x: 0, y: 0.02, z: 0.0075 }, primitive: { kind: "plane", width: 0.16, height: 0.16 }, material: { texture: P.insignia, transparent: true, alphaTest: 0.3, roughness: 0.4 } }] });
  // a tongue of their dry red carpet laid out over the yellow, its far end still rolled
  ctx.spawn("l0-l02-carpet", { feetPosition: { x, y: 0.012, z: z + 1.55 }, rotation: { pitch: -90 }, primitive: { kind: "plane", width: 1.5, height: 3.0 }, material: { ...CARPET, repeat: [0.7, 0.7] }, receiveShadow: true });
  ctx.spawn("l0-l02-roll", { feetPosition: { x: x - 1.25, y: 0.16, z: z + 2.6 }, rotation: { yaw: 90, roll: 90 }, pivot: "center", primitive: { kind: "cylinder", radiusTop: 0.16, radiusBottom: 0.16, height: 1.55, radialSegments: 20 }, material: CARPET, physics: "static" });
  // wet white footprints walked out of the door and fading into Level 0
  for (let i = 0; i < 8; i++) { const zz = z + 0.5 + i * 0.38, sd = i % 2 ? 0.1 : -0.1, a = (0.55 - i * 0.065).toFixed(2), px = x + 0.9 + sd + i * 0.04;
    ctx.spawn(`l0-l02-step${i}`, { feetPosition: { x: px, y: 0.016, z: zz }, rotation: { pitch: -90, roll: -8 + i * 3 }, primitive: { kind: "circle", radius: 0.045, segments: 12 }, scale: { x: 1, y: 2.2, z: 1 }, material: { color: `oklch(0.97 0.01 90 / ${a})`, transparent: true, roughness: 0.3, depthWrite: false } });
    ctx.spawn(`l0-l02-heel${i}`, { feetPosition: { x: px, y: 0.016, z: zz + 0.15 }, rotation: { pitch: -90 }, primitive: { kind: "circle", radius: 0.038, segments: 10 }, material: { color: `oklch(0.97 0.01 90 / ${a})`, transparent: true, roughness: 0.3, depthWrite: false } }); }
  // the work they left: drop cloth, cans, a roller tray dripping, the ladder up against fresh paint, lumber on a sawhorse, a lamp still lit
  const put = (id, key, dx, dz, yaw = 0, extra = {}) => { const q = P[key]; if (!q?.model) return; const [w, h, d] = q.size;
    ctx.spawn(id, { feetPosition: { x: x + dx, y: extra.y ?? 0, z: z + dz }, rotation: { yaw }, model: { id: q.model, ...(q.forward ? { forward: q.forward } : {}) }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } }, physics: extra.physics ?? "static" }); };
  put("l0-l02-tarp", "tarp", 1.35, 0.95, 8, { physics: "none" });
  put("l0-l02-can0", "paintcan", 1.05, 0.7, 20, { y: 0.02 }); put("l0-l02-can1", "paintcan", 1.42, 0.62, -15, { y: 0.02 });
  put("l0-l02-tray", "rtray", 1.6, 1.15, 30, { y: 0.03 });
  put("l0-l02-ladder", "ladder", -1.25, 0.42, 4);
  put("l0-l02-saw", "sawhorse", -2.0, 2.0, 70); put("l0-l02-lumber", "lumber", -2.0, 2.0, 70, { y: 0.78, physics: "none" });
  put("l0-l02-clip", "clipboard", -1.85, 2.0, 50, { y: 1.33, physics: "none" });
  put("l0-l02-stack", "drywall_stack", 2.6, -0.2, 90);
  put("l0-l02-lamp", "worklamp", 2.2, 1.9, -140);
  put("l0-l02-thermos", "thermos", 2.45, 0.35, 0, { y: 0.5 });
  ctx.spawn("l0-l02-lamplight", { feetPosition: { x: x + 1.9, y: 1.55, z: z + 1.6 }, light: { kind: "spot", color: "oklch(0.88 0.1 75)", intensity: 3, distance: 7, angle: 50, penumbra: 0.6, aim: { x: x + 0.2, y: 1.2, z: z } } });
  ctx.spawn("l0-l02-drip", { feetPosition: { x: x + 1.6, y: 0.08, z: z + 1.15 }, fx: { script: DRIP } });
  // a plastic sheet hung off the open stud end, stirring in the vent draft
  ctx.spawn("l0-l02-sheet", { feetPosition: { x: x + W / 2 + 0.45, y: HT - 0.05, z: z + 0.06 }, children: [
    { feetPosition: { x: 0, y: -2.7, z: 0 }, primitive: { kind: "plane", width: 0.9, height: 2.7 }, material: { color: "oklch(0.95 0.01 220 / 0.35)", transparent: true, roughness: 0.25, side: "double", depthWrite: false } }] });
  animate(ctx, "l0-l02-sheet", { "rotation.pitch": [-6, 6] }, { duration: 1.7, easing: "easeInOutSine", direction: "alternate", loop: true });
  // the hum drops near it: the lore's tell that the remodel is close
  ctx.spawn("l0-l02-quiet", { feetPosition: { x, y: 1.5, z: z + 2 }, audio: { clip: "/cdn/moodboard-realistic-gritty/ambience-muffled-distant-am-radio-talk-and-oldies-through-drywall-loop.mp3", loop: true, gain: 0.12, spatial: true, refDistance: 2, maxDistance: 12 } });
}
