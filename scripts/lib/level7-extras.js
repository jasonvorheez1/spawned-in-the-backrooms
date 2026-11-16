// Level 7's fleshing out (backrooms-wiki.wikidot.com/level-7): the inside of Fort Surrender, the sea floor, the seamount under the entrance and the Level 9 door.
// Laid by places/level7/sim.js lay(). Ids start l7x- so a rebuild can clear them.
const FC = { x: -70, y: 11.0, z: -93 };
const DECK = 11.65; // the fort's plank floor (l7-fort-walk-floor top): everything inside the fort stands on it, not on FC.y below the boards // the fort's centre (its model is at this point; Blender (x, y) lands at world (x, -y))
const TAR = { color: "oklch(0.1 0.01 280)", roughness: 0.15, metalness: 0.15 };
const BONE = { color: "oklch(0.78 0.03 90)", roughness: 0.85 };
const WOOD = { color: "oklch(0.3 0.04 55)", roughness: 0.9 };
const CLOTH = { color: "oklch(0.3 0.03 80)", roughness: 0.95 };
const BUBBLE = `fx
pop b rate=%r|4 on=disc(.7) life=.7..1.4 v=up(.8..1.6) size=.05..0.16 acc=drag(1.2) col=<.15,.17,.2> a=.7>0 sz=$size*(.6>1.4) r=sprite(smoke-puff,alpha)`;
const CHALK = (t, sub) => `<div face="front" width="1.5m" style="font-size:84px;font-weight:900;color:#e8e2d0;text-align:center;line-height:1.05;font-family:cursive">${t}${sub ? `<div style="font-size:40px;opacity:.8">${sub}</div>` : ""}</div>`;
const W = (a, r) => ({ x: FC.x + Math.cos(a) * r, z: FC.z - Math.sin(a) * r }); // a point at angle a (the model's frame) and radius r

