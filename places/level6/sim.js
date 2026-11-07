// Level 6 "Lights Out": lays the halls once (place.state.builtV); then the dark talks to whoever is in it.
// No light works here (scripts/player.js kills the flashlight on this place). Plan: scripts/lib/level6.js.
import { W, H, C, HT, START, cx, cz, plan, wallRuns, NOTES } from "../../scripts/lib/level6.js";
export const cadence = "1s";
const V = 1;
const CONCRETE = { color: "oklch(0.55 0.005 250)", roughness: 0.95, texture: "cdn/texture-smooth-cold-poured-concrete-wall.png", repeat: [1, 1], wrap: "repeat" };
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const WHISPERS = [G("faint-skittering-claws-on-concrete-in-dark"), G("slow-close-breathing-in-pitch-dark"), G("unintelligible-whisper-behind-ear"), G("bare-footsteps-stop-on-concrete")];
const chalk = (text) => `<svg viewBox='0 0 300 120' width='1.3m'><text x='150' y='60' text-anchor='middle' font-family='sans-serif' font-size='${text.length > 40 ? 15 : 26}' fill='#cfc9bb' fill-opacity='0.75'>${text.length > 40 ? text.match(/.{1,34}(\s|$)/g).map((l, k) => `<tspan x='150' dy='${k ? 18 : -18}'>${l.trim()}</tspan>`).join("") : text}</text></svg>`;

function lay(ctx) {
  const { ends } = plan();
  ctx.spawn("l6-floor", { feetPosition: { x: 0, y: -0.2, z: 0 }, physics: "static", primitive: { kind: "box", width: W * C, height: 0.2, depth: H * C }, material: { ...CONCRETE, color: "oklch(0.4 0.005 250)" } });
  ctx.spawn("l6-ceiling", { feetPosition: { x: 0, y: HT, z: 0 }, physics: "static", primitive: { kind: "box", width: W * C, height: 0.2, depth: H * C }, material: { ...CONCRETE, color: "oklch(0.35 0.005 250)" } });
  wallRuns().forEach((r, n) => ctx.spawn(`l6-w${n}`, { feetPosition: { x: (cx(r.i0) + cx(r.i1)) / 2, y: 0, z: cz(r.j) }, physics: "static", primitive: { kind: "box", width: (r.i1 - r.i0 + 1) * C, height: HT, depth: C }, material: CONCRETE }));
  ctx.spawn("l6-cap", { feetPosition: { x: cx(START.i), y: 0, z: cz(H - 1) + C }, physics: "static", primitive: { kind: "box", width: C * 3, height: HT, depth: C }, material: CONCRETE });
  // the way back up: a steel door at the south nook, one dying bulb on the far side of its wire glass
  const dz = cz(H - 1) + C / 2 - 0.05;
  ctx.spawn("l6-back", { tags: ["door"], feetPosition: { x: cx(START.i), y: 0, z: dz - 0.35 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 1.4, height: 2.2, depth: 0.5 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level5#l5-from-l6" } });
  ctx.spawn("l6-back-door", { feetPosition: { x: cx(START.i), y: 0, z: dz }, primitive: { kind: "box", width: 1.1, height: 2.1, depth: 0.08 }, material: { color: "oklch(0.32 0.01 240)", metalness: 0.7, roughness: 0.6 } });
  ctx.spawn("l6-back-plate", { feetPosition: { x: cx(START.i), y: 1.55, z: dz - 0.05 }, rotation: { yaw: 0 }, vector: chalk("↑ 5 · boiler room") });
  ctx.spawn("l6-from-l5", { feetPosition: { x: cx(START.i), y: 0.1, z: cz(START.j) }, rotation: { yaw: 0 } });
  // the notes the last ones left, chalked on the dead ends where they stopped
  const used = ends.slice(0, NOTES.length + 2);
  used.forEach((e, n) => {
    if (n === 1) return; // the deepest but one is the stairwell
    const note = NOTES[n === 0 ? 0 : n - 1]; if (!note) return;
    const wx = cx(e.i) - e.dx * (C / 2 - 0.02), wz = cz(e.j) - e.dz * (C / 2 - 0.02); // on the wall that closes it
    ctx.spawn(`l6-note-${n}`, { feetPosition: { x: wx, y: 1.45, z: wz }, rotation: { lookAt: { x: cx(e.i) + e.dx * C, y: 1.45, z: cz(e.j) + e.dz * C } }, vector: chalk(note) });
  });
  // "we blocked it off": boards across the next dead end
  const b = ends[NOTES.length + 2];
  if (b) for (let k = 0; k < 4; k++) ctx.spawn(`l6-board-${k}`, { feetPosition: { x: cx(b.i) + b.dx * 0.6, y: 0.35 + k * 0.45, z: cz(b.j) + b.dz * 0.6 }, rotation: { yaw: b.dx ? 90 : 0, roll: (k % 2 ? 8 : -6) }, physics: "static", primitive: { kind: "box", width: C, height: 0.16, depth: 0.04 }, material: { color: "oklch(0.42 0.05 60)", roughness: 0.9, texture: "cdn/texture-worn-hardwood-grain.png" } });
  if (b) ctx.spawn("l6-board-note", { feetPosition: { x: cx(b.i) + b.dx * 0.55, y: 1.9, z: cz(b.j) + b.dz * 0.55 }, rotation: { lookAt: { x: cx(b.i) + b.dx * 3, y: 1.9, z: cz(b.j) + b.dz * 3 } }, vector: chalk("we blocked it off") });
  // the stairwell down: you hear it before you find it. faint waves, cold air
  const s = ends[1];
  ctx.spawn("l6-stair", { feetPosition: { x: cx(s.i), y: 0, z: cz(s.j) }, tags: ["l6-stair"], audio: { clip: G("faint-distant-ocean-waves-echoing-up-concrete-stairwell-loop"), loop: true, gain: 0.35, spatial: true, maxDistance: 26 },
    children: [0, 1, 2, 3].map((k) => ({ feetPosition: { x: 0, y: -0.2 - k * 0.2, z: -0.3 * k * (s.dz ? -s.dz : 0) }, primitive: { kind: "box", width: C * 0.9, height: 0.05, depth: 0.32 }, material: { ...CONCRETE, color: "oklch(0.3 0.005 250)" } })) });
  ctx.spawn("l6-stair-note", { feetPosition: { x: cx(s.i) - s.dx * (C / 2 - 0.02), y: 1.45, z: cz(s.j) - s.dz * (C / 2 - 0.02) }, rotation: { lookAt: { x: cx(s.i) + s.dx * C, y: 1.45, z: cz(s.j) + s.dz * C } }, vector: chalk("follow the waves. 7 is down here") });
}

export function tick(ctx) {
  const st = ctx.place.state;
  if (st.builtV !== V) { lay(ctx); st.builtV = V; }
  // the dark is never quite empty: a sound just behind you, now and then
  for (const p of ctx.place.players) {
    if (ctx.random() > 0.05) continue;
    const yaw = ((p.camera?.rotation?.yaw ?? 0) * Math.PI) / 180, back = 3 + ctx.random() * 4, side = (ctx.random() - 0.5) * 3;
    const at = { x: p.feetPosition.x + Math.sin(yaw) * back + Math.cos(yaw) * side, y: 1.2, z: p.feetPosition.z + Math.cos(yaw) * back - Math.sin(yaw) * side };
    ctx.emit("playSound", { clip: WHISPERS[Math.floor(ctx.random() * WHISPERS.length)], position: at, volume: 0.5, refDistance: 2, maxDistance: 14 }, { audience: { player: p.id } });
  }
}
