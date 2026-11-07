// Mahjong rules, shared by the player's game (scripts/mahjong.js) and its panel (scripts/mahjong-ui.js).
// Tiles are codes: suits "d"ots "b"amboo "c"haracters 1-9, honours "w1-w4" (winds E S W N) and "r1-r3" (red, green, white dragons). 4 of each = 136.
export const SUITS = ["d", "b", "c"];
export function fullSet() { const t = []; for (const s of SUITS) for (let n = 1; n <= 9; n++) for (let k = 0; k < 4; k++) t.push(s + n); for (let n = 1; n <= 4; n++) for (let k = 0; k < 4; k++) t.push("w" + n); for (let n = 1; n <= 3; n++) for (let k = 0; k < 4; k++) t.push("r" + n); return t; }
const ORDER = { d: 0, b: 1, c: 2, w: 3, r: 4 };
export const sortHand = (h) => [...h].sort((a, b) => ORDER[a[0]] - ORDER[b[0]] || +a.slice(1) - +b.slice(1));
// a winning hand: 14 tiles as four sets (three alike, or a run of three in one suit) and a pair
export function isWin(hand) {
  if (hand.length % 3 !== 2) return false;
  const h = sortHand(hand);
  for (let i = 0; i < h.length - 1; i++) { if (h[i] !== h[i + 1] || (i && h[i] === h[i - 1])) continue; const rest = h.slice(); rest.splice(i, 2); if (sets(rest)) return true; }
  return false;
}
function sets(h) {
  if (!h.length) return true;
  const t = h[0];
  if (h[1] === t && h[2] === t && sets(h.slice(3))) return true;
  if (SUITS.includes(t[0])) { const n = +t.slice(1), a = t[0] + (n + 1), b = t[0] + (n + 2), i = h.indexOf(a), j = h.indexOf(b);
    if (i > 0 && j > 0) { const r = h.slice(1); r.splice(r.indexOf(a), 1); r.splice(r.indexOf(b), 1); return sets(r); } }
  return false;
}
// how useful a tile is to a hand (the residents discard the least useful): pairs and near-runs score
export function worth(hand, t) {
  let w = 0; for (const o of hand) { if (o === t) w += 3; else if (o[0] === t[0] && SUITS.includes(t[0])) { const d = Math.abs(+o.slice(1) - +t.slice(1)); if (d === 1) w += 2; else if (d === 2) w += 1; } }
  return w - 1;
}
export const NAMES = { d: "Dots", b: "Bamboo", c: "Chars", w1: "East", w2: "South", w3: "West", w4: "North", r1: "Red", r2: "Green", r3: "White" };
