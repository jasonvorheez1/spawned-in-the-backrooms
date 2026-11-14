// Clippers (Level 6.1, 1954 cocktail lounge): scripted 3D architecture, lighting fixtures, and barware.
// Front faces -Z, feet at origin. Reuses the chamfered/turned/lathed mesh kit from l5-hall-kit.js.
import { paint, q, t3, bx, lathe, ball, pipe, path, sheet, box } from "./lib/l5-hall-kit.js";
const PI = Math.PI;
const MAHOG = (c) => paint(c, "oklch(0.88 0.03 32)", "mahog", 0.38);
const WALNUT = (c) => paint(c, "oklch(0.92 0.02 55)", "walnut", 0.42);
const BRASS = (c) => paint(c, "oklch(0.92 0.11 85)", "brass", 0.26, 0.92);
const CHROME = (c) => paint(c, "oklch(0.92 0.01 240)", "steel", 0.18, 0.95);
const GLASS = (c, col = "oklch(0.95 0.04 80)", a = 0.48) => { paint(c, col, null, 0.06, 0.05); c.color(col, a); };
const AMBER_GLASS = (c, glow = "oklch(0.75 0.14 68)") => { paint(c, "oklch(0.95 0.08 75)", null, 0.12, 0, glow); c.color("oklch(0.95 0.08 75)", 0.78); };
const GLOW = (c, col = "oklch(0.98 0.08 75)", k = 1.4) => paint(c, col, null, 0.3, 0, `oklch(${k} 0.12 72)`);

// Raised-panel mahogany wainscoting with chamfered baseboard, brass inlay strip, and profiled chair rail.
// Runs along X from -len/2 to +len/2; back face sits at z = +0.04, front faces -Z.
function wainscot(c, p) {
  const len = p.len ?? 9.2, h = p.height ?? 1.06, hw = len / 2;
  MAHOG(c);
  // Baseboard plinth with chamfered top edge
  bx(c, -hw, hw, 0, 0.13, -0.025, 0.04, 0.008);
  bx(c, -hw, hw, 0.13, 0.16, -0.014, 0.04, 0.006);
  // Backing board
  bx(c, -hw, hw, 0.16, h - 0.06, 0.01, 0.04, 0.004);
  // Divided raised-panel bays
  const bays = Math.max(1, Math.round(len / 0.88)), bw = len / bays, stile = 0.075;
  for (let i = 0; i <= bays; i++) {
    const x = -hw + i * bw;
    const x0 = Math.max(-hw, x - stile / 2), x1 = Math.min(hw, x + stile / 2);
    if (x1 - x0 > 0.01) bx(c, x0, x1, 0.16, h - 0.06, -0.008, 0.015, 0.005);
  }
  for (let i = 0; i < bays; i++) {
    const x0 = -hw + i * bw + stile / 2 + 0.025, x1 = -hw + (i + 1) * bw - stile / 2 - 0.025;
    if (x1 - x0 > 0.12) {
      // Chamfered inner raised panel + bottom/top rail
      bx(c, x0, x1, 0.23, h - 0.13, -0.012, 0.012, 0.01);
      if (c.lod < 3 && x1 - x0 > 0.24) {
        bx(c, x0 + 0.04, x1 - 0.04, 0.27, h - 0.17, -0.018, -0.006, 0.008);
      }
    }
  }
  // Brushed brass inlay trim below the chair rail
  BRASS(c);
  bx(c, -hw, hw, h - 0.085, h - 0.065, -0.022, 0.01, 0.004);
  // Profiled chair-rail cap
  MAHOG(c);
  bx(c, -hw, hw, h - 0.06, h - 0.02, -0.032, 0.04, 0.008);
  bx(c, -hw, hw, h - 0.02, h, -0.042, 0.04, 0.01);
}

