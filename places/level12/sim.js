import { restyleSigns } from "../../scripts/lib/sign-style.js";
import { dressThresholds } from "../../scripts/lib/thresholds.js";
// Level 12 "Matrix": lays the white room and the abyss once, then keeps the ritual's chair clock and the memory fog.
// The ritual (Harris's log, Level 11): sit a quarter hour, try the locked door, go out through a copycat door,
// wait exactly one clock hour, try the door again. scripts/level12-use.js owns the doors.
import R from "../../scripts/lib/data/level12.yml";
import { heard } from "../../scripts/lib/hear.js";
import { animate } from "builtin/tween";
export const cadence = "1s";
const V = 3; // 3: moulded door casings
const MODEL = {
  chair: "/cdn/value.b579afa379fe0730c5aaa825796dba3705faf3c6b1ab0a11aaa6e326405aabe9.glb",
  office: "/cdn/value.e02cceb0c66d902fced411a31f21de9e9584de3272263a09e20b85c9455411be.glb",
  table: "/cdn/value.cf4b7e08e8b8ebeae461128c58b33779289448325288361133e27aa7f17a212d.glb",
  lamp: "/cdn/value.56e857c3fa9f839e7d3406ce7a54b6caaa028f92cfc1e5b9935ed654404c7d26.glb",
  armchair: "/cdn/value.3e7196a1233581476ede9bfcb0b38934ec50b62b9174954d055d379c63fd73b6.glb",
  shelf: "/cdn/value.918584eed8336eda888580753019763471fcce0adcaf2bc66def78f53ae3fad0.glb",
  coffee: "/cdn/value.b59b6a4d3115b48b5e3e42462530bbb5364e66607ba416592c80166a6cdd6483.glb",
  side: "/cdn/value.2f0eae283b6ebd13603b9891c607686c47f142b2e36b43e6148b098ac56a24af.glb",
  door: "/cdn/value.dc925b7a5795ebda057624359435d268429171852f342ccfa479eac83b721333.glb",
  mug: "/cdn/value.bade31e208a4e7c80254ba63dd33cf9b682b2c8d8bbd2c049de016d4d293892f.glb",
  troffer: "/cdn/value.58b51cca7f40157addada9eb9837b9beb764f7aed2c56d77270ea9dbd66bcf1b.glb",
  vent: "/cdn/value.24512fccad86dea3ef7e54796f0c9b8ccb32dc7ec2ff8798ee8f9d084708ccd8.glb",
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
  ctx.spawn("l12-light", { feetPosition: { x: 0, y: H - 0.1, z: 0 }, model: { id: MODEL.troffer }, layout: { box: { min: { x: -0.62, y: 0, z: -0.32 }, max: { x: 0.62, y: 0.1, z: 0.32 } } }, castShadow: false,
    children: [{ feetPosition: { x: 0, y: -0.003, z: 0 }, rotation: { pitch: 90 }, primitive: { kind: "plane", width: 1.08, height: 0.5 }, material: { color: "#ffffff", emissive: "#fffdf2", emissiveIntensity: 2.2 }, castShadow: false }, { feetPosition: { x: 0, y: -0.3, z: 0 }, light: { kind: "point", color: "oklch(0.98 0.01 95)", intensity: 2.2, distance: 12, shadow: { enabled: true } } }],
    audio: { clip: "cdn/moodboard-realistic-gritty/sfx-single-fluorescent-tube-electrical-buzz-loop.mp3", loop: true, gain: 0.18, spatial: true, maxDistance: 14 } });
  // the table that won't move, the hole under it, the chair
  ctx.spawn("l12-table", { feetPosition: { x: 0, y: 0, z: -0.4 }, model: { id: MODEL.table }, physics: "static", state: { name: "Table", info: "It won't budge." } });
  ctx.spawn("l12-hole", { feetPosition: { x: 0.1, y: 0.012, z: -0.35 }, rotation: { pitch: -90 }, primitive: { kind: "circle", radius: 0.32 }, material: { color: "#050505", roughness: 1 }, castShadow: false });
  ctx.spawn("l12-chair", { feetPosition: { x: 0, y: 0, z: 0.45 }, rotation: { yaw: 180 }, model: { id: MODEL.chair }, physics: "static" });
  ctx.place.state.chair = ctx.spawn("l12-chair-seat", { feetPosition: { x: 0, y: 0, z: 0.45 }, rotation: { yaw: 0 }, tags: ["seat"], state: { seat: { w: 1, d: 0.02, y: 0.44 }, verb: "Sit", name: "Chair", c: { x: 0, y: 0.45, z: 0.45 } } });
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

// what earlier visitors left: wear, small fixtures, Harris's notes, and the ritual in pencil by the door
function layDetail(ctx) {
  const bx = (id, x, y, z, w, h, d, mat, extra = {}) => ctx.spawn(id, { feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material: mat, castShadow: false, ...extra });
  const TRIM = { color: "oklch(0.86 0.008 90)", roughness: 0.8 };
  bx("l12d-skirt-e", 2.91, 0, 0, 0.03, 0.1, 6, TRIM); bx("l12d-skirt-w", -2.91, 0, 0, 0.03, 0.1, 6, TRIM);
  bx("l12d-skirt-s1", -1.95, 0, 2.91, 1.6, 0.1, 0.03, TRIM); bx("l12d-skirt-s2", 1.95, 0, 2.91, 1.6, 0.1, 0.03, TRIM);
  // scuffs along the baseboard where chairs were shoved back
  [[-1.2, -2.89], [1.6, -2.89], [2.89, 1.1]].forEach(([x, z], i) => bx(`l12d-scuff-${i}`, x, 0.1, z, z > 0 ? 0.01 : 0.5, 0.05, z > 0 ? 0.4 : 0.01, { color: "oklch(0.55 0.02 80 / 0.5)", transparent: true }));
  // light switch and outlet by the door
  bx("l12d-switch", 0.85, 1.2, -2.915, 0.08, 0.12, 0.015, { color: "oklch(0.93 0.01 90)" }, { children: [{ feetPosition: { x: 0, y: 0.04, z: 0.01 }, primitive: { kind: "box", width: 0.018, height: 0.035, depth: 0.012 }, material: { color: "oklch(0.88 0.01 90)" } }] });
  bx("l12d-outlet", 2.915, 0.3, 1.4, 0.015, 0.11, 0.07, { color: "oklch(0.93 0.01 90)" }, { children: [-0.02, 0.02].map((y) => ({ feetPosition: { x: 0.009, y: 0.035 + y, z: 0 }, primitive: { kind: "box", width: 0.004, height: 0.012, depth: 0.02 }, material: { color: "#222" } })) });
  // ceiling vent, dust streaks under it, and an old water stain
  ctx.spawn("l12d-vent", { feetPosition: { x: 1.9, y: 2.99, z: 1.9 }, rotation: { pitch: -90 }, pivot: "center", model: { id: MODEL.vent }, layout: { box: { min: { x: -0.25, y: -0.2, z: -0.06 }, max: { x: 0.25, y: 0.2, z: 0.06 } } }, castShadow: false });
  ctx.spawn("l12d-stain", { feetPosition: { x: -1.6, y: 2.944, z: 0.8 }, rotation: { pitch: 90 }, primitive: { kind: "circle", radius: 0.55 }, material: { color: "oklch(0.78 0.05 80 / 0.35)", transparent: true, roughness: 1 }, castShadow: false });
  ctx.spawn("l12d-stain-ring", { feetPosition: { x: -1.6, y: 2.943, z: 0.8 }, rotation: { pitch: 90 }, primitive: { kind: "ring", innerRadius: 0.5, outerRadius: 0.56 }, material: { color: "oklch(0.62 0.06 70 / 0.45)", transparent: true }, castShadow: false });
  // Harris's notes and a coffee long gone cold on the table
  const PAPER = { color: "oklch(0.95 0.02 95)", roughness: 0.95 };
  ctx.spawn("l12d-notes", { feetPosition: { x: -0.25, y: 0.775, z: -0.35 }, rotation: { yaw: 12 }, primitive: { kind: "box", width: 0.21, height: 0.004, depth: 0.29 }, material: PAPER, castShadow: false,
    state: { name: "Notes", info: "Harris's handwriting. \"Chair, 15. Door. Out. 60 on the dot. Door. If the clock skips, you got up.\"" },
    children: [{ feetPosition: { x: 0.03, y: 0.004, z: 0.02 }, rotation: { yaw: -20 }, primitive: { kind: "box", width: 0.21, height: 0.003, depth: 0.29 }, material: PAPER }] });
  ctx.spawn("l12d-pencil", { feetPosition: { x: -0.08, y: 0.78, z: -0.3 }, rotation: { yaw: 70, roll: 90 }, pivot: "center", primitive: { kind: "cylinder", radiusTop: 0.004, radiusBottom: 0.004, height: 0.17 }, material: { color: "oklch(0.8 0.15 90)" }, castShadow: false });
  ctx.spawn("l12d-mug", { feetPosition: { x: 0.28, y: 0.775, z: -0.55 }, rotation: { yaw: 140 }, model: { id: MODEL.mug }, layout: { box: { min: { x: -0.06, y: 0, z: -0.045 }, max: { x: 0.06, y: 0.1, z: 0.045 } } }, castShadow: false });
  // pencil on the wall beside the door: tallies from everyone who tried, and the ritual itself
  ctx.spawn("l12d-scrawl", { feetPosition: { x: -1.25, y: 1.15, z: -2.92 }, vector: `<svg viewBox='0 0 120 90' width='0.9m'><g stroke='#4a4a48' stroke-width='1.2' fill='none' opacity='.75'>${Array.from({ length: 4 }, (_, g) => `<g transform='translate(${6 + g * 22} 6)'><path d='M0 0v16M4 0v16M8 0v16M12 0v16M-2 13l16 -10'/></g>`).join("")}<path d='M94 6v16M98 6v16'/></g><g font-family='serif' font-size='8' fill='#4a4a48' opacity='.8'><text x='4' y='40'>sit 15  (don't stand)</text><text x='4' y='51'>door. locked. good</text><text x='4' y='62'>out a copy</text><text x='4' y='73'>60 EXACT  watch the clock</text><text x='4' y='84'>door</text></g></svg>` });
}

function doorAt(ctx, id, x, z, yaw, state, inWall) {
  const kids = [
    { id: "slab", feetPosition: { x: 0.47, y: 0, z: 0 }, pivot: [1, 0, 0.5], primitive: { kind: "box", width: 0.94, height: 2.06, depth: 0.045 }, material: { color: "#fff", opacity: 0, transparent: true }, castShadow: false,
      children: [{ feetPosition: { x: 0, y: 0, z: 0 }, model: { id: MODEL.door }, layout: { box: { min: { x: -0.47, y: 0, z: -0.03 }, max: { x: 0.47, y: 2.06, z: 0.03 } } } }, { id: "knob", feetPosition: { x: -0.4, y: 1.0, z: 0.05 }, primitive: { kind: "sphere", radius: 0.001 }, material: BRASS }] },
    // the frame: one jamb-and-head piece with eased edges, then a stepped casing proud of the wall on both faces
    { feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "extrude", shape: [[-0.565, 0], [-0.495, 0], [-0.495, 2.08], [0.495, 2.08], [0.495, 0], [0.565, 0], [0.565, 2.16], [-0.565, 2.16]], depth: 0.18, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 3 }, material: PAINT },
    { feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "extrude", shape: [[-0.62, 0], [-0.505, 0], [-0.505, 2.09], [0.505, 2.09], [0.505, 0], [0.62, 0], [0.62, 2.2], [-0.62, 2.2]], depth: inWall ? 0.25 : 0.2, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 4 }, material: PAINT, castShadow: false },
  ];
  if (!inWall) kids.push({ feetPosition: { x: 0, y: 2.16, z: 0 }, primitive: { kind: "box", width: 1.6, height: 0.9, depth: 0.12 }, material: PAINT }, { feetPosition: { x: -0.9, y: 0, z: 0 }, primitive: { kind: "box", width: 0.7, height: 3.06, depth: 0.12 }, material: PAINT }, { feetPosition: { x: 0.9, y: 0, z: 0 }, primitive: { kind: "box", width: 0.7, height: 3.06, depth: 0.12 }, material: PAINT });
  return ctx.spawn(id, { feetPosition: { x, y: 0, z }, rotation: { yaw }, tags: ["usable"], primitive: { kind: "box", width: 1, height: 2.06, depth: 0.08 }, material: { color: "#fff", opacity: 0, transparent: true }, physics: "static", behavior: "scripts/level12-use.js", state: { ...state, c: { x, y: 1.05, z } }, children: kids }); // c: where the look ray finds it (interact.js), the knob's height
}

