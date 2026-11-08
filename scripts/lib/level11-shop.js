// Thrift Mode: the Level 11 clothing shop on the cross street, across from the arrival (Shelly: "it's just a clothing shop").
// Shell, racks and counter are Blender meshes (art/thrift/build.py). The clerk sells scripts/lib/data/shops.yml l11-tm-clerk.
import { critterSpec } from "./critter-model.js";
import { fullLook, npcLook } from "./clothes.js";
import { npcState } from "./stats.js";

const M = {
  shell: "/cdn/value.e4311b0053a2fd1514c367ce6b6af34d2f390ceb03ffe91ee0bfc40809e5b405.glb",
  rack: "/cdn/value.25eeba93fa1a9ccc9169d8d5b35b19ba60279ae9d85f9d64bfb53b2eee813d87.glb",
  counter: "/cdn/value.53a6ef111aac797583ca330cad268f4e401bd0fe5613021c07eda571623e5ea2.glb",
};
export const SHOP = { x: -23, y: 0.1, z: 22 }; // floor centre; the glass front faces the street at z 19.2
const SHELL_MATS = {
  brick: { color: "oklch(0.42 0.07 35)", roughness: 0.95 },
  plaster: { color: "oklch(0.86 0.025 85)", roughness: 0.95 },
  floor: { color: "oklch(0.5 0.07 60)", roughness: 0.55 },
  ceiling: { color: "oklch(0.9 0.01 90)", roughness: 1 },
  frame: { color: "oklch(0.7 0.005 250)", metalness: 0.8, roughness: 0.35 },
  glass: { color: "oklch(0.75 0.03 200)", opacity: 0.22, transparent: true, roughness: 0.05, metalness: 0.1 },
  sign: { color: "oklch(0.3 0.06 160)", roughness: 0.7 },
  awning: { color: "oklch(0.4 0.13 25)", roughness: 0.9 },
  lamp: { color: "oklch(0.98 0.02 95)", emissive: "#fff4dc", emissiveIntensity: 1.6 },
};
const cloth = (hex) => ({ color: "#" + hex, roughness: 0.95 });
const RACKS = [ // [x, z, yaw, four garment colours]
  [-26.1, 21.0, 90, ["c4a46a", "2a2033", "1d2540", "b8975c"]],
  [-26.1, 23.0, 90, ["c8a878", "3a3878", "2a2033", "c4a46a"]],
  [-23.6, 24.0, 0, ["1d2540", "c8a878", "b8975c", "1d2540"]],
];
const DUMMIES = [ // two shop-window mannequins, mask + hoodie
  ["l11-tm-dummy-0", -25.3, { hat: "bagmask", hatc: "#c4a46a", topw: "hoodie", top: "#c4a46a", topp: "pgsmile" }],
  ["l11-tm-dummy-1", -20.7, { hat: "shellmask", hatc: "#3a3878", topw: "hoodie", top: "#2a2033", topp: "ppsad" }],
];

export function layShop(ctx, { sp }) {
  const { x, y, z } = SHOP, at = (dx, dz, dy = 0) => ({ x: x + dx, y: y + dy, z: z + dz });
  sp("l11-tm-shop", { tags: ["l11-shop"], feetPosition: at(0, 0), model: { id: M.shell, forward: "+z", materials: SHELL_MATS }, physics: { body: "static", collider: "mesh" }, state: { name: "Thrift Mode" } });
  sp("l11-tm-sign", { feetPosition: { x, y: y + 3.35, z: z - 2.83 }, vector: `<svg viewBox='0 0 700 90' width='6.6m'><text x='350' y='66' text-anchor='middle' font-family='serif' font-style='italic' font-weight='bold' font-size='70' fill='#f1e3bf' stroke='#3a2a14' stroke-width='2'>Thrift Mode</text><path d='M210 78 Q350 90 490 78' stroke='#c2402e' stroke-width='5' fill='none'/></svg>` });
  sp("l11-tm-hours", { feetPosition: { x: x + 1.2, y: y + 1.55, z: z - 2.73 }, vector: `<svg viewBox='0 0 120 60' width='0.42m'><rect x='2' y='2' width='116' height='56' rx='4' fill='#efe9dc' stroke='#222' stroke-width='3'/><text x='60' y='26' text-anchor='middle' font-family='sans-serif' font-weight='bold' font-size='20' fill='#b0281c'>OPEN</text><text x='60' y='48' text-anchor='middle' font-family='sans-serif' font-size='12' fill='#222'>used &amp; new · 24 hr</text></svg>` });
  sp("l11-tm-light", { feetPosition: at(0, 0.3, 2.9), light: { kind: "point", color: "oklch(0.95 0.04 90)", intensity: 2.2, distance: 10 } });
  RACKS.forEach(([rx, rz, yaw, cols], i) => sp(`l11-tm-rack-${i}`, { feetPosition: { x: rx, y, z: rz }, rotation: { yaw }, model: { id: M.rack, forward: "+z", materials: { chrome: { color: "oklch(0.8 0 0)", metalness: 1, roughness: 0.25 }, ...Object.fromEntries(cols.map((c, j) => [`g${j}`, cloth(c)])) } }, physics: { body: "static", collider: "box" } }));
  sp("l11-tm-counter", { feetPosition: { x: x + 2.4, y, z: z + 1.4 }, model: { id: M.counter, forward: "+z" }, physics: { body: "static", collider: "box" } });
  for (const [id, dx, look] of DUMMIES) sp(id, {
    tags: ["l11-shop"], feetPosition: { x: dx, y, z: z - 2.1 }, rotation: { yaw: 0 }, physics: { body: "static", collider: "capsule" },
    ...critterSpec(fullLook({ species: "cat", sex: dx < x ? "f" : "m", botw: "jeans", bottom: "#3d4a66", shoes: "sneakers", tint: "#dcd8d0", ...look })),
    state: { name: "Mannequin", info: "Shop window display." },
  });
  sp("l11-tm-clerk", {
    tags: ["npc", "l11-shop"], feetPosition: { x: x + 2.4, y, z: z + 2.15 }, rotation: { yaw: 0 }, physics: "character",
    ...critterSpec(npcLook("l11-tm-clerk", { species: "raccoon", sex: "f", topw: "tee", top: "#1d2540", topp: "jerry", botw: "jeans", bottom: "#2b2b33", shoes: "sneakers", eyew: "glasses" }, "trader", 11)),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: {
      name: "Dee · Thrift Mode", role: "trader", voice: "l11-tm-clerk#f", faction: "city", factionName: "Thrift Mode, a clothing shop in the Infinite City",
      home: { x: x + 2.4, z: z + 2.15 }, line: "Everything on the racks is one of a kind. Mostly.",
      ...npcState(ctx, "trader", 100),
    },
  });
}
