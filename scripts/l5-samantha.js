// Samantha: The Beverly Room psychic cat (Wikidot Backrooms Level 5 lore).
// A sleek tuxedo cat with glowing golden eyes that communicates telepathically.
// Trades fortunes, predictions, and blessings for meat cuts (player.state.meat).
import { heard } from "./lib/hear.js";
import { MEAT } from "./lib/items.js";
import { faceMorph, HEAD_ID } from "./lib/critter-model.js";

const SND_PURR = "/cdn/moodboard-realistic-gritty/sfx-eerie-low-chime-level-up.mp3";
const SND_HISS = "/cdn/moodboard-realistic-gritty/sfx-low-whisper-breath-swell-unsettling.mp3";

const READINGS = {
  premium: [
    "Samantha's eyes blaze with amber warmth as she savors the prime flesh. Her silky voice fills your head: 'Deep within the Boiler Room, beyond the fiery furnace coils at x: 45, stands an iron door marked Level 6. Its handle burns like coal, but a wanderer who keeps moving and drinks cold almond water shall survive the crossing. Take my blessing.'",
    "Samantha purrs like a quiet turbine, her thoughts echoing within your mind: 'The ballroom music plays from empty chairs, but do not fear the polonaise. Fear only the silence when the radio clicks off. In Room 1408 behind the wardrobe lies an ancient stash left by someone who never reached Level 6. May your footing remain sure.'",
  ],
  good: [
    "Samantha laps up the offering with quiet dignity: 'Acceptable. A word of counsel: the Faceless Staff in the grand gallery will not strike so long as your eyes are upon them. Turn your back, and their stride quickens. Never run in the corridors without listening first.'",
    "Samantha chews delicately, her psychic whisper amused: 'The M.E.G. agents in Housekeeping believe they control the laundry wing. They are good folk, tired and brave. If your armor is battered, Constance has thread, and Vance knows where the boiler steam vents breathe.'",
  ],
  poor: [
    "Samantha paws at the meat with mild disdain, then consumes it nonetheless: 'A sewer rat? Truly, your devotion is touching. Very well: do not tamper with the unfinished Mahjong table in the north corner of this ballroom. It does not like to be disturbed. Shoo now, wanderer.'",
    "Samantha gives an amused psychic snort: 'Hardly room service, but it will suffice. Listen closely: the clocks in the lobby run backwards every thirteen minutes. Trust your compass, not the hotel dials.'",
  ],
};

function bestMeat(meatMap) {
  if (!meatMap) return null;
  // Priority order: premium -> good -> poor
  const priority = ["steak", "fish", "chicken", "spam", "sardines", "rat"];
  for (const k of priority) {
    if ((meatMap[k] ?? 0) > 0) return k;
  }
  return null;
}

export const updateSchedule = { every: { seconds: 0.15 } };
export function update(ctx, dt) {
  const me = ctx.self, ses = (me.session ??= {}), now = ctx.now();
  // natural golden-eyed blinking
  if (!ses.nextBlink || now > ses.nextBlink) { ses.nextBlink = now + 2500 + ctx.random() * 3000; ses.blinkUntil = now + 130; }
  const isBlinking = now < (ses.blinkUntil ?? 0);

  // soft ear twitches
  if (!ses.nextTwitch || now > ses.nextTwitch) { ses.nextTwitch = now + 4500 + ctx.random() * 6000; ses.twitchUntil = now + 160; ses.twitchEar = ctx.random() < 0.5 ? "EarL" : "EarR"; }
  const isTwitching = now < (ses.twitchUntil ?? 0);
  if (isTwitching) {
    const dir = ses.twitchEar === "EarL" ? -1 : 1;
    me.bones = { [ses.twitchEar]: { rotate: [0, 0, dir * 26] } };
  } else if (me.bones && (me.bones.EarL || me.bones.EarR)) {
    me.bones = null;
  }

  // smoothly look toward nearest wanderer
  let near = null, bd = 8;
  for (const pl of ctx.place.players) {
    const d = Math.hypot(pl.feetPosition.x - me.feetPosition.x, pl.feetPosition.z - me.feetPosition.z);
    if (d < bd) { bd = d; near = pl; }
  }
  if (near) {
    const dx = near.feetPosition.x - me.feetPosition.x, dz = near.feetPosition.z - me.feetPosition.z;
    const wantYaw = Math.atan2(-dx, -dz) * 180 / Math.PI;
    const curYaw = me.rotation?.yaw ?? -130;
    const diff = ((wantYaw - curYaw + 540) % 360) - 180;
    if (Math.abs(diff) > 2) me.rotation = { yaw: curYaw + diff * Math.min(1, dt * 5) };
  }

  // her own tuxedo cat model carries its face: no critter head here
}

