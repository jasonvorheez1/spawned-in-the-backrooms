// A containment door (scripts/lib/containment.js): a solid hinged leaf (scripts/door-geo.js, its feet ARE the hinge) that only a
// player's press moves. It never opens by itself and nothing that hunts can open it. The prompt reads "Open Door" / "Close Door".
// state: { pen: room id, open, baseYaw, openYaw, c: the doorway's centre, kind: "wood" | "metal" }
import { swingTo } from "./lib/door-swing.js";
import { heard } from "./lib/hear.js";
import { doorMoved } from "./lib/containment.js";
const SFX = { wood: ["/cdn/moodboard-realistic-gritty/sfx-old-wooden-hotel-door-creak-open.mp3", "/cdn/moodboard-realistic-gritty/sfx-wooden-door-close-latch-click.mp3"], metal: ["/cdn/moodboard-realistic-gritty/sfx-heavy-steel-door-creak-open.mp3", "/cdn/moodboard-realistic-gritty/sfx-steel-door-latch-clank-shut.mp3"] };
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state; if (s.lock) { const who = ctx.getObject(by); if (who?.state) who.state.notice = { text: s.lock, at: ctx.now() }; return; }
    s.open = !s.open; s.verb = s.open ? "Close Door" : "Open Door";
    const pos = s.c ?? ctx.self.worldFeetPosition;
    heard(ctx, { maxDistance: 26, refDistance: 3, clip: (SFX[s.kind] ?? SFX.wood)[s.open ? 0 : 1], position: pos, volume: 0.55 }); // heard(): what listens behind other doors hears it too
    doorMoved(ctx, s.pen, s.open, pos);
    ctx.emit("pen:door", { id: s.pen, open: s.open, by, pos });
  },
};
export function update(ctx) {
  const s = ctx.self.state;
  if (!swingTo(ctx, (s.baseYaw ?? 0) + (s.open ? s.openYaw ?? 90 : 0), !!s.open, s.kind ?? "wood", true)) ctx.sleep();
}
