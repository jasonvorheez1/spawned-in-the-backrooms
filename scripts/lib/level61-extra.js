// Level 6.1 storefront fixtures, groups, and thresholds.
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { npcState } from "./stats.js";
import { weaponBody } from "./weapon-look.js";
import CIGS from "./data/cigs.yml";
const PACKS = Object.values(CIGS).filter((c) => c.kind === "pack").map((c) => c.model);
const A = "scripts/ambient-anim.js";
const INK = { color: "#060606", roughness: 1, metalness: 0 };
const faceless = (spec) => { const h = spec.children?.[0]; if (h?.model) { if (typeof h.model === "string") h.model = { id: h.model }; h.model.materials = { fur: INK, ...h.model.materials, pupil: INK, eyewhite: INK, eyeink: INK, mouth: INK, blush: INK, tongue: INK, nose: INK, tip: INK, mark: INK }; h.morph = undefined; } return spec; };
const yawOf = (dx, dz) => (Math.atan2(-dx, -dz) * 180) / Math.PI;

const SMOKE = `fx
pop smoke rate=7 on=disc(.35) life=1.4..2.4 v=up(.5)+sdir()*.12 size=.2..0.4 acc=curl(.6)*.2+drag(.8) col=<.82,.8,.76> a=0>.3:.3>.3:.7>0 sz=$size*(.6>2) r=sprite(smoke-puff,alpha)`;
const FLAME = `fx
pop flame rate=16 on=disc(.25) life=.3..0.55 v=up(.7) size=.08..0.16 sz=$size*(1>.2) col=hdr(2,1,.2)>hdr(.6,.2,.05) a=0>.2:1>.7:.7>0 r=sprite(flame-wisp,add)
pop glow n=1 r=light(<1,.5,.15>,fire()*5,6)`;
export function layExtra(ctx, { HW, HD, HH }) {
  const sp = (id, spec) => ctx.spawn(id, spec);
  const bx = (id, x, y, z, w, h, d, material, extra = {}) => sp(id, { feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material, ...extra });
  const PLASTER = { color: "#ddd4bd", roughness: 0.85 };
  const TRIM = { color: "#9a9689", roughness: 0.57, metalness: 0.22 };
  for (const [i, [x, z]] of [[-20, -7], [20, -7], [-20, 7], [20, 7]].entries()) {
    sp(`l61-col-${i}`, {
      feetPosition: { x, y: 0, z }, physics: { body: "static", collider: "cylinder" },
      primitive: { kind: "cylinder", radiusTop: 0.32, radiusBottom: 0.32, height: HH, radialSegments: 24 },
      material: PLASTER, children: [
        { feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.365, radiusBottom: 0.37, height: 0.14 }, material: TRIM },
        { feetPosition: { x: 0, y: HH - 0.16, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.42, radiusBottom: 0.32, height: 0.16 }, material: TRIM },
      ],
    });
  }
  sp("l61-grill-smoke", { feetPosition: { x: 21, y: 1.05, z: -31.3 }, fx: { script: SMOKE } });
  sp("l61-oven-fire", { feetPosition: { x: 9.5, y: 0.7, z: -31.0 }, fx: { script: FLAME } });

  // ---- Level 11: the sliding glass doors (the safe way out) in the east wall, opening to Level 11 The Infinite City
  const dz = -9;
  const solid = { physics: "static", castShadow: false };
  bx("l61-l11-floor", HW + 3, -0.29, dz, 6, 0.3, 6, { color: "#c0b8a7", roughness: 0.63 }, solid);
  bx("l61-l11-roof", HW + 3, 3.4, dz, 6, 0.3, 6, PLASTER, solid);
  for (const side of [-1, 1]) {
    bx("l61-l11-back-" + side, HW + 6, 0, dz + side * 1.8, 0.3, 3.4, 2.4, PLASTER, solid);
    bx("l61-l11-side-" + side, HW + 3, 0, dz + side * 3, 6, 3.4, 0.3, PLASTER, solid);
  }
  bx("l61-l11-back-top", HW + 6, 2.8, dz, 0.3, 0.6, 1.2, PLASTER, solid);
  const glass = { color: "oklch(0.8 0.05 220)", opacity: 0.32, transparent: true, roughness: 0.05, metalness: 0.2 };
  for (const s of [-1, 1]) sp(`l61-l11-panel-${s}`, { feetPosition: { x: HW, y: 0, z: dz + s * 0.5 }, behavior: "scripts/l61-door.js", physics: { body: "kinematic", collider: "box" }, state: { slide: s * 1.0, axis: "z", home: { x: HW, z: dz + s * 0.5 }, sense: { x: HW + 0.45, z: dz } },
    primitive: { kind: "box", width: 0.06, height: 2.6, depth: 1.0 }, material: glass, children: [{ feetPosition: { x: 0, y: 1.3, z: 0 }, primitive: { kind: "box", width: 0.08, height: 0.06, depth: 1.02 }, material: { color: "oklch(0.7 0.01 250)", metalness: 0.8 } }] });
  bx("l61-l11-head", HW, 2.6, dz, 0.3, 0.8, 2.6, { color: "oklch(0.3 0.01 250)", metalness: 0.5 });
  sp("l61-l11-sign", { feetPosition: { x: HW - 0.2, y: 3.15, z: dz }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 2.4, height: 0.5, depth: 0.05 }, material: { color: "oklch(0.2 0.03 160)" },
    ui: `<div face="front" width="2.4m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:900;color:#e8ffe8;text-align:center"><div style="font-size:90px">RESTAURANT · LEVEL 11</div><div style="font-size:34px;color:#9fe8b0">the safe way out · automatic doors</div></div>` });
  sp("l61-l11-open", { feetPosition: { x: HW + 5.85, y: 2.7, z: dz }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 2.4, height: 0.5, depth: 0.04 }, material: { color: "oklch(0.2 0.05 150)" },
    ui: `<div face="front" width="2.4m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;color:#a8ffc8;text-align:center"><div style="font-size:60px;font-weight:900">LEVEL 11 · INFINITE CITY</div><div style="font-size:28px;color:#ffffff">SUNLIT PROMENADE · WALK THROUGH</div></div>` });
  // Level transition trigger to Level 11
  sp("l61-to-l11", {
    tags: ["door"],
    feetPosition: { x: HW + 5.9, y: 0, z: dz },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 0.4, height: 2.8, depth: 1.6 },
    visible: false,
    physics: { body: "static", trigger: true },
    behavior: "scripts/level-door.js",
    state: { to: "level11#l11-from-l61" },
  });
  // Arrival marker when returning from Level 11
  sp("l61-from-l11", {
    feetPosition: { x: HW + 4.8, y: 0.05, z: dz },
    rotation: { yaw: 90 },
  });
  sp("l61-l11-light", { feetPosition: { x: HW + 3, y: 3, z: dz }, light: { kind: "point", color: "oklch(0.97 0.03 90)", intensity: 5, distance: 10 } });

  // ---- the bent wall: a stretch of the east wall that buckles away from the room, with the cold blue of the Blue Channel behind its cracks
  const bz = -17.5;
  [[0, 3.8], [1, 8], [2, 12]].forEach(([i, a]) => bx(`l61-bent-${i}`, HW - 0.5 - i * 0.12, 0, bz + i * 1.2, 0.3, HH - 0.2 - i * 0.1, 1.25, { ...PLASTER, color: "oklch(0.88 0.03 220)" }, { rotation: { yaw: -a * (i + 1), roll: i * 2 }, physics: "static" }));
  sp("l61-bent-glow", { feetPosition: { x: HW - 0.2, y: 1.8, z: bz + 1.3 }, behavior: A, state: { anim: { kind: "pulse", amp: 1.35, sec: 2.2 } }, primitive: { kind: "box", width: 0.06, height: 3.4, depth: 0.5 }, material: { color: "oklch(0.8 0.14 225)", emissive: "oklch(0.8 0.16 225)", emissiveIntensity: 1.2 },
    children: [{ feetPosition: { x: -1.2, y: 0, z: 0 }, light: { kind: "point", color: "oklch(0.75 0.14 225)", intensity: 1.45, distance: 5.5 } }] });

  // Environmental cues on bent wall: cold vapor seep, sparking wall sconce, and void draft hum (show, don't tell)
  sp("l61-bent-mist", {
    feetPosition: { x: HW - 0.4, y: 1.2, z: bz + 1.3 },
    fx: { script: `fx\npop mist rate=5 on=box(.2,1.8,.4) life=1.5..2.5 v=<%dir|-1,0,0>*(.15..0.35)+up(.1) size=.15..0.35 col=<.35,.75,1> a=0>.3:.25>.3:.6>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)` },
    audio: { clip: "cdn/sfx-wind-draft-cold-abyss-loop.mp3", loop: true, gain: 0.12, spatial: true, maxDistance: 12 },
  });
  sp("l61-bent-sconce", {
    feetPosition: { x: HW - 0.4, y: 2.6, z: bz - 0.8 },
    rotation: { roll: 22, yaw: -85 },
    primitive: { kind: "box", width: 0.14, height: 0.28, depth: 0.18 },
    material: { color: "oklch(0.3 0.01 250)", metalness: 0.7 },
    fx: { script: `fx\npop spark rate=2 on=disc(.08) life=.15..0.35 v=sdir()*.6 size=.01..0.02 col=hdr(.4,1.8,3) a=1>0 r=sprite(soft-disc,add)` },
    children: [
      { feetPosition: { x: -0.12, y: 0, z: 0 }, light: { kind: "point", color: "oklch(0.72 0.2 230)", intensity: 2.4, distance: 7 } },
    ],
  });
  sp("l61-bent-trigger", { feetPosition: { x: HW - 1.0, y: 0, z: bz + 1.4 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 1.4, height: 3, depth: 3 }, visible: false, behavior: "scripts/l61-bent.js" });

  // ---- Camp Amber's outpost by the steel door: a canopy, a table, a pot, a sign
  const AMB = { tent: "/cdn/value.79763a3b24e6a50bd727fcb9440f40e85f5dcc874ec498f22299b122ae6d2f7f.glb", kitchen: "/cdn/value.a913b60b5860de57e7072069c2b3384708d80abc5c3df3ac13c9341b06c3e2fe.glb", chair: "/cdn/value.dff365a352c2ff6fff83265ff883004e863a291bbb23c1e952adebe1bd96caaa.glb", bed: "/cdn/value.635524f2594f1ed2764d403655620f2d338b78b42bf046d268d365abe5a6ffc9.glb", lamp: "/cdn/value.4c87f2d28b86fe9703caf37d92b67726f5d8598e312f590bcfb50bfc5ac15971.glb", sign: "/cdn/value.8d91b7a86ee85043865bb9edbc59b58442aff8d9fe34a8569ca9e3a8538c8cd7.glb" };
  const AK = 1.6; // critters stand ~1.6-2 m with big heads: camp gear is sized to them, not to a human
  const amb = (id, key, x, z, yaw, box, extra = {}) => sp(id, { feetPosition: { x, y: 0, z }, rotation: { yaw }, model: { id: AMB[key], forward: "+z" }, layout: { box: { min: { x: box.min.x * AK, y: 0, z: box.min.z * AK }, max: { x: box.max.x * AK, y: box.max.y * AK, z: box.max.z * AK } } }, physics: "static", ...extra });
  amb("l61-amber-tent", "tent", -26.6, 12, 90, { min: { x: -1.6, y: 0, z: -1.6 }, max: { x: 1.6, y: 1.7, z: 1.6 } });
  amb("l61-amber-pot", "kitchen", -23.4, 13.4, -90, { min: { x: -0.8, y: 0, z: -0.4 }, max: { x: 0.8, y: 1.3, z: 0.4 } }, { fx: { script: SMOKE }, tags: ["usable"], behavior: "scripts/l61-use.js", state: { kind: "stew", name: "Camp stew pot", verb: "Buy stew" } });
  amb("l61-amber-chair-0", "chair", -24.0, 8.9, 32, { min: { x: -0.32, y: 0, z: -0.25 }, max: { x: 0.32, y: 0.9, z: 0.25 } });
  sp("l61-amber-chair-0-seat", { feetPosition: { x: -24.0, y: 0, z: 8.9 }, rotation: { yaw: -148 }, tags: ["seat"], state: { seat: { w: 1, d: 0.02, y: 0.36 }, verb: "Sit", name: "Camp chair" } }); // the sit spot: its -Z looks at the fire (the chair model's front is its +Z)
  amb("l61-amber-chair-1", "chair", -22.5, 8.8, -27, { min: { x: -0.32, y: 0, z: -0.25 }, max: { x: 0.32, y: 0.9, z: 0.25 } });
  sp("l61-amber-chair-1-seat", { feetPosition: { x: -22.5, y: 0, z: 8.8 }, rotation: { yaw: 153 }, tags: ["seat"], state: { seat: { w: 1, d: 0.02, y: 0.36 }, verb: "Sit", name: "Camp chair" } });
  amb("l61-amber-bed-0", "bed", -25.8, 16.2, 4, { min: { x: -0.4, y: 0, z: -1 }, max: { x: 0.4, y: 0.25, z: 1 } }, { physics: undefined, tags: ["usable"], behavior: "scripts/l61-use.js", state: { kind: "bedroll", name: "Bedroll", verb: "Rest" } });
  amb("l61-amber-bed-1", "bed", -28.9, 16.3, -8, { min: { x: -0.4, y: 0, z: -1 }, max: { x: 0.4, y: 0.25, z: 1 } }, { physics: undefined, tags: ["usable"], behavior: "scripts/l61-use.js", state: { kind: "bedroll", name: "Bedroll", verb: "Rest" } });
  amb("l61-amber-lamp-0", "lamp", -24.9, 13.6, 0, { min: { x: -0.1, y: 0, z: -0.1 }, max: { x: 0.1, y: 0.32, z: 0.1 } }, { physics: undefined, children: [{ feetPosition: { x: 0, y: 0.2, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.12 70)", intensity: 1.6, distance: 6 } }] });
  amb("l61-amber-lamp-1", "lamp", -25.3, 10.1, 0, { min: { x: -0.1, y: 0, z: -0.1 }, max: { x: 0.1, y: 0.32, z: 0.1 } }, { physics: undefined, children: [{ feetPosition: { x: 0, y: 0.2, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.12 70)", intensity: 1.6, distance: 6 } }] });
  const AMB2 = { fire: "/cdn/value.4a5665988ced9c8d4a2b352e55c37106a4e520e50fd3aca97346dbefb5fe4fab.glb", crate: "/cdn/value.c03d3f17fee5dc6f29ee139111a22bd63c84dc0a4d7de19fdcef4b4c7d20c7ce.glb", line: "/cdn/value.b4be443343cd755687acf8093795207bb423979d9c56560447fd1242d91bbec9.glb", shirt: "/cdn/value.5cbdae8191b40262268884fd2d4f1a60b36b8912a2bba560d0d2dddd7c5ae74e.glb", pants: "/cdn/value.5191fe508cd088297c566705e322bfb48bffbb8c06f359e0acb5e5e7e439f788.glb", towel: "/cdn/value.0c59a430307e2bceee513d5594b6ec3a3aa03a8bc5181d2d37b103a5aee480cf.glb" }; // art/l61-amber/build.py
  sp("l61-amber-fire", { feetPosition: { x: -23.2, y: 0, z: 10.4 }, rotation: { yaw: 20 }, model: { id: AMB2.fire, forward: "+z" }, castShadow: false });
  sp("l61-amber-board", {
    feetPosition: { x: -29.67, y: 1.59, z: 13.5 }, rotation: { yaw: -90 },
    primitive: { kind: "box", width: 1.6, height: 0.86, depth: 0.065 }, material: { color: "#817057", roughness: 0.9 },
    tags: ["usable"], behavior: "scripts/l61-use.js",
    state: { kind: "notice", name: "Camp Amber notice board", verb: "Read", line: "Looking for Bee. Red coat. Last seen coming off the Level 11 bus route. Leave word with Wren." },
    children: [{ feetPosition: { x: 0, y: 0.44, z: -0.038 },
      vector: "<svg viewBox='0 0 160 82' width='1.54m'><rect width='160' height='82' fill='#827458'/><g fill='#eee2bf'><path d='M12 8h63v55H12zM85 24h60v42H85z'/></g><g font-family='sans-serif' fill='#2d3936'><text x='18' y='22' font-size='8' font-weight='bold'>LOOKING FOR BEE</text><text x='19' y='36' font-size='7'>Red coat. L11 bus.</text><text x='19' y='48' font-size='7'>Ask for Wren.</text><text x='92' y='38' font-size='7' font-weight='bold'>SUPPLY RUN</text><text x='92' y='50' font-size='7'>Back after lunch.</text></g></svg>" }],
  });
  [[-21.5, 14.7, 8, 0], [-21.55, 15.45, -6, 0], [-21.5, 15.05, 84, 0.46]].forEach(([x, z, yaw, y], i) => sp(`l61-amber-crate-${i}`, { feetPosition: { x, y, z }, rotation: { yaw }, model: { id: AMB2.crate, forward: "+z" }, physics: "static" }));
  sp("l61-amber-line", { feetPosition: { x: -23.1, y: 0, z: 17.3 }, model: { id: AMB2.line, forward: "+z" }, physics: { body: "static", collider: "mesh" } });
  [["shirt", -24.0, 0.62, 0], ["towel", -23.25, 0.6, 0.35], ["pants", -22.5, 0.75, 0.7], ["shirt", -21.95, 0.62, 0.15]].forEach(([g, x, h, ph], i) => sp(`l61-amber-wash-${i}`, { feetPosition: { x, y: 1.86 - 0.12 * Math.sin(((x + 24.6) / 3) * Math.PI) - h, z: 17.3 + (i % 2 ? 0.16 : -0.16) }, pivot: "top", model: { id: AMB2[g], forward: "+z" }, behavior: "scripts/ambient-anim.js", state: { anim: { kind: "sway", deg: 4, sec: 2.6 + i * 0.3, axis: "pitch", phase: ph } }, ...(i === 3 ? { model: { id: AMB2.shirt, forward: "+z", materials: { cloth_shirt: { color: "#5a8a5a" } } } } : {}) }));
  amb("l61-amber-signpost", "sign", -22.4, 11, 90, { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 1.7, z: 1 } }, { physics: undefined });
  sp("l61-amber-sign", { feetPosition: { x: -22.36, y: 1.9, z: 11 }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 1.9, height: 0.85, depth: 0.01 }, material: { color: "oklch(0.32 0.04 55)", roughness: 0.9 },
    ui: `<div face="front" width="1.9m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;color:#f2d79a;text-align:center"><div style="font-size:120px;letter-spacing:6px">CAMP AMBER</div><div style="font-size:40px;color:#e8c890">new here? sit down, eat</div></div>` });

  // ---- a real restaurant's furniture: menu boards you flip through, a register, the "now serving" board, a tray return, condiments and a half-eaten tray on the tables, a wet-floor sign
  const MENU_AT = { clip: [-24.4, 0.85, -30.2, 180], liq: [-12.2, 0.855, -24.3, -90], slice: [4.6, 1.48, -29.4, 180], burger: [17.6, 1.05, -28.4, 180], gib: [3.7, 1.05, 28.4, 0] }; // each stands on its counter top (raycast tops: clip 1.05, liq 1.1, slice 1.48, burger 1.05)
  const STORE_X = { clip: -21, liq: -7, slice: 7, burger: 21, gib: -9 }, STORE_S = { gib: 1 }, MENUS = {
    clip: [["Budweiser", "3.00"], ["Jack and Coke", "4.50"], ["Smirnoff Ice", "3.75"], ["Coca-Cola float", "2.25"], ["Chips and a Coke", "2.75"]],
    liq: [["Almond water", "3.00"], ["Corona with lime", "4.00"], ["Cuervo margarita", "5.50"], ["Miller Lite", "3.00"], ["Jim Beam, neat", "5.00"], ["Bar snacks", "2.50"]],
    slice: [["Pepperoni slice", "3.25"], ["2 cheese + Coke", "6.25"], ["Supreme slice", "5.00"]],
    burger: [["Cheeseburger", "4.50"], ["Bop meal", "7.95"], ["Fries + Coke", "3.25"]],
    gib: [["Chili dog", "2.95"], ["Blue plate", "6.50"], ["Coffee", "0.85"], ["Dog + Coke", "3.75"]],
  };
  const NAMES = { clip: "Clippers", liq: "Liquorette", slice: "Slice Palace", burger: "Burger Bop", gib: "Gib's Grub" };
  for (const key of Object.keys(MENUS)) {
    const [mx, my, mz, myaw] = MENU_AT[key], cx = STORE_X[key];
    sp(`l61-menu-${key}`, { tags: ["usable"], feetPosition: { x: mx, y: my, z: mz }, rotation: { yaw: myaw, pitch: -12 }, behavior: "scripts/l61-use.js", primitive: { kind: "box", width: 0.5, height: 0.66, depth: 0.04 }, material: { color: "oklch(0.2 0.02 250)", roughness: 0.6 },
      state: { kind: "menu", key, name: `${NAMES[key]} menu`, verb: "Flip the menu", info: "Press to see the next item. Everything is crossed out and free.", tint: "#ffd84a" },
      ui: `<div face="front" width="0.5m" style="width:100%;height:100%;box-sizing:border-box;padding:14px 12px;background:#161a1e;color:#f4f1ea;font-family:Georgia,serif;text-align:center"><div style="font-size:30px;letter-spacing:3px;color:#ffd84a;border-bottom:2px solid #ffd84a;padding-bottom:4px">${NAMES[key]}</div>${MENUS[key].map(([n, p]) => `<div style="font-size:21px;margin-top:10px;display:flex;justify-content:space-between"><span>${n}</span><span><s style="color:#aaa">$${p}</s> <b style="color:#7affb0">FREE</b></span></div>`).join("")}<div style="font-size:15px;margin-top:14px;color:#9fb8c8">please take a number</div></div>` });
    // the till: a little register with a bell
    const [px, py, pz] = { clip: [-17.6, 0.85, -30.3], liq: [-12.2, 0.855, -29.6], slice: [9.4, 1.48, -29.5], burger: [18.6, 1.05, -28.6], gib: [2.7, 1.05, 28.6] }[key];
    const sg = STORE_S[key] ?? -1; // which wall the store opens through: north -1, south +1
    sp(`l61-reg-${key}`, { feetPosition: { x: px, y: py, z: pz }, rotation: { yaw: myaw }, model: { id: "/cdn/value.cc7ad41c978aa40ce95e650f2953b59f00f4f4abc70462c632cca85420472d75.glb", forward: "-z" }, layout: { box: { min: { x: -0.22, y: 0, z: -0.16 }, max: { x: 0.22, y: 0.35, z: 0.16 } } } }); // Tripo till, Studio-cleaned (art/gib/build.py)
    // the "now serving" board high on the store front (the counter's tickets count up on it) and the tray return beside the store
    sp(`l61-serve-${key}`, { feetPosition: { x: cx + 3.4, y: 2.7, z: sg * (HD - 0.22) }, rotation: { yaw: sg < 0 ? 180 : 0 }, primitive: { kind: "box", width: 1.8, height: 1.0, depth: 0.06 }, material: { color: "oklch(0.1 0.01 250)" },
      ui: `<div face="front" width="1.8m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Courier New',monospace;background:#101418;color:#7affb0;text-align:center"><div style="font-size:54px;color:#ffd84a">NOW SERVING</div><div style="font-size:150px;font-weight:700;letter-spacing:6px;text-shadow:0 0 18px #3f9">040</div><div style="font-size:34px;color:#9fb8c8">${NAMES[key]}</div></div>` });
    sp(`l61-ret-${key}`, { tags: ["usable"], feetPosition: { x: cx + 5.6, y: 0, z: sg * (HD - 1.4) }, physics: { body: "static", collider: "box" }, behavior: "scripts/l61-use.js", primitive: { kind: "box", width: 0.7, height: 1.1, depth: 0.55 }, material: { color: "oklch(0.7 0.02 250)", metalness: 0.7, roughness: 0.4 },
      state: { kind: "return", name: "Tray return", verb: "Return your tray", info: "A rack for trays. Please be considerate.", tint: "#9fe8ff" },
      children: [{ feetPosition: { x: 0, y: 1.1, z: 0 }, primitive: { kind: "box", width: 0.7, height: 0.4, depth: 0.04 }, material: { color: "oklch(0.35 0.09 230)" }, ui: `<div face="front" width="0.7m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font:900 70px Arial,sans-serif;color:#fff">TRAYS</div>` }] });
  }
  // the dining room: ketchup, mustard and a napkin box on the tables, a tray with a plate and a cup on about half, steam off the hot ones
  // one setting per real food-court table (the same spots tableSet stands them in sim.js), on the 0.75 m top
  let ti = 0;
  const TABLES = [
    [-16.5, -13.5], [-12.0, -8.5], [-16.5, -5.0], [-16.5, 5.0], [-12.0, 8.5], [-16.5, 13.5],
    [16.5, -13.5], [12.0, -8.5], [16.5, -5.0], [16.5, 5.0], [12.0, 8.5], [16.5, 13.5],
    [-7.5, -14.0], [7.5, -14.0],
    [-6.6, -25.2], [-2.6, -25.2], [-6.6, -29.2], [-2.6, -29.2], [3, -25.5], [7, -25.5]
  ];
  for (const [x, z] of TABLES) {
    const tx = x, tz = z, r = Math.abs((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1), hot = r < 0.18;
    sp(`l61-set-${ti++}`, { feetPosition: { x: tx, y: (x < 0 && z < -22) ? 0.622 : 0.752, z: tz }, ...(hot ? { fx: { script: SMOKE } } : {}), primitive: { kind: "sphere", radius: 0.001 }, material: { color: "oklch(0.5 0 0)" },
      children: (x < 0 && z < -22) ? [ // Liquorette is a tavern: a half-drunk pint, a whiskey tumbler, a glass ashtray, a beer mat
        { feetPosition: { x: 0.18, y: 0, z: 0.08 }, primitive: { kind: "cylinder", radiusTop: 0.045, radiusBottom: 0.036, height: 0.15 }, material: { color: "oklch(0.85 0.02 90 / 0.35)", transparent: true, opacity: 0.35, roughness: 0.05 } },
        { feetPosition: { x: 0.18, y: 0.004, z: 0.08 }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.033, height: 0.09 }, material: { color: "oklch(0.68 0.15 70)", roughness: 0.2 } },
        { feetPosition: { x: 0.18, y: -0.003, z: 0.08 }, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.06, height: 0.004 }, material: { color: "oklch(0.45 0.13 28)", roughness: 0.9 } },
        { feetPosition: { x: -0.2, y: 0, z: -0.12 }, primitive: { kind: "cylinder", radiusTop: 0.038, radiusBottom: 0.034, height: 0.08 }, material: { color: "oklch(0.88 0.02 90 / 0.4)", transparent: true, opacity: 0.4, roughness: 0.05 } },
        { feetPosition: { x: -0.2, y: 0.004, z: -0.12 }, primitive: { kind: "cylinder", radiusTop: 0.032, radiusBottom: 0.03, height: 0.025 }, material: { color: "oklch(0.55 0.13 55)", roughness: 0.15 } },
        { feetPosition: { x: 0.02, y: 0, z: 0.2 }, primitive: { kind: "cylinder", radiusTop: 0.065, radiusBottom: 0.055, height: 0.03 }, material: { color: "oklch(0.75 0.03 200 / 0.6)", transparent: true, opacity: 0.6, roughness: 0.1 } },
        { feetPosition: { x: -0.08, y: 0.001, z: 0.24 }, rotation: { yaw: r * 300, pitch: -90 }, pivot: "center", castShadow: false, visibleRange: { max: 25 }, model: { id: PACKS[ti % PACKS.length], forward: "+z" } }, // a pack lying by the ashtray (the creator's cigarette mod)
      ] : [
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
  for (const [k, [x, z]] of [[9.3, 26.5], [-12.3, 32]].entries()) sp(`l61-wet-${k}`, { feetPosition: { x, y: 0, z }, rotation: { yaw: 30 + k * 40 }, primitive: { kind: "box", width: 0.34, height: 0.62, depth: 0.04 }, material: { color: "oklch(0.88 0.17 95)", roughness: 0.6 },
    ui: `<div face="front" width="0.34m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:900;color:#c0201a;text-align:center"><div style="font-size:34px">CAUTION</div><div style="font-size:26px;color:#222">WET FLOOR</div></div>` });
  [[-14, -8], [14, -7]].forEach(([x, z], k) => sp(`l61-murmur-${k}`, { feetPosition: { x, y: 1.5, z }, audio: { clip: "cdn/sfx-busy-restaurant-ambience-dishes-clinking-distant-chatter-loop.mp3", loop: true, gain: 0.065, spatial: true, maxDistance: 13 } }));
}

// ---- the people: Facelings, the staff, the guards and the pickets
const FACELINGS = [
  { id: "l61-fc-clip", greet: "Welcome to Clippers!", at: [-21, -31.4], face: 180, acts: ["wipe", "serve", "groove", "drink"] },
  { id: "l61-fc-liq", greet: "Evening. Almond water?", at: [-12.75, -27], face: -90, acts: ["wipe", "serve", "drink", "groove"] },
  { id: "l61-fc-slice", greet: "Slice Palace! Hot ones just out.", at: [7, -30.9], face: 180, acts: ["serve", "eat", "nod", "wipe"], gives: "pizza,pizza,coke" },
  { id: "l61-fc-burger", greet: "Welcome to Burger Bop!", at: [21, -30.1], face: 180, acts: ["grill", "serve", "wipe", "groove"], gives: "burger,burger,coke" },
  { id: "l61-fc-gib", greet: "Gib's. Sit anywhere, hon.", at: [0.3, 30.1], face: 0, acts: ["grill", "serve", "wipe", "nod"], gives: "chilidog,diner_coffee" },
  { id: "l61-fc-a", hasTray: true, route: [[-21, -12, 3, "wipe"], [-15.2, -14.6, 3, "tray"], [-15, -18, 2.5, "groove"], [-21, -18, 3, "wipe"]] },
  { id: "l61-fc-b", hasTray: true, route: [[21, -12, 3, "wipe"], [15.2, -14.6, 3, "tray"], [15, -18, 2.5, "groove"], [21, -18, 3, "wipe"]] },
  { id: "l61-fc-c", route: [[-21, 12, 3, "wipe"], [-15.2, 14.6, 2.5, "groove"], [-15, 18, 3, "nod"], [-21, 18, 3, "wipe"]] },
  { id: "l61-fc-d", route: [[21, 12, 3, "wipe"], [15.2, 14.6, 2.5, "groove"], [15, 18, 3, "nod"], [21, 18, 3, "wipe"]] },
  { id: "l61-fc-e", route: [[-20.1, -3.8, 3, "wipe"], [-20.1, 3.2, 3, "wipe"], [-13.8, 3.2, 2.5, "serve"], [-13.8, -3.8, 2.5, "nod"]] },
  { id: "l61-fc-f", route: [[25.8, -4.8, 3, "wipe"], [25.8, 4.8, 3, "groove"], [21, 6, 2.5, "serve"], [21, -6, 2.5, "nod"]] },
  { id: "l61-fc-g", hasTray: true, route: [[-14, 19, 4, "tray"], [-14, 29, 4, "nod"], [-11, 33, 3, "wipe"], [-11, 38, 4, "nod"], [-11, 33, 2, "tray"], [-14, 29, 2, "nod"]] },
];
const PATRONS = [
  { id: "l61-patron-w", name: "Diner Regular", at: [-22.3, -4], face: 90, acts: ["lounge", "drink", "groove"], look: { species: "cat", sex: "f", topw: "sweater", top: "#904050", botw: "pants", bottom: "#202028", shoes: "sneakers" } },
  { id: "l61-patron-e", name: "Wandering Survivor", at: [22.3, 0], face: -90, acts: ["eat", "relief", "groove"], look: { species: "fox", sex: "m", topw: "jacket", top: "#305040", botw: "cargo", bottom: "#282820", shoes: "boots" } },
  { id: "l61-patron-bar", name: "Clippers Patron", at: [-23.4, -28.78], face: 0, acts: ["drink", "groove", "nod"], look: { species: "dog", sex: "m", topw: "tee", top: "#d09030", botw: "pants", bottom: "#182030", shoes: "sneakers" } },
];
const HUMANS = {
  "l61-guard-a": { name: "M.E.G. Guard · Level 6 door", voice: "reyes", faction: "guard", look: { species: "human", sex: "m", topw: "megjacket", top: "#4a5a3a", botw: "cargo", bottom: "#3a3a30", shoes: "boots" }, gun: "carbine", at: [-27.6, -2.4], face: -90 },
  "l61-guard-b": { name: "M.E.G. Guard · Level 6 door", voice: "mags", faction: "guard", look: { species: "human", sex: "f", topw: "megjacket", top: "#4a5a3a", botw: "cargo", bottom: "#3a3a30", shoes: "boots" }, gun: "carbine", at: [-27.6, 2.4], face: -90 },
  "l61-amber-a": { name: "Camp Amber volunteer", voice: "wren", faction: "trader", look: { species: "human", sex: "f", topw: "sweater", top: "#d89a3a", botw: "pants", bottom: "#4a3a2a", shoes: "boots" }, gun: "knife", at: [-23.6, 15.8], face: 0 },
  "l61-amber-b": { name: "Camp Amber volunteer", voice: "penny", faction: "trader", look: { species: "human", sex: "m", topw: "hoodie", top: "#c87a2a", botw: "pants", bottom: "#4a3a2a", shoes: "sneakers" }, gun: "crowbar", at: [-21.9, 12.6], face: 90 },
  "l61-guild-a": { name: "Guild of Many member", voice: "hollis", faction: "pilgrim", look: { species: "human", sex: "f", topw: "hoodie", top: "#5a5a6a", botw: "longskirt", bottom: "#3a3a4a", shoes: "boots" }, gun: "bat", at: [-12, -2], face: 90, bedroll: true },
  "l61-guild-b": { name: "Guild of Many member", voice: "mags", faction: "pilgrim", look: { species: "human", sex: "m", topw: "jacket", top: "#5a5a6a", botw: "pants", bottom: "#3a3a4a", shoes: "boots" }, gun: "bat", at: [-12, 1], face: 90, lantern: true },
  "l61-guild-c": { name: "Guild of Many member", voice: "wren", faction: "pilgrim", look: { species: "human", sex: "f", topw: "sweater", top: "#5a5a6a", botw: "pants", bottom: "#3a3a4a", shoes: "boots" }, gun: "bat", at: [-12, 4], face: 90, canteen: true },
};
export const PEOPLE = [...Object.keys(HUMANS), ...PATRONS.map((p) => p.id)];
export const FACELING_IDS = FACELINGS.map((f) => f.id);

export function faceling(ctx, id) {
  const f = FACELINGS.find((q) => q.id === id); if (!f) return;
  const i = FACELINGS.indexOf(f), at = f.at ? { x: f.at[0], z: f.at[1] } : { x: f.route[0][0], z: f.route[0][1] };
  const look = npcLook("l61fc" + i, { species: "faceling", sex: i % 2 ? "f" : "m", topw: "apron", top: "#f4f1ea", botw: "pants", bottom: "#2a2a30", shoes: "sneakers", hat: "beanie", hatc: "#f4f1ea" }, "trader", 6);
  ctx.spawn(id, { tags: ["l61npc", "usable", "faceling", "l61fc"], feetPosition: { x: at.x, y: 0.05, z: at.z }, rotation: { yaw: f.face ?? 0 }, physics: "character", ...critterSpec(look),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/l61-staff.js"],
    state: { name: "Faceling", verb: "Take a plate", info: "Food court staff.", tint: "#f4f1ea", kind: "faceling", job: f.route ? "route" : "post", faceYaw: f.face, greet: f.greet, acts: f.acts, gives: f.gives, route: f.route?.map(([x, z, dwell, act]) => ({ x, z, dwell, act })), pace: 1.15 + (i % 3) * 0.15, hasTray: f.hasTray, hp: 60, met: {}, nick: {}, temper: {}, mood: null, hostile: null } });
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
        info: "Food court patron.",
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

  // Physical pilgrim gear on the floor instead of text slogan signs (show, don't tell)
  if (g.bedroll) {
    ctx.spawn(`${id}-gear`, { feetPosition: { x: x + 0.6, y: 0, z: z - 0.3 }, rotation: { yaw: 25 }, primitive: { kind: "cylinder", radiusTop: 0.16, radiusBottom: 0.16, height: 0.65 }, material: { color: "oklch(0.35 0.05 130)", roughness: 0.9 } });
  }
  if (g.lantern) {
    ctx.spawn(`${id}-gear`, { feetPosition: { x: x + 0.5, y: 0, z: z + 0.2 }, primitive: { kind: "cylinder", radiusTop: 0.08, radiusBottom: 0.1, height: 0.32 }, material: { color: "oklch(0.3 0.01 250)", metalness: 0.8 }, children: [{ feetPosition: { x: 0, y: 0.12, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.16 75)", intensity: 1.4, distance: 5 } }] });
  }
  if (g.canteen) {
    ctx.spawn(`${id}-gear`, { feetPosition: { x: x + 0.5, y: 0, z: z - 0.2 }, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.07, height: 0.22 }, material: { color: "oklch(0.45 0.08 60)", roughness: 0.6 } });
  }
}
