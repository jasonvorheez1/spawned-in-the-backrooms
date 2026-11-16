import { kitPass } from "../../scripts/lib/usable-kit.js";
import { retextureOnce } from "../../scripts/lib/retexture.js";
import { sweepProps } from "../../scripts/lib/breakables.js";
import { restyleSigns } from "../../scripts/lib/sign-style.js";
import { dressThresholds } from "../../scripts/lib/thresholds.js";
// Level 6 "Lights Out": lays the halls once (place.state.builtV); then the dark talks to whoever is in it.
// No light works here (scripts/player.js kills the flashlight on this place). Plan: scripts/lib/level6.js.
import { W, H, C, HT, START, cx, cz, plan, wallRuns, NOTES } from "../../scripts/lib/level6.js";
export const cadence = "1s";
const V = 5;
const CONCRETE = { color: "oklch(0.55 0.005 250)", roughness: 0.95, texture: "cdn/texture-smooth-cold-poured-concrete-wall.png", repeat: [1, 1], wrap: "repeat" };
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const WHISPERS = [G("faint-skittering-claws-on-concrete-in-dark"), G("slow-close-breathing-in-pitch-dark"), G("unintelligible-whisper-behind-ear"), G("bare-footsteps-stop-on-concrete")];
const VO = (who, t) => `/cdn/voice-${who}-saying-${encodeURIComponent(t)}.mp3`;
const MIMIC = "hoarse-young-woman-whispering-in-the-dark"; // the voice in the halls: it learned it from someone
const MIMIC_LINES = ["Kacey? Kacey, where are you?", "Hello? I can hear you breathing.", "Over here. Follow my voice.", "Is someone there? I can't see."];
const STATIC = G("low-radio-static-hiss-crackle-in-ear-loop");
const SKITTER = G("many-small-claws-skittering-fast-across-concrete-ceiling");
const chalk = (text) => `<svg viewBox='0 0 300 120' width='1.3m'><text x='150' y='60' text-anchor='middle' font-family='sans-serif' font-size='${text.length > 40 ? 15 : 26}' fill='#cfc9bb' fill-opacity='0.75'>${text.length > 40 ? text.match(/.{1,34}(\s|$)/g).map((l, k) => `<tspan x='150' dy='${k ? 18 : -18}'>${l.trim()}</tspan>`).join("") : text}</text></svg>`;

