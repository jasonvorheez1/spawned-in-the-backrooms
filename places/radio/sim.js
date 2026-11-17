// Radio Backrooms (Wikidot): Ralph's studio and its guest room. One of the safest rooms there is: whatever hostile walks in, Ralph's shotgun ends it.
// Lays itself once per version V (house pattern of places/home11/sim.js); each tick keeps Ralph, the ON AIR light, the TV and the door watch.
import { onAir } from "../../scripts/lib/radio.js";
import { keepPeople } from "../../scripts/lib/level-kit.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook } from "../../scripts/lib/clothes.js";
export const cadence = "1s";
const V = 5;
const RALPH = "radio-ralph", HOME = { x: 0, z: -3.6 };
const FOES = ["hound", "stealer", "smiler", "lurker", "l5rat", "l3rat", "l5staff", "hostile", "moth", "moths", "l8spider", "l8-hostile", "zdrone", "l11foe", "l7beast", "l10worm"];
const T = (name, rep, color) => ({ texture: `cdn/texture-${name}.png`, repeat: [rep, rep], wrap: "repeat", color, roughness: 0.9 });
const VENEER = T("dark-walnut-wood-veneer-wall-panel", 0.9, "oklch(0.9 0.03 60)");
const FOAM = T("charcoal-acoustic-foam-wedge-panels", 1.4, "oklch(0.92 0.01 60)");
const BROWN = T("worn-brown-commercial-loop-carpet", 0.8, "oklch(0.9 0.03 60)");
const BERBER = T("beige-berber-loop-carpet-slightly-worn", 0.7, "oklch(0.9 0.02 80)");
const PAPER = T("eggshell-painted-drywall-light-orange-peel", 0.6, "oklch(0.93 0.025 85)");
const CEIL = T("white-popcorn-acoustic-ceiling-texture", 0.8, "oklch(0.92 0.01 80)");
const DOOR = T("painted-steel-fire-door-dark-green-scuffed", 1, "oklch(0.95 0.01 140)");
const M = {
  console: "/cdn/value.676b1bc3626114b9f00742c9e0c2d6f4d963b2c7e8cb54b91f1a40b922f58696.glb",
  mic: "/cdn/value.824dcc76ab1d7ead9b6938e9b5ac90106022237535e8e79a9d3fc283764d169f.glb",
  decks: "/cdn/value.497b02ed22dc9cc9e722c965192d5c0af9abdbaa43c113a181a0bb7817127e9c.glb",
  cdrack: "/cdn/value.f0611ad139a7b36423c4918f37b59eb9215db0d2cbe1ce0d0eeaf8575eaa42d5.glb",
  pcdesk: "/cdn/value.c19a3a1207063b8231b343d67d98657a158515407d7c01b6c2286a1bd2d5c18c.glb",
  chair: "/cdn/value.30d333d7ece8eeaa28a42690ff495b03f091dcdfacaf8d19126889392ca43131.glb",
  tv: "/cdn/value.30ae8e4fd0c2e307d21943aa6fa38f3f816fcc7a10335f5a15ff865b00b84ce4.glb",
  clock: "/cdn/value.6134f8ad8f87a64a5410cc21109eccb9245c7328119d99651230a7a4c1554783.glb",
  mirror: "/cdn/value.15bc3870cc1612ac8e8edbd61400f98bf0ec50bec02203f8d00fa9c63515b373.glb",
  lamp: "/cdn/value.53bb2193d283ff4ccf5c83edfdc691e3be28dda920320b29753b579e39184fc6.glb",
  armchair: "/cdn/value.324d9a05c6aca4bc72f791c510f751bee89cfbbc0e2104e59ad075531e70a750.glb",
  ctable: "/cdn/value.e0311bccbb1793d294645e4d7c1ac168849c11456bcb7cda4e5d60daf620aaca.glb",
  side: "/cdn/value.a749a8b797903df85e052391facf77d67915ec4b704e8f32b969e139f78b6719.glb",
  coffee: "/cdn/value.85eab12c47dbcc8b54daf0dc58eb5a113219088f7b4177fee4b0f5fe1dee1ad8.glb",
  vending: "/cdn/value.8a9d2399c1b6727a80b77276fb4a597af79117ddbaabe1b3d97ff2c61c5e37e9.glb",
  poster: "/cdn/value.f77024f10ce5329c62cd82c881294b2e0e5ec4074bba8fb703aea0c678a2fce1.glb",
  floorlamp: "/cdn/value.0871d1626b929961d73cb28c05f82070ad822c5cc2e6b8deec5046248fb4086d.glb",
  plant: "/cdn/value.53fa6b1388302684d3e567ca755e213843bd4d5ac5ee17c0b54fa1d579c9a019.glb",
};
// each model's true width:height:depth as it faces (forward +x), so a layout box is the mesh's own box and bounds sit where written
const R = { armchair: [1.12, 1, 1.07], cdrack: [1.14, 1, 0.27], chair: [0.63, 1, 0.65], clock: [1, 1, 0.39], coffee: [0.83, 1, 0.99], console: [1.32, 1, 0.67], ctable: [1.42, 1, 2.43], decks: [1.16, 1, 1.02], floorlamp: [0.71, 1, 0.42], lamp: [1.1, 1, 0.46], mic: [1.24, 1, 0.48], mirror: [0.79, 1, 0.3], pcdesk: [1.03, 1, 1.07], poster: [0.71, 1, 0.5], side: [1.96, 1, 1.54], tv: [0.97, 1, 0.54], vending: [0.6, 1, 0.48], plant: [0.46, 1, 0.44] };
// surfaces the gear stands on (measured by raycast on the laid meshes)
const TOP = { console: 0.86, side: 0.62 };
const RUG = T("worn-persian-rug-deep-red-and-navy-pattern", 1, "oklch(0.92 0.02 40)");
const MAG = (n) => ({ texture: `cdn/texture-${n}.png`, roughness: 0.4 });
const CAMS = ["CAM 3 · LEVEL 0", "CAM 7 · LEVEL 1", "CAM 12 · LEVEL 4", "CAM 2 · THE HUB", "CAM 9 · LEVEL 11", "CAM 21 · LEVEL 21", "CAM 5 · LEVEL 2", "CAM 1 · LEVEL 6"];
const STEAM = `fx
pop steam rate=?mobile:4|7 on=disc(.03) life=1.2..2 v=up(.25..0.4) size=.05..0.09 acc=buoy(.2)+curl(.3)*.3+drag(1) sz=$size*(.6>2.4) col=<.92,.9,.88> a=0>.18:.25>.7:.1>0 rot=spin(.2) r=sprite(smoke-puff,alpha)`;
const BLAST = `fx
pop flash burst=1 life=.09 size=.5 col=hdr(5,3,1) a=1>0 sz=$size r=sprite(soft-disc,add)
pop sparks burst=10 life=.15..0.3 v=<0,0,1>*(6..10)+sdir()*1.5 size=.02..0.04 acc=drag(3) col=hdr(4,2,.5) a=1>0 r=sprite(ember,add,velocity,.03)
pop smoke burst=4 life=.8..1.4 v=<0,0,1>*(.6..1)+up(.2) size=.15..0.25 acc=buoy(.4)+drag(1.5) sz=$size*(.7>2.5) col=<.4,.38,.36> a=0>.3:.3>0 r=sprite(smoke-puff,alpha)
pop glow burst=1 life=.1 r=light(<1,.7,.35>,40,8)`;
const ONAIR = (g) => `<svg viewBox='0 0 120 40' width='0.62m'><rect x='2' y='2' width='116' height='36' rx='6' fill='#1a0c0c' stroke='#4a2a24' stroke-width='3'/><g opacity='{{ state.glow }}'><rect x='7' y='7' width='106' height='26' rx='4' fill='#ff2a1a' filter='drop-shadow(0 0 6 #ff3020)'/></g><text x='60' y='27' text-anchor='middle' font-family='sans-serif' font-size='18' font-weight='bold' fill='#ffe9e0'>ON AIR</text></svg>`;
const EXITSIGN = `<svg viewBox='0 0 200 34' width='1.1m'><rect x='1' y='1' width='198' height='32' rx='4' fill='#241a12' stroke='#8a6a3a' stroke-width='2'/><text x='100' y='22' text-anchor='middle' font-family='serif' font-size='15' fill='#f3dfb0'>RADIO BACKROOMS · EXIT</text></svg>`;

