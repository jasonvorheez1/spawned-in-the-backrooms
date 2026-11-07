// A Homely Hotel suite's steamer trunk (params.kind "trunk": domed lid, leather straps, brass corners and lock; latch faces local +z)
// and its luggage rack ("rack": turned walnut legs, webbing straps). Origin at the feet, back at local -z.
import { bbox, cyl, dome } from "./lib/l5-kit.js";
function paint(ctx, tex, col, rough = 0.6, metal = 0) { ctx.albedo(tex); ctx.color(col); ctx.roughness(rough); ctx.metalness(metal); }
function trunk(ctx) {
  const W = 0.5, D = 0.27, H = 0.44;
  paint(ctx, "cdn/texture-dark-stained-oak-wood.png", "#6a3e22", 0.55);
  bbox(ctx, [0, H / 2, 0], [W, H / 2, D], 0.025);
  for (let i = -1; i <= 1; i++) bbox(ctx, [i * 0.22, H * 0.5, D + 0.005], [0.018, H * 0.48, 0.006], 0.004); // wood slats
  paint(ctx, "cdn/texture-worn-brown-leather.png", "#5a3420", 0.7);
  cyl(ctx, [-W + 0.02, H + 0.01, 0], [W - 0.02, H + 0.01, 0], D - 0.01, 18, true); // domed lid as a half barrel
  for (const x of [-0.3, 0.3]) { bbox(ctx, [x, H / 2 + 0.06, D + 0.012], [0.035, H / 2 + 0.06, 0.008], 0.004); bbox(ctx, [x, H + D * 0.75, 0], [0.035, 0.01, D + 0.01], 0.004); }
  paint(ctx, "cdn/texture-aged-brass-metal.png", "#b8902e", 0.35, 0.9);
  for (const x of [-W, W]) for (const z of [-D, D]) { bbox(ctx, [x * 0.97, 0.05, z * 0.95], [0.04, 0.05, 0.04], 0.01); bbox(ctx, [x * 0.97, H - 0.04, z * 0.95], [0.04, 0.04, 0.04], 0.01); }
  bbox(ctx, [0, H - 0.03, D + 0.015], [0.05, 0.06, 0.012], 0.006); // lock plate
  dome(ctx, [0, H - 0.05, D + 0.028], [0, 0, 1], 0.014, 1, 8, 3);
  for (const x of [-W - 0.012, W + 0.012]) cyl(ctx, [x, H * 0.6, -0.08], [x, H * 0.6, 0.08], 0.012, 8, true); // handles
}
function rack(ctx) {
  paint(ctx, "cdn/texture-polished-walnut-wood.png", "#4a2a18", 0.45);
  const W = 0.36, D = 0.22, H = 0.5;
  for (const x of [-W, W]) for (const z of [-D, D]) cyl(ctx, [x, 0, z], [x, H, z], [0.022, 0.016], 10, true);
  for (const x of [-W, W]) bbox(ctx, [x, H, 0], [0.025, 0.02, D + 0.03], 0.008);
  for (const z of [-D, D]) bbox(ctx, [0, 0.12, z], [W, 0.012, 0.012], 0.004);
  paint(ctx, "cdn/texture-red-woven-fabric-webbing.png", "#7a1e22", 0.85);
  for (const z of [-0.14, 0, 0.14]) bbox(ctx, [0, H + 0.012, z], [W + 0.02, 0.005, 0.03], 0.002);
}
export function geometry(ctx) { (ctx.params?.kind === "rack" ? rack : trunk)(ctx); }
export function collider(ctx) { return ctx.params?.kind === "rack" ? { kind: "box", width: 0.8, height: 0.55, depth: 0.5, center: [0, 0.27, 0] } : { kind: "box", width: 1.0, height: 0.7, depth: 0.56, center: [0, 0.35, 0] }; }
