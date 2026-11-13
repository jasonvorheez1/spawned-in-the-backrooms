/**
 * creator-data-ui.js — Full-screen database manager for god mode.
 * Records served from server via dataRequestPage -> state._page.
 * Import uses client-side fetch with chunked send.
 * PATCHED: auto-unwraps GeoJSON FeatureCollection and other common wrappers.
 */
var h = require('lib/data-ui-helpers.js');
var panel = require('lib/data-panel.js');
var _g = typeof globalThis !== 'undefined' ? globalThis : {};
var PAGE_SIZE = panel.PAGE_SIZE;

/**
 * Parse markdown text into records split by headings.
 * Each heading becomes a record with 'title', 'level', 'content', and 'order' fields.
 * If no headings found, returns one record with the full text.
 */
export function parseMarkdown(text) {
  var lines = text.split(/\r?\n/);
  var records = [];
  var current = null;
  var order = 0;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      if (current) {
        current.content = current.content.replace(/^\n+|\n+$/g, '');
        records.push(current);
      }
      current = { title: headingMatch[2].trim(), level: headingMatch[1].length, content: '', order: order++ };
    } else {
      if (current) {
        current.content += line + '\n';
      }
    }
  }
  if (current) {
    current.content = current.content.replace(/^\n+|\n+$/g, '');
    records.push(current);
  }
  return records;
}
_g._dpParseMD = parseMarkdown;

export function init() {
  if (!_g._dp) {
    _g._dp = {
      view: 'list', open: true,
      importUrl: '', importName: '', importType: 'json', importing: false, importError: '', importProgress: '',
      col: null, page: 0, search: '', lastReq: '',
      recordIdx: -1,
      editIdx: -1, editField: '', editValue: '',
      inlineIdx: -1, inlineField: '', inlineValue: '',
      newFields: [''], newValues: ['']
    };
  }
  // Ensure importType exists on older cached state
  if (!_g._dp.importType) _g._dp.importType = 'json';
  return _g._dp;
}

export function reqPage(p) {
  if (!p.col) return;
  var key = p.col + ':' + p.page + ':' + p.search;
  if (key === p.lastReq) return;
  p.lastReq = key;
  _g.sendAction('dataRequestPage', { collection: p.col, page: p.page, pageSize: PAGE_SIZE, search: p.search });
}

