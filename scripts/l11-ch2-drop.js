// Level 11 Clinic dead-drop cache & anomalous Level ! doorway / safe alcove exit interactions.
import { heard } from "./lib/hear.js";
import { carryAcross } from "./lib/carry.js";
import { setCh2Step, syncCh2 } from "./lib/ch2-quest.js";
import { pushFeed } from "./lib/feed.js";

const CLIP_CACHE = "/cdn/moodboard-realistic-gritty/sfx-leather-notebook-elastic-snap-open.mp3";
const CLIP_LOCKED = "/cdn/moodboard-realistic-gritty/sfx-heavy-steel-door-latch-clunk-and-rattle.mp3";
const CLIP_DOOR = "/cdn/moodboard-realistic-gritty/sfx-heavy-metal-fire-door-slam-echo.mp3";
const CLIP_EXIT = "cdn/sfx-soft-bright-two-note-success-chime.mp3";

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state ?? {};
    const who = ctx.getObject(by);
    if (!who || !who.state) return;
    const w = who.state;
    const now = ctx.now();
    const pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;

    if (s.kind === "dina-clinic-cache") {
      if (w.ch2ClinicDone) {
        heard(ctx, { clip: CLIP_CACHE, position: pos, volume: 0.6, maxDistance: 10 });
        w.sub = {
          who: "DINA'S NOTE",
          t: "If you are reading this, I bolted the back exam door. Check Base Gamma's old intake sheets before you ever touch that red threshold.",
          at: now,
          d: 5200,
        };
        return;
      }
      heard(ctx, { clip: CLIP_CACHE, position: pos, volume: 0.85, maxDistance: 12 });
      ctx.emit("screenFlash", { color: "#ffe7b0", duration: 0.3, intensity: 0.35 }, { audience: { player: who.id } });
      w.ch2ClinicDone = 1;
      w.payout = { xp: 65, items: ["almond", "bandage"] };
      w.sub = {
        who: "DINA (FOLDED NOTE)",
        t: "Hospital lights keep bleeding behind the plaster out back. I hid spare bandages here and left River's routing table off M.E.G. books. Ask Moss or Vale at Base Gamma who went down a red hall like that before us.",
        at: now,
        d: 6500,
      };
      if ((w.ch2Q ?? 0) < 3) {
        if (!w.ch2Q) w.ch2Q = 2;
        setCh2Step(ctx, w, 3, "Recovered Dina's clinic dead-drop (+1 Almond Water, +1 Bandage, +65 XP)");
      } else {
        w.notice = { text: "Recovered Dina's clinic dead-drop (+1 Almond Water, +1 Bandage, +65 XP)", at: now };
        pushFeed(w, "Recovered Dina's clinic dead-drop.", now, "info");
        syncCh2(w);
      }
      return;
    }

    if (s.kind === "levelrun-door") {
      if (w.ch2Done) {
        heard(ctx, { clip: CLIP_LOCKED, position: pos, volume: 0.65, maxDistance: 10 });
        w.notice = { text: "Only dry masonry stands behind the frame now. The red hospital threshold is sealed.", at: now };
        return;
      }
      if ((w.ch2Q ?? 0) < 4) {
        heard(ctx, { clip: CLIP_LOCKED, position: pos, volume: 0.8, maxDistance: 12 });
        w.sub = {
          who: "SEALED HOSPITAL DOOR",
          t: "Cold static leaks under the steel sill. Find Dina's clinic note and trace the Base Gamma pattern before forcing the latch.",
          at: now,
          d: 5200,
        };
        w.notice = { text: "The red push-bar will not budge yet.", at: now };
        return;
      }
      heard(ctx, { clip: CLIP_DOOR, position: pos, volume: 0.9, maxDistance: 14 });
      ctx.emit("screenFlash", { color: "#8b0000", duration: 0.55, intensity: 0.75 }, { audience: { player: who.id } });
      if (!w.lrunRescued) setCh2Step(ctx, w, 5);
      const dest = w.lrunRescued ? "levelrun#lrun-alcove" : "levelrun#lrun-start";
      carryAcross(ctx, who, dest);
      ctx.cross(who, dest);
      return;
    }

    if (s.kind === "levelrun-exit") {
      if (w.lrunRescued && !w.ch2Done) {
        w.notice = { text: "Speak with Phoebe in the alcove before stepping back to Level 11.", at: now };
        return;
      }
      heard(ctx, { clip: CLIP_EXIT, position: pos, volume: 0.8, maxDistance: 12 });
      ctx.emit("screenFlash", { color: "#e8f4ff", duration: 0.45, intensity: 0.5 }, { audience: { player: who.id } });
      carryAcross(ctx, who, "level11#l11-from-levelrun");
      ctx.cross(who, "level11#l11-from-levelrun");
    }
  },
};
