// Level 169: Ferry's Friends, the seven people of the house. Who they are, where they stand and when: data/l169-friends.yml.
// Their words: data/dlg-level169.yml. Nobody here is hostile, ever. Contract: places/level169/sim.js calls layFriends once and tickFriends each second.
import F from "./data/l169-friends.yml";
import FUR from "./data/furniture.yml";
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { npcState } from "./stats.js";
import { tickChatter } from "./chatter.js";

const ID = (n) => "l169-friend-" + n;
const WOOD = { texture: "cdn/texture-sun-bleached-grey-desert-timber.png", color: "oklch(0.62 0.04 70)", roughness: 1 };
const model = (k) => FUR.pieces[k].model;
const yawOf = (fx, fz) => Math.atan2(-fx, -fz) * 180 / Math.PI;
const at = (L, [room, u, v]) => { const r = L.house.rooms[room]; return { x: r[0] + u * (r[1] - r[0]), z: r[2] + v * (r[3] - r[2]) }; };
const keyOf = (p, n) => n === "seat" ? "seat-" + p.n : n === "bed" ? "bed-" + p.n : n;

// every named stop in world metres: { x, z, up, fx, fz, out, seat }
export function stopsOf(L) {
  const S = {}, fu = L.house.floorUp;
  for (const [k, [room, u, v, fx, fz, out]] of Object.entries(F.stops)) {
    const up = room === "porch" ? L.house.porchUp : room === "basement" ? fu - L.friends.basementDown : fu;
    S[k] = { ...at(L, [room, u, v]), up, fx, fz, out: !!out };
  }
  const t = at(L, L.friends.table);
  const seats = L.friends.seats;
  seats.forEach(([dx, dz, fx, fz], i) => { S["seat-" + (i + 1)] = { x: t.x + dx, z: t.z + dz, up: fu, fx, fz, seat: true }; });
  const per = {};
  for (const p of F.people) { const r = L.house.rooms[p.bedroom], i = (per[p.bedroom] = (per[p.bedroom] ?? 0) + 1), n = F.people.filter((q) => q.bedroom === p.bedroom).length;
    const B = L.friends.rolls; S["bed-" + p.n] = { x: r[0] + B.x0 + (i - 1) * B.gap + (3 - n) * B.gap / 2, z: r[2] + B.dz, up: fu, fx: 0, fz: 1, seat: true }; } // bedrolls beside the house bed, clear of the kits and the door
  L.friends.track.forEach(([x, z], i) => { S["track" + i] = { x, z, up: 0, fx: 0, fz: 1, out: true }; });
  if (S.bench) S.bench.seat = true;
  return S;
}
const blockAt = (p, hour) => { let b = p.day[0]; for (const d of p.day) if (hour >= d[0]) b = d; return b; };
// what everybody is doing at an hour: [{ id, name, block, stop, out }]
export function planAt(L, hour) {
  const S = stopsOf(L);
  return F.people.map((p) => { const [, block] = blockAt(p, hour);
    return { id: ID(p.n), name: p.name, block, stop: keyOf(p, F.blocks[block][0][0]), out: F.blocks[block].some(([n]) => S[keyOf(p, n)].out) }; });
}
function roundsOf(ctx, L, S, p, block) {
  return F.blocks[block].map(([n, dwell, act]) => {
    const k = keyOf(p, n), s = S[k];
    const y = (ctx.place.terrain.heightAt(s.x, s.z) ?? 0) + s.up;
    return { x: s.x, y, z: s.z, dwell, name: k, ...(act ? { act: F.acts[act] } : {}), look: { x: s.x + s.fx * 3, y, z: s.z + s.fz * 3 }, ...(s.seat ? { seat: yawOf(s.fx, s.fz) } : {}) };
  });
}
export const slateText = (hour, L) => {
  const day = hour >= L.day.sunrise && hour < L.day.sunset;
  if (day) return { text: `DAY. Hour ${Math.floor((hour - L.day.sunrise) * 2) + 1} of 24. Stay in.`, sub: "sunset in " + Math.ceil((L.day.sunset - hour) * 2) + " h" };
  return { text: "NIGHT. Safe to walk.", sub: "sunrise in " + Math.ceil(((L.day.sunrise - hour + 24) % 24) * 2) + " h. be under cover by then" };
};

