// how hard a crouched wanderer is to see, shared by every hunter's sight and the player's own HUD read
import S from "./data/sneak.yml";
export { S as SNEAK };
export function crouchMul(p) {
  const st = p?.state; if (!st?.crouch) return 1;
  const v = p.velocity ?? {}, moving = Math.hypot(v.x ?? 0, v.z ?? 0) > 0.4;
  return (moving ? S.crouchMove : S.crouchStill) * (st.dark ? S.darkMul : 1) * (st.light ? S.lightMul : 1);
}
