// Level 7 "Thalassophobia" Simulation:
// Wikidot Backrooms Level 7 - An infinite subterranean ocean beneath a towering cavern void.
// Wanderers emerge from the Level 6 staircase landing into the Drowned Parlor atop a basalt sea rock,
// descending weathered stone steps to a dilapidated stilted timber pier stretching into the freezing abyssal sea.
// Channel buoys bob in the swells, and Entity 20 ("The Thing on Level 7") cruises submerged in the bay.

export const cadence = "2s";
const V = 4;
const GONE = ["l7-lantern", "l7-ring", "l7-boat", "l7-chair", "l7-bulb"]; // v1 leftovers

const CONCRETE = {
  color: "oklch(0.48 0.01 240)",
  roughness: 0.95,
  texture: "cdn/texture-smooth-cold-poured-concrete-wall.png",
  repeat: [1, 1],
  wrap: "repeat",
};
const WOOD = {
  color: "oklch(0.36 0.03 60)",
  roughness: 0.9,
  texture: "cdn/texture-weathered-grey-sea-soaked-wood-planks.png",
  repeat: [1, 1],
  wrap: "repeat",
};
const RUST = { color: "oklch(0.38 0.06 45)", metalness: 0.6, roughness: 0.8 };
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const FY = 4.0; // The landing room floor elevation atop the basalt rock
const PY = 1.1; // Pier deck elevation above sea level (y = 0)

const chalk = (text, w = "1.6m") =>
  `<svg viewBox='0 0 320 120' width='${w}'><text x='160' y='65' text-anchor='middle' font-family='sans-serif' font-weight='600' font-size='22' fill='#d8e2e6' fill-opacity='0.85'>${text}</text></svg>`;

const box = (ctx, id, x, y, z, w, h, d, material, extra = {}) =>
  ctx.spawn(id, {
    feetPosition: { x, y, z },
    physics: "static",
    primitive: { kind: "box", width: w, height: h, depth: d },
    material,
    ...extra,
  });

