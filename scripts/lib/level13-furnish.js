// Level 13: furnish. places/level13/sim.js calls layFurnish(ctx) every 1 s tick; it lays one flat a tick behind its own
// version key (ctx.place.state.fv, progress in fvI) and returns fast after. Every id starts "l13f-".
// A flat is laid in its own frame: u = metres east of its west wall (0..8), v = metres in from the hall wall (0..9);
// facing is a (du, dv) direction. Mirroring by a.s puts backs to walls on both sides of a hall.
// Each lived-in flat also carries one story (level13.yml stories): a life that stopped mid-evening.
import { APTS, DINING, UNIT } from "./level13.js";
import L13 from "./data/level13.yml";
import { rollFridge } from "../l13-fridge.js";
const V = 6, M = L13.models, RANGE = { max: 42 };
const svg = (vb, w, body) => `<svg viewBox='${vb}' width='${w}m'>${body}</svg>`;
const STAIN = svg("0 0 100 100", 1.9, `<defs><radialGradient id='g'><stop offset='0' stop-color='#2a2012' stop-opacity='.55'/><stop offset='.7' stop-color='#3a2c18' stop-opacity='.4'/><stop offset='1' stop-color='#3a2c18' stop-opacity='0'/></radialGradient></defs><ellipse cx='46' cy='52' rx='40' ry='31' fill='url(#g)'/><ellipse cx='66' cy='38' rx='22' ry='17' fill='url(#g)'/><ellipse cx='30' cy='68' rx='15' ry='11' fill='url(#g)'/>`);
const DUST = svg("0 0 100 100", 3.4, `<defs><radialGradient id='d'><stop offset='0' stop-color='#d8d0bc' stop-opacity='.22'/><stop offset='1' stop-color='#d8d0bc' stop-opacity='0'/></radialGradient></defs><ellipse cx='30' cy='34' rx='26' ry='20' fill='url(#d)'/><ellipse cx='68' cy='58' rx='30' ry='24' fill='url(#d)'/><ellipse cx='40' cy='78' rx='22' ry='14' fill='url(#d)'/>`);
const DRAG = svg("0 0 40 200", 0.9, `<g fill='none' stroke-linecap='round'><path d='M12 196 C10 150 15 110 13 60 S 16 20 15 4' stroke='#1c150d' stroke-opacity='.5' stroke-width='5'/><path d='M27 198 C29 160 24 120 26 70 S 24 26 26 6' stroke='#1c150d' stroke-opacity='.45' stroke-width='4'/><path d='M19 190 C20 150 18 100 20 40' stroke='#2a2014' stroke-opacity='.25' stroke-width='9'/><path d='M8 150 C7 130 9 120 8 100' stroke='#1c150d' stroke-opacity='.35' stroke-width='2'/><path d='M32 120 C33 100 31 80 32 66' stroke='#1c150d' stroke-opacity='.35' stroke-width='2'/></g>`);
const WATER = svg("0 0 100 100", 1.7, `<defs><radialGradient id='w'><stop offset='0' stop-color='#5b6f78' stop-opacity='.5'/><stop offset='.75' stop-color='#4a5a60' stop-opacity='.38'/><stop offset='1' stop-color='#4a5a60' stop-opacity='0'/></radialGradient></defs><ellipse cx='50' cy='40' rx='44' ry='26' fill='url(#w)'/><ellipse cx='38' cy='66' rx='24' ry='20' fill='url(#w)'/><ellipse cx='70' cy='74' rx='12' ry='9' fill='url(#w)'/>`);
const MAIL = svg("0 0 120 90", 0.85, `<g stroke='#8c8674' stroke-width='.6'><g transform='rotate(-14 40 40)'><rect x='14' y='26' width='46' height='28' fill='#e9e3cf'/><path d='M14 26 L37 42 L60 26' fill='none'/></g><g transform='rotate(22 80 40)'><rect x='56' y='22' width='46' height='28' fill='#d9d0b4'/><rect x='62' y='34' width='18' height='8' fill='#f4f1e6'/></g><g transform='rotate(-4 60 62)'><rect x='36' y='46' width='50' height='30' fill='#efe9d8'/><path d='M36 46 L61 63 L86 46' fill='none'/><rect x='74' y='49' width='8' height='9' fill='#a85a4a'/></g><g transform='rotate(38 30 66)'><rect x='8' y='54' width='44' height='26' fill='#cfd6d8'/></g><g transform='rotate(-30 92 68)'><rect x='70' y='56' width='44' height='26' fill='#e4dcc0'/><rect x='76' y='66' width='20' height='7' fill='#f4f1e6'/></g></g>`);
const DRAWING = svg("0 0 80 100", 0.21, `<rect x='2' y='2' width='76' height='96' fill='#f3efe2' stroke='#b9b29c' stroke-width='.8'/><rect x='30' y='0' width='20' height='7' fill='#d9d2b0' fill-opacity='.85'/><g fill='none' stroke-linecap='round' stroke-width='2.4'><circle cx='62' cy='22' r='8' stroke='#e2a52a'/><path d='M62 8 V4 M74 22 H78 M52 12 L49 9 M72 12 L75 9' stroke='#e2a52a'/><path d='M14 62 H44 V88 H14 Z M12 62 L29 46 L46 62' stroke='#b0503c'/><path d='M26 88 V74 H33 V88' stroke='#6b4a2e'/><path d='M4 90 H76' stroke='#5a8a46'/><circle cx='56' cy='62' r='4' stroke='#3a4f8a'/><path d='M56 66 V80 M50 71 H62 M56 80 L51 89 M56 80 L61 89' stroke='#3a4f8a'/><circle cx='68' cy='68' r='3' stroke='#8a3a6a'/><path d='M68 71 V81 M64 75 H72 M68 81 L65 88 M68 81 L71 88' stroke='#8a3a6a'/></g>`);

