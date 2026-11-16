// FeelsGoodRig: a hold copied with COPY HOLD → PLAYERS (world.state.heldGizmo.holds[item]) reaches this player's left hand to the same point on the item they hold.
// A game script that already drives the left hand wins: this only fills an empty left hand. Fingers close on the grip when the rig has them; a cradle copy stays palm up.
const FING = ["Index", "Middle", "Ring", "Pinky"];
export const updateSchedule = { every: { seconds: 0.25 } };
export function update(ctx) {
  const me = ctx.self, ss = me.session, holds = ctx.world.state?.heldGizmo?.holds;
  let held = null; for (const k of (me.children ?? [])) { const o = ctx.getObject(k?.id ?? k); /* Nov 9: own children, never the city census */ if (o?.parent?.id === me.id && /RightHand$/.test(String(o.attachment?.bone ?? ""))) { held = o; break; } }
  const h = held && holds?.[held.id.split("/").pop()], b = me.bones ?? {}, cur = b["mixamorig:LeftHand"];
  if (cur && ss.laid !== JSON.stringify(cur)) { ss.laid = null; return ctx.sleep(1); } // someone else's hand: leave it
  if (!h) { if (ss.laid) { const n = { ...b }; delete n["mixamorig:LeftHand"]; for (const k of ss.keys ?? []) delete n[k]; ss.keys = null; me.bones = n; ss.laid = null; } return ctx.sleep(1); }
  const L = { reach: { to: { object: held.id + (h.sub ?? ""), offset: h.grip, ...(h.rot ? { rotation: h.rot } : {}) }, pole: { object: me.id, offset: { x: -0.5, y: 0.45, z: -0.25 } }, weight: 1, blendIn: 0.15, blendOut: 0.15 } }, k = JSON.stringify(L);
  if (ss.laid === k) return;
  const n = { ...b, "mixamorig:LeftHand": L };
  if (h.fingers) for (const [k, v] of Object.entries(h.fingers)) { const m = /^(Left|Right)(\w+?)([1-3])$/.exec(k); if (m) n["mixamorig:" + m[1] + "Hand" + m[2] + m[3]] = v; } // the source's own finger sliders, both hands
  else if (!h.cradle && ss.fingers !== false) for (const f of FING) [1, 2, 3].forEach((i, j) => { n["mixamorig:LeftHand" + f + i] = { roll: [55, 65, 45][j] }; }); // a closed fist round the grip
  ss.keys = Object.keys(n).filter((x) => /Hand(Thumb|Index|Middle|Ring|Pinky)[1-3]$/.test(x) && n[x] !== b[x]); // only what this script laid comes off when the gun goes
  me.bones = n; ss.laid = k;
}
