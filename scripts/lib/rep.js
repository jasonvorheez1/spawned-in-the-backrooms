// Karma and faction reputation, Fallout: New Vegas style. Karma is what you are (one number, -100..100, secret from the people you meet);
// reputation is what each group thinks of you (-100..100 each). Both live on player.state (karma, rep = { group: n }) and are durable.
// Groups: who counts as whom (an npc's state.faction / faction5, else the prefix of its id). Tiers decide prices, who talks to you, and who shoots on sight.
//   Vilified (<= -60): organized factions attack on sight; unaffiliated survivors still react to local incidents
//   Hated    (<= -35): its traders will not deal with you, its people are cold; they do not attack unless provoked
//   Disliked (<= -12): worse prices          Accepted (>= 12): a little better    Liked (>= 35): better still      Idolized (>= 60): the best, and they say so
export const GROUPS = {
  meg: { name: "M.E.G.", info: "the Major Explorer Group" },
  survivors: { name: "Survivors", info: "loners, camps and traders" },
  hotel: { name: "Homely Hotel", info: "the hotel and its staff" },
  surrender: { name: "Fort Surrender", info: "the shelter on Level 7" },
  lightless: { name: "The Lightless", info: "the cave's insane" },
  bntg: { name: "B.N.T.G.", info: "the Backrooms Nonaligned Trade Group" },
  rink: { name: "Rink Facelings", info: "the faces that run Level 31" },
  froid: { name: "Kingdom of Froidetown", info: "Level 70's parliament, its River Guard and its townsfolk" },
  gelu: { name: "Carnifices of Gelu", info: "the frost cult camped in Iceshed" },
  amber: { name: "Camp Amber", info: "wanderers who keep supply stops in the Hub" },
};
// New Vegas reputation: fame and infamy are kept apart per faction (s.fame[g], s.infamy[g], 0..100); s.rep[g] stays the net (fame - infamy) every older reader uses.
// Shelly Nov 13: helping one faction never hurts another. RIVALS is a record of who opposes whom, read by nothing that moves standing.
export const RIVALS = { meg: ["bntg"], bntg: ["meg", "rink"], froid: ["gelu"], gelu: ["froid"], rink: ["bntg"] };
const RIVAL_CUT = 1 / 3;
const LV = (n) => (n >= 60 ? 3 : n >= 35 ? 2 : n >= 12 ? 1 : 0);
// TITLE[fame level][infamy level], the game's own grid
const TITLE = [["Neutral", "Shunned", "Hated", "Vilified"], ["Accepted", "Mixed", "Sneering Punk", "Merciful Thug"], ["Liked", "Smiling Troublemaker", "Unpredictable", "Soft-Hearted Devil"], ["Idolized", "Good-Natured Rascal", "Dark Hero", "Wild Child"]];
// an older save: its net becomes fame or infamy; a quest that wrote s.rep straight (Level 31, Level 70 routes) moves fame or infamy to match it
const seed = (s, g) => {
  const r = s?.rep?.[g] ?? 0; let f = s?.fame?.[g] ?? Math.max(0, r), i = s?.infamy?.[g] ?? Math.max(0, -r);
  const gap = s?.rep?.[g] == null ? 0 : r - (f - i); if (Math.abs(gap) > 0.5) { if (gap > 0) f = Math.min(100, f + gap); else i = Math.min(100, i - gap) }
  return { f, i };
};
// a faction's own uniform lets you pass for one of them at a distance; up close (DISGUISE_NEAR m) they see through it
export const UNIFORMS = { meg: ["megjacket", "cpjacket", "lljacket", "qmvest", "wwplate"], bntg: ["bntgvest", "bntgcoat", "bntgguard"] };
export const DISGUISE_NEAR = 3;
export const fameOf = (s, g) => Math.round(seed(s, g).f);
export const infamyOf = (s, g) => Math.round(seed(s, g).i);
export const titleOf = (s, g) => TITLE[LV(fameOf(s, g))][LV(infamyOf(s, g))];
export const titleColor = (s, g) => { const f = LV(fameOf(s, g)), i = LV(infamyOf(s, g)); return i === 0 ? (f >= 2 ? "#9bd27a" : f ? "#c4d88a" : "#d8d0b0") : f === 0 ? (i >= 2 ? "#e06050" : "#e0a050") : "#d8b860" };
const MAP = { meg: "meg", hk: "meg", guard: "meg", camp: "meg", survivor: "survivors", trader: "survivors", pilgrim: "survivors", wanderer: "survivors", scavenger: "survivors", alef: "survivors",
  homely: "hotel", hotel: "hotel", orig: "hotel", surrender: "surrender", lightless: "lightless", bntg: "bntg", concession: "bntg", rink: "rink", froid: "froid", gelu: "gelu" };
