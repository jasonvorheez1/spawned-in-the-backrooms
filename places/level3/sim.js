import { keepPeople } from "../../scripts/lib/level-kit.js";
import { heard } from "../../scripts/lib/hear.js";
import { tickWalls } from "../../scripts/lib/breakables.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { fullLook, npcLook } from "../../scripts/lib/clothes.js";
// Level 3's referee, "Electrical Station": lays the halls, lamps, hazards and Base Gamma's checkpoint once,
// then runs the station: live boxes that arc, black sludge that burns, generators that overload and blow,
// assembly lines that keep turning out goods, hounds in brigades and deathmoth swarms drawn to light.
import L from "../../scripts/lib/data/level3.yml";
import MEG from "../../scripts/lib/data/meg.yml";
import { N, H, TH, S, HALF, zoneOf, zoneAt, cellCenter, cellAt, openings, hash, ARRIVE, BACK, LIFT, SLUDGE, SPARKS, GENS, LINES, ceilingAt, OOB, BLOCKS, inGamma } from "../../scripts/lib/level3.js";
import { spawnAlmond, spawnWeapon } from "../../scripts/lib/loot.js";
import { rollWeaponL3 } from "../../scripts/lib/loot3.js";
import { spawnFurniture, pickKind, wallSpot3 } from "../../scripts/lib/furniture.js";
import { npcState, dmgAfterArmor } from "../../scripts/lib/stats.js";
import { weaponBody } from "../../scripts/lib/weapon-look.js";
import { layLore } from "../../scripts/lib/level3-lore.js";
import { tickChatter, CHATTER } from "../../scripts/lib/chatter.js";
import { layGammaExterior } from "../../scripts/lib/gamma-exterior.js";
export const cadence = "250ms";
const GRIT = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];