export function layFriends(ctx, put, L) {
  const S = stopsOf(L), fu = L.house.floorUp, g = (x, z, up = 0) => ({ x, z, y: { terrain: up } }), hour = ctx.place.atmosphere?.timeOfDay ?? 12;
  // the kitchen table is the house's own long table (l169-house-m-table); seven chairs round it (no collider: people walk into them to sit)
  for (const k of ["l169-friend-tablea", "l169-friend-tableb"]) if (ctx.getObject(k)) ctx.destroy(k);
  for (let i = 1; i <= 7; i++) { const c = S["seat-" + i]; put("l169-friend-chair-" + i, { feetPosition: g(c.x, c.z, fu), rotation: { yaw: yawOf(c.fx, c.fz) }, model: model("dining_chair") }); }
  const st = at(L, L.friends.stove), GEO = (part, extra) => ({ primitive: { kind: "scripted", script: "scripts/l169-house-geo.js", params: { part, ...extra } }, material: { pbr: true }, castShadow: true, receiveShadow: true });
  put("l169-friend-stove", { feetPosition: g(st.x, st.z, fu), rotation: { yaw: 180 }, model: { id: model("mocha_range"), forward: FUR.pieces.mocha_range.forward }, physics: "static" });
  put("l169-friend-pot", { feetPosition: g(st.x - 0.15, st.z + 0.15, fu + 0.735), ...GEO("pot") });
  // bedrolls: one each, in the three bedrooms
  const QUILT = ["oklch(0.62 0.09 30)", "oklch(0.6 0.07 250)", "oklch(0.65 0.08 140)", "oklch(0.66 0.08 80)", "oklch(0.62 0.07 320)", "oklch(0.55 0.03 250)", "oklch(0.6 0.1 20)"];
  for (const p of F.people) { const b = S["bed-" + p.n], k = "l169-friend-bed-" + p.n;
    for (const x of ["-quilt", "-pillow"]) if (ctx.getObject(k + x)) ctx.destroy(k + x);
    put(k, { feetPosition: g(b.x, b.z, fu), ...GEO("roll", { col: QUILT[p.n - 1] }) }); }
  // the den: map table and the checkpoint crates
  const mt = at(L, L.friends.mapTable), cr = at(L, L.friends.crates);
  put("l169-friend-maptable", { feetPosition: g(mt.x, mt.z, fu), model: model("pedestal_table"), physics: "static" });
  put("l169-friend-map", { feetPosition: g(mt.x, mt.z, fu + FUR.pieces.pedestal_table.size[1] + 0.002), pivot: "center", rotation: { pitch: -90 }, primitive: { kind: "circle", radius: 0.4, segments: 28 }, material: { texture: "cdn/texture-hand-drawn-desert-route-map-on-old-paper.png", roughness: 1, side: "double" } });
  for (let i = 0; i < 4; i++) put("l169-friend-crate" + i, { feetPosition: g(cr.x - (i % 2) * 0.45, cr.z, fu + (i >> 1) * 0.27), rotation: { yaw: i * 7 - 8 }, model: model("cola_crate") });
  put("l169-friend-denlamp", { feetPosition: g(mt.x, mt.z, fu + 2.1), light: { kind: "point", color: "oklch(0.85 0.09 75)", intensity: 1.6, distance: 7 } });
  // the porch: the road guide's handcart, the weather slate, the newcomer's chair
  const c = at(L, L.friends.cart), deck = L.house.porchUp, wy = deck + 0.34;
  for (const s of [-1, 1]) {
    put("l169-friend-cart-wheel" + s, { feetPosition: g(c.x, c.z + s * 0.48, wy), pivot: "center", primitive: { kind: "torus", radius: 0.3, tube: 0.04, radialSegments: 8, tubularSegments: 24 }, material: WOOD });
    for (let k = 0; k < 3; k++) put("l169-friend-cart-spoke" + s + k, { feetPosition: g(c.x, c.z + s * 0.48, wy), pivot: "center", rotation: { roll: k * 60 }, primitive: { kind: "cylinder", radiusTop: 0.015, radiusBottom: 0.015, height: 0.58, radialSegments: 6 }, material: WOOD });
    put("l169-friend-cart-shaft" + s, { feetPosition: g(c.x + 0.95, c.z + s * 0.3, deck + 0.52), pivot: "center", rotation: { roll: 82 }, primitive: { kind: "cylinder", radiusTop: 0.022, radiusBottom: 0.028, height: 1, radialSegments: 8 }, material: WOOD });
  }
  put("l169-friend-cart-axle", { feetPosition: g(c.x, c.z, wy), pivot: "center", rotation: { pitch: 90 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.03, height: 1.04, radialSegments: 8 }, material: WOOD });
  put("l169-friend-cart-bed", { feetPosition: g(c.x, c.z, deck + 0.36), scale: { x: 1.25, y: 1, z: 0.8 }, primitive: { kind: "cylinder", radiusTop: 0.5, radiusBottom: 0.42, height: 0.3, radialSegments: 24 }, material: WOOD, physics: "static" });
  put("l169-friend-cart-sack", { feetPosition: g(c.x - 0.2, c.z, deck + 0.79), pivot: "center", scale: { x: 1.2, y: 0.6, z: 1 }, primitive: { kind: "sphere", radius: 0.24, widthSegments: 14, heightSegments: 10 }, material: { texture: "cdn/texture-coarse-burlap-sackcloth.png", color: "oklch(0.7 0.06 80)", roughness: 1 } });
  put("l169-friend-cart-crate", { feetPosition: g(c.x + 0.25, c.z, deck + 0.66), rotation: { yaw: 14 }, model: model("cola_crate") });
  const sl = at(L, L.friends.slate), T0 = slateText(hour, L);
  put("l169-slate", { tags: ["interact"], feetPosition: g(sl.x, sl.z, fu + 1.05), rotation: { yaw: 180 }, primitive: { kind: "box", width: 1.0, height: 0.66, depth: 0.03 }, material: { texture: "cdn/texture-dusty-black-chalkboard-slate.png", color: "oklch(0.3 0.01 250)", roughness: 1 },
    state: { prompt: "Read the slate", note: T0.text, text: T0.text, sub: T0.sub },
    ui: `<div face="front" width="1.0m" style="font:700 78px 'Comic Sans MS',cursive;color:#eeeadc;padding:60px 40px;text-align:center;line-height:1.3">{{ state.text }}<div style="font-size:44px;font-weight:400;opacity:.8;margin-top:30px">{{ state.sub }}</div></div>` });
  for (const [k, dx, dy, w, roll] of [["t", 0, 0.66, 1.08, 90], ["b", 0, 0, 1.08, 90], ["l", -0.52, 0.33, 0.72, 0], ["r", 0.52, 0.33, 0.72, 0]])
    put("l169-slate-frame-" + k, { feetPosition: g(sl.x + dx, sl.z, fu + 1.05 + dy), pivot: "center", rotation: { roll }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.03, height: w, radialSegments: 8 }, material: WOOD });
  if (S.bench) put("l169-friend-bench", { feetPosition: g(S.bench.x, S.bench.z, S.bench.up), rotation: { yaw: yawOf(S.bench.fx, S.bench.fz) }, model: model("dining_chair") });
  // the seven
  for (const p of F.people) {
    const [, block] = blockAt(p, hour), rounds = roundsOf(ctx, L, S, p, block), r0 = rounds[0];
    put(ID(p.n), {
      tags: ["npc", "essential", "l169-friend"], feetPosition: { x: r0.x, y: r0.y + 0.05, z: r0.z }, rotation: { yaw: 180 }, physics: "character",
      ...critterSpec(npcLook(ID(p.n), p.look, "ferry", 1)),
      behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
      state: { name: p.name + " · Ferry's Friends", job: p.job, role: "wanderer", voice: p.voice, faction: "ferry", factionName: "Ferry's Friends", dlg: ID(p.n), essential: true, arm: "fists",
        home: { x: r0.x, z: r0.z }, rounds, ri: 0, blk: block, stop: r0.name, ...npcState(ctx, "wanderer", 200) },
    });
  }
}

