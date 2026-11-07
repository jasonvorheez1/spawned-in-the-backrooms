// Level 5 "Terror Hotel": lays the shell, every lamp, the radios, the ways in and out and the sound beds once
// (place.state.builtV). The plan is scripts/lib/level5.js.
// Also lays Samantha (the Beverly Room psychic cat), M.E.G. Outpost Housekeeping, Homely Hotel's concierge and chef,
// library bookshelves, front desk, grand piano, guest doors with authentic placards, and roaming creatures.
import { ZONES, EXITS, ARRIVALS, LIGHTS, RADIOS, PLACARDS, OPENINGS, POLONAISE } from "../../scripts/lib/level5.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook } from "../../scripts/lib/clothes.js";
import MEG from "../../scripts/lib/data/meg.yml";
import { npcState } from "../../scripts/lib/stats.js";
import { weaponBody } from "../../scripts/lib/weapon-look.js";

export const cadence = "1s";
const V = 2;
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const plate = (text, sub, bg = "#2a1c12", fg = "#e8c983") => `<div face="front" width="1.2m" style="font-family:serif;text-align:center;color:${fg};background:${bg};border:14px solid #8a6a2a;padding:18px 10px;line-height:1.05"><div style="font-size:130px;font-weight:900;letter-spacing:10px">${text}</div>${sub ? `<div style="font-size:64px;font-style:italic;opacity:.85">${sub}</div>` : ""}</div>`;
function fwd(yaw) { const r = (yaw * Math.PI) / 180; return { x: -Math.sin(r), z: -Math.cos(r) }; } // a yaw's front (-Z) direction

const RESIDENTS = {
  "hk-constance": {
    name: "Constance · Housekeeping Quartermaster",
    role: "quarter",
    voice: "ito",
    gun: "wrench",
    at: [0, 18],
    yaw: 0,
    faction: "meg",
    look: { species: "cat", sex: "f", topw: "jacket", top: "#e0e4e8", botw: "skirt", bottom: "#2b2e38", shoes: "boots", shoec: "#1f1d1a", hat: "beret", hatc: "#3e4856", expr: "smile" },
  },
  "hk-vance": {
    name: "Vance · Boiler Room Scout",
    role: "scout",
    voice: "ale",
    gun: "pipe_scrap",
    at: [10, 18.5],
    yaw: -90,
    faction: "meg",
    look: { species: "dog", sex: "m", topw: "vest", top: "#b87030", botw: "pants", bottom: "#323028", shoes: "boots", shoec: "#1c1b18", hat: "cap", hatc: "#42382c", expr: "frown" },
  },
  "homely-barnaby": {
    name: "Barnaby · Hotel Concierge",
    role: "quarter",
    voice: "callum",
    gun: "wrench",
    at: [-43.6, 0.4],
    yaw: 90,
    faction: "homely",
    look: { species: "dog", sex: "m", topw: "vest", top: "#6a1b24", botw: "pants", bottom: "#22201d", shoes: "boots", shoec: "#151515", hat: "cap", hatc: "#6a1b24", expr: "smile" },
  },
  "homely-auguste": {
    name: "Auguste · Dining Room Chef",
    role: "trader",
    voice: "callum",
    gun: "knife",
    at: [-10, 18.5],
    yaw: 0,
    faction: "homely",
    look: { species: "bear", sex: "m", topw: "jacket", top: "#f4f4f0", botw: "pants", bottom: "#2e2e2e", shoes: "boots", shoec: "#22201c", expr: "smile" },
  },
};

