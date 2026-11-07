// Level 3, "Electrical Station": one seeded layout every script reads (geometry, sim, hounds, moths, player).
// 26 x 26 cells of 4 m: a brick maze of dusty halls, some low and cramped, some dead dark; indestructible bars
// across many openings (you see through, never pass) and five sealed vaults you only ever see through them;
// generator rooms, assembly lines that keep making things, black sludge leaking from the wall pipes,
// and Base Gamma's forward checkpoint at the west wall by the door home to Level 2.
import L from "./data/level3.yml";

export const N = L.cells, S = L.cellSize, H = L.height, TH = L.tightHeight, HALF = (N * S) / 2;
export const ARRIVE = { cx: L.arrive[0], cz: L.arrive[1] };
export function hash(x, z, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export const cellCenter = (cx, cz) => ({ x: (cx + 0.5) * S - HALF, z: (cz + 0.5) * S - HALF });
export const cellAt = (x, z) => ({ cx: Math.floor((x + HALF) / S), cz: Math.floor((z + HALF) / S) });
const O = L.outpost;
export const inGamma = (cx, cz) => cx >= O.x0 && cx < O.x0 + O.w && cz >= O.z0 && cz < O.z0 + O.d;

// open: bit 1 = +x, 2 = +z, 4 = -x, 8 = -z ; bars: the same bits for an edge closed by bars ; gate: an open edge wearing a swung gate
const open = new Uint8Array(N * N), bars = new Uint8Array(N * N), gate = new Uint8Array(N * N);
const kind = new Uint8Array(N * N); // 0 hall, 1 generator, 2 line, 3 vault, 4 gamma
const blockId = new Int16Array(N * N).fill(-1);
const DIRS = [[1, 0, 1, 4], [0, 1, 2, 8], [-1, 0, 4, 1], [0, -1, 8, 2]];
const inside = (x, z) => x >= 0 && z >= 0 && x < N && z < N;
function link(arr, cx, cz, d) { const [dx, dz, a, b] = DIRS[d], nx = cx + dx, nz = cz + dz; if (!inside(nx, nz)) return; arr[cz * N + cx] |= a; arr[nz * N + nx] |= b; }
export const BLOCKS = []; // { type: "gen" | "line" | "vault", x0, z0, w, d, i, content? }
(() => {
  let seed = L.seed >>> 0;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let x = O.x0; x < O.x0 + O.w; x++) for (let z = O.z0; z < O.z0 + O.d; z++) kind[z * N + x] = 4;
  const free = (x0, z0, w, d) => { for (let x = x0 - 1; x <= x0 + w; x++) for (let z = z0 - 1; z <= z0 + d; z++) if (inside(x, z) && kind[z * N + x]) return false; return x0 >= 1 && z0 >= 1 && x0 + w <= N - 1 && z0 + d <= N - 1; };
  const place = (type, w, d, k, n) => { for (let tries = 0, made = 0; made < n && tries < 400; tries++) {
    const x0 = 5 + Math.floor(rnd() * (N - 6 - w)), z0 = 1 + Math.floor(rnd() * (N - 2 - d));
    if (!free(x0, z0, w, d)) continue;
    const b = { type, x0, z0, w, d, i: BLOCKS.length }; BLOCKS.push(b); made++;
    for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) { kind[z * N + x] = k; blockId[z * N + x] = b.i; }
  } };
  place("gen", 3, 3, 1, L.generators); place("line", 4, 2, 2, L.lines); place("vault", 2, 2, 3, L.vaults);
  // the maze: a depth-first carve over everything but the vaults
  const seen = new Uint8Array(N * N), stack = [[ARRIVE.cx, ARRIVE.cz]]; seen[ARRIVE.cz * N + ARRIVE.cx] = 1;
  for (let i = 0; i < N * N; i++) if (kind[i] === 3) seen[i] = 1;
  while (stack.length) {
    const [cx, cz] = stack[stack.length - 1];
    const opts = [0, 1, 2, 3].filter((d) => { const nx = cx + DIRS[d][0], nz = cz + DIRS[d][1]; return inside(nx, nz) && !seen[nz * N + nx]; });
    if (!opts.length) { stack.pop(); continue; }
    const d = opts[Math.floor(rnd() * opts.length)];
    link(open, cx, cz, d); if (rnd() < L.gateShare) link(gate, cx, cz, d);
    const nx = cx + DIRS[d][0], nz = cz + DIRS[d][1]; seen[nz * N + nx] = 1; stack.push([nx, nz]);
  }
  // extra openings: some open, most of the rest barred
  for (let cz = 0; cz < N; cz++) for (let cx = 0; cx < N; cx++) {
    if (kind[cz * N + cx] === 3 || rnd() >= L.loops) continue;
    const d = Math.floor(rnd() * 2), nx = cx + DIRS[d][0], nz = cz + DIRS[d][1];
    if (!inside(nx, nz) || kind[nz * N + nx] === 3 || (open[cz * N + cx] & DIRS[d][2])) continue;
    link(rnd() < L.barShare ? bars : open, cx, cz, d);
  }
  // blocks open inside; a generator room or line gets a second way in
  for (const b of BLOCKS) {
    for (let x = b.x0; x < b.x0 + b.w; x++) for (let z = b.z0; z < b.z0 + b.d; z++) { if (x < b.x0 + b.w - 1) link(open, x, z, 0); if (z < b.z0 + b.d - 1) link(open, x, z, 1); }
    if (b.type === "vault") { // two barred windows onto the halls, nothing that opens
      const edges = [];
      for (let x = b.x0; x < b.x0 + b.w; x++) { edges.push([x, b.z0, 3]); edges.push([x, b.z0 + b.d - 1, 1]); }
      for (let z = b.z0; z < b.z0 + b.d; z++) { edges.push([b.x0, z, 2]); edges.push([b.x0 + b.w - 1, z, 0]); }
      const ok = edges.filter(([x, z, d]) => { const nx = x + DIRS[d][0], nz = z + DIRS[d][1]; return inside(nx, nz) && kind[nz * N + nx] !== 3; });
      ok.sort((a, c) => hash(a[0], a[1], a[2] + 31) - hash(c[0], c[1], c[2] + 31));
      for (const e of ok.slice(0, 2)) link(bars, e[0], e[1], e[2]);
      b.content = ["statue", "shadow", "purple", "art", "statue"][b.i % 5];
    } else {
      const x = b.x0 + b.w, z = b.z0 + Math.floor(b.d / 2);
      if (inside(x, z)) link(open, b.x0 + b.w - 1, z, 0);
    }
  }
  // the checkpoint is one open yard
  for (let x = O.x0; x < O.x0 + O.w; x++) for (let z = O.z0; z < O.z0 + O.d; z++) { if (x < O.x0 + O.w - 1) link(open, x, z, 0); if (z < O.z0 + O.d - 1) link(open, x, z, 1); }
  for (let i = 0; i < N * N; i++) bars[i] &= ~open[i];
})();
export const isOpen = (cx, cz, d) => inside(cx, cz) && !!(open[cz * N + cx] & DIRS[d][2]);
export const isBars = (cx, cz, d) => inside(cx, cz) && !!(bars[cz * N + cx] & DIRS[d][2]);
export const isGate = (cx, cz, d) => inside(cx, cz) && !!(gate[cz * N + cx] & DIRS[d][2]) && isOpen(cx, cz, d);
export const openings = (cx, cz) => [0, 1, 2, 3].filter((d) => isOpen(cx, cz, d));
export const blockOf = (cx, cz) => (inside(cx, cz) ? BLOCKS[blockId[cz * N + cx]] ?? null : null);
const special = (cx, cz) => inside(cx, cz) && kind[cz * N + cx] !== 0;
export const darkSector = (cx, cz) => !special(cx, cz) && hash(Math.floor(cx / 4), Math.floor(cz / 4), 77) < L.darkShare && Math.floor(cx / 4) > 0;
export const tightSector = (cx, cz) => !special(cx, cz) && !darkSector(cx, cz) && hash(Math.floor(cx / 3), Math.floor(cz / 3), 55) < L.tightShare && cx > 4;
export function zoneOf(cx, cz) {
  if (!inside(cx, cz)) return "hall";
  const k = kind[cz * N + cx];
  if (k === 4) return "gamma";
  if (k === 1) return "gen";
  if (k === 2) return "line";
  if (k === 3) return "vault";
  if (darkSector(cx, cz)) return "dark";
  if (tightSector(cx, cz)) return "tight";
  return "hall";
}
export const zoneAt = (x, z) => { const { cx, cz } = cellAt(x, z); return zoneOf(cx, cz); };
export const ceilingAt = (cx, cz) => (zoneOf(cx, cz) === "tight" ? TH : H);
// the ways out: the door home to Level 2 in the checkpoint's west wall; the dead freight elevator to Level 4 at the far east
export const BACK = { x: -HALF, z: cellCenter(0, ARRIVE.cz).z };
export const LIFT = (() => { for (let i = 0; i < N; i++) { const cz = (13 + (i % 2 ? -1 : 1) * Math.ceil(i / 2) + N) % N; if (!special(N - 1, cz)) return { x: HALF, z: cellCenter(N - 1, cz).z, cz }; } return { x: HALF, z: 0, cz: 13 }; })();
export const L3_NAMES = { l3_hall: "Level 3 · Electrical Station", l3_tight: "Level 3 · Crawl Halls", l3_dark: "Level 3 · Blind Halls", l3_gen: "Level 3 · Generator Room", l3_line: "Level 3 · Assembly Line", l3_gamma: "Level 3 · Base Gamma Checkpoint", l3_vault: "Level 3 · Behind the Bars" };

