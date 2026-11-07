// Level 6 "Lights Out": a seeded tree of tight concrete halls, after the hand-drawn survivor map.
// Grid W×H cells of C m; odd cells are halls, the rest solid. Origin at the centre; row H-1 is the south edge (the stairs up to 5).
export const W = 27, H = 41, C = 1.8, HT = 2.4, SEED = 6066;
export const START = { i: 13, j: 39 };
export const cx = (i) => (i - (W - 1) / 2) * C, cz = (j) => (j - (H - 1) / 2) * C;
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let cache = null;
export function plan() {
  if (cache) return cache;
  const R = rng(SEED), open = Array.from({ length: W }, () => new Array(H).fill(false));
  const dist = Array.from({ length: W }, () => new Array(H).fill(-1));
  open[START.i][START.j] = true; dist[START.i][START.j] = 0;
  const live = [[START.i, START.j]], D = [[2, 0], [-2, 0], [0, 2], [0, -2]];
  let carved = 1; const target = Math.floor(((W - 1) / 2) * ((H - 1) / 2) * 0.62); // the map has holes: not every cell is reached
  while (live.length && carved < target) {
    const k = R() < 0.72 ? live.length - 1 : Math.floor(R() * live.length); // mostly newest: long jagged halls; sometimes an old one: a branch
    const [i, j] = live[k];
    const opts = D.filter(([dx, dz]) => { const a = i + dx, b = j + dz; return a > 0 && b > 0 && a < W - 1 && b < H - 1 && !open[a][b]; });
    if (!opts.length) { live.splice(k, 1); continue; }
    const up = opts.filter(([, dz]) => dz < 0), pick = up.length && R() < 0.4 ? up[Math.floor(R() * up.length)] : opts[Math.floor(R() * opts.length)]; // it drifts north, away from the stairs
    const a = i + pick[0], b = j + pick[1];
    open[i + pick[0] / 2][j + pick[1] / 2] = true; open[a][b] = true; dist[a][b] = dist[i][j] + 2; carved++;
    live.push([a, b]);
  }
  open[START.i][H - 1] = true; // the nook at the foot of the stairs
  const ends = [];
  for (let i = 1; i < W - 1; i += 2) for (let j = 1; j < H - 1; j += 2) {
    if (!open[i][j] || (i === START.i && j === START.j)) continue;
    const n = D.map(([dx, dz]) => [dx / 2, dz / 2]).filter(([dx, dz]) => open[i + dx][j + dz]);
    if (n.length === 1) ends.push({ i, j, d: dist[i][j], dx: n[0][0], dz: n[0][1] }); // dx,dz: the way back out
  }
  ends.sort((a, b) => b.d - a.d);
  cache = { open, ends };
  return cache;
}
// the solid cells as row runs: one box per run
export function wallRuns() {
  const { open } = plan(), runs = [];
  for (let j = 0; j < H; j++) { let s = -1; for (let i = 0; i <= W; i++) { const solid = i < W && !open[i][j]; if (solid && s < 0) s = i; if (!solid && s >= 0) { runs.push({ i0: s, i1: i - 1, j }); s = -1; } } }
  return runs;
}
export const NOTES = [
  "I don't get it. this isn't supposed to be a dead end. I should be out. I came all this way for NOTHING?",
  "NOT SAFE", "smells like blood", "static in my ears", "Emmanuel disappeared down this hall",
  "this hallway just ends", "Jack didn't come back", "skittering noise", "this changed overnight?", "lost Kacey here",
];
