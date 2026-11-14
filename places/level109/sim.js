// Level 109 "The Neon Hospital": the referee. Rolls the seed once (place.state.l109seed, kept with the room, so a reload finds
// the same halls, the same open doors and the same things loose in them), streams corridor segments and auditoriums around
// whoever is here, and keeps the containment books (scripts/lib/containment.js). Layout math: scripts/lib/level109.js.
import { rotate } from "builtin/vec3";
import { W, CEIL, H, SEG, ROOM, PITCH, WALL, DOOR_W, DOOR_H, corridor, corridorsAt, segInfo, segKey, toWorld, other, linesNear, roomPop, rand } from "../../scripts/lib/level109.js";
import { questTick } from "../../scripts/lib/level109-quest.js";
import { penRoll, penLoad, penUnload, looseTick, doorOpen } from "../../scripts/lib/containment.js";
import { spawnFoe } from "../../scripts/lib/l109-foes.js";
import { buildRoom, roomLook } from "../../scripts/lib/l109-rooms.js";
import { wandererTick, denOf, denLock, denLoad, denWatch, denUnload } from "../../scripts/lib/l109-wanderers.js";
import { inside } from "../../scripts/lib/containment.js";
import { buildB3, placeLauncher, stairDoorAt, MORGUE, O as B3O, yawFor as yawB3 } from "../../scripts/lib/l109-b3.js";
export const cadence = "500ms";
const GEO = "scripts/levelrun-geo.js", PLASTER = "cdn/texture-clean-smooth-cream-painted-plaster-wall.png", CARPET = "cdn/texture-light-grey-beige-office-carpet-tiles-worn.png";
const AHEAD = 88, KEEP = 124, ROOM_IN = 46, ROOM_OUT = 84;
const SEGS = new Map(), ROOMS = new Map(); // key -> what this machine laid
let YAW = null; // the yaw that points a thing's local +X along world +x, +z, -x, -z (asked of the engine once, never assumed)
function yawFor(dx, dz) {
  YAW ??= [0, 90, 180, 270].map((y) => ({ y, d: rotate({ yaw: y }, { x: 1, y: 0, z: 0 }) }));
  let best = YAW[0], bd = -9; for (const c of YAW) { const d = c.d.x * dx + c.d.z * dz; if (d > bd) { bd = d; best = c; } } return best.y;
}
const INVIS = { visible: false, physics: "static", castShadow: false };
// a world-aligned box from corridor-frame extents
function uvBox(c, u0, u1, v0, v1, y0, y1) { const a = toWorld(c, u0, v0), b = toWorld(c, u1, v1); return { feetPosition: { x: (a.x + b.x) / 2, y: y0, z: (a.z + b.z) / 2 }, primitive: { kind: "box", width: Math.abs(b.x - a.x), height: y1 - y0, depth: Math.abs(b.z - a.z) } }; }
const wallName = (c, side) => (c.ax === "ns" ? (side > 0 ? "e" : "w") : side > 0 ? "s" : "n");
// where along the hall kit's wall a corridor-frame offset du (from the segment centre) falls
const wallS = (c, side, du, len) => { const n = wallName(c, side); return n === "e" || n === "n" ? du + len / 2 : len / 2 - du; };
const TROFFER = { color: "#fffdf2", emissive: "#fff6dc", emissiveIntensity: 2.4 };
function laySeg(ctx, seed, c, k) {
  const key = segKey(c, k), id = "l109s-" + key, info = segInfo(seed, c, k), u0 = k * SEG, um = u0 + SEG / 2, mid = toWorld(c, um, 0), made = [id];
  const gaps = info.gaps.map((g) => ({ wall: wallName(c, g.side), c: wallS(c, g.side, 0, SEG), w: g.kind === "pass" ? W : DOOR_W, h: g.kind === "pass" ? CEIL : DOOR_H, kind: g.kind === "pass" ? "pass" : "thru" }));
  ctx.spawn(id, { tags: ["l109-seg"], feetPosition: mid, castShadow: false, physics: "none",
    primitive: { kind: "scripted", script: GEO, params: { part: "hall", w: c.ax === "ns" ? W : SEG, d: c.ax === "ns" ? SEG : W, h: H, ceil: CEIL, walls: c.ax === "ns" ? "ew" : "ns", gaps, seed: (Math.abs(k) % 97) + 3 + c.i * 0.37, tone: "l109", clean: true, floorTex: CARPET, wallTex: PLASTER } }, material: { pbr: true } });
  const kid = (n, spec) => { const i = `${id}-${n}`; ctx.spawn(i, { tags: ["l109-seg"], ...spec }); made.push(i); };
  kid("f", { ...INVIS, ...uvBox(c, u0, u0 + SEG, -W / 2 - (info.cross ? 0.4 : 0), W / 2 + (info.cross ? 0.4 : 0), -0.3, 0) });
  kid("c", { ...INVIS, ...uvBox(c, u0, u0 + SEG, -W / 2, W / 2, CEIL, CEIL + 0.2) });
  for (const side of [1, -1]) { // the wall's collider, split round its opening
    const g = info.gaps.find((q) => q.side === side), v0 = side * W / 2, v1 = side * (W / 2 + WALL), hw = g ? (g.kind === "pass" ? W : DOOR_W) / 2 : 0;
    if (!g) kid("w" + side, { ...INVIS, ...uvBox(c, u0, u0 + SEG, v0, v1, 0, CEIL) });
    else { kid("wa" + side, { ...INVIS, ...uvBox(c, u0, um - hw, v0, v1, 0, CEIL) }); kid("wb" + side, { ...INVIS, ...uvBox(c, um + hw, u0 + SEG, v0, v1, 0, CEIL) });
      if (g.kind === "door") kid("wh" + side, { ...INVIS, ...uvBox(c, um - hw, um + hw, v0, v1, DOOR_H, CEIL) }); }
    if (g?.kind === "door") layDoor(ctx, c, g.info, made);
  }
  for (const du of [-4, 4]) { // two troffers a segment; a dead one now and then
    const dead = rand(seed, 71, k * 2 + (du > 0 ? 1 : 0), c.i) < 0.06, p = toWorld(c, um + du, 0, CEIL - 0.03);
    kid("l" + du, { feetPosition: p, castShadow: false, primitive: { kind: "box", width: c.ax === "ns" ? 0.6 : 1.2, height: 0.03, depth: c.ax === "ns" ? 1.2 : 0.6 }, material: dead ? { color: "#8a887c" } : TROFFER,
      ...(dead ? {} : { light: { kind: "point", color: "#fff3d6", intensity: 2.2, distance: 11, shadow: { enabled: false } } }) });
  }
  SEGS.set(key, made);
}
function layDoor(ctx, c, info, made) {
  const exit = info.type === "exit", id = "l109d-" + info.id, hingeU = info.u - DOOR_W / 2, hinge = toWorld(c, hingeU, info.side * (W / 2 + WALL / 2));
  const along = toWorld({ ...c, c: 0 }, 1, 0), inward = toWorld({ ...c, c: 0 }, 0, info.side), base = yawFor(along.x, along.z), swung = yawFor(inward.x, inward.z);
  let dy = swung - base; if (dy > 180) dy -= 360; if (dy < -180) dy += 360;
  const open = doorOpen(ctx, info.id);
  const lock = exit ? "" : denLock(ctx, ctx.place.state.l109seed, info, open); // a den is locked from inside (scripts/lib/l109-wanderers.js)
  ctx.spawn(id, { tags: ["usable", "pen-door", "l109-seg"], feetPosition: hinge, rotation: { yaw: base + (open ? dy : 0) }, physics: { body: "kinematic", collider: "box" },
    primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { style: exit ? "metal" : "office", part: "leaf", w: DOOR_W, h: DOOR_H, hingeSide: "left", swing: 1, seed: info.r } }, material: { pbr: true }, behavior: exit ? "scripts/l109-exit.js" : "scripts/pen-door.js",
    state: { pen: info.id, open, baseYaw: base, openYaw: dy, c: { ...info.door, y: (info.door.y ?? 0) + 1.05 }, // c at door mid-height: the look picks a door by its c, and c on the floor meant aiming at your feet (Nov 14)
      kind: exit ? "metal" : "wood", name: exit ? "Exit" : lock ? "Locked door" : "Door", verb: exit ? "Go Through" : open ? "Close Door" : "Open Door", ...(lock ? { lock, denLocked: true } : {}) } });
  made.push(id);
  if (exit) { const p = toWorld(c, info.u, info.side * (W / 2 - 0.04), DOOR_H + 0.12), sid = id + "-sign"; // the only marked doors on the level
    ctx.spawn(sid, { tags: ["l109-seg"], feetPosition: p, rotation: { yaw: yawFor(-along.x * info.side, -along.z * info.side) }, castShadow: false, light: { kind: "point", color: "#ff5a48", intensity: 0.5, distance: 4, shadow: { enabled: false } },
      vector: "<svg viewBox='0 0 200 80' width='0.5m' billboard='yaw'><rect x='3' y='3' width='194' height='74' rx='5' fill='#2a0705' stroke='#ff6a55' stroke-width='4'/><text x='100' y='58' text-anchor='middle' font-family='sans-serif' font-size='52' font-weight='900' fill='#ff7b66'>EXIT</text></svg>" }); made.push(sid); }
}
function layRoom(ctx, seed, info) {
  const c = info.c, id = "l109r-" + info.id, u0 = info.r * PITCH + 1, um = u0 + ROOM / 2, vNear = info.side * (W / 2 + WALL), vm = vNear + info.side * ROOM / 2, mid = toWorld(c, um, vm), made = [id];
  const pop = penRoll(ctx, info.id, () => roomPop(seed, info));
  const look = roomLook(seed, info), lit = look ? !look.abandoned : true, back = wallName(c, -info.side); // the room's wall that faces the corridor
  ctx.spawn(id, { tags: ["l109-room"], feetPosition: mid, castShadow: false, physics: "none", primitive: { kind: "scripted", script: GEO, params: { part: "hall", w: ROOM, d: ROOM, h: 3.4, ceil: 3.0, walls: "nsew", gaps: [{ wall: back, c: wallS(c, -info.side, info.u - um, ROOM), w: DOOR_W, h: DOOR_H, kind: "thru" }], seed: Math.abs(info.r) % 89 + 5, tone: info.type === "biohazard" ? "warm" : "l109", clean: lit, ...(lit ? { wallTex: PLASTER } : {}) } }, material: { pbr: true } });
  const pend = [], sp = (key, spec) => { const i = `l109o-${info.id}-${key}`; pend.push([i, { ...spec, tags: [...(spec.tags ?? []), "l109-room"] }]); made.push(i); return i; }; // queued: flushRooms lays ROOM_STEP a tick, so a room never lands in one hitch (gavi pass, Nov 14)
  sp("f", { ...INVIS, ...uvBox(c, u0, u0 + ROOM, vNear, vNear + info.side * ROOM, -0.3, 0) });
  sp("c", { ...INVIS, ...uvBox(c, u0, u0 + ROOM, vNear, vNear + info.side * ROOM, 3.0, 3.2) });
  sp("wa", { ...INVIS, ...uvBox(c, u0 - WALL, u0, vNear, vNear + info.side * ROOM, 0, 3) }); sp("wb", { ...INVIS, ...uvBox(c, u0 + ROOM, u0 + ROOM + WALL, vNear, vNear + info.side * ROOM, 0, 3) });
  sp("wc", { ...INVIS, ...uvBox(c, u0, u0 + ROOM, vNear + info.side * ROOM, vNear + info.side * (ROOM + WALL), 0, 3) });
  for (const [a, b] of [[-7.5, 7.5], [7.5, 7.5], [-7.5, 22.5], [7.5, 22.5]]) { const on = lit || rand(seed, 91, info.r * 4 + a + b, info.side) < 0.4; // an abandoned ward keeps a light or two
    sp(`l${a}_${b}`, { feetPosition: toWorld(c, um + a, vNear + info.side * b, 2.97), castShadow: false, primitive: { kind: "box", width: 1.2, height: 0.03, depth: 0.6 }, material: on ? TROFFER : { color: "#77756a" }, ...(on ? { light: { kind: "point", color: look?.light ?? "#fff6e0", intensity: (look?.intensity ?? 2.2) * (lit ? 1 : 0.5), distance: look?.reach ?? 15, shadow: { enabled: false } } } : {}) }); }
  if (look?.sound) sp("snd", { feetPosition: toWorld(c, um, vm, 1.5), audio: { clip: look.sound, loop: true, gain: look.gain, spatial: true, maxDistance: look.maxDist, bus: "Ambience" } }); // the department's own quiet loop
  const along = toWorld({ ...c, c: 0 }, 1, 0), inward = toWorld({ ...c, c: 0 }, 0, info.side);
  buildRoom(ctx, { id: info.id, type: info.type, info, seed, sp, abandoned: !lit, pop, at: (a, b, up = 0) => toWorld(c, um + a, vNear + info.side * b, up), yawIn: yawFor(inward.x, inward.z), yawAlong: yawFor(along.x, along.z) });
  if (denOf(seed, info)) denLoad(ctx, seed, info, (a, b) => toWorld(c, um + a, vNear + info.side * b, 0.1), { x: -inward.x, z: -inward.z });
  penLoad(ctx, info.id, info.box, (c, k, pos, st) => spawnFoe(c, k, pos, { ...st, penDoor: { x: info.door.x, z: info.door.z } })); // the foes' keeper needs the doorway
  ROOMS.set(info.id, { made, info, pend });
}
export function tick(ctx) {
  try { questTick(ctx); } catch (e) { ctx.log("l109 quest", String(e)); }
  const s = ctx.place.state, players = [...ctx.place.players, ...ctx.query({ tags: ["helper"] })].filter((p) => p.feetPosition);
  if (!s.l109seed) s.l109seed = 1 + Math.floor(ctx.random() * 2e9);
  const seed = s.l109seed;
  if (!ctx.place.objects["l109-hum"]) ctx.spawn("l109-hum", { audience: "all", audio: { clip: "cdn/ambience-hospital-corridor-air-handler-ventilation-distant-loop.mp3", loop: true, gain: 0.1, spatial: false, bus: "Ambience" } });
  if (!players.length) return;
  if (ctx.now() > (s.wandTickAt ?? 0)) { s.wandTickAt = ctx.now() + 3000; wandererTick(ctx); } // random encounters: frenzied armed wanderers (scripts/lib/l109-wanderers.js)
  if (!ctx.place.objects["b3-hall"]) buildB3(ctx, seed); // B3: the sealed sub-basement (scripts/lib/l109-b3.js), once per room
  if (!s.b3gun) { s.b3gun = 1; placeLauncher(ctx); } // the M72 lies in the cage once in the room's life
  if (!ctx.place.objects["b3-stairdoor"]) { const d = stairDoorAt(seed); ctx.spawn("b3-stairdoor", { audience: "all", tags: ["usable", "l109-b3"], feetPosition: { x: d.x + 0.12, y: 0, z: d.z - DOOR_W / 2 }, rotation: { yaw: yawB3(0, 1) }, physics: { body: "static", collider: "box" }, material: { pbr: true }, behavior: "scripts/b3-use.js",
    primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { style: "metal", part: "leaf", w: DOOR_W, h: DOOR_H, hingeSide: "left", swing: 1, seed: 5 } }, state: { kind: "b3-down", name: "Stairwell", verb: "Go Down", info: "B3" } });
    ctx.spawn("b3-stairsign", { audience: "all", tags: ["l109-b3"], feetPosition: { x: d.x + 0.14, y: DOOR_H + 0.1, z: d.z }, rotation: { yaw: yawB3(1, 0) }, castShadow: false, vector: "<svg viewBox='0 0 220 70' width='0.5m'><rect x='3' y='3' width='214' height='64' rx='4' fill='#1f2a20' stroke='#8fa57f' stroke-width='3'/><text x='110' y='48' text-anchor='middle' font-family='sans-serif' font-size='34' font-weight='900' fill='#d8e4c8'>STAIRS B3</text></svg>" }); }
  if (!ctx.query({ tags: ["pen-foe"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).some((f) => f.state?.b3) && ctx.now() > (s.b3foesAt ?? 0)) { // the morgue's hounds: back an hour after the last one fell
    s.b3foesAt = ctx.now() + 3600000;
    for (const [dx, dz] of [[-6.5, 12], [-3.5, 16.5]]) spawnFoe(ctx, "hound", { x: B3O.x + dx, y: B3O.y + 0.1, z: B3O.z + dz }, { pen: "b3-morgue", penKind: "hound", penBox: MORGUE, penDoor: { x: B3O.x - 1.5, z: B3O.z + 14 }, b3: 1 });
  }
  if (!SEGS.size) for (const o of ctx.query({ anyTags: ["l109-seg", "l109-room"] })) ctx.destroy(o.id); // a fresh machine: clear what an earlier one laid, then lay again
  const want = new Map(), keep = new Set(), rooms = new Map();
  const reach = (c, u, span, keepSpan) => { for (let k = Math.floor((u - keepSpan) / SEG); k <= Math.floor((u + keepSpan) / SEG); k++) { const key = segKey(c, k); keep.add(key); if (Math.abs(k * SEG + SEG / 2 - u) <= span && !want.has(key)) want.set(key, { c, k, d: Math.abs(k * SEG + SEG / 2 - u) }); } };
  for (const p of players) for (const at of corridorsAt(seed, p.feetPosition)) {
    reach(at.c, at.u, AHEAD, KEEP);
    for (const x of linesNear(seed, other(at.c.ax), at.u, AHEAD)) reach(corridor(seed, other(at.c.ax), x.i), at.c.c, 64, 96); // the crossing corridor you can see down
    for (let r = Math.floor((at.u - ROOM_OUT) / PITCH); r <= Math.floor((at.u + ROOM_OUT) / PITCH); r++) { const g = segInfo(seed, at.c, r * 2).gaps; for (const q of g) if (q.kind === "door" && q.info.type !== "exit") { const d = Math.hypot(p.feetPosition.x - q.info.door.x, p.feetPosition.z - q.info.door.z); const cur = rooms.get(q.info.id); if (!cur || d < cur.d) rooms.set(q.info.id, { info: q.info, d }); } }
  }
  let budget = SEGS.size ? 4 : 14; // the first lay puts the floor under an arrival at once
  for (const w of [...want.entries()].sort((a, b) => a[1].d - b[1].d)) { if (SEGS.has(w[0])) continue; if (budget-- <= 0) break; laySeg(ctx, seed, w[1].c, w[1].k); }
  for (const [key, made] of SEGS) if (!keep.has(key)) { for (const id of made) ctx.destroy(id); SEGS.delete(key); }
  for (const [id, r] of rooms) if (!ROOMS.has(id) && r.d < ROOM_IN) { layRoom(ctx, seed, r.info); break; } // one room a tick
  denWatch(ctx, [...ROOMS.keys()]);
  for (const [id, r] of ROOMS) if (!rooms.has(id) || rooms.get(id).d > ROOM_OUT) { denUnload(ctx, r.info, (p) => inside(r.info.box, p)); penUnload(ctx, id, r.info.box); for (const o of r.made) ctx.destroy(o); ROOMS.delete(id); }
  looseTick(ctx, spawnFoe);
  flushRooms(ctx);
}
const ROOM_STEP = 30; // Savi's pick: room pieces laid per tick (the walls/floor come first, they were queued first)
function flushRooms(ctx) {
  let n = ROOM_STEP;
  for (const r of ROOMS.values()) { const q = r.pend; while (q?.length && n-- > 0) { const [i, spec] = q.shift(); ctx.spawn(i, spec); } if (n <= 0) break; }
}
