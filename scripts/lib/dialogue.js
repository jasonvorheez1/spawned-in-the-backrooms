// Authored dialogue (Nov 11, Shelly: "we are replacing the ai generated dialogue with actual dialogue", "the choices we make
// will now also be predetermined"). Every person's words live in scripts/lib/data/dlg-*.yml, written by hand; nothing is
// generated. Each entry (an npc id, or an archetype "faction:role" for the unnamed) holds:
//   hi / back / warm / cold / follow / bye / walk   what they say when you open a talk (first time, again, liked, disliked,
//                                                    while following you) and when you leave or walk off
//   ask   the choices: { q: what you say, a: their answer, sk: "speech 35" a roll, fail: their answer when it fails,
//         do: recruit | heal | discount, then: [more choices that open after this answer] }
//   barks  one-liners by kind: idle, hi, drawn, hurt, sneak, close (seeing you), and in a fight spot, hostile, hit, kill,
//          clear, flee, death, reload, lowHealth (scripts/meg-agent.js bark)
//   gest   their answer to a wave, a gift, a dance (dance / nodance) and an insult
// The voice each one speaks with is scripts/lib/data/npc-voices.yml (scripts/lib/voices.js).
import D1 from "./data/dlg-levels-1-3.yml";
import D4 from "./data/dlg-level4.yml";
import D5 from "./data/dlg-level5.yml";
import D7 from "./data/dlg-levels-7-8.yml";
import D10 from "./data/dlg-levels-10-11.yml";
import D13 from "./data/dlg-level13.yml";
import D31 from "./data/dlg-level31.yml";
import D70 from "./data/dlg-level70.yml";
import DG from "./data/dlg-generic.yml";
const ALL = { ...DG, ...D1, ...D4, ...D5, ...D7, ...D10, ...D13, ...D31, ...D70 };
// people who share one script of lines (a pair of guards, a crew)
for (const [k, v] of Object.entries({ "l61-guard-b": "l61-guard-a", "l61-amber-b": "l61-amber-a", "l61-guild-b": "l61-guild-a", "l61-guild-c": "l61-guild-a" })) ALL[k] ??= ALL[v];
export const DLG = ALL;
const short = (it) => String(it?.id ?? it ?? "").split("/").pop();
const low = (v) => String(v ?? "").toLowerCase();
const h32 = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const pick = (v, seed) => Array.isArray(v) ? v[(seed >>> 0) % v.length] : v;
// the archetype an unnamed person speaks as: their faction and role
export function archOf(it, place) {
  const st = it?.state ?? {}, f = low(st.faction5 ?? st.faction4 ?? st.faction), role = low(st.role), id = short(it);
  const fk = /meg|gamma|omega/.test(f) || id.startsWith("meg") || id.startsWith("gamma") || id.startsWith("omega") ? "meg"
    : /surrender/.test(f) ? "surrender" : /lightless/.test(f) || id.startsWith("l8x") ? "lightless"
    : /tbd/.test(f) || id.startsWith("tbd") ? "tbd" : /amor/.test(f) || id.startsWith("amor") ? "amor"
    : /bntg|trader|merchant/.test(f) ? "bntg" : /homely|hotel/.test(f) ? "hotel" : f === "hk" ? "hk" : f === "orig" ? "orig"
    : /city/.test(f) || place === "level11" ? "city" : "survivor";
  const rk = ["trader", "merchant", "quarter", "smith"].includes(role) ? "trader" : role === "medic" ? "medic" : ["scout", "guard"].includes(role) ? "scout" : "default";
  return ALL[`${fk}:${rk}`] ? `${fk}:${rk}` : ALL[`${fk}:default`] ? `${fk}:default` : "survivor:default";
}
export function entryOf(it, place) { const id = short(it); return ALL[id] ? { key: id, e: ALL[id] } : { key: archOf(it, place), e: ALL[archOf(it, place)] }; }
// a roll written "speech 35"
const skOf = (sk) => { const m = /^\s*([a-z]+)\s+(\d+)/i.exec(String(sk ?? "")); return m ? { skill: m[1].toLowerCase(), difficulty: +m[2] } : null; };
// the choice tree, flattened once per entry: node ids "0", "0.1", "0.1.0"
const NODES = new Map();
function nodes(key) {
  if (NODES.has(key)) return NODES.get(key);
  const out = {}, walk = (list, pre) => (list ?? []).forEach((n, i) => { const id = pre === "" ? String(i) : `${pre}.${i}`; out[id] = n; walk(n.then, id); });
  walk(ALL[key]?.ask, ""); NODES.set(key, out); return out;
}
const asChoice = (key, id, n) => { const ck = skOf(n.sk); return { text: n.q, tag: n.tag ?? (ck ? ck.skill : n.do === "recruit" ? "Recruit" : n.do === "heal" ? "Help" : n.do === "discount" ? "Barter" : "Ask"), check: ck ?? undefined, node: `${key}|${id}` }; };
export const BYE_CHOICE = { text: "That's all for now.", tag: "Leave", node: "bye" };
// the choices at the top of a talk: every root question not yet asked this visit, then the way out
export function rootChoices(it, place, askedSet) {
  const { key } = entryOf(it, place), N = nodes(key), out = [];
  for (const [id, n] of Object.entries(N)) if (!id.includes(".") && !askedSet?.has(n.q)) out.push(asChoice(key, id, n));
  return [...out.slice(0, 4), BYE_CHOICE];
}
export function childChoices(nodeRef) { const [key, id] = String(nodeRef).split("|"), N = nodes(key), n = N[id]; return (n?.then ?? []).map((c, i) => asChoice(key, `${id}.${i}`, c)); }
export function nodeOf(nodeRef) { const [key, id] = String(nodeRef ?? "").split("|"); return nodes(key)[id] ?? null; }
// what they open with
export function greetingOf(it, place, { met, rapport, following, seed }) {
  const { e } = entryOf(it, place); if (!e) return null;
  const s = seed ?? h32(short(it));
  if (following && e.follow) return { text: pick(e.follow, s), mood: "happy" };
  if (met) { if (rapport >= 35 && e.warm) return { text: pick(e.warm, s), mood: "happy" }; if (rapport <= -25 && e.cold) return { text: pick(e.cold, s), mood: "annoyed" }; if (e.back) return { text: pick(e.back, s), mood: e.mood ?? "calm" }; }
  return { text: pick(e.hi, s), mood: e.mood ?? "calm" };
}
export const lineOf = (it, place, k, seed) => { const { e } = entryOf(it, place); return e?.[k] ? pick(e[k], seed ?? h32(short(it) + k)) : null; };
// a one-liner of a kind: their own, else their archetype's, else null; {u} is what they call you
export function barkOf(it, kind, rnd = Math.random, place) {
  const own = ALL[short(it)]?.barks?.[kind], arch = ALL[archOf(it, place ?? it?.place)]?.barks?.[kind], pool = own?.length ? own : arch;
  return pool?.length ? pool[Math.floor(rnd() * pool.length)] : null;
}
export const gestOf = (it, k, place) => ALL[short(it)]?.gest?.[k] ?? ALL[archOf(it, place ?? it?.place)]?.gest?.[k] ?? null;
