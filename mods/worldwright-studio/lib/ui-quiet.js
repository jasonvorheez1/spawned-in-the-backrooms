// Codex's drawing and transient menus. No book writes, timers or mod dependencies.
// 2026-09-11: idle means reuse the last picture; menus dismiss independently of the press beneath.
let lastId, lastUi, lastOverlays, lastKey, lastHtml, lastDraw, builds = 0;
const EMPTY = {};
const STYLE_CACHE = new Map();
const STYLE_LIMIT = 24;

// Remove CSS comments/indentation from the delivered picture, not the readable source.
// Quoted values are opaque: whitespace, URLs, escapes and content strings keep their bytes.
export function compactCss(css) {
  let out = '', quote = '', space = false;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      out += c;
      if (c === '\\' && i + 1 < css.length) out += css[++i];
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") {
      if (space) out += ' ';
      space = false; quote = c; out += c;
    } else if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end < 0 ? css.length : end + 1;
    } else if (/\s/.test(c)) space = true;
    else { if (space && out) out += ' '; space = false; out += c; }
  }
  return out.trim();
}

function heldCss(css) {
  if (STYLE_CACHE.has(css)) return STYLE_CACHE.get(css);
  const compact = compactCss(css);
  if (STYLE_CACHE.size >= STYLE_LIMIT) STYLE_CACHE.delete(STYLE_CACHE.keys().next().value);
  STYLE_CACHE.set(css, compact);
  return compact;
}

export function render(seat, draw) {
  const s = (seat && seat.state) || EMPTY, id = seat && seat.id;
  const ui = s.ui || EMPTY, overlays = s.overlays || EMPTY;
  const sameDraw = draw === lastDraw;
  if (sameDraw && lastHtml !== undefined && id === lastId && ui === lastUi && overlays === lastOverlays) return lastHtml;
  const key = JSON.stringify([id, ui, overlays]);
  lastId = id; lastUi = ui; lastOverlays = overlays;
  if (sameDraw && lastHtml !== undefined && key === lastKey) return lastHtml;
  const html = draw(seat);
  lastDraw = draw;
  builds++;
  const packed = html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, a, css, z) => a + heldCss(css) + z);
  let hash = 2166136261;
  for (let i = 0; i < packed.length; i++) hash = Math.imul(hash ^ packed.charCodeAt(i), 16777619);
  const root = packed.replace(/id="(sb-app|sb-shoot-min)"/, 'id="$1" data-sb-draw="' + builds + '-' + (hash >>> 0).toString(36) + '"');
  const escaped = BOOT.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  lastKey = key;
  lastHtml = root + '<img id="sb-quiet-boot" alt="" aria-hidden="true" style="display:none" src="data:,quiet-2" onerror="' + escaped + '" />';
  return lastHtml;
}

// A rare over-budget frame is diagnosed once, not sampled each tick.
// Only identifiers/counts reach the log — no document text, drafts or note data.
let lastBudgetKey = '';
export function observeBudget(ctx, seat, html) {
  if (html.length <= 500000) { lastBudgetKey = ''; return; }
  const ui = seat?.state?.ui || {}, session = ui.editorSession || {};
  const key = [seat?.id || '', html.length, session.generation || 0].join(':');
  if (key === lastBudgetKey || typeof ctx?.log !== 'function') return;
  lastBudgetKey = key;
  try {
    const scripts = Array.from(html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)).map(m => ({
      id: (/\bid=["']([^"']*)["']/.exec(m[1]) || [])[1] || '(unnamed)', chars: m[2].length
    })).sort((a,b) => b.chars-a.chars).slice(0,6);
    const attributes = Array.from(html.matchAll(/\b(data-[\w-]+|onerror)="([^"]*)"/g)).map(m => ({
      name:m[1], chars:m[2].length
    })).sort((a,b) => b.chars-a.chars).slice(0,6);
    const fields = ['cards','arrangement','pianoRoll','workbench','editorLibrary','exportWin','searchWin','importWin','docs'];
    const stateSizes = fields.map(key => ({key,chars:JSON.stringify(ui[key] ?? null).length})).sort((a,b)=>b.chars-a.chars);
    ctx.log('[wws-ui-payload]', {htmlChars:html.length, view:ui.cards?.view || '', editor:session.editor || '',
      bookId:ui.library?.openBook || '', cardId:session.cardId || '', scripts, attributes, stateSizes});
  } catch (_) { /* A diagnostic must never interrupt the editor. */ }
}

// The payload is the menu actually seen at pointer-down, never a command to clear all UI.
// It cannot close a newer top menu or another card's contextual menu, or any dialog/draft.
export function dismiss(ui, seen) {
  if (!seen || typeof seen !== 'object') return ui;
  let next = ui;
  const put = (key, value) => { if (next === ui) next = Object.assign({}, ui); next[key] = value; };
  if (seen.menu && ui.menu === seen.menu) put('menu', null);
  const c = ui.cards || {};
  let cards = c;
  const card = (key, value) => { if (cards === c) cards = Object.assign({}, c); cards[key] = value; };
  for (const key of ['sortMenu','moveMenu','sizeMenu']) if (seen[key] === '1' && c[key]) card(key, false);
  if (seen.menuCard && c.menu && String((c.selected || {}).id || '') === seen.menuCard) card('menu', false);
  const doc = c.pageDoc || {};
  if (seen.insert && doc.insert && String(doc.insert.kind || 'tag') === seen.insert) card('pageDoc', Object.assign({}, doc, { insert: null }));
  if (cards !== c) put('cards', cards);
  return next;
}

const BOOT = String.raw`(function(){
  if(window.__SBQUIET&&window.__SBQUIET.v===2)return;
  if(window.__SBQUIET&&window.__SBQUIET.off)window.__SBQUIET.off();
  var D=document, lastRoot=null, lastDraw='', observer;
  function afterDraw(){
    var root=D.querySelector('[data-sb-draw]');
    var draw=root?root.getAttribute('data-sb-draw'):'';
    if(root===lastRoot&&draw===lastDraw)return;
    lastRoot=root;lastDraw=draw;
    D.dispatchEvent(new Event('sb:draw'));
  }
  function outside(ev){
    if(ev.button!=null&&ev.button>0)return;
    var t=ev.target, seen={}, any=false;
    D.querySelectorAll('[data-sb-dismiss]').forEach(function(panel){
      var key=panel.getAttribute('data-sb-dismiss');
      if(t&&panel.contains(t))return;
      var scope=panel.closest('[data-sb-menu-scope]');
      if(t&&scope&&scope.contains(t))return;
      var trigger=t&&t.closest?t.closest('[data-sb-menu-trigger]'):null;
      if(trigger&&trigger.getAttribute('data-sb-menu-trigger')===key)return;
      seen[key]=panel.getAttribute('data-sb-menu-value')||'1';any=true;
    });
    if(any&&typeof window.sendAction==='function')window.sendAction('uiDismiss',seen);
  }
  function escape(ev){if(ev.key==='Escape')outside({target:null});}
  D.addEventListener('pointerdown',outside,true);
  D.addEventListener('keydown',escape,true);
  function leave(){outside({target:null});}
  window.addEventListener('blur',leave);
  observer=new MutationObserver(afterDraw);
  observer.observe(D.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-sb-draw']});
  window.__SBQUIET={v:2,off:function(){observer.disconnect();D.removeEventListener('pointerdown',outside,true);D.removeEventListener('keydown',escape,true);window.removeEventListener('blur',leave);delete window.__SBQUIET;}};
  afterDraw();
})()`;
module.exports = { render, dismiss, compactCss };
