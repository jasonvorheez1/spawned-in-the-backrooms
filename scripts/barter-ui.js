// The barter table: your goods on the left, theirs on the right, the scale in the middle. Wears the wrist panels' frame.
import { mine, offerOf, askOf, LABEL, worth } from "./lib/barter-deal.js";
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const CSS = `<style>
#barter .bb{flex:1;display:grid;grid-template-columns:1fr 200px 1fr;gap:16px;padding:18px 22px;min-height:0}
#barter .col{display:flex;flex-direction:column;gap:6px;overflow:auto;min-height:0}
#barter h2{font:500 15px var(--ui-display);letter-spacing:.08em;color:var(--ui-muted);margin:0 0 4px}
#barter .row{display:flex;align-items:center;gap:8px;padding:0 10px;height:52px;flex:none;box-sizing:border-box;border:1px solid var(--ui-line);background:#ffffff06}
#barter .row.in{border-color:var(--ui-accent)}#barter .row .n{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#barter .row .v{color:var(--ui-muted);font-size:12px}
#barter .row button{width:32px;height:32px;flex:none}#barter .q{width:24px;flex:none;text-align:center;color:var(--ui-accent);font-weight:700}
#barter .want{color:var(--ui-accent);font-size:11px;letter-spacing:.06em}
#barter .mid{display:grid;grid-template-rows:64px 14px 64px 64px 40px;align-content:start;padding-top:24px;gap:12px;text-align:center;justify-items:center}
#barter .num{font:500 40px var(--ui-display);line-height:1}#barter .lbl{font-size:11px;letter-spacing:.1em;color:var(--ui-muted)}
#barter .bar{width:100%;height:10px;border:1px solid var(--ui-line);position:relative}#barter .bar i{position:absolute;inset:0 auto 0 0;background:var(--ui-accent)}
#barter .ok i{background:oklch(.78 .16 145)}#barter .say{height:64px;overflow:hidden;font-style:italic;display:flex;align-items:center;justify-content:center}
#barter .acts{display:flex;gap:8px;justify-content:center}#barter .acts button{width:88px;height:40px}
</style>`;
let SEEN = { who: null, rows: [] };
export function barterUi(ctx, player) {
  const s = player.state ?? {}, bt = s.bt; if (!bt) return "";
  const o = offerOf(bt), a = askOf(bt), ok = a > 0 && o >= a, pct = a ? Math.min(100, Math.round((o / a) * 100)) : 0;
  const live = mine(s), seen = (SEEN.who === bt.who ? SEEN : (SEEN = { who: bt.who, rows: [] })); // rows stay where they were after a Deal (a gone one reads ×0), so the buttons never jump
  for (const m of live) if (!seen.rows.some((r) => r.k === m.k)) seen.rows.push({ k: m.k, name: m.name });
  const mineRows = seen.rows.map((r) => live.find((m) => m.k === r.k) ?? { ...r, n: 0 }).map((m) => { const q = bt.give[m.k] ?? 0, want = m.k === "g:" + bt.want;
    return `<div class="row ${q ? "in" : ""}"><div class="n" title="${esc(m.name)}">${want ? "★ " : ""}${esc(m.name)} <span class="v">×${m.n} · worth ${worth(bt, m.k)}</span></div>
      <button onclick="sendAction('bt',{k:'ungive',id:'${m.k}'})">−</button><span class="q">${q}</span><button onclick="sendAction('bt',{k:'give',id:'${m.k}'})">+</button></div>`; }).join("") || `<div class="v">Nothing to trade. Food, drink, meat, almond water or Lumiria goods all count.</div>`;
  const theirRows = Object.entries(bt.stock).map(([c, n]) => { const q = bt.take[c] ?? 0;
    return `<div class="row ${q ? "in" : ""}"><div class="n">${esc(LABEL[c])} <span class="v">×${n} · asks ${Math.ceil(worth({}, "g:" + c) * bt.ask)}</span></div>
      <button onclick="sendAction('bt',{k:'untake',id:'${c}'})">−</button><span class="q">${q}</span><button onclick="sendAction('bt',{k:'take',id:'${c}'})">+</button></div>`; }).join("") || `<div class="v">Table's bare. Come back in a couple of minutes.</div>`;
  return `${CSS}<div id="barter" data-modal tabindex="0" onkeydown="if(event.key==='Escape'){event.preventDefault();sendAction('bt',{k:'leave'})}"><section class="journal-panel" aria-labelledby="bt-title">
  <header class="journal-header"><h1 id="bt-title">Barter · ${esc(bt.who)}</h1><span>no coin in Lumiria</span><button class="journal-close" onclick="sendAction('bt',{k:'leave'})">Leave <kbd>Esc</kbd></button></header>
  <div class="bb">
    <div class="col"><h2>YOUR GOODS</h2>${mineRows}</div>
    <div class="mid"><div><div class="lbl">YOU OFFER</div><div class="num">${o}</div></div>
      <div class="bar ${ok ? "ok" : ""}"><i style="width:${pct}%"></i></div>
      <div><div class="lbl">THEY ASK</div><div class="num">${a}</div></div>
      <div class="say">${esc(bt.line ?? (bt.want ? `"My shelf's missing ${LABEL[bt.want].toLowerCase()}s."` : ""))}</div>
      <div class="acts"><button ${bt.haggled ? "disabled" : ""} onclick="sendAction('bt',{k:'haggle'})">Haggle</button><button class="${ok ? "is-active" : ""}" onclick="sendAction('bt',{k:'deal'})">Deal</button></div></div>
    <div class="col"><h2>THEIR TABLE</h2>${theirRows}</div>
  </div></section></div>`;
}
