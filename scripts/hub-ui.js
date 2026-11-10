// The Bonus Room's counter menus and the after-death offer (scripts/hub.js answers every button).
import B from "./lib/data/bonus.yml"
import FURN from "./lib/data/furniture.yml"
import { HOMES, lastLevel, LEVEL_NAMES } from "./lib/hub.js"
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
export function hubUi(ctx, player) {
  const s = player.state ?? {}
  if (s.hubOffer && ctx.self?.place !== "bonus") return `${CSS}<div id="hubo"><div>You're back on your feet.</div><div style="font-size:12px;opacity:.7">The Bonus Room is open if you want a breather.</div><button onclick="${act("go")}">GO TO THE BONUS ROOM</button></div>`
  const k = s.hubShop; if (!k) return ""
  const cash = (s.cents ?? 0) / 100, can = (p) => cash >= p
  let title = "", sub = "", rows = ""
  if (k === "diner") {
    title = "Tom's Diner"; sub = "Just for fun. Nothing here leaves the mall, and nothing here fills you up out there."
    rows = Object.entries(B.food ?? {}).map(([key, f]) => `<div class="row"><div><div class="n">${f.name}</div></div><button ${can(f.price) ? "" : "disabled"} onclick="${act("food", key)}">${bd(f.price)}</button></div>`).join("")
  } else if (k === "clothes") {
    title = "Liminal Clothes"; sub = "Casual wear. Bought pieces go in your bag (I)."
    rows = (B.clothes ?? []).map(([tok, price], i) => { const p = parseCloth(tok); const name = `${p?.pat ? p.pat + " " : ""}${p?.row?.name ?? tok}`; return `<div class="row"><div style="display:flex;gap:10px;align-items:center"><span style="width:18px;height:18px;border-radius:4px;background:${p?.colour ?? "#888"};border:1px solid #fff4"></span><div class="n">${name}</div></div><button ${can(price) ? "" : "disabled"} onclick="${act("cloth", i)}">${bd(price)}</button></div>` }).join("")
  } else if (k === "furniture") {
    title = "Andrew's Furniture"; sub = "Weightless delivery: place it at home from the Furniture tab in your build menu (B)."
    const order = FURN.order ?? Object.keys(FURN.pieces ?? {})
    rows = order.map((key) => { const f = FURN.pieces[key]; if (!f) return ""; const own = s.furn?.[key] ?? 0; return `<div class="row"><div><div class="n">${f.name}${own ? ` <span class="i">· own ${own}</span>` : ""}</div><div class="i">${f.info ?? ""}</div></div><button ${can(f.price) ? "" : "disabled"} onclick="${act("furn", key)}">${bd(f.price)}</button></div>` }).join("")
  } else if (k === "station") {
    title = "Teleport Station"; sub = "Back to your own Backrooms. Solo from here on."
    const last = lastLevel(s)
    rows = (last ? `<div class="row"><div><div class="n">Last level</div><div class="i">${LEVEL_NAMES[last] ?? last} · where you left off</div></div><button onclick="${act("travel", "last")}">GO</button></div>` : "") + `<div class="row"><div><div class="n">Level 0</div><div class="i">The Lobby</div></div><button onclick="${act("travel", "level0")}">GO</button></div>` + (player?.isEditor ? `<div class="row"><div><div class="n">Test Range</div><div class="i">Every weapon, consumable, physics, crafting · builders only</div></div><button onclick="${act("travel", "testlab")}">GO</button></div>` : "") +
      HOMES.map((h) => `<div class="row"><div><div class="n">${h.name}</div><div class="i">${h.has(s) ? h.where : "Locked · not unlocked yet"}</div></div><button ${h.has(s) ? "" : "disabled"} onclick="${act("travel", h.key)}">GO</button></div>`).join("")
  }
  return `${CSS}<div id="hubp" data-modal><button class="x" onclick="${act("close")}">×</button><h2>${title}</h2><div class="sub">${sub}</div>${k !== "station" ? `<div class="cash">Backdollars: ${bd(cash)}</div>` : ""}${rows}</div>`
}
