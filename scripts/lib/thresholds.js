// The ways between levels, dressed (Nov 11): what wanderers, M.E.G. and B.N.T.G. leave at a threshold they know.
// Every place's sim calls dressThresholds(ctx) each tick; it lays once per room (place.state.thrV), a few seconds in,
// when the place's colliders stand. It finds every door the level has (scripts/level-door.js and the other crossing
// scripts), works out which way is "into the level" (the arrival marker just inside it, else the most open side),
// and puts a kit, a readable note, a marker and footprints around it. Every piece is walk-through and probed: a
// floor ray under it and a clear line from the doorway, so nothing stands in a wall or hangs over a drop.
// The words are things people left, not instructions: a slip, a tag, a list.
import { raycast } from "builtin/physics";
const V = 7;
const GEO = "scripts/threshold-geo.js";
const DOOR_SCRIPTS = /level-door|zenith-hatch|l27-use|level12-use|home11-door/;
const CHALK = "#d9d4c4", INK = "#2b2b2e";
// one row per door: k kit, who left it (meg | bntg | wanderer), the marker words, the note; to: the place it opens on, when its state doesn't say
// kits: cache (bag + bottles), cones (tape across), shrine (candles), lantern, litter; road: a roadside sign instead
const DOORS = {
  // Level 0
  "l0-zenith": { to: "level01", k: "litter", who: "bntg", mark: "B.N.T.G. · CARD", note: ["Torn chit", "ZENITH ACCESS · 1 PERSON · NON-TRANSFERABLE\nPaid: 6 almond, 1 battery\nIssued by: K.", "half a stamp, the rest torn off"] },
  "l0-exit": { to: "level1", k: "shrine", who: "wanderer", mark: "it's thinner here", prints: "in", note: ["Receipt", "Dale, 4th.\nhe didn't open anything\nhe just kept walking", "pencil, pressed hard enough to tear"] },
  // Level 1
  "l1-back": { k: "cache", who: "meg", mark: "← 0", plate: "WAYPOINT ALPHA-1|130 m E", note: ["Arrival card", "M.E.G. · LEVEL 1\nCamp: east, past the corridor blocks.\nGreen EXIT signs: no hounds.\nLights out: stop.\n\nunderneath, in biro: they hear you run", "laminated, one corner chewed"], almond: 1 },
  "l1-drop": { k: "carpet", who: "meg", plate: "ARRIVALS|ALPHA-1 NE", note: ["Arrival card", "M.E.G. · LEVEL 1\nThe carpet came down with you. Leave it.\nCamp: north-east.", "taped to the concrete, damp at the edges"] },
  "l1-onward": { k: "cones", who: "meg", mark: "2 ▶", plate: "LEVEL 2|HEAT · WATER", note: ["Tag on a cone", "TEMP AT DOOR 31°C\nTEMP 200 m IN 44°C\n3 L per person, minimum\nC.", "zip-tied, the marker gone brown"] },
  // Level 2
  "l2-back": { k: "litter", who: "wanderer", mark: "1 ← cold", prints: "out", note: ["Cigarette carton", "cold under this one. car park smell.", "torn along the fold"] },
  "l2-to-l3": { k: "cones", who: "meg", mark: "3 ▶", plate: "LEVEL 3|LIVE · DO NOT TOUCH", note: ["Hazard tag", "SEAL 2-3\nAll cable live. Standing water live.\nRubber soles.", "a scorch mark across the bottom"] },
  "l2-to-l21": { k: "lantern", who: "wanderer", mark: "2.1 ↑", note: ["Note under a pipe clamp", "white halls up here. dry. every door locked.\nsaltines in the lockers. bring a pin", "dry, the only dry thing for a mile"] },
  // Level 2.1
  "l21-down": { k: "litter", who: "wanderer", mark: "↓ 2", prints: "out", note: ["Sandwich bag", "hot down there", "grease-smeared"] },
  "l21-cave": { k: "lantern", who: "meg", mark: "8 ▶", plate: "LEVEL 8|ROPE · 2 LIGHTS · QUIET", note: ["Route card", "Hall ends in rock.\nTeam 4 shouted at the first fork.\nTeam 4 did not report back.", "laminated, grit in the crease"] },
  // Level 3
  "l3-back": { k: "litter", who: "wanderer", mark: "← 2", prints: "out", note: ["Matchbook", "pipes. hot. nothing in there that sparks", "three matches left"] },
  "l3-gamma-door": { k: "cones", who: "meg", mark: "GAMMA", note: ["Posted notice", "M.E.G. BASE GAMMA\nKnock once. Wait for the plate.\nWeapons holstered past the wall.", "nailed up, the nail rusted through"] },
  "l3-lift": { k: "cache", who: "wanderer", mark: "↑ 4", note: ["Post-it", "UP = offices\ncooler on the left works\nleave before the 3rd flicker", "stuck to the call button"] },
  "l3-lift5": { k: "shrine", who: "wanderer", mark: "↓ 5", note: ["Hotel stationery", "Room 1123 never came down.\nNot past 12. K.", "folded small, an embossed crest"] },
  // Base Gamma
  "gamma-out": { k: "cones", who: "meg", mark: "EXIT", note: ["Sign-out sheet", "OUT 06:10 Reyes, back 09:00\nOUT 06:40 Holt, back 08:00\nOUT 07:15 Okafor, back", "on a clipboard, the pen still on its string"] },
  // Level 4
  "l4-fun-poster/child-0": { to: "level26", k: "shrine", who: "wanderer", mark: "DON'T", note: ["Flyer", "Marcy touched it.\nSomeone saw her on a ship after. Waving.\nShe was smiling. =)", "the smile is in a different pen"] },
  "l4-lift-door": { k: "litter", who: "wanderer", mark: "↓ 3", note: ["Post-it", "rubber soles", "curled"] },
  "l4-stairs-down": { k: "cache", who: "wanderer", mark: "↓ 5", note: ["Business card", "THE HOTEL · RING FOR SERVICE\n\non the back: not the boiler", "cream card, gold edge"] },
  // Level 5
  "l5-lift3": { k: "litter", who: "wanderer", mark: "↓ 3", note: ["Room service slip", "ORDER: water ×4\nDELIVER TO: lift\nNOTE: it hums louder down there", "the hotel's own pad"] },
  "l5-stairs-up": { k: "litter", who: "wanderer", mark: "↑ 4", note: ["Room service slip", "ORDER: nothing\nNOTE: offices up there. empty. phone works.", "the hotel's own pad"] },
  "l5-to-l6": { k: "shrine", who: "wanderer", mark: "no light", plate: "LEVEL 6|NO LIGHT", note: ["Guest card", "for Bea\none torch\none battery", "hand-printed, propped against a candle"] },
  // Level 6
  "l6-back": { k: "lantern", who: "wanderer", mark: "↑ warm", note: ["Sandwich bag", "this door's warm", "a fingerprint in soot"] },
  "l6-to-l7": { k: "litter", who: "wanderer", mark: "soft", note: ["Wet note", "floor gives here\nwaves under it\ndidn't jump", "the ink has run"] },
  "l6-to-l61": { k: "litter", who: "wanderer", mark: "fries?", note: ["Napkin", "smells like a burger place under the floor\nwhy", "grease spots"] },
  // Level 6.1
  "l61-to-l6": { k: "litter", who: "wanderer", mark: "← dark", note: ["Ketchup sachet", "BRING A LIGHT", "written on in ketchup"] },
  "l61-to-l11": { k: "cache", who: "wanderer", mark: "city →", note: ["Receipt", "1 × coffee 1 × pie\nPAID IN FULL\n\nstreet out the back. counted 40 before they started repeating", "from a diner that isn't here"] },
  "l61-vent-in": { k: "litter", who: "wanderer", mark: "vent", note: ["Napkin", "it pulls. came out by pipes, all humming", "sucked flat against the grille"] },
  // Level 7
  "l7-back": { k: "lantern", who: "wanderer", mark: "↑ dark", note: ["Postcard", "Wish you were here.\n\nscratched out. under it: top of the stairs. still better than the water", "a beach, water-stained"] },
  // Level 8
  "l8-lake-back": { k: "lantern", who: "meg", mark: "7 ▶", plate: "LEVEL 7|NO SWIMMING", note: ["Route card", "Lake connects to 7.\nDepth: not measured.\nDiver's line found cut at 30 m.", "laminated, still wet"] },
  "l8-to-l21": { k: "litter", who: "meg", mark: "← 2.1", note: ["Route card", "Tunnel to 2.1. Dry. Rated: SLEEP.", "a coffee ring on it"] },
  // Level 10
  "l10-fun-poster/child-0": { to: "level26", k: "shrine", who: "wanderer", mark: "DON'T", note: ["Feed-bag paper", "took it down tuesday\nit's back", "rain-soft"] },
  "l10-road-north": { k: "road", who: "meg", plate: "LEVEL 11|CITY", note: ["Atlas page", "Route 10-11. Corn ends, concrete starts.\npencilled in: lights on, nobody home", "torn from a road atlas of nowhere"] },
  "l10-road-south": { k: "road", who: "meg", plate: "LEVEL 11|CITY", note: ["Atlas page", "Route 10-11, south loop.\nAll roads: city.", "torn from a road atlas of nowhere"] },
  // Level 11
  "l11-to-l61": { k: "litter", who: "wanderer", mark: "snacks ↘", note: ["Receipt", "1 × fries\nthey moved", "diner paper, grease through"] },
  "lv10-backroad": { k: "road", who: "meg", plate: "LEVEL 10|BARN · WATER", note: ["Atlas page", "Route 11-10. Corn. Rain.\nBarn: water.\nLake: shallow end only.", "torn from a road atlas of nowhere"] },
  // Level 184
  "l184-back": { k: "lantern", who: "wanderer", mark: "corn →", note: ["Child's drawing", "a fort, a sun, a door\nan arrow from the door to some corn", "crayon"] },
  // Level 26
  "l26-exit": { k: "litter", who: "wanderer", mark: "OFF", note: ["Party invitation", "YOU'RE INVITED! =)", "the =) scratched out so hard the card tore"] },
  // Level 27
  "l27-exit": { k: "lantern", who: "wanderer", mark: "back", note: ["Soggy note", "drink first", "barely holding together"] },
  // home, Level 0.1, Level 12
  "h-door": { to: "level11", k: "litter", who: "wanderer", note: ["Shopping list", "keys\nwater\nbatteries\nLOCK IT", "your own handwriting"] },
  "l01-back": { k: "cones", who: "bntg", mark: "← 0", note: ["Exit slip", "ZENITH · OUT\nCard stays valid.", "B.N.T.G. carbon copy"] },
  "l12-door": { k: "candles", who: "wanderer", note: ["Note under the chair", "sat. tried. copy door. waited.\n59 min: locked\n61 min: locked\n60", "the last line stops"] },
};
const KIT = { cache: "bag", cones: "cones", shrine: "candles", lantern: "lantern", litter: "litter", carpet: "carpet", candles: "candles" };
const KEY = (id) => "thr-" + String(id).replace(/[^a-z0-9-]/gi, "_");
const esc = (t) => String(t).replace(/[&<>']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;" })[c]);
// floor chalk or spray, read from inside the level looking toward the door
const chalkSvg = (t, who) => { const ink = who === "meg" ? "#b6e04a" : who === "bntg" ? "#e2a03a" : CHALK, fs = t.length > 18 ? 22 : 30;
  return `<svg viewBox='0 0 300 90' width='1.3m'><g transform='rotate(-2 150 45)'><text x='150' y='56' text-anchor='middle' font-family='${who === "wanderer" ? "cursive, serif" : "sans-serif"}' font-weight='${who === "wanderer" ? 400 : 900}' font-size='${fs}' fill='${ink}' fill-opacity='0.72'>${esc(t)}</text></g></svg>`; };
// the plate on a stake: two lines, the agency's look
const plateSvg = (t, who) => { const [a, b = ""] = t.split("|"), bg = who === "bntg" ? "#2c2416" : "#1d2a10", fg = who === "bntg" ? "#e2a03a" : "#d8f0b0";
  return `<svg viewBox='0 0 300 110' width='0.62m'><rect x='4' y='4' width='292' height='102' rx='10' fill='${bg}' stroke='${fg}' stroke-width='4'/><text x='150' y='48' text-anchor='middle' font-family='sans-serif' font-weight='900' font-size='${a.length > 18 ? 20 : 26}' fill='${fg}'>${esc(a)}</text><text x='150' y='82' text-anchor='middle' font-family='sans-serif' font-weight='700' font-size='${b.length > 30 ? 13 : 16}' fill='${fg}' fill-opacity='0.85'>${esc(b)}</text><text x='286' y='100' text-anchor='end' font-family='sans-serif' font-size='9' fill='${fg}' fill-opacity='0.6'>${who === "bntg" ? "B.N.T.G." : "M.E.G. SURVEY"}</text></svg>`; };
const LANTERN_FX = `fx
pop glow n=1 r=light(<1,.72,.42>,fire()*1.6+1.2,6)`;
const CANDLE_FX = `fx
pop flame rate=10 on=disc(.18) life=.3..0.5 v=up(.25) size=.02..0.035 col=hdr(3,1.8,.6)>hdr(1.6,.5,.1) a=0>.2:1>0 r=sprite(flame-wisp,add)
pop glow n=1 r=light(<1,.6,.3>,fire()*1.2+0.6,4)`;

const ignore = (ctx, h, skip) => { if (!h?.id) return false; if (skip.has(h.id)) return true; const o = ctx.place.objects[h.id]; return !!(o?.physics?.trigger || o?.tags?.includes?.("thr")); };
let TRUST = null; // a floor height to take on trust where the sim can't probe the floor (Level 8's cave): no rays at all
function firstHit(ctx, from, dir, dist, skip) {
  if (TRUST != null) return null;
  const r = raycast(ctx, from, dir, { distance: dist, physicsOnly: true, bodies: "static", multiple: true, ignoreEntities: [...skip] });
  const hits = Array.isArray(r) ? r : r?.hits ?? (r ? [r] : []);
  return hits.filter((h) => !ignore(ctx, h, skip)).sort((a, b) => a.distance - b.distance)[0] ?? null;
}
// the floor under (x, z) within reach of y, or null
function floorAt(ctx, x, y, z, skip) { if (TRUST != null) return TRUST; const h = firstHit(ctx, { x, y: y + 1.1, z }, { x: 0, y: -1, z: 0 }, 2.4, skip); return h && h.normal?.y > 0.6 ? h.position.y : null; }
// is a spot of radius rad, reached in a straight line from o, clear of walls and on a floor near o's height
function spot(ctx, o, p, rad, skip) {
  const d = Math.hypot(p.x - o.x, p.z - o.z), y = floorAt(ctx, p.x, o.y, p.z, skip);
  if (y == null || Math.abs(y - o.y) > 0.5) return null;
  if (d > 0.05) { const h = firstHit(ctx, { x: o.x, y: o.y + 0.5, z: o.z }, { x: (p.x - o.x) / d, y: 0, z: (p.z - o.z) / d }, d + rad, skip); if (h) return null; }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (firstHit(ctx, { x: p.x, y: y + 0.35, z: p.z }, { x: dx, y: 0, z: dz }, rad, skip)) return null;
  return { x: p.x, y, z: p.z };
}
// the door's destination place, from its row, its state, or its script
function destOf(id, o) {
  const row = DOORS[id]; if (row?.to) return row.to;
  const t = o.state?.to; return typeof t === "string" ? t.split("#")[0] : null;
}
// into the level: away from the door toward its arrival marker, else the most open of four sides
function inward(ctx, door, pos, skip) {
  let best = null;
  for (const [id, o] of Object.entries(ctx.place.objects)) {
    if (!/-from-|arrive|-lobby$/.test(id) || o.primitive || o.model) continue;
    const g = ctx.getObject(id)?.worldFeetPosition ?? o.feetPosition; if (!g) continue;
    const d = Math.hypot(g.x - pos.x, g.z - pos.z); if (d > 0.4 && d < 5.5 && Math.abs(g.y - pos.y) < 1.2 && (!best || d < best.d)) best = { d, x: (g.x - pos.x) / d, z: (g.z - pos.z) / d };
  }
  if (best) return best;
  let open = null;
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const h = firstHit(ctx, { x: pos.x, y: pos.y + 1, z: pos.z }, { x, y: 0, z }, 12, skip), d = h ? h.distance : 12; if (!open || d > open.d) open = { d, x, z }; }
  return open;
}
function dress(ctx, id, row, at, f, n0, trust) {
  TRUST = trust ? at.y : null;
  try { return dress1(ctx, id, row, at, f, n0); } finally { TRUST = null; }
}
function dress1(ctx, id, row, at, f, n0) {
  const skip = new Set([id]), base = KEY(id), r = { x: -f.z, z: f.x }; // r: the viewer's right, facing into the level
  let O = null; // just inside the doorway; a door set deep in its wall (Level 4's poster) steps further in to find floor
  for (const k of [0.9, 1.8, 2.7]) { const q = { x: at.x + f.x * k, z: at.z + f.z * k }, y = floorAt(ctx, q.x, at.y, q.z, skip); if (y != null) { O = { ...q, y }; break; } }
  if (!O) return -1; // no floor yet (or a water door): try later
  const W = (a, b) => ({ x: O.x + r.x * a + f.x * b, z: O.z + r.z * a + f.z * b });
  const yawF = Math.atan2(f.x, f.z) * 180 / Math.PI; // a mesh's local +z along f
  const put = (k, spec) => { ctx.spawn(base + "-" + k, { tags: ["thr"], castShadow: false, visibleRange: { max: 40 }, ...spec }); n0++; };
  const side = (Math.round(at.x * 7 + at.z * 3) & 1) ? 1 : -1;
  const try3 = (a, b, rad) => spot(ctx, O, W(a * side, b), rad, skip) ?? spot(ctx, O, W(-a * side, b), rad, skip) ?? spot(ctx, O, W(a * side * 0.55, b * 0.8), rad, skip);
  const kit = KIT[row.k];
  if (kit) { const p = try3(1.15, 0.7, 0.45); if (p) {
    put("kit", { feetPosition: p, rotation: { yaw: yawF + (row.k === "cones" ? 0 : 25 * side) }, primitive: { kind: "scripted", script: GEO, params: { kind: kit, seed: (n0 % 5) + 1 } } });
    if (row.k === "lantern" || row.k === "shrine" || row.k === "candles") put("glow", { feetPosition: { x: p.x, y: p.y + (row.k === "lantern" ? 0.22 : 0.08), z: p.z }, fx: { script: row.k === "lantern" ? LANTERN_FX : CANDLE_FX } });
    if (row.k === "lantern") put("lamp", { feetPosition: { x: p.x + r.x * 0.5 * -side, y: p.y, z: p.z + r.z * 0.5 * -side }, primitive: { kind: "scripted", script: GEO, params: { kind: "lantern" } } });
  } }
  if (row.k === "road" || row.plate) { const p = try3(row.k === "road" ? 3.2 : 1.3, row.k === "road" ? 1.2 : 0.35, 0.3); if (p) { // a stake with the plate on it, the plate turned to face whoever walks up
    put("stake", { feetPosition: p, rotation: { yaw: yawF }, primitive: { kind: "scripted", script: GEO, params: { kind: "stake", seed: row.who === "bntg" ? 1 : 2 } } });
    put("plate", { feetPosition: { x: p.x, y: p.y + 1.22, z: p.z }, rotation: { yaw: yawF + 180 }, vector: plateSvg(row.plate ?? "", row.who) });
  } }
  if (row.mark) { const p = spot(ctx, O, W(0, 1.9), 0.5, skip); if (p) put("mark", { feetPosition: { x: p.x, y: p.y + 0.006, z: p.z }, rotation: { yaw: yawF + 180, pitch: -90 }, vector: chalkSvg(row.mark, row.who) }); }
  if (row.prints) { const p = spot(ctx, O, W(0.35 * side, 0), 0.2, skip), q = spot(ctx, O, W(0.35 * side, 3.2), 0.2, skip); if (p && q) put("prints", { feetPosition: p, rotation: { yaw: yawF + (row.prints === "in" ? 0 : 180) }, primitive: { kind: "scripted", script: GEO, params: { kind: "prints", z0: row.prints === "in" ? -0.9 : -3.2, z1: row.prints === "in" ? 3.2 : 0.9 } } }); }
  if (row.k !== "road") { const p = try3(0.85, 1.6, 0.4); if (p) put("litter", { feetPosition: p, rotation: { yaw: yawF + 140 * side }, primitive: { kind: "scripted", script: GEO, params: { kind: "litter", seed: (n0 % 7) + 2 } } }); }
  if (row.note) { const p = try3(0.7, 1.1, 0.25); if (p) {
    const [name, text, look] = row.note;
    put("note", { feetPosition: { x: p.x, y: p.y + 0.004, z: p.z }, rotation: { yaw: yawF + 17 * side }, tags: ["thr", "usable"], primitive: { kind: "box", width: 0.21, height: 0.004, depth: 0.27 }, material: { color: "oklch(0.93 0.025 90)", roughness: 0.95 }, behavior: "scripts/moments.js", state: { kind: "note", name, verb: "Read", info: look ?? "", text } });
  } }
  if (row.almond) { const p = try3(1.15, 0.7, 0.45); if (p) ctx.spawn(base + "-almond", { tags: ["almond"], feetPosition: { x: p.x + f.x * 0.25, y: p.y, z: p.z + f.z * 0.25 }, castShadow: false, model: "/cdn/value.d74570d765a2d43f965fc8756878f7bf22f833db5feaf4c335d84d8dc4ba5b62.glb", layout: { box: { min: { x: -0.07, y: 0, z: -0.07 }, max: { x: 0.07, y: 0.32, z: 0.07 } } } }); }
  return n0;
}
// extra: thresholds that aren't door objects, [{ id, at: {x,y,z}, fwd: {x,z} }] (Level 0's noclip wall, Level 1's tutorial drop)
export function dressThresholds(ctx, extra = []) {
  const s = ctx.place.state, now = ctx.now();
  if (s.thrV === V || !ctx.place.players?.length) return;
  s.thrSeen ??= now; if (now - s.thrSeen < 6000) return; // the place's own meshes and colliders stand first
  if (s.thrV != null || s.thrTry == null) { // a first lay, or an older one: start clean
    for (const o of ctx.query({ tags: ["thr"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id);
    s.thrV = null; s.thrDone = []; s.thrTry = 0;
  }
  const done = new Set(s.thrDone ?? []); let n = 0, wait = 0;
  const all = [...extra.map((e) => ({ ...e, extra: true }))];
  for (const [id, o] of Object.entries(ctx.place.objects)) {
    if (!DOORS[id] || done.has(id)) continue;
    const b = [].concat(o.behavior ?? []).join(","); if (!DOOR_SCRIPTS.test(b)) continue;
    const g = ctx.getObject(id), at = g?.worldFeetPosition ?? o.feetPosition; if (!at) continue;
    all.push({ id, at });
  }
  for (const t of all) {
    if (done.has(t.id) || !DOORS[t.id]) continue;
    const f = t.fwd ? { ...t.fwd } : inward(ctx, t.id, t.at, new Set([t.id])); if (!f) continue;
    const l = Math.hypot(f.x, f.z) || 1; f.x /= l; f.z /= l;
    const r = dress(ctx, t.id, DOORS[t.id], t.at, f, n, t.trust);
    if (r < 0) { wait++; continue; }
    n = r; done.add(t.id);
  }
  s.thrDone = [...done]; s.thrTry = (s.thrTry ?? 0) + 1;
  if (!wait || s.thrTry > 20) { s.thrV = V; s.thrTry = null; }
}
