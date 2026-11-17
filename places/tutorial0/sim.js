import { dressLevel } from "../../scripts/lib/kit-levels.js";
// Opening route props, supply loop and wrist terminal.
// The beats themselves run on the player's machine (scripts/lib/tut0-cut.js via scripts/main-menu.js).
import { H, LIGHTS, ALMOND, DESK, ENC, HALO, DRAWINGS } from "../../scripts/lib/tut0.js"
export const cadence = "1s"
const DRAW = { 1: "/cdn/value.b2ab7e96ce5c388ee348a577c294e1824b0d175136366663366888cb34e20fc5.png", 2: "/cdn/value.bb5b7b66fe16fd3a01ff147c8017b423d5b2033ff5d57bdc1f50887335a93d80.png", 3: "/cdn/value.9004aa6e46f1bd2748b540b24ad652ec4a4b01b79d571c2207f29c49088b82a6.png", 4: "/cdn/value.8fd76de8d1f9bc26360a66a4ec17d8f2b6cdc1c02ee29a7c4f6fc67832036cd6.png" }
const HALO_MODEL = { id: "/cdn/value.28190f626e7fab441feb638bbf3abfb719b3f9a55a84a8b7dd22457d6897642c.glb", forward: "-z", offset: [0.119, -0.005, -0.056] } // the Blender HALOGEN machine (art: /workspace/halogen/build.py); offset keeps the cabinet, not the cable, on the feet
const BENCH_MODEL = "/cdn/value.a38bcbd4f551deb9aaf6fba383d7eaadb341a1aaba258f537471bcb5159c7f26.glb" // the Tripo workbench Level 5 uses
const CARTON_MODEL = "/cdn/value.d4da0db276e9457c56a83cce2ef518cccc8065d0f8e158c7c82f747f45c97b2f.glb"
const FM = { desk: "/cdn/value.dc2f7ac92df4c08964be1ea4af5e520bbf4c12d50609157f85b41db8f3c21fcf.glb", chair: "/cdn/value.34ee5f211b991e7489c032ed09d062af9fda8ef8a79c69afadafd1a650be47d8.glb", shelf: "/cdn/value.9f3b838cc1b4403a54d96e1b80372c75c9a440c1d4e61a4760f60de82133526b.glb", copier: "/cdn/value.5489a9397b8e52f5ea0f528a387d0449d0787726d6bc65bd041ec8faf80f9362.glb" }
// [kind, x, z, yaw]: a few office pieces someone left behind
const PROPS = [["chair", 3.6, -3.4, 200], ["shelf", -4.6, 2.5, 90], ["desk", DESK.x, DESK.z, 90], ["chair", -4.1, -14.7, 250], ["copier", 3.3, -30.4, 0], ["chair", 22, -27.3, 30], ["shelf", 47.4, -32.2, 270], ["desk", 50.6, 2.6, 270], ["chair", 39.5, -6.4, 140]]
const SIGNS = [
  ["supplies", 1.37, -13.6, 90, "SUPPLIES", "By the desk"],
  ["work", 44.2, -32.86, 180, "REPAIR BAY", "Manuals in carton"],
  ["issue", 47.86, -26.15, 90, "EQUIPMENT ISSUE", "Place arm in port"],
]
// Nov 11, a harder walk to the soft floor: a shelf that came down across corridor E and a dead copier past it, so you weave;
// the corridor's last light gave out to a dim stutter. Both leave the drawings on the walls in view.
const BLOCK = [["shelf", 43.02, -16.4, { yaw: 4, pitch: 84 }, 0], ["copier", 45.02, -11.5, { yaw: 200, roll: 6 }, 0.02]]
function harder(ctx, s) {
  if (s.t0hard === 1) return
  s.t0hard = 1
  for (const [k, x, z, rot, y] of BLOCK) ctx.spawn({ tags: ["furniture", "t0prop", "t0block", k], feetPosition: { x, y, z }, rotation: rot, physics: { body: "static", collider: "box" }, model: { id: FM[k], forward: "+z" } })
  ctx.spawn({ tags: ["t0prop", "t0block"], feetPosition: { x: 44.2, y: 0, z: -14.2 }, castShadow: false, primitive: { kind: "scripted", script: "scripts/moments-geo.js", params: { kind: "papers", seed: 23 } } })
  const o = ctx.getObject("t0-light-18"); if (o?.light) o.light = { ...o.light, intensity: 1.4 }
}
// Shelly Nov 17: "your signs got that same ai generated feel again". No plaques with a UI font: each sign is a thing
// with a maker and an age. Hand letters jitter one by one (rotation, baseline, size) so no word sits like typeset.
const hand = (txt, x, y, size, col, seed, w = 0.62) => {
  let r = seed, out = "", cx = x
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280
  for (const ch of txt) {
    if (ch === " ") { cx += size * 0.42; continue }
    const s = size * (0.9 + rnd() * 0.22)
    out += `<text x='${cx.toFixed(1)}' y='${(y + (rnd() - 0.5) * size * 0.16).toFixed(1)}' font-size='${s.toFixed(1)}' font-family='display' fill='${col}' transform='rotate(${((rnd() - 0.5) * 12).toFixed(1)} ${cx.toFixed(1)} ${y})'>${ch}</text>`
    cx += s * w
  }
  return out
}
const SIGNAGE = [
  // corridor A: the building's own door placard, beige engraved plastic gone yellow, a corner snapped off, two screws;
  // under it someone stuck masking tape with a ballpoint arrow toward the carton
  { id: "t0-sign-supplies", tags: ["t0prop"], feetPosition: { x: 1.36, y: 1.55, z: -13.6 }, rotation: { yaw: 90 }, visibleRange: { max: 20 },
    vector: `<svg viewBox='0 0 200 120' width='0.5m'><path d='M6 4 H194 V58 H16 L6 48 Z' fill='#cbb98d' stroke='#7d6c48' stroke-width='2'/><path d='M10 8 H190 V54 H18 L10 46 Z' fill='none' stroke='#a8946a' stroke-width='1'/>
      <circle cx='22' cy='31' r='3.5' fill='#6b5d44'/><circle cx='178' cy='31' r='3.5' fill='#6b5d44'/><path d='M20 31 h4 M176 31 h4' stroke='#3a3226' stroke-width='1'/>
      <text x='100' y='38' font-size='19' font-family='sans-serif' font-weight='700' fill='#4a3f2c' text-anchor='middle' letter-spacing='4'>STORAGE</text><text x='100' y='52' font-size='8' font-family='sans-serif' fill='#6b5d44' text-anchor='middle' letter-spacing='2'>RM 0-14</text>
      <path d='M40 74 L162 70 L164 96 L42 99 Z' fill='#e2d3a4' opacity='0.92'/><path d='M40 74 l4 2 l-3 3 l3 3 l-3 3 l3 4 l-2 3 l2 4 M162 70 l-3 3 l3 3 l-3 4 l3 3 l-2 4 l3 4' stroke='#c9b884' fill='none' stroke-width='1'/>
      <path d='M138 85 C120 84 90 86 58 87' stroke='#1f2a52' stroke-width='3' fill='none' stroke-linecap='round'/><path d='M68 79 L56 87 L69 94' stroke='#1f2a52' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/>
      ${hand("water", 92, 83, 13, "#1f2a52", 7, 0.5)}</svg>` },
  // room D: a cardboard stencil sprayed straight onto the wallpaper, orange, overspray haze and two runs
  { id: "t0-sign-work", tags: ["t0prop"], feetPosition: { x: 44.2, y: 1.7, z: -32.86 }, rotation: { yaw: 0 }, visibleRange: { max: 24 },
    vector: `<svg viewBox='0 0 300 110' width='1.4m'><defs><radialGradient id='os'><stop offset='0' stop-color='#c2551c' stop-opacity='0.28'/><stop offset='1' stop-color='#c2551c' stop-opacity='0'/></radialGradient></defs>
      <ellipse cx='150' cy='50' rx='150' ry='52' fill='url(#os)'/><text x='150' y='68' font-size='58' font-family='display' font-weight='900' fill='#b4491a' text-anchor='middle' letter-spacing='9' opacity='0.9'>REPAIR</text>
      <path d='M44 68 v14' stroke='#b4491a' stroke-width='3' opacity='0.75'/><path d='M44 82 v3' stroke='#b4491a' stroke-width='4' stroke-linecap='round' opacity='0.7'/><path d='M201 68 v24' stroke='#b4491a' stroke-width='2.5' opacity='0.7'/><circle cx='201' cy='93' r='2.6' fill='#b4491a' opacity='0.7'/>
      <path d='M30 98 H270' stroke='#b4491a' stroke-width='3' opacity='0.35' stroke-dasharray='14 6 30 5 9 7'/></svg>` },
  // the HALOGEN unit: its maker's riveted plate, brushed steel, stamped small
  { id: "t0-sign-issue", tags: ["t0prop"], feetPosition: { x: 47.0, y: 1.32, z: -26.62 }, rotation: { yaw: -90 }, visibleRange: { max: 14 },
    vector: `<svg viewBox='0 0 160 70' width='0.3m'><defs><linearGradient id='st' x1='0' x2='1'><stop offset='0' stop-color='#9a9a92'/><stop offset='0.5' stop-color='#c9c8bf'/><stop offset='1' stop-color='#8d8c84'/></linearGradient></defs>
      <rect x='2' y='2' width='156' height='66' rx='5' fill='url(#st)' stroke='#55544e' stroke-width='2'/>${[[10, 10], [150, 10], [10, 60], [150, 60]].map(([x, y]) => `<circle cx='${x}' cy='${y}' r='3.2' fill='#6e6d66' stroke='#3c3b37'/>`).join("")}
      <text x='80' y='22' font-size='9' font-family='sans-serif' font-weight='700' fill='#2b2a27' text-anchor='middle' letter-spacing='2'>BACKROOMS ROBOTICS</text><path d='M22 28 H138' stroke='#2b2a27' stroke-width='0.8'/>
      <text x='80' y='42' font-size='11' font-family='sans-serif' font-weight='700' fill='#2b2a27' text-anchor='middle'>H-2 ISSUE PORT</text><text x='80' y='55' font-size='7' font-family='sans-serif' fill='#3c3b37' text-anchor='middle' letter-spacing='1'>INSERT FOREARM TO ELBOW</text>
      <path d='M118 46 l14 9' stroke='#f0efe6' stroke-width='0.8' opacity='0.7'/></svg>` },
  // the long hall's mouth: scratched into the wallpaper with something sharp, then gone over in pen; the hand gets worse as it goes
  { id: "t0-scrawl", tags: ["t0prop"], feetPosition: { x: 6.4, y: 1.4, z: -26.64 }, rotation: { yaw: 0 }, visibleRange: { max: 16 },
    vector: `<svg viewBox='0 0 260 110' width='1.1m'><g opacity='0.85'>${hand("dont run", 14, 40, 30, "#2a1a0e", 31)}${hand("lights off", 26, 84, 27, "#2a1a0e", 58, 0.66)}</g>
      <path d='M10 50 C60 47 120 52 150 49' stroke='#2a1a0e' stroke-width='2' fill='none' opacity='0.6'/><path d='M222 30 l18 52 M214 60 l30 -4' stroke='#5a3a1e' stroke-width='1.6' opacity='0.55'/></svg>` },
]
export function tick(ctx) {
  dressLevel(ctx, "tutorial0");
  const s = ctx.place.state
  if (s.built === 10) return harder(ctx, s)
  if (s.built) for (const o of ctx.query({ anyTags: ["t0prop", "furniture", "halogen-unit", "almond", "bench", "container"] })) ctx.destroy(o.id)
  for (let i = 0; i < LIGHTS.length; i++) if (ctx.getObject(`t0-light-${i}`)) ctx.destroy(`t0-light-${i}`)
  s.built = 10; s.t0hard = 0
  LIGHTS.forEach(([x, z, hall], i) => hall !== 2 && ctx.spawn({ id: `t0-light-${i}`, tags: hall ? ["t0hall"] : ["t0light"], feetPosition: { x, y: H - 0.3, z }, visibleRange: { max: 42 }, light: { kind: "point", color: "oklch(0.95 0.06 95)", intensity: 5, distance: 10, shadow: { enabled: false } } }))
  for (const [k, x, z, yaw] of PROPS) ctx.spawn({ tags: ["furniture", "t0prop", k], feetPosition: { x, y: 0, z }, rotation: yaw, physics: { body: "static", collider: "box" }, model: { id: FM[k], forward: "+z" } })
  // room B: the desk that gave out, one leg already off it, where they'll be cornered
  ctx.spawn({ tags: ["t0prop"], feetPosition: { x: ENC.desk.x, y: 0.05, z: ENC.desk.z }, rotation: { yaw: 20, roll: 14 }, physics: { body: "static", collider: "box" }, model: { id: FM.desk, forward: "+z" } })
  // corridor A alcove: a supply carton beside the desk so looting containers + scrap can be learned early
  ctx.spawn({ id: "t0-carton", tags: ["container", "t0prop"], feetPosition: { x: -2.36, y: 0, z: -15.95 }, rotation: { yaw: 18 }, physics: { body: "static", collider: "box" }, model: { id: CARTON_MODEL }, layout: { box: { min: { x: -0.22, y: 0, z: -0.22 }, max: { x: 0.22, y: 0.38, z: 0.22 } } }, state: { name: "Supply Carton", items: "wire,drywall,steel_pipe,scrap_metal" } })
  ctx.spawn({ id: "t0-halogen", tags: ["t0prop", "halogen-machine", "usable"], feetPosition: { x: HALO.x, y: 0, z: HALO.z }, rotation: HALO.yaw, physics: { body: "static", collider: "box" }, model: HALO_MODEL, behavior: "scripts/tut0-panel.js", state: { name: "Wrist terminal", verb: "Activate" } })
  ctx.spawn({ id: "t0-bench", tags: ["bench", "t0prop"], feetPosition: { x: 44.2, y: 0, z: -32.2 }, rotation: { yaw: -90 }, physics: { body: "static", collider: "box" }, model: { id: BENCH_MODEL }, layout: { box: { min: { x: -0.45, y: 0, z: -1.1 }, max: { x: 0.45, y: 1.7, z: 1.1 } } }, state: { name: "Workbench", station: "bench" } })
  ctx.spawn({ id: "t0-crate-d", tags: ["container", "t0prop"], feetPosition: { x: 42.6, y: 0, z: -32.2 }, rotation: { yaw: -12 }, physics: { body: "static", collider: "box" }, model: { id: CARTON_MODEL }, layout: { box: { min: { x: -0.22, y: 0, z: -0.22 }, max: { x: 0.22, y: 0.38, z: 0.22 } } }, state: { name: "Repair Bay Carton", items: "manual:tools,wire,nails,scrap_metal,almond,bandage" } })
  for (const g of SIGNAGE) ctx.spawn(g)
  // corridor E and room F: the notes someone taped up on the way to the wet spot
  for (const [n, x, z, yaw, w] of DRAWINGS) ctx.spawn({ tags: ["t0prop", "t0-drawing"], feetPosition: { x, y: 1.45, z }, rotation: { yaw }, castShadow: false, primitive: { kind: "plane", width: w, height: w }, material: { texture: DRAW[n], transparent: true, alphaTest: 0.4, roughness: 0.95, side: "double" } })
  ctx.spawn({ id: "t0-almond", tags: ["almond"], feetPosition: ALMOND, rotation: 30, castShadow: false, model: "/cdn/value.d74570d765a2d43f965fc8756878f7bf22f833db5feaf4c335d84d8dc4ba5b62.glb", layout: { box: { min: { x: -0.07, y: 0, z: -0.07 }, max: { x: 0.07, y: 0.32, z: 0.07 } } } })
}
