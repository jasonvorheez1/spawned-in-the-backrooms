// Curated studio compatibility layers, not an installed-mod inventory. Registry reads happen at boot/refresh.
const DATA = require("lib/data/supported-mods.yml");
const COMPAT = DATA.filter(row => typeof row.compat === "string" && row.compat.startsWith("lib/"));
const IDS = COMPAT.map(row => row.id);
export function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
export function older(version, latest) {
  const a = String(version).split("."), b = String(latest).split(".");
  if (!/^\d+\.\d+\.\d+$/.test(String(version))) return false;
  for (let i = 0; i < 3; i++) { if (+a[i] < +b[i]) return true; if (+a[i] > +b[i]) return false; }
  return false;
}
export function rows(registry) {
  return COMPAT.map(row => {
    const v = registry && registry[row.id];
    const version = typeof v === "string" ? v : String((v && v.version) || "");
    return Object.assign({}, row, { version, status: !version ? "missing" : older(version, row.knownLatest) ? "update available" : "installed" });
  });
}
export function bar(ui) {
  // Filter old open-seat mirrors too; a removed row must not linger until Refresh.
  const list = Array.isArray(ui.supportedMods) ? ui.supportedMods.filter(row => IDS.includes(row.id)) : null;
  return `<style>
    #sb-mods { flex:0 0 auto; padding:6px 10px; border-top:1px solid var(--line); background:var(--sb-panel); }
    #sb-mods .mods-head { display:flex; align-items:center; gap:8px; color:var(--ink-dim); font-size:calc(10px * var(--sb-fs,1)); }
    #sb-mods button { font:inherit; color:inherit; cursor:pointer; background:var(--sb-field); border:1px solid var(--line); border-radius:3px; }
    #sb-mods button:hover { border-color:var(--accent); }
    #sb-mods .mods-refresh { margin-left:auto; min-width:32px; min-height:28px; }
    #sb-mods .mods-scroll { display:flex; gap:6px; overflow-x:auto; padding:4px 0; scrollbar-width:thin; }
    #sb-mods .mod-chip { flex:0 0 auto; display:flex; align-items:center; gap:6px; min-height:38px; padding:4px 8px; font-size:calc(11px * var(--sb-fs,1)); }
    #sb-mods .mod-dot { width:6px; height:6px; border-radius:50%; background:var(--ink-dim); }
    #sb-mods .installed .mod-dot { background:var(--sb-ok); }
    #sb-mods .update .mod-dot { background:var(--accent); }
    #sb-mods small { display:block; font-size:9px; color:var(--ink-dim); }
  </style><div id="sb-mods"><div class="mods-head">SUPPORTED MODS<button class="mods-refresh" aria-label="Refresh supported mods" title="Refresh installed versions" onclick="sendAction('modsRefresh', {})">↻</button></div><div class="mods-scroll" aria-label="Supported mod installation status">${!Array.isArray(list) ? '<span>checking installed mods…</span>' : list.map(r => `<button class="mod-chip ${r.status === 'installed' ? 'installed' : r.status === 'update available' ? 'update' : 'missing'}" title="${esc(r.title + ': ' + r.status + (r.version ? ' · ' + r.version : '') + '. ' + r.role + (r.status === 'update available' ? ' Known update: ' + r.knownLatest : ''))}" onclick="sendAction('docsOpen', {topic:'general-info'})"><span class="mod-dot"></span><span>${esc(r.label)}<small>${esc(r.status === 'installed' ? r.version : r.status)}</small></span></button>`).join('')}</div></div>`;
}
module.exports = { rows, older, bar };
