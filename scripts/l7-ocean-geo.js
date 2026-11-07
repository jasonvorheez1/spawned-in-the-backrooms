// Level 7 "Thalassophobia" ocean and pier procedural geometries:
// Delivers rich visual detailing for the flooded wharf, weathered timber pier, maritime buoys,
// derelict rowboat, mooring bollards, nautical lanterns, and ocean wave swells.
import { tube, sphere, slab } from "./lib/shapes.js";

const WOOD_TEX = "cdn/texture-weathered-wood-planks.png";
const HARDWOOD_TEX = "cdn/texture-worn-hardwood-grain.png";
const METAL_TEX = "cdn/texture-scratched-worn-steel.png";
const RUST_TEX = "cdn/texture-rusty-corroded-steel-pipe.png";

export function geometry(ctx) {
  const k = ctx.params?.kind ?? "pier", hi = ctx.lod <= 2, M = hi ? 14 : 8;

  if (k === "pier") {
    // Modular weathered timber pier section (length ~6m, width ~3.4m)
    ctx.roughness(0.85);
    ctx.color("oklch(0.42 0.05 60)");
    ctx.albedo(WOOD_TEX);

    // Deck planks with slight height and color variations
    const planks = 12;
    for (let i = 0; i < planks; i++) {
      const z = -2.7 + i * 0.48;
      const shade = 0.38 + ((i * 7) % 5) * 0.025;
      ctx.color(`oklch(${shade} 0.05 60)`);
      slab(ctx, [0, 0.04, z], [1.7, 0.035, 0.22]);
    }

    // Heavy longitudinal support timbers underneath
    ctx.color("oklch(0.3 0.04 50)");
    slab(ctx, [-1.4, -0.15, 0], [0.12, 0.14, 3]);
    slab(ctx, [1.4, -0.15, 0], [0.12, 0.14, 3]);
    slab(ctx, [0, -0.15, 0], [0.12, 0.14, 3]);

    // Cross-ties
    slab(ctx, [0, -0.28, -2], [1.5, 0.1, 0.14]);
    slab(ctx, [0, -0.28, 2], [1.5, 0.1, 0.14]);

    // Heavy round wooden pilings plunging into the abyss (y from 0 down to -8)
    ctx.color("oklch(0.24 0.03 55)");
    for (const sx of [-1.45, 1.45]) {
      for (const sz of [-2, 2]) {
        // Upper post extending through deck for railings
        tube(ctx, [[sx, 0.95, sz], [sx, -7.5, sz]], [0.16, 0.18], M);
        // Barnacle / green seaweed waterline encrustation ring
        ctx.color("oklch(0.25 0.08 135)");
        tube(ctx, [[sx, 0.2, sz], [sx, -0.4, sz]], [0.19, 0.21], M);
        ctx.color("oklch(0.24 0.03 55)");
      }
    }

    // Guardrail beams
    ctx.color("oklch(0.45 0.06 65)");
    slab(ctx, [-1.45, 0.88, 0], [0.06, 0.04, 3]);
    slab(ctx, [1.45, 0.88, 0], [0.06, 0.04, 3]);
    slab(ctx, [-1.45, 0.45, 0], [0.04, 0.03, 3]);
    slab(ctx, [1.45, 0.45, 0], [0.04, 0.03, 3]);
    return;
  }

  if (k === "buoy") {
    // Navigational ocean channel warning buoy
    ctx.smooth();
    ctx.albedo(METAL_TEX);
    // Lower counterweight float (submerged)
    ctx.color("oklch(0.22 0.02 240)");
    tube(ctx, [[0, -1.8, 0], [0, -0.3, 0]], [0.35, 0.65], M);

    // Main buoyant collar (maritime safety orange/red)
    ctx.color("oklch(0.55 0.22 28)");
    tube(ctx, [[0, -0.3, 0], [0, 0.4, 0], [0, 0.9, 0]], [0.75, 0.8, 0.45], M);

    // Central white band
    ctx.color("oklch(0.92 0.02 90)");
    tube(ctx, [[0, 0.2, 0], [0, 0.6, 0]], [0.78, 0.65], M);

    // Superstructure steel lattice cage
    ctx.roughness(0.5);
    ctx.color("oklch(0.3 0.02 240)");
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const x = Math.cos(a) * 0.4, z = Math.sin(a) * 0.4;
      tube(ctx, [[x, 0.9, z], [x * 0.4, 2.1, z * 0.4]], [0.03, 0.025], 6);
    }
    // Cage rings
    tube(ctx, [[0, 1.4, 0], [0, 1.45, 0]], [0.32, 0.32], M);
    tube(ctx, [[0, 2.05, 0], [0, 2.1, 0]], [0.18, 0.18], M);

    // Top beacon housing & Fresnel lens
    ctx.color("oklch(0.25 0.01 240)");
    tube(ctx, [[0, 2.1, 0], [0, 2.22, 0]], [0.16, 0.16], M);
    ctx.color("oklch(0.9 0.18 80)"); // Amber beacon lens
    sphere(ctx, [0, 2.3, 0], 0.12, M);
    return;
  }

  if (k === "rowboat") {
    // Dilapidated wooden dory / rowboat (length ~3.8m, width ~1.5m)
    ctx.smooth();
    ctx.albedo(HARDWOOD_TEX);
    ctx.roughness(0.8);
    ctx.color("oklch(0.35 0.04 65)");

    // Keel and bottom
    tube(ctx, [[0, -0.15, -1.8], [0, -0.22, 0], [0, -0.12, 1.6]], [0.08, 0.55, 0.38], M, [1.4, 0.4]);

    // Gunwales & hull sides
    for (const s of [-1, 1]) {
      ctx.color("oklch(0.42 0.05 55)");
      tube(ctx, [
        [0, 0.25, -1.85],
        [s * 0.72, 0.22, -0.4],
        [s * 0.75, 0.2, 0.5],
        [s * 0.45, 0.22, 1.7],
      ], [0.06, 0.07, 0.07, 0.05], M);
      // Lower strake plank
      ctx.color("oklch(0.36 0.04 55)");
      tube(ctx, [
        [0, 0.05, -1.8],
        [s * 0.62, 0.02, -0.4],
        [s * 0.65, 0.02, 0.5],
        [s * 0.4, 0.05, 1.65],
      ], [0.08, 0.1, 0.1, 0.07], M);
    }

    // Flat transom at the stern
    ctx.color("oklch(0.38 0.05 55)");
    slab(ctx, [0, 0.1, 1.68], [0.44, 0.16, 0.03]);

    // Wooden thwarts (seat planks)
    ctx.color("oklch(0.5 0.06 60)");
    slab(ctx, [0, 0.08, -0.5], [0.65, 0.02, 0.16]);
    slab(ctx, [0, 0.08, 0.6], [0.68, 0.02, 0.16]);

    // Oars resting across gunwales
    ctx.color("oklch(0.6 0.07 75)");
    tube(ctx, [[-0.85, 0.26, -0.3], [0.75, 0.18, 0.2]], [0.022, 0.022], 6);
    slab(ctx, [-0.95, 0.28, -0.35], [0.06, 0.01, 0.18]); // oar blade
    tube(ctx, [[0.85, 0.25, -0.2], [-0.7, 0.17, 0.3]], [0.022, 0.022], 6);
    slab(ctx, [0.95, 0.27, -0.25], [0.06, 0.01, 0.18]);
    return;
  }

  if (k === "bollard") {
    // Cast iron dock cleat / mooring bollard
    ctx.smooth();
    ctx.albedo(RUST_TEX);
    ctx.color("oklch(0.25 0.02 240)");
    ctx.roughness(0.7);
    ctx.metalness(0.5);

    // Base plate
    slab(ctx, [0, 0.02, 0], [0.22, 0.02, 0.14]);
    // Vertical post
    tube(ctx, [[0, 0.04, 0], [0, 0.28, 0]], [0.09, 0.11], M);
    // Horn crossbar
    tube(ctx, [[-0.24, 0.24, 0], [0.24, 0.24, 0]], [0.05, 0.05], M);

    // Coiled hemp rope around base
    ctx.color("oklch(0.6 0.08 75)");
    ctx.roughness(0.95);
    ctx.metalness(0);
    tube(ctx, [[0.15, 0.04, 0], [0, 0.04, 0.15], [-0.15, 0.04, 0], [0, 0.04, -0.15], [0.15, 0.04, 0]], [0.025, 0.025, 0.025, 0.025, 0.025], 6);
    tube(ctx, [[0.13, 0.08, 0], [0, 0.08, 0.13], [-0.13, 0.08, 0], [0, 0.08, -0.13], [0.13, 0.08, 0]], [0.022, 0.022, 0.022, 0.022, 0.022], 6);
    return;
  }

  if (k === "lifebuoy") {
    // Maritime life preserver ring
    ctx.smooth();
    ctx.roughness(0.6);
    const R = 0.38, r = 0.085;
    // Torus ring
    for (let i = 0; i < M; i++) {
      const a0 = (i / M) * Math.PI * 2, a1 = ((i + 1) / M) * Math.PI * 2;
      const x0 = Math.cos(a0) * R, z0 = Math.sin(a0) * R;
      const x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R;
      // Quarter segments: alternating safety orange and clean white
      const seg = Math.floor(i / (M / 4));
      ctx.color(seg % 2 === 0 ? "oklch(0.6 0.22 30)" : "oklch(0.92 0.02 90)");
      tube(ctx, [[x0, 0.06, z0], [x1, 0.06, z1]], [r, r], 8);
    }
    return;
  }

  if (k === "lantern") {
    // Weathered brass and iron ship's hurricane lantern
    ctx.smooth();
    ctx.roughness(0.4);
    ctx.metalness(0.7);
    ctx.color("oklch(0.6 0.12 75)"); // Tarnished brass

    // Fuel font base
    tube(ctx, [[0, 0.02, 0], [0, 0.1, 0]], [0.14, 0.12], M);
    // Protective wire cage bars
    ctx.color("oklch(0.3 0.02 240)");
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      tube(ctx, [[Math.cos(a) * 0.1, 0.1, Math.sin(a) * 0.1], [Math.cos(a) * 0.1, 0.34, Math.sin(a) * 0.1]], [0.008, 0.008], 4);
    }
    // Chimney cap
    ctx.color("oklch(0.55 0.1 75)");
    tube(ctx, [[0, 0.34, 0], [0, 0.42, 0], [0, 0.44, 0]], [0.12, 0.07, 0.09], M);
    // Wire carry loop
    tube(ctx, [[-0.08, 0.44, 0], [0, 0.54, 0], [0.08, 0.44, 0]], [0.007, 0.007, 0.007], 4);
    // Amber glass globe inside
    ctx.roughness(0.1);
    ctx.metalness(0);
    ctx.color("oklch(0.85 0.16 75 / 0.8)");
    sphere(ctx, [0, 0.22, 0], 0.085, M);
    return;
  }

  if (k === "raft") {
    // Wikidot Daylight Zone: lashed driftwood & floating furniture flotsam raft (~3.6m x 3.2m)
    ctx.albedo(WOOD_TEX);
    ctx.roughness(0.88);
    // Rusted oil-drum pontoons underneath
    ctx.color("oklch(0.32 0.06 40)");
    for (const sx of [-1.2, 1.2]) {
      tube(ctx, [[sx, -0.1, -1.3], [sx, -0.1, 1.3]], [0.28, 0.28], M);
    }
    // Lashed driftwood deck planks & salvaged doors
    for (let i = 0; i < 8; i++) {
      const z = -1.25 + i * 0.36;
      const shade = 0.36 + ((i * 5) % 4) * 0.03;
      ctx.color(`oklch(${shade} 0.04 58)`);
      slab(ctx, [(i % 2 - 0.5) * 0.06, 0.16, z], [1.65, 0.04, 0.16]);
    }
    // Hemp rope cross-lashings
    ctx.albedo(null);
    ctx.color("oklch(0.58 0.07 75)");
    for (const sx of [-1.15, 1.15]) {
      slab(ctx, [sx, 0.2, 0], [0.05, 0.02, 1.4]);
    }
    // Half-submerged salvaged table frame lashed to corner
    ctx.albedo(HARDWOOD_TEX);
    ctx.color("oklch(0.34 0.05 50)");
    slab(ctx, [-0.8, 0.24, -0.6], [0.55, 0.03, 0.42]);
    return;
  }

  if (k === "palisade") {
    // Wikidot Fort Surrender: ramshackle barricade built from lashed-together bookshelves, dressers, driftwood & tar
    ctx.albedo(WOOD_TEX);
    ctx.roughness(0.9);
    // Heavy tar-soaked timber posts
    ctx.color("oklch(0.22 0.02 55)");
    for (const x of [-1.8, -0.6, 0.6, 1.8]) {
      tube(ctx, [[x, 0, 0], [x, 2.3 + (Math.abs(x) > 1 ? 0.3 : 0), 0]], [0.13, 0.11], 8);
    }
    // Stacked horizontal furniture panels, cabinet doors & driftwood planks
    ctx.albedo(HARDWOOD_TEX);
    for (let i = 0; i < 6; i++) {
      const y = 0.22 + i * 0.34;
      ctx.color(`oklch(${0.32 + (i % 3) * 0.04} 0.05 ${50 + (i % 2) * 12})`);
      slab(ctx, [0, y, 0.06], [1.95, 0.15, 0.08]);
    }
    // Upended bookcase frame wedged into the barricade
    ctx.color("oklch(0.28 0.05 45)");
    slab(ctx, [-1.1, 1.1, -0.12], [0.55, 0.95, 0.22]);
    // Black abyssal tar caulking seams
    ctx.albedo(null);
    ctx.roughness(0.15);
    ctx.color("oklch(0.1 0.01 240)");
    slab(ctx, [0.4, 0.9, 0.12], [0.85, 0.18, 0.04]);
    return;
  }

  if (k === "shrine") {
    // Fort Surrender's Altar to Entity 20 ("The Thing on Level 7"):
    // Colossal bleached Leviathan ribcage arching over a bubbling black tar basin
    ctx.albedo(null);
    ctx.roughness(0.85);
    // Stone & tar-caulked altar plinth
    ctx.color("oklch(0.24 0.01 240)");
    slab(ctx, [0, 0.45, 0], [1.2, 0.45, 0.85]);
    // Glossy black abyssal tar pool inside the basin
    ctx.roughness(0.06);
    ctx.metalness(0.25);
    ctx.color("oklch(0.08 0.01 240)");
    slab(ctx, [0, 0.91, 0], [0.98, 0.03, 0.65]);
    // Glowing cyan bioluminescent offerings in the tar
    ctx.emissive("oklch(0.8 0.2 180)");
    ctx.color("oklch(0.85 0.18 180)");
    sphere(ctx, [-0.25, 0.94, 0.1], 0.07, 8);
    sphere(ctx, [0.3, 0.94, -0.12], 0.055, 8);
    ctx.emissive(null);
    // Colossal bleached Leviathan / whale ribs curving up behind the altar
    ctx.smooth();
    ctx.roughness(0.7);
    ctx.color("oklch(0.82 0.03 85)");
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const z = -0.5 + i * 0.5;
        tube(ctx, [
          [sx * 1.35, 0, z],
          [sx * 1.65, 1.3, z - 0.1],
          [sx * 1.25, 2.5, z - 0.15],
          [sx * 0.35, 3.2 - i * 0.15, z - 0.2],
        ], [0.11, 0.09, 0.07, 0.04], M);
      }
    }
    return;
  }

  if (k === "divingbell") {
    // Rusted M.E.G. Submersible Diving Bell & A-Frame Winch Rig over the Level 8 Tar Cavern
    ctx.albedo(RUST_TEX);
    ctx.roughness(0.65);
    ctx.metalness(0.55);
    ctx.color("oklch(0.34 0.05 45)");
    // Heavy steel A-Frame gantry legs
    for (const sx of [-1.3, 1.3]) {
      tube(ctx, [[sx, 0, -1.1], [sx * 0.3, 3.4, 0]], [0.09, 0.08], 8);
      tube(ctx, [[sx, 0, 1.1], [sx * 0.3, 3.4, 0]], [0.09, 0.08], 8);
    }
    // Crossbar & winch drum
    tube(ctx, [[-0.6, 3.35, 0], [0.6, 3.35, 0]], [0.1, 0.1], M);
    ctx.color("oklch(0.22 0.01 240)");
    tube(ctx, [[0, 3.35, 0], [0, 1.95, 0]], [0.025, 0.025], 6); // Steel cable
    // Suspended cast-iron diving bell chamber
    ctx.smooth();
    ctx.color("oklch(0.42 0.08 55)");
    tube(ctx, [[0, 0.55, 0], [0, 1.45, 0], [0, 1.95, 0]], [0.85, 0.78, 0.35], M);
    // Brass porthole with eerie green-cyan depth glow
    ctx.color("oklch(0.58 0.11 75)");
    tube(ctx, [[0, 1.15, 0.72], [0, 1.15, 0.82]], [0.22, 0.22], M);
    ctx.metalness(0);
    ctx.emissive("oklch(0.78 0.18 175)");
    ctx.color("oklch(0.85 0.18 175)");
    sphere(ctx, [0, 1.15, 0.78], 0.16, M);
    ctx.emissive(null);
    return;
  }

  if (k === "sonar") {
    // M.E.G. Deep-Trench Hydrophone & Acoustic Sonar Console at Seawatch Outpost
    ctx.albedo(METAL_TEX);
    ctx.roughness(0.5);
    ctx.metalness(0.6);
    ctx.color("oklch(0.32 0.02 230)");
    // Steel equipment cabinet on tripod base
    slab(ctx, [0, 0.55, 0], [0.48, 0.55, 0.36]);
    // Angled CRT radar/sonar hood
    ctx.color("oklch(0.24 0.02 230)");
    slab(ctx, [0, 1.18, -0.04], [0.42, 0.22, 0.3]);
    // Glowing green-cyan sonar oscilloscope screen
    ctx.albedo(null);
    ctx.metalness(0);
    ctx.emissive("oklch(0.75 0.2 160)");
    ctx.color("oklch(0.82 0.2 160)");
    slab(ctx, [0, 1.18, 0.265], [0.32, 0.16, 0.01]);
    ctx.emissive(null);
    // Hydrophone mast & acoustic dish
    ctx.metalness(0.6);
    ctx.color("oklch(0.45 0.02 230)");
    tube(ctx, [[0.28, 1.1, -0.15], [0.28, 2.35, -0.15]], [0.025, 0.018], 6);
    ctx.emissive("oklch(0.75 0.22 35)");
    ctx.color("oklch(0.85 0.22 35)");
    sphere(ctx, [0.28, 2.4, -0.15], 0.045, 8);
    ctx.emissive(null);
    return;
  }

  if (k === "brazier") {
    // Rusted 55-gallon oil drum fire brazier for warming up from hypothermia
    ctx.albedo(RUST_TEX);
    ctx.roughness(0.75);
    ctx.metalness(0.5);
    ctx.color("oklch(0.3 0.06 42)");
    tube(ctx, [[0, 0, 0], [0, 0.88, 0]], [0.3, 0.31], M);
    // Glowing hot coal bed & driftwood logs inside
    ctx.albedo(null);
    ctx.metalness(0);
    ctx.emissive("oklch(0.78 0.22 48)");
    ctx.color("oklch(0.88 0.2 55)");
    sphere(ctx, [0, 0.82, 0], 0.24, 8);
    ctx.emissive(null);
    return;
  }
}
