import { animate } from "builtin/tween";
// Level 69 "The Road Trip of Affliction" (Wikidot). Shelly Nov 17: a solo adventure with an intro, food and water to find,
// and a surveyor's quest. One endless highway toward -Z between 11 m concrete walls, fog that won't touch a running car.
// The sim streams 40 m road slices around you, keeps your car, rolls the rare finds, and runs the two horrors:
//   The Beings From Above: stand outside the car and something comes down out of the black. 8 s a creak overhead,
//   15 s its legs reach the road beside you, 21 s it takes you (heavy damage); back in the car it lets go. Not a fight.
//   The Whispers: every minute or two a line in your head, costing a little sanity (more on foot).
// The exit: a perpendicular tunnel cut into the left wall at 2.2 km. Drive in: seventeen hours pass in a black card, the car
// dies at the far end of a lit tunnel, and you walk the last stretch to a door into Level 11.
// Numbers are Savi's picks.
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook } from "../../scripts/lib/clothes.js";
import CAMP from "../../scripts/lib/data/l0-kit-camp.yml";

export const cadence = "100ms";
const L = 40, TUN_K = 55, TUN_Z = -TUN_K * 40 - 20; // the tunnel mouth's centre (left wall)
const POSTS = [{ z: -600, km: "0.6" }, { z: -1200, km: "1.2" }, { z: -1800, km: "1.8" }];
const WREN_Z = -260;
const SEDAN = "/cdn/value.75b49ca4395a7da77d80c0fe5589224c21034b5a646d18f6577609e76845c706.glb";
const BEING = "/cdn/value.7aed2c912e13d7cb7ce4d834eff41632a64027a022c7f98806ae0959e9cdece2.glb";
const CAR_BOX = { min: { x: -1.0, y: 0, z: -2.6 }, max: { x: 1.0, y: 1.6, z: 2.6 } };
const SEAT = { x: -0.45, y: 0.32, z: 0.15 };
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const WHISPERS = [
  "you left the stove on", "they stopped looking for you", "pull over", "it's only a little further",
  "you were driving when it happened", "don't check the back seat", "nobody packed for you", "turn the lights off. it's easier",
  "you've passed this before", "they can see you from up there", "the door isn't locked", "you could just stop",
];
const TUNNEL_X = 600; // the tunnel's interior lies out here, out of sight of the highway
const SUPPLY = ["beans,almond", "ration,cloudy_almond", "bandage,almond,bar", "tomato_soup,stillwater", "peach_jar,almond", "firstaid,mineralwater"];

const box = (w, h, d) => ({ kind: "box", width: w, height: h, depth: d });
const sfx = (ctx, p, clip, vol = 0.7, at) => ctx.emit("playSound", { clip, volume: vol, ...(at ? { position: at, maxDistance: 40 } : {}) }, { audience: { player: p.id } });

function carSpec(id, at, extra = {}) {
  return {
    tags: ["usable", "vehicle"], feetPosition: at, rotation: { yaw: 0 },
    physics: { body: "dynamic", collider: "none", mass: 300, centerOfMass: [0, 0.45, 0], angularDamping: 0.5 },
    behavior: "scripts/l69-car.js", model: { id: SEDAN, forward: "+x" }, layout: { box: CAR_BOX },
    state: { kind: "car", name: "The car", verb: "Get in", seat: SEAT, info: "Yours, apparently. Keys in it." },
    children: [
      { id: "hull", feetPosition: { x: 0, y: 0.35, z: 0 }, primitive: box(1.95, 1.0, 5.1), visible: false, physics: "static" },
      { id: "hl-l", feetPosition: { x: -0.62, y: 0.72, z: -2.8 }, rotation: { pitch: -4 } },
      { id: "hl-r", feetPosition: { x: 0.62, y: 0.72, z: -2.8 }, rotation: { pitch: -4 } },
      { id: "tail", feetPosition: { x: 0, y: 0.8, z: 2.62 }, light: { kind: "point", color: "#ff2010", intensity: 0.5, distance: 4 } },
      { id: "dash", feetPosition: { x: -0.4, y: 1.0, z: -0.6 } },
    ],
    ...extra,
  };
}

