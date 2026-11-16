// Payphones as the Backrooms wikis tell it: they ring on their own, some lines are dead, and a ringing one is a gamble.
// Answer a ring: an M.E.G. relay reads you the way out of this level (real bearing, real distance, the exit's name),
// or dead static, or the Operator: a voice you know, asking you to stay on the line. Hang up fast or it keeps calling.
// Dial out (not ringing): one Backquarter (25 cents) buys the M.E.G. hotline, always a real way out.
// Numbers are Savi's picks: tip 50% / static 25% / Operator 25% on a ring; Operator -12 sanity; a ring-back within 90 s is the Operator again.
import { heard } from "./hear.js";
import { EXITS } from "./quest-route.js";
const G = "cdn/moodboard-realistic-gritty/";
export const SFX = {
  ring: G + "sfx-old-payphone-mechanical-bell-ringing-loop.mp3",
  lift: G + "sfx-payphone-handset-lifted-off-metal-hook-clunk.mp3",
  stat: G + "sfx-telephone-earpiece-line-static-hiss-and-crackle.mp3",
  coin: G + "sfx-payphone-coin-drop-into-slot-and-dial-tone.mp3",
  dead: G + "sfx-payphone-dead-line-click-no-tone.mp3",
};
const V = (who, line) => "cdn/voice-" + who + "-saying-" + encodeURIComponent(line) + ".mp3";
const MEG = "tired-female-radio-dispatcher-through-phone-line-filter";
const OP = "warm-familiar-voice-slightly-wrong-pitch-through-phone-static";
const OP_LINES = ["hey. it's me. where did you go? stay on the line, okay?", "i can hear you breathing. don't hang up. please don't hang up.", "come closer to the phone. i miss you."];
const DIRS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
function bearing(from, to) { // north = -z, as the compass draws it
  const a = (Math.atan2(to.x - from.x, -(to.z - from.z)) * 180 / Math.PI + 360) % 360;
  return DIRS[Math.round(a / 45) % 8];
}
function nearestExit(ctx, who) {
  const here = who.place ?? ctx.place?.id, st = who.state ?? {};
  let best = null;
  for (const e of EXITS[here] ?? []) {
    if (e.needs && !st[e.needs] && !String(e.needs).startsWith("key:")) continue;
    const o = ctx.place.objects?.[e.id]; const p = o?.worldFeetPosition ?? o?.feetPosition ?? e.point; if (!p) continue;
    const d = Math.hypot(p.x - who.feetPosition.x, p.z - who.feetPosition.z);
    if (!best || d < best.d) best = { ...e, p, d };
  }
  return best;
}
function tip(ctx, who, pos, via) {
  const e = nearestExit(ctx, who), now = ctx.now();
  const where = e ? `${bearing(who.feetPosition, e.p)}, about ${Math.max(10, Math.round(e.d / 10) * 10)} metres. ${e.label ?? "The way through"}.` : "Nothing logged for this level. Stay where the lights are steady.";
  heard(ctx, { clip: V(MEG, e ? "relay. your nearest way out is " + where : "relay. " + where), position: pos, volume: 0.9, maxDistance: 6, bus: "Voice" });
  who.state.sub = { who: via === "dial" ? "M.E.G. HOTLINE · 25¢" : "M.E.G. RELAY", t: e ? `"Nearest way out: ${where} Don't stop to rest."` : `"${where}"`, at: now, d: 9000 };
  if (e) who.state.phoneTip = { place: who.place ?? ctx.place?.id, x: e.p.x, z: e.p.z, label: e.label ?? "Way out", at: now };
  who.state.sanity = Math.min(100, (who.state.sanity ?? 80) + 4);
}
// the whole call. s = the phone's state; who = the presser's handle; ringing = was it ringing when lifted
export function phoneCall(ctx, s, who, ringing) {
  if (!who) return;
  const now = ctx.now(), pos = { ...ctx.self.worldFeetPosition, y: 1.5 }, st = who.state;
  heard(ctx, { clip: SFX.lift, position: pos, volume: 0.7, maxDistance: 12 });
  if (ringing) {
    s.quietUntil = now + 120000;
    const op = now - (st.operatorAt ?? -1e12) < 90000; // you answered it once; it knows this number now
    const r = op ? 0.9 : ctx.random();
    if (r < 0.5) return tip(ctx, who, pos, "ring");
    if (r < 0.75) {
      heard(ctx, { clip: SFX.stat, position: pos, volume: 0.6, maxDistance: 8 });
      st.sub = { who: "PAYPHONE", t: "Static. Something on the other end is breathing in time with you. Then a click.", at: now, d: 5000 };
      st.sanity = Math.max(0, (st.sanity ?? 80) - 2); return;
    }
    st.operatorAt = now;
    heard(ctx, { clip: SFX.stat, position: pos, volume: 0.35, maxDistance: 8 });
    heard(ctx, { clip: V(OP, OP_LINES[Math.floor(ctx.random() * OP_LINES.length)]), position: pos, volume: 0.95, maxDistance: 5, bus: "Voice" });
    st.sub = { who: "THE OPERATOR", t: "It sounds like someone you know. It isn't. Walk away from the phones.", at: now, d: 7000 };
    st.sanity = Math.max(0, (st.sanity ?? 80) - 12);
    ctx.emit("screenShake", { intensity: 0.25, duration: 0.4 }, { audience: { player: who.id } });
    s.quietUntil = now + 20000; // it calls back soon
    return;
  }
  if (now < (s.deadUntil ?? 0)) { heard(ctx, { clip: SFX.dead, position: pos, volume: 0.5, maxDistance: 8 }); st.notice = { text: "Dead line. Not even a dial tone.", at: now }; return; }
  if ((st.cents ?? 0) < 25) { heard(ctx, { clip: SFX.stat, position: pos, volume: 0.3, maxDistance: 8 }); st.notice = { text: "Dial tone. A sticker: M.E.G. HOTLINE, 25¢. You're out of quarters.", at: now }; return; }
  st.cents -= 25;
  heard(ctx, { clip: SFX.coin, position: pos, volume: 0.7, maxDistance: 10 });
  if (ctx.random() < 0.15) { s.deadUntil = now + 300000; heard(ctx, { clip: SFX.dead, position: pos, volume: 0.5, maxDistance: 8 }); st.notice = { text: "The quarter drops. The line dies. It kept your quarter.", at: now }; return; }
  tip(ctx, who, pos, "dial");
}
// rings by itself, sometimes, when someone's near: never on a loop the moment you walk up
export function phoneRing(ctx, s, near) {
  const now = ctx.now(), ss = ctx.self.session;
  if (!near) { if (ss.ring) { ss.ring = false; ctx.self.audio = null; } ss.nextRing = null; return false; }
  ss.nextRing ??= now + 4000 + ctx.random() * 26000;
  const ring = now >= (s.quietUntil ?? 0) && now >= ss.nextRing && now < ss.nextRing + 20000; // rings 20 s, then gives up a while
  if (now >= ss.nextRing + 20000) ss.nextRing = now + 40000 + ctx.random() * 80000;
  if (ring !== !!ss.ring) { ss.ring = ring; ctx.self.audio = ring ? { clip: SFX.ring, loop: true, gain: 0.45, spatial: true, maxDistance: 22 } : null; s.verb = ring ? "Answer" : "Dial M.E.G. (25¢)"; s.info = ring ? "it's ringing" : "a sticker reads M.E.G. HOTLINE"; }
  return ring;
}
