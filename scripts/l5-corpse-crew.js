// Level 5's cleanup: Odette the maid lifts any body she walks near onto her shoulder and carries it off on her rounds;
// a body nobody tends is gone after an hour of play (scripts/l5-staff.js, scripts/l5-rats.js).
import { speak } from "./lib/l5-people.js";
const MAIDS = ["l5-odette"], REACH = 5, SETTLE = 20000, CARRY = 25000; // Savi's picks: a body lies 20 s before she'll touch it, she carries it 25 s
export const updateSchedule = { every: { seconds: 1 } };
export function update(ctx) {
  const now = ctx.now(), s = (ctx.self.session.c ??= {});
  talkOver(ctx, now, s);
  for (const id of MAIDS) {
    const maid = ctx.getObject(id); if (!maid) continue;
    const held = s[id];
    if (held) {
      if (!ctx.getObject(held.body)) { delete s[id]; continue; }
      if (now - held.at > CARRY) { ctx.destroy(held.body); delete s[id]; speak(ctx, maid, "There. Nobody saw anything."); }
      continue;
    }
    const body = ctx.query({ tags: ["remains"], center: maid.feetPosition, radius: REACH }).find((r) => r.state?.corpseAt && now - r.state.corpseAt > SETTLE);
    if (!body) continue;
    const o = ctx.getObject(body.id); if (!o) continue;
    o.ragdoll = null; o.tags = (o.tags ?? []).filter((t) => t !== "container" && t !== "remains");
    o.parent = id; o.feetPosition = { x: 0.1, y: 1.15, z: 0.05 }; o.rotation = { yaw: 90, pitch: 0, roll: 80 };
    ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-cloth-body-lifted-onto-shoulder-grunt.mp3", position: maid.feetPosition, volume: 0.7, maxDistance: 14 });
    speak(ctx, maid, ["Another one. On my clean floor.", "Up you come. Don't drip.", "I'll put you somewhere nice. The boiler's nice."][Math.floor(ctx.random() * 3)]);
    s[id] = { body: body.id, at: now };
  }
}

// residents who come across a body stop and talk it over: who it was, and who did it if anyone saw
function talkOver(ctx, now, s) {
  s.said ??= {};
  const bodies = ctx.query({ anyTags: ["remains", "npc"] }).filter((r) => r.state?.corpseAt && now - r.state.corpseAt < 600000 && !s.said[r.id]);
  for (const b of bodies) {
    const near = ctx.query({ tags: ["npc"], center: b.feetPosition, radius: 7 }).filter((n) => n.id !== b.id && !n.state?.dead).map((n) => ctx.getObject(n.id)).filter(Boolean);
    if (near.length < 1) continue;
    s.said[b.id] = true;
    const who = b.state?.name ?? "that", by = b.state?.killedBy, saw = (b.state?.witnesses ?? []).some((w) => near.some((n) => n.id === w));
    const [a, c] = near;
    const first = ["Oh no. Is that " + who.replace(/'s body$/, "") + "?", "Somebody come look at this.", "Don't touch it. Just... don't."][Math.floor(ctx.random() * 3)];
    speak(ctx, a, first);
    const second = saw && by ? "I saw it. It was " + by + ". Plain as day." : by && (b.state?.witnesses ?? []).length ? "Word is it was " + by + ". Somebody saw." : "Nobody saw a thing. That's what scares me.";
    ctx.after(3.5, "say2", { id: (c ?? a).id, t: second });
    if (saw && by) for (const n of near) { n.state.suspect = by; }
  }
}
export function say2(ctx, { id, t }) { const o = ctx.getObject(id); if (o) speak(ctx, o, t); }