// sodium wall lamps (Nov 17, "why is it dark"): one per 20 m, alternating walls, every 6th dead, so the road reads as night, not void
function lamps(k) {
  const out = [];
  for (const j of [0, 1]) {
    const n = k * 2 + j, side = n % 2 ? 1 : -1, dead = n % 6 === 4, x = side * 9.0, z = -10 - j * 20;
    out.push({ feetPosition: { x, y: 7.2, z }, castShadow: false, primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.05, height: 0.9 }, rotation: { roll: 90 }, material: { color: "#2a2b2d", metalness: 0.7, roughness: 0.5 } });
    out.push({ feetPosition: { x: x - side * 0.45, y: 6.95, z }, castShadow: false, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.32, height: 0.22 }, material: dead ? { color: "#1d1e20", metalness: 0.6, roughness: 0.6 } : { color: "#3a3226", emissive: "#ffae4a", emissiveIntensity: 3 } });
    if (!dead) out.push({ feetPosition: { x: x - side * 0.6, y: 6.6, z }, light: { kind: "point", color: "#ffa64a", intensity: 16, distance: 26, shadow: { enabled: false } }, visibleRange: { max: 70 } });
  }
  return out;
}
// overhead sign gantries (Nov 17, "improve level 69 some more"): every 400 m a steel gantry over the road. Ahead of the tunnel the
// green sign counts the exit down; past it, the signs stop making sense. Behind the start, a red WRONG WAY faces anyone driving back.
const STEEL = { texture: "cdn/texture-scratched-worn-steel.png", color: "#6f7378", metalness: 0.85, roughness: 0.5 };
function gantry(k) {
  const z0 = -k * L, z = -20, wz = z0 + z;
  if (k === -2) return [ // the wrong way: a lone red sign on the right-hand post, facing anyone heading +Z
    { feetPosition: { x: 6.2, y: 0, z }, castShadow: false, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.07, height: 3.1 }, material: STEEL },
    { feetPosition: { x: 6.2, y: 2.0, z: z + 0.09 }, castShadow: false, primitive: { kind: "box", width: 1.6, height: 1.1, depth: 0.05 }, material: { color: "#b51e1e", roughness: 0.4, emissive: "#3a0606", emissiveIntensity: 1 },
      ui: '<div face="front" style="width:1.6m;height:1.1m;display:flex;flex-direction:column;align-items:center;justify-content:center;border:40px solid #f2ede4;box-sizing:border-box;color:#f2ede4;font:900 230px Arial,sans-serif;line-height:1">WRONG<div>WAY</div></div>' },
  ];
  if (k <= 1 || k % 10 !== 5) return [];
  const left = (wz - TUN_Z) / 1000;
  const text = left > 0.05 ? `<div style="font-size:150px">EXIT 69</div><div style="font-size:120px;margin-top:30px">&#8598; ${left.toFixed(1)} km</div><div style="font-size:80px;margin-top:30px;opacity:.85">LEFT LANE</div>`
    : ["<div style=\"font-size:130px\">YOU MISSED IT</div>", "<div style=\"font-size:120px\">EXIT 69</div><div style=\"font-size:100px;margin-top:30px\">&#8598; 2.2 km</div>", "<div style=\"font-size:120px\">TURN AROUND</div><div style=\"font-size:80px;margin-top:30px\">YOU CAN'T</div>", "<div style=\"font-size:120px\">REST AREA</div><div style=\"font-size:100px;margin-top:30px\">CLOSED</div>"][Math.abs(k) % 4];
  const out = [];
  for (const x of [-8.6, 8.6]) {
    out.push({ feetPosition: { x, y: 0, z }, castShadow: false, primitive: { kind: "cylinder", radiusTop: 0.16, radiusBottom: 0.2, height: 7.4, radialSegments: 16 }, material: STEEL });
    out.push({ feetPosition: { x, y: 0, z }, castShadow: false, primitive: { kind: "cylinder", radiusTop: 0.34, radiusBottom: 0.38, height: 0.35, radialSegments: 16 }, material: { texture: "cdn/texture-weathered-stained-poured-concrete-wall-panels.png", color: "#8a857c", roughness: 0.9 } });
  }
  out.push({ feetPosition: { x: 0, y: 6.7, z }, castShadow: false, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 17.6, radialSegments: 12 }, rotation: { roll: 90 }, pivot: "center", material: STEEL });
  out.push({ feetPosition: { x: 0, y: 6.1, z }, castShadow: false, primitive: { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.09, height: 17.6, radialSegments: 12 }, rotation: { roll: 90 }, pivot: "center", material: STEEL });
  out.push({ feetPosition: { x: -3.6, y: 3.9, z: z + 0.15 }, castShadow: false, primitive: { kind: "box", width: 5.2, height: 2.3, depth: 0.08 }, material: { color: "#0e5a34", roughness: 0.35, metalness: 0.2, emissive: "#062a18", emissiveIntensity: 0.6 },
    ui: `<div face="back" style="width:5.2m;height:2.3m;display:flex;flex-direction:column;align-items:center;justify-content:center;border:36px solid #e9f0ea;border-radius:60px;box-sizing:border-box;color:#e9f0ea;font:700 120px Arial,sans-serif;letter-spacing:6px;line-height:1">${text}</div>` });
  out.push({ feetPosition: { x: -3.6, y: 6.3, z: z + 0.5 }, light: { kind: "spot", color: "#dfe8ff", intensity: 6, distance: 6, angle: 45, penumbra: 0.6, aim: { x: 0, y: -0.6, z: -0.3 }, shadow: { enabled: false } }, visibleRange: { max: 140 } });
  return out;
}
// the ghost car: every minute or two, headlights in the far lane, coming at you. It passes close, the wind punches the car, and in the mirror there's nothing.
function ghost(ctx, p, pos, now, inCar) {
  const st = ctx.place.state, id = "l69-ghost";
  if (!st.nextGhost) st.nextGhost = now + 50000;
  const g = ctx.place.objects[id];
  if (g && now > (st.ghostEnd ?? 0)) { ctx.destroy(id); return; }
  if (g || now < st.nextGhost || !inCar) return;
  st.nextGhost = now + (60 + ctx.random() * 70) * 1000;
  const z0 = pos.z - 170, z1 = pos.z + 60, dur = 6.2;
  st.ghostEnd = now + dur * 1000;
  const h = ctx.getObject(ctx.spawn(id, { feetPosition: { x: 3.4, y: 0.02, z: z0 }, rotation: { yaw: 180 }, castShadow: false, model: { id: SEDAN, forward: "+x" }, layout: { box: CAR_BOX },
    children: [
      { feetPosition: { x: -0.62, y: 0.72, z: -2.8 }, light: { kind: "spot", color: "#f4f0e0", intensity: 120, distance: 60, angle: 30, penumbra: 0.5, aim: { x: 0, y: -0.1, z: -1 }, shadow: { enabled: false } } },
      { feetPosition: { x: 0.62, y: 0.72, z: -2.8 }, light: { kind: "spot", color: "#f4f0e0", intensity: 120, distance: 60, angle: 30, penumbra: 0.5, aim: { x: 0, y: -0.1, z: -1 }, shadow: { enabled: false } } },
      { feetPosition: { x: 0, y: 0.7, z: -2.7 }, primitive: { kind: "box", width: 1.7, height: 0.14, depth: 0.04 }, material: { color: "#fff6d8", emissive: "#fff2c0", emissiveIntensity: 6 } },
    ] }));
  if (h) animate(ctx, h, { "feetPosition.z": z1 }, { duration: dur, easing: "linear" });
  sfx(ctx, p, G("distant-car-approaching-at-speed-then-roaring-past-doppler"), 0.9);
  ctx.after?.(3.3, "ghostPass", { pid: p.id });
}
export function ghostPass(ctx, { pid } = {}) {
  ctx.emit("screenShake", { intensity: 0.25, duration: 0.5 }, { audience: { player: pid } });
  ctx.emit("playSound", { clip: G("violent-wind-gust-buffets-car-body"), volume: 0.7 }, { audience: { player: pid } });
}
function slice(ctx, k, want) {
  const id = `l69-road-${k}`; want.add(id);
  if (ctx.place.objects[id]) return;
  const z0 = -k * L, tunnel = k === TUN_K ? "left" : undefined;
  ctx.spawn(id, { tags: ["l69road"], feetPosition: { x: 0, y: 0, z: z0 }, physics: "static", receiveShadow: true,
    primitive: { kind: "scripted", script: "scripts/l69-road-geo.js", params: { seed: k, ...(tunnel ? { tunnel } : {}) } }, material: { pbr: true },
    children: [...lamps(k), ...gantry(k)] });
  // what this slice carries: a survey post, a rare stalled car with something in the boot, the tunnel's glow
  for (const P of POSTS) if (P.z <= z0 && P.z > z0 - L) {
    const pid = `l69-post-${P.km}`; want.add(pid);
    ctx.spawn(pid, { tags: ["usable", "l69post"], feetPosition: { x: 9.1, y: 0.18, z: P.z }, behavior: "scripts/l69-post.js",
      primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.07, height: 1.3 }, material: { color: "#e86a1a", roughness: 0.5, emissive: "#5a2004", emissiveIntensity: 1 },
      state: { name: `Reflector post · ${P.km} km`, verb: "Clamp beacon", km: P.km } });
  }
  if (k > 2 && k % 7 === 3 && k !== TUN_K) {
    const cid = `l69-stalled-${k}`; want.add(cid);
    const side = k % 2 ? 1 : -1;
    ctx.spawn(cid, { tags: ["container", "l69stalled"], feetPosition: { x: side * 7.4, y: 0.02, z: z0 - 18 }, rotation: { yaw: side * 6 + (k % 3) * 4 },
      model: { id: SEDAN, forward: "+x", materials: {} }, layout: { box: CAR_BOX }, physics: "static",
      state: { name: "Stalled car · the boot", items: SUPPLY[k % SUPPLY.length], info: "Doors open. Nobody. Somebody packed for a long drive." } });
  }
  if (tunnel) {
    const gid = `l69-tunnel-glow`; want.add(gid);
    ctx.spawn(gid, { feetPosition: { x: -13, y: 4, z: TUN_Z }, light: { kind: "point", color: "oklch(0.92 0.06 95)", intensity: 18, distance: 22 },
      audio: { clip: G("tunnel-sodium-light-hum-and-distant-wind-loop"), loop: true, gain: 0.25, spatial: true, maxDistance: 35 } });
  }
}

