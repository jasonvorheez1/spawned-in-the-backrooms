// Graphics pass (Nov 16, Shelly: "add textures to things that dont have textures"): gives every bare-coloured
// box/cylinder a place spawned a real surface, keeping its colour as the tint. Run once per room via a state stamp.
const SURF = {
  metal: "cdn/texture-scuffed-worn-painted-industrial-steel-scratches.png",
  plain: "cdn/texture-grimy-weathered-painted-plaster-panel-stains.png",
};
export function retexture(ctx, { skipTags = [], skipIds = [] } = {}) {
  let n = 0;
  const walk = (o) => {
    if (!o) return;
    const p = o.primitive, m = o.material;
    if (p && !o.model && !o.ui && o.visible !== false && (p.kind === "box" || p.kind === "cylinder") && !(m && (m.texture || m.kind || m.emissive || m.emissiveIntensity))) {
      const w = Math.max(p.width ?? 0, p.depth ?? 0, p.height ?? 0, (p.radiusTop ?? 0) * 2);
      if (w > 0.12) { // tiny trim reads as solid anyway
        o.material = { ...(m ?? {}), texture: (m?.metalness ?? 0) >= 0.3 ? SURF.metal : SURF.plain, wrap: "repeat", repeat: [1, 1] };
        n++;
      }
    }
    for (const c of o.children ?? []) walk(typeof c === "string" ? ctx.getObject(c) : c);
  };
  for (const id of Object.keys(ctx.place.objects)) {
    if (skipIds.includes(id)) continue;
    const o = ctx.place.objects[id];
    if (!o || o.parent || (o.tags ?? []).some((t) => skipTags.includes(t))) continue;
    walk(o);
  }
  return n;
}
// one call per tick from a place's sim: waits until the place has stood ~8 s with a player in it (its own spawns are in), then retextures once per room
const firstSeen = new Map();
export function retextureOnce(ctx, opts = {}, v = 1) {
  if (ctx.place.state.texV === v || !ctx.place.players?.length) return;
  const k = ctx.place.name ?? "p", t = firstSeen.get(k) ?? ctx.now();
  firstSeen.set(k, t);
  if (ctx.now() - t < 8000) return;
  ctx.place.state.texV = v;
  retexture(ctx, opts);
}
