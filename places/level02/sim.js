// Level 0.2 "Remodeled Mess" (lore: scripts/lib/data/lore/level-0-2.md): the Remodeling Co.'s clean copy of Level 0.
// Dry red carpet, freshly painted white walls with a red chair rail, working outlets and Wi-Fi, the occasional bathroom.
// Walk in past the door room and it falls apart, column by column from the far east wall back toward the door, dropping
// everything into the unfinished house below: studs, joists, sheathing, the crew's tools. It stops at the door room.
// A Reality Freshener set down on the clean floor holds the collapse where it is. Empty for 15 s, it is put back as if
// nothing happened. Puzzle: the freight lift (east) is stuck up top with a freshener on it; three paint cans (14 kg) on
// the counterweight pan bring it down. Cap'n stands by the stairs. Props are Tripo meshes (scripts/lib/data/l02-props.yml).
import { animate } from "builtin/tween";
import { bodyModel, seatCat, critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook, refitLook, NL_V } from "../../scripts/lib/clothes.js";
import { npcState } from "../../scripts/lib/stats.js";
import { S, NX, NZ, X0, Z0, BASE, CEIL, xOf } from "../../scripts/lib/level02.js";
import { layGrid, resetGrid, gridTick, joists } from "../../scripts/lib/l02-grid.js";
import G from "../../scripts/lib/data/l02-remodel.yml";
import { FRESH_BODY, setRemodStep } from "../../scripts/lib/remodel-quest.js";
import P from "../../scripts/lib/data/l02-props.yml";
export const cadence = "250ms";
const V = 22, STEP_MS = 3400, WARNING_MS = 1200;
const CASE_COLUMN = 4, CASE_DESK = { x: 2.55, y: 0, z: 7.65 };
const CASE_TOP = "l02-crew-case", CASE_FALL = "l02-crew-salvage";
const CASE_IMPACT = "/cdn/sfx-metal-object-clunk-drop.mp3";
const CREAK = "/cdn/moodboard-realistic-gritty/sfx-deep-structural-wood-creak-groan.mp3";
const OFFICE_LIGHT = { kind: "point", color: "oklch(0.96 0.025 95)", intensity: 1.35, distance: 11 };
const WARN_LIGHT = { ...OFFICE_LIGHT, color: "oklch(0.76 0.16 54)", intensity: 0.95, distance: 8 };
const LANDING_LIGHT = { ...OFFICE_LIGHT, color: "oklch(0.88 0.09 75)", intensity: 0.8, distance: 9 };
const W = NX * S, D = NZ * S; // 32 x 20 m
const CARPET = { color: "oklch(0.4 0.11 25)", roughness: 0.97, texture: "cdn/texture-dry-red-office-carpet-low-pile.png", wrap: "repeat", repeat: [0.5, 0.5] };
const PAINT = { color: "oklch(0.97 0.008 90)", roughness: 0.88, texture: "cdn/texture-freshly-painted-white-drywall-eggshell-roller-stipple.png", wrap: "repeat", repeat: [0.5, 0.5] };
const TRIM = { color: "oklch(0.5 0.12 25)", roughness: 0.45, texture: "cdn/texture-glossy-red-painted-wood-chair-rail-molding-grain.png", wrap: "repeat", repeat: [1, 1] };
const BASEB = { color: "oklch(0.96 0.006 90)", roughness: 0.4, texture: "cdn/texture-white-semi-gloss-painted-mdf-baseboard.png", wrap: "repeat", repeat: [1, 1] };
const PLY = { color: "oklch(0.74 0.07 72)", roughness: 0.9, texture: "cdn/texture-osb-plywood-subfloor-sheet.png", wrap: "repeat", repeat: [0.4, 0.4] };
const SHEATH = { color: "oklch(0.66 0.06 70)", roughness: 0.92, texture: "cdn/texture-osb-plywood-subfloor-sheet.png", wrap: "repeat", repeat: [0.5, 0.5] };
const STUD = { color: "oklch(0.8 0.07 80)", roughness: 0.85, texture: "cdn/texture-planed-pine-2x4-lumber-grain.png", wrap: "repeat", repeat: [1, 1] };
const TILE = { color: "oklch(0.96 0.004 90)", roughness: 0.9, texture: "cdn/texture-acoustic-drop-ceiling-tile-grid.png", wrap: "repeat", repeat: [0.5, 0.5] };
const BATHTILE = { color: "oklch(0.95 0.006 220)", roughness: 0.35, texture: "cdn/texture-small-white-square-bathroom-floor-tiles-grey-grout.png", wrap: "repeat", repeat: [1.5, 1.5] };
const STEEL = { color: "oklch(0.45 0.02 240)", metalness: 0.6, roughness: 0.5 };
const DUST = `fx
pop dust burst=40 on=box(2,0.5,9) life=1.6..3 v=sdir()*(.6..1.6)+up(.3..0.9) size=.5..1.1 acc=buoy(.2)+drag(1.1) col=<.86,.84,.8> a=0>.45:.4>.7:.25>0 sz=$size*(.6>2.2) rot=spin(.2) r=sprite(smoke-puff,alpha)
pop chips burst=30 on=box(2,0.3,9) life=.8..1.4 v=sdir()*(1..2.5)+up(1..2) size=.03..0.07 acc=grav() col=<.92,.9,.86> a=1 sz=$size floor=stick r=sprite(soft-disc,alpha)`;
const HAZE = `fx
pop motes n=?mobile:40|90 on=box(30,3,18) life=6..10 v=sdir()*.05 size=.015..0.03 acc=curl(.2)*.08 col=<1,.92,.75> a=0>.5:.5>.5:.5>0 r=sprite(soft-disc,add)`;
const CRASH = "/cdn/moodboard-realistic-gritty/sfx-drywall-and-ceiling-collapse-crash-rumble.mp3";
const HUM = "/cdn/moodboard-realistic-gritty/ambience-new-office-fluorescent-tube-buzz-and-air-vent-loop.mp3";
const box = (w, h, d) => ({ kind: "box", width: w, height: h, depth: d });
// a Tripo prop from the table fitted to its size [w, h, d]; null while its model hasn't landed (the spawn is skipped)
const prop = (key, at, yaw = 0, extra = {}) => { const p = P[key]; if (!p?.model) return null; const [w, h, d] = p.size;
  return { feetPosition: at, rotation: { yaw }, model: { id: p.model, ...(p.forward ? { forward: p.forward } : {}) }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } }, ...extra }; };
