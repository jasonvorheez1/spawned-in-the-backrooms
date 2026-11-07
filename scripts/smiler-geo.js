// A smiler (Entity 3): no body the eye can see. Two white glowing eyes with hot cores and a grin of
// uneven needle teeth over a black throat, hanging at head height. Rigged: head sways, jaw opens,
// eyes narrow. Faces -Z. The capsule collider stays so weapons still connect.
const Y = 1.82; // face height (her pick)
const zOf = (x, y) => -0.02 + 0.9 * x * x + 0.5 * (y - Y) * (y - Y); // the face curves back like a skull
const JAW = [0, Y - 0.06, 0.12];

export function skeleton() {
  return {
    head: { pivot: [0, Y - 0.2, 0.15] },
    jaw: { parent: "head", pivot: JAW },
    eyeL: { parent: "head", pivot: [-0.13, Y + 0.17, 0] },
    eyeR: { parent: "head", pivot: [0.13, Y + 0.17, 0] },
  };
}

function quad(ctx, a, b, c, d) { ctx.tri(...a, ...b, ...c); ctx.tri(...a, ...c, ...d); }

function eye(ctx, s, EN, scale, z0) {
  const cx = s * 0.13, cy = Y + 0.17, w = 0.078 * scale, h = 0.032 * scale, tilt = s * 0.32;
  const p = (a) => {
    const lx = Math.cos(a) * w, ly = Math.sin(a) * h * (1 - 0.4 * Math.cos(a) * s);
    const x = cx + lx * Math.cos(tilt) - ly * Math.sin(tilt), y = cy + lx * Math.sin(tilt) + ly * Math.cos(tilt);
    return [x, y, zOf(x, y) + z0];
  };
  for (let k = 0; k < EN; k++) {
    const a0 = (k / EN) * Math.PI * 2, a1 = ((k + 1) / EN) * Math.PI * 2;
    ctx.tri(cx, cy, zOf(cx, cy) + z0 - 0.004, ...p(a1), ...p(a0));
  }
}

export function geometry(ctx) {
  const hi = ctx.lod <= 2, EN = hi ? 22 : 8;
  // eyes: a soft halo, the white, a hot core
  for (const s of [-1, 1]) {
    ctx.bone(s < 0 ? "eyeL" : "eyeR");
    if (hi) { ctx.color("#fff8e0", 0.25); ctx.emissive("oklch(0.9 0.04 95)"); eye(ctx, s, EN, 1.6, 0.01); }
    ctx.color("#fffdf2"); ctx.emissive("oklch(1 0.02 95)"); eye(ctx, s, EN, 1, 0);
    if (hi) { ctx.emissive("#ffffff"); ctx.color("#ffffff"); eye(ctx, s, EN, 0.4, -0.003); }
  }
  const W = 0.32, T = hi ? 26 : 12, th = 0.007;
  const up = (x) => Y - 0.04 + 1.15 * x * x; // upper lip
  const lo = (x) => Y - 0.16 + 2.25 * x * x; // lower lip
  const lip = (x, f, o = 0, dz = 0) => [x, f(x) + o, zOf(x, f(x)) + dz];
  // black throat behind the teeth: reads as a mouth when the jaw opens
  ctx.bone("head"); ctx.emissive(null); ctx.color("#050304");
  for (let i = 0; i < T; i++) {
    const x0 = -W + (2 * W * i) / T, x1 = -W + (2 * W * (i + 1)) / T;
    quad(ctx, lip(x1, up, 0, 0.03), lip(x0, up, 0, 0.03), [x0, Y - 0.24 + 2.2 * x0 * x0, zOf(x0, up(x0)) + 0.03], [x1, Y - 0.24 + 2.2 * x1 * x1, zOf(x1, up(x1)) + 0.03]);
  }
  ctx.emissive("oklch(0.97 0.03 95)"); ctx.color("#fffaea");
  for (let i = 0; i < T; i++) {
    const x0 = -W + (2 * W * i) / T, x1 = -W + (2 * W * (i + 1)) / T, xm = (x0 + x1) / 2;
    const gap = Math.max(0.03, up(xm) - lo(xm));
    const r = Math.sin(i * 12.9898) * 43758.5453, j = r - Math.floor(r);
    // upper row: needles of uneven length, the canines longest
    ctx.bone("head");
    const len = gap * (0.45 + 0.35 * j + (Math.abs(xm) > 0.08 && Math.abs(xm) < 0.13 ? 0.25 : 0));
    ctx.tri(...lip(x0 + 0.002, up), ...lip(x1 - 0.002, up), xm, up(xm) - len, zOf(xm, up(xm) - len) - 0.004);
    quad(ctx, lip(x0, up), lip(x1, up), lip(x1, up, th), lip(x0, up, th));
    // lower row rides the jaw
    ctx.bone("jaw");
    const xl = xm + W / T, xr = Math.min(W, xm + (2 * W) / T);
    const lenL = Math.max(0.02, up(xl) - lo(xl)) * (0.4 + 0.3 * (1 - j));
    if (xl < W) ctx.tri(...lip(xr - 0.002, lo), ...lip(xm + 0.002, lo), xl, lo(xl) + lenL, zOf(xl, lo(xl) + lenL) - 0.004);
    quad(ctx, lip(x1, lo), lip(x0, lo), lip(x0, lo, -th), lip(x1, lo, -th));
  }
  ctx.bone(null); ctx.emissive(null); ctx.color(null);
}
export function collider() { return { kind: "capsule", radius: 0.38, halfHeight: 0.7, center: [0, 1.08, 0] }; }
