// npdrag — the notepad box's DRAG LANE, in the sandboxed UI realm.

const THEME = require("lib/data/ui-theme.yml");
const NP = (THEME.layout && THEME.layout.notepad) || {};

// Bumped on every change to the realm half below — the installed-once guard compares it, and a tab
// still carrying an older copy swaps itself out rather than answering with old code forever.
const REALM_V = 6;

const TICK_MS = 250;
const HOLD_BEATS = 40;

// PAD every edge; RAILPAD the wider RIGHT gap (the god-mode tab rail); HAZ the bottom-left square (Spawn's Build button). TL the top-left tool cluster (undo/redo/See controls/Exit god mode) and BR the bottom-right "work on it with Savi" button — both from THEME.layout.studio, the same map ui.js's menubar/footer/boxOf read (jace's screenshot, 2026-09-01).
const PAD = Number(NP.pad) || 16;
const RAILPAD = Number(NP.railPad) || 72;
const HAZ = Number(NP.hazard) || 96;
const ST = (THEME.layout && THEME.layout.studio) || {};
const TLW = Number(ST.topLeft && ST.topLeft.w) || 330;
const TLH = Number(ST.topLeft && ST.topLeft.h) || 64;
const BRW = Number(ST.bottomRight && ST.bottomRight.w) || 110;
const BRH = Number(ST.bottomRight && ST.bottomRight.h) || 96;

// GUARD: emitted as ONE attribute's worth of JavaScript — single quotes only, no template literals,
//   no line comments a collapsed newline could swallow.