function ralph(ctx, id = RALPH) {
  if (ctx.place.objects[id]) return;
  const look = { species: "human", sex: "m", age: "middle", topw: "sweater", top: "#6e4c34", botw: "pants", bottom: "#4a3b2c", shoes: "shoes", hair: "#7d7166", eyew: "glasses", expr: "calm" };
  ctx.spawn(id, { tags: ["npc", "radio-npc"], feetPosition: { x: HOME.x, y: 0.1, z: HOME.z }, rotation: { yaw: 180 }, physics: "character",
    ...critterSpec(npcLook(id, look, "wanderer", 30, "trader")), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: "Ralph", role: "trader", faction: "wanderer", nerve: "brave", faceYaw: 180, home: { ...HOME }, stay: true } });
}

function lay(ctx) {
  const sp = (id, spec) => { if (ctx.place.objects[id]) ctx.destroy(id); ctx.spawn(id, spec); };
  const bx = (id, x, y, z, w, h, d, material, extra = {}) => sp(id, { feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material, physics: "static", ...extra });
  const face = (id, x, y, z, w, h, d, material) => bx(id, x, y, z, w, h, d, material, { physics: "none" });
  const box = (s) => ({ box: { min: { x: -s[0] / 2, y: 0, z: -s[2] / 2 }, max: { x: s[0] / 2, y: s[1], z: s[2] / 2 } } });
  const fit = (id, model, x, y, z, yaw, size, extra = {}) => sp(id, { feetPosition: { x, y, z }, rotation: { yaw }, model: { id: model, forward: "+x" }, layout: box(size), physics: { body: "static", collider: "box" }, ...extra });
  const use = (kind, name, verb, extra = {}) => ({ tags: ["usable", "radioprop"], behavior: "scripts/radio-use.js", state: { kind, name, verb, ...extra } });
  // shell: the floor stands under the blueprint's id
  bx("radio-room", 0, 0, 1, 8, 0.1, 12, BROWN);
  bx("radio-ceiling", 0, 2.8, 1, 8.4, 0.12, 12.4, CEIL);
  bx("radio-wall-w", -4.1, 0, 1, 0.2, 2.92, 12.4, PAPER);
  bx("radio-wall-e", 4.1, 0, 1, 0.2, 2.92, 12.4, PAPER);
  bx("radio-wall-n", 0, 0, -5.1, 8.4, 2.92, 0.2, PAPER);
  bx("radio-wall-s", 0, 0, 7.1, 8.4, 2.92, 0.2, PAPER);
  bx("radio-wall-mid-w", -2.3, 0, 1, 3.4, 2.92, 0.16, PAPER);
  bx("radio-wall-mid-e", 2.3, 0, 1, 3.4, 2.92, 0.16, PAPER);
  bx("radio-wall-lintel", 0, 2.3, 1, 1.2, 0.62, 0.16, PAPER);
  // studio skin: walnut veneer to dado height, acoustic foam above, worn brown carpet
  face("radio-carpet-studio", 0, 0.1, -2, 7.98, 0.012, 5.98, BROWN);
  face("radio-carpet-guest", 0, 0.1, 4, 7.98, 0.012, 5.98, BERBER);
  for (const [id, x, z, w, d] of [["w", -3.99, -2, 0.02, 6], ["e", 3.99, -2, 0.02, 6], ["n", 0, -4.99, 8, 0.02], ["mw", -2.3, 0.91, 3.4, 0.02], ["me", 2.3, 0.91, 3.4, 0.02]]) {
    face(`radio-veneer-${id}`, x, 0.1, z, w, 1.0, d, VENEER);
    face(`radio-foam-${id}`, x, 1.1, z, w, 1.6, d, FOAM);
  }
  // a model at height h, its footprint from its own proportions; yaw 0 faces -Z, 90 +X, 180 +Z, 270 -X
  const put = (id, k, x, y, z, yaw, h, extra = {}) => fit(id, M[k], x, y, z, yaw, [R[k][0] * h, h, R[k][2] * h], extra);
  // studio: Ralph's console faces him (north), the wall of CDs behind him faces the room
  put("radio-console", "console", 0, 0.1, -2.8, 0, 0.95, { tags: ["radioprop"], state: { name: "Ralph's console" } });
  put("radio-mic", "mic", 0.35, TOP.console, -2.95, 0, 0.42, { physics: "none", state: { name: "Condenser mic" } });
  put("radio-lamp", "lamp", -0.45, TOP.console, -2.65, 20, 0.36, { physics: "none" });
  sp("radio-lamp-light", { feetPosition: { x: -0.45, y: TOP.console + 0.42, z: -2.85 }, light: { kind: "point", color: "oklch(0.85 0.12 70)", intensity: 2.2, distance: 4.5 } });
  sp("radio-monitor-glow", { feetPosition: { x: 0, y: 1.35, z: -3.1 }, light: { kind: "point", color: "oklch(0.8 0.08 230)", intensity: 0.7, distance: 2.6 } });
  put("radio-decks", "decks", 0.1, TOP.console, -2.6, 0, 0.26, { tags: ["radioprop"], state: { name: "CD decks" } });
  for (const [i, x] of [[0, -2.6], [1, 0], [2, 2.6]]) put(`radio-cds-${i}`, "cdrack", x, 0.1, -4.68, 180, 2.3, { state: { name: "CD shelves" } });
  // the small TV on its cart by the console, screen to the room: static, and now and then a camera somewhere else
  put("radio-tv", "tv", -1.45, 0.1, -2.8, 180, 0.95, use("tv", "Small TV", "Watch", { line: "" }));
  sp("radio-tv-screen", { feetPosition: { x: -1.45, y: 0.72, z: -2.5 }, rotation: { yaw: 180 }, primitive: { kind: "box", width: 0.3, height: 0.22, depth: 0.005 }, material: { color: "oklch(0.2 0 0)" },
    ui: `<div face="front" emissive style="width:300px;height:220px;background:repeating-linear-gradient(0deg,#9a9a9a 0px,#3c3c3c 2px,#d8d8d8 3px,#555 5px),repeating-linear-gradient(90deg,#666 0px,#bbb 1px,#444 3px);display:flex;align-items:flex-end;justify-content:center;font-family:monospace;font-size:26px;color:#e8ffe8;text-shadow:0 0 6px #000"><span style="background:#000a;padding:2px 6px">{{ state.line }}</span></div>`, state: { line: "" } });
  sp("radio-tv-glow", { feetPosition: { x: -1.45, y: 0.9, z: -2.2 }, light: { kind: "point", color: "oklch(0.85 0.03 230)", intensity: 0.5, distance: 2.2 } });
  // computer desk against the east wall, the chair pulled up to it: sitting here you never tire
  put("radio-pc", "pcdesk", 3.5, 0.1, -1.7, 270, 0.9, use("pc", "Ralph's PC", "Use PC"));
  put("radio-chair", "chair", 2.65, 0.1, -1.7, 90, 1.0, { tags: ["seat", "radioprop"], state: { name: "Studio chair", seat: { w: 1 }, rest: 1 } });
  put("radio-clock", "clock", -3.92, 1.85, -3.2, 90, 0.34, { physics: "none", state: { name: "Wall clock" } });
  put("radio-mirror", "mirror", -3.87, 0.95, -0.7, 90, 0.8, use("mirror", "Mirror", "Look"));
  put("radio-plant-studio", "plant", -3.55, 0.1, -3.9, 90, 1.5, { state: { name: "Fig" } });
  // the white fluorescent fixture over the console
  sp("radio-fixture", { feetPosition: { x: 0, y: 2.775, z: -2.4 }, primitive: { kind: "box", width: 1.25, height: 0.025, depth: 0.62 }, material: { texture: "cdn/texture-fluorescent-troffer-prismatic-diffuser-panel.png", color: "oklch(0.98 0.01 90)", emissive: "oklch(0.95 0.02 95)", emissiveIntensity: 1.4 } });
  sp("radio-fixture-light", { feetPosition: { x: 0, y: 2.55, z: -2.4 }, light: { kind: "point", color: "oklch(0.95 0.03 95)", intensity: 3.2, distance: 7 } });
  sp("radio-light-studio", { feetPosition: { x: 0.5, y: 2.45, z: -0.8 }, light: { kind: "point", color: "oklch(0.86 0.08 70)", intensity: 4.5, distance: 10 } });
  // the broadcast out of the studio monitors: the same clock as every radio in the Backrooms
  sp("radio-speakers", { feetPosition: { x: 0, y: 1.4, z: -2.8 }, behavior: "scripts/world-radio.js", state: { clean: true, gain: 0.35, reach: 10, station: 0 } });
  // ON AIR over the doorway, guest side
  sp("radio-onair", { feetPosition: { x: 0, y: 2.38, z: 1.1 }, vector: ONAIR(), state: { glow: 0.12 } });
  sp("radio-onair-glow", { feetPosition: { x: 0, y: 2.4, z: 1.35 }, light: { kind: "point", color: "oklch(0.62 0.24 28)", intensity: 0, distance: 3.5 } });
  // guest room: three armchairs round a coffee table on a rug, coffee that never runs out, Ralph's vending machine
  sp("radio-rug", { feetPosition: { x: -2.05, y: 0.114, z: 4.0 }, primitive: { kind: "box", width: 2.3, height: 0.006, depth: 3.1 }, material: { ...RUG, repeat: [1, 1], wrap: undefined } });
  put("radio-ctable", "ctable", -2.0, 0.1, 4.0, 0, 0.45, { state: { name: "Coffee table" } });
  for (const [i, x, z, yaw, tex] of [[0, -2.08, 3.85, 14, "glossy-2006-music-magazine-cover"], [1, -1.95, 4.2, -22, "glossy-2006-tv-guide-magazine-cover"], [2, -2.05, 3.92, 41, "glossy-2006-celebrity-gossip-magazine-cover"]])
    sp(`radio-mag-${i}`, { feetPosition: { x, y: 0.553 + i * 0.007, z }, rotation: { yaw }, primitive: { kind: "box", width: 0.21, height: 0.006, depth: 0.28 }, material: MAG(tex) });
  const arm = (id, x, z, yaw) => put(id, "armchair", x, 0.1, z, yaw, 0.95, { tags: ["seat", "radioprop"], state: { name: "Armchair", seat: { w: 1 }, rest: 0.5 } });
  arm("radio-armchair-1", -3.4, 4.0, 90); arm("radio-armchair-2", -2.0, 2.6, 180); arm("radio-armchair-3", -2.0, 5.45, 0);
  put("radio-side", "side", 3.53, 0.1, 2.4, 270, 0.6, { state: { name: "Side table" } });
  put("radio-coffee", "coffee", 3.55, TOP.side, 2.4, 270, 0.4, use("coffee", "Coffee machine", "Pour coffee", {}));
  ctx.place.objects["radio-coffee"].audio = { clip: "cdn/sfx-coffee-machine-quiet-electrical-hum-loop.mp3", gain: 0.08, loop: true, spatial: true, maxDistance: 6 };
  sp("radio-steam", { feetPosition: { x: 3.48, y: TOP.side + 0.42, z: 2.4 }, fx: { script: STEAM } });
  put("radio-vending", "vending", 3.54, 0.1, 5.1, 270, 1.85, use("vending", "Vending machine", "Buy a drink · $1.50", { n: 0 }));
  ctx.place.objects["radio-vending"].audio = { clip: "cdn/sfx-vending-machine-compressor-hum-loop.mp3", gain: 0.06, loop: true, spatial: true, maxDistance: 6 };
  sp("radio-vending-glow", { feetPosition: { x: 2.85, y: 1.3, z: 5.1 }, light: { kind: "point", color: "oklch(0.92 0.03 220)", intensity: 0.9, distance: 3 } });
  // pictures on three walls
  put("radio-poster", "poster", -3.78, 1.0, 2.3, 90, 0.85, { physics: "none", state: { name: "Framed poster" } });
  put("radio-picture-2", "poster", 3.78, 1.15, 2.4, 270, 0.75, { physics: "none", state: { name: "Framed poster" } });
  put("radio-picture-3", "poster", -2.3, 1.0, 1.3, 180, 0.8, { physics: "none", state: { name: "Framed poster" } });
  put("radio-floorlamp", "floorlamp", -3.62, 0.1, 5.7, 90, 1.6, { state: { name: "Floor lamp" } });
  sp("radio-floorlamp-light", { feetPosition: { x: -3.1, y: 1.55, z: 5.7 }, light: { kind: "point", color: "oklch(0.8 0.14 60)", intensity: 2.6, distance: 5 } });
  put("radio-plant-guest", "plant", 3.45, 0.1, 6.45, 270, 1.6, { state: { name: "Fig" } });
  sp("radio-light-guest", { feetPosition: { x: -1.2, y: 2.4, z: 4.2 }, light: { kind: "point", color: "oklch(0.86 0.09 72)", intensity: 2.2, distance: 9 } });
  // the way out: always Level 11
  bx("radio-exit-door", 0, 0.1, 6.97, 1.0, 2.1, 0.05, DOOR, { physics: "none" });
  sp("radio-exit-sign", { feetPosition: { x: 0, y: 2.38, z: 6.92 }, rotation: { yaw: 180 }, vector: EXITSIGN });
  sp("radio-exit", { feetPosition: { x: 0, y: 0.1, z: 6.8 }, primitive: { kind: "box", width: 1.0, height: 2.0, depth: 0.35 }, visible: false, physics: { body: "static", trigger: true }, behavior: "scripts/level-door.js", state: { to: "level11", name: "Exit · Level 11" } });
}