const RUG = svg("0 0 240 160", 2.4, `<ellipse cx='120' cy='80' rx='116' ry='76' fill='#6f6a4c'/><g fill='none' stroke-width='5'><ellipse cx='120' cy='80' rx='108' ry='68' stroke='#8a8361'/><ellipse cx='120' cy='80' rx='94' ry='56' stroke='#5c5a44'/><ellipse cx='120' cy='80' rx='80' ry='45' stroke='#a39a76'/><ellipse cx='120' cy='80' rx='66' ry='34' stroke='#6a6850'/><ellipse cx='120' cy='80' rx='52' ry='24' stroke='#8a8361'/><ellipse cx='120' cy='80' rx='38' ry='15' stroke='#5c5a44'/></g><ellipse cx='120' cy='80' rx='26' ry='8' fill='#a39a76'/>`);
const yawOf = (fx, fz) => (Math.atan2(-fx, -fz) * 180) / Math.PI;
function layFlat(ctx, a) {
  const K = a.kind, pre = `l13f-${a.id}-`, story = L13.stories?.[a.id];
  const at = (u, v) => ({ x: a.x0 + u, z: a.zf + a.s * v });
  const yw = (du, dv) => yawOf(du, a.s * dv);
  // a model standing at (u, v), its front toward (du, dv)
  const put = (n, key, u, v, du, dv, o = {}) => {
    const m = M[key]; if (!m) return null;
    const [w, h, d] = m.size, p = at(u, v);
    return ctx.spawn(pre + n, { feetPosition: { x: p.x, y: 0.012 + (o.y ?? 0), z: p.z }, rotation: { yaw: yw(du, dv) + (o.turn ?? 0), ...(o.pitch ? { pitch: o.pitch } : {}) }, ...(o.pivot ? { pivot: o.pivot } : {}),
      model: { id: m.id, ...(m.forward ? { forward: m.forward } : {}) }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } },
      visibleRange: RANGE, castShadow: o.solid !== false, ...(o.solid === false ? {} : { physics: { body: "static", collider: "box" } }), ...(o.extra ?? {}) });
  };
  const flat = (n, art, u, v, turn = 0) => { const p = at(u, v); ctx.spawn(pre + n, { feetPosition: { x: p.x, y: 0.016, z: p.z }, rotation: { pitch: -90, yaw: turn }, vector: art, visibleRange: { max: 25 }, castShadow: false }); };

  // ---- television: west wall, facing the room. Its screen and glow are one more object on its face.
  const tvU = 0.42, tvV = a.id === "b2" ? 3.7 : K === "tenant" ? 3.4 : K === "chess" ? 1.55 : 2.6, T = L13.tv, yawTv = (yw(1, 0) * Math.PI) / 180, [sx, sy, sz] = T.screenAt, tp = at(tvU, tvV);
  put("tv", "tv", tvU, tvV, 1, 0, { extra: { tags: ["usable", "l13-tv"], behavior: "scripts/l13-tv.js", state: { name: "Television", verb: "Watch", kind: "tv13", flat: a.id, line: L13.tvLines[K] ?? L13.tvLines.resident },
    audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-muffled-old-television-broadcast-through-wall-loop.mp3", gain: T.gain, loop: true, spatial: true, maxDistance: T.maxDistance } } });
  ctx.spawn(pre + "tvs", { feetPosition: { x: tp.x + sx * Math.cos(yawTv) + sz * Math.sin(yawTv), y: 0.012 + sy, z: tp.z - sx * Math.sin(yawTv) + sz * Math.cos(yawTv) }, rotation: { yaw: yw(1, 0) }, pivot: "center",
    primitive: { kind: "plane", width: T.screen[0], height: T.screen[1] }, material: { kind: "scripted", script: "scripts/mat-l13-static.js", emissive: "oklch(0.8 0.05 240)", emissiveIntensity: 1 },
    light: { kind: "point", color: "oklch(0.78 0.08 245)", intensity: T.light, distance: T.lightDistance }, visibleRange: RANGE, castShadow: false });

  // ---- kitchen: counter and fridge on the east wall, far from the doorway (lurk's flat is stripped)
  if (K !== "lurk") {
    put("counter", "counter", 7.55, 1.59, -1, 0);
    const lp = at(7.05, 3.35);
    const lamp = ctx.spawn(pre + "fl", { feetPosition: { x: lp.x, y: 1.15, z: lp.z }, light: { kind: "point", color: "oklch(0.95 0.04 95)", intensity: 0, distance: 3 } });
    put("fridge", "fridge", 7.6, 3.35, -1, 0, { extra: { tags: ["container", "usable", "l13-fridge"], behavior: "scripts/l13-fridge.js", state: { name: "Fridge", verb: "Open", kind: "fridge13", items: rollFridge(ctx), lamp } } });
  }
  const lived = K !== "lurk" && K !== "empty", tenant = K === "tenant";
  if (lived) {
    const tu = tenant ? 5.96 : DINING.u, tv = tenant ? 0.93 : DINING.v, top = L13.tops;
    // The dining mesh includes two chairs; the table itself sits off-centre.
    if (K !== "chess") put("table", "dining", tu, tv, 0, 1);
    const tabletop = tu + a.s * 0.22;
    // Keep the middle of the flat open from the entrance to the bedroom.
    if (a.id !== "b2") {
      const v = K === "chess" ? 1.55 : tenant ? 0.75 : 2.35;
      put("sofa", "sofa", 3.86, v, tenant ? -0.15 : -1, tenant ? 1 : 0);
      if (!tenant) flat("rug", RUG, 2.05, (tvV + v) / 2, 0);
    } else {
      flat("rug", RUG, 1.85, tvV, 0);
    }
    if (tenant) {
      put("dish1", "dishes", 7.46, 1.08, -1, 0, { y: top.counter, solid: false });
      put("dish2", "dishes", tabletop, tv + 0.23, 1, 0.4, { y: top.table, solid: false });
      put("can1", "can", 7.54, 2.38, 1, 0, { y: top.counter, solid: false });
      put("can2", "can", tu - a.s * 0.10, tv + 0.20, 0, 1, { y: top.table, solid: false });
    } else {
      if (story !== "latenight") put("plant", "plant", 0.5, 4.45, 1, 0);
      put("pic", "photos", 4.02, 0.14, 0, 1, { y: 1.34, solid: false });
    }
    put("mug", "mug", 7.45, 2.17, -1, 0.3, { y: top.counter, solid: false });
    put("coats", "coats", UNIT.doorX + 1.08, 0.26, 0, 1, { y: 0.94, solid: false });
    if (story === "dinner") {
      put("st1", "dishes", tabletop, tv + 0.23, 0, 1, { y: top.table, solid: false });
      put("st2", "can", tu - a.s * 0.10, tv + 0.20, 0, 1, { y: top.table, solid: false });
    }
    if (story === "suitcase") {
      put("st1", "suitcase", 0.64, 0.48, 0, 1);
      flat("st2", MAIL, 0.88, 0.91, 10);
    }
    if (story === "drawing") {
      const p = at(7.6 - M.fridge.size[2] / 2 - 0.012, 3.35);
      ctx.spawn(pre + "st1", { feetPosition: { x: p.x, y: 1.2, z: p.z }, rotation: { yaw: yw(-1, 0), roll: 4 }, vector: DRAWING, visibleRange: { max: 20 }, castShadow: false });
    }
    if (story === "mail") {
      const p = at(tabletop, tv + 0.22);
      ctx.spawn(pre + "st1", { feetPosition: { ...p, y: top.table + 0.018 }, rotation: { pitch: -90, yaw: 14 }, vector: MAIL.replace("0.85m", "0.53m"), visibleRange: RANGE, castShadow: false });
    }
    if (story === "bath") {
      put("st3", "towel", 5.43, 7.55, 1, 0.5, { solid: false });
      flat("st1", WATER, 6.2, 7.5, 0);
    }
    if (story === "latenight") {
      put("st1", "can", tu - 0.04, tv + 0.2, 0, 1, { y: top.table, solid: false });
    }
  }
  if (K === "empty") { flat("stain", STAIN, 3.9, 2.4, 20); flat("dust", DUST, 5.2, 3.3, 70); }
  if (K === "lurk") { flat("drag", DRAG, 2.3, 3.2, 0); flat("drag2", DRAG, 2.35, 6.4, 180); }

  // ---- bedroom: bed with its head on the back wall, a lamp beside it
  if (K !== "empty") {
    put("bed", "bed", 3.54, 7.88, 0, -1);
    put("lamp", "lamp", 2.43, 8.57, 0, -1, { solid: false, extra: K === "lurk" ? {} : { children: [{ feetPosition: { x: 0, y: 0.85, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.09 75)", intensity: 1.1, distance: 4.5 } }] } });
  }
  // ---- bathroom: tub along the back wall, toilet on the east wall
  put("tub", "tub", 6.23, 8.46, 1, 0);
  put("toilet", "toilet", 7.58, 6.3, -1, 0);
}

import { kitPass } from "./usable-kit.js";
export function layFurnish(ctx) {
  if (ctx.place.players?.length) kitPass(ctx, "level13");
  const st = ctx.place.state;
  if (st.fv === V) {
    if (st.bedUseV !== V) {
      for (const a of APTS) {
        if (!a.open || ["lurk", "empty", "tenant"].includes(a.kind)) continue;
        const bed = ctx.getObject(`l13f-${a.id}-bed`);
        if (!bed) continue;
        bed.tags = [...new Set([...(bed.tags ?? []), "usable"])];
        bed.behavior = ["scripts/field-fixture.js"];
        Object.assign(bed.state, { kind: "field-rest", name: "Apartment bed", verb: "Rest", info: "A brief rest. Lingering in a flat still slows you down." });
      }
      st.bedUseV = V;
    }
    return;
  }
  const open = APTS.filter((a) => a.open);
  if (st.fvV !== V) { for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("l13f-") && !id.includes("/")) ctx.destroy(id); st.fvV = V; st.fvI = 0; return; }
  const i = st.fvI ?? 0;
  if (i >= open.length) { st.fv = V; return; }
  layFlat(ctx, open[i]); st.fvI = i + 1;
}
