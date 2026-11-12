// Level 31 level-design pass (Shelly Nov 12: "improve level 31 level design"). Laid by layParts after the zones.
// What it adds: a pillar ring that frames the rink aisle, a neon racetrack outline on the ceiling over the wood,
// colour par cans washing the floor, rubber mats at the two gates, a gateway into the food court and a hanging
// gift-shop sign (each sign its own style), and carpeted half-walls that turn the open carpet into a lounge.
// All positions are Savi's picks against scripts/lib/level31.js ZONES; ids are l31-ld-*.
import { H, B, RINK, ZONES } from "./level31.js";
const PROPS = "scripts/l31-props-geo.js";
const CARPET = { texture: "cdn/texture-black-arcade-carpet-neon-confetti-squiggles.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.95 0.01 300)", roughness: 0.95 };
const CHROME = { color: "#c9ccd4", metalness: 1, roughness: 0.18 };
const glow = (c, e = 3) => ({ color: c, emissive: c, emissiveIntensity: e, roughness: 0.4 });
const RUBBER = { texture: "cdn/texture-black-ribbed-rubber-floor-mat-worn.png", wrap: "repeat", repeat: [0.6, 0.6], color: "#2a2a2e", roughness: 0.95 };
export function layDesign(ctx) {
  for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("l31-ld-") && !id.includes("/")) ctx.destroy(id);
  const sp = (id, spec) => ctx.spawn("l31-ld-" + id, { castShadow: false, ...spec });

  // 1. the pillar ring: six mirror-wrapped columns round the aisle, a neon collar each, so the hall has a rhythm and a scale
  const HUES = ["#ff3fa4", "#3fe0ff", "#ffd23a", "#7dff5a", "#ff8a1e", "#b06bff", "#ff5a5a", "#5affc8"];
  [[-18, -16.5], [18, -16.5], [-18, 16.5], [18, 16.5], [-24, -9.5], [-24, 9.5], [24, -9.5], [24, 9.5]] /* the end pairs flank the shop and arcade/food fronts, never in a doorway */.forEach(([x, z], i) => sp(`pillar${i}`, {
    feetPosition: { x, y: 0, z }, primitive: { kind: "cylinder", radiusTop: 0.38, radiusBottom: 0.38, height: H, radialSegments: 28 }, material: { color: "#d4d8e2", metalness: 0.65, roughness: 0.22 }, physics: "static",
    children: [
      { feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.46, radiusBottom: 0.5, height: 1.1, radialSegments: 28 }, material: CARPET },
      { feetPosition: { x: 0, y: 1.1, z: 0 }, primitive: { kind: "torus", radius: 0.47, tube: 0.035, radialSegments: 8, tubularSegments: 40 }, rotation: { pitch: 90 }, material: CHROME },
      { feetPosition: { x: 0, y: 2.7, z: 0 }, primitive: { kind: "torus", radius: 0.41, tube: 0.045, radialSegments: 8, tubularSegments: 40 }, rotation: { pitch: 90 }, material: glow(HUES[i], 5) },
      { feetPosition: { x: 0, y: 2.7, z: 0 }, light: { kind: "point", color: HUES[i], intensity: 0.9, distance: 5 } },
    ] }));

  // 2. a neon racetrack on the ceiling tracing the rink below it, pink outside, cyan inside
  const L = RINK.half * 2 + RINK.r * 2, Wd = RINK.r * 2;
  sp("halo", { feetPosition: { x: 0, y: H - 0.03, z: 0 }, rotation: { pitch: 90 },
    vector: `<svg viewBox='0 0 ${L * 10 + 20} ${Wd * 10 + 20}' width='${L + 2}m'><rect x='10' y='10' width='${L * 10}' height='${Wd * 10}' rx='${RINK.r * 10}' fill='none' stroke='#ff4fb0' stroke-width='3' filter='drop-shadow(0 0 6 #ff4fb0)'/><rect x='40' y='40' width='${L * 10 - 60}' height='${Wd * 10 - 60}' rx='${RINK.r * 10 - 30}' fill='none' stroke='#3fe0ff' stroke-width='2' filter='drop-shadow(0 0 5 #3fe0ff)'/></svg>` });

  // 3. par cans round the halo, each washing a coloured pool onto the wood
  const PARS = ["#ff3b6e", "#3f8cff", "#ffb23a", "#7dff5a", "#ff3fa4", "#3fe0ff", "#ffd23a", "#b06bff"];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, x = Math.cos(a) * (RINK.half + RINK.r * 0.9), z = Math.sin(a) * RINK.r * 1.05;
    sp(`par${i}`, { feetPosition: { x, y: H - 0.12, z }, primitive: { kind: "scripted", script: PROPS, params: { kind: "can" } }, material: { pbr: true },
      children: [{ feetPosition: { x: 0, y: -0.3, z: 0 }, light: { kind: "spot", color: PARS[i], intensity: 6, distance: 16, angle: 26, penumbra: 0.6, aim: { x: x * 0.45, y: 0, z: z * 0.45 } } }] });
  }

  // 4. rubber mats at both gates, where skates meet carpet
  for (const s of [-1, 1]) sp(`mat${s}`, { feetPosition: { x: 0, y: 0, z: s * (RINK.rail + 1.0) }, primitive: { kind: "box", width: 2.6, height: 0.025, depth: 1.6 }, material: RUBBER, receiveShadow: true });

  // 5. carpeted half-walls: a lounge pocket each side of the south gate, a ledge to lean on and watch the skaters
  const half = (id, x, z, len, yaw) => sp(`hw-${id}`, { feetPosition: { x, y: 0, z }, rotation: { yaw }, primitive: { kind: "box", width: len, height: 1.05, depth: 0.22 }, material: CARPET, physics: "static",
    children: [{ feetPosition: { x: 0, y: 1.05, z: 0 }, primitive: { kind: "box", width: len + 0.06, height: 0.05, depth: 0.32 }, material: { color: "#d8322a", roughness: 0.35 } }] });
  half("sw", -12.5, 20.2, 5, 0); half("sw2", -15, 22.6, 4.8, 90); half("nw", -14, -18.6, 4, 0); half("ne", 14, -18.6, 4, 0);

  // 6. food court gateway: a backlit menu-board arch over the way in (a lightbox, not neon)
  const F = ZONES.food, fz = 9.5, fx = F.x0 - 0.4;
  for (const k of [-1, 1]) sp(`food-post${k}`, { feetPosition: { x: fx, y: 0, z: fz + k * 1.9 }, primitive: { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.09, height: 3.2, radialSegments: 14 }, material: { color: "#e86a1e", roughness: 0.4, metalness: 0.3 }, physics: "static" });
  sp("food-box", { feetPosition: { x: fx, y: 3.2, z: fz }, primitive: { kind: "box", width: 0.3, height: 0.7, depth: 4.2 }, material: { color: "#fff7e6", emissive: "#fff2d0", emissiveIntensity: 1.2, roughness: 0.6 },
    children: [{ feetPosition: { x: -0.16, y: 0.35, z: 0 }, rotation: { yaw: -90 }, vector: `<svg viewBox='0 0 420 70' width='4.1m'><text x='210' y='34' text-anchor='middle' font-family='display' font-weight='900' font-size='34' fill='#d8322a'>PIZZA · WINGS · DOGS</text><text x='210' y='60' text-anchor='middle' font-family='sans-serif' font-weight='700' font-size='18' fill='#1f6b3a'>FOOD COURT · SODA REFILLS FREE</text></svg>` }] });
  sp("food-glow", { feetPosition: { x: fx - 1.2, y: 2.6, z: fz }, light: { kind: "point", color: "#ffe2b0", intensity: 1.4, distance: 6 } });

  // 7. gift shop: a round hanging enamel sign on two chains over its open side
  const S = ZONES.shop, gx = S.x1 + 0.6;
  sp("gift-sign", { feetPosition: { x: gx, y: 2.55, z: 0 }, rotation: { yaw: 90 },
    vector: `<svg viewBox='0 0 120 150' width='1.1m'><line x1='30' y1='0' x2='30' y2='30' stroke='#888' stroke-width='3'/><line x1='90' y1='0' x2='90' y2='30' stroke='#888' stroke-width='3'/><circle cx='60' cy='88' r='56' fill='#1d6fa8' stroke='#f2e6c8' stroke-width='6'/><text x='60' y='86' text-anchor='middle' font-family='serif' font-weight='700' font-size='26' fill='#f2e6c8'>Gifts</text><text x='60' y='112' text-anchor='middle' font-family='serif' font-style='italic' font-size='14' fill='#f6c94a'>from home</text></svg>`, billboard: "none" });
  sp("gift-sign-b", { feetPosition: { x: gx + 0.01, y: 2.55, z: 0 }, rotation: { yaw: -90 },
    vector: `<svg viewBox='0 0 120 150' width='1.1m'><circle cx='60' cy='88' r='56' fill='#1d6fa8' stroke='#f2e6c8' stroke-width='6'/><text x='60' y='96' text-anchor='middle' font-family='serif' font-weight='700' font-size='26' fill='#f2e6c8'>Gifts</text></svg>` });

  // 8. the rink's own glow: a low warm uplight under the rail cap so the wood edge reads in the dark
  for (const s of [-1, 1]) for (const x of [-14, 0, 14]) sp(`rail-glow${s}${x}`, { feetPosition: { x, y: 0.6, z: s * (RINK.rail + 0.5) }, light: { kind: "point", color: "#ff9a5a", intensity: 0.6, distance: 5 } });
}
