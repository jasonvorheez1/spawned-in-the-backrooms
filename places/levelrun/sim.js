// Level ! ("Run for Your Life!") Chapter 2 Finale.
// Intake room (door slam + chained door horde breach) -> 200m crimson corridor with Agility obstacles & chasing wave
// -> collapse at z <= -198 -> Phoebe's spatial ward rescue into the quiet Safe Alcove (x: 80, z: 0).
import { CORRIDOR, OBSTACLES, stepHordeZ } from "../../scripts/lib/levelrun-mechanics.js";
import { LRUN_INTRO_LEN, LRUN_RESCUE_LEN, startIntroCut, startRescueCut, finishRescueToAlcove } from "../../scripts/lib/levelrun-cut.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook } from "../../scripts/lib/clothes.js";
import { npcState } from "../../scripts/lib/stats.js";
import { heard } from "../../scripts/lib/hear.js";
import { spawnPhoebe } from "../../scripts/lib/phoebe.js";

import { dressWorld } from "../../scripts/lib/levelrun-dress.js";
const CHASE_THEME = "/cdn/music-run-for-your-life-r4zcn4il.mp3"; // the creator's upload

export const cadence = "100ms";

const box = (w, h, d) => ({ kind: "box", width: w, height: h, depth: d });
const MAT = {
  floor: { color: "#21090c", roughness: 0.35, metalness: 0.1 },
  wainscot: { color: "#360c12", roughness: 0.65 },
  wall: { color: "#190709", roughness: 0.85 },
  ceiling: { color: "#100507", roughness: 0.9 },
  steel: { color: "#4e535c", metalness: 0.7, roughness: 0.35 },
  gurneyPad: { color: "#6c7c72", roughness: 0.7 },
  cartBody: { color: "#b6bec4", roughness: 0.45, metalness: 0.35 },
  cartRed: { color: "#8f191d", roughness: 0.4 },
  spill: { color: "#290406", roughness: 0.08, metalness: 0.35, opacity: 0.88, transparent: true },
  barrier: { color: "#783112", roughness: 0.65, metalness: 0.2 },
  doorDark: { color: "#281c1d", roughness: 0.55, metalness: 0.25 },
  chain: { color: "#34373c", metalness: 0.85, roughness: 0.3 },
  alcoveFloor: { color: "#c9c4b5", roughness: 0.65 },
  alcoveWall: { color: "#dcd7c8", roughness: 0.85 },
  alcoveTrim: { color: "#8a9198", roughness: 0.55 },
};

const HOUND_MODEL = "/cdn/value.180d1072a97d34551e1394960b70202777c9d0b51fb0ca67779a59e429ef6fa7.glb";
const PARTYGOER_MODEL = "/cdn/value.88565cb1c1182076aa2208922668d2ff4f3349f2e4f1bf06623d5a514653f438.glb";

const HORDE_MEMBERS = [
  { id: "lrun-pursuer-1", kind: "hound", dx: -1.4, dz: 0.0 },
  { id: "lrun-pursuer-2", kind: "hound", dx: 1.3, dz: 0.7 },
  { id: "lrun-pursuer-3", kind: "stalker", dx: -0.35, dz: 1.3 },
  { id: "lrun-pursuer-4", kind: "stalker", dx: 0.6, dz: 2.0 },
  { id: "lrun-pursuer-5", kind: "smiler", dx: -1.9, dz: 2.5 },
];

const PHOEBE_LOOK = npcLook("phoebe-lrun", {
  species: "cat",
  sex: "f",
  eye: "#ffd166",
  belly: "#f4ede2",
  nose: "#2b2523",
  topw: "coat",
  top: "#d9a726",
  botw: "pants",
  bottom: "#23262e",
  shoes: "boots",
  shoec: "#1a1715",
  expr: "calm",
}, "none", 12, "wanderer");

