// Level 31 · rental zone (map: scripts/lib/level31.js ZONES.rental). One export, called once per lay by places/level31/sim.js.
// The skate rental: a blue booth on the south wall, a long laminate counter, cubbies of rental quads behind it, the Coach.
// Meshes: art/l31-rental/build.py (skate pairs by heel size, the lacing bench, the foot measure).
import { critterSpec, anime } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { npcState } from "./stats.js";
const box = (w, h, d) => ({ kind: "box", width: w, height: h, depth: d });
const SK = { // heel size -> pair
  5: "/cdn/value.3a7c408e5aaa1f079f2cfff0ab9170412c0fbcaf4e719f76563f9ea945507e88.glb", 6: "/cdn/value.7bb71bfcd7333e1a8234a8e21b9a186d1931dd7595b46e483b937b8d18da91de.glb",
  7: "/cdn/value.bfc3c25c53b74d9e76873012cf4dec3b8158aca20ef3f38c7eac74082051630f.glb", 8: "/cdn/value.68f4caf60f12a9aeaa5bad197add0328c1541fc19244e00e3beee532d21f53f0.glb",
  9: "/cdn/value.50cbde599a801483046a42a5bf50efb5f213904de0912ad6ad302ad585920680.glb", 10: "/cdn/value.73df6f890990df283878c545048bedabf46795e60935b8afa4d4be332ec720de.glb",
  11: "/cdn/value.983988c12d557b2b0714742e0c20c461f4c302c4b51d58827b5f46673833c359.glb", 12: "/cdn/value.5af45fb869e1d15dc191956551c665aabd921077031af02a5a0083d553e19a6b.glb" };
const BENCH = "/cdn/value.d7cea77050bf808057ebd11fcbcf51d41b6c5876d49ee091b623b4c4ce951057.glb";
const DEVICE = "/cdn/value.a8ed16270cd315a528b70f02a700244e67b7223f81dde9a6789b7b34ac548b08.glb";
const HAIR = "/cdn/value.fd23ca47268c42086b88d64676516533e9fcbeaeb13cb3d3dc12b4d4051b6151.glb"; // hair.yml styles.m_crop
const BLUE = { texture: "cdn/texture-painted-cinder-block-wall-royal-blue.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.93 0.04 255)", roughness: 0.85, emissive: "#2a55c8", emissiveIntensity: 0.32 };
const LAM = { texture: "cdn/texture-cream-speckled-laminate-countertop.png", wrap: "repeat", repeat: [1, 1], color: "oklch(0.95 0.02 90)", roughness: 0.35 };
const FRONT = { texture: "cdn/texture-wood-grain-laminate-panel-honey-oak.png", wrap: "repeat", repeat: [0.8, 0.8], color: "oklch(0.92 0.03 75)", roughness: 0.6 };
const MEL = { color: "oklch(0.86 0.02 90)", roughness: 0.7 };
const RUB = { texture: "cdn/texture-black-ribbed-rubber-floor-runner.png", wrap: "repeat", repeat: [1, 1], color: "oklch(0.9 0 0)", roughness: 0.95 };
const DARK = { color: "#141218", roughness: 0.8 };
const glow = (c, e = 3) => ({ color: c, emissive: c, emissiveIntensity: e, roughness: 0.4 });
// the shelf run: 24 cubbies wide, 5 high, on a closed base
const S = { x0: 7.96, cols: 24, cw: 0.42, rows: 5, rh: 0.34, base: 0.45, z: 29.76, d: 0.38 };
const h32 = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

