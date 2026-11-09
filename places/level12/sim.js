// Level 12 "Matrix": lays the white room and the abyss once, then keeps the ritual's chair clock and the memory fog.
// The ritual (Harris's log, Level 11): sit a quarter hour, try the locked door, go out through a copycat door,
// wait exactly one clock hour, try the door again. scripts/level12-use.js owns the doors.
import R from "../../scripts/lib/data/level12.yml";
import { heard } from "../../scripts/lib/hear.js";
import { animate } from "builtin/tween";
export const cadence = "1s";
const V = 1;
const MODEL = {
  chair: "/cdn/value.b579afa379fe0730c5aaa825796dba3705faf3c6b1ab0a11aaa6e326405aabe9.glb",
  office: "/cdn/value.e02cceb0c66d902fced411a31f21de9e9584de3272263a09e20b85c9455411be.glb",
  table: "/cdn/value.cf4b7e08e8b8ebeae461128c58b33779289448325288361133e27aa7f17a212d.glb",
  lamp: "/cdn/value.56e857c3fa9f839e7d3406ce7a54b6caaa028f92cfc1e5b9935ed654404c7d26.glb",
  armchair: "/cdn/value.3e7196a1233581476ede9bfcb0b38934ec50b62b9174954d055d379c63fd73b6.glb",
  shelf: "/cdn/value.918584eed8336eda888580753019763471fcce0adcaf2bc66def78f53ae3fad0.glb",
  coffee: "/cdn/value.b59b6a4d3115b48b5e3e42462530bbb5364e66607ba416592c80166a6cdd6483.glb",
  side: "/cdn/value.2f0eae283b6ebd13603b9891c607686c47f142b2e36b43e6148b098ac56a24af.glb",
  tv: "/cdn/value.30ae8e4fd0c2e307d21943aa6fa38f3f816fcc7a10335f5a15ff865b00b84ce4.glb",
};
const PAINT = { texture: "cdn/texture-flat-white-painted-plaster-wall-faint-roller-marks.png", repeat: [1, 1], wrap: "repeat", color: "oklch(0.97 0.006 95)", roughness: 0.92 };
const FLOOR = { texture: "cdn/texture-worn-white-vinyl-floor-tiles-faint-scuffs.png", repeat: [0.5, 0.5], wrap: "repeat", color: "oklch(0.95 0.005 95)", roughness: 0.6 };
const VOID = { color: "oklch(0.95 0.004 95)", roughness: 1 };
const DOOR = { texture: "cdn/texture-white-painted-wood-door-panel-chipped-paint.png", color: "oklch(0.95 0.008 90)", roughness: 0.7 };
const BRASS = { color: "oklch(0.72 0.09 85)", metalness: 0.9, roughness: 0.35 };
export const ROOM_SPAWN = { x: 0, y: 0.05, z: 1.6 };

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function lay(ctx) {
  const bx = (id, x, y, z, w, h, d, mat, extra = {}) => ctx.spawn(id, { feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material: mat, physics: "static", ...extra });
  // the abyss floor and the room shell
  bx("l12-void", 0, -0.2, 0, 600, 0.2, 600, VOID, { receiveShadow: true, castShadow: false });
  bx("l12-floor", 0, 0, 0, 6, 0.02, 6, { ...FLOOR, repeat: [3, 3] }, { castShadow: false });
  const H = 3, T = 0.15;
  bx("l12-w-n1", -1.75, 0, -3, 2.5, H, T, PAINT); bx("l12-w-n2", 1.75, 0, -3, 2.5, H, T, PAINT); bx("l12-w-n3", 0, 2.1, -3, 1, 0.9, T, PAINT);
  bx("l12-w-s1", -2.6, 0, 3, 0.8, H, T, PAINT); bx("l12-w-s2", 0, 0, 3, 2.4, H, T, PAINT); bx("l12-w-s3", 2.6, 0, 3, 0.8, H, T, PAINT);
  bx("l12-w-s4", -1.7, 2.2, 3, 1, 0.8, T, PAINT); bx("l12-w-s5", 1.7, 2.2, 3, 1, 0.8, T, PAINT);
  bx("l12-w-e", 3, 0, 0, T, H, 6.15, PAINT); bx("l12-w-w", -3, 0, 0, T, H, 6.15, PAINT);
  bx("l12-ceil", 0, H, 0, 6.3, 0.1, 6.3, PAINT, { castShadow: false });
  bx("l12-skirt", 0, 0, -2.9, 6, 0.1, 0.03, { color: "oklch(0.88 0.006 95)" }, { physics: undefined });
  // one flat light panel, buzzing
  ctx.spawn("l12-light", { feetPosition: { x: 0, y: H - 0.04, z: 0 }, primitive: { kind: "box", width: 1.2, height: 0.04, depth: 0.6 }, material: { color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 2.2 }, castShadow: false,
    children: [{ feetPosition: { x: 0, y: -0.3, z: 0 }, light: { kind: "point", color: "oklch(0.98 0.01 95)", intensity: 2.2, distance: 12, shadow: { enabled: true } } }],
    audio: { clip: "cdn/moodboard-realistic-gritty/sfx-single-fluorescent-tube-electrical-buzz-loop.mp3", loop: true, gain: 0.18, spatial: true, maxDistance: 14 } });
  // the table that won't move, the hole under it, the chair
  ctx.spawn("l12-table", { feetPosition: { x: 0, y: 0, z: -0.4 }, model: { id: MODEL.table }, physics: "static", state: { name: "Table", info: "It won't budge." } });
  ctx.spawn("l12-hole", { feetPosition: { x: 0.1, y: 0.012, z: -0.35 }, rotation: { pitch: -90 }, primitive: { kind: "circle", radius: 0.32 }, material: { color: "#050505", roughness: 1 }, castShadow: false });
  ctx.spawn("l12-chair", { feetPosition: { x: 0, y: 0, z: 0.45 }, rotation: { yaw: 180 }, model: { id: MODEL.chair }, physics: "static" });
  ctx.place.state.chair = ctx.spawn("l12-chair-seat", { feetPosition: { x: 0, y: 0, z: 0.45 }, rotation: { yaw: 0 }, tags: ["seat"], state: { seat: { w: 1, d: 0.02, y: 0.44 }, verb: "Sit", name: "Chair" } });
  // the clock over the door: a full hour in R.hour seconds
  const clock = ctx.spawn("l12-clock", { feetPosition: { x: 0, y: 2.55, z: -2.91 }, rotation: { pitch: 90 }, pivot: "center", primitive: { kind: "cylinder", radiusTop: 0.22, radiusBottom: 0.22, height: 0.05, radialSegments: 40 }, material: { color: "oklch(0.97 0.004 95)", roughness: 0.4 }, castShadow: false,
    children: [{ feetPosition: { x: 0, y: -0.03, z: 0 }, primitive: { kind: "torus", radius: 0.22, tube: 0.018 }, rotation: { pitch: 90 }, material: { color: "#1a1a1a" } }],
    audio: { clip: "cdn/moodboard-realistic-gritty/sfx-wall-clock-slow-mechanical-tick-tock-loop.mp3", loop: true, gain: 0.25, spatial: true, maxDistance: 7 } });
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.spawn(`l12-tick-${i}`, { feetPosition: { x: Math.sin(a) * 0.18, y: 2.55 + Math.cos(a) * 0.18 - 0.012, z: -2.875 }, rotation: { roll: -i * 30 }, primitive: { kind: "box", width: 0.012, height: i % 3 ? 0.025 : 0.045, depth: 0.004 }, material: { color: "#111" }, castShadow: false }); }
  ctx.spawn("l12-hand-h", { feetPosition: { x: 0, y: 2.55, z: -2.868 }, pivot: [0.5, 0, 0.5], rotation: { roll: -120 }, primitive: { kind: "box", width: 0.014, height: 0.11, depth: 0.004 }, material: { color: "#111" }, castShadow: false });
  ctx.spawn("l12-hand-m", { feetPosition: { x: 0, y: 2.55, z: -2.864 }, pivot: [0.5, 0, 0.5], rotation: { roll: 0 }, primitive: { kind: "box", width: 0.01, height: 0.17, depth: 0.004 }, material: { color: "#111" }, castShadow: false, state: { clockHand: true } });
  // the locked door
  doorAt(ctx, "l12-door", 0, -3, 0, { kind: "door12", name: "Door", verb: "Try the Door" }, true);
  // copycat doors out in the white
  const COPIES = [[-34, -22, 35], [41, 9, -80], [-12, 58, 170], [27, -51, 20], [-63, 31, 110]];
  COPIES.forEach(([x, z, yaw], i) => doorAt(ctx, `l12-copy-${i}`, x, z, yaw, { kind: "copydoor", name: "Door", verb: "Open the Door" }, false));
  // the blandest furniture there is, old and beaten up, some of it halfway through the floor
  const r = rng(12), kinds = Object.keys(MODEL);
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2, d = 10 + r() * 85, k = kinds[Math.floor(r() * kinds.length)];
    const sink = r() < 0.45 ? -(0.2 + r() * 0.6) : 0, tilt = sink ? (r() - 0.5) * 30 : 0;
    ctx.spawn(`l12-junk-${i}`, { feetPosition: { x: Math.cos(a) * d, y: sink, z: Math.sin(a) * d }, rotation: { yaw: r() * 360, roll: tilt, pitch: sink ? (r() - 0.5) * 16 : 0 }, model: { id: MODEL[k] }, physics: sink ? undefined : "static", castShadow: true });
  }
  ctx.spawn("l12-hum", { feetPosition: { x: 0, y: 1, z: 0 }, audio: { clip: "cdn/moodboard-realistic-gritty/ambience-empty-white-void-faint-high-tinnitus-ring-and-air-hiss-loop.mp3", loop: true, gain: 0.14, spatial: false }, audience: "all" });
}

