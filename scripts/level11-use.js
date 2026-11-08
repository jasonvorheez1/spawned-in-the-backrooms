// Level 11 "The Infinite City" - Interactive Props & Gameplay Systems
// Handles the street payphone, food cart, rooftop skydeck elevator, panoramic binoculars,
// construction ladder, M.E.G. terminal, and petting the friendly hound.

import { heard } from "./lib/hear.js";
import { dmgAfterArmor } from "./lib/stats.js";

const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;

const PAYPHONE_RING = "/cdn/moodboard-realistic-gritty/sfx-old-payphone-mechanical-bell-ringing-loop.mp3";
const PAYPHONE_LIFT = "/cdn/moodboard-realistic-gritty/sfx-payphone-handset-lifted-off-metal-hook-clunk.mp3";
const PAYPHONE_STATIC = "/cdn/moodboard-realistic-gritty/sfx-telephone-earpiece-line-static-hiss-and-crackle.mp3";
const REGISTER_CHIME = "/cdn/moodboard-realistic-gritty/sfx-cash-register-cha-ching-bell-and-drawer.mp3";
const SIZZLE = "/cdn/moodboard-realistic-gritty/sfx-burgers-sizzling-on-flat-top-griddle-loop.mp3";
const ELEVATOR_CHIME = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const WIND_LOOP = "/cdn/moodboard-realistic-gritty/sfx-wind-draft-cold-abyss-loop.mp3";
const TERMINAL_CHIME = "/cdn/moodboard-realistic-gritty/sfx-old-computer-boot-startup-chime.mp3";
const HOUND_BARK = "/cdn/moodboard-realistic-gritty/sfx-hound-bark-howl-call.mp3";
const CHEST_OPEN = "/cdn/moodboard-realistic-gritty/sfx-old-steamer-trunk-lid-creak-open.mp3";

const PHONE_MESSAGES = [
  "M.E.G. Automated Dispatch: 'Attention wanderers in Level 11. Remain on mapped avenues. The Level 11 Effect renders entities docile, but do not provoke them.'",
  "Operator voice through crackling static: 'Hello? Is someone there? I hear traffic... real traffic! Are you near the Capital? Please...'",
  "Mysterious radio broadcast: 'For my little strawberry... Tamsin, if you can hear this, mom and dad are waiting at Base Beta...'",
  "Static hum followed by three dual-tones: 'Notice 11-B: All municipal tap water in the Capital district is tested pure Almond Water. Drink freely.'",
  "A calm voice: 'The city does not sleep, because the city is not alive. Yet it keeps us safe from the dark. Welcome home.'",
];

