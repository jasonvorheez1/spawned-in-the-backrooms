// Level 6.1 food tray as a real object: spawned into a player's hands (player.state.l61Hold = its id, l61Tray = when),
// carried and thrown by scripts/grab.js, set down with E, taken back with E or Z, slid into the return rack (scripts/l61-use.js).
// Ids start "snacktray-", never "l61-": the level's rebuild wipes l61- roots.
export const TRAY_MODEL = "/cdn/value.9a60caea555a11d9a9510e98f7a90de5225266936a9261e821d1bc55829ef3af.glb";
export const TRAY_KG = 1.4;          // tray + a meal (Savi's pick)
export const TRAY_LIFE = 3600;       // a tray left lying is bussed away after an hour
export const CLATTER = "/cdn/moodboard-realistic-gritty/sfx-plastic-cafeteria-tray-clatter-hit.mp3";
export const isTray = (o) => !!o?.tags?.includes("snacktray");
// spawn a tray in front of `who` and hand it to them; grab.js on their machine takes it up
export function handTray(ctx, who, n, info) {
  const f = who.feetPosition, id = `snacktray-${String(who.id).replace(/[^a-z0-9]/gi, "").slice(-10)}-${n}-${Math.floor(ctx.now() % 1e6)}`;
  ctx.spawn(id, {
    tags: ["snacktray"],
    feetPosition: { x: f.x, y: f.y + 0.75, z: f.z },
    model: { id: TRAY_MODEL },
    behavior: "scripts/l61-use.js",
    lifetime: TRAY_LIFE,
    state: { kind: "snacktray", name: "Food tray", verb: "Pick up", info: info ?? "Snackrooms food tray", tint: "#ffd84a", carryKg: TRAY_KG, mat: "plastic", hp: 999, maxHp: 999 },
  });
  who.state.l61Hold = id; who.state.l61Tray = ctx.now();
  return id;
}
