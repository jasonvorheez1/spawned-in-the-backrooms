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
const V = 3;
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
    look: { species: "cat", sex: "f", fur: "#e69c64", belly: "#fff8f0", tip: "#fff8f0", eye: "#2ab890", nose: "#ff9eb2", topw: "jacket", top: "#e0e4e8", botw: "skirt", bottom: "#2b2e38", shoes: "boots", shoec: "#1f1d1a", hat: "beret", hatc: "#3e4856", expr: "beam" },
  },
  "hk-vance": {
    name: "Vance · Boiler Room Scout",
    role: "scout",
    voice: "ale",
    gun: "pipe_scrap",
    at: [10, 18.5],
    yaw: -90,
    faction: "meg",
    look: { species: "dog", sex: "m", fur: "#b87c48", belly: "#fbe8d0", eye: "#9a6226", nose: "#2a1c18", topw: "vest", top: "#b87030", botw: "pants", bottom: "#323028", shoes: "boots", shoec: "#1c1b18", hat: "cap", hatc: "#42382c", expr: "smug" },
  },
  "homely-barnaby": {
    name: "Barnaby · Hotel Concierge",
    role: "quarter",
    voice: "callum",
    gun: "wrench",
    at: [-43.6, 0.4],
    yaw: 90,
    faction: "homely",
    look: { species: "dog", sex: "m", fur: "#cca062", belly: "#fef0db", eye: "#a87232", nose: "#2a1c18", topw: "vest", top: "#6a1b24", botw: "pants", bottom: "#22201d", shoes: "boots", shoec: "#151515", hat: "cap", hatc: "#6a1b24", expr: "smile" },
  },
  "homely-auguste": {
    name: "Auguste · Dining Room Chef",
    role: "trader",
    voice: "callum",
    gun: "knife",
    at: [-10, 18.5],
    yaw: 0,
    faction: "homely",
    look: { species: "bear", sex: "m", fur: "#8c502c", belly: "#f4dac0", eye: "#683e1e", nose: "#221814", topw: "jacket", top: "#f4f4f0", botw: "pants", bottom: "#2e2e2e", shoes: "boots", shoec: "#22201c", expr: "grin" },
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
        light: { kind: "point", color: l.color, intensity: l.intensity, distance: l.distance, shadow: { enabled: false }, visibleRange: { max: 45 } } });
    }
  });

  // Radios
  for (const r of RADIOS) {
    if (ctx.getObject(r.id)) continue;
    const track = { clip: POLONAISE, gain: 0.55, loop: true, spatial: true, refDistance: 2, maxDistance: 16, bus: "music" };
    ctx.spawn(r.id, { tags: ["usable", "l5-radio"], feetPosition: { x: r.x, y: r.y, z: r.z }, rotation: { yaw: r.yaw }, physics: "static", visibleRange: { max: 40 }, castShadow: false,
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
      ctx.spawn(`${e.id}-plate`, { feetPosition: { x: e.at.x + f.x * 0.06, y: 2.55, z: e.at.z + f.z * 0.06 }, rotation: { yaw: e.yaw }, visibleRange: { max: 45 }, castShadow: false, primitive: { kind: "box", width: 1.2, height: 0.36, depth: 0.03 }, material: { color: "oklch(0.25 0.04 50)" },
        ui: plate(e.label, e.kind === "lift" ? "▼ electrical station" : "▲ abandoned office") });
      ctx.spawn(`${e.id}-lamp`, { feetPosition: { x: e.at.x + f.x * 0.8, y: 2.9, z: e.at.z + f.z * 0.8 }, light: { kind: "point", color: "oklch(0.82 0.1 70)", intensity: 2.2, distance: 6, shadow: { enabled: false }, visibleRange: { max: 35 } } });
    } else {
      ctx.spawn(e.id, { tags: ["usable", "l5-sealed"], feetPosition: { x: e.at.x + f.x * 0.08, y: 0, z: e.at.z + f.z * 0.08 }, rotation: { yaw: e.yaw }, physics: "static", visibleRange: { max: 45 }, castShadow: false,
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

  // Samantha: The Beverly Room Psychic Cat (Entity 26)
  if (!ctx.getObject("l5-samantha")) {
    ctx.spawn("l5-samantha", {
      tags: ["npc", "samantha", "usable"],
      feetPosition: { x: 6, y: 0.42, z: 2 },
      rotation: { yaw: -130 },
      physics: "character",
      scale: { x: 0.9, y: 0.9, z: 0.9 },
      model: { id: "/cdn/value.05b6fcdb02ae0489f79f366c2285414facaa51f7639114b24430fb4ac82f5455.glb", forward: "-z" }, // her own tuxedo cat (scripts/samantha.js MODEL), never a dressed critter
      anim: { main: { clip: "cdn/clip-sit-loop.glb", loop: true } },
      behavior: ["scripts/l5-samantha.js"],
      state: {
        name: "Samantha",
        role: "psychic",
        verb: "Speak to Samantha",
        info: "The Beverly Room Cat · Demands meat",
        tint: "#ffd700",
        offers: [["o:feed", "Offer meat"], ["o:refuse", "Refuse"]],
      },
    });
  }

  // The Beverly Room Concert Grand Piano on Stage
  if (!ctx.getObject("l5-piano")) {
    ctx.spawn("l5-piano", { visibleRange: { min: 0, max: 45 }, castShadow: false, 
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
  // Lobby service bell and brass luggage carts (the Main Hall's own desk stands; the old duplicate desk is gone)
  if (!ctx.getObject("l5-front-bell")) {
    ctx.spawn("l5-front-bell", { visibleRange: { min: 0, max: 40 }, castShadow: false, 
      tags: ["usable"],
      feetPosition: { x: -42.35, y: 1.12, z: 1.9 },
      primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.07, height: 0.06 },
      material: { color: "oklch(0.78 0.14 78)", metalness: 0.9, roughness: 0.2 },
      behavior: "scripts/l5-door.js",
      state: { kind: "bell", name: "Service bell", verb: "Ring", info: "Polished brass desk bell", tint: "#f2c14e" },
    });
    for (const [id, x, z, yaw] of [["l5-cart-lobby-n", -43.6, -3.9, 15], ["l5-cart-lobby-s", -41.5, 10.8, -20]]) ctx.spawn(id, { visibleRange: { min: 0, max: 45 }, castShadow: false, 
      feetPosition: { x, y: 0, z }, rotation: { yaw },
      physics: { body: "static", collider: "box" },
      primitive: { kind: "scripted", script: "scripts/level5-props-geo.js", params: { kind: "luggage_cart" } },
    });
  }
  for (const id of ["l5-front-desk", "l5-lib-desk", "l5-shelf-0", "l5-shelf-1", "l5-shelf-2", "l5-shelf-3", "l5-shelf-4"]) if (ctx.getObject(id)) ctx.destroy(id);

  // Lost Hall Society Library: Shelves, Reading Desk with Banker's Lamp, and Filing Cabinet
  if (!ctx.getObject("l5-lib-cabinet")) {
    const shelves = [
      { x: -29.6, z: -17, yaw: 90 }, { x: -29.6, z: -19, yaw: 90 },
      { x: -22.4, z: -17, yaw: -90 }, { x: -22.4, z: -19, yaw: -90 },
      { x: -26, z: -20.6, yaw: 0 },
    ];
    for (let i = 0; i < 0; i++) { // the Main Hall lays the library shelves now
      const sh = shelves[i];
      ctx.spawn(`l5-shelf-${i}`, {
        feetPosition: { x: sh.x, y: 0, z: sh.z },
        rotation: { yaw: sh.yaw },
        physics: { body: "static", collider: "box" },
        primitive: { kind: "scripted", script: "scripts/level5-props-geo.js", params: { kind: "bookshelf" } },
      });
    }
    if (false) ctx.spawn("l5-lib-desk", {
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
    ctx.spawn("l5-lib-cabinet", { visibleRange: { min: 0, max: 45 }, castShadow: false, 
      tags: ["container"],
      feetPosition: { x: -22.37, y: 0, z: -14 },
      rotation: { yaw: -90 },
      physics: "static",
      model: { id: "/cdn/value.8df9a0a088d4df2df92c0a316e9feb3b3439886bf6251649db4b3e95cf159a34.glb" }, layout: { box: { min: { x: -0.5, y: 0, z: -0.3 }, max: { x: 0.5, y: 1.6, z: 0.3 } } },
      state: {
        name: "Archival filing cabinet",
        items: "book:science,book:lockpick,page:7,almond,ammo",
        lock: "lockpick:50",
      },
    });
  }

  // M.E.G. Outpost Housekeeping Workbench
  if (!ctx.getObject("l5-hk-workbench")) {
    ctx.spawn("l5-hk-workbench", { visibleRange: { min: 0, max: 45 }, castShadow: false, 
      tags: ["bench"],
      feetPosition: { x: 5, y: 0, z: 22.8 },
      rotation: { yaw: 180 },
      physics: "static",
      model: { id: "/cdn/value.a38bcbd4f551deb9aaf6fba383d7eaadb341a1aaba258f537471bcb5159c7f26.glb" }, layout: { box: { min: { x: -1.1, y: 0, z: -0.45 }, max: { x: 1.1, y: 1.7, z: 0.45 } } },
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
    ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
  }

  // Homely Hotel Kitchen Pantry Crate (Fresh meat for Samantha)
  if (!ctx.getObject("l5-pantry-crate")) {
    ctx.spawn("l5-pantry-crate", { visibleRange: { min: 0, max: 40 }, castShadow: false, 
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

    if (OLD_LEAVES) ctx.spawn(doorId, {
      tags: ["door"],
      feetPosition: pos,
      rotation: { yaw: yaw0 },
      physics: { body: "kinematic", collider: "box" },
      visibleRange: { max: 45 }, castShadow: false,
      primitive: hotelLeaf(o, num), material: { pbr: true },
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
      ctx.spawn("l5-loot-1408", { visibleRange: { min: 0, max: 40 }, castShadow: false, 
        tags: ["container"],
        feetPosition: { x: -16, y: 0, z: -19 },
        rotation: { yaw: 0 },
        physics: "static",
        primitive: { kind: "box", width: 1.1, height: 0.75, depth: 0.65 },
        material: { color: "oklch(0.32 0.05 35)", roughness: 0.5 },
        state: {
          name: "Room 1408 Wardrobe Trunk",
          lock: "lockpick:25",
          items: "nvg,battery,battery,royal_ration,firesalt,cloth:topw:jacket:5a4a3a,bobbypin,almond",
        },
      });
    }
    if (roomId === "suite-sw" && !ctx.getObject("l5-loot-237")) {
      ctx.spawn("l5-loot-237", { visibleRange: { min: 0, max: 40 }, castShadow: false, 
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

// lamps and loose ballroom props join the hotel's breakables (the halls' furniture already is): Z lifts them, swings break them
function breakablesOnce(ctx) {
  const s = ctx.place.state; if (s.brk5 === 3) return; s.brk5 = 3;
  for (const r of ctx.query({ tags: ["l5-ball", "breakable"], radius: 1e4, center: { x: 0, y: 0, z: 0 } })) { const o = ctx.getObject(r.id); if (o && ["ball", "salon", "hk", "boiler"].includes(o.primitive?.params?.part)) { o.tags = o.tags.filter((g) => g !== "breakable" && g !== "furniture"); delete o.state.hp; delete o.state.broke; } }
  for (const [tag, mat] of [["l5-fix-lamp", "fixture"], ["l5-ball", "wood"]]) for (const r of ctx.query({ tags: [tag], radius: 1e4, center: { x: 0, y: 0, z: 0 } })) {
    const o = ctx.getObject(r.id); if (!o || o.tags.includes("breakable") || o.tags.includes("l5-chandelier") || o.tags.includes("usable") || o.parent || ["ball", "salon", "hk", "boiler"].includes(o.primitive?.params?.part)) continue; // a whole room's dressing is one mesh: never one breakable
    o.tags = [...o.tags, "breakable", "furniture"]; o.state.mat = mat; o.state.hp = mat === "fixture" ? 25 : 60; o.state.maxHp = o.state.hp;
  }
}
// draw distance + shadows for runtime-spawned props, also on rooms built before this rule
const L5_TUNE = { "l5-piano": 80, "l5-lib-cabinet": 80, "l5-hk-workbench": 80, "l5-cart-lobby-n": 80, "l5-cart-lobby-s": 80, "l5-front-bell": 40, "l5-pantry-crate": 40, "l5-loot-1408": 40, "l5-loot-237": 40 };
function retuneL5(ctx) {
  for (const sid of ["suite-ne", "suite-nw", "suite-se", "suite-sw", "room-n5", "room-s4"]) { L5_TUNE[`l5-people-trunk-${sid}`] = 40; L5_TUNE[`l5-people-rack-${sid}`] = 40; }
  for (const [id, max] of Object.entries(L5_TUNE)) { const o = ctx.getObject(id); if (!o || o.visibleRange) continue; o.visibleRange = { min: 0, max }; if (max <= 40) o.castShadow = false; }
}
// a guest-room leaf: origin its bottom hinge corner, running +X (scripts/door-geo.js PIVOT CONVENTION); the opening's own width, the old 2.36 m height
const hotelLeaf = (o, num) => ({ kind: "scripted", script: "scripts/door-geo.js", params: { style: "hotel", part: "leaf", w: Math.max(0.8, Math.min(1.2, Math.abs(o.a1 - o.a0) || 1.05)), h: 2.3, hingeSide: "left", swing: 1, seed: Number(num) || 0 } });
const OLD_LEAVES = false; // the guest-room leaves are scripts/l5-hall-lay.js's (frame, plaque, swing); these stood inside the same doorways (shelly Nov 10: 'a door on top of the other door')
export function tick(ctx) {
  if (!ctx.session.l5Tuned) { retuneL5(ctx); ctx.session.l5Tuned = true; }
  if (!ctx.place.players?.length) return; // empty level: nothing to run (perf)
  breakablesOnce(ctx);
  const s = ctx.place.state;
  if (s.builtV !== V) {
    s.builtV = V;
    lay(ctx);
  }
  if (s.doorDedupV !== 1) { // one leaf per doorway: the old one hands its lock (picked or not) to the hall leaf, then goes
    let all = true
    for (const roomId of Object.keys(PLACARDS)) { const old = ctx.getObject(`l5-door-${roomId}`), leaf = ctx.getObject(`l5-hall-leaf-${roomId}`); if (!leaf) { all = false; continue } const t = leaf.tags ?? []; if (!t.includes("door")) leaf.tags = [...t, "door"]; if (old) { leaf.state.lock = old.state?.lock ?? ""; ctx.destroy(old.id) } }
    if (all) s.doorDedupV = 1
  }
  if (s.doorGeoV !== 1) { // the door pass: every guest-room leaf takes scripts/door-geo.js (same ids, hinge at its feet as before)
    s.doorGeoV = 1;
    for (const [roomId, num] of Object.entries(PLACARDS)) { const d = ctx.getObject(`l5-door-${roomId}`), o = OPENINGS.find((p) => p.room === roomId); if (d && o) { d.primitive = hotelLeaf(o, num); d.material = { pbr: true }; } }
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
    light: { kind: "point", color: l.color, intensity: l.intensity, distance: l.distance, shadow: { enabled: false }, visibleRange: { max: 45 } } }));
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
      kids.push({ feetPosition: { x: 0, y: 2.0, z: 0.6 }, light: { kind: "point", color: "oklch(0.75 0.1 65)", intensity: 0.6, distance: 3, shadow: { enabled: false }, visibleRange: { max: 30 } } });
    } else {
      for (let i = 0; i < 7; i++) { kids.push(box(-0.9 - i * 0.05, 0, -0.1, 0.025, 2.3, 0.025, COPPER)); kids.push(box(0.9 + i * 0.05, 0, -0.1, 0.025, 2.3, 0.025, COPPER)); } // the cage gate folded back each side
      for (const y of [0.4, 1.2, 2.0]) kids.push(box(0, y, 0.6, 1.3, 0.03, 1.2, COPPER)); // the cage's rails inside
      kids.push(box(0, 2.62, -0.04, 0.5, 0.26, 0.04, BRASS)); // the floor dial above
      kids.push({ feetPosition: { x: 0, y: 2.0, z: 0.6 }, light: { kind: "point", color: "oklch(0.8 0.12 75)", intensity: 1.2, distance: 3.5, shadow: { enabled: false }, visibleRange: { max: 30 } } });
    }
    ctx.spawn(id, { feetPosition: { x: e.at.x, y: 0, z: e.at.z }, rotation: { yaw: e.yaw }, visibleRange: { max: 45 }, castShadow: false, children: kids });
  }
}
