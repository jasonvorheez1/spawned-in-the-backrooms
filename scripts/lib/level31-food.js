// Level 31 · food zone (map: scripts/lib/level31.js ZONES.food). One export, called once per lay by places/level31/sim.js.
// l31Order is the clerk's menu: scripts/talk.js calls it for a dialogue node with do: "l31:<key>" (dlg-generic.yml l31-food-clerk).
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { rbox } from "./rbox.js";

export const G = {
  table: "/cdn/value.85f5e243770f31969de327bdc34870693134536eb58b94392e7715d4fd3bc8f2.glb", chair: "/cdn/value.2d974b903f651908da4ab7d3423171988b715420cf07c9f7f15bb854bfd1b4bc.glb",
  benchO: "/cdn/value.a2c6ff61773dad10900e1d9438fd7d531ff3d50a5777942c46eb6fae0f3455cc.glb", benchG: "/cdn/value.e5b68318e51038b74580baf037ebfe2f2c615afd5454d31f109b00ef05588593.glb",
  counter: "/cdn/value.90fa2612ba24dffdd42be4104469cae5297d1d5e1c0b69f622494d64a542aa0c.glb", trash: "/cdn/value.b2b4a6b6432a1fa06b5b7221dc44910a04ad25f47bbb97a8c70c17c00913c568.glb", condi: "/cdn/value.5c5a4885c63007e6e9641d674001f1b672315abd05804698f6856ee020d726a0.glb",
  pizza: "/cdn/value.94489c95bccefcf999e9167007fdc37c595c0870ac5c55f21b53e8c977e86224.glb", grill: "/cdn/value.2f6588063f2a79088a29a82f37fd985c1b9c35479895c1e58b37177a75badbdf.glb",
  sprite: "/cdn/value.a8fa78fe97d7a4433a1f5ce5cacb2e5ae69aabe51e91ae21e867c39aaff669b7.glb", capri: "/cdn/value.edf5f857dd939618098f90a7946280471677192360f1e654e31b18e0ee79d1fc.glb",
  wings: "/cdn/value.2a86cc1225956d7affdefab951435412e8d1eff6a49fce68c60c5588dda68d47.glb", soda: "/cdn/value.dccac7a9af42b8a71ffcd628fd16438030ddc40387223fc7e2bc9cf3ac857c84.glb",
};
// what each order does to you. All free. Numbers Savi's picks.
export const L31_FOOD = {
  cheese: { name: "Cheese slice", hunger: 34, thirst: 2, sanity: 8 }, pepperoni: { name: "Pepperoni slice", hunger: 34, thirst: 2, sanity: 8 },
  mild: { name: "Mild wings", hunger: 40, thirst: 2, sanity: 6 }, hot: { name: "Hot wings", hunger: 40, thirst: 1, sanity: 6 }, toohot: { name: "Too hot wings", hunger: 40, thirst: 1, sanity: 3 },
  hotdog: { name: "Foot-long hot dog", hunger: 45, thirst: 2, sanity: 6 },
  cola: { name: "Cola", hunger: 3, thirst: 30, sanity: 5 }, orange: { name: "Orange soda", hunger: 3, thirst: 30, sanity: 5 }, lime: { name: "Lime soda", hunger: 3, thirst: 30, sanity: 5 },
  sprite: { name: "Sprite", hunger: 3, thirst: 32, sanity: 7 }, capri: { name: "Capri Sun", hunger: 4, thirst: 26, sanity: 9 },
  almond: { name: "Almond water", hunger: 2, thirst: 45, sanity: 15 },
};
export const L31_ZONE_X = 25; // west of this with a tray = you left it
export function l31Order(ctx, key) {
  const s = ctx.self.state, f = L31_FOOD[key]; if (!f) return null;
  if (s.l31banned) { s.notice = { text: "Clear your tray at the bins by the snack bar entrance.", at: ctx.now() }; return { say: "Tray first. Bins are by the entrance." }; }
  const up = (k, v) => { s[k] = Math.max(0, Math.min(100, (s[k] ?? 100) + v)); };
  up("hunger", f.hunger); up("thirst", f.thirst); up("sanity", f.sanity);
  s.l31tray = true;
  s.notice = { text: `${f.name}. Clear your tray at the bins before you leave.`, at: ctx.now() };
  return null;
}

