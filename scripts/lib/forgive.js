// Shelly Nov 12: "hostile npcs that are attacking me + werent hostile to me previously can forgive me if i wait an hour".
// A person who turned on you (state.angry[you], set when you hit, robbed or witnessed you) cools off one in-game hour
// (lib/clock.js: 25 s real, or a T wait) after your last offence against them. Born hostiles (monsters, raiders) never carry
// state.angry, so they are untouched. player.state.grudges = { npcId: gameNow of the last offence }, the player's own save.
import { gameNow, HOUR_MS } from "./clock.js";
const SCAN_MS = 3000; // her pick: how often the player's machine checks who is still angry

export function offended(ctx, npcId) { // call where you wrong someone: the hour starts again
  const s = ctx.self.state;
  s.grudges = { ...(s.grudges ?? {}), [npcId]: gameNow(ctx) };
}

export function forgiveTick(ctx) {
  const ses = ctx.self.session, now = ctx.now();
  if (now - (ses.forgiveAt ?? 0) < SCAN_MS) return;
  ses.forgiveAt = now;
  const me = ctx.self.id, s = ctx.self.state, t = gameNow(ctx);
  let g = s.grudges ?? {}, changed = false;
  for (const row of ctx.query({ tags: ["npc"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
    const n = ctx.getObject(row.id); if (!n?.state?.angry?.[me] || n.state.dead) continue;
    if (g[row.id] == null) { g = { ...g, [row.id]: t }; changed = true; continue; } // first seen angry: the hour starts now
    if (t - g[row.id] < HOUR_MS) continue;
    const a = { ...n.state.angry }; delete a[me]; n.state.angry = a;
    const f = { ...(n.state.fresh ?? {}) }; delete f[me]; n.state.fresh = f;
    n.state.pardoned = { ...(n.state.pardoned ?? {}), [me]: true };
    if (n.state.target === me) n.state.target = null;
    const { [row.id]: _, ...rest } = g; g = rest; changed = true;
    ctx.emit("damageNumber", { position: { x: n.feetPosition.x, y: n.feetPosition.y + 2.2, z: n.feetPosition.z }, text: "FORGIVEN", color: "#9fe0a0", size: 1 }, { audience: { player: me } });
  }
  for (const id of Object.keys(g)) if (!ctx.place.objects[id]) { const { [id]: _, ...rest } = g; g = rest; changed = true; } // gone or in another level: no ghost timers
  if (changed) s.grudges = g;
}
