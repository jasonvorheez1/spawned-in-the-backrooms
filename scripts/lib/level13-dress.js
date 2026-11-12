// Level 13: dressing. places/level13/sim.js calls layDress(ctx) every 1 s tick; it lays its pieces once (own version key) and returns fast after.
// The hall as people left it: wall lamps between doors, radiators, what was left at each door, notes, and the drag marks into the lurker's flat. Ids l13d-*.
import { APTS, H, HALL, T, UNIT, EXIT0 } from "./level13.js";
import D from "./data/l13-dress.yml";
const DV = 9;
const DOOR = (part, style, o = {}) => ({ kind: "scripted", script: "scripts/door-geo.js", params: { style, part, w: UNIT.doorW, h: UNIT.doorH, hingeSide: "left", ...o } });
const fit = (k) => { const m = D.models[k]; if (!m?.model) return null; const [w, h, d] = m.size; return { model: m.forward ? { id: m.model, forward: m.forward } : { id: m.model }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } } }; };
const svg = (w, [vw, vh], body) => `<svg viewBox='0 0 ${vw} ${vh}' width='${w}m'>${body}</svg>`;
export function layDress(ctx) {
  const st = ctx.place.state, ready = Object.values(D.models).filter((m) => m.model).length;
  if (st.dv === DV && st.dvReady === ready) return;
  for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("l13d-") && !id.includes("/")) ctx.destroy(id);
  st.dv = DV; st.dvReady = ready;
  let n = 0;
  for (const a of APTS) {
    const s = a.s, face = a.zf - s * (T / 2 + 0.012), yawIn = s < 0 ? 180 : 0; // the hall face, and a yaw that faces into the hall
    // a sconce on the wall between this door and the next, every other one lit
    const sc = fit("sconce"), sx = a.door.x + 3.6;
    if (sc) ctx.spawn(`l13d-sc-${a.id}`, { feetPosition: { x: sx, y: 1.7, z: face - s * 0.09 }, rotation: { yaw: yawIn - 90 }, castShadow: false, ...sc }); // the model's backplate is on its own +x side
    if (a.k % 2 === 0) ctx.spawn(`l13d-scl-${a.id}`, { feetPosition: { x: sx, y: 1.85, z: face - s * 0.3 }, light: { kind: "point", color: "oklch(0.85 0.09 70)", intensity: a.id === "a5" ? 0.15 : 0.45, distance: 4.5 } });
    // a shut flat: the Tripo door and frame over the plain slab (the slab stays, unseen, for its name and its collider)
    const dm = !a.open && fit("door");
    if (dm) { const slab = ctx.getObject(`l13-shut-${a.id}`); if (slab) slab.visible = false;
      ctx.spawn(`l13d-door-${a.id}`, { feetPosition: { x: a.door.x, y: 0, z: face - s * 0.01 }, rotation: { yaw: yawIn + 90 }, castShadow: false, receiveShadow: true, ...dm }); }
    // what was left outside
    for (const it of D.doors[a.id] ?? []) { const f = fit(it.m); if (!f) continue;
      ctx.spawn(`l13d-${a.id}-${n++}`, { feetPosition: { x: a.door.x + it.dx, y: 0, z: a.zf - s * (T / 2 + it.out) }, rotation: { yaw: (it.yaw ?? 0) + yawIn }, castShadow: true, receiveShadow: true, ...f,
        ...(it.m === "trash" || it.m === "mop" ? { physics: { body: "static", collider: "box" } } : {}), state: { name: it.one ? "One shoe" : it.m } }); }
    const note = D.notes[a.id];
    if (note) ctx.spawn(`l13d-note-${a.id}`, { feetPosition: { x: a.door.x + (a.open ? 0.84 : 0.1), y: 1.3, z: face - s * 0.05 }, rotation: { yaw: yawIn, roll: a.id === "a5" ? -7 : 4 }, castShadow: false,
      vector: svg(0.22, [110, 80], `<rect width='110' height='80' fill='#f4efd8'/><rect x='45' y='-4' width='20' height='10' fill='#d8d2b0' opacity='0.8'/>${note.map((l, i) => `<text x='55' y='${32 + i * 20}' text-anchor='middle' font-family='serif' font-size='${a.id === "a5" ? 15 : 12}' fill='${a.id === "a5" ? "#7a1a14" : "#2a2a3a"}'>${l}</text>`).join("")}`) });
  }
  // the drag: two dark scuffed streaks from mid-hall into flat a5's doorway, and one shoe left behind (in doors.a5)
  const l = APTS.find((x) => x.id === "a5");
  if (l) for (const [i, dx] of [[0, -0.18], [1, 0.16]]) {
    const z0 = l.zf - l.s * (HALL + 0.2), z1 = l.zf + l.s * 0.1;
    ctx.spawn(`l13d-drag-${i}`, { feetPosition: { x: l.door.x + 0.18 + dx + i * 0.05, y: 0.006, z: (z0 + z1) / 2 }, rotation: { pitch: -90, yaw: (i ? 3 : -4) }, castShadow: false, receiveShadow: true,
      primitive: { kind: "plane", width: 0.09, height: Math.abs(z1 - z0) }, material: { color: "oklch(0.24 0.03 50 / 0.55)", transparent: true, roughness: 1, depthWrite: false } });
  }
  // every open flat's doorway: a cased frame, and a real veneer leaf standing open on its hinge at the jamb (the plain slab stays hidden as the quest marker)
  for (const a of APTS) { if (!a.open) continue;
    ctx.spawn(`l13d-fr-${a.id}`, { feetPosition: { x: a.door.x, y: 0, z: a.zf }, rotation: { yaw: a.s < 0 ? 180 : 0 }, castShadow: false, receiveShadow: true, primitive: DOOR("frame", "flat", { d: T + 0.01 }), material: { pbr: true, roughness: 0.6 } });
    const slab = ctx.getObject(`l13-door-${a.id}`); if (slab) slab.visible = false;
    ctx.spawn(`l13d-leaf-${a.id}`, { feetPosition: { x: a.door.x - UNIT.doorW / 2 + 0.03, y: 0.004, z: a.zf + a.s * (T / 2 + 0.03) }, rotation: { yaw: a.s < 0 ? 78 : -78 }, castShadow: true, receiveShadow: true,
      primitive: DOOR("leaf", "flat", { swing: a.s }), material: { pbr: true, roughness: 0.55 }, physics: { body: "static", collider: "box" } });
  }
  // the way to Level 0 capping hall B: a framed door a shade too yellow, a lamp over it, its light under it, and the hum you know
  const ex = ctx.getObject("l13-exit-door"); if (ex) ex.visible = false;
  ctx.spawn("l13d-exit", { feetPosition: { x: EXIT0.x - 0.02, y: 0, z: EXIT0.z }, rotation: { yaw: 90 }, castShadow: false, receiveShadow: true, primitive: DOOR("set", "plain", { swing: 1, d: 0.14 }), material: { pbr: true, roughness: 0.7 } });
  ctx.spawn("l13d-exit-lamp", { feetPosition: { x: EXIT0.x - 0.4, y: 2.42, z: EXIT0.z }, light: { kind: "point", color: "oklch(0.92 0.12 98)", intensity: 0.55, distance: 4.5 } });
  ctx.spawn("l13d-exit-tube", { feetPosition: { x: EXIT0.x - 0.12, y: 2.3, z: EXIT0.z }, rotation: { pitch: 90 }, pivot: "center", castShadow: false, primitive: { kind: "capsule", radius: 0.022, halfHeight: 0.3 }, material: { color: "oklch(0.97 0.05 98)", emissive: "oklch(0.95 0.1 98)", emissiveIntensity: 1.6 } });
  ctx.spawn("l13d-exit-leak", { feetPosition: { x: EXIT0.x - 0.3, y: 0.004, z: EXIT0.z }, rotation: { pitch: -90 }, castShadow: false, primitive: { kind: "plane", width: 0.3, height: 0.9 },
    material: { color: "oklch(0.9 0.12 95 / 0.16)", transparent: true, depthWrite: false, emissive: "oklch(0.88 0.12 95)", emissiveIntensity: 0.5 } });
  ctx.spawn("l13d-exit-hum", { feetPosition: { x: EXIT0.x - 0.3, y: 1.2, z: EXIT0.z }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-fluorescent-light-hum-muffled-behind-a-door-loop.mp3", loop: true, gain: 0.22, spatial: true, maxDistance: 9 } });
  // the floors don't add up, and someone noticed: Floor 1 at the start, a pencilled note under the bend's FLOOR 283
  ctx.spawn("l13d-floor1", { feetPosition: { x: -37.6, y: 1.48, z: -HALL + 0.068 }, castShadow: false,
    vector: svg(0.6, [300, 100], `<rect x='2' y='2' width='296' height='96' rx='6' fill='#efe6cf' stroke='#8a6a3a' stroke-width='4'/><text x='150' y='48' text-anchor='middle' font-family='sans-serif' font-size='34' font-weight='bold' fill='#5a4430'>FLOOR 1</text><text x='150' y='82' text-anchor='middle' font-family='sans-serif' font-size='20' fill='#4a3b2c'>FLATS 101 – 110 →</text>`) });
  ctx.spawn("l13d-283-note", { feetPosition: { x: HALL - 0.076, y: 1.36, z: 8.14 }, rotation: { yaw: 90, roll: -3 }, castShadow: false,
    vector: svg(0.3, [150, 70], `<rect width='150' height='70' fill='#f4efd8'/><rect x='62' y='-4' width='26' height='10' fill='#d8d2b0' opacity='0.8'/><text x='75' y='30' text-anchor='middle' font-family='serif' font-size='13' fill='#2a2a3a'>Floor 1 was 20 steps ago.</text><text x='75' y='52' text-anchor='middle' font-family='serif' font-size='13' fill='#2a2a3a'>There are no stairs.</text>`) });
  const rad = fit("radiator");
  if (rad) D.radiators.forEach(([x, z, yaw], i) => ctx.spawn(`l13d-rad-${i}`, { feetPosition: { x, y: 0.08, z }, rotation: { yaw }, castShadow: true, physics: { body: "static", collider: "box" }, ...rad }));
}
