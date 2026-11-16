// Interactive mall & arcade props in The Bonus Room (places/bonus).
// Pure show-don't-tell: physical 3D animations, spawned coins/gumballs/pinballs/pucks/photo-strips, lights, FX bursts, and spatial audio.
import { animate } from "builtin/tween";

const COOLDOWN_MS = 1200;
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
};

const SPARK_FX = `fx
pop spark burst=14..22 on=sphere(.12) life=.35..0.7 v=up(1.1)+sdir()*.8 size=.025..0.055 acc=vec(0,-2.6,0) col=<1,.85,.35> a=1>0 sz=$size r=sprite(soft-disc,add)`;

const NEON_FX = `fx
pop star burst=12..18 on=box(.3,.1,.3) life=.5..0.9 v=up(1.2)+sdir()*.35 size=.03..0.06 col=<1,.45,.9> a=1>0 sz=$size r=sprite(soft-disc,add)`;

const GUM_COLORS = ["#ff4d6d", "#05ffa1", "#ffe14a", "#b967ff", "#38f4ff"];
const NEON_COLS = ["#ff4fd8", "#38f4ff", "#ffe14a", "#05ffa1"];

function glowPulse(ctx, pos, color, intensity = 2.4, distance = 4.5, life = 1.8) {
  return ctx.spawn({
    feetPosition: pos,
    light: { kind: "point", color, intensity, distance, shadow: { enabled: false } },
    lifetime: life,
  });
}

function forwardOffset(yawDeg, dist) {
  const rad = ((yawDeg ?? 0) * Math.PI) / 180;
  return { x: -Math.sin(rad) * dist, z: -Math.cos(rad) * dist };
}