// Art-Deco mahogany & brass storefront portal frame (replaces raw jamb/header boxes).
// Centered at x = 0, feet at y = 0, opening w = 4.06m, h = 3.22m.
function portal(c, p) {
  const w = p.w ?? 4.06, h = p.h ?? 3.22, hw = w / 2, jw = 0.26, d = 0.34, hd = d / 2;
  for (const s of [-1, 1]) {
    const cx = s * (hw + jw / 2);
    // Stepped stone/brass plinth base
    BRASS(c);
    bx(c, cx - jw / 2 - 0.02, cx + jw / 2 + 0.02, 0, 0.05, -hd - 0.02, hd + 0.02, 0.008);
    MAHOG(c);
    bx(c, cx - jw / 2 - 0.015, cx + jw / 2 + 0.015, 0.05, 0.24, -hd - 0.015, hd + 0.015, 0.01);
    // Pilaster shaft
    bx(c, cx - jw / 2, cx + jw / 2, 0.24, h - 0.08, -hd, hd, 0.01);
    // Fluted vertical moulding strips on front & hall faces
    if (c.lod < 3) {
      for (const zf of [-hd - 0.008, hd + 0.008]) {
        for (const dx of [-0.065, 0, 0.065]) {
          pipe(c, [cx + dx, 0.28, zf], [cx + dx, h - 0.14, zf], 0.014, 6);
        }
      }
    }
    // Pilaster capital
    BRASS(c);
    bx(c, cx - jw / 2 - 0.015, cx + jw / 2 + 0.015, h - 0.08, h - 0.03, -hd - 0.015, hd + 0.015, 0.006);
  }
  // Stepped Art-Deco architrave header
  MAHOG(c);
  bx(c, -hw - jw - 0.04, hw + jw + 0.04, h - 0.03, h + 0.18, -hd - 0.02, hd + 0.02, 0.012);
  bx(c, -hw - jw - 0.08, hw + jw + 0.08, h + 0.18, h + 0.28, -hd - 0.035, hd + 0.035, 0.012);
  // Brass reveal trim
  BRASS(c);
  bx(c, -hw - jw - 0.02, hw + jw + 0.02, h + 0.05, h + 0.08, -hd - 0.026, hd + 0.026, 0.004);
}

// Coffered 1950s cocktail-lounge ceiling with crown moulding and chamfered mahogany beams.
// Spans w = 13.7m (X), d = 9.7m (Z), anchored at ceiling height y = 0 (placed at y = 3.98).
function ceiling(c, p) {
  const w = p.w ?? 13.7, d = p.d ?? 9.7, hw = w / 2, hd = d / 2;
  // Warm pressed-tin / acoustic coffer backing
  paint(c, "oklch(0.76 0.05 55)", "tweed", 0.55, 0.25);
  bx(c, -hw, hw, -0.06, 0.02, -hd, hd, 0.002);
  // Perimeter crown moulding
  MAHOG(c);
  bx(c, -hw, hw, -0.22, -0.06, -hd, -hd + 0.18, 0.012);
  bx(c, -hw, hw, -0.22, -0.06, hd - 0.18, hd, 0.012);
  bx(c, -hw, -hw + 0.18, -0.22, -0.06, -hd + 0.18, hd - 0.18, 0.012);
  bx(c, hw - 0.18, hw, -0.22, -0.06, -hd + 0.18, hd - 0.18, 0.012);
  // Longitudinal & transverse chamfered beams
  for (let i = 1; i <= 3; i++) {
    const x = -hw + (w * i) / 4;
    bx(c, x - 0.1, x + 0.1, -0.24, -0.05, -hd + 0.12, hd - 0.12, 0.014);
  }
  for (let j = 1; j <= 2; j++) {
    const z = -hd + (d * j) / 3;
    bx(c, -hw + 0.12, hw - 0.12, -0.22, -0.05, z - 0.09, z + 0.09, 0.012);
  }
  // Brass corner rosettes at beam intersections
  if (c.lod < 3) {
    BRASS(c);
    for (let i = 1; i <= 3; i++) for (let j = 1; j <= 2; j++) {
      const x = -hw + (w * i) / 4, z = -hd + (d * j) / 3;
      lathe(c, x, -0.255, z, [[0, 0], [0.075, 0], [0.065, 0.018], [0, 0.02]], 12);
    }
  }
}

// 1950s Spun-brass & frosted-amber glass cocktail lounge pendant lamp (origin at shade center, drop up to ceiling).
function pendant(c, p) {
  const top = p.drop ?? 1.4;
  // Ceiling canopy
  BRASS(c);
  lathe(c, 0, top - 0.05, 0, [[0, 0], [0.03, 0], [0.085, 0.04], [0.095, 0.05], [0, 0.05]], 18);
  // Downrod & decorative turned collar
  pipe(c, [0, 0.14, 0], [0, top - 0.05, 0], 0.009, 8);
  lathe(c, 0, 0.08, 0, [[0, 0], [0.025, 0], [0.032, 0.03], [0.018, 0.06], [0, 0.06]], 14);
  // Spun-brass tiered reflector saucer
  lathe(c, 0, 0.01, 0, [[0.03, 0.09], [0.16, 0.07], [0.24, 0.02], [0.26, 0], [0.24, -0.008], [0.14, 0.04], [0.03, 0.06]], 24);
  // Frosted-amber glass bowl shade
  AMBER_GLASS(c, "oklch(0.62 0.12 70)");
  lathe(c, 0, -0.15, 0, [[0, 0.01], [0.08, 0.02], [0.15, 0.07], [0.185, 0.14], [0.19, 0.17]], 24, true);
  // Bottom brass finial
  BRASS(c);
  lathe(c, 0, -0.185, 0, [[0, 0], [0.016, 0.012], [0.022, 0.03], [0.012, 0.045], [0, 0.045]], 12);
  // Warm glowing filament core
  GLOW(c, "oklch(0.98 0.08 75)", 1.5);
  ball(c, 0, -0.04, 0, 0.042, 10);
}

