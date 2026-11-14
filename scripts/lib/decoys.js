// Test dummies (Shelly, Nov 13: "allow me to place a test npc that the enemy targets"). A row tagged "bay-decoy"
// stands in the target list beside the players, so any foe manager that reads targetsOf() hunts it like a person.
export function targetsOf(ctx, players) {
  const d = ctx.query({ tags: ["bay-decoy"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).map((r) => ctx.getObject(r.id)).filter((h) => h && (h.state?.hp ?? 1) > 0);
  return d.length ? [...d, ...players] : players;
}
