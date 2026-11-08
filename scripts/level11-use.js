// Level 11 "The Infinite City" - Interactive Props & Gameplay Systems
// Handles the street payphone, street food cart, First Capital Municipal ATM,
// Almond Water street vending machine, Marroka Pizzeria wood-fired brick oven & baker's peel,
// panoramic binoculars, construction ladder, supply chest, and friendly docile hound.

import { heard } from "./lib/hear.js";

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
const CAN_DROP = "/cdn/moodboard-realistic-gritty/sfx-payphone-handset-lifted-off-metal-hook-clunk.mp3";
const MOTOR_WHIR = "/cdn/moodboard-realistic-gritty/sfx-elevator-motor-hum-rumble.mp3";
const BUTTON_CLICK = "/cdn/moodboard-realistic-gritty/sfx-brass-elevator-button-click.mp3";
const OVEN_SCRAPE = "/cdn/moodboard-realistic-gritty/sfx-wood-creak-heavy-timber-settling.mp3";
const DRINK_WATER = "/cdn/moodboard-realistic-gritty/sfx-water-pour-splash-short.mp3";

const HEART_FX = `fx
pop heart rate=0 burst=8 life=.8..1.4 on=disc(.3) v=up(.6)+sdir()*.2 size=.12..0.22 acc=drag(1.0) col=<1,.35,.55> a=1>0 sz=$size r=sprite(soft-disc,alpha)`;

const STEAM_FX = `fx
pop steam rate=0 burst=14 life=.6..1.3 on=disc(.25) v=up(.8)+sdir()*.15 size=.2..0.4 acc=drag(1.2) col=<.96,.96,.9> a=0>.5:.6>0 sz=$size*(.6>2.0) r=sprite(smoke-puff,alpha)`;

const CASH_FX = `fx
pop sparkle rate=0 burst=10 life=.5..1.0 on=box(.2,.05,.1) v=up(.4)+sdir()*.15 size=.08..0.16 col=<.2,1,.5> a=1>0 sz=$size`;