// Base Gamma's forward checkpoint: three M.E.G. agents keep the door home open
const GAMMA = {
  "gamma-reyes": { name: "Sgt. Reyes · M.E.G. Base Gamma", role: "scout", voice: "reyes", look: { species: "wolf", sex: "m", topw: "jacket", top: "#7a8a3a", botw: "pants", bottom: "#3a3a32", shoes: "boots", shoec: "#22201c", hat: "cap", hatc: "#4a5a2a", expr: "smile" }, at: [1.2, 3.0], gun: "shotgun" },
  "gamma-pell": { name: "Pell · M.E.G. Quartermaster", role: "quarter", voice: "pell", look: { species: "otter", sex: "f", topw: "jacket", top: "#b8c040", botw: "pants", bottom: "#3a3a3a", shoes: "boots", shoec: "#2a2420", expr: "grin" }, at: [3.0, -3.2], gun: "pistol" },
  "gamma-ito": { name: "Dr. Ito · M.E.G. Medic", role: "medic", voice: "ito", look: { species: "bunny", sex: "f", topw: "longsleeve", top: "#e8e4dc", botw: "skirt", bottom: "#4a4a52", shoes: "boots", shoec: "#2a2420", expr: "smile" }, at: [4.6, 1.6], gun: "wrench" },
};
// their day's work, offsets from the checkpoint: stops with a dwell (s), a chore clip and a thing to face (Savi's picks)
const ROUNDS = {
  "gamma-reyes": [{ at: [1.2, 3.0], dwell: 10, act: null, look: [8, 3] }, { at: [8.5, 0], dwell: 9, act: "cdn/clip-point.glb", look: [14, 0] }, { at: [16.5, 0], dwell: 12, act: null, look: [22, 0] }, { at: [8.5, 0], dwell: 6, act: null, look: [2, 0] }],
  "gamma-pell": [{ at: [3.0, -3.2], dwell: 16, act: "cdn/clip-pickup.glb", look: [3, -5] }, { at: [5.6, -0.6], dwell: 10, act: "cdn/clip-talk-female-loop.glb", look: [6.5, 0.5] }, { at: [1.5, -2.6], dwell: 12, act: "cdn/clip-pickup.glb", look: [1.5, -5] }],
  "gamma-ito": [{ at: [4.6, 1.6], dwell: 14, act: null, look: [2, 1.6] }, { at: [6.4, 1.6], dwell: 18, act: "cdn/clip-sit-floor-loop.glb", look: [6.5, 0.5] }, { at: [3.0, 2.6], dwell: 10, act: "cdn/clip-idle-female-loop.glb", look: [1.2, 3] }],
};
const roundsOf = (id) => { const a = cellCenter(0, ARRIVE.cz); return ROUNDS[id].map((r) => ({ x: a.x + r.at[0], y: 0, z: a.z + r.at[1], dwell: r.dwell, act: r.act, look: { x: a.x + r.look[0], z: a.z + r.look[1] } })); };
const VOICES3 = { "gamma-reyes": "reyes", "gamma-pell": "pell", "gamma-ito": "ito" };
function agent(ctx, id) {
  const g = GAMMA[id], a = cellCenter(0, ARRIVE.cz);
  ctx.spawn(id, { tags: ["npc"], feetPosition: { x: a.x + g.at[0], y: 0, z: a.z + g.at[1] }, rotation: { yaw: -90 }, physics: "character",
    ...critterSpec(npcLook(id, g.look, g.faction ?? "meg", g.level ?? 12, g.role)), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"], state: { name: g.name, role: g.role, voice: g.voice, rounds: roundsOf(id), ...npcState(ctx, "agent", MEG.hp) } });
  ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
}

const ARC = `fx
pop spark rate=(flick(1.1,1)^10)*320 on=disc(.05) life=.2..0.55 v=<%dir|0,0,1>*(1.5..3)+sdir()*1.8 size=.012..0.03 acc=grav()+drag(.4) floor=bounce(.3) sz=$size col=hdr(4,5,8)>hdr(3,1.6,.4) a=1>0 r=sprite(ember,add,velocity,.03)
pop zap n=1 r=light(<.6,.75,1>,(flick(1.1,1)^10)*1.5,4)`;
const DRIP = `fx
pop drip rate=3 on=disc(.05) life=.6 v=<0,-1,0>*(.2..0.4) size=.025..0.04 acc=grav() floor=die col=<.02,.02,.03> a=1 sz=$size r=sprite(soft-disc,alpha)
pop fume rate=4 on=disc(.5).c(-1.9) life=1.5..2.5 v=up(.15..0.3) size=.2..0.35 acc=curl(.3)+drag(.8) sz=$size*(.6>2) col=<.12,.1,.14> a=0>.2:.25>.7:.1>0 r=sprite(smoke-puff,alpha)`;
const BLOW = `fx
pop flash burst=1 life=.25 size=3 col=hdr(6,5,4) a=1>0 sz=$size*(1>2) r=sprite(soft-disc,add)
pop spark burst=120 life=.4..1.2 v=sdir()*(3..8)+up(1) size=.015..0.04 acc=grav()+drag(.6) floor=bounce(.3) col=hdr(5,4,2)>hdr(2,.6,.1) a=1>0 sz=$size r=sprite(ember,add,velocity,.04)
pop smoke burst=24 life=2..3.5 v=sdir()*(.5..1.5)+up(.8) size=.5..0.9 acc=buoy(.4)+drag(1.2) sz=$size*(.6>2.6) col=<.15,.14,.13> a=0>.1:.5>.6:.3>0 r=sprite(smoke-puff,alpha)
pop light burst=1 life=.5 r=light(<1,.8,.5>,(1>0)*60,14)`;
const WARN = `fx
pop spark rate=90 on=box(2,.1,1) life=.2..0.5 v=sdir()*(1..2.5)+up(1.2) size=.01..0.025 acc=grav()+drag(.4) col=hdr(4,5,8) a=1>0 sz=$size r=sprite(ember,add,velocity,.03)
pop glow n=1 r=light(<.55,.7,1>,flick(7,.9)*12,8)`;

// lamps: caged bulbs on porcelain sockets (scripts/l3-lamp-geo.js), warm sodium, a cold one here and there; a hard white light
// at the end of a dead-end hall (the wiki's "darker hallways" photo); the blind halls keep their dead bulbs, unlit
function layLamps(ctx) {
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const z = zoneOf(cx, cz), c = cellCenter(cx, cz), r = hash(cx, cz, 201), top = ceilingAt(cx, cz);
    if (z === "vault" || (z === "gamma" && (cx + cz) % 2)) continue;
    const pos = { x: c.x + (hash(cx, cz, 205) - 0.5) * (z === "tight" ? 0 : 1), y: top - 0.3, z: c.z + (hash(cx, cz, 207) - 0.5) * (z === "tight" ? 0 : 1) };
    if (z === "dark") { if (r < 0.35) ctx.spawn({ tags: ["l3lamp"], feetPosition: pos, visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "scripted", script: "scripts/l3-lamp-geo.js", params: { drop: 0.3, dead: true } } }); continue; }
    const deadEnd = (z === "hall" || z === "tight") && openings(cx, cz).length === 1;
    if (!deadEnd && z !== "gamma" && z !== "gen" && z !== "line" && r > 0.42) continue;
    const cold = deadEnd || z === "line" || hash(cx, cz, 203) < 0.25, col = z === "gamma" ? "oklch(0.92 0.06 95)" : cold ? "oklch(0.95 0.03 210)" : "oklch(0.82 0.13 62)";
    const inten = deadEnd ? 9 : z === "gamma" ? 5.5 : 3.2;
    ctx.spawn({ tags: ["l3lamp"], feetPosition: pos, visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "scripted", script: "scripts/l3-lamp-geo.js", params: { drop: 0.3, cold } },
      light: { kind: "point", color: col, intensity: inten, distance: deadEnd ? 14 : z === "tight" ? 10 : 11, shadow: { enabled: false }, visibleRange: { max: 40 } } });
  }
}