export function bind(p) {
  _g._dpToggle = function() { p.open = !p.open; };
  _g._dpNav = function(v, c) {
    p.view = v;
    if (c !== undefined) p.col = c;
    if (v === 'list') { p.col = null; p.page = 0; p.search = ''; p.recordIdx = -1; p.lastReq = ''; p.inlineIdx = -1; }
    if (v === 'detail') { p.page = 0; p.search = ''; p.recordIdx = -1; p.lastReq = ''; p.inlineIdx = -1; if (p.col) _g.sendAction('dataRequestPage', { collection: p.col, page: 0, pageSize: PAGE_SIZE, search: '' }); }
  };
  _g._dpPage = function(pg) { p.page = pg; p.lastReq = ''; p.inlineIdx = -1; _g.sendAction('dataRequestPage', { collection: p.col, page: pg, pageSize: PAGE_SIZE, search: p.search }); };
  _g._dpSearch = function(v) { p.search = v; p.page = 0; p.lastReq = ''; _g.sendAction('dataRequestPage', { collection: p.col, page: 0, pageSize: PAGE_SIZE, search: v }); };
  _g._dpSetIU = function(v) { p.importUrl = v; };
  _g._dpSetIN = function(v) { p.importName = v; };
  _g._dpSetIT = function(v) { p.importType = v; };
  _g._dpVR = function(i) { p.view = 'record'; p.recordIdx = i; };

  _g._dpEditStore = null;
  _g._dpSE = function(idx, field) {
    var cv = _g._dpEditStore;
    p.view = 'edit'; p.editIdx = idx; p.editField = field;
    p.editValue = (cv != null && typeof cv === 'object') ? JSON.stringify(cv, null, 2) : String(cv == null ? '' : cv);
  };
  _g._dpSetStore = function(val) { _g._dpEditStore = val; };
  _g._dpSEV = function(v) { p.editValue = v; };
  _g._dpSaveE = function() {
    var val = p.editValue; try { val = JSON.parse(val); } catch(e) {}
    var u = {}; u[p.editField] = val;
    _g.sendAction('dataEditRecord', { collection: p.col, index: p.editIdx, updates: u });
    p.view = 'record'; p.lastReq = '';
    _g.sendAction('dataRequestPage', { collection: p.col, page: p.page, pageSize: PAGE_SIZE, search: p.search });
  };

  _g._dpInlineStart = function(idx, field, val) {
    p.inlineIdx = idx; p.inlineField = field;
    p.inlineValue = (val != null && typeof val === 'object') ? JSON.stringify(val) : String(val == null ? '' : val);
  };
  _g._dpInlineVal = function(v) { p.inlineValue = v; };
  _g._dpInlineSave = function() {
    if (p.inlineIdx < 0) return;
    var val = p.inlineValue; try { val = JSON.parse(val); } catch(e) {}
    var u = {}; u[p.inlineField] = val;
    _g.sendAction('dataEditRecord', { collection: p.col, index: p.inlineIdx, updates: u });
    p.inlineIdx = -1; p.inlineField = ''; p.lastReq = '';
    _g.sendAction('dataRequestPage', { collection: p.col, page: p.page, pageSize: PAGE_SIZE, search: p.search });
  };
  _g._dpInlineCancel = function() { p.inlineIdx = -1; p.inlineField = ''; };

  _g._dpShowAdd = function() {
    p.view = 'addRecord';
    var mgrs = _g._dpQuery ? _g._dpQuery({ tags: ['data-manager'] }) : [];
    var mgr = mgrs.length > 0 ? mgrs[0] : null;
    var cols = mgr ? (mgr.state.collections || []) : [];
    var fields = [];
    for (var ci = 0; ci < cols.length; ci++) {
      if (cols[ci].name === p.col && cols[ci].fields) { fields = cols[ci].fields; break; }
    }
    if (fields.length > 0) {
      p.newFields = fields.slice();
      p.newValues = fields.map(function() { return ''; });
    } else {
      p.newFields = [''];
      p.newValues = [''];
    }
  };
  _g._dpSNF = function(i, v) { p.newFields[i] = v; };
  _g._dpSNV = function(i, v) { p.newValues[i] = v; };
  _g._dpAR = function() { p.newFields.push(''); p.newValues.push(''); };
  _g._dpRR = function(i) { p.newFields.splice(i,1); p.newValues.splice(i,1); if(!p.newFields.length){p.newFields.push('');p.newValues.push('');} };
  _g._dpSaveN = function() {
    var r = {};
    for (var i = 0; i < p.newFields.length; i++) { var k = p.newFields[i]; if(!k) continue; var v = p.newValues[i]; try{v=JSON.parse(v);}catch(e){} r[k]=v; }
    if (Object.keys(r).length > 0) _g.sendAction('dataAddRecord', { collection: p.col, record: r });
    p.view = 'detail'; p.lastReq = '';
    _g.sendAction('dataRequestPage', { collection: p.col, page: p.page, pageSize: PAGE_SIZE, search: p.search });
  };
  _g._dpDR = function(i) { _g.sendAction('dataDeleteRecord', { collection: p.col, index: i }); p.view = 'detail'; p.lastReq = '';
    _g.sendAction('dataRequestPage', { collection: p.col, page: p.page, pageSize: PAGE_SIZE, search: p.search }); };

  // ─── Client-side fetch with promise-chained chunked send ───
  _g._dpDoImp = function() {
    if (!p.importUrl || !p.importName || p.importing) return;
    p.importing = true; p.importError = ''; p.importProgress = 'Fetching\u2026';
    var cn = p.importName, url = p.importUrl, gf = _g.fetch, fileType = p.importType || 'json';
    if (!gf) { p.importError = 'fetch unavailable'; p.importing = false; p.importProgress = ''; return; }
    gf(url)
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return fileType === 'markdown' ? r.text() : r.json(); })
      .then(function(raw) {
        var recs;
        if (fileType === 'markdown') {
          // Parse markdown into sections by heading
          var text = typeof raw === 'string' ? raw : String(raw);
          var parseFn = _g._dpParseMD || parseMarkdown;
          recs = parseFn(text);
          if (!recs || recs.length === 0) {
            recs = [{ content: text, title: cn }];
          }
          if (_g.console) _g.console.log('Markdown parsed: ' + recs.length + ' sections');
        } else {
          recs = raw;
          if (!Array.isArray(recs)) {
            var inner = recs.features || recs.data || recs.records || recs.items || recs.rows || recs.results;
            if (Array.isArray(inner)) recs = inner;
          }
          if (!Array.isArray(recs)) { p.importError = 'JSON must be an array (or a FeatureCollection with a "features" array)'; p.importing = false; p.importProgress = ''; return; }
        }
        var sa = _g.sendAction;
        if (!sa) { p.importError = 'sendAction unavailable'; p.importing = false; p.importProgress = ''; return; }
        var fields = recs.length > 0 ? Object.keys(recs[0]) : [];
        var CHUNK = 250;
        var total = recs.length;
        var chunks = Math.ceil(total / CHUNK);

        var chain = Promise.resolve();
        for (var i = 0; i < chunks; i++) {
          (function(idx) {
            chain = chain.then(function() {
              var start = idx * CHUNK;
              var slice = recs.slice(start, start + CHUNK);
              p.importProgress = 'Sending ' + Math.min(start + CHUNK, total) + '/' + total + '\u2026';
              sa('dataImportChunk', { collection: cn, records: slice, chunkIndex: idx, totalChunks: chunks });
              return new Promise(function(resolve) {
                var st = _g.setTimeout;
                if (st) { st(resolve, 80); }
                else { resolve(); }
              });
            });
          })(i);
        }
        chain.then(function() {
          sa('dataImportFinalize', { collection: cn, url: url, count: total, fields: fields });
          p.importing = false; p.importUrl = ''; p.importName = ''; p.importProgress = '';
          p.view = 'list';
        });
      })
      .catch(function(e) { p.importError = 'Import failed: ' + (e.message || e || 'unknown error'); p.importing = false; p.importProgress = ''; _g.console && _g.console.error('Data import error:', e); });
  };

  _g._dpDelCol = function(n) { _g.sendAction('dataDelete',{collection:n}); p.view='list'; p.col=null; p.lastReq=''; };
}

