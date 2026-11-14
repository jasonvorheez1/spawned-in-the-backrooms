// Level 109's staffed rooms and its quest props. buildOutpost(ctx, R) is called by buildRoom (scripts/lib/l109-rooms.js) for
// R.type "doctors" | "or_active" | "icu_active" | "breach". Same R as there. Return true when it dressed the room.
// Numbers live in data/l109-outpost.yml.
import C from "./data/l109-outpost.yml";
import { LRUN_MODELS as M } from "./levelrun-dress.js";
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { setDoor } from "./containment.js";
import { workbenchSpec, ammobenchSpec } from "./benches.js";
const fit = (hx, y1, hz) => ({ box: { min: { x: -hx, y: 0, z: -hz }, max: { x: hx, y: y1, z: hz } } });
// fitted models at true scale (metres): half width x, height, half depth
const PROP = { gurney: [0.4, 0.95, 1.0], crashcart: [0.35, 1.0, 0.3], kettle: [0.1, 0.24, 0.1], megcrate: [0.5, 0.6, 0.35], sofa: [0.45, 0.85, 0.45], lamp: [0.2, 1.6, 0.2], barrier: [0.9, 1.05, 0.15], wheelchair: [0.32, 0.95, 0.45], extinguisher: [0.1, 0.5, 0.1] };
function prop(R, key, kind, a, b, yaw = 0, up = 0, solid = true) { const [x, y, z] = PROP[kind];
  return R.sp(key, { feetPosition: R.at(a, b, up), rotation: { yaw: R.yawIn + yaw }, model: M[kind], layout: fit(x, y, z), ...(solid ? { physics: { body: "static", collider: "box" } } : {}), castShadow: false }); }
