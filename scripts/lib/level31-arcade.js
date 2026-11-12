// Level 31 · arcade zone (map: scripts/lib/level31.js ZONES.arcade). One export, called once per lay by places/level31/sim.js.
// This file is also the behavior of every machine it lays: ears.press reads state.kind ("dispenser" | "arcade" | "attract").
// Meshes: art/l31-arcade/build.py (front = -Z once placed with forward "+z").
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { ZONES, H } from "./level31.js";

const SELF = "scripts/lib/level31-arcade.js";
const SFX = "/cdn/moodboard-realistic-gritty/";
const GLB = {
  dispenser: "/cdn/value.f759116da56aba87735b8064a9fe7b00f9a373dadf68a856453d2f01173eca10.glb",
  upright: "/cdn/value.f025413cd07f33ee4e744a88cdbe78e81a6057ba2b9fa1e5b77a9543ea556977.glb",
  pinball: "/cdn/value.38ea1184b8c82b3771c13c050fd5e3c5e090a504e7b95c21a22663994d233826.glb",
  racer: "/cdn/value.f0f596ab803f45c33fff72bc7af943d49554cb2202b56fe32cbf0221dc9b7fbf.glb",
  moto: "/cdn/value.6d01fa4197dd7ab1344f4b4c529f35fe1febcd398b4556458da3c1f82ae113ba.glb",
  skee: "/cdn/value.7a94f356fc67ae940eb2187fa0f88b7b0b581b47728d0216d83c06d661d7cdfd.glb",
  hockey: "/cdn/value.55832259098e2ee269ab1da4d702bd920b4274e1514d2a1206e0829727f9c39e.glb",
  wheel: "/cdn/value.6da59a17c8bac39b2f40451296a8523c7202ea4113356d1f9c098e00be025180.glb",
};
// what a machine tells you after its two seconds of noise, by state.res
const RESULTS = {
  racer: ["4th place. The other three cars had no drivers.", "Finished the lap. It was the same lap.", "2nd place. Initials entered: AAA."],
  moto: ["You leaned the whole way. Time: 1:31.", "The bike rocks once and the screen says RIDE AGAIN."],
  skee: ["No balls come down the chute. 0 points.", "The 100 ring lights by itself. 2 tickets, no slot to give them."],
  hockey: ["The air comes on. There is no puck.", "The puck slides to your goal on its own. 0 - 1."],
  wheel: ["The wheel lands on 5. Nothing comes out.", "It ticks round to JACKPOT, then one more click to 2."],
  pinball: ["Ball drains down the middle. 12,400.", "TILT.", "One ball, three bumpers, 31,050. No replay."],
  upright: ["GAME OVER. You made the fifth screen.", "High score still belongs to SAL.", "You lasted ninety seconds. The machine says THANKS."],
};
const note = (who, text, ctx) => { who.state.notice = { text, at: ctx.now() }; };
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by), s = ctx.self.state, now = ctx.now(), at = ctx.self.worldFeetPosition;
    if (!who) return;
    if (s.kind === "dispenser") {
      if (who.state.l31card) return note(who, "You already have a green card.", ctx);
      who.state.l31card = true;
      ctx.emit("playSound", { clip: SFX + "sfx-vending-machine-heavy-clunk.mp3", position: at, volume: 0.7, maxDistance: 16 });
      ctx.after(0.45, "cardSlide");
      return note(who, "A green card drops into the tray. You take it.", ctx);
    }
    if (!who.state.l31card) { ctx.emit("playSound", { clip: SFX + "sfx-arcade-error-buzz-short.mp3", position: at, volume: 0.4, maxDistance: 12 }); return note(who, "Insert card.", ctx); }
    if (s.kind === "arcade") { // the game's Block Panic path (scripts/arcade.js), behind the card
      if (who.state.arcade || now - (who.state.arcadeClosedAt ?? 0) < 600) return;
      who.state.arcade = { id: ctx.self.id, game: s.game ?? "blockpanic", at: now, phase: "attract" };
      return;
    }
    if (now < (ctx.self.session.busy ?? 0)) return;
    ctx.self.session.busy = now + 2200;
    ctx.emit("playSound", { clip: "/cdn/moodboard-pixel-bright/sfx-arcade-attract-jingle-two-seconds.mp3", position: at, volume: 0.6, pitch: s.pitch ?? 1, maxDistance: 16 });
    ctx.after(2, "result", { by });
  },
};
export function cardSlide(ctx) { ctx.emit("playSound", { clip: SFX + "sfx-plastic-card-slide-out.mp3", position: ctx.self.worldFeetPosition, volume: 0.7, maxDistance: 12 }); }
export function result(ctx, p) {
  const who = ctx.getObject(p?.by), L = RESULTS[ctx.self.state.res] ?? RESULTS.upright;
  if (who) note(who, L[Math.floor(ctx.random() * L.length) % L.length], ctx);
}