function plate(title, detail, color = "#e4b46b", width = 1.3) {
  return `<svg viewBox="0 0 360 105" width="${width}m"><rect x="2" y="2" width="356" height="101" rx="5" fill="#211b17" stroke="${color}" stroke-width="3"/><path d="M15 60h330" stroke="${color}" opacity=".5"/><g font-family="sans-serif" fill="${color}" text-anchor="middle"><text x="180" y="46" font-size="31" font-weight="bold">${title}</text><text x="180" y="83" font-size="18">${detail}</text></g></svg>`;
}
const H = (key) => P[key]?.size?.[1] ?? 0.8;
function sp(ctx, id, spec) { if (spec && !(id in ctx.place.objects)) ctx.spawn(id, spec); }
const put = (ctx, id, spec) => { if (spec) ctx.spawn(id, spec); };
// The main hall runs through the middle; doors to the rooms open off it.
const STAIRWELL = -7.8;
const PART = {
  1: [[-4.6, 6.4], [6.2, 7.6]], // leave the stair landing open along the north wall
  2: [[-6.1, 7.8], [6.1, 7.8]],
  3: [[-6.0, 8], [6.5, 7]],
  4: [[-3.35, 3.3], [7.4, 5.2]], // bathroom wall closes the rest of the north side
  5: [[-6.1, 7.8], [6.2, 7.6]],
  6: [[-5.8, 8.4], [6.2, 7.6]],
  7: [[-6.1, 7.8], [6.1, 7.8]],
};
// a finished wall: white paint, a red chair rail at 0.9 m and a baseboard both faces; outlets on the long ones
function wallKids(len, along) {
  return [{ feetPosition: { x: 0, y: 0, z: 0 }, primitive: along ? box(len, 0.12, 0.17) : box(0.17, 0.12, len), material: BASEB },
          { feetPosition: { x: 0, y: 0.88, z: 0 }, primitive: along ? box(len, 0.07, 0.19) : box(0.19, 0.07, len), material: TRIM }];
}
function finishedWall(ctx, id, tag, x, z, len, along, outlet) {
  ctx.spawn(id, { tags: [tag], feetPosition: { x, y: 0, z }, primitive: along ? box(len, CEIL, 0.14) : box(0.14, CEIL, len), material: PAINT, physics: "static", children: wallKids(len, along) });
  if (outlet) for (const s of [1, -1]) put(ctx, `${id}-out${s}`, prop("outlet", along ? { x: x + len * 0.25 * s, y: 0.28, z: z + s * 0.08 } : { x: x + s * 0.08, y: 0.28, z: z + len * 0.25 * s }, along ? (s > 0 ? 180 : 0) : (s > 0 ? -90 : 90), { tags: [tag] }));
}
function layShell(ctx) {
  for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("l02-") && !id.includes("/")) ctx.destroy(id);
  const cx = X0 + W / 2, cz = Z0 + D / 2;
  // the unfinished house underneath: plywood subfloor, sheathed outer walls with bare studs
  sp(ctx, "l02-base", { feetPosition: { x: cx, y: BASE - 0.3, z: cz }, primitive: box(W, 0.3, D), material: PLY, physics: "static" });
  sp(ctx, "l02-ceil", { feetPosition: { x: cx, y: CEIL, z: cz }, primitive: box(W, 0.1, D), material: TILE, physics: "static" });
  for (const [id, x, z, w, d] of [["n", cx, Z0 - 0.1, W + 0.4, 0.2], ["s", cx, Z0 + D + 0.1, W + 0.4, 0.2], ["w", X0 - 0.1, cz, 0.2, D], ["e", X0 + W + 0.1, cz, 0.2, D]]) {
    const along = w > d, len = along ? W : D, inward = { n: 1, s: -1, w: 1, e: -1 }[id];
    sp(ctx, `l02-wall-${id}`, { feetPosition: { x, y: 0, z }, primitive: box(w, CEIL, d), material: PAINT, physics: "static",
      children: wallKids(len, along).map((c) => ({ ...c, feetPosition: { ...c.feetPosition, [along ? "z" : "x"]: inward * 0.1 } })) });
    const studs = []; for (let s = 0.3; s < len; s += 0.6) studs.push({ feetPosition: along ? { x: -len / 2 + s, y: 0, z: inward * 0.145 } : { x: inward * 0.145, y: 0, z: -len / 2 + s }, primitive: along ? box(0.04, -BASE, 0.09) : box(0.09, -BASE, 0.04), material: STUD });
    studs.push({ feetPosition: along ? { x: 0, y: -BASE - 0.05, z: inward * 0.145 } : { x: inward * 0.145, y: -BASE - 0.05, z: 0 }, primitive: along ? box(len, 0.05, 0.09) : box(0.09, 0.05, len), material: STUD });
    sp(ctx, `l02-studs-${id}`, { feetPosition: { x, y: BASE, z }, primitive: box(w, -BASE, d), material: SHEATH, physics: "static", children: studs });
  }
  // the door room (column 0): the way home, the company plaque and motto, the Wi-Fi that always works
  sp(ctx, "l02-door-room", { feetPosition: { x: xOf(0), y: -0.22, z: cz }, primitive: box(S, 0.2, D), material: PLY, physics: "static",
    children: [{ feetPosition: { x: 0, y: 0.2, z: 0 }, primitive: box(S, 0.02, D), material: CARPET }] });
  sp(ctx, "l02-door", { feetPosition: { x: X0 + 0.05, y: 0, z: 0 }, rotation: { yaw: 90 }, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { style: "wood", w: 1.0, h: 2.1, part: "set", seed: 5 } } });
  sp(ctx, "l02-back", { tags: ["door"], feetPosition: { x: X0 + 0.38, y: 0, z: 0 }, physics: { body: "static", trigger: true }, primitive: box(0.45, 2.2, 1.2), visible: false, behavior: "scripts/level-door.js", state: { to: "main" } });
  sp(ctx, "l02-from-l0", { feetPosition: { x: X0 + 1.4, y: 0.05, z: 0 }, rotation: { yaw: -90 } });
  sp(ctx, "l02-exit-sign", { feetPosition: { x: X0 + 0.12, y: 2.45, z: 0 }, rotation: { yaw: 90 }, vector: "<svg viewBox='0 0 200 60' width='0.6m'><rect width='200' height='60' rx='6' fill='#a1201a'/><text x='100' y='42' text-anchor='middle' font-family='sans-serif' font-size='36' font-weight='bold' fill='#fff'>EXIT</text></svg>" });
  sp(ctx, "l02-exit-glow", { feetPosition: { x: X0 + 0.4, y: 2.4, z: 0 }, light: { kind: "point", color: "oklch(0.7 0.18 25)", intensity: 0.4, distance: 3 } });
  const reception = { x: -14.05, y: 0, z: 7.45 };
  sp(ctx, "l02-plaque", { feetPosition: { x: reception.x, y: 1.55, z: Z0 + D - 0.03 }, primitive: box(0.76, 0.76, 0.03), material: { texture: P.insignia, roughness: 0.5, metalness: 0.3 } });
  sp(ctx, "l02-motto", { feetPosition: { x: reception.x, y: 1.23, z: Z0 + D - 0.05 }, rotation: { yaw: 180 }, vector: "<svg viewBox='0 0 600 60' width='1.4m'><text x='300' y='40' text-anchor='middle' font-family='serif' font-size='34' font-style='italic' fill='#5a1f1a'>True order comes through furniture.</text></svg>" });
  sp(ctx, "l02-desk0", prop("office_desk", reception, 0, { physics: "static" }));
  sp(ctx, "l02-chair0", prop("wchair", { x: reception.x, y: 0, z: 8.34 }, 0, { physics: "static" }));
  sp(ctx, "l02-plant0", prop("plant", { x: -15.44, y: 0, z: 8.82 }, 35, { physics: "static" }));
  sp(ctx, "l02-router", prop("router", { x: reception.x + 0.39, y: H("office_desk"), z: reception.z + 0.09 }, 0, { tags: ["usable"], behavior: "scripts/l02-use.js",
    state: { kind: "read", name: "Wireless router", verb: "Look", info: "Full bars.", text: "Four green lights, all steady. The network is called REMODELING_CO_GUEST and it has no password. It has never once dropped." } }));
  layLights(ctx, 0);
  sp(ctx, "l02-checkin", { feetPosition: { x: -12.09, y: 1.55, z: -2.42 }, rotation: { yaw: -90 },
    vector: plate("FINISH INSPECTION", "KEEP CLEAR OF THE EAST WING", "#e4b46b", 1.12) });
  sp(ctx, "l02-issue-board", { tags: ["usable"], feetPosition: { x: -12.09, y: 1.35, z: 3.35 }, rotation: { yaw: -90 },
    vector: plate("TOOL ISSUE", "LOCKED CASE · SOUTH OFFICE", "#e9c987"),
    behavior: "scripts/l02-use.js", state: { kind: "read", name: "Tool issue notice", verb: "Read",
      text: "Penelope: lock the tool case in the south office. If the floor goes again, check directly underneath. Bring back whatever didn't break." } });
  sp(ctx, "l02-hum", { feetPosition: { x: cx, y: 2, z: cz }, audio: { clip: HUM, loop: true, gain: 0.12, spatial: false } });
  sp(ctx, "l02-haze", { feetPosition: { x: cx, y: BASE + 0.3, z: cz }, fx: { script: HAZE } });
  // stairs from the basement up to the door room's edge, a 2x4 baluster per step and a rail
  // Shelly Nov 12 "make this not blocky using tripo": one Tripo pine staircase (open treads on notched stringers, baluster rail on the room side) over the ramp collider below
  sp(ctx, "l02-stairs", { feetPosition: { x: -9, y: BASE, z: Z0 + 1.1 }, model: { id: "/cdn/value.c2b6803633d0f2ad5b1a5fbac7422a4e036ecdd90d575f615b0879689e40035e.glb", materials: { "tripo_material_1a20605f-c7ae-4a92-946d-32b1ae6c3c91": { color: "oklch(0.8 0.045 70)", roughness: 0.88, metalness: 0 } } },
    layout: { box: { min: { x: -3.05, y: 0, z: -0.9 }, max: { x: 3.05, y: -BASE + 0.95, z: 0.9 } } }, castShadow: true, receiveShadow: true });
  { // one smooth ramp collider under the treads: (-6.0, BASE) up to (-12.0, 0), so the climb never hangs on a riser
    const run = 6, rise = -BASE, len = Math.hypot(run, rise), ang = Math.atan2(rise, run) * 180 / Math.PI;
    sp(ctx, "l02-stair-ramp", { feetPosition: { x: -9, y: BASE / 2 - 0.1, z: Z0 + 1.1 }, pivot: "center", rotation: { yaw: 0, pitch: 0, roll: -ang }, primitive: box(len, 0.2, 1.8), visible: false, physics: "static" });
  }
  sp(ctx, "l02-stair-guide", { feetPosition: { x: -6.6, y: BASE + 1.65, z: Z0 + 0.05 },
    vector: plate("← STAIRS UP", "LEVEL 0 EXIT", "#b9dab3") });
  sp(ctx, "l02-stair-beacon", { feetPosition: { x: -7.2, y: BASE + 1.95, z: -8.4 },
    light: { kind: "point", color: "oklch(0.85 0.1 148)", intensity: 1.05, distance: 7 } });
  const B = (key, x, z, yaw, extra) => prop(key, { x, y: BASE, z }, yaw, { physics: "static", ...extra });
  const deskY = BASE + H("office_desk");
  // Cap'n's paperwork and the crew's kettle substitute share an actual tabletop near the stairs.
  sp(ctx, "l02-foreman-desk", B("office_desk", -5.2, -5.37, 0));
  sp(ctx, "l02-foreman-chair", B("wchair", -5.24, -6.28, 180));
  sp(ctx, "l02-clipboard", prop("clipboard", { x: -5.54, y: deskY, z: -5.33 }, 12, { tags: ["usable"], behavior: "scripts/l02-use.js",
    state: { kind: "read", name: "Clipboard", verb: "Read", info: "Backrooms Remodelling Company", text: "\"True order comes through furniture.\" Target: Level 0. Sector A880-1. Class-A Remodeling Job. Task Force 102-CX. Supervisor: Major Took. \"You better be reading this, it may be the only chance you four have at saving your jobs. We wouldn't want your 'leader' Cap'n to get punished for all of your stupidity, now would we?\"" } }));
  sp(ctx, "l02-letter", { tags: ["usable"], feetPosition: { x: -5.14, y: deskY + 0.004, z: -5.37 }, rotation: { yaw: -11 }, primitive: box(0.21, 0.004, 0.25), material: { color: "oklch(0.95 0.015 90)", roughness: 0.95 }, behavior: "scripts/l02-use.js",
    state: { kind: "read", name: "Torn letter", verb: "Read", info: "\"Dear Major Took\"", text: "\"Hi! It's me! Everything is a-ok over here! Nothing is going wrong, well, except for a few yep! nothing at all. Maybe you could talk to the higher-ups about giving us a few more chances? I should probab\" The rest of the page has been ripped off." } });
  sp(ctx, "l02-toaster", prop("toaster", { x: -4.74, y: deskY, z: -5.43 }, -12, { tags: ["usable"], behavior: "scripts/l02-use.js",
    state: { kind: "read", name: "Toaster", verb: "Look", info: "Unplugged. Part of the crew.", text: "An unplugged toaster. The crew calls it Toaster. It does not do anything. It might be listening." } }));
  // Cut stock rests across two aligned horses, with bulk materials along the south wall.
  sp(ctx, "l02-sawhorse0", B("sawhorse", -3.45, 7.02, 90));
  sp(ctx, "l02-sawhorse1", B("sawhorse", -1.75, 7.02, 90));
  for (const [i, length, z] of [[0, 2.5, 6.89], [1, 2.35, 7.13]]) {
    sp(ctx, `l02-cut-board-${i}`, { feetPosition: { x: -2.6, y: BASE + H("sawhorse"), z },
      primitive: box(length, 0.055, 0.18), material: STUD, physics: "static" });
  }
  sp(ctx, "l02-lumber0", B("lumber", -5.75, 9.3, 0));
  sp(ctx, "l02-drywall", B("drywall_stack", 2.8, 9.25, 0));
  sp(ctx, "l02-bucket0", B("bucket", -0.95, 7.75, 18));
  sp(ctx, "l02-tarp0", prop("tarp", { x: -2.65, y: BASE, z: 5.22 }, 4));
  for (const [i, x, y] of [[0, -8.15, BASE], [1, -7.86, BASE], [2, -8.005, BASE + H("cement")]]) {
    sp(ctx, `l02-cement${i}`, prop("cement", { x, y, z: 9.22 }, 0, { physics: "static" }));
  }
  // The east wall is a service bench and the pan has a clear approach from the hall.
  sp(ctx, "l02-service-desk", B("office_desk", 9.44, -5.83, 180));
  sp(ctx, "l02-toolbox", prop("red_toolbox", { x: 9.1, y: deskY, z: -5.79 }, 180));
  sp(ctx, "l02-bucket1", B("bucket", 10.32, -6.27, 0));
  sp(ctx, "l02-ladder", B("ladder", 13.7, -9.56, 180));
  sp(ctx, "l02-lumber1", B("lumber", 11.22, -9.36, 0));
  // Cap'n, by the stairs: faceless, two white eyes, the crew uniform (wiki look)
  sp(ctx, "l02-capn", {
    tags: ["npc", "remodel", "essential"], feetPosition: { x: -4, y: BASE + 0.05, z: -6 }, rotation: { yaw: 120 }, physics: "character",
    ...critterSpec(CAPN_LOOK),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: "Cap'n · Remodeling Co.", role: "wanderer", voice: "l02-capn#m", faction: "remodel", factionName: "Backrooms Remodeling Co.", home: { x: -4, z: -6 }, line: "Sorry for the inconvenience. We are improving things.", ...npcState(ctx, "wanderer", 100) },
  });
}
// Cap'n wears the shared body (same refit as Rico in places/bonus/sim.js): pitch-black, the crew face, the uniform colours
const CAPN = { species: "fox", sex: "m", fur: "#0b0b0d", etype: "crew", blush: "none", nose: "none", topw: "remodcoat", top: "#9fb0bf", botw: "pants", bottom: "#6b4a2e", shoes: "boots", hat: "beret", hatc: "#4a4f57", hair: "none", neck: "none", shoec: "#141414" };
const CAPN_LOOK = { ...refitLook("l02-capn", { ...npcLook("l02-capn", CAPN, "wanderer", 2), role: "wanderer", faction: "wanderer" }), ...CAPN, nl: NL_V };
function dressCapn(ctx) {
  const r = ctx.place.objects["l02-capn"]; if (!r) return;
  for (const k of Object.keys(ctx.place.objects)) if (k.startsWith("l02-capn/")) ctx.destroy(k);
  r.state.wear = CAPN_LOOK; delete r.state.headBody; r.state.arm = "fists"; // the crew carry clipboards, not weapons
  r.model = bodyModel(CAPN_LOOK); seatCat(ctx, r, CAPN_LOOK);
}
function layLights(ctx, c) {
  const x = xOf(c), tags = c ? [`l02c${c}`] : [];
  for (const z of [-5, 5]) {
    sp(ctx, `l02-trof-${c}-${z}`, prop("troffer", { x, y: CEIL - H("troffer"), z }, 0, { tags }));
    sp(ctx, `l02-lens-${c}-${z}`, { tags, feetPosition: { x, y: CEIL - H("troffer") - 0.008, z }, primitive: box(1.02, 0.008, 0.48),
      material: { color: "oklch(0.99 0.01 95)", emissive: "oklch(0.98 0.02 95)", emissiveIntensity: 2.2 } });
  }
  sp(ctx, `l02-light-${c}`, { tags, feetPosition: { x, y: CEIL - 0.3, z: 0 }, light: c ? OFFICE_LIGHT : LANDING_LIGHT });
}
function lightColumn(ctx, c, light) {
  const lamp = ctx.place.objects[`l02-light-${c}`];
  if (lamp) lamp.light = light;
}
// what falls away when a column drops; laid again on a reset
function layColumn(ctx, c) {
  const x = xOf(c), tag = `l02c${c}`;
  layLights(ctx, c);
  const joists = []; for (let j = -1.5; j <= 1.5; j += 0.6) joists.push({ feetPosition: { x: j, y: -0.24, z: 0 }, primitive: box(0.05, 0.24, D), material: STUD });
  // Shelly Nov 12 "i get trapped inside after the floor caves in": columns 1-2 leave a stairwell open over the basement stairs (z -10..-7.8), railed, so the way up never sits under a standing floor
  const well = c === 1 || c === 2, z0 = well ? STAIRWELL : Z0, len = Z0 + D - z0;
  if (well) for (const j of joists) j.primitive = box(0.05, 0.24, len);
  const rail = !well ? [] : [{ feetPosition: { x: 0, y: 1.1, z: -len / 2 + 0.04 }, primitive: box(S, 0.06, 0.08), material: TRIM }, ...[-1.9, -0.95, 0, 0.95, 1.9].map((rx) => ({ feetPosition: { x: rx, y: 0.2, z: -len / 2 + 0.04 }, primitive: box(0.06, 0.92, 0.06), material: BASEB }))];
  if (c === 2) rail.push({ feetPosition: { x: S / 2 - 0.04, y: 1.1, z: -len / 2 - (z0 - Z0) / 2 }, primitive: box(0.08, 0.06, z0 - Z0), material: TRIM }, { feetPosition: { x: S / 2 - 0.04, y: 0.2, z: -len / 2 - (z0 - Z0) / 2 }, primitive: box(0.06, 0.92, 0.06), material: BASEB });
  ctx.spawn(`l02-fl-${c}`, { tags: [tag], feetPosition: { x, y: -0.22, z: z0 + len / 2 }, primitive: box(S, 0.2, len), material: PLY, physics: "static",
    children: [{ feetPosition: { x: 0, y: 0.2, z: 0 }, primitive: box(S, 0.02, len), material: CARPET }, ...joists, ...rail] });
  if (c === 2) ctx.spawn(`l02-wellrail-col`, { tags: [tag], feetPosition: { x: x + S / 2 - 0.04, y: 0, z: (Z0 + z0) / 2 }, primitive: box(0.1, 1.2, z0 - Z0), visible: false, physics: "static" });
  if (well) ctx.spawn(`l02-wellrail-${c}`, { tags: [tag], feetPosition: { x, y: 0, z: z0 + 0.04 }, primitive: box(S, 1.2, 0.1), visible: false, physics: "static" });
  for (const [i, [z, len]] of (PART[c] ?? []).entries()) finishedWall(ctx, `l02-pw-${c}-${i}`, tag, x - S / 2, z, len, false, len >= 5);
  const F = (id, key, at, yaw) => put(ctx, id, prop(key, at, yaw, { tags: [tag], physics: "static" }));
  if (c === 1) {
    F("l02-waiting-bench", "bench", { x: -10.25, y: 0, z: 9.45 }, 0);
    F("l02-waiting-plant", "plant", { x: -8.75, y: 0, z: 9.43 }, 18);
  }
  if (c === CASE_COLUMN) {
    finishedWall(ctx, "l02-issue-front-w", tag, 0.75, 4.8, 1.5, true, false);
    finishedWall(ctx, "l02-issue-front-e", tag, 3.43, 4.8, 1.14, true, false);
    sp(ctx, "l02-issue-sign", { tags: [tag], feetPosition: { x: 3.42, y: 1.48, z: 4.71 }, rotation: { yaw: 180 },
      vector: plate("TOOL ISSUE", "CREW ONLY", "#e3dcc9", 0.72) });
    F("l02-issue-desk", "office_desk", CASE_DESK, 180);
    sp(ctx, CASE_TOP, prop("red_toolbox", { ...CASE_DESK, y: H("office_desk") }, 180, {
      tags: [tag, "container"], state: { name: "Crew tool case", lock: "lockpick:25", items: "kit,akit,tape", scavved: true },
    }));
  }
  if (c === 3) {
    sp(ctx, "l02-bath-sign", { tags: [tag], feetPosition: { x: x + 1.1, y: 1.65, z: Z0 + 5.09 },
      vector: plate("RESTROOM", "STAFF & VISITORS", "#e3dcc9", 0.68) });
  }
  if (c === 3) { // the occasional bathroom (x -4..0, z -10..-5): tiled floor, a stall and its toilet, a sink and mirror, a freshener by the tap
    finishedWall(ctx, "l02-bath-e", tag, x + S / 2, Z0 + 2.5, 5, false, false);
    finishedWall(ctx, "l02-bath-n1", tag, x - 1.4, Z0 + 5, 1.2, true, false);
    finishedWall(ctx, "l02-bath-n2", tag, x + 1.1, Z0 + 5, 1.8, true, false);
    ctx.spawn("l02-bath-floor", { tags: [tag], feetPosition: { x, y: 0.002, z: Z0 + 2.5 }, primitive: box(S - 0.15, 0.022, 4.85), material: BATHTILE });
    F("l02-stall", "stall", { x: x + 0.9, y: 0, z: Z0 + 0.56 }, 180);
    F("l02-toilet", "toilet", { x: x + 1.25, y: 0, z: Z0 + 0.42 }, 180);
    F("l02-sink", "sink", { x: x - 1.1, y: 0, z: Z0 + 0.43 }, 180);
    ctx.spawn("l02-mirror", { tags: [tag], feetPosition: { x: x - 1.1, y: 1.05, z: Z0 + 0.02 }, primitive: box(0.7, 0.8, 0.02), material: { color: "oklch(0.85 0.01 230)", metalness: 1, roughness: 0.05 } });
    ctx.spawn("l02-fresh-sink", { tags: ["usable", tag], feetPosition: { x: x - 0.86, y: H("sink") + 0.008, z: Z0 + 0.43 }, ...FRESH_BODY, behavior: "scripts/l02-use.js", state: { kind: "fresh", slot: "sink", name: "Reality Freshener", verb: "Take", info: "Left beside the bathroom tap." } });
  }
}
function layClean(ctx) { for (let c = 1; c < NX; c++) { for (const r of ctx.query({ tags: [`l02c${c}`] })) if (!r.id.includes("/") && r.id in ctx.place.objects) ctx.destroy(r.id); layColumn(ctx, c); } }
function fallCase(ctx) {
  const top = ctx.place.objects[CASE_TOP];
  if (!top) return;
  const items = String(top.state.items ?? "").split(",").filter((item) => item && item !== "akit").join(",");
  const at = { ...CASE_DESK, y: H("office_desk") };
  put(ctx, CASE_FALL, prop("red_toolbox", at, 180, {
    tags: ["l02debris"], state: { name: "Split crew tool case", items, scavved: true },
  }));
  if (!P.red_toolbox?.model) return;
  ctx.place.state.caseLandAt = ctx.now() + 880;
  animate(ctx, CASE_FALL, {
    "feetPosition.x": at.x - 0.28, "feetPosition.y": BASE + 0.025, "feetPosition.z": at.z - 0.65,
    "rotation.yaw": 215, "rotation.pitch": [0, -18, 0], "rotation.roll": [0, 31, 7],
  }, { duration: 0.8, easing: "easeInQuad" });
}
function landCase(ctx, s, now) {
  if (!s.caseLandAt || now < s.caseLandAt) return;
  s.caseLandAt = null;
  const o = ctx.place.objects[CASE_FALL];
  if (!o) return;
  o.tags = ["l02debris", "container"];
  const at = o.feetPosition;
  ctx.emit("playSound", { clip: CASE_IMPACT, position: at, volume: 0.9, refDistance: 3, maxDistance: 17 });
}