export function lay(ctx) {
  if (!ctx.getObject("l5-geo")) {
    ctx.spawn("l5-geo", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level5-geo.js" }, material: { roughness: 0.85 } });
  }

  // Lights
  LIGHTS.forEach((l, i) => {
    if (!ctx.getObject(`l5-light-${i}`)) {
      ctx.spawn(`l5-light-${i}`, { tags: ["l5-light", `l5-fix-${l.kind}`], feetPosition: { x: l.x, y: l.y, z: l.z }, state: { kind: l.kind },
        light: { kind: "point", color: l.color, intensity: l.intensity, distance: l.distance, shadow: { enabled: l.kind === "chandelier" && l.intensity >= 14 } } });
    }
  });

  // Radios
  for (const r of RADIOS) {
    if (ctx.getObject(r.id)) continue;
    const track = { clip: POLONAISE, gain: 0.55, loop: true, spatial: true, refDistance: 2, maxDistance: 16, bus: "music" };
    ctx.spawn(r.id, { tags: ["usable", "l5-radio"], feetPosition: { x: r.x, y: r.y, z: r.z }, rotation: { yaw: r.yaw }, physics: "static",
      primitive: { kind: "box", width: 0.46, height: 0.34, depth: 0.24 }, material: { color: "oklch(0.42 0.08 50)", texture: "cdn/texture-worn-hardwood-grain.png", roughness: 0.4 },
      behavior: "scripts/l5-door.js", audio: track,
      state: { kind: "radio", on: true, track, name: "Valve radio", verb: "Switch off", info: `A polonaise, from ${r.where}. Nobody tuned it.`, tint: "#e8c983" } });
  }

  // Exits
  for (const e of EXITS) {
    if (ctx.getObject(e.id)) continue;
    const f = fwd(e.yaw);
    if (e.to) {
      ctx.spawn(e.id, { tags: ["door"], feetPosition: { x: e.at.x + f.x * 0.4, y: 0, z: e.at.z + f.z * 0.4 }, rotation: { yaw: e.yaw }, physics: { body: "static", trigger: true },
        primitive: { kind: "box", width: 1.4, height: 2.4, depth: 0.6 }, visible: false, behavior: "scripts/level-door.js", state: { to: e.to } });
      ctx.spawn(`${e.id}-plate`, { feetPosition: { x: e.at.x + f.x * 0.06, y: 2.55, z: e.at.z + f.z * 0.06 }, rotation: { yaw: e.yaw }, primitive: { kind: "box", width: 1.2, height: 0.36, depth: 0.03 }, material: { color: "oklch(0.25 0.04 50)" },
        ui: plate(e.label, e.kind === "lift" ? "▼ electrical station" : "▲ abandoned office") });
      ctx.spawn(`${e.id}-lamp`, { feetPosition: { x: e.at.x + f.x * 0.8, y: 2.9, z: e.at.z + f.z * 0.8 }, light: { kind: "point", color: "oklch(0.82 0.1 70)", intensity: 2.2, distance: 6 } });
    } else {
      ctx.spawn(e.id, { tags: ["usable", "l5-sealed"], feetPosition: { x: e.at.x + f.x * 0.08, y: 0, z: e.at.z + f.z * 0.08 }, rotation: { yaw: e.yaw }, physics: "static",
        primitive: { kind: "box", width: e.kind === "gate" ? 2.2 : 1.1, height: e.kind === "gate" ? 2.8 : 2.3, depth: 0.12 },
        material: e.kind === "metal" || e.kind === "airlock" ? { color: "oklch(0.5 0.03 40)", texture: "cdn/texture-peeling-white-paint-rusty-steel.png", roughness: 0.55, metalness: 0.6 } : { color: "oklch(0.5 0.06 45)", texture: "cdn/texture-worn-hardwood-grain.png", roughness: 0.55 },
        behavior: "scripts/l5-door.js", state: { kind: "sealed", text: e.sealed, name: e.sealed.split(" · ")[0], verb: "Try the door", info: "It won't open", tint: "#b89b6a", sound: e.kind === "airlock" ? "metal-valve-wheel-creak" : null } });
    }
  }

  for (const [id, a] of Object.entries(ARRIVALS)) {
    if (!ctx.getObject(id)) ctx.spawn(id, { feetPosition: { x: a.x, y: 0.1, z: a.z }, rotation: { yaw: a.yaw } });
  }

  // Sound beds
  if (!ctx.getObject("l5-bed-hum")) ctx.spawn("l5-bed-hum", { feetPosition: { x: -20, y: 2, z: 0 }, audio: { clip: G("old-building-electrical-hum-room-tone-loop"), gain: 0.12, loop: true, spatial: false } });
  if (!ctx.getObject("l5-bed-ball")) ctx.spawn("l5-bed-ball", { feetPosition: { x: 6, y: 2, z: 0 }, audio: { clip: G("distant-party-crowd-murmur-glasses-clink-loop"), gain: 0.35, loop: true, spatial: true, refDistance: 6, maxDistance: 20 } });
  for (const [x, z] of [[26, -14], [38, 0], [26, 14]]) {
    const bid = `l5-bed-boiler-${x}-${z}`;
    if (!ctx.getObject(bid)) ctx.spawn(bid, { feetPosition: { x, y: 2, z }, audio: { clip: G("industrial-boiler-roar-steam-hiss-loop"), gain: 0.5, loop: true, spatial: true, refDistance: 4, maxDistance: 22 } });
  }

  // Samantha: The Beverly Room Psychic Cat
  if (!ctx.getObject("l5-samantha")) {
    ctx.spawn("l5-samantha", {
      tags: ["npc", "samantha", "usable"],
      feetPosition: { x: 6, y: 0.42, z: 2 },
      rotation: { yaw: -130 },
      physics: "character",
      ...critterSpec({
        species: "cat",
        sex: "f",
        fur: "#141418",
        belly: "#101014",
        tip: "#141418",
        eye: "#ffd700",
        expr: "smug",
      }),
      anim: { main: { clip: "cdn/clip-sit-loop.glb", loop: true } },
      behavior: ["scripts/l5-samantha.js"],
      state: {
        name: "Samantha",
        role: "psychic",
        verb: "Speak to Samantha",
        info: "The Beverly Room Cat · Demands meat",
        tint: "#ffd700",
      },
    });
  }

  // The Beverly Room Concert Grand Piano on Stage
  if (!ctx.getObject("l5-piano")) {
    ctx.spawn("l5-piano", {
      tags: ["usable"],
      feetPosition: { x: 15.5, y: 0, z: -10.6 },
      rotation: { yaw: 45 },
      physics: { body: "static", collider: "box" },
      primitive: { kind: "scripted", script: "scripts/level5-props-geo.js", params: { kind: "piano" } },
      behavior: "scripts/l5-door.js",
      state: { kind: "piano", name: "Concert grand piano", verb: "Play", info: "Polished black lacquer", tint: "#f2c14e" },
    });
  }

  // Lobby Front Desk, Service Bell, and Brass Luggage Carts
  if (!ctx.getObject("l5-front-desk")) {
    ctx.spawn("l5-front-desk", {
      feetPosition: { x: -42.6, y: 0, z: 0 },
      rotation: { yaw: -90 },
      physics: { body: "static", collider: "box" },
      primitive: { kind: "scripted", script: "scripts/level5-props-geo.js", params: { kind: "front_desk" } },
    });
    ctx.spawn("l5-front-bell", {
      tags: ["usable"],
      feetPosition: { x: -42.4, y: 1.12, z: -0.6 },
      primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.07, height: 0.06 },
      material: { color: "oklch(0.78 0.14 78)", metalness: 0.9, roughness: 0.2 },
      behavior: "scripts/l5-door.js",
      state: { kind: "bell", name: "Service bell", verb: "Ring", info: "Polished brass desk bell", tint: "#f2c14e" },
    });
    ctx.spawn("l5-cart-lobby-n", {
      feetPosition: { x: -35, y: 0, z: -8 },
      rotation: { yaw: 24 },
      physics: { body: "static", collider: "box" },
      primitive: { kind: "scripted", script: "scripts/level5-props-geo.js", params: { kind: "luggage_cart" } },
    });
    ctx.spawn("l5-cart-lobby-s", {
      feetPosition: { x: -35, y: 0, z: 8 },
      rotation: { yaw: -18 },
      physics: { body: "static", collider: "box" },
      primitive: { kind: "scripted", script: "scripts/level5-props-geo.js", params: { kind: "luggage_cart" } },
    });
  }

  // Lost Hall Society Library: Shelves, Reading Desk with Banker's Lamp, and Filing Cabinet
  if (!ctx.getObject("l5-lib-desk")) {
    const shelves = [
      { x: -29.6, z: -17, yaw: 90 }, { x: -29.6, z: -19, yaw: 90 },
      { x: -22.4, z: -17, yaw: -90 }, { x: -22.4, z: -19, yaw: -90 },
      { x: -26, z: -20.6, yaw: 0 },
    ];
    for (let i = 0; i < shelves.length; i++) {
      const sh = shelves[i];
      ctx.spawn(`l5-shelf-${i}`, {
        feetPosition: { x: sh.x, y: 0, z: sh.z },
        rotation: { yaw: sh.yaw },
        physics: { body: "static", collider: "box" },
        primitive: { kind: "scripted", script: "scripts/level5-props-geo.js", params: { kind: "bookshelf" } },
      });
    }
    ctx.spawn("l5-lib-desk", {
      feetPosition: { x: -26, y: 0, z: -15.5 },
      rotation: { yaw: 180 },
      physics: "static",
      primitive: { kind: "box", width: 1.6, height: 0.78, depth: 0.9 },
      material: { color: "oklch(0.38 0.05 45)", roughness: 0.4 },
      children: [
        { feetPosition: { x: 0.45, y: 0.78, z: -0.2 }, primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.07, height: 0.02 }, material: { color: "oklch(0.75 0.12 75)", metalness: 0.9 } },
        { feetPosition: { x: 0.45, y: 0.95, z: -0.2 }, primitive: { kind: "box", width: 0.22, height: 0.08, depth: 0.1 }, material: { color: "oklch(0.48 0.16 145)", roughness: 0.15 }, light: { kind: "point", color: "oklch(0.85 0.1 135)", intensity: 1.8, distance: 4.5 } },
      ],
    });
    ctx.spawn("l5-lib-cabinet", {
      tags: ["container"],
      feetPosition: { x: -23.5, y: 0, z: -14 },
      rotation: { yaw: -90 },
      physics: "static",
      primitive: { kind: "box", width: 0.7, height: 1.3, depth: 0.6 },
      material: { color: "oklch(0.35 0.04 40)", roughness: 0.5 },
      state: {
        name: "Archival filing cabinet",
        items: "book:science,book:lockpick,page:7,almond,ammo",
        lock: "lockpick:50",
      },
    });
  }

  // M.E.G. Outpost Housekeeping Workbench
  if (!ctx.getObject("l5-hk-workbench")) {
    ctx.spawn("l5-hk-workbench", {
      tags: ["bench"],
      feetPosition: { x: 5, y: 0, z: 22.8 },
      rotation: { yaw: 180 },
      physics: "static",
      primitive: { kind: "box", width: 2.2, height: 0.86, depth: 0.9 },
      material: { color: "oklch(0.42 0.05 50)", roughness: 0.7 },
      state: { name: "M.E.G. Workbench", verb: "Use", info: "Craft ammo, repair kits, batteries, fuses, bobby pins" },
    });
  }

  // Residents (Constance, Vance, Barnaby, Auguste)
  for (const [id, g] of Object.entries(RESIDENTS)) {
    if (ctx.getObject(id)) continue;
    ctx.spawn(id, {
      tags: ["npc", g.faction],
      feetPosition: { x: g.at[0], y: 0, z: g.at[1] },
      rotation: { yaw: g.yaw },
      physics: "character",
      ...critterSpec(npcLook(id, g.look, g.faction, 18)),
      behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
      state: { name: g.name, role: g.role, voice: g.voice, ...npcState(ctx, "agent", MEG.hp) },
    });
    ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, ...weaponBody(g.gun) });
  }

  // Homely Hotel Kitchen Pantry Crate (Fresh meat for Samantha)
  if (!ctx.getObject("l5-pantry-crate")) {
    ctx.spawn("l5-pantry-crate", {
      tags: ["container"],
      feetPosition: { x: -8, y: 0, z: 19.5 },
      rotation: { yaw: 0 },
      physics: "static",
      primitive: { kind: "box", width: 1.1, height: 0.65, depth: 0.7 },
      material: { color: "oklch(0.45 0.06 48)", roughness: 0.6 },
      state: {
        name: "Kitchen Pantry Crate",
        items: "meat:steak,meat:chicken,meat:spam,meat:fish,ration,beans,almond",
      },
    });
  }

  // Guest Room Doors with authentic gold placards and locks
  for (const [roomId, num] of Object.entries(PLACARDS)) {
    const doorId = `l5-door-${roomId}`;
    if (ctx.getObject(doorId)) continue;
    const o = OPENINGS.find((p) => p.room === roomId);
    if (!o) continue;
    const ax = o.ax, at = o.at;
    const isNorth = at < 0;
    const isLocked = roomId === "room-n4" || roomId === "room-s3" || roomId === "suite-sw";
    const lockLv = roomId === "room-n4" ? 75 : 50;

    const pos = ax === "z" ? (isNorth ? { x: o.a0, y: 0, z: at } : { x: o.a1, y: 0, z: at }) : { x: at, y: 0, z: o.a0 };
    const yaw0 = ax === "z" ? (isNorth ? 0 : 180) : 90;

    ctx.spawn(doorId, {
      tags: ["door"],
      feetPosition: pos,
      rotation: { yaw: yaw0 },
      physics: { body: "kinematic", collider: "box" },
      primitive: { kind: "scripted", script: "scripts/level5-props-geo.js", params: { kind: "hotel_door", num } },
      behavior: "scripts/l2-door.js",
      state: {
        name: `Room ${num}`,
        open: false,
        lock: isLocked ? `lockpick:${lockLv}` : "",
        yaw0,
      },
      children: [
        {
          feetPosition: { x: 0.525, y: 1.615, z: 0.05 },
          rotation: { yaw: 0 },
          primitive: { kind: "box", width: 0.28, height: 0.12, depth: 0.01 },
          material: { color: "oklch(0.8 0.14 78)", metalness: 0.9, roughness: 0.2 },
          ui: `<div face="front" width="0.28m" style="text-align:center;font-family:serif;font-weight:900;font-size:75px;color:#2b1804;line-height:1.2">${num}</div>`,
        },
      ],
    });

    if (roomId === "room-n4" && !ctx.getObject("l5-loot-1408")) {
      ctx.spawn("l5-loot-1408", {
        tags: ["container"],
        feetPosition: { x: -16, y: 0, z: -19 },
        rotation: { yaw: 0 },
        physics: "static",
        primitive: { kind: "box", width: 1.1, height: 0.75, depth: 0.65 },
        material: { color: "oklch(0.32 0.05 35)", roughness: 0.5 },
        state: {
          name: "Room 1408 Wardrobe Trunk",
          items: "royal_ration,firesalt,cloth:topw:jacket:5a4a3a,bobbypin,bobbypin,almond",
        },
      });
    }
    if (roomId === "suite-sw" && !ctx.getObject("l5-loot-237")) {
      ctx.spawn("l5-loot-237", {
        tags: ["container"],
        feetPosition: { x: -25, y: 0, z: 6 },
        rotation: { yaw: 0 },
        physics: "static",
        primitive: { kind: "box", width: 1.0, height: 0.6, depth: 0.6 },
        material: { color: "oklch(0.35 0.08 40)", roughness: 0.5 },
        state: {
          name: "Room 237 Vintage Trunk",
          items: "royal_ration,almond,almond,ammo,pin,pin",
        },
      });
    }
  }
}

