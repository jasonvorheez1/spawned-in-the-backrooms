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
  if (s.l31banned) { s.notice = { text: "No service until you clear your tray at a trash can.", at: ctx.now() }; return { say: "You left your tray." }; }
  const up = (k, v) => { s[k] = Math.max(0, Math.min(100, (s[k] ?? 100) + v)); };
  up("hunger", f.hunger); up("thirst", f.thirst); up("sanity", f.sanity);
  s.l31tray = true;
  s.notice = { text: `${f.name}. Free. Clear your tray at the trash cans before you go.`, at: ctx.now() };
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
  P("tile", {
    feetPosition: { x: 34, y: 0.002, z: 18.075 },
    primitive: box(15.98, 0.016, 23.83),
    material: { texture: "cdn/texture-worn-beige-waxed-vinyl-composition-floor-tile-12-inch.png", wrap: "repeat", repeat: [5, 7], color: "#c5beaa", roughness: 0.82 },
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
  for (const [i, x] of [28.15, 29.95].entries()) M(`trash${i + 1}`, "trash", x, 6.47, 180, { tags: ["usable"], state: { name: "Trash can", verb: "Clear tray", info: "Push flap. A tray shelf on top.", kind: "trash" }, behavior: "scripts/l31-food.js" });
  M("bench-n1", "benchO", 35.6, 6.5, 180); M("bench-n2", "benchG", 39.4, 6.5, 180);
  M("condi", "condi", 40.85, 8.15, 90, {}, floorY);
  // the staff door on the south wall
  P("door", { feetPosition: { x: 40.05, y: 0.018, z: 29.96 }, primitive: box(1.0, 2.1, 0.06), material: { color: "#7d8085", roughness: 0.55, metalness: 0.3 }, tags: ["usable"], state: { name: "Employees only", verb: "Open", info: "Locked from the other side.", kind: "door" }, behavior: "scripts/l31-food.js",
    children: [{ feetPosition: { x: 0, y: 0, z: 0.02 }, primitive: box(1.16, 2.18, 0.05), material: { color: "#3c3e42", roughness: 0.6 } }, { feetPosition: { x: -0.38, y: 1.0, z: -0.07 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.03, height: 0.06 }, rotation: { pitch: 90 }, material: { color: "#c9ccd0", metalness: 0.9, roughness: 0.3 } }, { feetPosition: { x: 0, y: 0.1, z: -0.035 }, primitive: box(0.9, 0.25, 0.01), material: { color: "#b9bcc0", metalness: 0.8, roughness: 0.4 } }] });
  P("door-label", { feetPosition: { x: 40.05, y: 1.698, z: 29.925 }, rotation: { yaw: 0 }, vector: DOORTXT });
  // Tables west of the ordering lane, left as people left them (Shelly Nov 13: "de ai slop this"): chairs pushed out and turned, one table short a chair, none in a grid
  const tables = [
    [29.6, 13.6, 8, [[0, -0.95, 172], [0.15, 1.05, 14], [-1.05, 0.1, -76]]],
    [33.4, 15.2, -11, [[0.2, -0.9, 200], [0, 1.25, 33], [-0.95, -0.15, -95], [1.1, 0.25, 118]]],
    [29.3, 22.4, 0, [[0, -0.89, 180], [0, 0.89, 0], [-0.89, 0, -90], [0.89, 0, 90]]],
    [33.6, 21.6, 17, [[-0.1, -1.0, 160], [1.0, 0.1, 74]]],
  ];
  for (const [i, [x, z, yaw, chairs]] of tables.entries()) {
    M("table" + (i + 1), "table", x, z, yaw, {}, floorY);
    for (const [c, [dx, dz, cy]] of chairs.entries()) M("chair" + (i + 1) + "-" + c, "chair", x + dx, z + dz, cy, { tags: ["seat"] }, floorY);
  }
  M("chair-stray", "chair", 35.6, 18.6, 141, { tags: ["seat"] }, floorY); // dragged over to the counter queue
  // curved diner booths along the back wall, open to the room
  const BOOTH = "/cdn/value.13e98688536b8996d72997d03461590d77f616b6ffdbc802895762ab9813a00d.glb";
  for (const [i, x] of [28.6, 32.4].entries()) {
    P("booth" + i, { feetPosition: { x, y: floorY, z: 28.6 }, rotation: { yaw: -90 }, model: { id: BOOTH, forward: "+z" }, scale: 1.2, physics: { body: "static", collider: "mesh" }, tags: ["seat"] });
    M("btable" + i, "table", x, 28.15, 0, {}, floorY);
    P("blamp" + i, { feetPosition: { x, y: 2.5, z: 28.2 }, primitive: { kind: "cone", radius: 0.22, height: 0.22, radialSegments: 20, openEnded: true }, material: { color: "#c8201c", roughness: 0.4, metalness: 0.4, side: "double", emissive: "#ffb060", emissiveIntensity: 0.25 },
      children: [{ feetPosition: { x: 0, y: 0.22, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.006, radiusBottom: 0.006, height: 2.4 }, material: { color: "#222" } }, { feetPosition: { x: 0, y: -0.15, z: 0 }, light: { kind: "point", color: "#ffc68a", intensity: 2.2, distance: 5 } }] });
  }
  D("capri-b0", "capri", 28.4, 0.765 + floorY, 28.0, 60); D("sprite-b1", "sprite", 32.6, 0.765 + floorY, 28.3, 10);
  // neon over the counter, pink script with a teal underline; the old menu board stays
  P("neon", { feetPosition: { x: 41.75, y: 4.9, z: 17 }, rotation: { yaw: 90 }, vector: `<svg viewBox='0 0 420 110' width='3.6m'><g filter='drop-shadow(0 0 6 #ff4fa8)'><text x='210' y='72' text-anchor='middle' font-family='serif' font-style='italic' font-size='66' fill='#ffd0e8' stroke='#ff4fa8' stroke-width='2'>Snacks</text></g><path d='M90 92H330' stroke='#5ff2e8' stroke-width='4' stroke-linecap='round' filter='drop-shadow(0 0 5 #5ff2e8)'/></svg>` });
  P("neon-glow", { feetPosition: { x: 41.2, y: 4.9, z: 17 }, light: { kind: "point", color: "#ff7cc8", intensity: 2, distance: 7 } });
  // raised rubber mat behind the counter: the clerk stands on it so he reads at full height over the top
  P("duckboard", { feetPosition: { x: 40.1, y: 0, z: 17 }, primitive: rbox(3.2, 0.32, 13.4), material: { color: "#1b1b1d", roughness: 0.9 }, physics: "static", castShadow: false, receiveShadow: true });
  // people: the clerk behind the counter, two customers at the southwest table
  const person = (id, look, x, z, yaw, state, sit, y = 0) => P(id, { tags: ["npc", "faceling"], feetPosition: { x, y, z }, rotation: { yaw }, physics: sit ? "none" : "character", ...critterSpec(npcLook(`l31-food-${id}`, { species: "faceling", ...look }, "wanderer", 1)),
    behavior: sit ? ["scripts/l31-food.js"] : ["scripts/humanoid-locomotion.js", "scripts/l31-food.js"], state: { faction: "faceling", hp: 60, docile: true, essential: true, sex: look.sex, ...state } });
  person("clerk", { sex: "m", topw: "apron", top: "#c8201c", botw: "pants", bottom: "#1c1c22", shoes: "sneakers", hat: "cap" }, 39.5, 17, 90, { name: "Counter clerk", role: "clerk", kind: "clerk", home: { x: 39.5, z: 17 } }, false, 0.32);
  ctx.spawn("l31-food-tag", { parent: "l31-food-clerk", attachment: { bone: "Spine2" }, feetPosition: { x: 0.09, y: 0.1, z: 0.125 }, primitive: box(0.075, 0.028, 0.006), material: { color: "#f4f2ea", roughness: 0.4 }, castShadow: false });
  person("cust1", { sex: "f", topw: "sweater", top: "#6a86a8", botw: "pants", bottom: "#3a3a44", shoes: "sneakers" }, 29.3 - 0.89, 22.4, -90, { name: "Faceling", role: "customer", kind: "sitter" }, true, 0.14 + floorY);
  person("cust2", { sex: "m", topw: "jacket", top: "#5a4a32", botw: "pants", bottom: "#26262c", shoes: "boots" }, 29.3 + 0.89, 22.4, 90, { name: "Faceling", role: "customer", kind: "sitter" }, true, 0.14 + floorY);
}
