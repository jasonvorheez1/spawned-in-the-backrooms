// "Ground Rent": Specialist Vance (Level 11, Base Beta) lost a survey runner through the scaffold site at the shed deck.
// He wants proof of where it goes: strip Boom Town's rubble and bring back the blue glass the collapses leave.
// Steps (Savi's design): 1 walk under the scaffold site, 2 strip 2 salvage heaps and hold Channel glass, 3 find a basement stair out,
// 4 bring a piece of glass to Vance. Branches: Barter 35 hazard pay up front (+50%); Speech 45 lie to Vance and keep the glass ($20);
// sell it to Kael instead ($150, B.N.T.G. +10, M.E.G. -10). Kael can buy from step 3 on. Reward: 300 XP, $60, M.E.G. rep, and the Scaffold crossbow schematic note (Savi's picks).
export const BOOM = { key: "boomQ", id: "ground-rent", name: "Ground Rent", tips: {
  1: "Walk in under the scaffold deck at the construction site by the shed on Level 11.",
  2: "Strip two salvage heaps in the falling city, and get a piece of the blue glass.",
  3: "Find a tower with a basement and take its stair down. The streets don't let go otherwise.",
  4: "Bring the Channel glass to Specialist Vance at Base Beta. Kael at the market might pay more for it.",
}, marks: { 1: { place: "level11", id: "l11-site-noclip" }, 4: { place: "level11", id: "l11-meg-agent-vance" } } };
