// Level 11 & Level 34 Chapter 2 prop interactions: Clinic dead-drop, IS LAB bench, Level 34 relay, barricaded satchel, Level ! doorway & alcove exit.
import { heard } from "./lib/hear.js";
import { carryAcross } from "./lib/carry.js";
import { attrsOf, skillsOf } from "./lib/stats.js";
import {
  addPayout,
  completeCh2Echo,
  completeCh2Tone,
  setCh2EchoStep,
  setCh2Step,
  setCh2ToneStep,
  startCh3,
  syncCh2,
} from "./lib/ch2-quest.js";
import { payOnce } from "./lib/quests.js";
import { pushFeed } from "./lib/feed.js";

const CLIP_CACHE = "/cdn/moodboard-realistic-gritty/sfx-leather-notebook-elastic-snap-open.mp3";
const CLIP_LOCKED = "/cdn/moodboard-realistic-gritty/sfx-heavy-steel-door-latch-clunk-and-rattle.mp3";
const CLIP_DOOR = "/cdn/moodboard-realistic-gritty/sfx-heavy-metal-fire-door-slam-echo.mp3";
const CLIP_EXIT = "cdn/sfx-soft-bright-two-note-success-chime.mp3";
const CLIP_BENCH = "cdn/sfx-soft-bright-two-note-success-chime.mp3";

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
          t: "If you are reading this, I bolted the back exam door. Decode IS LAB's bench next door and check Base Gamma's old intake sheets before you ever touch that red threshold.",
          at: now,
          d: 5200,
        };
        return;
      }
      heard(ctx, { clip: CLIP_CACHE, position: pos, volume: 0.85, maxDistance: 12 });
      ctx.emit("screenFlash", { color: "#ffe7b0", duration: 0.3, intensity: 0.35 }, { audience: { player: who.id } });
      w.ch2ClinicDone = 1;
      if (payOnce(w, "ch2-clinic-drop")) {
        addPayout(w, { xp: 65, items: ["almond", "bandage"] });
      }
      w.sub = {
        who: "DINA (FOLDED NOTE)",
        t: "Hospital lights keep bleeding behind the plaster out back. I hid spare bandages here and left River's routing table off M.E.G. books. Lock the carrier on IS LAB's bench next door and ask Moss or Vale at Base Gamma who went down a red hall like that before us.",
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

    if (s.kind === "lab-signal-bench") {
      if (w.ch2SignalDecoded || w.ch2EchoDone) {
        heard(ctx, { clip: CLIP_BENCH, position: pos, volume: 0.6, maxDistance: 10 });
        w.sub = {
          who: "IS LAB SIGNAL BENCH",
          t: "400 Hz carrier locked steady. Trace origin points fifteen meters behind the strip mall masonry: steel fire door, red threshold.",
          at: now,
          d: 5000,
        };
        return;
      }
      if (w.ch2Relay) {
        w.ch2Relay = 0;
        w.ch2RelayUsed = 1;
        ctx.emit("screenFlash", { color: "#b6ffd8", duration: 0.35, intensity: 0.45 }, { audience: { player: who.id } });
        completeCh2Echo(ctx, w, "Slotted waterproof relay into IS LAB bench: 400 Hz carrier locked (+120 XP, +$65.00)");
        w.sub = {
          who: "IS LAB SIGNAL BENCH",
          t: "Relay snaps home. The trace needle spikes to 400 hertz and locks steady: the bleeding static comes straight through the red steel door out back.",
          at: now,
          d: 5500,
        };
        return;
      }
      const sk = skillsOf(w);
      const canScience = (sk.science ?? 0) >= 40;
      const canRepair = (sk.repair ?? 0) >= 35;
      if (canScience || canRepair) {
        const tag = canScience ? "Science 40" : "Repair 35";
        ctx.emit("screenFlash", { color: "#b6ffd8", duration: 0.35, intensity: 0.45 }, { audience: { player: who.id } });
        completeCh2Echo(ctx, w, `Bypassed shorted splitter [${tag}]: 400 Hz carrier locked (+120 XP, +$65.00)`);
        w.sub = {
          who: "IS LAB SIGNAL BENCH",
          t: `[${tag}] You jumper around the burned splitter coil with copper leads. The carrier needle steadies right onto 400 hertz and pins the source to the red door behind the strip mall.`,
          at: now,
          d: 5500,
        };
        return;
      }
      heard(ctx, { clip: CLIP_LOCKED, position: pos, volume: 0.75, maxDistance: 10 });
      setCh2EchoStep(ctx, w, 2, "IS LAB bench shorted: need a waterproof relay or [Science 40 / Repair 35]");
      w.sub = {
        who: "IS LAB SIGNAL BENCH",
        t: "The splitter relay is scorched black inside its resin sleeve. Bypass needs [Science 40] or [Repair 35], otherwise grab a waterproof relay from Level 34's East sewer, Pip at Base Gamma, or Level 11's night janitor.",
        at: now,
        d: 6200,
      };
      return;
    }

    if (s.kind === "l34-ch2-relay") {
      if (w.ch2RelayFound || w.ch2RelayUsed || w.ch2EchoDone) {
        heard(ctx, { clip: CLIP_CACHE, position: pos, volume: 0.5, maxDistance: 10 });
        w.notice = { text: "Only empty packing foam left inside the waterproof transit case.", at: now };
        return;
      }
      heard(ctx, { clip: CLIP_CACHE, position: pos, volume: 0.85, maxDistance: 12 });
      ctx.emit("screenFlash", { color: "#ffe7b0", duration: 0.3, intensity: 0.4 }, { audience: { player: who.id } });
      w.ch2RelayFound = 1;
      w.ch2Relay = 1;
      if (payOnce(w, "l34-ch2-relay")) {
        addPayout(w, { xp: 95, items: ["battery"], text: "Recovered Waterproof Relay Case (+95 XP, +1 Battery)" });
      }
      w.sub = {
        who: "WATERPROOF RELAY CASE",
        t: "Hermetically sealed 400 Hz splitter module and a dry spare flashlight cell. Looks intact under the grease. Take it back to IS LAB in Level 11.",
        at: now,
        d: 5500,
      };
      if ((w.ch2EchoQ ?? 0) < 3) {
        if (!w.ch2EchoQ) w.ch2EchoQ = 2;
        setCh2EchoStep(ctx, w, 3, "Recovered waterproof relay in Level 34: slot it at IS LAB's bench in Level 11 (+95 XP, +1 Battery)");
      } else {
        w.notice = { text: "Recovered Waterproof Relay Case (+95 XP, +1 Battery)", at: now };
      }
      return;
    }

    if (s.kind === "sunderland-satchel") {
      if (w.ch2RunnerData || w.ch2ToneDone) {
        heard(ctx, { clip: CLIP_CACHE, position: pos, volume: 0.5, maxDistance: 10 });
        w.sub = {
          who: "FIELD SATCHEL",
          t: "Scuffed canvas bag stamped 'M. SUNDERLAND'. You already copied down his stride cadence notes.",
          at: now,
          d: 4500,
        };
        return;
      }
      const obs = attrsOf(w).l ?? 5;
      const lockpick = skillsOf(w).lockpick ?? 0;
      if (!w.ch2CamLogged && obs < 6 && lockpick < 30) {
        heard(ctx, { clip: CLIP_LOCKED, position: pos, volume: 0.65, maxDistance: 10 });
        w.sub = {
          who: "WEDGED CANVAS SATCHEL",
          t: "A canvas courier bag is jammed deep behind the wet alley pallets with a rusted buckle clasp. Needs [Observation 6], [Lockpick 30], or Ivy's Camera 4 log at Base Gamma to know what to pull out.",
          at: now,
          d: 5800,
        };
        return;
      }
      heard(ctx, { clip: CLIP_CACHE, position: pos, volume: 0.85, maxDistance: 12 });
      ctx.emit("screenFlash", { color: "#d8f0ff", duration: 0.3, intensity: 0.35 }, { audience: { player: who.id } });
      w.ch2RunnerData = 1;
      w.knowsMike = 1;
      w.sub = {
        who: "MIKE SUNDERLAND'S FIELD SATCHEL",
        t: "Sewn luggage tag reads 'M. SUNDERLAND'. Inside sits a sweat-stained tally sheet marking a steady 134 BPM breath count, gurney heights, and taped spare dressings.",
        at: now,
        d: 6200,
      };
      if (w.ch2CamLogged) {
        completeCh2Tone(ctx, w);
      } else {
        if (!w.ch2ToneQ) w.ch2ToneQ = 2;
        setCh2ToneStep(ctx, w, 3, "Recovered Mike Sunderland's field satchel: take the pacing log to Ivy at Base Gamma or Kael on 11th Ave");
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
        const needText = !w.ch2ClinicDone
          ? "Cold static leaks under the steel sill. Search Centro Dermatologico for Dina's clinic note first."
          : !w.ch2SignalDecoded && !w.ch2Archive
            ? "Cold static leaks under the steel sill. Decode the carrier on IS LAB's bench and check Base Gamma's intake ledger first."
            : !w.ch2SignalDecoded
              ? "Gamma names Mike Sunderland, but the latch static is still scrambled. Decode the carrier on IS LAB's bench first."
              : "Carrier is locked, but nobody in Level 11 knows who survived the other side. Check Base Gamma's intake ledger first.";
        w.sub = { who: "SEALED HOSPITAL DOOR", t: needText, at: now, d: 5500 };
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

    if (s.kind === "levelrun-to-109") {
      if (!w.ch2Done) { heard(ctx, { clip: CLIP_LOCKED, position: pos, volume: 0.7, maxDistance: 10 }); w.notice = { text: w.lrunRescued ? "Phoebe is still watching you. Talk to her first." : "The handle will not turn.", at: now }; return; }
      startCh3(ctx, who);
      heard(ctx, { clip: CLIP_DOOR, position: pos, volume: 0.6, maxDistance: 12 });
      carryAcross(ctx, who, "level109");
      ctx.cross(who, "level109");
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
