// Level 6.1 "The Snackrooms": what makes the mall lively. Round pillars with neon rings, a sunken conversation pit with a mirror ball throwing coloured light round the hall, hanging banners and palms that
// sway, neon-framed store fronts, steam off the grill and flame in the pizza oven, dust in the daylight that comes from nowhere; the Facelings (Entity 9) who cook, serve and clear the tables; the M.E.G. guards on the
// steel door, Camp Amber's outpost and the Guild of Many's picket; the sliding glass doors to the restaurant on Level 11, and the bent wall to the Blue Channel. Called from places/level61/sim.js.
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { npcState } from "./stats.js";
import { weaponBody } from "./weapon-look.js";
const A = "scripts/ambient-anim.js";
const NEON_P = "oklch(0.74 0.2 350)", NEON_T = "oklch(0.8 0.13 190)";
const INK = { color: "#060606", roughness: 1, metalness: 0 };
const faceless = (spec) => { const h = spec.children?.[0]; if (h?.model) { if (typeof h.model === "string") h.model = { id: h.model }; h.model.materials = { fur: INK, ...h.model.materials, pupil: INK, eyewhite: INK, eyeink: INK, mouth: INK, blush: INK, tongue: INK, nose: INK, tip: INK, mark: INK }; h.morph = undefined; } return spec; };
const yawOf = (dx, dz) => (Math.atan2(-dx, -dz) * 180) / Math.PI;

const SMOKE = `fx
pop smoke rate=7 on=disc(.35) life=1.4..2.4 v=up(.5)+sdir()*.12 size=.2..0.4 acc=curl(.6)*.2+drag(.8) col=<.82,.8,.76> a=0>.3:.3>.3:.7>0 sz=$size*(.6>2) r=sprite(smoke-puff,alpha)`;
const FLAME = `fx
pop flame rate=16 on=disc(.25) life=.3..0.55 v=up(.7) size=.08..0.16 sz=$size*(1>.2) col=hdr(2,1,.2)>hdr(.6,.2,.05) a=0>.2:1>.7:.7>0 r=sprite(flame-wisp,add)
pop glow n=1 r=light(<1,.5,.15>,fire()*5,6)`;
const SUNDUST = `fx
pop mote rate=14 on=box(7,3,7) life=6..11 v=sdir()*.06 size=.014..0.03 acc=curl(.4)*.07 col=<1,.95,.8> a=0>.5:.25>.5:.75>0 r=sprite(mote,alpha)`;
const GLINT = `fx
pop glint rate=20 on=sphere(.52) life=.25..0.5 v=sdir()*.2 size=.04..0.09 col=hdr(3,3,3) a=1>0 sz=$size r=sprite(soft-disc,add)`;
const FLICK = (c, s) => `fx\npop flick n=1 r=light(${c},flick(${s},.45)*4,6)`;
const JUKE = `fx
pop note rate=1.6 on=disc(.3) life=2.2..3.2 v=up(.35)+sdir()*.2 size=.07..0.11 col=hdr(2,.6,1.6)..hdr(.6,1.8,2) a=0>.9:.3>.9:.7>0 sz=$size r=sprite(soft-disc,add)`;

