// the Gentleman of Level 5 stays behind his desk and turns to whoever comes in (scripts/lib/l5-beast.js)
export function update(ctx) {
  const me = ctx.self.feetPosition; let best = null, bd = 7;
  for (const p of ctx.place.players) { const d = Math.hypot(p.feetPosition.x - me.x, p.feetPosition.z - me.z); if (d < bd) { bd = d; best = p; } }
  if (best) ctx.self.rotation = { lookAt: { x: best.feetPosition.x, y: me.y, z: best.feetPosition.z } };
  ctx.sleep(best ? 0.4 : 2);
}