export function tick(ctx) {
  const s = ctx.place.state;
export function tick(ctx) {
  const s = ctx.place.state;
  if (s.builtV !== V) {
    s.builtV = V;
    lay(ctx);
  }
  if (s.exitsV !== 1) {
    s.exitsV = 1;
    dressExits(ctx);
  }
  if (s.lightsV !== 2) {
    s.lightsV = 2;
    relight(ctx);
  }

  const now = ctx.now();
  if (!s.packMgr || !(s.packMgr in ctx.place.objects)) {
    s.packMgr = ctx.spawn({ behavior: "scripts/hounds.js" });
  }

  if (now - (s.houndAt ?? 0) > 60000 || !s.houndAt) {
    s.houndAt = now;
    const have = ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((h) => !h.state?.dead).length;
    if (have < 2) {
      const spots = [
        { x: -14, z: -17 }, // North Guest Wing
        { x: -18, z: 17 },  // South Guest Wing
        { x: 34, z: 0 },    // Boiler Room
      ];
      const sp = spots[Math.floor(ctx.random() * spots.length)];
      ctx.spawn({
        tags: ["hound"],
        feetPosition: { x: sp.x, y: 0.05, z: sp.z },
        physics: { body: "character" },
        primitive: { kind: "scripted", script: "scripts/hound-geo.js" },
        state: npcState(ctx, "hound", 75, { xp: 50 }),
      });
    }
  }
}

// the lamp set re-laid from LIGHTS whenever its numbers change (ids by index; extras past the list are cleared)
function relight(ctx) {
  for (let i = 0; i < 200; i++) if (ctx.getObject(`l5-light-${i}`)) ctx.destroy(`l5-light-${i}`);
  LIGHTS.forEach((l, i) => ctx.spawn(`l5-light-${i}`, { tags: ["l5-light", `l5-fix-${l.kind}`], feetPosition: { x: l.x, y: l.y, z: l.z }, state: { kind: l.kind },
    light: { kind: "point", color: l.color, intensity: l.intensity, distance: l.distance, shadow: { enabled: l.kind === "chandelier" && l.intensity >= 14 } } }));
}
}

