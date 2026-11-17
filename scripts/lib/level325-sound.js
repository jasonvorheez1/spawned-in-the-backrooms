// Level 325 "sound" layer: the city works with nobody in it. Tools start up inside empty floors near you, stop when you
// look for them, and once in a long while one starts right behind you. Savi's picks: a burst every 6-14 s per wanderer,
// 8-22 m off and 3-30 m up; 1 in 12 lands 2-3 m behind; a long silence (25 s) follows every close one.
export const V = 1;
export function lay(ctx) {}
const SFX = (n) => "/cdn/moodboard-realistic-gritty/sfx-" + n + ".mp3";
const FAR = ["angle-grinder-on-steel-burst-in-empty-concrete-room", "jackhammer-burst-echoing-concrete-floor", "hammer-on-rebar-three-strikes-echo", "power-drill-into-concrete-short-burst", "nail-gun-rapid-shots-echo", "steel-beam-groan-under-load-deep", "bamboo-scaffold-creak-and-knock-wind"];
const NEAR = ["single-hammer-strike-on-steel-close-dry", "power-drill-spin-up-then-cut-off-close"];
const RARE = ["distant-tower-collapse-long-roar-rumble", "metal-object-falling-from-height-whistle-clang"];
const next = new Map();
export function tick(ctx) {
  const now = ctx.now();
  for (const p of ctx.place.players) {
    const due = next.get(p.id) ?? now + 4000;
    if (!next.has(p.id)) { next.set(p.id, due); continue; }
    if (now < due) continue;
    const f = p.feetPosition, r = ctx.random(), yaw = ((p.camera?.rotation?.yaw ?? 0) * Math.PI) / 180;
    let at, clip, vol, wait = 6000 + ctx.random() * 8000;
    if (r < 1 / 12) { // behind them: opposite the look
      const d = 2 + ctx.random();
      at = { x: f.x + Math.sin(yaw) * d, y: f.y + 1.2, z: f.z + Math.cos(yaw) * d };
      clip = NEAR[Math.floor(ctx.random() * NEAR.length)]; vol = 0.75; wait = 25000;
    } else if (r < 0.16) {
      const a = ctx.random() * 6.283;
      at = { x: f.x + Math.cos(a) * 120, y: f.y + 40, z: f.z + Math.sin(a) * 120 };
      clip = RARE[Math.floor(ctx.random() * RARE.length)]; vol = 0.9;
    } else {
      const a = ctx.random() * 6.283, d = 8 + ctx.random() * 14;
      at = { x: f.x + Math.cos(a) * d, y: f.y + 3 + ctx.random() * 27, z: f.z + Math.sin(a) * d };
      clip = FAR[Math.floor(ctx.random() * FAR.length)]; vol = 0.55 + ctx.random() * 0.25;
    }
    ctx.emit("playSound", { clip: SFX(clip), position: at, volume: vol, refDistance: 4, maxDistance: clip.includes("collapse") ? 400 : 60 }, { audience: { player: p.id } });
    if (vol === 0.75) ctx.emit("cameraPunch", { direction: { x: 0, y: 0, z: -1 }, intensity: 0.15 }, { audience: { player: p.id } });
    next.set(p.id, now + wait);
  }
}
