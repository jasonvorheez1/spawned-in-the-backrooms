// The barter table's rules, shared by the player's script (scripts/barter.js), the Lumiria sim and the UI (scripts/barter-ui.js).
// player.state.bt = { npc, who, want, stock: { cat: n }, give: { key: n }, take: { cat: n }, ask, haggled, ware, line }
// your side's keys: "g:<cat>" a Lumiria good in player.state.l132.bag, "s:<snack>", "m:<cut>", "a" a grey almond water
import B from "./data/barter.yml";
import SNACKS from "./data/snacks.yml";
import { MEAT } from "./items.js";
import { skillsOf } from "./stats.js";
export const CATS = ["pottery", "phones", "remedies", "records", "spices", "computers", "hats", "fruit"];
export const WANTS = { fruit: "records", records: "hats", hats: "fruit", pottery: "spices", spices: "remedies", remedies: "pottery", phones: "computers", computers: "phones" };
export const LABEL = { pottery: "Urn", phones: "Phone", remedies: "Tonic", records: "Record", spices: "Spice pouch", computers: "Cartridge", hats: "Hat", fruit: "Apple" };
export const KEEPER = { "l132-gus": "fruit", "l132-rosalind": "hats", "l132-teodora": "pottery", "l132-benny": "phones", "l132-margo": "remedies", "l132-silas": "records", "l132-anouk": "spices", "l132-dex": "computers", "l132-wendell": "phones", "l132-del": "fruit", "l132-mateo": "spices", "l132-odalys": "computers" };
const NEIGH = (cat) => CATS[(CATS.indexOf(cat) + 3) % CATS.length];
export function mine(s) { // what you could put on the table
  const out = [];
  for (const c of CATS) { const n = s.l132?.bag?.[c] ?? 0; if (n > 0) out.push({ k: "g:" + c, name: LABEL[c], n, v: B.value[c] }); }
  for (const [k, n] of Object.entries(s.snacks ?? {})) if (n > 0 && SNACKS[k]) out.push({ k: "s:" + k, name: SNACKS[k].name, n, v: B.other.snack });
  for (const [k, n] of Object.entries(s.meat ?? {})) if (n > 0 && MEAT[k]) out.push({ k: "m:" + k, name: MEAT[k].name, n, v: B.other.meat });
  if ((s.almonds ?? 0) > 0) out.push({ k: "a", name: "Almond water", n: s.almonds, v: B.other.almond });
  return out;
}
export const worth = (bt, k) => { // what one of your pieces is worth to THIS keeper
  const v = k.startsWith("g:") ? B.value[k.slice(2)] : k.startsWith("s:") ? B.other.snack : k.startsWith("m:") ? B.other.meat : B.other.almond;
  return k === "g:" + bt.want ? Math.round(v * B.loves) : v;
};
export const offerOf = (bt) => Object.entries(bt.give ?? {}).reduce((t, [k, n]) => t + worth(bt, k) * n, 0);
export const askOf = (bt) => Math.ceil(Object.entries(bt.take ?? {}).reduce((t, [c, n]) => t + B.value[c] * n, 0) * bt.ask);
export function startAsk(s) { const sk = skillsOf(s)?.barter ?? 0; return Math.max(1, B.ask - sk * 0.006); }
export function open(s, now, { npc, who, cat, ware }) {
  const b = (s.l132 ??= { bag: {}, col: [] }); b.stocks ??= {};
  let st = b.stocks[npc];
  if (!st || (Object.values(st.n).every((x) => !x) && now - st.at > B.restockMin * 60000)) st = { n: { [cat]: B.stock.own, [NEIGH(cat)]: B.stock.extra }, at: now };
  s.l132 = { ...b, stocks: { ...b.stocks, [npc]: st } };
  return { npc, who, want: WANTS[cat], stock: { ...st.n }, give: {}, take: {}, ask: startAsk(s), haggled: false, ware: ware ?? null, line: null };
}
const take1 = (s, k) => { // one piece of yours leaves your bag
  if (k.startsWith("g:")) { const c = k.slice(2); s.l132 = { ...s.l132, bag: { ...s.l132.bag, [c]: (s.l132.bag[c] ?? 0) - 1 } }; }
  else if (k.startsWith("s:")) s.snacks = { ...s.snacks, [k.slice(2)]: s.snacks[k.slice(2)] - 1 };
  else if (k.startsWith("m:")) s.meat = { ...s.meat, [k.slice(2)]: s.meat[k.slice(2)] - 1 };
  else s.almonds -= 1;
};
export function deal(s, now) { // → { ok, line }
  const bt = s.bt, have = Object.fromEntries(mine(s).map((m) => [m.k, m.n]));
  if (!Object.values(bt.take).some(Boolean)) return { ok: false, line: "Pick something off my table first." };
  for (const [k, n] of Object.entries(bt.give)) if ((have[k] ?? 0) < n) return { ok: false, line: "You don't have that anymore." };
  const o = offerOf(bt), a = askOf(bt);
  if (o < a) return { ok: false, line: o === 0 ? "And what do I get?" : a - o <= 3 ? "Close. A little more and we shake on it." : "That's not a trade, that's a robbery." };
  for (const [k, n] of Object.entries(bt.give)) for (let i = 0; i < n; i++) take1(s, k);
  const bag = { ...s.l132.bag }, left = { ...bt.stock };
  for (const [c, n] of Object.entries(bt.take)) { bag[c] = (bag[c] ?? 0) + n; left[c] -= n; }
  s.l132 = { ...s.l132, bag, stocks: { ...s.l132.stocks, [bt.npc]: { n: left, at: now } } };
  if ((bt.take.phones ?? 0) > 0) s.phone = true; // a Lumiria phone is a working phone: M opens it anywhere
  return { ok: true, line: o > a * 1.3 ? "Pleasure. Truly. Come back anytime." : "Deal.", took: bt.take, left };
}
export { B as RULES };
