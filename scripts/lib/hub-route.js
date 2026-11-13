// The Tenth Tunnel (Nov 13): the main quest's way into the Hub. It opens when Chapter 1 ends (dinaQ 9), or the moment
// a player who found the Hub early meets Phoebe there. Stages: find the deep door on Level 1, ask Doorstep Carpet about Dina,
// take the tenth tunnel's door to Level 11. Optional before Chapter 1 ends: the Hub stays findable by wandering.
import { setQuest, endQuest } from "./quests.js";
export const ROUTE = { id: "the-tenth-tunnel", name: "The Tenth Tunnel" };
const S = {
  door: { step: "Find the door at the end of Level 1's deepest halls.", mark: { place: "level1", id: "l1-hub-door" } },
  ask: { step: "Ask at the M.E.G. post, Doorstep Carpet, if Dina came through.", mark: { place: "thehub", id: "hub-ledger" } },
  follow: { step: "Take the door in the tenth tunnel.", mark: { place: "thehub", id: "hd-t10-a3" } },
};
export function hubRoute(ctx, st, place) {
  if (st.hubRouteDone) return;
  const open = (st.dinaQ ?? 0) >= 9 || st.hubPhoebe;
  if (!open) return;
  if (st.hubDinaAsk && place === "level11") {
    st.hubRouteDone = 1;
    if (st.quests?.[ROUTE.id]) endQuest(st, ROUTE.id, "Through the tenth tunnel.");
    return;
  }
  const k = st.hubDinaAsk ? "follow" : (place === "thehub" || st.hubPhoebe) ? "ask" : "door";
  if (setQuest(st, ROUTE.id, { name: ROUTE.name, main: true, ...S[k] }) && !st.qtrack?.includes(ROUTE.id)) st.qtrack = [ROUTE.id, ...(st.qtrack ?? [])].slice(0, 3);
}
