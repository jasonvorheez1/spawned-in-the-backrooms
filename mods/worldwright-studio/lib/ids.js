// Ids and order keys. uid() = 13 lowercase base-36 chars (8 of clock, 5 of randomness), so ids sort by creation and never collide with an uppercase sentinel; keyBetween() is a fractional index, so a drop writes ONE row instead of renumbering siblings. His spec fixes keys at TEXT(13); a key grows a 14th character only when a gap is exhausted, and growth keeps sorting correctly.

const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";
const BASE = 36;
const WIDTH = 13;

const SENTINELS = {
  RESEARCH: "RESEARCH0BOOK", // the protected research book — always present, always rendered last
  CODEX: "CODEX0000BOOK", // the Codex book — pinned above Research (it replaced the god-mode tab)
  MUSIC: "0MUSIC00BOOK0",
  ASSET_STUDIO: "ASSET00STUDIO",
  SOURCE: "WWSCODE0BOOK",
  TRASH: "0TRASH0TABLE0", // the drag-to-trash target
};

export function encodeBase36(value, width) {
  let v = Math.max(0, Math.floor(Number(value) || 0));
  let out = "";
  while (v > 0) {
    out = DIGITS[v % BASE] + out;
    v = Math.floor(v / BASE);
  }
  const w = Math.max(1, Math.floor(width || 0));
  while (out.length < w) out = "0" + out;
  return out.slice(-w);
}

export function decodeBase36(text) {
  const s = String(text || "");
  let v = 0;
  for (let i = 0; i < s.length; i++) {
    const d = DIGITS.indexOf(s[i]);
    if (d < 0) return 0;
    v = v * BASE + d;
  }
  return v;
}

export function uid(objectApi, ms) {
  const stamp = encodeBase36(ms, 8);
  let tail = "";
  for (let i = 0; i < WIDTH - 8; i++) tail += DIGITS[Math.floor(objectApi.random() * BASE) % BASE];
  return (stamp + tail).slice(0, WIDTH);
}

export function isSentinel(id) {
  const key = String(id || "");
  for (const name in SENTINELS) if (SENTINELS[name] === key) return true;
  return false;
}

export function isValidId(id) {
  const key = String(id || "");
  if (isSentinel(key)) return true;
  if (key.length !== WIDTH) return false;
  for (let i = 0; i < key.length; i++) if (DIGITS.indexOf(key[i]) < 0) return false;
  return true;
}

// Keys are base-36 fractions: "i000…" is halfway along the shelf, and the midpoint is digit
//   arithmetic, so no 64-bit integer is ever needed.

export function toDigits(key, width) {
  const s = String(key || "");
  const out = [];
  for (let i = 0; i < width; i++) {
    const d = i < s.length ? DIGITS.indexOf(s[i]) : 0;
    out.push(d < 0 ? 0 : d);
  }
  return out;
}

export function fromDigits(digits) {
  let out = "";
  for (const d of digits) out += DIGITS[Math.max(0, Math.min(BASE - 1, d))];
  return out;
}

// (a + b) / 2 in base 36 — the halving can carry into one extra digit, which is why a key grows.
export function midpointDigits(a, b) {
  const sum = [];
  let carry = 0;
  for (let i = a.length - 1; i >= 0; i--) {
    const t = a[i] + b[i] + carry;
    sum[i] = t % BASE;
    carry = t >= BASE ? 1 : 0;
  }
  const out = [];
  let rem = carry; // the integer part, 0 or 1
  for (let i = 0; i < sum.length; i++) {
    const t = rem * BASE + sum[i];
    out.push(Math.floor(t / 2));
    rem = t % 2;
  }
  if (rem) out.push(Math.floor(BASE / 2));
  return out;
}

export function cmp(a, b) {
  const x = String(a || "");
  const y = String(b || "");
  return x < y ? -1 : x > y ? 1 : 0;
}

export function keyBetween(a, b) {
  const lo = a ? String(a) : "";
  const hi = b ? String(b) : "";
  if (lo && hi && cmp(lo, hi) >= 0) return keyBetween(hi, null);
  const width = Math.max(WIDTH, lo.length, hi.length);
  const loD = lo ? toDigits(lo, width) : toDigits("", width);
  // No upper bound means the end of the shelf: halfway between here and 1.0 (all z's + 1).
  const hiD = hi ? toDigits(hi, width) : toDigits("", width).map(() => BASE - 1);
  let mid = fromDigits(midpointDigits(loD, hiD));
  // Guard: when the gap is one digit wide the midpoint lands back on the lower bound, so
  // grow the key by a character instead of colliding.
  let guard = 0;
  while ((lo && cmp(mid, lo) <= 0) || (hi && cmp(mid, hi) >= 0)) {
    mid = (lo || fromDigits(toDigits("", width))) + DIGITS[Math.floor(BASE / 2)];
    if (hi && cmp(mid, hi) >= 0) mid = mid + DIGITS[Math.floor(BASE / 2)];
    if (++guard > 4) break;
  }
  return mid;
}

export function nKeysBetween(a, b, n) {
  const count = Math.max(0, Math.floor(Number(n) || 0));
  const out = [];
  let lower = a || null;
  for (let i = 0; i < count; i++) {
    const key = keyBetween(lower, b || null);
    out.push(key);
    lower = key;
  }
  return out;
}

export function seedKeys(n) {
  const count = Math.max(1, Math.floor(Number(n) || 1));
  const out = [];
  for (let i = 1; i <= count; i++) {
    const digit = Math.max(1, Math.min(BASE - 1, Math.round((i * BASE) / (count + 1))));
    out.push(DIGITS[digit] + encodeBase36(i, WIDTH - 1));
  }
  return out;
}

module.exports = {
  DIGITS,
  WIDTH,
  SENTINELS,
  uid,
  encodeBase36,
  decodeBase36,
  isSentinel,
  isValidId,
  keyBetween,
  nKeysBetween,
  seedKeys,
  cmp,
};
