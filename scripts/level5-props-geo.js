// Level 5 "Terror Hotel" procedural props geometry.
// Renders vintage 1930s art-deco furnishings, chandeliers, baby grand piano,
// luggage carts, front reception desk, panelled guest doors, bookshelves, and boilers.
import { box as gbox, paint as gpaint } from "./lib/gamma-kit.js";

const HARDWOOD = "cdn/texture-worn-hardwood-grain.png";
const STEEL = "cdn/texture-scratched-worn-steel.png";
const BRICK = "cdn/texture-dark-brown-brick-wall-grimy-mortar.png";
const RUSTY = "cdn/texture-corrugated-rusty-metal-sheet.png";

let C, M = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
const STACK = [];
const P = (x, y, z) => [
  M[0] * x + M[1] * y + M[2] * z + M[3],
  M[4] * x + M[5] * y + M[6] * z + M[7],
  M[8] * x + M[9] * y + M[10] * z + M[11],
];
const mul = (b) => {
  const a = M, r = new Array(12);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) r[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j];
    r[i * 4 + 3] = a[i * 4] * b[3] + a[i * 4 + 1] * b[7] + a[i * 4 + 2] * b[11] + a[i * 4 + 3];
  }
  M = r;
};
const push = () => STACK.push(M);
const pop = () => { M = STACK.pop(); };
const at = (x, y, z) => mul([1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z]);
const yaw = (d) => {
  const a = (d * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  mul([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0]);
};
const pitch = (d) => {
  const a = (d * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  mul([1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0]);
};
const roll = (d) => {
  const a = (d * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  mul([c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0]);
};

const q = (a, b, c, d) => C.quad(...P(...a), ...P(...b), ...P(...c), ...P(...d));
const t3 = (a, b, c) => C.tri(...P(...a), ...P(...b), ...P(...c));

function box(x0, y0, z0, x1, y1, z1, skip = "") {
  if (!skip.includes("t")) q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
  if (!skip.includes("b")) q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
  if (!skip.includes("f")) q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  if (!skip.includes("k")) q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  if (!skip.includes("l")) q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  if (!skip.includes("r")) q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
}

function lathe(prof, n = 12) {
  for (let i = 0; i < prof.length - 1; i++) {
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      const [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
      q([Math.cos(a0) * r0, y0, Math.sin(a0) * r0], [Math.cos(a1) * r0, y0, Math.sin(a1) * r0], [Math.cos(a1) * r1, y1, Math.sin(a1) * r1], [Math.cos(a0) * r1, y1, Math.sin(a0) * r1]);
    }
  }
}
const cyl = (r, h, n = 10) => lathe([[r, 0], [r, h]], n);

// ---- PROP DEFINITIONS ----------------------------------------------------------------

// 1. Grand Chandelier (Tiered gilded brass & crystal drops)
function chandelier(scale = 1.0) {
  C.albedo(null);
  // Ceiling mounting canopy & suspension chain
  C.color("oklch(0.75 0.12 75)"); C.metalness(0.85); C.roughness(0.3);
  push(); at(0, 0, 0); cyl(0.18 * scale, -0.08 * scale, 12); pop();
  push(); at(0, -0.08 * scale, 0); cyl(0.025 * scale, -0.7 * scale, 6); pop();

  // Tiered brass rings
  const tiers = [
    { y: -0.8 * scale, r: 0.9 * scale, drops: 20 },
    { y: -1.2 * scale, r: 0.65 * scale, drops: 16 },
    { y: -1.55 * scale, r: 0.4 * scale, drops: 12 },
  ];

  for (const t of tiers) {
    push(); at(0, t.y, 0);
    C.color("oklch(0.78 0.14 78)"); C.metalness(0.9); C.roughness(0.25);
    cyl(t.r, -0.05 * scale, 16);
    // Radial spoke arms to center
    for (let i = 0; i < 4; i++) {
      push(); yaw(i * 90);
      box(-0.02 * scale, -0.04 * scale, 0, 0.02 * scale, 0, t.r);
      pop();
    }
    // Faceted sparkling crystal prisms hanging down
    C.color("oklch(0.97 0.01 90)"); C.metalness(0.15); C.roughness(0.1); C.emissive("oklch(0.85 0.08 80)");
    for (let k = 0; k < t.drops; k++) {
      const ang = (k / t.drops) * 360;
      push(); yaw(ang); at(0, -0.05 * scale, t.r);
      box(-0.022 * scale, -0.22 * scale, -0.012 * scale, 0.022 * scale, 0, 0.012 * scale);
      // Crystal diamond tip
      t3([-0.022 * scale, -0.22 * scale, 0], [0.022 * scale, -0.22 * scale, 0], [0, -0.28 * scale, 0]);
      pop();
    }
    // Candle light bulb holders
    C.color("oklch(0.92 0.02 85)"); C.metalness(0); C.roughness(0.4); C.emissive(null);
    for (let k = 0; k < t.drops / 2; k++) {
      const ang = (k / (t.drops / 2)) * 360 + 15;
      push(); yaw(ang); at(0, 0, t.r - 0.06 * scale);
      cyl(0.022 * scale, 0.09 * scale, 6);
      // Bulb
      C.emissive("oklch(0.95 0.12 85)"); C.color("oklch(0.98 0.08 90)");
      push(); at(0, 0.09 * scale, 0); cyl(0.018 * scale, 0.04 * scale, 6); pop();
      C.emissive(null);
      pop();
    }
    pop();
  }
  C.metalness(null); C.roughness(null); C.emissive(null);
}

// 2. Baby Grand Piano (Beverly Room bandstand)
function piano() {
  C.albedo(null);
  // High-gloss black lacquer body
  C.color("oklch(0.14 0.01 250)"); C.roughness(0.15); C.metalness(0.1);
  // Main body rim & soundboard
  box(-0.7, 0.68, -0.9, 0.7, 1.02, 0.35);
  box(-0.65, 0.68, -1.6, 0.3, 1.02, -0.9);
  // Tapered curve towards tail
  box(-0.5, 0.68, -2.1, 0.1, 1.02, -1.6);

  // Propped open piano lid angled upward
  push(); at(-0.7, 1.02, 0.35); yaw(8); roll(-26);
  box(0, 0, -2.4, 1.35, 0.03, 0);
  pop();
  // Wooden prop stick
  C.color("oklch(0.25 0.02 40)");
  push(); at(0.45, 1.02, -0.5); pitch(24);
  cyl(0.014, 0.52, 6);
  pop();

  // 3 Fluted tapered legs with brass casters
  const legPos = [[-0.55, 0.3, 0.15], [0.55, 0.3, 0.15], [-0.15, 0.3, -1.8]];
  for (const lp of legPos) {
    push(); at(lp[0], 0.05, lp[2]);
    C.color("oklch(0.16 0.01 250)"); C.roughness(0.2);
    lathe([[0.04, 0.63], [0.03, 0.3], [0.022, 0]]);
    // Brass caster wheel
    C.color("oklch(0.75 0.12 75)"); C.metalness(0.85); C.roughness(0.3);
    at(0, -0.05, 0); cyl(0.025, 0.05, 8);
    pop();
  }

  // Lyre & pedals under piano
  push(); at(0, 0, 0);
  box(-0.06, 0.15, -0.3, 0.06, 0.68, -0.26);
  C.color("oklch(0.75 0.12 75)"); C.metalness(0.85);
  for (const px of [-0.04, 0, 0.04]) {
    box(px - 0.012, 0.05, -0.38, px + 0.012, 0.08, -0.22);
  }
  pop();

  // Keyboard bed (88 white & black keys)
  push(); at(0, 0.72, 0.36);
  C.color("oklch(0.96 0.01 90)"); C.roughness(0.2); C.metalness(0);
  box(-0.62, 0, 0, 0.62, 0.03, 0.18); // ivory key bed
  // Black sharp keys
  C.color("oklch(0.12 0.01 250)");
  for (let k = -0.58; k <= 0.58; k += 0.032) {
    if (Math.abs(k % 0.1) > 0.02) box(k - 0.008, 0.03, 0, k + 0.008, 0.05, 0.11);
  }
  // Sheet music desk
  C.color("oklch(0.18 0.01 250)");
  push(); at(0, 0.12, -0.08); pitch(-22);
  box(-0.4, 0, 0, 0.4, 0.22, 0.018);
  // Sheet music paper
  C.color("oklch(0.92 0.04 85)");
  box(-0.18, 0.02, 0.02, 0.18, 0.2, 0.022);
  pop();
  pop();
  C.metalness(null); C.roughness(null);
}

// 3. Vintage Brass Luggage Cart (Lobby & Guest corridors)
function luggageCart() {
  C.albedo(null);
  // Base deck with dark rubber edge and red carpet runner
  C.color("oklch(0.22 0.01 30)"); C.roughness(0.9);
  box(-0.55, 0.14, -0.85, 0.55, 0.22, 0.85);
  C.color("oklch(0.42 0.14 25)"); C.roughness(0.7); // red carpet top
  box(-0.52, 0.22, -0.82, 0.52, 0.23, 0.82);

  // 4 Industrial caster wheels
  C.color("oklch(0.3 0.02 50)"); C.metalness(0.6); C.roughness(0.4);
  for (const [wx, wz] of [[-0.42, -0.65], [0.42, -0.65], [-0.42, 0.65], [0.42, 0.65]]) {
    push(); at(wx, 0.08, wz); pitch(90); cyl(0.08, 0.04, 8); pop();
  }

  // Polished tubular brass birdcage frame
  C.color("oklch(0.8 0.14 78)"); C.metalness(0.9); C.roughness(0.25);
  // 4 Corner vertical posts
  for (const [px, pz] of [[-0.48, -0.78], [0.48, -0.78], [-0.48, 0.78], [0.48, 0.78]]) {
    push(); at(px, 0.22, pz); cyl(0.022, 1.45, 8); pop();
  }
  // Top arch frame & center garment hanging bar
  box(-0.48, 1.67, -0.78, 0.48, 1.71, -0.74);
  box(-0.48, 1.67, 0.74, 0.48, 1.71, 0.78);
  box(-0.02, 1.67, -0.78, 0.02, 1.71, 0.78); // center top rail

  // Stack of 3 vintage leather suitcases on the deck
  C.metalness(0); C.roughness(0.65);
  // Trunk 1 (large bottom trunk)
  C.color("oklch(0.38 0.08 45)");
  box(-0.35, 0.24, -0.6, 0.35, 0.54, 0.15);
  // Trunk 2 (medium angled)
  push(); at(0, 0.54, -0.2); yaw(12);
  C.color("oklch(0.48 0.09 55)");
  box(-0.28, 0, -0.35, 0.28, 0.25, 0.35);
  // Leather travel strap
  C.color("oklch(0.22 0.03 40)");
  box(-0.29, 0.01, -0.18, 0.29, 0.26, -0.14);
  box(-0.29, 0.01, 0.14, 0.29, 0.26, 0.18);
  pop();
  // Trunk 3 (small top case)
  push(); at(0.05, 0.79, -0.18); yaw(-8);
  C.color("oklch(0.35 0.06 35)");
  box(-0.2, 0, -0.22, 0.2, 0.18, 0.22);
  pop();

  C.metalness(null); C.roughness(null);
}

// 4. Front Reception Desk (Lobby)
function frontDesk() {
  C.albedo(HARDWOOD);
  // Rich dark mahogany counter
  C.color("oklch(0.42 0.06 45)"); C.roughness(0.45);
  box(-2.8, 0, -0.6, 2.8, 1.05, 0.6);
  // Raised transaction ledge
  box(-2.9, 1.05, -0.65, 2.9, 1.12, 0.65);
  // Decorative raised wainscot panels along front face
  C.color("oklch(0.36 0.05 40)");
  for (let px = -2.4; px <= 2.4; px += 0.95) {
    box(px - 0.35, 0.2, -0.68, px + 0.35, 0.88, -0.6);
  }

  // Brass Service Bell on Counter ("Ring for Service")
  C.albedo(null);
  C.color("oklch(0.78 0.14 78)"); C.metalness(0.9); C.roughness(0.2);
  push(); at(-0.6, 1.12, -0.2);
  cyl(0.07, 0.02, 12); // brass base
  at(0, 0.02, 0); lathe([[0.06, 0], [0.055, 0.03], [0.02, 0.06], [0.01, 0.07]]); // dome
  at(0, 0.07, 0); cyl(0.008, 0.02, 6); // top button
  pop();

  // Open Leather Hotel Guestbook
  C.color("oklch(0.35 0.06 35)"); C.metalness(0); C.roughness(0.8);
  push(); at(0.4, 1.12, -0.15); yaw(6);
  box(-0.28, 0, -0.2, 0.28, 0.025, 0.2); // leather binding
  C.color("oklch(0.94 0.03 85)"); // cream parchment pages
  box(-0.26, 0.025, -0.18, 0.26, 0.038, 0.18);
  // Ink pen on rest
  C.color("oklch(0.2 0.01 250)");
  box(0.32, 0, -0.1, 0.34, 0.015, 0.15);
  pop();

  C.metalness(null); C.roughness(null);
}

// 5. Library Bookshelf (Lost Hall Society Library)
function bookshelf() {
  C.albedo(HARDWOOD);
  C.color("oklch(0.38 0.05 45)"); C.roughness(0.5);
  const W = 1.6, H = 3.1, D = 0.42;
  // Side gables & top cornice
  box(-W / 2, 0, -D / 2, -W / 2 + 0.05, H, D / 2);
  box(W / 2 - 0.05, 0, -D / 2, W / 2, H, D / 2);
  box(-W / 2, H - 0.06, -D / 2, W / 2, H, D / 2);
  box(-W / 2 - 0.04, H, -D / 2 - 0.04, W / 2 + 0.04, H + 0.08, D / 2 + 0.04); // crown moulding
  box(-W / 2, 0, D / 2 - 0.02, W / 2, H, D / 2); // back panel

  // 5 Shelves filled with book spines
  const colors = ["oklch(0.42 0.12 30)", "oklch(0.4 0.1 150)", "oklch(0.35 0.08 240)", "oklch(0.5 0.12 60)", "oklch(0.3 0.02 40)"];
  C.albedo(null);
  for (let i = 1; i <= 5; i++) {
    const sy = i * 0.52;
    // Shelf board
    C.albedo(HARDWOOD); C.color("oklch(0.4 0.05 45)");
    box(-W / 2 + 0.05, sy - 0.03, -D / 2, W / 2 - 0.05, sy, D / 2);
    C.albedo(null);
    // Row of books
    for (let bx = -W / 2 + 0.08; bx < W / 2 - 0.12; bx += 0.055) {
      const col = colors[Math.abs(Math.round(bx * 73 + i * 17)) % colors.length];
      const bh = 0.32 + Math.sin(bx * 13) * 0.06;
      const bd = 0.28 + Math.cos(bx * 19) * 0.03;
      C.color(col); C.roughness(0.7);
      box(bx, sy, D / 2 - bd, bx + 0.045, sy + bh, D / 2 - 0.02);
    }
  }
}

// 6. Heavy Industrial Boiler (Boiler Room)
function boiler() {
  C.albedo(STEEL);
  // Large horizontal cylindrical boiler drum
  C.color("oklch(0.35 0.02 50)"); C.metalness(0.75); C.roughness(0.45);
  push(); at(0, 1.4, 0); pitch(90);
  cyl(0.95, 3.2, 16); // main drum
  pop();

  // Heavy steel cradle base
  C.color("oklch(0.25 0.01 40)"); C.metalness(0.8);
  box(-1.1, 0, -1.2, 1.1, 0.45, -0.8);
  box(-1.1, 0, 0.8, 1.1, 0.45, 1.2);

  // Riveted reinforcement hoops
  C.color("oklch(0.45 0.03 55)");
  for (const bz of [-1.2, 0, 1.2]) {
    push(); at(0, 1.4, bz); pitch(90);
    lathe([[1.01, 0], [1.01, 0.08]], 16);
    pop();
  }

  // Cast iron burner hatch on front (+z) with orange firebox glow
  C.albedo(null);
  C.color("oklch(0.2 0.01 30)"); C.metalness(0.9); C.roughness(0.6);
  push(); at(0, 0.9, 1.62);
  box(-0.35, -0.35, 0, 0.35, 0.35, 0.08); // hatch door
  // Fire inspection slits with flickering orange glow
  C.color("oklch(0.75 0.18 45)"); C.emissive("oklch(0.75 0.2 45)");
  for (const dy of [-0.1, 0, 0.1]) {
    box(-0.2, dy - 0.02, 0.08, 0.2, dy + 0.02, 0.085);
  }
  C.emissive(null);
  pop();

  // Pressure gauge dial on top
  C.color("oklch(0.75 0.14 78)"); C.metalness(0.85); C.roughness(0.3);
  push(); at(0.6, 2.45, 0.4);
  cyl(0.03, 0.18, 6); // riser pipe
  at(0, 0.18, 0); pitch(90);
  cyl(0.12, 0.04, 12); // brass gauge rim
  C.color("oklch(0.95 0.02 90)"); C.metalness(0); // white gauge face
  cyl(0.1, 0.042, 12);
  C.color("oklch(0.6 0.2 25)"); // red danger needle
  box(-0.006, 0, 0.043, 0.006, 0.08, 0.046);
  pop();

  // Steam pipe manifold overhead
  C.albedo(STEEL);
  C.color("oklch(0.4 0.03 60)"); C.metalness(0.8);
  push(); at(0, 2.4, -0.6);
  cyl(0.12, 0.8, 8); // vertical exhaust stack
  at(0, 0.8, 0); yaw(90); pitch(90);
  cyl(0.12, 1.6, 8); // horizontal pipe
  pop();
  C.metalness(null); C.roughness(null);
}

// 7. Velvet Wingback Armchair (Salon & Beverly Room)
function armchair() {
  C.albedo(null);
  // Deep burgundy velvet upholstery
  C.color("oklch(0.38 0.12 25)"); C.roughness(0.85);
  // Thick seat cushion
  box(-0.45, 0.38, -0.42, 0.45, 0.52, 0.42);
  // High tufted wingback
  box(-0.45, 0.52, 0.32, 0.45, 1.25, 0.44);
  // Rolled armrests
  box(-0.52, 0.48, -0.4, -0.38, 0.76, 0.38);
  box(0.38, 0.48, -0.4, 0.52, 0.76, 0.38);

  // Carved dark wooden cabriole legs
  C.albedo(HARDWOOD);
  C.color("oklch(0.28 0.04 40)"); C.roughness(0.4);
  for (const [lx, lz] of [[-0.38, -0.35], [0.38, -0.35], [-0.38, 0.35], [0.38, 0.35]]) {
    push(); at(lx, 0, lz);
    lathe([[0.035, 0.38], [0.022, 0.1], [0.028, 0]], 6);
    pop();
  }
}

// 8. 1930s Luxury Hotel Guest Room Door (Mahogany panels & brass fixtures)
function hotelDoor(num = "") {
  C.albedo(HARDWOOD);
  C.color("oklch(0.36 0.06 42)"); C.roughness(0.4);
  const W = 1.05, H = 2.36, t = 0.04;
  // Main door leaf (hinge at x=0, extends along +X to x=W)
  box(0, 0, -t, W, H, t);

  // Recessed art-deco panels (6 classic panels)
  C.color("oklch(0.3 0.05 38)"); C.roughness(0.5);
  for (const px of [0.12, 0.58]) {
    for (const py of [0.18, 0.95, 1.65]) {
      const pw = 0.35, ph = py === 1.65 ? 0.55 : 0.58;
      box(px, py, t - 0.008, px + pw, py + ph, t + 0.008);
      box(px, py, -t - 0.008, px + pw, py + ph, -t + 0.008);
    }
  }

  // Polished brass kick plate along bottom
  C.albedo(null);
  C.color("oklch(0.78 0.14 78)"); C.metalness(0.9); C.roughness(0.25);
  box(0.04, 0.03, -t - 0.004, W - 0.04, 0.28, t + 0.004);

  // Brass lever handles & escutcheon backplates on both sides
  for (const s of [-1, 1]) {
    box(W - 0.16, 0.96, s * (t + 0.002), W - 0.08, 1.18, s * (t + 0.012));
    box(W - 0.26, 1.05, s * (t + 0.012), W - 0.12, 1.09, s * (t + 0.035));
    C.color("oklch(0.2 0.01 250)"); C.metalness(0);
    box(W - 0.13, 0.99, s * (t + 0.008), W - 0.11, 1.03, s * (t + 0.014));
    C.color("oklch(0.78 0.14 78)"); C.metalness(0.9);
  }

  // Brass room number placard backplate on front face
  if (num) {
    box(W / 2 - 0.15, 1.55, t + 0.002, W / 2 + 0.15, 1.68, t + 0.012);
  }

  // Heavy brass hinges at x=0
  for (const hy of [0.35, 1.18, 2.05]) {
    push(); at(0, hy, 0); cyl(0.02, 0.12, 8); pop();
  }

  C.metalness(null); C.roughness(null);
}

// ---- MAIN ENTRY ----------------------------------------------------------------------
export function geometry(ctx) {
  C = ctx;
  M = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  STACK.length = 0;

  const kind = ctx.param?.("kind") || "chandelier";
  const scale = ctx.param?.("scale") || 1.0;
  const num = ctx.param?.("num") || "";

  if (kind === "chandelier") chandelier(scale);
  else if (kind === "piano") piano();
  else if (kind === "luggage_cart") luggageCart();
  else if (kind === "front_desk") frontDesk();
  else if (kind === "bookshelf") bookshelf();
  else if (kind === "boiler") boiler();
  else if (kind === "armchair") armchair();
  else if (kind === "hotel_door") hotelDoor(num);
}

export function collider(ctx) {
  geometry(ctx);
}
