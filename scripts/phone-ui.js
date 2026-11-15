// The phone on screen: a 2006 handset bottom-right. Home screen of apps; every app sits in the same fixed screen,
// the title bar and soft keys never move (Shelly: "the buttons keep moving away from me").
import { PLACE_LABELS } from "./lib/places.js";
import { STATIONS } from "./lib/radio.js";
import { WANTS, LABEL, KEEPER } from "./lib/barter-deal.js";
import B from "./lib/data/barter.yml";
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// signal by level: Lumiria and the suburbs have towers; the deep office levels barely hear the network (Savi's picks)
const BARS = { level132: 4, level9: 4, level10: 3, level11: 4, level61: 3, level70: 3, bonus: 4, thehub: 2, main: 1, level1: 2, level4: 2, level178: 3, level169: 1, level26: 2 };
const G = { // flat glyphs, 24×24, drawn in the screen's ink
  msgs: '<path d="M3 5h18v11H9l-5 4v-4H3z"/>', friends: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6z"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 6 2 6 5h-5"/>',
  contacts: '<path d="M5 3h13v18H5z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="11.5" cy="10" r="3"/><path d="M7 18c0-3 2-4.5 4.5-4.5S16 15 16 18z"/><path d="M3 7h3M3 12h3M3 17h3" stroke="currentColor" stroke-width="2"/>',
  camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4" fill="oklch(.24 .03 150)"/><circle cx="12" cy="13" r="2.2"/>',
  photos: '<path d="M3 4h18v16H3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 18l5-6 3 4 2-2 4 4z"/><circle cx="16" cy="8" r="2"/>',
  notes: '<path d="M5 2h11l4 4v16H5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 9h9M8 13h9M8 17h6" stroke="currentColor" stroke-width="2"/>',
  torch: '<path d="M7 2h10v5l-3 4v11h-4V11L7 7z"/><path d="M10 13h4" stroke="oklch(.24 .03 150)" stroke-width="2"/>',
  radio: '<path d="M2 9h20v12H2z"/><path d="M6 9l12-6" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="15" r="3" fill="oklch(.24 .03 150)"/><path d="M14 13h5M14 17h5" stroke="oklch(.24 .03 150)" stroke-width="2"/>',
};
const ico = (k) => `<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">${G[k]}</svg>`;
const APPS = [["msgs", "Messages"], ["friends", "Friends"], ["contacts", "Contacts"], ["camera", "Camera"], ["photos", "Photos"], ["notes", "Notes"], ["torch", "Torch"], ["radio", "Radio"]];
const TITLE = { home: "Menu", msgs: "Messages", npcmsg: "Message", friends: "Friends", write: "New text", contacts: "Contacts", camera: "Camera", photos: "Photos", notes: "Notes", radio: "Radio" };
const CSS = `<style>
#phone{position:fixed;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px);bottom:24px;width:330px;height:min(560px,calc(100vh - 48px));pointer-events:auto;box-sizing:border-box;
 background:linear-gradient(oklch(.22 .01 80),oklch(.14 .01 80));border:3px solid oklch(.32 .02 80);border-radius:26px;box-shadow:6px 6px 0 oklch(.08 0 0 / .7);padding:14px 12px;display:flex;flex-direction:column;color:oklch(.92 .03 90);font-family:var(--ui-body,inherit)}
#phone .ear{height:6px;width:60px;margin:0 auto 10px;border-radius:3px;background:oklch(.08 0 0);flex:none}
#phone .scr{flex:1;min-height:0;background:oklch(.24 .03 150);border-radius:10px;border:2px solid oklch(.1 0 0);display:flex;flex-direction:column;overflow:hidden;color:oklch(.9 .1 150);box-shadow:inset 0 0 18px oklch(.1 .03 150 / .6)}
#phone .top{flex:none;height:22px;display:flex;justify-content:space-between;align-items:center;padding:0 10px;font-size:12px;background:oklch(.18 .03 150)}
#phone .sig{display:inline-flex;gap:2px;align-items:flex-end;height:12px}#phone .sig i{width:3px;background:currentColor}#phone .sig i.off{opacity:.2}
#phone .bar{flex:none;height:30px;display:flex;align-items:center;justify-content:center;font-weight:700;letter-spacing:.08em;font-size:13px;border-bottom:1px solid oklch(.5 .08 150 / .4);text-transform:uppercase}
#phone .body{flex:1;min-height:0;overflow:auto;padding:8px 10px;display:flex;flex-direction:column;gap:6px;font-size:13px}
#phone .grid{display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:84px;gap:8px;padding:6px 2px}
#phone .app{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:oklch(.28 .04 150);border:1px solid oklch(.5 .08 150 / .5);color:inherit;font-size:11px;position:relative}
#phone .app:hover,#phone .app:focus-visible{background:oklch(.36 .06 150);outline:none}
#phone .dot{position:absolute;top:4px;right:6px;min-width:16px;height:16px;border-radius:8px;background:oklch(.65 .2 30);color:#fff;font-size:10px;line-height:16px}
#phone .msg{padding:6px 8px;border:1px solid oklch(.5 .08 150 / .5);cursor:pointer;flex:none}#phone .msg.new{border-color:currentColor;font-weight:700}
#phone .from{font-size:11px;opacity:.75}#phone .mine{align-self:flex-end;background:oklch(.32 .05 150);padding:6px 8px;max-width:85%}
#phone textarea{width:100%;box-sizing:border-box;background:oklch(.18 .03 150);color:inherit;border:1px solid currentColor;padding:6px;font:inherit;resize:none;flex:none}
#phone .btn{flex:none;height:32px;padding:0 14px;background:currentColor;border:0;align-self:flex-end}#phone .btn span{color:oklch(.2 .03 150);font-weight:700}
#phone .pics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}#phone .pics img{width:100%;aspect-ratio:1;object-fit:cover;border:1px solid oklch(.5 .08 150 / .5);cursor:pointer}
#phone .big{width:100%;border:1px solid currentColor}
#phone .vf{flex:1;border:2px dashed oklch(.5 .08 150 / .6);display:flex;align-items:center;justify-content:center;text-align:center;padding:10px;opacity:.85}
#phone .keys{flex:none;height:34px;display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;padding-top:8px;font-size:12px}
#phone .keys button{height:28px;background:oklch(.28 .01 80);border:1px solid oklch(.4 .02 80);color:inherit;border-radius:6px;margin:0 3px}
#phone .status{flex:none;height:18px;font-size:11px;opacity:.8;text-align:center}
#phone .dim{opacity:.6}#phone .row{display:flex;justify-content:space-between;gap:8px}
</style>`;
const act = (o) => `sendAction('phone',${JSON.stringify(o).replace(/"/g, "'")})`;
export function phoneUi(ctx, player) {
  const s = player.state ?? {}; if (!s.phoneOpen) return "";
  const bars = BARS[player.place] ?? 2, app = TITLE[s.phoneApp] ? s.phoneApp : "home";
  const mail = (player.mail ?? []).filter((m) => !m.retracted), npc = s.phoneNpc ?? [];
  const fr = player.friends ?? [], wh = s.phoneWhere ?? {}, d = new Date(), clock = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const unread = mail.filter((m) => !m.read).length + npc.filter((m) => !m.read).length;
  const status = s.phoneSent && Date.now() - 0 && (ctx.now?.() ?? 0) - s.phoneSent.at < 6000 ? s.phoneSent.text : "";
  let body = "";
  if (app === "home") body = `<div class="grid">${APPS.map(([k, l]) => {
    const on = (k === "torch" && s.lightOn) || (k === "radio" && s.radioOn);
    const click = k === "torch" ? "sendAction('flashlight')" : act({ k: "app", app: k });
    return `<button class="app" onclick="${click}">${ico(k)}<span>${l}${on ? " · on" : ""}</span>${k === "msgs" && unread ? `<span class="dot">${unread}</span>` : ""}</button>`; }).join("")}</div>`;
  if (app === "msgs") { const rows = [...mail.map((m) => ({ id: m.id, who: m.from?.displayName, text: m.text, at: m.at, read: m.read, p: true, uid: m.from?.userId })), ...npc.map((m) => ({ ...m, who: m.from }))].sort((a, b) => b.at - a.at).slice(0, 30);
    body = rows.length ? rows.map((m) => `<div class="msg ${m.read ? "" : "new"}" onclick="${m.p ? `${act({ k: "read", id: m.id })};${act({ k: "to", to: m.uid })}` : act({ k: "readnpc", id: m.id })}"><div class="from">${esc(m.who)} · ${new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>${esc(String(m.text).slice(0, 90))}</div>`).join("")
      : `<div class="dim">No texts yet. Text a friend from Friends, on any level.</div>`; }
  if (app === "npcmsg") { const m = npc.find((r) => r.id === s.phoneOpenNpc); body = m ? `<div class="from">${esc(m.from)} · ${new Date(m.at).toLocaleString([], { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}</div><div>${esc(m.text)}</div>` : `<div class="dim">Gone.</div>`; }
  if (app === "friends") body = fr.length ? fr.map((f) => `<div class="msg" onclick="${act({ k: "to", to: f.userId })}"><b>${esc(f.displayName)}</b><div class="from">${wh[f.userId] === "here" ? "in the Backrooms now" : wh[f.userId] === "away" ? "online elsewhere" : wh[f.userId] === "off" ? "offline · text waits for them" : "…"}</div></div>`).join("")
    : `<div class="dim">No friends yet. Add someone from their name card and they show up here.</div>`;
  if (app === "write") { const to = fr.find((f) => f.userId === s.phoneTo) ?? mail.find((m) => m.from?.userId === s.phoneTo)?.from, log = (s.phoneLog ?? []).filter((l) => l.to === s.phoneTo).slice(0, 4).reverse();
    body = s.phoneTo ? `<div class="from">To: <b>${esc(to?.displayName ?? "contact")}</b></div><div style="flex:1;overflow:auto;display:flex;flex-direction:column;gap:6px">${log.map((l) => `<div class="mine">${esc(l.text)}</div>`).join("")}</div>
      <textarea id="ph-text" rows="4" maxlength="200" placeholder="Text… (200)" onkeydown="event.stopPropagation()"></textarea>
      <button class="btn" onclick="const e=document.getElementById('ph-text');if(e.value.trim()){sendAction('phone',{k:'send',text:e.value,to:'${esc(s.phoneTo)}'});e.value=''}"><span>Send</span></button>` : `<div class="dim">Pick someone in Friends first.</div>`; }
  if (app === "contacts") { const met = Object.entries(s.l132?.stocks ?? {});
    body = met.length ? met.map(([id, st]) => { const cat = KEEPER[id], empty = Object.values(st.n ?? {}).every((x) => !x), left = Math.max(0, Math.ceil((st.at + B.restockMin * 60000 - (ctx.now?.() ?? 0)) / 60000));
      const nm = id.replace(/^l132-/, ""); return `<div class="msg" style="cursor:default"><div class="row"><b>${esc(nm.charAt(0).toUpperCase() + nm.slice(1))}</b><span class="from">Lumiria</span></div><div class="from">Trades ${esc(LABEL[cat] ?? "goods")}s · wants ${esc(LABEL[WANTS[cat]] ?? "?")}s</div><div class="from">${empty ? (left ? `Table empty · full again in ~${left} min` : "Table's full again") : "Has stock now"}</div></div>`; }).join("")
      : `<div class="dim">Trade with a Lumiria keeper and they'll be in here.</div>`; }
  if (app === "camera") body = `<div class="vf">Point your view, then press Snap. The photo is just the world, no HUD.</div>
    <button class="btn" style="align-self:center;width:120px" onclick="(async()=>{try{const b=await window.spawn.view.captureFrame({type:'image/jpeg',quality:.85,maxSize:1024});const r=await window.spawn.assets.upload({blob:b,name:'phone-photo.jpg'});sendAction('phone',{k:'photo',url:r.url})}catch(e){sendAction('phone',{k:'photo',err:String(e&&(e.code||e.message)||e)})}})()"><span>Snap</span></button>`;
  if (app === "photos") { const ph = s.photos ?? [], i = s.phonePic;
    body = i != null && ph[i] ? `<img class="big" src="${esc(ph[i].url)}"><div class="from">${esc(PLACE_LABELS?.[ph[i].place] ?? ph[i].place)} · ${new Date(ph[i].at).toLocaleDateString()}</div><div class="row"><button class="btn" onclick="${act({ k: "pic", i: null })}"><span>All photos</span></button><button class="btn" onclick="${act({ k: "delpic", i })}"><span>Delete</span></button></div>`
      : ph.length ? `<div class="pics">${ph.map((p, j) => `<img src="${esc(p.url)}" onclick="${act({ k: "pic", i: j })}">`).join("")}</div><div class="from">${ph.length}/12</div>` : `<div class="dim">No photos. Camera's on the home screen.</div>`; }
  if (app === "notes") body = `<textarea id="ph-note" style="flex:1;min-height:200px" maxlength="1000" placeholder="Door codes, routes, who owes you…" onkeydown="event.stopPropagation()">${esc(s.phoneNote ?? "")}</textarea>
    <button class="btn" onclick="sendAction('phone',{k:'note',text:document.getElementById('ph-note').value})"><span>Save</span></button>`;
  if (app === "radio") body = STATIONS.map((st) => { const on = s.radioOn && (s.radioSt | 0) === st.key;
    return `<div class="msg ${on ? "new" : ""}" onclick="sendAction('radio',{k:'tune',st:${st.key}})"><div class="row"><b>${esc(st.name)}</b><span class="from">${esc(st.freq)}</span></div><div class="from">${on ? "Playing · tap to turn off" : "Tap to tune in"}</div></div>`; }).join("");
  const back = app === "home" ? "" : app === "write" ? act({ k: "app", app: "friends" }) : app === "npcmsg" ? act({ k: "app", app: "msgs" }) : act({ k: "app", app: "home" });
  return `${CSS}<div id="phone" data-modal tabindex="0" onkeydown="if(event.key==='Escape'){event.preventDefault();sendAction('phone')}">
  <div class="ear"></div>
  <div class="scr"><div class="top"><span class="sig">${[1, 2, 3, 4].map((i) => `<i class="${i <= bars ? "" : "off"}" style="height:${i * 3}px"></i>`).join("")}</span><span>${esc(PLACE_LABELS?.[player.place] ?? "")}</span><span>${clock}</span></div>
  <div class="bar">${TITLE[app]}</div>
  <div class="body">${body}</div><div class="status">${esc(status)}</div></div>
  <div class="keys"><button ${back ? `onclick="${back}"` : "disabled style='opacity:.35'"}>Back</button><button onclick="${act({ k: "app", app: "home" })}">Menu</button><button onclick="sendAction('phone')">Close</button></div></div>`;
}
