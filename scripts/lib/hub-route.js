// The Tenth Tunnel (Nov 13): the main quest's way into the Hub. It opens when Chapter 1 ends (dinaQ 9), or the moment
// a player who found the Hub early meets Phoebe there. Stages: find the deep door on Level 1, ask Doorstep Carpet about Dina,
// take the tenth tunnel's door to Level 11. Optional before Chapter 1 ends: the Hub stays findable by wandering.
import { setQuest, endQuest } from "./quests.js";
export const ROUTE = { id: "the-tenth-tunnel", name: "The Tenth Tunnel" };
const S = {
  door: { step: "River's runner came back out on Level 1. The camp says the deepest halls there end in a door nobody walks back through. Find it.", mark: { place: "level1", id: "l1-hub-door" } },
  ask: { step: "Phoebe says the M.E.G. post in these tunnels writes down everyone who passes. Ask at Doorstep Carpet if Dina came through.", mark: { place: "thehub", id: "hub-ledger" } },
  follow: { step: "Dina took the tenth tunnel's door. It's always open, and it doesn't take you back. Follow her.", mark: { place: "thehub", id: "hd-t10-a3" } },
};
export function hubRoute(ctx, st, place) {
  if (st.hubRouteDone) return;
  const open = (st.dinaQ ?? 0) >= 9 || st.hubPhoebe;
  if (!open) return;
  if (st.hubDinaAsk && place === "level11") {
    st.hubRouteDone = 1;
    if (st.quests?.[ROUTE.id]) endQuest(st, ROUTE.id, "You followed Dina through the tenth tunnel.");
    return;
  }
  const k = st.hubDinaAsk ? "follow" : (place === "thehub" || st.hubPhoebe) ? "ask" : "door";
  if (setQuest(st, ROUTE.id, { name: ROUTE.name, main: true, ...S[k] }) && !st.qtrack?.includes(ROUTE.id)) st.qtrack = [ROUTE.id, ...(st.qtrack ?? [])].slice(0, 3);
}
