// Level 22 "Ruins Left Behind" (Wikidot). Emstable: 26,158 people in a car park, founders on top, miners at the bottom,
// everyone cutting concrete out of the building that held them up. Nobody is here now. Nothing hunts you. The building does.
// Shelly Nov 17 (lock-in): "make Emstable's former class divisions physically explorable ... gradually reveals how the
// society's demand for concrete contributed to the collapse of the structure supporting it."
// The sim lays six decks (scripts/lib/l22-layout.js), the two Cuts and the pit, hangs the lights, dresses each tier from
// scripts/lib/data/l22-dress-*.yml, and runs the structure: slab panels that creak, shed dust, then drop; ceiling
// fragments that warn before they fall; the pit that has no floor. Numbers are Savi's picks.
import { animate } from "builtin/tween";
import { DECKS, CUTS, PANELS, EXIT, PIT, FF, H, deckOf, inRect } from "../../scripts/lib/l22-layout.js";
import { startL22, noteFloor } from "../../scripts/lib/level22-quest.js";
import TOP from "../../scripts/lib/data/l22-dress-top.yml";
import MID from "../../scripts/lib/data/l22-dress-mid.yml";
import LOW from "../../scripts/lib/data/l22-dress-low.yml";
import RUBBLE from "../../scripts/lib/data/l325-kit-rubble.json";

export const cadence = "100ms";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const SEDAN = "/cdn/value.75b49ca4395a7da77d80c0fe5589224c21034b5a646d18f6577609e76845c706.glb";
const CAR_BOX = { min: { x: -1.0, y: 0, z: -2.6 }, max: { x: 1.0, y: 1.6, z: 2.6 } };
const WARN = 1500, DEBRIS_WARN = 1700; // ms between the first creak and the drop
const TIER = { top: { grime: 0.05, light: "#e9f0d8", li: 5.5 }, mid: { grime: 0.5, light: "#f0d9a6", li: 4.5 }, low: { grime: 1, light: "#e8b070", li: 3.5 } };
const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
const sfx = (ctx, p, clip, vol = 0.7, at) => ctx.emit("playSound", { clip, volume: vol, ...(at ? { position: at, maxDistance: 45 } : {}) }, { audience: { player: p.id } });
const DUST = `fx
pop grit burst=30..44 on=disc(%r|1.4) life=.9..1.8 v=<0,-1,0>*(.6..2.2)+sdir()*(.1..0.5) size=.015..0.04 acc=grav()*.5+drag(.8) col=<.62,.58,.5> a=1>.8:1>0 sz=$size floor=die r=sprite(soft-disc,alpha)
pop haze burst=6..9 on=disc(%r|1.4) life=1.6..2.6 v=<0,-1,0>*(.2..0.5)+sdir()*.2 size=.5..0.9 acc=drag(1.2) col=<.55,.52,.46> a=0>.2:.28>.7:.12>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)`;
const CRASH = `fx
pop chunks burst=16..24 life=.8..1.4 v=up(2..4.5)+sdir()*(1..3) size=.05..0.14 spin=-8..8 acc=grav()+drag(.4) col=<.5,.48,.43> a=1>.8:1>0 sz=$size rot=$age*$spin floor=bounce(.3) r=sprite(soft-disc,alpha)
pop cloud burst=10..14 on=disc(1) life=1.8..3 v=up(.3..0.9)+sdir()*(.6..1.6) size=.8..1.4 acc=drag(1.4) col=<.5,.47,.42> a=0>.15:.4>.6:.2>0 sz=$size*(.6>2.2) r=sprite(smoke-puff,alpha)`;