const tex = (what) => `cdn/texture-${what}.png`;
const glow = (what, color = "#ffffff", k = 1.4) => ({ texture: tex(what), emissiveMap: tex(what), emissive: color, emissiveIntensity: k, roughness: 0.15 });
const lamp = (color, k = 1.3) => ({ color, emissive: color, emissiveIntensity: k });
const marquee = (bg, inner) => `<svg viewBox='0 0 160 48' width='0.6m'><rect width='160' height='48' fill='${bg}'/>${inner}</svg>`;
const MARTY = marquee("#f4c21c", `
<g stroke='#c98a12' stroke-width='0.8'><path d='M0 12H160M0 24H160M0 36H160M12 0V12M44 0V12M76 0V12M108 0V12M140 0V12M28 12V24M60 12V24M92 12V24M124 12V24M12 24V36M44 24V36M76 24V36M108 24V36M140 24V36M28 36V48M92 36V48M124 36V48'/></g>
<g transform='translate(18 26)'><path d='M-9 20Q-10 6 0 6Q10 6 9 20Z' fill='#7fc4ee' stroke='#1b2a55' stroke-width='1.2'/><circle r='9' fill='#ffe0c2' stroke='#1b2a55' stroke-width='1.2'/><path d='M-10 -3Q-9 -14 2 -13Q10 -12 10 -4L16 -3L10 -1Z' fill='#2d4ea3' stroke='#1b2a55' stroke-width='1.2'/><circle cx='-3' cy='1' r='1.3' fill='#1b2a55'/><circle cx='4' cy='1' r='1.3' fill='#1b2a55'/><path d='M-4 5Q1 9 6 5' fill='none' stroke='#1b2a55' stroke-width='1.2'/>
<g transform='rotate(-25 14 6)'><rect x='13' y='-6' width='2.4' height='18' fill='#b9772e' stroke='#1b2a55' stroke-width='0.8'/><rect x='9' y='-10' width='11' height='6' rx='1' fill='#d8dbe0' stroke='#1b2a55' stroke-width='0.9'/></g></g>
<g transform='rotate(-4 96 26)'><text x='96' y='25' text-anchor='middle' font-family='display' font-size='15' font-weight='bold' fill='#9fd6ff' stroke='#1b2a55' stroke-width='3' paint-order='stroke'>MEND-IT</text><text x='98' y='42' text-anchor='middle' font-family='display' font-size='15' font-weight='bold' fill='#9fd6ff' stroke='#1b2a55' stroke-width='3' paint-order='stroke'>MARTY JR.</text></g>
<rect x='132' y='4' width='24' height='8' rx='4' fill='#fff' stroke='#1b2a55' stroke-width='0.7'/><text x='144' y='10' text-anchor='middle' font-family='sans-serif' font-size='5' fill='#1b2a55'>Okiboshi</text>`);
const PANIC = marquee("#14122a", `<g fill='#ff4fa3'><rect x='8' y='8' width='10' height='10'/><rect x='18' y='8' width='10' height='10'/><rect x='18' y='18' width='10' height='10'/><rect x='28' y='18' width='10' height='10'/></g><g fill='#39d3ff'><rect x='126' y='22' width='9' height='9'/><rect x='135' y='22' width='9' height='9'/><rect x='144' y='22' width='9' height='9'/><rect x='135' y='31' width='9' height='9'/></g><text x='82' y='22' text-anchor='middle' font-family='sans-serif' font-weight='bold' font-size='15' fill='#ffe14a'>BLOCK</text><text x='82' y='40' text-anchor='middle' font-family='sans-serif' font-weight='bold' font-size='17' fill='#ffffff' letter-spacing='3'>PANIC</text>`);
const COMET = marquee("#06142e", `<circle cx='22' cy='14' r='1' fill='#fff'/><circle cx='140' cy='36' r='1.2' fill='#fff'/><circle cx='120' cy='9' r='0.8' fill='#fff'/><circle cx='40' cy='40' r='0.8' fill='#fff'/><path d='M8 42Q60 4 150 8' fill='none' stroke='#ff8a2a' stroke-width='3' stroke-linecap='round'/><circle cx='150' cy='8' r='5' fill='#ffd76a'/><text x='78' y='34' text-anchor='middle' font-family='serif' font-style='italic' font-weight='bold' font-size='20' fill='#e9f3ff' stroke='#2a6bff' stroke-width='0.8'>Comet Cadets</text>`);
const PICKLE = marquee("#f3ead2", `<rect x='3' y='3' width='154' height='42' fill='none' stroke='#b3261e' stroke-width='2.5'/><g transform='rotate(-20 24 24)'><rect x='16' y='8' width='15' height='32' rx='7.5' fill='#5c9a2e' stroke='#2c4d14' stroke-width='1.2'/><circle cx='21' cy='16' r='1' fill='#2c4d14'/><circle cx='26' cy='24' r='1' fill='#2c4d14'/><circle cx='20' cy='31' r='1' fill='#2c4d14'/></g><text x='94' y='21' text-anchor='middle' font-family='sans-serif' font-weight='bold' font-size='14' fill='#2c4d14' letter-spacing='2'>PICKLE</text><text x='94' y='39' text-anchor='middle' font-family='sans-serif' font-weight='bold' font-size='14' fill='#b3261e' letter-spacing='2'>PATROL</text>`);
const PRINT = `<svg viewBox='0 0 47 66' width='0.47m'><rect width='47' height='66' fill='#178a45'/><rect x='2' y='2' width='43' height='62' fill='none' stroke='#eafff0' stroke-width='0.6'/><rect x='6' y='5' width='35' height='9' rx='1.5' fill='#eafff0'/><text x='23.5' y='11.6' text-anchor='middle' font-family='sans-serif' font-weight='bold' font-size='5.4' fill='#178a45'>GAME CARD</text>
<g font-family='sans-serif' font-weight='bold' font-size='4.3' fill='#ffffff' text-anchor='middle'><text x='23.5' y='21'>Please press the</text><text x='23.5' y='26.5'>button to get a card</text></g><path d='M23.5 29v5m-3-3l3 3.6l3-3.6' fill='none' stroke='#fff' stroke-width='1.2'/><circle cx='23.5' cy='46' r='9.5' fill='none' stroke='#eafff0' stroke-width='0.7' stroke-dasharray='1.5 1.2'/>
<text x='23.5' y='61' text-anchor='middle' font-family='sans-serif' font-size='2.6' fill='#bfe9cd'>one card per guest · no refunds</text></svg>`;
const NEON = `<svg viewBox='0 0 300 100' width='3m'><g fill='none' stroke-linecap='round' stroke-linejoin='round'><text x='150' y='70' text-anchor='middle' font-family='serif' font-style='italic' font-size='78' fill='none' stroke='#ff4fb8' stroke-width='3.2' filter='drop-shadow(0 0 7 #ff2fa8)'>Arcade</text><path d='M30 88Q150 76 270 88' stroke='#49e6ff' stroke-width='3' filter='drop-shadow(0 0 6 #29d0ff)'/></g></svg>`;
const PAPER = `<svg viewBox='0 0 22 16' width='0.22m'><g transform='rotate(-4 11 8)'><rect x='1' y='1.5' width='20' height='13' fill='#f1ecdc'/><rect x='7.5' y='0.4' width='7' height='2.6' fill='#d9c98a' opacity='0.85'/><g font-family='serif' font-style='italic' fill='#27324f' text-anchor='middle'><text x='11' y='7.2' font-size='3.4'>stick sticks</text><text x='11' y='11.6' font-size='3'>sorry - Dee</text></g></g></svg>`;

