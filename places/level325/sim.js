// Level 325 "Boom Town". ONE controller for every tower: it reads the tower clock (scripts/lib/level325.js), stands each tower
// near a player as modelled storeys in bamboo, assembles the active storey piece by piece, runs the fifteen second collapse,
// lays the rubble, sinks it through the ground and starts the foundation again. Towers far from everyone are only arithmetic.
// Models come from the kit tables (scripts/lib/data/l325-kit*.json, written by the model lanes); a piece with no model yet
// stands as a blueprint box. Layers (quests, links, life, sound) each lay() once per version and tick().
import { animate } from "builtin/tween";
import { CELL, GROUND, STOREY, SECTION, WARN_S, FLASH_S, FALL_S, SINK_S, LOT, hash, cellOf, cellInfo, keyOf, towerAt, keepClock, nudge, lobe, distToLobe, coverAt } from "../../scripts/lib/level325.js";
import { impact, debrisHit } from "../../scripts/lib/l325-hazard.js";
import * as quest from "../../scripts/lib/level325-quest.js";
import * as links from "../../scripts/lib/level325-links.js";
import * as life from "../../scripts/lib/level325-life.js";
import * as sound from "../../scripts/lib/level325-sound.js";
export const cadence = "250ms";
const V = 1, LAYERS = { quest, links, life, sound };
const VIEW = 5, NEAR = 1, DRESS = 2; // cell rings: towers drawn, towers in full detail, streets dressed (Savi's picks)
const BP = { kind: "scripted", script: "engine/blueprint" };
// what each surface slot of the kit wears
const SLOTS = {
  concrete: { texture: "cdn/texture-raw-cast-concrete-with-formwork-lines-and-tie-holes.png", roughness: 0.95 },
  rebar: { texture: "cdn/texture-rusty-ribbed-rebar-steel.png", roughness: 0.8, metalness: 0.5 },
  steel: { texture: "cdn/texture-galvanised-steel-dusty-scratched.png", roughness: 0.6, metalness: 0.8 },
  plywood: { texture: "cdn/texture-concrete-stained-formwork-plywood.png", roughness: 0.9 },
  bamboo: { texture: "cdn/texture-weathered-bamboo-pole-with-nodes-tan-and-green.png", roughness: 0.7 },
  lashing: { texture: "cdn/texture-black-nylon-strip-lashing.png", roughness: 0.8 },
  plank: { texture: "cdn/texture-worn-scaffold-plank-wood-cement-splashed.png", roughness: 0.9 },
};
let KIT = {}, STREET = {}, kitV = "", kitAt = -1e9;
const seen = new Map(); // tower key -> { sig, root, ids, act, warn, debris }
const cells = new Map(); // dressed cell key -> root id
function loadKit(ctx) {
  const rd = (f) => { try { return JSON.parse(ctx.files.read("scripts/lib/data/" + f) ?? "{}"); } catch { return {}; } };
  KIT = { ...rd("l325-kit-tower.json"), ...rd("l325-kit-bamboo.json"), ...rd("l325-kit-rubble.json"), ...rd("l325-kit.json") };
  STREET = rd("l325-kit-street.json");
  kitV = Object.keys(KIT).length + ":" + Object.keys(STREET).length;
}
const has = (k) => !!KIT[k]?.glb;
// a kit piece as a spec; a blueprint box of its size until its model lands
function piece(keys, size, extra = {}) {
  const k = [].concat(keys).find(has);
  if (k) return { model: { id: KIT[k].glb, materials: SLOTS }, castShadow: true, receiveShadow: true, ...extra };
  return { primitive: { kind: "box", width: size[0], height: size[1], depth: size[2] }, material: BP, ...extra, physics: "none" };
}
function prop(k, extra = {}) {
  if (!STREET[k]?.glb) return null;
  return { model: { id: STREET[k].glb }, castShadow: true, ...extra };
}
const tilt = (lean, deg) => ({ yaw: 0, pitch: lean.z * deg, roll: -lean.x * deg });
const DUST_BASE = `fx
pop puff rate=flick(.6,.4)*14 on=box(13,.5,13) life=3..6 v=sdir()*(.6..2)+up(.3..1.2) size=1.5..4 acc=drag(.6)+buoy(.15) col=<.72,.7,.64> a=0>.2:.35>.7:.2>0 sz=$size*(.6>2.2) rot=spin(.05) r=sprite(smoke-puff,alpha)
pop grit rate=30 on=box(12,40,12).c(40) life=2..3.5 v=<0,-9,0>+sdir()*1.2 size=.05..0.16 acc=grav()*.5+drag(.3) col=<.6,.58,.54> a=1>.8:1>0 sz=$size floor=die r=sprite(grain,alpha,velocity,.02)`;
const FLASH = `fx
pop core burst=1 life=.5 size=70 col=hdr(1.2,3.2,9) a=1>.25:.9>0 sz=$size*(.2>1.3) r=sprite(soft-disc,add)
pop ring burst=1 life=1.1 size=60 col=hdr(.6,2.2,8) a=.9>0 sz=$size*(.1>2.6) r=sprite(soft-disc,add)
pop arc burst=60..90 on=sphere(12) life=.5..1.3 v=sdir()*(6..30) size=.3..0.9 acc=drag(2.2) col=hdr(1,3,10)>hdr(.2,.8,4) a=1>.6:1>0 sz=$size r=sprite(ember,add,velocity,.03)
pop tear burst=14 on=box(12,2,12) life=1.2..2.2 size=6..12 col=<.01,.004,0> a=.5>.5:.5>0 sz=$size*(1>.2) r=sprite(soft-disc,distort)
pop lamp burst=1 life=.9 glo=1>0 r=light(<.25,.55,1>,$glo*900,420)`;
const IMPACT_DUST = `fx
pop wall burst=?mobile:50|ultra:160|110 on=box(%hx|14,2,%hz|14) life=18..40 v=sdir()*(3..16)+up(.5..3) size=5..12 acc=drag(.8)+buoy(.08)+curl(.2)*.6 col=<.74,.72,.66>><.66,.64,.6> a=0>.06:.6>.6:.4>0 sz=$size*(.5>2.4) rot=spin(.04) r=sprite(smoke-puff,alpha)
pop chips burst=80..120 on=box(%hx|14,1,%hz|14) life=1.2..2.6 v=up(6..16)+sdir()*(4..14) size=.1..0.35 spin=-8..8 acc=grav()+drag(.3) col=<.55,.54,.5> a=1>.8:1>0 sz=$size rot=$age*$spin floor=bounce(.2) r=sprite(chip,alpha,velocity,.02)`;
const DEBRIS_DUST = `fx
pop puff burst=10..16 on=disc(1.5) life=2..5 v=sdir()*(1..5)+up(.5..2) size=1.2..3 acc=drag(1)+buoy(.1) col=<.72,.7,.65> a=0>.1:.5>.6:.3>0 sz=$size*(.6>2.2) r=sprite(smoke-puff,alpha)
pop chips burst=14..22 life=.8..1.6 v=up(3..8)+sdir()*(2..6) size=.06..0.18 spin=-9..9 acc=grav()+drag(.3) col=<.55,.54,.5> a=1>.8:1>0 sz=$size rot=$age*$spin floor=bounce(.2) r=sprite(chip,alpha,velocity,.02)`;
const SINK_DUST = `fx
pop creep rate=10 on=box(14,.3,14) life=4..7 v=sdir()*(.2..0.8) size=2..4 acc=drag(.8) col=<.7,.68,.63> a=0>.3:.28>.7:.2>0 sz=$size*(.8>1.8) r=sprite(smoke-puff,alpha)
pop blue rate=3 on=box(12,.2,12) life=.6..1.2 v=up(.2..0.6) size=.3..0.8 col=hdr(.3,1,3.5) a=0>.3:.6>0 sz=$size r=sprite(soft-disc,add)`;
const AIR = `fx follow=camera
pop mote n=?mobile:60|ultra:260|150 on=box(16,8,16) wrap=16;8;16 life=6..10 v=<.5,-.05,.2>+sdir()*.1 size=.015..0.04 acc=curl(.3)*.3 col=<.86,.84,.78> a=0>.2:.5>.8:.5>0 sz=$size r=sprite(mote,alpha)`;
function sigOf(t, near) {
  const fa = Math.max(0, t.floors - 1);
  return [t.stage === "near" ? "build" : t.stage, t.cycle, near ? t.floors : Math.floor(fa / SECTION), near ? 1 : 0, kitV].join("|");
}
function kill(ctx, e) { if (e?.root && ctx.getObject(e.root)) ctx.destroy(e.root); }
// the standing tower: lobby, ten-storey sections, loose storeys on top
function stand(ctx, t, near) {
  const root = ctx.spawn("t" + t.key, { tags: ["l325t"], feetPosition: { x: t.x, y: GROUND, z: t.z }, state: { key: t.key, stage: t.stage } });
  const e = { root, parts: [], act: {}, warn: -1, debris: null }, kid = (id, spec) => { const r = ctx.spawn(id, { parent: root, ...spec }); e.parts.push(r); return r; };
  if (t.stage === "foundation") {
    const f = kid("fnd", { ...piece("foundation", [24, 0.7, 24]), feetPosition: { x: 0, y: -0.9 + 0.6 * t.prog, z: 0 } });
    animate(ctx, f, { "feetPosition.y": -0.3 }, { duration: Math.max(0.5, 60 * (1 - t.prog)), easing: "linear" });
    return e;
  }
  if (t.stage === "rubble" || t.stage === "sink") { rubble(ctx, t, e, kid); return e; }
  kid("fnd", { ...piece("foundation", [24, 0.7, 24]), feetPosition: { x: 0, y: -0.3, z: 0 } });
  if (t.floors < 1) return e;
  kid("lob", { ...piece(t.basement ? ["lobby_basement_clad", "lobby_basement", "lobby_clad", "lobby"] : ["lobby_clad", "lobby"], [26, STOREY, 26], { physics: near ? { body: "static", collider: "mesh" } : "none" }), feetPosition: { x: 0, y: 0, z: 0 }, tags: ["l325-lobby"] });
  const fa = t.floors - 1, full = Math.floor(fa / SECTION), rest = fa % SECTION;
  for (let j = 0; j < full; j++) {
    const clad = near && j < 2;
    kid("s" + j, { ...piece(clad ? ["section_clad", "section10"] : ["section_far", "section_clad"], [26, STOREY * SECTION, 26], { physics: near && j < 1 ? { body: "static", collider: "mesh" } : "none" }), feetPosition: { x: 0, y: (1 + j * SECTION) * STOREY, z: 0 }, tags: ["l325-sec"], state: { j } });
  }
  if (near) for (let r = 0; r < rest; r++) kid("f" + r, { ...piece(["floor_clad", "floor"], [26, STOREY, 26]), feetPosition: { x: 0, y: (1 + full * SECTION + r) * STOREY, z: 0 }, tags: ["l325-sec"], state: { j: full + r / SECTION } });
  return e;
}
// the storey being built right now, piece by piece. Each row: appears at `at` of the two minutes and takes `dur` seconds to arrive.
const ACT = [
  { id: "poles", key: "poles", size: [26, STOREY, 26], at: 0.0, dur: 16, from: { "feetPosition.y": -STOREY } },
  { id: "ring", key: "ring", size: [26, STOREY, 26], at: 0.12, dur: 12, from: { "scale.y": 0.03 } },
  { id: "cols", key: "columns", size: [24, STOREY, 24], at: 0.22, dur: 26, from: { "scale.y": 0.02 } },
  { id: "core", key: "core", size: [6, STOREY, 6], at: 0.44, dur: 16, from: { "scale.y": 0.02 } },
  { id: "q0", key: "slab_q", size: [12, 0.25, 12], at: 0.58, dur: 7, yaw: 0, up: 1, slide: [1, 1] },
  { id: "q1", key: "slab_q", size: [12, 0.25, 12], at: 0.66, dur: 7, yaw: 90, up: 1, slide: [1, -1] },
  { id: "q2", key: "slab_q", size: [12, 0.25, 12], at: 0.74, dur: 7, yaw: 180, up: 1, slide: [-1, -1] },
  { id: "q3", key: "slab_q", size: [12, 0.25, 12], at: 0.82, dur: 7, yaw: 270, up: 1, slide: [-1, 1] },
  { id: "net", key: "ring_net", size: [26.2, STOREY, 26.2], at: 0.9, dur: 9, from: { "scale.y": 0.03 } },
];
function assemble(ctx, t, e) {
  if (e.actFloor !== t.floors) { for (const id of Object.values(e.act)) if (ctx.getObject(id)) ctx.destroy(id); e.act = {}; e.actFloor = t.floors; e.fresh = e.fresh ?? true; }
  const y0 = t.floors * STOREY;
  for (const a of ACT) {
    if (t.prog < a.at || e.act[a.id]) continue;
    const late = e.fresh && (t.prog - a.at) * 120 > a.dur; // first sight of a storey already under way: pieces already home stand home
    const pos = { x: 0, y: y0 + (a.up ? STOREY : 0), z: 0 };
    const spec = { parent: e.root, ...piece(a.key, a.size), feetPosition: { ...pos }, rotation: { yaw: a.yaw ?? 0 } };
    const to = {};
    if (!late) {
      if (a.slide) { spec.feetPosition = { x: a.slide[0] * 22, y: pos.y + 2.5, z: a.slide[1] * 22 }; to["feetPosition.x"] = 0; to["feetPosition.z"] = 0; to["feetPosition.y"] = pos.y; }
      for (const [k, v] of Object.entries(a.from ?? {})) {
        if (k === "feetPosition.y") { spec.feetPosition.y = pos.y + v; to[k] = pos.y; }
        else if (k === "scale.y") { spec.scale = { x: 1, y: v, z: 1 }; to[k] = 1; }
      }
    }
    const id = ctx.spawn("a-" + a.id, spec);
    e.act[a.id] = id;
    if (!late) animate(ctx, id, to, { duration: a.dur, easing: a.slide ? "easeOutCubic" : "easeInOutSine" });
  }
  e.fresh = false;
}
function rubble(ctx, t, e, kid) {
  const L = lobe(t), sunk = t.stage === "sink";
  kid("mound", { ...piece("mound", [26, 7, 26], { physics: sunk && t.prog > 0.5 ? "none" : { body: "static", collider: "mesh" } }), feetPosition: { x: 0, y: -0.2, z: 0 }, rotation: { yaw: Math.floor(hash(t.ix, t.iz, 20 + t.cycle) * 4) * 90 }, tags: ["l325-rubble"] });
  const n = Math.max(2, Math.round(L.reach / 9));
  for (let i = 1; i <= n; i++) {
    const d = 13 + (L.reach - 6) * i / n, side = (hash(t.ix, t.iz, 30 + i) - 0.5) * 8;
    kid("pile" + i, { ...piece(i % 3 === 2 ? ["wreck", "pile"] : "pile", [10, 3, 10], { physics: sunk && t.prog > 0.5 ? "none" : { body: "static", collider: "mesh" } }), feetPosition: { x: t.lean.x * d + t.lean.z * side, y: -0.3, z: t.lean.z * d + t.lean.x * side }, rotation: { yaw: hash(t.ix, t.iz, 40 + i) * 360 }, scale: 0.8 + hash(t.ix, t.iz, 50 + i) * 0.5, tags: ["l325-rubble"] });
  }
  kid("scat", { ...piece("scatter", [14, 0.6, 14]), feetPosition: { x: t.lean.x * (L.reach + 6), y: -0.2, z: t.lean.z * (L.reach + 6) } });
  if (sunk) {
    ctx.getObject(e.root).feetPosition = { x: t.x, y: GROUND - 9.5 * t.prog, z: t.z };
    animate(ctx, e.root, { "feetPosition.y": GROUND - 9.5 }, { duration: Math.max(0.5, SINK_S * (1 - t.prog)), easing: "linear" });
    kid("sinkfx", { feetPosition: { x: 0, y: 9.5 * t.prog + 0.2, z: 0 }, fx: { script: SINK_DUST } });
  }
}
// the fifteen seconds. Steps fire once each as wt passes them.
function collapse(ctx, t, e) {
  const top = t.H + GROUND, ev = { key: t.key, ix: t.ix, iz: t.iz, x: t.x, z: t.z, lean: t.lean, H: t.H };
  if (e.warn < 0 && t.wt >= 0) {
    e.warn = 0; ctx.emit("l325:warn", ev);
    ctx.emit("shake", { target: e.root, intensity: 0.12, duration: FLASH_S });
    e.dust = ctx.spawn({ parent: e.root, feetPosition: { x: 0, y: 0, z: 0 }, fx: { script: DUST_BASE } });
    for (const p of ctx.place.players) { const d = Math.hypot(p.feetPosition.x - t.x, p.feetPosition.z - t.z); if (d < 220) ctx.emit("screenShake", { intensity: 0.05 + 0.2 * (1 - d / 220), duration: FLASH_S }, { audience: { player: p.id } }); }
  }
  if (e.warn < 1 && t.wt >= FLASH_S) {
    e.warn = 1; ctx.emit("l325:flash", ev);
    ctx.emit("fx", { position: { x: t.x, y: top - 6, z: t.z }, script: FLASH });
    for (const p of ctx.place.players) { const d = Math.hypot(p.feetPosition.x - t.x, p.feetPosition.z - t.z); if (d < 400) ctx.emit("screenFlash", { color: "oklch(0.75 0.16 245)", duration: 0.25, intensity: 0.5 * (1 - d / 400) }, { audience: { player: p.id } }); }
    // the top folds in on itself: the highest pieces crush toward the core, then the fragments leave
    const tops = e.parts.map((id) => ctx.getObject(id)).filter((o) => o && o.tags?.includes("l325-sec")).sort((a, b) => (b.state?.j ?? 0) - (a.state?.j ?? 0)).slice(0, 2);
    for (const o of tops) animate(ctx, o.id, { "scale.x": 0.5, "scale.z": 0.5, "scale.y": 0.35 }, { duration: 1.3, easing: "easeInCubic" });
    for (const id of Object.values(e.act)) if (ctx.getObject(id)) ctx.destroy(id);
    for (let k = 0; k < 6; k++) {
      const a = hash(t.ix, t.iz, 60 + k) * 6.283, r = 18 + hash(t.ix, t.iz, 70 + k) * 30, off = KIT["frag_" + k]?.offset ?? [0, 16, 0];
      const id = ctx.spawn({ parent: e.root, ...piece(["frag_" + k, ["chunk_slab", "chunk_column", "chunk_beam", "chunk_corner", "chunk_stair", "chunk_bamboo"][k]], [8, 8, 8]), feetPosition: { x: off[0], y: t.H - 40 + off[1], z: off[2] }, pivot: "center", scale: has("frag_" + k) ? 1 : 3 });
      e.parts.push(id);
      animate(ctx, id, { "feetPosition.x": Math.cos(a) * r + t.lean.x * 10, "feetPosition.z": Math.sin(a) * r + t.lean.z * 10, "feetPosition.y": 2, "rotation.pitch": 200 + k * 70, "rotation.roll": 120 - k * 50 }, { duration: 7.5 + k * 0.55, delay: 1 + k * 0.25, easing: "easeInQuad" });
    }
    // sixteen pieces of loose debris, each with a place and a second to land (the same for everyone: it is the tower's hash)
    e.debris = [];
    for (let k = 0; k < 16; k++) {
      const a = hash(t.ix, t.iz, 80 + k + t.cycle) * 6.283, r = 14 + hash(t.ix, t.iz, 100 + k) * 34;
      e.debris.push({ x: t.x + Math.cos(a) * r + t.lean.x * 10, z: t.z + Math.sin(a) * r + t.lean.z * 10, at: 6 + k * 0.56, k });
    }
  }
  for (const d of e.debris ?? []) {
    if (!d.id && t.wt >= d.at - 2.4) {
      const m = ["chunk_slab", "chunk_column", "chunk_beam", "chunk_corner", "chunk_stair", "chunk_bamboo"][d.k % 6];
      d.id = ctx.spawn({ ...piece(m, [2.5, 1, 2.5]), feetPosition: { x: d.x, y: 70, z: d.z }, pivot: "center", rotation: { yaw: d.k * 47 }, lifetime: 60, tags: ["l325-debris"] });
      animate(ctx, d.id, { "feetPosition.y": GROUND + 0.4, "rotation.pitch": 300 + d.k * 31 }, { duration: 2.4, easing: "easeInQuad" });
    }
    if (!d.hit && t.wt >= d.at) { d.hit = true; const pos = { x: d.x, y: GROUND, z: d.z }; debrisHit(ctx, pos, t.key); ctx.emit("fx", { position: pos, script: DEBRIS_DUST }); ctx.emit("l325:debris", { ...ev, position: pos }); crush(ctx, pos.x, pos.z, 3); }
  }
  if (e.warn < 2 && t.wt >= FALL_S) {
    e.warn = 2; ctx.emit("l325:fall", ev);
    ctx.emit("shake", { target: e.root, intensity: 0.4, duration: WARN_S - FALL_S });
    const secs = e.parts.map((id) => ctx.getObject(id)).filter((o) => o && (o.tags?.includes("l325-sec") || o.tags?.includes("l325-lobby")));
    const L = lobe(t), dur = Math.max(0.5, WARN_S - t.wt), n = secs.length;
    secs.sort((a, b) => (a.state?.j ?? -1) - (b.state?.j ?? -1)).forEach((o, i) => {
      const k = i / Math.max(1, n - 1), out = L.reach * k * 0.9;
      animate(ctx, o.id, { "feetPosition.x": t.lean.x * out, "feetPosition.z": t.lean.z * out, "feetPosition.y": 0.5 + k * 2 - (1 - k) * 20, "rotation.pitch": tilt(t.lean, 35 + 50 * k).pitch, "rotation.roll": tilt(t.lean, 35 + 50 * k).roll }, { duration: dur * (0.75 + 0.25 * k), delay: dur * 0.08 * (1 - k), easing: "easeInCubic" });
    });
  }
}
// things in the street that a landing touches: knocked over where they stand (tag l325-prop, state.down)
function crush(ctx, x, z, r, lean) {
  for (const o of ctx.query({ tags: ["l325-prop"], center: { x, y: 0, z }, radius: r })) {
    if (o.state?.down) continue;
    const h = ctx.getObject(o.id); if (!h) continue;
    h.state.down = true;
    const a = Math.atan2(o.feetPosition.z - z, o.feetPosition.x - x), dir = lean ?? { x: Math.cos(a), z: Math.sin(a) };
    animate(ctx, o.id, { "rotation.pitch": tilt(dir, 78).pitch, "rotation.roll": tilt(dir, 78).roll, "feetPosition.y": "-=0.15" }, { duration: 0.5, easing: "easeOutBounce" });
  }
}
function landed(ctx, t) {
  const L = lobe(t), ev = { key: t.key, ix: t.ix, iz: t.iz, x: t.x, z: t.z, lean: t.lean, H: t.H };
  ctx.emit("l325:impact", ev);
  ctx.emit("fx", { position: { x: t.x, y: GROUND + 1, z: t.z }, script: IMPACT_DUST, params: { hx: 14, hz: 14 } });
  ctx.emit("fx", { position: { x: (L.x0 + L.x1) / 2 + t.lean.x * 8, y: GROUND + 1, z: (L.z0 + L.z1) / 2 + t.lean.z * 8 }, script: IMPACT_DUST, params: { hx: 8 + Math.abs(t.lean.x) * L.reach / 2, hz: 8 + Math.abs(t.lean.z) * L.reach / 2 } });
  ctx.emit("shockwave", { position: { x: t.x, y: GROUND + 1, z: t.z }, speed: 60, thickness: 3, intensity: 0.5 });
  for (let i = 0; i <= 4; i++) crush(ctx, L.x0 + (L.x1 - L.x0) * i / 4, L.z0 + (L.z1 - L.z0) * i / 4, 17, t.lean);
  for (const r of impact(ctx, t)) {
    const s = r.p.state, w = { ...(s.l325 ?? {}) }; w.saw = { ...(w.saw ?? {}), impact: true };
    if ((s.hp ?? 1) > 0) { w.survived = (w.survived ?? 0) + 1; if (r.d > 15) w.outside = (w.outside ?? 0) + 1; if (r.cover) w.sheltered = (w.sheltered ?? 0) + 1; }
    w.last = { key: t.key, ix: t.ix, iz: t.iz }; s.l325 = w;
  }
}
// the streets around a cell: lamps, signs, site clutter, a rare parked car. Every prop is a kit model; none without its model.
function dressCell(ctx, ix, iz) {
  const c = cellInfo(ix, iz), root = ctx.spawn("c" + keyOf(ix, iz), { tags: ["l325c"], feetPosition: { x: c.x, y: GROUND, z: c.z } });
  const h = (k) => hash(ix, iz, 200 + k), put = (id, k, x, z, yaw, extra = {}) => { const s = prop(k, extra); if (s) ctx.spawn(id, { parent: root, ...s, feetPosition: { x, y: 0, z }, rotation: { yaw }, tags: ["l325-prop", "l325-" + k, ...(extra.tags ?? [])] }); };
  const e = CELL / 2 - 6 - 1; // just inside the kerb
  put("sl0", "streetlight", e, e, 45); put("sl1", "streetlight", -e, -e, 225);
  if (h(1) < 0.5) put("sl2", "streetlight", -e, e, 315);
  if (h(2) < 0.6) put("sign", "roadsign", e - 1.5, -e, 135);
  if (h(3) < 0.2) put("bus", "busstop", 0, e - 0.6, 180, { physics: "static" });
  if (h(4) < 0.34) put("car", h(5) < 0.5 ? "sedan" : "hatch", (h(6) - 0.5) * 20, CELL / 2 - 4.2, 90, { physics: "static" });
  if (c.kind === "tower") {
    for (let i = 0; i < 5; i++) put("hd" + i, "hoarding", -4.8 + i * 2.4, -LOT / 2 + 0.6, 0, { physics: "static" }), put("he" + i, "hoarding", LOT / 2 - 0.6, -4.8 + i * 2.4, 90, { physics: "static" });
    put("bar0", "barrier", -3, LOT / 2 - 0.5, 0, { physics: "static" }); put("bar1", "barrier", 3.4, LOT / 2 - 0.7, 8, { physics: "static" });
    if (h(7) < 0.5) put("skip", "skip", -LOT / 2 + 1.6, 9, 90, { physics: "static" });
    if (h(8) < 0.6) put("poles", "polestack", LOT / 2 - 1.4, 10, 0, { physics: "static" });
    if (h(9) < 0.5) put("cem", "cementpallet", -LOT / 2 + 1.3, -9, 20, { physics: "static" });
    if (h(10) < 0.3) put("box", "gangbox", LOT / 2 - 1.2, -11, 270, { physics: "static" });
    put("cone0", "cone", -1.5, LOT / 2 + 1, h(11) * 360); if (h(12) < 0.5) put("cone1", "cone", 2.2, LOT / 2 + 1.3, 0);
    if (h(13) < 0.25) put("lamp", "sitelamp", -6, LOT / 2 - 1.2, 200);
  } else {
    if (h(7) < 0.7) put("office", "container", -8, -9, 0, { physics: "static" });
    if (h(8) < 0.7) put("poles", "polestack", 9, -10, 90, { physics: "static" });
    if (h(9) < 0.5) put("box", "gangbox", -4, -6.4, 0, { physics: "static" });
    if (h(10) < 0.5) put("cem", "cementpallet", 10, 6, 0, { physics: "static" });
    if (h(11) < 0.4) put("skip", "skip", -10, 8, 0, { physics: "static" });
  }
  return root;
}
function spine(ctx) {
  const sp = (id, spec) => { if (ctx.place.objects[id]) ctx.destroy(id); return ctx.spawn(id, spec); };
  sp("l325-from-l11", { feetPosition: { x: 0, y: 0.25, z: 6 }, rotation: { yaw: 0 } });
  sp("l325-air", { feetPosition: { x: 0, y: 0, z: 0 }, fx: { script: AIR } });
  const th = prop("theodolite"); if (th) sp("l325-survey-0", { ...th, feetPosition: { x: 8, y: GROUND, z: -6 }, rotation: { yaw: 200 }, tags: ["l325-survey"], state: { kind: "survey", name: "Total Station", verb: "Take a Reading" } });
}
let secAt = 0;
export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now();
  keepClock(ctx);
  if (now - kitAt > 6000) { kitAt = now; const was = kitV; loadKit(ctx); if (was !== kitV) { s.v325 = null; for (const id of cells.values()) if (ctx.getObject(id)) ctx.destroy(id); cells.clear(); } }
  if (s.v325 !== V + kitV) { spine(ctx); s.v325 = V + kitV; }
  const players = ctx.place.players;
  if (!seen.size && !tick.swept) { tick.swept = true; for (const o of ctx.query({ anyTags: ["l325t", "l325c"] })) ctx.destroy(o.id); } // a new machine starts clean
  // which towers are in sight, and which are close enough for full detail
  const want = new Map(), wantCells = new Set();
  for (const p of players) {
    const c = cellOf(p.feetPosition.x, p.feetPosition.z);
    for (let i = -VIEW; i <= VIEW; i++) for (let j = -VIEW; j <= VIEW; j++) {
      const ix = c.ix + i, iz = c.iz + j, ring = Math.max(Math.abs(i), Math.abs(j)), k = keyOf(ix, iz);
      if (ring <= DRESS) wantCells.add(k);
      if (cellInfo(ix, iz).kind !== "tower") continue;
      const w = want.get(k); if (!w || ring <= NEAR) want.set(k, { ix, iz, near: (w?.near ?? false) || ring <= NEAR });
    }
  }
  for (const [k, e] of seen) if (!want.has(k)) { kill(ctx, e); seen.delete(k); }
  for (const [k, id] of cells) if (!wantCells.has(k)) { if (ctx.getObject(id)) ctx.destroy(id); cells.delete(k); }
  let built = 0;
  for (const k of wantCells) if (!cells.has(k) && built < 2 && Object.keys(STREET).length) { const [ix, iz] = k.split("_").map(Number); cells.set(k, dressCell(ctx, ix, iz)); built++; }
  built = 0;
  for (const [k, w] of want) {
    const t = towerAt(ctx, w.ix, w.iz); let e = seen.get(k);
    if (t.stage === "warn" && e && e.stage !== "rubble" && e.stage !== "sink" && e.stage !== "foundation") { collapse(ctx, t, e); e.stage = "warn"; continue; }
    const sig = sigOf(t, w.near);
    if (!e || e.sig !== sig) {
      if (e?.stage === "warn" && t.stage === "rubble") landed(ctx, t);
      if (e && e.stageName === "sink" && t.stage === "foundation") ctx.emit("l325:rebuild", { key: k, ix: w.ix, iz: w.iz, x: t.x, z: t.z });
      if (e && e.stageName === "rubble" && t.stage === "sink") ctx.emit("l325:gone", { key: k, ix: w.ix, iz: w.iz, x: t.x, z: t.z });
      if (!e && built >= 3) continue; // a few towers a tick: the skyline fills in over a second or two
      kill(ctx, e); e = stand(ctx, t, w.near); e.sig = sig; e.stage = t.stage; e.stageName = t.stage; seen.set(k, e); built++;
    }
    if (w.near && (t.stage === "build" || t.stage === "near") && t.floors >= 1) assemble(ctx, t, e);
  }
  // once a second: what each player has witnessed, and the first tower they will see fall
  if (now - secAt < 1000) { for (const m of Object.values(LAYERS)) m.tick(ctx); return; }
  secAt = now;
  for (const p of players) {
    const st = p.state, w0 = st.l325 ?? {}, saw = { ...(w0.saw ?? {}) }; let ch = false;
    const c = cellOf(p.feetPosition.x, p.feetPosition.z);
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
      const t = towerAt(ctx, c.ix + i, c.iz + j); if (!t) continue;
      const d = Math.hypot(t.x - p.feetPosition.x, t.z - p.feetPosition.z); if (d > 150) continue;
      const flag = (k) => { if (!saw[k]) { saw[k] = true; ch = true; } };
      if ((t.stage === "build" || t.stage === "near") && d < 80 && t.prog > 0.3) flag("grow");
      if (t.stage === "warn") { flag("tremor"); if (t.wt >= FLASH_S) flag("flash"); }
      if (t.stage === "sink" && t.prog > 0.3) flag("sink");
      if (t.stage === "foundation" && w0.last?.key === t.key) flag("rebuild");
    }
    if (!w0.intro) {
      // the first visit: a tower two streets off is three storeys from its limit, so the cycle is seen within minutes, not hours
      let pick = null;
      for (const [i, j] of [[2, 0], [-2, 0], [0, -2], [0, 2], [2, 1], [-2, -1], [1, 2], [-1, -2]]) { const t = towerAt(ctx, c.ix + i, c.iz + j); if (t && (t.stage === "build" || t.stage === "near")) { pick = t; break; } }
      if (pick) nudge(ctx, pick.ix, pick.iz, 150);
      st.l325 = { ...w0, saw, intro: true };
    } else if (ch) st.l325 = { ...w0, saw };
  }
  for (const [k, m] of Object.entries(LAYERS)) {
    if (m.V && s["v325" + k] !== m.V) { m.lay(ctx); s["v325" + k] = m.V; }
    m.tick(ctx);
  }
}
