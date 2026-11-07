// the model shelf: walnut case 2.4 m long, 0.36 deep, three lit levels of three slots, open toward +X.
// origin = floor centre. brass lips on each board, warm led strips under each board light the level below.
const L = 1.2, D = 0.18, T = 0.03;
const BOARDS = [0.74, 1.39, 2.04]; // board bottoms over each level; the plinth tops out at 0.12
function box(ctx, x0, y0, z0, x1, y1, z1) {
  ctx.quad(x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1); ctx.quad(x1,y0,z0, x0,y0,z0, x0,y1,z0, x1,y1,z0);
  ctx.quad(x1,y0,z1, x1,y0,z0, x1,y1,z0, x1,y1,z1); ctx.quad(x0,y0,z0, x0,y0,z1, x0,y1,z1, x0,y1,z0);
  ctx.quad(x0,y1,z1, x1,y1,z1, x1,y1,z0, x0,y1,z0); ctx.quad(x0,y0,z0, x1,y0,z0, x1,y0,z1, x0,y0,z1);
}
function bbox(ctx, x0, y0, z0, x1, y1, z1, b) {
  if (ctx.lod >= 3 || !b) return box(ctx, x0, y0, z0, x1, y1, z1);
  box(ctx, x0 + b, y0, z0 + b, x1 - b, y1, z1 - b);
  box(ctx, x0, y0 + b, z0 + b, x1, y1 - b, z1 - b);
  box(ctx, x0 + b, y0 + b, z0, x1 - b, y1 - b, z1);
}
export function geometry(ctx) {
  const top = BOARDS[2] + 0.04;
  if (ctx.lod >= 5) { ctx.color("oklch(0.45 0.06 50)"); box(ctx, -D, 0, -L, D, top, L); return; }
  // walnut carcass
  ctx.albedo("cdn/texture-walnut-wood-planks.png"); ctx.color("oklch(0.95 0.02 60)"); ctx.roughness(0.55);
  bbox(ctx, -D, 0, -L - 0.03, D, top, -L, 0.004);          // end panels
  bbox(ctx, -D, 0, L, D, top, L + 0.03, 0.004);
  bbox(ctx, -D - 0.015, BOARDS[2], -L - 0.045, D + 0.015, top, L + 0.045, 0.006); // the cap, proud of the case
  bbox(ctx, -D + 0.01, 0.02, -L, D - 0.02, 0.12, L, 0.004);  // plinth, set back a touch
  for (const y of BOARDS.slice(0, 2)) bbox(ctx, -D, y, -L, D, y + T, L, 0.004);
  // dividers between the slots on every level
  const floors = [0.12, BOARDS[0] + T, BOARDS[1] + T];
  if (ctx.lod <= 3) for (let i = 0; i < 3; i++) for (const z of [-0.4, 0.4]) bbox(ctx, -D + 0.02, floors[i], z - 0.01, D - 0.04, BOARDS[i], z + 0.01, 0.003);
  ctx.albedo(null);
  // back panel, darker
  ctx.color("oklch(0.42 0.04 55)"); ctx.roughness(0.8);
  box(ctx, -D, 0.12, -L, -D + 0.012, BOARDS[2], L);
  // a dark kick strip under the plinth front
  ctx.color("oklch(0.18 0.01 50)"); box(ctx, D - 0.03, 0, -L, D - 0.02, 0.02, L);
  if (ctx.lod <= 2) {
    // brass lips on each display edge
    ctx.color("oklch(0.75 0.11 80)"); ctx.metalness(0.9); ctx.roughness(0.3);
    for (const y of [0.12, BOARDS[0] + T, BOARDS[1] + T]) box(ctx, D - 0.008, y - 0.03, -L, D + 0.004, y + 0.006, L);
    box(ctx, D + 0.015, BOARDS[2] - 0.004, -L - 0.045, D + 0.022, BOARDS[2] + 0.004, L + 0.045);
    ctx.metalness(0);
    // warm led strips under each board, near the front
    ctx.emissive("oklch(0.9 0.08 75)"); ctx.color("oklch(0.95 0.05 80)");
    for (const y of BOARDS) box(ctx, D - 0.05, y - 0.006, -L + 0.03, D - 0.03, y, L - 0.03);
    ctx.emissive(null);
  }
}
export function collider(ctx) {
  return [{ kind: "box", width: 0.42, height: BOARDS[2] + 0.04, depth: 2.5, center: [0, (BOARDS[2] + 0.04) / 2, 0] }];
}