const REALM = [
  "(function(){",
  /* Installed once, but versioned — bump REALM_V and the running tab takes the new copy. */
  "  if (window.__SBDRAG && window.__SBDRAG.v === " + REALM_V + ") return;",
  "  var D = document;",
  "  try { if (window.__SBDRAG && window.__SBDRAG.off) window.__SBDRAG.off(); } catch (e0) {}",
  "  var PAD = " + PAD + ", RAILPAD = " + RAILPAD + ", HAZ = " + HAZ + ", HOLD = " + HOLD_BEATS + ";",
  "  var TLW = " + TLW + ", TLH = " + TLH + ", BRW = " + BRW + ", BRH = " + BRH + ";",
  "  var drag = null, want = null, hold = 0, beat = 0, sent = 0, timer = null;",
  "  var downs = 0, hits = 0, moves = 0, ups = 0, cancels = 0, why = '', touchy = 0;",
  "  function node(){ return D.getElementById('sb-npdrag-data'); }",
  "  function boxEl(){",
  "    var el = D.getElementById('sb-app');",
  "    if (!el || !el.classList || !el.classList.contains('sb-np')) return null;",
  "    return el;",
  "  }",
  "  function strip(){ return D.getElementById('sb-np-titlebar'); }",
  "  function num(v){ var n = parseFloat(v); return n === n && n !== Infinity && n !== -Infinity ? n : null; }",
  /* THE CLAMP: on a screen too small to honour a gap, the gap yields before the box leaves the edge. */
  "  function fit(x, y, w, h){",
  "    var vw = window.innerWidth || 0, vh = window.innerHeight || 0;",
  "    var maxX = vw - w - RAILPAD;",
  "    if (maxX < PAD) maxX = vw - w;",
  "    if (maxX < 0) maxX = 0;",
  "    var minX = PAD > maxX ? maxX : PAD;",
  "    var maxY = vh - h - PAD;",
  "    if (maxY < 0) maxY = 0;",
  "    var minY = PAD > maxY ? maxY : PAD;",
  "    var nx = x < minX ? minX : (x > maxX ? maxX : x);",
  "    var ny = y < minY ? minY : (y > maxY ? maxY : y);",
  "    if (nx < HAZ && ny + h > vh - HAZ) {",
  "      var up = vh - HAZ - h;",
  "      if (up >= minY) ny = up;",
  "      else nx = HAZ > maxX ? maxX : HAZ;",
  "    }",
  // Top-left: the studio's tool cluster. The strip is the handle, so it is the strip that must clear it. GUARD: each rule's landing spot must not sit inside another hazard, or fit() stops being idempotent and the tick re-sends forever on a small screen.
  "    if (nx < TLW && ny < TLH) {",
  "      if (TLH <= maxY && !(nx < HAZ && TLH + h > vh - HAZ)) ny = TLH;",
  "      else nx = TLW > maxX ? maxX : TLW;",
  "    }",
  /* Bottom-right: the "work on it with Savi" button. Same shape as the bottom-left rule. */
  "    if (nx + w > vw - BRW && ny + h > vh - BRH) {",
  "      var up2 = vh - BRH - h;",
  "      if (up2 >= minY && !(nx < TLW && up2 < TLH)) ny = up2;",
  "      else { var lx = vw - BRW - w; nx = lx < minX ? minX : lx; }",
  "    }",
  "    return { x: Math.round(nx), y: Math.round(ny) };",
  "  }",
  /* GUARD: position is ONE channel — nothing here sets left/top, so a re-render cannot disagree. */
  "  function place(el, p){",
  "    if(el.style.getPropertyValue('--np-x') !== p.x + 'px') el.style.setProperty('--np-x', p.x + 'px');",
  "    if(el.style.getPropertyValue('--np-y') !== p.y + 'px') el.style.setProperty('--np-y', p.y + 'px');",
  "  }",
  "  function send(p){",
  "    window.clearTimeout(timer); timer = window.setTimeout(function(){ hold = 0; tick(); }, " + (TICK_MS * HOLD_BEATS) + ");",
  "    try { if (typeof window.sendAction === 'function') { window.sendAction('uiNotepadBox', { x: p.x, y: p.y }); sent++; } } catch (e1) {}",
  "  }",
  "  function stamp(n, r){",
  "    if (!n) return;",
  "    var vw = window.innerWidth || 0, vh = window.innerHeight || 0;",
  "    n.setAttribute('data-live', '" + REALM_V + "');",
  "    n.setAttribute('data-beat', String(beat));",
  "    n.setAttribute('data-sent', String(sent));",
  "    n.setAttribute('data-rect', Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.width) + ',' + Math.round(r.height));",
  "    n.setAttribute('data-view', vw + 'x' + vh);",
  "    n.setAttribute('data-inside', (r.left >= 0 && r.top >= 0 && r.right <= vw && r.bottom <= vh) ? '1' : '0');",
  "    n.setAttribute('data-pointer', downs + ',' + hits + ',' + moves + ',' + ups + ',' + cancels);",
  "    n.setAttribute('data-why', why);",
  "    n.setAttribute('data-touch', String(touchy));",
  "  }",
  "  function tick(){",
  "    beat++;",
  "    var el = boxEl(); if (!el) return;",
  "    var n = node();",
  "    var r = el.getBoundingClientRect();",
  "    if (drag) { stamp(n, r); return; }",
  "    var sx = n ? num(n.getAttribute('data-x')) : null;",
  "    var sy = n ? num(n.getAttribute('data-y')) : null;",
  "    if (want) {",
  "      if (sx !== null && sy !== null && Math.abs(sx - want.x) <= 1 && Math.abs(sy - want.y) <= 1) want = null;",
  "      else if (hold > 0) { hold--; place(el, want); stamp(n, r); return; }",
  "      else want = null;",
  "    }",
  "    if (sx === null || sy === null) { stamp(n, r); return; }",
  "    var p = fit(sx, sy, r.width, r.height);",
  "    if (p.x !== Math.round(sx) || p.y !== Math.round(sy)) { place(el, p); want = p; hold = HOLD; send(p); }",
  "    stamp(n, r);",
  "  }",
  "  function interactive(t){",
  "    if (!t || !t.closest) return false;",
  "    if (t.closest('button, a, input, textarea, select')) return true;",
  /* GUARD: the strip WEARS data-interactive — without it the engine reads the touch as camera input. */
  "    var di = t.closest('[data-interactive]');",
  "    return !!(di && !di.hasAttribute('data-np-handle'));",
  "  }",
  "  function onDown(ev){",
  "    downs++;",
  "    try { touchy = (ev.pointerType === 'touch' || ev.pointerType === 'pen') ? 1 : 0; } catch (ep) {}",
  "    if (drag) { why = 'busy'; return; }",
  "    if (ev.button != null && ev.button > 0) { why = 'button' + ev.button; return; }",
  "    var s = strip(); if (!s) { why = 'nostrip'; return; }",
  "    var t = ev.target;",
  "    if (!t) { why = 'notarget'; return; }",
  "    if (!s.contains(t)) { why = 'offstrip:' + ((t.id || (t.className && t.className.baseVal) || t.className || t.nodeName) + '').slice(0, 40); return; }",
  "    if (interactive(t)) { why = 'interactive'; return; }",
  "    var el = boxEl(); if (!el) { why = 'nobox'; return; }",
  "    hits++; why = 'down';",
  "    var r = el.getBoundingClientRect();",
  "    drag = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, ox: r.left, oy: r.top,",
  "      w: r.width, h: r.height, el: el, x: Math.round(r.left), y: Math.round(r.top), moved: 0 };",
  /* Pointer capture is what makes a THUMB work: the strip keeps the stream when the finger slides off. */
  "    try { if (s.setPointerCapture) s.setPointerCapture(ev.pointerId); } catch (e2) {}",
  "    try { el.classList.add('np-dragging'); } catch (e3) {}",
  "    ev.preventDefault();",
  "  }",
  "  function onMove(ev){",
  "    if (!drag || ev.pointerId !== drag.id) return;",
  "    moves++;",
  "    var dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;",
  "    if (dx > 3 || dx < -3 || dy > 3 || dy < -3) drag.moved = 1;",
  "    var p = fit(drag.ox + dx, drag.oy + dy, drag.w, drag.h);",
  "    drag.x = p.x; drag.y = p.y;",
  "    drag.el.style.transform = 'translate3d(' + (p.x - drag.ox) + 'px,' + (p.y - drag.oy) + 'px,0)';",
  "    ev.preventDefault();",
  "  }",
  "  function onUp(ev){",
  "    if (ev && ev.type === 'pointercancel') cancels++;",
  "    if (!drag || (ev && ev.pointerId !== drag.id)) return;",
  "    ups++; why = (ev && ev.type === 'pointercancel') ? 'cancelled' : 'up';",
  "    var d = drag; drag = null;",
  "    try { d.el.style.transform = ''; } catch (e4) {}",
  "    try { d.el.classList.remove('np-dragging'); } catch (e5) {}",
  "    var s = strip();",
  "    try { if (s && s.releasePointerCapture && ev) s.releasePointerCapture(ev.pointerId); } catch (e6) {}",
  "    if (!d.moved) return;",
  "    var p = { x: d.x, y: d.y };",
  "    place(d.el, p); want = p; hold = HOLD;",
  "    send(p);",
  "  }",
  /* GUARD: delegated at the document, in capture — the strip is rebuilt by every re-render. */
  "  D.addEventListener('pointerdown', onDown, true);",
  "  D.addEventListener('pointermove', onMove, true);",
  "  D.addEventListener('pointerup', onUp, true);",
  "  D.addEventListener('pointercancel', onUp, true);",
  "  function onResize(){",
  "    var el = boxEl();",
  "    if (want && el) {",
  "      var r = el.getBoundingClientRect();",
  "      var p = fit(want.x, want.y, r.width, r.height);",
  "      if (p.x !== want.x || p.y !== want.y) { want = p; hold = HOLD; place(el, p); send(p); }",
  "    }",
  "    try { tick(); } catch (e7) {}",
  "  }",
  "  window.addEventListener('resize', onResize);",
  "  D.addEventListener('sb:draw', tick);",
  "  window.__SBDRAG = {",
  "    v: " + REALM_V + ",",
  "    tick: timer,",
  "    off: function(){",
  "      try { D.removeEventListener('pointerdown', onDown, true); } catch (e9) {}",
  "      try { D.removeEventListener('pointermove', onMove, true); } catch (e10) {}",
  "      try { D.removeEventListener('pointerup', onUp, true); } catch (e11) {}",
  "      try { D.removeEventListener('pointercancel', onUp, true); } catch (e12) {}",
  "      try { window.removeEventListener('resize', onResize); } catch (e13) {}",
  "      D.removeEventListener('sb:draw', tick); window.clearTimeout(timer);",
  "    }",
  "  };",
  "  tick();",
  "})()",
].join("\n");

export function bootScript() {
  return REALM;
}

module.exports = {
  REALM_V,
  TICK_MS,
  HOLD_BEATS,
  PAD,
  RAILPAD,
  HAZ,
  bootScript,
};