export function layArcade(ctx) {
  const Z = ZONES.arcade, cx = (Z.x0 + Z.x1) / 2, cz = (Z.z0 + Z.z1) / 2, E = Z.x1, N = Z.z0;
  if (ctx.getObject("l31-arcade-bp")) ctx.destroy("l31-arcade-bp");
  const strip = (id, x, z, w, d, color) => ({ id, feetPosition: { x, y: H - 0.13, z }, primitive: { kind: "box", width: w, height: 0.03, depth: d }, material: lamp(color, 2.2), castShadow: false });
  // root: the zone itself (bed sound) carrying the mirrored ceiling band, its chrome ribs and two neon runs
  ctx.spawn("l31-arcade-bp", {
    feetPosition: { x: cx, y: 0, z: cz }, tags: ["l31-arcade"],
    audio: { clip: "/cdn/moodboard-pixel-bright/sfx-arcade-room-garbled-attract-machines-loop.mp3", gain: 0.15, loop: true, spatial: true, maxDistance: 30 },
    children: [
      { id: "mirror", feetPosition: { x: 0, y: H - 0.09, z: 0 }, primitive: { kind: "box", width: 16, height: 0.05, depth: 36 }, material: { color: "#23252e", metalness: 1, roughness: 0.1 }, castShadow: false },
      ...[-16, -12, -8, -4, 0, 4, 8, 12, 16].map((dz, i) => ({ id: "rib" + i, feetPosition: { x: 0, y: H - 0.11, z: dz }, primitive: { kind: "box", width: 16, height: 0.03, depth: 0.08 }, material: { color: "#aeb3c0", metalness: 1, roughness: 0.25 }, castShadow: false })),
      strip("tube-a", -7.9, 0, 0.05, 35.6, "#ff3fae"), strip("tube-b", 2, 0, 0.05, 35.6, "#35d8ff"),
    ],
  });
  [["a", 31, -24, "#ff8cc4", 7], ["b", 38, -15, "#8fd4ff", 7], ["c", 36, -3, "#ffc08a", 6.5], ["d", 30, -11, "#ffe0b0", 6]].forEach(([k, x, z, color, intensity]) =>
    ctx.spawn("l31-arcade-light-" + k, { feetPosition: { x, y: 3.7, z }, light: { kind: "point", color, intensity, distance: 20 } }));
  // neon script over the entrance, hung on two rods, read from the aisle
  ctx.spawn("l31-arcade-neon", { feetPosition: { x: Z.x0 + 2.6, y: 3.6, z: -12 }, rotation: { yaw: 90 }, vector: NEON, castShadow: false,
    children: [-1.2, 1.2].map((dx, i) => ({ id: "rod" + i, feetPosition: { x: dx, y: 0.45, z: 0.02 }, primitive: { kind: "cylinder", radiusTop: 0.012, radiusBottom: 0.012, height: H - 4.05 - 0.09 }, material: { color: "#888c96", metalness: 1, roughness: 0.3 } })) });

  const M = (id, key, x, z, yaw, state, materials, children) => ctx.spawn("l31-arcade-" + id, {
    feetPosition: { x, y: 0, z }, rotation: { yaw }, model: { id: GLB[key], forward: "+z", materials }, physics: { body: "static", collider: "box" },
    behavior: SELF, tags: ["usable", "l31-arcade"], state: { kind: "attract", verb: "Play", info: "arcade machine, takes a card", ...state }, children });
  const W = 90, EA = -90, S = 180; // the way a machine's player side faces

  M("dispenser", "dispenser", Z.x0 + 1, -12, W, { kind: "dispenser", name: "Card dispenser", verb: "Press", info: "Please press the button to get a card" },
    { metal: { texture: tex("brushed-stainless-steel"), metalness: 1, roughness: 0.38 }, button: lamp("#1f5cff", 1.2) },
    [{ id: "print", feetPosition: { x: 0, y: 1.03, z: -0.2155 }, vector: PRINT, castShadow: false }]);

  // sit-down racers: two rows of three, screens back to back, seats out to the aisles
  const RT = ["retro-arcade-crt-screen-desert-highway-racing-game", "retro-arcade-crt-screen-night-city-racing-game"], RC = ["#ffffff", "#ffd9c0", "#c8e4ff"];
  for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++)
    M(`racer-${r}${i}`, "racer", r ? 34.05 : 31.45, -22 + i * 1.25, r ? EA : W, { name: "Dust Devil GP", res: "racer", pitch: 0.94 + i * 0.05 },
      { screen: glow(RT[(r + i) % 2], RC[i]), marquee: lamp(r ? "#ffb23a" : "#ff5a3a", 1.4) });
  // ride-on bikes against the north wall
  for (let i = 0; i < 2; i++) M("moto-" + i, "moto", 29.6 + i * 1.9, N + 1.22, S, { name: "Night Ride 500", res: "moto", pitch: 1.08 },
    { screen: glow("retro-arcade-crt-screen-motorbike-coast-road-racing-game", i ? "#d8ffe0" : "#ffffff"), marquee: lamp(i ? "#58c8ff" : "#ff4fb8", 1.4), tail: lamp("#ff2a1a", 2) });
  // pinball: three in a row, backs to the north wall
  const PB = [["Moon Diner", "#ffffff", "#ffd0f0"], ["High Tide", "#bfe6ff", "#9fe0ff"], ["Thunder Alley", "#ffe2a8", "#ffc070"]];
  PB.forEach(([name, a, b], i) => M("pinball-" + i, "pinball", 36 + i * 1.05, N + 0.72, S, { name, res: "pinball", pitch: 1.15 },
    { playfield: glow("pinball-machine-playfield-top-down-bumpers-lanes-art", a, 0.7), backglass: glow("pinball-backglass-art-1970s-painted-illustration", b, 1.2) }));
  // skee-ball: two lanes side by side, heads on the east wall
  for (let i = 0; i < 2; i++) M("skee-" + i, "skee", E - 1.6, -3.2 + i * 0.86, W, { name: "Skee-Ball lane " + (i + 1), verb: "Roll", res: "skee", pitch: 0.9 }, { lane: { texture: tex("grey-cork-lane-surface"), roughness: 0.7 } });
  M("wheel", "wheel", E - 0.52, -10.5, W, { name: "Big Prize Wheel", verb: "Spin", res: "wheel", pitch: 1.2 }, { screen: lamp("#ff3b30", 1.6), marquee: lamp("#ffd76a", 1.5), bulbs: lamp("#ffdf9a", 2.5) });
  M("hockey", "hockey", 36, -8, 0, { name: "Air hockey", res: "hockey", pitch: 0.85 }, { screen: lamp("#ff4a2a", 1.5), lamp: lamp("#fff2dc", 2), goal: lamp("#ff3b30", 1.2) });
  // four old box uprights, far apart, each against a wall
  const U = (id, x, z, yaw, state, side, body, scr, svg, extra = []) => M(id, "upright", x, z, yaw, { res: "upright", ...state },
    { screen: scr, marquee: lamp("#fff4d0", 0.5), side, body_red: body, cpanel: { color: body.color } },
    [{ id: "title", feetPosition: { x: 0, y: 1.6, z: -0.352 }, vector: svg, castShadow: false }, ...extra]);
  U("marty", E - 0.42, -16.5, W, { name: "Mend-It Marty Jr." }, { texture: tex("retro-arcade-cabinet-side-art-green-yellow-vertical-stripes"), roughness: 0.5 }, { color: "#b9c832" },
    glow("retro-arcade-crt-screen-pixel-handyman-climbing-brick-building-game"), MARTY);
  U("panic", E - 0.42, -24.5, W, { kind: "arcade", game: "blockpanic", name: "Block Panic", info: "arcade cabinet, takes a card" }, { color: "#2a1c5c", roughness: 0.4 }, { color: "#ff4fa3" },
    glow("retro-arcade-crt-screen-pixel-falling-block-puzzle-game", "#ffffff", 1.5), PANIC);
  U("comet", 27.2, N + 0.42, S, { name: "Comet Cadets", pitch: 1.3 }, { color: "#0c2a66", roughness: 0.4 }, { color: "#ff8a2a" },
    glow("retro-arcade-crt-screen-pixel-space-shooter-starfield-game", "#d8e8ff"), COMET);
  U("pickle", E - 0.42, 3, W, { name: "Pickle Patrol", pitch: 0.8 }, { color: "#e9dfc2", roughness: 0.55 }, { color: "#5c9a2e" },
    glow("retro-arcade-crt-screen-pixel-maze-chase-green-game", "#e6ffd0"), PICKLE,
    [{ id: "note", feetPosition: { x: 0.02, y: 0.74, z: -0.34 }, vector: PAPER, castShadow: false }]);

  // three faceling customers, each stood at a machine (docile; lines in scripts/lib/data/dlg-generic.yml by id)
  [["face1", E - 1.5, -16.5, EA, "f", { topw: "jacket", top: "#7a3d52", bottom: "#27293a" }, "Faceling at the Marty machine"],
   ["face2", 37.05, N + 2.05, 0, "m", { topw: "tee", top: "#3f6f8f", bottom: "#3a352e" }, "Faceling at the pinball"],
   ["face3", E - 3.75, -2.77, EA, "m", { topw: "hoodie", top: "#c9a23a", bottom: "#22232b" }, "Faceling at the Skee-Ball"]].forEach(([id, x, z, yaw, sex, wear, name]) =>
    ctx.spawn("l31-arcade-" + id, { feetPosition: { x, y: 0.05, z }, rotation: { yaw }, physics: "character", tags: ["npc", "usable", "faceling", "l31-arcade"],
      ...critterSpec(npcLook("l31-arcade-" + id, { species: "faceling", sex, botw: "pants", shoes: "sneakers", ...wear }, "wanderer", 1)),
      behavior: ["scripts/humanoid-locomotion.js"], state: { name, role: "regular", faction: "wanderer", factionName: "Rink regular", docile: true, hp: 60, home: { x, z }, stay: true } }));
}
