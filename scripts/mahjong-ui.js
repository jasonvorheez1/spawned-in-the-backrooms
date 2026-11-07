// The mahjong panel (scripts/mahjong.js): a green-baize table seen from your stool, the three guests around it.
// Everything that moves is drawn from timestamps in state (m.at, m.fresh.at, m.stamp.at ...), so a redraw never restarts an animation.
import { NAMES } from "./lib/mahjong.js";
import MJ from "./lib/data/mahjong.yml";
const CH = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
const GLYPH = { fox: "🦊", bear: "🐻", raccoon: "🦝", wolf: "🐺", lion: "🦁", cat: "🐱", tiger: "🐯", hamster: "🐹", redpanda: "🦊" };
const HUE = [45, 200, 330, 95]; // you, left, top, right
const es = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const cash = (c) => `$${(c / 100).toFixed(2)}`;
function face(t) {
  const k = t[0], n = +t.slice(1);
  if (k === "d") return `<b style="color:#2a6fb0">${n}</b><i>●</i>`;
  if (k === "b") return `<b style="color:#2e8a4a">${n}</b><i>‖</i>`;
  if (k === "c") return `<b style="color:#b02a2a">${CH[n - 1]}</b><i>萬</i>`;
  if (k === "w") return `<b style="color:#222">${"ESWN"[n - 1]}</b><i>風</i>`;
  return `<b style="color:${["#c22", "#1a7a3a", "#668"][n - 1]}">${["中", "發", "□"][n - 1]}</b>`;
}
const tile = (t, cls = "") => `<span class="t ${cls}" title="${es(NAMES[t[0]] ?? NAMES[t])}">${face(t)}</span>`;
const back = (cls = "") => `<span class="t bk ${cls}"></span>`;
// an animation that has already been running for (now - at) ms: a redraw picks it up where it is
const an = (name, ms, at, now, ease = "ease-out", extra = "") => (at != null && now - at < ms + 80 ? `animation:${name} ${ms}ms ${ease} both;animation-delay:-${Math.max(0, now - at)}ms;${extra}` : "");

