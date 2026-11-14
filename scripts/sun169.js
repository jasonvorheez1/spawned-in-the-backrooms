// Level 169's three rules, on the player (Shelly's brief, Nov 14; numbers in scripts/lib/data/level169.yml, Savi's picks marked there):
// 1 direct sun turns the water in you to sand: exposure climbs only while a ray from your head to the sun is clear (a roof, a rock, a canyon wall all count).
// 2 nights are near freezing: chill climbs outdoors at night without a coat. Never below a floor of hp.
// 3 water and almond water you carry become sand. What Ferry hands you stays water while it stays cold (state.l169cold bottles, l169coldLeft seconds).
import { raycast } from "builtin/physics";
import L from "./lib/data/level169.yml";
export const updateSchedule = { every: { seconds: 1 } };
const HOUR_S = L.day.periodMs / 48000; // one desert hour, in real seconds
const KEYS = ["almonds", "almondsG", "almondsR", "almondsB"];
const STAGE = ["", "The sun has weight here. Your mouth is dry already.", "Heat stress. Your legs are slow and your tongue feels gritty. Find shade.", "The horizon is moving. You can taste sand. Get under cover NOW.", "The sand is taking you."];
export const hourOf = (ctx) => { const t = ctx.place?.atmosphere?.timeOfDay; return typeof t === "number" ? t : ((ctx.now() % L.day.periodMs) / L.day.periodMs) * 24; };
export const isDay = (h) => h > L.day.sunrise && h < L.day.sunset;
export function sunDir(h) { const a = (Math.PI * (h - L.day.sunrise)) / (L.day.sunset - L.day.sunrise); const x = Math.cos(a), y = Math.max(0.12, Math.sin(a)), z = 0.25, l = Math.hypot(x, y, z); return { x: x / l, y: y / l, z: z / l }; }
export function update(ctx) {
  const me = ctx.self, s = me.state; if (me.isLocal === false) return;
  if (me.place !== "level169") {
    if ((s.l169sun ?? 0) > 0) { s.l169sun = Math.max(0, Math.round(s.l169sun - 2)); if (!s.l169sun) s.l169st = 0; }
    if ((s.l169chill ?? 0) > 0) s.l169chill = Math.max(0, Math.round(s.l169chill - 4));
    if (!(s.l169sun > 0) && !(s.l169chill > 0)) return ctx.sleep(5);
    return;
  }
  const f = me.feetPosition, head = { x: f.x, y: f.y + 1.6, z: f.z }, h = hourOf(ctx), day = isDay(h), now = ctx.now(), k = ctx.session;
  const opt = { distance: 80, physicsOnly: true, bodies: "static", ignoreEntities: [me.id] };
  const roofed = !!raycast(ctx, head, { x: 0, y: 1, z: 0 }, { ...opt, distance: 12 });
  const lit = day && !roofed && !raycast(ctx, head, sunDir(h), opt);
  const gear = s.gear169 ?? {};
  if (s.l169rest && s.l169rest !== k.restAt) { k.restAt = s.l169rest; k.sun = 0; k.chill = 0; s.l169sun = 0; s.l169st = 0; s.l169chill = 0; } // slept in a bed (scripts/lib/l169-road.js)
  // ---- 1 sun
  k.sun ??= s.l169sun ?? 0;
  const per = 100 / (L.sun.lethalHours * HOUR_S);
  if (s.god) k.sun = 0;
  else if (lit) k.sun = Math.min(130, k.sun + per * (gear.wrap ? L.sun.wrap : 1));
  else k.sun = Math.max(0, k.sun - per * (roofed ? L.sun.indoorRecover : L.sun.shadeRecover));
  const st = k.sun >= 100 ? 4 : k.sun >= 75 ? 3 : k.sun >= 50 ? 2 : k.sun >= 25 ? 1 : 0;
  if (st !== (s.l169st ?? 0)) { if (st > (s.l169st ?? 0)) s.notice = { text: STAGE[st], at: now }; s.l169st = st; }
  if (Math.round(k.sun) !== s.l169sun) s.l169sun = Math.round(k.sun);
  if (lit !== !!s.l169lit) s.l169lit = lit;
  if (lit && st >= 1) s.thirst = Math.max(0, (s.thirst ?? 100) - 0.12 * st);
  if (st >= 3 && now - (k.hallu ?? 0) > 9000) { k.hallu = now; ctx.emit("screenFlash", { color: "#fff3c4", duration: 1.6, intensity: 0.35 }, { audience: { player: me.id } }); ctx.emit("playSound", { clip: "cdn/moodboard-realistic-gritty/sfx-distant-muffled-voice-calling-across-desert-heat-shimmer.mp3", position: { x: f.x + 14, y: f.y, z: f.z - 20 }, volume: 0.5 }, { audience: { player: me.id } }); }
  if (st >= 4 && (s.hp ?? 0) > 0) { s.hp -= L.sun.fatalDps; if (s.hp <= 0) s.deathBy = "The sun turned the water in you to sand."; }
  // ---- 2 cold
  k.chill ??= s.l169chill ?? 0;
  if (!day && !roofed && !s.god) k.chill = Math.min(100, k.chill + (L.cold.perHour / HOUR_S) * (gear.coat ? L.cold.coat : 1));
  else k.chill = Math.max(0, k.chill - (roofed ? 1.2 : 0.4));
  if (Math.round(k.chill) !== (s.l169chill ?? 0)) { const was = s.l169chill ?? 0; s.l169chill = Math.round(k.chill); if (was < 50 && s.l169chill >= 50) s.notice = { text: "Your hands have gone stiff. It's near freezing out here. Get indoors or keep a coat on.", at: now }; }
  if (k.chill >= 80) { const floor = (s.maxHp ?? 100) * L.cold.hpFloor; if ((s.hp ?? 0) > floor) s.hp = Math.max(floor, s.hp - 0.5); }
  // ---- 3 water to sand
  let cold = s.l169cold ?? 0;
  if (cold > 0 && !roofed) { const left = (s.l169coldLeft ?? 0) - (day ? 1 : L.water.coldHoursDay / L.water.coldHoursNight); if (left <= 0) { cold = 0; s.l169cold = 0; s.l169coldLeft = 0; } else if (Math.floor(left / 10) !== Math.floor((s.l169coldLeft ?? 0) / 10) || left < 1) s.l169coldLeft = left; else k.coldLeft = left; }
  let total = 0; for (const key of KEYS) total += s[key] ?? 0;
  if (cold > total) { cold = total; s.l169cold = total; } // you drank some of Ferry's
  if (total > cold) {
    let turn = total - cold; const n = turn;
    for (const key of [...KEYS].reverse()) { const take = Math.min(turn, s[key] ?? 0); if (take > 0) { s[key] -= take; turn -= take; } }
    s.sand169 = (s.sand169 ?? 0) + n;
    s.notice = { text: n === 1 ? "Your bottle is full of sand. Dry, fine sand." : `${n} of your bottles are full of sand. Dry, fine sand.`, at: now };
    ctx.emit("playSound", { clip: "cdn/moodboard-realistic-gritty/sfx-fine-dry-sand-pouring-inside-plastic-bottle.mp3", position: head, volume: 0.7 }, { audience: { player: me.id } });
  }
}
