// Transform tab: the gizmo's settings. Buttons reach god.js onInput.
const btn = (on, label, action, payload) => `<button onclick='sendAction("${action}", ${JSON.stringify(payload)})' class="px-2 py-1 rounded text-xs ${on ? "bg-sky-500 text-white" : "bg-white/10 text-white/80 hover:bg-white/20"}">${label}</button>`;
export default function (ctx, player) {
  const p = player?.state?.advTransform ?? { on: true, move: 0.25, rot: 15, always: false, local: false, ring: 1, surface: false, align: true, group: 0 };
  const row = (t, inner) => `<div class="flex items-center justify-between gap-2 py-1"><span class="text-xs text-white/70">${t}</span><div class="flex gap-1 flex-wrap justify-end">${inner}</div></div>`;
  return `<div class="w-full p-3 text-white space-y-2">
    ${row("gizmo", btn(p.on, "on", "advanced-transform:setEnabled", { on: true }) + btn(!p.on, "off", "advanced-transform:setEnabled", { on: false }))}
    ${row("axes", btn(!p.local, "global", "advanced-transform:setSnap", { local: false }) + btn(p.local, "local", "advanced-transform:setSnap", { local: true }))}
    ${row("ring thickness", `<input type="range" min="0.5" max="6" step="0.5" value="${p.ring ?? 1}" class="w-24 accent-sky-500" onchange='sendAction("advanced-transform:setSnap", { ring: +this.value })'><span class="text-xs tabular-nums w-8 text-right">${(p.ring ?? 1).toFixed(1)}×</span>`)}
    ${row("free move", btn(!p.surface, "flat", "advanced-transform:setSnap", { surface: false }) + btn(p.surface, "snap to surface", "advanced-transform:setSnap", { surface: true }))}
    ${row("on walls", btn(p.align !== false, "face out", "advanced-transform:setSnap", { align: true }) + btn(p.align === false, "keep turn", "advanced-transform:setSnap", { align: false }))}
    ${row("floor", btn(false, "snap to floor (End)", "advanced-transform:floor", { go: 1 }) + btn(false, "realign (Home)", "advanced-transform:realign", { go: 1 }))}
    ${row("move snap", [0.1, 0.25, 0.5, 1, 2].map((v) => btn(p.move === v, v + " m", "advanced-transform:setSnap", { move: v })).join(""))}
    ${row("turn snap", [5, 15, 45, 90].map((v) => btn(p.rot === v, v + "°", "advanced-transform:setSnap", { rot: v })).join(""))}
    ${row("snap", btn(!p.always, "hold ctrl", "advanced-transform:setSnap", { always: false }) + btn(p.always, "always", "advanced-transform:setSnap", { always: true }))}
    <div class="text-xs text-white/60 pt-2 border-t border-white/10">${p.group > 1 ? `group: ${p.group} pieces` : "no group"}</div>
    ${p.group > 1 && p.members?.length ? `<div class="max-h-64 overflow-y-auto rounded border border-white/10"><table class="w-full text-[11px] text-left"><thead class="bg-white/10 text-white/70 sticky top-0"><tr><th class="px-1.5 py-1">name</th><th class="px-1.5 py-1">kind</th><th class="px-1.5 py-1 text-right">x</th><th class="px-1.5 py-1 text-right">y</th><th class="px-1.5 py-1 text-right">z</th><th></th></tr></thead><tbody>${p.members.map((m, i) => `<tr class="${i % 2 ? "bg-white/5" : ""}"><td class="px-1.5 py-0.5 truncate max-w-[110px]" title="${m.id}">${m.id}</td><td class="px-1.5 py-0.5 text-white/60 truncate max-w-[70px]">${m.kind}</td><td class="px-1.5 py-0.5 text-right tabular-nums">${m.x}</td><td class="px-1.5 py-0.5 text-right tabular-nums">${m.y}</td><td class="px-1.5 py-0.5 text-right tabular-nums">${m.z}</td><td class="px-1 py-0.5 text-right"><button title="remove from group" onclick='sendAction("advanced-transform:ungroupOne", ${JSON.stringify({ ref: m.ref })})' class="px-1.5 rounded text-white/60 hover:text-white hover:bg-rose-500/70">×</button></td></tr>`).join("")}</tbody></table></div>` : ""}
    <div class="text-xs text-white/60">white pad = free move (alt = snap to surface) · end = snap to floor · home = realign · ctrl+click groups · del deletes · ctrl+c / ctrl+v copy-paste</div>
  </div>`;
}
