// The phone (Shelly, Nov 15: "phones to actually work and work across levels", then "flesh it out"). M opens it on any
// level once you own one (player.state.phone: bartered in Lumiria, or one in your Lumiria bag). A 2006 handset with a
// home screen of apps: Messages (Spawn's letters to friends via mail:send + texts from people in the game), Friends,
// Contacts (Lumiria keepers you've traded with: what they want, when they restock), Camera/Photos, Notes, Torch, Radio.
import { canOpen, openWrist } from "./lib/screen.js";
import B from "./lib/data/barter.yml";
const BUZZ = "cdn/moodboard-realistic-gritty/sfx-old-flip-phone-vibrate-buzz-short.mp3", KEY = "cdn/moodboard-realistic-gritty/sfx-flip-phone-keypad-beep.mp3";
const SHUTTER = "cdn/moodboard-realistic-gritty/sfx-old-digital-camera-phone-shutter-click.mp3";
const me = (ctx, clip, v = 0.6) => ctx.emit("playSound", { clip, volume: v }, { audience: { player: ctx.self.id } });
const nameOf = (id) => { const n = String(id).replace(/^l132-/, ""); return n.charAt(0).toUpperCase() + n.slice(1); };
function npcText(ctx, from, text) { // a text from someone in the game: kept on the phone, buzzes once
  const s = ctx.self.state, row = { id: `n${Math.round(ctx.now())}${(ctx.random() * 1e4) | 0}`, from, text, at: Date.now(), read: false };
  s.phoneNpc = [row, ...(s.phoneNpc ?? [])].slice(0, 30);
  me(ctx, BUZZ, 0.7); s.notice = { text: `📱 ${from}: ${text.slice(0, 60)}`, at: ctx.now() };
}
export function onInput(ctx, input) {
  if (!input.pressed?.phone) return;
  const s = ctx.self.state, a = input.actionData?.phone ?? {};
  if (!a.k) { // M: open / close
    if (s.phoneOpen) { s.phoneOpen = false; return; }
    if (!s.phone && (s.l132?.bag?.phones ?? 0) > 0) s.phone = true;
    if (!s.phone) { s.notice = { text: "No phone. Lumiria's stalls trade them.", at: ctx.now() }; return; }
    if (canOpen(s, ctx.self.place, "phone")) { openWrist(s, "phone"); s.phoneApp = "home"; me(ctx, KEY, 0.4); where(ctx); }
    return;
  }
  me(ctx, KEY, 0.25);
  if (a.k === "app") { s.phoneApp = a.app; if (a.app === "friends") where(ctx); if (a.app !== "photos") s.phonePic = null; return; }
  if (a.k === "tab") { s.phoneApp = a.t === "texts" ? "msgs" : a.t; return; } // older buttons
  if (a.k === "to") { s.phoneTo = a.to ?? null; s.phoneApp = "write"; return; }
  if (a.k === "read") { const m = (ctx.self.mail ?? []).find((r) => r.id === a.id); if (m && !m.read) m.read = true; return; }
  if (a.k === "readnpc") { s.phoneNpc = (s.phoneNpc ?? []).map((r) => (r.id === a.id ? { ...r, read: true } : r)); s.phoneOpenNpc = a.id; s.phoneApp = "npcmsg"; return; }
  if (a.k === "send") {
    const text = String(a.text ?? "").trim().slice(0, 200), to = a.to ?? s.phoneTo;
    if (!text || !to) return;
    s.phoneSent = { text: "Sending…", at: ctx.now() };
    ctx.job("mail:send", { to, topic: "Text", text }, "onPhoneSent", { to, text });
    return;
  }
  if (a.k === "photo") {
    if (a.err) { s.phoneSent = { text: a.err.includes("guest") ? "Sign in to keep photos." : "Camera didn't take. Try again.", at: ctx.now() }; return; }
    if (typeof a.url !== "string" || !a.url.startsWith("/cdn/")) return;
    s.photos = [{ url: a.url, place: ctx.self.place, at: Date.now() }, ...(s.photos ?? [])].slice(0, 12);
    me(ctx, SHUTTER, 0.7); s.phoneSent = { text: "Saved to Photos", at: ctx.now() }; return;
  }
  if (a.k === "pic") { s.phonePic = a.i ?? null; return; }
  if (a.k === "delpic") { s.photos = (s.photos ?? []).filter((_, i) => i !== a.i); s.phonePic = null; return; }
  if (a.k === "note") { s.phoneNote = String(a.text ?? "").slice(0, 1000); s.phoneSent = { text: "Note saved", at: ctx.now() }; return; }
}
export function onPhoneSent(ctx, r, p) {
  const s = ctx.self.state;
  s.phoneSent = { text: r?.ok ? "Delivered" : `Not sent: ${r?.error?.message ?? "no signal"}`, ok: !!r?.ok, at: ctx.now() };
  if (r?.ok) s.phoneLog = [{ to: p.to, text: p.text, at: Date.now() }, ...(s.phoneLog ?? [])].slice(0, 30);
}
function where(ctx) { // the Friends app's status line (unchanged)
  const fr = ctx.self.friends ?? []; if (!fr.length || !ctx.presence) return;
  Promise.resolve(ctx.presence(fr.map((f) => f.userId))).then((rows) => {
    if (!Array.isArray(rows)) return;
    ctx.self.state.phoneWhere = Object.fromEntries(rows.map((r) => [r.userId, r.world ? (r.world === ctx.world.id ? "here" : "away") : "off"]));
  }).catch(() => {});
}
export function update(ctx) { // new texts buzz wherever you stand; keepers text when their table fills again
  const s = ctx.self.state; if (!s?.phone) return ctx.sleep(5);
  const ses = ctx.session; if (ctx.now() - (ses.phAt ?? 0) < 2000) return; ses.phAt = ctx.now();
  if (!s.phoneHello) { s.phoneHello = true; npcText(ctx, "Benny", "Phone's live. Signal's best in Lumiria and the suburbs. Down in the yellow rooms? One bar if you're lucky."); return; }
  const mail = ctx.self.mail ?? [], top = mail.find((m) => !m.read && !m.retracted);
  if (ses.phSeen === undefined) ses.phSeen = top?.id ?? "";
  else if (top && top.id !== ses.phSeen) { ses.phSeen = top.id; me(ctx, BUZZ, 0.7); s.notice = { text: `📱 ${top.from?.displayName ?? "Someone"}: ${String(top.text).slice(0, 60)}`, at: ctx.now() }; }
  const told = s.phoneTold ?? {};
  for (const [npc, st] of Object.entries(s.l132?.stocks ?? {})) { // an emptied table that's had its rest
    const empty = Object.values(st.n ?? {}).every((x) => !x);
    if (empty && ctx.now() - st.at > B.restockMin * 60000 && told[npc] !== st.at) {
      s.phoneTold = { ...told, [npc]: st.at };
      npcText(ctx, nameOf(npc), "Table's full again. Come by if you've got something worth swapping.");
      return;
    }
  }
}
