// the Gentleman of Level 5 holds court from the chair behind his desk (scripts/lib/l5-beast.js lays him there)
// seated idle; when someone steps into the office he points them to the chair across from him once, then talks with his hands while they stay
const CLIP = {
  sit: "cdn/clip-sit-loop.glb",
  talk: "cdn/clip-sitting-talking-loop.glb",
  point: "cdn/clip-sitting-pointing.glb",
  laugh: "cdn/clip-sitting-laughing-loop.glb",
};
const NEAR = 5.5; // m: inside the office's front half

export function onSpawn(ctx) {
  ctx.self.anim.sit = { clip: CLIP.sit, loop: "loop", weight: 1, blendIn: 0.3 };
}

export function update(ctx) {
  const me = ctx.self.feetPosition;
  if (!ctx.self.anim.sit) ctx.self.anim.sit = { clip: CLIP.sit, loop: "loop", weight: 1, blendIn: 0.3 };
  let near = null, bd = NEAR;
  for (const p of ctx.place.players) { const d = Math.hypot(p.feetPosition.x - me.x, p.feetPosition.z - me.z); if (d < bd) { bd = d; near = p; } }
  const talking = ctx.place.players.some((p) => String(p.state?.talkWith ?? "").endsWith("l5-beast"));
  const ses = ctx.self.session;
  if (near && !ses.greeted) { // someone came in: a welcoming point at the visitor's chair
    ses.greeted = true;
    ctx.self.anim.gesture = { clip: CLIP.point, loop: "once", weight: 1, blendIn: 0.25, blendOut: 0.4 };
  } else if (!near) ses.greeted = false;
  const want = talking ? CLIP.talk : null;
  if ((ctx.self.anim.chat?.clip ?? null) !== want) ctx.self.anim.chat = want ? { clip: want, loop: "loop", weight: 1, blendIn: 0.4 } : null;
  // now and then, unprompted, he finds something funny
  if (near && !talking && ctx.random() < 0.02) ctx.self.anim.gesture = { clip: CLIP.laugh, loop: "once", weight: 0.8, blendIn: 0.3, blendOut: 0.5 };
  ctx.sleep(near ? 0.5 : 2);
}
