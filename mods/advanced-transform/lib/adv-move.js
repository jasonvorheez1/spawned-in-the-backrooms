// Advanced Transform's group save, done where every piece is owned: the server's place referee.
// A follower in a group drag is often simulated by another machine, so the editor's own commit finds
// nothing to change and the room pulls it back. The editor posts its drop poses on player.state.advMove;
// here an editor's post becomes one commit: one history row, one undo.
const seen = {};
export function applyAdvMoves(ctx) {
  // live, not saved: a group drag in progress, so a piece another machine holds follows the drag on every screen
  for (const c of ctx.changed("place.players.*.state.advDrag")) {
    const mv = c.value; if (!mv?.moves?.length || ctx.now() - (mv.at ?? 0) > 1500) continue;
    for (const m of mv.moves) { const o = ctx.getObject(m.id); if (!o) continue;
      try { if (m.p) { if (o.parent) o.worldFeetPosition = m.p; else o.feetPosition = m.p; } if (m.q) o.rotation = m.q; if (m.s) o.scale = m.s; } catch (e) {} }
  }
  for (const c of ctx.changed("place.players.*.state.advMove")) {
    const mv = c.value, pid = c.path.split(".")[2];
    if (!mv?.moves?.length || seen[pid] === mv.at) continue;
    seen[pid] = mv.at;
    const who = ctx.place.players.find((p) => String(p.id) === pid);
    if (!who?.isEditor) continue;
    try {
      ctx.commit(`moved ${mv.moves.length + 1} grouped pieces`, () => {
        for (const m of mv.moves) {
          const o = ctx.getObject(m.id); if (!o) continue;
          if (m.p) { if (o.parent) o.worldFeetPosition = m.p; else o.feetPosition = m.p; }
          if (m.q) o.rotation = m.q;
          if (m.s) o.scale = m.s;
          if (m.home) o.state.home = m.home;
          if (o.velocity) o.velocity = { x: 0, y: 0, z: 0 };
          try { o.interpolation = m.interp ?? { teleportThreshold: 5 }; } catch (e) {}
        }
      });
    } catch (e) { ctx.log("adv-move commit failed", { e: String(e) }); }
  }
}
