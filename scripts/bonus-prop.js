// Interactive mall & arcade props in The Bonus Room (places/bonus).
// Every press: the thing moves (shake / spawned parts), a sound, and a real result:
// cabinets and pinballs keep a room high score that pays a Backquarter when beaten, the claw can win a prize,
// gumballs and coin returns pay into the bag (player.state.payout, drained by scripts/craft.js), rides and booths steady sanity.
import { animate } from "builtin/tween";

const COOLDOWN_MS = 1200;
const TV = "/cdn/moodboard-toon-vibrant/";
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
  chew: "/cdn/moodboard-realistic-gritty/sfx-crunchy-food-bite-chew.mp3",
  gameover: TV + "sfx-arcade-game-over-descending-wah-wah-chiptune.mp3",
  hiscore: TV + "sfx-arcade-new-high-score-fanfare-short.mp3",
  tilt: TV + "sfx-pinball-tilt-buzzer-and-flippers-dead.mp3",
  knob: TV + "sfx-gumball-machine-metal-knob-crank-turn-rattle.mp3",
  coinret: "/cdn/moodboard-realistic-gritty/sfx-payphone-coin-return-quarter-clatter.mp3",
  ring: "/cdn/moodboard-realistic-gritty/sfx-payphone-receiver-lift-dial-tone-click.mp3",
  goal: TV + "sfx-air-hockey-puck-slams-goal-slot-clack.mp3",
  clawwhir: TV + "sfx-claw-machine-gantry-motor-whir-and-drop.mp3",
};

const SPARK_FX = `fx
pop spark burst=14..22 on=sphere(.12) life=.35..0.7 v=up(1.1)+sdir()*.8 size=.025..0.055 acc=grav() col=<1,.85,.35> a=1>0 sz=$size r=sprite(soft-disc,add)`;
const NEON_FX = `fx
pop star burst=12..18 on=box(.3,.1,.3) life=.5..0.9 v=up(1.2)+sdir()*.35 size=.03..0.06 col=<1,.45,.9> a=1>0 sz=$size r=sprite(soft-disc,add)`;

const GUM_COLORS = ["#ff4d6d", "#05ffa1", "#ffe14a", "#b967ff", "#38f4ff"];
const NEON_COLS = ["#ff4fd8", "#38f4ff", "#ffe14a", "#05ffa1"];

// Cabinet games: the room's high score to beat (who set it, what it was) and how a run ends there.
const GAMES = {
  "Street Clash EX": { hi: 48200, by: "TJ", col: "#ff4fd8", lose: "K.O. The CPU knows one sweep and it's enough." },
  "Nova Drift 1989": { hi: 61500, by: "ACE", col: "#38f4ff", lose: "Rock the size of a fridge. GAME OVER." },
  "Sunset Turbo": { hi: 39900, by: "MOM", col: "#ff9a3a", lose: "Out of time 200 feet from the checkpoint." },
  "Neon Shinobi": { hi: 52700, by: "KAZ", col: "#b967ff", lose: "Third ninja off the same rooftop." },
  "Dead Shift": { hi: 44100, by: "RIP", col: "#9cff57", lose: "Bit in frozen foods. Your shift starts Saturday anyway." },
  "Blue Streak": { hi: 70300, by: "SAM", col: "#3a8bff", lose: "Lost every ring to one spike. Every ring." },
  "Starlight Pinball DX": { hi: 88000, by: "LIZ", col: "#ffe14a", lose: "Drained down the middle. Nothing you could've done." },
  "Galactic Defender": { hi: 57600, by: "DAD", col: "#05ffa1", lose: "Last ship gone. The mothership plays four smug notes." },
  "Maze Chase 86": { hi: 33300, by: "PAC", col: "#ffe14a", lose: "Pink ghost. It's always the pink ghost." },
  "Midnight Highway": { hi: 46800, by: "VIN", col: "#ff3a55", lose: "Rear-ended a semi at 140. The semi's fine." },
  "Space Bowler": { hi: 412000, by: "GUS", col: "#38f4ff", lose: "Both balls down the left outlane. The left outlane is a liar." },
  "Hot Rod Harry": { hi: 365000, by: "HAL", col: "#ff3a55", lose: "Missed the ramp shot four times. Harry looks disappointed." },
  "Lady Luck Laundromat": { hi: 298000, by: "DOT", col: "#ff71ce", lose: "Spin cycle multiball, then nothing. Typical." },
};
const DIRECTORY = [
  "TELEPORT STATION · upper floor, west end, over the food court. Works if you've been there before.",
  "SQUEEZE PLAY · smoothie bar, south side by the courtyard. Sal's there. Sal's always there.",
  "TOM'S DINER · west wall. Booth seating. The coffee's honest.",
  "COURTYARD VENDING · south past the fountain. Free cola, 24 a week, then it sulks.",
];
const PHONE_TAPES = [
  "Recorded voice: \"...if you're hearing this, the Station upstairs only sends you where you've already been.\" Click.",
  "Recorded voice: \"Mall closes at nine. It's been nine for a while.\" Dial tone.",
  "A kid on the line asks if this is the Pizza Hut. You say no. He hangs up angry.",
];

