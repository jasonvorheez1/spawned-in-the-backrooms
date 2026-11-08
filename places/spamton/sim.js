// Spamton's arena: lays the stage once, and stands him up fresh whenever someone is in here (scripts/spamton-boss.js fights).
export const cadence = "250ms";
const V = 1;
const BOSS_MODEL = "/cdn/value.e9d590488230d5a2ed1f5feea9e1f31046fb80e5d52f61e88491b67335bc79bb.glb";
const PINK = "oklch(0.7 0.27 345)", YEL = "oklch(0.9 0.19 100)", CYAN = "oklch(0.8 0.14 200)";
const glow = (c, i = 2.2) => ({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });

function lay(ctx) {
  const sp = (id, spec) => ctx.spawn(id, spec);
  // the stage: a black glass disc, a pink grid across it, a yellow rim, invisible walls past it
  sp("sa-floor", { feetPosition: { x: 0, y: -0.4, z: 0 }, primitive: { kind: "cylinder", radiusTop: 24, radiusBottom: 24, height: 0.4, radialSegments: 64 }, material: { color: "oklch(0.12 0.02 330)", roughness: 0.15, metalness: 0.6 }, physics: "static" });
  for (let i = -6; i <= 6; i++) {
    const half = Math.sqrt(Math.max(0, 24 * 24 - (i * 3.6) ** 2)) * 2 - 0.4;
    sp(`sa-gx${i}`, { feetPosition: { x: i * 3.6, y: 0.005, z: 0 }, primitive: { kind: "box", width: 0.07, height: 0.01, depth: half }, material: glow(PINK, 1.6), castShadow: false });
    sp(`sa-gz${i}`, { feetPosition: { x: 0, y: 0.006, z: i * 3.6 }, primitive: { kind: "box", width: half, height: 0.01, depth: 0.07 }, material: glow(PINK, 1.6), castShadow: false });
  }
  const N = 36;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2, x = Math.sin(a) * 23.6, z = Math.cos(a) * 23.6, yaw = (a * 180) / Math.PI;
    sp(`sa-rim${k}`, { feetPosition: { x, y: 0, z }, rotation: { yaw }, primitive: { kind: "box", width: 4.2, height: 0.35, depth: 0.5 }, material: glow(k % 2 ? YEL : PINK, 1.4), physics: "static" });
    sp(`sa-wall${k}`, { visible: false, feetPosition: { x: Math.sin(a) * 24.4, y: 0, z: Math.cos(a) * 24.4 }, rotation: { yaw }, primitive: { kind: "box", width: 4.4, height: 8, depth: 0.6 }, physics: "static" });
  }
  // pillars out in the dark, each topped with a spinning-sign look: a price tag in neon
  const TAGS = ["$$DEALS$", "BIG SHOT", "$49.998", "[[HYPERLINK BLOCKED]]", "KROMER", "$VALUES$", "1-800-ROOM-0", "NOW'S YOUR CHANCE"];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2, x = Math.sin(a) * 32, z = Math.cos(a) * 32, yaw = (a * 180) / Math.PI + 180;
    const c = [PINK, YEL, CYAN][k % 3];
    sp(`sa-pillar${k}`, { feetPosition: { x, y: -2, z }, primitive: { kind: "box", width: 1.6, height: 16 + (k % 3) * 4, depth: 1.6 }, material: { color: "oklch(0.15 0.03 330)", roughness: 0.3, metalness: 0.7 } });
    sp(`sa-sign${k}`, { feetPosition: { x: x * 0.97, y: 9 + (k % 3) * 2, z: z * 0.97 }, rotation: { yaw }, vector: `<svg viewBox='0 0 400 90' width='9m'><rect x='4' y='4' width='392' height='82' rx='10' fill='none' stroke='${k % 2 ? "#ffe14d" : "#ff2bd0"}' stroke-width='6' filter='drop-shadow(0 0 8 ${k % 2 ? "#ffe14d" : "#ff2bd0"})'/><text x='200' y='60' text-anchor='middle' font-family='display' font-size='44' fill='#ffffff' filter='drop-shadow(0 0 6 #ff2bd0)'>${TAGS[k].replace(/&/g, "&amp;")}</text></svg>` });
    sp(`sa-plight${k}`, { feetPosition: { x: x * 0.8, y: 7, z: z * 0.8 }, light: { kind: "point", color: c, intensity: 2.2, distance: 26 } });
  }
  // strings from the dark above the centre: he is a puppet, and the strings are what he hangs from
  for (let k = 0; k < 3; k++) sp(`sa-string${k}`, { feetPosition: { x: (k - 1) * 0.6, y: 6, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.012, radiusBottom: 0.012, height: 40 }, material: glow("oklch(0.95 0.02 330)", 0.6), castShadow: false });
  sp("sa-key", { light: { kind: "spot", color: "oklch(0.95 0.08 95)", intensity: 6, distance: 40, angle: 40, penumbra: 0.6, aim: { x: 0, y: 0, z: 0 }, shadow: { enabled: true } }, feetPosition: { x: 0, y: 18, z: 6 } });
  sp("sa-fill", { light: { kind: "point", color: PINK, intensity: 3, distance: 30 }, feetPosition: { x: 0, y: 4, z: 0 } });
  sp("spam-in", { feetPosition: { x: 0, y: 0.1, z: 15 }, rotation: { yaw: 0 } });
  // floating money drifting in the dark around the stage
  sp("sa-drift", { feetPosition: { x: 0, y: 0, z: 0 }, fx: { script: `fx
pop bills n=?mobile:40|90 on=ring(26,40) life=6..10 v=up(.2..0.6)+sdir()*.2 size=.25..0.4 acc=curl(.3)*.6 col=<.45,1.2,.55> a=0>.15:.9>.85:.9>0 rot=spin(1.5) r=sprite(soft-disc,alpha)
pop dollars n=?mobile:14|30 on=ring(20,34) life=4..7 v=up(.6..1.2) size=.4..0.7 col=hdr(2.4,2.1,.4) a=0>.2:.8>.8:.8>0 r=sprite(sparkle,add)` } });
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