function lay(ctx, s) {
  const fallen = new Set(s.l22?.fallen ?? []);
  for (const d of DECKS) {
    const t = TIER[d.tier], lit = [];
    for (let n = 0; n < 40; n++) if (hash(n, d.floor) < d.lit) lit.push(n);
    const kids = [];
    let n = 0;
    for (const x of [-16, -8, 0, 8, 16]) for (let z = -28; z <= 28; z += 8) { if (lit.includes(n)) kids.push({ id: `lt${n}`, feetPosition: { x, y: H - 0.75, z }, light: { kind: "point", color: t.light, intensity: t.li * (0.7 + hash(n, 9) * 0.5), distance: 13, shadow: { enabled: false } } }); n++; }
    // the floor's number, stencilled on four columns
    for (const [x, z, yaw] of [[12, 16, 0], [-12, 0, 180], [4, -16, 90], [-4, 24, -90]]) {
      const ox = yaw === 90 ? 0.306 : yaw === -90 ? -0.306 : 0, oz = yaw === 0 ? -0.306 : yaw === 180 ? 0.306 : 0;
      kids.push({ feetPosition: { x: x + ox, y: 1.75, z: z + oz }, rotation: { yaw }, castShadow: false,
        vector: `<svg viewBox='0 0 120 80' width='0.5m'><text x='60' y='66' font-size='74' text-anchor='middle' font-family='sans-serif' font-weight='700' fill='${d.tier === "top" ? "#23221f" : "#3a3833"}' opacity='${d.tier === "low" ? 0.55 : 0.85}'>${d.floor}</text></svg>` });
    }
    ctx.spawn(`l22-deck-${d.floor}`, { tags: ["l22deck"], feetPosition: { x: 0, y: d.y, z: 0 }, physics: "static", receiveShadow: true, castShadow: false,
      primitive: { kind: "scripted", script: "scripts/l22-deck-geo.js", params: { ...d.p, grime: t.grime, seed: d.floor, lit } }, material: { pbr: true }, children: kids });
  }
  for (const c of CUTS) {
    const cx = (c.r[0] + c.r[2]) / 2, cz = (c.r[1] + c.r[3]) / 2, kids = [];
    for (let y = -5; y > -c.depth; y -= 9) kids.push({ feetPosition: { x: 0, y, z: 0 }, light: { kind: "point", color: c.flights ? "#cfd8e6" : "#8fa2c4", intensity: c.flights ? 2.2 : 3, distance: c.flights ? 11 : 20, shadow: { enabled: false } } });
    c.floors.forEach((f, i) => { const y = -FF * (i + 1) + 0.9; if (c.flights) kids.push({ feetPosition: { x: (c.r[2] - c.r[0]) / 2 - 0.02, y, z: 0 }, rotation: { yaw: 90 }, castShadow: false, vector: `<svg viewBox='0 0 120 80' width='0.7m'><text x='60' y='66' font-size='74' text-anchor='middle' font-family='sans-serif' font-weight='700' fill='#2a2825' opacity='0.7'>${f}</text></svg>` }); });
    ctx.spawn(c.id, { feetPosition: { x: cx, y: c.y, z: cz }, physics: "static", castShadow: false,
      primitive: { kind: "scripted", script: "scripts/l22-cut-geo.js", params: { w: c.r[2] - c.r[0], d: c.r[3] - c.r[1], depth: c.depth, flights: c.flights, seed: c.depth } }, material: { pbr: true }, children: kids,
      audio: { clip: G(c.flights ? "wind-moaning-down-deep-concrete-shaft-loop" : "vast-deep-pit-low-wind-and-distant-falling-grit-loop"), loop: true, gain: 0.3, spatial: true, maxDistance: 30 } });
  }
  for (const pn of PANELS) if (!fallen.has(pn.id)) {
    const d = DECKS.find((k) => k.floor === pn.floor);
    ctx.spawn(`l22-panel-${pn.id}`, { tags: ["l22panel"], feetPosition: { x: (pn.r[0] + pn.r[2]) / 2, y: d.y, z: (pn.r[1] + pn.r[3]) / 2 }, physics: "kinematic", castShadow: false,
      primitive: { kind: "scripted", script: "scripts/l22-panel-geo.js", params: { w: pn.r[2] - pn.r[0], d: pn.r[3] - pn.r[1] } }, material: { pbr: true } });
  }
  // the way out: Floor 1's ceiling fell in, and the heap climbs to a hole in Level 21's floor
  ctx.spawn("l22-exit", { feetPosition: { x: 0, y: 2.9, z: -32.4 }, physics: { body: "static", collider: "box", trigger: true }, primitive: { kind: "box", width: 6, height: 1.6, depth: 1.6 }, visible: false, behavior: "scripts/l22-exit.js",
    children: [{ feetPosition: { x: 0, y: 2.5, z: 2 }, light: { kind: "spot", color: "#dfe8f5", intensity: 60, distance: 16, angle: 38, penumbra: 0.7, aim: { x: 0, y: 0, z: -29 }, shadow: { enabled: false } } }] });
  ctx.spawn("l22-bed", { feetPosition: { x: 0, y: 0, z: 0 }, audio: { clip: G("huge-empty-concrete-car-park-room-tone-distant-creaks-and-drips-loop"), loop: true, gain: 0.18, spatial: false } });
  // your car, if a car brought you: the same one, as dead as Level 69 left it
  if (s.l22car) ctx.spawn("l22-car", { feetPosition: { x: 0, y: 0.02, z: 31.5 }, rotation: { yaw: 4 }, model: { id: SEDAN, forward: "+x" }, layout: { box: CAR_BOX }, physics: "static",
    tags: ["usable"], state: { name: "Your car", verb: "Try the key", info: "It got you here. It will not get you anywhere else.", kind: "l22car" },
    children: [{ feetPosition: { x: 0, y: 0.9, z: -2.3 }, audio: { clip: G("hot-engine-block-ticking-as-it-cools"), loop: true, gain: 0.25, spatial: true, maxDistance: 9 } }] });
  for (const tb of [TOP, MID, LOW]) for (const r of tb?.rows ?? []) dress(ctx, r);
}
function dress(ctx, r) {
  const d = DECKS.find((k) => k.floor === r.floor); if (!d || !r.glb) return;
  const [w, h, dp] = r.size ?? [1, 1, 1];
  const usable = r.page || r.items || r.verb;
  ctx.spawn(`l22-${r.id}`, { tags: [...(r.items ? ["container"] : []), ...(usable ? ["usable"] : []), "l22dress"], feetPosition: { x: r.x, y: d.y + (r.y ?? 0), z: r.z }, rotation: { yaw: r.yaw ?? 0, ...(r.pitch ? { pitch: r.pitch } : {}), ...(r.roll ? { roll: r.roll } : {}) },
    model: { id: r.glb }, layout: { box: { min: { x: -w / 2, y: 0, z: -dp / 2 }, max: { x: w / 2, y: h, z: dp / 2 } } }, physics: r.solid ? { body: "static", collider: "box" } : "none", castShadow: false,
    ...(r.page ? { behavior: "scripts/l22-record.js" } : {}), ...(r.light ? { children: [{ feetPosition: { x: 0, y: h + 0.3, z: 0 }, light: { kind: "point", color: r.light.color ?? "#ffcf8a", intensity: r.light.intensity ?? 3, distance: r.light.distance ?? 7, shadow: { enabled: false } } }] } : {}),
    ...(usable ? { state: { name: r.name ?? "Something left behind", verb: r.verb ?? (r.page ? "Read" : "Search"), ...(r.page ? { page: r.page, rec: r.rec ?? r.id } : {}), ...(r.items ? { items: r.items } : {}), ...(r.info ? { info: r.info } : {}) } } : {}) });
}

