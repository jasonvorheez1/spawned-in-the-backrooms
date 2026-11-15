// The phone on screen: a handset in the bottom-right, three tabs. Texts are player.mail (Spawn's letters).
import { PLACE_LABELS } from "./lib/places.js";
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// signal by level: Lumiria and the suburbs have towers; the deep office levels barely hear the network (Savi's picks)
const BARS = { level132: 4, level9: 4, level10: 3, level11: 4, level61: 3, level70: 3, bonus: 4, thehub: 2, main: 1, level1: 2, level4: 2, level178: 3, level169: 1, level26: 2 };
const CSS = `<style>
#phone{position:fixed;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px);bottom:24px;width:330px;height:560px;pointer-events:auto;
 background:oklch(.16 .01 80);border:3px solid oklch(.32 .02 80);border-radius:26px;box-shadow:6px 6px 0 oklch(.08 0 0 / .7);padding:14px 12px;display:flex;flex-direction:column;color:oklch(.92 .03 90);font-family:var(--ui-body,inherit)}
#phone .scr{flex:1;background:oklch(.24 .03 150);border-radius:10px;border:2px solid oklch(.1 0 0);display:flex;flex-direction:column;overflow:hidden;color:oklch(.9 .1 150)}
#phone .top{display:flex;justify-content:space-between;padding:6px 10px;font-size:12px;background:oklch(.18 .03 150)}
#phone .sig{display:inline-flex;gap:2px;align-items:flex-end;height:12px}#phone .sig i{width:3px;background:currentColor}#phone .sig i.off{opacity:.2}
#phone .tabs{display:flex}#phone .tabs button{flex:1;padding:6px;background:none;border:0;border-bottom:2px solid transparent;color:inherit;font-size:12px;letter-spacing:.06em}
#phone .tabs button[aria-pressed=true]{border-color:currentColor;font-weight:700}
#phone .body{flex:1;overflow:auto;padding:8px 10px;display:flex;flex-direction:column;gap:6px;font-size:13px}
#phone .msg{padding:6px 8px;border:1px solid oklch(.5 .08 150 / .5);cursor:pointer}#phone .msg.new{border-color:currentColor;font-weight:700}
#phone .from{font-size:11px;opacity:.75}#phone .mine{align-self:flex-end;background:oklch(.32 .05 150);padding:6px 8px;max-width:85%}
#phone textarea{width:100%;height:110px;background:oklch(.18 .03 150);color:inherit;border:1px solid currentColor;padding:6px;font:inherit;resize:none}
#phone .send{align-self:flex-end;padding:6px 14px;background:currentColor;border:0}#phone .send span{color:oklch(.2 .03 150);font-weight:700}
#phone .keys{display:flex;justify-content:space-between;padding:10px 6px 0;font-size:11px;opacity:.7}#phone .dim{opacity:.6}
</style>`;
export function phoneUi(ctx, player) {
  const s = player.state ?? {}; if (!s.phoneOpen) return "";
  const bars = BARS[player.place] ?? 2, tab = s.phoneTab ?? "texts", mail = (player.mail ?? []).filter((m) => !m.retracted);
  const fr = player.friends ?? [], wh = s.phoneWhere ?? {}, d = new Date(), clock = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const t = (k, l) => `<button aria-pressed="${tab === k}" onclick="sendAction('phone',{k:'tab',t:'${k}'})">${l}</button>`;
  let body = "";
  if (tab === "texts") body = mail.length ? mail.slice(0, 25).map((m) => `<div class="msg ${m.read ? "" : "new"}" onclick="sendAction('phone',{k:'read',id:'${m.id}'});sendAction('phone',{k:'to',to:'${esc(m.from?.userId)}'})"><div class="from">${esc(m.from?.displayName)} · ${new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>${esc(m.text)}</div>`).join("")
    : `<div class="dim">No texts yet. Pick a friend to text them, on any level.</div>`;
  if (tab === "friends") body = fr.length ? fr.map((f) => `<div class="msg" onclick="sendAction('phone',{k:'to',to:'${esc(f.userId)}'})"><b>${esc(f.displayName)}</b><div class="from">${wh[f.userId] === "here" ? "in the Backrooms now" : wh[f.userId] === "away" ? "online elsewhere" : wh[f.userId] === "off" ? "offline · text waits for them" : "…"}</div></div>`).join("")
    : `<div class="dim">No contacts. Add friends from their name card and they show up here.</div>`;
  if (tab === "write") { const to = fr.find((f) => f.userId === s.phoneTo), mineLog = (s.phoneLog ?? []).filter((l) => l.to === s.phoneTo).slice(0, 4).reverse();
    body = s.phoneTo ? `<div class="from">To: <b>${esc(to?.displayName ?? "contact")}</b></div>${mineLog.map((l) => `<div class="mine">${esc(l.text)}</div>`).join("")}
      <textarea id="ph-text" maxlength="200" placeholder="Text… (200)" onkeydown="event.stopPropagation()"></textarea>
      <button class="send" onclick="const e=document.getElementById('ph-text');if(e.value.trim()){sendAction('phone',{k:'send',text:e.value,to:'${esc(s.phoneTo)}'});e.value=''}"><span>Send</span></button>
      <div class="from">${esc(s.phoneSent?.text ?? "")}</div>` : `<div class="dim">Pick someone in Friends first.</div>`; }
  const unread = mail.filter((m) => !m.read).length;
  return `${CSS}<div id="phone" data-modal tabindex="0" onkeydown="if(event.key==='Escape'){event.preventDefault();sendAction('phone')}">
  <div class="scr"><div class="top"><span class="sig">${[1, 2, 3, 4].map((i) => `<i class="${i <= bars ? "" : "off"}" style="height:${i * 3}px"></i>`).join("")}</span><span>${esc(PLACE_LABELS?.[player.place] ?? "")}</span><span>${clock}</span></div>
  <div class="tabs">${t("texts", `TEXTS${unread ? ` (${unread})` : ""}`)}${t("friends", "FRIENDS")}${t("write", "WRITE")}</div>
  <div class="body">${body}</div></div>
  <div class="keys"><span>M close</span><span>works on every level</span></div></div>`;
}
