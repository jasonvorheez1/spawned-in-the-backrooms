// The R-55 display case at the end of Level 11's crawl (laid in scripts/lib/level11-depths.js): the run's reward.
// The case is a container (interact.js opens it). When the raygun leaves it, the gun lying on the velvet goes, the spot
// over it dims, a sting plays and everyone in the storeroom is told what was taken. A refill (an hour later) puts it all back.
const GUN = "l11d-r55-gun", SPOT = "l11d-r55-spot";
function show(ctx, has) {
  const g = ctx.place.objects[GUN]; if (g) g.visible = has;
  const s = ctx.place.objects[SPOT]; if (s?.light) s.light = { ...s.light, intensity: has ? 7 : 1.5 };
}
export function update(ctx) {
  const st = ctx.self.state, m = ctx.self.session, has = String(st.items ?? "").includes("weapon:raygun");
  if (m.has === undefined) { m.has = has; show(ctx, has); return ctx.sleep(0.5); }
  if (has === m.has) return ctx.sleep(0.5);
  m.has = has; show(ctx, has);
  if (has) return ctx.sleep(0.5);
  if (st.full) st.full = st.full.split(",").filter((t) => t !== "weapon:raygun").join(","); // one R-55 per world (Shelly, Nov 10): the hourly refill brings back the cells only
  const at = ctx.self.feetPosition, near = ctx.place.players.filter((p) => Math.hypot(p.feetPosition.x - at.x, p.feetPosition.z - at.z) < 14);
  const taker = near.slice().sort((a, b) => Math.hypot(a.feetPosition.x - at.x, a.feetPosition.z - at.z) - Math.hypot(b.feetPosition.x - at.x, b.feetPosition.z - at.z))[0];
  for (const p of near) p.state.notice = { text: p === taker ? "Atomic Ray-Gun R-55 · prototype 3 of 3. It hums in your hand." : "Someone lifted the R-55 out of its case.", at: ctx.now() };
  ctx.emit("playSound", { clip: "/cdn/moodboard-scifi-neon/sfx-retro-1950s-ray-gun-zap-with-warbling-oscillator.mp3", position: { x: at.x, y: at.y + 1.1, z: at.z }, volume: 0.8, pitch: 0.7, maxDistance: 20 });
  ctx.emit("playSound", { clip: "/cdn/sfx-1950s-sci-fi-theremin-reward-sting-rising-triumphant.mp3", position: { x: at.x, y: at.y + 1.5, z: at.z }, volume: 0.9, maxDistance: 24 });
  ctx.emit("fx", { position: { x: at.x - 0.1, y: at.y + 1.15, z: at.z }, script: `fx
pop spark burst=40 life=.4..1.1 v=sdir()*(1.2..2.6)+<0,1.2,0> size=.02..0.04 acc=<0,-3,0> col=hdr(1.6,3,2.2)>hdr(.4,1.2,.8) a=1>0 sz=$size r=sprite(ember,add,velocity,.03)
pop glow burst=1 life=.6 col=<.5,1,.7> a=1>0 r=light(<.5,1,.7>,8,4)` });
  if (taker) ctx.emit("screenShake", { intensity: 0.12, duration: 0.3 }, { audience: { player: taker.id } });
  return ctx.sleep(0.5);
}
