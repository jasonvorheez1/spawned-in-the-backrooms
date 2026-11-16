// The moving half of a usable: rides beside the thing's own press script (level11-use, l8-use, l7-use…).
// state.kit is one row of scripts/lib/data/usable-kit.json: m motion, p part, s sound, l light, g gift, t line.
// The press answers inside 0.2 s: the part moves, the body squashes, a sound at the thing, a short light if it has one.
// A gift (g) pays once per player per cd seconds; the stamp rides state.kcd[userId].
import { animate } from "builtin/tween";
import { seatPart } from "./lib/usable-kit.js";
const SFX = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const DEF_SOUND = { lever: "heavy-iron-lever-throw-clank", dial: "rotary-dial-ratchet-spin", button: "brass-elevator-button-click", flap: "old-steamer-trunk-lid-creak-open", screen: "old-computer-boot-startup-chime", lamp: "old-payphone-hook-switch-click", tap: "wood-creak-heavy-timber-settling" };
const FLASH = (c) => `fx
pop glow burst=1 life=.9 v=<0,0,0> col=<${c}> a=1>0 r=light(<${c}>,$a*4,5)
pop mote burst=6..9 on=sphere(.15) life=.5..0.9 v=up(.3..0.7)+sdir()*.2 size=.03..0.06 acc=drag(1.5) col=<${c}>*2 a=1>0 sz=$size r=sprite(soft-disc,add)`;
function move(ctx, k) {
  const id = ctx.self.id, part = k.p ? `${id}/kit-${k.p}` : null, has = part && ctx.getObject(part);
  if (has) {
    if (k.m === "lever") animate(ctx, part, { "rotation.pitch": [0, 55, 55, 0] }, { duration: 1.1, easing: "easeOutQuad" });
    else if (k.m === "dial") animate(ctx, part, { "rotation.roll": [0, 300, 240, 360] }, { duration: 0.9, easing: "easeOutCubic" });
    else if (k.m === "button") animate(ctx, part, { "scale.y": [1, 0.35, 0.35, 1] }, { duration: 0.35, easing: "easeOutQuad" });
    else if (k.m === "flap") animate(ctx, part, { "rotation.pitch": [0, -80, -80, 0] }, { duration: 1.6, easing: "easeInOutSine" });
    else if (k.m === "screen") animate(ctx, part, { "scale.y": [0.02, 1, 1, 1, 0.02], "scale.x": [0.4, 1, 1, 1, 0.9] }, { duration: 5, easing: "easeOutQuad" });
    else if (k.m === "lamp") animate(ctx, part, { scale: [1, 1.5, 0.8, 1.3, 1] }, { duration: 0.6 });
  }
  ctx.emit("squash", { target: id, axis: "y", intensity: k.q ?? 0.06, duration: 0.25 });
  if (k.m === "tap" || !has) ctx.emit("shake", { target: id, intensity: 0.04, duration: 0.25 });
}
// a row born with its kit inline (level7, level 0.2) seats its own part once it has a body to measure
export function onSpawn(ctx) { if (ctx.self.state.kit?.p) ctx.after(1.5, "dress"); }
export function dress(ctx) { if (!seatPart(ctx, ctx.self, ctx.self.state.kit) && !ctx.self.bounds && (ctx.self.session.tries = (ctx.self.session.tries ?? 0) + 1) < 5) ctx.after(2, "dress"); }
export const ears = {
  press: (ctx, { by }) => {
    const k = ctx.self.state.kit; if (!k) return;
    const pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, now = ctx.now();
    const b = ctx.self.bounds, top = b ? b.max.y : pos.y + 1;
    move(ctx, k);
    ctx.emit("playSound", { clip: SFX(k.s ?? DEF_SOUND[k.m] ?? DEF_SOUND.tap), position: pos, volume: 0.55, refDistance: 3, maxDistance: 22 });
    if (k.l) ctx.emit("fx", { position: { x: pos.x, y: top - 0.1, z: pos.z }, script: FLASH(k.l) });
    const who = ctx.getObject(by), g = k.g;
    if (!g || !who?.state) return;
    const uid = who.userId ?? by, cd = ctx.self.state.kcd ?? {};
    if (now - (cd[uid] ?? -1e12) < (g.cd ?? 600) * 1000) return; // the thing still moves; it just has nothing left for you yet
    ctx.self.state.kcd = { ...cd, [uid]: now };
    const st = who.state, up = (key, n, cap = 100) => { if (n) st[key] = Math.max(0, Math.min(cap, (st[key] ?? 80) + n)); };
    up("thirst", g.thirst); up("hunger", g.hunger); up("sanity", g.sanity); up("hp", g.hp, 120);
    if (g.items?.length || g.xp) st.payout = { xp: g.xp ?? 0, items: g.items ?? [] };
    if (k.t) ctx.emit("damageNumber", { position: { x: pos.x, y: top + 0.25, z: pos.z }, text: k.t, color: "#e8c870", size: 0.8 }, { audience: { player: by } });
  },
};