// every live way out reads as one: a walnut stair door swung open on a dark climbing stair, or a copper cage lift with its gate folded back
const WAL = { color: "oklch(0.3 0.05 45)", texture: "cdn/texture-worn-hardwood-grain.png", roughness: 0.5 };
const VOID = { color: "oklch(0.06 0.01 50)", roughness: 1 };
const BRASS = { color: "oklch(0.68 0.11 75)", roughness: 0.35, metalness: 0.85 };
const COPPER = { color: "oklch(0.55 0.11 50)", roughness: 0.4, metalness: 0.85 };
function dressExits(ctx) {
  for (const e of EXITS) {
    if (!e.to) continue;
    const id = `${e.id}-dress`; if (ctx.getObject(id)) continue;
    const box = (x, y, z, w, h, d, material, extra = {}) => ({ feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material, ...extra });
    const kids = [
      box(0, 0, -0.02, 1.3, 2.35, 0.03, VOID), // the dark beyond the doorway
      box(-0.72, 0, -0.06, 0.14, 2.5, 0.12, e.kind === "lift" ? BRASS : WAL), box(0.72, 0, -0.06, 0.14, 2.5, 0.12, e.kind === "lift" ? BRASS : WAL), box(0, 2.38, -0.06, 1.58, 0.14, 0.12, e.kind === "lift" ? BRASS : WAL),
      box(0, 0, -0.3, 1.5, 0.02, 0.5, e.kind === "lift" ? BRASS : { color: "oklch(0.32 0.1 25)", roughness: 0.9 }), // threshold plate / runner
    ];
    if (e.kind === "stairs") {
      kids.push(box(0.62, 0, -0.62, 0.05, 2.25, 1.1, WAL, { rotation: { yaw: 20 } })); // the door, swung in toward the room
      kids.push(box(0.47, 1.0, -0.95, 0.06, 0.06, 0.06, BRASS)); // its knob
      for (let i = 0; i < 6; i++) kids.push(box(0, i * 0.18, 0.15 + i * 0.28, 1.2, 0.18, 0.28, { color: `oklch(${0.22 - i * 0.03} 0.04 45)`, roughness: 0.8 }, { physics: "none" })); // the first steps climbing into the dark
      kids.push({ feetPosition: { x: 0, y: 2.0, z: 0.6 }, light: { kind: "point", color: "oklch(0.75 0.1 65)", intensity: 0.6, distance: 3 } });
    } else {
      for (let i = 0; i < 7; i++) { kids.push(box(-0.9 - i * 0.05, 0, -0.1, 0.025, 2.3, 0.025, COPPER)); kids.push(box(0.9 + i * 0.05, 0, -0.1, 0.025, 2.3, 0.025, COPPER)); } // the cage gate folded back each side
      for (const y of [0.4, 1.2, 2.0]) kids.push(box(0, y, 0.6, 1.3, 0.03, 1.2, COPPER)); // the cage's rails inside
      kids.push(box(0, 2.62, -0.04, 0.5, 0.26, 0.04, BRASS)); // the floor dial above
      kids.push({ feetPosition: { x: 0, y: 2.0, z: 0.6 }, light: { kind: "point", color: "oklch(0.8 0.12 75)", intensity: 1.2, distance: 3.5 } });
    }
    ctx.spawn(id, { feetPosition: { x: e.at.x, y: 0, z: e.at.z }, rotation: { yaw: e.yaw }, children: kids });
  }
}
