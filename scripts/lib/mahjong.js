// Mahjong rules, shared by the player's game (scripts/mahjong.js) and its panel (scripts/mahjong-ui.js).
// Tiles are codes: suits "d"ots "b"amboo "c"haracters 1-9, honours "w1-w4" (winds E S W N) and "r1-r3" (red, green, white dragons). 4 of each = 136.
// A hand is the tiles held in the fist (concealed) plus melds [{k:"pon"|"chi", tiles:[...sorted], from}] laid face-up by calls.
export const SUITS = ["d", "b", "c"];
export function fullSet() { const t = []; for (const s of SUITS) for (let n = 1; n <= 9; n++) for (let k = 0; k < 4; k++) t.push(s + n); for (let n = 1; n <= 4; n++) for (let k = 0; k < 4; k++) t.push("w" + n); for (let n = 1; n <= 3; n++) for (let k = 0; k < 4; k++) t.push("r" + n); return t; }
const ORDER = { d: 0, b: 1, c: 2, w: 3, r: 4 };
export const sortHand = (h) => [...h].sort((a, b) => ORDER[a[0]] - ORDER[b[0]] || +a.slice(1) - +b.slice(1));
export const isSuit = (t) => SUITS.includes(t[0]);
export const NAMES = { d: "Dots", b: "Bamboo", c: "Chars", w1: "East", w2: "South", w3: "West", w4: "North", r1: "Red", r2: "Green", r3: "White" };
export const tileName = (t) => (isSuit(t) ? `${t.slice(1)} ${NAMES[t[0]]}` : `${NAMES[t]} ${t[0] === "w" ? "Wind" : "Dragon"}`);

// every way to split tiles into sets (three alike, or a run of three in one suit): [[{k:"pon"|"chi", t:lowest tile}]]
function setsAll(h) {
  if (!h.length) return [[]];
  const t = h[0], res = [];
  if (h[1] === t && h[2] === t) for (const r of setsAll(h.slice(3))) res.push([{ k: "pon", t }, ...r]);
  if (isSuit(t)) {
    const n = +t.slice(1), a = t[0] + (n + 1), b = t[0] + (n + 2), i = h.indexOf(a), j = h.indexOf(b);
    if (i > 0 && j > 0) { const r = h.slice(1); r.splice(r.indexOf(a), 1); r.splice(r.indexOf(b), 1); for (const q of setsAll(r)) res.push([{ k: "chi", t }, ...q]); }
  }
  return res;
}
// ways to read the concealed tiles as sets plus one pair
export function decompose(hand) {
  if (hand.length % 3 !== 2) return [];
  const h = sortHand(hand), out = [], seen = new Set();
  for (let i = 0; i < h.length - 1; i++) {
    if (h[i] !== h[i + 1] || seen.has(h[i])) continue; seen.add(h[i]);
    const rest = h.slice(); rest.splice(i, 2);
    for (const s of setsAll(rest)) out.push({ pair: h[i], sets: s });
  }
  return out;
}
// a winning hand: the concealed tiles (14 less three per meld) as sets and a pair
export const isWin = (hand) => decompose(hand).length > 0;

const runOf = (t) => [t, t[0] + (+t.slice(1) + 1), t[0] + (+t.slice(1) + 2)];
// scoring (fan): the best reading of the hand. { hand, melds, selfDraw, seat (0 = East), last (the wall's last tile) }
export function scoreHand({ hand, melds = [], selfDraw = false, seat = 0, last = false }) {
  let best = { fan: 0, names: [] };
  for (const d of decompose(hand)) {
    const sets = [...d.sets, ...melds.map((m) => ({ k: m.k, t: sortHand(m.tiles)[0] }))];
    const all = [d.pair, ...sets.flatMap((s) => (s.k === "pon" ? [s.t, s.t, s.t] : runOf(s.t)))];
    const suits = new Set(all.filter(isSuit).map((t) => t[0])), hon = all.some((t) => !isSuit(t));
    const names = [["Chicken hand", 1]];
    if (suits.size === 1 && !hon) names.push(["Pure suit", 3]); else if (suits.size === 1) names.push(["Half suit", 2]); else if (suits.size === 0) names.push(["All honours", 4]);
    if (sets.every((s) => s.k === "pon")) names.push(["All triplets", 2]);
    else if (sets.every((s) => s.k === "chi") && isSuit(d.pair)) names.push(["All runs", 1]);
    for (const s of sets) if (s.k === "pon") { if (s.t[0] === "r") names.push([`${NAMES[s.t]} dragon`, 1]); else if (s.t === "w" + (seat + 1)) names.push(["Seat wind", 1]); else if (s.t === "w1") names.push(["Prevailing East", 1]); }
    if (!melds.length) names.push(["Concealed", 1]);
    if (selfDraw) names.push(["Self-drawn", 1]);
    if (last) names.push(["Last tile", 1]);
    const fan = names.reduce((a, [, f]) => a + f, 0);
    if (fan > best.fan) best = { fan, names };
  }
  return best;
}
// the pot's multiple by fan
export const MULT = [0, 1, 1.25, 1.5, 2, 2.5, 3, 4];
export const payout = (pot, fan) => Math.round(pot * MULT[Math.min(MULT.length - 1, Math.max(1, fan))] / 5) * 5;

