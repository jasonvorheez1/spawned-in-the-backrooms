// Level 21 "Numbered Doors" (Shelly, Nov 17: "add level 21 as a difficult area"). Lays the square, the four halls, every
// numbered door and what is behind it, the EXIT door and the dark wing, keeps the entities and the stranger at the desk,
// and re-shapes the halls every SHIFT_MS. Plan: scripts/lib/l21d-layout.js; numbers: scripts/lib/data/l21d.yml.
import * as LOOT from "../../scripts/lib/loot.js";
import { C, SQ_H, HW, HH, SEG, SEGS, CHUNK, SHIFT_MS, HALLS, hash, at, yawOut, door, allDoors, blocks, EXIT, HOLE, DW, dwDoor, ARRIVE22, closestWanderer } from "../../scripts/lib/l21d-layout.js";
import { foeBody } from "../../scripts/lib/l21d-body.js";
import { keepPeople21, questTick21 } from "../../scripts/lib/doors21-quest.js";
import D from "../../scripts/lib/data/l21d.yml";
import KIT from "../../scripts/lib/data/l21d-kit.json";
export const cadence = "500ms";
const V = 1; // bump to re-lay the level
const T = ["l21d"];
const GEO = "scripts/l21d-hall-geo.js", DOOR = "scripts/door-geo.js";
const TUBE = "oklch(0.95 0.05 112)";
const fit = ([w, h, d]) => ({ box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } });
const rad = (a) => (a * Math.PI) / 180;
const right = (yaw) => [Math.cos(rad(yaw)), -Math.sin(rad(yaw))], fwd = (yaw) => [-Math.sin(rad(yaw)), -Math.cos(rad(yaw))];
const roll = (ctx, rich) => (LOOT.rollItemL21 ? LOOT.rollItemL21(ctx, rich) : LOOT.rollItemL1(ctx));
const stock = (ctx, rich) => { const [a, b] = rich ? D.loot.rich : D.loot.closet; return Array.from({ length: a + Math.floor(ctx.random() * (b - a + 1)) }, () => roll(ctx, rich)).join(","); };