// everything placed by the seeded layout (lamps, leaks, live boxes, plates): laid at seeding, relaid when the layout's version moves
const JBOX = { model: { id: "/cdn/value.62a2ddb4b4b1421238b3ba91297c1bf2dc348478d02802caf7b4bc3e5a328d38.glb", forward: "+x" }, layout: { box: { min: { x: -0.225, y: 0, z: -0.225 }, max: { x: 0.225, y: 0.6, z: 0.225 } } } }; // the real wall junction box (Tripo)
function layLayout(ctx) {
  layLamps(ctx);
    // hazards: black sludge pooled under leaking pipes; live junction boxes that arc
  for (const h of SLUDGE) {
    ctx.spawn({ tags: ["sludge"], feetPosition: { x: h.x, y: 0.015, z: h.z }, rotation: { pitch: -90 }, visibleRange: { max: 35 }, castShadow: false, primitive: { kind: "circle", radius: 1.1, segments: 20 }, material: { color: "oklch(0.1 0.01 300)", roughness: 0.05, metalness: 0.3 } });
    ctx.spawn({ feetPosition: { x: h.wx, y: ceilingAt(h.cx, h.cz) - 0.3, z: h.wz }, tags: ["l3drip"], fx: { script: DRIP }, audio: { clip: GRIT("water-drip-echo-loop"), gain: 0.18, loop: true, spatial: true, maxDistance: 8 } });
  }
  for (const h of SPARKS) {
    const [nx, nz] = D4[h.d];
    ctx.spawn({ tags: ["live-box", "breakable"], feetPosition: { x: h.wx - nx * 0.1, y: 1.2, z: h.wz - nz * 0.1 }, physics: { body: "static", collider: "box" }, visibleRange: { max: 35 }, castShadow: false, state: { mat: "machine", hp: 90, maxHp: 90, name: "Junction box" }, rotation: { yaw: Math.atan2(nx, nz) * 180 / Math.PI }, ...JBOX,
      fx: { script: ARC, params: { dir: { x: -nx, y: 0.2, z: -nz } } }, audio: { clip: GRIT("electrical-arc-buzz-loop"), gain: 0.3, loop: true, spatial: true, maxDistance: 9 } });
  }
  // yellow OUT OF BOUNDS plates with real lettering, hung on the bars
  for (const o of OOB) {
    const e = o.d === 0 ? { x: (o.cx + 1) * S - HALF, z: o.cz * S - HALF + S / 2 } : { x: o.cx * S - HALF + S / 2, z: (o.cz + 1) * S - HALF };
    const side = o.r < 0.5 ? 1 : -1, x = o.d === 0 ? e.x + side * 0.06 : e.x - 0.9, z = o.d === 0 ? e.z - 0.9 : e.z + side * 0.06;
    ctx.spawn({ tags: ["l3oob"], feetPosition: { x, y: 1.55, z }, rotation: { yaw: o.d === 0 ? (side > 0 ? -90 : 90) : (side > 0 ? 180 : 0) }, visibleRange: { max: 35 }, castShadow: false, primitive: { kind: "box", width: 0.62, height: 0.3, depth: 0.02 }, material: { color: "oklch(0.8 0.15 88)", roughness: 0.6 },
      ui: '<div face="front" width="0.62m" style="font-size:118px;font-weight:900;color:#17130c;text-align:center;line-height:1.05;letter-spacing:4px;padding-top:30px">OUT OF<br>BOUNDS</div>' });
  }
}

function layGammaSignage(ctx) {
  const a = cellCenter(1, ARRIVE.cz);
  // Corridor outside Base Gamma heading into the station:
  ctx.spawn({ tags: ["l3sign"], feetPosition: { x: a.x + 10.5, y: 1.8, z: a.z }, rotation: { yaw: -90 }, visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "box", width: 2.2, height: 0.55, depth: 0.02 }, material: { color: "oklch(0.24 0.03 140)", roughness: 0.85 },
    ui: '<div face="left" width="2.2m" style="font-size:95px;font-weight:900;color:#d8e8b0;text-align:center">◄ M.E.G. BASE GAMMA<div style="font-size:55px;color:#a8c880">CHECKPOINT · WEAPONS HOLSTERED · REFUGE</div></div>' });
  // Blood test directive stencil on wall:
  ctx.spawn({ tags: ["l3sign"], feetPosition: { x: a.x + 6.2, y: 0.9, z: a.z + 4.5 }, rotation: { yaw: 0 }, visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "box", width: 2.0, height: 0.45, depth: 0.02 }, material: { color: "oklch(0.22 0.02 240)", roughness: 0.9 },
    ui: '<div face="front" width="2.0m" style="font-size:80px;font-weight:900;color:#e8f0c0;text-align:center;line-height:1.2">SECURITY DIRECTIVE<div style="font-size:50px;color:#c8d890">MANDATORY BLOOD TEST · ANTI-STEALER PROTOCOL</div></div>' });
  // High voltage caution stencil:
  if (GENS.length) {
    const g0 = GENS[0];
    ctx.spawn({ tags: ["l3sign"], feetPosition: { x: g0.x - 3.8, y: 1.9, z: g0.z }, rotation: { yaw: 90 }, visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "box", width: 1.8, height: 0.45, depth: 0.02 }, material: { color: "oklch(0.25 0.04 40)", roughness: 0.9 },
      ui: '<div face="right" width="1.8m" style="font-size:85px;font-weight:900;color:#ffaa33;text-align:center;line-line:1.15">DANGER: 10,000 VOLTS<div style="font-size:50px;color:#ffd060">TRANSFORMER SUB-STATION · LIVE ARC HAZARD</div></div>' });
  }
  // Indestructible bars caution stencil:
  if (OOB.length) {
    const o0 = OOB[0];
    const e = o0.d === 0 ? { x: (o0.cx + 1) * S - HALF, z: o0.cz * S - HALF + S / 2 } : { x: o0.cx * S - HALF + S / 2, z: (o0.cz + 1) * S - HALF };
    ctx.spawn({ tags: ["l3sign"], feetPosition: { x: e.x, y: 0.9, z: e.z }, visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "box", width: 0.8, height: 0.35, depth: 0.02 }, material: { color: "oklch(0.22 0.03 30)" },
      ui: '<div face="front" width="0.8m" style="font-size:65px;font-weight:900;color:#ff7766;text-align:center">IMPERVIOUS<div style="font-size:42px;color:#ffa090">DO NOT APPROACH</div></div>' });
  }
}