function layWorld(ctx) {
  const bx = (id, x, y, z, w, h, d, material, extra = {}) =>
    ctx.spawn(id, {
      feetPosition: { x, y, z },
      primitive: box(w, h, d),
      material,
      physics: extra.physics === undefined ? "static" : extra.physics,
      castShadow: false,
      receiveShadow: true,
      ...extra,
    });

  // 1. Arrival markers
  ctx.spawn("lrun-start", { feetPosition: { x: 0, y: 0.1, z: 1.5 }, rotation: { yaw: 0 } });
  ctx.spawn("lrun-alcove", { feetPosition: { ...CORRIDOR.safePos }, rotation: { yaw: CORRIDOR.safeYaw } });

  // 2. Starting hospital intake chamber (z = 4.9 to -5.5, x = -4.2 to 4.2)
  bx("lrun-intake-floor", 0, -0.05, -0.3, 8.8, 0.1, 10.6, MAT.floor);
  bx("lrun-intake-ceil", 0, 3.7, -0.3, 8.8, 0.15, 10.6, MAT.ceiling);
  bx("lrun-intake-back", 0, 0, 4.9, 8.8, 3.7, 0.25, MAT.wall);
  bx("lrun-intake-left", -4.2, 0, -0.3, 0.25, 3.7, 10.6, MAT.wall);
  bx("lrun-intake-right", 4.2, 0, -0.3, 0.25, 3.7, 10.6, MAT.wall);
  bx("lrun-intake-front-l", -3.6, 0, -5.5, 1.3, 3.7, 0.25, MAT.wall);
  bx("lrun-intake-front-r", 3.6, 0, -5.5, 1.3, 3.7, 0.25, MAT.wall);
  bx("lrun-intake-front-hdr", 0, 3.1, -5.5, 6.2, 0.7, 0.25, MAT.wall);

  // Entry threshold door that slams shut in the intro
  ctx.spawn("lrun-entry-door", {
    feetPosition: { x: -3.95, y: 0, z: 1.5 },
    rotation: { yaw: 32 },
    primitive: box(0.12, 2.35, 1.25),
    material: MAT.doorDark,
    physics: "static",
    children: [
      { feetPosition: { x: 0.08, y: 1.05, z: 0 }, primitive: box(0.05, 0.09, 0.9), material: MAT.steel },
      { feetPosition: { x: 0.06, y: 1.65, z: 0 }, primitive: box(0.06, 0.42, 0.36), material: { color: "#2d0709", emissive: "#550909", emissiveIntensity: 1.1 } },
    ],
  });

  // Chained steel double doors behind the player (+Z) where the horde tears through
  ctx.spawn("lrun-chain-door", {
    feetPosition: { x: 0, y: 0, z: 4.65 },
    primitive: box(2.5, 2.55, 0.14),
    material: MAT.doorDark,
    physics: "static",
    children: [
      { feetPosition: { x: 0, y: 1.28, z: -0.09 }, primitive: box(2.52, 0.08, 0.04), material: MAT.steel },
      { feetPosition: { x: 0, y: 1.48, z: -0.11 }, rotation: { roll: 18 }, primitive: box(2.3, 0.09, 0.06), material: MAT.chain },
      { feetPosition: { x: 0, y: 1.12, z: -0.11 }, rotation: { roll: -18 }, primitive: box(2.3, 0.09, 0.06), material: MAT.chain },
      { feetPosition: { x: 0, y: 1.3, z: -0.15 }, primitive: box(0.18, 0.26, 0.08), material: { color: "#8c6b28", metalness: 0.8, roughness: 0.35 } },
    ],
  });

  // Ward bulkhead gate (dropped at chase start so intro plays cleanly)
  bx("lrun-ward-gate", 0, 0, -5.45, 5.8, 3.2, 0.2, MAT.steel);

  // Red "!" warning sign above corridor mouth facing player (+Z)
  ctx.spawn("lrun-bang-sign", {
    feetPosition: { x: 0, y: 2.75, z: -5.22 },
    castShadow: false,
    vector: "<svg viewBox='0 0 380 140' width='1.75m'><rect x='3' y='3' width='374' height='134' rx='8' fill='#140204' stroke='#ff2222' stroke-width='5'/><text x='56' y='105' text-anchor='middle' font-family='sans-serif' font-size='104' font-weight='900' fill='#ff2626'>!</text><text x='228' y='62' text-anchor='middle' font-family='sans-serif' font-size='32' font-weight='bold' fill='#ffdddd'>LEVEL !</text><text x='228' y='106' text-anchor='middle' font-family='sans-serif' font-size='24' font-weight='bold' fill='#ff4f4f'>RUN FOR YOUR LIFE</text></svg>",
  });

  // Intake crimson point lamp + klaxon loop
  ctx.spawn("lrun-intake-light", {
    feetPosition: { x: 0, y: 3.1, z: 0 },
    light: { kind: "point", color: "#ff2020", intensity: 4.2, distance: 15, shadow: { enabled: false } },
    children: [{ feetPosition: { x: 0, y: 0.35, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.14, radiusBottom: 0.18, height: 0.18 }, material: { color: "#ff3030", emissive: "#ff1a1a", emissiveIntensity: 3 } }],
  });

  // 3. 208m Crimson Hospital Corridor (z = -5.5 down to -213.5) in modular 26m chunks
  const CHUNK_LEN = 26;
  for (let i = 0; i < 8; i++) {
    const z0 = CORRIDOR.corridorStartZ - i * CHUNK_LEN;
    const zc = z0 - CHUNK_LEN / 2;
    bx(`lrun-fl-${i}`, 0, -0.05, zc, CORRIDOR.width, 0.1, CHUNK_LEN + 0.1, MAT.floor);
    bx(`lrun-ce-${i}`, 0, CORRIDOR.height, zc, CORRIDOR.width + 0.4, 0.12, CHUNK_LEN + 0.1, MAT.ceiling);
    bx(`lrun-wl-${i}`, -CORRIDOR.halfW - 0.12, 0, zc, 0.25, CORRIDOR.height, CHUNK_LEN + 0.1, MAT.wall);
    bx(`lrun-wr-${i}`, CORRIDOR.halfW + 0.12, 0, zc, 0.25, CORRIDOR.height, CHUNK_LEN + 0.1, MAT.wall);
    bx(`lrun-wll-${i}`, -CORRIDOR.halfW + 0.02, 0, zc, 0.04, 1.15, CHUNK_LEN, MAT.wainscot, { physics: undefined });
    bx(`lrun-wlr-${i}`, CORRIDOR.halfW - 0.02, 0, zc, 0.04, 1.15, CHUNK_LEN, MAT.wainscot, { physics: undefined });
  }

  // Far corridor end cap behind EXIT doors
  bx("lrun-far-wall", 0, 0, -213.6, CORRIDOR.width + 0.5, CORRIDOR.height, 0.3, MAT.wall);

  // Side ward doors + crimson emergency lights every 14m down the run
  for (let i = 0; i < 15; i++) {
    const z = -11 - i * 14;
    const side = i % 2 === 0 ? -1 : 1;
    bx(`lrun-sidedoor-${i}`, side * (CORRIDOR.halfW - 0.01), 0, z, 0.08, 2.25, 1.05, MAT.doorDark, { physics: undefined });
    ctx.spawn(`lrun-strobe-${i}`, {
      feetPosition: { x: 0, y: 3.15, z },
      physics: "none",
      castShadow: false,
      visibleRange: { max: 48 },
      light: { kind: "point", color: i % 3 === 1 ? "#ff4020" : "#ff1515", intensity: 4.0, distance: 17, shadow: { enabled: false } },
      children: [{ feetPosition: { x: 0, y: 0.32, z: 0 }, primitive: box(0.45, 0.09, 0.14), material: { color: "#ff2a2a", emissive: "#ff1a1a", emissiveIntensity: 3.2 } }],
    });
  }

  // 4. Agility Obstacles from levelrun-mechanics.js
  for (const o of OBSTACLES) {
    if (o.kind === "gurney") {
      // Lower chassis keeps capsule physics fair to vault while visual handles give height cues
      bx(o.id, o.x, 0, o.z, o.w, 0.54, o.d, MAT.steel, {
        children: [
          { feetPosition: { x: 0, y: 0.56, z: 0 }, primitive: box(o.w - 0.08, 0.12, o.d - 0.06), material: MAT.gurneyPad },
          { feetPosition: { x: -o.w * 0.44, y: 0.72, z: 0 }, primitive: box(0.05, 0.16, o.d * 0.8), material: MAT.steel },
          { feetPosition: { x: o.w * 0.44, y: 0.72, z: 0 }, primitive: box(0.05, 0.16, o.d * 0.8), material: MAT.steel },
        ],
      });
    } else if (o.kind === "cart") {
      bx(o.id, o.x, 0, o.z, o.w, o.h, o.d, MAT.cartBody, {
        children: [
          { feetPosition: { x: 0, y: o.h + 0.1, z: 0 }, primitive: box(o.w * 0.55, 0.22, o.d * 0.65), material: MAT.cartRed },
        ],
      });
    } else if (o.kind === "spill") {
      bx(o.id, o.x, 0.005, o.z, o.w, 0.025, o.d, MAT.spill, { physics: undefined });
    } else {
      bx(o.id, o.x, 0, o.z, o.w, o.h, o.d, MAT.barrier);
    }
  }

  // 5. Collapse girder & unreachable EXIT beacon at z = -210
  bx("lrun-collapse-beam", 0, 2.9, CORRIDOR.collapseZ - 0.6, CORRIDOR.width - 0.4, 0.35, 0.45, MAT.steel, {
    physics: undefined,
    rotation: { roll: 6 },
  });
  bx("lrun-exit-door-frame", 0, 0, CORRIDOR.exitZ - 1.2, 2.6, 2.45, 0.2, { color: "#1d3328", metalness: 0.4, roughness: 0.5 });
  ctx.spawn("lrun-exit-sign", {
    feetPosition: { x: 0, y: 2.68, z: CORRIDOR.exitZ + 0.1 },
    castShadow: false,
    light: { kind: "point", color: "#5cff99", intensity: 2.6, distance: 12, shadow: { enabled: false } },
    vector: "<svg viewBox='0 0 260 110' width='1.35m'><rect x='4' y='4' width='252' height='102' rx='6' fill='#092414' stroke='#7cffae' stroke-width='5'/><text x='130' y='74' text-anchor='middle' font-family='sans-serif' font-size='56' font-weight='900' fill='#8cffba'>EXIT</text></svg>",
  });

  // 6. Quiet Safe Liminal Alcove (CORRIDOR.safePos = { x: 80, y: 0.1, z: 0 })
  const AX = CORRIDOR.safePos.x;
  bx("lrun-alcove-floor", AX, -0.05, 0, 12.2, 0.1, 9.2, MAT.alcoveFloor);
  bx("lrun-alcove-ceil", AX, 3.6, 0, 12.2, 0.15, 9.2, MAT.alcoveWall);
  bx("lrun-alcove-back", AX - 6.0, 0, 0, 0.25, 3.6, 9.2, MAT.alcoveWall);
  bx("lrun-alcove-east", AX + 6.0, 0, 0, 0.25, 3.6, 9.2, MAT.alcoveWall);
  bx("lrun-alcove-north", AX, 0, -4.5, 12.2, 3.6, 0.25, MAT.alcoveWall);
  bx("lrun-alcove-south", AX, 0, 4.5, 12.2, 3.6, 0.25, MAT.alcoveWall);
  ctx.spawn("lrun-alcove-light", {
    feetPosition: { x: AX + 1.2, y: 3.15, z: 0 },
    light: { kind: "point", color: "#fff4d9", intensity: 2.6, distance: 16, shadow: { enabled: false } },
    children: [{ feetPosition: { x: 0, y: 0.32, z: 0 }, primitive: box(1.2, 0.05, 0.45), material: { color: "#fffdf5", emissive: "#fff4d2", emissiveIntensity: 2.0 } }],
  });
  // Soft lingering ward sigil on the west alcove threshold
  ctx.spawn("lrun-alcove-ward", {
    feetPosition: { x: AX - 5.6, y: 1.35, z: 0 },
    rotation: { yaw: 90 },
    light: { kind: "point", color: "#a480ff", intensity: 1.2, distance: 5.5, shadow: { enabled: false } },
    primitive: { kind: "cylinder", radiusTop: 0.55, radiusBottom: 0.55, height: 0.04 },
    material: { color: "#8c66ff", emissive: "#a480ff", emissiveIntensity: 1.5, opacity: 0.35, transparent: true },
    physics: undefined,
  });

  // Safe Alcove Exit Door -> level11#l11-from-levelrun
  ctx.spawn("lrun-to-l11", {
    tags: ["usable"],
    feetPosition: { x: AX + 5.78, y: 0, z: 0 },
    rotation: { yaw: 90 },
    primitive: box(1.25, 2.35, 0.14),
    material: { color: "#dfe6dc", roughness: 0.55 },
    physics: "static",
    behavior: "scripts/l11-ch2-drop.js",
    state: {
      kind: "levelrun-exit",
      name: "Clinic Service Door · Level 11",
      verb: "Return to Level 11",
    },
    children: [
      { feetPosition: { x: 0.42, y: 1.05, z: -0.09 }, primitive: box(0.18, 0.05, 0.05), material: MAT.alcoveTrim },
    ],
  });

  // Ambient hospital alarm tone
  ctx.spawn("lrun-klaxon-amb", {
    feetPosition: { x: 0, y: 2.5, z: -40 },
    audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-distant-industrial-siren-drone-loop.mp3", loop: true, gain: 0.24, spatial: true, maxDistance: 120 },
  });
}

