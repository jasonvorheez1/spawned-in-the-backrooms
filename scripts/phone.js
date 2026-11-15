// The phone (Shelly, Nov 15: "phones to actually work and work across levels"). M opens it on any level once you own one
// (player.state.phone: a phone bartered in Lumiria, or one already in your Lumiria bag). Texts are Spawn's letters
// (mail:send, moderated, kept by Spawn): they reach a friend on any level, any room, even offline. Signal bars per level.
import { canOpen, openWrist } from "./lib/screen.js";
const BUZZ = "cdn/moodboard-realistic-gritty/sfx-old-flip-phone-vibrate-buzz-short.mp3", KEY = "cdn/moodboard-realistic-gritty/sfx-flip-phone-keypad-beep.mp3";
const me = (ctx, clip, v = 0.6) => ctx.emit("playSound", { clip, volume: v }, { audience: { player: ctx.self.id } });
export function onInput(ctx, input) {
  if (!input.pressed?.phone) return;
  const s = ctx.self.state, a = input.actionData?.phone ?? {};
  if (!a.k) { // M: open / close
    if (s.phoneOpen) { s.phoneOpen = false; return; }
    if (!s.phone && (s.l132?.bag?.phones ?? 0) > 0) s.phone = true;
    if (!s.phone) { s.notice = { text: "No phone. Lumiria's stalls trade them.", at: ctx.now() }; return; }
    if (canOpen(s, ctx.self.place, "phone")) { openWrist(s, "phone"); s.phoneTab ??= "texts"; me(ctx, KEY, 0.4); where(ctx); }
    return;
  }
  if (a.k === "tab") { s.phoneTab = a.t; if (a.t === "friends") where(ctx); return; }
  if (a.k === "to") { s.phoneTo = a.to ?? null; s.phoneTab = "write"; return; }
  if (a.k === "read") { const m = (ctx.self.mail ?? []).find((r) => r.id === a.id); if (m && !m.read) m.read = true; s.phoneRead = a.id; return; }
  if (a.k === "send") {
    const text = String(a.text ?? "").trim().slice(0, 200), to = a.to ?? s.phoneTo;
    if (!text || !to) return;
    s.phoneSent = { text: "Sending…", at: ctx.now() }; me(ctx, KEY, 0.4);
    ctx.job("mail:send", { to, topic: "Text", text }, "onPhoneSent", { to, text });
  }
}
export function onPhoneSent(ctx, r, p) {
  const s = ctx.self.state;
  s.phoneSent = { text: r?.ok ? "Delivered" : `Not sent: ${r?.error?.message ?? "no signal"}`, ok: !!r?.ok, at: ctx.now() };
  if (r?.ok) s.phoneLog = [{ to: p.to, text: p.text, at: Date.now() }, ...(s.phoneLog ?? [])].slice(0, 30);
}
function where(ctx) { // where your friends are right now, for the Friends tab
  const fr = ctx.self.friends ?? []; if (!fr.length || !ctx.presence) return;
  Promise.resolve(ctx.presence(fr.map((f) => f.userId))).then((rows) => {
    if (!Array.isArray(rows)) return;
    ctx.self.state.phoneWhere = Object.fromEntries(rows.map((r) => [r.userId, r.world ? (r.world === ctx.world.id ? "here" : "away") : "off"]));
  }).catch(() => {});
}
let seen = null, at = 0;
export function update(ctx) { // a new text buzzes wherever you stand
  const s = ctx.self.state; if (!s?.phone) return ctx.sleep(5);
  if (ctx.now() - at < 2000) return; at = ctx.now();
  const mail = ctx.self.mail ?? [], top = mail.find((m) => !m.read && !m.retracted);
  if (seen === null) { seen = top?.id ?? ""; return; }
  if (top && top.id !== seen) { seen = top.id; me(ctx, BUZZ, 0.7); s.notice = { text: `📱 ${top.from?.displayName ?? "Someone"}: ${String(top.text).slice(0, 60)}`, at: ctx.now() }; }
}
