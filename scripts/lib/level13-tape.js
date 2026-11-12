// Level 13's B8 tenant: the tape, the door count on the wall, the box he keeps unpacking; cassette and tube-glass salvage in three flats.
import { DINING, apt } from "./level13.js";
import L13 from "./data/level13.yml";
const TV = 2; // bump to re-lay every l13t- object
const RECORDER = "/cdn/value.2d037c484973cd0b26e6d4f42824e86c7ced0cb6de6365152abf1c2dceaea5e3.glb";
const CARD = { texture: "cdn/texture-worn-brown-corrugated-cardboard-box-side.png", color: "oklch(0.7 0.06 70)", roughness: 0.95 };
const TALLY = `<svg viewBox='0 0 200 120' width='0.9m'><g stroke='#3a3328' stroke-width='2.4' stroke-linecap='round' fill='none'>
<path d='M14 20 v26 M22 20 v26 M30 20 v26 M38 20 v26 M8 40 L46 26'/><path d='M60 20 v26 M68 20 v26 M76 20 v26 M84 20 v26'/>
<text x='100' y='42' font-family='sans-serif' font-size='16' fill='#3a3328' stroke='none'>9</text>
<path d='M14 70 v26 M22 70 v26 M30 70 v26 M38 70 v26 M8 90 L46 76 M60 70 v26 M68 70 v26 M76 70 v26 M84 70 v26 M54 90 L92 76 M106 70 v26 M114 70 v26 M122 70 v26 M130 70 v26'/>
<text x='146' y='92' font-family='sans-serif' font-size='16' fill='#3a3328' stroke='none'>14?</text>
<path d='M140 44 Q170 30 186 52' stroke='#7a2a22' stroke-width='1.6'/></g></svg>`;
function cardbox(ctx, id, at, yaw, open, extra = {}) {
  ctx.spawn(id, { tags: ["l13t", ...(extra.tags ?? [])], feetPosition: at, rotation: { yaw }, physics: { body: "static", collider: "box" },
    primitive: { kind: "box", width: 0.5, height: 0.34, depth: 0.38 }, material: CARD, state: extra.state,
    children: open ? [
      { feetPosition: { x: 0, y: 0.34, z: -0.19 }, rotation: { pitch: -62 }, primitive: { kind: "box", width: 0.5, height: 0.006, depth: 0.19 }, material: CARD },
      { feetPosition: { x: 0, y: 0.34, z: 0.19 }, rotation: { pitch: 58 }, primitive: { kind: "box", width: 0.5, height: 0.006, depth: 0.19 }, material: CARD },
    ] : [] });
}
export function layTape(ctx) {
  const st = ctx.place.state;
  if (st.tapeV === TV && "l13t-recorder" in ctx.place.objects) return;
  const stock = new Map();
  for (const [id, o] of Object.entries(ctx.place.objects)) {
    if (!id.startsWith("l13t-") || id.includes("/")) continue;
    if (o.tags?.includes("container")) stock.set(id, o.state.items);
    ctx.destroy(id);
  }
  const itemsAt = (id, initial) => stock.has(id) ? stock.get(id) : initial;
  st.tapeV = TV;
  // B8: the recorder still on the table, the reel in it
  const b8 = apt("b8");
  ctx.spawn("l13t-recorder", { tags: ["l13t", "container"], feetPosition: { x: b8.x0 + DINING.u + 0.34, y: L13.tops.table + 0.012, z: b8.zf + DINING.v + 0.18 }, rotation: { yaw: 200 }, model: { id: RECORDER, forward: "-z" },
    layout: { box: { min: { x: -0.22, y: 0, z: -0.15 }, max: { x: 0.22, y: 0.2, z: 0.15 } } }, physics: { body: "static", collider: "box" },
    state: { name: "Cassette recorder, still loaded", verb: "Take tape", items: itemsAt("l13t-recorder", "holo:b8") } });
  // the count: nine doors, then fourteen, scratched in pen on the bedroom divider
  ctx.spawn("l13t-tally", { tags: ["l13t"], feetPosition: { x: 23.6, y: 1.35, z: 16.08 }, rotation: { yaw: 180 }, vector: TALLY });
  // the same box, unpacked and repacked: four of them, the same things in each
  cardbox(ctx, "l13t-box1", { x: 18.57, y: 0.012, z: 15.55 }, 12, true, { tags: ["container"], state: { name: "Box marked B8, opened", items: itemsAt("l13t-box1", "magnetic_tape,magnetic_tape,crt_glass") } });
  cardbox(ctx, "l13t-box2", { x: 19.13, y: 0.012, z: 15.68 }, -8, true);
  cardbox(ctx, "l13t-box3", { x: 18.57, y: 0.352, z: 15.55 }, 31, false);
  cardbox(ctx, "l13t-box4", { x: 22.78, y: 0.012, z: 15.77 }, 74, true, { tags: ["container"], state: { name: "Box marked B8, opened again", items: itemsAt("l13t-box4", "magnetic_tape,crt_glass") } });
  // salvage elsewhere: a shoebox of unspooled cassettes and a kicked-in set's glass
  const salvage = [["a3", "magnetic_tape,magnetic_tape", "Shoebox of chewed cassettes"], ["a5", "crt_glass,crt_glass", "Bag of picture-tube glass"], ["b2", "magnetic_tape,crt_glass", "Box of dead tapes"]];
  for (const [id, items, name] of salvage) {
    const a = apt(id), obj = 'l13t-salv-' + id;
    cardbox(ctx, obj, { x: a.x0 + 0.58, y: 0.012, z: a.zf + a.s * (id === "a5" ? 4.44 : 0.62) }, 15, true,
      { tags: ["container"], state: { name, items: itemsAt(obj, items) } });
  }
}