const CSS = `<style>
@keyframes mjIn{from{opacity:0;transform:translateY(30px) scale(.96)}to{opacity:1;transform:none}}
@keyframes mjBarT{from{transform:translateY(-100%)}to{transform:none}}@keyframes mjBarB{from{transform:translateY(100%)}to{transform:none}}
@keyframes mjTitle{0%{opacity:0;letter-spacing:.9em;transform:scale(1.25)}25%{opacity:1;letter-spacing:.3em;transform:none}80%{opacity:1}100%{opacity:.0}}
@keyframes mjCard{from{opacity:0;transform:translateX(-60px) rotate(-3deg)}to{opacity:1;transform:none}}
@keyframes mjSit{0%{transform:scale(1.18);box-shadow:0 0 28px #f2c14e}100%{transform:none}}
@keyframes mjDots{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes mjFly{from{transform:translate(var(--fx),var(--fy)) scale(2.4) rotate(var(--fr));opacity:.15}70%{transform:translate(0,0) scale(1.15) rotate(0);opacity:1}to{transform:none}}
@keyframes mjDeal{from{transform:translateY(-44px) rotate(-12deg);opacity:0}to{transform:none;opacity:1}}
@keyframes mjDraw{from{transform:translateY(-34px) scale(1.25);opacity:0}to{transform:none;opacity:1}}
@keyframes mjStamp{0%{transform:translate(-50%,-50%) scale(3.4) rotate(-14deg);opacity:0}18%{transform:translate(-50%,-50%) scale(1) rotate(-6deg);opacity:1}80%{opacity:1}100%{transform:translate(-50%,-50%) scale(1.06) rotate(-6deg);opacity:0}}
@keyframes mjPop{0%{transform:translateX(-50%) scale(.4);opacity:0}20%{transform:translateX(-50%) scale(1.08);opacity:1}100%{transform:translateX(-50%) scale(1)}}
@keyframes mjSlam{0%{transform:scale(3.2) rotate(-8deg);opacity:0}45%{transform:scale(.92) rotate(2deg);opacity:1}70%{transform:scale(1.06)}100%{transform:none;opacity:1}}
@keyframes mjRing{0%,100%{opacity:.85}50%{opacity:1}}
@keyframes mjRise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes mjFlip{0%{transform:rotateY(90deg) scale(.6);opacity:0}100%{transform:none;opacity:1}}
@keyframes mjCoin{0%{transform:translate(0,-40px) rotate(0);opacity:0}10%{opacity:1}100%{transform:translate(var(--cx),var(--cy)) rotate(var(--cr));opacity:0}}
@keyframes mjDim{from{background:#0000}to{background:#000e}}
@keyframes mjBar{from{width:100%}to{width:0}}
@keyframes mjShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-6px,3px)}40%{transform:translate(5px,-4px)}60%{transform:translate(-3px,-2px)}80%{transform:translate(3px,2px)}}
#mj{position:fixed;inset:0;pointer-events:none;color:#f3e7c8;font-size:13px}
#mj *{box-sizing:border-box}
#mj .pn{pointer-events:auto;position:absolute;left:50%;top:50%;translate:-50% -50%;width:min(980px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 16px)));max-height:calc(100vh - 28px);overflow:auto;background:radial-gradient(oklch(0.38 0.09 160),oklch(0.24 0.07 160));border:6px solid oklch(0.3 0.08 25);box-shadow:0 0 0 2px #c9a24a,6px 6px 0 #0008;padding:10px 14px 12px;animation:mjIn .35s ease-out both}
#mj h2{margin:0;font-size:15px;letter-spacing:.2em;color:#f2c14e;display:inline-block}
#mj .hd{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:6px;font-size:12px}
#mj .hd .sp{flex:1}
#mj .x{background:none;border:1px solid #f3e7c888;color:inherit;padding:2px 10px;cursor:pointer;pointer-events:auto}
#mj .g{display:grid;grid-template-columns:150px 1fr 150px;grid-template-rows:auto auto;gap:6px 10px;align-items:start}
#mj .g .sc{margin:0 auto;width:150px}
#mj .sc{position:relative;background:#0003;border:1px solid #f3e7c833;border-radius:8px;padding:6px;text-align:center;min-height:92px}
#mj .sc .pt{width:44px;height:44px;margin:0 auto 2px;border-radius:50%;font-size:26px;line-height:44px;border:2px solid #0006}
#mj .sc .nm{font-weight:800;font-size:12px;line-height:1.1}#mj .sc .rl{opacity:.65;font-size:10px}
#mj .sc.turn{box-shadow:0 0 0 3px #f2c14e,0 0 18px #f2c14e;animation:mjRing 1.1s infinite}
#mj .sc .bub{position:absolute;left:50%;bottom:100%;margin-bottom:6px;z-index:6;width:max-content;max-width:210px;background:#fff8e4;color:#2a1a08;padding:5px 9px;border-radius:10px;font-size:12px;line-height:1.25;text-align:left;box-shadow:2px 3px 0 #0006;pointer-events:none}
#mj .sc .bub::after{content:'';position:absolute;left:50%;top:100%;margin-left:-6px;border:6px solid transparent;border-top-color:#fff8e4}
#mj .sc.t2 .bub{bottom:auto;top:100%;margin:6px 0 0}#mj .sc.t2 .bub::after{top:auto;bottom:100%;border-top-color:transparent;border-bottom-color:#fff8e4}
#mj .hn{display:flex;flex-wrap:wrap;justify-content:center;gap:1px;margin-top:4px}
#mj .t{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;width:36px;height:50px;margin:2px;background:linear-gradient(#fffaf0,#efe4cc);border-radius:5px;box-shadow:inset 0 -6px 0 #2e8a4a,1px 2px 0 #0006;color:#222;line-height:1;vertical-align:top;border:0;padding:0;font-family:inherit}
#mj .t b{font-size:18px}#mj .t i{font-size:10px;font-style:normal;opacity:.7}
#mj .t.s{width:24px;height:33px;margin:1px;border-radius:4px;box-shadow:inset 0 -4px 0 #2e8a4a,1px 1px 0 #0006}#mj .t.s b{font-size:12px}#mj .t.s i{font-size:7px}
#mj .t.xs{width:15px;height:21px;margin:1px;border-radius:3px;box-shadow:inset 0 -3px 0 #2e8a4a}#mj .t.xs b{font-size:9px}#mj .t.xs i{display:none}
#mj .t.bk{background:linear-gradient(#3aa064,#2a7a4a);box-shadow:inset 0 0 0 2px #1d5a38,1px 1px 0 #0006}
#mj .t.bk.xs,#mj .t.bk.s{margin:0 -3px}
#mj button.t{cursor:pointer;pointer-events:auto;transition:transform .08s}#mj button.t:hover{transform:translateY(-8px)}
#mj .t.hl{outline:2px solid #f2c14e;outline-offset:1px}
#mj .ct{display:grid;grid-template-columns:1fr 72px 1fr;grid-template-rows:auto auto auto;gap:4px;background:#0002;border-radius:10px;padding:8px;min-height:230px;position:relative;align-items:center;justify-items:center}
#mj .ct .rv{display:flex;flex-wrap:wrap;justify-content:center;align-content:center;min-height:30px}
#mj .ct .top{grid-column:1/4}#mj .ct .bot{grid-column:1/4}
#mj .ct .mid{width:72px;height:72px;border-radius:8px;background:oklch(0.3 0.08 160);border:2px solid #c9a24a66;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;letter-spacing:.1em;text-align:center}
#mj .ct .mid b{font-size:22px;color:#f2c14e;letter-spacing:0}
#mj .you{grid-column:1/4;text-align:center}
#mj .ml{display:inline-flex;margin:0 6px;padding:0 2px;background:#0003;border-radius:5px}
#mj .st{position:absolute;left:50%;top:50%;z-index:8;pointer-events:none;font-weight:900;font-size:56px;letter-spacing:.08em;white-space:nowrap;text-shadow:3px 3px 0 #000a,0 0 24px currentColor}
#mj .lg{font-size:11px;opacity:.7;min-height:16px;text-align:center;margin-top:3px}
#mj .act{background:#f2c14e;color:#2a1a08;border:none;padding:9px 18px;font-weight:800;letter-spacing:.1em;margin:4px 6px 0 0;cursor:pointer;pointer-events:auto;font-family:inherit;font-size:13px}
#mj .act.alt{background:#e8dcc0}#mj .act.no{background:#3a2a22;color:#f3e7c8}
#mj .cl{margin:6px auto 0;padding:8px 10px;background:#000a;border:2px solid #f2c14e;border-radius:8px;text-align:center;animation:mjRise .25s ease-out both}
#mj .cl .tm{height:5px;background:#f2c14e;margin-top:6px;border-radius:3px}
#mj .ms{font-size:15px;color:#f2c14e;text-align:center;margin:4px 0 2px;min-height:20px}
#mj .lb{position:absolute;left:0;right:0;height:13vh;background:#000;pointer-events:none}
#mj .intro{position:absolute;left:0;right:0;bottom:15vh;display:flex;justify-content:center;gap:14px;flex-wrap:wrap;padding:0 16px}
#mj .iv{pointer-events:auto;width:190px;background:#000c;border:1px solid #f3e7c844;border-radius:10px;padding:8px 10px;display:flex;gap:10px;align-items:center}
#mj .iv .pt{width:44px;height:44px;border-radius:50%;font-size:26px;line-height:44px;text-align:center;flex:none}
#mj .res{pointer-events:auto;position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;overflow:hidden;background:#000e}
#mj .res .big{font-size:clamp(34px,7vw,76px);font-weight:900;letter-spacing:.1em;text-shadow:4px 4px 0 #000,0 0 30px currentColor}
#mj .res .yk{font-size:16px;display:flex;gap:18px;min-width:260px;justify-content:space-between}
#mj .res .yk b{color:#f2c14e}
#mj .coin{position:absolute;top:34%;font-size:26px;pointer-events:none}
</style>`;

