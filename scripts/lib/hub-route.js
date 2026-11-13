// The Tenth Tunnel (Nov 13): the main quest's way into the Hub. It opens when Chapter 1 ends (dinaQ 9), or the moment
// a player who found the Hub early meets Phoebe there. Stages: find the deep door on Level 1, ask Doorstep Carpet about Dina,
// take the tenth tunnel's door to Level 11. Optional before Chapter 1 ends: the Hub stays findable by wandering.
import { setQuest, endQuest } from "./quests.js";
import { megHostile } from "./hub-quest.js";
export const ROUTE = { id: "the-tenth-tunnel", name: "The Tenth Tunnel" };
const S = {
  door: { step: "Find the door at the end of Level 1's deepest halls.", mark: { place: "level1", id: "l1-hub-door" } },
  look: { step: "Read the key ledger at the M.E.G. post, Doorstep Carpet, or ask them if Dina came through.", mark: { place: "thehub", id: "hub-ledger" } },
  ask: { step: "Ask at the M.E.G. post, Doorstep Carpet, if Dina came through.", mark: { place: "thehub", id: "hub-ledger" } },
  amber: { step: "The M.E.G. post won't talk to you. Ask Jo at Camp Amber if Dina came through.", mark: { place: "thehub", id: "hub-amber-jo" } },
  follow: { step: "Take the door in the tenth tunnel.", mark: { place: "thehub", id: "hd-t10-a3" } },
};
export function hubRoute(ctx, st, place) {
  if (st.hubRouteDone) return;
  const open = (st.dinaQ ?? 0) >= 9 || st.hubPhoebe;
  if (!open) return;
  const knows = st.hubDinaAsk || st.hubLedger; // asked Okafor, or read the ledger's Dina line yourself
  if (knows && place === "level11") {
    st.hubRouteDone = 1;
    if (st.quests?.[ROUTE.id]) endQuest(st, ROUTE.id, "Through the tenth tunnel.");
    return;
  }
  const k = knows ? "follow" : megHostile(st) && (place === "thehub" || st.hubPhoebe) ? "amber" : st.hubDinaLead ? "ask" : (place === "thehub" || st.hubPhoebe) ? "look" : "door";
  if (setQuest(st, ROUTE.id, { name: ROUTE.name, main: true, ...S[k] }) && !st.qtrack?.includes(ROUTE.id)) st.qtrack = [ROUTE.id, ...(st.qtrack ?? [])].slice(0, 3);
}
