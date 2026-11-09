// Level 12's doors and Harris's log (Level 11). The ritual lives in player.state.r12 = { sat, tried, back }.
// know12: the player has heard Harris's log, the only way the window entity in Level 11 lets anyone through.
import R from "./lib/data/level12.yml";
import { heard } from "./lib/hear.js";
import { animate } from "builtin/tween";
const G = "cdn/moodboard-realistic-gritty/";
const RATTLE = G + "sfx-locked-door-handle-rattle-and-jiggle.mp3";
const CREAK = G + "sfx-old-interior-wooden-door-creak-open.mp3";
const CLICK = G + "sfx-cassette-recorder-play-button-clunk.mp3";
const HARRIS = (t) => "cdn/voice-gravel-voiced-weary-military-commander-saying-" + encodeURIComponent(t) + ".mp3";
const LOG = "Sit in the chair a quarter hour. Try the door, even if it's locked. Go out through one of the copy doors. Then wait exactly one hour, and try it again.";
const ROOM = { x: 0, y: 0.05, z: 1.6 };

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), now = ctx.now();
    if (!who) return;
    const pos = { ...(ctx.self.worldFeetPosition ?? ctx.self.feetPosition), y: 1.1 };
    const me = { audience: { player: who.id } };
    if (s.kind === "harris-log") {
      heard(ctx, { clip: CLICK, position: pos, volume: 0.7, maxDistance: 8 });
      heard(ctx, { clip: HARRIS(LOG), position: pos, volume: 1, maxDistance: 8, bus: "Voice" });
      who.state.know12 = true;
      who.state.sub = { who: "CMDR. HARRIS · EXPEDITION LOG \"MATRIX\"", t: "\"" + LOG + " The window down the pizza-place alley that isn't a window, that's how we got in. Walk straight through it. Don't try it unless you know all this.\"", at: now, d: 11000 };
      return;
    }
    const slab = ctx.getObject(ctx.self.id + "/slab");
    const r = { ...(who.state.r12 ?? {}) };
    if (s.kind === "door12") {
      const ready = (r.sat ?? 0) >= R.sit && r.tried && r.back;
      const off = r.back ? Math.abs((now - r.back) / 1000 - R.hour) : 1e9;
      if (ready && off <= R.tol) {
        heard(ctx, { clip: CREAK, position: pos, volume: 0.9, maxDistance: 12 });
        if (slab) animate(ctx, slab, { "rotation.yaw": -100 }, { duration: 1.1, easing: "easeOutCubic" });
        ctx.emit("screenFlash", { color: "#ffffff", duration: 1.4, intensity: 1 }, me);
        who.state.r12 = null; who.state.l12out = (who.state.l12out ?? 0) + 1;
        const to = R.exits[Math.floor(ctx.random() * R.exits.length)];
        ctx.after(1.0, "shut", {}); ctx.cross(who, to);
        return;
      }
      heard(ctx, { clip: RATTLE, position: pos, volume: 0.85, maxDistance: 10 });
      const knob = ctx.getObject(ctx.self.id + "/slab/knob"); if (knob) animate(ctx, knob, { "rotation.roll": [0, -35, 0, -25, 0] }, { duration: 0.6 });
      if (r.back) who.state.r12 = {}; // the hour missed: start over, from the chair
      else if ((r.sat ?? 0) >= R.sit) who.state.r12 = { ...r, tried: true };
      return;
    }
    if (s.kind === "copydoor") {
      heard(ctx, { clip: CREAK, position: pos, volume: 0.8, maxDistance: 10 });
      if (slab) { animate(ctx, slab, { "rotation.yaw": -80 }, { duration: 0.5, easing: "easeOutCubic" }); ctx.after(1.2, "shut", {}); }
      ctx.emit("screenFlash", { color: "#ffffff", duration: 0.8, intensity: 1 }, me);
      who.feetPosition = { ...ROOM }; who.rotation = { yaw: 0 }; who.velocity = { x: 0, y: 0, z: 0 };
      if (r.tried) who.state.r12 = { ...r, back: now }; // back in the room: the hour starts now
      heard(ctx, { clip: CREAK, position: { x: 0, y: 1.1, z: 2.9 }, volume: 0.6, maxDistance: 8 });
    }
  },
};
export function shut(ctx) { const slab = ctx.getObject(ctx.self.id + "/slab"); if (slab) animate(ctx, slab, { "rotation.yaw": 0 }, { duration: 0.8, easing: "easeInOutCubic" }); }