function ensureHorde(ctx, z0) {
  const obj = ctx.place.objects ?? {};
  for (const m of HORDE_MEMBERS) {
    if (obj[m.id]) continue;
    const at = { x: m.dx, y: 0.1, z: z0 + m.dz };
    if (m.kind === "hound") {
      ctx.spawn(m.id, {
        tags: ["lrun-horde"],
        feetPosition: at,
        rotation: { yaw: 0 },
        model: { id: HOUND_MODEL, forward: "-z" },
        scale: 1.15,
        physics: "none",
      });
    } else if (m.kind === "stalker") {
      ctx.spawn(m.id, {
        tags: ["lrun-horde"],
        feetPosition: at,
        rotation: { yaw: 0 },
        model: { id: PARTYGOER_MODEL, forward: "-z" },
        material: { color: "#140406", roughness: 0.9 },
        physics: "none",
      });
    } else {
      ctx.spawn(m.id, {
        tags: ["lrun-horde"],
        feetPosition: at,
        rotation: { yaw: 0 },
        primitive: { kind: "scripted", script: "scripts/levelrun-geo.js", params: { part: "smiler" } },
        material: { color: "#050203", roughness: 1 },
        physics: "none",
        children: [
        ],
      });
    }
  }
}

function syncAlcovePhoebe(ctx, players) {
  const needPhoebe = players.some((p) => p.state?.lrunRescued && !p.state?.ch2Done);
  const existing = ctx.place.objects?.["phoebe-lrun"];
  if (!needPhoebe) {
    if (existing) ctx.destroy("phoebe-lrun");
    return;
  }
  if (!existing) {
    // the same Phoebe body every cut uses (scripts/lib/phoebe.js), here shared and talkable
    spawnPhoebe(ctx, "phoebe-lrun", { x: CORRIDOR.safePos.x + 2.8, y: 0.1, z: -1.1 }, 65, undefined, undefined, {
      audience: "near",
      lifetime: undefined,
      tags: ["npc", "phoebe"],
      physics: "character",
      behavior: ["scripts/talk.js"],
      state: {
        name: "Phoebe",
        dlg: "phoebe-lrun",
        voice: "phoebe-lrun",
        role: "wanderer",
        faction: "none",
        essential: true,
        ...npcState(ctx, "wanderer", 220),
      },
    });
  } else if (existing.state?.leaveAt && ctx.now() >= existing.state.leaveAt) {
    ctx.destroy("phoebe-lrun");
  }
}

