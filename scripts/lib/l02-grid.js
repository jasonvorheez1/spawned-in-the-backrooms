// Level 0.2's shifting rooms: "the crew rebuilds what you don't watch". Laid and stepped by places/level02/sim.js.
// A partition swaps its doorway only when no work lamp lights it, no camera looks at it and no body stands at it.
// place.state.l02grid = { layout: { wallId: openIndex }, lamps: { lampId: on } }. Numbers: scripts/lib/data/l02-remodel.yml.
import G from "./data/l02-remodel.yml";
import { raycast } from "builtin/physics";
import { animate } from "builtin/tween";
import P from "./data/l02-props.yml";
import { BASE } from "./level02.js";
const C = G.cell, X = G.x0, Z = G.z0, HT = G.height;
const STUD = { color: "oklch(0.8 0.07 80)", roughness: 0.85, texture: "cdn/texture-planed-pine-2x4-lumber-grain.png", wrap: "repeat", repeat: [1, 1] };
const STEEL = { color: "oklch(0.45 0.02 240)", metalness: 0.6, roughness: 0.5 };
const BATHTILE = { color: "oklch(0.95 0.006 220)", roughness: 0.35, texture: "cdn/texture-small-white-square-bathroom-floor-tiles-grey-grout.png", wrap: "repeat", repeat: [1.5, 1.5] };
const SWAP_SND = ["/cdn/moodboard-realistic-gritty/sfx-muffled-hammering-nails-behind-drywall-wall.mp3", "/cdn/moodboard-realistic-gritty/sfx-muffled-cordless-drill-screwing-into-stud-behind-wall.mp3", "/cdn/moodboard-realistic-gritty/sfx-muffled-circular-saw-cut-through-plywood-next-room.mp3"];
const RADIO = "/cdn/moodboard-realistic-gritty/ambience-muffled-distant-am-radio-talk-and-oldies-through-drywall-loop.mp3";
const SAWDUST = `fx
pop dust burst=26..36 on=box(1.6,1.2,.08).c(1.4) life=1.2..2.2 v=sdir()*(.3..0.9)+up(.1..0.4) size=.18..0.36 acc=grav()*.08+drag(1.4) col=<.86,.76,.58> a=0>.4:.35>.6:.2>0 sz=$size*(.6>1.8) rot=spin(.2) r=sprite(smoke-puff,alpha)
pop chips burst=14..20 on=box(1.4,1,.06).c(1.2) life=.7..1.2 v=sdir()*(.6..1.4) size=.02..0.045 spin=-8..8 acc=grav() col=<.9,.78,.55> a=1 sz=$size rot=$age*$spin floor=stick r=sprite(chip,alpha)`;
const MOTES = `fx
pop motes n=?mobile:30|70 on=box(8,1.4,6) life=6..10 v=sdir()*.04 size=.012..0.025 acc=curl(.2)*.06 col=<1,.9,.7> a=0>.55:.5>.5:.5>0 r=sprite(soft-disc,add)`;
const DRIP = `fx
pop drop rate=.7 on=point() life=.9 v=<0,-.2,0> size=.018 acc=grav() col=<.95,.93,.88> a=1 floor=die r=sprite(soft-disc,alpha)
pop splat on=@drop.lives(1) life=1.4 size=.05 col=<.95,.93,.88> a=.7>0 sz=$size*(.6>1.6) r=sprite(soft-disc,alpha)`;
const KNOCK = ["/cdn/moodboard-realistic-gritty/sfx-three-heavy-knocks-from-inside-hollow-stud-wall.mp3", "/cdn/moodboard-realistic-gritty/sfx-something-heavy-shoved-against-plywood-wall-other-side.mp3", "/cdn/moodboard-realistic-gritty/sfx-muffled-mallet-tap-tap-on-drywall-from-behind.mp3"];
const SETTLE = "/cdn/moodboard-realistic-gritty/sfx-plywood-wall-panel-settles-with-soft-wooden-thunk.mp3";
const TRICKLE = `fx
pop dust burst=14..20 on=box(1.8,.05,.06) life=1.2..2 v=up(-.3..-0.1)+sdir()*.08 size=.06..0.14 acc=grav()*.15+drag(1.2) col=<.86,.78,.62> a=0>.5:.3>.7:.2>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;
const box = (w, h, d) => ({ kind: "box", width: w, height: h, depth: d });
const prop = (key, at, yaw = 0, extra = {}) => { const p = P[key]; if (!p?.model) return null; const [w, h, d] = p.size;
  return { feetPosition: at, rotation: { yaw }, model: { id: p.model, ...(p.forward ? { forward: p.forward } : {}) }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } }, ...extra }; };
const H = (k) => P[k]?.size?.[1] ?? 0.8;
const put = (ctx, id, spec) => { if (spec && !(id in ctx.place.objects)) ctx.spawn(id, spec); };

// a wall's line: v<i>-<r> along z at x = X + C*i, h<c>-<j> along x at z = Z + C*j; fixed w<r> (x = X), n<c> (z = Z), s<c> (z = Z + rows*C)
export function wallLine(id) {
  const [k, a, b] = [id[0], ...id.slice(1).split("-").map(Number)];
  if (k === "v") return { x: X + C * a, z: Z + C * (b + 0.5), along: "z" };
  if (k === "h") return { x: X + C * (a + 0.5), z: Z + C * b, along: "x" };
  if (k === "w") return { x: X, z: Z + C * (a + 0.5), along: "z" };
  if (k === "n") return { x: X + C * (a + 0.5), z: Z, along: "x" };
  return { x: X + C * (a + 0.5), z: Z + C * G.rows, along: "x" };
}
const wallSpec = (id, door, sheath) => { const l = wallLine(id);
  return { tags: ["l02gw", "wall"], feetPosition: { x: l.x, y: BASE, z: l.z }, rotation: { yaw: l.along === "z" ? 90 : 0 }, physics: "static", castShadow: true, receiveShadow: true,
    primitive: { kind: "scripted", script: "scripts/l02-wall-geo.js", params: { len: C, h: HT, door, sheath } } }; };
const EDGE = { color: "oklch(0.85 0.13 75)", emissive: "oklch(0.85 0.13 75)", emissiveIntensity: 1.6, transparent: true, opacity: 0.55 };
const lampLight = (on) => ({ ...G.lampLight, aim: "forward", intensity: on ? G.lampLight.intensity : 0 });
function lampSpec(id, [x, z, yaw], on) {
  const lp = prop("worklamp", { x, y: BASE, z }, yaw, { tags: ["usable", "l02lamp", "breakable"], physics: { body: "dynamic", collider: "box", mass: 6, friction: 0.9 },
    behavior: "scripts/l02-use.js", state: { kind: "lamp", name: "Halogen work lamp", verb: "Switch", info: "Z to carry", mat: "metal", hp: 999, maxHp: 999 } });
  lp.children = [{ id: "beam", feetPosition: { x: 0, y: 1.5, z: -0.12 }, light: lampLight(on) }];
  return lp;
}
export const yawOf = (r) => { if (r == null) return 0; if (typeof r === "number") return r; if (typeof r.yaw === "number") return r.yaw;
  if (typeof r.w === "number") return (Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.x * r.x + r.y * r.y)) * 180) / Math.PI; return 0; };

export function layGrid(ctx, fresh = false) {
  const s = ctx.place.state;
  if (fresh || !s.l02grid) s.l02grid = { layout: Object.fromEntries(Object.keys(G.walls).map((w) => [w, 0])), lamps: Object.fromEntries(Object.keys(G.lamps).map((l) => [l, false])) };
  const g = s.l02grid;
  for (const [w, row] of Object.entries(G.walls)) {
    put(ctx, `l02-gw-${w}`, wallSpec(w, row.opts[g.layout[w] ?? 0] ?? null, row.sheath));
    const l = wallLine(w);
    put(ctx, `l02-ge-${w}`, { feetPosition: { x: l.x, y: BASE + 0.045, z: l.z }, rotation: { yaw: l.along === "z" ? 90 : 0 }, primitive: box(C - 0.1, 0.025, 0.11), material: EDGE, visible: false,
      children: [{ feetPosition: { x: 0, y: HT - 0.12, z: 0 }, primitive: box(C - 0.1, 0.025, 0.11), material: EDGE }] });
  }
  for (const [w, row] of Object.entries(G.fixed)) put(ctx, `l02-gw-${w}`, wallSpec(w, row.door, row.sheath));
  for (const [id, at] of Object.entries(G.lamps)) put(ctx, id, lampSpec(id, at, !!g.lamps[id]));
  layPaint(ctx);
  layDress(ctx);
}
export function layPaint(ctx) {
  G.paint.forEach(([x, z, yaw], i) => put(ctx, `l02-paint${i}`, prop("paintcan", { x, y: BASE, z }, yaw, { tags: ["usable", "l02-paint"], physics: "static", behavior: "scripts/l02-use.js",
    state: { kind: "paint", name: "Fresh Paint", verb: "Take", info: "Remodeling Co. stock. The lid is still sticky." } })));
}
// on reset: walls back to layout 0, lamps home and off, cans back
export function resetGrid(ctx) {
  for (const id of Object.keys(ctx.place.objects)) if (/^l02-(gw|ge)-/.test(id) || id in G.lamps) ctx.destroy(id);
  layGrid(ctx, true);
}

// the joist pile that shuts the old stair once the floor has come down
export function joists(ctx, on) {
  const there = "l02-joists" in ctx.place.objects;
  if (!on) { if (there) ctx.destroy("l02-joists"); return; }
  if (there) return;
  const kids = [];
  for (const [x, y, z, yaw, pitch, roll] of [[-0.6, 0.12, -0.3, 18, 0, 4], [0.4, 0.14, 0.5, -24, 0, -3], [0, 0.4, 0, 62, 10, 0], [-0.9, 0.62, 0.2, 35, 22, 6], [0.7, 0.75, -0.4, -48, -18, 0], [0.1, 1.05, 0.6, 8, 30, 12], [-0.3, 1.3, -0.5, -70, 38, -8]])
    kids.push({ feetPosition: { x, y, z }, rotation: { yaw, pitch, roll }, primitive: box(0.05, 0.24, 3.8), material: STUD });
  kids.push({ feetPosition: { x: 0.3, y: 0, z: 0.9 }, rotation: { yaw: 10 }, primitive: box(1.2, 0.03, 0.8), material: { color: "oklch(0.97 0.004 90)", roughness: 0.9, texture: "cdn/texture-acoustic-drop-ceiling-tile-grid.png" } });
  kids.push({ feetPosition: { x: -1.6, y: 0, z: -0.2 }, rotation: { yaw: -30, roll: 70 }, primitive: box(0.05, 0.24, 2.4), material: STUD });
  ctx.spawn("l02-joists", { tags: ["l02debris-keep"], feetPosition: { x: -6.2, y: BASE, z: -8.7 }, primitive: box(3.6, 2.6, 2.8), visible: false, physics: "static", children: kids });
  ctx.spawn("l02-joists-note", { feetPosition: { x: -4.3, y: BASE + 1.3, z: -7.2 }, rotation: { yaw: 120 }, vector: "<svg viewBox='0 0 200 80' width='0.9m'><path d='M14 44 Q70 30 128 40 L124 22 L186 46 L120 66 L126 52 Q70 46 16 58 Z' fill='#e8641c' opacity='0.88'/><circle cx='30' cy='70' r='3' fill='#e8641c' opacity='0.6'/><circle cx='52' cy='66' r='2' fill='#e8641c' opacity='0.5'/></svg>" }); // crew spray paint: this way
}

let knockAt = 0; // the next knock behind an unlit wall (this machine)
let next = 0; // the crew's next pass (this machine's clock; a new machine starts a fresh pass)
const lockedNow = {};
export function gridTick(ctx) {
  const s = ctx.place.state, g = s.l02grid; if (!g) return;
  const now = ctx.now(), o = ctx.place.objects;
  const ps = ctx.place.players.filter((p) => p.feetPosition.y < BASE + 2.5);
  // lit: within lampRange of an ON lamp and inside its cone
  const lamps = Object.keys(G.lamps).map((id) => o[id]).filter((l) => l && g.lamps[l.id]);
  for (const id of Object.keys(G.lamps)) { const l = o[id], b = ctx.getObject(`${id}/beam`), on = !!g.lamps[id];
    if (b && (b.light?.intensity > 0) !== on) b.light = lampLight(on); }
  const pts = (l) => l.along === "z" ? [{ x: l.x, z: l.z }, { x: l.x, z: l.z - C / 2 + 0.3 }, { x: l.x, z: l.z + C / 2 - 0.3 }] : [{ x: l.x, z: l.z }, { x: l.x - C / 2 + 0.3, z: l.z }, { x: l.x + C / 2 - 0.3, z: l.z }];
  const cone = (from, yaw, p, half, range) => { const dx = p.x - from.x, dz = p.z - from.z, d = Math.hypot(dx, dz); if (range && d > range) return false; if (d < 0.3) return true;
    const a = yaw / 57.2958; return (-Math.sin(a) * dx - Math.cos(a) * dz) / d > Math.cos(half / 57.2958); };
  const lit = {};
  for (const w of Object.keys(G.walls)) {
    const P3 = pts(wallLine(w));
    lit[w] = lamps.some((l) => { const f = l.feetPosition, y = yawOf(l.rotation) + G.lampAim; return P3.some((p) => cone(f, y, p, G.lampHalf, G.lampRange)); });
    if (lockedNow[w] !== lit[w]) { const was = lockedNow[w]; lockedNow[w] = lit[w]; const e = o[`l02-ge-${w}`]; if (e) e.visible = lit[w];
      if (lit[w] && was === false) { const l = wallLine(w); ctx.emit("playSound", { clip: SETTLE, position: { x: l.x, y: BASE + 1.2, z: l.z }, volume: 0.5, refDistance: 2, maxDistance: 14 }); ctx.emit("squash", { target: `l02-gw-${w}`, axis: "y", intensity: 0.03, duration: 0.25 }); } }
  }
  if (now > knockAt && ps.length) { // the crew behind an unlit wall near someone: knocks, a shudder, dust off the top plate
    knockAt = now + (2600 + ctx.random() * 3200);
    const near = Object.keys(G.walls).filter((w) => !lit[w] && ps.some((p) => { const l = wallLine(w); return Math.hypot(p.feetPosition.x - l.x, p.feetPosition.z - l.z) < 7; }));
    if (near.length) { const w = near[Math.floor(ctx.random() * near.length)], l = wallLine(w);
      ctx.emit("playSound", { clip: KNOCK[Math.floor(ctx.random() * KNOCK.length)], position: { x: l.x, y: BASE + 1.3, z: l.z }, volume: 0.6, refDistance: 2.5, maxDistance: 16 });
      ctx.emit("shake", { target: `l02-gw-${w}`, intensity: 0.035, duration: 0.45 });
      ctx.emit("fx", { position: { x: l.x, y: BASE + HT - 0.05, z: l.z }, script: TRICKLE }); }
  }
  if (now < next) return; next = now + G.swapEvery * 1000;
  if (!ps.length) return;
  const changed = {};
  for (const [w, row] of Object.entries(G.walls)) {
    if (lit[w] || ctx.random() > G.swapChance) continue;
    const P3 = pts(wallLine(w));
    const wid = `l02-gw-${w}`;
    const sees = (p, q) => { if (!cone(p.feetPosition, yawOf(p.camera?.rotation), q, G.viewHalf)) return false; // in the view cone...
      const e = { x: p.feetPosition.x, y: p.feetPosition.y + 1.6, z: p.feetPosition.z }, t = { x: q.x, y: BASE + 1.4, z: q.z };
      const dx = t.x - e.x, dy = t.y - e.y, dz = t.z - e.z, d = Math.hypot(dx, dy, dz); if (d < 0.5) return true;
      return !raycast(ctx, e, { x: dx / d, y: dy / d, z: dz / d }, { distance: d - 0.25, ignoreEntities: [p.id, wid], physicsOnly: true }); }; // ...and no other wall between
    if (ps.some((p) => P3.some((q) => sees(p, q)))) continue; // watched
    const l = wallLine(w); if (ps.some((p) => { const f = p.feetPosition; return l.along === "z" ? Math.abs(f.x - l.x) < G.nearSkip && Math.abs(f.z - l.z) < C / 2 + 0.5 : Math.abs(f.z - l.z) < G.nearSkip && Math.abs(f.x - l.x) < C / 2 + 0.5; })) continue;
    const cur = g.layout[w] ?? 0, n = row.opts.length, pick = (cur + 1 + Math.floor(ctx.random() * (n - 1))) % n;
    const wo = o[`l02-gw-${w}`]; if (!wo) continue;
    changed[w] = pick;
    wo.primitive = { kind: "scripted", script: "scripts/l02-wall-geo.js", params: { len: C, h: HT, door: row.opts[pick], sheath: row.sheath } };
    const at = { x: l.x, y: BASE + 1.2, z: l.z };
    ctx.emit("playSound", { clip: SWAP_SND[Math.floor(ctx.random() * SWAP_SND.length)], position: at, volume: 0.55, refDistance: 3, maxDistance: 22 });
    ctx.emit("fx", { position: { x: l.x, y: BASE, z: l.z }, script: SAWDUST });
    ctx.emit("squash", { target: wo.id, axis: "y", intensity: 0.06, duration: 0.3 });
  }
  if (Object.keys(changed).length) g.layout = { ...g.layout, ...changed };
}

// every room a story (cells: col c x = X + C*c.., row r z = Z + C*r..)
const cx = (c, dx = 0) => X + C * (c + 0.5) + dx, cz = (r, dz = 0) => Z + C * (r + 0.5) + dz;
function bulb(ctx, id, x, z, lit, drop = 0.9) {
  const top = -0.25; // the cord top, under the deck; everything hangs below it so the bulb swings like a pendulum
  if (id in ctx.place.objects) return;
  ctx.spawn(id, { feetPosition: { x, y: top, z }, children: [
    { feetPosition: { x: 0, y: -drop + 0.06, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.006, radiusBottom: 0.006, height: drop - 0.06, radialSegments: 5 }, material: { color: "oklch(0.15 0.01 60)", roughness: 0.8 } },
    { feetPosition: { x: 0, y: -drop + 0.04, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.022, radiusBottom: 0.022, height: 0.05, radialSegments: 8 }, material: { color: "oklch(0.2 0.01 60)" } },
    { feetPosition: { x: 0, y: -drop - 0.04, z: 0 }, primitive: { kind: "sphere", radius: 0.045 }, material: { color: "oklch(0.97 0.06 85)", emissive: "oklch(0.92 0.12 80)", emissiveIntensity: lit ? 4 : 0.4 } },
    ...(lit ? [{ feetPosition: { x: 0, y: -drop - 0.1, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.11 72)", intensity: 0.9, distance: 7.5 } }] : []),
  ] });
  sway(ctx, id, 2 + drop * 1.4, 3 + (x * 7 % 3));
}
// a slow pendulum on the room clock: a bulb, the hanging tile, the plastic sheet
function sway(ctx, id, period, deg, axis = "roll") {
  animate(ctx, id, { [`rotation.${axis}`]: [-deg, deg] }, { duration: period / 2, easing: "easeInOutSine", direction: "alternate", loop: true });
}

function layDress(ctx) {
  const B = (id, key, x, z, yaw = 0, extra = {}) => put(ctx, id, prop(key, { x, y: BASE, z }, yaw, { physics: "static", ...extra }));
  const tarp = (id, x, z, yaw, w = 2.4, d = 1.8) => put(ctx, id, { feetPosition: { x, y: BASE + 0.005, z }, rotation: { yaw }, primitive: box(w, 0.012, d), material: { color: "oklch(0.9 0.015 85)", roughness: 1, texture: "cdn/texture-paint-splattered-canvas-drop-cloth.png", wrap: "repeat", repeat: [0.6, 0.6] } });
  // (0,0) paint room: drop cloths, roller trays, a can stack, the first Fresh Paint
  tarp("l02-gd-cloth0", cx(0, -0.4), cz(0, 0.2), 8); tarp("l02-gd-cloth1", cx(0, 0.9), cz(0, -0.6), -14, 1.8, 1.4);
  B("l02-gd-tray0", "rtray", cx(0, -0.9), cz(0, 0.9), 30); B("l02-gd-tray1", "rtray", cx(0, 0.6), cz(0, 0.4), -60);
  B("l02-gd-bucket0", "bucket", cx(0, 1.3), cz(0, 1.2), 0); B("l02-gd-pc0", "paintcan", cx(0, -1.5), cz(0, -1.4), 0); B("l02-gd-pc1", "paintcan", cx(0, -1.15), cz(0, -1.45), 40);
  put(ctx, "l02-gd-pc2", prop("paintcan", { x: cx(0, -1.32), y: BASE + H("paintcan"), z: cz(0, -1.42) }, 15, { physics: "static" }));
  // (1,0) the chairs: nine identical chairs in rows, all facing the shut north wall (rows kept off the south doorways)
  for (let i = 0; i < 9; i++) B(`l02-gd-chair${i}`, "wchair", cx(1, (i % 3 - 1) * 0.85), cz(0, -1.2 + Math.floor(i / 3) * 0.8), 180);
  // (2,0) crew lunch: cooler, thermos, folding chair, toolbox
  B("l02-gd-cooler", "cooler", cx(2, -1), cz(0, -0.6), 25); put(ctx, "l02-gd-thermos", prop("thermos", { x: cx(2, -1.05), y: BASE + H("cooler"), z: cz(0, -0.65) }, 0, { physics: "static" }));
  // a lunch table: a ply offcut over two upturned buckets, crumbs and a crossword (Savi's pick)
  B("l02-gd-tb0", "bucket", cx(2, -0.1), cz(0, -1.45), 10); B("l02-gd-tb1", "bucket", cx(2, 1.05), cz(0, -1.4), -15);
  put(ctx, "l02-gd-tbl", { feetPosition: { x: cx(2, 0.48), y: BASE + 0.42, z: cz(0, -1.42) }, rotation: { yaw: 3 }, primitive: box(1.75, 0.025, 0.72), material: { ...STUD, texture: "cdn/texture-osb-plywood-subfloor-sheet.png", wrap: "repeat", repeat: [1, 1] }, physics: "static" });
  put(ctx, "l02-gd-paper", { feetPosition: { x: cx(2, 0.7), y: BASE + 0.446, z: cz(0, -1.35) }, rotation: { yaw: -12 }, primitive: box(0.3, 0.004, 0.42), material: { color: "oklch(0.93 0.01 90)", roughness: 0.9 } });
  B("l02-gd-fchair", "fchair", cx(2, -0.1), cz(0, 1.1), 200); B("l02-gd-box", "red_toolbox", cx(2, 1.2), cz(0, -1.3), 75);
  put(ctx, "l02-gd-bread", { feetPosition: { x: cx(2, -0.95), y: BASE + H("cooler"), z: cz(0, -0.45) }, rotation: { yaw: 30 }, primitive: box(0.16, 0.035, 0.12), material: { color: "oklch(0.88 0.04 85)", roughness: 1 } });
  // (3,0) half-tiled bathroom: tile run that stops mid-floor, toilet, sink, a box of tiles
  put(ctx, "l02-gd-tiles", { feetPosition: { x: cx(3, 0.5), y: BASE, z: cz(0, -0.6) }, primitive: box(2.9, 0.02, 2.6), material: BATHTILE, physics: "static" });
  B("l02-gd-toilet", "toilet", cx(3, 1.5), cz(0, -1.55), 0, {}); B("l02-gd-sink", "sink", cx(3, -0.6), cz(0, -1.55), 0);
  put(ctx, "l02-gd-tilebox", { feetPosition: { x: cx(3, -1.2), y: BASE, z: cz(0, 1.2) }, rotation: { yaw: 20 }, primitive: box(0.42, 0.22, 0.32), material: { color: "oklch(0.72 0.05 70)", roughness: 0.95 } });
  for (let i = 0; i < 6; i++) put(ctx, `l02-gd-tile${i}`, { feetPosition: { x: cx(3, -0.9 + (i % 3) * 0.31), y: BASE, z: cz(0, 0.75 + Math.floor(i / 3) * 0.31) }, rotation: { yaw: i * 7 }, primitive: box(0.3, 0.012, 0.3), material: BATHTILE });
  // (0,1) the first room: sawhorses and cut stock
  B("l02-gd-saw0", "sawhorse", cx(0, 0.3), cz(1, 0), 0); put(ctx, "l02-gd-lumber0", prop("lumber", { x: cx(0, 0.3), y: BASE + 0.76, z: cz(1, 0.05) }, 3, { physics: "static" }));
  // (1,1) drywall going up: stack, ladder, bucket of mud
  B("l02-gd-drywall", "drywall_stack", cx(1, 0), cz(1, 0), 0); B("l02-gd-ladder", "ladder", cx(1, 0.1), cz(1, 0.65), 4); B("l02-gd-mud", "bucket", cx(1, 0.95), cz(1, -0.1), 0);
  // (2,1) the old lift deck in the middle room, the Reality Freshener on it
  const [fx, fz] = G.fresh;
  put(ctx, "l02-gd-deck", { feetPosition: { x: fx, y: BASE, z: fz }, primitive: box(2.2, 0.16, 2.2), material: { ...STEEL, metalness: 0.7, roughness: 0.45, texture: "cdn/texture-diamond-plate-steel-floor.png", wrap: "repeat", repeat: [1, 1] }, physics: "static" });
  put(ctx, "l02-gd-cable", { feetPosition: { x: fx - 0.95, y: BASE + 0.16, z: fz - 0.95 }, primitive: { kind: "cylinder", radiusTop: 0.012, radiusBottom: 0.012, height: HT - 0.3, radialSegments: 6 }, material: { color: "oklch(0.3 0.01 60)", metalness: 0.7, roughness: 0.4 } });
  return layDress2(ctx, B, tarp);
}
function layDress2(ctx, B, tarp) {
  // (3,1) a sawhorse with the third lamp's spot beside it, cement bags
  const [lx, lz] = G.lamps["l02-lamp2"];
  B("l02-gd-saw1", "sawhorse", lx + 0.9, lz - 0.6, 90); B("l02-gd-cement0", "cement", cx(3, 1.2), cz(1, 1.3), 10); B("l02-gd-cement1", "cement", cx(3, 1.2), cz(1, 0.7), -6);
  // (0,2) the site office: desk, plans pinned under a mug, a chair pushed out
  B("l02-gd-desk", "office_desk", cx(0, 0.6), cz(2, 1.2), 0); B("l02-gd-dchair", "wchair", cx(0, 0.4), cz(2, 0.2), 160);
  put(ctx, "l02-gd-plans", { tags: ["usable"], feetPosition: { x: cx(0, 0.5), y: BASE + H("office_desk") + 0.003, z: cz(2, 1.15) }, rotation: { yaw: 4 }, primitive: box(0.6, 0.004, 0.42), material: { color: "oklch(0.62 0.09 250)", roughness: 0.9 },
    behavior: "scripts/l02-use.js", state: { kind: "read", name: "Floor plans", verb: "Read", text: "Twelve rooms on the plan. Every doorway drawn in pencil, rubbed out and drawn again. A note in the margin: \"Lamps stay ON. If they can see it, we don't touch it.\"" } });
  // (1,2) staged show home: a plant, a bench, nothing else, lit like a brochure
  B("l02-gd-plant", "plant", cx(1, 0.6), cz(2, 1.35), 20); B("l02-gd-bench", "bench", cx(1, -0.5), cz(2, 1.4), 0);
  // (2,2) lumber drop and a tarp
  B("l02-gd-lumber1", "lumber", cx(2, 0), cz(2, 1.2), 0); tarp("l02-gd-cloth2", cx(2, 0.4), cz(2, -0.6), 20, 2, 1.6);
  // (3,2) the crew exit: a door in the east wall, rough steps up to it, its sign
  const e = G.exit;
  put(ctx, "l02-gd-exitdoor", { feetPosition: { x: e.x + 0.22, y: BASE + 0.5, z: e.z }, rotation: { yaw: -90 }, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { style: "wood", w: 1.0, h: 2.1, part: "set", seed: 9 } } });
  for (let i = 0; i < 2; i++) put(ctx, `l02-gd-step${i}`, { feetPosition: { x: e.x - 0.5 + i * 0.3, y: BASE, z: e.z }, primitive: box(0.6 - i * 0.3, 0.25 * (i + 1), 1.3), material: STUD, physics: "static" });
  put(ctx, "l02-crew-exit", { tags: ["door"], feetPosition: { x: e.x - 0.05, y: BASE + 0.5, z: e.z }, physics: { body: "static", trigger: true }, primitive: box(0.35, 2.1, 1.0), visible: false, behavior: "scripts/l02-crew-exit.js" });
  put(ctx, "l02-gd-exitsign", { feetPosition: { x: e.x + 0.1, y: BASE + 2.85, z: e.z }, rotation: { yaw: -90 }, vector: "<svg viewBox='0 0 300 80' width='0.95m'><rect width='300' height='80' rx='5' fill='#1d6b2a' stroke='#e9f2d0' stroke-width='4'/><text x='150' y='54' text-anchor='middle' font-family='sans-serif' font-size='38' font-weight='bold' fill='#f4f7e8'>CREW EXIT ↑</text></svg>" });
  put(ctx, "l02-gd-exitglow", { feetPosition: { x: e.x - 0.4, y: BASE + 2.7, z: e.z }, light: { kind: "point", color: "oklch(0.8 0.14 145)", intensity: 0.5, distance: 4 } });
  // (no rule sign: unlit walls knock and shudder, lit ones hold still with a glowing edge)
  // work bulbs on cords: four lit, three dark spares
  for (const [i, c, r, lit] of [[0, 0, 1, 1], [1, 1, 0, 1], [2, 2, 1, 1], [3, 3, 2, 1], [4, 3, 0, 0], [5, 1, 2, 0], [6, 2, 2, 0]]) bulb(ctx, `l02-gd-bulb${i}`, cx(c, 0.3), cz(r, -0.2), !!lit, 0.7 + (i % 3) * 0.2);
  if (!("l02-gd-sheet" in ctx.place.objects)) { // a plastic drop sheet over the way in, stirring in the draft
    ctx.spawn("l02-gd-sheet", { feetPosition: { x: X + 0.18, y: BASE + 2.45, z: Z + C * 1.5 + G.fixed.w1.door }, rotation: { yaw: 90 }, children: [
      { feetPosition: { x: 0, y: -2.3, z: 0 }, primitive: { kind: "plane", width: 1.05, height: 2.3 }, material: { color: "oklch(0.95 0.01 90 / 0.32)", transparent: true, roughness: 0.25, side: "double", depthWrite: false } },
      { feetPosition: { x: 0, y: -0.02, z: 0 }, primitive: box(1.15, 0.04, 0.05), material: STUD }] });
    sway(ctx, "l02-gd-sheet", 3.4, 7, "pitch");
  }
  if (!("l02-gd-looset" in ctx.place.objects)) { // one ceiling tile fell out of a stack and hangs by its wire
    ctx.spawn("l02-gd-looset", { feetPosition: { x: cx(3, -0.6), y: BASE + HT - 0.05, z: cz(1, -0.9) }, children: [
      { feetPosition: { x: 0, y: -0.55, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.003, radiusBottom: 0.003, height: 0.55, radialSegments: 4 }, material: STEEL },
      { feetPosition: { x: 0.28, y: -0.78, z: 0 }, rotation: { roll: 62 }, primitive: box(0.6, 0.016, 0.6), material: { color: "oklch(0.93 0.01 90)", roughness: 0.95, texture: "cdn/texture-acoustic-drop-ceiling-tile-grid.png" } }] });
    sway(ctx, "l02-gd-looset", 4.2, 9, "pitch");
  }
  put(ctx, "l02-gd-drip", { feetPosition: { x: cx(0, -1.32), y: BASE + H("paintcan") * 2 - 0.02, z: cz(0, -1.42) }, fx: { script: DRIP } });
  put(ctx, "l02-gd-motes", { feetPosition: { x: X + C * 2, y: BASE + 0.4, z: Z + C * 1.5 }, fx: { script: MOTES } });
  put(ctx, "l02-gd-radio", { feetPosition: { x: 16.6, y: BASE + 1.2, z: -2 }, audio: { clip: RADIO, loop: true, gain: 0.16, spatial: true, refDistance: 4, maxDistance: 24 } });
}
