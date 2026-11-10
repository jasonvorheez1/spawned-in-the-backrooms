// one door to the creator's hit pack: pick a variant, vary its pitch, play it
import H from "./data/hitsounds.yml";
export { H };
export function hitSnd(ctx, set, position, opts = {}, aud) {
  const list = Array.isArray(H[set]) ? H[set] : [H[set]];
  const clip = list[Math.floor(ctx.random() * list.length)];
  ctx.emit("playSound", { clip, position, volume: opts.volume ?? 0.8, pitch: (opts.pitch ?? 1) * (0.93 + ctx.random() * 0.14), maxDistance: opts.maxDistance ?? 35 }, aud);
}
