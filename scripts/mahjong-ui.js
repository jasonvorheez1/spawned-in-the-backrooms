// The mahjong panel (scripts/mahjong.js): a green-baize table seen from your chair. Tiles are ivory blocks with their face.
import { NAMES } from "./lib/mahjong.js";
const CH = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
function face(t) {
  const k = t[0], n = +t.slice(1);
  if (k === "d") return `<b style="color:#2a6fb0">${n}</b><i>●</i>`;
  if (k === "b") return `<b style="color:#2e8a4a">${n}</b><i>‖</i>`;
  if (k === "c") return `<b style="color:#b02a2a">${CH[n - 1]}</b><i>萬</i>`;
  if (k === "w") return `<b style="color:#222">${"ESWN"[n - 1]}</b><i>風</i>`;
  return `<b style="color:${["#c22", "#1a7a3a", "#668"][n - 1]}">${["中", "發", "□"][n - 1]}</b>`;
}
const CSS = `<style>
@keyframes mjIn{from{opacity:0;transform:translateY(30px) scale(.96)}to{opacity:1;transform:none}}
@keyframes mjDrop{from{transform:translateY(-14px);opacity:0}to{transform:none;opacity:1}}
#mj{position:fixed;left:50%;top:50%;translate:-50% -50%;width:min(820px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 16px)));max-height:calc(100vh - 40px);overflow:auto;pointer-events:auto;background:radial-gradient(oklch(0.38 0.09 160),oklch(0.24 0.07 160));border:6px solid oklch(0.3 0.08 25);box-shadow:0 0 0 2px #c9a24a,6px 6px 0 #0008;padding:14px 16px;color:#f3e7c8;animation:mjIn .35s ease-out both;font-size:13px}
#mj h2{margin:0 0 6px;font-size:16px;letter-spacing:.2em;color:#f2c14e}
#mj .tl{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;width:36px;height:50px;margin:2px;background:linear-gradient(#fffaf0,#efe4cc);border-radius:5px;box-shadow:inset 0 -6px 0 #2e8a4a,1px 2px 0 #0006;color:#222;line-height:1;vertical-align:top}
#mj .tl b{font-size:18px}#mj .tl i{font-size:10px;font-style:normal;opacity:.7}
#mj button.tl{cursor:pointer;border:none;padding:0}#mj button.tl:hover{transform:translateY(-6px)}
#mj .tl.new{animation:mjDrop .25s ease-out both;outline:2px solid #f2c14e}
#mj .sm{transform:scale(.62);margin:-9px -6px}
#mj .row{margin:6px 0}#mj .who{opacity:.8;font-size:12px;letter-spacing:.08em}
#mj .act{background:#f2c14e;color:#2a1a08;border:none;padding:8px 16px;font-weight:800;letter-spacing:.1em;margin-right:8px;cursor:pointer}
#mj .x{float:right;background:none;border:1px solid #f3e7c888;color:inherit;padding:2px 10px;cursor:pointer}
</style>`;
export function mahjongPanel(s) {
  const m = s.mj; if (!m?.open) return "";
  const cash = `$${((s.cents ?? 0) / 100).toFixed(2)}`;
  if (!m.hand) return `${CSS}<div id="mj" data-modal><button class="x" onclick="sendAction('mj',{k:'close'})">leave ✕</button><h2>THE BEVERLY ROOM · MAHJONG</h2><div class="row">Somebody left mid-turn. The other chairs fill as you sit. Stake: $1.00 each, winner takes the pot.</div><div class="row">Your cash: ${cash}${m.msg ? ` · <b style="color:#ffb0a0">${m.msg}</b>` : ""}</div><button class="act" onclick="sendAction('mj',{k:'deal'})">SIT AND DEAL</button></div>`;
  const discs = m.disc.map((d, i) => `<div class="row"><span class="who">${i ? m.names[i - 1] : "You"} discards:</span> ${d.slice(-12).map((t) => `<span class="tl sm">${face(t)}</span>`).join("")}</div>`).join("");
  const hand = m.hand.map((t) => m.drew && !m.over ? `<button class="tl${t === m.last ? " new" : ""}" title="${NAMES[t[0]] ?? NAMES[t]}" onclick="sendAction('mj',{k:'disc',t:'${t}'})">${face(t)}</button>` : `<span class="tl">${face(t)}</span>`).join("");
  const reveal = m.reveal ? `<div class="row"><span class="who">${m.names[m.winner - 1]}'s hand:</span> ${m.reveal.map((t) => `<span class="tl sm">${face(t)}</span>`).join("")}</div>` : "";
  const acts = m.over ? `<button class="act" onclick="sendAction('mj',{k:'deal'})">DEAL AGAIN ($1)</button>` : !m.drew ? `<button class="act" onclick="sendAction('mj',{k:'draw'})">DRAW</button>` : m.msg.startsWith("That's") ? `<button class="act" onclick="sendAction('mj',{k:'win'})">MAHJONG!</button>` : "";
  return `${CSS}<div id="mj" data-modal><button class="x" onclick="sendAction('mj',{k:'close'})">leave ✕</button><h2>MAHJONG · POT $${(m.pot / 100).toFixed(2)} · WALL ${m.wall.length}</h2><div class="who">Across from you: ${m.names.join(", ")} · your cash ${cash}</div>${discs}${reveal}<div class="row" style="font-size:15px;color:#f2c14e">${m.msg}</div><div class="row">${hand}</div><div>${acts}</div></div>`;
}