function doorAt(ctx, id, x, z, yaw, state, inWall) {
  const kids = [
    { id: "slab", feetPosition: { x: 0.47, y: 0, z: 0 }, pivot: [1, 0, 0.5], primitive: { kind: "box", width: 0.94, height: 2.06, depth: 0.045 }, material: DOOR,
      children: [{ id: "knob", feetPosition: { x: -0.4, y: 1.0, z: 0.05 }, primitive: { kind: "sphere", radius: 0.032 }, material: BRASS }, { feetPosition: { x: -0.4, y: 1.0, z: -0.05 }, primitive: { kind: "sphere", radius: 0.032 }, material: BRASS }, { feetPosition: { x: -0.4, y: 0.94, z: 0.03 }, primitive: { kind: "box", width: 0.05, height: 0.12, depth: 0.01 }, material: BRASS }] },
    { feetPosition: { x: -0.53, y: 0, z: 0 }, primitive: { kind: "box", width: 0.07, height: 2.14, depth: 0.2 }, material: PAINT },
    { feetPosition: { x: 0.53, y: 0, z: 0 }, primitive: { kind: "box", width: 0.07, height: 2.14, depth: 0.2 }, material: PAINT },
    { feetPosition: { x: 0, y: 2.08, z: 0 }, primitive: { kind: "box", width: 1.13, height: 0.08, depth: 0.2 }, material: PAINT },
  ];
  if (!inWall) kids.push({ feetPosition: { x: 0, y: 2.16, z: 0 }, primitive: { kind: "box", width: 1.6, height: 0.9, depth: 0.12 }, material: PAINT }, { feetPosition: { x: -0.9, y: 0, z: 0 }, primitive: { kind: "box", width: 0.7, height: 3.06, depth: 0.12 }, material: PAINT }, { feetPosition: { x: 0.9, y: 0, z: 0 }, primitive: { kind: "box", width: 0.7, height: 3.06, depth: 0.12 }, material: PAINT });
  return ctx.spawn(id, { feetPosition: { x, y: 0, z }, rotation: { yaw }, tags: ["usable"], primitive: { kind: "box", width: 1, height: 2.06, depth: 0.08 }, material: { color: "#fff", opacity: 0, transparent: true }, physics: "static", behavior: "scripts/level12-use.js", state, children: kids });
}