const seatCard = (m, q, now) => {
  const st = m.seats[q], turn = m.phase === "turn" && m.turn === q, said = m.sayB?.[q], bub = said && now - said.at < 2600 + said.t.length * 45;
  const cls = q === 1 ? "t1" : q === 2 ? "t2" : "t3";
  const hand = (st.hand ?? []).map((_, i) => back("s")).join("");
  const mel = (st.melds ?? []).map((ml) => `<span class="ml">${ml.tiles.map((t) => tile(t, "xs")).join("")}</span>`).join("");
  const drawn = m.drawn?.q === q && now - m.drawn.at < 700;
  return `<div class="sc ${cls}${turn ? " turn" : ""}" style="${st.here === false ? "opacity:.4" : ""}"><div class="pt" style="background:oklch(0.7 0.12 ${HUE[q]})">${GLYPH[st.sp] ?? "🎴"}</div><div class="nm">${es(st.name)}</div><div class="rl">${es(st.role ?? "")}</div>
    <div class="hn" style="${drawn ? an("mjDraw", 380, m.drawn.at, now) : ""}">${hand}</div>${mel ? `<div style="margin-top:3px">${mel}</div>` : ""}${bub ? `<div class="bub" style="${an("mjPop", 280, said.at, now)}">${es(said.t)}</div>` : ""}</div>`;
};
const river = (m, q, now, cls = "") => (m.seats[q].disc ?? []).slice(-16).map((t, i, a) => {
  const fresh = m.fresh && m.fresh.q === q && i === a.length - 1 && m.last && !m.last.claimed && now - m.fresh.at < 520;
  const f = { 0: ["0px", "190px", "6deg"], 1: ["-260px", "0px", "-30deg"], 2: ["0px", "-170px", "-8deg"], 3: ["260px", "0px", "30deg"] }[q];
  return fresh ? `<span style="display:inline-block;--fx:${f[0]};--fy:${f[1]};--fr:${f[2]};${an("mjFly", 520, m.fresh.at, now, "cubic-bezier(.2,.8,.3,1)")}">${tile(t, "xs hl")}</span>` : tile(t, "xs");
}).join("");

