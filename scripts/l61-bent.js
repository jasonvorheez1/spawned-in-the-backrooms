// Level 6.1 "The Snackrooms" - The Bent Wall (The Blue Channel threshold)
// An anomalous architectural buckle leaking cold dimensional vapor and void energy.
import { heard } from "./lib/hear.js";

const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;

const VOID_SPLASH_FX = `fx
pop mist burst=12 life=0.8..1.5 on=box(.3,1.8,.3) v=<%dir|-1,0,0>*(1.2..2.2)+up(.3) size=.15..0.35 acc=drag(1.5) col=<.4,.75,1> a=0>.2:.4>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)
pop drop burst=16 life=0.6..1.2 on=box(.2,1.6,.2) v=sdir()*(1.0..1.8)+up(.4) size=.02..0.05 acc=grav()*1.2 col=hdr(.6,1.4,2.5) a=1>0 r=sprite(soft-disc,add)`;

export function onTriggerEnter(ctx, other) {
  const w = other?.state; if (!w || w.level == null) return;
  const now = ctx.now(); if (now - (w.bentAt ?? -1e9) < 8000) return; w.bentAt = now;

  const pos = other.feetPosition;

  // Show, don't tell: cold blue anomalous flash, camera punch recoil, cold splash and void static
  ctx.emit("screenFlash", { color: "#40a8ff", duration: 0.9, intensity: 0.8 }, { audience: { player: other.id } });
  ctx.emit("cameraPunch", { direction: { x: -1, y: 0, z: 0 }, intensity: 0.65 }, { audience: { player: other.id } });
  ctx.emit("screenShake", { intensity: 0.4, duration: 0.35 }, { audience: { player: other.id } });

  heard(ctx, { clip: G("static-burst-glitch-threshold"), position: pos, volume: 0.85, maxDistance: 22 }, { audience: { player: other.id } });
  heard(ctx, { clip: G("water-pour-splash-short"), position: pos, volume: 0.75, maxDistance: 16 }, { audience: { player: other.id } });

  // Cold vapor burst from the buckled wall fracture
  ctx.emit("fx", { position: { x: pos.x + 0.8, y: pos.y + 1.2, z: pos.z }, script: VOID_SPLASH_FX, direction: { x: -1, y: 0, z: 0 } });

  w.sanity = Math.max(0, (w.sanity ?? 80) - 4);
  ctx.emit("damageNumber", {
    position: { x: pos.x, y: pos.y + 1.5, z: pos.z },
    text: "-4 SANITY (COLD VOID TOUCH)",
    color: "#68c8ff",
    size: 1.05,
  }, { audience: { player: other.id } });

  // Physical knockback away from the dimensional distortion
  other.feetPosition = { x: other.feetPosition.x - 2.4, y: other.feetPosition.y, z: other.feetPosition.z };
}
