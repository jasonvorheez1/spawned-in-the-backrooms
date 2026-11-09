// how hard a crouched wanderer is to see, shared by every hunter's sight and the player's own HUD read
import S from "./data/sneak.yml";
export { S as SNEAK };
// Entity rotations are often quaternions, including on animated NPCs.
export function yawOf(r) {
  if (typeof r === 'number') return r;
  if (r?.yaw != null) return r.yaw;
  return r?.w != null ? Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.y * r.y + r.x * r.x)) * 180 / Math.PI : null;
}
export function crouchMul(p) {
  const st = p?.state; if (!st?.crouch) return 1;
  const v = p.velocity ?? {}, moving = Math.hypot(v.x ?? 0, v.z ?? 0) > 0.4;
  return (moving ? S.crouchMove : S.crouchStill) * (st.dark ? S.darkMul : 1) * (st.light ? S.lightMul : 1);
}