function intro(m, now) {
  const t = now - m.at;
  const cards = m.seats.slice(1).map((st, i) => `<div class="iv" style="${an("mjCard", 500, m.at + 1200 + i * 650, now)}${st.here ? an("mjSit", 600, st.at, now) : ""}opacity:${t > 1200 + i * 650 ? 1 : 0}">
      <div class="pt" style="background:oklch(0.7 0.12 ${HUE[i + 1]})">${GLYPH[st.sp] ?? "🎴"}</div><div><div style="font-weight:800;font-size:13px">${es(st.name)}</div><div style="opacity:.65;font-size:11px">${es(st.role)}</div>
      <div style="font-size:11px;margin-top:2px;color:${st.here ? "#9fcf8a" : "#f2c14e"}">${st.here ? "takes a seat ✓" : `<span style="animation:mjDots 1s infinite">walking in...</span>`}</div></div></div>`).join("");
  return `<div class="lb" style="top:0;${an("mjBarT", 800, m.at, now)}"></div><div class="lb" style="bottom:0;${an("mjBarB", 800, m.at, now)}"></div>
    <div style="position:absolute;left:0;right:0;top:15vh;text-align:center;pointer-events:none;color:#f2c14e;font-size:clamp(22px,4vw,44px);font-weight:900;${an("mjTitle", 5200, m.at + 500, now, "ease-out")}opacity:0">THE BEVERLY ROOM<div style="font-size:.38em;letter-spacing:.4em;color:#f3e7c8;margin-top:6px">MAHJONG · ${cash(MJ.stake)} A HAND</div></div>
    <div class="intro">${cards}</div>
    <button class="x" style="position:absolute;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 16px);top:calc(13vh + 10px)" onclick="sendAction('mj',{k:'close'})">leave ✕</button>`;
}
function result(m, now) {
  const r = m.res, t = now - m.at, me = r.winner === 0;
  if (r.broke || r.draw) return `<div class="res"><div class="big" style="color:#f3e7c8">${r.broke ? "SHORT" : "DRAW"}</div><div class="ms">${es(m.msg)}</div><div>${r.draw ? `<button class="act" onclick="sendAction('mj',{k:'again'})">DEAL AGAIN (${cash(MJ.stake)})</button>` : ""}<button class="act no" onclick="sendAction('mj',{k:'close'})">STAND UP</button></div></div>`;
  const W = m.seats[r.winner], hand = r.hand, tiles = r.melds.map((ml) => `<span class="ml">${ml.tiles.map((x) => tile(x, "s")).join("")}</span>`).join("") + hand.map((x, i) => `<span style="display:inline-block;${an("mjFlip", 260, m.at + 1400 + i * 90, now)}opacity:${t > 1400 + i * 90 ? 1 : 0}">${tile(x, "s" + (x === r.tile ? " hl" : ""))}</span>`).join("");
  const y0 = 1400 + hand.length * 90 + 300, lines = r.names.map(([n, f], i) => `<div class="yk" style="opacity:${t > y0 + i * 380 ? 1 : 0};${an("mjRise", 300, m.at + y0 + i * 380, now)}"><span>${es(n)}</span><b>+${f}</b></div>`).join("");
  const tot = y0 + r.names.length * 380 + 300, k = Math.max(0, Math.min(1, (t - tot) / 1100)), amt = Math.round((r.amount * k) / 5) * 5;
  const coins = me && t > 200 ? Array.from({ length: 26 }, (_, i) => { const a = (i * 137.5) % 360, cx = Math.round(Math.sin(a) * 340), cy = 260 + ((i * 53) % 260); return `<span class="coin" style="left:${20 + ((i * 37) % 60)}%;--cx:${cx}px;--cy:${cy}px;--cr:${(i * 97) % 720}deg;${an("mjCoin", 2200 + (i % 5) * 300, m.at + 300 + i * 70, now, "ease-in")}opacity:0">${i % 3 ? "🪙" : "💵"}</span>`; }).join("") : "";
  return `<div class="res" style="${an("mjDim", 500, m.at, now)}">${coins}
    <div class="big" style="color:${me ? "#f2c14e" : "#ff9a8a"};${an("mjSlam", 800, m.at + 200, now)}opacity:${t > 200 ? 1 : 0}">${me ? (r.self ? "TSUMO!" : "RON!") : es(W.name.split(" ")[0]) + " WINS"}</div>
    <div style="display:flex;align-items:center;gap:10px"><span style="font-size:30px">${me ? "🙂" : GLYPH[W.sp] ?? "🎴"}</span><span style="opacity:.8">${me ? (r.self ? "self-drawn" : `off ${es(m.seats[r.from].name)}'s discard`) : r.self ? "drew it themselves" : r.from === 0 ? "off your discard" : `off ${es(m.seats[r.from].name)}'s discard`}</span></div>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;max-width:740px;opacity:${t > 1200 ? 1 : 0}">${tiles}</div>
    <div style="min-height:${24 + r.names.length * 24}px">${lines}</div>
    <div style="font-size:22px;opacity:${t > tot ? 1 : 0};${an("mjRise", 300, m.at + tot, now)}color:${me ? "#9fcf8a" : "#f3e7c8"}"><b>${r.fan} fan</b> · ${me ? "+" : ""}${cash(me ? amt : r.amount)}</div>
    <div style="opacity:${t > tot + 1300 ? 1 : 0}"><button class="act" onclick="sendAction('mj',{k:'again'})">ANOTHER HAND (${cash(MJ.stake)})</button><button class="act no" onclick="sendAction('mj',{k:'close'})">STAND UP</button></div></div>`;
}

