// The Bonus Room's extra shine on top of the baked mall (places/bonus/cells/x0z0.scene): a slow mirror ball over the fountain whose
// four coloured lights sweep the whole court, a neon ring round the fountain, drifting dust in the skylight beams, spray off the
// fountain, and a soft neon line along each gallery edge. Laid once from places/bonus/sim.js (ids all start "bonus-fx-").
import B from "./data/bonus.yml";
const A = "scripts/ambient-anim.js";
const NEON_P = "oklch(0.74 0.2 350)", NEON_T = "oklch(0.8 0.13 190)";
const neon = (c) => ({ color: c, emissive: c, emissiveIntensity: 2.4, roughness: 0.3 });
const GLINT = `fx
pop glint rate=20 on=sphere(.52) life=.25..0.5 v=sdir()*.2 size=.04..0.09 col=hdr(3,3,3) a=1>0 sz=$size r=sprite(soft-disc,add)`;
const DUST = `fx
pop mote rate=18 on=box(9,5,26) life=6..11 v=sdir()*.06 size=.014..0.03 acc=curl(.4)*.07 col=<1,.9,1> a=0>.5:.25>.5:.75>0 r=sprite(mote,alpha)`;
const SPRAY = `fx
pop drop rate=22 on=disc(.25) life=.8..1.4 v=up(1.1)+sdir()*.25 size=.03..0.06 acc=vec(0,-2.2,0) col=<.8,.95,1> a=.8>0 sz=$size r=sprite(soft-disc,add)`;

export function layBonusExtra(ctx) {
  const sp = (id, spec) => { if (!ctx.place.objects?.[id]) ctx.spawn(id, spec); };
  const f = B.fountain ?? { x: 0, z: 12, r: 3.2 };
  const top = B.floors?.roof ?? 13.5;
  // the mirror ball: spins slowly, its four lights turn with it
  sp("bonus-fx-ball", { feetPosition: { x: f.x, y: top - 3.2, z: f.z }, behavior: A, state: { anim: { kind: "spin", sec: 16 } },
    primitive: { kind: "sphere", radius: 0.6 }, material: { color: "oklch(0.9 0.005 250)", metalness: 1, roughness: 0.08 }, fx: { script: GLINT },
    children: [
      { feetPosition: { x: 0, y: 1.6, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.012, radiusBottom: 0.012, height: 2.6 }, material: { color: "oklch(0.3 0.01 250)" } },
      { feetPosition: { x: 5, y: -2.4, z: 0 }, light: { kind: "point", color: "oklch(0.75 0.25 350)", intensity: 7, distance: 22, shadow: { enabled: false } } },
      { feetPosition: { x: -5, y: -2.4, z: 0 }, light: { kind: "point", color: "oklch(0.8 0.15 190)", intensity: 7, distance: 22, shadow: { enabled: false } } },
      { feetPosition: { x: 0, y: -2.4, z: 5 }, light: { kind: "point", color: "oklch(0.85 0.17 85)", intensity: 6, distance: 22, shadow: { enabled: false } } },
      { feetPosition: { x: 0, y: -2.4, z: -5 }, light: { kind: "point", color: "oklch(0.7 0.2 290)", intensity: 6, distance: 22, shadow: { enabled: false } } },
    ] });
  // a neon ring round the fountain's lip
  sp("bonus-fx-fountain-ring", { feetPosition: { x: f.x, y: 0.06, z: f.z }, rotation: { pitch: 90 }, primitive: { kind: "torus", radius: f.r + 0.35, tube: 0.03 }, material: neon(NEON_T) });
  sp("bonus-fx-fountain-spray", { feetPosition: { x: f.x, y: 2.6, z: f.z }, fx: { script: SPRAY } });
  // dust hanging in the skylight light, over the whole court
  sp("bonus-fx-dust", { feetPosition: { x: 0, y: 3, z: 0 }, fx: { script: DUST } });
  // a thin neon line along the front of each upper gallery, alternating pink and teal
  const g = B.galleries ?? { west: [-10, -6], east: [6, 10], z: [-28, 24] };
  const len = g.z[1] - g.z[0], mid = (g.z[0] + g.z[1]) / 2, y = (B.floors?.upper ?? 5.5) - 0.12;
  [["west", g.west[1], NEON_P], ["east", g.east[0], NEON_T]].forEach(([k, x, c]) =>
    sp(`bonus-fx-edge-${k}`, { feetPosition: { x, y, z: mid }, primitive: { kind: "box", width: 0.06, height: 0.06, depth: len }, material: neon(c) }));
}
