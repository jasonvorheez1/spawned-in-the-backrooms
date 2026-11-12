// Level 31 · food zone (map: scripts/lib/level31.js ZONES.food). One export, called once per lay by places/level31/sim.js.
// l31Order is the clerk's menu: scripts/talk.js calls it for a dialogue node with do: "l31:<key>" (dlg-generic.yml l31-food-clerk).
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";

const G = {
  table: "/cdn/value.85f5e243770f31969de327bdc34870693134536eb58b94392e7715d4fd3bc8f2.glb", chair: "/cdn/value.2d974b903f651908da4ab7d3423171988b715420cf07c9f7f15bb854bfd1b4bc.glb",
  benchO: "/cdn/value.a2c6ff61773dad10900e1d9438fd7d531ff3d50a5777942c46eb6fae0f3455cc.glb", benchG: "/cdn/value.e5b68318e51038b74580baf037ebfe2f2c615afd5454d31f109b00ef05588593.glb",
  trash: "/cdn/value.b2b4a6b6432a1fa06b5b7221dc44910a04ad25f47bbb97a8c70c17c00913c568.glb", condi: "/cdn/value.5c5a4885c63007e6e9641d674001f1b672315abd05804698f6856ee020d726a0.glb",
  pizza: "/cdn/value.94489c95bccefcf999e9167007fdc37c595c0870ac5c55f21b53e8c977e86224.glb", grill: "/cdn/value.2f6588063f2a79088a29a82f37fd985c1b9c35479895c1e58b37177a75badbdf.glb",
  wings: "/cdn/value.2a86cc1225956d7affdefab951435412e8d1eff6a49fce68c60c5588dda68d47.glb", soda: "/cdn/value.dccac7a9af42b8a71ffcd628fd16438030ddc40387223fc7e2bc9cf3ac857c84.glb",
};
// what each order does to you. All free. Numbers Savi's picks.
export const L31_FOOD = {
  cheese: { name: "Cheese slice", hunger: 34, thirst: 2, sanity: 8 }, pepperoni: { name: "Pepperoni slice", hunger: 34, thirst: 2, sanity: 8 },
  mild: { name: "Mild wings", hunger: 40, thirst: 2, sanity: 6 }, hot: { name: "Hot wings", hunger: 40, thirst: 1, sanity: 6 }, toohot: { name: "Too hot wings", hunger: 40, thirst: 1, sanity: 3 },
  hotdog: { name: "Foot-long hot dog", hunger: 45, thirst: 2, sanity: 6 },
  cola: { name: "Cola", hunger: 3, thirst: 30, sanity: 5 }, orange: { name: "Orange soda", hunger: 3, thirst: 30, sanity: 5 }, lime: { name: "Lime soda", hunger: 3, thirst: 30, sanity: 5 },
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
const row = (y, name, sub, price) => `<text x='26' y='${y}' font-size='15' font-family='sans-serif' font-weight='bold' fill='#2a1608'>${name}</text>${sub ? `<text x='${30 + name.length * 9.2}' y='${y}' font-size='12' font-family='sans-serif' fill='#5a3a20'>${sub}</text>` : ""}<text x='452' y='${y}' font-size='16' font-family='sans-serif' fill='#4a3a2a'>${price}</text><line x1='448' y1='${y - 4.5}' x2='${456 + price.length * 8.6}' y2='${y - 4.5}' stroke='#c81e1e' stroke-width='2.2'/><text x='535' y='${y}' font-size='21' font-family='display' font-weight='bold' fill='#c81e1e'>FREE</text>`;
const MENU = `<svg viewBox='0 0 640 190' width='6.4m'><rect x='0' y='0' width='640' height='190' fill='#b8a37a'/><rect x='6' y='6' width='628' height='178' fill='none' stroke='#d8451c' stroke-width='3'/><line x1='20' y1='43' x2='620' y2='43' stroke='#e2c79a' stroke-width='1'/><line x1='20' y1='77' x2='620' y2='77' stroke='#e2c79a' stroke-width='1'/><line x1='20' y1='111' x2='620' y2='111' stroke='#e2c79a' stroke-width='1'/><line x1='20' y1='145' x2='620' y2='145' stroke='#e2c79a' stroke-width='1'/>${row(31, "Pizza slice", "cheese / pepperoni", "$2.50")}${row(65, "Chicken wings", "mild / hot / too hot", "$4.75")}${row(99, "Foot-long hot dog", "", "$3.00")}${row(133, "Soda", "", "$1.25")}${row(167, "Almond water", "", "$1.00")}</svg>`;
const PAPER = `<svg viewBox='0 0 420 300' width='0.42m'><g transform='rotate(-2.5 210 150)'><rect x='14' y='18' width='392' height='264' fill='#f3efe2'/><text x='210' y='95' text-anchor='middle' font-size='40' font-family='serif' font-style='italic' fill='#1a1a2a'>Please throw away</text><text x='210' y='155' text-anchor='middle' font-size='40' font-family='serif' font-style='italic' fill='#1a1a2a'>trash and uneaten</text><text x='210' y='215' text-anchor='middle' font-size='40' font-family='serif' font-style='italic' fill='#1a1a2a'>food here!</text><line x1='120' y1='228' x2='300' y2='226' stroke='#1a1a2a' stroke-width='3'/><rect x='-6' y='4' width='70' height='30' fill='#e8d9a0' opacity='0.8' transform='rotate(-38 30 20)'/><rect x='352' y='4' width='70' height='30' fill='#e8d9a0' opacity='0.8' transform='rotate(35 386 20)'/></g></svg>`;
const NEON = `<svg viewBox='0 0 300 110' width='3m'><text x='150' y='72' text-anchor='middle' font-size='64' font-family='serif' font-style='italic' fill='none' stroke='#ff5fb0' stroke-width='3' filter='drop-shadow(0 0 6 #ff2f9a)'>Snack Bar</text><path d='M40 92 Q150 104 260 92' fill='none' stroke='#49e6ff' stroke-width='3' filter='drop-shadow(0 0 5 #29c8ff)'/></svg>`;
const DOORTXT = `<svg viewBox='0 0 600 90' width='0.6m'><text x='300' y='64' text-anchor='middle' font-size='62' font-family='sans-serif' font-weight='bold' fill='#f2f2ee'>Employees only!</text></svg>`;
const box = (w, h, d) => ({ kind: "box", width: w, height: h, depth: d });

export function layFood(ctx) {
  for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("l31-food-")) ctx.destroy(id);
  const P = (id, spec) => ctx.spawn(`l31-food-${id}`, { castShadow: false, ...spec });
  const M = (id, key, x, z, yaw, extra = {}, y = 0) => P(id, { model: { id: G[key], forward: "+z" }, feetPosition: { x, y, z }, rotation: { yaw }, physics: { body: "static", collider: "box" }, ...extra });
  // the zone's root, where the blueprint stood: its lights
  const L = (x, y, z, color, intensity) => ({ feetPosition: { x, y, z }, light: { kind: "point", color, intensity, distance: 15 } });
  P("bp", { feetPosition: { x: 34, y: 0, z: 18 }, children: [L(3.2, 2.9, -4, "#ffd9a0", 7), L(3.2, 2.9, 3, "#ffd9a0", 7), L(-3, 3.8, 0.5, "#ffb060", 22), L(-1, 3.4, -9.5, "#ff9ac8", 12)] });
  // serving counter along the east wall: carcass, kick, stainless top, tray rail
  P("counter", { feetPosition: { x: 38, y: 0.1, z: 17 }, primitive: box(0.8, 0.78, 14), material: { color: "#8e1f18", roughness: 0.45 }, physics: "static" });
  P("counter-kick", { feetPosition: { x: 38.03, y: 0, z: 17 }, primitive: box(0.7, 0.1, 13.96), material: { color: "#141416", roughness: 0.6 } });
  P("counter-stripe", { feetPosition: { x: 37.595, y: 0.52, z: 17 }, primitive: box(0.012, 0.09, 14), material: { color: "#f2c33a", roughness: 0.5 } });
  P("counter-top", { feetPosition: { x: 38, y: 0.88, z: 17 }, primitive: box(0.92, 0.04, 14.06), material: { color: "#d4d7db", metalness: 0.35, roughness: 0.35 } });
  P("counter-rail", { feetPosition: { x: 37.36, y: 0.8, z: 17 }, primitive: box(0.3, 0.025, 13.6), material: { color: "#d4d7db", metalness: 0.35, roughness: 0.35 } });
  for (const [i, z] of [10.6, 14, 17.4, 20.6, 23.4].entries()) P(`counter-brk${i}`, { feetPosition: { x: 37.45, y: 0.72, z }, primitive: box(0.3, 0.08, 0.03), material: { color: "#8a8d92", metalness: 0.8, roughness: 0.4 } });
  M("pizza", "pizza", 38.05, 12, 90, { physics: "none" }, 0.92); M("grill", "grill", 38.05, 14.7, 90, { physics: "none" }, 0.92);
  M("wings", "wings", 38.05, 19.4, 90, { physics: "none" }, 0.92); M("soda", "soda", 38.05, 22, 90, { physics: "none" }, 0.92);
  P("haze", { feetPosition: { x: 38.05, y: 1.75, z: 12 }, fx: { script: HAZE } });
  // backlit menu board on the east wall
  P("menu-box", { feetPosition: { x: 41.9, y: 2.4, z: 17 }, primitive: box(0.16, 2.0, 6.6), material: { color: "#1a1412", roughness: 0.6 } });
  P("menu-glow", { feetPosition: { x: 41.81, y: 2.45, z: 17 }, primitive: box(0.02, 1.9, 6.4), material: { color: "#8a7a5c", emissive: "#ffe2a8", emissiveIntensity: 0.02 } });
  P("staff-light", { feetPosition: { x: 36.2, y: 2.6, z: 28.6 }, light: { kind: "point", color: "#ffd2a0", intensity: 7, distance: 7 } });
  P("menu", { feetPosition: { x: 41.79, y: 3.4, z: 17 }, rotation: { yaw: 90 }, vector: MENU });
  // neon on the partition, the paper note over the trash cans
  P("neon", { feetPosition: { x: 37.5, y: 3.3, z: 6.17 }, rotation: { yaw: 180 }, vector: NEON });
  P("note", { feetPosition: { x: 33.05, y: 1.72, z: 6.16 }, rotation: { yaw: 180 }, vector: PAPER });
  for (const [i, x] of [32.7, 33.4].entries()) M(`trash${i + 1}`, "trash", x, 6.47, 180, { tags: ["usable"], state: { name: "Trash can", verb: "Clear tray", info: "Push flap. A tray shelf on top.", kind: "trash" }, behavior: "scripts/l31-food.js" });
  M("bench-n1", "benchO", 35.6, 6.5, 180); M("bench-n2", "benchG", 39.4, 6.5, 180);
  M("bench-s1", "benchG", 28.6, 29.65, 0); M("bench-s2", "benchO", 31.2, 29.65, 0); M("bench-s3", "benchO", 39.6, 29.65, 0);
  M("condi", "condi", 38, 9.46, 90);
  // the staff door on the south wall
  P("door", { feetPosition: { x: 36.2, y: 0, z: 29.96 }, primitive: box(1.0, 2.1, 0.06), material: { color: "#7d8085", roughness: 0.55, metalness: 0.3 }, tags: ["usable"], state: { name: "Employees only", verb: "Open", info: "Locked. Nothing moves on the other side.", kind: "door" }, behavior: "scripts/l31-food.js",
    children: [{ feetPosition: { x: 0, y: 0, z: 0.02 }, primitive: box(1.16, 2.18, 0.05), material: { color: "#3c3e42", roughness: 0.6 } }, { feetPosition: { x: -0.38, y: 1.0, z: -0.07 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.03, height: 0.06 }, rotation: { pitch: 90 }, material: { color: "#c9ccd0", metalness: 0.9, roughness: 0.3 } }, { feetPosition: { x: 0, y: 0.1, z: -0.035 }, primitive: box(0.9, 0.25, 0.01), material: { color: "#b9bcc0", metalness: 0.8, roughness: 0.4 } }] });
  P("door-label", { feetPosition: { x: 36.2, y: 1.68, z: 29.925 }, rotation: { yaw: 0 }, vector: DOORTXT });
  // dining: six tables, four chairs each; two chairs left pulled out
  const side = [[0, -0.6, 180], [0, 0.6, 0], [-0.6, 0, -90], [0.6, 0, 90]];
  const pulled = { "2-1": [0.1, 0.55, 28], "5-3": [0.6, -0.12, 64] };
  let t = 0;
  for (const x of [29.5, 33]) for (const z of [12, 17.5, 23]) { t++;
    M(`table${t}`, "table", x, z, 0);
    side.forEach(([dx, dz, yaw], c) => { const p = pulled[`${t}-${c}`]; M(`chair${t}-${c}`, "chair", x + dx + (p?.[0] ?? 0), z + dz + (p?.[1] ?? 0), yaw + (p?.[2] ?? 0)); });
  }
  // raised rubber mat behind the counter: the clerk stands on it so he reads at full height over the top
  P("duckboard", { feetPosition: { x: 40.1, y: 0, z: 17 }, primitive: box(3.2, 0.32, 13.4), material: { color: "#1b1b1d", roughness: 0.9 }, physics: "static", castShadow: false, receiveShadow: true });
  // people: the clerk behind the counter, two customers at table 3
  const person = (id, look, x, z, yaw, state, sit, y = 0) => P(id, { tags: ["npc", "faceling"], feetPosition: { x, y, z }, rotation: { yaw }, physics: sit ? "none" : "character", ...critterSpec(npcLook(`l31-food-${id}`, { species: "faceling", ...look }, "wanderer", 1)),
    behavior: sit ? ["scripts/l31-food.js"] : ["scripts/humanoid-locomotion.js", "scripts/l31-food.js"], state: { faction: "faceling", hp: 60, docile: true, essential: true, sex: look.sex, ...state } });
  person("clerk", { sex: "m", topw: "apron", top: "#c8201c", botw: "pants", bottom: "#1c1c22", shoes: "sneakers", hat: "cap" }, 39.5, 17, 90, { name: "Counter clerk", role: "clerk", kind: "clerk", home: { x: 39.5, z: 17 } }, false, 0.32);
  ctx.spawn("l31-food-tag", { parent: "l31-food-clerk", attachment: { bone: "Spine2" }, feetPosition: { x: 0.09, y: 0.1, z: 0.125 }, primitive: box(0.075, 0.028, 0.006), material: { color: "#f4f2ea", roughness: 0.4 }, castShadow: false });
  person("cust1", { sex: "f", topw: "sweater", top: "#6a86a8", botw: "pants", bottom: "#3a3a44", shoes: "sneakers" }, 29.5 - 0.55, 23, -90, { name: "Faceling", role: "customer", kind: "sitter" }, true);
  person("cust2", { sex: "m", topw: "jacket", top: "#5a4a32", botw: "pants", bottom: "#26262c", shoes: "boots" }, 29.5 + 0.55, 23, 90, { name: "Faceling", role: "customer", kind: "sitter" }, true);
}
