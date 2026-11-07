// A place in Level 6 that does something to you as you reach it: a line in your head, a cost in sanity, a sound.
// state: { text, san, clip, vol, every } . once per player per `every` seconds. Placed by places/level6/sim.js.
export function onTriggerEnter(ctx, other) {
  if (!other?.state || other.state.level == null) return; // players only
  const st = ctx.self.state, now = ctx.now(), seen = (ctx.self.session.seen ??= {});
  if (now - (seen[other.id] ?? -1e9) < (st.every ?? 90) * 1000) return;
  seen[other.id] = now;
  if (st.text) other.state.notice = { text: st.text, at: now };
  if (st.san) other.state.sanity = Math.max(0, (other.state.sanity ?? 100) - st.san);
  if (st.clip) {
    const p = ctx.self.feetPosition, f = st.from ?? { x: 0, z: 0 };
    ctx.emit("playSound", { clip: st.clip, position: { x: p.x + f.x, y: 1.2, z: p.z + f.z }, volume: st.vol ?? 0.6, refDistance: 2, maxDistance: 16 }, { audience: { player: other.id } });
  }
}