export function tick(ctx) {
  const st = ctx.place.state;
  if (st.v !== V) { st.v = V; lay(ctx); }
  // the clock's minute hand: one turn per clock hour, on the room's clock so every machine agrees
  if (!st.clockOn) { st.clockOn = true; const h = ctx.place.objects["l12-hand-m"]; if (h) animate(ctx, h, { "rotation.roll": [0, -360] }, { duration: R.hour, loop: true, easing: "linear" }); }
  for (const p of ctx.place.players) {
    const s = p.state; const r = s.r12 ?? {};
    const seated = s.sit?.id && s.sit.id === st.chair && s.sit.phase !== "up";
    if (seated && (r.sat ?? 0) < R.sit) {
      const sat = (r.sat ?? 0) + 1; s.r12 = { ...r, sat };
      if (sat >= R.sit) heard(ctx, { clip: "cdn/moodboard-realistic-gritty/sfx-door-deadbolt-lock-single-soft-click.mp3", position: { x: 0, y: 1, z: -3 }, volume: 0.7, maxDistance: 10 }); // the door clicks: that's the cue to try it
    } else if (!seated && r.sat && r.sat < R.sit) s.r12 = { ...r, sat: 0 }; // got up too early: the quarter hour starts over
    const f = p.feetPosition; const d = Math.hypot(f.x, f.z);
    if (d > R.farDrain && (s.sanity ?? 100) > 15) s.sanity -= 0.25; // the memory fog, worse the farther from the table
  }
}