function lay(ctx) {
  // =========================================================================
  // 1. ROOM 1: THE DROWNED PARLOR / STAIR LANDING (Atop Basalt Rock at y = 4)
  // =========================================================================
  // Flooded concrete chamber: 6.4m x 6.4m x 2.8m high
  box(ctx, "l7-floor", 0, FY - 0.3, 0, 6.4, 0.3, 6.4, { color: "oklch(0.42 0.04 75)", roughness: 1, texture: "cdn/texture-soaked-brown-beige-berber-office-carpet.png", repeat: [1, 1], wrap: "repeat" });
  box(ctx, "l7-ceil", 0, FY + 2.7, 0, 6.4, 0.25, 6.4, { ...CONCRETE, color: "oklch(0.36 0.008 240)" });

  // Walls with North doorway opening out to the ocean
  box(ctx, "l7-wall-e", 3.05, FY, 0, 0.3, 2.7, 6.4, CONCRETE);
  box(ctx, "l7-wall-w", -3.05, FY, 0, 0.3, 2.7, 6.4, CONCRETE);
  box(ctx, "l7-wall-n1", -2.0, FY, -3.05, 2.4, 2.7, 0.3, CONCRETE);
  box(ctx, "l7-wall-n2", 2.0, FY, -3.05, 2.4, 2.7, 0.3, CONCRETE);
  box(ctx, "l7-wall-n3", 0, FY + 2.1, -3.05, 1.6, 0.6, 0.3, CONCRETE); // Door lintel North
  box(ctx, "l7-wall-s1", -1.9, FY, 3.05, 2.6, 2.7, 0.3, CONCRETE);
  box(ctx, "l7-wall-s2", 1.9, FY, 3.05, 2.6, 2.7, 0.3, CONCRETE);
  box(ctx, "l7-wall-s3", 0, FY + 2.2, 3.05, 1.2, 0.5, 0.3, CONCRETE); // Door lintel South

  // Ankle-deep seawater puddle on the room floor with rippling water shader
  ctx.spawn("l7-puddle", {
    feetPosition: { x: 0, y: FY + 0.03, z: 0 },
    primitive: { kind: "box", width: 5.8, height: 0.025, depth: 5.8 },
    material: { kind: "water", color: "oklch(0.32 0.04 220)", opacity: 0.78, waveIntensity: 0.2 },
  });

  // Green sea-moss and high-tide watermark line on walls
  for (const [id, x, z, w, d] of [["e", 2.88, 0, 0.02, 5.8], ["w", -2.88, 0, 0.02, 5.8], ["s", 0, 2.88, 5.8, 0.02]]) {
    ctx.spawn(`l7-tide-${id}`, {
      feetPosition: { x, y: FY + 0.32, z },
      primitive: { kind: "box", width: w, height: 0.14, depth: d },
      material: { color: "oklch(0.28 0.03 145)", roughness: 1.0 },
    });
  }

  // Staircase ascending into the darkness back to Level 6 (South)
  for (let k = 0; k < 6; k++) {
    box(ctx, `l7-step-${k}`, 0, FY + k * 0.32, 3.4 + k * 0.32, 1.2, 0.32, 0.34, { ...CONCRETE, color: "oklch(0.29 0.008 240)" });
  }
  box(ctx, "l7-shaft-e", 0.8, FY, 4.4, 0.4, 3.6, 2.4, CONCRETE);
  box(ctx, "l7-shaft-w", -0.8, FY, 4.4, 0.4, 3.6, 2.4, CONCRETE);
  box(ctx, "l7-shaft-top", 0, FY + 2.7, 4.4, 1.2, 1.0, 2.4, CONCRETE);
  box(ctx, "l7-shaft-end", 0, FY, 5.7, 1.2, 3.6, 0.3, { color: "oklch(0.01 0 0)" });

  // Transition trigger to return to Level 6
  ctx.spawn("l7-back", {
    feetPosition: { x: 0, y: FY + 1.2, z: 5.1 },
    physics: { body: "static", trigger: true },
    primitive: { kind: "box", width: 1.2, height: 2.2, depth: 0.8 },
    visible: false,
    behavior: "scripts/level-door.js",
    state: { to: "level6#l6-from-l7" },
  });
  ctx.spawn("l7-back-note", {
    feetPosition: { x: -1.88, y: FY + 1.5, z: 2.85 },
    rotation: { yaw: 180 },
    vector: chalk("↑ 6 · LIGHTS OUT"),
  });

  // Arrival spawn point from Level 6 (facing North toward the sea)
  ctx.spawn("l7-from-l6", {
    feetPosition: { x: 0, y: FY + 0.1, z: 1.4 },
    rotation: { yaw: 180 },
  });

  // Flooded room props
  box(ctx, "l7-crate", -2.1, FY, -1.8, 0.85, 0.65, 0.65, WOOD, {
    tags: ["container"],
    state: { name: "Waterlogged M.E.G. crate", items: "almond,ration,rope,battery" },
  });
  ctx.spawn("l7-tally", {
    feetPosition: { x: 2.88, y: FY + 1.4, z: 0.6 },
    rotation: { yaw: -90 },
    vector: chalk("DAY 9. THE WATER NEVER ENDS"),
  });


  // =========================================================================
  // 2. BASALT ROCK STEPS & TRANSITION DOWN TO PIER
  // =========================================================================
  // Steps descending from the rock top (FY = 4.0) down to the pier deck (PY = 1.1)
  for (let k = 0; k < 6; k++) {
    box(ctx, `l7-rstep-${k}`, 0, FY - 0.5 - k * 0.55, -3.8 - k * 0.9, 1.8, 0.55, 0.95, {
      ...CONCRETE,
      color: "oklch(0.34 0.015 240)",
    });
  }

  // =========================================================================
  // 3. THE WEATHERED STILTED TIMBER PIER (North into the Ocean, z = -9 to -34)
  // =========================================================================
  // Spawn modular high-detail pier sections using l7-ocean-geo.js
  const pierSections = [-12, -18, -24, -30];
  pierSections.forEach((pz, idx) => {
    ctx.spawn(`l7-pier-geo-${idx}`, {
      feetPosition: { x: 0, y: PY, z: pz },
      primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "pier" } },
    });
  });

  // Static collision boxes for the pier deck and safety
  box(ctx, "l7-pier-deck-col", 0, PY - 0.1, -21.5, 3.4, 0.2, 26, {}, { visible: false });
  // Side safety colliders (prevent falling through gaps while exploring)
  box(ctx, "l7-pier-rail-w", -1.6, PY, -21.5, 0.2, 1.2, 26, {}, { visible: false });
  box(ctx, "l7-pier-rail-e", 1.6, PY, -21.5, 0.2, 1.2, 26, {}, { visible: false });

  // Mooring Bollards on the pier
  ctx.spawn("l7-bollard-1", {
    feetPosition: { x: 1.4, y: PY + 0.04, z: -16 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "bollard" } },
  });
  ctx.spawn("l7-bollard-2", {
    feetPosition: { x: 1.4, y: PY + 0.04, z: -31 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "bollard" } },
  });

  // Maritime Lifebuoy Ring mounted on post
  ctx.spawn("l7-lifebuoy", {
    feetPosition: { x: -1.5, y: PY + 0.5, z: -20 },
    rotation: { yaw: 90 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "lifebuoy" } },
  });

  // Ship's Hurricane Storm Lanterns along the wharf
  ctx.spawn("l7-lantern-mid", {
    feetPosition: { x: -1.45, y: PY + 0.88, z: -18 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "lantern" } },
    children: [
      {
        feetPosition: { x: 0, y: 0.22, z: 0 },
        light: { kind: "point", color: "oklch(0.85 0.15 75)", intensity: 1.8, distance: 10 },
      },
    ],
  });
  ctx.spawn("l7-lantern-end", {
    feetPosition: { x: 1.35, y: PY + 0.88, z: -33 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "lantern" } },
    children: [
      {
        feetPosition: { x: 0, y: 0.22, z: 0 },
        light: { kind: "point", color: "oklch(0.88 0.16 75)", intensity: 2.2, distance: 14 },
      },
    ],
  });

  // Chalk warning carved into the wet pierhead timber
  ctx.spawn("l7-pier-note", {
    feetPosition: { x: 0, y: PY + 0.05, z: -32.5 },
    rotation: { pitch: -90, yaw: 180 },
    vector: chalk("IT IS UNDER THE WATER. DO NOT SWIM.", "1.8m"),
  });

  // Weathered Clinker Wooden Rowboat moored alongside the pier
  ctx.spawn("l7-rowboat", {
    feetPosition: { x: 2.5, y: -0.15, z: -31 },
    rotation: { yaw: 14, roll: 3 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "rowboat" } },
  });

  // Pierhead M.E.G. supply cache
  box(ctx, "l7-pier-crate", -0.9, PY + 0.04, -32.5, 0.7, 0.5, 0.5, WOOD, {
    tags: ["container"],
    state: { name: "Salt-crusted maritime locker", items: "almond,battery,bandage" },
  });

  // =========================================================================
  // 4. NAVIGATIONAL CHANNEL WARNING BUOYS (Bobbing out in the bay)
  // =========================================================================
  const buoys = [
    { id: "l7-buoy-1", x: -22, z: -46, phase: 0 },
    { id: "l7-buoy-2", x: 28, z: -72, phase: 1.9 },
    { id: "l7-buoy-3", x: -12, z: -105, phase: 3.5 },
  ];
  buoys.forEach((b) => {
    ctx.spawn(b.id, {
      feetPosition: { x: b.x, y: -0.15, z: b.z },
      primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "buoy" } },
      children: [
        {
          id: `${b.id}-light`,
          feetPosition: { x: 0, y: 2.3, z: 0 },
          light: { kind: "point", color: "oklch(0.85 0.22 45)", intensity: 2.8, distance: 18 },
        },
      ],
    });
  });

  // =========================================================================
  // 5. ENTITY 20: THE THING ON LEVEL 7 (THE LEVIATHAN)
  // =========================================================================
  // Colossal aquatic titan submerged beneath the waves in the bay
  ctx.spawn("l7-leviathan", {
    feetPosition: { x: 30, y: -6.0, z: -75 },
    rotation: { yaw: 70 },
    scale: { x: 6.8, y: 6.8, z: 6.8 },
    model: { id: "/cdn/value.9b4a90ae389f944ed526ecec2050a232d444b96450179d461a5e034d52671d24.glb" },
    children: [
      {
        feetPosition: { x: 0, y: 0.6, z: -1.2 },
        light: { kind: "point", color: "oklch(0.85 0.22 175)", intensity: 5.0, distance: 22 },
      },
      {
        feetPosition: { x: 0.5, y: 0.7, z: -1.1 },
        material: { color: "#ffffff", emissive: "oklch(0.85 0.22 175)", emissiveIntensity: 4.5 },
        primitive: { kind: "sphere", radius: 0.09 },
      },
      {
        feetPosition: { x: -0.5, y: 0.7, z: -1.1 },
        material: { color: "#ffffff", emissive: "oklch(0.85 0.22 175)", emissiveIntensity: 4.5 },
        primitive: { kind: "sphere", radius: 0.09 },
      },
    ],
  });


  // =========================================================================
  // 7. THE ROOM AS THE WIKI KNOWS IT: bookcase left, coffee table, one chair, one fluorescent lamp
  // =========================================================================
  const P5 = (kind) => ({ kind: "scripted", script: "scripts/level5-props-geo.js", params: { kind } });
  ctx.spawn("l7-bookcase", { feetPosition: { x: -2.66, y: FY, z: 0.3 }, rotation: { yaw: -90 }, scale: 0.8, physics: "static", primitive: P5("bookshelf") });
  ctx.spawn("l7-armchair", { feetPosition: { x: 1.7, y: FY, z: 0.2 }, rotation: { yaw: -115 }, scale: 0.8, physics: "static", primitive: P5("armchair") });
  ctx.spawn("l7-table", { feetPosition: { x: 0.5, y: FY, z: -0.6 }, rotation: { yaw: 8 }, physics: "static", primitive: { kind: "scripted", script: "scripts/l7-room-geo.js", params: { kind: "table" } } });
  ctx.spawn("l7-troffer", { feetPosition: { x: 0, y: FY + 2.6, z: 0 }, primitive: { kind: "scripted", script: "scripts/l7-room-geo.js", params: { kind: "troffer" } },
    children: [{ feetPosition: { x: 0, y: -0.15, z: 0 }, light: { kind: "point", color: "oklch(0.93 0.06 95)", intensity: 4.5, distance: 11 } }],
    audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-single-fluorescent-tube-buzzing-hum-loop.mp3", loop: true, gain: 0.12, spatial: true, maxDistance: 9 } });
  // a caged work lamp over the sea door, so the room is a light seen from the water
  ctx.spawn("l7-door-lamp", { feetPosition: { x: 0, y: FY + 2.5, z: -3.32 }, primitive: { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.11, height: 0.18 }, material: { color: "#ffffff", emissive: "oklch(0.88 0.1 80)", emissiveIntensity: 3 },
    children: [{ feetPosition: { x: 0, y: -0.2, z: -0.3 }, light: { kind: "point", color: "oklch(0.85 0.1 75)", intensity: 2, distance: 14 } }] });
  // rust weeping down the outer walls under the roofline
  for (let i = 0; i < 9; i++) { const x = -2.9 + i * 0.72 + ((i * 37) % 7) * 0.04, h = 0.8 + ((i * 53) % 5) * 0.3;
    ctx.spawn(`l7-stain-${i}`, { feetPosition: { x, y: FY + 2.85 - h, z: -3.21 }, primitive: { kind: "box", width: 0.08 + (i % 3) * 0.05, height: h, depth: 0.01 }, material: { color: "oklch(0.3 0.05 50 / 0.7)", transparent: true, roughness: 1 } }); }

  // =========================================================================
  // 8. LEVEL 7 IS A ROOM: the concrete ceiling over the whole sea, the room hanging from it, pillars lost in the fog
  // =========================================================================
  const CEIL = { color: "oklch(0.3 0.008 240)", roughness: 0.95, texture: "cdn/texture-smooth-cold-poured-concrete-wall.png", repeat: [0.25, 0.25], wrap: "repeat" };
  ctx.spawn("l7-sky-ceiling", { feetPosition: { x: 0, y: 34, z: -100 }, primitive: { kind: "box", width: 1600, height: 3, depth: 1600 }, material: CEIL, castShadow: false });
  ctx.spawn("l7-hanger", { feetPosition: { x: 0, y: FY + 2.85, z: 1 }, primitive: { kind: "box", width: 6.4, height: 34 - FY - 2.85, depth: 9 }, material: { ...CEIL, color: "oklch(0.33 0.008 240)" }, castShadow: false });
  [[-140, -160, 14], [120, -230, 18], [-60, -330, 22], [210, -60, 16], [-230, -40, 16], [40, -420, 24]].forEach(([x, z, w], i) =>
    ctx.spawn(`l7-pillar-${i}`, { feetPosition: { x, y: -30, z }, primitive: { kind: "box", width: w, height: 64, depth: w }, material: CEIL, castShadow: false }));

  // =========================================================================
  // 9. THE ROCK: slumped basalt, tar seeping where the wiki says the deep is made of it
  // =========================================================================
  [[-7, -9, 1.4], [6, 8, 1], [-14, 8, 1.8], [12, -4, 0.9]].forEach(([x, z, r], i) =>
    ctx.spawn(`l7-tar-${i}`, { feetPosition: { x, z, y: { terrain: 0.02 } }, primitive: { kind: "cylinder", radiusTop: r, radiusBottom: r * 1.05, height: 0.04 }, scale: { x: 1, y: 1, z: 0.65 }, material: { color: "oklch(0.1 0.01 60)", roughness: 0.08, metalness: 0.2 } }));

  // =========================================================================
  // 6. SPATIAL MARITIME AUDIO BEDS
  // =========================================================================
  ctx.spawn("l7-sea-bed", {
    feetPosition: { x: 0, y: 2, z: -18 },
    audio: {
      clip: G("vast-open-ocean-waves-rolling-under-overcast-sky-loop"),
      loop: true,
      gain: 0.32,
      spatial: false,
    },
  });
  ctx.spawn("l7-waves-rock", {
    feetPosition: { x: 0, y: 0.5, z: -8 },
    audio: {
      clip: G("heavy-waves-slapping-wet-rocks-and-pier-posts-loop"),
      loop: true,
      gain: 0.55,
      spatial: true,
      refDistance: 12,
      maxDistance: 45,
    },
  });
}

export function tick(ctx) {
  const s = ctx.place.state;
  if ((s.builtV ?? 0) < V) {
    for (const id of Object.keys(ctx.place.objects)) if (GONE.includes(id) || /^l7-(plank|post)-/.test(id)) ctx.destroy(id);
    lay(ctx);
    s.builtV = V;
  }

  const now = ctx.now();

  // 1. DYNAMIC OCEAN WATER BOBBING & SWELL
  // Clinker rowboat bobs and sways with the wave period
  const boat = ctx.getObject("l7-rowboat");
  if (boat) {
    const bob = Math.sin(now * 0.0016) * 0.07;
    const roll = Math.cos(now * 0.0012) * 2.8;
    const yawDrift = Math.sin(now * 0.0008) * 1.6;
    boat.feetPosition = { x: 2.5, y: -0.15 + bob, z: -31 };
    boat.rotation = { yaw: 14 + yawDrift, roll: 3 + roll };
  }

  // Warning Buoys bob and pitch with phase offsets
  const buoys = [
    { id: "l7-buoy-1", x: -22, z: -46, phase: 0 },
    { id: "l7-buoy-2", x: 28, z: -72, phase: 1.9 },
    { id: "l7-buoy-3", x: -12, z: -105, phase: 3.5 },
  ];
  buoys.forEach((b) => {
    const buoy = ctx.getObject(b.id);
    if (buoy) {
      const bob = Math.sin(now * 0.002 + b.phase) * 0.09;
      const pitch = Math.sin(now * 0.0018 + b.phase) * 4.5;
      const roll = Math.cos(now * 0.0015 + b.phase) * 4.5;
      buoy.feetPosition = { x: b.x, y: -0.15 + bob, z: b.z };
      buoy.rotation = { pitch, roll };
    }
  });

  // 2. THE THING (ENTITY 20) SLOW AQUATIC CRUISE
  // Moves smoothly in a colossal oceanic patrol arc in the deep bay
  const lev = ctx.getObject("l7-leviathan");
  if (lev) {
    const angle = now * 0.00028;
    const lx = 26 + Math.cos(angle) * 14;
    const lz = -75 + Math.sin(angle) * 18;
    const ly = -6.0 + Math.sin(now * 0.0007) * 0.7;
    lev.feetPosition = { x: lx, y: ly, z: lz };
    lev.rotation = { yaw: (-angle * 57.2958) + 90 };
  }

  // 3. PERIODIC DISTANT WHALE GROAN FROM THE DEEP
  if (ctx.place.playerCount && now > (s.groanAt ?? 0)) {
    if (s.groanAt) {
      ctx.emit("playSound", {
        clip: G("deep-whale-like-groan-from-far-under-dark-water"),
        position: { x: 50, y: -10, z: -120 },
        volume: 0.75,
        refDistance: 100,
        maxDistance: 600,
      });
    }
    s.groanAt = now + 65000 + ctx.random() * 65000;
  }

  // 4. THALASSOPHOBIA OBSERVATION AT PIERHEAD
  // When a wanderer reaches the end of the pier and gazes into the dark abyss
  for (const p of ctx.place.players) {
    if (p.feetPosition.z < -28) {
      s.thalClock ??= {};
      const last = s.thalClock[p.id] ?? 0;
      if (now - last > 90000) {
        s.thalClock[p.id] = now;
        p.state.notice = {
          text: "A colossal shadow moves through the black water beneath the waves. The Thing on Level 7 watches.",
          at: now,
        };
        p.state.sanity = Math.max(0, (p.state.sanity ?? 100) - 8);
        ctx.emit("screenShake", { intensity: 0.18, duration: 1.2 }, { audience: { player: p.id } });
      }
    }
  }
}
