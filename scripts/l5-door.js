// Level 5's things you press that aren't people (state.kind): a radio (E turns the polonaise off and on, for the whole room),
// a sealed door (the lore's other levels: it tells you what's behind it and why it won't open).
import { notify } from "./lib/notify.js";
import { heard } from "./lib/hear.js";
import { animate } from "builtin/tween";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const say = (who, text, ctx) => notify(ctx, who, text); // scripts/lib/notify.js, shared
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by);
    if (s.kind === "radio") {
      s.on = !s.on;
      ctx.self.audio = s.on ? { ...s.track } : null;
      heard(ctx, { clip: G("radio-dial-click-static"), position: { ...ctx.self.worldFeetPosition, y: 1 }, volume: 0.6, maxDistance: 10 });
      s.verb = s.on ? "Switch off" : "Switch on";
      say(who, s.on ? "The valves glow. The violins come back mid-bar, as if they never stopped." : "Click. The room is suddenly very large and very quiet.", ctx);
      return;
    }
    if (s.kind === "sealed") {
      heard(ctx, { clip: G(s.sound ?? "heavy-door-handle-rattle-locked"), position: { ...ctx.self.worldFeetPosition, y: 1 }, volume: 0.7, maxDistance: 12 });
      say(who, s.text, ctx);
      return;
    }
    if (s.kind === "boilerdoor") { // a locked steel door: residents can't open it, a player's E swings it for a few seconds, then it slams and bolts
      const hinge = ctx.getObject(s.hinge), pos = { ...ctx.self.worldFeetPosition, y: 1.2 };
      if (!hinge) return;
      if (s.open) return;
      const inside = (who?.worldFeetPosition?.x ?? 0) > ctx.self.worldFeetPosition.x + 0.2; // the boiler side always opens: nobody gets bolted in
      // Harlan walking with you unbolts it himself: the sign says escort only
      const escort = who && ctx.query({ tags: ["npc"], radius: 60, center: ctx.self.worldFeetPosition }).some((q) => /harlan$/.test(q.id) && q.state?.follow === who.id && !q.state?.dead);
      if (escort && !who.state.l5boilerKey) { who.state.l5boilerKey = true; say(who, "Harlan works the padlock and slides the bolt. \"Stay close.\"", ctx); }
      if (!inside && !escort && !who?.state?.l5boilerKey && !(ctx.now() - (who?.state?.l5boilerPick ?? -1e9) < 6000)) {
        heard(ctx, { clip: G("heavy-door-handle-rattle-locked"), position: pos, volume: 0.7, maxDistance: 12 });
        say(who, "Bolted from the other side and padlocked. Harlan keeps the key, or you could pick it.", ctx);
        return;
      }
      s.open = true; s.verb = "Open"; s.info = "Swinging";
      animate(ctx, hinge, { "rotation.yaw": s.yaw0 + s.swing }, { duration: 0.6, easing: "easeOutCubic" });
      heard(ctx, { clip: G("heavy-metal-door-bolt-unlock-creak-open"), position: pos, volume: 0.8, maxDistance: 16 });
      say(who, "You slide the bolt. Heat and noise roll out. It'll slam shut behind you.", ctx);
      ctx.after(4, "shut");
      return;
    }
    if (s.kind === "bell") {
      heard(ctx, { clip: G("eerie-low-chime-level-up"), position: { ...ctx.self.worldFeetPosition, y: 1 }, volume: 0.7, pitch: 1.6, maxDistance: 14 });
      say(who, "The brass service bell rings with a clear, sharp chime. The sound echoes into the empty gallery.", ctx);
      return;
    }
    if (s.kind === "piano") {
      heard(ctx, { clip: G("eerie-low-chime-level-up"), position: { ...ctx.self.worldFeetPosition, y: 1 }, volume: 0.8, pitch: 0.65, maxDistance: 24 });
      say(who, "You press a yellowed ivory key. A haunting, deep chord reverberates off the coffered ballroom ceiling.", ctx);
      return;
    }
  },
};

// the boiler door's slam: back on its frame and bolted
export function shut(ctx) {
  const s = ctx.self.state, hinge = ctx.getObject(s.hinge);
  if (hinge) animate(ctx, hinge, { "rotation.yaw": s.yaw0 }, { duration: 0.35, easing: "easeInQuad" });
  s.open = false; s.verb = "Unbolt"; s.info = "Locked · Harlan's key or Lockpick 25";
  ctx.after(0.35, "slam");
}
export function slam(ctx) {
  heard(ctx, { clip: G("heavy-steel-door-slam-shut-bolt-clang"), position: { ...ctx.self.worldFeetPosition, y: 1.2 }, volume: 0.9, maxDistance: 20 });
}