export function mahjongPanel(s, now = 0) {
  const m = s.mj; if (!m?.open) return "";
  const money = cash(s.cents ?? 0);
  if (!m.seats) return `${CSS}<div id="mj" data-modal><div class="pn" style="width:min(460px,92vw)"><div class="hd"><h2>THE BEVERLY ROOM · MAHJONG</h2><span class="sp"></span><button class="x" onclick="sendAction('mj',{k:'close'})">✕</button></div><div class="ms" style="color:#ffb0a0">${es(m.msg ?? "Taking a seat...")}</div><div class="lg">Your cash: ${money}</div></div></div>`;
  if (m.phase === "intro") return `${CSS}<div id="mj" data-modal>${intro(m, now)}</div>`;
  const me = m.seats[0], myTurn = m.phase === "turn" && m.turn === 0, canDisc = myTurn && m.mustDisc;
  const hand = (me.hand ?? []).map((t, i) => {
    const dealt = m.phase === "deal" ? `style="${an("mjDeal", 340, m.at + 200 + i * 95, now)}opacity:${now - m.at > 200 + i * 95 ? 1 : 0}"` : "";
    const fresh = m.drawn?.q === 0 && m.drawn.t === t && now - m.drawn.at < 480 ? ` style="${an("mjDraw", 420, m.drawn.at, now)}"` : "";
    return canDisc ? `<button class="t${m.drawn?.t === t ? " hl" : ""}"${fresh} title="Discard ${es(NAMES[t[0]] ?? NAMES[t])}" onclick="sendAction('mj',{k:'disc',t:'${t}'})">${face(t)}</button>` : `<span ${dealt}>${tile(t, m.drawn?.t === t && now - m.drawn.at < 3000 ? "hl" : "")}</span>`;
  }).join("");
  const mel = (me.melds ?? []).map((ml) => `<span class="ml">${ml.tiles.map((t) => tile(t, "s")).join("")}</span>`).join("");
  let cl = "";
  if (m.phase === "claim" && m.claim) {
    const c = m.claim, left = Math.max(0, c.until - now);
    cl = `<div class="cl"><div style="font-size:12px;margin-bottom:4px">${es(m.seats[c.from].name)} discards ${tile(c.tile, "s")}</div>${c.opts.map((o) => o.k === "ron" ? `<button class="act" onclick="sendAction('mj',{k:'claim',c:'ron'})">MAHJONG!</button>` : o.k === "pon" ? `<button class="act" onclick="sendAction('mj',{k:'claim',c:'pon'})">PON</button>` : `<button class="act alt" onclick="sendAction('mj',{k:'claim',c:'chi',tiles:'${o.tiles.join()}'})">CHI ${o.tiles.map((t) => tile(t, "xs")).join("")}</button>`).join("")}<button class="act no" onclick="sendAction('mj',{k:'claim',c:'pass'})">PASS</button><div class="tm" style="${an("mjBar", Math.max(1, c.until - c.at), c.at, now, "linear")}"></div></div>`;
  }
  const acts = canDisc && m.msg.startsWith("That's") ? `<button class="act" onclick="sendAction('mj',{k:'win'})">MAHJONG!</button>` : myTurn && !m.mustDisc ? `<button class="act" onclick="sendAction('mj',{k:'draw'})">DRAW A TILE</button>` : "";
  const st = m.stamp && now - m.stamp.at < 1500 ? `<div class="st" style="color:${["#f2c14e", "#7ad0ff", "#ff90d0", "#b8e060"][m.stamp.q]};${an("mjStamp", 1400, m.stamp.at, now)}">${m.stamp.t}</div>` : "";
  const shaking = m.stamp && now - m.stamp.at < 260 ? an("mjShake", 260, m.stamp.at, now, "linear") : "";
  const wall = m.wall?.length ?? 0;
  return `${CSS}<div id="mj" data-modal><div class="pn" style="${shaking}">
    <div class="hd"><h2>THE BEVERLY ROOM · MAHJONG</h2><span>Pot <b style="color:#f2c14e">${cash(m.pot ?? 0)}</b></span><span class="sp"></span><span>Your cash ${money}</span><button class="x" onclick="sendAction('mj',{k:'close'})">leave ✕</button></div>
    <div class="g"><div style="grid-column:2;grid-row:1">${seatCard(m, 2, now)}</div><div style="grid-column:1;grid-row:2">${seatCard(m, 1, now)}</div><div style="grid-column:3;grid-row:2">${seatCard(m, 3, now)}</div>
      <div class="ct" style="grid-column:2;grid-row:2"><div class="rv top" style="grid-row:1">${river(m, 2, now)}</div>
        <div class="rv" style="grid-row:2;grid-column:1;justify-content:flex-end">${river(m, 1, now)}</div>
        <div class="mid" style="grid-row:2;grid-column:2"><b>${wall}</b>WALL<span style="opacity:.7;margin-top:2px">${m.phase === "deal" ? "dealing" : ""}</span></div>
        <div class="rv" style="grid-row:2;grid-column:3;justify-content:flex-start">${river(m, 3, now)}</div>
        <div class="rv bot" style="grid-row:3">${river(m, 0, now)}</div>${st}</div></div>
    <div class="lg">${(m.log ?? []).slice(-2).map(es).join(" · ")}</div>
    ${cl}<div class="ms">${es(m.msg ?? "")}</div>
    <div class="you">${mel ? `<div style="margin-bottom:2px">${mel}</div>` : ""}<div>${hand}</div><div>${acts}</div></div>
    ${m.phase === "over" && m.res ? result(m, now) : ""}</div></div>`;
}