export function tick(ctx) {
  const now = ctx.now(), p = ctx.place.players[0]; if (!p) return;
  const s = p.state, st = ctx.place.state;
  if (!ctx.place.objects["l22-deck-1"]) { lay(ctx, s); st.laidAt = now; }
  const l = s.l22 ? { ...s.l22 } : {}; let dirty = false;
  const pos = p.feetPosition, deck = deckOf(pos.y);
  if (!l.arrivedAt) { l.arrivedAt = now; l.fallen = l.fallen ?? []; dirty = true; startL22(ctx, p); }
  if (ctx.session.l22visit !== st.laidAt) { // each visit: say where you are
    ctx.session.l22visit = st.laidAt;
    s.notice = { text: s.l22car ? "The ramp behind you is gone under a fallen ceiling. The engine ticks, cooling. It won't start again." : "Concrete dust. A car park, floors and floors of it, and nobody.", at: now };
    sfx(ctx, p, G("distant-concrete-slab-collapse-rumble-echo-in-car-park"), 0.6);
  }
  // which floor you stand on: the first time on each is remembered
  if (deck && p.grounded !== false && (l.floors ?? []).indexOf(deck.floor) < 0 && Math.abs(pos.y - deck.y) < 0.4) { l.floors = [...(l.floors ?? []), deck.floor]; dirty = true; s.notice = { text: `FLOOR ${deck.floor}`, at: now }; noteFloor(ctx, p, deck.floor); }
  if (deck && Math.abs(pos.y - deck.y) < 0.3 && !PANELS.some((q) => q.floor === deck.floor && inRect(pos.x, pos.z, q.r, 0.8))) ctx.session.l22safe = { x: pos.x, y: deck.y + 0.2, z: pos.z };
  // the slab panels
  for (const pn of PANELS) {
    const id = `l22-panel-${pn.id}`, o = ctx.place.objects[id]; if (!o) continue;
    const d = DECKS.find((k) => k.floor === pn.floor), on = Math.abs(pos.y - d.y) < 0.5 && inRect(pos.x, pos.z, pn.r, -0.15);
    const c = { x: (pn.r[0] + pn.r[2]) / 2, y: d.y, z: (pn.r[1] + pn.r[3]) / 2 };
    if (on && !o.state.creakAt) { // the warning: a crack like a rifle, dust from underfoot, the slab dips a finger's width
      o.state.creakAt = now;
      sfx(ctx, p, G("sharp-concrete-crack-then-grinding-creak-underfoot"), 0.9, c);
      ctx.emit("fx", { position: { ...c, y: d.y - 0.5 }, script: DUST, params: { r: 1.5 } });
      ctx.emit("screenShake", { intensity: 0.12, duration: 0.5 }, { audience: { player: p.id } });
      animate(ctx, o, { "feetPosition.y": d.y - 0.07 }, { duration: 0.35, easing: "easeOutQuad" });
    }
    if (o.state.creakAt && !o.state.gone && now - o.state.creakAt > WARN) {
      o.state.gone = true; l.fallen = [...new Set([...(l.fallen ?? []), pn.id])]; dirty = true;
      sfx(ctx, p, G("concrete-floor-slab-gives-way-and-crashes-down-a-storey"), 1, c);
      ctx.emit("screenShake", { intensity: 0.3, duration: 0.7 }, { audience: { player: p.id } });
      animate(ctx, o, { "feetPosition.y": d.y - FF + 0.45, rotation: { pitch: 7, roll: -5, yaw: 3 } }, { duration: 0.62, easing: "easeInQuad" });
      ctx.after(0.62, "landed", { x: c.x, y: d.y - FF, z: c.z, pid: p.id, deep: pn.floor === 21 });
      if (pn.floor === 21) ctx.after(0.7, "sink", { id });
    }
  }
  // ceiling fragments: only where the miners went, only while you move, always with a warning first
  if (deck && deck.tier !== "top") {
    st.nextDebris ??= now + 30000;
    const v = p.velocity ?? { x: 0, z: 0 }, sp = Math.hypot(v.x, v.z);
    if (now > st.nextDebris && sp > 1 && !st.debris) {
      st.nextDebris = now + (deck.tier === "low" ? 22000 : 45000) + ctx.random() * 20000;
      const at = { x: pos.x + (v.x / sp) * 3.2 + (ctx.random() - 0.5) * 1.5, y: deck.y + H - 0.1, z: pos.z + (v.z / sp) * 3.2 + (ctx.random() - 0.5) * 1.5 };
      st.debris = { at, t: now, y: deck.y };
      sfx(ctx, p, G("concrete-ceiling-ticking-cracking-grit-trickling-down"), 0.9, at);
      ctx.emit("fx", { position: at, script: DUST, params: { r: 0.7 } });
    }
    if (st.debris && now - st.debris.t > DEBRIS_WARN) {
      const { at, y } = st.debris; st.debris = null;
      const k = RUBBLE.chunk_corner ?? RUBBLE.chunk_slab, id = ctx.spawn({ feetPosition: at, rotation: { yaw: ctx.random() * 360, pitch: 20 }, model: { id: k.glb }, scale: 0.28, physics: { body: "dynamic", collider: "box", mass: 40 }, lifetime: 240 });
      ctx.after(0.5, "landed", { x: at.x, y, z: at.z, pid: p.id, hurt: 14 });
    }
  }
  // the pit under Floor 21 has no floor
  if (pos.y < PIT_BOTTOM) {
    const safe = ctx.session.l22safe ?? { x: 2.6, y: 0.3, z: 29 }, pl = ctx.getObject(p.id);
    if (pl) { pl.velocity = { x: 0, y: 0, z: 0 }; pl.feetPosition = { ...safe }; }
    s.hp = Math.max(1, (s.hp ?? 100) - Math.round((s.maxHp ?? 100) * 0.45));
    s.notice = { text: "You catch rebar on the way down and drag yourself back up. It costs you.", at: now };
    ctx.emit("screenFlash", { color: "#000000", duration: 1.2, intensity: 1 }, { audience: { player: p.id } });
    sfx(ctx, p, G("body-slams-into-steel-rebar-grunt-and-scrabble"), 0.9);
  }
  if (dirty) s.l22 = l;
}
const PIT_BOTTOM = -FF * 20 - 16;
export function landed(ctx, { x, y, z, pid, hurt, deep } = {}) {
  const at = { x, y, z };
  if (!deep) { ctx.emit("fx", { position: at, script: CRASH }); ctx.emit("playSound", { clip: G("heavy-concrete-chunk-smashes-on-concrete-floor"), position: at, volume: 1, maxDistance: 50 }); }
  const p = ctx.place.players.find((q) => q.id === pid); if (!p) return;
  const d = Math.hypot(p.feetPosition.x - x, p.feetPosition.z - z);
  if (d < 9) ctx.emit("screenShake", { intensity: 0.35 * (1 - d / 9), duration: 0.4 }, { audience: { player: pid } });
  if (hurt && d < 1.2 && Math.abs(p.feetPosition.y - y) < 2) { p.state.hp -= hurt; p.state.notice = { text: "A piece of the ceiling finds your shoulder.", at: ctx.now() }; ctx.emit("screenFlash", { color: "#5a0d0d", duration: 0.3, intensity: 0.5 }, { audience: { player: pid } }); }
}
export function sink(ctx, { id } = {}) { const o = ctx.place.objects[id]; if (!o) return; animate(ctx, o, { "feetPosition.y": "-=40" }, { duration: 2.2, easing: "easeInQuad" }); ctx.after(2.3, "gone", { id }); }
export function gone(ctx, { id } = {}) { if (ctx.place.objects[id]) ctx.destroy(id); }