// Art-Deco brass & frosted-amber tulip wall sconce (backplate at z = +0.02, projects toward -Z).
function sconce(c) {
  BRASS(c);
  // Stepped oval wall backplate
  lathe(c, 0, -0.11, 0.02, [[0, 0], [0.055, 0.01], [0.065, 0.07], [0.065, 0.15], [0.05, 0.21], [0, 0.22]], 16, true, 1, 0.35);
  // Curved S-arm
  path(c, [[0, -0.02, 0.01], [0, -0.06, -0.06], [0, -0.02, -0.13], [0, 0.04, -0.15]], 0.009, 7);
  // Brass cup holder
  lathe(c, 0, 0.03, -0.15, [[0, 0], [0.035, 0.005], [0.042, 0.03], [0.035, 0.035], [0, 0.025]], 14);
  // Fluted amber tulip glass shade
  AMBER_GLASS(c, "oklch(0.65 0.13 68)");
  lathe(c, 0, 0.05, -0.15, [[0.028, 0], [0.062, 0.04], [0.072, 0.1], [0.065, 0.14], [0.058, 0.145]], 18, true);
  GLOW(c, "oklch(0.98 0.08 75)", 1.45);
  ball(c, 0, 0.11, -0.15, 0.024, 8);
}

// Brushed-brass bar footrail with turned floor/bar stanchion brackets.
// Runs along X from -len/2 to +len/2; rail center at y = 0.16, z = 0; brackets reach back to z = -0.22.
function footrail(c, p) {
  const len = p.len ?? 8.4, hw = len / 2;
  BRASS(c);
  // Main horizontal footrail tube + end ball finials
  pipe(c, [-hw, 0.16, 0], [hw, 0.16, 0], 0.022, 12);
  ball(c, -hw, 0.16, 0, 0.03, 10);
  ball(c, hw, 0.16, 0, 0.03, 10);
  // Stanchion brackets
  const n = Math.max(2, Math.round(len / 1.5) + 1);
  for (let i = 0; i < n; i++) {
    const x = -hw + (len * i) / (n - 1);
    // Floor flange + post
    lathe(c, x, 0, 0, [[0, 0], [0.052, 0], [0.045, 0.015], [0.024, 0.025], [0.016, 0.16], [0.028, 0.16], [0, 0.18]], 12);
    // Horizontal tie-back into bar kickplate
    pipe(c, [x, 0.16, 0], [x, 0.16, -0.22], 0.014, 8);
    ball(c, x, 0.16, 0, 0.029, 10);
  }
}

// Arched mahogany & brass back-bar mirror centered between the two backbars.
function barmirror(c, p) {
  const w = p.w ?? 2.2, h = p.h ?? 1.65, hw = w / 2;
  // Reflective tinted mirror glass
  paint(c, "oklch(0.72 0.02 220)", null, 0.05, 0.88);
  sheet(c, (u, v) => {
    const x = (u - 0.5) * (w - 0.14), t = Math.abs(x) / (hw - 0.07);
    const top = h - 0.45 + 0.38 * Math.sqrt(Math.max(0, 1 - t * t));
    return [x, 0.07 + v * (top - 0.07), -0.005];
  }, 16, 2, () => [0, 0, -1], false);
  // Bevelled mahogany sill & side uprights
  MAHOG(c);
  bx(c, -hw - 0.04, hw + 0.04, 0, 0.08, -0.05, 0.02, 0.008);
  bx(c, -hw, -hw + 0.08, 0.08, h - 0.45, -0.035, 0.02, 0.008);
  bx(c, hw - 0.08, hw, 0.08, h - 0.45, -0.035, 0.02, 0.008);
  // Curved mahogany arch crown
  const pts = [];
  for (let i = 0; i <= 18; i++) {
    const u = i / 18, x = (u - 0.5) * (w - 0.08), t = Math.abs(x) / (hw - 0.04);
    pts.push([x, h - 0.45 + 0.42 * Math.sqrt(Math.max(0, 1 - t * t)), -0.01]);
  }
  path(c, pts, 0.045, 10);
  // Brass inner arch fillet
  BRASS(c);
  const bpts = pts.map(([x, y]) => [x * 0.94, y - 0.035, -0.014]);
  path(c, bpts, 0.012, 8);
}

