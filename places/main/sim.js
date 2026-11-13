import { restyleSigns } from "../../scripts/lib/sign-style.js";
import { dressThresholds } from "../../scripts/lib/thresholds.js";
import { overlapPoint } from "builtin/physics";
import { npcState } from "../../scripts/lib/stats.js";
import { LURKER_MODEL, FRENZIED_MODEL, LURKER_SCALE } from "../../scripts/lurkers.js";
import { pickVariant, vmul } from "../../scripts/lib/foe-variant.js";
import { MODEL as SMILER_MODEL, SCALE as SMILER_SCALE } from "../../scripts/smilers.js";
// Level 0's referee: keeps almond water on the floor and smilers in the dark.
import L from "../../scripts/lib/data/level0.yml";
const MID = (L.hub[0] + L.hub[1]) / 2; // the safe room's centre cell
import W, { rarityCap, rarityIdx } from "../../scripts/lib/weapons.js";
import { spawnAlmond, spawnWeapon, rollWeapon, rollCash } from "../../scripts/lib/loot.js";
import { spawnFurniture, pickKind, wallSpot0 } from "../../scripts/lib/furniture.js";
import { N, S, H, HALF, zoneOf, inHub, hasPit, hasPillar, cellCenter, cellAt, wallX, wallZ, EXIT, openPoint } from "../../scripts/lib/maze.js";
const PAPER = { texture: "/cdn/value.00a4e744acf9ab763779bbb0cc7f26fb1dd20aeafc69448c536939cd7212caeb.png", color: "oklch(0.98 0.01 90)", repeat: [1, 1] };
import B from "../../scripts/lib/data/breakables.yml";
import { syncLevel0 } from "../../scripts/lib/breakables.js";
import { layMoments, wallPose } from "../../scripts/lib/level0-moments.js";
import DR from "../../scripts/lib/data/l0-dress.yml";
import KC from "../../scripts/lib/data/l0-kit-ceiling.yml";
import KW from "../../scripts/lib/data/l0-kit-wall.yml";
import KP from "../../scripts/lib/data/l0-kit-props.yml";
import KM from "../../scripts/lib/data/l0-kit-camp.yml";
import { hash, isArchWall } from "../../scripts/lib/maze.js";
import { layZenithEntry } from "../../scripts/lib/zenith-quest.js";
import { layL02Door } from "../../scripts/lib/level02.js";
import { layXmas } from "../../scripts/lib/xmas-room.js";
export const cadence = "1s";
// office furniture: breakable props scattered through the halls (desk, chair, shelf: [mat, hp])
// Blender-built office pieces (art/office-furniture/build.py), front +Z
const FMODEL = { desk: "/cdn/value.dc2f7ac92df4c08964be1ea4af5e520bbf4c12d50609157f85b41db8f3c21fcf.glb", chair: "/cdn/value.34ee5f211b991e7489c032ed09d062af9fda8ef8a79c69afadafd1a650be47d8.glb", shelf: "/cdn/value.9f3b838cc1b4403a54d96e1b80372c75c9a440c1d4e61a4760f60de82133526b.glb", copier: "/cdn/value.5489a9397b8e52f5ea0f528a387d0449d0787726d6bc65bd041ec8faf80f9362.glb" };
const fmodel = (kind) => ({ id: FMODEL[kind], forward: "+z" });
const FURN = { desk: ["wood", 80], chair: ["metal", 45], shelf: ["metal", 110], copier: ["machine", 110] };
// what an office desk's drawers hold: office junk, snacks, a little cash, now and then a tool. Weights are Savi's picks; no ammo.
const DESK = [["cash", 22], ["bobbypin", 16], ["lobby_wafer", 12], ["bar", 9], ["almond", 12], ["tape", 8], ["battery", 8], ["book", 4], ["bandage", 5], ["weapon", 3]];
function deskItems(ctx) {
  const n = ctx.random() < 0.15 ? 0 : 1 + Math.floor(ctx.random() * 3), out = [], tot = DESK.reduce((a, [, w]) => a + w, 0);
  for (let i = 0; i < n; i++) {
    let r = ctx.random() * tot, k = "almond";
    for (const [kk, w] of DESK) { r -= w; if (r <= 0) { k = kk; break; } }
    out.push(k === "cash" ? rollCash(ctx) : k === "weapon" ? "weapon:" + rollWeapon(ctx) : k === "book" ? "book:lockpick" : k);
  }
  return out.join(",");
}
// Level 0 dressing (scripts/lib/data/l0-dress.yml): Tripo pieces put where an office would have left them, plus the modeled
// kit (l0-kit-*.yml): ceiling services, wall fittings, locked doors, office props and wanderer camps. Planned whole from
// hash() and a seeded roll (the same every run and every room), then laid DR.batch a tick so no tick stalls.
const fitBox = ([w, h, d]) => ({ box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } });
const sideWall = (cx, cz) => [0, 1, 2, 3].filter((d) => d === 0 ? wallX(cx, cz) : d === 1 ? wallZ(cx, cz) : d === 2 ? wallX(cx - 1, cz) : wallZ(cx, cz - 1));
const KIT = {}; for (const K of [KC, KW, KP, KM]) for (const k of Object.keys(K.models)) if ((DR.kit ?? []).includes(k)) KIT[k] = { id: K.models[k], size: DR.fix?.size?.[k] ?? K.sizes[k], origin: K.origin[k], fwd: DR.fix?.forward?.[k] ?? K.forward[k] ?? "-z" };
const SMALL = new Set(DR.small ?? []);
// a real wall on side d of a cell (arch walls are open frames, not faces); the cell across it; the wall's own key
const plainWall = (cx, cz, d) => d === 0 ? wallX(cx, cz) && !isArchWall(cx, cz, "x") : d === 1 ? wallZ(cx, cz) && !isArchWall(cx, cz, "z") : d === 2 ? wallX(cx - 1, cz) && !isArchWall(cx - 1, cz, "x") : wallZ(cx, cz - 1) && !isArchWall(cx, cz - 1, "z");
const across = (cx, cz, d) => [[cx + 1, cz], [cx, cz + 1], [cx - 1, cz], [cx, cz - 1]][d];
const wallKey = (cx, cz, d) => d === 0 ? `x:${cx}:${cz}` : d === 2 ? `x:${cx - 1}:${cz}` : d === 1 ? `z:${cx}:${cz}` : `z:${cx}:${cz - 1}`;
const faceKey = (cx, cz, d) => wallKey(cx, cz, d) + (d < 2 ? "a" : "b");
const otherFace = (cx, cz, d) => { const [ox, oz] = across(cx, cz, d); return faceKey(ox, oz, (d + 2) % 4); };
const worldAlong = (cx, cz, d, along) => { const w = wallPose(cx, cz, d, along); return d % 2 === 0 ? w.z : w.x; };
const seeded = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function dressPlan(ctx) {
  const rnd = seeded(DR.v * 7919), plan = [], used = new Set(), count = {};
  const s = ctx.place.state, broken = s.broken ?? {};
  // cells something else already tells a story in (moments, the safe room's furniture): the kit keeps out of them
  const busy = new Set();
  for (const o of ctx.query({ anyTags: ["moment", "furniture"], excludeTags: ["l0dress"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) { const c = cellAt(o.feetPosition.x, o.feetPosition.z); busy.add(c.cx + "," + c.cz); }
  const nearHub = (cx, cz) => cx >= L.hub[0] - 1 && cx <= L.hub[1] + 1 && cz >= L.hub[0] - 1 && cz <= L.hub[1] + 1;
  const open = (cx, cz) => cx >= 0 && cz >= 0 && cx < N && cz < N && !inHub(cx, cz) && !busy.has(cx + "," + cz);
  // the existing Tripo dressing, now rolled from a seed so every batch plans the same rooms
  const M = DR.models, add = (spec) => { plan.push(spec); const k = spec.tags[spec.tags.length - 1]; count[k] = (count[k] ?? 0) + 1; };
  const put = (kind, pos, yaw, extra = {}) => M[kind] && add({ tags: ["l0dress", "furniture", kind], feetPosition: pos, rotation: yaw, visibleRange: { max: 46 }, layout: fitBox(DR.sizes[kind]), model: { id: M[kind], forward: "-z" }, physics: { body: "static", collider: "box" }, ...extra });
  const cells = (zones, n, ok) => { const out = []; for (let k = 0; k < 4000 && out.length < n; k++) { const cx = 1 + Math.floor(rnd() * (N - 2)), cz = 1 + Math.floor(rnd() * (N - 2)), key = cx + "," + cz; if (used.has(key) || inHub(cx, cz) || hasPit(cx, cz) || hasPillar(cx, cz) || !zones.includes(zoneOf(cx, cz))) continue; const w = sideWall(cx, cz); if (!w.length || (ok && !ok(cx, cz))) continue; used.add(key); out.push([cx, cz, w[Math.floor(rnd() * w.length)]]); } return out; };
  // cubicles, each left its own way (l0-dress.yml offices): some cleared out, chairs gone or knocked over, desks shoved off the wall
  const OF = DR.offices ?? {}, cubeLeft = [];
  for (const [cx, cz, d] of cells(["offices"], DR.counts.cubicles)) {
    const side = rnd() < 0.5 ? -1 : 1, chOff = (rnd() - 0.5) * 0.4, chYaw = (rnd() - 0.5) * 70, pnYaw = (rnd() - 0.5) * 6;
    const hv = (s) => (hash(cx, cz, s) * 9.973) % 1, cleared = hv(601) < (OF.cleared ?? 0), shove = hv(602) * (OF.shove ?? 0);
    const desk = wallPose(cx, cz, d, side * 0.4, 0.42 + shove), yaw = desk.yaw + 180 + (hv(604) - 0.5) * 2 * (OF.deskYaw ?? 0);
    if (!cleared) add({ tags: ["l0dress", "breakable", "furniture", "container", "desk"], feetPosition: { x: desk.x, y: 0, z: desk.z }, rotation: yaw, visibleRange: { max: 46 }, castShadow: true, physics: { body: "static", collider: "box" }, model: fmodel("desk"), state: { mat: "wood", hp: 80, items: null, name: "Desk drawers" } });
    else cubeLeft.push([hv(606) < 0.5 ? "box-single" : "bin", desk.x, desk.z, hv(607) * 360]);
    const rc = hv(603), noChair = OF.noChair ?? 0, top = noChair + (OF.toppled ?? 0);
    if (rc >= noChair) {
      const ch = wallPose(cx, cz, d, side * 0.4 + chOff * (rc < top ? 3 : 1), rc < top ? 1.6 : 1.25 + shove), spun = hv(608) < (OF.spun ?? 0) ? 180 : 0;
      add({ tags: ["l0dress", "breakable", "furniture", "chair"], feetPosition: { x: ch.x, y: rc < top ? (OF.toppledLift ?? 0.27) : 0, z: ch.z }, rotation: rc < top ? { yaw: hv(609) * 360, pitch: 0, roll: 90 } : desk.yaw + chYaw + spun, visibleRange: { max: 46 }, physics: { body: "static", collider: "box" }, model: fmodel("chair"), state: { mat: "metal", hp: 45 } });
    }
    if (cleared || hv(610) >= (OF.noPanel ?? 0)) { const pn = wallPose(cx, cz, d, side * 0.4 - side * 0.95, 0.75); put("partition", { x: pn.x, y: 0, z: pn.z }, desk.yaw + 90 + pnYaw * (cleared ? 3 : 1), { state: { mat: "wood", hp: 60 }, tags: ["l0dress", "breakable", "furniture", "partition"] }); }
    if (!cleared && hv(611) < (OF.clutter ?? 0)) { const c = wallPose(cx, cz, d, side * 0.4 + side * 0.85, 0.3); cubeLeft.push([hv(612) < 0.5 ? "bin" : "box-single", c.x, c.z, hv(613) * 360]); }
  }
  for (const [cx, cz, d] of cells(["halls", "expanse", "offices"], DR.counts.coolers)) { const w = wallPose(cx, cz, d, (rnd() - 0.5) * 2.2, 0.22); put("cooler", { x: w.x, y: 0, z: w.z }, w.yaw + (rnd() - 0.5) * 10, { state: { mat: "metal", hp: 50 }, tags: ["l0dress", "breakable", "furniture", "cooler"] }); }
  for (const [cx, cz] of cells(["arches", "halls"], DR.counts.wetsigns, (cx, cz) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => zoneOf(cx + a, cz + b) === "arches"))) { const c = cellCenter(cx, cz); put("wetsign", { x: c.x + (rnd() - 0.5) * 2, y: 0, z: c.z + (rnd() - 0.5) * 2 }, rnd() * 360, { physics: { body: "static", collider: "box" }, tags: ["l0dress", "furniture", "wetsign"] }); }

  // the kit: one row per piece, tags ["l0dress", kind], at its true size
  const kput = (kind, x, y, z, yaw) => {
    const k = KIT[kind]; if (!k) return;
    const [w, h, d] = k.size, small = SMALL.has(kind), solid = k.origin === "floor" && Math.max(w, d) > 0.3 && h > 0.15 && !kind.startsWith("door");
    add({ tags: ["l0dress", kind], feetPosition: { x, y, z }, rotation: yaw, visibleRange: { max: small ? 22 : 46 }, ...(small || k.origin === "ceiling" ? { castShadow: false } : {}), layout: fitBox(k.size), model: { id: k.id, forward: k.fwd }, ...(solid ? { physics: { body: "static", collider: "box" } } : {}) });
  };
  for (const [kind, x, z, yaw] of cubeLeft) kput(kind, x, 0, z, yaw);
  const C = DR.ceiling, Wc = DR.wall, P = DR.props;
  const order = (seed, ok) => { const out = []; for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) if (ok(cx, cz)) out.push([hash(cx, cz, seed), cx, cz]); return out.sort((a, b) => a[0] - b[0]).map(([, cx, cz]) => [cx, cz]); };
  const lo = (c) => c * S - HALF;
  // the ceiling's own damage (level0-geo.js, hash 103): the tile a cell is missing or sagging, so nothing is screwed into a hole
  const tileOf = (cx, cz) => { const h = hash(cx, cz, 103); if (inHub(cx, cz) || h > 0.07) return null; const tx = lo(cx) + 0.6 + Math.floor(hash(cx, cz, 105) * 4) * 0.6 + (hash(cx, cz, 105) < 0.5 ? 0 : 1.2), tz = lo(cz) + 0.6 + Math.floor(hash(cx, cz, 107) * 2) * 0.6 + (hash(cx, cz, 107) < 0.5 ? 0 : 2.0); return { x: tx + 0.3, z: tz + 0.3, missing: h < 0.035 }; };
  const clearOfTile = (cx, cz, x, z) => { const t = tileOf(cx, cz); return !t || Math.max(Math.abs(t.x - x), Math.abs(t.z - z)) > 0.75; };
  const ceil = (kind, x, z, yaw = 0) => kput(kind, x, 3.0 - KIT[kind].size[1] - 0.004, z, yaw);
  // CEILING: diffusers on a 3x2 cell rhythm and over every vent the shell paints, a sprinkler line on every other column of cells
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (!open(cx, cz) || nearHub(cx, cz)) continue;
    const c = cellCenter(cx, cz);
    const vent = hash(cx, cz, 37) < 0.08, vx = c.x + 1.3, vz = c.z - 1.2;
    if (vent) kput("diffuser", vx, 3.0 - 0.08 - 0.012, vz, 0); // flush over the painted vent square (it sits at H - 0.01)
    else if (cx % C.diffuserX === 0 && cz % C.diffuserZ === 0 && clearOfTile(cx, cz, vx, vz)) ceil("diffuser", vx, vz);
    else if (hash(cx, cz, 203) < 1 / C.grilleOne && clearOfTile(cx, cz, c.x + 1.3, c.z + 1.3)) ceil("returngrille", c.x + 1.3, c.z + 1.3);
    if (cx % C.sprinklerEvery === 0 && clearOfTile(cx, cz, c.x - 1, c.z + 1)) ceil("sprinkler", c.x - 1.0, c.z + 1.0);
    if (hash(cx, cz, 205) < 1 / C.smokeOne && clearOfTile(cx, cz, c.x - 1.0, c.z - 1.0)) ceil("smokedet", c.x - 1.0, c.z - 1.0);
  }
  // hanging troffers: a fixture that came half down in the dark and red rooms, its fallen tile under the hole beside it
  const fallTile = (cx, cz, x, z, seed) => { const a = lo(cx) + 0.5, b = lo(cx) + S - 0.5, e = lo(cz) + 0.5, f = lo(cz) + S - 0.5; kput("tile-fallen", Math.min(b, Math.max(a, x + (hash(cx, cz, seed) - 0.5) * 0.5)), 0, Math.min(f, Math.max(e, z + (hash(cx, cz, seed + 1) - 0.5) * 0.5)), hash(cx, cz, seed + 2) * 360); };
  const floorCells = new Set();
  let nt = 0;
  for (const [cx, cz] of order(211, (cx, cz) => open(cx, cz) && ["dark", "red"].includes(zoneOf(cx, cz)) && !hasPit(cx, cz) && tileOf(cx, cz)?.missing)) {
    if (nt >= C.troffers) break;
    const c = cellCenter(cx, cz), t = tileOf(cx, cz);
    const spots = [[c.x + 1.25, c.z, 0], [c.x - 1.25, c.z, 0], [c.x, c.z + 1.25, 90], [c.x, c.z - 1.25, 90]].map((p) => [...p, Math.hypot(p[0] - t.x, p[1] - t.z)]).filter((p) => p[3] > 0.9).sort((a, b) => b[3] - a[3] + (hash(cx, cz, 213) - 0.5));
    if (!spots.length) continue;
    const [x, z, yaw] = spots[0]; ceil("troffer-hang", x, z, yaw + (hash(cx, cz, 215) < 0.5 ? 0 : 180));
    fallTile(cx, cz, t.x, t.z, 217); floorCells.add(cx + "," + cz); nt++;
  }
  // fallen tiles: under the holes in the pits and the arch rooms first, then where the wet arch ceilings shed one
  let nf = 0;
  for (const [cx, cz] of order(221, (cx, cz) => open(cx, cz) && ["holes", "arches"].includes(zoneOf(cx, cz)) && !hasPit(cx, cz) && !hasPillar(cx, cz))) {
    if (nf >= C.fallenTiles) break;
    const t = tileOf(cx, cz); if (t && !t.missing) continue;
    if (!t && hash(cx, cz, 223) > 0.25) continue;
    const c = cellCenter(cx, cz); fallTile(cx, cz, t ? t.x : c.x + (hash(cx, cz, 225) - 0.5) * 2, t ? t.z : c.z + (hash(cx, cz, 227) - 0.5) * 2, 229); floorCells.add(cx + "," + cz); nf++;
  }

  // WALLS: every piece flush on a plain face, 0.5 m clear of the next on that face, none on the safe room's walls
  const res = new Map(); // face -> [[lo, hi]] in world metres along it
  const free = (f, a, b) => !(res.get(f) ?? []).some(([p, q]) => a < q + Wc.gap && b > p - Wc.gap);
  const take = (f, a, b) => { if (!res.has(f)) res.set(f, []); res.get(f).push([a, b]); };
  const span = (cx, cz, d, along, hw) => { const m = worldAlong(cx, cz, d, along); return [m - hw, m + hw]; };
  // what the dressing above already stood on walls: coolers and desk ends keep their stretch of wall
  for (const sp of plan) { const p = sp.feetPosition, { cx, cz } = cellAt(p.x, p.z); for (let d = 0; d < 4; d++) { if (!plainWall(cx, cz, d)) continue; const w = wallPose(cx, cz, d, 0); if (Math.abs(d % 2 === 0 ? p.x - w.x : p.z - w.z) < 1.4) { const m = d % 2 === 0 ? p.z : p.x; take(faceKey(cx, cz, d), m - 0.9, m + 0.9); } } }
  // the shell's own wall moments (level0-geo.js stains, hash 99) and broken walls stay bare
  const faces = [];
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) for (let d = 0; d < 4; d++) {
    if (!open(cx, cz) || !plainWall(cx, cz, d) || broken[wallKey(cx, cz, d)]) continue;
    const [ox, oz] = across(cx, cz, d); if (nearHub(cx, cz) || (ox >= 0 && oz >= 0 && ox < N && oz < N && (inHub(ox, oz) || nearHub(ox, oz)))) continue;
    if (d === 0 && hash(cx, cz, 99) < 0.12) { const zz = cellCenter(cx, cz).z + (hash(cx, cz, 101) - 0.5) * 2.5; take(faceKey(cx, cz, 0), zz - 0.6, zz + 0.6); }
    faces.push([cx, cz, d]);
  }
  const reach = (hw) => 2 - 0.1 - hw - 0.15; // the farthest a piece's middle may sit from the face's middle
  const onFace = (kind, cx, cz, d, along, y, both = false, off = null) => {
    const [w, , dp] = KIT[kind].size, hw = w / 2;
    if (Math.abs(along) > reach(hw)) return false;
    const f = faceKey(cx, cz, d), [a, b] = span(cx, cz, d, along, hw);
    if (!free(f, a, b) || (both && !free(otherFace(cx, cz, d), a, b))) return false;
    take(f, a, b); if (both) take(otherFace(cx, cz, d), a, b);
    const p = wallPose(cx, cz, d, along, off ?? dp / 2 + 0.002); kput(kind, p.x, y, p.z, p.yaw); return true;
  };
  const byHash = (seed) => faces.map((f) => [hash(f[0] * 4 + f[2], f[1], seed), f]).sort((a, b) => a[0] - b[0]).map(([, f]) => f);
  const alongOf = (cx, cz, d, seed, r) => (hash(cx * 4 + d, cz, seed) - 0.5) * 2 * r;
  const fill = (n, seed, tryOne) => { let k = 0; for (const [cx, cz, d] of byHash(seed)) { if (k >= n) break; if (tryOne(cx, cz, d)) k++; } return k; };
  // locked office doors, set into the wall's thickness (seen from both rooms), a light switch by some of them
  const doors = [];
  fill(Wc.doors, 301, (cx, cz, d) => { const [ox, oz] = across(cx, cz, d); if (ox < 0 || oz < 0 || ox >= N || oz >= N || busy.has(ox + "," + oz) || !["halls", "offices", "expanse", "dark", "red", "holes"].includes(zoneOf(cx, cz))) return false; const al = alongOf(cx, cz, d, 303, 1.1); if (!onFace("door-office", cx, cz, d, al, 0, true, -0.1)) return false; doors.push([cx, cz, d, al]); return true; });
  let sw = 0;
  for (const [cx, cz, d, al] of doors) if (hash(cx, cz, 305) < 0.6 && onFace("switch", cx, cz, d, al + (al < 0 ? 0.78 : -0.78), 1.2)) sw++;
  // switches at the ends of walls that stop at an opening, as if the room had once been lit from its doorway
  const runsOn = (cx, cz, d, sgn) => { const n = (d + (sgn > 0 ? 1 : 3)) % 4, [nx, nz] = across(cx, cz, n); return nx >= 0 && nz >= 0 && nx < N && nz < N && plainWall(nx, nz, d); };
  sw += fill(Wc.switches - sw, 311, (cx, cz, d) => { const sgn = hash(cx, cz, 313 + d) < 0.5 ? 1 : -1; if (runsOn(cx, cz, d, sgn) || plainWall(cx, cz, (d + (sgn > 0 ? 1 : 3)) % 4)) return false; return onFace("switch", cx, cz, d, sgn * 1.55, 1.2); });
  fill(Wc.exitsigns, 321, (cx, cz, d) => onFace("exitsign", cx, cz, d, alongOf(cx, cz, d, 323, 1.2), 2.3));
  fill(Wc.firepairs, 331, (cx, cz, d) => { const al = alongOf(cx, cz, d, 333, 1.0), sgn = al < 0 ? 1 : -1, f = faceKey(cx, cz, d), [a, b] = span(cx, cz, d, al + sgn * 0.22, 0.42); if (Math.abs(al) > 1.2 || !free(f, a, b)) return false; take(f, a, b); const p = wallPose(cx, cz, d, al, 0.027), e = wallPose(cx, cz, d, al + sgn * 0.45, 0.121); kput("firepull", p.x, 1.2, p.z, p.yaw); kput("extinguisher", e.x, 0.9, e.z, e.yaw); return true; });
  fill(Wc.thermostats, 341, (cx, cz, d) => onFace("thermostat", cx, cz, d, alongOf(cx, cz, d, 343, 1.4), 1.5));
  fill(Wc.wallvents, 351, (cx, cz, d) => onFace("wallvent", cx, cz, d, alongOf(cx, cz, d, 353, 1.0), 0.12));
  for (const [cx, cz, d] of faces) if (hash(cx * 4 + d, cz, 361) < 1 / Wc.outletEvery) onFace("outlet", cx, cz, d, alongOf(cx, cz, d, 363, 1.5), 0.3);

  // FLOOR: office leftovers inside each room's walls, 1.2 m off every open edge so the walkways stay clear
  const rects = new Map();
  const roomBox = (cx, cz) => { const m = (d) => plainWall(cx, cz, d) ? 0.07 : 1.2; return [lo(cx) + m(2), lo(cx) + S - m(0), lo(cz) + m(3), lo(cz) + S - m(1)]; };
  const fp = (x, z, w, d, yaw) => { const q = Math.abs(Math.round(yaw / 90)) % 2 === 1, a = (q ? d : w) / 2 + 0.03, b = (q ? w : d) / 2 + 0.03; return [x - a, x + a, z - b, z + b]; };
  const fits = (cx, cz, r) => { const [x0, x1, z0, z1] = roomBox(cx, cz); if (r[0] < x0 || r[1] > x1 || r[2] < z0 || r[3] > z1) return false; return !(rects.get(cx + "," + cz) ?? []).some((o) => r[0] < o[1] && r[1] > o[0] && r[2] < o[3] && r[3] > o[2]); };
  const floor = (kind, cx, cz, x, z, yaw, y = 0, check = true) => { const [w, , d] = KIT[kind].size, r = fp(x, z, w, d, yaw); if (check && !fits(cx, cz, r)) return false; const k = cx + "," + cz; if (!rects.has(k)) rects.set(k, []); if (check) rects.get(k).push(r); kput(kind, x, y, z, yaw); return true; };
  const flat = (cx, cz) => open(cx, cz) && !nearHub(cx, cz) && !hasPit(cx, cz) && !hasPillar(cx, cz) && !used.has(cx + "," + cz) && !floorCells.has(cx + "," + cz);
  const wallsOf = (cx, cz) => [0, 1, 2, 3].filter((d) => plainWall(cx, cz, d));
  const jit = (cx, cz, s, r) => (hash(cx, cz, s) - 0.5) * 2 * r;
  // camps first: 6 dead ends (three walls) with what a wanderer slept beside
  const campCells = [];
  for (const [cx, cz] of order(501, (cx, cz) => flat(cx, cz) && wallsOf(cx, cz).length === 3 && !["red"].includes(zoneOf(cx, cz)))) {
    if (campCells.length >= DR.camps) break;
    if (campCells.some(([a, b]) => Math.abs(a - cx) + Math.abs(b - cz) < 6)) continue;
    const w3 = wallsOf(cx, cz), back = [0, 1, 2, 3].find((d) => w3.includes(d) && w3.includes((d + 1) % 4) && w3.includes((d + 3) % 4)), sg = hash(cx, cz, 503) < 0.5 ? 1 : -1;
    const at = (u, v) => wallPose(cx, cz, back, sg * u, v), yaw0 = wallPose(cx, cz, back, 0).yaw;
    // one camp kit, a different story each time (l0-dress.yml campVariants): two sleepers, a hoard, one left in a hurry
    const VN = Object.keys(DR.campVariants ?? { solo: {} }), V = DR.campVariants?.[VN[(campCells.length + Math.floor(hash(cx, cz, 521) * VN.length)) % VN.length]] ?? {};
    const CAMP = [["sleepingbag", 1.4, 1.11, 0, 3], ["backpack", 0.85, 0.3, 160, 20], ["lantern", 0.4, 0.22, null, 180], ["almond-crate", 0.85, 0.9, 90, 12], ["campstove", 0.8, 1.6, -90, 25], ["tape-marks", 0.35, 1.0, null, 180], ["note-clipboard", 0.3, 1.55, 0, 30], ["shoes", 1.4, 2.3, 180, 25]];
    CAMP.forEach(([kind, u, v, yo, j], i) => { if (hash(cx, cz, 531 + i) < (V.drop?.[kind] ?? 0)) return; const p = at(u, v); kput(kind, p.x, 0, p.z, (yo == null ? 0 : yaw0 + yo) + jit(cx, cz, 505 + i * 2, j)); });
    (V.add ?? []).forEach(([kind, u, v, yo, j], i) => { const p = at(u, v); kput(kind, p.x, 0, p.z, yaw0 + yo + jit(cx, cz, 551 + i, j)); });
    campCells.push([cx, cz]); used.add(cx + "," + cz);
  }
  // plants: corners near the safe room, where someone still tried
  const corners = (cx, cz) => [[0, 1], [1, 2], [2, 3], [3, 0]].filter(([a, b]) => plainWall(cx, cz, a) && plainWall(cx, cz, b));
  const inCorner = (kind, cx, cz, [a, b], gap = 0.04) => { const [w, , d] = KIT[kind].size, al = (b === (a + 1) % 4 ? 1 : -1) * (1.9 - w / 2 - gap), p = wallPose(cx, cz, a, al, d / 2 + gap); return floor(kind, cx, cz, p.x, p.z, p.yaw + jit(cx, cz, 531 + a, 4)); };
  let n = 0;
  for (const [cx, cz] of order(521, (cx, cz) => flat(cx, cz) && Math.max(Math.abs(cx - MID), Math.abs(cz - MID)) <= 8 && corners(cx, cz).length)) { if (n >= P.plants) break; if (inCorner("fakeplant", cx, cz, corners(cx, cz)[0], 0.02)) n++; }
  const office = order(541, (cx, cz) => flat(cx, cz) && (zoneOf(cx, cz) === "offices" || (zoneOf(cx, cz) === "halls" && hash(cx, cz, 543) < P.hallShare)));
  const want = { tables: P.tables, chairs: P.chairs, crt: P.crt, phone: P.phone, bins: P.bins, filing: P.filing, copier: P.copier, stacks: P.stacks, singles: P.singles }, got = { tables: 0, chairs: 0, crt: 0, phone: 0, bins: 0, filing: 0, copier: 0, stacks: 0, singles: 0 };
  const more = (k) => got[k] < want[k];
  // a table backed on a wall, chairs pulled up on the room side, the machine and the phone left on top, a bin underfoot
  for (const [cx, cz] of office) {
    if (!more("tables")) break;
    const ws = wallsOf(cx, cz); if (!ws.length) continue;
    const d = ws[Math.floor(hash(cx, cz, 551) * ws.length)], al = jit(cx, cz, 553, 0.8), t = wallPose(cx, cz, d, al, 0.43), yaw = t.yaw + jit(cx, cz, 555, 3);
    if (!floor("folding-table", cx, cz, t.x, t.z, t.yaw)) continue;
    got.tables++; const ti = got.tables;
    const nch = 1 + Math.floor(hash(cx, cz, 557) * 3);
    for (let i = 0; i < nch && more("chairs"); i++) { const ca = al + (i === 0 ? -0.45 : i === 1 ? 0.45 : 0) + jit(cx, cz, 559 + i, 0.12), co = i === 2 ? 0.43 : 1.15 + jit(cx, cz, 563 + i, 0.15); if (i === 2) { const e = al + (hash(cx, cz, 567) < 0.5 ? -1.25 : 1.25), p = wallPose(cx, cz, d, e, 0.45); if (floor("stack-chair", cx, cz, p.x, p.z, t.yaw + (e > al ? 90 : -90) + 180 + jit(cx, cz, 569, 15))) got.chairs++; continue; } const p = wallPose(cx, cz, d, ca, co); if (floor("stack-chair", cx, cz, p.x, p.z, t.yaw + 180 + jit(cx, cz, 571 + i, 18))) got.chairs++; }
    if (more("crt") && ti % 4 !== 0) { const p = wallPose(cx, cz, d, al - 0.45, 0.33); kput("crt", p.x, 0.74, p.z, t.yaw + jit(cx, cz, 573, 8)); got.crt++; }
    if (more("phone") && ti % 4 !== 1) { const p = wallPose(cx, cz, d, al + 0.5, 0.35); kput("phone", p.x, 0.74, p.z, t.yaw + jit(cx, cz, 575, 25)); got.phone++; }
    if (more("bins")) { const p = wallPose(cx, cz, d, al + (hash(cx, cz, 577) < 0.5 ? -1.12 : 1.12), 0.2); if (floor("bin", cx, cz, p.x, p.z, jit(cx, cz, 579, 180))) got.bins++; }
  }
  // filing cabinets in a row against a wall, a copier on another, a bin beside; box stacks in the corners, loose archive boxes by them
  for (const [cx, cz] of office) {
    const ws = wallsOf(cx, cz); if (!ws.length) continue;
    const role = hash(cx, cz, 581);
    if (role < 0.45 && more("filing")) { const d = ws[Math.floor(hash(cx, cz, 583) * ws.length)], k = 1 + Math.floor(hash(cx, cz, 585) * 3), a0 = jit(cx, cz, 587, 0.9); for (let i = 0; i < k && more("filing"); i++) { const p = wallPose(cx, cz, d, a0 + i * 0.4, 0.31); if (floor("filing", cx, cz, p.x, p.z, p.yaw)) got.filing++; } if (more("bins") && hash(cx, cz, 589) < 0.6) { const p = wallPose(cx, cz, d, a0 - 0.45, 0.2); if (floor("bin", cx, cz, p.x, p.z, jit(cx, cz, 591, 180))) got.bins++; } }
    else if (role < 0.6 && more("copier")) { const d = ws[Math.floor(hash(cx, cz, 593) * ws.length)], p = wallPose(cx, cz, d, jit(cx, cz, 595, 0.8), 0.38); if (floor("copier", cx, cz, p.x, p.z, p.yaw + jit(cx, cz, 597, 4))) { got.copier++; if (more("singles")) { const q = wallPose(cx, cz, d, jit(cx, cz, 595, 0.8) + 0.62, 0.17); if (floor("box-single", cx, cz, q.x, q.z, q.yaw + jit(cx, cz, 599, 15))) got.singles++; } } }
    const cs = corners(cx, cz);
    for (let i = 0; i < cs.length && more("stacks"); i++) {
      if (hash(cx, cz, 601 + i) > 0.55) continue;
      if (inCorner("boxes-stack", cx, cz, cs[i])) { got.stacks++; if (more("singles") && hash(cx, cz, 611 + i) < 0.75) { const [a, b] = cs[i], sgn = b === (a + 1) % 4 ? 1 : -1, p = wallPose(cx, cz, a, sgn * (1.9 - 1.0 - 0.28), 0.18 + jit(cx, cz, 613, 0.05)); if (floor("box-single", cx, cz, p.x, p.z, p.yaw + jit(cx, cz, 615 + i, 20))) got.singles++; } }
    }
  }
  return { plan, count };
}
export function dress(ctx, step) {
  if (step === 0 && DR.darkRim) { // the blackout's edge: the lamps that reach into it are dead or failing, never dimmer copies
    let i = 0; for (const id of Object.keys(ctx.place.objects)) { if (!id.startsWith("level0-lights/")) continue; const o = ctx.place.objects[id], f = o?.feetPosition; if (!f || !o.light) continue; const { cx, cz } = cellAt(f.x, f.z), r = DR.darkRim.reach ?? 1;
      let near = false; for (let a = -r; a <= r && !near; a++) for (let b = -r; b <= r; b++) if (cx + a >= 0 && cz + b >= 0 && cx + a < N && cz + b < N && zoneOf(cx + a, cz + b) === "dark") { near = true; break; }
      if (!near) continue; const h = hash(cx, cz, 701); i++;
      o.light = { ...o.light, intensity: h < DR.darkRim.dead ? 0 : DR.darkRim.failing, color: h < DR.darkRim.dead ? o.light.color : DR.darkRim.color }; }
    ctx.place.state.darkRimLights = i; }
  if (step === 0) for (const o of ctx.query({ tags: ["l0dress"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(o.id);
  const { plan } = dressPlan(ctx), B = DR.batch ?? 200, part = plan.slice(step * B, step * B + B);
  for (const spec of part) { if (spec.tags.includes("desk")) spec.state.items = deskItems(ctx); ctx.spawn(spec); }
  return part.length === B; // more to lay next tick
}
function furnish(ctx) {
  let n = 0;
  for (let k = 0; k < 900 && n < (L.furniture ?? 140); k++) {
    const cx = 1 + Math.floor(ctx.random() * (N - 2)), cz = 1 + Math.floor(ctx.random() * (N - 2));
    if (inHub(cx, cz) || hasPit(cx, cz) || hasPillar(cx, cz) || !["halls", "expanse", "dark", "red"].includes(zoneOf(cx, cz))) continue;
    const c = cellCenter(cx, cz), r = ctx.random(), kind = r < 0.38 ? "desk" : r < 0.64 ? "chair" : r < 0.84 ? "shelf" : "copier", [mat, hp] = FURN[kind];
    const along = ctx.random() < 0.5, side = ctx.random() < 0.5 ? -1 : 1, off = kind === "shelf" || kind === "copier" ? S / 2 - 0.35 : (ctx.random() - 0.5) * 1.6;
    const pos = along ? { x: c.x + side * off, y: 0, z: c.z + (ctx.random() - 0.5) } : { x: c.x + (ctx.random() - 0.5), y: 0, z: c.z + side * off };
    const yaw = kind === "chair" ? ctx.random() * 360 : (along ? 90 : 0) + (side < 0 ? 180 : 0);
    ctx.spawn({ tags: kind === "desk" ? ["breakable", "furniture", kind, "container"] : ["breakable", "furniture", kind], feetPosition: pos, rotation: yaw, visibleRange: { max: 46 }, castShadow: kind !== "chair", physics: { body: "static", collider: "box" }, model: fmodel(kind), state: { mat, hp, maxHp: hp, name: kind === "desk" ? "Desk drawers" : kind[0].toUpperCase() + kind.slice(1), ...(kind === "desk" ? { items: deskItems(ctx) } : {}) } });
    n++;
  }
}
// sunken furniture (Kane Pixel's Backrooms): office pieces half swallowed by the carpet, tilted where they went under, a dark damp ring around each
const SUNK_H = { desk: 0.76, chair: 0.95, shelf: 1.9, copier: 1.15 }; // her pick: rough heights of build-geo's kinds
function sink(ctx) {
  let n = 0;
  for (let k = 0; k < 600 && n < (L.sunken ?? 42); k++) {
    const cx = 1 + Math.floor(ctx.random() * (N - 2)), cz = 1 + Math.floor(ctx.random() * (N - 2));
    if (inHub(cx, cz) || hasPit(cx, cz) || hasPillar(cx, cz)) continue;
    if (Math.abs(cx - MID) < 5 && Math.abs(cz - MID) < 5) continue;
    const c = cellCenter(cx, cz), r = ctx.random(), kind = r < 0.35 ? "desk" : r < 0.65 ? "chair" : r < 0.85 ? "shelf" : "copier";
    const h = SUNK_H[kind], depth = h * (0.35 + ctx.random() * 0.4); // 35-75% under the carpet
    const x = c.x + (ctx.random() - 0.5) * 1.6, z = c.z + (ctx.random() - 0.5) * 1.6;
    const tilt = (ctx.random() - 0.5) * 36, roll = (ctx.random() - 0.5) * 28;
    const id = ctx.spawn({ tags: ["furniture", "sunken", "breakable", kind], feetPosition: { x, y: -depth, z }, rotation: { yaw: ctx.random() * 360, pitch: tilt, roll }, visibleRange: { max: 46 }, castShadow: false, physics: { body: "static", collider: "box" }, model: fmodel(kind), state: { name: "Sunken " + kind, mat: kind === "chair" ? "wood" : "metal", hp: 60, maxHp: 60 } }); // Z heaves it out of the carpet (grab.js), a swing breaks it
    // the carpet slumps into a wet dark ring where it went down
    ctx.spawn({ tags: ["sunken-stain"], feetPosition: { x, y: 0.012, z }, rotation: { pitch: -90 }, castShadow: false, visibleRange: { max: 30 }, primitive: { kind: "circle", radius: 0.9 + h * 0.5, segments: 20 }, material: { color: "oklch(0.2 0.03 70 / 0.55)", transparent: true, roughness: 0.35, depthWrite: false }, receiveShadow: true });
    ctx.spawn({ tags: ["sunken-stain"], feetPosition: { x, y: 0.014, z }, rotation: { pitch: -90 }, castShadow: false, visibleRange: { max: 30 }, primitive: { kind: "circle", radius: 0.45 + h * 0.3, segments: 16 }, material: { color: "oklch(0.13 0.02 70 / 0.7)", transparent: true, roughness: 0.2, depthWrite: false } });
    n++;
  }
}
// broken walls stay broken for this room, then grow back (never while someone stands in the gap)
function regrow(ctx, s, now) {
  const br = s.broken; if (!br) return;
  for (const [k, at] of Object.entries(br)) {
    if (now - at < B.regrowMinutes * 60000) continue;
    const [ax, cx, cz] = k.split(":"), c = cellCenter(+cx, +cz), w = ax === "x" ? { x: c.x + S / 2, z: c.z } : { x: c.x, z: c.z + S / 2 };
    if (ctx.place.players.some((p) => Math.abs(p.feetPosition.x - w.x) < 1.2 && Math.abs(p.feetPosition.z - w.z) < 1.2)) continue;
    delete br[k];
  }
}

function cell(ctx, zones) {
  for (let k = 0; k < 60; k++) {
    const cx = Math.floor(ctx.random() * N), cz = Math.floor(ctx.random() * N);
    if (inHub(cx, cz) || hasPit(cx, cz)) continue;
    if (Math.abs(cx - MID) < 6 && Math.abs(cz - MID) < 6) continue; // not right outside the safe room
    if (zones && k < 45 && !zones.includes(zoneOf(cx, cz))) continue;
    return cellCenter(cx, cz);
  }
  return null;
}

const CREATURES = ["smiler", "lurker", "hound", "stealer", "npc"];
// a creature found inside a wall (a shifted wall, a lunge through a corner) is set back in the middle of the nearest open cell
function nearOpen(cx, cz) { for (let r = 1; r < 4; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { const x = cx + dx, z = cz + dz; if (x >= 0 && z >= 0 && x < N && z < N && !hasPit(x, z) && !inHub(x, z)) return { cx: x, cz: z }; } return { cx, cz }; }
function unstick(ctx, s, now) {
  if (now < (s.unstickAt ?? 0)) return; s.unstickAt = now + 1500;
  for (const c of ctx.query({ anyTags: CREATURES, radius: 60, center: ctx.place.players[0].feetPosition })) {
    if (c.state?.dead) continue;
    const f = c.feetPosition, hit = overlapPoint(ctx, { x: f.x, y: f.y + 0.9, z: f.z });
    const inWall = (hit?.objects ?? []).some((o) => (o.id ?? o) !== c.id && !String(o.id ?? o).startsWith(c.id + "/"));
    const pc = cellAt(f.x, f.z), inPit = f.y < -0.4 && hasPit(pc.cx, pc.cz); // dropped into a floor hole: set back up on the nearest open floor
    if (!inWall && !inPit) continue;
    const { cx, cz } = inPit ? nearOpen(pc.cx, pc.cz) : pc, m = openPoint(cx, cz);
    const o = ctx.place.objects[c.id]; if (!o) continue;
    o.feetPosition = { x: m.x, y: inPit ? 0.05 : Math.max(0.02, f.y), z: m.z }; o.velocity = { x: 0, y: 0, z: 0 };
  }
}
function shift(ctx, s, now) {
  for (const p of ctx.place.players) {
    const k = "shift_" + p.id;
    if (now < (s[k] ?? 0)) continue;
    s[k] = now + L.shiftEvery * 1000 * (0.7 + ctx.random() * 0.6);
    const ax = p.state?.aimX ?? 0, az = p.state?.aimZ ?? -1, back = 2 + Math.floor(ctx.random() * 2);
    const { cx, cz } = cellAt(p.feetPosition.x - ax * back * S, p.feetPosition.z - az * back * S);
    if (cx < 1 || cz < 1 || cx >= N - 1 || cz >= N - 1) continue;
    const z0 = zoneOf(cx, cz);
    if (z0 === "hub" || z0 === "arches") continue; // arch rooms never shift
    const edges = [];
    if (!wallX(cx, cz) && !["hub", "arches"].includes(zoneOf(cx + 1, cz))) edges.push("x");
    if (!wallZ(cx, cz) && !["hub", "arches"].includes(zoneOf(cx, cz + 1))) edges.push("z");
    if (!edges.length) continue;
    const e = edges[Math.floor(ctx.random() * edges.length)], c = cellCenter(cx, cz);
    const pos = e === "x" ? { x: (cx + 1) * S - HALF, y: 0, z: c.z } : { x: c.x, y: 0, z: (cz + 1) * S - HALF };
    if (ctx.query({ tags: ["shifted"], center: pos, radius: 0.5 }).length) continue;
    if (ctx.query({ anyTags: CREATURES, center: pos, radius: S / 2 + 0.8 }).length) continue; // never close a wall on a creature
    ctx.spawn({ tags: ["shifted"], lifetime: L.shiftLife, feetPosition: pos, primitive: { kind: "box", width: e === "x" ? 0.2 : S, height: H, depth: e === "x" ? S : 0.2 }, material: PAPER, physics: "static" });
  }
}

// the flickering wall out to Level 1 isn't a door object (scripts/player.js crosses at it): the dresser gets it by hand
const l0Ways = () => [{ id: "l0-exit", at: { x: -HALF + 0.15, y: 0, z: cellCenter(EXIT.cx, EXIT.cz).z }, fwd: { x: 1, z: 0 } }];
export function tick(ctx) {
  restyleSigns(ctx, "main"); // every sign dressed as its own board (scripts/lib/sign-style.js)
  dressThresholds(ctx, l0Ways()); // the ways in and out, dressed with what people left there (scripts/lib/thresholds.js)
  if (!ctx.place.players?.length) return; // empty level: nothing to run (perf)
  const s = ctx.place.state, now = ctx.now();
  layXmas(ctx); // the Christmas Area off the north rim (scripts/lib/xmas-room.js)
  layL02Door(ctx); // Level 0.2: the half-built Remodeling Co. door (scripts/lib/level02.js)
  layZenithEntry(ctx); // Level 0.1: Kade and the B.N.T.G. bulkhead in the safe room
  if (!s.almondTidy) { s.almondTidy = 1; for (const o of ctx.query({ tags: ["almond"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) { const p = o.feetPosition ?? { x: 0, y: 0, z: 0 }; if (p.y < 0.15 && !(false)) ctx.destroy(o.id); } } // loose floor bottles cleared once: almond water lives in containers and drops now
  if (!s.arrive2) { s.arrive2 = true; const ex = cellCenter(EXIT.cx, EXIT.cz); ctx.spawn("main-from-l1", { feetPosition: { x: -HALF + 2.4, y: 0.1, z: ex.z }, rotation: { yaw: -90 } }); } // Level 1's way back lets you out by the flickering wall
  if (!s.stairsSeeded) {
    s.stairsSeeded = true;
    let n = 0;
    for (let k = 0; k < 400 && n < L.stairsCount; k++) {
      const cx = 1 + Math.floor(ctx.random() * (N - 2)), cz = 1 + Math.floor(ctx.random() * (N - 2));
      if (zoneOf(cx, cz) !== "halls" || inHub(cx, cz) || hasPillar(cx, cz) || hasPit(cx, cz)) continue;
      if (Math.abs(cx - MID) < 5 && Math.abs(cz - MID) < 5) continue;
      const c = cellCenter(cx, cz);
      ctx.spawn({ tags: ["stairs"], feetPosition: { x: c.x + (ctx.random() < 0.5 ? -1 : 1), y: 0, z: c.z }, primitive: { kind: "scripted", script: "scripts/stairs-geo.js" }, physics: { body: "static", collider: "mesh" } });
      n++;
    }
  }
  if (s.momentsV !== 13) {
    if (s.momentsV) {
      for (const m of ctx.query({ tags: ["moment"] })) ctx.destroy(m.id);
      const at = s.moments?.manilaAt; // the old desk almonds lost their "moment" tag and stacked, one per re-lay
      if (at) for (const m of ctx.query({ tags: ["almond"], center: { x: at.x, y: 0.8, z: at.z }, radius: 2 })) ctx.destroy(m.id);
    }
    s.momentsV = 13;
    s.moments = layMoments(ctx);
  }
  shift(ctx, s, now);
  unstick(ctx, s, now);
  if (!s.furnished) { s.furnished = true; furnish(ctx); }
  if (s.tableAlmondV !== 1) { // the four bottles on the safe room table were set dressing; now they're real almond water you can take
    const MODEL = "/cdn/value.d74570d765a2d43f965fc8756878f7bf22f833db5feaf4c335d84d8dc4ba5b62.glb";
    [[-5.01, -3.99], [-4.78, -3.89], [-4.42, -4.12], [-4.15, -4.02]].forEach(([x, z], i) => {
      const d = ctx.place.objects["hub/table/child-" + i]; if (d) d.visible = false; // the table's bottles are children 0-3 (child-4 is the note)
      ctx.spawn("hub-almond-" + i, { tags: ["almond"], feetPosition: { x, y: 0.74, z }, castShadow: false, model: MODEL, layout: { box: { min: { x: -0.08, y: 0, z: -0.08 }, max: { x: 0.08, y: 0.32, z: 0.08 } } } });
    });
    s.tableAlmondV = 1;
  }
  if (s.floorGateV !== 1 && ctx.place.players.length) { // floor weapons above the player's level go, the refill brings fitting ones
    const cap = rarityCap(Math.max(1, ...ctx.place.players.map((p) => p.state?.level ?? 1)));
    for (const w of ctx.query({ tags: ["weapon"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) if (w.state?.kind && rarityIdx(w.state.kind) > cap) ctx.destroy(w.id);
    s.floorGateV = 1;
  }
  if (s.deskV !== 1) { // once per room: sweep loose ammo, turn the desks already standing into drawers
    for (const a of ctx.query({ tags: ["ammo"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(a.id);
    for (const d of ctx.query({ tags: ["furniture", "desk"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
      const o = ctx.place.objects[d.id]; if (!o || o.tags.includes("sunken") || o.tags.includes("container")) continue;
      o.tags = [...o.tags, "container"]; o.state.items = deskItems(ctx); o.state.name = "Desk drawers";
    }
    s.deskV = 1;
  }
  if (s.sunkV !== 1) { s.sunkV = 1; sink(ctx); }
  if (s.dressV !== DR.v && DR.models.partition) { const st = s.dressStep ?? 0; if (dress(ctx, st)) s.dressStep = st + 1; else { s.dressV = DR.v; s.dressStep = 0; } } // Tripo pieces and the modeled kit (l0-dress.yml), DR.batch a tick
  regrow(ctx, s, now);
  syncLevel0(ctx);
  const weapons = ctx.query({ tags: ["weapon"] }).length;
  if (false && weapons < W.pickups && now >= (s.nextWeapon ?? 0)) {
    const fill = s.weaponsSeeded ? 1 : W.pickups - weapons;
    for (let i = 0; i < fill; i++) {
      const c = cell(ctx);
      if (c) spawnWeapon(ctx, c, rollWeapon(ctx, "l0", rarityCap(Math.max(1, ...ctx.place.players.map((p) => p.state?.level ?? 1)))));
    }
    s.weaponsSeeded = true;
    s.nextWeapon = now + (W.pickupRespawn * 1000) / 4;
  }
  // the creator: no ammo rounds lying around Level 0 (2026-11-08). Ammo only turns up inside containers and on bodies.
  const smilers = ctx.query({ tags: ["smiler"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((m) => !m.state?.dead).length;
  if (smilers < L.smilers && now >= (s.nextSmiler ?? 0)) {
    const fill = s.smilersSeeded ? 1 : L.smilers - smilers;
    for (let i = 0; i < fill; i++) {
      const c = cell(ctx, ["dark", "red", "pillars", "expanse"]);
      if (c) ctx.spawn({ tags: ["smiler"], feetPosition: { x: c.x, y: 0.05, z: c.z }, model: SMILER_MODEL, scale: SMILER_SCALE, physics: { body: "character" }, state: { ...npcState(ctx, "smiler", L.smilerHp), mdl: 2 } });
    }
    s.smilersSeeded = true;
    s.nextSmiler = now + L.smilerRespawn * 1000;
  }
  if (!s.furnitureSeeded) { // loot moved from crates into office furniture: clear the old crates once, then seed afresh
    for (const o of ctx.query({ tags: ["crate"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) if (o.tags?.includes("container")) ctx.destroy(o.id);
    s.furnitureSeeded = true; s.cratesSeeded = false; s.nextCrate = 0;
  }
  const crates = ctx.query({ tags: ["lootfurn"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).length;
  if (crates < W.crates.count && now >= (s.nextCrate ?? 0)) {
    const fill = s.cratesSeeded ? 1 : W.crates.count - crates;
    for (let i = 0; i < fill; i++) for (let k = 0; k < 8; k++) {
      const c = cell(ctx); if (!c) continue;
      const { cx, cz } = cellAt(c.x, c.z), kind = pickKind("main", ctx.random()), spot = wallSpot0(ctx, cx, cz, kind, ctx.random(), ctx.random());
      if (!spot || ctx.query({ tags: ["container"], radius: 1.2, center: { x: spot.x, y: 0, z: spot.z } }).length) continue;
      spawnFurniture(ctx, "main", kind, spot); break;
    }
    s.cratesSeeded = true;
    s.nextCrate = now + (W.crates.respawn * 1000);
  }
  if (!s.shellsSwept) { // no loose ammo on the floors (Shelly, Nov 9: "no random shotgun shells or the likes lying on floors"): sweep what lies there, never refill
    for (const a of ctx.query({ anyTags: ["shells", "ammo"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) ctx.destroy(a.id);
    s.shellsSwept = true;
  }
  const lurkers = ctx.query({ tags: ["lurker"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((m) => !m.state?.dead).length;
  if (lurkers < L.lurkers && now >= (s.nextLurker ?? 0)) {
    const fill = s.lurkersSeeded ? 1 : L.lurkers - lurkers;
    for (let i = 0; i < fill; i++) {
      const c = cell(ctx, ["halls", "arches", "holes", "offices"]);
      if (c) { const variant = pickVariant(ctx, "lurker"), vm = vmul("lurker", variant); // leveled list: scripts/lib/data/foe-variants.yml
        ctx.spawn({ tags: ["lurker"], feetPosition: { x: c.x, y: 0.05, z: c.z }, model: variant === "frenzied" ? FRENZIED_MODEL : LURKER_MODEL, ...(variant === "frenzied" ? { layout: { box: { min: { x: -0.6, y: 0, z: -0.6 }, max: { x: 0.6, y: 2.5, z: 0.6 } } }, scale: 1 } : { scale: LURKER_SCALE }), physics: { body: "character" }, state: { ...npcState(ctx, "lurker", Math.round(L.lurkerHp * vm.hp), { kind: "lurker", variant, ...(vm.name ? { title: vm.name } : {}) }), mesh: 3 } }); }
    }
    s.lurkersSeeded = true;
    s.nextLurker = now + L.lurkerRespawn * 1000;
  }
  // a creature that falls out of the world is put back at the player spawn (the safe room) by the engine: send it back out into the maze
  for (const m of ctx.query({ anyTags: ["smiler", "lurker", "hound", "stealer"] })) {
    if (m.state?.dead || (m.state?.owner ?? m.state?.horde)) continue;
    const f = m.feetPosition, o0 = cellCenter(0, 0), cs = L.cellSize ?? 4, cx = Math.round((f.x - o0.x) / cs), cz = Math.round((f.z - o0.z) / cs);
    if (!inHub(cx, cz) && f.y > -3) continue;
    const c = cell(ctx, m.tags.includes("smiler") ? ["dark", "red", "pillars", "expanse"] : ["halls", "arches", "holes", "offices"]);
    if (!c) continue;
    const o = ctx.getObject(m.id); if (!o) continue;
    o.feetPosition = { x: c.x, y: 0.05, z: c.z }; o.velocity = { x: 0, y: 0, z: 0 };
  }
}
