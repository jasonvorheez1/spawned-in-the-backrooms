// The Christmas Area (Kane Pixels): a pocket off Level 0's north rim. The maze's outer wall opens at XMAS_CELL (maze.js);
// a dark Entrance Room lit by one tree, a short corridor, the red Ornate Room, and a closet behind its far door.
import { cellCenter, N } from "./maze.js";
import X from "./data/xmas.yml";
import { critterSpec } from "./critter-model.js";
const GEO = "scripts/xmas-geo.js";
const CARPET = { texture: "cdn/texture-dark-worn-brown-office-carpet-stained.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.2 0.03 40)", roughness: 1 };
const WALLY = { texture: "cdn/texture-faded-yellowed-office-wallpaper-dark-stained.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.09 0.02 60)", roughness: 0.95 };
const WALLR = { texture: "cdn/texture-dark-red-damask-wallpaper-faded.png", wrap: "repeat", repeat: [0.6, 0.6], color: "oklch(0.2 0.08 25)", roughness: 0.9 };
const CEIL = { texture: "cdn/texture-acoustic-drop-ceiling-tiles-grid-stained.png", wrap: "repeat", repeat: [0.42, 0.42], color: "oklch(0.06 0.01 60)", roughness: 1 };
const TROF = { color: "oklch(0.15 0.01 90)", roughness: 0.5, metalness: 0.3 };
const STILL_FACE = "/cdn/value.8f23419441b7dc3c4dbbbbae28daf9a8f16965a76f0bbb6fa4acc620f4829593.png";
const geo = (kind, p = {}) => ({ kind: "scripted", script: GEO, params: { kind, ...p } });
// a wall slab between two corners (axis-aligned), y0..y1
const wall = (x0, z0, x1, z1, mat, y0 = 0, y1 = 3, t = 0.2) => ({ feetPosition: { x: (x0 + x1) / 2, y: y0, z: (z0 + z1) / 2 }, primitive: { kind: "box", width: Math.max(t, Math.abs(x1 - x0)), height: y1 - y0, depth: Math.max(t, Math.abs(z1 - z0)) }, material: mat, physics: "static" });
// a wall along x at z with door gaps [[a,b],…]
function wallX(x0, x1, z, gaps, mat, doorH = 2.3) { const out = []; let x = x0; for (const [a, b] of gaps) { if (a > x) out.push(wall(x, z, a, z, mat)); out.push(wall(a, z, b, z, mat, doorH, 3)); x = b; } if (x < x1) out.push(wall(x, z, x1, z, mat)); return out; }
export function stillLook(sex, fur) { // a Still Life: the cast remembered badly. pale, faceless but for two dull black eyes, low ear, no mouth
  const spec = critterSpec({ sex, fur, etype: "crew", ears: "fold", tail: "bob", expr: "neutral" });
  const hf = spec?.model?.materials?.headFur?.params;
  if (hf) { hf.face = STILL_FACE; hf.faceless = 1; delete hf.blinkFace; delete hf.talkFace; delete hf.talkFace2; hf.talk = 0; }
  return spec;
}
const seam = (y = 1.1, x = 0.12) => ({ feetPosition: { x, y, z: -0.13 }, primitive: geo("seam") });
export function layXmas(ctx) {
  const o = ctx.place.objects, ps = ctx.place.state;
  if (ps.xmasV === X.v && "xmas-door" in o) return;
  ps.xmasV = X.v;
  for (const id of Object.keys(o)) if (id.startsWith("xmas-")) ctx.destroy(id);
  const c = cellCenter(X.cell.cx, N - 1), dx = c.x, zr = c.z + 2.15; // the doorway's centre on the old rim
  const E = { x0: dx - 14, x1: dx + 14, z0: zr, z1: zr + 23.7 }, R = { x0: dx - 8, x1: dx + 8, z0: E.z1 + 6, z1: E.z1 + 20 };
  const kids = [
    { feetPosition: { x: dx, y: -0.1, z: zr + 24 }, primitive: { kind: "box", width: 30, height: 0.12, depth: 48.4 }, material: CARPET, physics: "static" },
    { feetPosition: { x: dx, y: 3, z: zr + 24 }, primitive: { kind: "box", width: 30, height: 0.12, depth: 48.4 }, material: CEIL, physics: "static" },
    ...wallX(E.x0, E.x1, zr, [[dx - 1, dx + 1]], WALLY), wall(E.x0, E.z0, E.x0, E.z1, WALLY), wall(E.x1, E.z0, E.x1, E.z1, WALLY),
    ...wallX(E.x0, E.x1, E.z1, [[dx - 1.2, dx + 1.2]], WALLY),
    wall(dx - 1.2, E.z1, dx - 1.2, R.z0, WALLR), wall(dx + 1.2, E.z1, dx + 1.2, R.z0, WALLR),
    ...wallX(R.x0, R.x1, R.z0, [[dx - 1.2, dx + 1.2]], WALLR), wall(R.x0, R.z0, R.x0, R.z1, WALLR), wall(R.x1, R.z0, R.x1, R.z1, WALLR),
    ...wallX(R.x0, R.x1, R.z1, [[dx - 0.6, dx + 0.6]], WALLR, 2.15),
    wall(dx - 2.5, R.z1, dx - 2.5, R.z1 + 4, WALLR), wall(dx + 2.5, R.z1, dx + 2.5, R.z1 + 4, WALLR), wall(dx - 2.5, R.z1 + 4, dx + 2.5, R.z1 + 4, WALLR),
  ];
  // dead troffers in the Entrance Room's drop ceiling, one or two hanging askew
  for (let x = E.x0 + 3; x < E.x1 - 1; x += 4) for (let z = E.z0 + 2.5; z < E.z1 - 1; z += 4) kids.push({ feetPosition: { x, y: 2.93, z }, rotation: (x * 7 + z) % 11 < 1 ? { roll: 7 } : 0, primitive: { kind: "box", width: 0.6, height: 0.06, depth: 1.2 }, material: TROF });
  ctx.spawn("xmas-shell", { tags: ["xmas"], feetPosition: { x: 0, y: 0, z: 0 }, physics: "static", primitive: { kind: "box", width: 0.01, height: 0.01, depth: 0.01 }, material: TROF, children: kids });
  ctx.spawn("xmas-door", { tags: ["xmas"], feetPosition: { x: dx, y: 0, z: zr }, primitive: geo("frame", { w: 2, h: 2.3 }) });
  // ── Entrance Room: one tree, one light
  const tx = dx, tz = zr + 13.5, TW = "fx\npop l1 n=?mobile:14|22 on=disc(.78).c(.62) tint=<2.6,.7,.25>..<2.4,1.9,.5> size=.05..0.08 col=$tint*flick(1.3,.7) a=.95 sz=$size r=sprite(soft-disc,add)\npop l2 n=?mobile:10|16 on=disc(.6).c(1.02) tint=<.4,2.2,.6>..<2.6,.4,.3> size=.05..0.08 col=$tint*flick(1.1,.7) a=.95 sz=$size r=sprite(soft-disc,add)\npop l3 n=?mobile:8|12 on=disc(.45).c(1.38) tint=<2.6,1.8,.5>..<.6,.8,2.6> size=.05..0.07 col=$tint*flick(1.5,.7) a=.95 sz=$size r=sprite(soft-disc,add)\npop l4 n=6 on=disc(.25).c(1.72) tint=<2.6,2,.8> size=.04..0.06 col=$tint*flick(1.7,.6) a=.95 sz=$size r=sprite(soft-disc,add)";
  ctx.spawn("xmas-skirt", { tags: ["xmas"], feetPosition: { x: tx, y: 0.01, z: tz }, primitive: geo("skirt") });
  ctx.spawn("xmas-tree", { tags: ["xmas"], feetPosition: { x: tx, y: 0.02, z: tz }, primitive: geo("tree"), physics: { body: "static", collider: "cylinder" }, fx: { script: TW },
    audio: { clip: "/cdn/moodboard-gothic-horror/ambience-distant-detuned-music-box-carol-in-empty-dark-room-loop.mp3", gain: X.carol.gain, loop: true, spatial: true, maxDistance: X.carol.maxDistance } });
  ctx.spawn("xmas-tree-light", { tags: ["xmas"], feetPosition: { x: tx, y: 1.5, z: tz }, light: { kind: "point", color: "#ffa255", intensity: X.treeLight, distance: X.treeLightRange, shadow: { enabled: true } } });
  ctx.spawn("xmas-present-tag", { tags: ["xmas", "container"], feetPosition: { x: tx + 0.75, y: 0.02, z: tz - 0.55 }, rotation: { yaw: 20 }, primitive: geo("present", { w: 0.42, h: 0.28, d: 0.36, col: "#1f6a3a", rib: "#d8b040" }), physics: { body: "static", collider: "box" }, state: { name: "Present, your name on the tag", items: "bauble,bauble,bauble" } });
  [[-0.7, 0.5, 25, "#b01c22", 0.34, 0.22], [0.2, 0.8, -15, "#2a4aa8", 0.3, 0.4], [-0.4, -0.75, 40, "#d8d0c8", 0.26, 0.2]].forEach(([ox, oz, yw, col, w, h], i) => ctx.spawn(`xmas-gift-${i}`, { tags: ["xmas"], feetPosition: { x: tx + ox, y: 0.02, z: tz + oz }, rotation: { yaw: yw }, primitive: geo("present", { w, h, d: w * 0.9, col }) }));
  // (a) two Still Lifes half-sunk in the carpet, face down, reaching for the tree
  [["xmas-still-a", -3.1, -1.2, 70, "f", "#ebe4d8"], ["xmas-still-b", 2.9, 1.6, -115, "m", "#d9d2c6"]].forEach(([id, ox, oz, yw, sex, fur]) => {
    const sp = stillLook(sex, fur);
    ctx.spawn(id, { ...sp, tags: ["xmas", "still-life", "container"], feetPosition: { x: tx + ox, y: -0.12, z: tz + oz }, rotation: { yaw: yw, pitch: -82 }, physics: { body: "static", collider: "box" }, children: [...(sp.children ?? []), seam(1.05, -0.1)], behavior: "scripts/xmas-still.js", state: { role: "sunk", home: { x: tx + ox, z: tz + oz }, name: "Still Life", verb: "Search", items: "stuffing,stuffing" } });
  });
  // (b) the Lamp Sitter: grown into a wheelchair, its lamp wakes when someone comes close
  const ls = { x: E.x0 + 3.2, z: E.z1 - 4 }, sp = stillLook("m", "#e6dfd2");
  ctx.spawn("xmas-lamp-sitter", { tags: ["xmas", "still-life"], feetPosition: { x: ls.x, y: 0, z: ls.z }, rotation: { yaw: -125 }, physics: { body: "static", collider: "box" }, behavior: "scripts/xmas-still.js", state: { role: "sitter", lamp: 0, home: ls },
    children: [{ id: "chair", feetPosition: { x: 0, y: 0, z: 0 }, primitive: geo("chair") }, { id: "body", ...sp, feetPosition: { x: 0, y: 0.08, z: 0.02 }, children: [...(sp.children ?? []), seam(1.0, 0.13)] },
      { id: "lamp", feetPosition: { x: 0.28, y: 1.66, z: -0.05 }, light: { kind: "spot", color: "#ffd9a0", intensity: 0, distance: 12, angle: 28, penumbra: 0.6, aim: [0, -0.35, -1] } }] });
  // ── Ornate Room
  const lit = (id, x, y, z, color, intensity, distance) => ctx.spawn(id, { tags: ["xmas"], feetPosition: { x, y, z }, light: { kind: "point", color, intensity, distance } });
  ctx.spawn("xmas-wreath", { tags: ["xmas"], feetPosition: { x: R.x0 + 0.14, y: 1.85, z: R.z0 + 5 }, rotation: { yaw: -90 }, primitive: geo("wreath") });
  lit("xmas-wreath-light", R.x0 + 0.7, 1.9, R.z0 + 5, "#ff4a3a", X.wreathLight, 7);
  [[R.x0 + 0.3, R.z0 + 0.35, 0, 15.4], [R.x0 + 0.35, R.z0 + 0.6, -90, 13], [R.x1 - 0.35, R.z0 + 0.6, -90, 13]].forEach(([x, z, yw, len], i) => ctx.spawn(`xmas-floorlights-${i}`, { tags: ["xmas"], feetPosition: { x, y: 0.01, z }, rotation: { yaw: yw }, primitive: geo("string", { len }) }));
  lit("xmas-floor-light", dx, 0.3, R.z0 + 7, "#ff3a2a", X.floorLight, 12);
  const ck = { x: R.x1 - 1.4, z: R.z0 + 4 };
  ctx.spawn("xmas-clock", { tags: ["xmas"], feetPosition: { x: ck.x, y: 0, z: ck.z }, rotation: { yaw: 90, roll: -9 }, primitive: geo("clock"), physics: { body: "static", collider: "box" } });
  lit("xmas-clock-light", ck.x - 0.6, 1.9, ck.z, "#ffbe70", X.clockLight, 4);
  ctx.spawn("xmas-crook", { tags: ["xmas", "container"], feetPosition: { x: ck.x - 0.15, y: 0, z: ck.z + 0.45 }, rotation: { yaw: 90, roll: 14 }, model: { id: "/cdn/value.e1c8a7a67bb1f12a8209b6c5232dcc822b30ee56bb39bd1f1247bd0fc2dad60d.glb" }, physics: { body: "static", collider: "box" }, state: { name: "Candy cane, oddly heavy", verb: "Take", items: "weapon:crook" } });
  [[R.x0 + 2, R.z0 + 2.5, 2.1, true], [R.x0 + 3.2, R.z1 - 2, 1.7, false], [R.x1 - 2.4, R.z1 - 2.5, 2.3, true], [dx - 3, R.z0 + 8, 1.5, true], [dx + 3.4, R.z0 + 2.2, 1.9, false], [R.x0 + 1.2, R.z0 + 9, 2.0, false]].forEach(([x, z, h, hk], i) =>
    ctx.spawn(`xmas-cane-${i}`, { tags: ["xmas"], feetPosition: { x, y: 0, z }, rotation: { yaw: i * 67, roll: i % 2 ? 3 : -2 }, primitive: geo("cane", { h, hook: hk, r: 0.045 }), physics: { body: "static", collider: "cylinder" } }));
  [[dx - 2, R.z0 + 6, "#b01c22"], [dx - 1.4, R.z0 + 6.6, "#1f6a3a"], [dx + 2.5, R.z0 + 9, "#d4a02a"], [R.x1 - 2.2, R.z0 + 5.3, "#2a4aa8"], [R.x0 + 1.5, R.z0 + 6, "#d8d0c8"], [dx + 0.8, R.z1 - 3, "#b01c22"]].forEach(([x, z, col], i) =>
    ctx.spawn(`xmas-orn-gift-${i}`, { tags: ["xmas"], feetPosition: { x, y: 0, z }, rotation: { yaw: i * 41 }, primitive: geo("present", { w: 0.3 + (i % 3) * 0.12, h: 0.22 + (i % 2) * 0.16, d: 0.32, col }) }));
  const wz = R.z0 + 9.5;
  ctx.spawn("xmas-window", { tags: ["xmas"], feetPosition: { x: R.x1 - 0.12, y: 0.95, z: wz }, rotation: { yaw: 90 }, primitive: geo("window", { w: 2.2, h: 1.3 }) });
  lit("xmas-window-light", R.x1 - 0.8, 1.6, wz, "#fff2dc", X.windowLight, 6);
  ctx.spawn("xmas-cone", { tags: ["xmas"], feetPosition: { x: R.x1 - 1.3, y: 0, z: wz - 0.6 }, primitive: geo("cone"), physics: { body: "static", collider: "cylinder" } });
  ctx.spawn("xmas-sign", { tags: ["xmas"], feetPosition: { x: R.x1 - 1.6, y: 0, z: wz + 0.7 }, rotation: { yaw: -100 }, primitive: geo("sign"), physics: { body: "static", collider: "box" } });
  ctx.spawn("xmas-table", { tags: ["xmas"], feetPosition: { x: R.x0 + 1, y: 0, z: R.z0 + 1.2 }, primitive: geo("table"), physics: { body: "static", collider: "cylinder" } });
  ctx.spawn("xmas-thermos", { tags: ["xmas", "container"], feetPosition: { x: R.x0 + 1.05, y: 0.69, z: R.z0 + 1.15 }, primitive: geo("thermos"), physics: { body: "static", collider: "box" }, state: { name: "Thermos, still warm", verb: "Take", items: "eggnog" } });
  ctx.spawn("xmas-house", { tags: ["xmas", "container"], feetPosition: { x: dx - 2.2, y: 0, z: R.z1 - 0.8 }, rotation: { yaw: 10 }, primitive: geo("house"), physics: { body: "static", collider: "box" }, state: { name: "Miniature house", verb: "Open", items: "musicbox" } });
  // (d) the Watcher: faces the corner of the red room. turn away and it is closer, and facing you
  const wt = { x: R.x1 - 1.1, z: R.z0 + 0.9 }, ws = stillLook("f", "#e9e2d6");
  ctx.spawn("xmas-watcher", { ...ws, tags: ["xmas", "still-life", "container"], feetPosition: { x: wt.x, y: 0, z: wt.z }, rotation: { yaw: 20 }, physics: { body: "static", collider: "box" }, behavior: "scripts/xmas-still.js", children: [...(ws.children ?? []), seam(1.1, 0.1), seam(0.7, -0.12)],
    state: { role: "watcher", home: wt, name: "Still Life", verb: "Search", items: "stuffing,bauble" } });
  // the far door, shut; the closet behind it holds (c) the Red Stray
  ctx.spawn("xmas-exit-door", { tags: ["xmas", "xmas-shut"], feetPosition: { x: dx, y: 0, z: R.z1 }, pivot: [0, 0.5, 0.5], physics: "kinematic", primitive: { kind: "box", width: 1.15, height: 2.12, depth: 0.06 }, material: { texture: "cdn/texture-worn-hardwood-grain.png", color: "oklch(0.45 0.06 40)", roughness: 0.6 }, state: { open: false } });
  const rs = stillLook("m", "#a8322c");
  ctx.spawn("xmas-red-stray", { ...rs, tags: ["xmas", "still-life", "l8-hostile"], feetPosition: { x: dx, y: 0, z: R.z1 + 2 }, rotation: { yaw: 0 }, physics: "character", behavior: "scripts/xmas-still.js", children: [...(rs.children ?? []), seam(1.15, -0.12)],
    state: { role: "stray", name: "Red Stray", hp: X.stray.hp, maxHp: X.stray.hp, home: { x: dx, z: R.z1 + 2 } } });
}