export function tick(ctx) {
  restyleSigns(ctx, "level12"); // every sign dressed as its own board (scripts/lib/sign-style.js)
  dressThresholds(ctx); // the ways in and out, dressed with what people left there (scripts/lib/thresholds.js)
  const st = ctx.place.state;
  if (st.v !== V) { st.v = V; lay(ctx); }
  if (st.d !== 2) { st.d = 2; layDetail(ctx); }
  // the clock's minute hand: one turn per clock hour, on the room's clock so every machine agrees
  if (!ctx.session.clock12) { const h = ctx.place.objects["l12-hand-m"]; if (h) { ctx.session.clock12 = true; animate(ctx, h, { "rotation.roll": [0, -360] }, { duration: R.hour, loop: true, easing: "linear" }); } }
  for (const p of ctx.place.players) {
    const s = p.state; const r = s.r12 ?? {};
    const seated = s.sit?.id && s.sit.id === st.chair && s.sit.phase !== "up";
    if (seated && (r.sat ?? 0) < R.sit) {
      const sat = (r.sat ?? 0) + 1; s.r12 = { ...r, sat };
      if (sat >= R.sit) heard(ctx, { clip: "cdn/moodboard-realistic-gritty/sfx-door-deadbolt-lock-single-soft-click.mp3", position: { x: 0, y: 1, z: -3 }, volume: 0.7, maxDistance: 10 }); // the door clicks: that's the cue to try it
    } else if (!seated && r.sat && r.sat < R.sit) s.r12 = { ...r, sat: 0 }; // got up too early: the quarter hour starts over
    if (r.back) { // the hour's window: a soft chime when it opens, the door's knob glows while it's open
      const t = (ctx.now() - r.back) / 1000, open = Math.abs(t - R.hour) <= R.tol, k = "w12" + p.id;
      if (open && !ctx.session[k]) { ctx.session[k] = true; ctx.emit("playSound", { clip: "cdn/moodboard-realistic-gritty/sfx-single-soft-clear-bell-chime-in-empty-room.mp3", volume: 0.6 }, { audience: { player: p.id } }); ctx.emit("highlightSet", { target: "l12-door", color: "#ffd9a0", style: "glow", duration: R.tol * 2, intensity: 0.8 }, { audience: { player: p.id } }); }
      if (!open && ctx.session[k]) ctx.session[k] = false;
    }
    const f = p.feetPosition; const d = Math.hypot(f.x, f.z);
    if (d > R.farDrain && (s.sanity ?? 100) > 15) s.sanity -= 0.25; // the memory fog, worse the farther from the table
  }
}
