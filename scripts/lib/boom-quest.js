// "Ground Rent": Specialist Vance (Level 11, Base Beta) lost a survey runner through the scaffold site at the shed deck.
// He wants proof of where it goes: strip Boom Town's rubble and bring back the blue glass the collapses leave.
// Steps (Savi's design): 1 walk under the scaffold site, 2 strip 2 salvage heaps and hold Channel glass, 3 find a basement stair out,
// 4 bring a piece of glass to Vance. Branches: Barter 35 hazard pay up front (+50%); Speech 45 lie to Vance and keep the glass ($20);
// sell it to Kael instead ($150, B.N.T.G. +10, M.E.G. -10). Kael can buy from step 3 on. Reward: 300 XP, $60, M.E.G. rep, and the Scaffold crossbow schematic note (Savi's picks).
export const BOOM = { key: "boomQ", id: "ground-rent", name: "Ground Rent", tips: {
  1: "Walk in under the scaffold deck at the construction site by the shed on Level 11.",
  2: "In Boom Town, salvage two heaps after a tower falls. The wreckage near where its top landed contains the blue glass Vance wants.",
  3: "Find a tower basement and descend to Level 2. Keep the blue glass if you intend to deliver it to Vance.",
  4: "Return to Level 11 with the Channel glass. Give it to Vance at Base Beta, or ask Kael at the market what he'll pay.",
}, marks: { 1: { place: "level11", id: "l11-site-noclip" }, 4: { place: "level11", id: "l11-meg-agent-vance" } } };