function layWren(ctx) {
  if (ctx.place.objects["l69-npc-wren"]) return;
  const at = { x: 6.6, y: 0.02, z: WREN_Z };
  ctx.spawn("l69-wren-car", { feetPosition: { x: 7.3, y: 0.02, z: WREN_Z - 6 }, rotation: { yaw: 3 }, model: { id: SEDAN, forward: "+x" }, layout: { box: CAR_BOX }, physics: "static",
    tags: ["container"], state: { name: "Wren's car · glovebox", items: "ration,almond", info: "Dead battery. A survey tripod across the back seat." } });
  ctx.spawn("l69-wren-lamp", { feetPosition: { x: 5.6, y: 0.02, z: WREN_Z + 1.2 }, model: CAMP.models.lantern, layout: { box: { min: { x: -0.08, y: 0, z: -0.08 }, max: { x: 0.08, y: 0.32, z: 0.08 } } },
    light: { kind: "point", color: "oklch(0.85 0.12 75)", intensity: 3.5, distance: 10, shadow: { enabled: true } } });
  ctx.spawn("l69-wren-pack", { feetPosition: { x: 7.8, y: 0.02, z: WREN_Z + 1.6 }, rotation: { yaw: 40 }, model: CAMP.models.backpack, layout: { box: { min: { x: -0.18, y: 0, z: -0.18 }, max: { x: 0.18, y: 0.48, z: 0.18 } } } });
  ctx.spawn("l69-wren-crate", { tags: ["container"], feetPosition: { x: 8.3, y: 0.02, z: WREN_Z - 0.4 }, rotation: { yaw: 12 }, model: CAMP.models["almond-crate"], layout: { box: { min: { x: -0.4, y: 0, z: -0.3 }, max: { x: 0.4, y: 0.5, z: 0.3 } } },
    state: { name: "Wren's supply crate", items: "almond,almond,beans", info: "M.E.G. stencil. She says take what you need." } });
  const look = npcLook("l69-npc-wren", { species: "cat", sex: "f", topw: "jacket", botw: "cargo", shoes: "boots", hat: "beanie" }, "survivor", 2);
  ctx.spawn("l69-npc-wren", { ...critterSpec(look), tags: ["npc", "l69npc"], feetPosition: at, rotation: { yaw: -100 }, physics: { body: "kinematic", collider: "capsule" },
    state: { name: "Wren Adeyemi", dlg: "l69-npc-wren", faction: "meg", role: "scout", look, hostile: false, unconscious: false } });
}

