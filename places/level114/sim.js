// Level 114: one bedroom (x -2..2, z -2.25..2.25, 2.5 m high), the door on the south wall ajar onto the void.
// place.state.lit: the switch. Lit: Smiler eyes glint under the bed and in the closet gap. Dark: a Smiler comes out after DARK_S.
// Now and then a counterpart stands at the window. The void runs south; a lone door at z 62 lets you out (scripts/l114-use.js).
export const cadence = "250ms";
const V = 3, H = 2.5, W = 2, D = 2.25, DOOR = { x: 1.1, w: 0.9, h: 2.05 }, WIN = { x: -0.6, w: 1.1, y0: 0.9, y1: 1.9 };
const DARK_S = 7, BITE = 18; // my picks: seconds of dark before a Smiler bites, and its bite
const WALL = { texture: "cdn/texture-faded-pale-blue-childhood-wallpaper-tiny-yellow-stars-water-stained.png", wrap: "repeat", repeat: [1, 1], roughness: 0.9 };
const CARPET = { texture: "cdn/texture-worn-beige-bedroom-carpet-fibres-faint-stains.png", wrap: "repeat", repeat: [1, 1], roughness: 1 };
const CEIL = { texture: "cdn/texture-white-popcorn-ceiling-stippled-plaster-yellowed.png", wrap: "repeat", repeat: [1, 1], roughness: 1 };
const MOULD = "/cdn/value.422c28d69f13a7cfa68cefd16f1721d1a2098da79925a424cfbf24473e4d4b66.png";
const F = (id) => ({ // furniture.yml rows reused (Shelly: every asset is free to reuse)
  bed: { id: "/cdn/value.24ed070918486558801bbbd9e5e4ced359d39ee50d561bc0fb2430030a04bdef.glb", size: [1.0, 0.95, 2.0] },
  dresser: { id: "/cdn/value.e231c093c2aceb9bfda1e65b5a29ffad0b450c23783d96cfe12892823a42a328.glb", forward: "-z", size: [1.2, 0.8, 0.48] },
  tv: { id: "/cdn/value.30ae8e4fd0c2e307d21943aa6fa38f3f816fcc7a10335f5a15ff865b00b84ce4.glb", forward: "+x", size: [0.9, 1.0, 0.5] },
  shelf: { id: "/cdn/value.918584eed8336eda888580753019763471fcce0adcaf2bc66def78f53ae3fad0.glb", forward: "+x", size: [0.8, 1.7, 0.38] },
  lava: { id: "/cdn/value.2f0eae283b6ebd13603b9891c607686c47f142b2e36b43e6148b098ac56a24af.glb", forward: "+x", size: [0.42, 0.9, 0.42] },
  lamp: { id: "/cdn/value.56e857c3fa9f839e7d3406ce7a54b6caaa028f92cfc1e5b9935ed654404c7d26.glb", forward: "+x", size: [0.45, 1.7, 0.45] },
}[id]);
const SMILE = (op) => `<svg viewBox='0 0 120 60' width='0.42m'><g filter='drop-shadow(0 0 4px #fff)' opacity='${op}'><ellipse cx='32' cy='16' rx='9' ry='6' fill='#fffbe8'/><ellipse cx='88' cy='16' rx='9' ry='6' fill='#fffbe8'/><path d='M14 34 Q60 64 106 34 Q60 50 14 34 Z' fill='#fffbe8'/><path d='M24 38 L28 46 M36 42 L38 51 M48 44 L49 54 M60 45 L60 55 M72 44 L71 54 M84 42 L82 51 M96 38 L92 46' stroke='#222' stroke-width='2.4'/></g></svg>`;
const FIGURE = `<svg viewBox='0 0 60 140' width='0.7m'><path d='M30 6 C42 6 46 20 42 30 C54 36 56 60 54 84 L50 140 L10 140 L6 84 C4 60 6 36 18 30 C14 20 18 6 30 6 Z' fill='#050505'/><circle cx='24' cy='20' r='1.6' fill='#d8d2b0'/><circle cx='36' cy='20' r='1.6' fill='#d8d2b0'/></svg>`;
function box(ctx, id, x0, y0, z0, x1, y1, z1, mat, solid = true) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0, rep = [Math.max(1, Math.max(w, d) / 1.2), Math.max(1, h / 1.2)];
  ctx.spawn(id, { tags: ["l114"], feetPosition: { x: (x0 + x1) / 2, y: y0, z: (z0 + z1) / 2 }, primitive: { kind: "box", width: w, height: h, depth: d }, material: { ...mat, repeat: rep }, ...(solid ? { physics: "static" } : {}) });
}
function put(ctx, id, m, x, z, yaw, extra = {}) { const [w, h, d] = m.size;
  ctx.spawn(id, { tags: ["l114"], feetPosition: { x, y: 0, z }, rotation: { yaw }, model: { id: m.id, ...(m.forward ? { forward: m.forward } : {}) }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } }, physics: { body: "static", collider: "box" }, ...extra }); }
