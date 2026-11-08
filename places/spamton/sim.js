// Spamton's arena: lays the stage once, and stands him up fresh whenever someone is in here (scripts/spamton-boss.js fights).
export const cadence = "250ms";
const V = 3;
const BOSS_MODEL = "/cdn/value.e9d590488230d5a2ed1f5feea9e1f31046fb80e5d52f61e88491b67335bc79bb.glb";
const PINK = "oklch(0.7 0.27 345)", YEL = "oklch(0.9 0.19 100)", CYAN = "oklch(0.8 0.14 200)";
const glow = (c, i = 2.2) => ({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });

function lay(ctx) {
  const sp = (id, spec) => ctx.spawn(id, spec);
  // v1's neon stage goes (Shelly 11-08: "too ai generated visually")
  for (const id of Object.keys(ctx.place.objects)) if (/^sa-(gx|gz|rim|pillar|sign|plight|drift|fill)/.test(id)) ctx.destroy(id);
  // his showroom: a flooded-looking concrete basement under the city, round like a pit, a low ceiling lost in the dark
  sp("sa-floor", { feetPosition: { x: 0, y: -0.4, z: 0 }, primitive: { kind: "cylinder", radiusTop: 24, radiusBottom: 24, height: 0.4, radialSegments: 64 },
    material: { texture: "cdn/texture-wet-stained-cracked-concrete-basement-floor-with-oil-puddles.png", wrap: "repeat", repeat: [0.25, 0.25], color: "oklch(0.55 0.01 90)", roughness: 0.35, metalness: 0.1 }, physics: "static" });
  sp("sa-walls", { feetPosition: { x: 0, y: -0.4, z: 0 }, primitive: { kind: "cylinder", radiusTop: 24.6, radiusBottom: 24.6, height: 10, radialSegments: 64, openEnded: true },
    material: { texture: "cdn/texture-water-stained-old-cinderblock-basement-wall-peeling-paint.png", wrap: "repeat", repeat: [0.33, 0.33], color: "oklch(0.5 0.015 100)", roughness: 0.9, side: "back" } });
  sp("sa-ceiling", { feetPosition: { x: 0, y: 9.4, z: 0 }, primitive: { kind: "cylinder", radiusTop: 24.6, radiusBottom: 24.6, height: 0.3, radialSegments: 48 }, material: { color: "oklch(0.12 0.01 90)", roughness: 1 } });
  const N = 36;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2, yaw = (a * 180) / Math.PI;
    sp(`sa-wall${k}`, { visible: false, feetPosition: { x: Math.sin(a) * 24.4, y: 0, z: Math.cos(a) * 24.4 }, rotation: { yaw }, primitive: { kind: "box", width: 4.4, height: 8, depth: 0.6 }, physics: "static" });
  }
  // cables: dozens of old phone and power lines sagging down out of the ceiling, the strings he dances on among them
  for (let k = 0; k < 26; k++) {
    const a = ctx.random() * 6.283, r = 3 + ctx.random() * 19, len = 2.5 + ctx.random() * 5.5
    sp(`sa-cable${k}`, { feetPosition: { x: Math.sin(a) * r, y: 9.4 - len, z: Math.cos(a) * r }, rotation: { roll: (ctx.random() - 0.5) * 8, pitch: (ctx.random() - 0.5) * 8 },
      primitive: { kind: "cylinder", radiusTop: 0.018, radiusBottom: 0.018, height: len, radialSegments: 5 }, material: { color: k % 5 === 0 ? "oklch(0.35 0.08 25)" : "oklch(0.13 0.005 90)", roughness: 0.6 }, castShadow: false });
  }
  for (let k = 0; k < 3; k++) sp(`sa-string${k}`, { feetPosition: { x: (k - 1) * 0.6, y: 3, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.008, radiusBottom: 0.008, height: 6.4, radialSegments: 4 }, material: { color: "oklch(0.8 0.01 90)", roughness: 0.5 }, castShadow: false });
  // one bare bulb on a cord over the middle, swinging (scripts/spamton-bulb.js), plus a dim cold fill so the edges read
  sp("sa-bulbcord", { feetPosition: { x: 0, y: 5.6, z: 3 }, primitive: { kind: "cylinder", radiusTop: 0.01, radiusBottom: 0.01, height: 3.8 }, material: { color: "oklch(0.1 0 0)" }, castShadow: false });
  sp("sa-bulb", { feetPosition: { x: 0, y: 5.45, z: 3 }, primitive: { kind: "sphere", radius: 0.09 }, material: { color: "oklch(0.98 0.05 90)", emissive: "oklch(0.95 0.12 85)", emissiveIntensity: 6 }, castShadow: false,
    light: { kind: "point", color: "oklch(0.9 0.1 80)", intensity: 45, distance: 34, shadow: { enabled: true } }, behavior: "scripts/spamton-bulb.js" });
  sp("sa-key", { feetPosition: { x: 0, y: 9, z: 6 }, light: { kind: "spot", color: "oklch(0.8 0.03 220)", intensity: 14, distance: 45, angle: 75, penumbra: 0.8, aim: { x: 0, y: 0, z: -4 } } });
  // caged work lamps bolted round the wall, every other one dead or dim: they light the pit's edge so you can read where you run
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2, on = k % 3 !== 2
    sp(`sa-lamp${k}`, { feetPosition: { x: Math.sin(a) * 23.6, y: 3.6, z: Math.cos(a) * 23.6 }, rotation: { yaw: (a * 180) / Math.PI },
      primitive: { kind: "box", width: 0.5, height: 0.32, depth: 0.25 }, material: { color: "oklch(0.3 0.02 90)", emissive: on ? "oklch(0.9 0.12 80)" : "oklch(0.3 0.05 80)", emissiveIntensity: on ? 3 : 0.5, roughness: 0.6, metalness: 0.5 }, castShadow: false,
      light: on ? { kind: "point", color: "oklch(0.88 0.1 75)", intensity: 18, distance: 22 } : undefined });
  }
  sp("spam-in", { feetPosition: { x: 0, y: 0.1, z: 15 }, rotation: { yaw: 0 } });
  sp("sa-dust", { feetPosition: { x: 0, y: 0, z: 0 }, fx: { script: `fx
pop motes n=?mobile:60|140 on=box(<36,7,36>) life=6..12 v=sdir()*.05 size=.015..0.03 acc=curl(.2)*.15 col=<1,.92,.75> a=0>.2:.5>.8:.5>0 r=sprite(mote,alpha)` } });
}

export function tick(ctx) {
  const s = ctx.place.state;
  if (s.builtV !== V) { lay(ctx); s.builtV = V; }
  const here = ctx.place.players.length > 0, boss = ctx.place.objects["spam-boss"];
  if (!here) {
    if (boss) ctx.destroy("spam-boss");
    if (s.spam) s.spam = null;
    return;
  }
  if (!boss && !s.spam?.over) {
    ctx.spawn("spam-boss", {
      tags: ["spamboss"], audience: "all",
      feetPosition: { x: 0, y: 0.4, z: -9 }, scale: 2.2,
      model: { id: BOSS_MODEL, forward: "+z" },
      physics: { body: "kinematic", collider: "box" },
      behavior: "scripts/spamton-boss.js",
      state: { name: "Spamton G. Spamton" },
    });
  }
}