const PREFIX = { bntg: "bntg", meg: "meg", hk: "meg", surv: "survivors", omega: "survivors", l5: "hotel", homely: "hotel", tbd: "survivors", gamma: "meg", l61: "survivors" };
export function groupOf(it) {
  if (String(it?.id ?? "").split("/").pop().startsWith("hub-amber")) return "amber";
  const f = it?.state?.faction5 ?? it?.state?.faction4 ?? it?.state?.faction; if (f && GROUPS[f]) return f; if (f && MAP[f]) return MAP[f];
  const id = String(it?.id ?? "").split("/").pop(), p = id.split("-")[0];
  return PREFIX[p] ?? "survivors";
}
export const TIERS = [[60, "Idolized"], [35, "Liked"], [12, "Accepted"], [-11.99, "Neutral"], [-34.99, "Disliked"], [-59.99, "Hated"], [-1e9, "Vilified"]];
export const tierOf = (n) => (TIERS.find(([lo]) => n >= lo) ?? TIERS[TIERS.length - 1])[1];
export const tierColor = (n) => (n >= 35 ? "#9bd27a" : n >= 12 ? "#c4d88a" : n > -12 ? "#d8d0b0" : n > -35 ? "#e0a050" : "#e06050");
export const repOf = (s, g) => Math.max(-100, Math.min(100, Math.round((s?.rep?.[g] ?? 0) * 10) / 10));
export const standing = (s, it) => repOf(s, groupOf(it));
// shot on sight: Vilified, Hated or Merciful Thug (infamy high, little fame to soften it); a Soft-Hearted Devil or Wild Child is let be
export const isVilified = (s, it) => { const g = groupOf(it); if (["lightless", "survivors"].includes(g)) return false; return (infamyOf(s, g) >= 60 && fameOf(s, g) < 35) || (infamyOf(s, g) >= 35 && fameOf(s, g) < 12) };
export const isHated = (s, it) => { const g = groupOf(it); return infamyOf(s, g) >= 35 && fameOf(s, g) < 35 };
// price change from standing, as a discount fraction (negative = dearer)
export const repDisc = (s, it) => { const r = standing(s, it); return r >= 60 ? 0.2 : r >= 35 ? 0.12 : r >= 12 ? 0.05 : r > -12 ? 0 : r > -35 ? -0.15 : -0.35 };
export const karmaOf = (s) => Math.max(-100, Math.min(100, Math.round(s?.karma ?? 0)));
export const karmaTitle = (k) => (k >= 60 ? "Very Good" : k >= 25 ? "Good" : k > -25 ? "Neutral" : k > -60 ? "Evil" : "Very Evil");
export const karmaColor = (k) => (k >= 25 ? "#9bd27a" : k > -25 ? "#d8d0b0" : "#e06050");