const HAZE = `fx
pop haze rate=3 on=disc(.55) life=2.5..4 v=up(.12..0.25) size=.35..0.6 acc=buoy(.1)+drag(.8) col=<1,.72,.45> a=0>.3:.07>.7:.05>0 sz=$size*(.7>1.6) rot=spin(.1) r=sprite(smoke-puff,alpha)`;
const MENU = `<svg viewBox='0 0 640 190' width='6.4m'>
  <rect width='640' height='190' fill='#ede0bc'/>
  <rect x='7' y='7' width='626' height='176' fill='none' stroke='#49615a' stroke-width='2'/>
  <path d='M23 51H617M320 64V155' stroke='#49615a'/>
  <g font-family='sans-serif' fill='#253937'>
    <text x='24' y='35' font-size='24' font-weight='bold' letter-spacing='3'>SNACK BAR</text>
    <text x='615' y='34' text-anchor='end' font-size='15'>NO CHARGE</text>
    <g font-size='19' font-weight='bold'>
      <text x='25' y='82'>FROM THE KITCHEN</text><text x='345' y='82'>COLD DRINKS</text>
    </g>
    <g font-size='16'>
      <text x='25' y='111'>Cheese or pepperoni pizza</text><text x='345' y='111'>Cola, orange, lime, Sprite</text>
      <text x='25' y='135'>Wings: mild, hot, too hot</text><text x='345' y='135'>Capri Sun or almond water</text>
      <text x='25' y='159'>Foot-long hot dog</text>
    </g>
  </g></svg>`;
const PAPER = `<svg viewBox='0 0 60 30' width='0.6m'><rect width='60' height='30' fill='#e9e0c5'/>
  <g fill='#374640' font-family='sans-serif' text-anchor='middle' font-weight='bold'>
    <text x='30' y='11' font-size='5'>TRAY RETURN</text><text x='30' y='21' font-size='4'>Clear your tray here</text>
  </g></svg>`;
const DOORTXT = `<svg viewBox='0 0 600 90' width='0.6m'><text x='300' y='64' text-anchor='middle' font-size='62' font-family='sans-serif' font-weight='bold' fill='#f2f2ee'>STAFF ONLY</text></svg>`;
const box = (w, h, d) => ({ kind: "box", width: w, height: h, depth: d });