import { kitted } from "./usable-kit.js";
export function layExtras(ctx, GLB, fit) {
  const sp = (id, spec) => ctx.spawn(`l7x-${id}`, kitted("level7", `l7x-${id}`, spec));
  // ---- inside the fort
  // the tar pit: a round pool in the courtyard that bubbles, faintly lit from below with the colour of the deep
  sp("tarpit", { feetPosition: { x: FC.x - 5.2, y: DECK + 0.06, z: FC.z + 1.5 }, primitive: { kind: "cylinder", radiusTop: 1.5, radiusBottom: 1.5, height: 0.08 }, material: TAR, fx: { script: BUBBLE, params: { r: 6 } }, children: [{ feetPosition: { x: 0, y: 0.6, z: 0 }, light: { kind: "point", color: "oklch(0.62 0.1 195)", intensity: 1.1, distance: 9 } }] });
  sp("tarpit-rim", { feetPosition: { x: FC.x - 5.2, y: DECK + 0.02, z: FC.z + 1.5 }, primitive: { kind: "cylinder", radiusTop: 1.75, radiusBottom: 1.85, height: 0.14 }, material: { color: "oklch(0.22 0.01 250)", roughness: 0.95 } });
  // tar pots on the wall tops and by the tower, each with a low red-orange flame
  [[0.2, 7.2], [1.0, 7.4], [2.2, 7.2], [3.7, 7.3], [4.9, 7.2], [5.6, 7.4]].forEach(([a, r], i) => {
    const p = W(a, r);
    sp(`pot-${i}`, { feetPosition: { x: p.x, y: DECK, z: p.z }, primitive: { kind: "cylinder", radiusTop: 0.28, radiusBottom: 0.2, height: 0.5 }, material: { color: "oklch(0.2 0.03 40)", roughness: 0.6, metalness: 0.5 }, children: [{ feetPosition: { x: 0, y: 0.62, z: 0 }, light: { kind: "point", color: "oklch(0.72 0.17 48)", intensity: 1.5, distance: 9 } }] });
  });
  // the bunks: a rag pallet, a crate and a hurricane lamp in each lean-to (the shanties stand at radius 6 in the model)
  [0.5, 1.2, 1.9, 2.6, 3.4, 4.1, 5.9].forEach((a, i) => {
    const p = W(a, 5.4);
    sp(`bunk-${i}`, { feetPosition: { x: p.x, y: DECK + 0.1, z: p.z }, rotation: { yaw: (a * 57.3 + 90) % 360 }, primitive: { kind: "box", width: 1.7, height: 0.2, depth: 0.8 }, material: CLOTH });
    sp(`bunkbox-${i}`, { feetPosition: { x: p.x + 0.5, y: DECK + 0.25, z: p.z - 0.5 }, tags: ["container", "breakable"], model: GLB.crate, layout: fit(0.6, 0.6, 0.6), physics: { body: "static", collider: "box" }, state: { mat: "wood", hp: 40, maxHp: 40, name: "Worshipper's crate", items: i % 2 ? "almond,bandage" : "ration,tape" } });
    sp(`bunklamp-${i}`, { feetPosition: { x: p.x - 0.4, y: DECK + 0.5, z: p.z + 0.4 }, light: { kind: "point", color: "oklch(0.78 0.14 70)", intensity: 0.9, distance: 6 } });
  });
  // offerings round the altar: bones laid in a ring, tins and bottles, candles
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2, x = FC.x + Math.cos(a) * 2.6, z = FC.z - 8 + Math.sin(a) * 1.6;
    sp(`bone-${k}`, { feetPosition: { x, y: DECK + 0.05, z }, rotation: { yaw: k * 33 }, primitive: { kind: "box", width: 0.55, height: 0.07, depth: 0.08 }, material: BONE });
  }
  [[-1.4, -8.2], [1.4, -8.2], [0, -9.3]].forEach(([dx, dz], i) => sp(`candle-${i}`, { feetPosition: { x: FC.x + dx, y: DECK, z: FC.z + dz }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.05, height: 0.3 }, material: BONE, children: [{ feetPosition: { x: 0, y: 0.4, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.14 78)", intensity: 0.8, distance: 5 } }] }));
  // (the chalk boards were removed: Shelly, Nov 12)
  // drying nets and a rack of grey fish nobody has ever caught (they say), under the tower
  sp("rack", { feetPosition: { x: FC.x + 3.4, y: DECK + 1.0, z: FC.z - 7.3 }, primitive: { kind: "box", width: 2.2, height: 0.08, depth: 0.08 }, material: WOOD });
  for (let k = 0; k < 6; k++) sp(`fish-${k}`, { feetPosition: { x: FC.x + 2.5 + k * 0.35, y: DECK + 0.55, z: FC.z - 7.3 }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 0.07, height: 0.55, depth: 0.04 }, material: { color: "oklch(0.55 0.015 230)", roughness: 0.7 } });

  // ---- the sea floor: tar mounds that bubble, pipe stubs and old bones, the first ones near the shore (the Twilight zone is where they thicken)
  [[18, 30], [-40, 25], [60, 5], [-20, -70], [35, -40], [-100, 60], [10, 90], [-60, -20]].forEach(([x, z], i) => {
    sp(`mound-${i}`, { feetPosition: { x, z, y: { terrain: 0.1 } }, primitive: { kind: "sphere", radius: 1.2 + (i % 3) * 0.5 }, scale: { x: 1.4, y: 0.45, z: 1.2 }, material: TAR, fx: { script: BUBBLE, params: { r: 3 } } });
  });
  [[-150, 12], [-160, -9], [-141, -14], [-158, 4]].forEach(([x, z], i) => sp(`pipe-${i}`, { feetPosition: { x, z, y: { terrain: 1.0 } }, rotation: { yaw: i * 71, roll: 90 }, primitive: { kind: "cylinder", radiusTop: 0.7, radiusBottom: 0.7, height: 6 + i }, material: { color: "oklch(0.3 0.06 40)", roughness: 0.9, metalness: 0.5 } }));

  // ---- the seamount under the entrance: the wiki's tall mountain almost directly below, with the cave mouth to Level 8 on its flank (terrain7.js raises it)
  sp("cave-mouth", { feetPosition: { x: 6, z: 14, y: { terrain: 0.05 } }, primitive: { kind: "box", width: 5, height: 4.2, depth: 1.2 }, material: { color: "oklch(0.03 0.01 280)", roughness: 1 }, children: [{ feetPosition: { x: 0, y: 1.2, z: 0.8 }, light: { kind: "point", color: "oklch(0.55 0.1 200)", intensity: 1.0, distance: 12 } }] });

  // ---- the Level 9 door: a wooden door in the floor of the circular formation. It does not open yet: knocking is a bad idea
  sp("hatch", { tags: ["usable"], feetPosition: { x: -150, y: { terrain: 0.55 }, z: 0 }, primitive: { kind: "box", width: 1.7, height: 0.12, depth: 1.7 }, material: { color: "oklch(0.3 0.06 55)", roughness: 0.9 }, behavior: "scripts/l7-use.js",
    state: { kind: "hatch", name: "Wooden door in the floor", verb: "Try the door", info: "Built into the platform at the centre of the formation. Tiny's lair is round it.", tint: "#9ad6c8", c: { x: -150, y: -21, z: 0 } } });
}
