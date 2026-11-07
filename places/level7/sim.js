// Level 7 "Thalassophobia": lays the entrance room, the pier and the way back up once (place.state.builtV).
// The room: a drowned concrete office stair landing on a rock. North (-Z) its door opens on the sea.
export const cadence = "2s";
const V = 1;
const CONCRETE = { color: "oklch(0.5 0.008 240)", roughness: 0.95, texture: "cdn/texture-smooth-cold-poured-concrete-wall.png", repeat: [1, 1], wrap: "repeat" };
const WOOD = { color: "oklch(0.36 0.03 60)", roughness: 0.9, texture: "cdn/texture-weathered-grey-sea-soaked-wood-planks.png", repeat: [1, 1], wrap: "repeat" };
const RUST = { color: "oklch(0.38 0.06 45)", metalness: 0.6, roughness: 0.8 };
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const FY = 4; // the room's floor
const chalk = (text, w = "1.4m") => `<svg viewBox='0 0 300 120' width='${w}'><text x='150' y='60' text-anchor='middle' font-family='sans-serif' font-size='24' fill='#d8d3c6' fill-opacity='0.8'>${text}</text></svg>`;
const box = (ctx, id, x, y, z, w, h, d, material, extra = {}) => ctx.spawn(id, { feetPosition: { x, y, z }, physics: "static", primitive: { kind: "box", width: w, height: h, depth: d }, material, ...extra });

