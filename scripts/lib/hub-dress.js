// The Hub's modeled dressing (Nov 13): sodium wall lamps, ceiling jet fans, cable tray, gutters, the dark-line barriers,
// and the furniture of Doorstep Carpet (M.E.G.) and Camp Amber. Models and offsets: art/hub/fixtures.yml, art/hub/outpost.yml.
import { RUNS, HW, CEIL, ROAD, CURB, DARK_X, at, wallYaw, lamps, runOf } from "./thehub.js";
const SODIUM = "oklch(0.8 0.15 68)";
export const FX = {
  jetfan: { id: "/cdn/value.078fd96137a212a702ba328bf5bfc1c1bdf41b73e5a4630ce4acdc4b3d9e39d7.glb", offset: [0, -1.804, 0] },
  lamp: { id: "/cdn/value.d734133cdb70ac338930eed545c3237125f1ddf4d4e1a9b72d5b953bc675be74.glb", offset: [-0.102, -0.182, -0.219], materials: { lens: { color: SODIUM, emissive: SODIUM, emissiveIntensity: 5 } } },
  tray: { id: "/cdn/value.e516ddf073245faf220a12c12bc1a1aee6e2978a9f8efd836e8ff0735cd0157a.glb", offset: [0, -0.34, -0.245] },
  drain: { id: "/cdn/value.8a689fb9f41aec63ea6e7a0d2185bcb2394a329545f9f4d255ab825ad848ab91.glb" },
  barrier: { id: "/cdn/value.efba5bc2dd8deab26fc3c767bca2bf91ee1cd30b33522ced5fdd83959daa330f.glb" },
};
const OP = {
  keycabinet: { id: "/cdn/value.4ed2941b49c21a40e5eac82796224fdc356d15f0db938c695815ebb4f327cc7a.glb", offset: [-0.042, 0, -0.631] },
  comms: { id: "/cdn/value.6501d0251919b1495fabd9cdbd73e2ef1bbbdbb56bd8a927237d0e70f7f9c1c0.glb" },
  cot: { id: "/cdn/value.4b7be3299db70753945e1e5a69ad3a14bb88adedb17a6b35e9de33eb980e2faa.glb" },
  crates: { id: "/cdn/value.b3b466f23bb9c4a393e9b0d47b11c69a1e59ba9ecd1b1a09e4192b7a017c2b1b.glb" } /* stencils repainted Nov 13: M.E.G. SUPPLY, FRAGILE */,
  marker: { id: "/cdn/value.db31e8cb3fa572fc99ba0add37740c4acec673e9a809e4780f5de652720e0a1b.glb" },
  ambertent: { id: "/cdn/value.0e59962cb859f0aef1c815f3e858f16bda49a42e8b198071e6626c42ab7cb32e.glb", materials: { glow: { color: "oklch(0.85 0.14 70)", emissive: "oklch(0.85 0.14 70)", emissiveIntensity: 3 } } },
  handcart: { id: "/cdn/value.a8986029efe64649020725f8bd9fa3aea5ed4a79f007fb85d360decefe7e7a83.glb" },
  maptable: { id: "/cdn/value.47f90bdfdb574c3c3d33543f4f88f4bddde9046bd1da81edd4a6413ac3e4724a.glb", materials: { glow: { color: "oklch(0.9 0.08 85)", emissive: "oklch(0.9 0.08 85)", emissiveIntensity: 3 } } },
};
// [model, x, z, yaw, light?] ; bay floors stand at CURB. Doorstep Carpet: x 4..28, z -5.5..-14.5 (back wall at -14.5). Camp Amber: x 176..194, z 5.5..11.5.
const CAMP = [
  ["keycabinet", 24.6, -14.4, 180], ["comms", 10.4, -14.05, 180, [10.4, 1.6, -13.6, 0.9]], ["maptable", 14.6, -11.4, 180, [14.6, 1.5, -11.4, 1.2]],
  ["cot", 5.4, -14.05, 0], ["cot", 5.4, -12.95, 0], ["crates", 27.0, -7.2, 90], ["crates", 19.8, -14.0, 180], ["marker", 8.8, -6.8, 25],
  ["ambertent", 185.0, 10.45, 0, [183.8, 1.7, 10.4, 1.4]], ["handcart", 192.4, 7.6, 160], ["crates", 178.2, 10.6, 0], ["cot", 179.0, 7.4, 90],
  ["marker", 512.5, -3.6, 30],
];
// work lights strung over the bays: [x, y, z, intensity]
export const BAYLIGHTS = [[9, 3.6, -10, 3.5], [20, 3.6, -10, 3.5], [27, 3.0, -6.5, 1.6], [190, 2.6, 8.5, 1.8]];
const M = (spec, extra = {}) => ({ model: { ...spec }, castShadow: false, receiveShadow: true, ...extra });
export function layLampModels(ctx) {
  for (const l of lamps()) {
    if (ctx.place.objects["hub-lamp-" + l.k]) ctx.destroy("hub-lamp-" + l.k);
    ctx.spawn("hub-lamp-" + l.k, { tags: ["hub-lamp"], feetPosition: { x: l.x, y: l.y, z: l.z }, rotation: { yaw: l.yaw }, ...M(FX.lamp),
      children: [{ id: "glow", feetPosition: { x: 0, y: -0.12, z: -0.38 }, light: { kind: "point", color: SODIUM, intensity: 9, distance: 19, shadow: { enabled: false } } }] });
  }
}
export function layDress(ctx) {
  const t = runOf("trunk");
  for (let u = 40; u < t.len - 4; u += 96) { const p = at(t, u, 0); if (p.x > DARK_X) break;
    for (const v of [-0.85, 0.85]) ctx.spawn(`hub-fan-t${u}${v > 0 ? "b" : "a"}`, { feetPosition: { x: p.x, y: CEIL, z: v }, rotation: { yaw: 90 }, ...M(FX.jetfan) }); }
  for (const r of RUNS) if (r.ax === "z") { const p = at(r, 40, 0); ctx.spawn(`hub-fan-${r.id}`, { feetPosition: { x: p.x, y: CEIL, z: p.z }, rotation: { yaw: 0 }, ...M(FX.jetfan) }); }
  const sideA = lamps().filter((l) => Math.abs(l.z + HW) < 0.2);
  for (let u = 2; u + 2 < t.len; u += 4) {
    const p = at(t, u, -HW + 0.02);
    const hit = t.gaps.a.some(([a, b]) => u + 2 > a && u - 2 < b) || t.bays.some((b) => b.side === "a" && u + 2 > b.from && u - 2 < b.to) || sideA.some((l) => Math.abs(l.x - p.x) < 2.6);
    if (!hit) ctx.spawn(`hub-tray-${u}`, { feetPosition: { x: p.x, y: 5.0, z: p.z }, rotation: { yaw: wallYaw(t, "a") }, ...M(FX.tray) });
    if (u % 24 === 2) for (const s of [-1, 1]) { const q = at(t, u, s * (ROAD - 0.12)); const blocked = t.gaps[s < 0 ? "a" : "b"].some(([a, b]) => u + 1 > a && u - 1 < b);
      if (!blocked) ctx.spawn(`hub-drain-${u}${s < 0 ? "a" : "b"}`, { feetPosition: { x: q.x, y: 0.002, z: q.z }, ...M(FX.drain) }); }
  }
  // the dark line: a chicane of jersey barriers past Dace's post
  for (const [i, x, z] of [[0, DARK_X - 4, -3.6], [1, DARK_X - 4, 3.6], [2, DARK_X - 1.5, 0]]) ctx.spawn(`hub-barrier-${i}`, { feetPosition: { x, y: 0, z }, rotation: { yaw: 90 }, physics: { body: "static", collider: "box" }, ...M(FX.barrier) });
  BAYLIGHTS.forEach(([x, y, z, i], k) => ctx.spawn(`hub-baylight-${k}`, { feetPosition: { x, y, z }, primitive: { kind: "sphere", radius: 0.09 }, material: { color: "oklch(0.95 0.06 85)", emissive: "oklch(0.95 0.06 85)", emissiveIntensity: 6 }, castShadow: false,
    light: { kind: "point", color: "oklch(0.88 0.09 82)", intensity: i, distance: 11, shadow: { enabled: false } } }));
  CAMP.forEach(([k, x, z, yaw, lamp], i) => {
    const y = x > 500 ? 0 : CURB;
    ctx.spawn(`hub-camp-${i}-${k}`, { tags: ["hub-camp"], feetPosition: { x, y, z }, rotation: { yaw }, physics: { body: "static", collider: "box" }, ...M(OP[k]) });
    if (lamp) ctx.spawn(`hub-camp-${i}-light`, { feetPosition: { x: lamp[0], y: lamp[1], z: lamp[2] }, light: { kind: "point", color: "oklch(0.82 0.12 72)", intensity: lamp[3], distance: 7, shadow: { enabled: false } } });
  });
}
