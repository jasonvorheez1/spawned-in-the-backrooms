// Level 178 sliding shoji, the kitchen tap, futons, towels, the dining table, the sword cabinet and the kimono closet, the house's readables (kind read, state.page): E (scripts/interact.js `usable`) rings press; numbers in lib/data/level178.yml.
import { animate } from "builtin/tween";
import L from "./lib/data/level178.yml";
import { queuePayout } from "./lib/quests.js";
const STREAM = `fx
pop water rate=?mobile:30|60 on=disc(.008) life=.22..0.28 v=<0,-0.6,0> acc=grav() size=.01..0.016 col=<.82,.9,1> a=.55 sz=$size r=sprite(soft-disc,alpha,velocity,.04)`;
function leaf(ctx, instant) {
  const s = ctx.self.state, id = ctx.self.id + "/leaf", x = s.open ? s.openX : s.closedX;
  if (!ctx.getObject(id)) return;
  animate(ctx, id, { "feetPosition.x": x }, { duration: instant ? 0.01 : L.shoji.ease, easing: "easeOutCubic" });
}
function tap(ctx) {
  const s = ctx.self.state, id = ctx.self.id + "/stream", has = !!ctx.getObject(id), sp = L.tap.spout;
  if (s.on && !has) ctx.spawn("stream", { parent: ctx.self.id, feetPosition: { x: sp[0], y: sp[1], z: sp[2] }, fx: { script: STREAM },
    audio: { clip: "cdn/sfx-kitchen-tap-water-running-into-steel-sink-loop.mp3", loop: true, gain: L.tap.gain, spatial: true, maxDistance: L.tap.maxDistance } });
  if (!s.on && has) ctx.destroy(id);
}
function who(ctx, by) { const p = by && ctx.getObject(by); return p?.state ? p : null; }
function say(ps, text, ctx) { ps.notice = { text, at: ctx.now() }; }
function use(ctx, s, at) {
  const by = ctx.self.session.by, p = who(ctx, by), ps = p?.state, now = ctx.now();
  if (s.kind === "cabinet") { ctx.emit("playSound", { clip: "cdn/sfx-glass-cabinet-door-soft-wooden-click.mp3", position: at, volume: 0.35 }); if (ps) say(ps, "Three lacquered katana rest on their stands behind the glass. Decorative. Somebody dusts them every morning.", ctx); return; }
  if (s.kind === "closet") {
    s.open = !s.open; s.verb = s.open ? "Close" : "Open";
    ctx.emit("playSound", { clip: "cdn/sfx-wooden-shoji-paper-door-sliding-in-wood-track.mp3", position: at, volume: 0.4 });
    if (ps && s.open && !ps.l178closet) { ps.l178closet = 1; queuePayout(ps, { items: String(L.closetGift).split(","), text: "A haori and a hachimaki, folded on top. Nobody will miss them." }); } else if (ps && s.open) say(ps, "Folded kimonos in indigo and plum, a row of geta under them. They smell of cedar.", ctx); return;
  }
  if (!ps) return;
  if (s.kind === "read") { ps.reading = s.page; ctx.emit("playSound", { clip: "cdn/sfx-paper-page-turn-soft.mp3", position: at, volume: 0.35 }); return; } // a page in scripts/lib/data/pages.yml, drawn by ui.js's reading panel
  if (s.kind === "towels") { ps.sanity = Math.min(100, (ps.sanity ?? 100) + L.towel.sanity); if (ps.wet) ps.wet = 0; ctx.emit("playSound", { clip: "cdn/sfx-soft-cotton-towel-unfolding.mp3", position: at, volume: 0.4 }); say(ps, "A warm towel off the stack. Still smells like sun.", ctx); return; }
  if (s.kind === "table") {
    if (now - (ps.l178meal ?? -1e12) < L.meal.cooldown * 1000) { say(ps, "Your bowl's empty. The Sector will cook again in a bit.", ctx); return; }
    ps.l178meal = now; ps.hunger = Math.min(100, (ps.hunger ?? 100) + L.meal.hunger); ps.thirst = Math.min(100, (ps.thirst ?? 100) + L.meal.thirst);
    ctx.emit("playSound", { clip: "cdn/sfx-ceramic-bowl-set-on-wooden-table-chopsticks.mp3", position: at, volume: 0.45 });
    say(ps, "Rice, miso, grilled fish, pickles. The Sector always leaves a setting out for travellers.", ctx); return;
  }
  if (s.kind === "futon") {
    if (now - (ps.l178rest ?? -1e12) < L.rest.cooldown * 1000) { say(ps, "You're rested. The futon will keep.", ctx); return; }
    ps.l178rest = now; ps.sanity = Math.min(100, (ps.sanity ?? 100) + L.rest.sanity);
    ctx.emit("screenFlash", { color: "oklch(0.05 0.01 60)", duration: L.rest.fade, intensity: 1 }, { audience: { player: by } });
    ctx.emit("playSound", { clip: "cdn/sfx-futon-rustle-soft-exhale.mp3", position: at, volume: 0.4 });
    say(ps, "You doze off to birdsong and the spring. You wake warm, and steadier.", ctx);
  }
}
export function onSpawn(ctx) { const k = ctx.self.state.kind; if (k === "shoji") leaf(ctx, true); else if (k === "tap") tap(ctx); }
export const ears = {
  press: (ctx, m) => {
    ctx.self.session.by = m?.by;
    const s = ctx.self.state, at = ctx.self.worldFeetPosition;
    if (s.kind === "shoji") {
      s.open = !s.open; s.verb = s.open ? "Close" : "Open"; leaf(ctx, false);
      ctx.emit("playSound", { clip: "cdn/sfx-wooden-shoji-paper-door-sliding-in-wood-track.mp3", position: at, volume: 0.45 });
    } else if (s.kind === "futon" || s.kind === "towels" || s.kind === "table" || s.kind === "cabinet" || s.kind === "closet" || s.kind === "read") {
      use(ctx, s, at);
    } else if (s.kind === "tap") {
      s.on = !s.on; s.verb = s.on ? "Turn off" : "Turn on"; tap(ctx);
      ctx.emit("playSound", { clip: "cdn/sfx-steel-kitchen-tap-lever-click.mp3", position: at, volume: 0.4 });
    }
  },
};
