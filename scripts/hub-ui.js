// The Bonus Room's counter menus and the after-death offer (scripts/hub.js answers every button).
import B from "./lib/data/bonus.yml"
import FURN from "./lib/data/furniture.yml"
import { HOMES, lastLevel, ATLAS_ORDER } from "./lib/hub.js"
import { PLACES } from "./lib/places.js"
import { parseCloth } from "./lib/clothes.js"
const CSS = `<style>
#hubp{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,92vw);max-height:78vh;overflow:auto;pointer-events:auto;
background:linear-gradient(160deg,rgba(38,12,58,.94),rgba(14,8,34,.96));border:2px solid #ff71ce;box-shadow:0 0 24px rgba(255,113,206,.55),inset 0 0 18px rgba(1,205,254,.18);
border-radius:10px;padding:18px 20px;font-family:'Helvetica Neue',Arial,sans-serif;color:#f6eaff}
#hubp h2{margin:0 0 2px;font-size:26px;letter-spacing:.06em;color:#fff;text-shadow:0 0 10px #ff71ce,0 0 22px #b967ff}
#hubp .sub{font-size:13px;opacity:.75;margin-bottom:12px}
#hubp .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;margin:5px 0;border-radius:6px;background:rgba(255,255,255,.05);border:1px solid rgba(1,205,254,.25)}
#hubp .row .n{font-size:15px}#hubp .row .i{font-size:12px;opacity:.65}
#hubp button{background:#01cdfe;color:#140a26;border:0;border-radius:5px;padding:7px 12px;font-weight:700;cursor:pointer;min-width:84px;font-size:13px}
#hubp button:hover{background:#05ffa1}#hubp button[disabled]{background:#4a3c5c;color:#a99bb8;cursor:default}
#hubp .x{position:absolute;right:10px;top:8px;background:none;color:#f6eaff;min-width:0;font-size:20px}
#hubp .cash{font-size:13px;color:#05ffa1;margin-bottom:6px}
#hubo{position:fixed;left:50%;bottom:16vh;transform:translateX(-50%);pointer-events:auto;padding:12px 18px;border-radius:8px;background:rgba(20,10,36,.9);border:1px solid #ff71ce;color:#f6eaff;font-family:'Helvetica Neue',Arial,sans-serif;text-align:center}
#hubo button{margin-top:8px;background:#ff71ce;color:#1a0b22;border:0;border-radius:5px;padding:7px 14px;font-weight:700;cursor:pointer}
</style>`
const act = (k, v) => `sendAction('hub',${JSON.stringify(v === undefined ? { k } : { k, v }).replace(/"/g, "'")})`
const bd = (n) => `$${Number(n).toFixed(0)}`
// The Teleport Station: a departures board. Every level you have stood in is a card you can ride to; the rest are blank slots (Shelly Nov 15).
const SCSS = `<style>
#stn{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(880px,calc(100vw - 96px));max-height:84vh;display:flex;flex-direction:column;pointer-events:auto;
background:linear-gradient(165deg,rgba(30,10,52,.96),rgba(8,6,26,.97));border:2px solid #ff71ce;border-radius:12px;box-shadow:0 0 28px rgba(255,113,206,.5),inset 0 0 22px rgba(1,205,254,.16);
font-family:'Helvetica Neue',Arial,sans-serif;color:#f6eaff;overflow:hidden}
#stn .hd{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:16px 20px 12px;border-bottom:1px solid rgba(1,205,254,.3);background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 2px,transparent 2px 4px)}
#stn h2{margin:0;font-size:26px;letter-spacing:.14em;color:#fff;text-shadow:0 0 10px #ff71ce,0 0 22px #b967ff}
#stn .tag{font-size:11px;letter-spacing:.2em;color:#01cdfe;text-transform:uppercase;margin-bottom:3px}
#stn .cnt{text-align:right;font-size:12px;opacity:.8;white-space:nowrap}#stn .cnt b{font-size:22px;color:#05ffa1;font-family:monospace}
#stn .bar{height:4px;background:rgba(255,255,255,.1);border-radius:2px;margin-top:5px;width:150px;overflow:hidden}#stn .bar i{display:block;height:100%;background:linear-gradient(90deg,#01cdfe,#05ffa1)}
#stn .bd{overflow:auto;padding:12px 20px 18px}
#stn .sec{font-size:11px;letter-spacing:.22em;color:#ff9be0;text-transform:uppercase;margin:12px 0 7px}
#stn .q{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}
#stn .g{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}
#stn .c{position:relative;text-align:left;background:rgba(255,255,255,.05);border:1px solid rgba(1,205,254,.3);border-radius:8px;padding:9px 11px 9px 13px;color:#f6eaff;cursor:pointer;font:inherit;min-height:62px;display:flex;flex-direction:column;justify-content:center}
#stn .c::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:2px;background:#01cdfe}
#stn .c:hover{background:rgba(5,255,161,.14);border-color:#05ffa1}#stn .c:hover::before{background:#05ffa1}
#stn .c .no{font:700 11px monospace;letter-spacing:.12em;color:#01cdfe}
#stn .c .nm{font-size:15px;font-weight:700;line-height:1.15;margin:2px 0}
#stn .c .mt{font-size:11px;opacity:.6}
#stn .c.hot{border-color:#ff71ce;background:rgba(255,113,206,.12)}#stn .c.hot::before{background:#ff71ce}#stn .c.hot .no{color:#ff9be0}
#stn .c.off{cursor:default;opacity:.38;border-style:dashed}#stn .c.off::before{background:#6b5a80}#stn .c.off:hover{background:rgba(255,255,255,.05);border-color:rgba(1,205,254,.3)}
#stn .x{position:absolute;right:10px;top:8px;background:none;border:0;color:#f6eaff;font-size:22px;cursor:pointer;z-index:1}
</style>`
const ago = (at) => { if (!at) return ""; const d = Math.round((Date.now() - Date.parse(at + "T00:00:00Z")) / 864e5); return d <= 0 ? "first seen today" : d === 1 ? "first seen yesterday" : `first seen ${d} days ago` }
function stationUi(s, player) {
  const atlas = s.atlas ?? {}, last = lastLevel(s), seen = ATLAS_ORDER.filter((p) => atlas[p]), total = ATLAS_ORDER.length
  const card = (v, no, nm, mt, cls = "") => `<button class="c ${cls}" ${v ? `onclick="${act("travel", v)}"` : "disabled"}><span class="no">${no}</span><span class="nm">${nm}</span><span class="mt">${mt}</span></button>`
  const quick = (last ? card("last", "RESUME", PLACES[last]?.label ?? last, "right where you left off", "hot") : "") + card("level0", "LEVEL 0", "The Lobby", "the front door") +
    (player?.isEditor ? card("testlab", "BUILDERS", "Test Range", "every weapon, physics, crafting") : "") +
    HOMES.map((h) => h.has(s) ? card(h.key, "HOME", h.name, typeof h.where === "function" ? h.where(s) : h.where) : card(null, "HOME", h.name, "not unlocked yet", "off")).join("")
  const grid = ATLAS_ORDER.map((p) => { const r = atlas[p], P = PLACES[p]; return r ? card(p, P.title[0], P.title[1].replace(/\b(\w)(\w*)/g, (_, a, b) => a + b.toLowerCase()), `${ago(r.at)} · ${r.n} visit${r.n === 1 ? "" : "s"}`) : card(null, "? ? ?", "Unexplored", "walk there once to add it", "off") }).join("")
  return `${SCSS}<div id="stn" data-modal><button class="x" onclick="${act("close")}">×</button>
<div class="hd"><div><div class="tag">Bonus Line · Departures</div><h2>TELEPORT STATION</h2></div><div class="cnt"><b>${seen.length}</b> / ${total} levels explored<div class="bar"><i style="width:${Math.round(seen.length / total * 100)}%"></i></div></div></div>
<div class="bd"><div class="sec">Quick stops</div><div class="q">${quick}</div><div class="sec">Your atlas · every level you reach is saved here</div><div class="g">${grid}</div></div></div>`
}
export function hubUi(ctx, player) {
  const s = player.state ?? {}
  if (s.hubOffer && ctx.self?.place !== "bonus") return `${CSS}<div id="hubo"><div>You're back on your feet.</div><div style="font-size:12px;opacity:.7">The Bonus Room is open if you want a breather.</div><button onclick="${act("go")}">GO TO THE BONUS ROOM</button></div>`
  const k = s.hubShop; if (!k) return ""
  const cash = (s.cents ?? 0) / 100, can = (p) => cash >= p
  let title = "", sub = "", rows = ""
  if (k === "diner") {
    title = "Tom's Diner"; sub = "Just for fun. Nothing here leaves the mall, and nothing here fills you up out there."
    rows = Object.entries(B.food ?? {}).map(([key, f]) => `<div class="row"><div><div class="n">${f.name}</div></div><button ${can(f.price) ? "" : "disabled"} onclick="${act("food", key)}">FREE</button></div>`).join("")
  } else if (k === "clothes") {
    title = "Liminal Clothes"; sub = "Casual wear. Bought pieces go in your bag (I)."
    rows = (B.clothes ?? []).map(([tok, price], i) => { const p = parseCloth(tok); const name = `${p?.pat ? p.pat + " " : ""}${p?.row?.name ?? tok}`; return `<div class="row"><div style="display:flex;gap:10px;align-items:center"><span style="width:18px;height:18px;border-radius:4px;background:${p?.colour ?? "#888"};border:1px solid #fff4"></span><div class="n">${name}</div></div><button ${can(price) ? "" : "disabled"} onclick="${act("cloth", i)}">${bd(price)}</button></div>` }).join("")
  } else if (k === "furniture") {
    title = "Andrew's Furniture"; sub = "Weightless delivery: place it at home from the Furniture tab in your build menu (B)."
    const order = FURN.order ?? Object.keys(FURN.pieces ?? {})
    rows = order.map((key) => { const f = FURN.pieces[key]; if (!f) return ""; const own = s.furn?.[key] ?? 0; return `<div class="row"><div><div class="n">${f.name}${own ? ` <span class="i">· own ${own}</span>` : ""}</div><div class="i">${f.info ?? ""}</div></div><button ${can(f.price) ? "" : "disabled"} onclick="${act("furn", key)}">${bd(f.price)}</button></div>` }).join("")
  } else if (k === "station") return stationUi(s, player)
  return `${CSS}<div id="hubp" data-modal><button class="x" onclick="${act("close")}">×</button><h2>${title}</h2><div class="sub">${sub}</div>${k !== "station" ? `<div class="cash">Backdollars: ${bd(cash)}</div>` : ""}${rows}</div>`
}