const PHONE_MESSAGES = [
  "M.E.G. Automated Dispatch: 'Attention wanderers in Level 11. Remain on mapped avenues. The Level 11 Effect renders entities docile, but do not provoke them.'",
  "Operator voice through crackling static: 'Hello? Is someone there? I hear traffic... real traffic! Are you near the Capital? Please...'",
  "Mysterious radio broadcast: 'For my little strawberry... Tamsin, if you can hear this, mom and dad are waiting at Base Beta...'",
  "Static hum followed by three dual-tones: 'Notice 11-B: All municipal tap water in the Capital district is tested pure Almond Water. Drink freely.'",
  "A calm voice: 'The city does not sleep, because the city is not alive. Yet it keeps us safe from the dark. Welcome home.'",
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

    // 4. First Capital Municipal ATM Machine (Animated Dispenser)
    if (s.kind === "atm") {
      heard(ctx, { clip: BUTTON_CLICK, position: pos, volume: 0.9, maxDistance: 14 });
      heard(ctx, { clip: MOTOR_WHIR, position: pos, volume: 0.65, pitch: 1.8, maxDistance: 10 });

      // Update screen UI to counting state
      const screenObj = ctx.getObject("l11-atm-screen");
      if (screenObj) {
        screenObj.ui = `<div face="front" width="0.55m" style="width:100%;height:100%;background:#041512;border:3px solid #00d2d3;box-sizing:border-box;color:#2ecc71;font-family:'Courier New',monospace;font-size:20px;font-weight:bold;text-align:center;padding:12px;line-height:1.3;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="color:#00d2d3;font-size:16px;margin-bottom:6px">FIRST CAPITAL BANK · ATM 11-B</div>
          <div style="font-size:22px;letter-spacing:1px">COUNTING CASH...</div>
          <div style="margin-top:6px;font-size:18px">[ ■■■■■■■■□□ ]</div>
          <div style="color:#ffc857;font-size:15px;margin-top:8px">PLEASE TAKE CASH FROM TRAY</div>
        </div>`;
      }

      // Spawn or reposition physical cash bundle into the tray
      const cash = ctx.getObject("l11-atm-cash");
      if (cash) {
        cash.feetPosition = { x: 8.52, y: 0.95, z: 8.5 };
        cash.state.dispensed = true;
      }

      ctx.emit("fx", { position: { x: 8.52, y: 0.98, z: 8.5 }, spec: CASH_FX });

      heard(ctx, { clip: REGISTER_CHIME, position: pos, volume: 0.85, maxDistance: 14 });

      if (w) {
        w.notice = { text: "ATM: 50 Capital Credits dispensed to cash tray. Press [E] to take.", at: now };
      }
      return;
    }

    // 5. Collect Dispensed Banknotes from ATM Tray
    if (s.kind === "atm-cash") {
      heard(ctx, { clip: REGISTER_CHIME, position: pos, volume: 0.95, maxDistance: 14 });

      w.sanity = Math.min(100, (w.sanity ?? 80) + 15);
      w.credits = (w.credits ?? 0) + 50;

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 0.4, z: pos.z },
        text: "+50 CAPITAL CREDITS COLLECTED",
        color: "#2ecc71",
        size: 1.15,
      }, { audience: { player: who.id } });

      ctx.emit("screenFlash", { color: "#d4edda", duration: 0.35, intensity: 0.4 }, { audience: { player: who.id } });

      // Retract cash into pocket
      ctx.self.feetPosition = { x: 8.52, y: -20, z: 8.5 };

      // Reset ATM screen to idle
      const screenObj = ctx.getObject("l11-atm-screen");
      if (screenObj) {
        screenObj.ui = `<div face="front" width="0.55m" style="width:100%;height:100%;background:#041512;border:3px solid #00d2d3;box-sizing:border-box;color:#00d2d3;font-family:'Courier New',monospace;font-size:20px;font-weight:bold;text-align:center;padding:12px;line-height:1.3;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-size:16px;color:#10ac84">FIRST CAPITAL MUNICIPAL BANK</div>
          <div style="font-size:24px;margin:8px 0;letter-spacing:1px;color:#fff">ATM #11-04</div>
          <div style="font-size:17px;color:#2ecc71">INSERT CARD OR PRESS [E]</div>
          <div style="font-size:14px;color:#888;margin-top:4px">50 CREDITS PER WITHDRAWAL</div>
        </div>`;
      }
      return;
    }

    // 6. Almond Water Street Vending Machine (Animated Coil Drop)
    if (s.kind === "vending") {
      heard(ctx, { clip: BUTTON_CLICK, position: pos, volume: 0.85, maxDistance: 14 });
      heard(ctx, { clip: MOTOR_WHIR, position: pos, volume: 0.7, pitch: 1.6, maxDistance: 12 });

      // Delayed metallic drop clunk
      heard(ctx, { clip: CAN_DROP, position: pos, volume: 0.9, maxDistance: 14 });

      // Spawn or drop chilled can into the retrieval hopper
      const can = ctx.getObject("l11-vending-can");
      if (can) {
        can.feetPosition = { x: -8.32, y: 0.42, z: 20 };
        can.state.dropped = true;
      }

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.2, z: pos.z },
        text: "*CLUNK* CAN DROPPED TO FLAP",
        color: "#00d2d3",
        size: 1.05,
      }, { audience: { player: who.id } });

      if (w) {
        w.notice = { text: "Vending Machine: Chilled Almond Water dropped into the flap tray. Press [E] to collect.", at: now };
      }
      return;
    }

    // 7. Collect Chilled Almond Water Can from Vending Flap
    if (s.kind === "vending-can") {
      heard(ctx, { clip: DRINK_WATER, position: pos, volume: 0.9, maxDistance: 14 });

      w.thirst = Math.min(100, (w.thirst ?? 80) + 45);
      w.sanity = Math.min(100, (w.sanity ?? 80) + 20);

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 0.4, z: pos.z },
        text: "+COLD ALMOND WATER (+45 THIRST, +20 SANITY)",
        color: "#00d2d3",
        size: 1.15,
      }, { audience: { player: who.id } });

      ctx.emit("screenFlash", { color: "#c8f7f7", duration: 0.35, intensity: 0.45 }, { audience: { player: who.id } });

      // Hide collected can back inside dispenser chute
      ctx.self.feetPosition = { x: -8.32, y: -20, z: 20 };
      return;
    }

    // 8. Marroka Pizzeria: Brick Wood-Fired Oven Baker's Peel
    if (s.kind === "pizza-peel") {
      heard(ctx, { clip: OVEN_SCRAPE, position: pos, volume: 0.85, maxDistance: 14 });
      heard(ctx, { clip: SIZZLE, position: pos, volume: 0.95, maxDistance: 14 });

      // Emit rising steam from the oven mouth
      ctx.emit("fx", { position: { x: pos.x + 0.8, y: pos.y + 0.6, z: pos.z }, spec: STEAM_FX });

      // Spawn or reveal steaming pizza slice on cutting board
      const slice = ctx.getObject("l11-pizza-slice");
      if (slice) {
        slice.feetPosition = { x: -17.2, y: 1.48, z: -6.0 };
      }

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.2, z: pos.z },
        text: "+FRESH PIZZA BAKED IN BRICK OVEN",
        color: "#ff9234",
        size: 1.1,
      }, { audience: { player: who.id } });

      if (w) {
        w.notice = { text: "Marroka Pizzeria: Fresh wood-fired pizza baked! Slices are waiting on the counter.", at: now };
      }
      return;
    }

    // 9. Marroka Pizzeria: Fresh Hot Level 11 Pizza Slice
    if (s.kind === "food-pizza") {
      heard(ctx, { clip: REGISTER_CHIME, position: pos, volume: 0.9, maxDistance: 16 });
      heard(ctx, { clip: SIZZLE, position: pos, volume: 0.8, maxDistance: 12 });

      w.hunger = Math.min(100, (w.hunger ?? 80) + 50);
      w.sanity = Math.min(100, (w.sanity ?? 80) + 30);
      w.coffeeSpeedUntil = now + 90000; // 90s speed buff

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 0.4, z: pos.z },
        text: "+FRESH MARROKA PIZZA (+50 HUNGER, +30 SANITY, +SPRINT BOOST)",
        color: "#ff9234",
        size: 1.15,
      }, { audience: { player: who.id } });

      ctx.emit("screenFlash", { color: "#fff4e6", duration: 0.4, intensity: 0.4 }, { audience: { player: who.id } });
      if (w) w.notice = { text: "Marroka Pizzeria: Oven-fresh thin crust with Almond Water mozzarella!", at: now };
      return;
    }

    // 10. Friendly Level 11 Hound (Docility Effect & Petting)
    if (s.kind === "pet-hound") {
      heard(ctx, { clip: HOUND_BARK, position: pos, volume: 0.75, pitch: 1.45, maxDistance: 16 });
      w.sanity = Math.min(100, (w.sanity ?? 80) + 20);

      // Emit sweet floating heart particles
      ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.8, z: pos.z }, spec: HEART_FX });

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.1, z: pos.z },
        text: "+20 SANITY (PET FRIENDLY HOUND)",
        color: "#ff758c",
        size: 1.15,
      }, { audience: { player: who.id } });

      ctx.emit("screenFlash", { color: "#ffeedd", duration: 0.35, intensity: 0.35 }, { audience: { player: who.id } });

      if (w) {
        w.sub = {
          who: "DOCILE HOUND",
          t: "The hound leans against your legs with a quiet contented chuff. The Level 11 Effect renders it completely friendly and calm.",
          at: now,
          d: 5000,
        };
      }
      return;
    }

    // 11. Panoramic Observation Binoculars
    if (s.kind === "binoculars") {
      heard(ctx, { clip: WIND_LOOP, position: pos, volume: 0.8, maxDistance: 15 });

      if (who.isLocal) {
        s.zoomed = !s.zoomed;
        if (s.zoomed) {
          ctx.view.camera = {
            eye: { x: pos.x, y: pos.y + 1.4, z: pos.z },
            aim: { x: pos.x, y: pos.y + 1.2, z: pos.z - 50 },
            fov: 18,
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

    // 12. Construction Ladder (Renovation Interior)
    if (s.kind === "ladder") {
      heard(ctx, { clip: G("clothing-rustle-getting-up-from-seat"), position: pos, volume: 0.8, maxDistance: 10 });
      who.feetPosition = { x: pos.x, y: pos.y + 3.4, z: pos.z + 0.3 };
      who.velocity = { x: 0, y: 2, z: 0 };
      return;
    }

    // 13. Supply Chest
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

    // 14. B.R.C. (Backrooms Remodeling Company) Work Order Clipboard
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

    // 15. Parked Level 11 Vehicle (Disengage Handbrake & Scavenge Parts)
    if (s.kind === "parked-car") {
      const isBraked = s.braked !== false;
      if (isBraked) {
        s.braked = false;
        heard(ctx, { clip: BUTTON_CLICK, position: pos, volume: 0.85, pitch: 0.9, maxDistance: 12 });
        heard(ctx, { clip: OVEN_SCRAPE, position: pos, volume: 0.7, pitch: 1.1, maxDistance: 16 });

        // Roll car forward 2.5m along its orientation
        const yawRad = ((ctx.self.rotation?.yaw ?? 0) * Math.PI) / 180;
        const forwardZ = -Math.cos(yawRad);
        const forwardX = -Math.sin(yawRad);
        ctx.self.feetPosition = {
          x: pos.x + forwardX * 2.5,
          y: pos.y,
          z: pos.z + forwardZ * 2.5,
        };
        s.verb = "Search Glovebox & Engine";

        ctx.emit("damageNumber", {
          position: { x: pos.x, y: pos.y + 1.4, z: pos.z },
          text: "HANDBRAKE DISENGAGED · CAR ROLLED 2.5M",
          color: "#ffc048",
          size: 1.05,
        }, { audience: { player: who.id } });

        if (w) w.notice = { text: "Level 11 Vehicle: Parking brake disengaged. As noted by early explorers, cars have no fuel and must be moved by hand.", at: now };
        return;
      }

      if (!s.searched) {
        s.searched = true;
        heard(ctx, { clip: G("container-open-rustle"), position: pos, volume: 0.8, maxDistance: 12 });
        w.payout = {
          xp: 25,
          items: ["almond"],
        };
        ctx.emit("damageNumber", {
          position: { x: pos.x, y: pos.y + 1.4, z: pos.z },
          text: "+SCAVENGED: ALMOND WATER & 1974 ROAD ATLAS",
          color: "#45b649",
          size: 1.05,
        }, { audience: { player: who.id } });
        if (w) w.notice = { text: "Glovebox: Found 1x Almond Water and an explorer's manual detailing fuel pump replacements.", at: now };
        return;
      }

      if (w) w.notice = { text: "Vehicle already searched. Fuel tank is dry; fuel pump and injectors missing.", at: now };
      return;
    }

    // 16. Entity 14: Lucky Crane (Docile Origami Paper Bird)
    if (s.kind === "lucky-crane") {
      heard(ctx, { clip: "cdn/sfx-soft-bright-two-note-success-chime.mp3", position: pos, volume: 0.85, maxDistance: 12 });
      w.sanity = Math.min(100, (w.sanity ?? 80) + 25);
      w.payout = { xp: 20 };

      ctx.emit("sparkle", {
        position: { x: pos.x, y: pos.y + 0.4, z: pos.z },
        color: "#ffffff",
        count: 12,
      }, { audience: { player: who.id } });

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 0.8, z: pos.z },
        text: "+25 SANITY (LUCKY CRANE'S BLESSING)",
        color: "#4ecdc4",
        size: 1.1,
      }, { audience: { player: who.id } });

      if (w) w.notice = { text: "Entity 14 (Lucky Crane): The folded paper crane flutters its delicate wings peacefully under the Level 11 Effect.", at: now };
      return;
    }

    // 17. Capital Citizen Pamphlet: "A Different Kind of Urban"
    if (s.kind === "capital-guide") {
      heard(ctx, { clip: G("container-open-rustle"), position: pos, volume: 0.7, maxDistance: 10 });
      const GUIDE_TEXT = "=== A DIFFERENT KIND OF URBAN (1974) ===\nPublished by the Capital Interim Council for New Residents:\n\n• HOUSING: Small apartments are free to all employed citizens.\n• SUPPLIES: Automated factories perpetually noclip goods into shops and homes when unobserved.\n• ENTITIES: The 'Level 11 Effect' pacifies Hounds and Facelings unless provoked. Treat them with respect.\n• VEHICLES: All cars lack fuel; do not attempt to start them without imported fuel pumps.\n• TRAVEL: Barricades mark areas with high concentrations of unmapped one-way exits. Do not cross them.";
      if (w) {
        w.sub = {
          who: "A DIFFERENT KIND OF URBAN (CAPITAL COUNCIL)",
          t: GUIDE_TEXT,
          at: now,
          d: 8000,
        };
      }
      return;
    }

    // 18. Capital Market Produce Crate (Perpetually Noclipping Supplies)
    if (s.kind === "market-produce") {
      heard(ctx, { clip: G("container-open-rustle"), position: pos, volume: 0.8, maxDistance: 10 });
      w.hunger = Math.min(100, (w.hunger ?? 70) + 30);
      w.sanity = Math.min(100, (w.sanity ?? 80) + 15);
      w.payout = { xp: 15 };

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.0, z: pos.z },
        text: "+FRESH CAPITAL BREAD & APPLE (+30 HUNGER, +15 SANITY)",
        color: "#f39c12",
        size: 1.05,
      }, { audience: { player: who.id } });

      if (w) w.notice = { text: "Capital Market: Free citizen rations taken. Refineries perpetually restock the crate via noclip when unobserved.", at: now };
      return;
    }

    // 19. Simulated Roadworks Pneumatic Drill & Generator
    if (s.kind === "roadwork-drill" || s.kind === "roadwork-gen") {
      heard(ctx, { clip: MOTOR_WHIR, position: pos, volume: 0.85, maxDistance: 16 });
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.2, z: pos.z },
        text: "*RATTLE* SIMULATED INFRASTRUCTURE DRILL",
        color: "#e67e22",
        size: 1.0,
      }, { audience: { player: who.id } });
      if (w) w.notice = { text: "Roadworks Site: B.R.C. permit #74-ROADS. As ambassadors noted in 1977, city maintenance appears spontaneously.", at: now };
      return;
    }

    // 20. Capital Apartment Kitchen Sink (Pure Municipal Almond Water)
    if (s.kind === "apt-tap") {
      heard(ctx, { clip: DRINK_WATER, position: pos, volume: 0.85, maxDistance: 12 });
      w.thirst = Math.min(100, (w.thirst ?? 60) + 40);
      w.sanity = Math.min(100, (w.sanity ?? 80) + 15);

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.0, z: pos.z },
        text: "+PURE ALMOND TAP WATER (+40 THIRST, +15 SANITY)",
        color: "#00d2d3",
        size: 1.05,
      }, { audience: { player: who.id } });

      if (w) w.notice = { text: "Apartment Sink: All municipal tap water in the Capital is tested pure Almond Water.", at: now };
      return;
    }

    // 21. Capital Apartment Steam Radiator
    if (s.kind === "apt-radiator") {
      heard(ctx, { clip: MOTOR_WHIR, position: pos, volume: 0.65, maxDistance: 10 });
      w.sanity = Math.min(100, (w.sanity ?? 80) + 10);
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 1.0, z: pos.z },
        text: "+STEAM RADIATOR WARMTH (+10 SANITY)",
        color: "#ff7675",
        size: 1.0,
      }, { audience: { player: who.id } });
      if (w) w.notice = { text: "Cast Iron Radiator: Radiating gentle steam warmth generated by Level 11's autonomous utilities.", at: now };
      return;
    }

    // 22. Capital Apartment Vintage Tube Radio
    if (s.kind === "apt-radio") {
      heard(ctx, { clip: PAYPHONE_STATIC, position: pos, volume: 0.7, maxDistance: 12 });
      heard(ctx, { clip: "cdn/sfx-soft-bright-two-note-success-chime.mp3", position: pos, volume: 0.6, pitch: 0.8, maxDistance: 12 });
      const STATIONS = [
        "104.2 Capital FM: Playing gentle 1940s brass jazz. The city hums outside.",
        "88.7 Municipal Radio: 'Weather today: Clear, 72°F. Noclipping shipments on schedule.'",
        "Backrooms Shortwave: '...M.E.G. Base Beta reporting all gates secure on 11th Avenue...'",
      ];
      s.stationIdx = ((s.stationIdx ?? -1) + 1) % STATIONS.length;
      if (w) w.notice = { text: STATIONS[s.stationIdx], at: now };
      return;
    }
  },
};