export function tick(ctx) {
  if (!ctx.place.players?.length) return; // empty level: nothing to run (perf)
  if (ctx.place.state.liftV !== 1) { ctx.place.state.liftV = 1; // the freight lift has power again: up to Level 4
    ctx.spawn("l3-lift", { tags: ["door"], feetPosition: { x: LIFT.x - 0.6, y: 0, z: LIFT.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.6, height: 2.4, depth: 2.2 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level4#l4-lift-arrive" } });
    ctx.spawn("l3-lift-arrive", { feetPosition: { x: LIFT.x - 3, y: 0.1, z: LIFT.z }, rotation: { yaw: 90 } });
    ctx.spawn({ feetPosition: { x: LIFT.x - 0.54, y: 1.4, z: LIFT.z }, visibleRange: { max: 45 }, castShadow: false, primitive: { kind: "box", width: 0.02, height: 0.56, depth: 1.2 }, material: { color: "oklch(0.62 0.14 85)" },
      ui: '<div face="left" width="1.2m" style="font-size:120px;font-weight:900;color:#1a1410;text-align:center;line-height:1.1">LIFT 4<div style="font-size:70px">▲ abandoned office</div></div>' });
    ctx.spawn({ feetPosition: { x: LIFT.x - 1.2, y: 2.6, z: LIFT.z }, light: { kind: "point", color: "oklch(0.85 0.1 85)", intensity: 3, distance: 6, shadow: { enabled: false }, visibleRange: { max: 35 } } });
  }
  if (ctx.place.state.lift5V !== 1) { ctx.place.state.lift5V = 1; // the guest lift beside it: brass doors, to Level 5's hotel (one cell south of LIFT 4)
    const z5 = LIFT.z + 4;
    ctx.spawn("l3-lift5", { tags: ["door"], feetPosition: { x: LIFT.x - 0.6, y: 0, z: z5 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.6, height: 2.4, depth: 2.2 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level5#l5-from-l3" } });
    ctx.spawn("l3-from-l5", { feetPosition: { x: LIFT.x - 3, y: 0.1, z: z5 }, rotation: { yaw: 90 } });
    ctx.spawn({ feetPosition: { x: LIFT.x - 0.12, y: 0, z: z5 }, rotation: { yaw: 90 }, visibleRange: { max: 45 }, castShadow: false, primitive: { kind: "box", width: 1.6, height: 2.3, depth: 0.08 }, material: { color: "oklch(0.62 0.11 75)", texture: "cdn/texture-scratched-worn-steel.png", metalness: 0.85, roughness: 0.3 } });
    ctx.spawn({ feetPosition: { x: LIFT.x - 0.54, y: 1.4 + 1.2, z: z5 }, visibleRange: { max: 45 }, castShadow: false, primitive: { kind: "box", width: 0.02, height: 0.56, depth: 1.2 }, material: { color: "oklch(0.3 0.05 40)" },
      ui: '<div face="left" width="1.2m" style="font-family:serif;font-size:120px;font-weight:900;color:#e8c983;text-align:center;line-height:1.1">LIFT 5<div style="font-size:66px;font-style:italic">the hotel</div></div>' });
    ctx.spawn({ feetPosition: { x: LIFT.x - 1.2, y: 2.6, z: z5 }, light: { kind: "point", color: "oklch(0.8 0.12 70)", intensity: 3, distance: 6, shadow: { enabled: false }, visibleRange: { max: 35 } } });
  }
  const s = ctx.place.state, now = ctx.now();
  // a blackout (scripts/horde.js) on anyone here kills the level's lamps: a faint red emergency glow, and the hounds see farther in the dark
  const night = ctx.place.players.some((p) => p.state?.horde === "night");
  if (night !== !!s.blackout) {
    s.blackout = night; s.flicker = night ? "dark" : null;
    for (const r of ctx.query({ tags: ["l3lamp"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
      const o = ctx.getObject(r.id); if (!o) continue;
      if (night && o.light) { o.state.lit = o.light; o.light = { ...o.light, color: "oklch(0.42 0.2 25)", intensity: o.light.intensity * 0.05 }; }
      else if (!night && o.state?.lit) { o.light = o.state.lit; delete o.state.lit; }
    }
  }
  if (!(Math.abs(now - (ctx.session.wallTick ?? -1e9)) < 2000)) { ctx.session.wallTick = now; tickWalls(ctx); } // broken interior walls: holes drawn, regrown after a while (lib/breakables.js)
  if (!s.almondTidy) { s.almondTidy = 1; for (const o of ctx.query({ tags: ["almond"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) { const p = o.feetPosition ?? { x: 0, y: 0, z: 0 }; if (p.y < 0.15 && !(false)) ctx.destroy(o.id); } } // loose floor bottles cleared once: almond water lives in containers and drops now
  if (s.seeded && s.gammaExtV !== 1) layGammaExterior(ctx);
  if (s.seeded && s.jboxV !== 1) { s.jboxV = 1; for (const o of ctx.query({ tags: ["live-box"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) { const b = ctx.getObject(o.id); if (!b) continue; const h = SPARKS.find((q) => Math.hypot(q.wx - D4[q.d][0] * 0.1 - o.feetPosition.x, q.wz - D4[q.d][1] * 0.1 - o.feetPosition.z) < 0.3); b.primitive = null; b.material = null; b.model = JBOX.model; b.layout = JBOX.layout; if (h) b.rotation = { yaw: Math.atan2(D4[h.d][0], D4[h.d][1]) * 180 / Math.PI }; } } // grey boxes become the real junction box
  if (s.seeded && s.genTripoV !== 1) { s.genTripoV = 1; for (const id of Object.keys(ctx.place.objects)) { const o = ctx.place.objects[id]; if ((o.model?.id ?? o.model) === "/cdn/value.f2cc96cb814887e44442e010f610a0890537af8e6f7f6965290304f2f4b81c85.glb") { o.scale = 1; o.model = "/cdn/value.7868138caa40f6f5e3f59d0f34f03a7019f6a39fafc581e4534f0752a76e5167.glb"; o.layout = { box: { min: { x: -1.5, y: 0, z: -0.9 }, max: { x: 1.5, y: 2.1, z: 0.9 } } }; } } } // the transformer rooms' generator: the rusted Tripo model (Shelly: less blocky)
  if (s.seeded && s.signsV !== 1) { s.signsV = 1; layGammaSignage(ctx); }
  if (s.furnitureSeeded !== 2) { // loot moved from crates into fuse cabinets, toolboxes, lockers and satchels: clear the old crates once
    for (const o of ctx.query({ tags: ["crate"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) if (o.tags?.includes("container")) ctx.destroy(o.id);
    s.furnitureSeeded = 2; if (s.seeded && !ctx.query({ tags: ["lootfurn"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).length) seedFurniture3(ctx);
  }
  if (s.seeded && s.lampV !== 2) { for (const o of ctx.query({ tags: ["l3lamp"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id); layLamps(ctx); s.lampV = 2; } // caged fixtures replaced the bare spheres
  if (s.seeded && s.layoutV !== 2) { // the halls were re-cut (narrow crawls, more bars): move what hangs on them
    for (const t of ["l3lamp", "sludge", "live-box", "l3drip", "l3oob"]) for (const o of ctx.query({ tags: [t], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id);
    for (const o of ctx.query({ radius: 1e5, center: { x: 0, y: 0, z: 0 } })) if (!o.tags?.length && String(ctx.getObject(o.id)?.audio?.clip ?? "").includes("water-drip")) ctx.destroy(o.id); // the first leaks wore no tag
    layLayout(ctx);
    for (const o of ctx.query({ tags: ["lootfurn"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id); // furniture backs onto walls that moved
    seedFurniture3(ctx);
    for (const t of ["almond", "weapon", "ammo", "shells", "crate"]) for (const o of ctx.query({ tags: [t], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) { // loose loot inside a crawl hall's liner rolls to its centre line
      const k = cellAt(o.feetPosition.x, o.feetPosition.z); if (!k || zoneOf(k.cx, k.cz) !== "tight") continue; const c = cellCenter(k.cx, k.cz); o.feetPosition = { x: c.x, y: o.feetPosition.y, z: c.z };
    }
    s.layoutV = 2;
  }
  if (!s.arrive2 && s.seeded) { s.arrive2 = true; ctx.spawn("l3-from-l2", { feetPosition: { x: BACK.x + 2.4, y: 0.1, z: BACK.z }, rotation: { yaw: -90 } }); } // where the Level 2 door lets you out
  if (!s.seeded) {
    s.seeded = true;
    ctx.spawn("l3-geo", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level3-geo.js" }, material: { roughness: 0.9 } });
    layLayout(ctx); s.layoutV = 2;
    // the door home, west wall: a green LEVEL 2 plate and a light over it
    ctx.spawn("l3-back", { feetPosition: { x: BACK.x + 0.6, y: 0, z: BACK.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.6, height: 2.4, depth: 1.3 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level2" } });
    ctx.spawn({ feetPosition: { x: BACK.x + 0.52, y: 2.6, z: BACK.z }, visibleRange: { max: 45 }, castShadow: false, primitive: { kind: "box", width: 0.02, height: 0.4, depth: 1.2 }, material: { color: "oklch(0.25 0.03 150)" },
      ui: '<div face="right" width="1.2m" style="font-size:110px;font-weight:900;color:#d8f0c0;text-align:center">LEVEL 2</div>' });
    // Base Gamma: a hand-painted plate, a stove, the agents
    const a = cellCenter(1, ARRIVE.cz);
    ctx.spawn({ feetPosition: { x: a.x + 6.2, y: 1.7, z: a.z - 5.6 }, rotation: { yaw: 0 }, visibleRange: { max: 45 }, castShadow: false, primitive: { kind: "box", width: 2.4, height: 0.7, depth: 0.03 }, material: { color: "oklch(0.3 0.03 140)", roughness: 0.9 },
      ui: '<div face="front" width="2.4m" style="font-size:150px;font-weight:900;color:#e8f0d0;text-align:center;line-height:1.1">M.E.G. · GAMMA<div style="font-size:80px;color:#c8d880">checkpoint. no further w/o escort</div></div>' });
    ctx.spawn({ feetPosition: { x: a.x + 2.5, y: 0, z: a.z + 0.5 }, visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "cylinder", radiusTop: 0.25, radiusBottom: 0.3, height: 0.4 }, material: { color: "oklch(0.25 0.01 250)", metalness: 0.6 },
      fx: { script: `fx\npop flame rate=16 on=disc(.12).c(.4) life=.3..0.6 v=up(.7) size=.08..0.14 sz=$size*(1>.2) col=hdr(4,2,.6)>hdr(1.4,.4,.1) a=0>.15:1>.7:.6>0 r=sprite(flame-wisp,add)\npop glow n=1 at=disc(.1).c(.6) r=light(<1,.6,.3>,fire()*6,8)` },
      audio: { clip: GRIT("campfire-crackle-loop"), gain: 0.2, loop: true, spatial: true, maxDistance: 10 } });
    for (const id of Object.keys(GAMMA)) agent(ctx, id);
    // the freight lift east: dead, a sign on its gate
    ctx.spawn({ feetPosition: { x: LIFT.x - 0.5, y: 1.4, z: LIFT.z }, visibleRange: { max: 45 }, castShadow: false, primitive: { kind: "box", width: 0.02, height: 0.5, depth: 1.1 }, material: { color: "oklch(0.6 0.13 80)" },
      ui: '<div face="left" width="1.1m" style="font-size:120px;font-weight:900;color:#1a1410;text-align:center;line-height:1.1">LIFT 4<div style="font-size:70px">no power</div></div>' });
    ctx.spawn({ feetPosition: { x: LIFT.x - 1.2, y: 2.6, z: LIFT.z }, light: { kind: "point", color: "oklch(0.7 0.16 30)", intensity: 2.5, distance: 6, shadow: { enabled: false }, visibleRange: { max: 35 } } });
    // generators hum
    for (const g of GENS) ctx.spawn(`l3-gen-${g.i}`, { feetPosition: { x: g.x, y: 1.2, z: g.z }, audio: { clip: GRIT("generator-heavy-hum-loop"), gain: 0.35, loop: true, spatial: true, maxDistance: 16 } });
    ctx.spawn({ feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/level3-details-geo.js" }, material: { roughness: 0.85 } }); // tile wainscot, signs, sludge pools, the statue, violet bricks, almond piles
    // the Blender-built models (art/level3/build.py): generators, assembly lines, the marble statue, wall boxes, bottle piles, cameras
    const L3M = { bottles: "/cdn/value.fd97d841d450a844d49368f6140950f0c48b8c6b50ba3cda61291a7d82fbec96.glb", camera: "/cdn/value.9a228d2a44ac47cc422ab5bcdbbaa10b84f595f45d7cb1acd62d496a80a648bc.glb", generator: "/cdn/value.7868138caa40f6f5e3f59d0f34f03a7019f6a39fafc581e4534f0752a76e5167.glb", line: "/cdn/value.1bc56a08754ad99605d9605af31ac68640ddc6126fd6cea17b05fd46cc96bc52.glb", statue: "/cdn/value.17d71ddd03bd0c0f26442d38dda850d8d8eb3e49d1e3c8b09ad1cec98ca90a95.glb", wallbox: "/cdn/value.ba5136c85ccb173e33e96f5633746c6ea83673f487d82fd34c0b727875111c93.glb" }; // uploaded from art/level3 (art/level3/build.py makes them)
    const M3 = (name, x, y, z, o = {}) => ctx.spawn({ feetPosition: { x, y, z }, model: L3M[name], visibleRange: { max: 45 }, castShadow: false, ...o });
    const SOLID = { physics: { body: "static", collider: "mesh" } };
    for (const g of GENS) M3("generator", g.x, 0, g.z, { layout: { box: { min: { x: -1.5, y: 0, z: -0.9 }, max: { x: 1.5, y: 2.1, z: 0.9 } } }, ...SOLID });
    for (const l of LINES) { M3("line", (l.x0 + l.x1) / 2, 0, l.z, SOLID); M3("bottles", l.x1 - 0.2, 0, l.z + 1.4, { rotation: { yaw: 40 } }); }
    for (const g of GENS) M3("bottles", g.x - 3.2, 0, g.z + 1.9, { rotation: { yaw: 110 } });
    for (const b of BLOCKS) if (b.type === "vault" && b.content === "statue") { const c0 = cellCenter(b.x0, b.z0); M3("statue", c0.x + S / 2, 0, c0.z + S / 2, { rotation: { yaw: 90 }, ...SOLID }); }
    for (const sp of SPARKS) { const [nx, nz] = D4[sp.d]; M3("wallbox", sp.wx + nx * 0.09, 0, sp.wz + nz * 0.09, { rotation: { yaw: Math.atan2(nx, nz) * 57.2958 } }); }
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) if (inGamma(cx, cz) && (cx + cz) % 3 === 0) { const c = cellCenter(cx, cz); M3("camera", c.x, H, c.z, { rotation: { yaw: 90, roll: 180 } }); }
    for (const l of LINES) ctx.spawn({ feetPosition: { x: (l.x0 + l.x1) / 2, y: 1.2, z: l.z }, audio: { clip: GRIT("factory-conveyor-clank-loop"), gain: 0.3, loop: true, spatial: true, maxDistance: 14 } });
    // supplies: crates in dead ends and rooms, almond water, the odd weapon on the floor
    seedFurniture3(ctx);
    const open = (cx, cz) => zoneOf(cx, cz) !== "vault" && zoneOf(cx, cz) !== "gamma";
    for (let i = 0, n = 0; n < L.floorWeapons && i < 400; i++) { const cx = 6 + Math.floor(ctx.random() * (N - 6)), cz = Math.floor(ctx.random() * N); if (!open(cx, cz)) continue; const c = cellCenter(cx, cz); spawnWeapon(ctx, { x: c.x - 0.6, z: c.z + 0.4 }, rollWeaponL3(ctx)); n++; }
    s.gen = {}; s.line = {}; s.gone = {};
    layGammaSignage(ctx); s.signsV = 1;
  }

  if (s.layoutV && s.loreV !== 1) { s.lore = layLore(ctx); s.loreV = 1; } // lore set pieces (scripts/lib/level3-lore.js)

  // ---- the station, every tick
  const players = ctx.place.players;
  if (players.length) {
    s.gen ??= {};
    for (const p of players) {
      const ps = p.state; if (!ps || ps.hp == null || ps.hp <= 0) continue;
      const f = p.feetPosition, dt = 0.25;
      // sludge: it burns through boots and the fumes get in your head
      for (const h of SLUDGE) if (Math.hypot(f.x - h.x, f.z - h.z) < 1.05 && f.y < 0.3) { ps.hp -= dmgAfterArmor(ps.look, L.sludgeHurt * dt); ps.sanity = Math.max(0, (ps.sanity ?? 0) - L.sludgeSanity * dt); if (!p.session?.sl || now - (ps.slAt ?? 0) > 1500) { ps.slAt = now; heard(ctx, { maxDistance: 24, refDistance: 4, clip: GRIT("acid-sizzle-hiss"), position: f, volume: 0.5 }, { audience: { player: p.id } }); ctx.emit("screenFlash", { color: "#201028", duration: 0.3, intensity: 0.35 }, { audience: { player: p.id } }); } break; }
      // live boxes arc into whoever brushes past
      for (const h of SPARKS) {
        const [nx, nz] = D4[h.d], bx = h.wx - nx * 0.1, bz = h.wz - nz * 0.1;
        if (Math.hypot(f.x - bx, f.z - bz) < L.sparkReach && now - (ps.zapAt ?? 0) > 2500) {
          ps.zapAt = now; ps.hp -= dmgAfterArmor(ps.look, L.sparkHurt);
          const at = { x: f.x, y: f.y + 1.1, z: f.z };
          ctx.emit("fx", { position: at, script: BLOW.replace("burst=120", "burst=40").replace("size=3", "size=1.2").replace(/pop smoke[^\n]*\n/, "") });
          heard(ctx, { maxDistance: 32, refDistance: 5, clip: GRIT("electric-zap-shock"), position: at, volume: 0.9 });
          ctx.emit("damageNumber", { position: at, value: L.sparkHurt, color: "#9cc8ff" });
          ctx.emit("screenShake", { intensity: 0.4, duration: 0.25 }, { audience: { player: p.id } });
          ctx.emit("screenFlash", { color: "#b8d8ff", duration: 0.25, intensity: 0.6 }, { audience: { player: p.id } });
        }
      }
    }
    // generators overload: the hum climbs, sparks fly, then it blows. get out of the room when it warns you
    for (const g of GENS) {
      const k = String(g.i), st = s.gen[k] ?? { next: now + (L.genOverload.every[0] + ctx.random() * (L.genOverload.every[1] - L.genOverload.every[0])) * 1000 };
      if (!s.gen[k]) s.gen = { ...s.gen, [k]: st };
      const near = players.some((p) => Math.hypot(p.feetPosition.x - g.x, p.feetPosition.z - g.z) < 20);
      if (!near) continue;
      if (!st.warn && now > st.next - L.genOverload.warn * 1000) {
        s.gen = { ...s.gen, [k]: { ...st, warn: true } };
        ctx.spawn(`l3-genwarn-${k}`, { feetPosition: { x: g.x, y: 1.6, z: g.z }, fx: { script: WARN }, audio: { clip: GRIT("electrical-overload-whine-rise"), gain: 0.7, loop: false, spatial: true, maxDistance: 22 }, lifetime: L.genOverload.warn + 0.5 });
      } else if (st.warn && now > st.next) {
        const at = { x: g.x, y: 1.4, z: g.z };
        ctx.emit("fx", { position: at, script: BLOW });
        heard(ctx, { clip: GRIT("transformer-explosion-blast"), position: at, volume: 1, maxDistance: 40 });
        ctx.emit("shockwave", { position: at, speed: 14, thickness: 1.5, intensity: 0.6 });
        for (const p of players) {
          const d = Math.hypot(p.feetPosition.x - g.x, p.feetPosition.z - g.z);
          if (d < 18) ctx.emit("screenShake", { intensity: Math.max(0.15, 1 - d / 18), duration: 0.5 }, { audience: { player: p.id } });
          if (d < L.genOverload.radius && p.state?.hp > 0) { const dmg = Math.round(L.genOverload.hurt * (1 - d / (L.genOverload.radius * 1.4))); p.state.hp -= dmgAfterArmor(p.state.look, dmg); ctx.emit("damageNumber", { position: { ...p.feetPosition, y: p.feetPosition.y + 1.4 }, value: dmg, color: "#ffb060" }); }
        }
        for (const m of ctx.query({ anyTags: ["hound", "moths"], radius: L.genOverload.radius, center: at })) if (!m.state?.dead) m.state.hp -= L.genOverload.hurt; // it takes creatures with it too
        s.gen = { ...s.gen, [k]: { next: now + (L.genOverload.every[0] + ctx.random() * (L.genOverload.every[1] - L.genOverload.every[0])) * 1000 } };
      }
    }
    // assembly lines keep running for nobody: goods drop into the bin at the end
    s.line ??= {};
    for (const l of LINES) {
      const k = String(l.i); if (now - (s.line[k] ?? 0) < L.lineEvery * 1000) continue;
      s.line = { ...s.line, [k]: now };
      const end = { x: l.x1 + 1.3, z: l.z };
      if (ctx.query({ tags: ["container"], radius: 2.5, center: { ...end, y: 0 } }).length >= L.lineMax) continue;
      spawnFurniture(ctx, "level3", "shelfbin", { x: end.x + 0.3, z: end.z + (ctx.random() - 0.5) * 1.2, dx: 1, dz: 0 }, { table: "line", name: "Line output bin", noLock: true }); // the catch bin at the line's end, open to the line
      heard(ctx, { clip: GRIT("machine-press-stamp-thunk"), position: { x: (l.x0 + l.x1) / 2, y: 1, z: l.z }, volume: 0.6, maxDistance: 18 });
    }
  }

  if (s.roundsV !== 1) { s.roundsV = 1; for (const id of Object.keys(GAMMA)) { const o = ctx.place.objects[id]; if (o) { o.state.rounds = roundsOf(id); o.state.ri = 0; } } } // the agents already standing pick up their work
  tickChatter(ctx, CHATTER.level3, VOICES3);
  // Base Gamma's agents come back after a while if they fall
  keepPeople(ctx, Object.keys(GAMMA), agent);
  // hounds in brigades, deathmoth swarms, kept topped up far from the checkpoint
  if ((!s.packMgr || !(s.packMgr in ctx.place.objects))) s.packMgr = ctx.spawn({ behavior: "scripts/hounds.js" });
  const hasMoths = ctx.world.files.includes("templates/deathmoths.js") && ctx.world.files.includes("scripts/deathmoths.js");
  if (hasMoths && (!s.mothMgr || !(s.mothMgr in ctx.place.objects))) s.mothMgr = ctx.spawn({ behavior: "scripts/deathmoths.js" });
  if (now - (s.houndAt ?? 0) > L.entityRespawn * 1000 || !s.houndAt) {
    s.houndAt = now;
    const far = () => { for (let i = 0; i < 50; i++) { const cx = 8 + Math.floor(ctx.random() * (N - 8)), cz = Math.floor(ctx.random() * N), z = zoneOf(cx, cz); if (z !== "vault" && z !== "gamma") return cellCenter(cx, cz); } return cellCenter(N - 2, 2); };
    const have = ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((h) => !h.state?.dead).length;
    for (let i = have, c = far(); i < L.hounds; i++) { if (i % 3 === 0) c = far(); ctx.spawn({ tags: ["hound"], feetPosition: { x: c.x + (i % 3) * 0.8, y: 0.05, z: c.z }, physics: { body: "character" }, primitive: { kind: "scripted", script: "scripts/hound-geo.js" }, state: npcState(ctx, "hound", 70, { xp: 50 }) }); }
    if (hasMoths) {
      const mothsHave = ctx.query({ tags: ["moths"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((m) => !m.state?.dead).length;
      for (let i = mothsHave; i < L.moths; i++) { const c = far(); ctx.spawn({ template: "templates/deathmoths.js#swarm", feetPosition: { x: c.x, y: 1.4, z: c.z }, state: { home: { x: c.x, z: c.z } } }); }
    }
  }
}

// supplies: searchable furniture back to a closed wall in dead ends and rooms (generator rooms hold fuse cabinets)
function seedFurniture3(ctx) {
  let n = 0;
  for (let cx = 5; cx < N && n < L.crates; cx++) for (let cz = 0; cz < N && n < L.crates; cz++) {
    const z = zoneOf(cx, cz); if (z === "vault" || z === "gamma") continue;
    const chance = z === "gen" ? 0.3 : openings(cx, cz).length === 1 ? 0.45 : 0.04;
    if (hash(cx, cz, 301) > chance) continue;
    const kind = z === "gen" ? "fuse" : pickKind("level3", hash(cx, cz, 307)), spot = wallSpot3(cx, cz, kind, hash(cx, cz, 303), hash(cx, cz, 305));
    if (!spot) continue;
    spawnFurniture(ctx, "level3", kind, spot, z === "gen" ? { table: "gen" } : {}); n++;
  }
}
