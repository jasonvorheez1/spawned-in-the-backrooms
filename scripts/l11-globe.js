// an old subway globe: steady most of the time, then a stutter of dips and a buzz
export function update(ctx) {
  const s = ctx.self, base = s.state.base ?? 2.5;
  const r = ctx.random();
  if (r < 0.12) {
    s.light = { ...s.light, intensity: base * 0.15 }; s.material = { ...s.material, emissiveIntensity: 0.4 };
    ctx.after(0.06 + ctx.random() * 0.12, "back", null);
    return ctx.sleep(0.4 + ctx.random() * 0.6);
  }
  ctx.sleep(1.5 + ctx.random() * 4);
}
export function back(ctx) { const s = ctx.self, base = s.state.base ?? 2.5; s.light = { ...s.light, intensity: base }; s.material = { ...s.material, emissiveIntensity: 2.4 }; }