export function layFood(ctx) {
  for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("l31-food-")) ctx.destroy(id);
  const P = (id, spec) => ctx.spawn(`l31-food-${id}`, { castShadow: false, ...spec });
  const M = (id, key, x, z, yaw, extra = {}, y = 0) => P(id, { model: { id: G[key], forward: "+z" }, feetPosition: { x, y, z }, rotation: { yaw }, physics: { body: "static", collider: "box" }, ...extra });
  const floorY = 0.018;
  // Shelly Nov 13 (photo of a real rink cafe): cosmic glow carpet wall to wall, like the rink party rooms
  P("tile", {
    feetPosition: { x: 34, y: 0.002, z: 18.075 },
    primitive: box(15.98, 0.016, 23.83),
    material: { texture: "cdn/texture-black-cosmic-bowling-carpet-neon-pink-red-purple-swirls-and-stars.png", wrap: "repeat", repeat: [6, 9], color: "#d8d2e0", roughness: 0.97 },
    receiveShadow: true,
  });
  // the zone's root, where the blueprint stood: its lights
  const L = (x, y, z, color, intensity) => ({ feetPosition: { x, y, z }, light: { kind: "point", color, intensity, distance: 15 } });
  P("bp", { feetPosition: { x: 34, y: 0, z: 18 }, children: [L(3.2, 2.9, -4, "#fff0d9", 4), L(3.2, 2.9, 3, "#fff0d9", 4), L(-3, 3.8, 0.5, "#ffdfb7", 5), L(-2, 3.4, -8.5, "#fff0d9", 3)] });
  // serving counter along the east wall: four Tripo diner counter modules (red vinyl, chrome band, cream top), 3.5 x 0.82 x 0.84 m each, one box collider under them
  P("counter", { feetPosition: { x: 38, y: 0.1, z: 17 }, primitive: box(0.84, 0.82, 14), render: false, physics: "static" });
  for (let i = 0; i < 4; i++) P(`counter-m${i}`, { feetPosition: { x: 38, y: 0.1, z: 10.75 + i * 3.5 }, rotation: { yaw: 90 }, model: { id: G.counter }, scale: { x: 1.15, y: 0.91, z: 0.48 }, receiveShadow: true });
  M("pizza", "pizza", 38.05, 12, 90, { physics: "none" }, 0.92); M("grill", "grill", 38.05, 14.7, 90, { physics: "none" }, 0.92);
  M("wings", "wings", 38.05, 19.4, 90, { physics: "none" }, 0.92); M("soda", "soda", 38.05, 22, 90, { physics: "none" }, 0.92);
  // real Frontrooms drinks (Tripo): a row of Sprite and Capri Sun by the soda fountain, strays on the tables
  const D = (id, key, x, y, z, yaw) => P(id, { model: { id: G[key], forward: "+x" }, feetPosition: { x, y, z }, rotation: { yaw },
    layout: { box: key === "sprite" ? { min: { x: -0.033, y: 0, z: -0.033 }, max: { x: 0.033, y: 0.22, z: 0.033 } } : { min: { x: -0.1, y: 0, z: -0.1 }, max: { x: 0.1, y: 0.16, z: 0.1 } } } });
  [23.3, 23.45, 23.6].forEach((z, i) => D(`sprite${i}`, "sprite", 37.8, 0.9, z, 90 + i * 7));
  [23.85, 23.97, 24.09, 24.21].forEach((z, i) => D(`capri${i}`, "capri", 37.8, 0.9, z, 90 - i * 5));
  D("sprite-t1", "sprite", 33.16, 0.765, 14.19, 40); D("capri-t3", "capri", 29.16, 0.765, 22.52, 120); D("capri-t5", "capri", 33.24, 0.765, 22.3, 200);
  P("haze", { feetPosition: { x: 38.05, y: 1.75, z: 12 }, fx: { script: HAZE } });
  // backlit menu board on the east wall
  P("menu-box", { feetPosition: { x: 41.9, y: 2.4, z: 17 }, primitive: rbox(0.16, 2.0, 6.6), material: { color: "#1a1412", roughness: 0.6 } });
  P("menu-glow", { feetPosition: { x: 41.81, y: 2.45, z: 17 }, primitive: box(0.02, 1.9, 6.4), material: { color: "#8a7a5c", emissive: "#ffe2a8", emissiveIntensity: 0.02 } });
  P("staff-light", { feetPosition: { x: 40.05, y: 2.6, z: 28.6 }, light: { kind: "point", color: "#ffd2a0", intensity: 7, distance: 7 } });
  P("menu", { feetPosition: { x: 41.79, y: 3.4, z: 17 }, rotation: { yaw: 90 }, vector: MENU });
  // Clear trays on the way back to the rink aisle.
  P("note", { feetPosition: { x: 29.05, y: 1.72, z: 6.16 }, rotation: { yaw: 180 }, vector: PAPER });
  const CAN_INFO = ["Clear your tray before you leave. The clerk counts.", "Someone taped a plastic fork to the flap. Trays here."];
  for (const [i, x] of [28.15, 29.95].entries()) M(`trash${i + 1}`, "trash", x, 6.47, 180, { tags: ["usable"], state: { name: "Trash can", verb: "Clear tray", info: CAN_INFO[i], kind: "trash" }, behavior: ["scripts/l31-food.js", "scripts/lib/level31-food.js"] });
  const BSEAT = { tags: ["seat"], state: { name: "Bench", seat: { w: 2, gap: 0.7 } } };
  M("bench-n1", "benchO", 35.6, 6.5, 180, BSEAT); M("bench-n2", "benchG", 39.4, 6.5, 180, BSEAT);
  M("condi", "condi", 40.85, 8.15, 90, {}, floorY);
  // the staff door on the south wall
  P("door", { feetPosition: { x: 40.05, y: 0.018, z: 29.96 }, pivot: { x: 0.58, y: 0, z: 0 }, physics: { body: "kinematic", collider: "box" }, model: { id: "/cdn/value.42cc40912cdb368cf2af90712a4d55bf4d91aa4b9cd970b3a731e96c721cf974.glb", forward: "+z" } /* art/l31-staffdoor/build.py */, tags: ["usable"], state: { name: "Employees only", verb: "Open", info: "The back room.", kind: "door" }, behavior: "scripts/l31-food.js",
    children: [{ feetPosition: { x: 0, y: 0, z: 0.02 }, primitive: box(1.16, 2.18, 0.05), material: { color: "#3c3e42", roughness: 0.6 } }, { feetPosition: { x: -0.38, y: 1.0, z: -0.07 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.03, height: 0.06 }, rotation: { pitch: 90 }, material: { color: "#c9ccd0", metalness: 0.9, roughness: 0.3 } }, { feetPosition: { x: 0, y: 0.1, z: -0.035 }, primitive: box(0.9, 0.25, 0.01), material: { color: "#b9bcc0", metalness: 0.8, roughness: 0.4 } }] });
  P("door-label", { parent: "l31-food-door", feetPosition: { x: 0, y: 1.68, z: -0.035 }, rotation: { yaw: 0 }, vector: DOORTXT });
  layStaffRoom(ctx, P, M);
  // the cafe (Shelly Nov 13, her photo): long white folding tables with benches in three rows, a few knocked off true,
  // green vinyl booths in back-to-back bays along the south wall, a little laminate table between each pair
  const FT = (id, x, z, yaw, wear) => P(id, { feetPosition: { x, y: floorY, z }, rotation: { yaw }, model: { id: "/cdn/value.f106a1dcbe11b66b98bc57dfe19f96299e4e0204832815f3841c9f751e0aaf60.glb", forward: "-z" }, layout: { box: { min: { x: -1.22, y: 0, z: -0.78 }, max: { x: 1.22, y: 0.74, z: 0.78 } } }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, tags: ["seat"], state: { name: "Bench", seat: { w: 2, gap: 0.64 } } });
  const ROWS = [28.3, 31.1, 33.9], ZS = [10.6, 13.8, 17.0, 20.2, 23.4];
  let n = 0;
  for (const [r, x] of ROWS.entries()) for (const [k, z] of ZS.entries()) {
    if (r === 2 && k === 2) continue; // the gap the queue cuts through to the counter
    const j = n++, dx = ((j * 37) % 7 - 3) * 0.03, yaw = 90 + ((j * 53) % 9 - 4) * 0.9;
    FT(`ftable${r}-${k}`, x + dx, z + ((j * 13) % 5 - 2) * 0.04, yaw, j % 3 === 0 ? 1 : 0);
  }
  const BOOTHC = ["#2f9a4a", "#2c9446", "#33a04f"];
  const BB = (id, x, z, yaw, k) => P(id, { feetPosition: { x, y: floorY, z }, rotation: { yaw }, model: { id: "/cdn/value.bacfe730c242d1a69d417c6ecbb04e237c11115d2f6602751c6ed06fd9ca92b3.glb", forward: "+x" }, layout: { box: { min: { x: -0.7, y: 0, z: -0.3 }, max: { x: 0.7, y: 1.05, z: 0.3 } } }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, tags: ["seat"], state: { name: "Booth" } });
  const BOOTHZ = 29.1;
  for (let i = 0; i < 5; i++) {
    const x0 = 27.0 + i * 1.95; // each bay: bench facing +x, table, bench facing -x
    BB(`booth${i}a`, x0, BOOTHZ, 90, i); BB(`booth${i}b`, x0 + 1.32, BOOTHZ, -90, i + 1);
    P(`btable${i}`, { feetPosition: { x: x0 + 0.66, y: floorY, z: BOOTHZ }, primitive: { kind: "scripted", script: "scripts/l31-diner-table.js", params: { round: false, size: 0.38 } }, scale: { x: 1, y: 1, z: 1.7 }, physics: "static", receiveShadow: true });
  }
  // what people left: drinks and a napkin pile on the folding tables
  D("sprite-t1", "sprite", 31.1, 0.76 + floorY, 13.5, 40); D("capri-t3", "capri", 28.4, 0.76 + floorY, 23.1, 120); D("capri-t5", "capri", 33.8, 0.76 + floorY, 20.6, 200);
  D("capri-b0", "capri", 27.6, 0.765 + floorY, 29.0, 60); D("sprite-b1", "sprite", 31.6, 0.765 + floorY, 29.2, 10);
  // overhead: café string lights swagged across the room, and coloured tube lights down both long walls
  for (let i = 0; i < 4; i++) {
    const z0 = 8 + i * 6;
    P(`strand${i}`, { feetPosition: { x: 26.4, y: 3.9, z: z0 }, spline: { kind: "stringlight", points: [[0, 0, 0], [3.8, -0.55, 2.2], [7.6, 0, 0.6], [11.4, -0.6, 3.2], [15.2, 0, 1.4]] } });
  }
  const TUBES = [["#7dff9a", 26.2], ["#ff5fa8", 41.6]];
  for (const [col, x] of TUBES) for (let i = 0; i < 3; i++) {
    const z = 10 + i * 7.5;
    P(`tube-${x}-${i}`, { feetPosition: { x, y: 4.2, z }, primitive: { kind: "capsule", radius: 0.05, halfHeight: 1.5 }, rotation: { pitch: 90 }, material: { color: col, emissive: col, emissiveIntensity: 3, roughness: 0.3 }, castShadow: false,
      children: [{ feetPosition: { x: 0, y: 0, z: 0 }, light: { kind: "point", color: col, intensity: 3, distance: 9 } }] });
  }
  // neon over the counter, pink script with a teal underline; the old menu board stays
  P("neon", { feetPosition: { x: 41.75, y: 4.9, z: 17 }, rotation: { yaw: 90 }, vector: `<svg viewBox='0 0 420 120' width='3.4m'><rect x='4' y='4' width='412' height='112' rx='14' fill='#c7362b'/><rect x='14' y='14' width='392' height='92' rx='8' fill='#fff7e2' filter='drop-shadow(0 0 8 #fff1c0)'/><text x='210' y='80' text-anchor='middle' font-family='sans-serif' font-weight='900' font-size='64' letter-spacing='10' fill='#c7362b'>SNACKS</text><path d='M70 94 Q90 86 110 94 T150 94 T190 94 T230 94 T270 94 T310 94 T350 94' stroke='#e6b21c' stroke-width='5' fill='none' stroke-linecap='round'/><circle cx='30' cy='28' r='3' fill='#7a1d16'/><circle cx='390' cy='28' r='3' fill='#7a1d16'/></svg>` });
  P("neon-glow", { feetPosition: { x: 41.2, y: 4.9, z: 17 }, light: { kind: "point", color: "#ff7cc8", intensity: 2, distance: 7 } });
  // raised rubber mat behind the counter: the clerk stands on it so he reads at full height over the top
  P("duckboard", { feetPosition: { x: 40.1, y: 0, z: 17 }, primitive: rbox(3.2, 0.32, 13.4), material: { color: "#1b1b1d", roughness: 0.9 }, physics: "static", castShadow: false, receiveShadow: true });
  // people: the clerk behind the counter, two customers at the southwest table
  const person = (id, look, x, z, yaw, state, sit, y = 0) => P(id, { tags: ["npc", "faceling"], feetPosition: { x, y, z }, rotation: { yaw }, physics: sit ? "none" : "character", ...critterSpec(npcLook(`l31-food-${id}`, { species: "faceling", ...look }, "wanderer", 1)),
    behavior: sit ? ["scripts/l31-food.js"] : ["scripts/humanoid-locomotion.js", "scripts/l31-food.js"], state: { faction: "faceling", hp: 60, docile: true, essential: true, sex: look.sex, ...state } });
  person("clerk", { sex: "m", topw: "apron", top: "#c8201c", botw: "pants", bottom: "#1c1c22", shoes: "sneakers", hat: "cap" }, 39.5, 17, 90, { name: "Counter clerk", role: "clerk", kind: "clerk", home: { x: 39.5, z: 17 } }, false, 0.32);
  ctx.spawn("l31-food-tag", { parent: "l31-food-clerk", attachment: { bone: "Spine2" }, feetPosition: { x: 0.09, y: 0.1, z: 0.125 }, primitive: box(0.075, 0.028, 0.006), material: { color: "#f4f2ea", roughness: 0.4 }, castShadow: false });
  person("cust1", { sex: "f", topw: "sweater", top: "#6a86a8", botw: "pants", bottom: "#3a3a44", shoes: "sneakers" }, 28.3 - 0.64, 23.4, 90, { name: "Faceling", role: "customer", kind: "sitter" }, true, 0.37 + floorY);
  person("cust2", { sex: "m", topw: "jacket", top: "#5a4a32", botw: "pants", bottom: "#26262c", shoes: "boots" }, 28.3 + 0.64, 23.4, -90, { name: "Faceling", role: "customer", kind: "sitter" }, true, 0.37 + floorY);
}