function being(ctx, p, l, now) {
  const out = l.outAt ? (now - l.outAt) / 1000 : 0, id = "l69-being";
  const o = ctx.place.objects[id];
  if (!l.outAt) { if (o) { ctx.destroy(id); sfx(ctx, p, G("giant-chitin-limbs-retract-upward-into-darkness"), 0.6); } return; }
  const pos = p.feetPosition;
  if (out > 8 && !l.creak) { l.creak = true; sfx(ctx, p, G("huge-creature-shifting-high-above-creak-and-click"), 0.8); ctx.emit("screenShake", { intensity: 0.08, duration: 0.6 }, { audience: { player: p.id } }); }
  if (out > 15 && !o) {
    ctx.spawn(id, { feetPosition: { x: pos.x + 3, y: 34, z: pos.z - 4 }, rotation: { roll: 180, yaw: (now / 37) % 360 }, model: { id: BEING }, layout: { box: { min: { x: -14, y: 0, z: -14 }, max: { x: 14, y: 30, z: 14 } } }, castShadow: true });
    sfx(ctx, p, G("enormous-segmented-legs-descending-scraping-stone"), 1);
    l.downAt = now;
  }
  if (o) { // it follows above you, lowering
    const f = Math.min(1, (now - (l.downAt ?? now)) / 5000), y = 34 - f * 4;
    const t = o.feetPosition; o.feetPosition = { x: t.x + (pos.x + 2 - t.x) * 0.08, y, z: t.z + (pos.z - 3 - t.z) * 0.08 };
  }
  if (out > 21 && now - (l.hitAt ?? 0) > 6000 && (p.state.hp ?? 0) > 0 && !p.state.dead) {
    l.hitAt = now; p.state.l69 = { ...l }; p.state.hp -= 55; p.state.sanity = Math.max(0, (p.state.sanity ?? 100) - 20);
    sfx(ctx, p, G("chitin-spike-impales-flesh-wet-crunch-and-scream-of-metal"), 1);
    ctx.emit("screenFlash", { color: "#300000", duration: 0.5, intensity: 0.6 }, { audience: { player: p.id } });
    ctx.emit("screenShake", { intensity: 0.7, duration: 0.6 }, { audience: { player: p.id } });
    ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.6, z: pos.z }, value: 55, color: "#a01818" });
    p.velocity = { x: 0, y: 5, z: 0 }; // lifted, then dropped
  }
}

