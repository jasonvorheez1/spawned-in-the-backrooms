// Interactive objects on Level 7 ("Thalassophobia") — 100% Show, Don't Tell:
// - Rowboat skiff ferries between Entrance Pier, M.E.G. Outpost Seawatch, and Fort Surrender
// - M.E.G. Deep-Trench Hydrophone & Sonar Console (green CRT phosphor traces, hydrophone pings, whale groans)
// - Driftwood & oil-drum warming braziers (ember sizzle, screen warmth, floating stat restore)
// - Fort Surrender seawater distillation still (condenser hiss, cool cyan pulse, floating hydration)
// - Submerged Wooden Door to Level 9 (heavy iron ring rattle, abyssal groan, screen shake)
// - Leviathan Ribcage & Abyssal Tar Altar (sub-bass roar, purple pulse, sanity restoration)
// - Submersible Diving Bell & Level 8 Tar Cavern Winch (heavy chain clatter, rushing water roar, transition)
// - Stacked Bureau Drawers & Drowned Antique Armoire (wood drawer slide, door creak, antique loot popups)
import { heard } from "./lib/hear.js";
import { skillsOf } from "./lib/stats.js";

const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
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
      ctx.emit("damageNumber", {
        position: { x: dest.x, y: dest.y + 1.6, z: dest.z },
        text: `MOORED: ${dest.name.toUpperCase()}`,
        color: "#74d4f8",
        size: 1.2,
      }, { audience: { player: by } });
      return;
    }

    // 2. M.E.G. DEEP-TRENCH HYDROPHONE & SONAR CONSOLE (Seawatch Outpost)
    if (s.kind === "sonar") {
      const sk = skillsOf(who.state);
      const sci = Math.max(sk.science ?? 0, sk.survival ?? 0);
      const seen = (s.scannedBy ??= {})[uid];
      snd(ctx, pos, "old-computer-boot-startup-chime", 0.75, 18);
      ctx.emit("screenFlash", { color: "#104020", duration: 0.5, intensity: 0.4 }, { audience: { player: by } });
      ctx.emit(
        "playSound",
        { clip: G("deep-whale-like-groan-from-far-under-dark-water"), position: { x: 20, y: -12, z: -140 }, volume: 0.65, refDistance: 60, maxDistance: 300 },
        { audience: { player: by } }
      );
      if (!seen) {
        s.scannedBy[uid] = now;
        const bonus = sci >= 30;
        const xp = bonus ? 55 : 35;
        who.state.payout = {
          xp,
          items: bonus ? ["battery", "almond"] : ["almond"],
        };
        ctx.emit("damageNumber", {
          position: { x: pos.x, y: pos.y + 1.3, z: pos.z },
          text: bonus ? "SONAR LOCK: ENTITY 20 (180m) & TINY (3800m) (+55 XP)" : "SONAR SWEEP: 2 CONTACTS CONFIRMED (+35 XP)",
          color: "#50ff80",
          size: 1.25,
        }, { audience: { player: by } });
        return;
      }
      if (now - seen < 30000) {
        ctx.emit("damageNumber", {
          position: { x: pos.x, y: pos.y + 1.1, z: pos.z },
          text: "RECHARGING HYDROPHONE CAPACITORS...",
          color: "#80a080",
        }, { audience: { player: by } });
        return;
      }
      s.scannedBy[uid] = now;
      who.state.sanity = Math.min(100, (who.state.sanity ?? 80) + 5);
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.3, z: pos.z },
        text: "TRENCH SWEEP: CONTACTS CIRCLING (+5 SANITY)",
        color: "#50ff80",
        size: 1.1,
      }, { audience: { player: by } });
      return;
    }

    // 3. WARMING DRIFTWOOD BRAZIER (Seawatch Outpost & Fort Surrender)
    if (s.kind === "brazier") {
      const last = (s.warmBy ??= {})[uid] ?? 0;
      if (now - last < 40000) {
        ctx.emit("damageNumber", {
          position: { x: pos.x, y: pos.y + 1.1, z: pos.z },
          text: "WARMED BY COALS",
          color: "#cc8830",
        }, { audience: { player: by } });
        return;
      }
      s.warmBy[uid] = now;
      snd(ctx, pos, "bandage-wrap-cloth", 0.6, 12);
      ctx.emit("screenFlash", { color: "#ff8830", duration: 0.6, intensity: 0.35 }, { audience: { player: by } });
      who.state.hp = Math.min(120, (who.state.hp ?? 100) + 15);
      who.state.sanity = Math.min(100, (who.state.sanity ?? 80) + 12);
      who.state.hunger = Math.min(100, (who.state.hunger ?? 80) + 12);
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.3, z: pos.z },
        text: "+15 HP  +12 SANITY  +12 FOOD",
        color: "#ffaa40",
        size: 1.25,
      }, { audience: { player: by } });
      return;
    }

    // 4. FORT SURRENDER SEAWATER DISTILLATION STILL
    if (s.kind === "still") {
      const last = (s.drawBy ??= {})[uid] ?? 0;
      if (now - last < 90000) {
        const rem = Math.ceil((90000 - (now - last)) / 1000);
        ctx.emit("damageNumber", {
          position: { x: pos.x, y: pos.y + 1.1, z: pos.z },
          text: `CONDENSING COILS ACTIVE (${rem}s)`,
          color: "#80c0d0",
        }, { audience: { player: by } });
        return;
      }
      s.drawBy[uid] = now;
      snd(ctx, pos, "drinking-fountain-water-run", 0.7, 12);
      ctx.emit("screenFlash", { color: "#40d8ff", duration: 0.45, intensity: 0.3 }, { audience: { player: by } });
      who.state.thirst = Math.min(100, (who.state.thirst ?? 80) + 30);
      who.state.payout = {
        xp: 15,
        items: ["almond"],
      };
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.3, z: pos.z },
        text: "+ALMOND WATER  +30 THIRST  +15 XP",
        color: "#60e0ff",
        size: 1.25,
      }, { audience: { player: by } });
      return;
    }

    // 4B. THE WOODEN DOOR IN THE FLOOR OF THE CIRCULAR FORMATION (Level 9; Tiny's lair)
    if (s.kind === "hatch") {
      snd(ctx, { x: -150, y: -21, z: 0 }, "heavy-wooden-knock-on-hollow-door-underwater", 0.85, 40);
      ctx.emit("screenShake", { intensity: 0.35, duration: 1.2 }, { audience: { player: by } });
      ctx.emit("playSound", { clip: G("deep-whale-like-groan-from-far-under-dark-water"), position: { x: -150, y: -21, z: 0 }, volume: 0.95, refDistance: 40, maxDistance: 300 }, { audience: { player: by } });
      who.state.sanity = Math.max(0, (who.state.sanity ?? 80) - 6);
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 0.8, z: pos.z },
        text: "LOCKED FROM BELOW (-6 SANITY)",
        color: "#ff4444",
        size: 1.25,
      }, { audience: { player: by } });
      return;
    }

    // 5. ALTAR OF THE DEEP / LEVIATHAN RIBCAGE SHRINE (Fort Surrender Summit)
    if (s.kind === "altar") {
      const done = (s.blessedBy ??= {})[uid];
      const sk = skillsOf(who.state);
      const pass = (sk.survival ?? 0) >= 35 || (sk.speech ?? 0) >= 35;
      ctx.emit("screenShake", { intensity: 0.28, duration: 1.1 }, { audience: { player: by } });
      ctx.emit("screenFlash", { color: "#380d54", duration: 0.8, intensity: 0.45 }, { audience: { player: by } });
      ctx.emit(
        "playSound",
        { clip: G("deep-whale-like-groan-from-far-under-dark-water"), position: { x: -85, y: -8, z: -115 }, volume: 0.85, refDistance: 80, maxDistance: 400 },
        { audience: { player: by } }
      );
      if (!done) {
        s.blessedBy[uid] = now;
        const xp = pass ? 65 : 40;
        who.state.payout = {
          xp,
          items: pass ? ["blue", "firesalt"] : ["blue"],
        };
        ctx.emit("damageNumber", {
          position: { x: pos.x, y: pos.y + 1.5, z: pos.z },
          text: pass ? "LEVIATHAN BLESSING: BLUE WATER & FIRE SALT (+65 XP)" : "LEVIATHAN BLESSING: BLUE WATER (+40 XP)",
          color: "#c060ff",
          size: 1.3,
        }, { audience: { player: by } });
        return;
      }
      who.state.sanity = Math.min(100, (who.state.sanity ?? 80) + 8);
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.3, z: pos.z },
        text: "THE ABYSS QUIETS (+8 SANITY)",
        color: "#a080d0",
        size: 1.15,
      }, { audience: { player: by } });
      return;
    }

    // 6. SUBMERSIBLE DIVING BELL & LEVEL 8 TAR CAVERN WINCH
    if (s.kind === "divingbell") {
      const hauled = (s.hauledBy ??= {})[uid];
      snd(ctx, pos, "heavy-chain-rattle-on-metal-door", 0.8, 18);
      if (!hauled) {
        s.hauledBy[uid] = now;
        who.state.payout = {
          xp: 60,
          items: ["kit", "shells", "almond"],
        };
        ctx.emit("damageNumber", {
          position: { x: pos.x, y: pos.y + 1.4, z: pos.z },
          text: "SURFACED DIVE CANISTER (+60 XP, +KIT, +SHELLS)",
          color: "#ffd460",
          size: 1.25,
        }, { audience: { player: by } });
        return;
      }
      snd(ctx, pos, "heavy-waves-slapping-wet-rocks-and-pier-posts-loop", 0.9, 20);
      ctx.emit("screenFlash", { color: "#020a10", duration: 1.6, intensity: 1 }, { audience: { player: by } });
      ctx.emit("screenShake", { intensity: 0.4, duration: 1.4 }, { audience: { player: by } });
      ctx.cross(who, "level8#l8-from-l7");
      return;
    }

    // 7. STACKED BUREAU DRAWERS (Room 1 Drowned Parlor)
    if (s.kind === "drawers") {
      snd(ctx, pos, "bandage-wrap-cloth", 0.65, 12);
      ctx.emit("screenFlash", { color: "#d4a040", duration: 0.3, intensity: 0.25 }, { audience: { player: by } });
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.2, z: pos.z },
        text: "SEARCHED BUREAU DRAWERS (+25 XP)",
        color: "#ffd700",
        size: 1.2,
      }, { audience: { player: by } });
      return;
    }

    // 8. DROWNED ANTIQUE ARMOIRE (Room 1 Drowned Parlor)
    if (s.kind === "armoire") {
      snd(ctx, pos, "water-pour-splash-short", 0.7, 12);
      ctx.emit("screenFlash", { color: "#60d0e0", duration: 0.4, intensity: 0.3 }, { audience: { player: by } });
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.4, z: pos.z },
        text: "SEARCHED ANTIQUE ARMOIRE (+35 XP)",
        color: "#74d4f8",
        size: 1.25,
      }, { audience: { player: by } });
      return;
    }
  },
};
