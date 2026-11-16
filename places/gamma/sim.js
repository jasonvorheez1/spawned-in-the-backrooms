import { dressLevel } from "../../scripts/lib/kit-levels.js";
import { sweepProps } from "../../scripts/lib/breakables.js";
import { restyleSigns } from "../../scripts/lib/sign-style.js";
import { dressThresholds } from "../../scripts/lib/thresholds.js";
import { keepPeople, every } from "../../scripts/lib/level-kit.js";
// Base Gamma's inside: the M.E.G.'s fortress at the end of Level 3. Lays the shell, the dressing, lights, signs, doors,
// sound beds, guards, traders and residents once (place.state.builtV); the agents run themselves (scripts/meg-agent.js).
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { fullLook, npcLook } from "../../scripts/lib/clothes.js";
import MEG from "../../scripts/lib/data/meg.yml";
import { npcState } from "../../scripts/lib/stats.js";
import { weaponBody } from "../../scripts/lib/weapon-look.js";
import { LIGHTS } from "../../scripts/lib/gamma-layout.js";
import { SHOPS } from "../../scripts/gamma-public-geo.js";
import { workbenchSpec, ammobenchSpec, ensureBenches } from "../../scripts/lib/benches.js";
export const cadence = "1s";
const V = 3;
const GRIT = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const CAM = "/cdn/value.9a228d2a44ac47cc422ab5bcdbbaa10b84f595f45d7cb1acd62d496a80a648bc.glb";
const JK = (top, extra) => ({ topw: "jacket", top, botw: "pants", bottom: "#3a3a32", shoes: "boots", shoec: "#22201c", ...extra });
// everyone inside: guards (scout), traders (trader: shops.yml by id), residents (medic voice-less roles talk too)
export const PEOPLE = {
  "gamma-hask":  { name: "Cpl. Hask · M.E.G. Gate Guard", role: "scout", voice: "ortiz", gun: "shotgun", at: [-4, 31], yaw: 90, look: { species: "bear", sex: "m", ...JK("#b8d040", { hat: "cap", hatc: "#4a5a2a" }), expr: "bored" } },
  "gamma-vale":  { name: "Vale · M.E.G. Scanner Tech", role: "scout", voice: "ale", gun: "pistol", at: [4, 26], yaw: -90, look: { species: "human", sex: "f", ...JK("#c2d84a"), expr: "keen" } },
  "gamma-duke":  { name: "Duke · M.E.G. Catwalk Sniper", role: "scout", voice: "reyes", gun: "shotgun", at: [-4.6, 22], yaw: 90, look: { species: "human", sex: "m", ...JK("#a8c038", { hat: "beanie", hatc: "#3a4a2a" }), expr: "wary" } },
  "gamma-marlo": { name: "Marlo · Gunsmith", role: "smith", voice: "callum", gun: "pistol", at: [-19.5, 12], yaw: -90, look: { species: "raccoon", sex: "m", topw: "longsleeve", top: "#5a4030", botw: "pants", bottom: "#2e2a26", shoes: "boots", shoec: "#22201c", expr: "grin" } },
  "gamma-june":  { name: "June · Almond Water Bar", role: "trader", voice: "mags", gun: "wrench", at: [14.5, -9.5], yaw: 0, look: { species: "cat", sex: "f", topw: "hoodie", top: "#6ab8c8", botw: "skirt", bottom: "#2a3040", shoes: "boots", shoec: "#2a2420", expr: "joy" } },
  "gamma-tess":  { name: "Tess · Tailor", role: "trader", voice: "wren", gun: "screwdriver", at: [-19.5, -7], yaw: -90, look: { species: "sheep", sex: "f", topw: "longsleeve", top: "#c86a9a", botw: "skirt", bottom: "#3a2a3a", shoes: "boots", shoec: "#2a2420", hat: "beanie", hatc: "#e8d8c0", expr: "lidded" } },
  "gamma-bo":    { name: "Bo · Wanderer", role: "scout", voice: "hollis", gun: "pipe_scrap", at: [-3, 3.2], yaw: 180, look: { species: "dog", sex: "m", topw: "hoodie", top: "#7a5a3a", botw: "pants", bottom: "#3a3a40", shoes: "boots", shoec: "#2a2420", expr: "smile" } },
  "gamma-nell":  { name: "Nell · Resident", role: "medic", voice: "ito", gun: "wrench", at: [3, 11.8], yaw: 0, look: { species: "bunny", sex: "f", topw: "longsleeve", top: "#e8a0a8", botw: "skirt", bottom: "#4a3a4a", shoes: "boots", shoec: "#2a2420", expr: "blep" } },
  "gamma-pip":   { name: "Pip · Resident", role: "scout", voice: "wren", gun: "screwdriver", at: [26, 10], yaw: 90, look: { species: "redpanda", sex: "f", topw: "hoodie", top: "#d89a40", botw: "pants", bottom: "#3a3040", shoes: "boots", shoec: "#2a2420", expr: "joy" } },
  "gamma-otto":  { name: "Otto · Resident", role: "scout", voice: "callum", gun: "pipe_scrap", at: [0, -20], yaw: 90, look: { species: "pig", sex: "m", topw: "longsleeve", top: "#4a6a8a", botw: "pants", bottom: "#2a2a30", shoes: "boots", shoec: "#22201c", expr: "smile" } },
  "gamma-ivy":   { name: "Ivy · Resident", role: "scout", voice: "pell", gun: "wrench", at: [-26, 2], yaw: -90, look: { species: "deer", sex: "f", topw: "jacket", top: "#8a3a3a", botw: "skirt", bottom: "#2a2a2a", shoes: "boots", shoec: "#2a2420", expr: "kiss" } },
  "gamma-moss":  { name: "Cmdr. Moss · M.E.G. Administration", role: "scout", voice: "reyes", gun: "pistol", at: [15, 29.5], yaw: 0, look: { species: "human", sex: "m", ...JK("#9ab030", { hat: "cap", hatc: "#3a4a2a" }), expr: "resolute" } },
};
function person(ctx, id) {
  const g = PEOPLE[id];
  ctx.spawn(id, { tags: ["npc", "gamma"], feetPosition: { x: g.at[0], y: 0, z: g.at[1] }, rotation: { yaw: g.yaw ?? 0 }, physics: "character",
    ...critterSpec(npcLook(id, g.look, g.faction ?? (String(g.look?.top).toLowerCase() === "#b6e04a" ? "meg" : "survivor"), g.level ?? (g.role === "guard" ? 16 : 12), g.role)), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"], state: { name: g.name, role: g.role, voice: g.voice, ...npcState(ctx, "agent", MEG.hp) } });
  ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
}
// a framed plate: dark steel face, big words, a warm light over it
function plate(ctx, x, y, z, yaw, w, text, sub, col = "#f0e8c8", bg = "oklch(0.22 0.03 140)") {
  ctx.spawn({ tags: ["gamma-sign"], feetPosition: { x, y, z }, rotation: { yaw }, primitive: { kind: "box", width: w + 0.16, height: sub ? 0.95 : 0.62, depth: 0.06 },
    material: { color: "oklch(0.3 0.02 250)", metalness: 0.7, roughness: 0.4 },
    children: [{ feetPosition: { x: 0, y: 0.04, z: -0.035 }, primitive: { kind: "box", width: w, height: sub ? 0.87 : 0.54, depth: 0.01 }, material: { color: bg, roughness: 0.8 },
      ui: `<div face="front" width="${w}m" style="font-size:${Math.round(w * 52)}px;font-weight:900;color:${col};text-align:center;line-height:1.05">${text}${sub ? `<div style="font-size:${Math.round(w * 26)}px;opacity:.85">${sub}</div>` : ""}</div>` }] });
}
function door(ctx, id, x, z, yaw, to, label, sub, w = 3.6, h = 4) { // the great door: frame + leaves (geo), trigger, lit plate
  const f = yaw === 0 ? -1 : 1; // which side the trigger sits: in front of the face
  ctx.spawn({ tags: ["gamma-door"], feetPosition: { x, y: 0, z }, rotation: { yaw }, physics: { body: "static", collider: "mesh" }, primitive: { kind: "scripted", script: "scripts/gamma-door-geo.js", params: { w, h, seal: true } }, material: { roughness: 0.7, pbr: true } });
  ctx.spawn(id, { tags: ["door"], feetPosition: { x, y: 0, z: z + f * 0.55 }, rotation: { yaw }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: w, height: 2.6, depth: 0.7 }, visible: false, behavior: "scripts/level-door.js", state: { to } });
  plate(ctx, x, h + 0.55, z + f * 0.3, yaw, 2.4, label, sub, "#d8f0c0");
  ctx.spawn({ feetPosition: { x, y: h + 1.35, z: z + f * 0.6 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.2, height: 0.16 }, material: { color: "oklch(0.95 0.08 80)", emissive: "oklch(0.95 0.08 80)", emissiveIntensity: 3 },
    light: { kind: "spot", color: "oklch(0.92 0.07 80)", intensity: 14, distance: 10, angle: 50, penumbra: 0.6, aim: { x, y: 0, z: z + f * 3 } } });
}
function lay(ctx) {
  const mesh = (script, rough = 0.85) => ctx.spawn({ feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script }, material: { roughness: rough, pbr: true } });
  mesh("scripts/gamma-shell-geo.js"); mesh("scripts/gamma-sec-geo.js"); mesh("scripts/gamma-public-geo.js"); mesh("scripts/gamma-town-geo.js");
  ctx.spawn({ feetPosition: { x: 0, y: 0, z: 0 }, castShadow: false, primitive: { kind: "scripted", script: "scripts/gamma-fixtures-geo.js" }, material: { roughness: 0.5 } });
  for (const [x, y, z, color, intensity, distance, kind] of LIGHTS)
    ctx.spawn({ tags: ["gamma-light"], feetPosition: { x, y: kind === "pendant" ? y - 0.3 : y - 0.15, z }, light: { kind: "point", color, intensity, distance, shadow: { enabled: false } } });
  // the doors: out to Level 3 through the great door; the tunnel's grate stays shut
  door(ctx, "gamma-out", 0, 40, 0, "level3#l3-gamma-door", "LEVEL 3", "electrical station · fortress gate");
  // signs
  plate(ctx, 0, 6.2, 39.55, 0, 7, "ALL WANDERERS WELCOME", "· ALL WANDERERS SCANNED ·", "#e8f4c0");
  plate(ctx, 0, 6.6, 18.3, 0, 5, "M.E.G. BASE GAMMA", "public sector · residence beyond", "#f0e0b0", "oklch(0.25 0.05 60)");
  plate(ctx, -5.75, 2.6, 30, -90, 2.2, "LIQUID PAIN", "hose live · do not approach", "#ffd8c8", "oklch(0.35 0.14 25)");
  plate(ctx, 5.75, 2.6, 24, 90, 2.2, "LIQUID PAIN", "hose live · do not approach", "#ffd8c8", "oklch(0.35 0.14 25)");
  plate(ctx, -26, 2.4, 18.3, 0, 2, "AUTHORIZED ONLY", "tunnels · M.E.G. personnel", "#ffe0c0", "oklch(0.3 0.12 30)");
  plate(ctx, 0, 5.8, -11.7, 180, 4, "RESIDENCE SECTOR", "quiet hours 22-06", "#e0e8ff", "oklch(0.25 0.04 260)");
  plate(ctx, 15, 2.8, 18.3, 0, 2.2, "ADMINISTRATION", null, "#f0e8d0", "oklch(0.28 0.05 40)");
  plate(ctx, 21.7, 2.5, 10.5, 90, 2, "TV LOUNGE", null, "#ffd8f0", "oklch(0.28 0.08 330)");
  plate(ctx, -22.3, 3.5, 2, -90, 2.4, "OLD WING", "built by the first wanderers", "#f0d8b0", "oklch(0.3 0.06 50)");
  for (const [ax, w, u0, u1, s, glow, name] of SHOPS) {
    const mid = (u0 + u1) / 2, x = ax === "z" ? mid : w + s * 0.32, z = ax === "z" ? w + s * 0.32 : mid, yaw = ax === "z" ? (s > 0 ? 180 : 0) : (s > 0 ? -90 : 90);
    ctx.spawn({ tags: ["gamma-sign"], feetPosition: { x, y: 3.85, z }, rotation: { yaw }, vector: `<svg viewBox='0 0 400 60' width='${Math.min(6, (u1 - u0) * 0.7)}m'><text x='200' y='46' text-anchor='middle' font-family='display' font-size='46' fill='${glow}' filter='drop-shadow(0 0 6 ${glow})'>${name}</text></svg>` });
  }
  // cameras over the scan hall, ceiling mounted
  for (const [x, z, yaw] of [[-5.6, 38, -120], [5.6, 33, 120], [-5.6, 20, -60], [5.6, 20, 60]])
    ctx.spawn({ tags: ["gamma-cam"], feetPosition: { x, y: 7.7, z }, rotation: { yaw, roll: 180 }, model: CAM, scale: 1 });
  // the star poster in the lounge
  ctx.spawn({ feetPosition: { x: 29.75, y: 1.4, z: 9 }, rotation: { yaw: 90 }, primitive: { kind: "plane", width: 0.9, height: 1.3 }, material: { color: "#1a1830", emissive: "#2a2050", emissiveIntensity: 0.3 },
    vector: `<svg viewBox='0 0 90 130' width='0.9m'><rect width='90' height='130' fill='#241c48'/><path d='M45 18 L53 44 L80 44 L58 60 L66 86 L45 70 L24 86 L32 60 L10 44 L37 44 Z' fill='#ffd84a' filter='drop-shadow(0 0 3 #ffb000)'/><text x='45' y='112' text-anchor='middle' font-family='display' font-size='14' fill='#ffe8a0'>STARLIGHT</text></svg>` });
  // sound beds
  const bed = (x, y, z, clip, gain, maxDistance) => ctx.spawn({ tags: ["gamma-bed"], feetPosition: { x, y, z }, audio: { clip: GRIT(clip), gain, loop: true, spatial: true, maxDistance } });
  bed(0, 3, 3, "busy-crowd-murmur-indoor-hall-loop", 0.18, 34);
  bed(26, 1.5, 6, "crt-tv-chatter-muffled-loop", 0.16, 10);
  bed(0, 4, 29, "fluorescent-light-buzz-loop", 0.1, 16);
  bed(0, 6, -26, "distant-hvac-hum-room-tone-loop", 0.12, 30);
  bed(15, 2, 25, "fluorescent-light-buzz-loop", 0.08, 10);
  bed(-26, -1, 30, "water-drip-echo-loop", 0.14, 12);
  for (const id of Object.keys(PEOPLE)) person(ctx, id);
}
function layComputers(ctx) { // the Administration's Database terminal (scripts/computer.js, Back OS)
  ctx.spawn({ tags: ["gamma-terminal"], feetPosition: { x: 9.6, y: 0, z: 22 }, rotation: { yaw: -90 }, physics: { body: "static", collider: "mesh" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/l4-office-geo.js", params: { kind: "terminal" } } });
  ctx.spawn({ tags: ["usable", "computer"], feetPosition: { x: 9.9, y: 0.76, z: 22 }, rotation: { yaw: -90 }, visible: false, behavior: "scripts/computer.js", physics: "static", primitive: { kind: "box", width: 0.46, height: 0.36, depth: 0.36 },
    state: { kind: "computer", host: "GAMMA-DB-01", lock: "science:50", name: "The Database", verb: "Log in", info: "Locked · Science 50 or a password", tint: "#f2c200" } });
}
export function tick(ctx) {
  dressLevel(ctx, "gamma");
  if (ctx.place.players?.length) sweepProps(ctx); // props become breakable (scripts/lib/breakables.js)
  restyleSigns(ctx, "gamma"); // every sign dressed as its own board (scripts/lib/sign-style.js)
  dressThresholds(ctx); // the ways in and out, dressed with what people left there (scripts/lib/thresholds.js)
  if (!ctx.place.players?.length) return; // empty level: nothing to run (perf)
  const s = ctx.place.state;
  if (s.builtV !== V) { s.builtV = V; lay(ctx); }
  if (s.osV !== 1) { s.osV = 1; layComputers(ctx); }
  if ((s.campBenchV ?? 0) < 1) {
    s.campBenchV = 1;
    ensureBenches(ctx, [
      ["gamma-workshop-bench", workbenchSpec({ x: -5.5, y: 0, z: -11.3 }, { yaw: 0, name: "Base Gamma Workshop Bench" })],
      ["gamma-marlo-ammobench", ammobenchSpec({ x: -20.6, y: 0, z: 14.8 }, { yaw: 90, name: "Marlo's Reloading Bench" })],
    ]);
  }
  if (every(ctx, "people", 5000)) keepPeople(ctx, Object.keys(PEOPLE), person); // the fallen come back after an hour
  if (s.doorV !== 1) { const d = ctx.getObject("gamma-out"); if (d) d.state = { ...d.state, to: "level3#l3-gamma-door" }; s.doorV = 1; } // rooms built before the gate door existed
}
