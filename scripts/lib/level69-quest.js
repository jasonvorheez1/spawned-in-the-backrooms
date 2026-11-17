// Level 69 side quest "Mile Markers" (Shelly Nov 17: "a quest from a new npc who wants to survey it").
// Wren Adeyemi, a M.E.G. surveyor stuck at a pull-off with a dead van, wants the highway measured: three survey beacons,
// clamped to the orange reflector posts the walls carry at 0.6, 1.2 and 1.8 km. Each plant means getting OUT of the car.
// Steps: 1 take the beacons, 2 plant three (l69beacon posts, scripts/l69-post.js), 3 come back and tell her what you saw.
// Reward (Savi's picks): 220 XP, $45, a road flare kit is a med kit and 2 almond water.
import { setQuest, tellQuest, finishLevelQuest } from "./quests.js";
export const WREN = "l69-npc-wren";
export const Q69 = { key: "l69q", id: "mile-markers", name: "Mile Markers", tips: {
  1: "Wren Adeyemi wants Level 69 measured. Hear her out beside the empty sedan in Boom Town.",
  2: "Take the sedan beside Wren into Level 69. Stop at the orange posts on the right wall at 0.6, 1.2 and 1.8 km; get out and clamp a beacon to each.",
  3: "The three beacons are sending. Take the left-hand tunnel at 2.2 km to Level 11, then return through the scaffold site to Wren in Boom Town.",
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
    return { reply: "The road through this sedan. We call it Level 69. I want three fixed readings from it; my last set came back farther apart than the posts I'd put them on. Take these beacons and clamp them to the orange posts on the right wall: point six, one point two and one point eight kilometres. You'll have to leave the car each time. Park close and don't linger. Something above the road comes down when you're on foot. The beacons transmit to me here.", mood: "neutral" };
  }
  if (t.includes("where the posts are") && q === 2) return { reply: `Right-hand wall, orange posts. Point six, one point two and one point eight kilometres. You've placed ${(s.l69planted ?? []).length} so far. Park close and get back in quickly. After the last one, take the left-hand tunnel; it leads to Level 11. The scaffold there brings you back here.`, mood: "neutral" };
  if (t.includes("beacons are in") && q === 3) {
    finishLevelQuest(ctx, p, Q69.key, { ...Q69, key: Q69.key }, { xp: 220, cents: 4500, items: ["medkit", "almond", "almond"], text: "Mile Markers: the road is longer than the wall is old.", by: "meg" });
    return { reply: "All three signals made it. Thank you. The posts were supposed to be six hundred metres apart; the readings say the gaps get wider. I need another set before I call that proof the road's stretching, but at least I have somewhere to start. Here's the med kit, water and pay I promised. I'll send the numbers to Beta with a warning about stopping.", mood: "happy" };
  }
  if (t.includes("what does the survey say") && q === 99) { s.l69after = true; return { reply: "Either the road changes length or my equipment is lying to me. Both are possible. The strange part is that I heard the last number before the receiver printed it. I haven't told Beta that bit yet.", mood: "sad" }; }
  return null;
}
