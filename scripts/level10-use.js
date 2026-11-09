// Level 10 "Bumper Crop" - Interactive Props & Agrarian Mechanics
// Handles wheat harvesting, windmill quern milling, hearth baking, stone water well,
// anomalous scarecrow investigation, storm cellar exploration, and outpost radio.

import { heard } from "./lib/hear.js";
import { setWheatStep, setWatcherStep, setCellarStep } from "./lib/level10-quests.js";

const WATER_SPLASH = "/cdn/moodboard-realistic-gritty/sfx-water-pour-splash-short.mp3";
const OVEN_CRACKLE = "/cdn/moodboard-realistic-gritty/sfx-burgers-sizzling-on-flat-top-griddle-loop.mp3";
const STONE_GRIND = "/cdn/moodboard-realistic-gritty/sfx-wood-creak-heavy-timber-settling.mp3";
const RUSTLE = "/cdn/moodboard-realistic-gritty/sfx-clothing-rustle-getting-up-from-seat.mp3";
const DOOR_OPEN = "/cdn/moodboard-realistic-gritty/sfx-old-steamer-trunk-lid-creak-open.mp3";
const RADIO_STATIC = "/cdn/moodboard-realistic-gritty/sfx-telephone-earpiece-line-static-hiss-and-crackle.mp3";
const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3";