// hazards, laid the same on every machine: sludge leaks under the wall pipes, live boxes that arc, one generator a room
const hallCells = []; for (let cz = 0; cz < N; cz++) for (let cx = 0; cx < N; cx++) { const z = zoneOf(cx, cz); if ((z === "hall" || z === "tight" || z === "dark") && cx > 4) hallCells.push([cx, cz]); }
function pickCells(n, s, gap) { const out = []; const c = hallCells.slice().sort((a, b) => hash(a[0], a[1], s) - hash(b[0], b[1], s)); for (const p of c) { if (out.length >= n) break; if (out.some((q) => Math.max(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1])) < gap)) continue; out.push(p); } return out; }
// a hazard hugs a closed wall of its cell: side d (0 +x … 3 -z), and its point sits 0.9 m off that wall
function hug(cx, cz, s) { const closed = [0, 1, 2, 3].filter((d) => !isOpen(cx, cz, d) && !isBars(cx, cz, d)); const d = closed.length ? closed[Math.floor(hash(cx, cz, s) * closed.length)] : 0; const c = cellCenter(cx, cz), [dx, dz] = DIRS[d]; return { cx, cz, d, x: c.x + dx * (S / 2 - 0.9), z: c.z + dz * (S / 2 - 0.9), wx: c.x + dx * (S / 2 - 0.4), wz: c.z + dz * (S / 2 - 0.4) }; }
export const SLUDGE = pickCells(L.sludge, 901, 3).map(([x, z]) => hug(x, z, 902));
export const SPARKS = pickCells(L.sparks, 911, 3).filter(([x, z]) => !SLUDGE.some((q) => q.cx === x && q.cz === z)).map(([x, z]) => hug(x, z, 912));
export const GENS = BLOCKS.filter((b) => b.type === "gen").map((b) => ({ ...cellCenter(b.x0 + 1, b.z0 + 1), i: b.i }));
export const LINES = BLOCKS.filter((b) => b.type === "line").map((b) => { const a = cellCenter(b.x0, b.z0 + 0.5), e = cellCenter(b.x0 + b.w - 1, b.z0 + 0.5); return { x0: a.x, x1: e.x, z: a.z - 0.25, i: b.i }; });
