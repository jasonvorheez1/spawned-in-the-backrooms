// Level 11 unlockables (Shelly, Nov 8: "hacking a terminal and granting access can lead you to new areas").
// Street: the MTA kiosk terminal MTA-GATE-07 (hack: science 15, or the password on the M.E.G. dispatch mail) opens the gate at the foot
// of the subway stair -> the abandoned 14th St platform under the avenue (y -2.6): a dead train in the track pit, turnstiles, loot.
// Down there a second gate answers to SEDCO-SEC-01, the Sedco Spotlight security terminal up on the street -> the Sedco vault:
// safe-deposit wall, cash cart, the good crate. Both stay open for the player who hacked them (player.state.l11Access).
import { terminalSpec } from "./terminal.js";
import MODELS from "./data/level11-models.yml";
import { layDepths } from "./level11-depths.js";
const SUB = { x: 13.6, z: 60.5 }, FY = -2.6; // the platform floor's top
const TILE = { color: "oklch(0.78 0.03 95)", roughness: 0.55 }, GRIME = { color: "oklch(0.42 0.03 80)", roughness: 0.9 };
const WALL = { texture: "cdn/texture-grimy-cream-ceramic-subway-tile-wall.png", wrap: "repeat", repeat: [0.6, 0.6], color: "oklch(0.93 0.02 90)", roughness: 0.35 }, STEEL = { color: "oklch(0.45 0.01 250)", metalness: 0.7, roughness: 0.4 };
const DARK = { color: "oklch(0.16 0.01 250)", roughness: 0.9 }, VAULT = { color: "oklch(0.55 0.02 80)", metalness: 0.8, roughness: 0.35 };
const LAMP = (id, x, z, c = "oklch(0.92 0.06 120)", i = 2.2) => ({ feetPosition: { x, y: FY + 2.3, z }, primitive: { kind: "box", width: 1.2, height: 0.08, depth: 0.2 }, material: { color: c, emissive: c, emissiveIntensity: 2 }, light: { kind: "point", color: c, intensity: i, distance: 9 } });
export function layVaults(ctx, { sp, bx, cyl }) {
  // the kiosk terminal on the street, beside the stair
  bx("l11-vault-kiosk", SUB.x + 2.4, 0.1, SUB.z - 1.2, 0.8, 1.0, 0.6, { color: "oklch(0.3 0.08 150)", metalness: 0.5 });
  sp("l11-vault-mta-terminal", terminalSpec({ host: "MTA-GATE-07", lock: "science:15", name: "MTA Station Gate Terminal", at: { x: SUB.x + 2.4, y: 1.1, z: SUB.z - 1.2 }, yaw: 90, tint: "#3fb86b", note: "pw: fourteenth" }));
  // landing + corridor from the last stair step (z ~62) to the hall
  bx("l11-vault-landing", SUB.x, FY - 0.3, 64.5, 3.2, 0.3, 5.0, GRIME);
  for (const s of [-1, 1]) bx(`l11-vault-cwall-${s}`, SUB.x + s * 1.7, FY, 64.5, 0.2, 2.5, 5.0, WALL);
  bx("l11-vault-cceil", SUB.x, -0.42, 64.5, 3.6, 0.15, 5.0, DARK);
  sp("l11-gate-sub", { tags: ["usable"], feetPosition: { x: SUB.x, y: FY, z: 63.6 }, primitive: { kind: "box", width: 3.2, height: 2.4, depth: 0.12 }, material: { ...STEEL, color: "oklch(0.38 0.02 140)" }, physics: { body: "kinematic", collider: "box" }, behavior: "scripts/l11-gate.js", state: { exit: { axis: "z", sign: 1 },  key: "sub", host: "MTA-GATE-07", name: "Station Gate", verb: "Locked:", info: "MTA-GATE-07 controls it", drop: 2.6 } });
  sp("l11-vault-lamp-c", LAMP("c", SUB.x, 64.5));
  // the hall: platform x 11..19.6, track pit x 7..11 (1 m down), z 67..89
  bx("l11-vault-plat", 15.3, FY - 0.3, 78, 8.6, 0.3, 22, TILE);
  bx("l11-vault-edge", 11.2, FY - 0.02, 78, 0.4, 0.02, 22, { color: "oklch(0.85 0.15 95)" }, { physics: undefined }); // the yellow line
  bx("l11-vault-pit", 9, FY - 1.3, 78, 4, 0.3, 22, GRIME);
  for (const s of [-0.7, 0.7]) bx(`l11-vault-rail-${s}`, 9 + s, FY - 1.0, 78, 0.08, 0.12, 22, STEEL);
  bx("l11-vault-wall-w", 6.9, FY - 1, 78, 0.2, 3.6, 22, WALL); bx("l11-vault-wall-e", 19.7, FY, 78, 0.2, 2.6, 22, WALL);
  bx("l11-vault-wall-n", 15.4, FY - 1, 89.1, 8.8, 3.6, 0.2, WALL); // the pit end stays open: the service tunnel runs on north
  bx("l11-vault-wall-n-lintel", 8.95, FY + 1.3, 89.1, 4.1, 1.3, 0.2, WALL);
  // service steps from the platform's end down into the pit (and back up)
  { // a poured stair with brass nosings and a pipe rail; an unseen ramp under it carries the feet
    const Z = 88.2, W = 1.5, CON = { texture: "cdn/texture-grimy-wet-concrete-floor-with-puddles.png", wrap: "repeat", repeat: [0.6, 0.6], color: "oklch(0.55 0.015 80)", roughness: 0.85 };
    const RAIL = { color: "oklch(0.4 0.03 140)", metalness: 0.8, roughness: 0.4 }, a = Math.atan2(1, 2.4) * 180 / Math.PI, L = Math.hypot(2.4, 1);
    for (let i = 0; i < 5; i++) { const top = FY - 0.2 * i, x = 11 - 0.48 * i - 0.24;
      sp(`l11-vault-stair-${i}`, { feetPosition: { x, y: FY - 1, z: Z }, primitive: { kind: "box", width: 0.48, height: top - (FY - 1), depth: W }, material: CON });
      sp(`l11-vault-nose-${i}`, { feetPosition: { x: x + 0.22, y: top - 0.02, z: Z }, primitive: { kind: "box", width: 0.05, height: 0.025, depth: W }, material: { color: "oklch(0.75 0.13 85)", metalness: 0.6, roughness: 0.4 }, castShadow: false }); }
    sp("l11-vault-stair-ramp", { feetPosition: { x: 9.8, y: FY - 0.5, z: Z }, pivot: "center", rotation: { roll: a }, primitive: { kind: "box", width: L, height: 0.1, depth: W }, visible: false, physics: { body: "static", collider: "box" } });
    sp("l11-vault-stair-hand", { feetPosition: { x: 9.8, y: FY - 1, z: Z - W / 2 - 0.05 }, pivot: "center", rotation: { roll: a - 90 }, primitive: { kind: "cylinder", radiusTop: 0.025, radiusBottom: 0.025, height: L + 0.3 }, material: RAIL });
    for (const [k, x, y] of [[0, 8.75, FY - 1], [1, 10.85, FY - 0.15]]) sp(`l11-vault-stair-post-${k}`, { feetPosition: { x, y, z: Z - W / 2 - 0.05 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.03, height: 1.0 }, material: RAIL });
  }
  for (const [x, w] of [[9.55, 5.3], [17.65, 4.1]]) bx(`l11-vault-wall-s-${x}`, x, FY - 1, 67, w, 3.6, 0.2, WALL);
  bx("l11-vault-ceil", 13.3, -0.42, 78, 13, 0.15, 22.4, DARK);
  // 2006 IRT tile: a maroon band at shoulder height and a mosaic cap, riveted girders on painted columns under the slab
  const BAND = { color: "oklch(0.42 0.11 25)", roughness: 0.4 }, CAP = { color: "oklch(0.55 0.08 75)", roughness: 0.45 };
  for (const [id, x, z, w, d] of [["w", 7.02, 78, 0.02, 22], ["e", 19.58, 78, 0.02, 22], ["n", 15.4, 88.98, 8.6, 0.02]]) {
    bx(`l11-vault-band-${id}`, x, FY + 1.45, z, w, 0.22, d, BAND, { physics: undefined });
    bx(`l11-vault-cap-${id}`, x, FY + 0.0, z, w, 0.28, d, CAP, { physics: undefined });
  }
  for (const [i, z] of [68.5, 72.5, 76.5, 80.5, 84.5, 88.3].entries()) {
    sp(`l11-vault-girder-${i}`, { feetPosition: { x: 13.3, y: -0.62, z }, model: { id: MODELS.ibeam, forward: "-z" } });
    if (i > 0 && i < 5) sp(`l11-vault-col-${i}`, { feetPosition: { x: 12.4, y: FY, z }, model: { id: MODELS.column, forward: "-z" }, physics: { body: "static", collider: "box" } });
  }
  for (let z = 70; z <= 86; z += 5.3) sp(`l11-vault-lamp-${z}`, LAMP(z, 15.3, z, z === 80.6 ? "oklch(0.6 0.08 120)" : undefined, z === 80.6 ? 0.8 : 2.2));
  // the dead train in the pit: one long car, doors open onto nothing
  bx("l11-vault-train", 9, FY - 1.0, 79, 3.2, 2.9, 15, { color: "oklch(0.62 0.02 250)", metalness: 0.6, roughness: 0.45 }, { children: [
    ...[-5, -1.5, 2, 5.5].map((dz) => ({ feetPosition: { x: 1.61, y: 1.1, z: dz }, primitive: { kind: "box", width: 0.02, height: 0.8, depth: 1.8 }, material: { color: "oklch(0.25 0.03 220)", roughness: 0.1, metalness: 0.4 } })),
    { feetPosition: { x: 0, y: 2.0, z: -7.52 }, primitive: { kind: "box", width: 1.6, height: 0.35, depth: 0.02 }, material: { color: "oklch(0.2 0.01 0)" }, ui: `<div face="front" width="1.6m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#111;color:#e8a33a;font:900 150px Arial">14 · NOT IN SERVICE</div>` },
  ] });
  // turnstiles, benches, bins, a newspaper-strewn corner
  for (let k = 0; k < 3; k++) sp(`l11-vault-turn-${k}`, { feetPosition: { x: 13.3 + k * 1.1, y: FY, z: 68.4 }, primitive: null, material: null, model: { id: MODELS.turnstile, forward: "-z" }, physics: { body: "static", collider: "box" } });
  sp("l11-vault-mvm", { feetPosition: { x: 18.95, y: FY, z: 69.2 }, rotation: { yaw: -90 }, model: { id: MODELS.mvm, forward: "-z" }, physics: { body: "static", collider: "box" } });
  for (const [i, z] of [[0, 74], [1, 83]]) sp(`l11-vault-bench-${i}`, { feetPosition: { x: 18.9, y: FY, z }, rotation: { yaw: -90 }, model: { id: MODELS.bench, forward: "-z" }, physics: { body: "static", collider: "box" } });
  sp("l11-vault-bin", { feetPosition: { x: 18.9, y: FY, z: 78.5 }, model: { id: MODELS.bin, forward: "-z" }, physics: { body: "static", collider: "box" } });
  sp("l11-vault-crate-plat", { tags: ["usable"], feetPosition: { x: 17.8, y: FY, z: 87.6 }, model: { id: MODELS.meg_cache, forward: "-z", materials: { metal: STEEL } }, physics: { body: "static", collider: "box" }, behavior: "scripts/level11-use.js", state: { kind: "supply-chest", name: "Abandoned Commuter Locker", verb: "Search" } });
  // the Sedco vault, off the east wall at z 76..82: a second gate, SEDCO-SEC-01's
  bx("l11-vault-sfloor", 23, FY - 0.3, 79, 6.4, 0.3, 7, { color: "oklch(0.5 0.01 80)", roughness: 0.4, metalness: 0.3 });
  bx("l11-vault-swall-e", 26.3, FY, 79, 0.2, 2.6, 7, VAULT); bx("l11-vault-swall-n", 23, FY, 82.6, 6.6, 2.6, 0.2, VAULT); bx("l11-vault-swall-s", 23, FY, 75.4, 6.6, 2.6, 0.2, VAULT);
  bx("l11-vault-sceil", 23, -0.42, 79, 6.8, 0.15, 7.4, DARK);
  sp("l11-gate-sedco", { tags: ["usable"], feetPosition: { x: 19.75, y: FY, z: 79 }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 2.4, height: 2.4, depth: 0.3 }, material: VAULT, physics: { body: "kinematic", collider: "box" }, behavior: "scripts/l11-gate.js", state: { key: "sedco", host: "SEDCO-SEC-01", name: "Sedco Vault Door", verb: "Locked:", info: "SEDCO-SEC-01 controls it", drop: 2.6 },
    children: [{ feetPosition: { x: 0, y: 1.2, z: -0.17 }, rotation: { pitch: 90 }, primitive: { kind: "cylinder", radiusTop: 0.45, radiusBottom: 0.45, height: 0.08 }, material: { color: "oklch(0.7 0.03 85)", metalness: 0.9, roughness: 0.25 } }] });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) bx(`l11-vault-box-${r}-${c}`, 26.1, FY + 0.3 + r * 0.5, 76.6 + c * 0.82, 0.2, 0.44, 0.76, { color: "oklch(0.68 0.04 85)", metalness: 0.85, roughness: 0.3 }, { physics: undefined });
  sp("l11-vault-lamp-s", LAMP("s", 23, 79, "oklch(0.95 0.05 85)", 2.6));
  sp("l11-vault-crate-sedco", { tags: ["usable"], feetPosition: { x: 23.5, y: FY, z: 81.4 }, model: { id: MODELS.meg_cache, forward: "-z", materials: { metal: VAULT } }, physics: { body: "static", collider: "box" }, behavior: "scripts/level11-use.js", state: { kind: "supply-chest", name: "Sedco Deposit Strongbox", verb: "Crack Open" } });
  sp("l11-vault-crate-sedco2", { tags: ["usable"], feetPosition: { x: 22, y: FY, z: 77 }, model: { id: MODELS.meg_cache, forward: "-z", materials: { metal: VAULT } }, physics: { body: "static", collider: "box" }, behavior: "scripts/level11-use.js", state: { kind: "supply-chest", name: "Sedco Cash Cart", verb: "Take" } });
  layDepths(ctx, { sp, bx, cyl }); // the crawl north of the pit to the sealed Backrooms Robotics storeroom
}
