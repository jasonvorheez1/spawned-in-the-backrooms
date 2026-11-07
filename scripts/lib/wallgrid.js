// Breakable walls below Level 0: one grid adapter per place. A wall is the cell edge "x:cx:cz" (at x = (cx+1)*S - HALF, along z)
// or "z:cx:cz". has() = a solid wall the level's geometry draws; prot() = lore walls that never give (outer shell, doors,
// thresholds, camps, Base Gamma, crawl-hall arches, bars). skin() = the material it breaks as and the patch's paint.
// The level mesh leaves every edge in params.cut out; scripts/wallpatch-geo.js draws what is left of it, holes and all.
import * as L1 from './level1.js'
import * as L2 from './level2.js'
import * as L3 from './level3.js'
// Level 3's wall skins (mirrors SKIN / skinOf in scripts/level3-geo.js, kept here so the lib never imports a mesh file)
const SKIN3 = {
  orange: { tex: 'cdn/texture-photoreal-weathered-orange-clay-brick-wall-thin-grey-mortar-soot-stains.png', col: 'oklch(0.97 0.015 60)', rough: 0.85 },
  grey: { tex: 'cdn/texture-large-grey-brick-wall-dusty-mortar.png', col: 'oklch(0.9 0.01 80)', rough: 0.9 },
  tile: { tex: 'cdn/texture-photoreal-glazed-tan-brown-ceramic-wall-tile-grimy-grout-institutional.png', col: 'oklch(0.99 0.04 85)', rough: 0.3 },
  brown: { tex: 'cdn/texture-dark-brown-brick-wall-grimy-mortar.png', col: 'oklch(0.88 0.03 55)', rough: 0.9 },
}
const skin3 = (cx, cz) => { const z = L3.zoneOf(Math.max(0, Math.min(L3.N - 1, cx)), Math.max(0, Math.min(L3.N - 1, cz))); if (z === 'dark') return 'brown'; const r = L3.hash(Math.floor(Math.max(cx, 0) / 3), Math.floor(Math.max(cz, 0) / 3), 21); return r < 0.4 ? 'orange' : r < 0.65 ? 'grey' : 'tile' }

const D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]]
const nb = (axis, cx, cz) => [axis === 'x' ? cx + 1 : cx, axis === 'z' ? cz + 1 : cz]
const edgeOut = (N, axis, cx, cz) => { const [ox, oz] = nb(axis, cx, cz); return cx < 0 || cz < 0 || ox >= N || oz >= N }

// ---- Level 1: painted cinderblock corridor walls (push doors and the camp stay)
const l1 = {
  obj: 'l1-geo', script: 'scripts/level1-geo.js', N: L1.N, S: L1.S, H: L1.H, HALF: L1.HALF, T: 0.12, ext: 0, cols: 6, rows: 3,
  has(axis, cx, cz) { if (cx < 0 || cz < 0) return false; const e = L1.edge(cx, cz, axis); return !!e && e.door == null },
  prot(axis, cx, cz) {
    if (edgeOut(L1.N, axis, cx, cz)) return true
    const [ox, oz] = nb(axis, cx, cz), a = L1.zoneOf(cx, cz), b = L1.zoneOf(ox, oz)
    return a === 'void' || b === 'void' || a === 'camp' || b === 'camp'
  },
  skin(axis, cx, cz) {
    const [ox, oz] = nb(axis, cx, cz), cor = L1.zoneOf(cx, cz) === 'corridors' || L1.zoneOf(ox, oz) === 'corridors'
    return { mat: 'cinderblock', tex: 'cdn/texture-painted-cinder-block-wall-clean.png', col: cor ? 'oklch(0.95 0.01 85)' : 'oklch(0.8 0.012 250)', rough: 0.85 }
  },
}

