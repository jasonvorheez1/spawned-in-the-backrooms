// the builders' emote wheel, drawn while player.state.emoteWheel is up
import EMOTES from "./lib/data/emotes.yml"
export function emoteWheel(ctx, player) {
  const st = player?.state
  if (!player?.isEditor || !st?.emoteWheel) return ""
  const n = EMOTES.length, R = 150
  const slices = EMOTES.map((r, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2, x = Math.cos(a) * R, y = Math.sin(a) * R, on = st.emote === r.id
    return `<button onclick="sendAction('emotePick',{id:'${r.id}'})" class="ew-s${on ? " ew-on" : ""}" style="left:calc(50% + ${x.toFixed(0)}px);top:calc(50% + ${y.toFixed(0)}px)">${r.clock ? `<span class="ew-clk">◷</span>` : ""}${r.label}${on ? `<small>stop</small>` : ""}</button>`
  }).join("")
  return `<style>
.ew{position:fixed;inset:0;z-index:70;background:radial-gradient(circle at center,rgba(22,20,14,.55) 0,rgba(22,20,14,.15) 260px,transparent 340px)}
.ew-ring{position:absolute;left:50%;top:50%;width:300px;height:300px;margin:-150px 0 0 -150px;border-radius:50%;border:2px solid #a8924b;box-shadow:0 0 0 1px #16140e,inset 0 0 0 1px #16140e;opacity:.6}
.ew-mid{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#d4b96a;font:400 12px/1.4 Georgia,serif;letter-spacing:.3em;text-align:center;text-shadow:1px 1px 2px #000}
.ew-s{position:absolute;transform:translate(-50%,-50%);min-width:92px;padding:9px 12px;background:#16140e;color:#d4b96a;border:2px solid #5a503d;box-shadow:3px 3px 0 #000;font:400 14px/1.1 Georgia,serif;letter-spacing:.04em;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px}
.ew-s:hover{background:#d4b96a;color:#16140e;border-color:#fffde8}
.ew-on{border-color:#fffde8;color:#fffde8}
.ew-s small{font-size:10px;letter-spacing:.2em;opacity:.7;text-transform:uppercase}
.ew-clk{font-size:16px;line-height:1}
</style><div class="ew" data-modal tabindex="0" onkeydown="if(!event.repeat&&(event.key==='Escape'||event.key==='n'||event.key==='N')){event.preventDefault();event.stopPropagation();sendAction('emote')}"><div class="ew-ring"></div><div class="ew-mid">EMOTE<br><span style="opacity:.6;font-size:10px">N to close · move to stop</span></div>${slices}</div>`
}
