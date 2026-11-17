// Level 325 "Boom Town". ONE controller for every tower: it reads the tower clock (scripts/lib/level325.js), keeps the pieces
// standing around each player in step with it, and runs the collapse as coordinated phases: warn, flash, failure, fall, impact,
// rubble, sink, rebuild. Near towers (the 9 cells round a player) are full pieces with the active storey assembling; out to 5 cells
// they are light sections. Models come from the kit files the art lanes write; until a key lands its piece is a blueprint box.
// Layers (quest, links, life, sound) are their own files: lay() once per V, tick() every second.
import { animate } from "builtin/tween";
import { CELL, GROUND, STOREY, SECTION, WARN_S, FLASH_S, FALL_S, FOOT, WRAP, hash, cellOf, cellInfo, keyOf, towerAt, keepClock, nudge, lobe, distToLobe } from "../../scripts/lib/level325.js";
import { debrisHit, impact } from "../../scripts/lib/l325-hazard.js";
import * as quest from "../../scripts/lib/level325-quest.js";
import * as links from "../../scripts/lib/level325-links.js";
import * as life from "../../scripts/lib/level325-life.js";
import * as sound from "../../scripts/lib/level325-sound.js";
export const cadence = "250ms";
const V = 1, NEAR = 1, FAR = 5, SH = SECTION * STOREY;
const LAYERS = { quest, links, life, sound };
const BP = { kind: "scripted", script: "engine/blueprint" };
let K = {}, kitAt = -1e9, kitSig = "0", have = null, pending = [], n = 0;
const DUSTAIR = `fx follow=camera
pop mote n=?mobile:90|ultra:420|220 on=box(22,9,22) wrap=22;9;22 life=6..11 v=<.5,-.06,.25>+sdir()*.12 size=.012..0.035 acc=curl(.3)*.4 col=<.86,.83,.76> a=0>.15:.5>.85:.45>0 sz=$size r=sprite(soft-disc,alpha)`;
const FLASH = `fx
pop core burst=1 life=.9 size=70 col=hdr(1.2,3.5,9) a=1>.25:.8>0 sz=$size*(.2>.1:1>1.3) r=sprite(soft-disc,add)
pop arcs burst=40..60 on=sphere(14) life=.5..1.3 v=sdir()*(8..30) size=.5..1.6 acc=drag(2.2) col=hdr(.8,2.6,8)>hdr(.2,.6,3) a=1>0 sz=$size r=sprite(ember,add,velocity,.05)
pop shell burst=1 life=1.6 size=40 col=hdr(.3,1,4) a=.7>0 sz=$size*(.4>2.2) r=sprite(soft-disc,add)
pop glow burst=1 life=1.2 r=light(<.3,.6,1>,900*(1>0),320)`;
const SHED = `fx
pop grit rate=30 on=box(13,%h|40,13) life=2..4 v=<0,-6,0>+sdir()*1.2 size=.08..0.3 acc=grav()*.5+drag(.4) col=<.6,.58,.54> a=0>.1:.9>.8:.7>0 sz=$size floor=die r=sprite(grain,alpha)
pop puff rate=6 on=box(14,%h|40,14) life=3..6 v=<0,-1.5,0>+sdir()*1.5 size=3..7 acc=drag(.6) col=<.72,.7,.65> a=0>.2:.28>0 sz=$size*(.6>1.8) rot=spin(.05) r=sprite(smoke-puff,alpha)`;
const DUST = `fx
pop wall burst=?mobile:40|90 on=disc(%r|16) life=14..34 v=radial(4..11)+up(.4..2.5) size=9..20 acc=drag(.45)+curl(.15)*.6 col=<.74,.72,.67>><.66,.64,.6> a=0>.06:.62>.6:.4>0 sz=$size*(.5>1.9) rot=spin(.03) r=sprite(smoke-puff,alpha)
pop grit burst=120..200 on=disc(%r|16) life=1.2..3 v=radial(6..22)+up(4..16) size=.1..0.4 acc=grav()+drag(.3) col=<.5,.48,.45> a=1>.8:1>0 sz=$size floor=die r=sprite(chip,alpha,velocity,.02)`;
const THUD = `fx
pop puff burst=10..16 on=disc(1.5) life=2..5 v=radial(1..4)+up(.5..2) size=1.5..4 acc=drag(.9) col=<.72,.7,.65> a=0>.1:.5>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)
pop chip burst=14..24 life=.6..1.4 v=sdir()*(2..7)+up(3..7) size=.06..0.2 acc=grav()+drag(.3) col=<.5,.48,.45> a=1>.8:1>0 sz=$size floor=die r=sprite(chip,alpha,velocity,.02)`;
const SINKFX = `fx
pop seep rate=14 on=disc(13) life=2..4 v=up(.2..0.6) size=1.5..3.5 acc=drag(.8) col=<.55,.6,.75> a=0>.3:.22>0 sz=$size*(.7>1.6) r=sprite(smoke-puff,alpha)`;
function loadKit(ctx) {
  if (ctx.now() - kitAt < 20000) return; kitAt = ctx.now();
  const k = {};
  for (const f of ["l325-kit-tower", "l325-kit-bamboo", "l325-kit-rubble", "l325-kit-street", "l325-kit"]) { try { const t = ctx.files.read("scripts/lib/data/" + f + ".json"); if (t) Object.assign(k, JSON.parse(t)); } catch {} }
  K = k; kitSig = String(Object.keys(k).length);
}
const DIM = { foundation: [24, 0.5, 24], lobby: [26, 3.2, 26], floor: [26, 3.2, 26], section: [26, SH, 26], far: [26, SH, 26], columns: [24, 3, 24], core: [6, 3, 6], slab_q: [12, 0.25, 12], poles: [26, 3.2, 26], ring_net: [26, 3.2, 26], mound: [26, 7, 26], pile: [10, 3, 10], scatter: [14, 0.6, 14], chunk: [3, 1, 2] };
const pick = (...keys) => keys.find((k) => K[k]?.glb);
function body(keys, dim, collide) {
  const k = pick(...keys);
  if (k) return { model: K[k].offset ? { id: K[k].glb, offset: K[k].offset } : K[k].glb, physics: collide ? { body: "static", collider: "mesh" } : "none" };
  const d = DIM[dim]; return { primitive: { kind: "box", width: d[0], height: d[1], depth: d[2] }, material: BP, physics: collide ? "static" : "none" };
}
// what should stand for one tower: [{ id, sig, spec, tween? }]
function pieces(ctx, t, near) {
  const k = "l325t-" + t.key, out = [], x = t.x, z = t.z, tag = ["l325t"];
  const put = (id, sig, y, b, more) => out.push({ id: k + "-" + id, sig: sig + "|" + kitSig + (near ? "n" : "f"), spec: { tags: tag, feetPosition: { x, y, z }, ...b, ...(more ?? {}) }, tween: more?._tween });
  if (t.stage === "rubble" || t.stage === "sink") {
    const L = lobe(t), sinking = t.stage === "sink", drop = sinking ? -9.5 * t.prog : 0, left = sinking ? 75 * (1 - t.prog) : 0;
    const tw = (y) => (sinking ? { _tween: [{ "feetPosition.y": y - 9.5 }, { duration: left, easing: "linear" }] } : {});
    put("mound", t.stage, GROUND + drop, body(["mound"], "mound", !sinking), tw(GROUND));
    for (let i = 1; i <= 3; i++) { const f = i / 3; out.push({ id: k + "-pile" + i, sig: t.stage + "|" + kitSig, tween: tw(0)._tween, spec: { tags: tag, rotation: { yaw: hash(t.ix, t.iz, 40 + i) * 360 }, feetPosition: { x: x + (L.x1 - x) * f * 0.95 + t.lean.x * 8, y: drop, z: z + (L.z1 - z) * f * 0.95 + t.lean.z * 8 }, ...body(["pile"], "pile", !sinking) } }); }
    if (near) put("scatter", t.stage, drop + 0.02, body(["scatter"], "scatter", false), { ...tw(0.02), feetPosition: { x: (x + L.x1) / 2, y: drop + 0.02, z: (z + L.z1) / 2 } });
    if (sinking && near) put("seep", "s", GROUND, { fx: { script: SINKFX } });
    return out;
  }
  put("fnd", "f", GROUND - (t.stage === "foundation" ? 0.6 * (1 - t.prog) : 0), body(["foundation"], "foundation", false));
  if (t.stage === "foundation") return out;
  const fl = t.floors, warn = t.stage === "warn", sg = warn ? "w" : "b";
  if (fl >= 1) put("lobby", sg, GROUND, body(t.basement ? ["lobby_basement_clad", "lobby_basement", "lobby_clad", "lobby"] : ["lobby_clad", "lobby"], "lobby", near));
  const full = Math.max(0, Math.floor((fl - 1) / SECTION)), rem = Math.max(0, fl - 1 - full * SECTION);
  for (let s = 0; s < full; s++) put("s" + s, sg, GROUND + STOREY + s * SH, near && s < 2 ? body(["section_clad", "section10", "section_far"], "section", s === 0) : body(["section_far", "section_clad"], "far", false));
  // bamboo sleeves (the bamboo kit): a 10-storey ring round every finished section, a one-storey ring on each loose floor; none until the model lands
  if (pick("ring10")) for (let s = 0; s < full; s++) put("bs" + s, sg, GROUND + STOREY + s * SH, { model: K[near && s < 2 ? "ring10" : pick("ring_far", "ring10")].glb, physics: "none" });
  if (near && pick("ring")) for (let j = 0; j < rem; j++) put("br" + j, sg + full, GROUND + STOREY * (1 + full * SECTION + j), { model: K.ring.glb, physics: "none" });
  if (near || full === 0) for (let j = 0; j < rem; j++) put("r" + j, sg + full, GROUND + STOREY * (1 + full * SECTION + j), body(["floor_clad", "floor"], "floor", near && full === 0));
  if (!near || warn || fl < 1) return out;
  // the storey being built, piece by piece: slab quadrants slide in, poles climb, columns grow, the core rises, the net drops
  const y0 = GROUND + fl * STOREY, p = t.prog, T = 120, sig = "a" + fl;
  const part = (id, a, b, from, to, b0, extra) => {
    if (p < a) return;
    const done = p >= b, f = done ? 1 : (p - a) / (b - a), cur = {}, goal = {};
    for (const key of Object.keys(to)) { const v0 = from[key], v1 = to[key]; cur[key] = typeof v1 === "number" ? v0 + (v1 - v0) * f : { x: v0.x + (v1.x - v0.x) * f, y: v0.y + (v1.y - v0.y) * f, z: v0.z + (v1.z - v0.z) * f }; goal[key] = v1; }
    out.push({ id: k + "-" + id, sig: sig + "|" + kitSig, spec: { tags: tag, ...b0, ...(extra ?? {}), ...cur }, tween: done ? null : [goal, { duration: (b - p) * T, easing: "easeOutCubic" }] });
  };
  for (let q = 0; q < 4; q++) { const a = q * 0.075, sx = q === 0 || q === 3 ? 1 : -1, sz = q < 2 ? 1 : -1; part("q" + q, a, a + 0.075, { feetPosition: { x: x + sx * 16, y: y0 + 7, z: z + sz * 16 } }, { feetPosition: { x, y: y0, z } }, body(["slab_q"], "slab_q", false), { rotation: { yaw: -q * 90 } }); }
  part("poles", 0.3, 0.45, { feetPosition: { x, y: y0 - STOREY, z } }, { feetPosition: { x, y: y0, z } }, body(["poles", "ring"], "poles", false));
  part("cols", 0.45, 0.7, { scale: { x: 1, y: 0.02, z: 1 } }, { scale: { x: 1, y: 1, z: 1 } }, body(["columns"], "columns", false), { feetPosition: { x, y: y0 + 0.25, z } });
  part("core", 0.7, 0.88, { scale: { x: 1, y: 0.02, z: 1 } }, { scale: { x: 1, y: 1, z: 1 } }, body(["core"], "core", false), { feetPosition: { x, y: y0 + 0.25, z } });
  part("net", 0.88, 1, { scale: { x: 1, y: 0.02, z: 1 } }, { scale: { x: 1, y: 1, z: 1 } }, body(["ring_net"], "ring_net", false), { feetPosition: { x, y: y0 + STOREY, z }, pivot: "top" });
  return out;
}
function sync(ctx) {
  const want = new Map(), players = ctx.place.players;
  for (const pl of players) {
    const c = cellOf(pl.feetPosition.x, pl.feetPosition.z);
    for (let i = -FAR; i <= FAR; i++) for (let j = -FAR; j <= FAR; j++) {
      const t = towerAt(ctx, c.ix + i, c.iz + j); if (!t) continue;
      const near = Math.max(Math.abs(i), Math.abs(j)) <= NEAR, prev = want.get(t.key);
      if (!prev || (near && !prev.near)) want.set(t.key, { t, near });
    }
  }
  const need = new Map();
  for (const { t, near } of want.values()) for (const pc of pieces(ctx, t, near)) need.set(pc.id, pc);
  if (!have) { have = new Map(); for (const o of ctx.query({ tags: ["l325t"], radius: 1e6, center: { x: 0, y: 0, z: 0 } })) have.set(o.id, "?"); }
  for (const id of [...have.keys()]) if (!need.has(id)) { if (ctx.place.objects[id]) ctx.destroy(id); have.delete(id); }
  let budget = 40;
  for (const [id, pc] of need) {
    if (have.get(id) === pc.sig) continue;
    if (budget-- <= 0) break;
    if (ctx.place.objects[id]) ctx.destroy(id);
    ctx.spawn(id, pc.spec); have.set(id, pc.sig);
    if (pc.tween) animate(ctx, id, pc.tween[0], pc.tween[1]);
  }
  return want;
}
// the collapse, in phases. ev lives in place.state so a phase runs once whoever's machine holds the sim
function collapse(ctx, t, near) {
  const s = ctx.place.state; s.l325ev ??= {};
  const ev = s.l325ev[t.key]?.c === t.cycle ? s.l325ev[t.key] : { c: t.cycle, st: 0, deb: 0 };
  const top = { x: t.x, y: GROUND + t.H, z: t.z }, k = "l325t-" + t.key, full = Math.floor((t.floors - 1) / SECTION), pay = { key: t.key, ix: t.ix, iz: t.iz, x: t.x, z: t.z, lean: t.lean, H: t.H };
  let st = ev.st;
  if (t.stage === "warn") {
    if (st < 1) { st = 1; ctx.emit("l325:warn", pay); ctx.spawn(k + "-shed", { tags: ["l325t"], feetPosition: { x: t.x, y: 20, z: t.z }, lifetime: 16, fx: { script: SHED, params: { h: 40 } } }); have?.set(k + "-shed", "x");
      for (let i = 0; i < full; i++) ctx.emit("shake", { target: k + "-s" + i, intensity: 0.25, duration: 9 }); }
    if (st < 2 && t.wt >= FLASH_S) { st = 2; ctx.emit("l325:flash", pay); ctx.emit("fx", { position: top, script: FLASH });
      ctx.emit("screenFlash", { color: "oklch(0.8 0.14 240)", duration: 0.25, intensity: 0.35 }, { audience: { nearby: { x: t.x, y: 0, z: t.z }, radius: 260 } });
      const id = k + "-s" + (full - 1); if (ctx.place.objects[id]) animate(ctx, id, { scale: { x: 0.55, y: 0.35, z: 0.55 } }, { duration: 1.6, easing: "easeInCubic" });
      for (let f = 0; f < 6; f++) { const a = f / 6 * 6.283 + hash(t.ix, t.iz, 60 + f), fid = k + "-frag" + f, b = body(["frag_" + f, "chunk_slab"], "chunk", false);
        ctx.spawn(fid, { tags: ["l325t"], lifetime: 12, feetPosition: { x: t.x + Math.cos(a) * 6, y: top.y - 18, z: t.z + Math.sin(a) * 6 }, ...b }); have?.set(fid, "x");
        animate(ctx, fid, { feetPosition: { x: t.x + Math.cos(a) * 26 + t.lean.x * 14, y: 1, z: t.z + Math.sin(a) * 26 + t.lean.z * 14 }, rotation: { yaw: a * 80, pitch: 240 + f * 50, roll: 130 - f * 40 } }, { duration: 7.5 + f * 0.5, easing: "easeInQuad" }); } }
    if (st < 3 && t.wt >= FALL_S) { st = 3; const L = lobe(t), left = WARN_S - t.wt;
      // Shelly Nov 17 "yea": the whole height comes down. Top sections let go first and crush the ones below; each one ends up flattened
      // in the pile along the lean, so nothing tall is left standing for the rubble swap to delete
      for (let i = 0; i <= full; i++) { const f = (i + 1) / (full + 1), id = i === full ? k + "-lobby" : k + "-s" + i, delay = left * 0.4 * (1 - f), dur = Math.max(0.6, left - delay), tilt = 18 + f * 55, side = hash(t.ix, t.iz, 200 + i) - 0.5;
        const goal = { feetPosition: { x: t.x + (L.x1 - t.x) * f + t.lean.z * side * 10, y: GROUND - 2 + i * 1.4, z: t.z + (L.z1 - t.z) * f - t.lean.x * side * 10 }, rotation: { yaw: side * 40, pitch: t.lean.z * tilt, roll: -t.lean.x * tilt }, scale: { x: 1.1, y: 0.22, z: 1.1 } };
        if (ctx.place.objects[id]) animate(ctx, id, goal, { duration: dur, delay, easing: "easeInQuad" });
        if (ctx.place.objects[k + "-bs" + i]) animate(ctx, k + "-bs" + i, { ...goal, feetPosition: { ...goal.feetPosition, y: goal.feetPosition.y - 1 } }, { duration: dur, delay, easing: "easeInQuad" }); }
      for (let j = 0; j < 9; j++) { for (const id of [k + "-r" + j, k + "-br" + j]) if (ctx.place.objects[id]) animate(ctx, id, { "feetPosition.y": GROUND - 2, "scale.y": 0.2 }, { duration: left * 0.6, delay: left * 0.4, easing: "easeInQuad" }); } }
    // debris rain: 16 deterministic pieces between second 5 and the impact; each is a real chunk that lands where its shadow of dust says
    while (ev.deb < 16) { const i = ev.deb, land = 5.5 + i * 0.58; if (t.wt < land - 2.6) break; ev.deb++;
      const a = hash(t.ix, t.iz, 80 + i + t.cycle) * 6.283, r = 14 + hash(t.ix, t.iz, 120 + i) * 34, pos = { x: t.x + Math.cos(a) * r + t.lean.x * 10, y: 0.2, z: t.z + Math.sin(a) * r + t.lean.z * 10 };
      if (!near) continue;
      const id = k + "-deb" + i, key = ["chunk_slab", "chunk_column", "chunk_beam", "chunk_corner", "chunk_stair", "chunk_bamboo"][i % 6];
      ctx.spawn(id, { tags: ["l325t"], lifetime: 30, feetPosition: { x: pos.x - Math.cos(a) * 6, y: 70 + i * 3, z: pos.z - Math.sin(a) * 6 }, rotation: { yaw: a * 57 }, ...body([key], "chunk", false) }); have?.set(id, "x");
      animate(ctx, id, { feetPosition: pos, rotation: { yaw: a * 57 + 200, pitch: 300, roll: 160 } }, { duration: Math.max(0.4, land - t.wt), easing: "easeInQuad" });
      pending.push({ at: ctx.now() + (land - t.wt) * 1000, pos, key: t.key }); }
  } else if (t.stage === "rubble" && st < 4 && st > 0) { st = 4; const L = lobe(t);
    ctx.emit("l325:impact", pay);
    for (let i = 0; i <= 3; i++) ctx.emit("fx", { position: { x: t.x + (L.x1 - t.x) * i / 3, y: 1, z: t.z + (L.z1 - t.z) * i / 3 }, script: DUST, params: { r: 16 } });
    for (const o of impact(ctx, t)) { const w = { ...(o.p.state.l325 ?? {}) }; w.saw = { ...(w.saw ?? {}), impact: true }; if ((o.p.state.hp ?? 1) > 0 && o.d < 90) w.survived = (w.survived ?? 0) + 1; if (o.cover && o.d < 60) w.sheltered = (w.sheltered ?? 0) + 1; o.p.state.l325 = w; }
  } else if (t.stage === "sink" && st < 5) { st = 5; ctx.emit("l325:gone", pay); }
  else if (t.stage === "foundation" && st < 6 && st >= 4) { st = 6; ctx.emit("l325:rebuild", pay); }
  if (st !== ev.st || ev.deb !== (s.l325ev[t.key]?.deb ?? 0) || s.l325ev[t.key]?.c !== t.cycle) { if (st > 0 || t.stage === "warn") s.l325ev = { ...s.l325ev, [t.key]: { c: t.cycle, st, deb: ev.deb } }; }
}
function witness(ctx, want) {
  for (const p of ctx.place.players) {
    const cur = p.state.l325 ?? {}, saw = { ...(cur.saw ?? {}) }; let ch = false; const see = (k) => { if (!saw[k]) { saw[k] = true; ch = true; } };
    for (const { t } of want.values()) {
      if (Math.hypot(t.x - p.feetPosition.x, t.z - p.feetPosition.z) > 150) continue;
      if (t.stage === "build" || t.stage === "near") see("grow");
      if (t.stage === "warn") { see("tremor"); if (t.wt >= FLASH_S) see("flash"); const d = distToLobe(t, p.feetPosition.x, p.feetPosition.z); if (d < 120 && n % 4 === 0) ctx.emit("screenShake", { intensity: 0.05 + 0.3 * (t.wt / WARN_S) * Math.max(0, 1 - d / 120), duration: 1.1 }, { audience: { player: p.id } }); }
      if (t.stage === "sink") see("sink");
      if (t.stage === "foundation" && saw.sink) see("rebuild");
    }
    if (!cur.intro) { // the first tower you ever see fall: one two cells off is brought to ninety seconds from its limit
      const c = cellOf(p.feetPosition.x, p.feetPosition.z);
      for (const [i, j] of [[2, -1], [-2, 1], [1, 2], [-1, -2], [2, 2]]) { const t = towerAt(ctx, c.ix + i, c.iz + j); if (t && (t.stage === "build" || t.stage === "near")) { nudge(ctx, c.ix + i, c.iz + j, 90); break; } }
      p.state.l325 = { ...cur, saw, intro: true };
    } else if (ch) p.state.l325 = { ...cur, saw };
  }
}
// street dressing from the street kit, by cell hash. Nothing is laid until the real models land: no stand-in props.
function dress(ctx) {
  if (!K.streetlight?.glb) return;
  const need = new Map(), LOOSE = ["barrier", "cone", "skip", "polestack", "cementpallet", "gangbox", "sitelamp", "hoarding", "container", "roadsign", "busstop"].filter((k) => K[k]?.glb);
  for (const pl of ctx.place.players) { const c = cellOf(pl.feetPosition.x, pl.feetPosition.z);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const ix = c.ix + i, iz = c.iz + j, key = keyOf(ix, iz), cx = ix * CELL, cz = iz * CELL, id = "l325d-" + key;
      need.set(id + "-l0", { feetPosition: { x: cx + 16.5, y: GROUND, z: cz + 16.5 }, rotation: { yaw: 45 }, model: K.streetlight.glb, physics: "static" });
      need.set(id + "-l1", { feetPosition: { x: cx - 16.5, y: GROUND, z: cz - 16.5 }, rotation: { yaw: 225 }, model: K.streetlight.glb, physics: "static" });
      const m = Math.floor(hash(ix, iz, 20) * 4);
      for (let q = 0; q < m && LOOSE.length; q++) { const kind = LOOSE[Math.floor(hash(ix, iz, 21 + q) * LOOSE.length)], side = Math.floor(hash(ix, iz, 30 + q) * 4), along = (hash(ix, iz, 34 + q) - 0.5) * 26, off = 16.6;
        const px = side < 2 ? cx + (side ? off : -off) : cx + along, pz = side < 2 ? cz + along : cz + (side === 2 ? off : -off);
        need.set(id + "-p" + q, { feetPosition: { x: px, y: GROUND, z: pz }, rotation: { yaw: side < 2 ? 90 : 0 }, model: K[kind].glb, physics: "static", state: { l325kind: kind, cell: key } }); }
      if (hash(ix, iz, 50) < 0.22 && (K.hatch?.glb || K.sedan?.glb)) need.set(id + "-car", { feetPosition: { x: cx + 21.2, y: 0, z: cz + (hash(ix, iz, 51) - 0.5) * 20 }, rotation: { yaw: hash(ix, iz, 52) < 0.5 ? 0 : 180 }, model: (K.hatch ?? K.sedan).glb, physics: "static", state: { l325kind: "parked" } }); } }
  dress.have ??= new Map(ctx.query({ tags: ["l325d"], radius: 1e6, center: { x: 0, y: 0, z: 0 } }).map((o) => [o.id, 1]));
  for (const id of [...dress.have.keys()]) if (!need.has(id)) { if (ctx.place.objects[id]) ctx.destroy(id); dress.have.delete(id); }
  let b = 12; for (const [id, spec] of need) { if (dress.have.has(id)) continue; if (b-- <= 0) break; ctx.spawn(id, { tags: ["l325d"], ...spec }); dress.have.set(id, 1); }
}
function spine(ctx) {
  const sp = (id, spec) => { if (ctx.place.objects[id]) ctx.destroy(id); return ctx.spawn(id, spec); };
  sp("l325-from-l11", { feetPosition: { x: 0, y: 0.25, z: 6 }, rotation: { yaw: 0 } });
  sp("l325-dustair", { feetPosition: { x: 0, y: 0, z: 0 }, fx: { script: DUSTAIR } });
}
export function tick(ctx) {
  const s = ctx.place.state; n++;
  keepClock(ctx);
  for (let i = pending.length - 1; i >= 0; i--) if (ctx.now() >= pending[i].at) { const h = pending.splice(i, 1)[0]; ctx.emit("fx", { position: h.pos, script: THUD }); debrisHit(ctx, h.pos, h.key); }
  if (!ctx.place.players.length) return;
  if (s.v325 !== V) { spine(ctx); s.v325 = V; }
  loadKit(ctx);
  const full = n % 4 === 0, want = full ? sync(ctx) : tick.want ?? sync(ctx); tick.want = want;
  for (const { t, near } of want.values()) { const fresh = towerAt(ctx, t.ix, t.iz); if (fresh.stage !== "build" || s.l325ev?.[t.key]) collapse(ctx, fresh, near); }
  if (!full) return;
  witness(ctx, want); dress(ctx);
  if (n % 240 === 0 && s.l325ev) { const keep = {}; for (const [k, v] of Object.entries(s.l325ev)) if (want.has(k)) keep[k] = v; s.l325ev = keep; }
  for (const [k, m] of Object.entries(LAYERS)) { if (m.V && s["v325" + k] !== m.V) { m.lay(ctx); s["v325" + k] = m.V; } m.tick(ctx); }
}
