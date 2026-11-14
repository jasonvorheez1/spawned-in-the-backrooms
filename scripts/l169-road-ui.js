// Level 169 HUD pieces: the route board's leg panel, a read page (logbook, signs), and the black of a guided leg or the fall. All from player.state.
const CSS = `<style>#l169p{position:fixed;left:50%;top:50%;translate:-50% -50%;width:min(560px,92vw);background:#14100a;color:#ffb642;box-shadow:0 0 0 2px #ffb642,6px 6px 0 #000;padding:18px 20px;font:16px/1.4 monospace;pointer-events:auto}
#l169p h2{font-size:22px;margin:0 0 8px;letter-spacing:.06em}#l169p .leg{border-top:1px solid #7a5a22;padding:10px 0}#l169p .why{color:#ff7a5a}#l169p .ok{color:#d8c690}
#l169p button{background:#ffb642;color:#14100a;border:0;padding:8px 14px;font:700 15px monospace;margin-top:8px;cursor:pointer}#l169p button[disabled]{background:#5a4a2a;color:#14100a;cursor:default}#l169p button.x{background:none;color:#ffb642;box-shadow:0 0 0 1px #ffb642}
.l169bk{position:fixed;inset:0;background:#000;pointer-events:none;display:flex;align-items:center;justify-content:center;color:#d8c690;font:20px monospace;text-align:center}
@keyframes l169trip{0%{opacity:0}12%{opacity:1}86%{opacity:1}100%{opacity:0}}@keyframes l169fall{0%{opacity:0}15%{opacity:1}100%{opacity:1}}</style>`;
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function roadUi(ctx, player) {
  try {
    const s = player?.state; if (!s || (ctx.self?.place ?? player.place) !== "level169") return "";
    let out = "";
    if (s.l169trip) out += `<div id="l169t${Math.round(s.l169trip.at)}" class="l169bk" style="animation:l169trip 6s forwards"><div>Walking by the guide's notes.<br>${esc(s.l169trip.km)} km to ${esc(s.l169trip.name)}.</div></div>`;
    if (s.l169fall) out += `<div id="l169f${Math.round(s.l169fall.at)}" class="l169bk" style="animation:l169fall 2s forwards"></div>`;
    const b = s.l169board, r = s.l169read;
    if (b && !s.l169trip) out += `<div id="l169p" data-modal><h2>ROUTE BOARD</h2><div class="ok">Walk the leg with the guide's notes. Night only. Walking it yourself always works.</div>${(b.legs ?? []).map((q) => `<div class="leg"><b>${esc(q.name)}</b> &middot; ${q.km} km ${q.dir} &middot; ${q.hours} h<br>
<span class="ok">Costs ${q.bottles} cold bottle${q.bottles > 1 ? "s" : ""}, ${q.food} food${q.known ? " (half: you know the way)" : ""}. ${q.chill ? `Cold +${q.chill}. ` : ""}${q.sun ? `Sun +${q.sun}.` : ""}</span><br>${q.why ? `<span class="why">${esc(q.why)}</span><br>` : ""}
<button ${q.why ? "disabled" : ""} onclick="sendAction('make',{k:'l169go',to:'${q.to}'})">Walk the leg</button></div>`).join("")}${b.msg ? `<div class="why">${esc(b.msg)}</div>` : ""}<button class="x" onclick="sendAction('make',{k:'l169close'})">Close</button></div>`;
    else if (r) out += `<div id="l169p" data-modal><h2>${esc(r.title)}</h2>${(r.lines ?? []).map((l) => `<div class="leg ok">${esc(l)}</div>`).join("")}<button class="x" onclick="sendAction('make',{k:'l169close'})">Close</button></div>`;
    return out ? CSS + out : "";
  } catch (e) { return ""; }
}
