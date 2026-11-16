// Interactive mall & arcade props in The Bonus Room (places/bonus). Attach with tags: [..., usable] and state.propKind.
import { animate } from "builtin/tween";

const COOLDOWN_MS = 900;
const SFX = {
  arcade: "/cdn/moodboard-pixel-bright/sfx-arcade-attract-jingle-two-seconds.mp3",
  coin: "cdn/sfx-arcade-coin-drop-clink-into-cabinet-slot.mp3",
  sparkle: "cdn/sfx-arcade-chiptune-bright-sparkle-arpeggio-line-clear.mp3",
  blip: "cdn/sfx-arcade-chiptune-quick-rising-blip-rotate.mp3",
  tick: "cdn/sfx-arcade-chiptune-tiny-blip-piece-shift.mp3",
  shutter: "/cdn/moodboard-realistic-gritty/sfx-disposable-camera-shutter-click-flash-whine.mp3",
  chime: "/cdn/moodboard-scifi-neon/sfx-soft-retro-mall-chime-two-tone.mp3",
  crank: "/cdn/moodboard-gothic-horror/sfx-music-box-crank-winding-clicks-short.mp3",
  static: "/cdn/moodboard-realistic-gritty/sfx-old-crt-television-dial-click-static-burst.mp3",
  radio: "/cdn/moodboard-realistic-gritty/sfx-walkie-talkie-radio-click-static-burst.mp3",
};

const LINES = {
  cabinet: {
    clip: SFX.arcade,
    vol: 0.45,
    pick: (name) => [
      `${name} — Attract mode flashes bright. High score: DAWN · 42,800.`,
      `${name} — Stick feels broken-in just right. Free-play light blinks green.`,
      `${name} — INSERT COIN? No slot needed today. Next demo round starting...`,
    ],
  },
  pinball: {
    clip: SFX.sparkle,
    vol: 0.45,
    lines: [
      "Pull the spring plunger — ding! Silver ball ricochets off three neon bumpers.",
      "Flippers snap! Left orbit lit for 2x bonus.",
      "TILT warning flashes amber, then settles back into attract chimes.",
    ],
  },
  airhockey: {
    clip: SFX.blip,
    vol: 0.5,
    lines: [
      "Air cushion hisses to life. The red puck skitters clean across the goal slot.",
      "Double bank shot off the rail! Somebody left the score dial at 6 - 6.",
    ],
  },
  claw: {
    clip: SFX.coin,
    vol: 0.55,
    lines: [
      "Gantry whirs... the claw pinches a crooked plush hound and drops it right at the chute.",
      "Claw hovers over a neon cat plushie, nudges it an inch, and drifts back empty.",
      "Nearly hooked a tiny brass mall token — slipped at the rim!",
    ],
  },
  dance: {
    clip: SFX.tick,
    vol: 0.55,
    lines: [
      "Left-Up-Down-Right! Step arrows strobe neon pink. COMBO ×64 — GREAT!",
      "Attract beat kicks in at 138 BPM. Foot sensors blink under the clear panel.",
    ],
  },
  tokens: {
    clip: SFX.coin,
    vol: 0.55,
    lines: [
      "Clink-clink! Brass Media Fun tokens rattle into the cup. Cabinets are on free play today.",
      "Token changer whirs — spits out three shiny arcade slugs stamped BONUS '89.",
    ],
  },
  gumball: {
    clip: SFX.coin,
    vol: 0.5,
    lines: [
      "Knob turns with a crisp ratcheting click — bright teal sour-apple gumball!",
      "Cherry-cinnamon gumball rolls down the spiral chute. Tastes like 1994.",
      "Mystery white gumball drops out. Faintly almond-flavored, somehow.",
    ],
  },
  payphone: {
    clip: SFX.static,
    vol: 0.45,
    lines: [
      "Click—hum— '...all circuits to Level 4 are busy, please remain on the carpet...' Dial tone returns.",
      "Faint elevator chimes drift across the earpiece, then Rico coughs from upstairs and hangs up.",
      "Static crackles softly. Somebody etched 'CALL HOME' into the chrome receiver.",
    ],
  },
  directory: {
    clip: SFX.chime,
    vol: 0.45,
    lines: [
      "Ground Floor: Tom's Diner (NW) · Liminal Clothes (SW) · Squeeze Play (Fountain) · Andrew's Furniture & Glow Up Salon (SE) · Media Fun Arcade (NE).",
      "Upper Level (via west escalator): Teleport Station & Marigold Train (NW) · Art Gallery & Lounge (NE).",
    ],
  },
};

function nextIdx(ses, key, len) {
  const prev = ses[key] ?? -1;
  const idx = (prev + 1) % len;
  ses[key] = idx;
  return idx;
}

export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by);
    if (!who?.state) return;
    const now = ctx.now();
    const ses = (ctx.self.session.bonusProp ??= {});
    if (now - (ses.lastAt ?? 0) < COOLDOWN_MS) return;
    ses.lastAt = now;

    const s = ctx.self.state ?? {};
    const kind = s.propKind ?? "cabinet";
    const pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
    const say = (text) => { who.state.notice = { text, at: now }; };
    const sfx = (clip, volume = 0.5, maxDistance = 12) => {
      if (clip) ctx.emit("playSound", { clip, position: { x: pos.x, y: pos.y + 1, z: pos.z }, volume, maxDistance });
    };

    if (kind === "photobooth") {
      sfx(SFX.shutter, 0.6, 12);
      ctx.emit("screenFlash", { color: "#ffffff", duration: 0.35, intensity: 0.8 }, { audience: { player: who.id } });
      const strips = [
        "Click-FLASH! The photo strip drops warm in the tray: four frames in neon pink.",
        "Click-FLASH! Three frames of you posing, one frame blurred as a ceiling mote photobombed the lens.",
        "Click-FLASH! Glossy strip develops fast — dated sometime in late autumn, year illegible.",
      ];
      say(strips[nextIdx(ses, "photo", strips.length)]);
      return;
    }

    if (kind === "kiddieride") {
      sfx(SFX.crank, 0.55, 14);
      animate(ctx, ctx.self, { "rotation.roll": [0, 7, -7, 4, -4, 0] }, { duration: 2.2, easing: "easeInOutSine" });
      const rides = [
        "Quarter drops in! Gentle music-box chimes play while the ride rocks back and forth.",
        "Springs squeak cheerfully as the mall ride sways to an old lullaby.",
      ];
      say(rides[nextIdx(ses, "ride", rides.length)]);
      return;
    }

    if (kind === "payphone") {
      const clip = (ses.phoneFlip = !ses.phoneFlip) ? SFX.static : SFX.radio;
      sfx(clip, 0.45, 10);
      const list = LINES.payphone.lines;
      say(list[nextIdx(ses, "payphone", list.length)]);
      return;
    }

    const spec = LINES[kind] ?? LINES.cabinet;
    sfx(spec.clip, spec.vol, 12);
    const list = spec.pick ? spec.pick(s.name ?? "Arcade cabinet") : spec.lines;
    say(list[nextIdx(ses, kind, list.length)]);
  },
};