function lights(R, n) { C.lights.spots.slice(0, n).forEach(([a, b], i) => R.sp("lt" + i, { feetPosition: R.at(a, b, C.lights.height), light: { kind: "point", color: C.lights.color, intensity: C.lights.intensity, distance: C.lights.distance } })); }
function person(R, g) {
  const f = R.at(g.a, g.b, 0.05), route = (g.route ?? []).map(([a, b]) => R.at(a, b, 0));
  const spec = critterSpec(npcLook(`l109-${R.id}-${g.key}`, null, g.faction, 8, g.role));
  return R.sp(g.key, { ...spec, tags: [...new Set([...(spec.tags ?? []), "npc", "l109-npc"])], feetPosition: f, rotation: { yaw: R.yawIn + (g.yaw ?? 0) },
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { ...(spec.state ?? {}), name: g.name, role: g.role, faction: g.faction, dlg: g.dlg, home: f, post: f, ...(route.length ? { route, routine: route.map((p) => ({ ...p, dwell: 6 })) } : {}) } });
}
function patient(R, a, b, name) { // lying still on a gurney
  prop(R, "pbed", "gurney", a, b, 90);
  const spec = critterSpec(npcLook(`l109-${R.id}-patient`, null, "survivors", 3, "patient"));
  R.sp("patient", { ...spec, tags: [...new Set([...(spec.tags ?? []), "npc"])], feetPosition: R.at(a, b + 0.9, 0.95), rotation: { yaw: R.yawIn + 180, pitch: -90 }, state: { ...(spec.state ?? {}), name, dlg: "l109-patient", role: "patient", lying: true } });
}
function board(R) { // whiteboard of checked rooms
  const t = (y, c, s, txt) => `<text x='14' y='${y}' font-family='sans-serif' font-size='${s}' fill='${c}'>${txt}</text>`;
  R.sp("board", { feetPosition: R.at(14.85, 18, 1.5), rotation: { yaw: R.yawIn - 90 }, vector: `<svg viewBox='0 0 300 140' width='2.4m'><rect width='300' height='140' rx='4' fill='#f4f4ee' stroke='#9a9a94' stroke-width='4'/>${t(26, "#1d6b2f", 16, "SAFE")}${t(48, "#333", 13, "ns0_n1p  ew0_13m  ew0_14m  ew0_13p")}${t(80, "#b0201c", 16, "DO NOT OPEN")}${t(102, "#333", 13, "ns0_0m  ew0_6p (OPEN!!)  ew0_9m")}${t(128, "#555", 11, "if it knocks, it is not a patient. H.")}</svg>` });
}
export function buildOutpost(ctx, R) {
  if (R.type === "doctors") {
    lights(R, C.lights.extra.doctors); // the room's own 4 troffers already burn: 6 lights total
    prop(R, "desk0", "barrier", -10.5, 3.2); prop(R, "desk1", "crashcart", -12, 3.4); // reception by the door
    [[-6, 9], [-6, 17], [-2, 9], [-2, 17]].forEach(([a, b], i) => prop(R, "bed" + i, "gurney", a, b, 90)); // triage, 4 beds
    prop(R, "cart0", "crashcart", -4, 13); prop(R, "wc0", "wheelchair", -8.5, 7, 30);
    [[10, 4], [11.2, 4], [12.4, 4], [10, 4], [11.2, 4]].forEach(([a, b], i) => prop(R, "cage" + i, "megcrate", a, b, 0, i > 2 ? 0.6 : 0)); // supply cage
    prop(R, "cagefence", "barrier", 11.2, 5.2);
    R.sp("workbench", workbenchSpec(R.at(6.4, 1.0, 0), { yaw: R.yawIn, name: "Doctors' Outpost Workbench" }));
    R.sp("ammobench", ammobenchSpec(R.at(8.8, 1.0, 0), { yaw: R.yawIn, name: "Doctors' Outpost Reloading Bench" }));
    prop(R, "chair0", "sofa", 11, 22, 180); prop(R, "chair1", "sofa", 12.5, 22, 180); prop(R, "kcart", "crashcart", 12.4, 24.2); prop(R, "kettle0", "kettle", 12.4, 24.2, 0, 1.0, false);
    prop(R, "lamp0", "lamp", 13.8, 23.5); prop(R, "ext0", "extinguisher", -14.6, 1.2);
    board(R);
    for (const g of C.people) person(R, g);
    const h = C.people.find((g) => g.key === "halloran");
    ctx.place.state.l109geo = { ...(ctx.place.state.l109geo ?? {}), halloran: R.at(h.a, h.b, 0) };
    return true;
  }
  if (R.type === "or_active" || R.type === "icu_active") {
    const or = R.type === "or_active";
    lights(R, C.lights.extra.ward);
    patient(R, 0, 12, or ? "Patient, bed one" : "Patient, bay two");
    prop(R, "cart", "crashcart", 2, 12); prop(R, "lamp", "lamp", -2, 12);
    if (!or) { prop(R, "b1", "gurney", 6, 12, 90); prop(R, "b2", "gurney", -6, 12, 90); }
    person(R, { key: "doc", name: or ? "Dr. Imani" : "Dr. Brandt", dlg: "l109-doctor", role: "medic", faction: "doctors", a: 2, b: 14, yaw: 180, route: [[2, 14], [-3, 14], [-3, 10]] });
    return true;
  }
  if (R.type === "breach") {
    if (!ctx.place.state.l109breachSet) { ctx.place.state.l109breachSet = 1; setDoor(ctx, R.id, true); const d = ctx.getObject("l109d-" + R.id); if (d?.state) { d.state.open = true; d.state.verb = "Close Door"; } } // opened once, by the wanderer; only a player shuts it
    lights(R, C.lights.extra.breach);
    prop(R, "pack", "megcrate", 3, 10, 25); prop(R, "wc", "wheelchair", -4, 16, 160); // the wanderer's dropped pack
    const note = R.at(3.8, 10.8, 0);
    R.sp("note", { feetPosition: { ...note, y: note.y + 0.62 }, rotation: { yaw: R.yawIn + 15, pitch: -90 }, tags: ["l109-note"],
      vector: `<svg viewBox='0 0 60 80' width='0.21m'><rect width='60' height='80' fill='#f2eedd'/><text x='5' y='14' font-family='serif' font-size='6' fill='#333'>Sorry. I heard</text><text x='5' y='24' font-family='serif' font-size='6' fill='#333'>someone crying.</text><text x='5' y='34' font-family='serif' font-size='6' fill='#333'>It wasn't someone.</text><text x='5' y='48' font-family='serif' font-size='6' fill='#333'>M.</text></svg>` });
    ctx.place.state.l109geo = { ...(ctx.place.state.l109geo ?? {}), breachDoor: R.at(-8, -1.5, 0), note, box: R.info.box };
    return true;
  }
  return false;
}
