/**
 * data-panel.js — Reusable rendering for the data manager panel.
 * Used by creator-data-ui.js.
 */
var h = require('lib/data-ui-helpers.js');
var _g = typeof globalThis !== 'undefined' ? globalThis : {};
var PAGE_SIZE = 25;

var TH = 'px-3 py-2.5 text-left text-xs font-medium text-white/50 uppercase tracking-wider';
var TD = 'px-3 py-2 text-sm';
var ROW_E = 'bg-white/[0.02] hover:bg-white/[0.06] transition-colors';
var ROW_O = 'hover:bg-white/[0.06] transition-colors';
var INP = 'w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white border border-white/10 outline-none focus:border-cyan-400/50';
var INPS = 'rounded bg-white/10 px-2 py-1 text-xs text-white border border-cyan-400/30 outline-none focus:border-cyan-400/60 w-full';
var BTN_P = 'rounded-lg bg-cyan-600/80 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 transition-colors';
var BTN_S = 'rounded-lg bg-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/20 transition-colors';
var BTN_D = 'rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/30 transition-colors';
var BADGE = 'inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/60';

export function renderList(cols) {
  var cards = '';
  for (var i = 0; i < cols.length; i++) {
    var c = cols[i];
    cards += '<button onclick="globalThis._dpNav(\'detail\',\'' + h.esc(c.name) + '\')" data-interactive'
      + ' class="group rounded-xl border border-white/5 bg-white/[0.02] p-5 text-left hover:bg-white/[0.06] hover:border-white/10 transition-all">'
      + '<div class="flex items-start justify-between">'
      + '<div class="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">' + h.esc(c.name) + '</div>'
      + '<div class="text-white/20 text-xl group-hover:text-white/40">\u2192</div></div>'
      + '<div class="mt-2 flex gap-3"><span class="' + BADGE + '">' + (c.count||0) + ' records</span>'
      + '<span class="' + BADGE + '">' + (c.fields||[]).length + ' fields</span></div>'
      + '</button>';
  }
  return '<div class="max-w-3xl mx-auto">'
    + '<div class="flex items-center justify-between mb-6">'
    + '<div><div class="text-xl font-bold text-white">Collections</div>'
    + '<div class="text-sm text-white/40 mt-1">' + cols.length + ' collection' + (cols.length!==1?'s':'') + '</div></div>'
    + '<button onclick="globalThis._dpNav(\'import\')" data-interactive class="' + BTN_P + '">+ Import from URL</button>'
    + '</div>'
    + (cols.length===0 ? '<div class="py-16 text-center text-lg text-white/30">No collections yet</div>' : '<div class="grid gap-3">' + cards + '</div>')
    + '</div>';
}

