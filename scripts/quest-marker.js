// the active objective's marker in the world: an amber diamond over the goal with its distance, drawn for this player alone
import { questMark } from "./lib/quest-mark.js";
export const updateSchedule = { every: { seconds: 0.25 } };
const ART = `<svg viewBox='0 0 60 80' width='0.55m' billboard='full'><g filter='drop-shadow(0 0 5px #ffb040)'><path d='M30 4 L46 26 L30 48 L14 26 Z' fill='#ffc44d' stroke='#3a2604' stroke-width='3'/><path d='M30 14 L38 26 L30 38 L22 26 Z' fill='#fff3c4'/></g><text x='30' y='72' font-family='sans-serif' font-size='15' font-weight='bold' text-anchor='middle' fill='#ffd98a' stroke='#1a1004' stroke-width='3' paint-order='stroke'>{{ state.d }} m</text></svg>`;
export function update(ctx) {
  const me = ctx.self; if (!me.isLocal) return ctx.sleep(5);
  const id = "qmark-" + me.id.split(":").pop(), have = ctx.place.objects[id];
  const t = questMark(ctx, me), p = me.feetPosition;
  const d = t ? Math.hypot(t.x - p.x, t.z - p.z) : 0;
  if (!t || d < 2.5 || me.state.cut || me.state.menuOpen) { if (have) ctx.destroy(id); return; }
  const at = { x: t.x, y: t.y + 2.5, z: t.z }, dd = Math.round(d);
  if (!have) { ctx.spawn(id, { feetPosition: at, audience: "local", scope: "session", vector: ART, state: { d: dd } }); return; }
  const f = have.feetPosition;
  if (Math.abs(f.x - at.x) + Math.abs(f.y - at.y) + Math.abs(f.z - at.z) > 0.2) have.feetPosition = at;
  if (have.state.d !== dd) have.state.d = dd;
}
