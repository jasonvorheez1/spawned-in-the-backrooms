// The Tenth Tunnel (Nov 13): the main quest's way into the Hub. It opens when Chapter 1 ends (dinaQ 9), or the moment
// a player who found the Hub early meets Phoebe there. Stages: find the deep door on Level 1, ask Doorstep Carpet about Dina,
// take the tenth tunnel's door to Level 11. Optional before Chapter 1 ends: the Hub stays findable by wandering.
import { setQuest, endQuest } from "./quests.js";
import { megHostile } from "./hub-quest.js";
import { hasKey } from "./hubkeys.js";
import { noNpcs } from "./run-opts.js";
export const ROUTE = { id: "the-tenth-tunnel", name: "The Tenth Tunnel" };
const S = {
  door: { step: "Find the door at the end of Level 1's deepest halls.", mark: { place: "level1", id: "l1-hub-door" } },
  look: { step: "Read the key ledger at the M.E.G. post, Doorstep Carpet, or ask them if Dina came through.", mark: { place: "thehub", id: "hub-ledger" } },
  ask: { step: "Ask at the M.E.G. post, Doorstep Carpet, if Dina came through.", mark: { place: "thehub", id: "hub-meg-okafor" } },
  amber: { step: "The M.E.G. post won't talk to you. Ask Jo at Camp Amber if Dina came through.", mark: { place: "thehub", id: "hub-amber-jo" } },
  favor: { step: "Read the key ledger at Doorstep Carpet, then report back to Phoebe for the Level 11 key.", mark: { place: "thehub", id: "hub-ledger" } },
  key: { step: "Get the Level 11 key to unlock the tenth tunnel door.", mark: { place: "thehub", id: "hub-phoebe" } },
  keyHostile: { step: "Phoebe cut you off. Get a Level 11 key for the tenth tunnel from Okafor or Camp Amber.", mark: { place: "thehub", id: "hub-meg-okafor" } },
  lookEmpty: { step: "Read the key ledger at the empty M.E.G. post, Doorstep Carpet.", mark: { place: "thehub", id: "hub-ledger" } }, // a run with no people: nobody to ask, the book and the road do it
  loose: { step: "Find a Level 11 key. Loose keys lie on the Hub's road.", mark: { place: "thehub", id: "hub-loosekey-1" } },
  follow: { step: "Take the door in the tenth tunnel.", mark: { place: "thehub", id: "hd-t10-a3" } },
};
export function hubRoute(ctx, st, place) {
  if (st.hubUPto === "sato" && (st.hubKeys?.level70 ?? 0) > 0 && !st.hubKeyFix) {
    const keys = { ...st.hubKeys }, n = keys.level70 - 1;
    if (n) keys.level70 = n; else delete keys.level70;
    keys.level2 = (keys.level2 ?? 0) + 1; st.hubKeys = keys; st.hubKeyFix = 1;
  }
  const uncharted = st.quests?.["hub-uncharted"];
  if (st.hubUP === 1 && uncharted?.mark?.id === "hub-uncharted") setQuest(st, "hub-uncharted", { ...uncharted, mark: { place: "thehub", id: "hub-blank" } });
  if (st.hubRouteDone) return;
  const open = (st.dinaQ ?? 0) >= 9 || st.hubPhoebe;
  if (!open) return;
  const knows = st.hubDinaAsk || st.hubLedger; // asked Okafor, or read the ledger's Dina line yourself
  if (knows && st.hubTenthCrossed) {
    st.hubRouteDone = 1;
    if (st.quests?.[ROUTE.id]) endQuest(st, ROUTE.id, "Through the tenth tunnel.");
    return;
  }
  const hasL11 = hasKey(st, "level11");
  const empty = noNpcs(st), knowsE = !!st.hubLedger;
  if (empty && knowsE && st.hubTenthCrossed) { st.hubRouteDone = 1; if (st.quests?.[ROUTE.id]) endQuest(st, ROUTE.id, "Through the tenth tunnel."); return; }
  const k = empty ? (knowsE && hasL11 ? "follow" : knowsE ? "loose" : (place === "thehub" || st.hubPhoebe) ? "lookEmpty" : "door")
    : st.hubPhoebeDeal === "favor_pending" && !st.hubLedger ? "favor"
    : knows && hasL11 ? "follow"
    : knows ? (st.hubPhoebeDeal === "hostile" ? (megHostile(st) ? "amber" : "keyHostile") : "key")
    : megHostile(st) && (place === "thehub" || st.hubPhoebe) ? "amber"
    : st.hubDinaLead ? "ask"
    : (place === "thehub" || st.hubPhoebe) ? "look"
    : "door";
  if (setQuest(st, ROUTE.id, { name: ROUTE.name, main: true, ...S[k] }) && !st.qtrack?.includes(ROUTE.id)) st.qtrack = [ROUTE.id, ...(st.qtrack ?? [])].slice(0, 3);
}
