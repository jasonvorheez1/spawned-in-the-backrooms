// Level 13: people. places/level13/sim.js calls layPeople(ctx) every 1 s tick; it lays its pieces once (own version key in ctx.place.state) and returns fast after.
// Floor 283: the B.N.T.G. Free Home Project desk in hall B, the five people who talk, and the "Still Home" quest's locket. Ids l13p-*.
import { APTS, RECEPTION, apt } from "./level13.js";
import { keepPeople } from "./level-kit.js";
import { questTick, keepsakeSpec, KEEP } from "./level13-quest.js";
import D from "./data/l13-people.yml";
const PV = 5;
const BNTG = ["bntg", "B.N.T.G. (the Backrooms Nonaligned Trade Group; runs the Free Home Project on Floor 283)"];
const HOMED = ["bntg", "Free Home Project resident, Floor 283"];
const UNALIGNED = ["wanderer", "Unaligned residents of Level 13's first hall"];
const FACTION = { "l13p-oona": BNTG, "l13p-hale": UNALIGNED, "l13p-dot": UNALIGNED };
export const SEATS = { gus: D.pouf, chess: D.props.chess.at }; // where the furnishing lane can expect them

function spawnPeople(ctx) {
  Promise.all([import("./critter-model.js"), import("./clothes.js"), import("./stats.js")]).then(([{ critterSpec }, { npcLook }, { npcState }]) => {
    for (const [id, g] of Object.entries(D.people)) {
      if (ctx.place.objects[id]) continue;
      const [faction, factionName] = FACTION[id] ?? HOMED;
      const home = { x: g.at[0], y: 0, z: g.at[1] };
      ctx.spawn(id, {
        tags: ["npc", "l13-npc", "l13p"],
        feetPosition: home,
        rotation: { lookAt: { x: g.look.x, y: 0, z: g.look.z } },
        physics: "character",
        ...critterSpec(npcLook(id, g.style, faction, 13, g.role)),
        behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
        state: {
          name: g.name, role: g.role, voice: g.voice, faction, factionName,
          rounds: [{ x: home.x, y: 0, z: home.z, dwell: 3600, act: g.act ?? null, look: g.look }],
          ri: 0, home,
          ...npcState(ctx, "agent", g.hp),
        },
      });
    }
  });
}
const svg = (w, vb, body) => `<svg viewBox='0 0 ${vb[0]} ${vb[1]}' width='${w}m'>${body}</svg>`;
const hallB = () => { const h = apt("b1")?.hall; return APTS.filter((a) => a.hall === h); };
function boardSvg() {
  const NAMES = ["Marsh", "Gus ?", "Adeyemi", "Okonkwo", "Lindqvist", "Noor (moving out)", "Tran", "Varga", "Ruiz", "Bell"];
  const RULES = ["1. Your flat is free. Forever.", "2. One flat per wanderer.", "3. The fridge is stocked.", "    Do not ask by whom.", "4. Quiet hours: all of them.", "5. Do not knock on a shut door.", "6. Report odd smells to the desk.", "7. TV is included. Enjoy it", "    responsibly.", "8. Leaving? Return your key."];
  let list = "";
  hallB().slice(0, 10).forEach((a, i) => {
    const y = 49 + i * 2.45, nm = a.id === "b2" ? "Gus ?" : a.id === "b6" ? "Noor (moving out)" : NAMES[i % NAMES.length];
    list += `<text x='53' y='${y}' font-size='2.2' font-family='sans-serif' fill='#2a2620'>${a.num}  ${nm}</text>`;
    if (!a.open) list += `<line x1='52' y1='${y - 0.75}' x2='86' y2='${y - 0.75}' stroke='#8a2018' stroke-width='0.45'/>`;
  });
  return svg(1.1, [100, 76],
    `<rect x='2' y='3' width='44' height='70' fill='#f1ead2'/><rect x='50' y='3' width='48' height='34' fill='#efe6c6'/><rect x='50' y='40' width='48' height='33' fill='#f4efe0'/>`
    + `<text x='24' y='10' text-anchor='middle' font-size='3.6' font-family='display' fill='#7a2f3a'>MOVE-IN RULES</text>`
    + RULES.map((t, i) => `<text x='5' y='${17 + i * 5.2}' font-size='2.7' font-family='sans-serif' fill='#2a2620'>${t}</text>`).join("")
    + `<text x='74' y='11' text-anchor='middle' font-size='4.4' font-family='display' fill='#7a2f3a'>B.N.T.G.</text><text x='74' y='17' text-anchor='middle' font-size='3' font-family='serif' fill='#2a2620'>FREE HOME PROJECT</text>`
    + `<text x='74' y='24' text-anchor='middle' font-size='2.5' font-family='serif' fill='#4a4238'>A door of your own. No rent.</text><text x='74' y='28.5' text-anchor='middle' font-size='2.5' font-family='serif' fill='#4a4238'>No catch worth mentioning.</text><text x='74' y='34' text-anchor='middle' font-size='2.2' font-family='sans-serif' fill='#7a2f3a'>Ask at the desk. Floor 283.</text>`
    + `<text x='74' y='45' text-anchor='middle' font-size='2.8' font-family='display' fill='#2a2620'>RESIDENTS</text>` + list);
}
function layProps(ctx) {
  for (const [k, p] of Object.entries(D.props)) {
    if (!p.model) continue;
    const [w, h, d] = p.size;
    ctx.spawn(`l13p-${k}`, { tags: ["l13p"], feetPosition: { x: p.at[0], y: p.at[1], z: p.at[2] }, rotation: { yaw: p.yaw ?? 0 }, castShadow: !!p.solid, receiveShadow: true,
      model: p.forward ? { id: p.model, forward: p.forward } : { id: p.model }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } },
      ...(p.solid ? { physics: { body: "static", collider: "box" } } : {}), state: { name: k } });
  }
  const b = D.props.board.at, kx = D.props.keys.at, m = D.props.mat.at;
  ctx.spawn("l13p-board-text", { tags: ["l13p"], feetPosition: { x: b[0], y: b[1] + 0.5, z: b[2] - 0.05 }, castShadow: false, vector: boardSvg() });
  ctx.spawn("l13p-sign", { tags: ["l13p"], feetPosition: { x: D.props.desk.at[0], y: 2.16, z: RECEPTION.back - 0.075 }, castShadow: false,
    vector: svg(1.7, [170, 34], `<rect x='1' y='1' width='168' height='32' rx='4' fill='#7a2f3a' stroke='#d9c58a' stroke-width='1.2'/><text x='85' y='15' text-anchor='middle' font-size='11' font-family='display' fill='#f1e6c0'>B.N.T.G. FREE HOME PROJECT</text><text x='85' y='27' text-anchor='middle' font-size='7' font-family='serif' fill='#d9c58a'>Floor 283 · Reception · Keys while you wait</text>`) });
  ctx.spawn("l13p-keys-text", { tags: ["l13p"], feetPosition: { x: kx[0], y: kx[1] + 0.45, z: kx[2] - 0.06 }, castShadow: false,
    vector: svg(0.9, [90, 8], hallB().slice(0, 8).map((a, i) => `<rect x='${1 + i * 11.2}' y='1' width='9.6' height='6' rx='1' fill='#f1ead2' stroke='#6a5a40' stroke-width='0.3'/><text x='${5.8 + i * 11.2}' y='5.4' text-anchor='middle' font-size='3.6' font-family='sans-serif' fill='${a.open ? "#2a2620" : "#8a2018"}'>${a.num}</text>`).join("")) });
  if (D.props.mat.model) ctx.spawn("l13p-mat-text", { tags: ["l13p"], feetPosition: { x: m[0], y: m[1] + 0.031, z: m[2] }, rotation: { pitch: -90 }, castShadow: false,
    vector: svg(0.8, [80, 44], `<text x='40' y='20' text-anchor='middle' font-size='11' font-family='display' fill='#2a2018'>WELCOME</text><text x='40' y='34' text-anchor='middle' font-size='11' font-family='display' fill='#2a2018'>HOME</text>`) });
  ctx.spawn("l13p-crate-tag", { tags: ["l13p"], feetPosition: { x: D.props.crate.at[0], y: 0.61, z: RECEPTION.back - 0.075 }, castShadow: false,
    vector: svg(0.5, [50, 16], `<rect x='0.5' y='0.5' width='49' height='15' fill='#f1ead2' stroke='#6a5a40' stroke-width='0.4'/><text x='25' y='7' text-anchor='middle' font-size='4.6' font-family='sans-serif' fill='#2a2620'>ALMOND WATER</text><text x='25' y='13' text-anchor='middle' font-size='3.4' font-family='sans-serif' fill='#7a2f3a'>Residents free. You: ask.</text>`) });
  // Gus's seat: a round pouf he has worn a dent into
  ctx.spawn("l13p-pouf", { tags: ["l13p"], feetPosition: { x: D.pouf[0], y: 0, z: D.pouf[1] }, primitive: { kind: "sphere", radius: 0.5, widthSegments: 28, heightSegments: 16 }, scale: { x: 0.74, y: 0.44, z: 0.74 },
    material: { color: "oklch(0.52 0.06 60)", roughness: 0.95 }, receiveShadow: true });
  const k = D.keepsake;
  ctx.spawn(KEEP, keepsakeSpec({ x: k[0], y: k[1], z: k[2] }, "counter"));
}
export function layPeople(ctx) {
  const s = ctx.place.state;
  if (s.pv !== PV) {
    for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("l13p-") && !id.includes("/")) ctx.destroy(id);
    s.pv = PV; layProps(ctx); spawnPeople(ctx); return;
  }
  keepPeople(ctx, Object.keys(D.people), () => spawnPeople(ctx));
  questTick(ctx);
}
