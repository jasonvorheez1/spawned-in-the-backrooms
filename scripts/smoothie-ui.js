import S from "./lib/data/smoothies.yml"
const hm = (sec) => { const m = Math.ceil(sec / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m` }
export function smoothieUi(ctx, player) {
  const s = player.state, b = s.smoothieBuff
  const chip = b ? `<div class="fixed" style="left:24px;top:46%;background:#1c1610cc;border:1px solid #d4b96a55;padding:4px 8px;font-size:12px;color:#f4e3b5">${b.name} · ${hm(b.left)}</div>` : ""
  if (!s.smoothieOpen) return chip
  const mix = s.smix ?? [], book = s.smoothieBook ?? []
  const fruit = Object.entries(S.fruits).map(([id, f]) => `<button onclick="sendAction('smoothie',{k:'add',f:'${id}'})" class="pointer-events-auto" style="display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid #ffffff33;background:${mix.includes(id) ? '#ffffff22' : '#00000055'};color:#fff;font-size:13px"><span style="width:12px;height:12px;border-radius:6px;background:${f.color}"></span>${f.name}</button>`).join("")
  const known = Object.entries(S.combos).map(([k, c]) => book.includes(k) ? `<div style="font-size:12px;opacity:.9"><b>${c.name}</b>: ${k.split("+").map((x) => S.fruits[x].name).join(" + ")} · ${c.desc}, ${hm(c.minutes * 60)}</div>` : `<div style="font-size:12px;opacity:.4">??? (${k.split("+").length} fruits)</div>`).join("")
  return `${chip}<div data-modal class="fixed inset-0 flex items-center justify-center pointer-events-none"><div class="pointer-events-auto" style="width:420px;max-width:92vw;background:#2a1b2a;border:3px solid #ff77b7;box-shadow:6px 6px 0 #00000088;padding:16px;color:#fff;font-family:inherit">
<div style="display:flex;justify-content:space-between;align-items:baseline"><div style="font-size:22px;color:#ff9acb">Squeeze Play</div><div style="font-size:12px;opacity:.7">$${S.price} a cup · cash $${(s.cash ?? 0).toFixed(2)}</div></div>
<div style="font-size:12px;opacity:.7;margin:4px 0 10px">Pick 2 or 3. Some mixes do something.</div>
<div style="display:flex;flex-wrap:wrap;gap:6px">${fruit}</div>
<div style="margin:10px 0;font-size:14px">Cup: ${mix.length ? mix.map((x) => S.fruits[x].name).join(" + ") : "empty"}</div>
${s.smoothieMsg ? `<div style="color:#ffd9a0;font-size:13px;margin-bottom:8px">${s.smoothieMsg}</div>` : ""}
<div style="display:flex;gap:8px"><button class="pointer-events-auto" onclick="sendAction('smoothie',{k:'order'})" ${mix.length < 2 ? "disabled" : ""} style="padding:6px 14px;background:#ff77b7;color:#2a1b2a;opacity:${mix.length < 2 ? .4 : 1}">Blend it</button><button class="pointer-events-auto" onclick="sendAction('smoothie',{k:'clear'})" style="padding:6px 14px;border:1px solid #ffffff44">Dump</button><button class="pointer-events-auto" onclick="sendAction('smoothie',{k:'close'})" style="padding:6px 14px;border:1px solid #ffffff44;margin-left:auto">Leave</button></div>
<div style="margin-top:12px;border-top:1px solid #ffffff22;padding-top:8px"><div style="font-size:12px;opacity:.7;margin-bottom:4px">Recipes found ${book.length}/${Object.keys(S.combos).length}</div>${known}</div>
</div></div>`
}