var OVERLAY = 'fixed inset-0 z-50 flex items-center justify-center pointer-events-auto';
var PANEL_CLS = 'relative w-[90vw] max-w-[1200px] h-[85vh] rounded-2xl overflow-hidden border border-white/10 flex flex-col';
var HDR = 'shrink-0 border-b border-white/10 px-6 py-4 flex items-center gap-3';
var BODY = 'flex-1 overflow-y-auto p-6';

export default function(world, localPlayer) {
  var mgrs = world.query({ tags: ['data-manager'] });
  _g._dpQuery = function(opts) { return world.query(opts); };
  var mgr = mgrs.length > 0 ? mgrs[0] : null;
  var cols = mgr ? (mgr.state.collections || []) : [];
  var pd = mgr ? (mgr.state._page || null) : null;
  var p = init();
  bind(p);

  if (!p.open) {
    return '<div class="fixed right-4 top-20 pointer-events-auto">'
      + '<button onclick="globalThis._dpToggle()" data-interactive class="rounded-xl border border-white/10 px-4 py-2.5 flex items-center gap-2 hover:bg-white/10" style="background:rgba(10,15,25,0.95);">'
      + h.DB_ICON + '<span class="text-sm font-bold text-white">Data</span>'
      + '<span class="text-xs text-white/30">' + cols.length + '</span></button></div>';
  }

  if (p.col && (p.view === 'detail' || p.view === 'record')) reqPage(p);

  var content = '';
  switch (p.view) {
    case 'import': content = panel.renderImport(p); break;
    case 'detail': content = panel.renderDetail(p, cols, pd); break;
    case 'record': content = panel.renderRecord(p, pd); break;
    case 'edit': content = panel.renderEdit(p); break;
    case 'addRecord': content = panel.renderAdd(p); break;
    default: content = panel.renderList(cols); break;
  }

  return '<div class="' + OVERLAY + '" style="background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);">'
    + '<div class="' + PANEL_CLS + '" style="' + h.PANEL_BG + '">'
    + '<div class="' + HDR + '" style="' + h.HEADER_BG + '">'
    + h.DB_ICON + '<span class="text-base font-bold text-white">Data Manager</span>'
    + '<span class="text-sm text-white/30">' + cols.length + ' collection' + (cols.length!==1?'s':'') + '</span>'
    + '<button onclick="globalThis._dpToggle()" data-interactive class="ml-auto text-white/40 hover:text-white text-xl leading-none px-2">\xd7</button>'
    + '</div>'
    + '<div class="' + BODY + '">' + content + '</div>'
    + '</div></div>';
}
