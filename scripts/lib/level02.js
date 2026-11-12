// Level 0.2's numbers and the half-built door into it from Level 0 (laid by places/main/sim.js).
import { MID, zoneOf, inHub, hasPit, hasPillar, cellCenter } from "./maze.js";
export const S = 4, NX = 8, NZ = 5, X0 = -16, Z0 = -10, BASE = -3.4, CEIL = 3;
export const LIFT = { x: 14, z: 0, cx: 7, cz: 2, kg: 42 }; // Savi's pick: three 14 kg paint cans lower the stuck lift
export const BIN = { x: 11, z: -1 };
export const cxOf = (x) => Math.max(0, Math.min(NX - 1, Math.floor((x - X0) / S)));
export const xOf = (c) => X0 + (c + 0.5) * S, zOf = (r) => Z0 + (r + 0.5) * S;

const PLASTER = { color: "oklch(0.9 0.012 90)", roughness: 0.92, texture: "cdn/texture-unpainted-drywall-with-taped-seams.png", wrap: "repeat", repeat: [0.5, 0.5] };
const SIGN = (t, s) => `<svg viewBox='0 0 400 110' width='1.5m'><rect x='3' y='3' width='394' height='104' rx='4' fill='#f2efe6' stroke='#8a2a22' stroke-width='6'/><text x='200' y='48' text-anchor='middle' font-family='sans-serif' font-size='34' font-weight='bold' fill='#8a2a22'>${t}</text><text x='200' y='86' text-anchor='middle' font-family='sans-serif' font-size='22' fill='#3a3530'>${s}</text></svg>`;
export function layL02Door(ctx) {
  const o = ctx.place.objects, ps = ctx.place.state;
  if (ps.l02DoorV === 1 && "l0-to-l02" in o) return;
  let cell = null; const m = Math.round(MID);
  for (let d = 4; d < 14 && !cell; d++) for (const [cx, cz] of [[m + d, m], [m, m + d], [m - d, m], [m, m - d]]) {
    if (inHub(cx, cz) || hasPit(cx, cz) || hasPillar(cx, cz) || zoneOf(cx, cz) === "dark" || zoneOf(cx, cz) === "red") continue;
    cell = { cx, cz }; break;
  }
  if (!cell) return;
  ps.l02DoorV = 1;
  const c = cellCenter(cell.cx, cell.cz), x = c.x, z = c.z;
  for (const id of ["l0-l02-wall", "l0-l02-door", "l0-to-l02", "main-from-l02", "l0-l02-stack", "l0-l02-ladder", "l0-l02-sign", "l0-l02-sign2", "l0-l02-sheet"]) if (id in o) ctx.destroy(id);
  ctx.spawn("l0-l02-wall", { tags: ["l02door"], feetPosition: { x, y: 0, z }, physics: "static", primitive: { kind: "box", width: 0.01, height: 0.01, depth: 0.01 }, material: PLASTER,
    children: [
      { feetPosition: { x: -1.05, y: 0, z: 0 }, primitive: { kind: "box", width: 1.0, height: 3, depth: 0.12 }, material: PLASTER, physics: "static" },
      { feetPosition: { x: 1.05, y: 0, z: 0 }, primitive: { kind: "box", width: 1.0, height: 3, depth: 0.12 }, material: PLASTER, physics: "static" },
      { feetPosition: { x: 0, y: 2.15, z: 0 }, primitive: { kind: "box", width: 1.1, height: 0.85, depth: 0.12 }, material: PLASTER, physics: "static" },
    ] });
  ctx.spawn("l0-l02-door", { feetPosition: { x, y: 0, z }, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { style: "wood", w: 1.0, h: 2.1, part: "set", seed: 2 } } });
  ctx.spawn("l0-to-l02", { tags: ["door"], feetPosition: { x, y: 0, z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.9, height: 2.2, depth: 0.5 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level02" } });
  ctx.spawn("main-from-l02", { feetPosition: { x, y: 0.1, z: z + 1.3 }, rotation: { yaw: 180 } });
  ctx.spawn("l0-l02-stack", { feetPosition: { x: x + 1.4, y: 0, z: z - 1.0 }, model: { id: "/cdn/value.dd3c11a087dce509414d840925e8477ce72ec546947a8628f600be9ebd25f27c.glb" }, layout: { box: { min: { x: -0.6, y: 0, z: -0.3 }, max: { x: 0.6, y: 0.45, z: 0.3 } } }, physics: "static" });
  ctx.spawn("l0-l02-ladder", { feetPosition: { x: x - 1.5, y: 0, z: z + 0.6 }, rotation: { yaw: 20 }, model: { id: "/cdn/value.e3a9e57fa4cd0ebbfe56c6389249e5bf1d94d625c3faef7ff16a17500bca3534.glb" }, layout: { box: { min: { x: -0.25, y: 0, z: -0.3 }, max: { x: 0.25, y: 1.9, z: 0.3 } } }, physics: "static" });
  ctx.spawn("l0-l02-sign", { feetPosition: { x, y: 2.6, z: z + 0.08 }, rotation: { yaw: 180 }, vector: SIGN("REMODELING IN PROGRESS", "Sorry for the inconvenience · Backrooms Remodeling Co.") });
  ctx.spawn("l0-l02-sign2", { feetPosition: { x, y: 2.6, z: z - 0.08 }, vector: SIGN("REMODELING IN PROGRESS", "Sorry for the inconvenience · Backrooms Remodeling Co.") });
  ctx.spawn("l0-l02-sheet", { feetPosition: { x: x + 1.7, y: 1.5, z: z + 0.9 }, rotation: { yaw: 90 }, primitive: { kind: "plane", width: 1.6, height: 3 }, material: { color: "oklch(0.95 0.01 220 / 0.45)", transparent: true, roughness: 0.3, side: "double" } });
}
