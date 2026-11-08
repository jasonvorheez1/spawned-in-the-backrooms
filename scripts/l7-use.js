// Interactive objects on Level 7 ("Thalassophobia"):
// - Rowboat skiff ferries between Entrance Pier, M.E.G. Outpost Seawatch (Near Island), and Fort Surrender (Far Island)
// - M.E.G. Deep-Trench Hydrophone & Sonar Console
// - Driftwood & oil-drum warming braziers (counters hypothermia & restores sanity/health)
// - Fort Surrender seawater distillation still
// - Leviathan Ribcage & Abyssal Tar Altar
// - Submersible Diving Bell & Level 8 Tar Cavern Winch
import { heard } from "./lib/hear.js";
import { skillsOf } from "./lib/stats.js";

const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const say = (who, text, ctx) => {
  if (who) who.state.notice = { text, at: ctx.now() };
};
const snd = (ctx, pos, clip, v = 0.65, maxDistance = 16) =>
  heard(ctx, { clip: G(clip), position: { x: pos.x, y: (pos.y ?? 0) + 1, z: pos.z }, volume: v, maxDistance });

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state;
    const who = ctx.getObject(by);
    if (!who || !who.state) return;
    const now = ctx.now();
    const uid = who.userId ?? by;
    const pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;

    // 1. ROWBOAT SKIFF FERRY BETWEEN PIER, SEAWATCH ISLAND & FORT SURRENDER
    if (s.kind === "ferry") {
      const dest = s.dest;
      if (!dest) return;
      snd(ctx, pos, "heavy-waves-slapping-wet-rocks-and-pier-posts-loop", 0.7, 18);
      ctx.emit("screenFlash", { color: "#050d14", duration: 1.1, intensity: 0.95 }, { audience: { player: by } });
      who.feetPosition = { x: dest.x, y: dest.y, z: dest.z };
      if (dest.yaw != null) who.rotation = { yaw: dest.yaw };
      snd(ctx, dest, "water-pour-splash-short", 0.65, 14);
      say(who, `You pull the oars through the freezing grey swells and moor at ${dest.name}.`, ctx);
      return;
    }

    // 2. M.E.G. DEEP-TRENCH HYDROPHONE & SONAR CONSOLE (Seawatch Outpost)
    if (s.kind === "sonar") {
      const sk = skillsOf(who.state);
      const sci = Math.max(sk.science ?? 0, sk.survival ?? 0);
      const seen = (s.scannedBy ??= {})[uid];
      snd(ctx, pos, "old-computer-boot-startup-chime", 0.65, 18);
      ctx.emit(
        "playSound",
        { clip: G("deep-whale-like-groan-from-far-under-dark-water"), position: { x: 20, y: -12, z: -140 }, volume: 0.55, refDistance: 60, maxDistance: 300 },
        { audience: { player: by } }
      );
      if (!seen) {
        s.scannedBy[uid] = now;
        const bonus = sci >= 30;
        who.state.payout = {
          xp: bonus ? 55 : 35,
          items: bonus ? ["battery", "almond"] : ["almond"],
          text: bonus
            ? "[Science/Survival 30] Sonar ping locks onto TWO gargantuan contacts: Entity 20 ('The Thing') at 180m and 'Tiny' circling the Midnight Zone trench at 3,800m! (+55 XP, +Battery, +Almond Water)"
            : "Sonar ping echoes back from the Twilight & Midnight Zones: two massive biological contacts prowl above the abyssal tar floor. (+35 XP, +Almond Water)",
        };
        return;
      }
      if (now - seen < 30000) {
        say(who, "Hydrophone array recharging capacitors... The green CRT trace sweeps across the Midnight Zone.", ctx);
        return;
      }
      s.scannedBy[uid] = now;
      who.state.sanity = Math.min(100, (who.state.sanity ?? 80) + 5);
      say(who, "Sonar sweep: Entity 20 is cruising the Daylight-Twilight boundary; 'Tiny' holds near the NW Tar Trench. (Sanity +5)", ctx);
      return;
    }

    // 3. WARMING DRIFTWOOD BRAZIER (Seawatch Outpost & Fort Surrender)
    if (s.kind === "brazier") {
      const last = (s.warmBy ??= {})[uid] ?? 0;
      if (now - last < 40000) {
        say(who, "You hold your hands to the crackling driftwood coals. The sea chill recedes.", ctx);
        return;
      }
      s.warmBy[uid] = now;
      snd(ctx, pos, "bandage-wrap-cloth", 0.5, 12);
      who.state.hp = Math.min(120, (who.state.hp ?? 100) + 15);
      who.state.sanity = Math.min(100, (who.state.sanity ?? 80) + 12);
      who.state.hunger = Math.min(100, (who.state.hunger ?? 80) + 12);
      say(who, "You dry your salt-soaked gear by the brazier and toast rations over the coals. (+15 HP, +12 Sanity, +12 Hunger)", ctx);
      return;
    }

    // 4. FORT SURRENDER SEAWATER DISTILLATION STILL
    if (s.kind === "still") {
      const last = (s.drawBy ??= {})[uid] ?? 0;
      if (now - last < 90000) {
        const rem = Math.ceil((90000 - (now - last)) / 1000);
        say(who, `The copper condenser coils hiss softly. Another distilled bottle will be ready in ${rem}s.`, ctx);
        return;
      }
      s.drawBy[uid] = now;
      snd(ctx, pos, "drinking-fountain-water-run", 0.65, 12);
      who.state.thirst = Math.min(100, (who.state.thirst ?? 80) + 30);
      who.state.payout = {
        xp: 15,
        items: ["almond"],
        text: "You draw a warm bottle of distilled Almond Water from the condenser spout. (+1 Almond Water, Thirst +30, +15 XP)",
      };
      return;
    }

    // 4B. THE WOODEN DOOR IN THE FLOOR OF THE CIRCULAR FORMATION (Level 9; Tiny's lair)
    if (s.kind === "hatch") {
      snd(ctx, { x: -150, y: -21, z: 0 }, "heavy-wooden-knock-on-hollow-door-underwater", 0.8, 40);
      ctx.emit("screenShake", { intensity: 0.3, duration: 1.2 }, { audience: { player: by } });
      ctx.emit("playSound", { clip: G("deep-whale-like-groan-from-far-under-dark-water"), position: { x: -150, y: -21, z: 0 }, volume: 0.9, refDistance: 40, maxDistance: 300 }, { audience: { player: by } });
      who.state.sanity = Math.max(0, (who.state.sanity ?? 80) - 6);
      say(who, "You pull at the iron ring. The door does not give. Something heavy turns over on the other side and the water round the pillars goes still. (Sanity -6)", ctx);
      return;
    }

    // 5. ALTAR OF THE DEEP / LEVIATHAN RIBCAGE SHRINE (Fort Surrender Summit)
    if (s.kind === "altar") {
      const done = (s.blessedBy ??= {})[uid];
      const sk = skillsOf(who.state);
      const pass = (sk.survival ?? 0) >= 35 || (sk.speech ?? 0) >= 35;
      ctx.emit("screenShake", { intensity: 0.16, duration: 1.0 }, { audience: { player: by } });
      ctx.emit(
        "playSound",
        { clip: G("deep-whale-like-groan-from-far-under-dark-water"), position: { x: -85, y: -8, z: -115 }, volume: 0.8, refDistance: 80, maxDistance: 400 },
        { audience: { player: by } }
      );
      if (!done) {
        s.blessedBy[uid] = now;
        who.state.payout = {
          xp: pass ? 65 : 40,
          items: pass ? ["blue", "firesalt"] : ["blue"],
          text: pass
            ? "[Survival/Speech 35] The black tar bubbles as a sub-audible groan vibrates through the Leviathan ribs. You recover a vial of Blue Almond Water and Fire Salt from the offering basin! (+65 XP)"
            : "You gaze into the bubbling abyssal tar beneath the Leviathan ribs. Something ancient acknowledges your stillness. (+40 XP, +Blue Almond Water)",
        };
        return;
      }
      who.state.sanity = Math.min(100, (who.state.sanity ?? 80) + 8);
      say(who, "The black tar ripples in time with the slow heartbeat of the Abyss. Your thalassophobia quiets. (Sanity +8)", ctx);
      return;
    }

    // 6. SUBMERSIBLE DIVING BELL & LEVEL 8 TAR CAVERN WINCH
    if (s.kind === "divingbell") {
      const hauled = (s.hauledBy ??= {})[uid];
      snd(ctx, pos, "heavy-chain-rattle-on-metal-door", 0.75, 18);
      if (!hauled) {
        s.hauledBy[uid] = now;
        who.state.payout = {
          xp: 60,
          items: ["kit", "shells", "almond"],
          text: "You crank the rusted winch! A tar-coated M.E.G. dive canister surfaces from the skeletal cave mouth to Level 8 ('Cave System'). (+60 XP, +Repair Kit, +Shells, +Almond Water)",
        };
        return;
      }
      say(who, "Through the diving bell's porthole, pitch-black tar stalactites and bleached bones descend into Level 8 ('Cave System'). The pressure gauge is pinned in the red.", ctx);
    }
  },
};
