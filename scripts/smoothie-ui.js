import S from "./lib/data/smoothies.yml"
const hm = (sec) => { const m = Math.ceil(sec / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m` }
export function smoothieUi(ctx, player) {
  const s = player.state, b = s.smoothieBuff
  const chip = b ? (() => { const col = b.col || "#ff77b7", pct = Math.max(0, Math.min(100, 100 * b.left / (b.total || b.left || 1))), fx = [b.hp ? `+${b.hp} HP` : "", b.san ? `+${b.san} SAN` : "", b.food ? "fed" : ""].filter(Boolean).join(" · "), low = b.left < 600
    return `<style>@keyframes sbIn{0%{transform:translateX(-30px);opacity:0}100%{transform:none;opacity:1}}@keyframes sbSlosh{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}@keyframes sbLow{50%{opacity:.45}}</style>
<div id="sbuff-${b.k}" class="fixed pointer-events-none" style="left:24px;top:46%;width:230px;display:flex;gap:10px;align-items:center;background:#1c1610e6;border:2px solid #d4b96a;box-shadow:4px 4px 0 #0008;padding:8px 10px;color:#f4e3b5;animation:sbIn .35s ease-out">
<div style="position:relative;width:30px;height:40px;flex:none;animation:sbSlosh 2.4s ease-in-out infinite">
<div style="position:absolute;left:12px;top:-6px;width:3px;height:16px;background:#ff77b7;transform:rotate(14deg)"></div>
<div style="position:absolute;inset:4px 2px 0 2px;border:2px solid #f4e3b5;border-top:none;border-radius:0 0 7px 7px;overflow:hidden;background:#0006"><div style="position:absolute;left:0;right:0;bottom:0;height:${Math.max(8, pct)}%;background:linear-gradient(${col},${col}cc);box-shadow:inset 0 3px 0 #fff5"></div></div>
<div style="position:absolute;left:0;right:0;top:2px;height:3px;background:#f4e3b5;border-radius:2px"></div></div>
<div style="flex:1;min-width:0">
<div style="font-size:10px;letter-spacing:.14em;color:#d4b96a">SMOOTHIE</div>
<div style="font-size:15px;font-weight:700;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fffde8">${b.name}</div>
<div style="font-size:11px;opacity:.85">${fx || b.desc || ""}</div>
<div style="margin-top:4px;height:5px;background:#0008;border:1px solid #d4b96a66"><div style="height:100%;width:${pct}%;background:${col};transition:width 1s linear"></div></div>
<div style="font-size:11px;text-align:right;margin-top:2px;${low ? "color:#ff9a7a;animation:sbLow 1s steps(2) infinite" : "opacity:.8"}">${hm(b.left)} left</div>
</div></div>` })() : ""
  const c = s.sCut
  if (c) { const t = ctx.now() - c.at; if (t < 2000) return `<div class="fixed inset-0 pointer-events-none" style="box-shadow:inset 0 90px 0 #000,inset 0 -90px 0 #000"></div>`
    const id = Math.round(c.at)
    return `<style>@keyframes sp${id}{0%{transform:scale(2.4) rotate(-6deg);opacity:0}25%{transform:scale(.92) rotate(2deg);opacity:1}40%{transform:scale(1.04)}100%{transform:scale(1)}}@keyframes sg${id}{0%,100%{text-shadow:0 0 18px ${c.col}}50%{text-shadow:0 0 42px ${c.col},0 0 80px #ff77b7}}</style><div class="fixed inset-0 pointer-events-none" style="box-shadow:inset 0 90px 0 #000,inset 0 -90px 0 #000"></div><div class="fixed inset-x-0 flex justify-center pointer-events-none" style="top:30%"><div style="text-align:center;animation:sp${id} .7s ease-out both">${c.isNew ? `<div style="font-size:20px;letter-spacing:.4em;color:#ffd9a0">NEW RECIPE</div>` : ""}<div style="font-size:${c.isNew ? 72 : 52}px;color:#fff;font-weight:900;-webkit-text-stroke:3px ${c.col};animation:sg${id} 1.2s infinite">${c.name}</div><div style="font-size:18px;color:#fff;text-shadow:2px 2px #000">${c.desc} · ${hm(c.mins * 60)}</div></div></div>` }
  if (!s.smoothieOpen) return chip
  const mix = s.smix ?? [], book = s.smoothieBook ?? []
  const fruit = Object.entries(S.fruits).map(([id, f]) => `<button onclick="sendAction('smoothie',{k:'add',f:'${id}'})" class="pointer-events-auto" style="display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid #ffffff33;background:${mix.includes(id) ? '#ffffff22' : '#00000055'};color:#fff;font-size:13px"><span style="width:12px;height:12px;border-radius:6px;background:${f.color}"></span>${f.name}</button>`).join("")
  const known = Object.entries(S.combos).map(([k, c]) => book.includes(k) ? `<div style="font-size:12px;opacity:.9"><b>${c.name}</b>: ${k.split("+").map((x) => S.fruits[x].name).join(" + ")} · ${c.desc}, ${hm(c.minutes * 60)}</div>` : `<div style="font-size:12px;opacity:.4">??? (${k.split("+").length} fruits)</div>`).join("")
  return `${chip}<div data-modal class="fixed inset-0 flex items-center justify-center pointer-events-none"><div class="pointer-events-auto" style="width:420px;max-width:92vw;background:#2a1b2a;border:3px solid #ff77b7;box-shadow:6px 6px 0 #00000088;padding:16px;color:#fff;font-family:inherit">
<div style="display:flex;justify-content:space-between;align-items:baseline"><div style="font-size:22px;color:#ff9acb">Squeeze Play</div><div style="font-size:12px;opacity:.7">$${S.price} a cup · cash $${((s.cents ?? 0) / 100).toFixed(2)}</div></div>
<div style="font-size:12px;opacity:.7;margin:4px 0 10px">Pick 2 or 3. Some mixes do something.</div>
<div style="display:flex;flex-wrap:wrap;gap:6px">${fruit}</div>
<div style="margin:10px 0;font-size:14px">Cup: ${mix.length ? mix.map((x) => S.fruits[x].name).join(" + ") : "empty"}</div>
${s.smoothieMsg ? `<div style="color:#ffd9a0;font-size:13px;margin-bottom:8px">${s.smoothieMsg}</div>` : ""}
<div style="display:flex;gap:8px"><button class="pointer-events-auto" onclick="sendAction('smoothie',{k:'order'})" ${mix.length < 2 ? "disabled" : ""} style="padding:6px 14px;background:#ff77b7;color:#2a1b2a;opacity:${mix.length < 2 ? .4 : 1}">Blend it</button><button class="pointer-events-auto" onclick="sendAction('smoothie',{k:'clear'})" style="padding:6px 14px;border:1px solid #ffffff44">Dump</button><button class="pointer-events-auto" onclick="sendAction('smoothie',{k:'close'})" style="padding:6px 14px;border:1px solid #ffffff44;margin-left:auto">Leave</button></div>
<div style="margin-top:12px;border-top:1px solid #ffffff22;padding-top:8px"><div style="font-size:12px;opacity:.7;margin-bottom:4px">Recipes found ${book.length}/${Object.keys(S.combos).length}</div>${known}</div>
</div></div>`
}
