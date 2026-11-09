// a failing light in Zenith Station: holds steady, then stutters
export const updateSchedule = { every: { seconds: 0.1 } };
export function update(ctx) {
  const l = ctx.self.light, ses = ctx.self.session; if (!l) return;
  ses.base ??= l.intensity; const now = ctx.now();
  if (now > (ses.until ?? 0)) { ses.burst = ctx.random() < 0.35; ses.until = now + (ses.burst ? 400 + ctx.random() * 900 : 1500 + ctx.random() * 4000); }
  l.intensity = ses.burst ? (ctx.random() < 0.5 ? ses.base * 0.08 : ses.base) : ses.base;
}
