import { rbox } from "./rbox.js";

const USE = "scripts/l61-use.js";
const TILE = { texture: "cdn/texture-worn-beige-waxed-vinyl-composition-floor-tile-12-inch.png", wrap: "repeat", repeat: [0.6, 0.6], color: "#c9c4ab", roughness: 0.62 };
const PAINT = { color: "#8c9b90", roughness: 0.68, metalness: 0.1 };
const STEEL = { color: "#9da4a0", roughness: 0.4, metalness: 0.62 };
const OFF = { color: "#3e4848", roughness: 0.83 };
const board = (heading, sub, width, paper = false) => `<svg viewBox='0 0 240 76' width='${width}m'>
  <rect width='240' height='76' rx='2' fill='${paper ? "#e8dfc7" : "#263e44"}'/>
  <path d='M6 6h228v64H6z' fill='none' stroke='${paper ? "#a09579" : "#8fa49f"}'/>
  <g text-anchor='middle' font-family='sans-serif' fill='${paper ? "#293b3c" : "#f1e7d0"}'>
    <text x='120' y='34' font-size='19' font-weight='bold' letter-spacing='1'>${heading}</text>
    <text x='120' y='55' font-size='11'>${sub}</text>
  </g>
</svg>`;

export function layService(ctx, { box, wallZ, light, vend, PLASTER, CEIL, WAINSCOT }) {
  const sp = (id, spec) => ctx.spawn("l61-" + id, { castShadow: false, ...spec });
  const label = (id, x, y, z, yaw, title, sub, width, paper) => sp(id, {
    feetPosition: { x, y, z }, rotation: { yaw }, vector: board(title, sub, width, paper),
  });
  const troffer = (id, x, z, y, tint) => {
    box("l61-" + id, x, y, z, 1.18, 0.075, 0.44, { color: "#eee9d7", emissive: tint, emissiveIntensity: 0.85 }, { physics: undefined, castShadow: false });
    light("l61-" + id + "-lamp", x, y - 0.15, z, tint, 3.4, 8);
  };

  // Public supply room with an offset opening into the sorting hall.
  box("l61-vend-floor", -14, -0.285, 28.1, 16, 0.3, 12.2, TILE);
  box("l61-vend-roof", -14, 3.25, 28.1, 16, 0.25, 12.2, CEIL);
  for (const [key, x] of [["wl", -22], ["wr", -6]]) {
    box("l61-vend-" + key, x, 0, 28.1, 0.3, 3.25, 12.2, PLASTER);
    box("l61-vend-dado-" + key, x + (x < -10 ? 0.16 : -0.16), 0, 28.1, 0.045, 1.05, 12.1, WAINSCOT, { physics: undefined });
  }
  wallZ("l61-vend-back", 34.2, -22, -6, [[-11, 2.6, 2.35]], 3.25, PLASTER);
  label("vend-sign", -14, 3.53, 21.83, 0, "SUPPLY ROOM", "Free vending  /  Take what you need", 3.15);
  label("vend-stock-sign", -16.65, 2.42, 34.02, 0, "WATER &amp; SNACKS", "Next stock count Monday", 2.45, true);
  label("service-sort-sign", -11, 2.68, 34.02, 0, "STOCKROOM", "Staff deliveries", 1.65);
  for (const [i, [x, soda, gives]] of [[-19.4, true, "purified_water"], [-17.8, true, "almond,purified_water"], [-16.2, false, "doritos,coolranch"], [-14.6, false, "doritos,bar"]].entries()) {
    vend("l61-vend-b" + i, x, 33.52, 0, soda, { gives, weeklyStock: 60 });
  }
  for (const [i, z] of [26.5, 28.45, 30.4].entries()) {
    vend("l61-vend-l" + i, -21.26, z, -90, i !== 2, { weeklyStock: 52 });
    vend("l61-vend-r" + i, -6.74, z, 90, i === 1, { weeklyStock: 52 });
  }
  troffer("supply-fixture-a", -14, 25.5, 3.13, "#f5ead7");
  troffer("supply-fixture-b", -15, 31.2, 3.13, "#eef2e9");
  sp("vend-hum", { feetPosition: { x: -17.6, y: 1, z: 32.4 },
    audio: { clip: "cdn/moodboard-realistic-gritty/sfx-vending-machine-compressor-hum-loop.mp3", loop: true, gain: 0.14, spatial: true, maxDistance: 10 } });

  // The expansion ends at a sealed party room. Crushed machines are confined to the closed end.
  box("l61-service-floor", -14, -0.29, 40.5, 16, 0.3, 12.6, TILE);
  box("l61-service-roof", -14, 3.05, 40.5, 16, 0.24, 12.6, CEIL);
  box("l61-service-left", -22, 0, 40.5, 0.3, 3.05, 12.7, PLASTER);
  box("l61-service-right", -6, 0, 40.5, 0.3, 3.05, 12.7, PLASTER);
  box("l61-service-end", -14, 0, 46.8, 16, 3.05, 0.3, PLASTER);
  troffer("service-fixture-a", -13.7, 36.1, 2.94, "#e6efeb");
  troffer("service-fixture-b", -13.7, 43.3, 2.94, "#ead9ad");

  for (const [i, z] of [36.45, 39.7].entries()) {
    sp("stock-shelf-" + i, {
      feetPosition: { x: -20.9, y: 0, z }, rotation: { yaw: -90 }, primitive: rbox(2.45, 1.68, 0.63, 0.022), material: OFF,
      physics: { body: "static", collider: "box" },
      children: [0.37, 0.91, 1.43].flatMap((y, row) => [
        { feetPosition: { x: 0, y, z: -0.34 }, primitive: rbox(2.42, 0.036, 0.34), material: STEEL },
        ...[-0.82, 0.15, 0.73].map((x, col) => ({
          feetPosition: { x, y: y + 0.035, z: -0.33 }, rotation: { yaw: 2 * (col - 1) },
          primitive: rbox(0.42, 0.2 + 0.045 * ((i + row + col) % 3), 0.38),
          material: { color: ["#a0845e", "#c4ad87", "#868d76"][(row + col) % 3], roughness: 0.91 },
        })),
      ]),
    });
  }
  box("l61-service-bench", -8.5, 0, 37.3, 2.75, 0.88, 0.72, PAINT);
  box("l61-service-bench-top", -8.5, 0.88, 37.3, 2.88, 0.045, 0.8, STEEL, { physics: undefined });
  label("service-count-card", -8.5, 1.59, 36.93, 180, "STOCK COUNT", "Date on seals keeps changing.", 1.28, true);
  box("l61-service-count-back", -8.5, 1.0, 36.88, 2.56, 0.85, 0.075, OFF);

  vend("l61-vend-overflow-0", -20.5, 45.93, -4, false, { dead: true });
  vend("l61-vend-overflow-1", -18.95, 45.93, 7, true, { dead: true });
  vend("l61-vend-overflow-2", -19.85, 44.1, 90, false, { dead: true, y: 0.43, rot: { pitch: 90 } });
  box("l61-service-sealed", -12.1, 0, 46.59, 2.15, 2.48, 0.16, { color: "#665258", roughness: 0.87 });
  for (const [i, y] of [0.47, 1.19, 1.88].entries()) box("l61-service-brace-" + i, -12.1, y, 46.45, 2.88, 0.18, 0.12,
    { texture: "cdn/texture-raw-plywood-sheet-knots-and-grain.png", color: "#b49b72", roughness: 0.88 }, { physics: undefined, rotation: { roll: i % 2 ? 8 : -6 } });
  label("service-seal-plate", -12.1, 2.82, 46.58, 0, "M.E.G. SEAL  6.1-02", "PARTY ROOM  /  DO NOT OPEN", 2.3, true);
  sp("service-inspection-tag", { feetPosition: { x: -12.1, y: 1.54, z: 46.34 },
    primitive: { kind: "box", width: 0.23, height: 0.34, depth: 0.018 }, material: { color: "#c9b696", roughness: 0.91 },
    tags: ["usable"], behavior: USE, state: { kind: "notice", name: "Seal inspection", verb: "Read", line: "Seal intact. Birthday music reported behind the door at 03:14. Leave the bolts alone." },
  });

  // A service door is allowed to land at the wrong restaurant. Public storefronts stay reliable.
  const doors = [
    ["clip", -14.19, -27.65, 90, "STOCKROOM", "stock-in"],
    ["stock", -6.19, 40.25, 90, "FOOD COURT", "slice-in"],
    ["slice", 13.76, -24.6, 90, "SERVICE", "clip-in"],
  ];
  for (const [id, x, z, yaw, name, to] of doors) sp("service-door-" + id, {
    feetPosition: { x, y: 0, z }, rotation: { yaw },
    primitive: rbox(1.13, 2.19, 0.078, 0.014), physics: { body: "static", collider: "box" }, material: PAINT,
    tags: ["usable"], behavior: USE, state: { kind: "serviceDoor", to: "l61-service-" + to, name, verb: "Open", info: "A painted service door." },
    children: [
      { feetPosition: { x: 0.34, y: 0.98, z: -0.078 }, primitive: rbox(0.17, 0.045, 0.14, 0.013), material: STEEL },
      { feetPosition: { x: 0, y: 1.76, z: -0.055 }, vector: board(name, "", 0.65, true) },
    ],
  });
  for (const [id, x, z, yaw] of [["stock-in", -8.35, 40.25, 90], ["slice-in", 11.96, -24.6, 90], ["clip-in", -15.75, -27.65, 90]]) sp("service-" + id, {
    feetPosition: { x, y: 0.06, z }, rotation: { yaw },
  });

  label("mapper-vend", -12.26, 2.36, 21.81, 0, "DRINKING WATER", "Supply room", 1.46, true);
  label("mapper-amber", -26, 2.54, 21.8, 0, "CAMP AMBER", "Water, blankets, missing persons", 2.45, true);
}
