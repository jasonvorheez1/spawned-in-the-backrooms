import { vo } from "./lib/voices.js";
// Level 6.1 "The Snackrooms" - Diner & Food Court interactions
import { heard } from "./lib/hear.js";
import {
  SIP_DRINK,
  EAT_SNACK,
  FLIP_BURGER,
  WIPE_COUNTER,
  SERVE_PLATE,
  GROOVE_80S,
} from "./lib/l61-anim.js";

const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const VO = (who, line) => `/cdn/voice-${who}-saying-${encodeURIComponent(line)}.mp3`;

const SAL_LINES = [ // Sal's own (scripts/lib/data/dlg-levels-10-11.yml has the rest of him)
  "Hey hey! Grab a stool. Grill's hot.",
  "Coolers, domes, help yourself. It all comes back by morning. Don't ask me how.",
  "Came up out of Six? Sit down. Breathe. Nothing in the dark gets past that door.",
  "Jukebox works. Kick it if it skips. Everybody kicks it.",
  "That steel door by the west wall? Don't. That's the dark, and it's one way.",
];

export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by);
    const pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
    const w = who?.state ?? {};

    // 1. Fresh Hot Diner Coffee Urn
    if (s.kind === "coffee") {
      heard(ctx, { clip: G("water-pour-splash-short"), position: { x: pos.x, y: pos.y + 0.5, z: pos.z }, volume: 0.7, maxDistance: 10 });
      w.thirst = Math.min(100, (w.thirst ?? 80) + 35);
      w.sanity = Math.min(100, (w.sanity ?? 80) + 20);
      w.coffeeSpeedUntil = ctx.now() + 35000;

      // Play coffee sipping animation
      if (who?.anim) {
        who.anim.gest = { clip: SIP_DRINK, loop: "once", weight: 0.9, blendIn: 0.25, blendOut: 0.35, mask: { from: "Spine" } };
      }

      ctx.emit("screenFlash", { color: "#ffeedd", duration: 0.4, intensity: 0.5 }, { audience: { player: who.id } });
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "+HOT DINER COFFEE (+20 SANITY)", color: "#f2d870", size: 1.1 }, { audience: { player: who.id } });
      return;
    }

    // 2. Fresh Baked Pie / Donut Dome
    if (s.kind === "pie") {
      heard(ctx, { clip: G("pickup-ammo"), position: { x: pos.x, y: pos.y + 0.5, z: pos.z }, volume: 0.6, maxDistance: 10 });
      w.hunger = Math.min(100, (w.hunger ?? 80) + 35);
      w.hp = Math.min(w.maxHp ?? 100, (w.hp ?? 80) + 15);

      // Play pie snacking animation
      if (who?.anim) {
        who.anim.gest = { clip: EAT_SNACK, loop: "once", weight: 0.9, blendIn: 0.25, blendOut: 0.35, mask: { from: "Spine" } };
      }

      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.2, z: pos.z }, text: "+WARM PIE SLICE (+35 HUNGER, +15 HP)", color: "#ff88a0", size: 1.1 }, { audience: { player: who.id } });
      return;
    }

    const now = ctx.now(), uid = who?.userId ?? by ?? who?.id ?? "p", cool = (s.cool ??= {});
    // 3. Almond Water Vending Machine
    if (s.kind === "vending-almond") {
      if (now - (cool[uid] ?? -1e9) < 45000) {
        ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.1, z: pos.z }, text: "COIL RESETTING...", color: "#80b8d8", size: 0.9 }, { audience: { player: who.id } });
        return;
      }
      cool[uid] = now;
      heard(ctx, { clip: G("container-open-rustle"), position: { x: pos.x, y: pos.y + 0.8, z: pos.z }, volume: 0.7, maxDistance: 12 });
      w.thirst = Math.min(100, (w.thirst ?? 80) + 40);
      w.sanity = Math.min(100, (w.sanity ?? 80) + 15);
      w.payout = { xp: 0, items: ["almond"] };

      if (who?.anim) {
        who.anim.gest = { clip: SIP_DRINK, loop: "once", weight: 0.85, blendIn: 0.25, blendOut: 0.35, mask: { from: "Spine" } };
      }

      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.4, z: pos.z }, text: "+ALMOND WATER (COLD)", color: "#60d0ff", size: 1.1 }, { audience: { player: who.id } });
      return;
    }

    // 4. Retro Snack Vending Machine
    if (s.kind === "vending-snack") {
      if (now - (cool[uid] ?? -1e9) < 45000) {
        ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.1, z: pos.z }, text: "COIL RESETTING...", color: "#d8b870", size: 0.9 }, { audience: { player: who.id } });
        return;
      }
      cool[uid] = now;
      heard(ctx, { clip: G("container-open-rustle"), position: { x: pos.x, y: pos.y + 0.8, z: pos.z }, volume: 0.7, maxDistance: 12 });
      w.hunger = Math.min(100, (w.hunger ?? 80) + 40);
      w.payout = { xp: 0, items: ["bar", "chips"] };

      if (who?.anim) {
        who.anim.gest = { clip: EAT_SNACK, loop: "once", weight: 0.85, blendIn: 0.25, blendOut: 0.35, mask: { from: "Spine" } };
      }

      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.4, z: pos.z }, text: "+SNACK PACK (+40 HUNGER)", color: "#ffd060", size: 1.1 }, { audience: { player: who.id } });
      return;
    }

    // 5. Sal the Diner Faceling / Chef
    if (s.kind === "sal") {
      s.lineIdx = ((s.lineIdx ?? -1) + 1) % SAL_LINES.length;
      const line = SAL_LINES[s.lineIdx];
      heard(ctx, { clip: vo("l61-sal", line), position: { x: pos.x, y: pos.y + 1.6, z: pos.z }, volume: 0.9, maxDistance: 16 });

      // Sal welcomes with plate presentation or 80s head bob
      ctx.self.anim.gest = {
        clip: s.lineIdx % 2 === 0 ? SERVE_PLATE : GROOVE_80S,
        loop: "once",
        weight: 0.95,
        blendIn: 0.2,
        blendOut: 0.35,
        mask: { from: "Spine" },
      };
      (ctx.self.session.sal ??= {}).gestEnd = ctx.now() + 2200;

      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 2.1, z: pos.z }, text: `SAL: "${line}"`, color: "#ffe490", size: 1.05 });
      return;
    }
  },
};

export function update(ctx, dt) {
  const me = ctx.self, s = me.state;
  if (s?.kind !== "sal") return;

  const now = ctx.now();
  const ses = (me.session.sal ??= { nextAct: now + 3000 });

  if (ses.gestEnd && now > ses.gestEnd) {
    me.anim.gest = null;
    ses.gestEnd = 0;
  }

  // Chef Sal periodically flips burgers on the grill, wipes the counter, or vibes to the 80s jukebox
  if (now > ses.nextAct && !ses.gestEnd) {
    ses.nextAct = now + 4500 + ctx.random() * 6000;
    const choices = [
      [FLIP_BURGER, 2800],
      [WIPE_COUNTER, 2400],
      [GROOVE_80S, 2000],
      [SERVE_PLATE, 2000],
    ];
    const pick = choices[Math.floor(ctx.random() * choices.length)];
    me.anim.gest = {
      clip: pick[0],
      loop: "once",
      weight: 0.95,
      blendIn: 0.25,
      blendOut: 0.35,
      mask: { from: "Spine" },
    };
    ses.gestEnd = now + pick[1];
  }
}