export function layExtra(ctx, { HW, HD, HH }) {
  const sp = (id, spec) => ctx.spawn(id, spec);
  const bx = (id, x, y, z, w, h, d, material, extra = {}) => sp(id, { feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material, ...extra });
  const neon = (c) => ({ color: c, emissive: c, emissiveIntensity: 2.4, roughness: 0.3 });
  const PLASTER = { color: "oklch(0.93 0.02 85)", roughness: 0.85 };

  // ---- round pillars: cream columns with a neon ring at the foot and the capital, a planter ring round the base
  [[-15, -12], [15, -12], [-15, 12], [15, 12], [-27, -6], [27, -6], [-27, 6], [27, 6]].forEach(([x, z], k) => {
    sp(`l61-col-${k}`, { feetPosition: { x, y: 0, z }, physics: { body: "static", collider: "cylinder" }, primitive: { kind: "cylinder", radiusTop: 0.4, radiusBottom: 0.44, height: HH }, material: PLASTER,
      children: [
        { feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.62, radiusBottom: 0.68, height: 0.5 }, material: { color: "oklch(0.3 0.1 262)", roughness: 0.45 } },
        { feetPosition: { x: 0, y: 0.52, z: 0 }, primitive: { kind: "torus", radius: 0.55, tube: 0.035 }, rotation: { pitch: 90 }, material: neon(k % 2 ? NEON_P : NEON_T) },
        { feetPosition: { x: 0, y: HH - 0.6, z: 0 }, primitive: { kind: "torus", radius: 0.48, tube: 0.04 }, rotation: { pitch: 90 }, material: neon(k % 2 ? NEON_T : NEON_P) },
        { feetPosition: { x: 0, y: HH - 0.45, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.7, radiusBottom: 0.46, height: 0.45 }, material: PLASTER },
      ] });
  });
  // coving: a navy baseboard round the hall, and neon lines round the hall's four walls and the pit rim
  for (const s of [-1, 1]) {
    bx(`l61-skirt-z${s}`, 0, 0, s * (HD - 0.2), 2 * HW - 0.5, 0.26, 0.12, { color: "oklch(0.25 0.08 262)", roughness: 0.5 });
    bx(`l61-skirt-x${s}`, s * (HW - 0.2), 0, 0, 0.12, 0.26, 2 * HD - 0.5, { color: "oklch(0.25 0.08 262)", roughness: 0.5 });
    bx(`l61-pitneon-z${s}`, 0, 0.02, s * 7.1, 14.4, 0.05, 0.08, neon(NEON_P), { physics: undefined });
    bx(`l61-pitneon-x${s}`, s * 7.1, 0.02, 0, 0.08, 0.05, 14.4, neon(NEON_T), { physics: undefined });
  }
  // the skylights get rafters and neon edges, so the black glass reads as a window and not a hole
  for (const sx of [-18, 0, 18]) for (const sz of [-9, 9]) {
    bx(`l61-raf-${sx}-${sz}-a`, sx, HH - 0.32, sz, 9.4, 0.2, 0.2, { color: "oklch(0.36 0.02 250)", metalness: 0.7, roughness: 0.4 }, { physics: undefined });
    bx(`l61-raf-${sx}-${sz}-b`, sx, HH - 0.32, sz, 0.2, 0.2, 7.4, { color: "oklch(0.36 0.02 250)", metalness: 0.7, roughness: 0.4 }, { physics: undefined });
    for (const [dx, dz, w, d] of [[0, -3.55, 9.2, 0.05], [0, 3.55, 9.2, 0.05], [-4.55, 0, 0.05, 7.1], [4.55, 0, 0.05, 7.1]]) bx(`l61-skn-${sx}-${sz}-${dx}-${dz}`, sx + dx, HH - 0.26, sz + dz, w, 0.05, d, neon((sx + sz) % 2 ? NEON_P : NEON_T), { physics: undefined });
  }
  // neon frames round the store openings, a flickering tube in each sign
  [-21, -7, 7, 21].forEach((cx, k) => {
    const c = k % 2 ? NEON_T : NEON_P;
    bx(`l61-nf-${k}-l`, cx - 2.15, 0, -HD + 0.05, 0.12, 3.3, 0.12, neon(c), { physics: undefined }); bx(`l61-nf-${k}-r`, cx + 2.15, 0, -HD + 0.05, 0.12, 3.3, 0.12, neon(c), { physics: undefined });
    bx(`l61-nf-${k}-t`, cx, 3.25, -HD + 0.05, 4.4, 0.12, 0.12, neon(c), { physics: undefined });
    sp(`l61-nf-${k}-f`, { feetPosition: { x: cx, y: 3.9, z: -HD + 0.6 }, fx: { script: FLICK(k % 2 ? "<.4,.9,1>" : "<1,.35,.75>", 4 + k * 1.3) } });
  });

  // ---- the sunken pit: two steps down; benches, the planter, and a mirror ball over it throwing slow coloured light round the whole hall
  sp("l61-ball", { feetPosition: { x: 0, y: HH - 1.7, z: 0 }, behavior: A, state: { anim: { kind: "spin", sec: 14 } }, primitive: { kind: "sphere", radius: 0.5 }, material: { color: "oklch(0.9 0.005 250)", metalness: 1, roughness: 0.08 }, fx: { script: GLINT },
    children: [
      { feetPosition: { x: 0, y: 1.0, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.012, radiusBottom: 0.012, height: 1.1 }, material: { color: "oklch(0.3 0.01 250)" } },
      { feetPosition: { x: 4.5, y: -0.4, z: 0 }, light: { kind: "point", color: "oklch(0.75 0.25 350)", intensity: 7, distance: 17, shadow: { enabled: false } } },
      { feetPosition: { x: -4.5, y: -0.4, z: 0 }, light: { kind: "point", color: "oklch(0.8 0.15 190)", intensity: 7, distance: 17, shadow: { enabled: false } } },
      { feetPosition: { x: 0, y: -0.4, z: 4.5 }, light: { kind: "point", color: "oklch(0.85 0.17 85)", intensity: 6, distance: 17, shadow: { enabled: false } } },
      { feetPosition: { x: 0, y: -0.4, z: -4.5 }, light: { kind: "point", color: "oklch(0.7 0.2 290)", intensity: 6, distance: 17, shadow: { enabled: false } } },
    ] });

  // ---- hanging banners and swaying palms
  [[-9, -4], [9, -4], [-9, 4], [9, 4], [-21, 0], [21, 0]].forEach(([x, z], k) => {
    sp(`l61-banner-${k}`, { feetPosition: { x, y: HH - 0.1, z }, rotation: { yaw: k % 2 ? 90 : 0 }, behavior: A, state: { anim: { kind: "sway", deg: 4, sec: 3.6 + (k % 3) * 0.6, axis: "roll", phase: k / 6 } },
      primitive: { kind: "box", width: 0.9, height: 0.05, depth: 0.05 }, material: { color: "oklch(0.3 0.01 250)" },
      children: [{ feetPosition: { x: 0, y: -2.0, z: 0 }, primitive: { kind: "box", width: 0.85, height: 1.9, depth: 0.03 }, material: { color: [NEON_P, NEON_T, "oklch(0.85 0.17 85)"][k % 3], emissive: [NEON_P, NEON_T, "oklch(0.85 0.17 85)"][k % 3], emissiveIntensity: 0.5, roughness: 0.8 },
        ui: `<div face="front" width="0.85m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:900;color:#fff;text-shadow:2px 2px 0 #0008;text-align:center"><div style="font-size:60px">${["SUMMER","SALE","FREE","'86","EAT","NEW!"][k]}</div><div style="font-size:24px">${["all season","everything must go","take two","grand reopening","you are welcome","same as always"][k]}</div></div>` }] });
  });
  [[-27, -18], [27, -18], [-27, 18], [27, 18]].forEach(([x, z], k) => {
    sp(`l61-palm-${k}`, { feetPosition: { x, y: 0, z }, behavior: A, state: { anim: { kind: "sway", deg: 2.2, sec: 4.5 + k * 0.4, axis: k % 2 ? "roll" : "pitch", phase: k / 4 } }, primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.1, height: 2.6 }, material: { color: "oklch(0.4 0.06 55)", roughness: 0.9 },
      children: Array.from({ length: 7 }, (_, i) => ({ feetPosition: { x: Math.cos((i / 7) * 6.283) * 0.5, y: 2.5, z: Math.sin((i / 7) * 6.283) * 0.5 }, rotation: { yaw: -(i / 7) * 360, pitch: -38 }, primitive: { kind: "box", width: 0.34, height: 0.03, depth: 1.5 }, material: { color: "oklch(0.45 0.13 148)", roughness: 0.8 } })) });
  });
  // dust in the daylight that has no sun, steam off the grill, flame in the oven, notes off the jukebox
  [[-18, 3, -8], [18, 3, -8], [-18, 3, 8], [18, 3, 8], [0, 3, 14], [0, 3, -14]].forEach(([x, y, z], k) => sp(`l61-dust-${k}`, { feetPosition: { x, y, z }, fx: { script: SUNDUST } }));
  sp("l61-grill-smoke", { feetPosition: { x: 21, y: 1.05, z: -31.3 }, fx: { script: SMOKE } });
  sp("l61-oven-fire", { feetPosition: { x: 9.5, y: 0.7, z: -31.0 }, fx: { script: FLAME } });
  sp("l61-juke-notes", { feetPosition: { x: -26.4, y: 1.7, z: -25 }, fx: { script: JUKE } });

  // ---- Level 11: the sliding glass doors (the safe way out) in the east wall, and a vestibule that is closed for restocking
  const dz = -9;
  bx("l61-l11-floor", HW + 3, -0.29, dz, 6, 0.3, 6, { color: "oklch(0.8 0.01 80)", roughness: 0.4 }); bx("l61-l11-roof", HW + 3, 3.4, dz, 6, 0.3, 6, { color: "oklch(0.9 0.01 90)" });
  bx("l61-l11-back", HW + 6, 0, dz, 0.3, 3.4, 6, PLASTER); bx("l61-l11-wn", HW + 3, 0, dz - 3, 6, 3.4, 0.3, PLASTER); bx("l61-l11-ws", HW + 3, 0, dz + 3, 6, 3.4, 0.3, PLASTER);
  const glass = { color: "oklch(0.8 0.05 220)", opacity: 0.32, transparent: true, roughness: 0.05, metalness: 0.2 };
  for (const s of [-1, 1]) sp(`l61-l11-panel-${s}`, { feetPosition: { x: HW, y: 0, z: dz + s * 0.5 }, behavior: "scripts/l61-door.js", physics: { body: "kinematic", collider: "box" }, state: { slide: s * 1.0, axis: "z", home: { x: HW, z: dz + s * 0.5 }, sense: { x: HW - 1.6, z: dz } },
    primitive: { kind: "box", width: 0.06, height: 2.6, depth: 1.0 }, material: glass, children: [{ feetPosition: { x: 0, y: 1.3, z: 0 }, primitive: { kind: "box", width: 0.08, height: 0.06, depth: 1.02 }, material: { color: "oklch(0.7 0.01 250)", metalness: 0.8 } }] });
  bx("l61-l11-head", HW, 2.6, dz, 0.3, 0.8, 2.6, { color: "oklch(0.3 0.01 250)", metalness: 0.5 });
  sp("l61-l11-sign", { feetPosition: { x: HW - 0.2, y: 3.15, z: dz }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 2.4, height: 0.5, depth: 0.05 }, material: { color: "oklch(0.2 0.03 160)" },
    ui: `<div face="front" width="2.4m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:900;color:#e8ffe8;text-align:center"><div style="font-size:90px">RESTAURANT · LEVEL 11</div><div style="font-size:34px;color:#9fe8b0">the safe way out · automatic doors</div></div>` });
  sp("l61-l11-closed", { feetPosition: { x: HW + 5.8, y: 1.6, z: dz }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 3, height: 1.1, depth: 0.04 }, material: { color: "oklch(0.15 0.01 250)" },
    ui: `<div face="front" width="3m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;color:#ffe8a8;text-align:center"><div style="font-size:120px;font-weight:900">CLOSED</div><div style="font-size:50px">restocking · back soon</div></div>` });
  sp("l61-l11-light", { feetPosition: { x: HW + 3, y: 3, z: dz }, light: { kind: "point", color: "oklch(0.97 0.03 90)", intensity: 5, distance: 10 } });

  // ---- the bent wall: a stretch of the east wall that buckles away from the room, with the cold blue of the Blue Channel behind its cracks
  const bz = -17.5;
  [[0, 3.8], [1, 8], [2, 12]].forEach(([i, a]) => bx(`l61-bent-${i}`, HW - 0.5 - i * 0.12, 0, bz + i * 1.2, 0.3, HH - 0.2 - i * 0.1, 1.25, { ...PLASTER, color: "oklch(0.88 0.03 220)" }, { rotation: { yaw: -a * (i + 1), roll: i * 2 }, physics: "static" }));
  sp("l61-bent-glow", { feetPosition: { x: HW - 0.2, y: 1.8, z: bz + 1.3 }, behavior: A, state: { anim: { kind: "pulse", amp: 1.35, sec: 2.2 } }, primitive: { kind: "box", width: 0.06, height: 3.4, depth: 0.5 }, material: { color: "oklch(0.8 0.14 225)", emissive: "oklch(0.8 0.16 225)", emissiveIntensity: 2.6 },
    children: [{ feetPosition: { x: -1.2, y: 0, z: 0 }, light: { kind: "point", color: "oklch(0.75 0.14 225)", intensity: 3, distance: 9 } }] });
  sp("l61-bent-sign", { feetPosition: { x: HW - 4, y: 1.0, z: bz + 1.0 }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 1.2, height: 0.7, depth: 0.04 }, material: { color: "oklch(0.88 0.1 95)" },
    ui: `<div face="front" width="1.2m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:900;color:#2a1a00;text-align:center"><div style="font-size:70px">CAUTION</div><div style="font-size:32px">the wall is not straight. do not lean on it.</div></div>` });
  sp("l61-bent-trigger", { feetPosition: { x: HW - 1.0, y: 0, z: bz + 1.4 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 1.4, height: 3, depth: 3 }, visible: false, behavior: "scripts/l61-bent.js" });

  // ---- Camp Amber's outpost by the steel door: a canopy, a table, a pot, a sign
  sp("l61-amber-tent", { feetPosition: { x: -26.5, y: 0, z: 12 }, rotation: { yaw: 90 }, physics: "static", primitive: { kind: "box", width: 3, height: 2.2, depth: 2.4 }, material: { color: "oklch(0.7 0.14 70)", roughness: 0.95 } });
  sp("l61-amber-pot", { feetPosition: { x: -23.5, y: 0, z: 13.2 }, physics: "static", primitive: { kind: "cylinder", radiusTop: 0.4, radiusBottom: 0.32, height: 0.55 }, material: { color: "oklch(0.3 0.02 250)", metalness: 0.7 }, fx: { script: SMOKE } });
  sp("l61-amber-sign", { feetPosition: { x: -22.5, y: 2.2, z: 11 }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 1.8, height: 0.9, depth: 0.05 }, material: { color: "oklch(0.55 0.15 60)" },
    ui: `<div face="front" width="1.8m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:900;color:#fff;text-align:center"><div style="font-size:90px">CAMP AMBER</div><div style="font-size:38px">Level 6.1 outpost · new here? sit down, eat</div></div>` });

  // ---- a real restaurant's furniture: menu boards you flip through, a register, the "now serving" board, a tray return, condiments and a half-eaten tray on the tables, a wet-floor sign
  const MENU_AT = { clip: [-24.4, 1.12, -29.7, 180], liq: [-11.7, 1.12, -23.2, -90], slice: [4.4, 1.04, -28.8, 180], burger: [17.6, 1.04, -28.2, 180] };
  const STORE_X = { clip: -21, liq: -7, slice: 7, burger: 21 }, MENUS = {
    clip: [["Budweiser", "3.00"], ["Jack and Coke", "4.50"], ["Smirnoff Ice", "3.75"], ["Coca-Cola float", "2.25"], ["Chips and a Coke", "2.75"]],
    liq: [["Almond water", "3.00"], ["Corona with lime", "4.00"], ["Margarita", "5.50"], ["Miller Lite", "3.00"], ["Whiskey, neat", "5.00"], ["Bar snacks", "2.50"]],
    slice: [["Pepperoni slice", "3.25"], ["2 cheese + Coke", "6.25"], ["Supreme slice", "5.00"]],
    burger: [["Cheeseburger", "4.50"], ["Bop meal", "7.95"], ["Fries + Coke", "3.25"]],
  };
  const NAMES = { clip: "Clippers", liq: "Liquorette", slice: "Slice Palace", burger: "Burger Bop" };
  for (const key of Object.keys(MENUS)) {
    const [mx, my, mz, myaw] = MENU_AT[key], cx = STORE_X[key];
    sp(`l61-menu-${key}`, { tags: ["usable"], feetPosition: { x: mx, y: my, z: mz }, rotation: { yaw: myaw, pitch: -12 }, behavior: "scripts/l61-use.js", primitive: { kind: "box", width: 0.5, height: 0.66, depth: 0.04 }, material: { color: "oklch(0.2 0.02 250)", roughness: 0.6 },
      state: { kind: "menu", key, name: `${NAMES[key]} menu`, verb: "Flip the menu", info: "Press to see the next item. Everything is crossed out and free.", tint: "#ffd84a" },
      ui: `<div face="front" width="0.5m" style="width:100%;height:100%;box-sizing:border-box;padding:14px 12px;background:#161a1e;color:#f4f1ea;font-family:Georgia,serif;text-align:center"><div style="font-size:30px;letter-spacing:3px;color:#ffd84a;border-bottom:2px solid #ffd84a;padding-bottom:4px">${NAMES[key]}</div>${MENUS[key].map(([n, p]) => `<div style="font-size:21px;margin-top:10px;display:flex;justify-content:space-between"><span>${n}</span><span><s style="color:#aaa">$${p}</s> <b style="color:#7affb0">FREE</b></span></div>`).join("")}<div style="font-size:15px;margin-top:14px;color:#9fb8c8">please take a number</div></div>` });
    // the till: a little register with a bell
    const [px, py, pz] = { clip: [-24.8, 1.1, -30.6], liq: [-12.2, 1.1, -22.8], slice: [9.3, 1.02, -29.6], burger: [18.3, 1.02, -29.6] }[key];
    sp(`l61-reg-${key}`, { feetPosition: { x: px, y: py, z: pz }, rotation: { yaw: myaw }, primitive: { kind: "box", width: 0.36, height: 0.24, depth: 0.34 }, material: { color: "oklch(0.7 0.03 80)", roughness: 0.5, metalness: 0.4 },
      children: [{ feetPosition: { x: 0, y: 0.24, z: 0.02 }, rotation: { pitch: -35 }, primitive: { kind: "box", width: 0.28, height: 0.16, depth: 0.02 }, material: { color: "#031", emissive: "#2bff80", emissiveIntensity: 0.6 }, ui: `<div face="front" width="0.28m" style="width:100%;height:100%;background:#031;color:#7affb0;font:700 40px 'Courier New',monospace;padding:6px;box-sizing:border-box;text-align:center;line-height:1.05">TOTAL<br>$0.00<br><span style="font-size:22px">THANK YOU</span></div>` },
        { feetPosition: { x: 0.2, y: 0.2, z: -0.1 }, primitive: { kind: "sphere", radius: 0.05 }, material: { color: "oklch(0.8 0.1 85)", metalness: 0.9, roughness: 0.2 } }] });
    // the "now serving" board high on the store front (the counter's tickets count up on it) and the tray return beside the store
    sp(`l61-serve-${key}`, { feetPosition: { x: cx + 3.4, y: 2.7, z: -HD + 0.22 }, rotation: { yaw: 180 }, primitive: { kind: "box", width: 1.8, height: 1.0, depth: 0.06 }, material: { color: "oklch(0.1 0.01 250)" },
      ui: `<div face="front" width="1.8m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Courier New',monospace;background:#101418;color:#7affb0;text-align:center"><div style="font-size:54px;color:#ffd84a">NOW SERVING</div><div style="font-size:150px;font-weight:700;letter-spacing:6px;text-shadow:0 0 18px #3f9">040</div><div style="font-size:34px;color:#9fb8c8">${NAMES[key]}</div></div>` });
    sp(`l61-ret-${key}`, { tags: ["usable"], feetPosition: { x: cx + 5.6, y: 0, z: -HD + 1.4 }, physics: { body: "static", collider: "box" }, behavior: "scripts/l61-use.js", primitive: { kind: "box", width: 0.7, height: 1.1, depth: 0.55 }, material: { color: "oklch(0.7 0.02 250)", metalness: 0.7, roughness: 0.4 },
      state: { kind: "return", name: "Tray return", verb: "Return your tray", info: "A rack for trays. Please be considerate.", tint: "#9fe8ff" },
      children: [{ feetPosition: { x: 0, y: 1.1, z: 0 }, primitive: { kind: "box", width: 0.7, height: 0.4, depth: 0.04 }, material: { color: "oklch(0.35 0.09 230)" }, ui: `<div face="front" width="0.7m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font:900 70px Arial,sans-serif;color:#fff">TRAYS</div>` }] });
  }
  // the dining room: ketchup, mustard and a napkin box on the tables, a tray with a plate and a cup on about half, steam off the hot ones
  let ti = 0;
  for (let x = -24; x <= 24; x += 6) for (let z = -15; z <= 15; z += 6) {
    if (Math.abs(x) < 9 && Math.abs(z) < 9) continue;
    const tx = x + Math.sin(x * 3.1 + z) * 0.6, tz = z + Math.cos(x + z * 2.3) * 0.5, r = Math.abs((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1), hot = r < 0.18;
    sp(`l61-set-${ti++}`, { feetPosition: { x: tx, y: 0.78, z: tz }, ...(hot ? { fx: { script: SMOKE } } : {}), primitive: { kind: "sphere", radius: 0.001 }, material: { color: "oklch(0.5 0 0)" },
      children: [
        { feetPosition: { x: 0.12, y: 0, z: 0.1 }, primitive: { kind: "cylinder", radiusTop: 0.02, radiusBottom: 0.035, height: 0.17 }, material: { color: "oklch(0.5 0.22 28)", roughness: 0.4 } },
        { feetPosition: { x: 0.2, y: 0, z: 0.05 }, primitive: { kind: "cylinder", radiusTop: 0.02, radiusBottom: 0.035, height: 0.17 }, material: { color: "oklch(0.85 0.17 95)", roughness: 0.4 } },
        { feetPosition: { x: 0.04, y: 0, z: 0.14 }, primitive: { kind: "box", width: 0.1, height: 0.1, depth: 0.07 }, material: { color: "oklch(0.78 0.01 250)", metalness: 0.7 } },
        ...(r > 0.5 ? [] : [
          { feetPosition: { x: -0.25, y: 0, z: -0.1 }, rotation: { yaw: r * 400 }, primitive: { kind: "box", width: 0.4, height: 0.02, depth: 0.28 }, material: { color: ["oklch(0.62 0.17 30)", "oklch(0.55 0.12 190)", "oklch(0.88 0.12 95)"][ti % 3], roughness: 0.5 } },
          { feetPosition: { x: -0.3, y: 0.02, z: -0.1 }, primitive: { kind: "cylinder", radiusTop: 0.1, radiusBottom: 0.09, height: 0.02 }, material: { color: "oklch(0.97 0.005 90)" } },
          { feetPosition: { x: -0.3, y: 0.04, z: -0.1 }, primitive: { kind: "sphere", radius: hot ? 0.065 : 0.04 }, material: { color: hot ? "oklch(0.58 0.12 55)" : "oklch(0.7 0.1 70)", roughness: 0.8 } },
          { feetPosition: { x: -0.14, y: 0.02, z: -0.04 }, primitive: { kind: "cylinder", radiusTop: 0.045, radiusBottom: 0.035, height: 0.12 }, material: { color: "oklch(0.55 0.2 25)" } },
        ]),
      ] });
  }
  // a faceling is mopping: wet-floor signs in the aisles, and the sound of a busy food court
  for (const [k, [x, z]] of [[8, 12], [-18, 17], [10, -20]].entries()) sp(`l61-wet-${k}`, { feetPosition: { x, y: 0, z }, rotation: { yaw: 30 + k * 40 }, primitive: { kind: "box", width: 0.34, height: 0.62, depth: 0.04 }, material: { color: "oklch(0.88 0.17 95)", roughness: 0.6 },
    ui: `<div face="front" width="0.34m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:900;color:#c0201a;text-align:center"><div style="font-size:34px">CAUTION</div><div style="font-size:26px;color:#222">WET FLOOR</div></div>` });
  [[-15, 0], [15, 0], [0, -18], [0, 18]].forEach(([x, z], k) => sp(`l61-murmur-${k}`, { feetPosition: { x, y: 1.5, z }, audio: { clip: "cdn/sfx-busy-restaurant-ambience-dishes-clinking-distant-chatter-loop.mp3", loop: true, gain: 0.16, spatial: true, maxDistance: 20 } }));
}

