// Level 11 traffic: one car cruising its lane of the avenue, braking for red lights and for anyone in the road, looping end to end.
const CRUISE = 8.5, ACCEL = 4, BRAKE = 9, END = 78; // m/s, m/s², the avenue's far ends (my picks)
const TRAFFIC_SCAN_MS = 100, TRAFFIC_SCAN_RADIUS = 16;
const STOP = { 1: 2.6, "-1": 12.4 }; // the stop line before the crossing (z 4.6..10.4), per heading
export function update(ctx, dt) {
  const s = ctx.self, st = s.state, dir = st.dir; // +1 drives toward +z, -1 toward -z
  const m = (s.session.m ??= { v: CRUISE });
  const p = s.feetPosition;
  let want = CRUISE;
  const light = Number.isFinite(ctx.place.state.l11Light) ? ctx.place.state.l11Light : 0; // 0 green, 1 amber, 2 red (sim.js)
  const toLine = (STOP[dir] - p.z) * dir;
  if (light !== 0 && toLine > -0.5 && toLine < 14) want = Math.min(want, Math.max(0, (toLine - 0.5) * 0.9));
  for (const q of ctx.place.players) { // someone in the lane ahead: ease off, stop short
    const ahead = (q.feetPosition.z - p.z) * dir;
    if (Math.abs(q.feetPosition.x - p.x) < 1.8 && ahead > 0 && ahead < 14) want = Math.min(want, Math.max(0, (ahead - 4) * 0.8));
  }
  // Keep the broad search off the frame loop. Read the cached cars' current positions for braking.
  const now = ctx.now();
  if (now >= (m.scanAt ?? 0)) {
    m.scanAt = now + TRAFFIC_SCAN_MS;
    m.nearby = ctx.query({ tags: ["l11traffic"], radius: TRAFFIC_SCAN_RADIUS }).map(car => car.id);
  }
  for (const id of m.nearby ?? []) {
    if (id === s.id) continue;
    const pos = ctx.getObject(id)?.feetPosition;
    if (!pos) continue;
    const ahead = (pos.z - p.z) * dir;
    if (Math.abs(pos.x - p.x) < 1 && ahead > 0 && ahead < 14) want = Math.min(want, Math.max(0, (ahead - 7) * 0.8));
  }
  m.v += Math.max(-BRAKE * dt, Math.min(ACCEL * dt, want - m.v));
  let z = p.z + m.v * dir * dt;
  if (z * dir > END) { z = -END * dir; m.scanAt = 0; } // scan the new end of the block after wrapping
  s.feetPosition = { x: p.x, y: p.y, z };
}
