/**
 * data-ui-helpers.js — Shared rendering helpers for data management panel.
 */

export function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function trunc(str, max) {
  if (str == null) return '';
  var s = String(str);
  return s.length > max ? s.substring(0, max) + '…' : s;
}

export function fmtVal(val) {
  if (val == null) return '<span class="text-white/30">null</span>';
  if (typeof val === 'boolean') return '<span class="text-amber-400">' + val + '</span>';
  if (typeof val === 'number') return '<span class="text-cyan-400">' + val + '</span>';
  if (typeof val === 'string') return '<span class="text-emerald-400">"' + esc(trunc(val, 60)) + '"</span>';
  if (Array.isArray(val)) return '<span class="text-purple-400">[' + val.length + ' items]</span>';
  if (typeof val === 'object') return '<span class="text-purple-400">{' + Object.keys(val).length + ' keys}</span>';
  return esc(String(val));
}

var PANEL_BG = 'background:linear-gradient(180deg,rgba(10,15,25,0.97),rgba(5,8,15,0.99));box-shadow:0 8px 32px rgba(0,0,0,0.6);';
var HEADER_BG = 'background:linear-gradient(90deg,rgba(6,182,212,0.15),transparent);';
var BTN_PRIMARY = 'rounded bg-cyan-600/80 px-3 py-2 text-sm font-bold text-white hover:bg-cyan-500 transition-colors';
var BTN_SECONDARY = 'rounded bg-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/20 transition-colors';
var BTN_DANGER = 'rounded bg-red-600/60 px-3 py-2 text-sm font-bold text-white hover:bg-red-500 transition-colors';
var INPUT_CLS = 'w-full rounded bg-white/10 px-3 py-2 text-sm text-white border border-white/10 outline-none focus:border-cyan-400/50';
var DB_ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" stroke="rgba(6,182,212,0.6)" stroke-width="1.5"/><line x1="1" y1="5" x2="15" y2="5" stroke="rgba(6,182,212,0.4)" stroke-width="1"/><line x1="1" y1="9" x2="15" y2="9" stroke="rgba(6,182,212,0.4)" stroke-width="1"/></svg>';

module.exports = {
  esc: esc,
  trunc: trunc,
  fmtVal: fmtVal,
  PANEL_BG: PANEL_BG,
  HEADER_BG: HEADER_BG,
  BTN_PRIMARY: BTN_PRIMARY,
  BTN_SECONDARY: BTN_SECONDARY,
  BTN_DANGER: BTN_DANGER,
  INPUT_CLS: INPUT_CLS,
  DB_ICON: DB_ICON
};
