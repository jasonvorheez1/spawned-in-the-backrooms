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
import { S, NX, NZ, X0, Z0, BASE, CEIL, LIFT, BIN, xOf } from "../../scripts/lib/level02.js";
import { FRESH_BODY, setRemodStep } from "../../scripts/lib/remodel-quest.js";
import P from "../../scripts/lib/data/l02-props.yml";
export const cadence = "250ms";
const V = 19, STEP_MS = 3400, WARNING_MS = 1200;
const CASE_COLUMN = 4, CASE_DESK = { x: 2.65, y: 0, z: 6.2 };
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
// the clean floor's walls, per column: [z centre, length] on the column's west edge (gaps are doorways), and across its middle
const STAIRWELL = -7.8; // the open band over the basement stairs
const PART = { 1: [[-5.4, 4.8], [6, 8]], 2: [[-8, 4], [3, 6]], 3: [[-5, 10], [7.5, 5]], 4: [[0, 8]], 5: [[-7, 6], [6, 8]], 6: [[-2, 6], [8, 4]], 7: [[-7.5, 5], [5, 2]] };
const CROSS = { 1: [[3, 2.6]], 2: [[-1, 2.4]], 5: [[2, 3]], 6: [[-4.5, 2.6]] };
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
  sp(ctx, "l02-plaque", { feetPosition: { x: X0 + 2, y: 1.15, z: Z0 + 0.02 }, primitive: box(0.9, 0.9, 0.03), material: { texture: P.insignia, roughness: 0.5, metalness: 0.3 } });
  sp(ctx, "l02-motto", { feetPosition: { x: X0 + 2, y: 0.6, z: Z0 + 0.05 }, vector: "<svg viewBox='0 0 600 60' width='1.4m'><text x='300' y='40' text-anchor='middle' font-family='serif' font-size='34' font-style='italic' fill='#5a1f1a'>True order comes through furniture.</text></svg>" });
  sp(ctx, "l02-desk0", prop("office_desk", { x: X0 + 0.5, y: 0, z: Z0 + D - 2.2 }, -90, { physics: "static" }));
  sp(ctx, "l02-chair0", prop("wchair", { x: X0 + 1.3, y: 0, z: Z0 + D - 2.4 }, -100, { physics: "static" }));
  sp(ctx, "l02-plant0", prop("plant", { x: X0 + 0.55, y: 0, z: Z0 + D - 0.6 }, 30, { physics: "static" }));
  sp(ctx, "l02-router", prop("router", { x: X0 + 0.4, y: H("office_desk"), z: Z0 + D - 2.6 }, -90, { tags: ["usable"], behavior: "scripts/l02-use.js",
    state: { kind: "read", name: "Wireless router", verb: "Look", info: "Full bars.", text: "Four green lights, all steady. The network is called REMODELING_CO_GUEST and it has no password. It has never once dropped." } }));
  layLights(ctx, 0);
  sp(ctx, "l02-checkin", { feetPosition: { x: -12.12, y: 1.4, z: -4.15 }, rotation: { yaw: -90 },
    vector: plate("FINISH INSPECTION", "KEEP CLEAR OF THE EAST WING") });
  sp(ctx, "l02-issue-board", { tags: ["usable"], feetPosition: { x: -12.13, y: 1.35, z: 3.6 }, rotation: { yaw: -90 },
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
  sp(ctx, "l02-lift-guide", { feetPosition: { x: 1.7, y: BASE + 1.65, z: Z0 + 0.05 },
    vector: plate("FREIGHT →", "EAST WALL · COUNTERWEIGHT PAN") });
  // work lights in the basement, each on its tripod with its own warm glow
  for (const [i, x, z, yaw] of [[0, -4, 6.5, 200], [1, 4, -6.5, 20], [2, 10.5, 6.5, 160], [3, -9, -2, 270]]) {
    sp(ctx, `l02-worklamp${i}`, prop("worklamp", { x, y: BASE, z }, yaw, { physics: "static" }));
    sp(ctx, `l02-worklight${i}`, { feetPosition: { x, y: BASE + H("worklamp") - 0.1, z }, light: { kind: "point", color: "oklch(0.88 0.1 75)", intensity: 1.5, distance: 11 } });
  }
  // an unfinished stud wall the crew never sheathed
  const frame = []; for (let s = 0; s <= 8; s += 0.4) frame.push({ feetPosition: { x: 0, y: 0, z: -4 + s }, primitive: box(0.09, -BASE - 0.15, 0.04), material: STUD });
  frame.push({ feetPosition: { x: 0, y: -BASE - 0.15, z: 0 }, primitive: box(0.09, 0.05, 8.04), material: STUD }, { feetPosition: { x: 0, y: -0.05, z: 0 }, primitive: box(0.09, 0.05, 8.04), material: STUD });
  sp(ctx, "l02-frame", { feetPosition: { x: 6, y: BASE + 0.05, z: 5.5 }, children: frame });
  sp(ctx, "l02-frame-col", { feetPosition: { x: 6, y: BASE, z: 5.5 }, primitive: box(0.12, -BASE, 8), visible: false, physics: "static" });
  // the crew's mess: sawhorses with lumber, buckets and rollers, drop cloths, cement bags, drywall, a ladder, Toaster
  const B = (key, x, z, yaw, extra) => prop(key, { x, y: BASE, z }, yaw, { physics: "static", ...extra });
  const SH = BASE + H("sawhorse");
  sp(ctx, "l02-sawhorse0", B("sawhorse", -1, 2, 10)); sp(ctx, "l02-sawhorse1", B("sawhorse", 1.4, 2.3, 10)); sp(ctx, "l02-sawhorse2", B("sawhorse", 6.6, -4, 80));
  sp(ctx, "l02-plank", prop("lumber", { x: 0.2, y: SH, z: 2.15 }, 100, { physics: "static" }));
  sp(ctx, "l02-lumber0", B("lumber", -5, 8.6, 85)); sp(ctx, "l02-lumber1", B("lumber", 12.5, -8.6, 0));
  for (const [i, x, z, yaw] of [[0, -2.6, 8.8, 30], [1, 8.2, -1.2, 200], [2, 3.2, -8.8, 120]]) sp(ctx, `l02-bucket${i}`, B("bucket", x, z, yaw));
  for (const [i, x, z, yaw] of [[0, 2.2, 6.4, 40], [1, -7.5, 4.5, 170], [2, 9, 2.5, 300]]) sp(ctx, `l02-tarp${i}`, prop("tarp", { x, y: BASE, z }, yaw));
  for (const [i, x, z, yaw] of [[0, -10.5, 8.2, 10], [1, -9.6, 8.6, 70], [2, -10, 8.4, 40]]) sp(ctx, `l02-cement${i}`, prop("cement", { x, y: BASE + (i === 2 ? H("cement") : 0), z }, yaw, { physics: "static" }));
  sp(ctx, "l02-drywall", B("drywall_stack", 2, 8.6, 15)); sp(ctx, "l02-ladder", B("ladder", 7.2, 8.6, -30)); sp(ctx, "l02-toolbox", B("red_toolbox", 7.4, -3.4, 60));
  sp(ctx, "l02-clipboard", prop("clipboard", { x: -1, y: SH, z: 1.85 }, 20, { tags: ["usable"], behavior: "scripts/l02-use.js",
    state: { kind: "read", name: "Clipboard", verb: "Read", info: "Backrooms Remodelling Company", text: "\"True order comes through furniture.\" Target: Level 0. Sector A880-1. Class-A Remodeling Job. Task Force 102-CX. Supervisor: Major Took. \"You better be reading this, it may be the only chance you four have at saving your jobs. We wouldn't want your 'leader' Cap'n to get punished for all of your stupidity, now would we?\"" } }));
  sp(ctx, "l02-letter", { tags: ["usable"], feetPosition: { x: 6.75, y: SH + 0.005, z: -3.75 }, rotation: { yaw: 70 }, primitive: box(0.21, 0.004, 0.25), material: { color: "oklch(0.95 0.015 90)", roughness: 0.95 }, behavior: "scripts/l02-use.js",
    state: { kind: "read", name: "Torn letter", verb: "Read", info: "\"Dear Major Took\"", text: "\"Hi! It's me! Everything is a-ok over here! Nothing is going wrong, well, except for a few yep! nothing at all. Maybe you could talk to the higher-ups about giving us a few more chances? I should probab\" The rest of the page has been ripped off." } });
  sp(ctx, "l02-toaster", prop("toaster", { x: 6.3, y: SH, z: -4.35 }, 40, { tags: ["usable"], behavior: "scripts/l02-use.js",
    state: { kind: "read", name: "Toaster", verb: "Look", info: "Unplugged. Part of the crew.", text: "An unplugged toaster. The crew calls it Toaster. It does not do anything. It might be listening." } }));
  // the freight lift: a steel cage open only at the bottom, its deck stuck up at the clean floor, a freshener on it
  const { x: lx, z: lz } = LIFT;
  for (const [id, x, z, w, d, y0] of [["n", lx, lz - 1.6, 3.2, 0.1, BASE], ["s", lx, lz + 1.6, 3.2, 0.1, BASE], ["w", lx - 1.6, lz, 0.1, 3.2, -1.2]])
    sp(ctx, `l02-shaft-${id}`, { feetPosition: { x, y: y0, z }, primitive: box(w, CEIL - y0, d), material: STEEL, physics: "static",
      children: [-1, 1].map((s) => ({ feetPosition: { x: w > d ? s * 1.55 : 0, y: 0, z: w > d ? 0 : s * 1.55 }, primitive: box(0.14, CEIL - y0, 0.14), material: { color: "oklch(0.75 0.15 85)", metalness: 0.4, roughness: 0.5 } })) });
  sp(ctx, "l02-shaft-sign", { feetPosition: { x: lx - 1.66, y: -1.0, z: lz }, rotation: { yaw: -90 }, vector: "<svg viewBox='0 0 300 80' width='1.2m'><rect width='300' height='80' fill='#f1c40f'/><text x='150' y='34' text-anchor='middle' font-family='sans-serif' font-size='26' font-weight='bold' fill='#111'>FREIGHT LIFT</text><text x='150' y='66' text-anchor='middle' font-family='sans-serif' font-size='18' fill='#111'>COUNTERWEIGHT 42 KG ON PAN</text></svg>" });
  sp(ctx, "l02-pan", { feetPosition: { x: BIN.x, y: BASE, z: BIN.z }, primitive: box(1.4, 0.08, 1.4), material: { ...STEEL, texture: "cdn/texture-diamond-plate-steel-floor.png", wrap: "repeat", repeat: [1, 1] }, physics: "static", state: { kg: 0 },
    children: [[0, -0.7, 1.4, 0.1], [0, 0.7, 1.4, 0.1], [-0.7, 0, 0.1, 1.4], [0.7, 0, 0.1, 1.4]].map(([x, z, w, d]) => ({ feetPosition: { x, y: 0.08, z }, primitive: box(w, 0.18, d), material: STEEL, physics: "static" })) });
  sp(ctx, "l02-pan-read", { feetPosition: { x: BIN.x, y: BASE + 1.3, z: BIN.z - 0.75 }, state: { kg: 0 }, vector: "<svg viewBox='0 0 220 70' width='0.9m' billboard='yaw'><rect width='220' height='70' rx='6' fill='#1b1b1b'/><text x='110' y='46' text-anchor='middle' font-family='display' font-size='34' fill='#f1c40f'>{{ state.kg }} / 42 KG</text></svg>" });
  sp(ctx, "l02-cable", { feetPosition: { x: BIN.x - 0.6, y: BASE + 0.25, z: BIN.z - 0.6 }, primitive: { kind: "cylinder", radiusTop: 0.012, radiusBottom: 0.012, height: CEIL - BASE - 0.3, radialSegments: 6 }, material: { color: "oklch(0.22 0 0)", metalness: 0.7, roughness: 0.4 } });
  sp(ctx, "l02-lift-release", { tags: ["usable"], feetPosition: { x: 12.4, y: BASE + 1.15, z: -1.63 }, rotation: { yaw: -90 },
    primitive: box(0.28, 0.31, 0.13), material: { color: "oklch(0.42 0.08 27)", metalness: 0.35, roughness: 0.65 },
    children: [{ feetPosition: { x: 0, y: 0.08, z: 0.08 }, primitive: box(0.075, 0.18, 0.08), material: { ...STEEL, color: "oklch(0.78 0.12 83)" } }],
    behavior: "scripts/l02-use.js", state: { kind: "release", name: "Manual brake release", verb: "Service", info: "Repair 35 · Lower the freight lift by hand." } });
  layLift(ctx, false);
  layCans(ctx);
  // Cap'n, by the stairs: faceless, two white eyes, the crew uniform (wiki look)
  sp(ctx, "l02-capn", {
    tags: ["npc", "remodel", "essential"], feetPosition: { x: -4, y: BASE + 0.05, z: -6 }, rotation: { yaw: 120 }, physics: "character",
    ...critterSpec(CAPN_LOOK),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: "Cap'n · Remodeling Co.", role: "wanderer", voice: "l02-capn#m", faction: "remodel", factionName: "Backrooms Remodeling Co.", home: { x: -4, z: -6 }, line: "Sorry for the inconvenience. We are improving things.", ...npcState(ctx, "wanderer", 100) },
  });
}
// Cap'n wears the shared body (same refit as Rico in places/bonus/sim.js): pitch-black, the crew face, the uniform colours
const CAPN = { species: "fox", sex: "m", fur: "#0b0b0d", etype: "crew", blush: "none", nose: "none", topw: "longsleeve", top: "#9fb0bf", botw: "pants", bottom: "#6b4a2e", shoes: "boots", hat: "beret", hatc: "#4a4f57", hair: "none", neck: "none", shoec: "#141414" };
const CAPN_LOOK = { ...refitLook("l02-capn", { ...npcLook("l02-capn", CAPN, "wanderer", 2), role: "wanderer", faction: "wanderer" }), ...CAPN, nl: NL_V };
function dressCapn(ctx) {
  const r = ctx.place.objects["l02-capn"]; if (!r) return;
  for (const k of Object.keys(ctx.place.objects)) if (k.startsWith("l02-capn/")) ctx.destroy(k);
  r.state.wear = CAPN_LOOK; delete r.state.headBody; r.state.arm = "fists"; // the crew carry clipboards, not weapons
  r.model = bodyModel(CAPN_LOOK); seatCat(ctx, r, CAPN_LOOK);
}
function layLift(ctx, down) {
  const y = down ? BASE - 0.2 : -0.2;
  for (const id of ["l02-lift", "l02-fresh-lift"]) if (id in ctx.place.objects) ctx.destroy(id);
  ctx.spawn("l02-lift", { feetPosition: { x: LIFT.x, y, z: LIFT.z }, primitive: box(3, 0.2, 3), material: { ...STEEL, metalness: 0.7, roughness: 0.45, texture: "cdn/texture-diamond-plate-steel-floor.png", wrap: "repeat", repeat: [1, 1] }, physics: "kinematic" });
  ctx.spawn("l02-fresh-lift", { tags: ["usable"], feetPosition: { x: LIFT.x + 0.3, y: y + 0.2, z: LIFT.z }, ...FRESH_BODY, behavior: "scripts/l02-use.js", state: { kind: "fresh", slot: "lift", name: "Reality Freshener", verb: "Take", info: "Remodeling Co. property. Cold to the touch." } });
}
const CANS = [[-2, 7.6], [3, -7.8], [8, 7.5], [9.5, -6.4], [9.4, -1.9]];
function layCans(ctx) {
  CANS.forEach(([x, z], i) => { const id = `l02-can${i}`; if (id in ctx.place.objects) ctx.destroy(id);
    const base = { tags: ["l02can", "grabbable"], physics: { body: "dynamic", collider: "cylinder", mass: 14, friction: 0.8 }, state: { name: "Paint can (14 kg)" } };
    ctx.spawn(id, prop("paintcan", { x, y: BASE + 0.02, z }, i * 70, base) ?? { ...base, feetPosition: { x, y: BASE + 0.02, z }, primitive: { kind: "cylinder", radiusTop: 0.15, radiusBottom: 0.15, height: 0.36, radialSegments: 18 }, material: { color: "oklch(0.8 0.01 90)", metalness: 0.6, roughness: 0.35 } }); });
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
  for (const [i, [z, len]] of (CROSS[c] ?? []).entries()) finishedWall(ctx, `l02-cw-${c}-${i}`, tag, x, z, len, true, false);
  const F = (id, key, at, yaw) => put(ctx, id, prop(key, at, yaw, { tags: [tag], physics: "static" }));
  if (c === 1) { F("l02-desk1", "office_desk", { x: x + 0.4, y: 0, z: 9.4 }, 0); F("l02-chair1", "wchair", { x: x + 0.4, y: 0, z: 8.5 }, 180); }
  if (c === 2) F("l02-plant2", "plant", { x: x + 1.5, y: 0, z: 9.4 }, 120);
  if (c === CASE_COLUMN) {
    F("l02-issue-desk", "office_desk", CASE_DESK, 180);
    sp(ctx, CASE_TOP, prop("red_toolbox", { ...CASE_DESK, y: H("office_desk") }, 180, {
      tags: [tag, "container"], state: { name: "Crew tool case", lock: "lockpick:25", items: "kit,akit,tape", scavved: true },
    }));
  }
  if (c === 5) F("l02-bench5", "bench", { x: x + 0.6, y: 0, z: -9.6 }, 180);
  if (c === 6) { F("l02-desk6", "office_desk", { x: x + 1.3, y: 0, z: 9.4 }, 0); F("l02-chair6", "wchair", { x: x + 1.2, y: 0, z: 8.6 }, 160); }
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
    F("l02-sink", "sink", { x: x - 1.1, y: 0, z: Z0 + 0.3 }, 180);
    ctx.spawn("l02-mirror", { tags: [tag], feetPosition: { x: x - 1.1, y: 1.05, z: Z0 + 0.02 }, primitive: box(0.7, 0.8, 0.02), material: { color: "oklch(0.85 0.01 230)", metalness: 1, roughness: 0.05 } });
    ctx.spawn("l02-fresh-sink", { tags: ["usable", tag], feetPosition: { x: x - 0.6, y: H("sink") + 0.01, z: Z0 + 0.25 }, ...FRESH_BODY, behavior: "scripts/l02-use.js", state: { kind: "fresh", slot: "sink", name: "Reality Freshener", verb: "Take", info: "Left beside the bathroom tap." } });
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
  for (let i = 0; i < 5; i++) ctx.spawn({ tags: ["l02debris"], lifetime: 30, feetPosition: { x: x + (ctx.random() - 0.5) * 3, y: 2.4, z: Z0 + 1 + ctx.random() * (D - 2) }, rotation: { yaw: ctx.random() * 360, pitch: ctx.random() * 40 },
    primitive: i % 2 ? box(0.6, 0.03, 1.2) : box(0.9 + ctx.random(), 0.06, 0.5), material: i % 2 ? TILE : PAINT, physics: { body: "dynamic", collider: "box", density: 300 } });
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
  layLift(ctx, false);
  layCans(ctx);
  for (const r of ctx.query({ tags: ["l02debris"] })) if (r.id in ctx.place.objects) ctx.destroy(r.id);
  s.phase = "clean"; s.liftDown = false; s.liftRelease = false; s.warned = false; s.caseLandAt = null;
  const release = ctx.place.objects["l02-lift-release"];
  if (release) release.state.info = "Repair 35 · Lower the freight lift by hand.";
}
export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now(), ps = ctx.place.players;
  if (s.v !== V || !("l02-base" in ctx.place.objects)) {
    layShell(ctx); dressCapn(ctx); layClean(ctx);
    s.v = V; s.phase = "clean"; s.liftDown = false; s.liftRelease = false; s.warned = false; s.caseLandAt = null;
    return;
  }
  if (!ps.length) {
    s.emptyAt ??= now;
    if ((s.phase !== "clean" || s.liftDown) && now - s.emptyAt > 15000) reset(ctx, s);
    return;
  }
  if (s.emptyAt != null && now - s.emptyAt > 15000 && (s.phase !== "clean" || s.liftDown)) reset(ctx, s);
  s.emptyAt = null;
  for (const p of ps) if (p.state?.remodQ === 1) setRemodStep(ctx, p, 2, "Fresh Paint · Find the bathroom freshener, the freight lift and Cap'n");
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
  if (s.liftDown) return;
  const kg = ctx.query({ tags: ["l02can"], center: { x: BIN.x, y: BASE + 0.35, z: BIN.z }, radius: 1.1 }).filter((r) => {
    const p = r.feetPosition;
    return !r.state?.heldBy && Math.abs(p.x - BIN.x) < 0.67 && Math.abs(p.z - BIN.z) < 0.67 && p.y >= BASE && p.y < BASE + 0.8;
  }).length * 14;
  const rd = ctx.place.objects["l02-pan-read"]; if (rd && rd.state.kg !== kg) rd.state.kg = kg;
  if (s.liftRelease || kg >= LIFT.kg) {
    s.liftDown = true;
    const release = ctx.place.objects["l02-lift-release"];
    if (release) release.state.info = "The freight lift is down.";
    for (const id of ["l02-lift", "l02-fresh-lift"]) {
      const o = ctx.place.objects[id];
      if (o) animate(ctx, id, { "feetPosition.y": id === "l02-lift" ? BASE - 0.2 : BASE }, { duration: 4, easing: "easeInOutSine" });
    }
    ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-freight-elevator-chain-rattle-descending-clunk.mp3", position: { x: LIFT.x, y: BASE + 1, z: LIFT.z }, volume: 1, maxDistance: 30 });
  }
}