const uidOf = (who) => who.userId ?? who.id;
function glowPulse(ctx, pos, color, intensity = 2.4, distance = 4.5, life = 1.8) {
  return ctx.spawn({ feetPosition: pos, light: { kind: "point", color, intensity, distance, shadow: { enabled: false } }, lifetime: life });
}
function forwardOffset(yawDeg, dist) {
  const rad = ((yawDeg ?? 0) * Math.PI) / 180;
  return { x: -Math.sin(rad) * dist, z: -Math.cos(rad) * dist };
}
// a reward owed into the bag: merges with whatever else the player is owed this tick
function pay(who, { items = [], xp = 0, text }) {
  const p = who.state.payout ?? { xp: 0, items: [] };
  who.state.payout = { ...p, xp: (p.xp ?? 0) + xp, items: [...(p.items ?? []), ...items], ...(text ? { text } : {}) };
}
function calm(who, n) {
  const s = who.state, cap = 100 + (s.level ?? 1) * 5;
  s.sanity = Math.min(Math.max(cap, s.sanity ?? 0), (s.sanity ?? cap) + n);
}
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by);
    if (!who) return;
    const now = ctx.now();
    const ses = (ctx.self.session.bonusProp ??= {});
    if (now - (ses.lastAt ?? 0) < COOLDOWN_MS) return;
    ses.lastAt = now;
    const uid = uidOf(who);
    // per-player stamp for a payout: true once per `ms`
    const fresh = (key, ms) => {
      const m = (ses[key] ??= {});
      if (now - (m[uid] ?? -1e12) < ms) return false;
      m[uid] = now; return true;
    };

    const s = ctx.self.state ?? {};
    const kind = s.propKind ?? "cabinet";
    const pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
    const yaw = typeof ctx.self.rotation === "number" ? ctx.self.rotation : ctx.self.rotation?.yaw ?? 0;
    const sfx = (clip, volume = 0.55, maxDistance = 14) => {
      if (clip) ctx.emit("playSound", { clip, position: { x: pos.x, y: pos.y + 1, z: pos.z }, volume, maxDistance });
    };
    const shake = (intensity = 0.04, duration = 0.35) => ctx.emit("shake", { target: ctx.self.id, intensity, duration });
    const tell = (text, color = "#ffe9a8", h = 1.9) =>
      ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + h, z: pos.z }, text, color, size: 0.8, lifetime: 2.6 }, { audience: { player: who.id } });
    const note = (text) => { who.state.notice = { text, at: now }; };

    // one run on a score machine: beat the room's high score for a Backquarter
    const scoreRun = (g, tiltChance = 0) => {
      const hi = s.hi ?? { score: g.hi, by: g.by };
      if (tiltChance && ctx.random() < tiltChance) {
        sfx(SFX.tilt, 0.55, 12); shake(0.09, 0.6);
        note("TILT. You leaned on it like it owed you money.");
        return;
      }
      const r = ctx.random();
      const score = Math.round((g.hi * (0.3 + 1.0 * Math.pow(r, 1.6))) / 100) * 100;
      if (score > hi.score) {
        const name = (who.displayName ?? "YOU").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "YOU";
        ctx.self.state.hi = { score, by: name };
        ctx.self.state.info = `HI ${fmt(score)} · ${name}`;
        sfx(SFX.hiscore, 0.6, 16);
        ctx.spawn({ feetPosition: { x: pos.x, y: pos.y + 1.7, z: pos.z }, fx: { script: SPARK_FX }, lifetime: 1.6 });
        if (fresh("hiPaid", 10 * 60000)) pay(who, { items: ["cash:25"], xp: 10, text: `${fmt(score)}. New high score. Ticket's worth a Backquarter.` });
        else note(`${fmt(score)}. New high score. Ticket spool's empty, but the name's yours.`);
      } else {
        sfx(SFX.gameover, 0.45, 12);
        note(`${fmt(score)}. ${g.lose} (HI ${fmt(hi.score)} · ${hi.by})`);
      }
      if (fresh("fun", 60000)) calm(who, 3);
    };

    if (kind === "photobooth") {
      sfx(SFX.shutter, 0.65, 14); shake(0.025, 0.25);
      const fwd = forwardOffset(yaw, 0.45);
      glowPulse(ctx, { x: pos.x + fwd.x, y: pos.y + 1.55, z: pos.z + fwd.z }, "#ffffff", 6, 6, 0.35);
      ctx.emit("screenFlash", { color: "#ffffff", duration: 0.35, intensity: 0.85 }, { audience: { player: who.id } });
      const heldPhoto = (ses.heldPhoto ??= {});
      const prev = heldPhoto[who.id];
      if (prev && ctx.getObject(prev)) ctx.destroy(prev);
      const frames = ["#ff71ce", "#01cdfe", "#b967ff", "#05ffa1"].map((col, idx) => ({
        feetPosition: { x: 0, y: 0.03 + idx * 0.036, z: 0.004 },
        primitive: { kind: "plane", width: 0.034, height: 0.028 },
        material: { color: col, emissive: col, emissiveIntensity: 0.4, roughness: 0.3 },
      }));
      heldPhoto[who.id] = ctx.spawn({
        parent: who.id, attachment: { bone: "RightHand" },
        feetPosition: { x: 0.02, y: 0.06, z: 0.05 }, rotation: { pitch: -15 },
        primitive: { kind: "box", width: 0.044, height: 0.165, depth: 0.005 },
        material: { color: "#f6f2fa", roughness: 0.4 }, children: frames, visibleInFirstPerson: true, lifetime: 8,
      });
      if (fresh("photo", 3 * 60000)) { calm(who, 5); tell("SANITY +5", "#9fe8ff"); note("Four frames. You blinked in three. Still you, though."); }
      else note("Four more frames. Same face. Good, that's the point.");
      return;
    }

    if (kind === "kiddieride") {
      sfx(SFX.crank, 0.6, 14);
      animate(ctx, ctx.self, { "rotation.roll": [0, 7, -7, 4, -4, 0] }, { duration: 2.2, easing: "easeInOutSine" });
      glowPulse(ctx, { x: pos.x, y: pos.y + 1.25, z: pos.z }, "#ffe14a", 2.8, 5, 2.2);
      ctx.spawn({ feetPosition: { x: pos.x, y: pos.y + 0.9, z: pos.z }, fx: { script: SPARK_FX }, lifetime: 2.0 });
      if (fresh("ride", 2 * 60000)) { calm(who, 6); tell("SANITY +6", "#9fe8ff"); note("Thirty seconds of a wind-up song nobody's played since 1994. It helps."); }
      else note("The horse wants another quarter. It's not getting one.");
      return;
    }

    if (kind === "gumball") {
      sfx(SFX.knob, 0.6, 12); shake(0.03, 0.3);
      const col = GUM_COLORS[Math.floor(ctx.random() * GUM_COLORS.length)];
      const fwd = forwardOffset(yaw, 0.28);
      const gumball = ctx.spawn({
        feetPosition: { x: pos.x + fwd.x, y: pos.y + 0.92, z: pos.z + fwd.z },
        primitive: { kind: "sphere", radius: 0.032 },
        material: { color: col, roughness: 0.15, metalness: 0.05, emissive: col, emissiveIntensity: 0.25 },
        lifetime: 1.4,
      });
      animate(ctx, gumball, { "feetPosition.y": [pos.y + 0.92, pos.y + 0.72, pos.y + 0.78, pos.y + 0.72] }, { duration: 0.6, easing: "easeOutQuad" });
      if (fresh("gum", 3 * 60000)) { pay(who, { items: ["gumball"] }); tell("+GUMBALL", col); }
      else { ctx.emit("playSound", { clip: SFX.chew, position: who.feetPosition, volume: 0.4 }); note("One per customer. The rack has a long memory."); }
      return;
    }

    if (kind === "tokens") {
      sfx(SFX.coin, 0.6, 12); shake(0.035, 0.3);
      const fwd = forwardOffset(yaw, 0.25);
      for (let i = 0; i < 3; i++) {
        const dx = (i - 1) * 0.055;
        const tok = ctx.spawn({
          feetPosition: { x: pos.x + fwd.x, y: pos.y + 0.85, z: pos.z + fwd.z + dx },
          primitive: { kind: "cylinder", radiusTop: 0.026, radiusBottom: 0.026, height: 0.006, radialSegments: 16 },
          material: { color: "#ffd24a", metalness: 0.95, roughness: 0.2, emissive: "#ffaa22", emissiveIntensity: 0.35 },
          lifetime: 2.2,
        });
        animate(ctx, tok, { "feetPosition.y": [pos.y + 0.85, pos.y + 1.06 + i * 0.04, pos.y + 0.82], "rotation.yaw": [0, 360 + i * 180], "rotation.pitch": [90, 90] }, { duration: 0.7 + i * 0.12, easing: "easeOutQuad" });
      }
      glowPulse(ctx, { x: pos.x + fwd.x, y: pos.y + 1.05, z: pos.z + fwd.z }, "#ffd24a", 2.2, 3.5, 1.5);
      if (fresh("tok", 15 * 60000)) pay(who, { items: ["cash:25"], text: "Change cup's jammed with a 1997 Chuck E. Cheese token and one real Backquarter. You keep the quarter." });
      else note("Three tokens rattle out and roll under the machine. Free play anyway.");
      return;
    }

    if (kind === "pinball") {
      sfx(SFX.sparkle, 0.5, 12); shake(0.05, 0.5);
      const fwd = forwardOffset(yaw, 0.45);
      const ball = ctx.spawn({
        feetPosition: { x: pos.x + fwd.x, y: pos.y + 1.02, z: pos.z + fwd.z },
        primitive: { kind: "sphere", radius: 0.026 },
        material: { color: "#eef6ff", metalness: 1, roughness: 0.08, emissive: "#9beeff", emissiveIntensity: 0.6 },
        lifetime: 2.2,
      });
      animate(ctx, ball, {
        "feetPosition.x": [pos.x + 0.15, pos.x + 0.68, pos.x + 0.35, pos.x + 0.78, pos.x + 0.22],
        "feetPosition.z": [pos.z, pos.z + 0.18, pos.z - 0.16, pos.z + 0.14, pos.z],
        "feetPosition.y": [pos.y + 1.12, pos.y + 1.04, pos.y + 1.09, pos.y + 1.01, pos.y + 0.96],
      }, { duration: 1.9, easing: "easeInOutSine" });
      const g = GAMES[s.name] ?? GAMES["Space Bowler"];
      glowPulse(ctx, { x: pos.x + fwd.x, y: pos.y + 1.35, z: pos.z + fwd.z }, g.col, 3.0, 4.5, 1.8);
      ctx.spawn({ feetPosition: { x: pos.x + fwd.x, y: pos.y + 1.15, z: pos.z + fwd.z }, fx: { script: SPARK_FX }, lifetime: 1.6 });
      scoreRun(g, 0.15);
      return;
    }

    if (kind === "airhockey") {
      sfx(SFX.blip, 0.55, 12); shake(0.03, 0.4);
      const puck = ctx.spawn({
        feetPosition: { x: pos.x, y: pos.y + 0.9, z: pos.z },
        primitive: { kind: "cylinder", radiusTop: 0.055, radiusBottom: 0.055, height: 0.02, radialSegments: 20 },
        material: { color: "#ff2e4d", emissive: "#ff3a55", emissiveIntensity: 1.1, roughness: 0.25 },
        lifetime: 2.3,
      });
      animate(ctx, puck, {
        "feetPosition.x": [pos.x, pos.x + 0.55, pos.x - 0.55, pos.x + 0.35, pos.x - 0.72],
        "feetPosition.z": [pos.z, pos.z + 0.24, pos.z - 0.22, pos.z + 0.18, pos.z],
      }, { duration: 2.0, easing: "easeInOutSine" });
      glowPulse(ctx, { x: pos.x, y: pos.y + 1.25, z: pos.z }, "#ff3a55", 2.8, 4.5, 1.8);
      ctx.after(2.0, "goal", {});
      const them = Math.floor(ctx.random() * 7);
      const won = ctx.random() < 0.45;
      const rec = ctx.self.state.record ?? { you: 0, table: 0 };
      ctx.self.state.record = won ? { ...rec, you: rec.you + 1 } : { ...rec, table: rec.table + 1 };
      ctx.self.state.info = `House record: players ${ctx.self.state.record.you} · table ${ctx.self.state.record.table}`;
      if (won) { note(`7–${them}. Nobody on the other side. You still celebrate.`); if (fresh("hockey", 2 * 60000)) { calm(who, 6); tell("SANITY +6", "#9fe8ff"); } }
      else note(`${them}–7. Lost to an empty table. The puck banked in off your own mallet twice.`);
      return;
    }

    if (kind === "claw") {
      sfx(SFX.clawwhir, 0.6, 12);
      const col = GUM_COLORS[Math.floor(ctx.random() * GUM_COLORS.length)];
      const win = ctx.random() < 0.22 && fresh("claw", 10 * 60000);
      const claw = ctx.spawn({
        feetPosition: { x: pos.x, y: pos.y + 1.58, z: pos.z },
        primitive: { kind: "cylinder", radiusTop: 0.02, radiusBottom: 0.05, height: 0.18 },
        material: { color: "#cfd8e6", metalness: 0.9, roughness: 0.2 },
        lifetime: 2.4,
      });
      const prize = ctx.spawn({
        feetPosition: { x: pos.x - 0.12, y: pos.y + 1.05, z: pos.z + 0.08 },
        primitive: { kind: "sphere", radius: 0.065 },
        material: { color: col, emissive: col, emissiveIntensity: 0.45, roughness: 0.4 },
        lifetime: 2.4,
      });
      animate(ctx, claw, {
        "feetPosition.x": [pos.x, pos.x - 0.12, pos.x - 0.12, pos.x + 0.22],
        "feetPosition.y": [pos.y + 1.58, pos.y + 1.58, pos.y + 1.18, pos.y + 1.56],
        "feetPosition.z": [pos.z, pos.z + 0.08, pos.z + 0.08, pos.z - 0.18],
      }, { duration: 2.1, easing: "easeInOutSine" });
      animate(ctx, prize, win ? {
        "feetPosition.x": [pos.x - 0.12, pos.x - 0.12, pos.x + 0.22, pos.x + 0.22],
        "feetPosition.y": [pos.y + 1.05, pos.y + 1.05, pos.y + 1.42, pos.y + 0.92],
        "feetPosition.z": [pos.z + 0.08, pos.z + 0.08, pos.z - 0.18, pos.z - 0.18],
      } : {
        "feetPosition.y": [pos.y + 1.05, pos.y + 1.05, pos.y + 1.3, pos.y + 1.05],
      }, { duration: 2.1, easing: "easeInOutSine" });
      glowPulse(ctx, { x: pos.x, y: pos.y + 1.45, z: pos.z }, win ? "#05ffa1" : "#ff71ce", 2.5, 4, 2.2);
      if (win) {
        const item = ctx.random() < 0.25 ? "musicbox" : "gumball";
        pay(who, { items: [item], xp: 5, text: item === "musicbox" ? "The claw actually closes. A wind-up music box drops down the chute." : "The claw holds for once. A giant gumball, still sealed." });
      } else note(["Claw closes on the prize and opens on the way up. Like it's being paid to.", "Grabbed the edge of a stuffed duck. The duck stays.", "Claw comes up holding air and somebody's hair tie."][Math.floor(ctx.random() * 3)]);
      return;
    }

    if (kind === "dance") {
      sfx(SFX.tick, 0.55, 14); shake(0.03, 0.5);
      const pads = [[-0.32, -0.32, "#ff4fd8"], [0.32, -0.32, "#38f4ff"], [-0.32, 0.32, "#05ffa1"], [0.32, 0.32, "#ffe14a"]];
      pads.forEach(([dx, dz, col], i) => {
        const pad = ctx.spawn({
          feetPosition: { x: pos.x + dx, y: pos.y + 0.12, z: pos.z + dz },
          primitive: { kind: "box", width: 0.3, height: 0.03, depth: 0.3 },
          material: { color: col, emissive: col, emissiveIntensity: 1.8, roughness: 0.2 },
          lifetime: 2.2,
        });
        animate(ctx, pad, { "feetPosition.y": [pos.y + 0.12, pos.y + 0.16 + i * 0.01, pos.y + 0.11] }, { duration: 0.45, easing: "easeInOutSine", loop: true, direction: "alternate" });
      });
      glowPulse(ctx, { x: pos.x, y: pos.y + 1.2, z: pos.z }, "#ff4fd8", 3.0, 5.5, 2.2);
      ctx.spawn({ feetPosition: { x: pos.x, y: pos.y + 0.3, z: pos.z }, fx: { script: NEON_FX }, lifetime: 2.0 });
      const r = ctx.random(), rank = r > 0.85 ? "AA" : r > 0.6 ? "A" : r > 0.3 ? "B" : "D";
      const line = { AA: "Full combo on 'Butterfly'. Somewhere a 2003 crowd goes nuts.", A: "Missed one left arrow. You'll think about it later.", B: "Fine. The machine says GOOD in a voice that means okay.", D: "Stepped on the cabinet's start button mid-song. Twice." }[rank];
      tell(`RANK ${rank}`, rank === "D" ? "#ff9a7a" : "#ffe14a", 2.2);
      note(line);
      if (fresh("dance", 3 * 60000)) calm(who, rank === "D" ? 3 : 8);
      return;
    }

    if (kind === "directory") {
      sfx(SFX.chime, 0.55, 14);
      glowPulse(ctx, { x: pos.x, y: pos.y + 1.45, z: pos.z + 0.35 }, "#38f4ff", 2.6, 4.5, 2.4);
      const scan = ctx.spawn({
        feetPosition: { x: pos.x, y: pos.y + 0.65, z: pos.z + 0.15 },
        primitive: { kind: "box", width: 0.48, height: 0.025, depth: 0.02 },
        material: { color: "#05ffa1", emissive: "#05ffa1", emissiveIntensity: 2.2, roughness: 0.2 },
        lifetime: 1.8,
      });
      animate(ctx, scan, { "feetPosition.y": [pos.y + 0.65, pos.y + 1.55, pos.y + 0.65] }, { duration: 1.6, easing: "easeInOutSine" });
      const i = (ses.dir = ((ses.dir ?? -1) + 1) % DIRECTORY.length);
      note(DIRECTORY[i]);
      return;
    }

    if (kind === "payphone") {
      sfx(SFX.ring, 0.55, 10); shake(0.03, 0.3);
      const fwd = forwardOffset(yaw, 0.18);
      glowPulse(ctx, { x: pos.x + fwd.x, y: pos.y + 1.42, z: pos.z + fwd.z }, "#ff5566", 1.8, 3, 2.2);
      if (ctx.self.id.endsWith("2")) { // the right-hand phone: the coin return
        if (fresh("coin", 20 * 60000)) { sfx(SFX.coinret, 0.6, 8); pay(who, { items: ["cash:25"], text: "Coin return's got a Backquarter in it. Nobody's coming back for it." }); }
        else { sfx(SFX.static, 0.4, 8); note("Coin return's empty. You check it again anyway."); }
      } else {
        ctx.after(0.6, "lineStatic", {});
        const i = (ses.tape = ((ses.tape ?? -1) + 1) % PHONE_TAPES.length);
        note(PHONE_TAPES[i]);
      }
      return;
    }

    // Arcade cabinet: one credit, one run against the room's high score
    sfx(SFX.coin, 0.5, 12); shake(0.04, 0.4);
    const g = GAMES[s.name] ?? { hi: 40000, by: "AAA", col: NEON_COLS[Math.floor(ctx.random() * NEON_COLS.length)], lose: "GAME OVER. Continue? 9… 8… you don't." };
    const fwd = forwardOffset(yaw, 0.45);
    glowPulse(ctx, { x: pos.x + fwd.x, y: pos.y + 1.35, z: pos.z + fwd.z }, g.col, 2.8, 4.2, 2.0);
    ctx.spawn({ feetPosition: { x: pos.x + fwd.x, y: pos.y + 1.35, z: pos.z + fwd.z }, fx: { script: NEON_FX }, lifetime: 1.8 });
    scoreRun(g);
  },
};

export function goal(ctx) {
  const p = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
  ctx.emit("playSound", { clip: SFX.goal, position: { x: p.x, y: p.y + 1, z: p.z }, volume: 0.55, maxDistance: 12 });
  ctx.emit("shake", { target: ctx.self.id, intensity: 0.05, duration: 0.25 });
}
export function lineStatic(ctx) { const p = ctx.self.worldFeetPosition ?? ctx.self.feetPosition; ctx.emit("playSound", { clip: SFX.static, position: { x: p.x, y: p.y + 1.4, z: p.z }, volume: 0.35, maxDistance: 6 }); }
