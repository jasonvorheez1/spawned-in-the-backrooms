// Level 69: an orange reflector post on the wall. During "Mile Markers" E clamps one of Wren's survey beacons to it
// (scripts/lib/level69-quest.js plantBeacon); a planted post grows a small red blinking light.
import { plantBeacon } from "./lib/level69-quest.js";
export const ears = {
  press: (ctx, { by }) => {
    const p = ctx.getObject(by); if (!p?.state) return;
    const before = (p.state.l69planted ?? []).length;
    p.state.notice = { text: plantBeacon(ctx, p, ctx.self), at: ctx.now() };
    if ((p.state.l69planted ?? []).length > before) {
      ctx.self.state.planted = true;
      ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-metal-clamp-ratchet-click-then-electronic-beep.mp3", position: ctx.self.feetPosition, volume: 0.8, maxDistance: 20 });
      ctx.spawn({ parent: ctx.self.id, feetPosition: { x: 0, y: 1.35, z: 0 }, primitive: { kind: "sphere", radius: 0.05 }, material: { color: "#ff2a1a", emissive: "#ff2a1a", emissiveIntensity: 4 },
        light: { kind: "point", color: "#ff3020", intensity: 1.2, distance: 6 } });
    }
  },
};