export function tick(ctx) {
  const st = ctx.place.state;
  if (!st.seeded || !("lrun-intake-floor" in (ctx.place.objects ?? {}))) {
    st.seeded = 1;
    st.chase = { active: false, hordeZ: 4.5, gateOpen: false, lastHitAt: 0, roarAt: 0 };
    layWorld(ctx);
  }
  dressWorld(ctx);
  // the way on: an ordinary cream hospital door in the alcove's south wall, into Level 109 (shelly Nov 14)
  if (!("lrun-to-l109" in (ctx.place.objects ?? {}))) ctx.spawn("lrun-to-l109", {
    tags: ["usable"], feetPosition: { x: CORRIDOR.safePos.x - 2, y: 0, z: 4.34 },
    primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { style: "metal", part: "set", w: 1.2, h: 2.3, seed: 109 } }, material: { pbr: true, color: "oklch(0.9 0.045 92)" },
    physics: "static", behavior: "scripts/l11-ch2-drop.js", state: { kind: "levelrun-to-109", name: "Unmarked Door", verb: "Open" },
    children: [{ feetPosition: { x: 0, y: 2.55, z: -0.5 }, light: { kind: "point", color: "#fff1d0", intensity: 1.1, distance: 4.5, shadow: { enabled: false } } }],
  });

  const players = ctx.place.players ?? [];
  if (!players.length) return;

  syncAlcovePhoebe(ctx, players);

  const chase = (st.chase ??= { active: false, hordeZ: 4.5, gateOpen: false, lastHitAt: 0, roarAt: 0 });
  const now = ctx.now();
  const dt = Math.max(0.05, Math.min(0.25, (now - (st.lastTickAt ?? now - 100)) / 1000));
  st.lastTickAt = now;

  // Toggle ward bulkhead gate open when no active intro lock is holding it shut
  const introHolding = players.some((p) => p.state?.lrunCut?.phase === "intro");
  const gate = ctx.place.objects?.["lrun-ward-gate"];
  if (gate) {
    const wantY = introHolding && !chase.gateOpen ? 0 : 3.45;
    if (Math.abs((gate.feetPosition?.y ?? 0) - wantY) > 0.1) {
      gate.feetPosition = { x: 0, y: wantY, z: -5.45 };
    }
  }

  // Trigger intro once for fresh runners arriving in intake
  for (const p of players) {
    const ps = p.state ?? {};
    if (ps.dead) continue;
    if (ps.lrunCut?.phase === "rescue" && now - (ps.lrunCut.at ?? 0) >= LRUN_RESCUE_LEN * 1000 + 600) {
      finishRescueToAlcove(ctx, p, null);
      continue;
    }
    if (ps.menuOpen) continue;
    // the intro cut is played by the player's own main-menu tick; when it never runs (story off, a stalled load), let them go after its length
    if (ps.lrunCut?.phase === "intro" && now - (ps.lrunCut.at ?? 0) > (LRUN_INTRO_LEN + 3) * 1000) {
      ps.lrunCut = null; ps.lrunIntroDone = 1;
      for (const id of ["lrun-entry-door", "lrun-chain-door"]) { const d = ctx.place.objects?.[id]; if (d) d.rotation = { yaw: 0 }; }
      chase.gateOpen = true;
      continue;
    }
    if (ps.lrunRescued) {
      // If somehow reloaded on corridor floor instead of Safe Alcove, move cleanly to alcove
      if ((p.feetPosition?.x ?? 0) < 40) {
        p.feetPosition = { ...CORRIDOR.safePos };
        p.velocity = { x: 0, y: 0, z: 0 };
      }
      continue;
    }

    if (!ps.lrunIntroDone && !ps.lrunCut) {
      chase.active = false;
      chase.gateOpen = false;
      chase.hordeZ = 4.5;
      ctx.music.stop({ fade: 0.8 });
      startIntroCut(ctx, p);
      continue;
    }

    // Active runner in corridor
    if (!ps.lrunCut && ps.lrunIntroDone && (p.feetPosition?.z ?? 0) <= CORRIDOR.corridorStartZ) {
      // Final collapse & Phoebe rescue threshold
      if (p.feetPosition.z <= CORRIDOR.collapseZ) {
        chase.active = false;
        ctx.music.stop({ fade: 1.5 });
        const beam = ctx.place.objects?.["lrun-collapse-beam"];
        if (beam) beam.feetPosition = { x: 0, y: 0.72, z: CORRIDOR.collapseZ - 0.5 };
        // the ceiling gives: steel beam slam over a long concrete rumble, the hall shakes
        heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-steel-beam-crashes-onto-concrete-floor-clang.mp3", position: { x: 0, y: 1.5, z: CORRIDOR.collapseZ }, volume: 1, maxDistance: 60 });
        heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-concrete-ceiling-collapse-deep-rumble-debris.mp3", position: { x: 0, y: 2.5, z: CORRIDOR.collapseZ - 1 }, volume: 0.95, maxDistance: 80 });
        ctx.emit("screenShake", { intensity: 0.7, duration: 0.9 }, { audience: { player: p.id } });
        startRescueCut(ctx, p);
        continue;
      }

      if (!chase.active) {
        chase.active = true;
        chase.gateOpen = true;
        ctx.music.play(CHASE_THEME, { fade: 0.4, volume: 0.8 }); // Shelly Nov 15: "run for your life" is this level's chase theme
        chase.hordeZ = Math.max(p.feetPosition.z + 11.5, 0.5);
        // the bulkhead rips up and the horde roars through it
        heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-heavy-metal-fire-door-slam-echo.mp3", position: { x: 0, y: 1.5, z: -5.45 }, volume: 1, maxDistance: 60 });
        heard(ctx, { clip: "/cdn/moodboard-gothic-horror/sfx-crowd-of-monsters-roaring-together-in-a-corridor.mp3", position: { x: 0, y: 1.4, z: chase.hordeZ }, volume: 1, maxDistance: 70 });
      }
      // a stampede of feet on wet tile, carried by the horde itself
      const lead = ctx.place.objects?.[HORDE_MEMBERS[0]?.id];
      if (lead && !lead.audio) lead.audio = { clip: "/cdn/moodboard-gothic-horror/sfx-many-heavy-feet-stampeding-on-wet-tile-corridor-loop.mp3", loop: true, gain: 0.5, spatial: true, maxDistance: 40 };

      chase.hordeZ = stepHordeZ(p.feetPosition.z, chase.hordeZ, dt, ps);
      ensureHorde(ctx, chase.hordeZ);
      for (const m of HORDE_MEMBERS) {
        const ent = ctx.place.objects?.[m.id];
        if (ent) {
          ent.feetPosition = { x: m.dx, y: 0.1, z: chase.hordeZ + m.dz };
          ent.rotation = { yaw: 0 };
        }
      }

      if (now - (chase.roarAt ?? 0) >= 1400) {
        chase.roarAt = now;
        heard(ctx, { clip: "/cdn/moodboard-gothic-horror/sfx-hound-bark-howl-call.mp3", position: { x: 0, y: 1.2, z: chase.hordeZ }, volume: 0.9, maxDistance: 55 });
      }

      // Catch/slash pressure if player lingers too long
      const gap = chase.hordeZ - p.feetPosition.z;
      if (gap <= 2.4 && now - (chase.lastHitAt ?? 0) >= 1500) {
        chase.lastHitAt = now;
        const dmg = p.feetPosition.z <= CORRIDOR.collapseZ + 8 ? Math.min(10, Math.max(0, (ps.hp ?? 20) - 6)) : 14;
        if (dmg > 0) ps.hp = Math.max(1, (ps.hp ?? 50) - dmg);
        if (p.feetPosition.z > CORRIDOR.collapseZ + 8 && (ps.hp ?? 10) <= 14) {
          ps.hp = 0; // lethal catch resets cleanly to z = 1.5 intake via player.js respawn
        }
        ctx.emit("screenFlash", { color: "#b30000", duration: 0.35, intensity: 0.65 }, { audience: { player: p.id } });
        ctx.emit("damageNumber", { position: { ...p.feetPosition, y: (p.feetPosition.y ?? 0) + 1.4 }, value: Math.max(1, dmg), color: "#ff4444" }, { audience: { player: p.id } });
        heard(ctx, { clip: "/cdn/moodboard-gothic-horror/sfx-hound-bite-snap.mp3", position: p.feetPosition, volume: 0.95, maxDistance: 24 });
      }
    }
  }
}