// ---- the people: Facelings, the staff, the guards and the pickets
const FACELINGS = [
const FACELINGS = [
  { id: "l61-fc-clip", greet: "Welcome to Clippers!", at: [-21, -31.4], face: 180, acts: ["wipe", "serve", "groove", "drink"], line: "A faceling slides a cold glass across the red bar. It was already pouring." },
  { id: "l61-fc-liq", greet: "Evening. Almond water?", at: [-14.7, -27], face: -90, acts: ["wipe", "serve", "drink", "groove"], line: "A faceling sets down an almond water without a word, as if it had been waiting for you." },
  { id: "l61-fc-slice", greet: "Slice Palace! Hot ones just out.", at: [7, -30.9], face: 180, acts: ["serve", "eat", "nod", "wipe"], gives: "pizza,pizza,coke", line: "A faceling hands you a slice on a paper plate. It is still too hot to hold, and perfect." },
  { id: "l61-fc-burger", greet: "Welcome to Burger Bop!", at: [21, -30.1], face: 180, acts: ["grill", "serve", "wipe", "groove"], gives: "burger,burger,coke", line: "A faceling flips something on the grill and presses the burger into your hands. No charge." },
  { id: "l61-fc-a", hasTray: true, route: [[-21, -12, 3, "wipe"], [-15, -12, 3, "tray"], [-15, -18, 2.5, "groove"], [-21, -18, 3, "wipe"]] },
  { id: "l61-fc-b", hasTray: true, route: [[21, -12, 3, "wipe"], [15, -12, 3, "tray"], [15, -18, 2.5, "groove"], [21, -18, 3, "wipe"]] },
  { id: "l61-fc-c", route: [[-21, 12, 3, "wipe"], [-15, 12, 2.5, "groove"], [-15, 18, 3, "nod"], [-21, 18, 3, "wipe"]] },
  { id: "l61-fc-d", route: [[21, 12, 3, "wipe"], [15, 12, 2.5, "groove"], [15, 18, 3, "nod"], [21, 18, 3, "wipe"]] },
  { id: "l61-fc-e", route: [[-27, -6, 3, "groove"], [-27, 6, 3, "wipe"], [-21, 6, 2.5, "serve"], [-21, -6, 2.5, "nod"]] },
  { id: "l61-fc-f", route: [[27, -6, 3, "wipe"], [27, 6, 3, "groove"], [21, 6, 2.5, "serve"], [21, -6, 2.5, "nod"]] },
  { id: "l61-fc-g", hasTray: true, route: [[-14, 19, 4, "tray"], [-14, 28, 4, "nod"]] },
];
const PATRONS = [
  { id: "l61-patron-w", name: "Diner Regular", at: [-22.3, 0], face: 90, acts: ["lounge", "drink", "groove"], look: { species: "cat", sex: "f", topw: "sweater", top: "#904050", botw: "pants", bottom: "#202028", shoes: "sneakers" } },
  { id: "l61-patron-e", name: "Wandering Survivor", at: [22.3, 0], face: -90, acts: ["eat", "relief", "groove"], look: { species: "fox", sex: "m", topw: "jacket", top: "#305040", botw: "cargo", bottom: "#282820", shoes: "boots" } },
  { id: "l61-patron-bar", name: "Clippers Patron", at: [-23.4, -29.2], face: 0, acts: ["drink", "groove", "nod"], look: { species: "dog", sex: "m", topw: "tee", top: "#d09030", botw: "pants", bottom: "#182030", shoes: "sneakers" } },
];
const HUMANS = {
  "l61-guard-a": { name: "M.E.G. Guard · Level 6 door", voice: "reyes", faction: "guard", look: { species: "wolf", sex: "m", topw: "megjacket", top: "#4a5a3a", botw: "cargo", bottom: "#3a3a30", shoes: "boots" }, gun: "carbine", at: [-27.6, -2.4], face: -90 },
  "l61-guard-b": { name: "M.E.G. Guard · Level 6 door", voice: "mags", faction: "guard", look: { species: "bear", sex: "f", topw: "megjacket", top: "#4a5a3a", botw: "cargo", bottom: "#3a3a30", shoes: "boots" }, gun: "carbine", at: [-27.6, 2.4], face: -90 },
  "l61-amber-a": { name: "Camp Amber volunteer", voice: "wren", faction: "trader", look: { species: "fox", sex: "f", topw: "sweater", top: "#d89a3a", botw: "pants", bottom: "#4a3a2a", shoes: "boots" }, gun: "knife", at: [-24.5, 11.4], face: 90 },
  "l61-amber-b": { name: "Camp Amber volunteer", voice: "penny", faction: "trader", look: { species: "bunny", sex: "m", topw: "hoodie", top: "#c87a2a", botw: "pants", bottom: "#4a3a2a", shoes: "sneakers" }, gun: "crowbar", at: [-23.4, 12.8], face: 150 },
  "l61-guild-a": { name: "Guild of Many member", voice: "hollis", faction: "pilgrim", look: { species: "sheep", sex: "f", topw: "hoodie", top: "#5a5a6a", botw: "longskirt", bottom: "#3a3a4a", shoes: "boots" }, gun: "bat", at: [-12, -2], face: 90, sign: "WE ARE MANY" },
  "l61-guild-b": { name: "Guild of Many member", voice: "mags", faction: "pilgrim", look: { species: "cat", sex: "m", topw: "jacket", top: "#5a5a6a", botw: "pants", bottom: "#3a3a4a", shoes: "boots" }, gun: "bat", at: [-12, 1], face: 90, sign: "MANY, NOT ONE" },
  "l61-guild-c": { name: "Guild of Many member", voice: "wren", faction: "pilgrim", look: { species: "deer", sex: "f", topw: "sweater", top: "#5a5a6a", botw: "pants", bottom: "#3a3a4a", shoes: "boots" }, gun: "bat", at: [-12, 4], face: 90, sign: "WE ARE NOT HARMFUL" },
};
export const PEOPLE = [...Object.keys(HUMANS), ...PATRONS.map((p) => p.id)];
export const FACELING_IDS = FACELINGS.map((f) => f.id);

export function faceling(ctx, id) {
  const f = FACELINGS.find((q) => q.id === id); if (!f) return;
  const i = FACELINGS.indexOf(f), at = f.at ? { x: f.at[0], z: f.at[1] } : { x: f.route[0][0], z: f.route[0][1] };
  const look = { ...npcLook("l61fc" + i, { species: ["cat", "wolf", "fox", "bear", "bunny", "dog"][i % 6], sex: i % 2 ? "f" : "m", topw: "apron", top: "#f4f1ea", botw: "pants", bottom: "#2a2a30", shoes: "sneakers", hat: "beanie", hatc: "#f4f1ea" }, "trader", 6), fur: "#060606", vary: false, eye: "#000000" };
  ctx.spawn(id, { tags: ["l61npc", "usable", "faceling"], feetPosition: { x: at.x, y: 0.05, z: at.z }, rotation: { yaw: f.face ?? 0 }, physics: "character", ...faceless(critterSpec(look)),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/l61-staff.js"],
    state: { name: "Faceling (Entity 9)", verb: "Take a plate", info: "A friendly, featureless worker in an apron. They cook, clean and serve, and nothing here costs a thing.", tint: "#f4f1ea", kind: "faceling", job: f.route ? "route" : "post", faceYaw: f.face, greet: f.greet, acts: f.acts, gives: f.gives, line: f.line, route: f.route?.map(([x, z, dwell, act]) => ({ x, z, dwell, act })), pace: 1.15 + (i % 3) * 0.15, hasTray: f.hasTray } });
  if (f.route && f.route.length > 2) ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, primitive: { kind: "box", width: 0.34, height: 0.02, depth: 0.24 }, material: { color: "oklch(0.88 0.01 90)", metalness: 0.4 }, children: [{ feetPosition: { x: 0.05, y: 0.02, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.07, height: 0.05 }, material: { color: "oklch(0.7 0.14 40)" } }] });
}