export function renderImport(p) {
  var err = p.importError ? '<div class="text-sm text-red-400 mt-2">' + h.esc(p.importError) + '</div>' : '';
  var prog = p.importProgress ? '<div class="text-sm text-cyan-400 mt-2">' + h.esc(p.importProgress) + '</div>' : '';
  var ft = p.importType || 'json';
  var jsonSel = ft === 'json' ? 'bg-cyan-600/80 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20';
  var mdSel = ft === 'markdown' ? 'bg-cyan-600/80 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20';
  var urlLabel = ft === 'markdown' ? 'Markdown URL' : 'JSON URL';
  var urlPlaceholder = ft === 'markdown' ? 'https://...file.md' : 'https://...file.json';
  return '<div class="max-w-lg mx-auto">'
    + '<button onclick="globalThis._dpNav(\'list\')" data-interactive class="text-sm text-cyan-400 mb-4">\u2190 Back</button>'
    + '<div class="text-xl font-bold text-white mb-6">Import from URL</div>'
    + '<div class="space-y-4">'
    + '<div><label class="text-sm text-white/50 mb-2 block">File type</label>'
    + '<div class="flex gap-2">'
    + '<button onclick="globalThis._dpSetIT(\'json\')" data-interactive class="rounded-lg px-4 py-2 text-sm font-bold transition-colors ' + jsonSel + '">JSON</button>'
    + '<button onclick="globalThis._dpSetIT(\'markdown\')" data-interactive class="rounded-lg px-4 py-2 text-sm font-bold transition-colors ' + mdSel + '">Markdown</button>'
    + '</div></div>'
    + '<div><label class="text-sm text-white/50 mb-1 block">Collection name</label>'
    + '<input type="text" value="' + h.esc(p.importName) + '" oninput="globalThis._dpSetIN(this.value)" placeholder="e.g. items, enemies" class="' + INP + '" data-interactive /></div>'
    + '<div><label class="text-sm text-white/50 mb-1 block">' + urlLabel + '</label>'
    + '<input type="text" value="' + h.esc(p.importUrl) + '" oninput="globalThis._dpSetIU(this.value)" placeholder="' + urlPlaceholder + '" class="' + INP + '" data-interactive /></div>'
    + err + prog
    + '<div class="flex gap-3 pt-2">'
    + '<button onclick="globalThis._dpDoImp()" data-interactive class="' + BTN_P + '">' + (p.importing ? 'Importing\u2026' : 'Import') + '</button>'
    + '<button onclick="globalThis._dpNav(\'list\')" data-interactive class="' + BTN_S + '">Cancel</button>'
    + '</div></div></div>';
}