function lay(ctx) {
  // the room: 6 x 6, 2.6 high, a doorway north onto the sea, the stair south back up to 6
  box(ctx, "l7-floor", 0, FY - 0.3, 0, 6.4, 0.3, 6.4, { ...CONCRETE, color: "oklch(0.33 0.01 240)" });
  box(ctx, "l7-ceil", 0, FY + 2.6, 0, 6.4, 0.2, 6.4, { ...CONCRETE, color: "oklch(0.38 0.008 240)" });
  box(ctx, "l7-wall-e", 3, FY, 0, 0.4, 2.6, 6.4, CONCRETE);
  box(ctx, "l7-wall-w", -3, FY, 0, 0.4, 2.6, 6.4, CONCRETE);
  box(ctx, "l7-wall-n1", -2, FY, -3, 2.4, 2.6, 0.4, CONCRETE);
  box(ctx, "l7-wall-n2", 2, FY, -3, 2.4, 2.6, 0.4, CONCRETE);
  box(ctx, "l7-wall-n3", 0, FY + 2.1, -3, 1.6, 0.5, 0.4, CONCRETE);
  box(ctx, "l7-wall-s1", -1.9, FY, 3, 2.6, 2.6, 0.4, CONCRETE);
  box(ctx, "l7-wall-s2", 1.9, FY, 3, 2.6, 2.6, 0.4, CONCRETE);
  box(ctx, "l7-wall-s3", 0, FY + 2.2, 3, 1.2, 0.4, 0.4, CONCRETE);
  // an inch of seawater over the floor, a tide line on the walls
  ctx.spawn("l7-puddle", { feetPosition: { x: 0, y: FY + 0.03, z: 0 }, primitive: { kind: "box", width: 5.6, height: 0.02, depth: 5.6 }, material: { kind: "water", color: "oklch(0.35 0.03 220)", opacity: 0.7, waveIntensity: 0.15 } });
  for (const [id, x, z, w, d] of [["e", 2.79, 0, 0.02, 5.6], ["w", -2.79, 0, 0.02, 5.6], ["s", 0, 2.79, 5.6, 0.02]]) ctx.spawn(`l7-tide-${id}`, { feetPosition: { x, y: FY + 0.35, z }, primitive: { kind: "box", width: w, height: 0.12, depth: d }, material: { color: "oklch(0.3 0.02 150)", roughness: 1 } });
  // the stair back up: steps climbing into black, the trigger at their top
  for (let k = 0; k < 6; k++) box(ctx, `l7-step-${k}`, 0, FY + k * 0.32, 3.4 + k * 0.32, 1.2, 0.32, 0.34, { ...CONCRETE, color: "oklch(0.3 0.008 240)" });
  box(ctx, "l7-shaft-e", 0.8, FY, 4.4, 0.4, 3.6, 2.4, CONCRETE); box(ctx, "l7-shaft-w", -0.8, FY, 4.4, 0.4, 3.6, 2.4, CONCRETE);
  box(ctx, "l7-shaft-top", 0, FY + 2.6, 4.4, 1.2, 1, 2.4, CONCRETE); box(ctx, "l7-shaft-end", 0, FY, 5.7, 1.2, 3.6, 0.3, { color: "oklch(0.02 0 0)" });
  ctx.spawn("l7-back", { feetPosition: { x: 0, y: FY + 1.2, z: 5.1 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 1.1, height: 2, depth: 0.8 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level6#l6-from-l7" } });
  ctx.spawn("l7-back-note", { feetPosition: { x: -1.88, y: FY + 1.5, z: 2.79 }, rotation: { yaw: 180 }, vector: chalk("↑ 6 · lights out") });
  ctx.spawn("l7-from-l6", { feetPosition: { x: 0, y: FY + 0.1, z: 1.4 }, rotation: { yaw: 180 } });
  // what was left on the landing: a chair on its side, a crate, someone's tally
  box(ctx, "l7-crate", -2.1, FY, -1.8, 0.8, 0.6, 0.6, WOOD, { tags: ["container"], state: { name: "Waterlogged crate", items: "almond,ration,rope" } });
  ctx.spawn("l7-chair", { feetPosition: { x: 1.9, y: FY + 0.25, z: -1.2 }, rotation: { yaw: 30, roll: 90 }, primitive: { kind: "box", width: 0.5, height: 0.9, depth: 0.5 }, material: RUST });
  ctx.spawn("l7-tally", { feetPosition: { x: 2.79, y: FY + 1.4, z: 0.6 }, rotation: { yaw: -90 }, vector: chalk("day 9. the water doesn't end") });
  // the only bulb, still burning
  ctx.spawn("l7-bulb", { feetPosition: { x: 0, y: FY + 2.45, z: 0 }, primitive: { kind: "sphere", radius: 0.08 }, material: { color: "oklch(0.95 0.06 85)", emissive: "oklch(0.9 0.08 85)", emissiveIntensity: 3 }, light: { kind: "point", color: "oklch(0.88 0.08 80)", intensity: 2.2, distance: 9 } });

  // the pier: grey planks out over the water, a lantern at the end nobody lit
  const PZ0 = -9, PZ1 = -34, PY = 1.1;
  for (let z = PZ0, k = 0; z > PZ1; z -= 0.42, k++) if (k % 23 !== 11) box(ctx, `l7-plank-${k}`, (k % 3 - 1) * 0.03, PY, z, 2.2, 0.08, 0.36, WOOD, { rotation: { yaw: (k % 5 - 2) * 0.8 } });
  for (let z = PZ0, k = 0; z >= PZ1; z -= 4, k++) for (const sx of [-1, 1]) ctx.spawn(`l7-post-${k}-${sx}`, { feetPosition: { x: sx * 1.05, y: -6, z }, physics: "static", primitive: { kind: "cylinder", radiusTop: 0.14, radiusBottom: 0.16, height: PY + 6.7 }, material: { ...WOOD, color: "oklch(0.28 0.02 60)" } });
  // steps from the rock down to the pier
  for (let k = 0; k < 5; k++) box(ctx, `l7-rstep-${k}`, 0, FY - 0.6 - k * 0.6, -4.2 - k * 1, 1.6, 0.6, 1, { ...CONCRETE, color: "oklch(0.36 0.01 240)" });
  ctx.spawn("l7-lantern", { feetPosition: { x: 0.9, y: PY + 0.08, z: PZ1 + 0.6 }, primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.06, height: 1.7 }, material: RUST,
    children: [{ feetPosition: { x: 0, y: 1.7, z: 0 }, primitive: { kind: "box", width: 0.24, height: 0.32, depth: 0.24 }, material: { color: "oklch(0.7 0.1 70)", emissive: "oklch(0.75 0.14 65)", emissiveIntensity: 2.5 }, light: { kind: "point", color: "oklch(0.8 0.13 65)", intensity: 1.6, distance: 14 } }] });
  ctx.spawn("l7-ring", { feetPosition: { x: -1.08, y: PY + 0.6, z: -20 }, rotation: { yaw: 90 }, primitive: { kind: "torus", radius: 0.32, tube: 0.08 }, material: { color: "oklch(0.6 0.17 30)", roughness: 0.8 } });
  ctx.spawn("l7-pier-note", { feetPosition: { x: 0, y: PY + 0.1, z: PZ1 + 1.6 }, rotation: { pitch: -90 }, vector: chalk("it is under the boat. do not swim", "1.6m") });
  // a rowboat tied to the last post, half full of rain
  ctx.spawn("l7-boat", { feetPosition: { x: 2.4, y: -0.25, z: PZ1 + 2 }, rotation: { yaw: 8, roll: 4 }, primitive: { kind: "capsule", radius: 0.6, halfHeight: 1.2 }, scale: { x: 1, y: 0.45, z: 1 }, rotationOrder: "YXZ", material: { ...WOOD, color: "oklch(0.32 0.03 50)" } });

  // the sea's breath, everywhere at once
  ctx.spawn("l7-sea-bed", { feetPosition: { x: 0, y: 2, z: 0 }, audio: { clip: G("vast-open-ocean-waves-rolling-under-overcast-sky-loop"), loop: true, gain: 0.18, spatial: false } });
  ctx.spawn("l7-waves-rock", { feetPosition: { x: 0, y: 0.5, z: -8 }, audio: { clip: G("heavy-waves-slapping-wet-rocks-and-pier-posts-loop"), loop: true, gain: 0.45, spatial: true, maxDistance: 40 } });
}

export function tick(ctx) {
  const s = ctx.place.state;
  if (s.builtV !== V) { lay(ctx); s.builtV = V; }
  // something enormous turns over far out, now and then: a low groan for whoever stands here
  if (ctx.place.playerCount && ctx.now() > (s.groanAt ?? 0)) {
    if (s.groanAt) ctx.emit("playSound", { clip: G("deep-whale-like-groan-from-far-under-dark-water"), position: { x: 60, y: -10, z: -160 }, volume: 0.7, refDistance: 120, maxDistance: 600 });
    s.groanAt = ctx.now() + 70000 + ctx.random() * 70000;
  }
}
