// Dresses every sign in a place as its own object (scripts/sign-geo.js) instead of a flat dark box: called from each place's
// sim tick with the place's name. Idempotent: a sign keeps its id, size, colour, text and spot; only a plain box with a ui
// panel is touched, so a sign the sim lays again later is dressed on the next pass. Lightboxes (deep or glowing) are left alone.
import S from "./data/signs.yml";
const last = {}; // place -> ms of the last pass (module memory, this machine)
const isSign = (id, o) => /sign/i.test(id) || (o.tags ?? []).some((t) => /sign/i.test(t));
const SKIP = /post|glow|pole|bracket|mall-sign|liftsign|light|lamp/i;

export function restyleSigns(ctx, place) {
  const now = ctx.now(); if (now - (last[place] ?? -1e9) < 5000) return; last[place] = now;
  for (const [id, o] of Object.entries(ctx.place.objects)) {
    if (!isSign(id, o) || SKIP.test(id)) continue;
    const pr = o.primitive; if (pr?.kind !== "box" || !o.ui || (pr.depth ?? 0) > 0.2 || (pr.width ?? 0) < 0.15) continue;
    if (o.material?.emissive && (o.material.emissiveIntensity ?? 1) > 0.3) continue;
    const style = S.ids?.[id] ?? S.places?.[place] ?? "plywood";
    let seed = 0; for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
    const base = o.material?.color ?? "oklch(0.3 0.02 70)";
    try {
      o.primitive = { kind: "scripted", script: "scripts/sign-geo.js", seed, params: { style, w: pr.width ?? 1, h: pr.height ?? 0.5, d: pr.depth ?? 0.05, base } };
      o.material = { ...(o.material ?? {}), texture: S.textures?.[style], color: base };
      const font = S.fonts?.[style];
      if (font && typeof o.ui === "string" && !o.ui.includes("data-signfont")) {
        o.ui = /^(\s*<div)([^>]*?)style="/.test(o.ui) ? o.ui.replace(/^(\s*<div)([^>]*?)style="/, `$1 data-signfont$2style="font-family:${font};`) : o.ui.replace(/^(\s*<div)/, `$1 data-signfont style="font-family:${font}"`);
      }
    } catch (e) {}
  }
}
