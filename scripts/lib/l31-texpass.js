// Shelly Nov 13 "give everything so far that doesnt have a texture a texture": after the venue is laid,
// every flat-coloured primitive in Level 31 gets a surface picked by what it reads as; its colour stays as the tint.
// Lights, neon, glass, glows and the hidden stay as they are.
const T = {
  steel: "cdn/texture-light-grey-brushed-stainless-steel-fine-scratches.png",
  chrome: "cdn/texture-polished-chrome-metal-soft-smudges.png",
  wood: "cdn/texture-light-varnished-oak-wood-grain-planks.png",
  paint: "cdn/texture-pale-grey-scuffed-painted-metal-chipped-edges.png",
  laminate: "cdn/texture-off-white-speckled-formica-laminate-worn.png",
  rubber: "cdn/texture-grey-textured-rubber-mat-fine-grain.png",
  fabric: "cdn/texture-light-grey-woven-upholstery-fabric.png",
};
const SKIP = /light|neon|glow|lamp|bulb|beam|glass|screen|spot|shadow|blueprint|halo|flare|marker|trigger|hit|col$/i;
function rgb(c) {
  if (typeof c === "number") return [(c >> 16) & 255, (c >> 8) & 255, c & 255].map((v) => v / 255);
  if (typeof c !== "string") return [0.8, 0.8, 0.8];
  const h = c.match(/^#([0-9a-f]{6})$/i); if (h) { const n = parseInt(h[1], 16); return rgb(n); }
  const l = c.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i); if (l) { const L = +l[1], C = +l[2], H = +l[3] * Math.PI / 180; const a = C * Math.cos(H), b = C * Math.sin(H); return [L + a, L - a * 0.3, L - b].map((v) => Math.max(0, Math.min(1, v))); }
  return [0.6, 0.6, 0.6];
}
function pick(id, m) {
  if ((m.metalness ?? 0) >= 0.85) return (m.roughness ?? 0.5) < 0.25 ? T.chrome : T.steel;
  if ((m.metalness ?? 0) >= 0.5) return T.steel;
  if (/bench|seat|cushion|pad|booth|couch|sofa|stool/i.test(id)) return T.fabric;
  if (/mat|runner|floor|step|tread|bumper|foot/i.test(id)) return T.rubber;
  const [r, g, b] = rgb(m.color), mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx - mn;
  if (mx < 0.12) return T.rubber;
  if (r > g && g > b && sat > 0.12 && mx < 0.75) return T.wood;   // browns, tans, oranges read as timber
  if (mx > 0.8 && sat < 0.15) return T.laminate;                  // whites and creams
  return T.paint;
}
export function texturePass(ctx) {
  let n = 0;
  for (const id of Object.keys(ctx.place.objects)) {
    if (!id.startsWith("l31-")) continue;
    const o = ctx.place.objects[id]; if (!o || o.visible === false || o.render === false) continue;
    const k = o.primitive?.kind, m = o.material;
    if (!k || k === "scripted" || !m || m.texture || m.kind) continue;
    if (o.light || o.ui || o.vector || SKIP.test(id)) continue;
    if (m.emissive || m.emissiveIntensity || (m.opacity ?? 1) < 1 || m.transparent) continue;
    o.material = { ...m, texture: pick(id, m), wrap: "repeat", repeat: [1, 1] };
    n++;
  }
  return n;
}
