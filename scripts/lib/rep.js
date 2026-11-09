// Karma and faction reputation, Fallout: New Vegas style. Karma is what you are (one number, -100..100, secret from the people you meet);
// reputation is what each group thinks of you (-100..100 each). Both live on player.state (karma, rep = { group: n }) and are durable.
// Groups: who counts as whom (an npc's state.faction / faction5, else the prefix of its id). Tiers decide prices, who talks to you, and who shoots on sight.
//   Vilified (<= -60): the group attacks you on sight, wherever it sees you, and a holstered weapon does not calm it
//   Hated    (<= -35): its traders will not deal with you, its people are cold; they do not attack unless provoked
//   Disliked (<= -12): worse prices          Accepted (>= 12): a little better    Liked (>= 35): better still      Idolized (>= 60): the best, and they say so
export const GROUPS = {
  meg: { name: "M.E.G.", info: "the Major Explorer Group" },
  survivors: { name: "Survivors", info: "loners, camps and traders" },
  hotel: { name: "Homely Hotel", info: "the hotel and its staff" },
  surrender: { name: "Fort Surrender", info: "the shelter on Level 7" },
  lightless: { name: "The Lightless", info: "the cave's insane" },
  bntg: { name: "B.N.T.G.", info: "the Backrooms Nonaligned Trade Group" },
};
const MAP = { meg: "meg", hk: "meg", guard: "meg", camp: "meg", survivor: "survivors", trader: "survivors", pilgrim: "survivors", wanderer: "survivors", scavenger: "survivors", alef: "survivors",
  homely: "hotel", hotel: "hotel", orig: "hotel", surrender: "surrender", lightless: "lightless", bntg: "bntg" };
const PREFIX = { bntg: "bntg", meg: "meg", hk: "meg", surv: "survivors", omega: "survivors", l5: "hotel", homely: "hotel", tbd: "survivors", gamma: "meg", l61: "survivors" };
export function groupOf(it) {
  const f = it?.state?.faction5 ?? it?.state?.faction; if (f && MAP[f]) return MAP[f];
  const id = String(it?.id ?? "").split("/").pop(), p = id.split("-")[0];
  return PREFIX[p] ?? "survivors";
}
export const TIERS = [[60, "Idolized"], [35, "Liked"], [12, "Accepted"], [-11.99, "Neutral"], [-34.99, "Disliked"], [-59.99, "Hated"], [-1e9, "Vilified"]];
export const tierOf = (n) => (TIERS.find(([lo]) => n >= lo) ?? TIERS[TIERS.length - 1])[1];
export const tierColor = (n) => (n >= 35 ? "#9bd27a" : n >= 12 ? "#c4d88a" : n > -12 ? "#d8d0b0" : n > -35 ? "#e0a050" : "#e06050");
export const repOf = (s, g) => Math.max(-100, Math.min(100, Math.round((s?.rep?.[g] ?? 0) * 10) / 10));
export const standing = (s, it) => repOf(s, groupOf(it));
export const isVilified = (s, it) => groupOf(it) !== "lightless" && repOf(s, groupOf(it)) <= -60;
export const isHated = (s, it) => repOf(s, groupOf(it)) <= -35;
// price change from standing, as a discount fraction (negative = dearer)
export const repDisc = (s, it) => { const r = standing(s, it); return r >= 60 ? 0.2 : r >= 35 ? 0.12 : r >= 12 ? 0.05 : r > -12 ? 0 : r > -35 ? -0.15 : -0.35 };
export const karmaOf = (s) => Math.max(-100, Math.min(100, Math.round(s?.karma ?? 0)));
export const karmaTitle = (k) => (k >= 60 ? "Very Good" : k >= 25 ? "Good" : k > -25 ? "Neutral" : k > -60 ? "Evil" : "Very Evil");
export const karmaColor = (k) => (k >= 25 ? "#9bd27a" : k > -25 ? "#d8d0b0" : "#e06050");

// writes: both return a one-line notice when a tier changed, else ""
export function addRep(s, g, d) {
  if (!g || !d) return "";
  const was = repOf(s, g), now = Math.max(-100, Math.min(100, was + d));
  s.rep = { ...(s.rep ?? {}), [g]: Math.round(now * 10) / 10 };
  return tierOf(was) !== tierOf(now) ? `Reputation with ${GROUPS[g]?.name ?? g}: ${tierOf(now)}` : "";
}
export function addKarma(s, d) {
  const was = karmaOf(s); s.karma = Math.max(-100, Math.min(100, (s.karma ?? 0) + d));
  return karmaTitle(was) !== karmaTitle(karmaOf(s)) ? `Karma: ${karmaTitle(karmaOf(s))}` : "";
}
const say = (ctx, s, ...ms) => { const m = ms.filter(Boolean).join(" · "); if (m) s.notice = { text: m, at: ctx.now() } };

// a player killed an npc: karma for the deed, reputation for who saw it (the Fallout rule: a witnessed killing costs standing, an unseen one only costs karma)
export function repKill(ctx, victim, killer, seen = []) {
  const s = killer?.state; if (!s || !victim || (victim.tags ?? []).includes("faceling")) return; // facelings are not people
  const g = groupOf(victim), provoked = !!victim.state?.angry?.[killer.id], msgs = [];
  if (g === "lightless") { // the cave's insane: nobody mourns them
    msgs.push(addKarma(s, 2), addRep(s, "meg", 2), addRep(s, "survivors", 2)); say(ctx, s, ...msgs); return;
  }
  const trader = ["trader", "quarter", "medic", "smith"].includes(victim.state?.role);
  msgs.push(addKarma(s, provoked ? -3 : trader ? -25 : -15));
  if (seen.length) {
    msgs.push(addRep(s, g, provoked ? -4 : -18));
    const others = new Set(seen.map((id) => groupOf(ctx.getObject(id))).filter((x) => x && x !== g && x !== "lightless"));
    for (const o of others) msgs.push(addRep(s, o, provoked ? 0 : -3));
  }
  say(ctx, s, ...msgs);
}
// a kindness: karma and the group's standing
export function repKind(ctx, who, it, karma = 1, rep = 2) { const s = who?.state; if (!s) return; say(ctx, s, addKarma(s, karma), addRep(s, groupOf(it), rep)) }
// a fair trade nudges standing up a hair; never past what trading can earn
export function repTrade(ctx, who, it) { const s = who?.state; if (!s) return; const g = groupOf(it); if (repOf(s, g) < 30) s.rep = { ...(s.rep ?? {}), [g]: Math.round((repOf(s, g) + 0.2) * 10) / 10 } }
// a line for the language model about how this group sees the player
export function repLine(s, it) {
  const g = groupOf(it), r = repOf(s, g), k = karmaOf(s);
  return `Your people (${GROUPS[g]?.name ?? g}) think of this wanderer as ${tierOf(r)} (${r}).${r <= -35 ? " They have wronged your people; you are cold, short, and do not want to help." : r >= 35 ? " They have done right by your people; you are warmer than you would be to a stranger." : ""}${k <= -25 ? " Word is they are a bad person." : k >= 25 ? " Word is they are decent." : ""}`;
}
