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
import DG from "./data/dlg-generic.yml";
import DHUB from "./data/dlg-thehub.yml"; // The Hub
// Nov 15 (arrival weight): only the archetypes and The Hub ride the boot. Every level's own table (300 KB together) is read
// on first need after the player stands, in the same order as before, so a later table still wins a shared key.
const LEVELS = ["levelrun", "level1c", null, "levels-1-3", "level4", "level5", "levels-7-8", "levels-10-11", "level13", "level31", "level70", "level109", "level169", "level178", "level132"]; // null = dlg-generic's place in the order
const LOADERS = {
  "levelrun": () => import("./data/dlg-levelrun.yml"), "level1c": () => import("./data/dlg-level1c.yml"), "levels-1-3": () => import("./data/dlg-levels-1-3.yml"),
  "level4": () => import("./data/dlg-level4.yml"), "level5": () => import("./data/dlg-level5.yml"), "levels-7-8": () => import("./data/dlg-levels-7-8.yml"),
  "levels-10-11": () => import("./data/dlg-levels-10-11.yml"), "level13": () => import("./data/dlg-level13.yml"), "level31": () => import("./data/dlg-level31.yml"),
  "level70": () => import("./data/dlg-level70.yml"), "level109": () => import("./data/dlg-level109.yml"), "level169": () => import("./data/dlg-level169.yml"),
  "level178": () => import("./data/dlg-level178.yml"), "level132": () => import("./data/dlg-level132.yml"),
};
const SHARED = { "l61-guard-b": "l61-guard-a", "l61-amber-b": "l61-amber-a", "l61-guild-b": "l61-guild-a", "l61-guild-c": "l61-guild-a", "l1c-gang-2": "l1c-gang-1", "l1c-gang-3": "l1c-gang-1", "l1c-gang-4": "l1c-gang-1" }; // people who share one script of lines (a pair of guards, a crew)
const ALL = { ...DHUB, ...DG };
export const DLG = ALL;
const NODES = new Map();
let loading = null;
// resolves once every level's table is in DLG; safe to call any number of times
export function dlgReady() {
  return (loading ??= Promise.all(LEVELS.map((k) => (k ? LOADERS[k]().then((m) => m?.default ?? m ?? {}).catch(() => ({})) : DG))).then((tabs) => {
    Object.assign(ALL, DHUB, ...tabs);
    for (const [k, v] of Object.entries(SHARED)) ALL[k] ??= ALL[v];
    NODES.clear();
    return ALL;
  }));
}
const warm = () => { if (!loading) dlgReady(); };
export const warmDialogue = warm;
const short = (it) => String(it?.id ?? it ?? "").split("/").pop();
const low = (v) => String(v ?? "").toLowerCase();
const h32 = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const pick = (v, seed) => Array.isArray(v) ? v[(seed >>> 0) % v.length] : v;
// the archetype an unnamed person speaks as: their faction and role
export function archOf(it, place) {
  warm();
  const st = it?.state ?? {}, f = low(st.faction5 ?? st.faction4 ?? st.faction), role = low(st.role), id = short(it);
  const fk = /meg|gamma|omega/.test(f) || id.startsWith("meg") || id.startsWith("gamma") || id.startsWith("omega") ? "meg"
    : /surrender/.test(f) ? "surrender" : /lightless/.test(f) || id.startsWith("l8x") ? "lightless"
    : /tbd/.test(f) || id.startsWith("tbd") ? "tbd" : /amor/.test(f) || id.startsWith("amor") ? "amor"
    : /bntg|trader|merchant/.test(f) ? "bntg" : /homely|hotel/.test(f) ? "hotel" : f === "hk" ? "hk" : f === "orig" ? "orig"
    : /city/.test(f) || place === "level11" ? "city" : f === "lumiria" || place === "level132" ? "lumiria" : "survivor";
  const rk = ["trader", "merchant", "quarter", "smith"].includes(role) ? "trader" : role === "medic" ? "medic" : ["scout", "guard"].includes(role) ? "scout" : "default";
  return ALL[`${fk}:${rk}`] ? `${fk}:${rk}` : ALL[`${fk}:default`] ? `${fk}:default` : "survivor:default";
}
export function entryOf(it, place) { warm(); const id = ALL[it?.state?.dlg] ? it.state.dlg : short(it); return ALL[id] ? { key: id, e: ALL[id] } : { key: archOf(it, place), e: ALL[archOf(it, place)] }; }
// a roll written "speech 35"
const skOf = (sk) => { const m = /^\s*([a-z]+)\s+(\d+)/i.exec(String(sk ?? "")); return m ? { skill: m[1].toLowerCase(), difficulty: +m[2] } : null; };
// the choice tree, flattened once per entry: node ids "0", "0.1", "0.1.0"
function nodes(key) {
  warm();
  if (NODES.has(key)) return NODES.get(key);
  const out = {}, walk = (list, pre) => (list ?? []).forEach((n, i) => { const id = pre === "" ? String(i) : `${pre}.${i}`; out[id] = n; walk(n.then, id); });
  walk(ALL[key]?.ask, ""); NODES.set(key, out); return out;
}
const asChoice = (key, id, n) => { const ck = skOf(n.sk); return { text: n.q, tag: n.tag ?? (ck ? ck.skill : n.do === "recruit" ? "Recruit" : n.do === "heal" ? "Help" : n.do === "discount" ? "Barter" : "Ask"), check: ck ?? undefined, node: `${key}|${id}` }; };
export const BYE_CHOICE = { text: "That's all for now.", tag: "Leave", node: "bye" };
// the choices at the top of a talk: every root question not yet asked this visit, then the way out
export function rootChoices(it, place, askedSet, st) {
  const { key } = entryOf(it, place), N = nodes(key), out = [];
  const knowsDina = !st || !!st.trail?.name;
  for (const [id, n] of Object.entries(N)) {
    if (id.includes(".") || askedSet?.has(n.q)) continue;
    if (!knowsDina && /\bdina\b/i.test(n.q ?? "")) continue;
    out.push(asChoice(key, id, n));
  }
  return [...out, BYE_CHOICE];
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
  warm();
  const own = ALL[short(it)]?.barks?.[kind], arch = ALL[archOf(it, place ?? it?.place)]?.barks?.[kind], pool = own?.length ? own : arch;
  return pool?.length ? pool[Math.floor(rnd() * pool.length)] : null;
}
export const gestOf = (it, k, place) => (warm(), ALL)[short(it)]?.gest?.[k] ?? ALL[archOf(it, place ?? it?.place)]?.gest?.[k] ?? null;