const SPARKLE_FX = `fx
pop puff rate=0 burst=12 life=.5..1.1 on=disc(.2) v=up(.5)+sdir()*.15 size=.08..0.18 acc=drag(1.2) col=<1,.9,.4> a=1>0 sz=$size`;

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state;
    const who = ctx.getObject(by);
    const pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
    const w = who?.state ?? {};
    const now = ctx.now();

    // 1. Wheat Harvesting Patch
    if (s.kind === "wheat-patch") {
      heard(ctx, { clip: RUSTLE, position: pos, volume: 0.85, maxDistance: 12 });
      w.wheat = (w.wheat ?? 0) + 1;
      w.notice = { text: `Golden Wheat Sheaf (${w.wheat} carried) · Grind at the Windmill Quern`, at: now };
      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 0.8, z: pos.z },
        text: "+1 WHEAT SHEAF",
        color: "#ffd36a",
        size: 1.0,
      }, { audience: { player: who.id } });

      if ((w.wheatQ ?? 0) <= 1) {
        setWheatStep(ctx, who, 2, "Reaped a Golden Wheat Sheaf. Collect at least 3 to grind into flour.");
      } else if (w.wheat >= 3 && (w.wheatQ ?? 0) < 3) {
        setWheatStep(ctx, who, 3, "Collected 3 Wheat Sheaves! Head to the Windmill Quern to grind flour.");
      }
    }

    // 2. Windmill Stone Quern (Milling)
    else if (s.kind === "windmill-quern") {
      heard(ctx, { clip: STONE_GRIND, position: pos, volume: 0.9, maxDistance: 14 });
      if ((w.wheat ?? 0) >= 1) {
        w.wheat -= 1;
        w.flour = (w.flour ?? 0) + 1;
        w.notice = { text: `Sack of Fresh Flour (${w.flour} carried) · Bake at the Farmhouse Hearth`, at: now };
        ctx.emit("damageNumber", {
          position: { x: pos.x, y: pos.y + 0.8, z: pos.z },
          text: "+1 SACK OF FLOUR (+15 XP)",
          color: "#f5f6fa",
          size: 1.05,
        }, { audience: { player: who.id } });

        who.state.sub = {
          who: "WINDMILL STONE QUERN",
          t: "The massive millstones grind the grain kernels into smooth Backrooms flour. Ready for the baking hearth.",
          at: now,
          d: 5000,
        };

        if ((w.wheatQ ?? 0) < 4) {
          setWheatStep(ctx, who, 4, "Flour milled! Bring it to the Farmhouse Hearth Oven to bake a warm loaf.");
        }
      } else {
        w.notice = { text: "You need at least 1 Wheat Sheaf to grind flour.", at: now };
        who.state.sub = {
          who: "WINDMILL QUERN",
          t: "The stone rotary quern is idle. Reap ripe wheat from the surrounding fields first.",
          at: now,
          d: 4500,
        };
      }
    }

    // 3. Farmhouse Hearth Oven (Baking)
    else if (s.kind === "hearth-oven") {
      heard(ctx, { clip: OVEN_CRACKLE, position: pos, volume: 0.85, maxDistance: 12 });
      if ((w.flour ?? 0) >= 1) {
        w.flour -= 1;
        w.bread = (w.bread ?? 0) + 1;
        w.hp = Math.min(100, (w.hp ?? 80) + 20);
        w.sanity = Math.min(100, (w.sanity ?? 80) + 15);
        w.notice = { text: `Warm Homestead Loaf baked! (${w.bread} carried) · +20 HP, +15 Sanity`, at: now };

        ctx.emit("damageNumber", {
          position: { x: pos.x, y: pos.y + 0.8, z: pos.z },
          text: "+1 HOMESTEAD LOAF (+30 XP)",
          color: "#ffd36a",
          size: 1.1,
        }, { audience: { player: who.id } });

        who.state.sub = {
          who: "OUTPOST HEARTH OVEN",
          t: "A golden-crusted loaf emerges from the brick hearth. The warm aroma of fresh Backrooms bread revitalizes you.",
          at: now,
          d: 5500,
        };

        if ((w.wheatQ ?? 0) < 5) {
          setWheatStep(ctx, who, 5, "Warm Homestead Loaf baked! Deliver it to Homesteader Cooper at the porch.");
        }
      } else {
        w.notice = { text: "You need 1 Sack of Flour to bake bread.", at: now };
        who.state.sub = {
          who: "HEARTH OVEN",
          t: "The wood-fired brick oven is hot. Grind wheat into flour at the Windmill Quern first.",
          at: now,
          d: 4500,
        };
      }
    }

    // 4. Stone Aquifer Well
    else if (s.kind === "farm-well") {
      heard(ctx, { clip: WATER_SPLASH, position: pos, volume: 0.9, maxDistance: 14 });
      w.almond = (w.almond ?? 0) + 1;
      w.sanity = Math.min(100, (w.sanity ?? 80) + 20);
      w.notice = { text: `Drew cold Almond Water from the well (+20 Sanity, ${w.almond} bottles carried)`, at: now };

      ctx.emit("damageNumber", {
        position: { x: pos.x, y: pos.y + 0.8, z: pos.z },
        text: "+1 ALMOND WATER (+20 SANITY)",
        color: "#74b9ff",
        size: 1.05,
      }, { audience: { player: who.id } });

      who.state.sub = {
        who: "HOMESTEAD WATER WELL",
        t: "The bucket returns from the deep limestone aquifer filled with ice-cold, sweet-smelling pure Almond Water.",
        at: now,
        d: 5000,
      };
    }

    // 5. Anomalous Scarecrow (Entity 17 / The Watchers)
    else if (s.kind === "scarecrow") {
      heard(ctx, { clip: RUSTLE, position: pos, volume: 0.8, maxDistance: 10 });
      const have = String(w.pages ?? "").split(",").filter(Boolean);
      if (!have.includes("24")) {
        have.push("24");
        w.pages = have.join(",");
        w.reading = 24;
      }
      who.state.sub = {
        who: "ENTITY 17 · THE SCARECROW",
        t: "As you inspect the straw coat, the stitched burlap head creaks slightly toward you. Tucked in the breast pocket is an investigator's field log (Document #24).",
        at: now,
        d: 6500,
      };

      setWatcherStep(ctx, who, 3, "Recovered Document #24 from the Eastern Scarecrow. Return to Dr. Maeve at Outpost Bountiful.");
    }

    // 6. Historic Storm Cellar / Root Cellar
    else if (s.kind === "storm-cellar") {
      heard(ctx, { clip: DOOR_OPEN, position: pos, volume: 0.9, maxDistance: 14 });
      w.rations = (w.rations ?? 0) + 2;
      w.batteries = (w.batteries ?? 0) + 1;
      w.notice = { text: "Storm Cellar opened: Salvaged 2 Canned Rations and 1 Battery!", at: now };

      who.state.sub = {
        who: "STORM CELLAR HATCH",
        t: "Cool subterranean air rises from the stone cellar. Rows of preserved root vegetables, canned preserves, and an emergency shelter are tucked safely below ground.",
        at: now,
        d: 6000,
      };

      if ((w.cellarQ ?? 0) < 2) {
        setCellarStep(ctx, who, 2, "Storm cellar unlatched! Report the secured subterranean pantry to Homesteader Cooper.");
      }
    }

    // 7. Outpost Shortwave Radio
    else if (s.kind === "outpost-radio") {
      heard(ctx, { clip: RADIO_STATIC, position: pos, volume: 0.85, maxDistance: 12 });
      const RADIO_CHATS = [
        "M.E.G. Agrarian Dispatch: 'Outpost Bountiful to Base Beta. Flour reserves at 85%. Supply caravan departs at 0600 along the south farm track.'",
        "Shortwave Broadcast: 'Notice to Level 10 homesteaders: entity activity remains low. Maintain watch on Entity 17 scarecrows during morning mist.'",
        "Pioneer Voice: 'The wind through the wheat sounds almost like real earth. Don't lose yourself out there, wanderers.'",
      ];
      s.msgIdx = ((s.msgIdx ?? -1) + 1) % RADIO_CHATS.length;
      who.state.sub = {
        who: "M.E.G. SHORTWAVE DISPATCH",
        t: RADIO_CHATS[s.msgIdx],
        at: now,
        d: 6000,
      };
    }
  },
};