export function tick(ctx) {
  const now = ctx.now(), st = ctx.place.state;
  const p = ctx.place.players[0]; if (!p) return;
  if (!ctx.place.objects["l69-bed"]) ctx.spawn("l69-bed", { feetPosition: { x: 0, y: 0, z: 0 }, audio: { clip: G("deep-empty-highway-wind-drone-with-far-concrete-groans-loop"), loop: true, gain: 0.16, spatial: false } });
  if (!ctx.place.objects["l69-car"]) ctx.spawn("l69-car", carSpec("l69-car", { x: -3.5, y: 0.6, z: -12 }));
  layWren(ctx);
  const car = ctx.place.objects["l69-car"];
  const s = p.state, l = s.l69 ? { ...s.l69 } : {}; let dirty = false;
  // a death here (Nov 17, "im being rapidly spawn killed"): the clock above stops; back on your feet, you're back behind the wheel with a fresh grace
  if (((s.hp ?? 1) <= 0 || s.dead) && !l.downed) { l.downed = true; l.outAt = null; l.hitAt = null; dirty = true; if (ctx.place.objects["l69-being"]) ctx.destroy("l69-being"); }
  if (l.downed && (s.hp ?? 1) > 0 && !s.dead) { l.downed = false; dirty = true; ctx.session.l69seated = null; }
  if (l.downed) { s.l69 = l; return; }
  // the wake-up: once per visit, seat them behind the wheel with the engine running
  const visit = ctx.place.mintedFrom ? String(ctx.self?.place ?? ctx.place.id ?? "") + (st.made ??= now) : (st.made ??= now); // one seat per copy of the level, not per machine
  if (ctx.session.l69seated !== visit && car) {
    ctx.session.l69seated = visit; l.introAt = now; l.outAt = null; l.tunnelAt = null; dirty = true;
    car.controller = p.id; car.state.driver = p.id;
    const pl = ctx.getObject(p.id); if (pl) { pl.parent = car.id; pl.feetPosition = { ...SEAT }; pl.rotation = { yaw: 0 }; pl.velocity = { x: 0, y: 0, z: 0 }; }
    ctx.after?.(0.1, "noop", {});
    sfx(ctx, p, G("old-sedan-engine-idle-loop-low-rumble"), 0.4);
  }
  const inCar = !!car && (p.controlling?.id === car.id || ctx.getObject(p.id)?.parent?.id === car.id);
  const pos = inCar ? car.feetPosition : p.feetPosition;
  // stream the road around whoever is moving
  const k0 = Math.floor(-pos.z / L), want = new Set();
  if (now - (ctx.session.l69streamAt ?? 0) > 400) {
    ctx.session.l69streamAt = now;
    for (let k = k0 - 3; k <= k0 + 4; k++) slice(ctx, k, want);
    for (const r of ctx.query({ anyTags: ["l69road", "l69post", "l69stalled"], radius: 1e6, center: { x: 0, y: 0, z: 0 } })) if (!want.has(r.id) && Math.abs(r.feetPosition.z - pos.z) > 200) ctx.destroy(r.id);
  }
  // stepping out starts the clock above; climbing back in stops it
  if (now - (l.introAt ?? 0) > 13000 && !l.tunnelAt) {
    if (!inCar && !l.outAt) { l.outAt = now; l.creak = false; l.downAt = null; dirty = true; sfx(ctx, p, G("car-door-open-cold-wind-rushes-in"), 0.6); }
    if (inCar && l.outAt) { l.outAt = null; dirty = true; }
  }
  // the road doesn't go back: 300 m the wrong way and it quietly folds you 600 m forward, the same stretch again (you passed that car already)
  if (pos.z > 300 && !l.tunnelAt) {
    if (inCar && car) car.feetPosition = { ...car.feetPosition, z: car.feetPosition.z - 600 };
    else { const pl = ctx.getObject(p.id); if (pl) pl.feetPosition = { ...pl.feetPosition, z: pl.feetPosition.z - 600 }; }
    ctx.session.l69streamAt = 0;
    if (!l.foldSaid) { l.foldSaid = true; l.whisper = { text: "there's no going back", at: now }; dirty = true; ctx.emit("playSound", { clip: "/cdn/voice-the-whispers-saying-theres-no-going-back.mp3", volume: 0.6 }, { audience: { player: p.id } }); }
  }
  ghost(ctx, p, pos, now, inCar);
  being(ctx, p, l, now);
  // the whispers
  if (!st.nextWhisper) st.nextWhisper = now + 40000;
  if (now > st.nextWhisper && now - (l.introAt ?? 0) > 20000 && !l.tunnelAt) {
    st.nextWhisper = now + (45 + ctx.random() * 65) * 1000;
    const text = WHISPERS[Math.floor(ctx.random() * WHISPERS.length)];
    l.whisper = { text, at: now }; dirty = true;
    s.sanity = Math.max(0, (s.sanity ?? 100) - (inCar ? 2 : 6));
    ctx.emit("playSound", { clip: `/cdn/voice-the-whispers-saying-${text.replace(/[^a-z ]/g, "").replace(/ /g, "-")}.mp3`, volume: 0.55 }, { audience: { player: p.id } });
  }
  // the tunnel: drive (or walk) into the mouth
  if (!l.tunnelAt && pos.x < -10.5 && Math.abs(pos.z - TUN_Z) < 5) { l.tunnelAt = now; l.outAt = null; dirty = true; sfx(ctx, p, G("car-engine-drone-fades-into-long-tunnel-hum"), 0.8); }
  if (l.tunnelAt && !l.inTunnel && now - l.tunnelAt > 4500) { // seventeen hours later
    l.inTunnel = true; dirty = true;
    layTunnel(ctx);
    if (car) { car.velocity = { x: 0, y: 0, z: 0 }; car.angularVelocity = { x: 0, y: 0, z: 0 }; car.rotation = { yaw: 0 }; car.feetPosition = { x: TUNNEL_X, y: 0.6, z: -10 }; car.state.hp = Math.min(car.state.hp ?? 100, 18); car.state.faults = [...new Set([...(car.state.faults ?? []), "dash"])]; }
    if (!inCar) { const pl = ctx.getObject(p.id); if (pl) pl.feetPosition = { x: TUNNEL_X + 2.5, y: 0.3, z: -6 }; }
  }
  if (l.inTunnel && car && !l.died && car.feetPosition.z < -70) { // the end of the journey: it coughs and dies
    l.died = true; dirty = true; car.state.hp = 0; car.audio = null; sfx(ctx, p, G("car-engine-dies-and-ticks-cooling"), 0.9);
    s.notice = { text: "The engine dies. Seventeen hours of tunnel behind you. Walk the rest.", at: now };
  }
  if (dirty) s.l69 = l;
}
export function noop() {}