export function renderDetail(p, cols, pd) {
  var col = null;
  for (var i = 0; i < cols.length; i++) { if (cols[i].name === p.col) { col = cols[i]; break; } }
  if (!col) { p.view = 'list'; p.col = null; p.lastReq = ''; return renderList(cols); }
  var fields = col.fields || [];

  if (!pd || pd.collection !== p.col) {
    return '<div class="max-w-5xl mx-auto">'
      + '<button onclick="globalThis._dpNav(\'list\')" data-interactive class="text-sm text-cyan-400 mb-4">\u2190 Collections</button>'
      + '<div class="text-xl font-bold text-white">' + h.esc(p.col) + '</div>'
      + '<div class="py-8 text-center text-white/30">Loading...</div></div>';
  }

  var recs = pd.records || [];
  var total = pd.totalRecords || 0;
  var totalF = pd.totalFiltered || 0;
  var pages = Math.max(1, Math.ceil(totalF / PAGE_SIZE));
  var pg = p.page;

  var out = '<div class="max-w-full">';
  out += '<div class="flex items-center justify-between mb-4">'
    + '<div class="flex items-center gap-3">'
    + '<button onclick="globalThis._dpNav(\'list\')" data-interactive class="text-sm text-cyan-400 hover:text-cyan-300">\u2190</button>'
    + '<div><div class="text-xl font-bold text-white">' + h.esc(p.col) + '</div>'
    + '<div class="text-xs text-white/40 mt-0.5">' + total + ' records \xb7 ' + fields.length + ' fields</div></div></div>'
    + '<div class="flex gap-2">'
    + '<button onclick="globalThis._dpShowAdd()" data-interactive class="' + BTN_P + '">+ Add Record</button>'
    + '<button onclick="globalThis._dpDelCol(\'' + h.esc(p.col) + '\')" data-interactive class="' + BTN_D + '">Delete</button>'
    + '</div></div>';

  out += '<div class="mb-4"><input type="text" value="' + h.esc(p.search) + '" oninput="globalThis._dpSearch(this.value)" placeholder="Search all fields..." class="' + INP + ' max-w-sm" data-interactive /></div>';

  if (recs.length > 0) {
    out += '<div class="rounded-xl border border-white/5 overflow-hidden"><div class="overflow-x-auto">'
      + '<table class="w-full"><thead><tr class="bg-white/[0.03] border-b border-white/10">'
      + '<th class="' + TH + ' w-12">#</th>';
    for (var fi = 0; fi < fields.length; fi++) out += '<th class="' + TH + '">' + h.esc(fields[fi]) + '</th>';
    out += '<th class="' + TH + ' w-16"></th></tr></thead><tbody>';

    for (var ri = 0; ri < recs.length; ri++) {
      var pr = recs[ri];
      var oi = pr.idx;
      var isInline = (p.inlineIdx === oi);
      out += '<tr class="' + (ri%2===0?ROW_E:ROW_O) + ' border-b border-white/5">';
      out += '<td class="' + TD + ' text-white/30 font-mono text-xs">' + oi + '</td>';
      for (var ci = 0; ci < fields.length; ci++) {
        var fld = fields[ci];
        var val = pr.rec[fld];
        if (isInline && p.inlineField === fld) {
          out += '<td class="' + TD + '"><div class="flex gap-1 items-center">'
            + '<input type="text" value="' + h.esc(p.inlineValue) + '" oninput="globalThis._dpInlineVal(this.value)" class="' + INPS + '" data-interactive />'
            + '<button onclick="globalThis._dpInlineSave()" data-interactive class="text-xs text-emerald-400 hover:text-emerald-300 shrink-0 px-1">\u2713</button>'
            + '<button onclick="globalThis._dpInlineCancel()" data-interactive class="text-xs text-white/40 hover:text-white shrink-0 px-1">\xd7</button>'
            + '</div></td>';
        } else {
          out += '<td class="' + TD + ' max-w-[200px] truncate cursor-pointer hover:bg-white/5" '
            + 'onclick="globalThis._dpInlineStart(' + oi + ',\'' + h.esc(fld) + '\',' + (typeof val === 'string' ? '\'' + h.esc(val).replace(/'/g, "\\'") + '\'' : h.esc(JSON.stringify(val))) + ')" data-interactive>'
            + h.fmtVal(val) + '</td>';
        }
      }
      out += '<td class="' + TD + '"><button onclick="globalThis._dpVR(' + oi + ')" data-interactive class="text-xs text-cyan-400 hover:text-cyan-300">View</button></td>';
      out += '</tr>';
    }
    out += '</tbody></table></div></div>';
  } else {
    out += '<div class="py-8 text-center text-white/30">No records found</div>';
  }

  // Pagination
  if (pages > 1) {
    out += '<div class="flex items-center justify-center gap-2 mt-4">';
    if (pg > 0) out += '<button onclick="globalThis._dpPage(' + (pg-1) + ')" data-interactive class="' + BTN_S + ' text-xs">\u2190 Prev</button>';
    out += '<span class="text-sm text-white/50">Page ' + (pg+1) + '/' + pages + '</span>';
    if (pg < pages - 1) out += '<button onclick="globalThis._dpPage(' + (pg+1) + ')" data-interactive class="' + BTN_S + ' text-xs">Next \u2192</button>';
    out += '</div>';
  }

  out += '</div>';
  return out;
}

export function renderRecord(p, pd) {
  if (!pd || !pd.records) return '<div class="text-white/30">No data</div>';
  var rec = null;
  for (var i = 0; i < pd.records.length; i++) {
    if (pd.records[i].idx === p.recordIdx) { rec = pd.records[i].rec; break; }
  }
  if (!rec) return '<div class="text-white/30">Record not found</div>';

  var out = '<div class="max-w-2xl mx-auto">'
    + '<button onclick="globalThis._dpNav(\'detail\')" data-interactive class="text-sm text-cyan-400 mb-4">\u2190 ' + h.esc(p.col) + '</button>'
    + '<div class="text-xl font-bold text-white mb-4">Record #' + p.recordIdx + '</div>'
    + '<div class="space-y-3">';
  var keys = Object.keys(rec);
  for (var ki = 0; ki < keys.length; ki++) {
    var k = keys[ki];
    var v = rec[k];
    out += '<div class="rounded-lg border border-white/5 bg-white/[0.02] p-3">'
      + '<div class="flex items-start justify-between">'
      + '<div class="text-xs text-white/40 mb-1">' + h.esc(k) + '</div>'
      + '<button onclick="globalThis._dpSetStore(' + h.esc(JSON.stringify(v)) + ');globalThis._dpSE(' + p.recordIdx + ',\'' + h.esc(k) + '\')" data-interactive class="text-xs text-cyan-400 hover:text-cyan-300">Edit</button>'
      + '</div>'
      + '<div class="text-sm text-white break-all">' + h.fmtVal(v) + '</div>'
      + '</div>';
  }
  out += '</div>'
    + '<div class="flex gap-3 mt-4">'
    + '<button onclick="globalThis._dpDR(' + p.recordIdx + ')" data-interactive class="' + BTN_D + '">Delete Record</button>'
    + '</div></div>';
  return out;
}

export function renderEdit(p) {
  return '<div class="max-w-2xl mx-auto">'
    + '<button onclick="globalThis._dpNav(\'record\')" data-interactive class="text-sm text-cyan-400 mb-4">\u2190 Record #' + p.editIdx + '</button>'
    + '<div class="text-xl font-bold text-white mb-2">Edit: ' + h.esc(p.editField) + '</div>'
    + '<textarea rows="10" oninput="globalThis._dpSEV(this.value)" class="w-full rounded-lg bg-white/5 p-3 text-sm text-white font-mono border border-white/10 outline-none focus:border-cyan-400/50 resize-y" data-interactive>' + h.esc(p.editValue) + '</textarea>'
    + '<div class="flex gap-3 mt-4">'
    + '<button onclick="globalThis._dpSaveE()" data-interactive class="' + BTN_P + '">Save</button>'
    + '<button onclick="globalThis._dpNav(\'record\')" data-interactive class="' + BTN_S + '">Cancel</button>'
    + '</div></div>';
}

export function renderAdd(p) {
  var rows = '';
  for (var i = 0; i < p.newFields.length; i++) {
    rows += '<div class="flex gap-2 items-center">'
      + '<input type="text" value="' + h.esc(p.newFields[i]) + '" oninput="globalThis._dpSNF(' + i + ',this.value)" placeholder="field" class="' + INPS + ' w-36" data-interactive />'
      + '<input type="text" value="' + h.esc(p.newValues[i]) + '" oninput="globalThis._dpSNV(' + i + ',this.value)" placeholder="value" class="' + INPS + '" data-interactive />'
      + '<button onclick="globalThis._dpRR(' + i + ')" data-interactive class="text-xs text-red-400 hover:text-red-300 shrink-0">\xd7</button>'
      + '</div>';
  }
  return '<div class="max-w-lg mx-auto">'
    + '<button onclick="globalThis._dpNav(\'detail\')" data-interactive class="text-sm text-cyan-400 mb-4">\u2190 ' + h.esc(p.col) + '</button>'
    + '<div class="text-xl font-bold text-white mb-4">Add Record</div>'
    + '<div class="space-y-2">' + rows + '</div>'
    + '<button onclick="globalThis._dpAR()" data-interactive class="text-sm text-cyan-400 mt-3">+ Add field</button>'
    + '<div class="flex gap-3 mt-4">'
    + '<button onclick="globalThis._dpSaveN()" data-interactive class="' + BTN_P + '">Save</button>'
    + '<button onclick="globalThis._dpNav(\'detail\')" data-interactive class="' + BTN_S + '">Cancel</button>'
    + '</div></div>';
}

module.exports = {
  renderList: renderList,
  renderImport: renderImport,
  renderDetail: renderDetail,
  renderRecord: renderRecord,
  renderEdit: renderEdit,
  renderAdd: renderAdd,
  PAGE_SIZE: PAGE_SIZE
};
