// The Level 7 entrance room as a 2000s house (backrooms-wiki.wikidot.com/level-7: the room is built sideways into the ceiling, with a bookcase, a coffee
// table, a chair, a fluorescent ceiling lamp and a puddle on the carpet; here it is a family living room circa 2003: a tube TV and a game console, a sofa,
// a beige PC and CRT monitor, a CD tower, a lava lamp, posters). Laid by places/level7/sim.js lay(); ids start l7h-.
const BEIGE = { color: "oklch(0.74 0.05 80)", roughness: 0.9 };
const PLASTIC = { color: "oklch(0.78 0.025 85)", roughness: 0.5 };       // that yellowed beige plastic
const SILVER = { color: "oklch(0.62 0.01 250)", roughness: 0.45, metalness: 0.4 };
const BLACK = { color: "oklch(0.16 0.008 260)", roughness: 0.4 };
const FABRIC = { color: "oklch(0.38 0.07 20)", roughness: 0.95 };           // a brick-red microfibre sofa
const SCREEN = (c, i) => ({ color: "oklch(0.12 0.02 250)", emissive: c, emissiveIntensity: i, roughness: 0.2 });
const poster = (t, sub, fg, w) => `<div face="front" width="${w}m" style="font-size:${Math.round(w * 90)}px;font-weight:900;color:${fg};text-align:center;line-height:1.05;font-family:Impact,sans-serif">${t}<div style="font-size:${Math.round(w * 38)}px;font-weight:700;font-family:Arial,sans-serif;margin-top:10px">${sub}</div></div>`;