function layTunnel(ctx) {
  for (let k = 0; k < 6; k++) {
    const id = `l69-tun-${k}`; if (ctx.place.objects[id]) continue;
    ctx.spawn(id, { feetPosition: { x: TUNNEL_X, y: 0, z: -k * L }, physics: "static", primitive: { kind: "scripted", script: "scripts/l69-road-geo.js", params: { seed: 100 + k, roof: true } }, material: { pbr: true } });
    for (const zz of [-10, -30]) ctx.spawn(`l69-tunl-${k}-${zz}`, { feetPosition: { x: TUNNEL_X, y: 7.6, z: -k * L + zz }, light: { kind: "point", color: "oklch(0.86 0.12 75)", intensity: 7, distance: 16 } });
  }
  if (!ctx.place.objects["l69-exit"]) ctx.spawn("l69-exit", { feetPosition: { x: TUNNEL_X, y: 0, z: -232 }, physics: { body: "static", collider: "box", trigger: true }, primitive: box(16, 4, 2), visible: false,
    behavior: "scripts/l69-exit.js", children: [{ feetPosition: { x: 0, y: 3, z: -4 }, light: { kind: "point", color: "oklch(0.95 0.03 230)", intensity: 25, distance: 30 } }] });
  if (!ctx.place.objects["l69-tun-cap"]) ctx.spawn("l69-tun-cap", { feetPosition: { x: TUNNEL_X, y: 0, z: 6 }, physics: "static", primitive: box(20, 12, 1), material: { texture: "cdn/texture-weathered-stained-poured-concrete-wall-panels.png", color: "#8a857c" } });
}