function fallDeck(ctx, c) {
  // Visual pieces follow the floor down while the original collision clears for the player.
  for (const side of [-1, 1]) {
    const x = xOf(c) + side * 0.85, z = side * (c === CASE_COLUMN ? 2.8 : 3.8);
    const id = `l02-deck-${c}-${side}`;
    ctx.spawn(id, {
      tags: ["l02debris"], lifetime: 24, feetPosition: { x, y: -0.22, z },
      primitive: box(1.45, 0.14, 2.8), material: PLY,
      children: [
        { feetPosition: { x: 0, y: 0.14, z: 0 }, primitive: box(1.45, 0.02, 2.8), material: CARPET },
        { feetPosition: { x: -0.52, y: -0.13, z: 0 }, primitive: box(0.09, 0.13, 2.8), material: STUD },
        { feetPosition: { x: 0.52, y: -0.13, z: 0 }, primitive: box(0.09, 0.13, 2.8), material: STUD },
      ],
    });
    animate(ctx, id, {
      "feetPosition.x": x + side * 0.3, "feetPosition.y": BASE + 0.16, "feetPosition.z": z + side * 0.38,
      "rotation.yaw": side * 15, "rotation.pitch": [0, side * 24, side * 2], "rotation.roll": [0, side * 34, side * 4],
    }, { duration: side === 1 ? 0.78 : 0.66, easing: "easeInQuad" });
  }
}