function lay(ctx) {
  const { ends } = plan();
  ctx.spawn("l6-floor", { feetPosition: { x: 0, y: -0.2, z: 0 }, physics: "static", primitive: { kind: "box", width: W * C, height: 0.2, depth: H * C }, material: { ...CONCRETE, color: "oklch(0.4 0.005 250)" } });
  ctx.spawn("l6-ceiling", { feetPosition: { x: 0, y: HT, z: 0 }, physics: "static", primitive: { kind: "box", width: W * C, height: 0.2, depth: H * C }, material: { ...CONCRETE, color: "oklch(0.35 0.005 250)" } });
  wallRuns().forEach((r, n) => ctx.spawn(`l6-w${n}`, { feetPosition: { x: (cx(r.i0) + cx(r.i1)) / 2, y: 0, z: cz(r.j) }, physics: "static", primitive: { kind: "box", width: (r.i1 - r.i0 + 1) * C, height: HT, depth: C }, material: CONCRETE }));
  ctx.spawn("l6-cap", { feetPosition: { x: cx(START.i), y: 0, z: cz(H - 1) + C }, physics: "static", primitive: { kind: "box", width: C * 3, height: HT, depth: C }, material: CONCRETE });
  // the way back up: a steel door at the south nook, one dying bulb on the far side of its wire glass
  const dz = cz(H - 1) + C / 2 - 0.05;
  ctx.spawn("l6-back", { tags: ["door"], feetPosition: { x: cx(START.i), y: 0, z: dz - 0.35 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 1.4, height: 2.2, depth: 0.5 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level5#l5-from-l6" } });
  ctx.spawn("l6-back-door", { feetPosition: { x: cx(START.i), y: 0, z: dz }, primitive: { kind: "box", width: 1.1, height: 2.1, depth: 0.08 }, material: { color: "oklch(0.32 0.01 240)", metalness: 0.7, roughness: 0.6 } });
  ctx.spawn("l6-back-plate", { feetPosition: { x: cx(START.i), y: 1.55, z: dz - 0.05 }, rotation: { yaw: 0 }, vector: chalk("↑ 5 · boiler room") });
  ctx.spawn("l6-from-l5", { feetPosition: { x: cx(START.i), y: 0.1, z: cz(START.j) }, rotation: { yaw: 0 } });
  // the notes the last ones left, chalked on the dead ends where they stopped
  const used = ends.slice(0, NOTES.length + 2);
  used.forEach((e, n) => {
    if (n === 1) return; // the deepest but one is the stairwell
    const note = NOTES[n === 0 ? 0 : n - 1]; if (!note) return;
    const wx = cx(e.i) - e.dx * (C / 2 - 0.02), wz = cz(e.j) - e.dz * (C / 2 - 0.02); // on the wall that closes it
    ctx.spawn(`l6-note-${n}`, { feetPosition: { x: wx, y: 1.45, z: wz }, rotation: { lookAt: { x: cx(e.i) + e.dx * C, y: 1.45, z: cz(e.j) + e.dz * C } }, vector: chalk(note) });
  });
  // "we blocked it off": boards across the next dead end
  const b = ends[NOTES.length + 2];
  if (b) for (let k = 0; k < 4; k++) ctx.spawn(`l6-board-${k}`, { feetPosition: { x: cx(b.i) + b.dx * 0.6, y: 0.35 + k * 0.45, z: cz(b.j) + b.dz * 0.6 }, rotation: { yaw: b.dx ? 90 : 0, roll: (k % 2 ? 8 : -6) }, physics: "static", visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "box", width: C, height: 0.16, depth: 0.04 }, material: { color: "oklch(0.42 0.05 60)", roughness: 0.9, texture: "cdn/texture-worn-hardwood-grain.png" } });
  if (b) ctx.spawn("l6-board-note", { feetPosition: { x: cx(b.i) + b.dx * 0.55, y: 1.9, z: cz(b.j) + b.dz * 0.55 }, rotation: { lookAt: { x: cx(b.i) + b.dx * 3, y: 1.9, z: cz(b.j) + b.dz * 3 } }, visibleRange: { max: 35 }, vector: chalk("we blocked it off") });
  // the stairwell down: you hear it before you find it. faint waves, cold air
  const s = ends[1];
  ctx.spawn("l6-stair", { feetPosition: { x: cx(s.i), y: 0, z: cz(s.j) }, tags: ["l6-stair"], visibleRange: { max: 45 }, castShadow: false, audio: { clip: G("faint-distant-ocean-waves-echoing-up-concrete-stairwell-loop"), loop: true, gain: 0.35, spatial: true, maxDistance: 26 },
    children: [0, 1, 2, 3].map((k) => ({ feetPosition: { x: 0, y: -0.2 - k * 0.2, z: -0.3 * k * (s.dz ? -s.dz : 0) }, primitive: { kind: "box", width: C * 0.9, height: 0.05, depth: 0.32 }, material: { ...CONCRETE, color: "oklch(0.3 0.005 250)" } })) });
  ctx.spawn("l6-to-l7", {
    tags: ["door"],
    feetPosition: { x: cx(s.i), y: -0.6, z: cz(s.j) - 0.8 * (s.dz || 1) },
    physics: { body: "static", trigger: true },
    primitive: { kind: "box", width: 1.5, height: 2.2, depth: 1.2 },
    visible: false,
    behavior: "scripts/level-door.js",
    state: { to: "level7#l7-from-l6" },
  });
  ctx.spawn("l6-from-l7", {
    feetPosition: { x: cx(s.i), y: 0.1, z: cz(s.j) },
    rotation: { yaw: s.dz > 0 ? 0 : 180 },
  });
  ctx.spawn("l6-stair-note", { feetPosition: { x: cx(s.i) - s.dx * (C / 2 - 0.02), y: 1.45, z: cz(s.j) - s.dz * (C / 2 - 0.02) }, rotation: { lookAt: { x: cx(s.i) + s.dx * C, y: 1.45, z: cz(s.j) + s.dz * C } }, vector: chalk("follow the waves. 7 is down here") });
}

// v2: the map's notes come true. what the lost left, where they left it (Savi's picks over Shelly's hand-drawn map)
const at = (e, k = 0) => ({ x: cx(e.i) - e.dx * k, z: cz(e.j) - e.dz * k }); // k metres deeper into the dead end
const prop = (ctx, id, kind, p, yaw, extra = {}) => ctx.spawn(id, { feetPosition: { x: p.x, y: 0, z: p.z }, rotation: { yaw }, visibleRange: { max: 35 }, castShadow: false, primitive: { kind: "scripted", script: "scripts/l6-props-geo.js", params: { kind } }, ...extra });
const pack = (ctx, id, kind, p, yaw, name, items) => prop(ctx, id, kind, p, yaw, { tags: ["container"], physics: "static", state: { name, items } });
const spot = (ctx, id, p, state, r = 1.6) => ctx.spawn(id, { feetPosition: { x: p.x, y: 0, z: p.z }, physics: { body: "static", trigger: true, collider: "box" }, primitive: { kind: "box", width: r, height: 2.2, depth: r }, visible: false, behavior: "scripts/l6-spot.js", state });
function lay2(ctx) {
  const { ends } = plan(), E = (n) => ends[n];
  // 0 · "came all this way for NOTHING": the one who gave up. a pack, a dead torch, chalk worn to a stub
  if (E(0)) { pack(ctx, "l6-p-nothing", "backpack", at(E(0), 0.4), 30, "Abandoned pack", "almond,battery,ration"); prop(ctx, "l6-t-nothing", "torch", at(E(0), -0.3), 110); prop(ctx, "l6-c-nothing", "chalk", { x: at(E(0), 0.6).x + 0.3, z: at(E(0), 0.6).z }, 70);
    spot(ctx, "l6-s-nothing", at(E(0)), { text: "The chalk is pressed so hard it broke. Whoever wrote this stopped here.", san: 4, every: 300 }); }
  // 2 · NOT SAFE: something breathes on the other side of the wall
  if (E(2)) spot(ctx, "l6-s-notsafe", at(E(2), -1), { text: "Your skin crawls. Something is very close.", san: 8, clip: G("slow-close-breathing-in-pitch-dark"), vol: 0.8, from: { x: 0.6, z: 0.6 }, every: 120 });
  // 3 · smells like blood: it does
  if (E(3)) { prop(ctx, "l6-blood", "stain", at(E(3), 0.2), 0); prop(ctx, "l6-shoe-blood", "shoe", at(E(3), 0.5), 200);
    spot(ctx, "l6-s-blood", at(E(3), -1.2), { text: "Copper. Thick in the back of your throat.", san: 6, every: 200 }); }
  // 4 · static in my ears: a hiss that lives in the dead end. stand in it and your head rings
  if (E(4)) { ctx.spawn("l6-static", { feetPosition: { x: at(E(4)).x, y: 1.4, z: at(E(4)).z }, audio: { clip: STATIC, loop: true, gain: 0.3, spatial: true, maxDistance: 6 } });
    spot(ctx, "l6-s-static", at(E(4)), { text: "Static fills your ears. It almost sounds like words.", san: 10, every: 60 }); }
  // 5 · Emmanuel disappeared down this hall: his pack, still zipped. he meant to come back for it
  if (E(5)) { pack(ctx, "l6-p-emmanuel", "backpack", at(E(5), 0.3), -40, "Emmanuel's pack", "almond,almond,battery,bandage,bobbypin"); prop(ctx, "l6-shoe-emm", "shoe", at(E(5), -0.9), 15);
    spot(ctx, "l6-s-emmanuel", at(E(5), -1.5), { text: "One shoe. Laces still tied.", every: 300 }); }
  // 6 · the tripwire noclip into Level 6.1 "The Snackrooms" (canonical Wikidot lore)
  if (E(6)) {
    const p61 = at(E(6), 0.3);
    ctx.spawn("l6-to-l61", {
      tags: ["door"],
      feetPosition: { x: p61.x, y: -0.1, z: p61.z },
      physics: { body: "static", trigger: true },
      primitive: { kind: "box", width: 1.4, height: 1.8, depth: 1.4 },
      visible: false,
      behavior: "scripts/level-door.js",
      state: { to: "level61#l61-from-l6" },
    });
    ctx.spawn("l6-from-l61", { feetPosition: { x: p61.x, y: 0.1, z: p61.z }, rotation: { yaw: 0 } });
    // Visuals: loose dangling tripwire across floor + warm golden light crack + faint muffled 80s music
    ctx.spawn("l6-wire-61", {
      feetPosition: { x: p61.x, y: 0.02, z: p61.z },
      primitive: { kind: "cylinder", radiusTop: 0.018, radiusBottom: 0.018, height: 1.4 },
      rotation: { pitch: 90, yaw: 35 },
      visibleRange: { max: 35 }, castShadow: false,
      material: { color: "#111111", roughness: 0.8 },
      children: [
        { feetPosition: { x: 0, y: 0.01, z: 0 }, primitive: { kind: "box", width: 0.9, height: 0.02, depth: 0.1 }, material: { color: "#ffeedd", emissive: "#ffeedd", emissiveIntensity: 2.8 } },
        { feetPosition: { x: 0, y: 0.08, z: 0 }, light: { kind: "point", color: "oklch(0.92 0.12 75)", intensity: 1.2, distance: 4.5, shadow: { enabled: false }, visibleRange: { max: 30 } } },
      ],
      audio: { clip: "https://media-ssl.musicradio.com/Heart80sMP3", loop: true, gain: 0.15, spatial: true, maxDistance: 10 },
    });
    ctx.spawn("l6-wire-note", {
      feetPosition: { x: cx(E(6).i) - E(6).dx * (C / 2 - 0.02), y: 1.45, z: cz(E(6).j) - E(6).dz * (C / 2 - 0.02) },
      rotation: { lookAt: { x: cx(E(6).i) + E(6).dx * C, y: 1.45, z: cz(E(6).j) + E(6).dz * C } },
      visibleRange: { max: 35 },
      vector: chalk("music under the floor? watch the wire"),
    });
  }
  // 7 · Jack didn't come back: his jacket, his light. pockets heavier than they should be
  if (E(7)) { pack(ctx, "l6-p-jack", "jacket", at(E(7), 0.3), 80, "Jack's jacket", "battery,battery,ammo,cash:25"); prop(ctx, "l6-t-jack", "torch", at(E(7), -0.4), 160);
    spot(ctx, "l6-s-jack", at(E(7), -1.2), { text: "His flashlight. The switch is still on.", san: 3, every: 300 }); }
  // 8 · skittering noise: a rush of claws runs across the ceiling the moment you get close
  if (E(8)) spot(ctx, "l6-s-skitter", at(E(8), -2), { text: "Something runs across the ceiling. Fast. Many legs.", san: 7, clip: SKITTER, vol: 0.9, from: { x: 0, z: 0 }, every: 90 }, 1.8);
  // 9 · this changed overnight?: a wall that is there, and then isn't (the sim moves it when nobody watches)
  if (E(9)) { const e = E(9); ctx.spawn("l6-shift", { feetPosition: { x: cx(e.i) + e.dx * C, y: 0, z: cz(e.j) + e.dz * C }, physics: "static", primitive: { kind: "box", width: C, height: HT, depth: C }, material: CONCRETE, state: { up: true } }); }
  // 10 · lost Kacey here: her hair tie, a pack with a name inked on it, and a voice that keeps calling for her
  if (E(10)) { pack(ctx, "l6-p-kacey", "backpack", at(E(10), 0.3), 140, "Pack marked 'KACEY'", "almond,almond,battery,battery,ration,bandage,tape");
    spot(ctx, "l6-s-kacey", at(E(10), -1), { text: "A voice behind you calls a name. It's not yours. Not yet.", san: 6, clip: VO(MIMIC, MIMIC_LINES[0]), vol: 0.7, from: { x: 2.5, z: 2.5 }, every: 150 }); }
  // the way the last ones marked: chalk arrows back toward 5, a tally of days near the stairs
  const marks = [["l6-arrow-0", 37, "← 5"], ["l6-arrow-1", 33, "5 ↓ keep left"], ["l6-tally", 38, "IIII IIII IIII II · days?"]];
  marks.forEach(([id, j, t]) => { const i = START.i; let side = -1; const { open } = plan(); if (open[i - 1]?.[j]) side = 1; if (!open[i][j]) return;
    ctx.spawn(id, { feetPosition: { x: cx(i) + side * (C / 2 - 0.02), y: 1.3, z: cz(j) }, rotation: { yaw: side > 0 ? -90 : 90 }, vector: chalk(t) }); });
}

function lay3(ctx) {
  const { ends } = plan(), E = (n) => ends[n];
  // Puddles of dark anomalous condensation in corridor intersections
  const puddleSpots = [
    { x: cx(START.i), z: cz(START.j - 4) },
    { x: cx(START.i + 2), z: cz(START.j - 8) },
    { x: cx(START.i - 2), z: cz(START.j - 14) },
    at(E(1), 3),
    at(E(3), 2),
    at(E(8), 2.5),
  ];
  puddleSpots.forEach((p, idx) => {
    prop(ctx, `l6-puddle-${idx}`, "puddle", p, idx * 60);
  });

  // Ceiling and wall pipe clusters
  const pipeSpots = [
    { p: { x: cx(START.i) + 0.8, z: cz(START.j - 2) }, yaw: 0 },
    { p: { x: cx(START.i) - 0.8, z: cz(START.j - 6) }, yaw: 0 },
    { p: at(E(2), 1.5), yaw: 90 },
    { p: at(E(4), 1.5), yaw: 0 },
    { p: at(E(7), 1.5), yaw: 90 },
  ];
  pipeSpots.forEach((ps, idx) => {
    ctx.spawn(`l6-pipe-${idx}`, {
      feetPosition: { x: ps.p.x, y: 2.1, z: ps.p.z },
      rotation: { yaw: ps.yaw },
      visibleRange: { max: 40 }, castShadow: false,
      primitive: { kind: "scripted", script: "scripts/l6-props-geo.js", params: { kind: "pipe" } },
      physics: "static",
    });
  });

  // Stairwell to Level 7: smell of brine and booming ocean waves
  if (E(1)) {
    spot(ctx, "l6-s-stair", at(E(1), 0), {
      text: "Bitter cold air and the smell of saltwater ocean spray hits your face. Waves roar in the abyss below.",
      san: -5,
      every: 120,
    });
  }

  // Smiler pack manager & Smiler entity in the dark halls
  if (!ctx.getObject("l6-smiler-mgr")) {
    ctx.spawn("l6-smiler-mgr", { behavior: "scripts/l6-smiler.js" });
  }
  if (!ctx.getObject("l6-smiler-1") && E(4)) {
    const smPos = at(E(4), 1.2);
    ctx.spawn("l6-smiler-1", {
      tags: ["smiler", "l6-smiler", "hostile"],
      feetPosition: { x: smPos.x, y: 0.05, z: smPos.z },
      visibleRange: { max: 45 }, castShadow: false,
      model: { id: "/cdn/value.fb443f6a23bcd4977c437db42b3f9abe2510fcb6cf2076ee4956fb235d581b26.glb", forward: "+x" },
      scale: 1.6,
      physics: { body: "character" },
      state: { hp: 120, maxHp: 120, name: "Smiler", mdl: 2 },
      children: [
        {
          feetPosition: { x: 0, y: 1.1, z: 0.35 },
          light: { kind: "point", color: "#ffffff", intensity: 1.2, distance: 3.5, shadow: { enabled: false }, visibleRange: { max: 30 } },
        },
        {
          feetPosition: { x: 0, y: 1.1, z: 0.4 },
          rotation: { yaw: 0 },
          vector: "<svg viewBox='0 0 100 60' width='0.4m'><ellipse cx='30' cy='18' rx='4' ry='6' fill='#ffffff'/><ellipse cx='70' cy='18' rx='4' ry='6' fill='#ffffff'/><path d='M 18 32 Q 50 56 82 32 Q 50 42 18 32 Z' fill='#ffffff'/></svg>",
        },
      ],
    });
  }

  // Hound pack manager & Hound entity prowling the deep corridors
  if (!ctx.getObject("l6-hound-mgr")) {
    ctx.spawn("l6-hound-mgr", { behavior: "scripts/hounds.js" });
  }
  if (!ctx.getObject("l6-hound-1") && E(8)) {
    const hPos = at(E(8), 0.8);
    ctx.spawn("l6-hound-1", {
      tags: ["hound", "hostile"],
      feetPosition: { x: hPos.x, y: 0.05, z: hPos.z },
      model: { id: "/cdn/value.180d1072a97d34551e1394960b70202777c9d0b51fb0ca67779a59e429ef6fa7.glb" },
      physics: { body: "character" },
      state: { hp: 90, maxHp: 90, name: "Hound" },
    });
  }
}

// Level 6.1's way in: a wire strung low across a dead end. trip on it and you fall through the floor into The Snackrooms
function laySnack(ctx) {
  const { ends } = plan(), e = ends[NOTES.length + 3] ?? ends[ends.length - 1]; if (!e) return;
  const x = cx(e.i), z = cz(e.j), yaw = e.dx ? 90 : 0;
  ctx.spawn("l6-wire", { feetPosition: { x, y: 0.1, z }, rotation: { yaw }, primitive: { kind: "box", width: C, height: 0.012, depth: 0.012 }, material: { color: "oklch(0.3 0.01 60)", metalness: 0.6 } });
  ctx.spawn("l6-wire-trip", { tags: ["door"], feetPosition: { x, y: 0, z }, rotation: { yaw }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: C, height: 0.4, depth: 0.3 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level61#l61-from-l6" } });
  ctx.spawn("l6-from-l61", { feetPosition: { x: x - e.dx * 1.6, y: 0.1, z: z - e.dz * 1.6 }, rotation: { yaw: 0 } });
  ctx.spawn("l6-wire-note", { feetPosition: { x: x + e.dx * (C / 2 - 0.02), y: 1.45, z: z + e.dz * (C / 2 - 0.02) }, rotation: { lookAt: { x: x - e.dx * C, y: 1.45, z: z - e.dz * C } }, vector: chalk("i smell fries. why do i smell fries") });
}
function layRelay(ctx) {
  const { ends } = plan(), e = ends[NOTES.length + 3] ?? ends[ends.length - 1]; if (!e) return;
  const x = cx(e.i) - e.dx * 0.9 + e.dz * 0.55, z = cz(e.j) - e.dz * 0.9 - e.dx * 0.55;
  const existing = ctx.place.objects["l6-meg-relay"];
  if (existing) { existing.feetPosition = { x, y: 0, z }; return; }
  ctx.spawn("l6-meg-relay", {
    tags: ["usable"],
    feetPosition: { x, y: 0, z },
    primitive: { kind: "box", width: 0.42, height: 0.34, depth: 0.28 },
    material: { color: "oklch(0.32 0.03 145)", metalness: 0.5, roughness: 0.55 },
    behavior: "scripts/quest-prop-use.js",
    state: { kind: "l6-meg-relay", name: "M.E.G. Relay Box 6-A", verb: "Pull relay tape", info: "A battery-backed acoustic monitor near the Level 6.1 wire.", tint: "#8fd8ff" },
    children: [{ feetPosition: { x: 0, y: 0.36, z: 0 }, primitive: { kind: "sphere", radius: 0.035 }, material: { color: "#4dff88", emissive: "#4dff88", emissiveIntensity: 3 } }],
  });
}
export function tick(ctx) {
  if (ctx.place.players?.length) kitPass(ctx, "level6"); // every usable answers with its own part, sound and light (scripts/lib/data/usable-kit.json)
  retextureOnce(ctx); // graphics pass: bare props get real surfaces
  if (ctx.place.players?.length) sweepProps(ctx); // props become breakable (scripts/lib/breakables.js)
  restyleSigns(ctx, "level6"); // every sign dressed as its own board (scripts/lib/sign-style.js)
  dressThresholds(ctx); // the ways in and out, dressed with what people left there (scripts/lib/thresholds.js)
  if (!ctx.place.players?.length) return; // empty level: nothing to run (perf)
  const st = ctx.place.state;
  if ((st.builtV ?? 0) < 1) lay(ctx);
  if ((st.builtV ?? 0) < 2) lay2(ctx);
  if ((st.builtV ?? 0) < 3) { lay3(ctx); st.builtV = V; }
  if ((st.snackV ?? 0) < 1) { laySnack(ctx); st.snackV = 1; }
  if ((st.snackV ?? 0) < 3) { layRelay(ctx); st.snackV = 3; }
  // "this changed overnight?": the wall moves only while nobody stands near enough to see it go
  const w = ctx.place.objects["l6-shift"];
  if (w && ctx.now() > (st.shiftAt ?? 0)) {
    const near = ctx.place.players.some((p) => Math.hypot(p.feetPosition.x - w.feetPosition.x, p.feetPosition.z - w.feetPosition.z) < 7);
    if (!near) { const up = !w.state.up; w.state.up = up; w.visible = up; w.physics = up ? "static" : "none"; st.shiftAt = ctx.now() + 40000 + ctx.random() * 40000; }
  }
  // the dark is never quite empty: a sound just behind you, now and then
  for (const p of ctx.place.players) {
    if (ctx.random() > 0.05) continue;
    const yaw = ((p.camera?.rotation?.yaw ?? 0) * Math.PI) / 180, back = 3 + ctx.random() * 4, side = (ctx.random() - 0.5) * 3;
    const at = { x: p.feetPosition.x + Math.sin(yaw) * back + Math.cos(yaw) * side, y: 1.2, z: p.feetPosition.z + Math.cos(yaw) * back - Math.sin(yaw) * side };
    const mimic = ctx.random() < 0.25, clip = mimic ? VO(MIMIC, MIMIC_LINES[Math.floor(ctx.random() * MIMIC_LINES.length)]) : WHISPERS[Math.floor(ctx.random() * WHISPERS.length)]; // a quarter of the time it's a voice. it learned it from someone
    ctx.emit("playSound", { clip, position: at, volume: mimic ? 0.4 : 0.5, refDistance: 2, maxDistance: 14 }, { audience: { player: p.id } });
  }
}