export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by);
    if (!who) return;

    const s = ctx.self.state;
    const ws = who.state;
    const meatMap = ws.meat ?? {};
    const cut = bestMeat(meatMap);

    if (cut) {
      // Consume 1 meat cut
      const mInfo = MEAT[cut];
      ws.meat = { ...meatMap, [cut]: meatMap[cut] - 1 };
      ctx.self.session.fedAt = ctx.now();

      // Play telepathic chime/purr
      heard(ctx, {
        clip: SND_PURR,
        position: ctx.self.feetPosition,
        volume: 0.7,
        pitch: mInfo.tier === "premium" ? 0.9 : mInfo.tier === "good" ? 1.1 : 1.3,
        maxDistance: 18,
      }, { audience: { player: by } });

      // Deliver reading
      const pool = READINGS[mInfo.tier] ?? READINGS.poor;
      const reading = pool[Math.floor(ctx.random() * pool.length)];

      ws.notice = { text: reading, at: ctx.now() };

      // Stat rewards
      if (mInfo.tier === "premium") {
        ws.hp = Math.max(ws.hp ?? 100, 100);
        ws.sanity = Math.min(100, (ws.sanity ?? 0) + 60);
      } else if (mInfo.tier === "good") {
        ws.hp = Math.min(100, (ws.hp ?? 100) + 20);
        ws.sanity = Math.min(100, (ws.sanity ?? 0) + 30);
      } else {
        ws.sanity = Math.min(100, (ws.sanity ?? 0) + 15);
      }

      ctx.emit("chatBubble", {
        target: ctx.self.id,
        text: `*purrs telepathically* ...flesh received.`,
        duration: 4,
      });
      return;
    }

    // No meat carried
    heard(ctx, {
      clip: SND_HISS,
      position: ctx.self.feetPosition,
      volume: 0.5,
      maxDistance: 12,
    }, { audience: { player: by } });

    ws.notice = {
      text: "Samantha's golden eyes narrow with cool amusement. Her thoughts echo inside your mind: 'You approach Samantha empty-handed, wanderer? Samantha does not give readings on credit. Search the dining room pantry or the boiler vents for meat. Bring me a cut, and I shall tell you where the stairs lead.'",
      at: ctx.now(),
    };
  },

  talkopt: (ctx, { by, k }) => {
    if (k === 'feed') {
      ears.press(ctx, { by });
    } else if (k === 'refuse') {
      const who = ctx.getObject(by);
      if (who?.state) {
        who.state.notice = {
          text: "Samantha flickers her tail coldly: 'A pity. The spirits shall keep their counsel, and you shall wander blind.'",
          at: ctx.now(),
        };
      }
    }
  },

  hit: (ctx, { by, damage }) => {
    const who = ctx.getObject(by);
    if (!who) return;

    ctx.self.session.hitAt = ctx.now();

    // Psychic counter-repulsion when struck
    const me = ctx.self.worldFeetPosition, p = who.worldFeetPosition;
    let dx = p.x - me.x, dz = p.z - me.z;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d; dz /= d;

    ctx.emit("impulse", { target: by, impulse: { x: dx * 650, y: 120, z: dz * 650 } });
    heard(ctx, { clip: SND_HISS, position: me, volume: 0.9, maxDistance: 24 });
    ctx.emit("screenFlash", { color: "#8a2be2", duration: 0.4, intensity: 0.6 }, { audience: { player: by } });

    who.state.hp = Math.max(1, (who.state.hp ?? 100) - 15);
    who.state.notice = {
      text: "Samantha's golden eyes blaze purple! A psychic shockwave violently hurls you backward: 'Insolent wanderer! You do not strike a queen of the Beverly Room!'",
      at: ctx.now(),
    };
  },
};
