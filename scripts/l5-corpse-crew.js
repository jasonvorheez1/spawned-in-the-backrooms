// Level 5's cleanup: Odette the maid lifts any body she walks near onto her shoulder and carries it off on her rounds;
// a body nobody tends is gone after an hour of play (scripts/l5-staff.js, scripts/l5-rats.js).
const MAIDS = ["l5-odette"], REACH = 5, SETTLE = 20000, CARRY = 25000; // Savi's picks: a body lies 20 s before she'll touch it, she carries it 25 s
export const updateSchedule = { every: { seconds: 1 } };
export function update(ctx) {
  const now = ctx.now(), s = (ctx.self.session.c ??= {});
  for (const id of MAIDS) {
    const maid = ctx.getObject(id); if (!maid) continue;
    const held = s[id];
    if (held) {
      if (!ctx.getObject(held.body)) { delete s[id]; continue; }
      if (now - held.at > CARRY) { ctx.destroy(held.body); delete s[id]; maid.state.line = "There. Nobody saw anything."; maid.state.lineAt = now; }
      continue;
    }
    const body = ctx.query({ tags: ["remains"], center: maid.feetPosition, radius: REACH }).find((r) => r.state?.corpseAt && now - r.state.corpseAt > SETTLE);
    if (!body) continue;
    const o = ctx.getObject(body.id); if (!o) continue;
    o.ragdoll = null; o.tags = (o.tags ?? []).filter((t) => t !== "container" && t !== "remains");
    o.parent = id; o.feetPosition = { x: 0.1, y: 1.15, z: 0.05 }; o.rotation = { yaw: 90, pitch: 0, roll: 80 };
    ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-cloth-body-lifted-onto-shoulder-grunt.mp3", position: maid.feetPosition, volume: 0.7, maxDistance: 14 });
    maid.state.line = ["Another one. On my clean floor.", "Up you come. Don't drip.", "I'll put you somewhere nice. The boiler's nice."][Math.floor(ctx.random() * 3)]; maid.state.lineAt = now;
    s[id] = { body: body.id, at: now };
  }
}
