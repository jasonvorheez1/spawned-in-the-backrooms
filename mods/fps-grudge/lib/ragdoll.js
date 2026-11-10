// Hit-driven ragdoll: the hitter MARKS the target's state (any machine), the target's own stepper APPLIES it.
import RG from "./data/ragdoll.yml";
export const RAGDOLL = RG;
// after hp has dropped by `d` from a shot fired at `from`
export function mark(t, d, from, now) {
  if (!from || !t?.state) return;
  const kill = (t.state.hp ?? 1) <= 0 && !t.state.rag; // every killing blow throws the body limp; a living hit only past the threshold
  if (!(d > RG.threshold) && !kill) return;
  const p = t.feetPosition ?? from, dx = p.x - from.x, dz = p.z - from.z, l = Math.hypot(dx, dz) || 1;
  t.state.rag = { at: now, dx: dx / l, dz: dz / l };
}
// in the body's own update: true while it lies limp (the caller skips its AI/animation for that tick)
export function step(ctx, w, now, dead) {
  const r = w.state.rag;
  if (r && r.at !== w.state.ragOn && now - r.at < RG.seconds * 1000) {
    w.state.ragOn = r.at;
    ctx.log("ragdoll: limp", { id: w.id, dead: !!dead });
    const m = RG.mass;
    w.ragdoll = { impulse: { x: r.dx * RG.push * m, y: RG.lift * m, z: r.dz * RG.push * m }, settleFreeze: !!dead, settleSeconds: 3, blendSeconds: RG.blend };
  }
  if (!w.state.ragOn) return false;
  if (dead) return true; // a killing blow stays down
  if (now - w.state.ragOn >= RG.seconds * 1000) { w.ragdoll = null; w.state.ragOn = null; return false; }
  return true;
}
