// Level 11 traffic: one car cruising its lane of the avenue, braking for red lights and for anyone in the road, looping end to end.
const CRUISE = 8.5, ACCEL = 4, BRAKE = 9, END = 78; // m/s, m/s², the avenue's far ends (my picks)
const STOP = { 1: 2.6, "-1": 12.4 }; // the stop line before the crossing (z 4.6..10.4), per heading
export function update(ctx, dt) {
  const s = ctx.self, st = s.state, dir = st.dir; // +1 drives toward +z, -1 toward -z
  const m = (s.session.m ??= { v: CRUISE });
  const p = s.feetPosition;
  let want = CRUISE;
  const light = ctx.place.state.l11Light ?? 0; // 0 green, 1 amber, 2 red (sim.js)
  const toLine = (STOP[dir] - p.z) * dir;
  if (light !== 0 && toLine > -0.5 && toLine < 14) want = Math.min(want, Math.max(0, (toLine - 0.5) * 0.9));
  for (const q of ctx.place.players) { // someone in the lane ahead: ease off, stop short
    const ahead = (q.feetPosition.z - p.z) * dir;
    if (Math.abs(q.feetPosition.x - p.x) < 1.8 && ahead > 0 && ahead < 14) want = Math.min(want, Math.max(0, (ahead - 4) * 0.8));
  }
  for (const o of ctx.query({ tags: ["l11traffic"], radius: 14 })) { // the car in front
    const ahead = (o.feetPosition.z - p.z) * dir;
    if (Math.abs(o.feetPosition.x - p.x) < 1 && ahead > 0) want = Math.min(want, Math.max(0, (ahead - 7) * 0.8));
  }
  m.v += Math.max(-BRAKE * dt, Math.min(ACCEL * dt, want - m.v));
  let z = p.z + m.v * dir * dt;
  if (z * dir > END) z = -END * dir; // round the block: back in at the far end
  s.feetPosition = { x: p.x, y: p.y, z };
}