function prop(ctx, id, name, x, y, z, yaw = 0, o = {}) {
  const K = KIT[name]; if (!K) return;
  ctx.spawn(id, { tags: ["l21d", "l21d-dress", ...(o.tags ?? [])], feetPosition: { x, y, z }, rotation: { yaw }, model: { id: K.glb }, layout: fit(K.size), physics: o.solid === false ? undefined : { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: o.range ?? 60 }, ...(o.extra ?? {}) });
}
function lamp(ctx, id, x, y, z, color, intensity, distance, range = 90) { ctx.spawn(id, { tags: T, feetPosition: { x, y, z }, visibleRange: { max: range }, light: { kind: "point", color, intensity, distance, shadow: { enabled: false } } }); }
const plate = (label) => label === "EXIT" ? "" : `<svg viewBox='0 0 160 70' width='0.2m'><rect x='2' y='2' width='156' height='66' rx='5' fill='#a98a3e' stroke='#5c4a1c' stroke-width='3'/>${label ? `<text x='80' y='53' font-size='50' text-anchor='middle' font-family='serif' font-weight='700' fill='#231c0c'>${label.replace(/[<>&]/g, "")}</text>` : ""}</svg>`;
// one door: a cased frame in the wall, the leaf you press, its brass plate, and whatever is in the niche behind it
function doorSet(ctx, dr, yaw, hallPt, extra = {}) {
  const r = right(yaw), f = fwd(yaw);
  ctx.spawn(dr.id + "-f", { tags: T, feetPosition: { x: dr.x, y: 0, z: dr.z }, rotation: { yaw }, physics: "static", castShadow: false, visibleRange: { max: 70 }, primitive: { kind: "scripted", script: DOOR, params: { style: "flat", part: "frame", w: 1.0, h: 2.1, d: 0.16 } }, material: { pbr: true, roughness: 0.6 } });
  const name = dr.kind === "dark" ? "Exit door" : dr.kind === "back" ? "Door" : dr.label ? "Door " + dr.label : "Unmarked door";
  const info = dr.kind === "exit" ? "The number means something. This one goes somewhere." : dr.kind === "dark" ? "A push-bar door under a red sign. Cold air under it." : dr.kind === "back" ? "The way back to the hall." : "It could be anything. Doors here are not to be trusted.";
  ctx.spawn(dr.id, { tags: ["l21d", "usable", "l21d-door"], feetPosition: { x: dr.x - r[0] * 0.5, y: 0, z: dr.z - r[1] * 0.5 }, rotation: { yaw }, physics: "kinematic", castShadow: false, visibleRange: { max: 70 }, behavior: "scripts/l21d-door.js",
    primitive: { kind: "scripted", script: DOOR, params: { style: dr.kind === "dark" || dr.kind === "back" ? "fire" : "flat", part: "leaf", hingeSide: "left", swing: -1, w: 1.0, h: 2.1 } }, material: { pbr: true, roughness: 0.6 },
    state: { kind: dr.kind, label: dr.label, to: dr.to, name, verb: "Open", info, opened: false, yaw0: yaw, at: hallPt, h: dr.h, k: dr.k, lane: dr.lane, rich: !!dr.rich, ...extra },
    children: plate(dr.label) ? [{ feetPosition: { x: 0.5, y: 1.66, z: -0.027 }, castShadow: false, vector: plate(dr.label) }] : [] });
  const nx = dr.x - f[0] * 0.45, nz = dr.z - f[1] * 0.45; // the niche, behind the leaf
  if (dr.kind === "closet" && KIT.closet_shelf) ctx.spawn(dr.id + "-c", { tags: ["l21d", "container", "l21d-closet"], feetPosition: { x: nx, y: 0, z: nz }, rotation: { yaw }, model: { id: KIT.closet_shelf.glb }, layout: fit([0.9, 1.9, 0.4]), physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 30 },
    state: { name: dr.rich ? "Stocked closet" : "Linen closet", items: stock(ctx, dr.rich), rich: !!dr.rich } });
  if (dr.kind === "dead") prop(ctx, dr.id + "-b", "brick_fill", dr.x - f[0] * 0.3, 0, dr.z - f[1] * 0.3, yaw, { range: 30 });
}
function foe(ctx, id, kind, x, z, extra) {
  const K = D.kinds[kind];
  ctx.spawn(id, { tags: ["l21d", "l21d-foe", "l8-hostile", "l21d-" + kind], feetPosition: { x, y: 0.05, z }, physics: { body: "kinematic", collider: "capsule" }, castShadow: false, visibleRange: { max: 90 }, ...foeBody(kind),
    state: { hp: K.hp, maxHp: K.hp, name: K.name, kind, xp: K.xp, home: { x, z }, brain: K, ...extra } });
}
const FOES = [
  ...D.foes.map(([kind, h, k], n) => ({ id: "l21d-foe-" + n, kind, ...at(h, C + k * SEG + SEG / 2, 0), extra: { n, hall: h } })),
  ...D.squads.flatMap(([lane, k], s) => [0, 1, 2].map((i) => ({ id: `l21d-sq-${s}-${i}`, kind: "warden", x: DW.x + k * DW.seg + i * 2.5, z: DW.z + DW.lanes[lane], extra: { lane, squad: s, rank: i } }))),
];
function keepFoes(ctx) {
  const s = ctx.place.state, now = ctx.now(), dead = s.l21dDead ?? {};
  if (!ctx.place.objects["l21d-foes"]) ctx.spawn("l21d-foes", { tags: T, feetPosition: { x: 0, y: 0, z: 0 }, behavior: "scripts/l21d-foes.js" });
  for (const F of FOES) if (!ctx.place.objects[F.id] && now - (dead[F.id] ?? -1e12) > D.respawnMin * 60000) foe(ctx, F.id, F.kind, F.x, F.z, F.extra);
}
const lit = (h, k) => k < 2 || hash(h + 1, k + 1, 29) < 0.42;

