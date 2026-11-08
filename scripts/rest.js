// T: wait or sleep, Fallout-style. A menu of hours; time jumps forward for the whole world (lib/clock.js).
// On or beside a bed it's sleep: HP and sanity come back with the hours. Either way you get hungry and thirsty.
// Refused with a hostile close by. Residents read the same clock, so a wait into night sends them to bed.
import { canOpen, openWrist } from "./lib/screen.js";
import { HOUR_MS, clockOf } from "./lib/clock.js";
const HOSTILE = ["l5-hostile", "hound", "smiler", "lurker", "stealer", "enemy", "faceling", "deathmoth"];
const bedNear = (ctx) => ctx.query({ radius: 2.6 }).find((r) => /bed|cot|bunk|mattress/i.test(r.id + " " + (r.state?.name ?? "")));
export function onInput(ctx, input) {
  const s = ctx.self.state;
  if (input.pressed.wait) { if (s.waitOpen) s.waitOpen = false; else if (canOpen(s, ctx.self.place, "rest")) openWrist(s, "rest"); if (s.waitOpen) { s.waitBed = !!bedNear(ctx); s.waitClock = clockOf(ctx).text; } return; }
  if (input.pressed.waitdo) { const h = Math.max(0, Math.min(24, input.actionData?.waitdo?.h | 0)); if (!h) { s.waitOpen = false; return; } rest(ctx, h); }
}
function rest(ctx, h) {
  const s = ctx.self.state; s.waitOpen = false;
  if (ctx.query({ anyTags: HOSTILE, radius: 18 }).some((r) => !r.state?.dead && !(r.tags ?? []).includes("remains"))) { s.notice = { text: "You can't rest with enemies nearby.", at: ctx.now() }; return; }
  const bed = !!bedNear(ctx);
  ctx.world.state.clockSkip = (ctx.world.state.clockSkip ?? 0) + h * HOUR_MS;
  const l4 = ctx.place.state.l4clock; if (l4 && Number.isFinite(l4.until)) ctx.place.state.l4clock = { ...l4, until: l4.until - h * HOUR_MS }; // Level 4 keeps its own shift clock
  if (bed) {
    const mh = s.maxHp ?? s.hpMax ?? 100;
    s.hp = Math.min(mh, (s.hp ?? 0) + mh * Math.min(1, h / 8)); s.sanity = Math.min(100, (s.sanity ?? 0) + h * 10);
  }
  s.hunger = Math.max(0, (s.hunger ?? 100) - h * 3); s.thirst = Math.max(0, (s.thirst ?? 100) - h * 4);
  s.restFx = { at: ctx.now(), text: `${bed ? "You slept" : "You waited"} ${h} hour${h > 1 ? "s" : ""}. It's ${clockOf(ctx).text}.` };
  ctx.emit("playSound", { clip: bed ? "cdn/moodboard-realistic-gritty/sfx-bedsheets-rustle-settle-sigh.mp3" : "cdn/moodboard-realistic-gritty/sfx-old-clock-ticking-quiet.mp3", volume: 0.5 });
}