const TERMINAL_LOGS = [
  "=== M.E.G. DOSSIER: LEVEL 11 (THE INFINITE CITY) ===\nClass 1 / Safe / Habitable.\nDiscovered by M.E.G. as the 36th major expedition group. A seemingly endless Western metropolis spanning thousands of square miles.",
  "=== ANOMALOUS PHENOMENON: THE LEVEL 11 EFFECT ===\nHostile entities (Hounds, Facelings, Deathmoths) become remarkably docile upon entering Level 11. Facelings wear civilian business attire and commute peacefully. Hounds behave like domestic stray dogs.",
  "=== ANOMALY BULLETIN: UNSTABLE STREET EXITS ===\nLevel 11 acts as the Backrooms' universal hub. Certain side streets contain dense noclip rifts. Follow the wooden pallet barricades and spray-painted warnings to avoid falling through into uncharted levels.",
];

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state;
    const who = ctx.getObject(by);
    const pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
    const w = who?.state ?? {};
    const now = ctx.now();

    // 1. Street Payphone
    if (s.kind === "payphone") {
      heard(ctx, { clip: PAYPHONE_LIFT, position: pos, volume: 0.9, maxDistance: 14 });
      heard(ctx, { clip: PAYPHONE_STATIC, position: pos, volume: 0.75, maxDistance: 10 });

      s.msgIdx = ((s.msgIdx ?? -1) + 1) % PHONE_MESSAGES.length;
      const msg = PHONE_MESSAGES[s.msgIdx];

      w.sanity = Math.min(100, (w.sanity ?? 80) + 15);

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.6, z: pos.z },
        text: "+15 SANITY (CONNECTED LINE)",
        color: "#68d8d6",
        size: 1.05,
      }, { audience: { player: who.id } });

      ctx.emit("screenFlash", { color: "#d0f0ff", duration: 0.35, intensity: 0.4 }, { audience: { player: who.id } });

      if (w) {
        w.sub = { who: "PAYPHONE RECEIVER", t: msg, at: now, d: 5500 };
      }
      return;
    }

    // 2. Street Food Cart: Hot Soft Pretzel
    if (s.kind === "food-pretzel") {
      heard(ctx, { clip: REGISTER_CHIME, position: pos, volume: 0.85, maxDistance: 14 });
      heard(ctx, { clip: SIZZLE, position: pos, volume: 0.7, maxDistance: 10 });

      w.hunger = Math.min(100, (w.hunger ?? 80) + 35);
      w.sanity = Math.min(100, (w.sanity ?? 80) + 20);

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.4, z: pos.z },
        text: "+WARM CAPITAL PRETZEL (+35 HUNGER, +20 SANITY)",
        color: "#ffc857",
        size: 1.1,
      }, { audience: { player: who.id } });
      return;
    }

    // 3. Street Food Cart: New York Street Dog
    if (s.kind === "food-hotdog") {
      heard(ctx, { clip: REGISTER_CHIME, position: pos, volume: 0.85, maxDistance: 14 });
      heard(ctx, { clip: SIZZLE, position: pos, volume: 0.8, maxDistance: 10 });

      w.hunger = Math.min(100, (w.hunger ?? 80) + 45);
      w.hp = Math.min(w.maxHp ?? 100, (w.hp ?? 80) + 25);
      w.coffeeSpeedUntil = now + 60000; // 60s sprint speed buff

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.4, z: pos.z },
        text: "+CITY STREET DOG (+CITY STRIDER SPRINT BUFF)",
        color: "#ff6b6b",
        size: 1.1,
      }, { audience: { player: who.id } });
      return;
    }

    // 4. Rooftop Skydeck Glass Elevator: Ascend to Roof (14th floor)
    if (s.kind === "elevator-up") {
      heard(ctx, { clip: ELEVATOR_CHIME, position: pos, volume: 1.0, maxDistance: 20 });
      ctx.emit("screenFlash", { color: "#ffffff", duration: 0.7, intensity: 0.6 }, { audience: { player: who.id } });

      // Teleport up to Skydeck observation terrace
      who.feetPosition = s.dest ?? { x: 22, y: 35.8, z: 31 };
      who.rotation = { yaw: 90 };

      if (w) {
        w.notice = {
          text: "Rooftop Skydeck (Floor 14) · Panoramic city vantage",
          at: now,
        };
      }
      return;
    }

    // 5. Rooftop Skydeck Glass Elevator: Descend to Ground Floor Lobby
    if (s.kind === "elevator-down") {
      heard(ctx, { clip: ELEVATOR_CHIME, position: pos, volume: 1.0, maxDistance: 20 });
      ctx.emit("screenFlash", { color: "#ffffff", duration: 0.7, intensity: 0.6 }, { audience: { player: who.id } });

      // Teleport back to ground floor lobby
      who.feetPosition = s.dest ?? { x: 15, y: 0.3, z: 35 };
      who.rotation = { yaw: 90 };

      if (w) {
        w.notice = {
          text: "Grand Tower Ground Floor Lobby",
          at: now,
        };
      }
      return;
    }

    // 6. Panoramic Observation Binoculars
    if (s.kind === "binoculars") {
      heard(ctx, { clip: WIND_LOOP, position: pos, volume: 0.8, maxDistance: 15 });

      if (who.isLocal) {
        s.zoomed = !s.zoomed;
        if (s.zoomed) {
          ctx.view.camera = {
            eye: { x: pos.x, y: pos.y + 1.4, z: pos.z },
            aim: { x: pos.x, y: pos.y + 1.2, z: pos.z - 50 },
            fov: 18, // Telephoto zoom view
          };
          ctx.emit("damageNumber", {
            position: { x: pos.x, y: pos.y + 1.8, z: pos.z },
            text: "PANORAMIC VIEWFINDER ENGAGED",
            color: "#4ecdc4",
            size: 1.1,
          }, { audience: { player: who.id } });
        } else {
          ctx.view.camera = null;
        }
      } else {
        ctx.emit("damageNumber", {
          position: { x: pos.x, y: pos.y + 1.8, z: pos.z },
          text: "PANORAMIC VIEWFINDER ENGAGED",
          color: "#4ecdc4",
          size: 1.1,
        }, { audience: { player: who.id } });
      }
      return;
    }

    // 7. Construction Ladder (Renovation Interior)
    if (s.kind === "ladder") {
      heard(ctx, { clip: G("clothing-rustle-getting-up-from-seat"), position: pos, volume: 0.8, maxDistance: 10 });
      // Boost player up onto catwalk beam
      who.feetPosition = { x: pos.x, y: pos.y + 3.4, z: pos.z + 0.3 };
      who.velocity = { x: 0, y: 2, z: 0 };
      return;
    }

    // 8. M.E.G. Tactical Computer Terminal
    if (s.kind === "terminal") {
      heard(ctx, { clip: TERMINAL_CHIME, position: pos, volume: 0.85, maxDistance: 15 });
      s.logIdx = ((s.logIdx ?? -1) + 1) % TERMINAL_LOGS.length;
      const log = TERMINAL_LOGS[s.logIdx];

      if (w) {
        w.sub = { who: "M.E.G. DATABASE", t: log, at: now, d: 7000 };
      }
      return;
    }

    // 9. Friendly Level 11 Hound (Docility Effect)
    if (s.kind === "pet-hound") {
      heard(ctx, { clip: HOUND_BARK, position: pos, volume: 0.75, pitch: 1.35, maxDistance: 16 });
      w.sanity = Math.min(100, (w.sanity ?? 80) + 15);

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.2, z: pos.z },
        text: "+15 SANITY (PET FRIENDLY HOUND)",
        color: "#95e1d3",
        size: 1.1,
      }, { audience: { player: who.id } });

      ctx.emit("screenFlash", { color: "#ffeedd", duration: 0.35, intensity: 0.4 }, { audience: { player: who.id } });
      return;
    }

    // 10. Supply Chest
    if (s.kind === "supply-chest") {
      if (s.opened) {
        if (w) w.notice = { text: "Chest already salvaged.", at: now };
        return;
      }
      s.opened = true;
      heard(ctx, { clip: CHEST_OPEN, position: pos, volume: 0.9, maxDistance: 14 });
      w.payout = {
        xp: 35,
        items: ["almond", "firstaid", "battery"],
      };

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.2, z: pos.z },
        text: "+SUPPLIES RECOVERED (ALMOND WATER, FIRST AID, BATTERY)",
        color: "#45b649",
        size: 1.05,
      }, { audience: { player: who.id } });
      return;
    }

    // 11. Marroka Pizzeria: Fresh Hot Level 11 Pizza Slice
    if (s.kind === "food-pizza") {
      heard(ctx, { clip: REGISTER_CHIME, position: pos, volume: 0.9, maxDistance: 16 });
      heard(ctx, { clip: SIZZLE, position: pos, volume: 0.8, maxDistance: 12 });

      w.hunger = Math.min(100, (w.hunger ?? 80) + 45);
      w.sanity = Math.min(100, (w.sanity ?? 80) + 30);
      w.coffeeSpeedUntil = now + 90000; // 90s speed buff

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.4, z: pos.z },
        text: "+FRESH MARROKA PIZZA (+45 HUNGER, +30 SANITY, +SPRINT BOOST)",
        color: "#ff9234",
        size: 1.15,
      }, { audience: { player: who.id } });

      ctx.emit("screenFlash", { color: "#fff4e6", duration: 0.4, intensity: 0.4 }, { audience: { player: who.id } });
      if (w) w.notice = { text: "Marroka Pizzeria: Oven-fresh thin crust with Almond Water mozzarella!", at: now };
      return;
    }

    // 12. Sedco Spotlight Vintage CCTV Surveillance Console
    if (s.kind === "sedco-cctv") {
      heard(ctx, { clip: TERMINAL_CHIME, position: pos, volume: 0.85, maxDistance: 14 });
      s.camIdx = ((s.camIdx ?? -1) + 1) % 4;
      const CAM_FEEDS = [
        "FEED 01 · 11th Ave & Central Boulevard [NORMAL · 0 HOSTILES]",
        "FEED 02 · Grand Canal Promenade & Roadway Bridge [CALM · WATER STABLE]",
        "FEED 03 · Southwestern Strip Mall & Parking Plaza [CLEAR]",
        "FEED 04 · Grand Neoclassical Tower Skydeck Vantage [HORIZON CLEAR]",
      ];
      if (w) {
        w.sub = {
          who: "SEDCO CCTV MONITOR",
          t: `${CAM_FEEDS[s.camIdx]}\nAll street monitors nominal. The Level 11 Effect pacifies entities.`,
          at: now,
          d: 5500,
        };
      }
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.2, z: pos.z },
        text: "CCTV SURVEILLANCE FEED CYCLED",
        color: "#38ef7d",
        size: 1.05,
      }, { audience: { player: who.id } });
      return;
    }

    // 13. B.R.C. (Backrooms Remodeling Company) Work Order Clipboard
    if (s.kind === "brc-clipboard") {
      heard(ctx, { clip: TERMINAL_CHIME, position: pos, volume: 0.7, pitch: 1.3, maxDistance: 12 });
      const BRC_NOTES = [
        "=== B.R.C. WORK ORDER #4409 ===\nProject: Sector 11-A Commercial Space Renovation.\nClient: The Capital Interim Council.\nStatus: 72% Complete. Concrete columns exposed, suspended ceiling grid hanging, drywall hung for office partitions.",
        "=== B.R.C. SUPPLY NOTICE ===\nBuilding supplies perpetually noclip into the service closet when not observed. Keep work areas clear so replacements appear smoothly.",
        "=== ARCHITECTURAL REPORT ===\nAll structures in Level 11 are indestructible monoliths of infinite concrete. The B.R.C. outfits these bare cliff-like rooms with Frontrooms furnishings so wanderers feel right at home.",
      ];
      s.noteIdx = ((s.noteIdx ?? -1) + 1) % BRC_NOTES.length;
      if (w) {
        w.sub = {
          who: "B.R.C. WORK ORDER CLIPBOARD",
          t: BRC_NOTES[s.noteIdx],
          at: now,
          d: 7000,
        };
      }
      return;
    }

    // 14. First Capital Municipal ATM Machine
    if (s.kind === "atm") {
      heard(ctx, { clip: REGISTER_CHIME, position: pos, volume: 0.9, maxDistance: 14 });
      w.sanity = Math.min(100, (w.sanity ?? 80) + 10);
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.3, z: pos.z },
        text: "+50 CAPITAL CREDITS DISPENSED",
        color: "#2ecc71",
        size: 1.1,
      }, { audience: { player: who.id } });
      if (w) {
        w.sub = {
          who: "FIRST CAPITAL BANK ATM",
          t: "TRANSACTION APPROVED · DISPENSING 50 LEVEL 11 CAPITAL CREDITS · SPEND AT MARROKA PIZZERIA OR B.N.T.G. TRADERS",
          at: now,
          d: 5000,
        };
      }
      return;
    }

    // 15. Almond Water Street Vending Machine
    if (s.kind === "vending") {
      heard(ctx, { clip: REGISTER_CHIME, position: pos, volume: 0.85, maxDistance: 14 });
      w.sanity = Math.min(100, (w.sanity ?? 80) + 15);
      w.thirst = Math.min(100, (w.thirst ?? 80) + 45);
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.3, z: pos.z },
        text: "+CHILLED ALMOND WATER CAN (+45 THIRST, +15 SANITY)",
        color: "#00d2d3",
        size: 1.1,
      }, { audience: { player: who.id } });
      return;
    }
  },
};
