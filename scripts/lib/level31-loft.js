// Level 31 · the skate loft: the north end of the mezzanine (ZONES.mezz, x -42..-25, z -30..-12, floor y 4). Shelly Nov 13: "this is empty".
// Tripo lockers on the west wall with a lacing bench, curved diner booths along the north wall, warm pendants. Ids l31-loft-*.
import { ZONES } from "./level31.js";
import { G } from "./level31-food.js";
const LOCKERS = "/cdn/value.22e77fdd7b80e1d945e03f8ad92f8ebf1a821fa20a38d769a30e0bc8fbe0da50.glb", BOOTH = "/cdn/value.13e98688536b8996d72997d03461590d77f616b6ffdbc802895762ab9813a00d.glb";
const BENCH = "/cdn/value.2f7b960c45839606b871cd446580e4c87732b96f57e9807dca2bedbc0faea27c.glb";
const fit = (w, h, d) => ({ box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } });
const SIGN = `<svg viewBox='0 0 420 110' width='3.2m'><g filter='drop-shadow(0 0 6 #ff4fa8)'><text x='210' y='72' text-anchor='middle' font-family='serif' font-style='italic' font-size='64' fill='#ffd0e8' stroke='#ff4fa8' stroke-width='2'>Skate Loft</text></g><path d='M60 90H360' stroke='#5ff2e8' stroke-width='4' stroke-linecap='round' filter='drop-shadow(0 0 5 #5ff2e8)'/></svg>`;
export function layLoft(ctx) {
  const Y = ZONES.mezz.y;
  const P = (id, spec) => ctx.spawn(`l31-loft-${id}`, { castShadow: false, ...spec });
  // a worn rug under the booths so the loft reads as a room, not a hallway
  P("rug", { feetPosition: { x: -35, y: Y + 0.006, z: -25.5 }, primitive: { kind: "box", width: 12, height: 0.01, depth: 7 }, material: { texture: "cdn/texture-black-arcade-carpet-neon-confetti-squiggles.png", wrap: "repeat", repeat: [0.5, 0.5], color: "#9a90ac", roughness: 0.95 }, receiveShadow: true });
  // lockers: three banks on the west wall facing east, one door hanging open on each (the model's own), 2.3 x 1.95 x 0.5 m
  for (const [i, z] of [-27.4, -24.9, -22.4, -19.9].entries())
    P(`lockers${i}`, { feetPosition: { x: -41.6, y: Y, z }, rotation: { yaw: 90 }, model: { id: LOCKERS, forward: "+z" }, layout: fit(2.35, 1.95, 0.5), physics: { body: "static", collider: "box" } });
  P("bench", { feetPosition: { x: -39.6, y: Y, z: -23.6 }, rotation: { yaw: 0 }, model: { id: BENCH }, layout: fit(0.45, 0.48, 3.0), physics: { body: "static", collider: "box" }, tags: ["seat"] });
  // curved booths against the north wall, opening south, a table in each
  for (const [i, x] of [-37.5, -33.5, -29.5].entries()) {
    P(`booth${i}`, { feetPosition: { x, y: Y, z: -28.6 }, rotation: { yaw: 0 }, model: { id: BOOTH, forward: "+z" }, layout: fit(2.8, 1.15, 2.0), physics: { body: "static", collider: "mesh" }, tags: ["seat"] });
    P(`table${i}`, { feetPosition: { x, y: Y, z: -28.1 }, model: { id: G.table, forward: "+z" }, layout: fit(0.9, 0.74, 0.9), physics: { body: "static", collider: "box" } });
    P(`lamp${i}`, { feetPosition: { x, y: Y + 2.3, z: -28.2 }, primitive: { kind: "cone", radius: 0.22, height: 0.22, radialSegments: 20, openEnded: true }, material: { color: "#e88a2a", roughness: 0.4, metalness: 0.4, side: "double", emissive: "#ffb060", emissiveIntensity: 0.25 },
      children: [{ feetPosition: { x: 0, y: 0.22, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.006, radiusBottom: 0.006, height: 1.5 }, material: { color: "#222" } },
                 { feetPosition: { x: 0, y: -0.15, z: 0 }, light: { kind: "point", color: "#ffc68a", intensity: 2.4, distance: 6 } }] });
  }
  // what people left: drinks on the tables, a cooler-side trash can
  const D = (id, key, x, z, yaw) => P(id, { model: { id: G[key], forward: "+x" }, feetPosition: { x, y: Y + 0.75, z }, rotation: { yaw }, layout: key === "sprite" ? fit(0.066, 0.22, 0.066) : fit(0.2, 0.16, 0.2) });
  D("d0", "sprite", -37.3, -28.0, 30); D("d1", "capri", -33.8, -28.2, 110); D("d2", "capri", -33.3, -27.9, 200);
  P("trash", { feetPosition: { x: -26.4, y: Y, z: -29.3 }, model: { id: G.trash, forward: "+z" }, layout: fit(0.5, 0.95, 0.5), physics: { body: "static", collider: "box" } });
  // the neon over the booths and the lockers' own cool light
  P("sign", { feetPosition: { x: -33.5, y: Y + 2.6, z: -29.8 }, vector: SIGN });
  P("glow-n", { feetPosition: { x: -33.5, y: Y + 2.8, z: -29.2 }, light: { kind: "point", color: "#ff6fb8", intensity: 2.2, distance: 7 } });
  P("glow-w", { feetPosition: { x: -40, y: Y + 3, z: -23.6 }, light: { kind: "point", color: "#dfe8ff", intensity: 2.6, distance: 8 } });
}