export function person(ctx, id) {
  const patron = PATRONS.find((p) => p.id === id);
  if (patron) {
    const x = patron.at[0], z = patron.at[1];
    ctx.spawn(id, {
      tags: ["npc", "patron", "usable"],
      feetPosition: { x, y: 0.05, z },
      rotation: { yaw: patron.face },
      physics: "character",
      ...critterSpec(npcLook(id, patron.look, "survivor", 8)),
      behavior: ["scripts/humanoid-locomotion.js", "scripts/l61-staff.js"],
      state: {
        name: patron.name,
        role: "survivor",
        job: "post",
        faceYaw: patron.face,
        acts: patron.acts,
        info: "A weary survivor resting in the comfort of The Snackrooms diner.",
        verb: "Greet",
        home: { x, z },
        ...npcState(ctx, "survivor", 100),
      },
    });
    return;
  }

  const g = HUMANS[id]; if (!g) return;
  const x = g.at[0], z = g.at[1];
  ctx.spawn(id, { tags: ["npc", "l61-npc"], feetPosition: { x, y: 0.05, z }, rotation: { yaw: g.face }, physics: "character", ...critterSpec(npcLook(id, g.look, g.faction, 8)), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: g.name, role: g.faction === "guard" ? "guard" : "survivor", voice: g.voice, faction: g.faction === "guard" ? "meg" : g.faction === "pilgrim" ? "guild" : "amber", factionName: g.faction === "guard" ? "the M.E.G.'s Level 6 Access Outpost" : g.faction === "pilgrim" ? "the Guild of Many" : "Camp Amber", rounds: [{ x, y: 0.05, z, dwell: 40, act: null, look: { x: x + Math.sin((g.face * Math.PI) / 180) * -3, z: z + Math.cos((g.face * Math.PI) / 180) * -3 } }], ri: 0, nerve: "steady", home: { x, z }, ...npcState(ctx, "agent", g.faction === "guard" ? 110 : 70) } });
  ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
  if (g.sign) ctx.spawn(`${id}-sign`, { feetPosition: { x: x + 0.9, y: 0, z }, rotation: { yaw: 90 }, physics: "static", primitive: { kind: "cylinder", radiusTop: 0.025, radiusBottom: 0.025, height: 1.6 }, material: { color: "oklch(0.4 0.06 55)" },
    children: [{ feetPosition: { x: 0, y: 1.45, z: 0 }, primitive: { kind: "box", width: 1.1, height: 0.55, depth: 0.03 }, material: { color: "oklch(0.92 0.03 90)" }, ui: `<div face="front" width="1.1m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:900;color:#c01020;text-align:center;font-size:56px;line-height:1">${g.sign}</div>` }] });
}