export function layHouse(ctx, FY) {
  const sp = (id, spec) => ctx.spawn(`l7h-${id}`, spec);
  const bx = (id, x, y, z, w, h, d, material, extra = {}) => { const { solid, ...rest } = extra; return sp(id, { feetPosition: { x, y: y - h / 2, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material, ...(solid ? { physics: "static" } : {}), ...rest }); }; // y is the box's middle
  // ---- the entertainment centre: a tube TV on the swollen cabinet by the east wall, facing the room, with a game console and controllers on the carpet
  const TV = { x: 2.4, y: FY + 1.1, z: -2.15 }; // on top of the cabinet (l7-dresser)
  bx("tv-body", TV.x - 0.05, TV.y + 0.34, TV.z, 0.62, 0.62, 0.78, SILVER, { rotation: { yaw: 90 } });
  bx("tv-back", TV.x + 0.28, TV.y + 0.34, TV.z, 0.4, 0.46, 0.5, SILVER, { rotation: { yaw: 90 } }); // the deep tube behind the glass
  sp("tv-screen", { feetPosition: { x: TV.x - 0.375, y: TV.y + 0.11, z: TV.z }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 0.58, height: 0.46, depth: 0.02 }, material: SCREEN("oklch(0.7 0.06 230)", 1.4),
    children: [{ feetPosition: { x: -0.3, y: 0, z: 0 }, light: { kind: "point", color: "oklch(0.78 0.07 230)", intensity: 1.5, distance: 7 } }] });
  bx("tv-knob", TV.x - 0.375, TV.y + 0.1, TV.z + 0.3, 0.02, 0.05, 0.12, BLACK, { rotation: { yaw: 90 } });
  bx("console", 1.95, FY + 0.05, -2.15, 0.34, 0.07, 0.26, { color: "oklch(0.3 0.01 260)", roughness: 0.4 }, { rotation: { yaw: 90 } });
  bx("pad-0", 1.55, FY + 0.04, -1.55, 0.2, 0.05, 0.12, BLACK, { rotation: { yaw: 25 } });
  bx("pad-1", 1.45, FY + 0.04, -1.8, 0.2, 0.05, 0.12, { color: "oklch(0.35 0.12 25)", roughness: 0.5 }, { rotation: { yaw: -40 } });
  // DVDs and VHS tapes stacked on the cabinet, a boombox beside the TV
  for (let k = 0; k < 6; k++) bx(`dvd-${k}`, TV.x + 0.05, TV.y + 0.02 + k * 0.025, TV.z + 0.62, 0.19, 0.02, 0.14, { color: ["oklch(0.4 0.14 20)", "oklch(0.35 0.1 250)", "oklch(0.85 0.01 90)", "oklch(0.3 0.09 150)"][k % 4], roughness: 0.6 }, { rotation: { yaw: 90 + k * 4 } });
  bx("boombox", TV.x, TV.y + 0.13, TV.z - 0.68, 0.55, 0.26, 0.2, SILVER, { rotation: { yaw: 80 } });

  // ---- the sofa (brick-red microfibre) facing the TV, with a throw cushion, and a CD tower by the bookcase
  const SF = { x: -1.35, z: -0.4 };
  bx("sofa-seat", SF.x, FY + 0.22, SF.z, 0.85, 0.44, 2.0, FABRIC, { rotation: { yaw: 0 }, solid: true });
  bx("sofa-back", SF.x - 0.38, FY + 0.7, SF.z, 0.18, 0.55, 2.0, FABRIC);
  bx("sofa-arm-0", SF.x, FY + 0.4, SF.z - 1.02, 0.85, 0.5, 0.16, FABRIC); bx("sofa-arm-1", SF.x, FY + 0.4, SF.z + 1.02, 0.85, 0.5, 0.16, FABRIC);
  bx("cushion", SF.x + 0.05, FY + 0.58, SF.z + 0.55, 0.42, 0.42, 0.14, { color: "oklch(0.7 0.1 85)", roughness: 0.95 }, { rotation: { yaw: 20, roll: 18 } });
  bx("cdtower", -2.6, FY + 0.8, 1.5, 0.22, 1.6, 0.22, BLACK);
  for (let k = 0; k < 16; k++) bx(`cd-${k}`, -2.49, FY + 0.18 + k * 0.095, 1.5, 0.02, 0.07, 0.15, { color: `oklch(0.6 0.13 ${k * 47})`, roughness: 0.4 });

  // ---- the family computer on the cabinet at the south-east: a CRT monitor, a beige tower, a keyboard, a mouse on a pad
  const PC = { x: 2.42, y: FY + 1.25, z: 2.2 };
  bx("pc-monitor", PC.x, PC.y + 0.26, PC.z, 0.55, 0.46, 0.52, PLASTIC, { rotation: { yaw: 90 } });
  bx("pc-monitor-back", PC.x + 0.25, PC.y + 0.22, PC.z, 0.34, 0.34, 0.34, PLASTIC, { rotation: { yaw: 90 } });
  sp("pc-screen", { feetPosition: { x: PC.x - 0.285, y: PC.y + 0.1, z: PC.z }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 0.4, height: 0.32, depth: 0.02 }, material: SCREEN("oklch(0.62 0.12 235)", 1.1),
    children: [{ feetPosition: { x: -0.3, y: 0, z: 0 }, light: { kind: "point", color: "oklch(0.7 0.1 235)", intensity: 0.9, distance: 5 } }] });
  bx("pc-tower", PC.x + 0.1, FY + 0.35, PC.z + 0.95, 0.2, 0.7, 0.5, PLASTIC, { rotation: { yaw: 90 } });
  bx("pc-keyboard", PC.x - 0.55, PC.y + 0.03, PC.z - 0.02, 0.17, 0.03, 0.46, PLASTIC, { rotation: { yaw: 92 } });
  bx("pc-mouse", PC.x - 0.6, PC.y + 0.02, PC.z + 0.38, 0.06, 0.03, 0.1, PLASTIC);

  // ---- the lava lamp on the bookcase: a slow orange glow, and a sleeping lamp shade on the coffee table
  sp("lava", { feetPosition: { x: -2.72, y: FY + 2.3, z: 0.3 }, primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.09, height: 0.42 }, material: { color: "oklch(0.6 0.2 40)", emissive: "oklch(0.6 0.2 40)", emissiveIntensity: 1.6, roughness: 0.3 },
    children: [{ feetPosition: { x: 0, y: 0.5, z: 0 }, light: { kind: "point", color: "oklch(0.7 0.2 40)", intensity: 1.0, distance: 6 } }] });
  bx("remote", 1.1, FY + 0.5, -0.7, 0.05, 0.02, 0.18, BLACK, { rotation: { yaw: 40 } });
  sp("soda", { feetPosition: { x: 1.3, y: FY + 0.5, z: -1.05 }, primitive: { kind: "cylinder", radiusTop: 0.035, radiusBottom: 0.035, height: 0.13 }, material: { color: "oklch(0.5 0.2 25)", roughness: 0.3, metalness: 0.6 } });

  // ---- on the walls: a movie poster, a pop group, a kitten, a calendar, a school photo; chair-rail trim and baseboards
  [[-3.0, 1.55, 1.0, "tall", 90, "BLOCKBUSTER", "SUMMER 2003 · IN THEATRES", "oklch(0.3 0.1 265)", "#f6e8c0"],
   [-3.0, 1.55, -1.6, "tall", 90, "TEEN POP", "WORLD TOUR 2002", "oklch(0.55 0.25 340)", "#ffffff"],
   [0.9, 1.5, 3.0, "tall", 180, "HANG IN THERE", "(a kitten on a branch)", "oklch(0.88 0.06 90)", "#3a2a1a"],
   [-0.3, 1.6, -3.0, "wide", 0, "AUGUST 2004", "1 2 3 4 5 6 7 8 9 10 11 12 13 14 15", "oklch(0.96 0.01 90)", "#c0392b"]].forEach(([x, y, z, kind, yaw, tt, sub, bg, fg], i) => {
    const w = kind === "tall" ? 0.7 : 0.9, h = kind === "tall" ? 1.0 : 0.7;
    sp(`poster-${i}`, { feetPosition: { x: x + (yaw === 90 ? 0.1 : 0), y: FY + y - 0.5, z: z + (yaw === 180 ? -0.1 : yaw === 0 ? 0.1 : 0) }, rotation: { yaw }, primitive: { kind: "box", width: w, height: h, depth: 0.03 }, material: { color: bg, roughness: 0.8 }, ui: poster(tt, sub, fg, w) });
  });
  for (let k = 0; k < 5; k++) bx(`photo-${k}`, 2.9, FY + 1.7 + (k % 2) * 0.22, -0.4 + k * 0.42, 0.04, 0.28, 0.22, { color: ["oklch(0.8 0.06 70)", "oklch(0.75 0.08 150)", "oklch(0.7 0.09 250)"][k % 3], roughness: 0.6 }, { rotation: { yaw: 90 } });
  for (const [x, z, w, d] of [[2.89, 0, 0.04, 5.9], [-2.89, 0, 0.04, 5.9], [-1.9, 2.89, 2.3, 0.04], [1.9, 2.89, 2.3, 0.04], [-2.0, -2.89, 2.1, 0.04], [2.0, -2.89, 2.1, 0.04]])
    bx(`rail-${x}-${z}`, x, FY + 1.18, z, w, 0.05, d, { color: "oklch(0.93 0.01 90)", roughness: 0.6 });
  // the tube on the ceiling (the wiki's fluorescent lamp), in a white acrylic box: a hum and a cold light that is not quite steady
  sp("troffer", { feetPosition: { x: 0, y: FY + 2.62, z: 0 }, primitive: { kind: "box", width: 1.3, height: 0.08, depth: 0.5 }, material: { color: "oklch(0.97 0.01 220)", emissive: "oklch(0.95 0.03 220)", emissiveIntensity: 1.4, roughness: 0.4 },
    children: [{ feetPosition: { x: 0, y: -0.4, z: 0 }, light: { kind: "point", color: "oklch(0.92 0.03 215)", intensity: 1.6, distance: 8 } }] });
}
