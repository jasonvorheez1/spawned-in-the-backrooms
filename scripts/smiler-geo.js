// A smiler (Entity 3): no body the eye can see. Two white glowing eyes and a grin of needle teeth
// hanging in the dark at head height. Faces -Z. The capsule collider stays so weapons still connect.
const Y = 1.82; // face height (her pick: a little above a wanderer's eye, so it looks down at you)
const zOf = (x, y) => -0.02 + 0.9 * x * x + 0.5 * (y - Y) * (y - Y); // the face curves back at its edges like a skull

function quad(ctx, a, b, c, d) { ctx.tri(...a, ...b, ...c); ctx.tri(...a, ...c, ...d); }

export function geometry(ctx) {
  const hi = ctx.lod <= 2;
  ctx.emissive("oklch(1 0.02 95)");
  ctx.color("#fffdf2");
  // the eyes: narrow slanted almonds, outer corners lifted
  const EN = hi ? 18 : 8;
  for (const s of [-1, 1]) {
    const cx = s * 0.13, cy = Y + 0.17, w = 0.075, h = 0.03, tilt = s * 0.32;
    const p = (a) => {
      const lx = Math.cos(a) * w, ly = Math.sin(a) * h * (1 - 0.35 * Math.cos(a) * s);
      const x = cx + lx * Math.cos(tilt) - ly * Math.sin(tilt), y = cy + lx * Math.sin(tilt) + ly * Math.cos(tilt);
      return [x, y, zOf(x, y)];
    };
    for (let k = 0; k < EN; k++) {
      const a0 = (k / EN) * Math.PI * 2, a1 = ((k + 1) / EN) * Math.PI * 2;
      ctx.tri(cx, cy, zOf(cx, cy) - 0.004, ...p(a1), ...p(a0));
    }
  }
  // the grin: wider than any face, two rows of thin sharp teeth on the lips' curves, dark between them
  const W = 0.31, T = hi ? 22 : 11, th = 0.006;
  const up = (x) => Y - 0.04 + 1.15 * x * x;   // upper lip
  const lo = (x) => Y - 0.15 + 2.2 * x * x;    // lower lip, meets the upper near the corners
  const lip = (x, f, o = 0) => [x, f(x) + o, zOf(x, f(x))];
  for (let i = 0; i < T; i++) {
    const x0 = -W + (2 * W * i) / T, x1 = -W + (2 * W * (i + 1)) / T, xm = (x0 + x1) / 2;
    const gap = up(xm) - lo(xm);
    if (gap <= 0.004) continue;
    // upper tooth: base on the upper lip, tip down; lengths uneven
    const len = gap * (0.55 + 0.1 * Math.sin(i * 2.7));
    ctx.tri(...lip(x0 + 0.002, up), ...lip(x1 - 0.002, up), xm, up(xm) - len, zOf(xm, up(xm) - len) - 0.003);
    // lower tooth, offset half a tooth so the rows interlock
    const xl = xm + W / T, xr = Math.min(W, xm + (2 * W) / T);
    const lenL = (up(xl) - lo(xl)) * (0.5 + 0.1 * Math.cos(i * 1.9));
    if (lenL > 0.003) ctx.tri(...lip(xr - 0.002, lo), ...lip(xm + 0.002, lo), xl, lo(xl) + lenL, zOf(xl, lo(xl) + lenL) - 0.003);
    // thin glowing lips tie the teeth into one grin
    quad(ctx, lip(x0, up), lip(x1, up), lip(x1, up, th), lip(x0, up, th));
    quad(ctx, lip(x1, lo), lip(x0, lo), lip(x0, lo, -th), lip(x1, lo, -th));
  }
  ctx.emissive(null);
  ctx.color(null);
}
export function collider() { return { kind: "capsule", radius: 0.38, halfHeight: 0.7, center: [0, 1.08, 0] }; }