function booth(ctx) {
  const W = S.cols * S.cw, cx = S.x0 + W / 2, top = S.base + S.rows * S.rh, kids = [];
  // wings and the header that carries the neon
  for (const x of [5.9, 20.1]) kids.push({ feetPosition: { x: x - 13, y: 0, z: -2.87 }, primitive: box(0.16, 3.3, 5.8), material: BLUE, physics: "static" });
  kids.push({ feetPosition: { x: 0, y: 2.45, z: -5.69 }, primitive: box(14.36, 0.85, 0.16), material: BLUE, castShadow: false });
  kids.push({ feetPosition: { x: 0, y: 2.43, z: -5.69 }, primitive: box(14.36, 0.03, 0.2), material: glow("#ff4fa8", 2.2), castShadow: false });
  // the cubby carcass
  kids.push({ feetPosition: { x: cx - 13, y: 0, z: S.z - 29.97 }, primitive: box(W + 0.04, S.base, S.d), material: FRONT, physics: "static" });
  kids.push({ feetPosition: { x: cx - 13, y: S.base, z: S.z - 29.97 + S.d / 2 - 0.01 }, primitive: box(W + 0.04, S.rows * S.rh + 0.02, 0.012), material: MEL, castShadow: false });
  for (let r = 0; r <= S.rows; r++) kids.push({ feetPosition: { x: cx - 13, y: S.base + r * S.rh - 0.02, z: S.z - 29.97 }, primitive: box(W + 0.04, 0.02, S.d), material: MEL, castShadow: false });
  for (let c = 0; c <= S.cols; c++) kids.push({ feetPosition: { x: S.x0 + c * S.cw - 13, y: S.base, z: S.z - 29.97 }, primitive: box(0.02, S.rows * S.rh, S.d), material: MEL, castShadow: false });
  kids.push({ feetPosition: { x: cx - 13, y: top, z: S.z - 29.97 }, primitive: box(W + 0.1, 0.06, S.d + 0.04), material: FRONT, castShadow: false });
  // the paint: thin blue panels over the purple, the whole zone wide
  ctx.spawn("l31-rental-bp", { feetPosition: { x: 13, y: 0, z: 29.97 }, primitive: box(22, 5, 0.04), material: BLUE, castShadow: false, tags: ["l31-rental"], children: kids });
  ctx.spawn("l31-rental-shelfstop", { feetPosition: { x: cx, y: S.base, z: S.z }, primitive: box(W, S.rows * S.rh, S.d), visible: false, physics: "static" });
}
function skates(ctx) {
  for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
    const h = h32(`sk${r}.${c}`); if (h % 100 < 24) continue; // out on the floor
    const size = 5 + Math.floor(c / 3);
    ctx.spawn(`l31-rental-sk-${r}-${c}`, { feetPosition: { x: S.x0 + (c + 0.5) * S.cw + ((h >> 8) % 5 - 2) * 0.012, y: S.base + r * S.rh, z: S.z - 0.02 + ((h >> 12) % 4) * 0.01 }, rotation: { yaw: ((h >> 16) % 9) - 4 },
      model: SK[size], castShadow: false, visibleRange: { max: 48 }, tags: ["l31-rental"] });
  }
}
function counter(ctx) {
  const L = 13.1, cx = 6 + L / 2; // x 6..19.1, the flip-up gap from there to the east wing
  ctx.spawn("l31-rental-counter", { feetPosition: { x: cx, y: 0.1, z: 24.5 }, primitive: box(L, 0.92, 0.6), material: FRONT, physics: "static", tags: ["l31-rental"], children: [
    { feetPosition: { x: 0, y: -0.1, z: 0.03 }, primitive: box(L, 0.1, 0.5), material: DARK },
    { feetPosition: { x: 0.02, y: 0.92, z: -0.03 }, primitive: box(L + 0.06, 0.05, 0.76), material: LAM },
    { feetPosition: { x: 0, y: 0.86, z: -0.385 }, primitive: box(L + 0.06, 0.05, 0.05), material: { color: "#b9b4a8", metalness: 0.8, roughness: 0.35 } },
    // the flap, stood open on its hinge
    { feetPosition: { x: L / 2 + 0.06, y: 0.97, z: -0.03 }, rotation: { roll: -7 }, primitive: box(0.05, 0.98, 0.76), material: LAM },
    // US size chart, screwed to the front
    { feetPosition: { x: -3.2, y: 0.08, z: -0.31 }, primitive: box(1.25, 0.76, 0.02), material: { color: "#f3efe2", roughness: 0.5 },
      ui: `<div face="front" width="1.25m" style="height:760px;box-sizing:border-box;padding:20px 30px;background:#f3efe2;color:#1b2a55;font-family:sans-serif"><div style="font-size:76px;font-weight:900;letter-spacing:6px;border-bottom:8px solid #c7362b;padding-bottom:6px">US SIZES</div>${[["MEN", 5, 6, 7, 8, 9, 10, 11, 12], ["WOMEN", "6½", "7½", "8½", "9½", "10½", "11½", "12½", "13½"], ["CM", 23, 24, 25, 26, 27, 28, 29, 30]].map((row, i) => `<div style="display:flex;align-items:center;height:130px;margin-top:${i ? 0 : 14}px;background:${i % 2 ? "#e3dcc6" : "#f3efe2"};font-size:62px;font-weight:800">${row.map((v, j) => `<div style="${j ? "width:105px;text-align:center;font-size:50px" : "width:300px;font-size:52px;color:#c7362b"}">${v}</div>`).join("")}</div>`).join("")}<div style="font-size:40px;margin-top:14px">Kids sizes, ask at the counter. Wheels run true.</div></div>` },
    // a taped paper note, a little crooked
    { feetPosition: { x: 2.4, y: 0.38, z: -0.305 }, rotation: { roll: 3 }, primitive: box(0.3, 0.21, 0.004), material: { color: "#fbfaf2", roughness: 0.9 },
      ui: `<div face="front" width="0.3m" style="height:210px;box-sizing:border-box;padding:18px 16px;background:#fbfaf2;color:#22201c;font-family:cursive;font-size:30px;line-height:1.15;text-align:center;font-weight:700">socks on,<br>please!<div style="font-size:21px;font-weight:400;margin-top:10px">street shoes stay off the wood</div></div>`,
      children: [{ feetPosition: { x: -0.11, y: 0.185, z: -0.003 }, rotation: { roll: 30 }, primitive: box(0.07, 0.025, 0.002), material: { color: "#d9cf9a", roughness: 0.4, transparent: true, opacity: 0.8 } }, { feetPosition: { x: 0.11, y: 0.185, z: -0.003 }, rotation: { roll: -35 }, primitive: box(0.07, 0.025, 0.002), material: { color: "#d9cf9a", roughness: 0.4, transparent: true, opacity: 0.8 } }] },
    // price card in a stand on the top
    { feetPosition: { x: 1.3, y: 0.97, z: -0.2 }, rotation: { pitch: -12 }, primitive: box(0.3, 0.22, 0.012), material: { color: "#101014", roughness: 0.3 },
      ui: `<div face="front" width="0.3m" style="height:220px;box-sizing:border-box;padding:14px;background:#14213f;color:#ffd84a;font-family:sans-serif;text-align:center;border:6px solid #ffd84a"><div style="font-size:30px;letter-spacing:4px;font-weight:700">SKATE HIRE</div><div style="font-size:92px;font-weight:900;line-height:1">$5</div><div style="font-size:22px;color:#fff">a pair · all sizes</div></div>` },
  ] });
  // neon script on the header
  ctx.spawn("l31-rental-neon", { feetPosition: { x: 13, y: 2.56, z: 24.2 }, primitive: box(5.2, 0.66, 0.03), material: { color: "#0d1230", roughness: 0.6 }, castShadow: false, tags: ["l31-rental"],
    ui: `<div face="front" emissive width="5.2m" style="height:660px;display:flex;align-items:center;justify-content:center;background:#0d1230;font-family:cursive;font-style:italic;font-weight:700;font-size:520px;line-height:1;color:#dffcff;text-shadow:0 0 18px #3fe0ff,0 0 60px #3fe0ff,0 0 130px #1c8cff">Skate Rental</div>` });
}
function floor(ctx) {
  for (const [i, x] of [9.4, 16.6].entries()) ctx.spawn(`l31-rental-bench${i}`, { feetPosition: { x, y: 0, z: 22.3 }, physics: "static", tags: ["l31-rental"],
    model: { id: BENCH, materials: { carpet: { texture: "cdn/texture-blue-loop-pile-commercial-carpet.png", color: "oklch(0.92 0.05 260)", roughness: 1 } } } });
  ctx.spawn("l31-rental-fitmat", { feetPosition: { x: 11.3, y: 0, z: 22.95 }, rotation: { yaw: 14 }, primitive: box(0.62, 0.014, 0.86), material: RUB, castShadow: false, tags: ["l31-rental"],
    children: [{ feetPosition: { x: 0, y: 0.014, z: 0 }, model: DEVICE, scale: 1 }] });
  // the rubber runner: counter, out to the aisle, along it, up to the south gate of the rink
  const mat = (id, x, z, w, d) => ctx.spawn(`l31-rental-mat${id}`, { feetPosition: { x, y: 0, z }, primitive: box(w, 0.016, d), material: RUB, castShadow: false, receiveShadow: true, tags: ["l31-rental"] });
  mat(0, 13, 22.2, 1.3, 3.9); mat(1, 6.5, 19.6, 14.3, 1.3); mat(2, 0, 15.75, 1.3, 6.4);
  ctx.spawn("l31-rental-light0", { feetPosition: { x: 9.6, y: 2.95, z: 26.9 }, light: { kind: "point", color: "#ffd9a8", intensity: 5, distance: 9 } });
  ctx.spawn("l31-rental-light1", { feetPosition: { x: 16.4, y: 2.95, z: 26.9 }, light: { kind: "point", color: "#ffd9a8", intensity: 5, distance: 9 } });
  ctx.spawn("l31-rental-light2", { feetPosition: { x: 13, y: 2.3, z: 22.9 }, light: { kind: "point", color: "#8fdcff", intensity: 1.8, distance: 8 } });
}
function coach(ctx) {
  const id = "l31-coach";
  const look = npcLook(id, { species: "faceling", sex: "m", fur: "#f3cfad", hair: "none", topw: "breton", top: "#e9e4d8", botw: "pants", bot: "#1c1c22", shoes: "sneakers", shoe: "#22201e", clothesOwn: true, bodyOwn: true }, "wanderer", 10, "trader");
  ctx.spawn("l31-rental-riser", { feetPosition: { x: 12.55, y: 0, z: 25.75 }, primitive: box(13.1, 0.45, 1.8), material: RUB, physics: "static", castShadow: false, tags: ["l31-rental"] });
  ctx.spawn(id, { tags: ["npc", "l31-rental", "docile"], feetPosition: { x: 13, y: 0.46, z: 25.7 }, rotation: { yaw: 0 }, physics: "character",
    ...critterSpec(look), scale: 1.25, behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { ...npcState(ctx, "agent", 80), name: "Coach", role: "trader", faction: "survivor", voice: "l31-coach", docile: true, essential: true, post: { x: 13, z: 25.7 }, home: { x: 13, y: 0.46, z: 25.7 } } });
  // facelings come bald from the shared path; his brown crop rides the head as its own child
  ctx.spawn({ id: "coach-hair", parent: id, attachment: { skin: true }, model: { id: HAIR, materials: { hair: anime("hair", "#5a3a26"), scalp: { color: "#48301f", roughness: 0.9 }, scalp_cap: { color: "#48301f", roughness: 0.9 } } } });
  ctx.spawn({ id: "coach-tag", parent: id, attachment: { bone: "Spine2" }, feetPosition: { x: 0.07, y: 0.02, z: 0.15 }, primitive: box(0.085, 0.03, 0.004), material: { color: "#f7f5ee", roughness: 0.4 }, castShadow: false,
    ui: `<div face="back" width="0.085m" style="height:30px;display:flex;align-items:center;justify-content:center;background:#f7f5ee;color:#14213f;font-family:sans-serif;font-weight:900;font-size:20px;letter-spacing:2px;border-top:6px solid #c7362b">COACH</div>` });
}
export function layRental(ctx) {
  if (ctx.getObject("l31-rental-bp")) ctx.destroy("l31-rental-bp");
  if (ctx.getObject("l31-coach")) ctx.destroy("l31-coach");
  booth(ctx); skates(ctx); counter(ctx); floor(ctx); coach(ctx);
}
