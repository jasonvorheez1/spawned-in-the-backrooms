// Level 13's B8 tenant: the tape, the door count on the wall, the box he keeps unpacking; cassette and tube-glass salvage in three flats.
import { APTS } from "./level13.js";
const TV = 1; // bump to re-lay every l13t- object
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
  for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("l13t-") && !id.includes("/")) ctx.destroy(id);
  st.tapeV = TV;
  // B8: the recorder still on the table, the reel in it
  ctx.spawn("l13t-recorder", { tags: ["l13t", "container"], feetPosition: { x: 23.45, y: 0.75, z: 12.6 }, rotation: { yaw: 200 }, model: { id: RECORDER, forward: "-z" },
    layout: { box: { min: { x: -0.22, y: 0, z: -0.15 }, max: { x: 0.22, y: 0.2, z: 0.15 } } }, physics: { body: "static", collider: "box" },
    state: { name: "Cassette recorder, still loaded", verb: "Take tape", items: "holo:b8" } });
  // the count: nine doors, then fourteen, scratched in pen on the bedroom divider
  ctx.spawn("l13t-tally", { tags: ["l13t"], feetPosition: { x: 23.6, y: 1.35, z: 16.08 }, rotation: { yaw: 180 }, vector: TALLY });
  // the same box, unpacked and repacked: four of them, the same things in each
  cardbox(ctx, "l13t-box1", { x: 19.4, y: 0, z: 15.4 }, 12, true, { tags: ["container"], state: { name: "Box marked B8, opened", items: "magnetic_tape,magnetic_tape,crt_glass" } });
  cardbox(ctx, "l13t-box2", { x: 19.95, y: 0, z: 15.55 }, -8, true);
  cardbox(ctx, "l13t-box3", { x: 19.6, y: 0.34, z: 15.45 }, 31, false);
  cardbox(ctx, "l13t-box4", { x: 24.6, y: 0, z: 15.6 }, 74, true, { tags: ["container"], state: { name: "Box marked B8, opened again", items: "magnetic_tape,crt_glass" } });
  // salvage elsewhere: a shoebox of unspooled cassettes and a kicked-in set's glass
  const salvage = [["a3", "magnetic_tape,magnetic_tape", "Shoebox of chewed cassettes"], ["a5", "crt_glass,crt_glass", "Bag of picture-tube glass"], ["b2", "magnetic_tape,crt_glass", "Box of dead tapes"]];
  for (const [id, items, name] of salvage) {
    const a = APTS.find((q) => q.id === id); if (!a) continue;
    const nearZ = Math.abs(a.door.z - a.all.z0) < Math.abs(a.door.z - a.all.z1) ? a.all.z0 + 0.5 : a.all.z1 - 0.5;
    const x = a.door.x - a.all.x0 > a.all.x1 - a.door.x ? a.all.x0 + 0.45 : a.all.x1 - 0.45;
    cardbox(ctx, `l13t-salv-${id}`, { x, y: 0, z: nearZ }, 15, true, { tags: ["container"], state: { name, items } });
  }
}