export function tick(ctx) {
  const st = ctx.place.state, now = ctx.now(), O = ctx.place.objects;
  if (st.builtV !== V) { lay(ctx); st.builtV = V; }
  if (!st.ralphLaid) { ralph(ctx); st.ralphLaid = 1; } else keepPeople(ctx, [RALPH], ralph);
  // ON AIR: lit while Ralph's voice is on, dim through the music
  const live = onAir(now).seg.kind === "host";
  if (st.live !== live) { st.live = live; const s = O["radio-onair"], g = O["radio-onair-glow"]; if (s) s.state.glow = live ? 1 : 0.12; if (g) g.light = { kind: "point", color: "oklch(0.62 0.24 28)", intensity: live ? 1.6 : 0, distance: 3.5 }; }
  // the TV: static, and for four seconds in every forty a camera somewhere in the Backrooms
  const ph = Math.floor(now / 40000), line = now % 40000 < 4000 ? CAMS[ph % CAMS.length] : "";
  if (st.tvLine !== line) { st.tvLine = line; for (const id of ["radio-tv-screen", "radio-tv"]) if (O[id]) O[id].state.line = line; }
  // the safe room: anything hostile that crosses in is shot by Ralph
  const r = O[RALPH];
  for (const f of ctx.query({ anyTags: FOES })) {
    const p = f.feetPosition; if (!p || p.x < -4 || p.x > 4 || p.z < -5 || p.z > 7) continue;
    const o = O[f.id]; if (!o || o.state?.dead) continue;
    o.state.hp = 0; o.state.dead = true;
    const at = r ? { x: r.feetPosition.x, y: r.feetPosition.y + 1.3, z: r.feetPosition.z + 0.4 } : { x: 0, y: 1.4, z: -3.2 };
    ctx.emit("playSound", { clip: "cdn/sfx-pump-shotgun-blast-indoor-close.mp3", position: at, volume: 1, maxDistance: 40 });
    ctx.emit("fx", { position: at, script: BLAST });
  }
}
