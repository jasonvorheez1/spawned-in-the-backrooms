import S from "./lib/data/smoothies.yml"
const hm = (sec) => { const m = Math.ceil(sec / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m` }
export function smoothieUi(ctx, player) {
  const s = player.state, b = s.smoothieBuff
  const chip = "" // the buff lives on HALOGEN's status panel (Shelly #269xxx: not on the HUD)
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