function build(ctx) {
  for (const o of ctx.query({ tags: ["l114"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id);
  const t = 0.12;
  box(ctx, "floor", -W, -0.1, -D, W, 0, D, CARPET); box(ctx, "ceil", -W, H, -D, W, H + 0.1, D, CEIL);
  box(ctx, "wall-w", -W - t, 0, -D, -W, H, D, WALL); box(ctx, "wall-e", W, 0, -D, W + t, H, D, WALL);
  // north wall with the window
  box(ctx, "wall-n1", -W, 0, -D - t, WIN.x - WIN.w / 2, H, -D, WALL); box(ctx, "wall-n2", WIN.x + WIN.w / 2, 0, -D - t, W, H, -D, WALL);
  box(ctx, "wall-n3", WIN.x - WIN.w / 2, 0, -D - t, WIN.x + WIN.w / 2, WIN.y0, -D, WALL); box(ctx, "wall-n4", WIN.x - WIN.w / 2, WIN.y1, -D - t, WIN.x + WIN.w / 2, H, -D, WALL);
  ctx.spawn("glass", { tags: ["l114"], feetPosition: { x: WIN.x, y: WIN.y0, z: -D - t / 2 }, primitive: { kind: "box", width: WIN.w, height: WIN.y1 - WIN.y0, depth: 0.01 }, material: { color: "oklch(0.2 0.01 250 / 0.35)", transparent: true, roughness: 0.05, metalness: 0.2 }, physics: "static" });
  ctx.spawn("sill", { tags: ["l114"], feetPosition: { x: WIN.x, y: WIN.y0 - 0.04, z: -D + 0.06 }, primitive: { kind: "box", width: WIN.w + 0.16, height: 0.04, depth: 0.14 }, material: { color: "oklch(0.92 0.01 90)", roughness: 0.6 } });
  ctx.spawn("night", { tags: ["l114"], feetPosition: { x: WIN.x, y: 0, z: -D - 0.6 }, primitive: { kind: "box", width: 3, height: 3, depth: 0.05 }, material: { color: "oklch(0.02 0 0)" } }); // nothing outside but black
  // south wall with the door ajar
  box(ctx, "wall-s1", -W, 0, D, DOOR.x - DOOR.w / 2, H, D + t, WALL); box(ctx, "wall-s2", DOOR.x + DOOR.w / 2, 0, D, W, H, D + t, WALL); box(ctx, "wall-s3", DOOR.x - DOOR.w / 2, DOOR.h, D, DOOR.x + DOOR.w / 2, H, D + t, WALL);
  ctx.spawn("door-frame", { tags: ["l114"], feetPosition: { x: DOOR.x, y: 0, z: D + t / 2 }, rotation: { yaw: 180 }, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { style: "wood", part: "frame", w: DOOR.w, h: DOOR.h, d: t + 0.02, seed: 114 } }, material: { pbr: true } });
  ctx.spawn("door-leaf", { tags: ["l114"], feetPosition: { x: DOOR.x + DOOR.w / 2, y: 0, z: D + t / 2 }, rotation: { yaw: 180 + 38 }, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { style: "wood", part: "leaf", w: DOOR.w, h: DOOR.h, hingeSide: "left", swing: -1, seed: 114 } }, material: { pbr: true }, physics: { body: "static", collider: "box" } });
  // skirting
  for (const [id, x, z, w, d] of [["sk-w", -W + 0.01, 0, 0.02, 2 * D], ["sk-e", W - 0.01, 0, 0.02, 2 * D], ["sk-n", 0, -D + 0.01, 2 * W, 0.02]]) ctx.spawn(id, { tags: ["l114"], feetPosition: { x, y: 0, z }, primitive: { kind: "box", width: w, height: 0.09, depth: d }, material: { color: "oklch(0.93 0.01 90)", roughness: 0.5 } });
  // furniture: the bed against the west wall, head to the north
  put(ctx, "bed", F("bed"), -W + 0.55, -0.85, 0, { tags: ["l114", "usable"], state: { name: "Bed", verb: "Look", info: "too small for you now" } });
  put(ctx, "nightstand", F("lava"), -W + 0.3, -D + 0.3, 90);
  put(ctx, "dresser", F("dresser"), W - 0.3, -0.6, -90);
  put(ctx, "tv", F("tv"), W - 0.32, 0.9, -90, { tags: ["l114", "usable"], state: { name: "Television", verb: "Turn On", info: "nothing happens" } });
  put(ctx, "shelf", F("shelf"), 0.6, -D + 0.22, 180, { tags: ["l114", "container", "furniture"], state: { name: "Bookshelf", verb: "Search", kind: "home", items: "almond,bar,battery" } });
  put(ctx, "lamp", F("lamp"), -W + 0.3, D - 0.35, 0);
  ctx.spawn("switch", { tags: ["l114", "usable"], audience: "all", feetPosition: { x: DOOR.x - DOOR.w / 2 - 0.22, y: 1.15, z: D - 0.01 }, rotation: { yaw: 180 }, primitive: { kind: "box", width: 0.08, height: 0.12, depth: 0.015 }, material: { color: "oklch(0.95 0.01 90)", roughness: 0.4 }, behavior: "scripts/l114-use.js", state: { kind: "switch", name: "Light Switch", verb: "Switch Off", info: "on" } });
  ctx.spawn("ceil-light", { tags: ["l114"], feetPosition: { x: 0, y: H - 0.12, z: 0 }, primitive: { kind: "sphere", radius: 0.2, widthSegments: 20, heightSegments: 10, thetaLength: 1.6 }, rotation: { pitch: 180 }, material: { color: "oklch(0.97 0.03 90)", emissive: "oklch(0.97 0.05 90)", emissiveIntensity: 1.6 }, light: { kind: "point", color: "oklch(0.92 0.07 85)", intensity: 2.2, distance: 9, shadow: { enabled: true } } });
  // stress mould in the corners (wiki: it creeps in with the room's mood)
  for (const [i, x, y, z, yaw, s] of [[0, -W + 0.006, 2.1, -1.9, 90, 0.9], [1, W - 0.006, 2.2, 1.7, -90, 1.1], [2, 1.6, 2.15, -D + 0.006, 0, 0.8], [3, -1.4, 0.35, D - 0.006, 180, 0.7]])
    ctx.spawn(`mould${i}`, { tags: ["l114"], feetPosition: { x, y, z }, rotation: { yaw }, primitive: { kind: "plane", width: s, height: s }, material: { texture: MOULD, transparent: true, alphaTest: 0.05, roughness: 1, depthWrite: false } });
  // the void: a black floor south of the door, and a lone door far off
  ctx.spawn("void", { tags: ["l114"], feetPosition: { x: 0, y: -0.1, z: D + 90 }, primitive: { kind: "box", width: 240, height: 0.1, depth: 180 }, material: { color: "oklch(0.025 0 0)", roughness: 1 }, physics: "static" });
  ctx.spawn("out-frame", { tags: ["l114"], feetPosition: { x: 0, y: 0, z: 62 }, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { style: "wood", part: "set", w: 0.9, h: 2.05, seed: 9 } }, material: { pbr: true } });
  ctx.spawn("out", { tags: ["l114", "usable"], audience: "all", feetPosition: { x: 0, y: 0, z: 61.9 }, primitive: { kind: "box", width: 0.9, height: 2.05, depth: 0.04 }, visible: false, behavior: "scripts/l114-use.js", state: { kind: "out", name: "A Front Door", verb: "Open", info: "it smells like wet asphalt", c: { x: 0, y: 1.05, z: 61.9 } } });
  ctx.spawn("out-light", { tags: ["l114"], feetPosition: { x: 0, y: 2.4, z: 61.4 }, light: { kind: "point", color: "oklch(0.8 0.08 70)", intensity: 1.4, distance: 6 } });
  ctx.spawn("hum", { tags: ["l114"], feetPosition: { x: 0, y: 1.5, z: 0 }, audio: { clip: "cdn/ambience-quiet-suburban-bedroom-at-night-distant-fridge-hum-loop.mp3", loop: true, gain: 0.14, maxDistance: 14 } });
}
export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now();
  if (s.v114 !== V) { build(ctx); s.v114 = V; s.lit = true; }
  const lit = s.lit !== false, room = ctx.place.players.filter((p) => Math.abs(p.feetPosition.x) < W && Math.abs(p.feetPosition.z) < D);
  const light = ctx.place.objects["ceil-light"];
  if (light && light.state.on !== lit) { light.state.on = lit; light.light = lit ? { kind: "point", color: "oklch(0.92 0.07 85)", intensity: 2.2, distance: 9, shadow: { enabled: true } } : null; light.material = { color: lit ? "oklch(0.97 0.03 90)" : "oklch(0.5 0.01 90)", emissive: "oklch(0.97 0.05 90)", emissiveIntensity: lit ? 1.6 : 0 }; }
  // lit: eyes glint in the dark gaps (under the bed, behind the dresser). dark: one comes out
  const glints = [["eyes-bed", -W + 0.55, 0.12, -0.4, 90], ["eyes-dresser", W - 0.62, 1.2, -1.32, -90]];
  for (const [id, x, y, z, yaw] of glints) { const want = lit; if (want && !ctx.place.objects[id]) ctx.spawn(id, { tags: ["l114"], feetPosition: { x, y, z }, rotation: { yaw }, vector: SMILE(0.55) }); if (!want && ctx.place.objects[id]) ctx.destroy(id); }
  if (!lit && room.length) { s.darkSince ??= now;
    const sm = ctx.place.objects["smiler"];
    if (now - s.darkSince > DARK_S * 1000) { const p = room[0];
      if (!sm) ctx.spawn("smiler", { tags: ["l114"], feetPosition: { x: p.feetPosition.x, y: 1.5, z: p.feetPosition.z - 1.1 }, vector: SMILE(1), billboard: "yaw", light: { kind: "point", color: "oklch(0.95 0.02 90)", intensity: 0.25, distance: 2 } });
      else sm.feetPosition = { x: p.feetPosition.x, y: 1.5, z: p.feetPosition.z - 0.7 };
      if (now >= (s.nextBite ?? 0)) { s.nextBite = now + 1500; p.state.hp = (p.state.hp ?? 100) - BITE; ctx.emit("playSound", { clip: "/cdn/moodboard-gothic-horror/sfx-smiler-wet-snarl-lunge-in-the-dark.mp3", position: p.feetPosition, volume: 0.9 }); ctx.emit("screenShake", { intensity: 0.4, duration: 0.25 }, { audience: { player: p.id } }); ctx.emit("damageNumber", { position: { ...p.feetPosition, y: p.feetPosition.y + 1.4 }, value: BITE }, { audience: { player: p.id } }); }
    } } else { s.darkSince = undefined; if (ctx.place.objects["smiler"]) ctx.destroy("smiler"); }
  // the counterpart at the window: rare, a few seconds
  const fig = ctx.place.objects["counterpart"];
  if (!fig && room.length && now >= (s.nextFig ?? now + 1)) { if (s.nextFig) ctx.spawn("counterpart", { tags: ["l114"], feetPosition: { x: WIN.x, y: 0.55, z: -D - 0.45 }, vector: FIGURE, lifetime: 3.5 }); s.nextFig = now + 60000 + ctx.random() * 90000; }
}
