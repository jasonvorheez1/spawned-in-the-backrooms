// Level 69 side quest "Mile Markers" (Shelly Nov 17: "a quest from a new npc who wants to survey it").
// Wren Adeyemi, a M.E.G. surveyor stuck at a pull-off with a dead van, wants the highway measured: three survey beacons,
// clamped to the orange reflector posts the walls carry at 0.6, 1.2 and 1.8 km. Each plant means getting OUT of the car.
// Steps: 1 take the beacons, 2 plant three (l69beacon posts, scripts/l69-post.js), 3 come back and tell her what you saw.
// Reward (Savi's picks): 220 XP, $45, a road flare kit is a med kit and 2 almond water.
import { setQuest, tellQuest, finishLevelQuest } from "./quests.js";
export const WREN = "l69-npc-wren";
export const Q69 = { key: "l69q", id: "mile-markers", name: "Mile Markers", tips: {
  1: "Wren Adeyemi wants Level 69 measured. Hear her out beside the empty sedan in Boom Town.",
  2: "Sit in the empty sedan in Boom Town to reach Level 69. Clamp survey beacons to the orange reflector posts at 0.6, 1.2 and 1.8 km. You'll have to get out of the car.",
  3: "All three beacons are pinging. Bring the readings back to Wren in Boom Town.",
} };
const step = (ctx, p, n, text) => { const s = p.state; s.l69q = n; setQuest(s, Q69.id, { name: Q69.name, step: Q69.tips[n] }); if (text) tellQuest(ctx, p, text); };
export function plantBeacon(ctx, p, post) {
  const s = p?.state; if (!s) return "";
  if ((s.l69q ?? 0) !== 2) return "An orange reflector post. Someone painted a number on it: " + (post.state?.km ?? "?") + " km.";
  const done = s.l69planted ?? [];
  if (done.includes(post.id)) return "Your beacon's already on this one. Blinking.";
  s.l69planted = [...done, post.id];
  if (s.l69planted.length >= 3) { step(ctx, p, 3, `${Q69.name} · All three beacons pinging. Back to Wren in Boom Town.`); return "Beacon clamped. Three of three. Somewhere behind you a receiver is chirping."; }
  tellQuest(ctx, p, `${Q69.name} · Beacon ${s.l69planted.length} of 3 planted`);
  return `Beacon clamped. ${s.l69planted.length} of 3. Get back in the car.`;
}
export function l69Choices(id, s) {
  if (id !== WREN) return [];
  const q = s?.l69q ?? 0, out = [];
  if (!q) out.push({ text: "You're measuring this road?", tag: "Quest Start" });
  if (q === 2) out.push({ text: "Remind me where the posts are.", tag: "Quest" });
  if (q === 3) out.push({ text: "All three beacons are in.", tag: "Quest Turn-In" });
  if (q === 99 && !s.l69after) out.push({ text: "What does the survey say?", tag: "Quest" });
  return out;
}
export function handleDialogueQuest69(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase(), s = p?.state; if (!s || !npc) return null;
  const id = String(npc.id ?? "").split("/").pop(); if (id !== WREN) return null;
  const q = s.l69q ?? 0;
  if (t.includes("measuring this road") && !q) {
    step(ctx, p, 2, `Quest Started: ${Q69.name} · Plant 3 beacons on the reflector posts`);
    s.l69planted = [];
    return { reply: "Level 69. A highway that only goes one way. M.E.G. wants it measured and my van is under a tower somewhere over there. That sedan by me drops you onto it, keys in, every time. The walls carry orange reflector posts at point six, one point two and one point eight kilometres. Clamp one of these beacons on each and I can triangulate how far it really goes. You have to get out for every one, so park close and be quick. Something up there notices people standing on that road.", mood: "neutral" };
  }
  if (t.includes("where the posts are") && q === 2) return { reply: `Right-hand wall, orange, about chest height. Point six, one point two, one point eight kilometres. You've got ${(s.l69planted ?? []).length} in. Park close, leave the engine running, be quick. The sedan right here takes you back down.`, mood: "neutral" };
  if (t.includes("beacons are in") && q === 3) {
    finishLevelQuest(ctx, p, Q69.key, { ...Q69, key: Q69.key }, { xp: 220, cents: 4500, items: ["medkit", "almond", "almond"], text: "Mile Markers: the road is longer than the wall is old.", by: "meg" });
    return { reply: "I've got all three. Hang on. That can't be right. The spacing between them grows. Six hundred, then six-forty, then seven hundred. The road is stretching. Here. Med kit, water, and what's left of my per diem. Next time you go down, look for the tunnel. I\'m staying up here where the buildings only fall on you.", mood: "happy" };
  }
  if (t.includes("what does the survey say") && q === 99) { s.l69after = true; return { reply: "That the road gets longer the further you drive it. And that every time I look at the numbers, I hear someone whisper the next one before I read it. I've stopped looking.", mood: "sad" }; }
  return null;
}
