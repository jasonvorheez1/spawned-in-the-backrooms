// The ways between levels, dressed (Nov 11): what wanderers, M.E.G. and B.N.T.G. leave at a threshold they know.
// Every place's sim calls dressThresholds(ctx) each tick; it lays once per room (place.state.thrV), a few seconds in,
// when the place's colliders stand. It finds every door the level has (scripts/level-door.js and the other crossing
// scripts), works out which way is "into the level" (the arrival marker just inside it, else the most open side),
// and puts a kit, a readable note, a marker and footprints around it. Every piece is walk-through and probed: a
// floor ray under it and a clear line from the doorway, so nothing stands in a wall or hangs over a drop.
// The words are lore for where each door goes; LEVEL_NAMES keeps the names the same as the Teleport Station's.
import { raycast } from "builtin/physics";
import { LEVEL_NAMES } from "./hub.js";
const V = 6;
const GEO = "scripts/threshold-geo.js";
const DOOR_SCRIPTS = /level-door|zenith-hatch|l27-use|level12-use|home11-door/;
const CHALK = "#d9d4c4", INK = "#2b2b2e";
// one row per door: k kit, who left it (meg | bntg | wanderer), the marker words, the note; to: the place it opens on, when its state doesn't say
// kits: cache (bag + bottles), cones (tape across), shrine (candles), lantern, litter; road: a roadside sign instead
const DOORS = {
  // Level 0
  "l0-zenith": { to: "level01", k: "litter", who: "bntg", mark: "B.N.T.G. · CARD HOLDERS ONLY", note: ["Torn B.N.T.G. chit", "Bulkhead to Zenith opens for a keycard and nothing else. Kade sells them. Don't haggle, he remembers faces. -- stamped, initialled, no name"] },
  "l0-exit": { to: "level1", k: "shrine", who: "wanderer", info: "found at the foot of a wall", mark: "it's thinner here", prints: "in", note: ["Pencil on a receipt", "I watched Dale walk into this wall. Didn't open a door. Didn't fall. He just kept walking and the paper took him like water. The prints stop at the skirting board. If you're brave enough, keep your eyes open. If you're not, I don't blame you."] },
  // Level 1
  "l1-back": { k: "cache", who: "meg", mark: "← LEVEL 0 · ONE WAY, MOSTLY", plate: "M.E.G. WAYPOINT ALPHA-1|≈ 130 m EAST · FOLLOW THE GREEN EXIT SIGNS", note: ["M.E.G. arrival card", "WELCOME TO LEVEL 1. You came through the wall like the rest of us. The camp (Waypoint Alpha-1) is far to the EAST, past the corridor blocks. Corridors behind green EXIT signs keep the hounds out: use them. Don't run in the open halls, they hear running. When the lights go out, stop and wait. -- Ale, M.E.G. Scout"], almond: 1 },
  "l1-drop": { k: "carpet", who: "meg", info: "left where the newcomers land", plate: "NEW ARRIVALS|WAYPOINT ALPHA-1 · NORTH-EAST", note: ["M.E.G. arrival card", "You fell through the floor. Everyone does. The wet carpet you landed on came down with you; it dries out in a day. Waypoint Alpha-1 is north-east of here, about a hundred metres as the hound runs. Walk, don't run. Corridors with green EXIT signs are safe. -- M.E.G."] },
  "l1-onward": { k: "cones", who: "meg", mark: "LEVEL 2 ▶ HEAT", plate: "LEVEL 2 · PIPE DREAMS|FILL EVERY BOTTLE FIRST", note: ["Survey tag, zip-tied to a cone", "LEVEL 2 behind this door. The pipes sweat and the air gets hotter the deeper you go. Fill every bottle at camp. This door stays put on the far side: the way back is the same green door, west wall. -- Callum, Quartermaster"] },
  // Level 2
  "l2-back": { k: "litter", who: "wanderer", mark: "UP TO 1 ← cool air", prints: "out", note: ["Scrap of a cigarette carton", "The cold coming under this one is Level 1. Car park, concrete, people. If the heat's got you, go up and drink."] },
  "l2-to-l3": { k: "cones", who: "meg", mark: "LEVEL 3 ▶ LIVE WIRES", plate: "LEVEL 3 · ELECTRICAL STATION|DON'T TOUCH THE CABLES", note: ["M.E.G. hazard tag", "Electrical Station past this seal. Every cable is live. Rubber soles, nothing metal in your hands, and stay out of the standing water. The things in there follow the hum."] },
  "l2-to-l21": { k: "lantern", who: "wanderer", mark: "2.1 ↑ locked rooms", note: ["Note pushed under a pipe clamp", "Climbed up here and found a door that opens onto clean white halls, Level 2.1. Everything's locked but the halls. Saltines in the lockers if you've got a pick."] },
  // Level 2.1
  "l21-down": { k: "litter", who: "wanderer", mark: "BACK DOWN TO 2", prints: "out", note: ["Graffiti on a sandwich bag", "Pipes down there. Hot. You know the way."] },
  "l21-cave": { k: "lantern", who: "meg", mark: "CAVES ▶ LEVEL 8", plate: "LEVEL 8 · CAVE SYSTEM|ROPE · LIGHT · DON'T SHOUT", note: ["M.E.G. route card", "The hall runs out into raw rock: Level 8. Take a light you trust and a spare. Don't shout to find each other, things up in the dark answer. Mark your turns."] },
  // Level 3
  "l3-back": { k: "litter", who: "wanderer", mark: "← 2 · pipes", prints: "out", note: ["Burned matchbook", "Back to the pipes. Hotter, quieter. Nothing in there wants to electrocute you, at least."] },
  "l3-gamma-door": { k: "cones", who: "meg", mark: "BASE GAMMA", note: ["Posted notice, rain-stained", "M.E.G. BASE GAMMA. Knock, wait for the plate to light. Weapons stay holstered inside the wall. No entities, no exceptions, no arguments with the guard."] },
  "l3-lift": { k: "cache", who: "wanderer", mark: "LIFT ↑ 4 · offices", note: ["Post-it on the call button", "Going UP takes you to the empty offices (4). Water cooler on the left still works. Don't stay past the third flicker."] },
  "l3-lift5": { k: "shrine", who: "wanderer", mark: "LIFT ↓ 5 · the hotel", note: ["Hotel stationery, folded", "This one goes down to the hotel. You'll hear music. Don't take any elevator above twelve, and if the Beast's in the boiler room, don't go looking. -- K."] },
  // Base Gamma
  "gamma-out": { k: "cones", who: "meg", mark: "EXIT · LEVEL 3", note: ["Gate log, clipboard", "Signing out means you're on your own. Live wires, the hum, the Electrical Station. Tell the guard when you'll be back so somebody knows to look."] },
  // Level 4
  "l4-fun-poster/child-0": { to: "level26", k: "shrine", who: "wanderer", mark: "DON'T", note: ["Biro on the back of a flyer", "If the poster smiles at you, it's already too late to stop wanting to touch it. Marcy touched it. Somebody saw her later on a ship in the fog, waving. She didn't look happy. =)"] },
  "l4-lift-door": { k: "litter", who: "wanderer", mark: "LIFT ↓ 3", note: ["Post-it, curled", "Down is the Electrical Station. Rubber soles."] },
  "l4-stairs-down": { k: "cache", who: "wanderer", mark: "STAIRS ↓ 5 · hotel", note: ["Business card, Hotel letterhead", "The stair goes down into the Terror Hotel. It's nicer than it sounds until you hear the boiler. Ring the front bell. Somebody always answers."] },
  // Level 5
  "l5-lift3": { k: "litter", who: "wanderer", mark: "↓ 3", note: ["Room service slip", "Lift down to the Electrical Station. It hums in there louder than the Beast."] },
  "l5-stairs-up": { k: "litter", who: "wanderer", mark: "↑ 4 · offices", note: ["Room service slip", "Up the old stair: empty offices, Level 4. Water cooler, one working phone, no people."] },
  "l5-to-l6": { k: "shrine", who: "wanderer", mark: "6 · NO LIGHTS", plate: "LEVEL 6 · LIGHTS OUT|BRING TWO LIGHTS. THEN A THIRD.", note: ["Guest card, hand-printed", "Past here there is no light at all. Not dim. None. Your flashlight is the only thing in there that isn't hunting. Night vision if you have it. Keep one hand on the wall. -- for Bea, who didn't"] },
  // Level 6
  "l6-back": { k: "lantern", who: "wanderer", mark: "UP · BOILER ROOM · 5", note: ["Note in a sandwich bag", "This door is warm. That's the hotel's boiler room on the other side, Level 5. Warm means alive."] },
  "l6-to-l7": { k: "litter", who: "wanderer", mark: "THE FLOOR GIVES", note: ["Wet note, ink run", "Floor's soft here. I heard water under it. Waves. I didn't jump."] },
  "l6-to-l61": { k: "litter", who: "wanderer", mark: "smells like fries", note: ["Grease-spotted napkin", "Floor here caves into somewhere that smells like a burger joint. The snacks down there move. Don't eat anything that's warm."] },
  // Level 6.1
  "l61-to-l6": { k: "litter", who: "wanderer", mark: "← DARK · 6", note: ["Ketchup sachet, writing on it", "Back into the dark. Bring a light."] },
  "l61-to-l11": { k: "cache", who: "wanderer", mark: "CITY →", note: ["Receipt, PAID IN FULL", "Through the back wall: a city, Level 11, open sky that isn't sky. People there. Shops. Felt like home until I counted the streets."] },
  "l61-vent-in": { k: "litter", who: "wanderer", mark: "vent · hums", note: ["Napkin", "This vent drops you out by the pipes into Level 3. The hum in there sounds like the fryers."] },
  // Level 7
  "l7-back": { k: "lantern", who: "wanderer", mark: "BACK INTO THE DARK", note: ["Water-stained postcard", "The door at the top of the stairs goes back to Level 6. Pitch black. Still better than the water."] },
  // Level 8
  "l8-lake-back": { k: "lantern", who: "meg", mark: "LAKE ▶ 7", plate: "LEVEL 7 · THALASSOPHOBIA|DON'T SWIM. DON'T LOOK DOWN.", note: ["M.E.G. route card, laminated", "The lake runs into Level 7: one house, all ocean. If you go under, go under fast. Whatever's out there can see your light."] },
  "l8-to-l21": { k: "litter", who: "meg", mark: "← 2.1 · locked halls", note: ["M.E.G. route card", "This concrete mouth goes back into Level 2.1. White halls, dry, locked doors. A good place to sleep."] },
  // Level 10
  "l10-fun-poster/child-0": { to: "level26", k: "shrine", who: "wanderer", mark: "DON'T", note: ["Feed-bag paper", "Same poster as on Level 4. Out here in the wheat. Somebody keeps putting it back up."] },
  "l10-road-north": { k: "road", who: "meg", plate: "INFINITE CITY|LEVEL 11 · KEEP WALKING", note: ["Road atlas page", "Follow the road and the wheat gives up to concrete: Level 11. Streetlights, an empty city, other wanderers. Mind the road at night."] },
  "l10-road-south": { k: "road", who: "meg", plate: "INFINITE CITY|LEVEL 11 · KEEP WALKING", note: ["Road atlas page", "This way the road loops round to the city too. Every road out of the corn ends up there."] },
  // Level 11
  "l11-to-l61": { k: "litter", who: "wanderer", mark: "SNACKS ↘ don't", note: ["Receipt", "Back door of the diner drops you into the Snackrooms (6.1). Don't eat the moving ones."] },
  "lv10-backroad": { k: "road", who: "meg", plate: "BUMPER CROP|LEVEL 10 · BARN HAS WATER", note: ["Road atlas page", "End of the city, start of the corn: Level 10. The barn has water. The rain never stops. Don't go in the deep part of the lake."] },
  // Level 184
  "l184-back": { k: "lantern", who: "wanderer", mark: "BACK TO THE CORN", note: ["Child's drawing, a fort", "This tunnel goes back to the cornfields."] },
  // Level 26
  "l26-exit": { k: "litter", who: "wanderer", mark: "OFF THE SHIP", note: ["Party invitation, crossed out", "Gangway down. You'll come out in an office (Level 4). Don't look back at the deck."] },
  // Level 27
  "l27-exit": { k: "lantern", who: "wanderer", mark: "the way you came", note: ["Soggy note", "The tunnel only goes back to where you came in. Drink first."] },
  // home, Level 0.1, Level 12
  "h-door": { to: "level11", k: "litter", who: "wanderer", mark: "", note: ["Your own handwriting", "Keys, water, light. Lock the door."] },
  "l01-back": { k: "cones", who: "bntg", mark: "← LEVEL 0", note: ["B.N.T.G. exit slip", "Through the bulkhead: back to the Lobby, Level 0. Mind the step. Card stays valid."] },
  "l12-door": { k: "candles", who: "wanderer", mark: "", note: ["Note under the chair", "Sit. Try it. Go out a copy door. Wait an hour. Try again. Harris was right about everything else."] },
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
    const [name, text] = row.note;
    put("note", { feetPosition: { x: p.x, y: p.y + 0.004, z: p.z }, rotation: { yaw: yawF + 17 * side }, tags: ["thr", "usable"], primitive: { kind: "box", width: 0.21, height: 0.004, depth: 0.27 }, material: { color: "oklch(0.93 0.025 90)", roughness: 0.95 }, behavior: "scripts/moments.js", state: { kind: "note", name, verb: "Read", info: row.info ?? `by the way to ${LEVEL_NAMES[destOf(id, ctx.place.objects[id] ?? {})] ?? "somewhere else"}`, text } });
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