// Turned brass & amber-glass hurricane table candle-lamp (sits flush at y = 0).
function tablelamp(c) {
  BRASS(c);
  lathe(c, 0, 0, 0, [[0, 0], [0.062, 0], [0.058, 0.014], [0.036, 0.025], [0.018, 0.06], [0.042, 0.085], [0.046, 0.098], [0, 0.095]], 18);
  AMBER_GLASS(c, "oklch(0.68 0.14 68)");
  lathe(c, 0, 0.092, 0, [[0.036, 0], [0.048, 0.035], [0.05, 0.085], [0.04, 0.13], [0.034, 0.145]], 18, true);
  GLOW(c, "oklch(0.98 0.12 72)", 1.6);
  lathe(c, 0, 0.105, 0, [[0, 0], [0.01, 0.008], [0.007, 0.025], [0, 0.036]], 8);
}

// Turned cocktail glasses, whiskey tumblers, chrome shaker, and brass ashtray (for bar top & tables).
function barware(c, p) {
  const kind = p.variant ?? "cocktail";
  if (kind === "shaker") {
    // Chrome cocktail shaker + two martini glasses + coaster
    CHROME(c);
    lathe(c, 0, 0, 0, [[0, 0], [0.038, 0], [0.046, 0.09], [0.042, 0.16], [0.034, 0.195], [0.02, 0.215], [0.02, 0.235], [0, 0.235]], 18);
    // Martini glass 1
    GLASS(c, "oklch(0.92 0.03 210)", 0.45);
    lathe(c, 0.14, 0, 0.05, [[0, 0], [0.036, 0], [0.036, 0.004], [0.005, 0.008], [0.005, 0.08], [0.054, 0.135], [0.052, 0.138], [0.004, 0.086], [0, 0.086]], 18);
    // Olive pick in martini
    paint(c, "oklch(0.62 0.13 120)", null, 0.35);
    ball(c, 0.14, 0.112, 0.05, 0.011, 8);
    return;
  }
  // Whiskey tumbler on mahogany coaster + brass ashtray
  MAHOG(c);
  lathe(c, 0, 0, 0, [[0, 0], [0.048, 0], [0.048, 0.005], [0, 0.005]], 16);
  GLASS(c, "oklch(0.95 0.02 90)", 0.42);
  lathe(c, 0, 0.005, 0, [[0, 0], [0.034, 0], [0.039, 0.085], [0.036, 0.085], [0.031, 0.008], [0, 0.008]], 16);
  // Amber whiskey inside
  paint(c, "oklch(0.62 0.16 58)", null, 0.15);
  lathe(c, 0, 0.013, 0, [[0, 0], [0.031, 0], [0.033, 0.038], [0, 0.038]], 14);
  // Brass ashtray beside it
  BRASS(c);
  lathe(c, -0.14, 0, 0.06, [[0, 0], [0.052, 0], [0.058, 0.018], [0.05, 0.024], [0.04, 0.008], [0, 0.008]], 18);
}

// Braided floor power cable for the Wurlitzer jukebox (replaces boxy l61-clip-wire).
function cable(c, p) {
  const len = p.len ?? 3.6, hw = len / 2;
  paint(c, "oklch(0.18 0.01 40)", "tweed", 0.75);
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, x = -hw + len * t, z = Math.sin(t * PI * 2.5) * 0.045;
    pts.push([x, 0.01, z]);
  }
  path(c, pts, 0.01, 7);
}

const K = { wainscot, portal, ceiling, pendant, sconce, footrail, barmirror, tablelamp, barware, cable };
export function geometry(ctx) { const p = ctx.params ?? {}; (K[p.kind] ?? K.pendant)(ctx, p); }
const B = (w, h, d, cx = 0, cz = 0, y0 = 0) => box([cx - w / 2, cx + w / 2, y0, y0 + h, cz - d / 2, cz + d / 2]);
export function collider(ctx) {
  const p = ctx.params ?? {};
  switch (p.kind) {
    case "wainscot": return B(p.len ?? 9.2, p.height ?? 1.06, 0.08, 0, 0.01);
    case "portal": {
      const hw = (p.w ?? 4.06) / 2, h = p.h ?? 3.22, jw = 0.26;
      return [B(jw, h, 0.34, -hw - jw / 2, 0), B(jw, h, 0.34, hw + jw / 2, 0)];
    }
    case "footrail": return B(p.len ?? 8.4, 0.22, 0.24, 0, -0.1);
    default: return null;
  }
}
