// Level 13: dressing. places/level13/sim.js calls layDress(ctx) every 1 s tick; it lays its pieces once (own version key) and returns fast after.
// The hall as people left it: wall lamps between doors, radiators, what was left at each door, notes, and the drag marks into the lurker's flat. Ids l13d-*.
import { APTS, H, HALL, T, UNIT } from "./level13.js";
import D from "./data/l13-dress.yml";
const DV = 1;
const fit = (k) => { const m = D.models[k]; if (!m?.model) return null; const [w, h, d] = m.size; return { model: { id: m.model }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } } }; };
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
    if (sc) ctx.spawn(`l13d-sc-${a.id}`, { feetPosition: { x: sx, y: 1.7, z: face - s * 0.09 }, rotation: { yaw: yawIn }, castShadow: false, ...sc });
    if (a.k % 2 === 0) ctx.spawn(`l13d-scl-${a.id}`, { feetPosition: { x: sx, y: 1.85, z: face - s * 0.3 }, light: { kind: "point", color: "oklch(0.85 0.09 70)", intensity: a.id === "a5" ? 0.15 : 0.45, distance: 4.5 } });
    // a shut flat: the Tripo door and frame over the plain slab (the slab stays, unseen, for its name and its collider)
    const dm = !a.open && fit("door");
    if (dm) { const slab = ctx.getObject(`l13-shut-${a.id}`); if (slab) slab.visible = false;
      ctx.spawn(`l13d-door-${a.id}`, { feetPosition: { x: a.door.x, y: 0, z: face - s * 0.01 }, rotation: { yaw: yawIn }, castShadow: false, receiveShadow: true, ...dm }); }
    // what was left outside
    for (const it of D.doors[a.id] ?? []) { const f = fit(it.m); if (!f) continue;
      ctx.spawn(`l13d-${a.id}-${n++}`, { feetPosition: { x: a.door.x + it.dx, y: 0, z: a.zf - s * (T / 2 + it.out) }, rotation: { yaw: (it.yaw ?? 0) + yawIn }, castShadow: true, receiveShadow: true, ...f,
        ...(it.m === "trash" || it.m === "mop" ? { physics: { body: "static", collider: "box" } } : {}), state: { name: it.one ? "One shoe" : it.m } }); }
    const note = D.notes[a.id];
    if (note) ctx.spawn(`l13d-note-${a.id}`, { feetPosition: { x: a.door.x + 0.1, y: 1.3, z: face - s * 0.05 }, rotation: { yaw: yawIn, roll: a.id === "a5" ? -7 : 4 }, castShadow: false,
      vector: svg(0.22, [110, 80], `<rect width='110' height='80' fill='#f4efd8'/><rect x='45' y='-4' width='20' height='10' fill='#d8d2b0' opacity='0.8'/>${note.map((l, i) => `<text x='55' y='${32 + i * 20}' text-anchor='middle' font-family='serif' font-size='${a.id === "a5" ? 15 : 12}' fill='${a.id === "a5" ? "#7a1a14" : "#2a2a3a"}'>${l}</text>`).join("")}`) });
  }
  // the drag: two dark scuffed streaks from mid-hall into flat a5's doorway, and one shoe left behind (in doors.a5)
  const l = APTS.find((x) => x.id === "a5");
  if (l) for (const [i, dx] of [[0, -0.18], [1, 0.16]]) {
    const z0 = l.zf - l.s * (HALL + 0.6), z1 = l.zf + l.s * 1.6;
    ctx.spawn(`l13d-drag-${i}`, { feetPosition: { x: l.door.x + dx + i * 0.05, y: 0.006, z: (z0 + z1) / 2 }, rotation: { pitch: -90, yaw: (i ? 3 : -4) }, castShadow: false, receiveShadow: true,
      primitive: { kind: "plane", width: 0.09, height: Math.abs(z1 - z0) }, material: { color: "oklch(0.24 0.03 50 / 0.55)", transparent: true, roughness: 1, depthWrite: false } });
  }
  const rad = fit("radiator");
  if (rad) D.radiators.forEach(([x, z, yaw], i) => ctx.spawn(`l13d-rad-${i}`, { feetPosition: { x, y: 0.08, z }, rotation: { yaw }, castShadow: true, physics: { body: "static", collider: "box" }, ...rad }));
}
