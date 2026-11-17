// Level 325 quest layer: "Fifteen Seconds". Taught by watching, never told: every step is a thing the city does in front of you.
// The sim's witness() writes player.state.l325.saw.{grow,tremor,flash,impact,sink,rebuild} and .survived; salvage heaps write .salvaged/.glass.
// Steps (Savi's design): 1 watch a tower grow, 2 read the warning (tremor + blue flash), 3 live through a fall, 4 strip 3 heaps before they sink
// (one at a tower's crown gives Channel glass), 5 see the same lot start again. Reward: 250 XP, $40, Rebar bolts.
// Salvage: 3 heaps per fallen tower near a player, along its fall line, gone when the rubble finishes sinking.
import { towerAt, cellOf, lobe, keyOf, GROUND } from "./level325.js";
import { setQuest, tellQuest, finishLevelQuest } from "./quests.js";
import CAMP from "./data/l0-kit-camp.yml";
export const V = 3;
export const Q325 = { key: "q325", id: "fifteen-seconds", name: "Fifteen Seconds", tips: {
  1: "Find a tower that's still building and watch it.",
  2: "Learn the warning. Feel the street shake, look up for the blue.",
  3: "Live through a collapse. Distance and cover both count.",
  4: "Strip three salvage heaps before the rubble sinks. One at the tower's top end holds blue glass.",
  5: "Wait for the lot to start again.",
} };
const at = (w) => { const l = w.l325 ?? {}, saw = l.saw ?? {};
  if (!saw.grow) return 1; if (!(saw.tremor && saw.flash)) return 2; if (!(l.survived > 0)) return 3; if ((l.salvaged ?? 0) < 3) return 4; if (!saw.rebuild) return 5; return 6; };
export function step325(ctx, p) {
  const w = p?.state; if (!w || w.q325 === 99) return;
  const n = at(w);
  if (n >= 6) { finishLevelQuest(ctx, p, Q325.key, { ...Q325, key: Q325.key }, { xp: 250, cents: 4000, items: ["bolt325"], text: "Fifteen Seconds: you know the city's tell now." }); return; }
  if ((w.q325 ?? 0) === n) return;
  w.q325 = n;
  setQuest(w, Q325.id, { name: Q325.name, step: Q325.tips[n] });
  if (n > 1) tellQuest(ctx, p, `${Q325.name} · ${Q325.tips[n]}`);
}
export function lay(ctx) {
  // Abandoned stops on permanent empty lots, clear of roads and tower footprints.
  const stops = [
    { x: -9, z: -8, page: 3251, loot: ["backpack", "Eli's field bag", "bandage,battery"], props: [["backpack", 0, 0, 55], ["note-clipboard", 0.55, 0.1, 20], ["lantern", -0.5, 0.3, 0]] },
    { x: -55, z: 43, page: 3252, loot: ["almond-crate", "Supply crate", "ration"], props: [["almond-crate", 0, 0, 15], ["note-clipboard", 0.5, 0.15, 75], ["tape-marks", -0.45, 0.15, 20]] },
    { x: -150, z: 90, page: 3253, loot: ["backpack", "Mara's bag", "bandage,almond"], props: [["backpack", 0, 0, 150], ["note-clipboard", 0.55, 0.1, 45], ["shoes", -0.5, 0.2, 30]] },
  ];
  for (const stop of stops) for (const [model, dx, dz, yaw] of stop.props) {
    const id = `l325-story-${stop.page}-${model}`;
    const note = model === "note-clipboard";
    if (!ctx.place.objects[id]) ctx.spawn(id, { feetPosition: { x: stop.x + dx, y: GROUND, z: stop.z + dz }, rotation: { yaw }, model: CAMP.models[model], physics: "none",
      ...(note ? { tags: ["usable"], behavior: "scripts/quest-prop-use.js", state: { kind: "l325-note", page: stop.page, name: "Wanderer's field note", verb: "Read" } } : {}) });
    const obj = ctx.place.objects[id];
    if (model === stop.loot[0] && obj && !obj.state?.l325Loot) {
      obj.tags = [...new Set([...(obj.tags ?? []), "container"])];
      obj.state = { ...(obj.state ?? {}), name: stop.loot[1], items: stop.loot[2], l325Loot: true };
    }
  }
}
let n = 0;
const HEAP = (ctx) => { try { const k = JSON.parse(ctx.files.read("scripts/lib/data/l325-kit-bamboo.json") ?? "{}"); return k.wreck?.glb ?? null; } catch { return null; } };
let heapGlb, heapAt = -1e9;
export function tick(ctx) {
  n++;
  for (const p of ctx.place.players) step325(ctx, p);
  if (n % 2) return;
  if (ctx.now() - heapAt > 30000) { heapGlb = HEAP(ctx); heapAt = ctx.now(); }
  if (!heapGlb) return; // no stand-in boxes: heaps wait for the real wreck mesh
  const want = new Map();
  for (const p of ctx.place.players) { const c = cellOf(p.feetPosition.x, p.feetPosition.z);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      const t = towerAt(ctx, c.ix + i, c.iz + j); if (!t || (t.stage !== "rubble" && t.stage !== "sink")) continue;
      const L = lobe(t), sinkLeft = t.stage === "sink" ? 1 - t.prog : 1;
      for (let h = 0; h < 3; h++) { const f = 0.25 + h * 0.37, id = `l325s-${keyOf(t.ix, t.iz)}-${t.cycle}-${h}`;
        const side = (h - 1) * 7, px = t.x + (L.x1 - t.x) * f + t.lean.z * side, pz = t.z + (L.z1 - t.z) * f - t.lean.x * side;
        want.set(id, { feetPosition: { x: px, y: GROUND - Math.max(0, (1 - sinkLeft) - 0.6) / 0.4 * 1.4, z: pz }, h, crown: h === 2 }); } } }
  tick.have ??= new Set(ctx.query({ tags: ["l325salv"], radius: 1e6, center: { x: 0, y: 0, z: 0 } }).map((o) => o.id));
  for (const id of [...tick.have]) if (!want.has(id)) { if (ctx.place.objects[id]) ctx.destroy(id); tick.have.delete(id); }
  for (const [id, w] of want) {
    const o = ctx.place.objects[id];
    if (o) { if (Math.abs(o.feetPosition.y - w.feetPosition.y) > 0.05) o.feetPosition = w.feetPosition; continue; }
    const yld = w.crown ? { bamboo_pole: 1, steel_cable: 1, channel_glass: 1 } : w.h ? { bamboo_pole: 2, steel_cable: 1, rebar_rod: 1 } : { bamboo_pole: 2, rubble: 2 };
    ctx.spawn(id, { tags: ["l325salv", "usable"], feetPosition: w.feetPosition, rotation: { yaw: (w.h * 97 + id.length * 31) % 360 }, scale: 0.34,
      model: heapGlb, physics: "none", behavior: "scripts/l325-salvage.js",
      ...(w.crown ? { children: [{ id: "glint", feetPosition: { x: 0, y: 2, z: 0 }, light: { kind: "point", color: "#5fb8ff", intensity: 2.2, distance: 7 } }] } : {}),
      state: { name: w.crown ? "Crown wreckage" : "Scaffold wreckage", verb: "Salvage", info: w.crown ? "bamboo, cable, something blue" : "bamboo, cable, rebar", yield: yld, taken: [] } });
    tick.have.add(id);
  }
}
