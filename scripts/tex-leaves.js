// A twig spray card for tree crowns: ?kind=broad | small | needle. Transparent background, a twig up the middle,
// leaves off it in mid-greens with darker undersides; the tree's ctx.color tints it per card.
export const meta = { filter: "linear", wrap: "clamp" };
export function texture(ctx) {
  const S = 256, g = ctx.canvas(S, S), R = () => ctx.random(), kind = ctx.params.kind ?? "broad";
  g.clearRect(0, 0, S, S);
  const twig = (x0, y0, x1, y1, w) => { g.strokeStyle = "rgb(70,52,36)"; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  // main twig from the bottom centre, side twigs
  twig(S / 2, S, S / 2 + 8, 20, 4);
  const sides = [];
  for (let i = 0; i < 7; i++) {
    const y = S - 30 - i * 30, dir = i % 2 ? 1 : -1, len = 60 + R() * 40;
    const x1 = S / 2 + dir * len, y1 = y - 30 - R() * 20;
    twig(S / 2 + 4, y, x1, y1, 2);
    sides.push([S / 2 + 4, y, x1, y1]);
  }
  const leaf = (x, y, a, L, W) => {
    const shade = 0.75 + R() * 0.35, r = Math.round(70 * shade), gg = Math.round(118 * shade), b = Math.round(48 * shade);
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = `rgb(${r},${gg},${b})`; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(W, -L * 0.45, 0, -L); g.quadraticCurveTo(-W, -L * 0.45, 0, 0); g.fill();
    g.fillStyle = `rgba(30,55,22,0.45)`; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-W, -L * 0.45, 0, -L); g.lineTo(0, 0); g.fill(); // shaded half
    g.strokeStyle = "rgba(200,220,150,0.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -2); g.lineTo(0, -L * 0.9); g.stroke(); // midrib
    g.restore();
  };
  const segs = [[S / 2, S, S / 2 + 8, 20], ...sides];
  const n = kind === "needle" ? 260 : kind === "small" ? 140 : 70;
  for (let i = 0; i < n; i++) {
    const [x0, y0, x1, y1] = segs[Math.floor(R() * segs.length)], t = 0.15 + R() * 0.85;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, base = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
    const a = base + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.9);
    if (kind === "needle") leaf(x, y, a, 18 + R() * 10, 1.6);
    else if (kind === "small") leaf(x, y, a, 18 + R() * 8, 7);
    else leaf(x, y, a, 30 + R() * 16, 13 + R() * 5);
  }
}