// M.E.G. honorary ranks (Shelly Nov 13 revamp): earned by fame, lost while they think you're trouble. Thresholds match the quartermasters' gear gates (shops.yml). Savi's picks.
export const MEG_RANKS = [[75, "Team Lead"], [55, "Senior Operative"], [40, "Operative"], [25, "Field Volunteer"], [12, "Associate"]];
export const megRank = (s) => (infamyOf(s, "meg") >= 35 ? null : (MEG_RANKS.find(([lo]) => fameOf(s, "meg") >= lo)?.[1] ?? null));
// B.N.T.G. standing (Shelly Nov 13 "expand upon b.n.t.g"): its wiki ranks run by the company ladder, Savi's thresholds
export const BNTG_RANKS = [[75, "Executive Trader"], [55, "Senior Broker"], [40, "Licensed Trader"], [25, "Courier"], [12, "Affiliated Wanderer"]];
export const bntgRank = (s) => (infamyOf(s, "bntg") >= 35 ? null : (BNTG_RANKS.find(([lo]) => fameOf(s, "bntg") >= lo)?.[1] ?? null));
const RANKS = { meg: [MEG_RANKS, megRank, "megRank", "M.E.G. rank"], bntg: [BNTG_RANKS, bntgRank, "bntgRank", "B.N.T.G. rank"] };
export const rankOf = (s, g) => RANKS[g]?.[1](s) ?? null;
// writes: both return a one-line notice when a tier changed, else ""
function bump(s, g, d) { // one faction's fame (d > 0) or infamy (d < 0); returns the new title's notice
  const was = titleOf(s, g), c = seed(s, g), cap = (n) => Math.round(Math.max(0, Math.min(100, n)) * 10) / 10;
  if (d > 0) c.f = cap(c.f + d); else c.i = cap(c.i - d);
  s.fame = { ...(s.fame ?? {}), [g]: c.f }; s.infamy = { ...(s.infamy ?? {}), [g]: c.i };
  s.rep = { ...(s.rep ?? {}), [g]: cap(50 + (c.f - c.i) / 2) * 2 - 100 };
  const now = titleOf(s, g), R = RANKS[g], rk = R ? R[1](s) : null;
  if (R && rk !== (s[R[2]] ?? null)) { const L = R[0], was2 = s[R[2]], up = rk && (!was2 || L.findIndex(([, n]) => n === rk) < L.findIndex(([, n]) => n === was2)); s[R[2]] = rk; if (up) return `${R[3]}: ${rk}`; }
  return was !== now ? `${GROUPS[g]?.name ?? g}: ${now}` : "";
}
export function addRep(s, g, d, reason) {
  if (!g || !d) return "";
  const before = d > 0 ? fameOf(s, g) : infamyOf(s, g);
  const out = [bump(s, g, d)];
  const after = d > 0 ? fameOf(s, g) : infamyOf(s, g), change = after - before;
  if (reason && change > 0) s.repHistory = [...(s.repHistory ?? []), { group: g, kind: d > 0 ? "fame" : "infamy", amount: change, reason: String(reason).slice(0, 160) }].slice(-30);
  return out.filter(Boolean).join(" · ");
}
export function addKarma(s, d) {
  const was = karmaOf(s); s.karma = Math.max(-100, Math.min(100, (s.karma ?? 0) + d));
  return karmaTitle(was) !== karmaTitle(karmaOf(s)) ? `Karma: ${karmaTitle(karmaOf(s))}` : "";
}
const say = (ctx, s, ...ms) => { const m = ms.filter(Boolean).join(" · "); if (m) s.notice = { text: m, at: ctx.now() } };

// a player killed an npc: karma for the deed, reputation for who saw it (the Fallout rule: a witnessed killing costs standing, an unseen one only costs karma)
export function repKill(ctx, victim, killer, seen = [], provoked = false) {
  const s = killer?.state; if (!s || !victim || (victim.tags ?? []).includes("faceling")) return; // facelings are not people
  const g = groupOf(victim), msgs = [];
  if (g === "lightless") { // the cave's insane: nobody mourns them
    msgs.push(addKarma(s, 2), addRep(s, "meg", 2), addRep(s, "survivors", 2)); say(ctx, s, ...msgs); return;
  }
  const trader = ["trader", "quarter", "medic", "smith"].includes(victim.state?.role);
  msgs.push(addKarma(s, provoked ? -3 : trader ? -25 : -15));
  if (seen.some(id => { const witness = ctx.getObject(id); return witness && groupOf(witness) === g; })) {
    msgs.push(addRep(s, g, provoked ? -4 : -18, `Witnessed killing of ${String(victim.state?.name ?? "a faction member").split(" ·")[0]}`));
  }
  say(ctx, s, ...msgs);
}
// a kindness: karma and the group's standing
export function repKind(ctx, who, it, karma = 1, rep = 2) { const s = who?.state; if (!s) return; say(ctx, s, addKarma(s, karma), addRep(s, groupOf(it), rep)) }
// a fair trade nudges standing up a hair; never past what trading can earn
export function repTrade(ctx, who, it) { const s = who?.state; if (!s) return; const g = groupOf(it); if (fameOf(s, g) < 30) bump(s, g, 0.2) }
// a line for the language model about how this group sees the player
export function repLine(s, it) {
  const g = groupOf(it), r = repOf(s, g), k = karmaOf(s);
  return `Your people (${GROUPS[g]?.name ?? g}) think of this wanderer as ${titleOf(s, g)} (${r}).${g === "meg" && megRank(s) ? ` The M.E.G. has made them an honorary ${megRank(s)}; you may use it.` : ""}${g === "bntg" && bntgRank(s) ? ` The B.N.T.G. books list them as a ${bntgRank(s)}; you may use it.` : ""}${r <= -35 ? " They have wronged your people; you are cold, short, and do not want to help." : r >= 35 ? " They have done right by your people; you are warmer than you would be to a stranger." : ""}${k <= -25 ? " Word is they are a bad person." : k >= 25 ? " Word is they are decent." : ""}`;
}