export function tickFriends(ctx, L) {
  const hour = ctx.place.atmosphere?.timeOfDay ?? 12, S = stopsOf(L), ps = ctx.place.state, fu = L.house.floorUp;
  const day = hour >= L.day.sunrise && hour < L.day.sunset;
  if (!ctx.getObject(ID(1))) layFriends(ctx, (id, spec) => { const old = ctx.getObject(id); if (old && spec.tags?.includes("npc")) return; if (old) ctx.destroy(id); if ((spec.primitive || spec.model) && !spec.visibleRange) spec.visibleRange = { max: 450 }; if (spec.light) spec.light.shadow = { enabled: false }; return ctx.spawn(id, spec); }, L); // a room laid before the seven existed gets them now
  for (const p of F.people) {
    const o = ctx.getObject(ID(p.n)); if (!o) continue;
    const s = o.state, [, block] = blockAt(p, hour);
    if (s.blk !== block) { // a new part of the day: new stops (written once, here)
      const rounds = roundsOf(ctx, L, S, p, block);
      s.blk = block; s.rounds = rounds; s.ri = 0; s.stop = rounds[0].name; s.home = { x: rounds[0].x, z: rounds[0].z };
      if (s.sit) s.sit = null;
    }
    if (s.dead) s.dead = false;
    if ((s.hp ?? 1) < (s.maxHp ?? 1)) s.hp = s.maxHp; // essential: the house never loses anyone
    if (s.hostile) s.hostile = false;
    const cur = s.rounds?.[(s.ri ?? 0) % (s.rounds?.length || 1)];
    if (cur && s.stop !== cur.name) s.stop = cur.name;
    if (cur?.seat !== undefined) { // a chair or a bedroll: settle onto it once
      const d = Math.hypot(o.feetPosition.x - cur.x, o.feetPosition.z - cur.z);
      if (!s.sit && d < 1.2) { s.sit = { at: cur.name }; o.feetPosition = { x: cur.x, y: cur.y + 0.02, z: cur.z }; o.rotation = { yaw: cur.seat }; }
    } else if (s.sit) s.sit = null;
  }
  // the cook's plate rides her hand while she lays the table; the plates sit out for the meal
  const cook = ctx.getObject(ID(1)), carrying = cook?.state?.blk === "plates", meal = carrying || cook?.state?.blk === "meal";
  const PLATE = { primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.08, height: 0.025, radialSegments: 20 }, material: { color: "oklch(0.93 0.01 90)", roughness: 0.35 } };
  if (!!ps.l169carry !== carrying) { ps.l169carry = carrying;
    if (carrying) ctx.spawn("l169-friend-plate", { parent: ID(1), attachment: { bone: "RightHand" }, feetPosition: { x: 0, y: 0.04, z: 0 }, ...PLATE }); else if (ctx.getObject(ID(1) + "/l169-friend-plate")) ctx.destroy(ID(1) + "/l169-friend-plate"); }
  if (!!ps.l169meal !== meal) { ps.l169meal = meal;
    for (let i = 1; i <= 7; i++) { const c = S["seat-" + i], id = "l169-friend-setting-" + i;
      if (meal) ctx.spawn(id, { feetPosition: { x: c.x + c.fx * 0.5, z: c.z + c.fz * 0.5, y: { terrain: fu + 0.765 } }, ...PLATE }); else if (ctx.getObject(id)) ctx.destroy(id); } }
  // the fixer's shutters: closed for the day, open for the night
  if (ps.l169shut !== day) { ps.l169shut = day;
    for (const r of ctx.query({ tags: ["l169-shutter"] })) { const h = ctx.getObject(r.id); if (h && h.state.closed !== day) { h.state.closed = day; h.state.open = !day; } } }
  // the weather keeper's slate
  const slate = ctx.getObject("l169-slate"), T = slateText(hour, L);
  if (slate && (slate.state.text !== T.text || slate.state.sub !== T.sub)) { slate.state.text = T.text; slate.state.sub = T.sub; slate.state.note = T.text + " (" + T.sub + ")"; }
  tickChatter(ctx, F.chatter, Object.fromEntries(F.people.map((p) => [ID(p.n), p.voice])));
}