// ---- the table talks in tile indexes for the shanten count: 0-8 dots, 9-17 bamboo, 18-26 chars, 27-30 winds, 31-33 dragons
const idx = (t) => (isSuit(t) ? SUITS.indexOf(t[0]) * 9 + (+t.slice(1) - 1) : t[0] === "w" ? 26 + +t.slice(1) : 30 + +t.slice(1));
// shanten (tiles still needed to be one from ready) for the regular four sets and a pair; `mel` melds already laid
export function shanten(hand, mel = 0) {
  const c = new Array(34).fill(0); for (const t of hand) c[idx(t)]++;
  let best = 8 - 2 * mel;
  const go = (i, m, t, p) => {
    while (i < 34 && !c[i]) i++;
    if (i >= 34) { const s = 8 - 2 * m - Math.min(t, 4 - m) - (p ? 1 : 0); if (s < best) best = s; return; }
    if (c[i] >= 3) { c[i] -= 3; go(i, m + 1, t, p); c[i] += 3; }
    if (i < 27 && i % 9 <= 6 && c[i + 1] && c[i + 2]) { c[i]--; c[i + 1]--; c[i + 2]--; go(i, m + 1, t, p); c[i]++; c[i + 1]++; c[i + 2]++; }
    if (c[i] >= 2) { c[i] -= 2; if (!p) go(i, m, t, true); go(i, m, t + 1, p); c[i] += 2; }
    if (i < 27) {
      if (i % 9 <= 7 && c[i + 1]) { c[i]--; c[i + 1]--; go(i, m, t + 1, p); c[i]++; c[i + 1]++; }
      if (i % 9 <= 6 && c[i + 2]) { c[i]--; c[i + 2]--; go(i, m, t + 1, p); c[i]++; c[i + 2]++; }
    }
    c[i]--; go(i, m, t, p); c[i]++;
  };
  go(0, mel, 0, false);
  return best;
}
// how useful a tile is to a hand (a tie-break): pairs and near-runs score
export function worth(hand, t) {
  let w = 0; for (const o of hand) { if (o === t) w += 3; else if (o[0] === t[0] && isSuit(t)) { const d = Math.abs(+o.slice(1) - +t.slice(1)); if (d === 1) w += 2; else if (d === 2) w += 1; } }
  return w - 1;
}
// what to throw (an AI seat holding 14 less 3 per meld): the discard that leaves the lowest shanten, a persona's leanings breaking ties.
// persona { suit: favourite suit letter, sloppy: 0..1 }, rnd() -> 0..1
export function chooseDiscard(hand, mel, persona, rnd, seat) {
  let bt = hand[0], bs = Infinity;
  for (const t of new Set(hand)) {
    const rest = hand.slice(); rest.splice(rest.indexOf(t), 1);
    let s = shanten(rest, mel) * 10 - worth(rest, t) * 0.3 + rnd() * (persona.sloppy ?? 0.3) * 6;
    s -= worth(hand, t) * 0.6; // keep what works with the rest
    if (persona.suit && t[0] === persona.suit) s += 3; // a flush chaser holds its suit
    if (!isSuit(t) && (t[0] === "r" || t === "w" + (seat + 1))) s += 1.5; // honours that score
    if (!isSuit(t) && s > 0) s -= 0.3;
    if (s < bs) { bs = s; bt = t; }
  }
  return bt;
}
// ---- calls on a discard
export function chiOptions(hand, t) { // pairs of held tiles that make a run with t
  if (!isSuit(t)) return [];
  const n = +t.slice(1), s = t[0], has = (k) => k >= 1 && k <= 9 && hand.includes(s + k), out = [];
  for (const [a, b] of [[n - 2, n - 1], [n - 1, n + 1], [n + 1, n + 2]]) if (has(a) && has(b)) out.push([s + a, s + b]);
  return out;
}
export const canPon = (hand, t) => hand.filter((x) => x === t).length >= 2;
export const canRon = (hand, t) => isWin([...hand, t]);