export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by);
    if (!who) return;
    const now = ctx.now();
    const ses = (ctx.self.session.bonusProp ??= {});
    if (now - (ses.lastAt ?? 0) < COOLDOWN_MS) return;
    ses.lastAt = now;

    const s = ctx.self.state ?? {};
    const kind = s.propKind ?? "cabinet";
    const pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
    const yaw = typeof ctx.self.rotation === "number" ? ctx.self.rotation : ctx.self.rotation?.yaw ?? 0;
    const sfx = (clip, volume = 0.55, maxDistance = 14) => {
      if (clip) ctx.emit("playSound", { clip, position: { x: pos.x, y: pos.y + 1, z: pos.z }, volume, maxDistance });
    };

    if (kind === "photobooth") {
      sfx(SFX.shutter, 0.65, 14);
      const fwd = forwardOffset(yaw, 0.45);
      glowPulse(ctx, { x: pos.x + fwd.x, y: pos.y + 1.55, z: pos.z + fwd.z }, "#ffffff", 6, 6, 0.35);
      ctx.emit("screenFlash", { color: "#ffffff", duration: 0.35, intensity: 0.85 }, { audience: { player: who.id } });
      // Physical 4-frame neon photo strip held briefly in hand
      const heldPhoto = (ses.heldPhoto ??= {});
      const prev = heldPhoto[who.id];
      if (prev && ctx.getObject(prev)) ctx.destroy(prev);
      const frames = ["#ff71ce", "#01cdfe", "#b967ff", "#05ffa1"].map((col, idx) => ({
        feetPosition: { x: 0, y: 0.03 + idx * 0.036, z: 0.004 },
        primitive: { kind: "plane", width: 0.034, height: 0.028 },
        material: { color: col, emissive: col, emissiveIntensity: 0.4, roughness: 0.3 },
      }));
      heldPhoto[who.id] = ctx.spawn({
        parent: who.id,
        attachment: { bone: "RightHand" },
        feetPosition: { x: 0.02, y: 0.06, z: 0.05 },
        rotation: { pitch: -15 },
        primitive: { kind: "box", width: 0.044, height: 0.165, depth: 0.005 },
        material: { color: "#f6f2fa", roughness: 0.4 },
        children: frames,
        visibleInFirstPerson: true,
        lifetime: 8,
      });
      return;
    }

    if (kind === "kiddieride") {
      sfx(SFX.crank, 0.6, 14);
      animate(ctx, ctx.self, { "rotation.roll": [0, 7, -7, 4, -4, 0] }, { duration: 2.2, easing: "easeInOutSine" });
      glowPulse(ctx, { x: pos.x, y: pos.y + 1.25, z: pos.z }, "#ffe14a", 2.8, 5, 2.2);
      ctx.spawn({ feetPosition: { x: pos.x, y: pos.y + 0.9, z: pos.z }, fx: { script: SPARK_FX }, lifetime: 2.0 });
      return;
    }

    if (kind === "gumball") {
      sfx(SFX.coin, 0.55, 12);
      const col = GUM_COLORS[Math.floor(ctx.random() * GUM_COLORS.length)];
      const fwd = forwardOffset(yaw, 0.28);
      const gumball = ctx.spawn({
        feetPosition: { x: pos.x + fwd.x, y: pos.y + 0.92, z: pos.z + fwd.z },
        primitive: { kind: "sphere", radius: 0.032 },
        material: { color: col, roughness: 0.15, metalness: 0.05, emissive: col, emissiveIntensity: 0.25 },
        lifetime: 1.4,
      });
      animate(ctx, gumball, { "feetPosition.y": [pos.y + 0.92, pos.y + 0.72, pos.y + 0.78, pos.y + 0.72] }, { duration: 0.6, easing: "easeOutQuad" });
      const heldGum = (ses.heldGum ??= {});
      const prev = heldGum[who.id];
      if (prev && ctx.getObject(prev)) ctx.destroy(prev);
      heldGum[who.id] = ctx.spawn({
        parent: who.id,
        attachment: { bone: "RightHand" },
        feetPosition: { x: 0.01, y: 0.03, z: 0.05 },
        primitive: { kind: "sphere", radius: 0.028 },
        material: { color: col, roughness: 0.12, emissive: col, emissiveIntensity: 0.2 },
        visibleInFirstPerson: true,
        lifetime: 6,
      });
      ctx.emit("playSound", { clip: SFX.chew, position: who.feetPosition, volume: 0.45 });
      return;
    }

    if (kind === "tokens") {
      sfx(SFX.coin, 0.6, 12);
      const fwd = forwardOffset(yaw, 0.25);
      for (let i = 0; i < 3; i++) {
        const dx = (i - 1) * 0.055;
        const tok = ctx.spawn({
          feetPosition: { x: pos.x + fwd.x, y: pos.y + 0.85, z: pos.z + fwd.z + dx },
          primitive: { kind: "cylinder", radiusTop: 0.026, radiusBottom: 0.026, height: 0.006, radialSegments: 16 },
          material: { color: "#ffd24a", metalness: 0.95, roughness: 0.2, emissive: "#ffaa22", emissiveIntensity: 0.35 },
          lifetime: 2.2,
        });
        animate(ctx, tok, {
          "feetPosition.y": [pos.y + 0.85, pos.y + 1.06 + i * 0.04, pos.y + 0.82],
          "rotation.yaw": [0, 360 + i * 180],
          "rotation.pitch": [90, 90],
        }, { duration: 0.7 + i * 0.12, easing: "easeOutQuad" });
      }
      glowPulse(ctx, { x: pos.x + fwd.x, y: pos.y + 1.05, z: pos.z + fwd.z }, "#ffd24a", 2.2, 3.5, 1.5);
      return;
    }

    if (kind === "pinball") {
      sfx(SFX.sparkle, 0.5, 12);
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
      glowPulse(ctx, { x: pos.x + fwd.x, y: pos.y + 1.35, z: pos.z + fwd.z }, "#38f4ff", 3.0, 4.5, 1.8);
      ctx.spawn({ feetPosition: { x: pos.x + fwd.x, y: pos.y + 1.15, z: pos.z + fwd.z }, fx: { script: SPARK_FX }, lifetime: 1.6 });
      return;
    }

    if (kind === "airhockey") {
      sfx(SFX.blip, 0.55, 12);
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
      return;
    }

    if (kind === "claw") {
      sfx(SFX.coin, 0.55, 12);
      const col = GUM_COLORS[Math.floor(ctx.random() * GUM_COLORS.length)];
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
      animate(ctx, prize, {
        "feetPosition.x": [pos.x - 0.12, pos.x - 0.12, pos.x + 0.22, pos.x + 0.22],
        "feetPosition.y": [pos.y + 1.05, pos.y + 1.05, pos.y + 1.42, pos.y + 0.92],
        "feetPosition.z": [pos.z + 0.08, pos.z + 0.08, pos.z - 0.18, pos.z - 0.18],
      }, { duration: 2.1, easing: "easeInOutSine" });
      glowPulse(ctx, { x: pos.x, y: pos.y + 1.45, z: pos.z }, "#ff71ce", 2.5, 4, 2.2);
      return;
    }

    if (kind === "dance") {
      sfx(SFX.tick, 0.55, 14);
      const pads = [
        [-0.32, -0.32, "#ff4fd8"],
        [0.32, -0.32, "#38f4ff"],
        [-0.32, 0.32, "#05ffa1"],
        [0.32, 0.32, "#ffe14a"],
      ];
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
      return;
    }

    if (kind === "payphone") {
      const clip = (ses.phoneFlip = !ses.phoneFlip) ? SFX.static : SFX.radio;
      sfx(clip, 0.5, 10);
      const fwd = forwardOffset(yaw, 0.18);
      glowPulse(ctx, { x: pos.x + fwd.x, y: pos.y + 1.42, z: pos.z + fwd.z }, "#ff5566", 1.8, 3, 2.2);
      return;
    }

    // Standard arcade cabinet attract-mode pop
    sfx(SFX.arcade, 0.5, 12);
    const fwd = forwardOffset(yaw, 0.45);
    const col = NEON_COLS[Math.floor(ctx.random() * NEON_COLS.length)];
    glowPulse(ctx, { x: pos.x + fwd.x, y: pos.y + 1.35, z: pos.z + fwd.z }, col, 2.8, 4.2, 2.0);
    ctx.spawn({ feetPosition: { x: pos.x + fwd.x, y: pos.y + 1.35, z: pos.z + fwd.z }, fx: { script: NEON_FX }, lifetime: 1.8 });
  },
};