// The staff back room behind the snack bar door (Shelly Nov 13: "make the staff only door not blocky + give it an interior").
// Outside the hall's south wall: x 36.2..43.9, z 30.3..35.8, a 3 m drop ceiling. Tripo props, real sizes.
const STAFF_G = { // Tripo pass Nov 13 (art/l31-staff): "use tripo to improve every model here"
  lockers: "/cdn/value.7e1783ad878bacd2a6d0249c0afbb065b237abf19f6b89e45f0532fd9ac78ee8.glb",
  shelf: "/cdn/value.92398963134aa0463225eaf19965e19c453d7530c4c1e7806f55df5da703b9f3.glb",
  mop: "/cdn/value.7dc069bf2aa2600b2357bdb6b30e65cfaa0fad9005da73ac086a519c24c665f5.glb",
  clock: "/cdn/value.58b4984016fee376ccc5e205d6b094de92e24e21b15c74f371f565c796088b50.glb",
  table: "/cdn/value.20cc3ce927bd1f988fb1acc15bee74095c4d0a864853711ab60efad6c545fdb9.glb",
  chair: "/cdn/value.b8d82a3ce214d0d151b9535237651d29ad5503bd098b052ed99e95be8d0fd779.glb",
};
const SR = { x0: 36.2, x1: 43.9, z0: 30.3, z1: 35.8, h: 3.0 };
const CORK = `<svg viewBox='0 0 300 200' width='1.2m'>
  <rect width='300' height='200' rx='4' fill='#6b4a2b'/><rect x='8' y='8' width='284' height='184' fill='#b98a57'/>
  <g transform='rotate(-3 80 70)'><rect x='22' y='22' width='118' height='96' fill='#f3efe2'/>
    <g font-family='sans-serif' fill='#333' font-size='9'><text x='30' y='38' font-weight='bold' font-size='11'>FLOOR GUARD SHIFTS</text>
    <text x='30' y='54'>FRI  Daz / Marlowe</text><text x='30' y='68'>SAT  Daz / ??? </text><text x='30' y='82'>SUN  nobody wants it</text>
    <text x='30' y='100' fill='#b3261e'>NO SKATING IN THE BACK</text></g></g>
  <circle cx='80' cy='26' r='4' fill='#d33'/>
  <g transform='rotate(4 220 60)'><rect x='166' y='24' width='108' height='70' fill='#fff7a8'/>
    <g font-family='serif' font-style='italic' fill='#2b3a8a' font-size='10'><text x='174' y='44'>who keeps taking</text><text x='174' y='58'>the almond water</text><text x='174' y='72'>from the cooler??</text><text x='230' y='88'>- D</text></g></g>
  <circle cx='220' cy='28' r='4' fill='#2a7ad3'/>
  <g transform='rotate(-6 200 150)'><rect x='150' y='118' width='120' height='60' fill='#dfe9f5'/>
    <g font-family='sans-serif' fill='#222' font-size='9'><text x='158' y='134' font-weight='bold'>SKATE RENTAL</text><text x='158' y='148'>size 9 left wheel</text><text x='158' y='162'>squeaks. tagged.</text></g></g>
  <circle cx='210' cy='122' r='4' fill='#3a3'/>
  <rect x='30' y='134' width='90' height='46' fill='#e8e2d0' transform='rotate(2 75 157)'/>
  <text x='38' y='160' font-family='sans-serif' font-size='9' fill='#555' transform='rotate(2 75 157)'>WASH HANDS</text>
</svg>`;
function layStaffRoom(ctx, P, M) {
  const { x0, x1, z0, z1, h } = SR, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, D = z1 - z0, t = 0.15;
  const wall = { texture: "cdn/texture-painted-cream-cinder-block-wall.png", wrap: "repeat", repeat: [0.8, 0.8], color: "#d8d2bf", roughness: 0.9 };
  const floor = { texture: "cdn/texture-worn-red-quarry-tile-kitchen-floor.png", wrap: "repeat", repeat: [0.7, 0.7], color: "#b9a597", roughness: 0.75 };
  const ceil = { texture: "cdn/texture-acoustic-drop-ceiling-tile-grid.png", wrap: "repeat", repeat: [0.6, 0.6], color: "#cfcab8", roughness: 0.95 };
  const box = (w, hh, d) => ({ kind: "box", width: w, height: hh, depth: d });
  P("staff-floor", { feetPosition: { x: cx, y: -0.3, z: cz }, primitive: box(W + t * 2, 0.3, D + t), material: floor, physics: "static", receiveShadow: true });
  P("staff-ceil", { feetPosition: { x: cx, y: h, z: cz }, primitive: box(W + t * 2, 0.12, D + t), material: ceil, physics: "static" });
  P("staff-wall-w", { feetPosition: { x: x0 - t / 2, y: 0, z: cz }, primitive: box(t, h, D + t), material: wall, physics: "static" });
  P("staff-wall-e", { feetPosition: { x: x1 + t / 2, y: 0, z: cz }, primitive: box(t, h, D + t), material: wall, physics: "static" });
  P("staff-wall-s", { feetPosition: { x: cx, y: 0, z: z1 + t / 2 }, primitive: box(W + t * 2, h, t), material: wall, physics: "static" });
  // the hall's south wall stops at x 42; this closes the strip past it to the east wall
  P("staff-wall-n", { feetPosition: { x: (42 + x1 + t) / 2, y: 0, z: z0 - 0.15 }, primitive: box(x1 + t - 42, h + 0.12, 0.3), material: wall, physics: "static" });
  // a scuffed rubber base round the room, where the mop bangs
  for (const [k, x, z, w, d] of [["w", x0 + 0.01, cz, 0.02, D], ["e", x1 - 0.01, cz, 0.02, D], ["s", cx, z1 - 0.01, W, 0.02]])
    P(`staff-base-${k}`, { feetPosition: { x, y: 0, z }, primitive: box(w, 0.1, d), material: { color: "#3a3430", roughness: 0.8 } });
  // one fluorescent troffer, slightly green, the way back rooms always are
  P("staff-troffer", { feetPosition: { x: cx, y: h - 0.04, z: cz }, primitive: box(0.6, 0.04, 1.2), material: { color: "#e9f4ea", emissive: "#e9f4ea", emissiveIntensity: 2.2 },
    children: [{ feetPosition: { x: 0, y: -0.3, z: 0 }, light: { kind: "point", color: "#e6f2dc", intensity: 4.5, distance: 9 } }] });
  // Tripo props at true size: each box keeps the GLB's own proportions (measured in Blender, art/l31-staff) scaled to a real height; layout fits uniformly, so a box off the model's aspect shrank it
  const T = (id, key, x, y, z, yaw, size, solid = true) => P(id, { feetPosition: { x, y, z }, rotation: { yaw }, model: { id: STAFF_G[key], forward: "+z" },
    layout: { box: { min: { x: -size[0] / 2, y: 0, z: -size[2] / 2 }, max: { x: size[0] / 2, y: size[1], z: size[2] / 2 } } }, ...(solid ? { physics: { body: "static", collider: "box" } } : {}), castShadow: true });
  T("staff-lockers", "lockers", x0 + 0.45, 0, 33.3, 0, [0.817, 1.85, 1.846]); // three lockers against the west wall, doors facing the room
  T("staff-shelf1", "shelf", 41.0, 0, z1 - 0.28, 90, [0.47, 1.6, 1.065]);
  T("staff-shelf2", "shelf", 42.3, 0, z1 - 0.3, 92, [0.47, 1.6, 1.065]);
  T("staff-mop", "mop", 43.2, 0, 31.2, -125, [0.43, 1.2, 1.09]);
  T("staff-clock", "clock", 41.6, 1.9, z0 + 0.1, 90, [0.136, 0.35, 0.333], false); // on the door wall: you punch in on the way in
  // the break table, one chair pushed back, a schedule nobody reads
  T("staff-table", "table", 38.6, 0, 34.4, 12, [0.96, 0.74, 0.96]);
  T("staff-chair1", "chair", 37.85, 0, 33.75, 150, [0.61, 0.85, 0.63]);
  T("staff-chair2", "chair", 39.55, 0, 34.95, -80, [0.61, 0.85, 0.63]);
  P("staff-cork", { feetPosition: { x: 38.6, y: 1.55, z: z1 - 0.02 }, rotation: { yaw: 0 }, vector: CORK });
}

// The trash can's second behavior (scripts/l31-food.js clears the tray): the flap swings, and a hand in there
// now and then comes back with something somebody didn't finish. One find per can per player every 15 minutes.
const FINDS = ["almond", "cash:1", "almond", "cash:5"];
export const ears = {
  press: (ctx, p) => {
    if (ctx.self.state?.kind !== "trash") return;
    const who = ctx.getObject(p?.by), at = ctx.self.worldFeetPosition, now = ctx.now(); if (!who?.state) return;
    ctx.emit("squash", { target: ctx.self.id, axis: "y", intensity: 0.1, duration: 0.3 }); // the swing flap knocks the can down on its base
    const got = ctx.self.state.got ?? {}, uid = who.userId ?? who.id;
    if (who.state.l31tray || now - (got[uid] ?? -1e12) < 900000 || who.state.payout) return;
    ctx.self.state.got = { ...got, [uid]: now };
    if (ctx.random() < 0.45) {
      who.state.payout = { xp: 0, items: [FINDS[Math.floor(ctx.random() * FINDS.length) % FINDS.length]] };
      ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-rummaging-through-paper-trash-bag.mp3", position: at, volume: 0.5, maxDistance: 8 });
    }
  },
};