// ---- Level 2: chalky drywall and brick tunnel walls (hall, pipe banks, locked steel doors, camp and side rooms stay)
const l2closed = (cx, cz, d) => !L2.isOpen(cx, cz, d)
const l2door = (cx, cz, d) => cx >= 0 && cz >= 0 && cx < L2.N && cz < L2.N && L2.zoneOf(cx, cz) !== 'camp' && !L2.sideOf(cx, cz) && !L2.inPipes(cx, cz) && !L2.inHall(cx, cz) && l2closed(cx, cz, d) && L2.hash(cx * 4 + d, cz, 51) <= 0.07
const l2 = {
  obj: 'l2-geo', script: 'scripts/level2-geo.js', N: L2.N, S: L2.S, H: L2.H, HALF: L2.HALF, T: 0.4, ext: 0.4, cols: 4, rows: 3,
  has(axis, cx, cz) {
    if (cx < 0 || cz < 0) return false
    const d = axis === 'x' ? 0 : 1, [ox, oz] = nb(axis, cx, cz)
    return l2closed(cx, cz, d) && !(L2.inPipes(cx, cz) && L2.inPipes(ox, oz))
  },
  prot(axis, cx, cz) {
    if (edgeOut(L2.N, axis, cx, cz)) return true
    const [ox, oz] = nb(axis, cx, cz), d = axis === 'x' ? 0 : 1
    for (const [x, z] of [[cx, cz], [ox, oz]]) if (L2.inHall(x, z) || L2.inPipes(x, z) || L2.sideOf(x, z) || L2.zoneOf(x, z) === 'camp' || L2.zoneOf(x, z) === 'void' || (x === L2.ARRIVE.cx && z === L2.ARRIVE.cz)) return true
    return l2door(cx, cz, d) || l2door(ox, oz, d + 2) // a locked steel door hangs on either face
  },
  skin(axis, cx, cz) {
    const brick = L2.hash(Math.floor(Math.max(cx, 0) / 3), Math.floor(Math.max(cz, 0) / 3), 21) < 0.3
    return brick ? { mat: 'brick', tex: 'cdn/texture-soot-dark-brown-industrial-brick.png', col: 'oklch(0.62 0.04 45)', rough: 0.9 }
      : { mat: 'drywall', tex: 'cdn/texture-chalky-stained-concrete-wall.png', col: 'oklch(0.78 0.012 85)', rough: 0.9 }
  },
}

// ---- Level 3: brick and glazed-tile halls (shell, bars, gates, crawl halls, Base Gamma, vaults stay)
const l3 = {
  obj: 'l3-geo', script: 'scripts/level3-geo.js', N: L3.N, S: L3.S, H: L3.H, HALF: L3.HALF, T: 0.3, ext: 0.3, cols: 4, rows: 3,
  has(axis, cx, cz) {
    if (cx < 0 || cz < 0) return false
    const d = axis === 'x' ? 0 : 1
    return !L3.isOpen(cx, cz, d) && !L3.isBars(cx, cz, d)
  },
  prot(axis, cx, cz) {
    if (edgeOut(L3.N, axis, cx, cz)) return true
    const [ox, oz] = nb(axis, cx, cz), d = axis === 'x' ? 0 : 1
    if (L3.isGate?.(cx, cz, d) || L3.isBars(cx, cz, d)) return true
    for (const [x, z] of [[cx, cz], [ox, oz]]) { const zn = L3.zoneOf(x, z); if (zn === 'tight' || zn === 'vault' || L3.inGamma(x, z) || (x === L3.ARRIVE.cx && z === L3.ARRIVE.cz)) return true }
    return false
  },
  skin(axis, cx, cz) {
    const k = skin3(cx, cz), K = SKIN3[k] ?? SKIN3.orange
    return { mat: k === 'tile' ? 'tile' : 'brick', tex: K.tex, col: K.col, rough: K.rough }
  },
}

// where a wall sits: centre of its span and the run's start, in world metres
export function wallFrame(G, axis, cx, cz) {
  const fixed = (axis === 'x' ? cx + 1 : cz + 1) * G.S - G.HALF, a0 = (axis === 'x' ? cz : cx) * G.S - G.HALF - G.ext, len = G.S + 2 * G.ext
  return { fixed, a0, len, center: axis === 'x' ? { x: fixed, z: a0 + len / 2 } : { x: a0 + len / 2, z: fixed } }
}
export const GRIDS = { level1: l1, level2: l2, level3: l3 }
export const gridOfObj = (id) => Object.entries(GRIDS).find(([, g]) => g.obj === id)?.[0] ?? null