function drop(ctx, c) {
  const x = xOf(c), tag = `l02c${c}`;
  if (c === CASE_COLUMN) fallCase(ctx);
  for (const r of ctx.query({ tags: [tag] })) if (r.id !== "l02-fresh-sink" && !r.id.includes("/") && r.id in ctx.place.objects) ctx.destroy(r.id);
  fallDeck(ctx, c);
  if (c === 3 && "l02-fresh-sink" in ctx.place.objects) animate(ctx, "l02-fresh-sink", { "feetPosition.y": BASE + 0.02 }, { duration: 0.7, easing: "easeInQuad" });
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1, z = side * (3.05 + (i > 1 ? 1.05 : 0));
    ctx.spawn({ tags: ["l02debris"], lifetime: 30,
      feetPosition: { x: x + (ctx.random() - 0.5) * 2.4, y: 2.4, z: z + (ctx.random() - 0.5) * 0.6 },
      rotation: { yaw: ctx.random() * 360, pitch: ctx.random() * 40 },
      primitive: i % 2 ? box(0.6, 0.03, 1.2) : box(0.9 + ctx.random(), 0.06, 0.5), material: i % 2 ? TILE : PAINT,
      physics: { body: "dynamic", collider: "box", density: 300 } });
  }
  const at = { x, y: 0.5, z: Z0 + D / 2 };
  ctx.emit("fx", { position: at, script: DUST });
  ctx.emit("playSound", { clip: CRASH, position: at, volume: 1, refDistance: 6, maxDistance: 40 });
  for (const p of ctx.place.players) {
    const d = Math.abs(p.feetPosition.x - x);
    if (d < 14) ctx.emit("screenShake", { intensity: Math.max(0.15, 0.6 - d * 0.04), duration: 0.5 }, { audience: { player: p.id } });
    if (d < 2 && p.feetPosition.y > -1 && p.state) { p.state.hp = (p.state.hp ?? 100) - 6; ctx.emit("damageNumber", { position: { ...p.feetPosition, y: p.feetPosition.y + 1.8 }, value: 6, color: "#e8d9b0" }); }
  }
}
// The front is a strip across the floor, so a freshener can brace it from an adjacent room.
const held = (ctx, c) => ctx.query({ tags: ["freshener"] }).some((f) => {
  const p = f.feetPosition;
  return p.y > -1 && Math.abs(p.x - xOf(c)) <= S / 2 + 6;
});
function beginWarning(ctx, s) {
  s.warned = true;
  lightColumn(ctx, s.col, WARN_LIGHT);
  ctx.emit("playSound", { clip: CREAK, position: { x: xOf(s.col), y: 2, z: 0 }, volume: 0.85, refDistance: 4, maxDistance: 34 });
}
function reset(ctx, s) {
  layClean(ctx);
  resetGrid(ctx); placeGridFresh(ctx); joists(ctx, false);
  for (const r of ctx.query({ tags: ["l02debris"] })) if (r.id in ctx.place.objects) ctx.destroy(r.id);
  s.phase = "clean"; s.liftDown = false; s.liftRelease = false; s.warned = false; s.caseLandAt = null;
}
// the Reality Freshener on the old lift deck, middle of the shifting rooms (quest slot "lift")
function placeGridFresh(ctx) {
  if ("l02-fresh-grid" in ctx.place.objects) ctx.destroy("l02-fresh-grid");
  ctx.spawn("l02-fresh-grid", { tags: ["usable"], feetPosition: { x: G.fresh[0], y: BASE + 0.16, z: G.fresh[1] }, ...FRESH_BODY, behavior: "scripts/l02-use.js", state: { kind: "fresh", slot: "lift", name: "Reality Freshener", verb: "Take", info: "Remodeling Co. property. Cold to the touch." } });
}
export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now(), ps = ctx.place.players;
  if (s.v !== V || !("l02-base" in ctx.place.objects)) {
    layShell(ctx); dressCapn(ctx); layClean(ctx); layGrid(ctx, true); placeGridFresh(ctx); joists(ctx, false);
    s.v = V; s.phase = "clean"; s.liftDown = false; s.liftRelease = false; s.warned = false; s.caseLandAt = null;
    return;
  }
  if (s.capnV !== 2) { dressCapn(ctx); s.capnV = 2; } // the crew coat (remodcoat) refits Cap'n in place, no level rebuild
  if (!ps.length) {
    s.emptyAt ??= now;
    if (s.phase !== "clean" && now - s.emptyAt > 15000) reset(ctx, s);
    return;
  }
  if (s.emptyAt != null && now - s.emptyAt > 15000 && s.phase !== "clean") reset(ctx, s);
  s.emptyAt = null;
  for (const p of ps) if (p.state?.remodQ === 1) setRemodStep(ctx, p, 2, "Fresh Paint · Get the paint cans out of the shifting rooms");
  if (s.phase === "clean" && ps.some((p) => p.feetPosition.x > X0 + S + 1 && p.feetPosition.y > -1)) {
    s.phase = "falling"; s.col = NX - 1; s.nextAt = now + 2800; s.warned = false;
    beginWarning(ctx, s);
  }
  if (s.phase === "held" && !held(ctx, s.col)) {
    s.phase = "falling"; s.nextAt = now + WARNING_MS; s.warned = false;
  }
  if (s.phase === "falling" && !s.warned && now >= s.nextAt - WARNING_MS) beginWarning(ctx, s);
  if (s.phase === "falling" && now >= s.nextAt) {
    if (held(ctx, s.col)) {
      s.phase = "held";
      lightColumn(ctx, s.col, OFFICE_LIGHT);
      for (const p of ps) if (p.state && p.feetPosition.y > -1) p.state.notice = { text: "The Freshener is holding the floor.", at: now };
    } else {
      drop(ctx, s.col);
      s.col -= 1; s.nextAt = now + STEP_MS; s.warned = false;
      if (s.col < 1) s.phase = "fallen";
    }
  }
  landCase(ctx, s, now);
  joists(ctx, s.phase !== "clean");
  gridTick(ctx);
}