// ---- the lay, a piece a tick ----
const hallDoors = (h) => (ctx) => { for (let k = 0; k < SEGS; k++) { const dr = door(h, k); doorSet(ctx, dr, yawOut(h) + 90 * dr.side, at(h, dr.d, 0)); } };
const LAY = [
  (ctx) => { for (const o of ctx.query({ tags: ["l21d"], radius: 1e6, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id);
    ctx.spawn("l21d-square", { tags: T, feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: GEO, params: { kind: "square" } }, material: { pbr: true },
      audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-old-fluorescent-tubes-hum-in-empty-apartment-corridor-loop.mp3", gain: 0.12, loop: true, spatial: false } });
    for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) lamp(ctx, `l21d-sq-l${x}${z}`, x, SQ_H - 0.5, z, "oklch(0.96 0.04 100)", 5, 12); },
  ...HALLS.map((_, h) => (ctx) => { for (let c = 0; c < SEGS / CHUNK; c++) { const p = at(h, C + c * CHUNK * SEG, 0);
    ctx.spawn(`l21d-hall-${h}-${c}`, { tags: T, feetPosition: { x: p.x, y: 0, z: p.z }, rotation: { yaw: yawOut(h) }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, visibleRange: { max: 220 },
      primitive: { kind: "scripted", script: GEO, params: { kind: "hall", c, cap: c === SEGS / CHUNK - 1, hole: h === HOLE.h && c === Math.floor(HOLE.k / CHUNK) ? HOLE.k % CHUNK : null, lit: Array.from({ length: CHUNK }, (_, b) => lit(h, c * CHUNK + b)) } }, material: { pbr: true } }); }
    for (let k = 0; k < SEGS; k++) if (lit(h, k)) { const p = at(h, C + k * SEG + SEG / 2, 0); lamp(ctx, `l21d-tube-${h}-${k}`, p.x, HH - 0.35, p.z, TUBE, 4.5, 11); } }),
  ...HALLS.map((_, h) => hallDoors(h)),
  (ctx) => { // the dark wing
    ctx.spawn("l21d-foyer", { tags: T, feetPosition: { x: DW.x, y: 0, z: DW.z }, physics: { body: "static", collider: "mesh" }, castShadow: false, primitive: { kind: "scripted", script: GEO, params: { kind: "foyer" } }, material: { pbr: true } });
    DW.lanes.forEach((lz, lane) => { for (let c = 0; c < DW.segs / CHUNK; c++) ctx.spawn(`l21d-dw-hall-${lane}-${c}`, { tags: T, feetPosition: { x: DW.x + c * CHUNK * DW.seg, y: 0, z: DW.z + lz }, rotation: { yaw: -90 }, physics: { body: "static", collider: "mesh" }, castShadow: false, visibleRange: { max: 220 },
      primitive: { kind: "scripted", script: GEO, params: { kind: "hall", c, dark: true, cap: c === DW.segs / CHUNK - 1 } }, material: { pbr: true } }); });
    doorSet(ctx, { id: "l21d-dw-back", kind: "back", label: "EXIT", x: DW.x + DW.foyer[0] + 0.02, z: DW.z }, -90, { x: DW.x - 8, z: DW.z });
    lamp(ctx, "l21d-dw-red", DW.x - 9.2, 2.5, DW.z, "oklch(0.6 0.25 28)", 1.6, 7); },
  ...DW.lanes.map((lz, lane) => (ctx) => { for (let k = 0; k < DW.segs; k++) { const dr = dwDoor(lane, k); doorSet(ctx, dr, -90 + 90 * dr.side, { x: dr.x, z: DW.z + lz }); } }),
  (ctx) => { // the floor hole, and the EXIT door's light
    const hp = at(HOLE.h, C + HOLE.k * SEG + SEG / 2, 0);
    ctx.spawn("l21d-hole", { tags: T, feetPosition: { x: hp.x, y: -3, z: hp.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 2.4, height: 1, depth: 2.4 }, visible: false, behavior: "scripts/l21d-hole.js" });
    lamp(ctx, "l21d-hole-l", hp.x, -1.6, hp.z, "oklch(0.8 0.05 150)", 2.2, 7, 60);
    const e = door(EXIT.h, EXIT.k), y = yawOut(EXIT.h) + 90 * e.side, f = fwd(y);
    lamp(ctx, "l21d-exit-l", e.x + f[0] * 0.8, 2.35, e.z + f[1] * 0.8, "oklch(0.62 0.26 28)", 5, 9, 160); },
];
// everything the prop kit dresses: laid again whenever the kit grows
function dress(ctx) {
  for (const o of ctx.query({ tags: ["l21d-dress"], radius: 1e6, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id);
  const dh = KIT.front_desk?.size?.[1] ?? 1.1;
  prop(ctx, "l21d-desk", "front_desk", 0, 0, 0, 180); prop(ctx, "l21d-desk-chair", "desk_chair", 0.95, 0, -1.7, 200, { tags: ["seat"] });
  prop(ctx, "l21d-desk-lamp", "desk_lamp", -0.9, dh, 0, 180, { solid: false }); if (KIT.desk_lamp) lamp(ctx, "l21d-desk-lamp-l", -0.9, dh + 0.3, 0.1, "oklch(0.85 0.12 150)", 1.2, 4, 40);
  prop(ctx, "l21d-desk-bell", "desk_bell", 0.55, dh, 0.2, 0, { solid: false, range: 25 }); prop(ctx, "l21d-desk-ledger", "guest_ledger", 0, dh, 0.12, 180, { solid: false, range: 25 });
  prop(ctx, "l21d-keys", "key_rack", 0, 1.25, -C + 0.06, 180, { solid: false }); prop(ctx, "l21d-mail", "mail_slots", -2.6, 1.1, -C + 0.1, 180, { solid: false }); prop(ctx, "l21d-hose", "fire_hose_box", 5, 1.1, -C + 0.1, 180, { solid: false });
  for (const [i, z] of [[0, -3.6], [1, 3.6]]) prop(ctx, "l21d-bench-" + i, "wait_bench", -C + 0.6, 0, z, -90, { tags: ["seat"] });
  for (const [i, z] of [[0, -5], [1, -4.1], [2, 4.4]]) prop(ctx, "l21d-chair-" + i, "wait_chair", C - 0.55, 0, z, 90, { tags: ["seat"] });
  prop(ctx, "l21d-fern-0", "dead_fern", -C + 0.7, 0, -C + 0.7, 30); prop(ctx, "l21d-fern-1", "dead_fern", C - 0.7, 0, C - 0.7, 200);
  prop(ctx, "l21d-umb", "umbrella_stand", 2.9, 0, C - 0.4, 0); prop(ctx, "l21d-rad", "radiator", -5, 0, C - 0.18, 0); prop(ctx, "l21d-cart", "luggage_cart", 5.2, 0, 5, 40);
  // down the halls: things nobody came back for, on the blank side of a bay
  const LINE = ["radiator", "fire_hose_box", "wall_sconce", "dead_fern", "umbrella_stand", "luggage_cart", "wait_chair", "mail_slots"];
  HALLS.forEach((_, h) => { for (let k = 1; k < SEGS; k++) { if (hash(h + 3, k, 41) > 0.3) continue; const dr = door(h, k), u = -dr.side, n = LINE[Math.floor(hash(h + 3, k, 43) * LINE.length)], wallHung = n === "fire_hose_box" || n === "wall_sconce" || n === "mail_slots";
    if (n === "luggage_cart" && k < 6) continue; const p = at(h, dr.d + (hash(h, k, 47) - 0.5) * 3, u * (HW - (wallHung ? 0.08 : n === "luggage_cart" ? 0.6 : 0.32)));
    prop(ctx, `l21d-line-${h}-${k}`, n, p.x, wallHung ? (n === "wall_sconce" ? 1.7 : 1.1) : 0, p.z, yawOut(h) + 90 * u, { solid: !wallHung && n !== "dead_fern" && n !== "umbrella_stand" }); } });
  const hp = at(HOLE.h, C + HOLE.k * SEG + SEG / 2, 0); prop(ctx, "l21d-hole-rim", "floor_rubble_rim", hp.x, 0, hp.z, 0, { solid: false });
  const e = door(EXIT.h, EXIT.k), y = yawOut(EXIT.h) + 90 * e.side, f = fwd(y);
  if (KIT.exit_sign) prop(ctx, "l21d-exit-sign", "exit_sign", e.x + f[0] * 0.09, 2.3, e.z + f[1] * 0.09, y, { solid: false, range: 160, extra: { audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-neon-sign-transformer-buzz-loop.mp3", gain: 0.25, loop: true, spatial: true, maxDistance: 16 } } });
  else ctx.spawn("l21d-exit-sign", { tags: ["l21d", "l21d-dress"], feetPosition: { x: e.x + f[0] * 0.05, y: 2.45, z: e.z + f[1] * 0.05 }, rotation: { yaw: y }, castShadow: false, visibleRange: { max: 160 }, vector: `<svg viewBox='0 0 200 70' width='0.9m'><text x='100' y='56' font-size='62' text-anchor='middle' font-family='sans-serif' font-weight='700' fill='#ff3b2a' filter='drop-shadow(0 0 8 #ff2a1a)'>EXIT</text></svg>` });
  // closets and bricked doors wait on the kit too
  for (const dr of [...allDoors(), ...DW.lanes.flatMap((_, l) => Array.from({ length: DW.segs }, (_, k) => dwDoor(l, k)))]) {
    if (dr.kind !== "closet" && dr.kind !== "dead") continue; const yaw = (dr.lane != null ? -90 : yawOut(dr.h)) + 90 * dr.side, f2 = fwd(yaw);
    if (dr.kind === "closet" && KIT.closet_shelf && !ctx.place.objects[dr.id + "-c"]) ctx.spawn(dr.id + "-c", { tags: ["l21d", "container", "l21d-closet"], feetPosition: { x: dr.x - f2[0] * 0.45, y: 0, z: dr.z - f2[1] * 0.45 }, rotation: { yaw }, model: { id: KIT.closet_shelf.glb }, layout: fit([0.9, 1.9, 0.4]), physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 30 }, state: { name: dr.rich ? "Stocked closet" : "Linen closet", items: stock(ctx, dr.rich), rich: !!dr.rich } });
    if (dr.kind === "dead") prop(ctx, dr.id + "-b", "brick_fill", dr.x - f2[0] * 0.3, 0, dr.z - f2[1] * 0.3, yaw, { range: 30 });
  }
}
// the halls re-shape: the fallen-in bay of each hall moves, every opened door is shut again, emptied closets fill
function shift(ctx, epoch, quiet) {
  blocks(epoch).forEach((k, h) => { for (const id of [`l21d-block-${h}`, `l21d-block-${h}-m`]) if (ctx.place.objects[id]) ctx.destroy(id);
    const p = at(h, C + k * SEG + 1.4, 0);
    ctx.spawn(`l21d-block-${h}`, { tags: T, feetPosition: { x: p.x, y: 0, z: p.z }, rotation: { yaw: yawOut(h) }, physics: "static", primitive: { kind: "box", width: HW * 2, height: HH, depth: 1.6 }, visible: false, state: { k } });
    if (KIT.fallen_ceiling) ctx.spawn(`l21d-block-${h}-m`, { tags: T, feetPosition: { x: p.x, y: 0, z: p.z }, rotation: { yaw: yawOut(h) }, model: { id: KIT.fallen_ceiling.glb }, layout: fit([HW * 2, HH, 2]), castShadow: false, visibleRange: { max: 120 } });
    for (const pl of ctx.place.players) { const q = pl.feetPosition; if (Math.hypot(q.x - p.x, q.z - p.z) < 2.2) { const b = at(h, C + k * SEG - 2, 0); pl.feetPosition = { x: b.x, y: 0.1, z: b.z }; } } });
  for (const o of ctx.query({ tags: ["l21d-door"], radius: 1e6, center: { x: 0, y: 0, z: 0 } })) if (o.state?.opened) { const d = ctx.getObject(o.id); if (d) { d.rotation = { yaw: d.state.yaw0 }; d.state.opened = false; d.state.verb = "Open"; } }
  for (const o of ctx.query({ tags: ["l21d-closet"], radius: 1e6, center: { x: 0, y: 0, z: 0 } })) if (!o.state?.items) { const c = ctx.getObject(o.id); if (c && ctx.random() < 0.5) c.state.items = stock(ctx, c.state.rich); }
  if (!quiet) for (const pl of ctx.place.players) { if (Math.hypot(pl.feetPosition.x, pl.feetPosition.z) < 400) { pl.state.notice = { text: "Somewhere down the hall, the walls move. It is not the hall you walked in on.", at: ctx.now() };
    ctx.emit("playSound", { clip: "/cdn/moodboard-gothic-horror/sfx-distant-walls-grinding-and-doors-slamming-down-a-long-corridor.mp3", volume: 0.8 }, { audience: { player: pl.id } }); ctx.emit("screenShake", { intensity: 0.25, duration: 0.6 }, { audience: { player: pl.id } }); } }
}
export function tick(ctx) {
  const st = ctx.place.state, now = ctx.now();
  if (st.l21dV !== V) { st.l21dV = V; st.l21dLay = 0; st.l21dKit = -1; st.l21dEpoch = -1; }
  if ((st.l21dLay ?? 0) < LAY.length) { LAY[st.l21dLay](ctx); st.l21dLay++; return; }
  const kitN = Object.keys(KIT).length; if (st.l21dKit !== kitN) { st.l21dKit = kitN; dress(ctx); st.l21dEpoch = -1; }
  const epoch = Math.floor(now / SHIFT_MS); if (st.l21dEpoch !== epoch) { const first = st.l21dEpoch === -1; st.l21dEpoch = epoch; shift(ctx, epoch, first); }
  if (!ctx.place.players.length) return;
  keepFoes(ctx); keepPeople21(ctx);
  // kills credited to whoever stood nearest (the quest reads player.state.l21d)
  const dead = st.l21dDead ?? {}, seen = (ctx.session.l21dSeen ??= {});
  for (const id in dead) { if (seen[id] === dead[id]) continue; const fresh = seen[id] !== undefined || now - dead[id] < 5000; seen[id] = dead[id]; if (!fresh) continue;
    const F = FOES.find((q) => q.id === id), kind = F ? F.kind : id.includes("dw") ? "warden" : "clicker", key = kind === "warden" ? "warden" : "clicker";
    const pos = ctx.getObject(id)?.feetPosition ?? F;
    const pl = closestWanderer(ctx.place.players, pos);
    if (pl) { const L = (pl.state.l21d ??= { doors: 0, kinds: {}, ids: [] }); L[key] = (L[key] ?? 0) + 1; } }
  for (const p of ctx.place.players) { const ps = p.state;
    if (ps.l21dFrom === "level22") { ps.l21dFrom = null; p.velocity = { x: 0, y: 0, z: 0 }; p.feetPosition = { ...ARRIVE22 }; ps.notice = { text: "A hallway. Doors down both sides, a number on every one.", at: now }; }
    if (!ps.l21dSeen) { ps.l21dSeen = true; ps.notice = { text: "Four hallways and a front desk. Somebody is standing behind it.", at: now }; } }
  questTick21(ctx);
}
